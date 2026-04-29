/**
 * Lightweight XP invalidation via custom DOM events.
 *
 * After any client-side action that awards XP, call `dispatchXPUpdate()`.
 * Components that display XP listen for the event and re-fetch.
 */

const XP_UPDATE_EVENT = "xp-updated";

/** Dispatch after a successful XP-earning API call completes. */
export function dispatchXPUpdate(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(XP_UPDATE_EVENT));
  }
}

/** Subscribe to XP update events. Returns a cleanup function. */
export function onXPUpdate(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(XP_UPDATE_EVENT, callback);
  return () => window.removeEventListener(XP_UPDATE_EVENT, callback);
}
