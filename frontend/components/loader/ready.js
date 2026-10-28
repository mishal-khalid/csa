import { useSyncExternalStore } from "react";

// Whether the page is showing: false while the loading screen covers it (see PageLoader), so the
// page's own animations can wait for it. Every page opens under the loading screen, so it starts
// false, on the server too.
let ready = false;
const listeners = new Set();

export function setPageReady(value) {
  if (ready === value) return;
  ready = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePageReady() {
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => false,
  );
}
