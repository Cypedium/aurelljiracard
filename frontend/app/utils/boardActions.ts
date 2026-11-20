// The navbar's buttons ("Create card", "Delete column", "Create column", "Create Issue type") ask the page (the board, the backlog
// or Issue types) to open its forms.
// The navbar and the page are separate components, so they talk through a shared EventTarget
export const BOARD_ACTIONS = {
  createCard: "create-card",
  createColumn: "create-column",
  deleteColumn: "delete-column",
  createIssueType: "create-issue-type",
  // "Share" (the board's admin) / "Members" (collaborators): the dialog with the invite link and the members
  shareBoard: "share-board",
} as const;

export type BoardAction = (typeof BOARD_ACTIONS)[keyof typeof BOARD_ACTIONS];

const target = new EventTarget();

export const requestBoardAction = (action: BoardAction): void => {
  target.dispatchEvent(new Event(action));
};

// Returns a function that stops listening (for useEffect)
export const onBoardAction = (action: BoardAction, handler: () => void): (() => void) => {
  target.addEventListener(action, handler);
  return () => target.removeEventListener(action, handler);
};
