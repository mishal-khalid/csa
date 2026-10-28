const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// a columned building
export function DepartmentsIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M3 7.5L10 3.5l7 4M4 7.5h12M6 10v5M10 10v5M14 10v5M3 17h14" />
    </svg>
  );
}

// a pair of scales
export function CommissionsIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M10 3.5v13M7 16.5h6M4 6h12M4 6l-2 5h4L4 6zM16 6l-2 5h4l-2-5z" />
    </svg>
  );
}

// a shield
export function ServicesIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M10 3l6 2.5V10c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V5.5L10 3z" />
    </svg>
  );
}
