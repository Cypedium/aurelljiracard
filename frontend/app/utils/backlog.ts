import { DEFAULT_HEADERS, type CardStatus } from "./boardLayout";

// Kort i backloggen ligger inte på boarden och har ingen assignee.
// Måste matcha BACKLOG_STATUS i server/utils/cardStatus.js och CardStatus.BACKLOG i server-java
export const BACKLOG_STATUS = "backlog";
export type AnyCardStatus = CardStatus | typeof BACKLOG_STATUS;

type StatusCard = { status?: string };

export const isBacklogCard = (card: StatusCard): boolean => card.status === BACKLOG_STATUS;

export const boardCards = <T extends StatusCard>(cards: T[]): T[] => cards.filter((c) => !isBacklogCard(c));

export const backlogCards = <T extends StatusCard>(cards: T[]): T[] => cards.filter(isBacklogCard);

// "Add to" i kortformuläret: boardens kolumner följt av backloggen
export const CARD_DESTINATIONS: { key: AnyCardStatus; label: string }[] = [
  ...DEFAULT_HEADERS.map((h) => ({ key: h.key, label: h.title })),
  { key: BACKLOG_STATUS, label: "Backlog" },
];
// Nya kort hamnar i första kolumnen (To Do) om inget annat väljs
export const DEFAULT_DESTINATION: AnyCardStatus = DEFAULT_HEADERS[0].key;

// Kort från innan assignee fanns visar författaren
export const assigneeOf = (card: { assignee?: string | null; username: string }): string =>
  card.assignee || card.username;
