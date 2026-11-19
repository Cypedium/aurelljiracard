import { describe, expect, it } from "@jest/globals";
import { BOARD_ACTIONS } from "../../app/utils/boardActions";
import {
  ALL_ON,
  BOARD_ACTION_FEATURES,
  FEATURE_GROUPS,
  FEATURE_KEYS,
  canWrite,
  isFeatureOn,
  parseFeatureState,
  type FeatureState,
} from "../../app/utils/features";

describe("parseFeatureState", () => {
  it("keeps known keys and drops the rest", () => {
    expect(parseFeatureState({ readOnly: true, disabled: ["createCard", "theme", 3] })).toEqual({
      readOnly: true,
      disabled: ["createCard"],
    });
  });

  it("treats a missing or broken answer as everything on", () => {
    expect(parseFeatureState(undefined)).toEqual(ALL_ON);
    expect(parseFeatureState("nope")).toEqual(ALL_ON);
    expect(parseFeatureState({ readOnly: "yes" })).toEqual(ALL_ON);
  });

  it("keeps the admin's switches with known keys", () => {
    const state = parseFeatureState({
      readOnly: false,
      disabled: [],
      switches: [
        { key: "readOnly", enabled: false, uiOnly: false, updatedAt: null, updatedBy: null },
        { key: "theme", enabled: true, uiOnly: true, updatedAt: null, updatedBy: null },
      ],
    });
    expect(state.switches?.map((s) => s.key)).toEqual(["readOnly"]);
  });
});

describe("isFeatureOn", () => {
  const off: FeatureState = { readOnly: false, disabled: ["createCard", "backlogPage"] };
  const readOnly: FeatureState = { readOnly: true, disabled: [] };

  it("is off when the feature is disabled", () => {
    expect(isFeatureOn(off, "createCard", false)).toBe(false);
    expect(isFeatureOn(off, "editCard", false)).toBe(true);
    expect(isFeatureOn(off, "backlogPage", false)).toBe(false);
  });

  it("read-only turns every enforced feature off but not the navbar switches", () => {
    expect(isFeatureOn(readOnly, "createCard", false)).toBe(false);
    expect(isFeatureOn(readOnly, "register", false)).toBe(false);
    expect(isFeatureOn(readOnly, "backlogPage", false)).toBe(true);
    expect(canWrite(readOnly, false)).toBe(false);
  });

  it("the site admin always sees everything", () => {
    expect(isFeatureOn(off, "createCard", true)).toBe(true);
    expect(isFeatureOn(readOnly, "createCard", true)).toBe(true);
    expect(canWrite(readOnly, true)).toBe(true);
  });
});

describe("feature metadata", () => {
  it("maps every board action to a switch", () => {
    for (const action of Object.values(BOARD_ACTIONS)) {
      expect(FEATURE_KEYS).toContain(BOARD_ACTION_FEATURES[action]);
    }
    expect(BOARD_ACTION_FEATURES[BOARD_ACTIONS.createIssueType]).toBe("manageIssueTypes");
  });

  it("lists every feature once on the admin page", () => {
    const keys = FEATURE_GROUPS.flatMap((g) => g.features.map((f) => f.key));
    expect([...keys].sort()).toEqual([...FEATURE_KEYS].sort());
  });
});
