import { describe, expect, it, jest } from "@jest/globals";
import { createStore } from "../../app/utils/store";

describe("createStore", () => {
  it("returns the initial value until set", () => {
    const store = createStore({ count: 0 });
    expect(store.get()).toEqual({ count: 0 });
    store.set({ count: 1 });
    expect(store.get()).toEqual({ count: 1 });
  });

  it("notifies every subscriber on set", () => {
    const store = createStore(0);
    const a = jest.fn();
    const b = jest.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.set(1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    const store = createStore(0);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps separate stores apart", () => {
    const first = createStore("a");
    const second = createStore("b");
    const listener = jest.fn();
    second.subscribe(listener);
    first.set("c");
    expect(second.get()).toBe("b");
    expect(listener).not.toHaveBeenCalled();
  });
});
