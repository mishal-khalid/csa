"use client";

import Link from "next/link";
import { useEvaluation } from "@/lib/evaluation";
import { words } from "@/lib/words";

// The mock's back arrow: grey, pointing left, at the top left.
function BackArrow() {
  return (
    <svg viewBox="0 0 28 16" className="h-4 w-7" aria-hidden>
      <path d="M0 8 10 0v5h18v6H10v5z" fill="currentColor" />
    </svg>
  );
}

// A page as the mock draws it: the evaluation's title, the page's own name under it, and inside the
// evaluation a back arrow and a rule. Its contents wait until the evaluation has loaded.
export default function Screen({ subtitle, back, children }) {
  const { ready, unsaved, offline } = useEvaluation();
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-5 pt-9 pb-24">
      <header className="relative text-center">
        {back && (
          <Link href={back} aria-label="ފަހަތަށް" className="absolute top-1 left-0 -m-3 p-3 text-rule">
            <BackArrow />
          </Link>
        )}
        <h1 className={`text-[23px] leading-[1.7] font-bold ${back ? "px-10" : ""}`}>{words.title}</h1>
        {subtitle && <p className="text-[19px]">{subtitle}</p>}
        {back && <hr className="mt-4 border-t-2 border-rule" />}
      </header>

      {ready ? children : <Loading />}

      {/* scores that haven't reached the API yet (they're kept, and retried) */}
      {unsaved > 0 && offline && (
        <p role="status" className="fixed inset-x-4 bottom-4 mx-auto max-w-[440px] rounded-lg bg-ink px-4 py-3 text-center text-[15px] text-white">
          {words.unsaved(unsaved)}
        </p>
      )}
    </main>
  );
}

function Loading() {
  return (
    <div aria-hidden className="mt-10 space-y-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse bg-panel" />
      ))}
    </div>
  );
}

// the mock's card: light grey with a grey outline
export function Panel({ className = "", children }) {
  return <section className={`border-2 border-edge bg-panel/90 px-4 py-5 ${className}`}>{children}</section>;
}

// a page's heading over the student grid, as in the mock
export function Heading({ children }) {
  return <h2 className="mt-9 mb-5 text-center text-[20px]">{children}</h2>;
}

// the main button (the seal's blue)
export function MainButton({ className = "", ...props }) {
  return (
    <button
      type="button"
      className={`block h-14 w-full bg-seal text-[19px] text-white transition-opacity active:opacity-80 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
