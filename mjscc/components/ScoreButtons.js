"use client";

// The score squares, from 0 up to the top score, left to right as in the mock. The chosen one fills
// with the seal's blue. After Finish they can't be changed.
export default function ScoreButtons({ top, value, onPick, disabled }) {
  return (
    <div dir="ltr" role="radiogroup" className="mt-5 flex justify-between gap-2">
      {Array.from({ length: top + 1 }, (_, n) => {
        const chosen = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={disabled}
            onClick={() => onPick(n)}
            className={`aspect-square w-full max-w-15 border-2 text-[20px] transition-colors duration-150 ${
              chosen ? "border-seal bg-seal text-white" : "border-edge bg-panel text-ink active:bg-bar"
            } disabled:cursor-not-allowed`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
