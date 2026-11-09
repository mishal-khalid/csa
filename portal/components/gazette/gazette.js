// What the Gazette tab shares: the document types, dates and the API's answers in words.

// The five types of Director's Order Number 01/2026, under the names of Director's Order Number
// 02/2026. Every one but a Notice is published with a cover.
export const coverTypes = [
  { id: "act", label: "Act" },
  { id: "order", label: "President’s Order" },
  { id: "regulation", label: "Regulation" },
  { id: "guideline", label: "Guideline" },
];
export const typeLabel = (type) => coverTypes.find((t) => t.id === type)?.label ?? (type === "notice" ? "Notice" : type);

export const statuses = ["In Force", "Amended", "Repealed"];

// today's date where the portal is open, as YYYY-MM-DD (the date a document is published on)
export function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso) => (iso ? dateFormat.format(new Date(`${iso}T00:00:00Z`)) : null);

// "Act 3/2026", "President’s Order 02/2026", a Notice's own reference
export function typeAndNumber(doc) {
  if (doc.state === "PUBLISHED" && doc.reference) return doc.tag && !doc.reference.startsWith(doc.tag) ? `${doc.tag} · ${doc.reference}` : doc.reference;
  return [doc.tag ?? typeLabel(doc.type), doc.docNumber].filter(Boolean).join(" ");
}

export const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

// what an answer from the API means, in words (null when it worked)
export function problemFor({ status, data }) {
  if (status >= 200 && status < 300) return null;
  const codes = {
    published: "This document has been published, so this can’t change.",
    too_large: "That file is over 50 MB.",
    upload_missing: "The upload didn’t arrive. Try again.",
    unusable_pdf: data?.message ?? "This file couldn’t be read as a PDF.",
    no_document: "Upload the document’s PDF first.",
    storage_not_set_up: "File storage isn’t set up on the API yet.",
    date_not_today: "Check your computer’s date: a document is published on today’s date.",
    date_before_latest: `A document was already published on ${formatDate(data?.latest)}; this one can’t be dated before it.`,
    number_taken: "That number has just been given to another document. Change the number and try again.",
    cover: data?.problems?.join(" "),
    not_found: "This document no longer exists.",
  };
  if (codes[data?.code]) return codes[data.code];
  if (status === 429) return "Too many changes. Try again in a minute.";
  return "Something went wrong. Try again.";
}
