// Formatering i kortets sammanfattning: en liten del av markdown, sparad som vanlig text.
//   **fet**   "- " punktlista   "## " större text   "# " rubrik   varje radbrytning är en ny rad
// parseRichText ger data som RichText.tsx ritar som React-element, aldrig som HTML.
// Backenden ser bara en sträng (max 2000 tecken), så gamla kort fungerar som förut

export type TextSize = "large" | "heading";
export type InlineSpan = { text: string; bold: boolean };
export type RichBlock =
  | { kind: "line"; size?: TextSize; spans: InlineSpan[] }
  | { kind: "list"; items: InlineSpan[][] };

// Text, cursor och markering efter en ändring från verktygsraden
export type TextEdit = { value: string; selectionStart: number; selectionEnd: number };
export type LineFormat = "bullet" | TextSize;

export const BULLET_PREFIX = "- ";
export const SIZE_PREFIX: Record<TextSize, string> = { heading: "# ", large: "## " };
const BOLD_MARK = "**";
const BULLET_RE = /^[-*] /;
const SIZE_RE = /^(#{1,2}) /;
const BOLD_RE = /\*\*(.+?)\*\*/g;
// Tecknet som visas före en punkt när formateringen tas bort (kortets framsida, backloggen)
const PLAIN_BULLET = "• ";

const splitLines = (text: string) => text.split(/\r?\n/);

export const lineSize = (line: string): TextSize | undefined => {
  const match = SIZE_RE.exec(line);
  if (!match) return undefined;
  return match[1].length === 1 ? "heading" : "large";
};

// Radens prefix (punkt eller storlek), som inte räknas till texten
const linePrefixLength = (line: string) => BULLET_RE.exec(line)?.[0].length ?? SIZE_RE.exec(line)?.[0].length ?? 0;

// **fet** inom en rad; ett ensamt ** visas som det är
export const parseInline = (line: string): InlineSpan[] => {
  const spans: InlineSpan[] = [];
  let last = 0;
  for (const match of line.matchAll(BOLD_RE)) {
    if (match.index > last) spans.push({ text: line.slice(last, match.index), bold: false });
    spans.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last), bold: false });
  return spans;
};

// Rader i följd som börjar med "- " (eller "* ") blir en lista; en tom rad blir en tom rad
export const parseRichText = (text: string): RichBlock[] => {
  const blocks: RichBlock[] = [];
  for (const line of splitLines(text)) {
    if (BULLET_RE.test(line)) {
      const item = parseInline(line.replace(BULLET_RE, ""));
      const previous = blocks.at(-1);
      if (previous?.kind === "list") previous.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
      continue;
    }
    const size = lineSize(line);
    blocks.push(
      size
        ? { kind: "line", size, spans: parseInline(line.replace(SIZE_RE, "")) }
        : { kind: "line", spans: parseInline(line) },
    );
  }
  return blocks;
};

// Utan formateringstecken, radbrytningarna kvar (kortets framsida, dialoger)
export const toPlainText = (text: string): string =>
  splitLines(text)
    .map((line) => {
      const bullet = BULLET_RE.test(line);
      const content = line.replace(BULLET_RE, "").replace(SIZE_RE, "").replace(BOLD_RE, "$1");
      return bullet ? PLAIN_BULLET + content : content;
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
