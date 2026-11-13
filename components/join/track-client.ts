/**
 * Fire-and-forget event from the browser. Survives page unloads.
 *
 * Only campaign traffic is tracked (an email link or a ?c= code set a cookie);
 * ordinary visits to dayworker.co send nothing.
 */
export function track(type: string, meta: Record<string, unknown> = {}) {
  if (!/(?:^|;\s*)(dw_inv|dw_src)=/.test(document.cookie)) return;
  const body = JSON.stringify({ type, path: location.pathname + location.search, referrer: document.referrer, meta });
  if (navigator.sendBeacon?.(new URL("/api/track", location.href), new Blob([body], { type: "application/json" }))) return;
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
}
