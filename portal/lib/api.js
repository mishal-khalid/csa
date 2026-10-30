// The portal's calls to the API (api.agee.pro). The session lives in a cookie the API sets and
// the page's scripts can't read, so every call sends cookies; nothing about the session is ever
// stored in the page.

const API = process.env.NEXT_PUBLIC_API_URL;

// Calls the API; resolves with { status, data }. A call with a body is a POST unless `method` says
// otherwise.
export async function api(path, { body, method, signal } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data };
}
