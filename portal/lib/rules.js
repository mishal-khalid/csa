// The account rules the API enforces (backend/src/auth/identifiers.ts and passwords.ts), so the
// portal can check fields inline before anything is sent.

export const USERNAME = /^[a-z0-9](?:[a-z0-9._-]{1,28})[a-z0-9]$/;
export const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
export const MIN_PASSWORD_LENGTH = 10;

export const normalise = (raw) => raw.normalize("NFKC").trim().toLowerCase();

export const roles = ["CITIZEN", "STAFF", "ADMIN"];

// What's wrong with a field, or null. `users` and `self` (the account being edited, if any) are
// for telling whether another account already has an email or username.

export function nameProblem(raw) {
  const value = raw.trim();
  if (!value) return "Enter a name.";
  if (value.length > 100) return "Names are at most 100 characters.";
  return null;
}

export function emailProblem(raw, users = [], self = null) {
  const value = normalise(raw);
  if (!value) return "Enter an email address.";
  if (value.length > 254 || !EMAIL.test(value)) return "Enter a valid email address.";
  if (users.some((user) => user.email === value && user.id !== self)) return "This email already has an account.";
  return null;
}

export function usernameProblem(raw, users = [], self = null) {
  const value = normalise(raw);
  if (!value) return "Enter a username.";
  if (!USERNAME.test(value)) {
    return "Usernames are 3–30 letters, numbers, dots, dashes or underscores, starting and ending with a letter or number.";
  }
  if (users.some((user) => user.username === value && user.id !== self)) return "This username is taken.";
  return null;
}

export function passwordProblem(value) {
  if (!value) return "Enter a password.";
  if (value.length < MIN_PASSWORD_LENGTH) return `Passwords are at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (value.length > 256) return "Passwords are at most 256 characters.";
  return null;
}

// a username made from an email's first part: "Aisha.Naseem+csa@tdo.csa" → "aisha.naseem.csa"
export function usernameFrom(email) {
  return normalise(email.split("@")[0] ?? "")
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/([._-])[._-]+/g, "$1")
    .slice(0, 30)
    .replace(/^[._-]+|[._-]+$/g, "");
}
