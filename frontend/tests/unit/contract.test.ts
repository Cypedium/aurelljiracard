import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { BACKLOG_STATUS } from "../../app/utils/backlog";
import { DEFAULT_HEADERS, HEADER_TITLE_MAX_LENGTH } from "../../app/utils/boardLayout";
import { COMMENT_MAX_LENGTH, PRIORITIES, PRODUCT_ID_MAX_LENGTH, PRODUCT_ID_PATTERN, cardFormSchema } from "../../app/utils/cardForm";
import {
  DEFAULT_CARD_TYPE,
  DEFAULT_ISSUE_TYPES,
  ISSUE_TYPE_ICONS,
  ISSUE_TYPE_LABEL_MAX_LENGTH,
  MAX_ISSUE_TYPES,
} from "../../app/utils/cardType";
import { HEX_COLOR } from "../../app/utils/color";
import { ENFORCED_FEATURE_KEYS, NAVBAR_FEATURE_KEYS, READ_ONLY_KEY } from "../../app/utils/features";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, USERNAME_MAX_LENGTH, isRepetitivePassword } from "../../app/utils/register";
import { ROLES } from "../../app/utils/session";
import { RUDE_WORDS, isRudeUsername } from "../../app/utils/username";

// Rules the frontend and server-java must agree on. server-java tests the same file (SharedContractTest)
const contract = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "shared", "contract.json"), "utf8"));

describe("shared contract (shared/contract.json)", () => {
  it("roles, backlog status and default lists", () => {
    expect([...ROLES]).toEqual(contract.roles);
    expect(BACKLOG_STATUS).toBe(contract.backlogStatus);
    expect(DEFAULT_HEADERS).toEqual(contract.defaultColumns);
  });

  it("issue types and icons", () => {
    expect(DEFAULT_CARD_TYPE).toBe(contract.defaultIssueType);
    expect(DEFAULT_ISSUE_TYPES).toEqual(contract.defaultIssueTypes);
    expect([...ISSUE_TYPE_ICONS]).toEqual(contract.issueTypeIcons);
  });

  it("feature switch keys", () => {
    expect([...ENFORCED_FEATURE_KEYS]).toEqual(contract.features.enforced);
    expect([...NAVBAR_FEATURE_KEYS]).toEqual(contract.features.uiOnly);
    expect(READ_ONLY_KEY).toBe(contract.features.readOnly);
  });

  it("length and count limits", () => {
    const { limits } = contract;
    expect(USERNAME_MAX_LENGTH).toBe(limits.usernameMax);
    expect(MIN_PASSWORD_LENGTH).toBe(limits.passwordMin);
    expect(MAX_PASSWORD_LENGTH).toBe(limits.passwordMax);
    expect([PRIORITIES[0], PRIORITIES[PRIORITIES.length - 1]]).toEqual([limits.ratingMin, limits.ratingMax]);
    const rating = cardFormSchema.shape.rating;
    expect(rating.safeParse(limits.ratingMin).success).toBe(true);
    expect(rating.safeParse(limits.ratingMax).success).toBe(true);
    expect(rating.safeParse(limits.ratingMin - 1).success).toBe(false);
    expect(rating.safeParse(limits.ratingMax + 1).success).toBe(false);
    expect(COMMENT_MAX_LENGTH).toBe(limits.summaryMax);
    expect(PRODUCT_ID_MAX_LENGTH).toBe(limits.issueKeyMax);
    expect(HEADER_TITLE_MAX_LENGTH).toBe(limits.listTitleMax);
    expect(ISSUE_TYPE_LABEL_MAX_LENGTH).toBe(limits.issueTypeLabelMax);
    expect(MAX_ISSUE_TYPES).toBe(limits.maxIssueTypes);
  });

  it("rude word list", () => {
    expect([...RUDE_WORDS]).toEqual(contract.rudeWords);
  });

  describe("samples", () => {
    const { samples } = contract;

    it.each(samples.hexColor.valid as string[])("hex colour %p is valid", (c) => expect(HEX_COLOR.test(c)).toBe(true));
    it.each(samples.hexColor.invalid as string[])("hex colour %p is invalid", (c) => expect(HEX_COLOR.test(c)).toBe(false));

    const validIssueKey = (key: string) => key.length <= PRODUCT_ID_MAX_LENGTH && PRODUCT_ID_PATTERN.test(key);
    it.each(samples.issueKey.valid as string[])("issue key %p is valid", (k) => expect(validIssueKey(k)).toBe(true));
    it.each(samples.issueKey.invalid as string[])("issue key %p is invalid", (k) => expect(validIssueKey(k)).toBe(false));

    it.each(samples.username.rude as string[])("username %p is rude", (u) => expect(isRudeUsername(u)).toBe(true));
    it.each(samples.username.clean as string[])("username %p is clean", (u) => expect(isRudeUsername(u)).toBe(false));

    it.each(samples.password.repetitive as string[])("password %p is repetitive", (p) =>
      expect(isRepetitivePassword(p)).toBe(true),
    );
    it.each(samples.password.ok as string[])("password %p is ok", (p) => expect(isRepetitivePassword(p)).toBe(false));
  });
});
