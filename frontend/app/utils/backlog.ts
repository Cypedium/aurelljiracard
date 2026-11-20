import type { CardStatus } from "./boardLayout";

// Cards in the backlog are not on the board and have no assignee.
// Never a list key. Must match CardStatus.BACKLOG in server-java
export const BACKLOG_STATUS = "backlog";
export type AnyCardStatus = CardStatus | typeof BACKLOG_STATUS;

type StatusCard = { status?: string };

export const isBacklogCard = (card: StatusCard): boolean => card.status === BACKLOG_STATUS;

export const boardCards = <T extends StatusCard>(cards: T[]): T[] => cards.filter((c) => !isBacklogCard(c));

export const backlogCards = <T extends StatusCard>(cards: T[]): T[] => cards.filter(isBacklogCard);

// Cards from before assignee existed show the author
export const assigneeOf = (card: { assignee?: string | null; username: string }): string =>
  card.assignee || card.username;
