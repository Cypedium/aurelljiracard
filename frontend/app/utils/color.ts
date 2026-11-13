// Färgverktyg för #rrggbb-färger (listor, ärendetyper, utseende)

// Måste matcha HEX_COLOR i server/controllers/columnController.js
export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// Giltig färg med gemener, annars undefined
export const sanitizeHexColor = (color: unknown): string | undefined =>
  typeof color === "string" && HEX_COLOR.test(color) ? color.toLowerCase() : undefined;

// Blandar två färger; amount 0 = a, 1 = b
export const mixHex = (a: string, b: string, amount: number): string => {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * amount).toString(16).padStart(2, "0"))
    .join("")}`;
};

// Relativ luminans enligt WCAG
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Jiras mörka text (--color-jira-text) och vit
export const DARK_TEXT = "#172b4d";
export const LIGHT_TEXT = "#ffffff";

// WCAG-kontrast mellan två färger, 1–21
export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Mörk eller vit text, den som ger högst kontrast mot bakgrunden
export const readableTextColor = (background: string): string =>
  contrastRatio(background, DARK_TEXT) >= contrastRatio(background, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;
