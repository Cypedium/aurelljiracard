// localStorage/sessionStorage can throw (private mode, blocked or full storage) or be missing (on the server).
// Reading then gives the fallback; writing is skipped, so the choice only lasts until the page reloads
export type StorageArea = "local" | "session";

const storage = (area: StorageArea): Storage => (area === "local" ? localStorage : sessionStorage);

export const readText = (key: string, area: StorageArea = "local"): string | null => {
  try {
    return storage(area).getItem(key);
  } catch {
    return null;
  }
};

export const writeText = (key: string, value: string, area: StorageArea = "local") => {
  try {
    storage(area).setItem(key, value);
  } catch {
    // Not saved
  }
};

export const removeStored = (key: string, area: StorageArea = "local") => {
  try {
    storage(area).removeItem(key);
  } catch {
    // Nothing to remove
  }
};

// A JSON value; normalize turns an old or broken value into a valid one. Missing or invalid JSON → fallback
export const readJson = <T>(key: string, normalize: (raw: unknown) => T, fallback: T, area: StorageArea = "local"): T => {
  const raw = readText(key, area);
  if (raw === null) return fallback;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return fallback;
  }
};

export const writeJson = (key: string, value: unknown, area: StorageArea = "local") =>
  writeText(key, JSON.stringify(value), area);
