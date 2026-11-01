"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainButton } from "@/components/Screen";
import { useEvaluation } from "@/lib/evaluation";
import { words } from "@/lib/words";

const messages = { wrong_code: words.wrongCode, unknown_name: words.unknownName, invalid: words.badName, rate_limited: words.tooMany };

// Signing in: no account, just the instructor's name (one on the list) and the code given out on
// the day.
export default function SignIn() {
  const ev = useEvaluation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // already signed in on this phone
  useEffect(() => {
    if (ev.instructor) router.replace("/");
  }, [ev.instructor, router]);

  async function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2) return setError(words.badName);
    setBusy(true);
    setError(null);
    try {
      const failed = await ev.signIn(name, code);
      if (failed) setError(messages[failed] ?? words.noConnection);
    } catch {
      setError(words.noConnection);
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-5 pt-16 pb-16">
      <h1 className="text-center text-[23px] leading-[1.7] font-bold">{words.title}</h1>
      <form onSubmit={submit} className="mt-12 space-y-6" noValidate>
        <label className="block">
          <span className="text-[18px]">{words.name}</span>
          <input
            dir="auto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={40}
            className="mt-1 block h-14 w-full border-2 border-edge bg-panel px-4 text-[18px] outline-none focus:border-seal"
          />
        </label>
        <label className="block">
          <span className="text-[18px]">{words.code}</span>
          <input
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1 block h-14 w-full border-2 border-edge bg-panel px-4 text-[18px] outline-none focus:border-seal"
          />
        </label>
        {error && (
          <p role="alert" className="text-[16px] text-red-700">
            {error}
          </p>
        )}
        <MainButton type="submit" disabled={busy}>
          {words.signIn}
        </MainButton>
      </form>
    </main>
  );
}
