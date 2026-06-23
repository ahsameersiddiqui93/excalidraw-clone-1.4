/**
 * state/useStore.ts
 * -----------------------------------------------------------------------------
 * React bindings for the singleton store. Uses `useSyncExternalStore` so that
 * components re-render only when the selected slice of state changes.
 */

import { useSyncExternalStore } from "react";
import { store, type AppState } from "./store";

/**
 * Subscribe to a derived slice of the store. The `selector` should return a
 * value that is referentially stable when unchanged (primitives, or memoized
 * objects). For object slices, pair with a custom `isEqual` if needed.
 */
export function useStoreState<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

/** Convenience hook returning the full app state. */
export function useAppState(): AppState {
  return useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
}

export { store };
