require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Strip $-operators from query filters built from user input (NoSQL injection)
mongoose.set('sanitizeFilter', true);

const authRoutes = require('./routes/auth');
const cardRoutes = require('./routes/card');
const userRoutes = require('./routes/user');

const DEFAULT_CLIENT_URLS = 'http://localhost:3000,https://aurelljiraboard.fly.dev';
const allowedOrigins = (process.env.CLIENT_URL || DEFAULT_CLIENT_URLS)
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const app = express();

// Profile pictures are sent as base64 data URLs, so allow more than the 100kb default
app.use(express.json({ limit: '2mb' }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use('/auth', authRoutes);
app.use('/card', cardRoutes);
app.use('/user', userRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Central error handler: never leak internal error details to clients
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Internal Server Error' : err.message });
});

module.exports = app;
