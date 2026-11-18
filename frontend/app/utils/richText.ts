// Formatering i kortets sammanfattning: markdown (GFM), sparad som vanlig text. Backenden ser bara en sträng
// (max 2000 tecken), så gamla kort fungerar som förut. RichText.tsx ritar den med react-markdown som
// React-element, aldrig som HTML (ingen rehype-raw). Verktygsraden skriver in tecknen med funktionerna nedan:
//   **fet**   "- " punktlista   "## " större text   "# " rubrik
// Utöver dem fungerar allt i GFM som går att skriva: *kursiv*, ~~struken~~, `kod`, [länk](https://…), "- [ ] " att-göra,
// numrerade listor, > citat och (bara i kortformuläret) tabeller och kodblock. Bilder visas aldrig.

export type TextSize = "large" | "heading";

// Text, cursor och markering efter en ändring från verktygsraden
export type TextEdit = { value: string; selectionStart: number; selectionEnd: number };
export type LineFormat = "bullet" | TextSize;

export const BULLET_PREFIX = "- ";
export const SIZE_PREFIX: Record<TextSize, string> = { heading: "# ", large: "## " };
const BOLD_MARK = "**";
const BULLET_RE = /^[-*] /;
const SIZE_RE = /^(#{1,2}) /;

// Elementen react-markdown får rita. Kortets framsida är tre rader: inga tabeller, kodblock eller linjer
// (deras text visas ändå, unwrapDisallowed). Bilder ritas aldrig: de skulle hämtas från vilken adress som helst
export const CARD_FACE_ELEMENTS = [
  "p", "br", "strong", "em", "del", "code", "a",
  "ul", "ol", "li", "input",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
] as const;
export const SUMMARY_ELEMENTS = [
  ...CARD_FACE_ELEMENTS,
  "pre", "hr", "table", "thead", "tbody", "tr", "th", "td",
] as const;
// Länkar öppnas i en ny flik utan att sidan får tillgång till kortet
export const LINK_REL = "noopener noreferrer nofollow";

// Tecknen som visas före en punkt / att-göra-rad när formateringen tas bort (kortets title, backloggen, dialoger)
const PLAIN_BULLET = "• ";
const PLAIN_TODO = "☐ ";
const PLAIN_DONE = "☑ ";

const splitLines = (text: string) => text.split(/\r?\n/);

export const lineSize = (line: string): TextSize | undefined => {
  const match = SIZE_RE.exec(line);
  if (!match) return undefined;
  return match[1].length === 1 ? "heading" : "large";
};

// Radens prefix (punkt eller storlek), som inte räknas till texten
const linePrefixLength = (line: string) => BULLET_RE.exec(line)?.[0].length ?? SIZE_RE.exec(line)?.[0].length ?? 0;

// Markdown inom en rad → bara texten: bilder och länkar blir sin text, fet/kursiv/struken/kod blir oformaterat
const plainInline = (line: string): string =>
  line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\w)/g, "$1$2");

const LIST_RE = /^\s*[-*+] /;
const TODO_RE = /^\[([ xX])\] /;
const HEADING_RE = /^#{1,6} /;
const QUOTE_RE = /^>\s?/;

// Utan formateringstecken, radbrytningarna kvar
export const toPlainText = (text: string): string =>
  splitLines(text)
    .map((line) => {
      let content = line.replace(QUOTE_RE, "").replace(HEADING_RE, "");
      let marker = "";
      if (LIST_RE.test(content)) {
        content = content.replace(LIST_RE, "");
        const todo = TODO_RE.exec(content);
        marker = todo ? (todo[1] === " " ? PLAIN_TODO : PLAIN_DONE) : PLAIN_BULLET;
        content = content.replace(TODO_RE, "");
      }
      return marker + plainInline(content);
    })
    .join("\n");

// På en rad (tabeller som backloggen)
export const toPlainLine = (text: string): string =>
  toPlainText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

// Raderna som markeringen rör: från början av första raden till slutet av sista
const lineRange = (value: string, start: number, end: number) => {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  // En markering som slutar precis efter en radbrytning tar inte med nästa rad
  const lastChar = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const newline = value.indexOf("\n", lastChar);
  return { from, to: newline === -1 ? value.length : newline };
};

const isBold = (piece: string) => piece.length > 2 * BOLD_MARK.length && piece.startsWith(BOLD_MARK) && piece.endsWith(BOLD_MARK);
const unwrapBold = (piece: string) => piece.slice(BOLD_MARK.length, -BOLD_MARK.length);
const wrapBold = (piece: string) => BOLD_MARK + piece + BOLD_MARK;

