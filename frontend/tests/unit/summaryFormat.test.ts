import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LINK_REL,
  docToSummary,
  renderSummary,
  summaryToDoc,
  toPlainLine,
  toPlainText,
} from "../../app/utils/summaryFormat";

const html = (text: string) => renderToStaticMarkup(renderSummary(text));
const roundTrip = (text: string) => docToSummary(summaryToDoc(text));

describe("old plain cards", () => {
  it("keep every line and paragraph", () => {
    expect(html("Fix the login\nsecond line\n\nnew paragraph")).toBe(
      "<p>Fix the login<br/>second line</p><p>new paragraph</p>",
    );
  });

  it("are shown as plain text unchanged", () => {
    expect(toPlainText("Fix the login page")).toBe("Fix the login page");
  });
});

describe("formatting", () => {
  const text = "# Title\n\nFix **login** *now* ~~old~~ `code`\n\n- one\n- two\n\n1. first\n\n- [ ] write tests\n- [x] plan";

  it("renders headings, marks and lists", () => {
    const out = html(text);
    for (const tag of ["<h1>Title</h1>", "<strong>login</strong>", "<em>now</em>", "<s>old</s>", "<code>code</code>", "<ul>", "<ol>"]) {
      expect(out).toContain(tag);
    }
  });

  it("renders to-dos as read-only checkboxes", () => {
    const out = html("- [ ] write tests\n- [x] plan");
    expect(out).toContain('data-checked="false"');
    expect(out).toContain('data-checked="true"');
    expect(out.match(/<input[^>]*disabled/g)).toHaveLength(2);
  });

  it("saves the same markdown it reads, and saving again changes nothing", () => {
    const saved = roundTrip(text);
    expect(saved).toBe(text);
    expect(roundTrip(saved)).toBe(saved);
  });
});

describe("safety", () => {
  it("shows HTML in the text as text", () => {
    const out = html("Hi <script>alert(1)</script> <img src=x onerror=alert(1)>");
    expect(out).not.toMatch(/<script|<img/);
    expect(out).toContain("&lt;script&gt;");
  });

  it("drops javascript: links and keeps safe ones, opening in a new tab", () => {
    const out = html("[bad](javascript:alert(1)) [ok](https://example.com)");
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain(`rel="${LINK_REL}"`);
    expect(out).toContain('target="_blank"');
  });

  it("never renders images", () => {
    expect(html("![logo](https://example.com/pixel.png)")).not.toContain("<img");
  });
});

describe("toPlainText / toPlainLine", () => {
  const text = "# Title\nFix **login** and [docs](https://x.se)\n\n- one\n- two\n\n1. first\n\n- [ ] write\n- [x] plan\n\n> quoted";

  it("removes formatting but keeps the lines", () => {
    expect(toPlainText(text)).toBe("Title\nFix login and docs\n• one\n• two\n1. first\n☐ write\n☑ plan\nquoted");
  });

  it("joins the lines for one-line views", () => {
    expect(toPlainLine(text)).toBe("Title Fix login and docs • one • two 1. first ☐ write ☑ plan quoted");
  });

  it("decodes characters that markdown escapes", () => {
    expect(toPlainText(roundTrip("a < b & c > d"))).toBe("a < b & c > d");
  });
});
