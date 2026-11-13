// localStorage/sessionStorage kan kasta (privat läge, blockerad eller full lagring) eller saknas (på servern).
// Läsning ger då fallback; skrivning hoppas över, så valet gäller bara tills sidan laddas om
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
    // Sparas inte
  }
};

export const removeStored = (key: string, area: StorageArea = "local") => {
  try {
    storage(area).removeItem(key);
  } catch {
    // Finns inget att ta bort
  }
};

// JSON-värde; normalize gör om ett gammalt eller trasigt värde till ett giltigt. Saknas eller ogiltig JSON → fallback
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
