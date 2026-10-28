import { Fragment } from "react";

// pause before the first letter, then the gap between letters (spaces count, like a typewriter)
const START_MS = 150;
const STAGGER_MS = 30;

// Types text out letter by letter, each letter sharpening out of a blur.
// Pure CSS, so it starts on first paint and plays once per page load.
export default function BlurTypeIn({ text }) {
  const words = text.split(" ");
  // where each word starts in the text, so its letters keep their place in the typing order
  const starts = words.map((_, w) => (w === 0 ? 0 : words.slice(0, w).join(" ").length + 1));

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <Fragment key={w}>
            {w > 0 && " "}
            {/* keeps each word on one line while its letters animate separately */}
            <span className="whitespace-nowrap">
              {[...word].map((char, c) => (
                <span
                  key={c}
                  className="animate-blur-in motion-reduce:animate-none"
                  style={{ animationDelay: `${START_MS + (starts[w] + c) * STAGGER_MS}ms` }}
                >
                  {char}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </>
  );
}
