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

async function read(path) {
  const res = await fetch(`${API}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`The Gazette's API answered ${res.status} for ${path}`);
  return res.json();
}

// every published document, without its text
export async function getDocuments() {
  "use cache";
  cacheLife("minutes");
  cacheTag("gazette");
  return (await read("/gazette/public/documents")).documents;
}

// one document with its full text, or null
export async function getDocument(serial) {
  "use cache";
  cacheLife("minutes");
  cacheTag("gazette");
  if (!/^\d{1,9}$/.test(String(serial))) return null;
  return (await read(`/gazette/public/documents/${serial}`))?.document ?? null;
}

// the address of a document from before the renumbering, by its old index, or null
export async function serialForIndex(index) {
  "use cache";
  cacheLife("hours");
  if (!/^\d{10}$/.test(String(index))) return null;
  return (await read(`/gazette/public/legacy/${index}`))?.serial ?? null;
}
