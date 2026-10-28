const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function ChevronIcon(props) {
  return (
    <svg viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

// placeholder CTA icon until the real one is chosen
export function ArrowIcon(props) {
  return (
    <svg viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M5 11l6-6M6 5h5v5" />
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M4 7.5h12M4 12.5h12" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}
