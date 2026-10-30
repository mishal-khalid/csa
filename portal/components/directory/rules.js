import { EMAIL } from "@/lib/rules";

// The Directory's field rules, as the API checks them (backend/src/directory), so they can be
// checked inline. Each gives what's wrong with a value, or null; blank is fine for the details.

export function entryNameProblem(raw) {
  const value = raw.trim();
  if (!value) return "Enter a name.";
  if (value.length > 150) return "Names are at most 150 characters.";
  return null;
}

export function kindProblem(raw) {
  const value = raw.trim();
  if (!value) return "Enter the kind.";
  if (value.length > 40) return "Kinds are at most 40 characters.";
  return null;
}

const blankOr = (check) => (raw) => (raw.trim() ? check(raw.trim()) : null);

export const detailProblems = {
  headName: blankOr((value) => (value.length > 150 ? "Names are at most 150 characters." : null)),
  headPost: blankOr((value) => (value.length > 150 ? "Posts are at most 150 characters." : null)),
  email: blankOr((value) => (value.length <= 254 && EMAIL.test(value) ? null : "Enter a valid email address.")),
  phone: blankOr((value) => (value.length <= 40 && /^\+?[0-9 ()./-]{3,}$/.test(value) ? null : "Enter a valid phone number.")),
  website: blankOr((value) => (webAddress(value) ? null : "Enter a valid web address.")),
  address: blankOr((value) => (value.length > 300 ? "Addresses are at most 300 characters." : null)),
};

// a web address as a link, with https:// added if it has none; null if it isn't one
export function webAddress(value) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}
