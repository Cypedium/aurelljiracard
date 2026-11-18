import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CARD_FACE_ELEMENTS, LINK_REL, SUMMARY_ELEMENTS } from "../utils/richText";
import {
  RICH_TEXT_CHECKBOX_CLASS,
  RICH_TEXT_CLASS,
  RICH_TEXT_CODE_CLASS,
  RICH_TEXT_HEADING_CLASS,
  RICH_TEXT_HR_CLASS,
  RICH_TEXT_LINK_CLASS,
  RICH_TEXT_LIST_CLASS,
  RICH_TEXT_PARAGRAPH_CLASS,
  RICH_TEXT_PRE_CLASS,
  RICH_TEXT_QUOTE_CLASS,
  RICH_TEXT_TABLE_CLASS,
  RICH_TEXT_TODO_LIST_CLASS,
} from "../utils/styles";

type Variant = keyof typeof RICH_TEXT_CLASS;
type Props = { text: string; variant?: Variant; className?: string };

const ALLOWED: Record<Variant, readonly string[]> = { full: SUMMARY_ELEMENTS, compact: CARD_FACE_ELEMENTS };
const remarkPlugins = [remarkGfm];

// remark-gfm sätter klassen contains-task-list på listor med "- [ ] "
const isTodoList = (className?: string) => className?.includes("contains-task-list") ?? false;

const componentsFor = (variant: Variant): Components => {
  const heading = RICH_TEXT_HEADING_CLASS[variant];
  return {
    p: ({ node: _node, ...props }) => <p {...props} className={RICH_TEXT_PARAGRAPH_CLASS} />,
    h1: ({ node: _node, ...props }) => <p {...props} className={heading.h1} />,
    h2: ({ node: _node, ...props }) => <p {...props} className={heading.h2} />,
    h3: ({ node: _node, ...props }) => <p {...props} className={heading.other} />,
    h4: ({ node: _node, ...props }) => <p {...props} className={heading.other} />,
    h5: ({ node: _node, ...props }) => <p {...props} className={heading.other} />,
    h6: ({ node: _node, ...props }) => <p {...props} className={heading.other} />,
    ul: ({ node: _node, className, ...props }) => (
      <ul {...props} className={isTodoList(className) ? RICH_TEXT_TODO_LIST_CLASS : RICH_TEXT_LIST_CLASS.ul} />
    ),
    ol: ({ node: _node, className, ...props }) => (
      <ol {...props} className={isTodoList(className) ? RICH_TEXT_TODO_LIST_CLASS : RICH_TEXT_LIST_CLASS.ol} />
    ),
    // Kryssrutan är bara visning (remark-gfm gör den disabled)
    input: ({ node: _node, ...props }) => <input {...props} className={RICH_TEXT_CHECKBOX_CLASS} />,
    a: ({ node: _node, ...props }) => (
      <a
        {...props}
        target="_blank"
        rel={LINK_REL}
        className={RICH_TEXT_LINK_CLASS}
        // Ett klick på länken öppnar inte kortet (dubbelklick på kortet redigerar)
        onDoubleClick={(event) => event.stopPropagation()}
      />
    ),
    code: ({ node: _node, ...props }) => <code {...props} className={RICH_TEXT_CODE_CLASS} />,
    pre: ({ node: _node, ...props }) => <pre {...props} className={RICH_TEXT_PRE_CLASS} />,
    blockquote: ({ node: _node, ...props }) => <blockquote {...props} className={RICH_TEXT_QUOTE_CLASS} />,
    table: ({ node: _node, ...props }) => <table {...props} className={RICH_TEXT_TABLE_CLASS} />,
    hr: ({ node: _node, ...props }) => <hr {...props} className={RICH_TEXT_HR_CLASS} />,
  };
};
const COMPONENTS: Record<Variant, Components> = { full: componentsFor("full"), compact: componentsFor("compact") };

// Sammanfattningen med formatering (markdown, se utils/richText.ts). react-markdown ger React-element;
// HTML i texten ritas inte (ingen rehype-raw) och farliga länkar (javascript: m.m.) tas bort av react-markdown
export default function RichText({ text, variant = "full", className = "" }: Props) {
  return (
    <div className={`${RICH_TEXT_CLASS[variant]} ${className}`}>
      <Markdown
        remarkPlugins={remarkPlugins}
        allowedElements={ALLOWED[variant]}
        unwrapDisallowed
        skipHtml
        components={COMPONENTS[variant]}
      >
        {text}
      </Markdown>
    </div>
  );
}
