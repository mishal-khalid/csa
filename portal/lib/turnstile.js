// Cloudflare Turnstile, the bot check, run invisibly. Its script loads only when a check is needed.
// Normally nothing shows; if Cloudflare wants a person to confirm, its checkbox appears in the given
// container.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loaded;
function load() {
  loaded ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      loaded = undefined;
      reject(new Error("The bot check couldn’t load."));
    };
    document.head.append(script);
  });
  return loaded;
}

// resolves with a one-time token for the API to verify
export async function turnstileToken(container) {
  const turnstile = await load();
  return new Promise((resolve, reject) => {
    const id = turnstile.render(container, {
      sitekey: SITE_KEY,
      appearance: "interaction-only",
      callback: (token) => {
        turnstile.remove(id);
        resolve(token);
      },
      "error-callback": () => {
        turnstile.remove(id);
        reject(new Error("The bot check failed."));
        return true;
      },
    });
  });
}
