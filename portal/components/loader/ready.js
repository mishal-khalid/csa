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

// Parts of a page that come in after it has loaded (the portal's dashboard, once the session is
// checked) hold the loading screen until they're on the page: holdLoading() returns the function
// that lets it go. The screen then waits for their images as well.
let holds = 0;
let waiting = [];

export function holdLoading() {
  holds++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds--;
    if (holds === 0) {
      waiting.forEach((resolve) => resolve());
      waiting = [];
    }
  };
}

export function whenUnheld() {
  return holds === 0 ? Promise.resolve() : new Promise((resolve) => waiting.push(resolve));
}
