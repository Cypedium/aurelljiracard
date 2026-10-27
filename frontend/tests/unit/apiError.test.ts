import { describe, expect, it } from "@jest/globals";
import { apiErrorMessage } from "../../app/utils/apiError";

// axios isAxiosError() känner igen fel på flaggan isAxiosError
const axiosError = (data?: unknown) => ({ isAxiosError: true, response: data === undefined ? undefined : { data } });

describe("apiErrorMessage", () => {
  it("returns the backend's message", () => {
    expect(apiErrorMessage(axiosError({ message: "Card not found." }), "Fallback")).toBe("Card not found.");
  });

  it.each([
    ["no response (network error)", axiosError()],
    ["no message", axiosError({})],
    ["a blank message", axiosError({ message: " " })],
    ["a non-string message", axiosError({ message: { nested: true } })],
    ["a non-axios error", new Error("boom")],
    ["a thrown string", "boom"],
  ])("falls back on %s", (_case, error) => {
    expect(apiErrorMessage(error, "Fallback")).toBe("Fallback");
  });
});
