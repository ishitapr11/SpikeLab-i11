"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onStoreChange);
    return () => media.removeEventListener("change", onStoreChange);
  }, [query]);

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}
