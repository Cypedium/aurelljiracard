import type { CardStatus } from "./boardLayout";

// Kort i backloggen ligger inte på boarden och har ingen assignee.
// Måste matcha BACKLOG_STATUS i server/utils/cardStatus.js och CardStatus.BACKLOG i server-java
export const BACKLOG_STATUS = "backlog";
export type AnyCardStatus = CardStatus | typeof BACKLOG_STATUS;

type StatusCard = { status?: string };

export const isBacklogCard = (card: StatusCard): boolean => card.status === BACKLOG_STATUS;

export const boardCards = <T extends StatusCard>(cards: T[]): T[] => cards.filter((c) => !isBacklogCard(c));

export const backlogCards = <T extends StatusCard>(cards: T[]): T[] => cards.filter(isBacklogCard);

// Kort från innan assignee fanns visar författaren
export const assigneeOf = (card: { assignee?: string | null; username: string }): string =>
  card.assignee || card.username;
