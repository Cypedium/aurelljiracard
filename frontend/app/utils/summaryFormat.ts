// The card's summary with formatting (Tiptap). Saved as markdown, so the backend sees only a string (max 2000 characters)
// and old cards with plain text work as before. The same extensions are used by the editor (SummaryEditor),
// by the card on the board (renderSummary → React elements, no editor and no HTML string) and by toPlainText.
import { createElement, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer";

// Links open in a new tab without the page getting access to the board.
// no-drag: a click on a link on the card doesn't start a drag (react-grid-layout cancel)
export const LINK_REL = "noopener noreferrer nofollow";
const LINK_CLASS = "no-drag";

// GFM (task lists, strikethrough), and a single line break becomes a new line as in a normal text box
export const MARKED_OPTIONS = { gfm: true, breaks: true } as const;

// The available formatting. Underline has no markdown and is turned off; there are no images (no Image extension)
export const SUMMARY_EXTENSIONS = [
  StarterKit.configure({
    underline: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      HTMLAttributes: { target: "_blank", rel: LINK_REL, class: LINK_CLASS },
    },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
];

// The CSS class for formatted text (root.css): the same look in the editor and on the card. compact = the card face
export const SUMMARY_CLASS = "rich-summary";
export const SUMMARY_COMPACT_CLASS = "rich-summary rich-summary-compact";

let manager: MarkdownManager | null = null;
const markdown = () => (manager ??= new MarkdownManager({ extensions: SUMMARY_EXTENSIONS, markedOptions: MARKED_OPTIONS }));

export const summaryToDoc = (text: string): JSONContent => markdown().parse(text);
export const docToSummary = (doc: JSONContent): string => markdown().serialize(doc);

// The task checkbox on the card: display only (Tiptap's own rendering gives a checkbox without onChange)
const taskItem = ({ node, children }: { node: { attrs: Record<string, unknown> }; children?: ReactNode }) => {
  const checked = node.attrs.checked === true;
  return createElement(
    "li",
    { "data-type": "taskItem", "data-checked": String(checked) },
    createElement("label", null, createElement("input", { type: "checkbox", checked, readOnly: true, disabled: true, tabIndex: -1 })),
    createElement("div", null, children),
  );
};

// The summary as React elements, without an editor
export const renderSummary = (text: string): ReactNode =>
  renderToReactElement({
    content: summaryToDoc(text),
    extensions: SUMMARY_EXTENSIONS,
    options: { nodeMapping: { taskItem } },
  });

// The characters before a line when the formatting is removed
const PLAIN_BULLET = "• ";
const PLAIN_TODO = "☐ ";
const PLAIN_DONE = "☑ ";
// Blocks that get their own lines (everything else is inline)
const LIST_TYPES = new Set(["bulletList", "orderedList", "taskList"]);

const inlineText = (nodes: JSONContent[] = []): string =>
  nodes.map((n) => (n.type === "text" ? (n.text ?? "") : n.type === "hardBreak" ? "\n" : inlineText(n.content))).join("");

// One block → lines; lists get their marker in front of each item
const blockLines = (node: JSONContent, prefix = ""): string[] => {
  if (node.type && LIST_TYPES.has(node.type)) {
    const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1;
    return (node.content ?? []).flatMap((item, i) => {
      const marker =
        node.type === "orderedList"
          ? `${start + i}. `
          : node.type === "taskList"
            ? item.attrs?.checked
              ? PLAIN_DONE
              : PLAIN_TODO
            : PLAIN_BULLET;
      const [first = "", ...rest] = (item.content ?? []).flatMap((child) => blockLines(child));
      return [prefix + marker + first, ...rest.map((line) => prefix + line)];
    });
  }
  if (node.type === "blockquote" || node.type === "doc") return (node.content ?? []).flatMap((child) => blockLines(child, prefix));
  if (node.type === "horizontalRule") return [];
  return inlineText(node.content).split("\n");
};

// Without formatting, line breaks kept (the card's title, dialogs)
export const toPlainText = (text: string): string => blockLines(summaryToDoc(text)).join("\n");

// On one line (tables such as the backlog)
export const toPlainLine = (text: string): string =>
  toPlainText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
