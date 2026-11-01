"use client";

import { useState } from "react";
import { answerImage } from "@/lib/api";

// An answer that's a picture (the user's crops from the syllabus). Some are wide, so a tap opens it
// large, from the right where its lines start, to scroll and zoom; a tap closes it. The pictures are
// screenshots at twice screen resolution, so "large" is half their pixel width, and never narrower
// than the screen.
export default function AnswerPicture({ question }) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-4 block w-full bg-white p-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- served by the API to signed-in instructors only */}
        <img src={answerImage(question)} alt="" className="mx-auto w-full" />
      </button>
      {open && (
        <div role="dialog" aria-modal onClick={() => setOpen(false)} className="fixed inset-0 z-20 overflow-auto bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={answerImage(question)}
            alt=""
            onLoad={(e) => setWidth(Math.max(window.innerWidth - 32, e.currentTarget.naturalWidth / 2))}
            style={width ? { width } : undefined}
            className="max-w-none"
          />
        </div>
      )}
    </>
  );
}
