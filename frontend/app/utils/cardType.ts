// Ärendetyper; nycklarna måste matcha CARD_TYPES i server/utils/cardType.js
export type CardType = "task" | "bug" | "doc";

export const CARD_TYPES: { key: CardType; label: string }[] = [
  { key: "task", label: "Task" },
  { key: "bug", label: "Bug" },
  { key: "doc", label: "Doc" },
];

export const DEFAULT_CARD_TYPE: CardType = "task";

// Okänd eller saknad typ (äldre kort) visas som Task
export const cardTypeOf = (type?: string): CardType =>
  CARD_TYPES.some((t) => t.key === type) ? (type as CardType) : DEFAULT_CARD_TYPE;

export const cardTypeLabel = (type?: string): string =>
  CARD_TYPES.find((t) => t.key === cardTypeOf(type))!.label;
