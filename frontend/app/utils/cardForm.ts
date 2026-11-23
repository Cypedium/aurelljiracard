import leoProfanity from "leo-profanity";
import { z } from "zod";
import type { Card } from "../api/endpoints";
import { DEFAULT_CARD_TYPE } from "./cardType";
import { BACKLOG_STATUS } from "./backlog";
import { columnForStatus, type BoardHeader, type CardStatus } from "./boardLayout";
import { msg } from "./i18n";

leoProfanity.loadDictionary();
leoProfanity.loadDictionary("sv");

export const PRIORITIES = [1, 2, 3, 4, 5];

// The same limits and messages as the backend (server-java CardRequest)
export const COMMENT_MAX_LENGTH = 2000;
// Issue key in Jira format, e.g. MA-100: letters, a hyphen, digits
export const PRODUCT_ID_MAX_LENGTH = 6;
export const PRODUCT_ID_PATTERN = /^[A-Za-z]+-[0-9]+$/;
export const PRODUCT_ID_MESSAGE = `Issue key must look like MA-100: letters, a hyphen and digits (max ${PRODUCT_ID_MAX_LENGTH} characters).`;
const RATING_MESSAGE = msg("Please select a time tracking 1 to 5.");
const PROFANITY_MESSAGE = msg("Your text contains inappropriate language. Please remove it and try again.");
const isClean = (text: string) => !leoProfanity.check(text);

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, message).refine(isClean, PROFANITY_MESSAGE);

export const cardFormSchema = z.object({
  // A type key from GET /issue-type; the server checks that the type exists
  type: z.string().min(1, msg("Please select an issue type.")),
  comment: requiredText(COMMENT_MAX_LENGTH, `Summary is required (max ${COMMENT_MAX_LENGTH} characters).`),
  productId: requiredText(PRODUCT_ID_MAX_LENGTH, PRODUCT_ID_MESSAGE).regex(PRODUCT_ID_PATTERN, PRODUCT_ID_MESSAGE),
  // 0 = nothing chosen yet
  rating: z.number().int().min(1, RATING_MESSAGE).max(5, RATING_MESSAGE),
});

export type CardFormValues = z.infer<typeof cardFormSchema>;

// An empty form for a new card
export const EMPTY_CARD_FORM: CardFormValues = { type: DEFAULT_CARD_TYPE, comment: "", productId: "", rating: 0 };

// Form values for editing an existing card; cards without a type become "task"
export const cardToFormValues = (card: Card): CardFormValues => ({
  type: card.type || DEFAULT_CARD_TYPE,
  comment: card.comment,
  productId: card.productId,
  rating: card.rating,
});

// The same message as the backend (409); checked while typing, the server checks again on save
export const DUPLICATE_PRODUCT_ID_MESSAGE = msg("Issue key already exists.");
export const ISSUE_KEY_CHECK_DELAY_MS = 300;
// The error's type in the form, so only that error is cleared when you type another key
export const DUPLICATE_ERROR_TYPE = "duplicate";

// Issue keys used by other cards (exact match, as in the backend); the card being edited may keep its own
export const takenIssueKeys = (cards: Pick<Card, "_id" | "productId">[], ownId?: string): Set<string> =>
  new Set(cards.filter((c) => c._id !== ownId).map((c) => c.productId));

// The list the form's dropdown shows: the card's list (unknown or missing status = the first list,
// as on the board), or undefined for the backlog and before the lists have been fetched
export const formListKey = (headers: BoardHeader[], status?: string): CardStatus | undefined =>
  status === BACKLOG_STATUS ? undefined : headers[columnForStatus(headers, status)]?.key;
