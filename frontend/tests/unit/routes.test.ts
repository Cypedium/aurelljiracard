import { existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "@jest/globals";
import { ROUTES } from "../../app/utils/routes";

describe("ROUTES", () => {
  it.each(Object.entries(ROUTES))("%s (%s) has a page under app/", (_name, route) => {
    expect(existsSync(path.join(__dirname, "../../app", route, "page.tsx"))).toBe(true);
  });
});
