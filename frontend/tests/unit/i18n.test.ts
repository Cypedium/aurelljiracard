import { describe, expect, it } from "@jest/globals";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { SV } from "../../app/i18n/sv";
import {
  LANGUAGES,
  detectLanguage,
  interpolate,
  isLanguage,
  toSwedish,
  translate,
} from "../../app/utils/i18n";

const FRONTEND = join(__dirname, "..", "..");
const JAVA_MAIN = join(FRONTEND, "..", "server-java", "src", "main", "java");

const filesIn = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : filesIn(path, ext);
    return ext.test(name) ? [path] : [];
  });

// Undo the JS string escapes a literal can have in the source
const unescape = (text: string) => text.replace(/\\(['"`\\])/g, "$1").replace(/\\n/g, "\n");

// Every English text the frontend translates: the first argument of t(), translateNow() and msg() when it is a
// string literal. Texts built at runtime must go through a msg() constant, so the scan finds them
const frontendTexts = (): Map<string, string> => {
  const found = new Map<string, string>();
  const call = /\b(?:t|translateNow|msg)\(\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const file of filesIn(join(FRONTEND, "app"), /\.(ts|tsx)$/)) {
    if (file.includes(join("app", "i18n"))) continue;
    const source = readFileSync(file, "utf8");
    for (const [, , text] of source.matchAll(call)) found.set(unescape(text), file);
  }
  return found;
};

// Every fixed { message } server-java can send: exceptions, validation messages, confirmations
const backendMessages = (): Set<string> => {
  const found = new Set<string>();
  const patterns = [
    /ApiException\.\w+\(\s*"([^"]+)"\s*\)/g,
    /\bmessage\s*=\s*"([^"]+)"/g,
    /MESSAGE\s*=\s*"([^"]+)"\s*;/g,
    /new MessageResponse\(\s*"([^"]+)"\s*\)/g,
    /respond\([^,()]+,\s*"([^"]+)"\s*\)/g,
    /[?:]\s*"([A-Z][^"]+)"/g,
  ];
  for (const file of filesIn(JAVA_MAIN, /\.java$/)) {
    const source = readFileSync(file, "utf8");
    // Only literals that reach the client: skip config and logging
    if (/config[\\/]|JwtService|GoogleTokenVerifier/.test(file)) continue;
    for (const pattern of patterns) for (const [, text] of source.matchAll(pattern)) found.add(text);
  }
  return found;
};

describe("languages", () => {
  it("match shared/contract.json", () => {
    const contract = JSON.parse(readFileSync(join(FRONTEND, "..", "shared", "contract.json"), "utf8"));
    expect([...LANGUAGES]).toEqual(contract.languages);
  });

  it.each([
    [["sv-SE", "en-US"], "sv"],
    [["en-GB"], "en"],
    [["de-DE", "sv"], "sv"],
    [["de-DE", "fr"], "en"],
    [[], "en"],
  ])("detectLanguage(%p) = %p", (preferred, language) => expect(detectLanguage(preferred)).toBe(language));

  it("isLanguage accepts only the known ones", () => {
    expect(isLanguage("sv")).toBe(true);
    expect(isLanguage("SV")).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});

describe("translate", () => {
  it("fills in placeholders and leaves unknown ones", () => {
    expect(interpolate("{name} turned on.", { name: "Backlog" })).toBe("Backlog turned on.");
    expect(interpolate("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });

  it("keeps the English for en, and for a Swedish entry that is missing", () => {
    expect(translate("en", "Board")).toBe("Board");
    expect(translate("sv", "Board")).toBe("Tavla");
    expect(translate("sv", "A text nobody translated")).toBe("A text nobody translated");
  });

  it.each([
    ["Role must be one of: user, admin.", "Rollen måste vara en av: user, admin."],
    ["Status must be one of: todo, done, backlog.", "Status måste vara en av: todo, done, backlog."],
    ["Type must be one of: task, bug.", "Typen måste vara en av: task, bug."],
    ["Icon must be one of: check, bug.", "Ikonen måste vara en av: check, bug."],
    ["The board can have at most 12 lists.", "Tavlan kan ha högst 12 listor."],
    ["There can be at most 12 issue types.", "Det kan finnas högst 12 ärendetyper."],
  ])("translates the backend message %p with its variable part", (english, swedish) =>
    expect(translate("sv", english)).toBe(swedish),
  );
});

describe("Swedish dictionary (app/i18n/sv.ts)", () => {
  const texts = frontendTexts();
  const messages = backendMessages();

  it("finds the texts to check (the scans still work)", () => {
    expect(texts.size).toBeGreaterThan(200);
    expect(messages.has("Issue key already exists.")).toBe(true);
    expect(messages.has("Invalid or expired token")).toBe(true);
  });

  it("has Swedish for every text the frontend translates", () => {
    const missing = [...texts.keys()].filter((text) => toSwedish(text) === undefined);
    expect(missing).toEqual([]);
  });

  it("has Swedish for every message the backend sends", () => {
    const missing = [...messages].filter((text) => toSwedish(text) === undefined);
    expect(missing).toEqual([]);
  });

  it("has no unused entries", () => {
    const unused = Object.keys(SV).filter((text) => !texts.has(text) && !messages.has(text));
    expect(unused).toEqual([]);
  });

  it("keeps the placeholders of every entry", () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    // The Swedish board name uses the owner's name in the genitive (currentBoard.ts)
    const renamed: Record<string, string> = { ownerGenitive: "owner" };
    const wrong = Object.entries(SV).filter(
      ([english, swedish]) =>
        JSON.stringify(placeholders(swedish).map((p) => renamed[p] ?? p)) !== JSON.stringify(placeholders(english)),
    );
    expect(wrong).toEqual([]);
  });

  it("never calls t() with a template literal (the scan can't read it)", () => {
    const offenders = filesIn(join(FRONTEND, "app"), /\.(ts|tsx)$/).filter((file) =>
      /\b(?:t|translateNow|msg)\(\s*`/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
