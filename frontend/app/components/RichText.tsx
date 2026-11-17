import { parseRichText, type InlineSpan } from "../utils/richText";
import { RICH_TEXT_CLASS, RICH_TEXT_LIST_CLASS, RICH_TEXT_SIZE_CLASS } from "../utils/styles";

type Props = { text: string; className?: string };

const Spans = ({ spans }: { spans: InlineSpan[] }) =>
  spans.map((span, i) => (span.bold ? <strong key={i}>{span.text}</strong> : <span key={i}>{span.text}</span>));

// Sammanfattningen med formatering (se utils/richText.ts). Bara React-element, ingen HTML från texten
export default function RichText({ text, className = "" }: Props) {
  return (
    <div className={`${RICH_TEXT_CLASS} ${className}`}>
      {parseRichText(text).map((block, i) =>
        block.kind === "list" ? (
          <ul key={i} className={RICH_TEXT_LIST_CLASS}>
            {block.items.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className={RICH_TEXT_SIZE_CLASS[block.size ?? "normal"]}>
            {/* En tom rad får en radhöjd */}
            {block.spans.length ? <Spans spans={block.spans} /> : <br />}
          </p>
        ),
      )}
    </div>
  );
}
