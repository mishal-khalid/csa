import { EvaluationProvider } from "@/lib/evaluation";

// The evaluation's pages: behind the instructors' sign-in, over the faint seal.
export default function EvaluationLayout({ children }) {
  return (
    <>
      {/* the seal, faint and oversized behind every page, as in the mock */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/seal.svg" alt="" className="absolute top-1/2 left-[-38%] w-[135%] max-w-none -translate-y-1/2 opacity-[0.06] grayscale" />
      </div>
      <EvaluationProvider>{children}</EvaluationProvider>
    </>
  );
}
