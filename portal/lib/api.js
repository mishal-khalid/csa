import { turnstileToken } from "./turnstile";

// The portal's calls to the API (api.agee.pro). The session lives in a cookie the API sets and
// the page's scripts can't read, so every call sends cookies; nothing about the session is ever
// stored in the page.

const API = process.env.NEXT_PUBLIC_API_URL;

// Gets the API's bot-check cookie, once at a time: runs Turnstile and hands the token over.
let verifying;
export function verifyHuman(container) {
  verifying ??= (async () => {
    const token = await turnstileToken(container);
    const res = await fetch(`${API}/auth/human`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error("The bot check failed.");
  })().finally(() => {
    verifying = undefined;
  });
  return verifying;
}

// Calls the API; resolves with { status, data }. A call with a body is a POST unless `method` says
// otherwise. If the bot-check cookie has run out (403 "challenge"), it runs the check again and
// retries once. `container` is where Turnstile may show.
export async function api(path, { body, method, signal, container } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method: method ?? (body ? "POST" : "GET"),
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (res.status === 403 && data?.code === "challenge" && attempt === 0) {
      await verifyHuman(container);
      continue;
    }
    return { status: res.status, data };
  }
}
