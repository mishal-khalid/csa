import { useEffect, useState } from "react";

// How many times a password has turned up in known data breaches, from Have I Been Pwned. Only the
// first five characters of the password's SHA-1 hash leave the browser (their "k-anonymity" range
// search), and the reply is padded so its size gives nothing away either.
export async function breachCount(password, signal) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
  const sha1 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const res = await fetch(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
    headers: { "Add-Padding": "true" },
    signal,
  });
  if (!res.ok) throw new Error(`The breach check failed (${res.status}).`);
  for (const line of (await res.text()).split("\n")) {
    const [suffix, count] = line.trim().split(":");
    if (suffix === sha1.slice(5)) return Number(count);
  }
  return 0;
}

// The breach count for a password, checked once typing pauses: a number for the password passed
// in, or null while it's being checked (or if it couldn't be).
export function useBreachCount(password, enabled) {
  const [result, setResult] = useState({ password: null, count: null });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      breachCount(password, controller.signal).then(
        (count) => setResult({ password, count }),
        (error) => error.name !== "AbortError" && setResult({ password, count: null }),
      );
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [password, enabled]);
  return enabled && result.password === password ? result.count : null;
}
