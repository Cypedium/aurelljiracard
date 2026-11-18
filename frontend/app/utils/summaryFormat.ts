// Kortets sammanfattning med formatering (Tiptap). Sparas som markdown, så backenden ser bara en sträng (max 2000 tecken)
// och gamla kort med vanlig text fungerar som förut. Samma extensions används av editorn (SummaryEditor),
// av kortet på boarden (renderSummary → React-element, ingen editor och ingen HTML-sträng) och av toPlainText.
import { createElement, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer";

// Länkar öppnas i en ny flik utan att sidan får tillgång till boarden.
// no-drag: ett klick på en länk på kortet startar inte en dragning (react-grid-layout cancel)
export const LINK_REL = "noopener noreferrer nofollow";
const LINK_CLASS = "no-drag";

// GFM (att-göra, struken text), och en ensam radbrytning blir en ny rad som i en vanlig textruta
export const MARKED_OPTIONS = { gfm: true, breaks: true } as const;

// Formateringen som finns. Understrykning saknar markdown och stängs av; bilder finns inte (ingen Image-extension)
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

// CSS-klassen för formaterad text (root.css): samma utseende i editorn och på kortet. compact = kortets framsida
export const SUMMARY_CLASS = "rich-summary";
export const SUMMARY_COMPACT_CLASS = "rich-summary rich-summary-compact";

let manager: MarkdownManager | null = null;
const markdown = () => (manager ??= new MarkdownManager({ extensions: SUMMARY_EXTENSIONS, markedOptions: MARKED_OPTIONS }));

export const summaryToDoc = (text: string): JSONContent => markdown().parse(text);
export const docToSummary = (doc: JSONContent): string => markdown().serialize(doc);

// Att-göra-rutan på kortet: bara visning (Tiptaps egen rendering ger en kryssruta utan onChange)
const taskItem = ({ node, children }: { node: { attrs: Record<string, unknown> }; children?: ReactNode }) => {
  const checked = node.attrs.checked === true;
  return createElement(
    "li",
    { "data-type": "taskItem", "data-checked": String(checked) },
    createElement("label", null, createElement("input", { type: "checkbox", checked, readOnly: true, disabled: true, tabIndex: -1 })),
    createElement("div", null, children),
  );
};

// Sammanfattningen som React-element, utan editor
export const renderSummary = (text: string): ReactNode =>
  renderToReactElement({
    content: summaryToDoc(text),
    extensions: SUMMARY_EXTENSIONS,
    options: { nodeMapping: { taskItem } },
  });

// Tecknen före en rad när formateringen tas bort
const PLAIN_BULLET = "• ";
const PLAIN_TODO = "☐ ";
const PLAIN_DONE = "☑ ";
// Block som ger egna rader (allt annat är inline)
const LIST_TYPES = new Set(["bulletList", "orderedList", "taskList"]);

const inlineText = (nodes: JSONContent[] = []): string =>
  nodes.map((n) => (n.type === "text" ? (n.text ?? "") : n.type === "hardBreak" ? "\n" : inlineText(n.content))).join("");

// Ett block → rader; listor får sitt tecken framför varje punkt
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

// Utan formatering, radbrytningarna kvar (kortets title, dialoger)
export const toPlainText = (text: string): string => blockLines(summaryToDoc(text)).join("\n");

// På en rad (tabeller som backloggen)
export const toPlainLine = (text: string): string =>
  toPlainText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
