"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "./dashboard/icons";

// A modal over the page: the browser's own <dialog>, so the page behind can't be reached and Esc
// closes it, drawn as a frosted card like the login page's. `full` makes it fill the window (less a
// small margin), with its contents stretching to the full height.
export default function Dialog({ title, onClose, full, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`m-auto max-h-[calc(100svh-2rem)] ${full ? "h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-none" : "w-[min(calc(100%-2rem),30rem)]"} overflow-y-auto rounded-[32px] border border-white/70 bg-neutral-100/90 p-0 text-ink shadow-[0_24px_80px_rgba(11,11,12,0.18)] backdrop-blur-xl transition-[opacity,translate] duration-500 ease-soft backdrop:bg-ink/25 starting:translate-y-3 starting:opacity-0`}
    >
      <div className={`p-6 sm:p-8 ${full ? "flex min-h-full flex-col" : ""}`}>
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="pt-1.5 font-serif text-3xl font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/70 ring-1 ring-black/5 transition-colors duration-300 hover:bg-white"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
