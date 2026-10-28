const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// one stem splitting into three
export function BranchesIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M10 17.5V10M10 10L4.5 4.5M10 10V2.5M10 10l5.5-5.5" />
    </svg>
  );
}

// a globe
export function GlobeIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5c2.5 2.5 2.5 12.5 0 15M10 2.5c-2.5 2.5-2.5 12.5 0 15" />
    </svg>
  );
}
