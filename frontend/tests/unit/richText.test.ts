import { describe, expect, it } from "@jest/globals";
import {
  CARD_FACE_ELEMENTS,
  LINK_REL,
  SUMMARY_ELEMENTS,
  continueList,
  toPlainLine,
  toPlainText,
  toggleBold,
  toggleLineFormat,
} from "../../app/utils/richText";

// Markering skrivs som [ och ] i texten, t.ex. "a [bc] d"; utan ] är [ cursorn
const select = (marked: string) => {
  const start = marked.indexOf("[");
  const end = marked.includes("]") ? marked.indexOf("]") - 1 : start;
  return { value: marked.replace("[", "").replace("]", ""), start, end };
};
const show = ({ value, selectionStart, selectionEnd }: { value: string; selectionStart: number; selectionEnd: number }) =>
  selectionStart === selectionEnd
    ? value.slice(0, selectionStart) + "[" + value.slice(selectionStart)
    : value.slice(0, selectionStart) + "[" + value.slice(selectionStart, selectionEnd) + "]" + value.slice(selectionEnd);

const bold = (marked: string) => {
  const { value, start, end } = select(marked);
  return show(toggleBold(value, start, end));
};
const format = (marked: string, kind: Parameters<typeof toggleLineFormat>[3]) => {
  const { value, start, end } = select(marked);
  return show(toggleLineFormat(value, start, end, kind));
};
const enter = (marked: string) => {
  const { value, start, end } = select(marked);
  const edit = continueList(value, start, end);
  return edit && show(edit);
};

describe("rendered elements", () => {
  it("never renders images or raw HTML elements", () => {
    for (const list of [CARD_FACE_ELEMENTS, SUMMARY_ELEMENTS]) {
      for (const tag of ["img", "script", "iframe", "style", "object"]) expect(list).not.toContain(tag);
    }
  });

  it("keeps tables, code blocks and lines out of the three-line card face", () => {
    for (const tag of ["table", "pre", "hr"]) {
      expect(CARD_FACE_ELEMENTS).not.toContain(tag as never);
      expect(SUMMARY_ELEMENTS).toContain(tag);
    }
    for (const tag of CARD_FACE_ELEMENTS) expect(SUMMARY_ELEMENTS).toContain(tag);
  });

  it("opens links without giving the new tab access to the board", () => {
    expect(LINK_REL.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
  });
});

describe("toPlainText / toPlainLine", () => {
  const text = "# Title\nFix **login**\n\n- one\n- two";

  it("removes the markers but keeps the lines", () => {
    expect(toPlainText(text)).toBe("Title\nFix login\n\n• one\n• two");
  });

  it("joins the lines with spaces for one-line views", () => {
    expect(toPlainLine(text)).toBe("Title Fix login • one • two");
  });

  it("leaves plain text unchanged", () => {
    expect(toPlainText("Fix the login page")).toBe("Fix the login page");
  });

  it("removes inline markdown and keeps link and image text", () => {
    expect(toPlainText("*Very* ~~old~~ `npm test`, see [docs](https://x.se) ![logo](https://x.se/a.png)")).toBe(
      "Very old npm test, see docs logo",
    );
    expect(toPlainText("__bold__ and **bold**")).toBe("bold and bold");
  });

  it("keeps stars and underscores that are not formatting", () => {
    expect(toPlainText("2 * 3 * 4 and snake_case_name")).toBe("2 * 3 * 4 and snake_case_name");
  });

  it("shows to-do items as boxes and drops quote and deeper heading markers", () => {
    expect(toPlainText("- [ ] write tests\n- [x] plan\n> quoted\n### Small")).toBe(
      "☐ write tests\n☑ plan\nquoted\nSmall",
    );
  });

  it("treats + and indented items as bullets and keeps numbered lists", () => {
    expect(toPlainText("+ a\n  - b\n1. c")).toBe("• a\n• b\n1. c");
  });
});

describe("toggleBold", () => {
  it("wraps the selection", () => {
    expect(bold("Fix [login] now")).toBe("Fix **[login]** now");
  });

  it("unwraps when the markers are just outside the selection", () => {
    expect(bold("Fix **[login]** now")).toBe("Fix [login] now");
  });

  it("unwraps when the selection includes the markers", () => {
    expect(bold("Fix [**login**] now")).toBe("Fix [login] now");
  });

  it("inserts empty markers with the caret between them", () => {
    expect(bold("Fix [")).toBe("Fix **[**");
  });

  it("keeps edge spaces outside the markers", () => {
    expect(bold("Fix[ login ]now")).toBe("Fix **[login]** now");
  });

  it("bolds each line on its own and skips line prefixes", () => {
    expect(bold("[- one\n## two]")).toBe("[- **one**\n## **two**]");
  });

  it("unbolds several lines when all are bold", () => {
    expect(bold("[- **one**\n**two**]")).toBe("[- one\ntwo]");
  });

  it("does not treat text mid-line as a prefix", () => {
    expect(bold("a [- b]")).toBe("a **[- b]**");
  });
});

describe("toggleLineFormat", () => {
  it("adds a bullet and moves the caret with the text", () => {
    expect(format("one[", "bullet")).toBe("- one[");
  });

  it("removes the bullet when the line has one", () => {
    expect(format("- one[", "bullet")).toBe("one[");
  });

  it("puts the caret after the prefix on an empty line", () => {
    expect(format("a\n[", "bullet")).toBe("a\n- [");
  });

  it("bullets every non-empty selected line", () => {
    expect(format("[one\n\ntwo]", "bullet")).toBe("[- one\n\n- two]");
  });

  it("adds the bullet where some selected lines lack it", () => {
    expect(format("[- one\ntwo]", "bullet")).toBe("[- one\n- two]");
  });

  it("only touches the lines in the selection", () => {
    expect(format("zero\non[e]\ntwo", "large")).toBe("zero\n[## one]\ntwo");
  });

  it("does not take the next line when the selection ends after a line break", () => {
    expect(format("[one\n]two", "bullet")).toBe("[- one]\ntwo");
  });

  it("swaps one size for another and toggles the same size off", () => {
    expect(format("## Ti[tle", "heading")).toBe("# Ti[tle");
    expect(format("# Ti[tle", "heading")).toBe("Ti[tle");
  });

  it("replaces a bullet with a size", () => {
    expect(format("- item[", "large")).toBe("## item[");
  });

  it("moves the caret to the line start when it was inside a removed prefix", () => {
    expect(format("#[ Title", "heading")).toBe("[Title");
  });
});

describe("continueList", () => {
  it("starts a new bullet on Enter at the end of a bullet line", () => {
    expect(enter("- one[")).toBe("- one\n- [");
  });

  it("keeps the same bullet character", () => {
    expect(enter("* one[")).toBe("* one\n* [");
  });

  it("splits the line when the caret is in the middle", () => {
    expect(enter("- on[e")).toBe("- on\n- [e");
  });

  it("ends the list on an empty bullet", () => {
    expect(enter("- one\n- [")).toBe("- one\n[");
  });

  it("does nothing outside a bullet line or with a selection", () => {
    expect(enter("one[")).toBeNull();
    expect(enter("- [one]")).toBeNull();
    expect(enter("[- one")).toBeNull();
  });
});
