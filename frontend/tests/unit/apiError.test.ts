import { describe, expect, it, jest } from "@jest/globals";
import { apiErrorMessage, isConflictError, logError, reportError } from "../../app/utils/apiError";

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

describe("isConflictError", () => {
  it("is true for a 409 response", () => {
    expect(isConflictError({ isAxiosError: true, response: { status: 409 } })).toBe(true);
  });

  it.each([
    ["another status", { isAxiosError: true, response: { status: 400 } }],
    ["no response", { isAxiosError: true }],
    ["a non-axios error", new Error("boom")],
  ])("is false for %s", (_case, error) => {
    expect(isConflictError(error)).toBe(false);
  });
});

describe("reportError / logError", () => {
  it("logs only the message of an error (never the request it carries) and shows the backend message", async () => {
    const { toast } = await import("sonner");
    const showToast = jest.spyOn(toast, "error").mockImplementation(() => "id");
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("Request failed with status code 409"), {
      isAxiosError: true,
      config: { headers: { Authorization: "Bearer secret" } },
      response: { data: { message: "Issue key already exists." } },
    });

    reportError("Create card", error, "Could not create the card.", "create-card");

    expect(log).toHaveBeenCalledWith("Create card:", "Request failed with status code 409");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
    expect(showToast).toHaveBeenCalledWith("Issue key already exists.", { id: "create-card" });
  });

  it("uses the fallback and no toast id when none is given", async () => {
    const { toast } = await import("sonner");
    const showToast = jest.spyOn(toast, "error").mockImplementation(() => "id");
    jest.spyOn(console, "error").mockImplementation(() => {});

    reportError("Load", new Error("Network Error"), "Could not load.");

    expect(showToast).toHaveBeenCalledWith("Could not load.", undefined);
  });

  it("logs thrown non-errors as text", () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    logError("Script", "timeout");

    expect(log).toHaveBeenCalledWith("Script:", "timeout");
  });
});
