import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createLoadingTracker } from "../../app/utils/loadingToast";

describe("createLoadingTracker", () => {
  const show = jest.fn();
  const hide = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    show.mockClear();
    hide.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows nothing for a fast request", () => {
    const tracker = createLoadingTracker(show, hide, 800);
    tracker.start();
    jest.advanceTimersByTime(500);
    tracker.done();
    jest.advanceTimersByTime(1000);
    expect(show).not.toHaveBeenCalled();
    expect(hide).not.toHaveBeenCalled();
  });

  it("shows after the delay and hides when the request finishes", () => {
    const tracker = createLoadingTracker(show, hide, 800);
    tracker.start();
    jest.advanceTimersByTime(800);
    expect(show).toHaveBeenCalledTimes(1);
    tracker.done();
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("stays visible until all parallel requests are done", () => {
    const tracker = createLoadingTracker(show, hide, 800);
    tracker.start();
    tracker.start();
    jest.advanceTimersByTime(800);
    tracker.done();
    expect(hide).not.toHaveBeenCalled();
    tracker.done();
    expect(hide).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it("ignores extra done() calls", () => {
    const tracker = createLoadingTracker(show, hide, 800);
    tracker.done();
    tracker.start();
    jest.advanceTimersByTime(800);
    expect(show).toHaveBeenCalledTimes(1);
  });
});
