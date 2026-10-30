import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";

// Fingerprints are passkeys: the browser asks the device's own reader (Touch ID, Windows Hello, a
// phone, or a fingerprint key), and only a signed reading comes back, never the fingerprint.
// These resolve with { reading } or { problem }: what to say under the button.

function problemOf(error) {
  // the person closed the prompt, or it timed out
  if (error?.name === "NotAllowedError" || error?.name === "AbortError") return "The fingerprint wasn’t read. Try again.";
  if (error?.name === "InvalidStateError") return "This device already has this fingerprint.";
  return "Couldn’t read the fingerprint. Try again.";
}

const unsupported = { problem: "This browser can’t read fingerprints." };

// reads a new fingerprint, with the options from POST /fingerprints/options
export async function readNewFingerprint(optionsJSON) {
  if (!browserSupportsWebAuthn()) return unsupported;
  try {
    return { reading: await startRegistration({ optionsJSON }) };
  } catch (error) {
    return { problem: problemOf(error) };
  }
}

// reads a fingerprint to sign in, with the options from POST /auth/fingerprint/options
export async function readFingerprint(optionsJSON) {
  if (!browserSupportsWebAuthn()) return unsupported;
  try {
    return { reading: await startAuthentication({ optionsJSON }) };
  } catch (error) {
    return { problem: problemOf(error) };
  }
}

export { browserSupportsWebAuthn };
