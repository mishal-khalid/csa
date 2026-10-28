import { ArrowIcon } from "./icons";

// Each hover in and out sends the arrow off to the top right while a fresh one flies in from
// the bottom left (always that direction, never reversed). `flights` counts those hover changes;
// every new value remounts the pair so the flight plays again.
export default function FlyingArrow({ flights }) {
  if (flights === 0) return <ArrowIcon className="size-4" />;
  return (
    <span key={flights} className="relative grid size-4 place-items-center">
      <ArrowIcon className="absolute size-4 animate-arrow-out" />
      <ArrowIcon className="size-4 animate-arrow-in" />
    </span>
  );
}
