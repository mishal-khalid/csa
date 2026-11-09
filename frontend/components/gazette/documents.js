import { cacheLife, cacheTag } from "next/cache";

export { documentHref, formatDate, ssc, types } from "./types";

// The documents published in the CSA Gazette. They live in the CSA Portal's Gazette Register and are
// published from the portal's Gazette tab; this site reads them from the portal's API
// (api.agee.pro), keeps them for a minute, then looks again. A document is listed only once it has
// been made: its PDF exists and its text is transcribed.
//
// Each document carries its place in the Gazette, given once when it was published: `serial` (its
// address, /g/<serial>, a running count that never resets), `volume` (two a year from Volume 1,
// January to June 2026), `number` (from 1 each year) and `gazetteRef` (CSA/G<volume>-<number>).
// Documents from before the Gazette was renumbered also keep their old `index` (YYYYMMDDNN), whose
// address redirects. `reference` is the document's own number; `tag` its kind, as shown in rows.

const API = (process.env.GAZETTE_API_URL ?? "https://api.agee.pro").replace(/\/$/, "");

// The site is being built (`next build`), rather than answering a visit.
const building = process.env.NEXT_PHASE === "phase-production-build";

// What `read` gives when the API can't give the Gazette while the site is built: it can't be
// reached, it's failing, or it doesn't serve the Gazette yet (as before its Gazette module went
// live). Answering a visit, that's an error instead, so the last good page stays up.
const UNAVAILABLE = { unavailable: true };

async function read(path) {
  const res = await fetch(`${API}${path}`).catch(() => null);
  if (res?.ok) return res.json();
  const body = await res?.json().catch(() => null);
  // the Gazette's own answer for a document it doesn't have
  if (res?.status === 404 && body?.code === "not_found") return null;
  const problem = `The Gazette's API ${res ? `answered ${res.status}` : "couldn’t be reached"} for ${path}`;
  if (!building) throw new Error(problem);
  console.warn(`${problem}: the pages that show it will be rendered when they're visited.`);
  return UNAVAILABLE;
}

// How long an answer is kept. One the API couldn't give while the site was built is kept only
// seconds, and a cache that short is never built into a page: those parts are rendered when the page
// is visited, so the build doesn't fail for want of the API.
function keep(data, life) {
  cacheLife(data === UNAVAILABLE ? "seconds" : life);
  return data === UNAVAILABLE ? null : data;
}

// every published document, without its text (null only while building without the API)
export async function getDocuments() {
  "use cache";
  cacheTag("gazette");
  return keep(await read("/gazette/public/documents"), "minutes")?.documents ?? null;
}

// one document with its full text, or null
export async function getDocument(serial) {
  "use cache";
  cacheTag("gazette");
  if (!/^\d{1,9}$/.test(String(serial))) return keep(null, "minutes");
  return keep(await read(`/gazette/public/documents/${serial}`), "minutes")?.document ?? null;
}

// the address of a document from before the renumbering, by its old index, or null
export async function serialForIndex(index) {
  "use cache";
  if (!/^\d{10}$/.test(String(index))) return keep(null, "hours");
  return keep(await read(`/gazette/public/legacy/${index}`), "hours")?.serial ?? null;
}
