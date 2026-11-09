// Navbarens knappar ("Create card", "Create column", "Create Issue type") ber sidan (boarden, backloggen
// eller Issue types) öppna sina formulär.
// Navbaren och sidan är skilda komponenter, så de pratar via en delad EventTarget
export const BOARD_ACTIONS = {
  createCard: "create-card",
  createColumn: "create-column",
  createIssueType: "create-issue-type",
} as const;

export type BoardAction = (typeof BOARD_ACTIONS)[keyof typeof BOARD_ACTIONS];

const target = new EventTarget();

export const requestBoardAction = (action: BoardAction): void => {
  target.dispatchEvent(new Event(action));
};

// Returnerar en funktion som slutar lyssna (för useEffect)
export const onBoardAction = (action: BoardAction, handler: () => void): (() => void) => {
  target.addEventListener(action, handler);
  return () => target.removeEventListener(action, handler);
};
