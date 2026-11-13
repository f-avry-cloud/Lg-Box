const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconeAppel() {
  return (
    <svg {...base}>
      <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function IconeSms() {
  return (
    <svg {...base}>
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M8 9h8M8 12.5h5" />
    </svg>
  );
}

export function IconeEmail() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3.5 6.5 8.5 7 8.5-7" />
    </svg>
  );
}

export function IconeMenu() {
  return (
    <svg {...base} width="22" height="22">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
