import { beforeEach, describe, expect, it } from "@jest/globals";
import { readJson, readText, removeStored, writeJson, writeText } from "../../app/utils/storage";

// Node: lagringen i minnet; broken = lagring som kastar (privat läge, blockerad, full)
const local = new Map<string, string>();
const session = new Map<string, string>();
let broken = false;
const memoryStorage = (map: Map<string, string>) => ({
  getItem: (k: string) => {
    if (broken) throw new Error("SecurityError");
    return map.get(k) ?? null;
  },
  setItem: (k: string, v: string) => {
    if (broken) throw new Error("QuotaExceededError");
    map.set(k, v);
  },
  removeItem: (k: string) => {
    if (broken) throw new Error("SecurityError");
    map.delete(k);
  },
});
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(local) });
Object.defineProperty(globalThis, "sessionStorage", { value: memoryStorage(session) });

describe("storage", () => {
  beforeEach(() => {
    local.clear();
    session.clear();
    broken = false;
  });

  it("writes and reads text in localStorage or sessionStorage", () => {
    writeText("board", "b1");
    writeText("invite", "tok", "session");

    expect(readText("board")).toBe("b1");
    expect(readText("invite", "session")).toBe("tok");
    expect(readText("invite")).toBeNull();

    removeStored("invite", "session");
    expect(session.size).toBe(0);
  });

  it("writes JSON and reads it back through normalize", () => {
    writeJson("collapsed", ["todo", "done"]);

    expect(local.get("collapsed")).toBe('["todo","done"]');
    expect(readJson("collapsed", (raw) => (raw as string[]).length, 0)).toBe(2);
  });

  it("returns the fallback when the value is missing or not JSON", () => {
    local.set("broken-json", "{nope");

    expect(readJson("missing", () => "normalized", "fallback")).toBe("fallback");
    expect(readJson("broken-json", () => "normalized", "fallback")).toBe("fallback");
  });

  it("never throws when the storage is blocked or full", () => {
    broken = true;

    expect(() => writeText("k", "v")).not.toThrow();
    expect(() => writeJson("k", { a: 1 })).not.toThrow();
    expect(() => removeStored("k")).not.toThrow();
    expect(readText("k")).toBeNull();
    expect(readJson("k", () => "normalized", "fallback")).toBe("fallback");
  });
});
