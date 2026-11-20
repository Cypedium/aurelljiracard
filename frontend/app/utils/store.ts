// Ett delat tillstånd på modulnivå för useSyncExternalStore: alla som prenumererar får varje nytt värde.
// set meddelar alltid; React ritar bara om när get() ger ett nytt objekt
export type Store<T> = {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
};

export const createStore = <T>(initial: T): Store<T> => {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next) => {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
