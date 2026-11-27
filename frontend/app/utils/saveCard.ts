// Saving an edited card: the fields first, then the move to another list (two endpoints)

// A move only when another list was picked in the form (null = not changed)
export const needsMove = <S extends string>(movedTo: S | null, currentStatus: S | undefined): movedTo is S =>
  movedTo !== null && movedTo !== currentStatus;

export type SaveResult<T> = { card: T; moveError?: unknown };

// save() failing rejects (nothing was saved). move() failing still resolves with the saved card and moveError,
// because the changes are kept and only the move is missing
export async function saveThenMove<T>(save: () => Promise<T>, move: (() => Promise<T>) | null): Promise<SaveResult<T>> {
  const saved = await save();
  if (!move) return { card: saved };
  try {
    return { card: await move() };
  } catch (moveError) {
    return { card: saved, moveError };
  }
}
