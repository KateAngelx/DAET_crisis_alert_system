"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false during server rendering and the first hydration pass, true in the browser afterwards.
 * Use instead of `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true))`,
 * which renders twice and is flagged by React's hook rules.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
