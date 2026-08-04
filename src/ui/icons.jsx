// One icon set, drawn to a single spec: 24px box, 1.8 stroke, round caps and
// joins, no fills. Round terminals match the rounded corners and the softer
// typeface; square ones read as clerical next to them.
//
// Emoji were the placeholder: they render differently on every Android and
// never match the interface's own line weight.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

/** A nota with a torn foot, the same artifact as the app icon. */
export const IconKasir = (props) => (
  <svg {...base} {...props}>
    <path d="M5 3h14v16l-2.3-1.6L14.4 19l-2.4-1.6L9.6 19l-2.3-1.6L5 19V3Z" />
    <path d="M8.5 8h7M8.5 12h4.5" />
  </svg>
);

/** A crate, for goods on the shelf. */
export const IconBarang = (props) => (
  <svg {...base} {...props}>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
    <path d="M3 7.5 12 12l9-4.5M12 12v9" />
  </svg>
);

/** A ledger book: what utang was written in before this app. */
export const IconUtang = (props) => (
  <svg {...base} {...props}>
    <path d="M5 3.5h11a2 2 0 0 1 2 2v15H7a2 2 0 0 1-2-2v-15Z" />
    <path d="M18 16.5H7a2 2 0 0 0-2 2M9 7.5h5" />
  </svg>
);

/** Bars, ascending: the day's takings. */
export const IconLaporan = (props) => (
  <svg {...base} {...props}>
    <path d="M4 20h16" />
    <path d="M7 20v-6M12 20V7M17 20v-9" />
  </svg>
);

export const IconAtur = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2.4" />
    <circle cx="10" cy="17" r="2.4" />
  </svg>
);

/** Barcode between scanner brackets: the fastest path at a kelontong till. */
export const IconScan = (props) => (
  <svg {...base} {...props}>
    <path d="M3 8V4h4M21 8V4h-4M3 16v4h4M21 16v4h-4" />
    <path d="M7.5 8v8M11 8v8M14.5 8v8M18 8v8" strokeWidth="1.5" />
  </svg>
);

/** The tick on the sale-complete confirmation. */
export const IconCek = (props) => (
  <svg {...base} {...props} strokeWidth="2.6">
    <path d="M5 12.5 10 17.5 19 7.5" />
  </svg>
);

export const ICONS = {
  kasir: IconKasir,
  barang: IconBarang,
  utang: IconUtang,
  laporan: IconLaporan,
  atur: IconAtur,
};
