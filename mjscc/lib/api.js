// The app's calls to the API (the backend's /mjscc routes). The sign-in lives in a cookie the API
// sets and the page's scripts can't read, so every call sends cookies.

export const API = process.env.NEXT_PUBLIC_API_URL;

// Calls the API; resolves with { status, data }, or rejects if the phone can't reach it. A call with
// a body is a POST unless `method` says otherwise; every change is sent as JSON, which the API
// requires.
export async function api(path, { body, method } = {}) {
  const res = await fetch(`${API}/mjscc${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data };
}

// an answer that's a picture
export const answerImage = (question) => `${API}/mjscc/answers/${question}`;