// Fet på/av för markeringen. Utan markering sätts ** ** in med cursorn emellan.
// Över flera rader blir varje rad fet för sig (fet text kan inte gå över en radbrytning),
// och radens punkt- eller storleksprefix lämnas utanför
export const toggleBold = (value: string, start: number, end: number): TextEdit => {
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  // Markeringen ligger precis innanför **…**: ta bort tecknen runt den
  if (selected && before.endsWith(BOLD_MARK) && after.startsWith(BOLD_MARK)) {
    const shift = BOLD_MARK.length;
    return {
      value: before.slice(0, -shift) + selected + after.slice(shift),
      selectionStart: start - shift,
      selectionEnd: end - shift,
    };
  }

  if (!selected) {
    return { value: before + BOLD_MARK + BOLD_MARK + after, selectionStart: start + 2, selectionEnd: start + 2 };
  }

  // Dela upp i bitar per rad; en bit som börjar en rad hoppar över radens prefix
  const lineStartsAt = start === 0 || value[start - 1] === "\n";
  const pieces = selected.split("\n").map((line, i) => {
    const prefix = i > 0 || lineStartsAt ? line.slice(0, linePrefixLength(line)) : "";
    const content = line.slice(prefix.length);
    // Mellanslag i kanterna hamnar utanför **, annars tolkas det inte som fet
    const lead = content.length - content.trimStart().length;
    const trail = content.length - content.trimEnd().length;
    return { prefix, lead: content.slice(0, lead), core: content.trim(), trail: content.slice(content.length - trail) };
  });
  const filled = pieces.filter((p) => p.core);
  const allBold = filled.length > 0 && filled.every((p) => isBold(p.core));
  const formatted = pieces
    .map(({ prefix, lead, core, trail }) => {
      if (!core) return prefix + lead + trail;
      return prefix + lead + (allBold ? unwrapBold(core) : wrapBold(core)) + trail;
    })
    .join("\n");

  // En rad som blev fet: markeringen stannar på ordet (innanför **), så B igen tar bort det
  const [only] = pieces;
  if (pieces.length === 1 && only.core && !allBold) {
    const inner = start + only.prefix.length + only.lead.length + BOLD_MARK.length;
    return { value: before + formatted + after, selectionStart: inner, selectionEnd: inner + only.core.length };
  }
  return { value: before + formatted + after, selectionStart: start, selectionEnd: start + formatted.length };
};

const stripLinePrefix = (line: string) => line.replace(BULLET_RE, "").replace(SIZE_RE, "");
const hasFormat = (line: string, format: LineFormat) =>
  format === "bullet" ? BULLET_RE.test(line) : lineSize(line) === format;
const formatPrefix = (format: LineFormat) => (format === "bullet" ? BULLET_PREFIX : SIZE_PREFIX[format]);

// Punktlista, större text eller rubrik på/av för raderna som markeringen rör.
// En rad har ett av dem i taget: att välja ett annat byter ut det gamla
export const toggleLineFormat = (value: string, start: number, end: number, format: LineFormat): TextEdit => {
  const { from, to } = lineRange(value, start, end);
  const lines = value.slice(from, to).split("\n");
  // Tomma rader i en markering lämnas tomma; är alla tomma ändras raden ändå (man skriver efter prefixet)
  const targets = lines.some((line) => line.trim()) ? lines.map((line) => Boolean(line.trim())) : lines.map(() => true);
  const allHave = lines.every((line, i) => !targets[i] || hasFormat(line, format));
  const changed = lines.map((line, i) => {
    if (!targets[i]) return line;
    const content = stripLinePrefix(line);
    return allHave ? content : formatPrefix(format) + content;
  });
  const block = changed.join("\n");
  const result = value.slice(0, from) + block + value.slice(to);

  if (start === end && lines.length === 1) {
    // Cursorn flyttar med texten (före prefixet hamnar den efter det)
    const caret = Math.min(Math.max(from, start + block.length - (to - from)), from + block.length);
    const prefixEnd = from + (allHave ? 0 : formatPrefix(format).length);
    const position = Math.max(caret, prefixEnd);
    return { value: result, selectionStart: position, selectionEnd: position };
  }
  return { value: result, selectionStart: from, selectionEnd: from + block.length };
};

// Enter på en punktrad: nästa rad får också en punkt. Enter på en tom punkt avslutar listan.
// null = vanlig Enter (inte en punktrad, eller text är markerad)
export const continueList = (value: string, start: number, end: number): TextEdit | null => {
  if (start !== end) return null;
  const { from, to } = lineRange(value, start, start);
  const line = value.slice(from, to);
  const bullet = BULLET_RE.exec(line)?.[0];
  if (!bullet || start < from + bullet.length) return null;

  if (!line.slice(bullet.length).trim()) {
    return { value: value.slice(0, from) + value.slice(from + line.length), selectionStart: from, selectionEnd: from };
  }
  const insert = "\n" + bullet;
  const caret = start + insert.length;
  return { value: value.slice(0, start) + insert + value.slice(start), selectionStart: caret, selectionEnd: caret };
};
