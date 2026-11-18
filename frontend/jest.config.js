// Uses Next's built-in SWC transform; no extra Babel/ts-jest setup needed
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

// Paket i node_modules som bara finns som ESM och måste kompileras för Jest (marked används av @tiptap/markdown)
const ESM_PACKAGES = ["marked"];

module.exports = async () => {
  const config = await createJestConfig({
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
  })();
  // next/jest kompilerar inget i node_modules utom sin egen lista; lägg till våra paket i den
  const [nodeModules, ...rest] = config.transformIgnorePatterns;
  if (!nodeModules.includes("(geist|")) throw new Error("next/jest changed its transformIgnorePatterns; update jest.config.js");
  config.transformIgnorePatterns = [nodeModules.replace("(geist|", `(${ESM_PACKAGES.join("|")}|geist|`), ...rest];
  return config;
};
