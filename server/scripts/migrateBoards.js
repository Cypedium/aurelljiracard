// server/scripts/migrateBoards.js
// One-off migration to per-user boards (Postgres: server-java V11__boards.sql). Run once before
// starting the new server:  node scripts/migrateBoards.js
// Safe to run again: it only fills in what is missing.
//
// - every user gets their own board, as its admin
// - existing cards, lists and issue types (no boardId yet) move to the oldest admin's board
//   (the oldest user's if there is no admin), and every other user joins it as a collaborator
// - the old global unique indexes (issue key, list key, issue type key) are replaced by per-board ones
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const User = require("../models/User");
const Board = require("../models/Board");
const BoardMember = require("../models/BoardMember");
const Card = require("../models/Card");
const Column = require("../models/Column");
const IssueType = require("../models/IssueType");
const { ADMIN_ROLE, DEFAULT_ROLE } = require("../utils/role");

// The indexes from before boards; each blocks the same key on two boards
const OLD_UNIQUE_INDEXES = [
  [Card, "productId_1"],
  [Column, "key_1"],
  [IssueType, "key_1"]
];

const dropIfExists = async (Model, name) => {
  if (await Model.collection.indexExists(name)) {
    await Model.collection.dropIndex(name);
    console.log(`Dropped index ${Model.collection.name}.${name}`);
  }
};

async function migrateBoards() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    for (const [Model, name] of OLD_UNIQUE_INDEXES) {
      await dropIfExists(Model, name);
    }

    const users = await User.find({}, "_id username role createdAt").sort({ createdAt: 1, _id: 1 }).lean();
    if (users.length === 0) {
      console.log("No users: nothing to migrate.");
      process.exit(0);
    }
    for (const user of users) {
      await Board.ensureFor(user._id);
    }
    console.log(`Every user (${users.length}) has a board.`);

    const mainOwner = users.find((u) => u.role === ADMIN_ROLE) ?? users[0];
    const mainBoard = await Board.findOne({ ownerId: mainOwner._id }).lean();
    console.log(`Existing data goes to ${mainOwner.username}'s board.`);

    for (const user of users.filter((u) => String(u._id) !== String(mainOwner._id))) {
      await BoardMember.updateOne(
        { boardId: mainBoard._id, userId: user._id },
        { $setOnInsert: { role: DEFAULT_ROLE } },
        { upsert: true }
      );
    }

    // sanitizeFilter is not set in this script, but mark the operator as intended anyway
    const withoutBoard = { boardId: mongoose.trusted({ $exists: false }) };
    for (const Model of [Card, Column, IssueType]) {
      const { modifiedCount } = await Model.updateMany(withoutBoard, { $set: { boardId: mainBoard._id } });
      console.log(`${Model.collection.name}: ${modifiedCount} moved to the board.`);
    }

    for (const Model of [Board, BoardMember, Card, Column, IssueType]) {
      await Model.syncIndexes();
    }
    console.log("Indexes are up to date. Done.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

migrateBoards();
