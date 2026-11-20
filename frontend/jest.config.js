// Uses Next's built-in SWC transform; no extra Babel/ts-jest setup needed
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

// Packages in node_modules that only ship as ESM and must be compiled for Jest (marked is used by @tiptap/markdown)
const ESM_PACKAGES = ["marked"];

module.exports = async () => {
  const config = await createJestConfig({
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
  })();
  // next/jest compiles nothing in node_modules except its own list; add our packages to it
  const [nodeModules, ...rest] = config.transformIgnorePatterns;
  if (!nodeModules.includes("(geist|")) throw new Error("next/jest changed its transformIgnorePatterns; update jest.config.js");
  config.transformIgnorePatterns = [nodeModules.replace("(geist|", `(${ESM_PACKAGES.join("|")}|geist|`), ...rest];
  return config;
};
