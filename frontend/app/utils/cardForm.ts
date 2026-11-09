import leoProfanity from "leo-profanity";
import { z } from "zod";
import type { Card } from "../api/endpoints";
import { DEFAULT_CARD_TYPE } from "./cardType";
import { BACKLOG_STATUS } from "./backlog";
import { columnForStatus, type BoardHeader, type CardStatus } from "./boardLayout";

leoProfanity.loadDictionary();
leoProfanity.loadDictionary("sv");

export const PRIORITIES = [1, 2, 3, 4, 5];

// Samma gränser och meddelanden som backend (server/controllers/cardController.js)
export const COMMENT_MAX_LENGTH = 2000;
// Issue key i Jira-format, t.ex. MA-100: bokstäver, bindestreck, siffror
export const PRODUCT_ID_MAX_LENGTH = 6;
export const PRODUCT_ID_PATTERN = /^[A-Za-z]+-[0-9]+$/;
export const PRODUCT_ID_MESSAGE = `Issue key must look like MA-100: letters, a hyphen and digits (max ${PRODUCT_ID_MAX_LENGTH} characters).`;
const PROFANITY_MESSAGE = "Your text contains inappropriate language. Please remove it and try again.";
const isClean = (text: string) => !leoProfanity.check(text);

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, message).refine(isClean, PROFANITY_MESSAGE);

export const cardFormSchema = z.object({
  // En typnyckel från GET /issue-type; servern kollar att typen finns
  type: z.string().min(1, "Please select an issue type."),
  comment: requiredText(COMMENT_MAX_LENGTH, `Summary is required (max ${COMMENT_MAX_LENGTH} characters).`),
  productId: requiredText(PRODUCT_ID_MAX_LENGTH, PRODUCT_ID_MESSAGE).regex(PRODUCT_ID_PATTERN, PRODUCT_ID_MESSAGE),
  // 0 = inget valt än
  rating: z.number().int().min(1, "Please select a priority.").max(5, "Please select a priority."),
});

export type CardFormValues = z.infer<typeof cardFormSchema>;

// Tomt formulär för ett nytt kort
export const EMPTY_CARD_FORM: CardFormValues = { type: DEFAULT_CARD_TYPE, comment: "", productId: "", rating: 0 };

// Formulärvärden för att redigera ett befintligt kort; kort utan typ blir "task"
export const cardToFormValues = (card: Card): CardFormValues => ({
  type: card.type || DEFAULT_CARD_TYPE,
  comment: card.comment,
  productId: card.productId,
  rating: card.rating,
});

// Samma meddelande som backend (409); kollas medan man skriver, servern kollar igen vid sparning
export const DUPLICATE_PRODUCT_ID_MESSAGE = "Issue key already exists.";
export const ISSUE_KEY_CHECK_DELAY_MS = 300;
// Felets typ i formuläret, så att bara det felet tas bort när man skriver en annan key
export const DUPLICATE_ERROR_TYPE = "duplicate";

// Issue keys som andra kort använder (exakt matchning, som backend); kortet som redigeras får behålla sin
export const takenIssueKeys = (cards: Pick<Card, "_id" | "productId">[], ownId?: string): Set<string> =>
  new Set(cards.filter((c) => c._id !== ownId).map((c) => c.productId));

// Listan som formulärets dropdown visar: kortets lista (okänd eller saknad status = första listan,
// som på boarden), eller undefined för backloggen och innan listorna har hämtats
export const formListKey = (headers: BoardHeader[], status?: string): CardStatus | undefined =>
  status === BACKLOG_STATUS ? undefined : headers[columnForStatus(headers, status)]?.key;
