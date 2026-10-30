// Line icons in the main site's style (1.5 stroke, rounded), drawn to a 20-unit grid.
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// a house
export function HomeIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M3 8.5L10 3l7 5.5V16a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1V8.5z" />
    </svg>
  );
}

// a door with an arrow leaving it
export function LogOutIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M8 3.5H5a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 5 16.5h3M12.5 13.5L16 10l-3.5-3.5M16 10H8" />
    </svg>
  );
}

// an arrow pointing up and to the right (a link to another site)
export function OutIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M6.5 13.5l7-7M8 6.5h5.5V12" />
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M3.5 7h13M3.5 13h13" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

// two people, one behind the other
export function UsersIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M7.5 9a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5zM2.5 16.5c0-2.75 2.25-4.75 5-4.75s5 2 5 4.75M13 3.75a2.5 2.5 0 0 1 0 5M14.75 11.9c1.7.55 2.75 2.1 2.75 4.1" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}

// an open eye (show the password)
export function EyeIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
      <circle cx="10" cy="10" r="2.25" />
    </svg>
  );
}

// the eye struck through (hide it again)
export function EyeOffIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M8.2 4.7A7.6 7.6 0 0 1 10 4.5c5 0 8 5.5 8 5.5a14 14 0 0 1-2.2 2.9M5.4 6.1C3.2 7.6 2 10 2 10s3 5.5 8 5.5a7.4 7.4 0 0 0 3.6-.9M8.4 8.4a2.25 2.25 0 0 0 3.2 3.2M3 3l14 14" />
    </svg>
  );
}

// a bin
export function TrashIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 5.5l.75 10.1a1.5 1.5 0 0 0 1.5 1.4h5.5a1.5 1.5 0 0 0 1.5-1.4L15 5.5M8.5 8.5v5.5M11.5 8.5v5.5" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}

// the green tick for a field that checks out
export function Tick({ className = "size-5" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`${className} text-emerald-600`}>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

// a fingerprint: arches around a centre line
export function FingerprintIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M3.5 12.5v-3a6.5 6.5 0 0 1 13 0v1M16.4 13.6c-.1 1-.35 2-.7 2.9M6.1 15.9c.45-1.15.65-2.6.65-4.4v-2a3.25 3.25 0 0 1 6.5 0v1.5c0 1.9-.2 3.6-.65 5.1M10 9.5v2c0 2.4-.55 4.4-1.6 6" />
    </svg>
  );
}

// the Directory tab: an organisation chart, one box over two
export function DirectoryIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <rect x="7.5" y="2.5" width="5" height="4" rx="1" />
      <rect x="2.5" y="13.5" width="5" height="4" rx="1" />
      <rect x="12.5" y="13.5" width="5" height="4" rx="1" />
      <path d="M10 6.5v3.5M5 13.5V10h10v3.5" />
    </svg>
  );
}

export function FolderIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h3.5l1.75 2H16a1.5 1.5 0 0 1 1.5 1.5V15a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 15z" />
    </svg>
  );
}

// a department: a columned building
export function DepartmentIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M3 7.5L10 3.5l7 4M4 7.5h12M5.75 7.5v6.5M8.6 7.5v6.5M11.4 7.5v6.5M14.25 7.5v6.5M3.5 14h13M2.5 16.5h15" />
    </svg>
  );
}

// a body: members joined together
export function BodyIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <circle cx="10" cy="5" r="2" />
      <circle cx="4.75" cy="14.5" r="2" />
      <circle cx="15.25" cy="14.5" r="2" />
      <path d="M9 6.75l-3.25 5.9M11 6.75l3.25 5.9M6.75 14.5h6.5" />
    </svg>
  );
}

// a commission: scales
export function CommissionIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M10 3.5v13M6.5 16.5h7M4 6h12M4 6l-2.25 5.25a2.25 2.25 0 0 0 4.5 0zM16 6l-2.25 5.25a2.25 2.25 0 0 0 4.5 0z" />
    </svg>
  );
}

// a company: a briefcase
export function CompanyIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <rect x="2.5" y="6" width="15" height="10.5" rx="1.5" />
      <path d="M7 6V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6M2.5 10.5h15" />
    </svg>
  );
}

// an institution: a block with rows of windows
export function InstitutionIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M4.5 16.5V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v12.5M12.5 8h2a1 1 0 0 1 1 1v7.5M2.5 16.5h15M7 6h.5M10 6h.5M7 9h.5M10 9h.5M7 12h.5M10 12h.5" />
    </svg>
  );
}

// any other kind
export function KindIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <rect x="4" y="4" width="12" height="12" rx="3" />
    </svg>
  );
}

// the handle an entry is dragged by: two columns of dots
export function GripIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      {[5, 10, 15].map((y) => (
        <g key={y}>
          <circle cx="7.5" cy={y} r="1.1" />
          <circle cx="12.5" cy={y} r="1.1" />
        </g>
      ))}
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M8 5l5 5-5 5" />
    </svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <svg viewBox="0 0 20 20" {...stroke} {...props}>
      <path d="M12 5l-5 5 5 5" />
    </svg>
  );
}
