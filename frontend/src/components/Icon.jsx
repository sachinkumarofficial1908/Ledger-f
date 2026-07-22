import React from "react";

const paths = {
  seal: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.3 2.3L16 10" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7a2 2 0 012-2h11a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
      <path d="M16 12h3v3h-3a1.5 1.5 0 010-3z" />
      <path d="M4 8.5h13" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l8 4-8 4-8-4 8-4z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 16l8 4 8-4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.6 2.9-6 5.5-6s5.5 2.4 5.5 6" />
      <path d="M15.5 6.3a3 3 0 010 5.9" />
      <path d="M17.5 14.3c2 .3 3.5 2.4 3.5 5.7" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10" />
      <path d="M11 20V4" />
      <path d="M18 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M20 20l-5-5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.2L18.8 9.4a2 2 0 000-2.8l-1.4-1.4a2 2 0 00-2.8 0L4 15.8V20z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7" />
      <path d="M6.5 7l1 12a1.5 1.5 0 001.5 1.4h6a1.5 1.5 0 001.5-1.4l1-12" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3" />
      <path d="M16 16l4-4-4-4" />
      <path d="M20 12H9" />
    </>
  ),
  close: (
    <>
      <path d="M5 5l14 14" />
      <path d="M19 5L5 19" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M20 12H4" />
      <path d="M10 6l-6 6 6 6" />
    </>
  ),
  site: (
    <>
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M9 20v-6h6v6" />
      <path d="M9 12h.01M15 12h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="1.6" />
      <path d="M8 11V8a4 4 0 018 0v3" />
      <path d="M12 15v2" />
    </>
  ),
};

export function Icon({ name, size = 20, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {paths[name] || null}
    </svg>
  );
}
