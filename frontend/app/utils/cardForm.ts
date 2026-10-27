import leoProfanity from "leo-profanity";
import { z } from "zod";
import { CARD_TYPES, type CardType } from "./cardType";

leoProfanity.loadDictionary();
leoProfanity.loadDictionary("sv");

export const PRIORITIES = [1, 2, 3, 4, 5];

// Samma gränser och meddelanden som backend (server/controllers/cardController.js)
export const COMMENT_MAX_LENGTH = 2000;
export const PRODUCT_ID_MAX_LENGTH = 200;
const PROFANITY_MESSAGE = "Your text contains inappropriate language. Please remove it and try again.";
const isClean = (text: string) => !leoProfanity.check(text);

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, message).refine(isClean, PROFANITY_MESSAGE);

export const cardFormSchema = z.object({
  type: z.enum(CARD_TYPES.map((t) => t.key) as [CardType, ...CardType[]]),
  comment: requiredText(COMMENT_MAX_LENGTH, `Summary is required (max ${COMMENT_MAX_LENGTH} characters).`),
  productId: requiredText(PRODUCT_ID_MAX_LENGTH, `Issue key is required (max ${PRODUCT_ID_MAX_LENGTH} characters).`),
  // 0 = inget valt än
  rating: z.number().int().min(1, "Please select a priority.").max(5, "Please select a priority."),
});

export type CardFormValues = z.infer<typeof cardFormSchema>;
