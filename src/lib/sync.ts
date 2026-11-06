import { useEffect } from "react";
import { useApp } from "@/store/useApp";

/**
 * Two windows (main + desktop widget) share one localStorage document.
 * When one writes, the other rehydrates so both stay in sync.
 */
export function useCrossWindowSync() {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "guodelist:v1") {
        void useApp.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
