import { describe, expect, it } from "@jest/globals";
import { STORAGE_KEYS } from "../../app/utils/constants";

describe("STORAGE_KEYS", () => {
  // Byter man en nyckel tappar alla inloggade användare sin session/layout
  it("keeps the existing localStorage keys", () => {
    expect(STORAGE_KEYS).toEqual({
      accessToken: "accessToken",
      refreshToken: "refreshToken",
      username: "username",
      userLayout: "user_layout",
      collapsedColumns: "collapsed_columns",
    });
  });
});
