function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export function MapIcon() {
  return (
    <IconBase>
      <path d="M8 1.8c2.2 0 4 1.7 4 4 0 2.8-2.6 5.4-3.6 7.2a.5.5 0 0 1-.8 0C6.6 11.2 4 8.6 4 5.8c0-2.3 1.8-4 4-4Z" />
      <circle cx="8" cy="5.7" r="1.4" />
    </IconBase>
  );
}

export function SwordsIcon() {
  return (
    <IconBase>
      <path d="M8 2 12 4v3.4c0 3-1.8 5-4 5.8-2.2-.8-4-2.8-4-5.8V4Z" />
      <path d="M8 5v4" />
    </IconBase>
  );
}

export function ScrollIcon() {
  return (
    <IconBase>
      <path d="M4 2.5h7a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 0 14 13.5" />
      <path d="M4 2.5A1.5 1.5 0 0 0 2.5 4v8A1.5 1.5 0 0 0 4 13.5h8" />
      <path d="M5 5.8h5M5 8h4" />
    </IconBase>
  );
}

export function GearIcon() {
  return (
    <IconBase>
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 2.3v1.8M8 11.9v1.8M13.7 8h-1.8M4.1 8H2.3M12 4l-1.3 1.3M5.3 10.7 4 12M12 12l-1.3-1.3M5.3 5.3 4 4" />
    </IconBase>
  );
}

export function SparkleIcon() {
  return (
    <IconBase>
      <path d="M8 1.5c.4 2.6 1.4 3.9 4.5 4.5-3.1.6-4.1 1.9-4.5 4.5-.4-2.6-1.4-3.9-4.5-4.5C6.6 5.4 7.6 4.1 8 1.5Z" />
      <path d="M12.7 10.2c.2 1.1.6 1.6 1.8 1.8-1.2.2-1.6.7-1.8 1.8-.2-1.1-.6-1.6-1.8-1.8 1.2-.2 1.6-.7 1.8-1.8Z" />
    </IconBase>
  );
}

export function ColumnIcon() {
  return (
    <IconBase>
      <path d="M2 13.5h12M2.8 13.5V6M5.6 13.5V6M10.4 13.5V6M13.2 13.5V6M1.8 6h12.4L8 2.3z" />
    </IconBase>
  );
}

export function DragonIcon() {
  return (
    <IconBase>
      <path d="M3 4.2 5.4 11M6.2 3.4l2 7.7M9.4 4l2.2 7" />
    </IconBase>
  );
}

export function GeneralIcon() {
  return (
    <IconBase>
      <path d="M8 2v3.2M8 10.8V14M2 8h3.2M10.8 8H14M4.1 4.1l2.3 2.3M9.6 9.6l2.3 2.3M11.9 4.1 9.6 6.4M6.4 9.6l-2.3 2.3" />
    </IconBase>
  );
}

export function LanguageIcon() {
  return (
    <IconBase>
      <path d="M2.5 12 5.6 3.8h.8L9.5 12" />
      <path d="M3.6 9.2h4.8" />
      <path d="M9.7 7.8c1.6-1 3.4-1 4.6.2M10.6 6c.4.9 1 1.5 1.9 1.9M13.5 6.6c-.5 1.6-1.6 3.1-3.3 4.4" />
    </IconBase>
  );
}

export function QuillIcon() {
  return (
    <IconBase>
      <path d="M13 2c-3.8.4-7.6 2.4-9.2 6.6-.5 1.4-.8 2.7-.8 3.9 1.2-.1 2.4-.5 3.7-1.1C10.8 9.7 12.7 5.9 13 2Z" />
      <path d="M3.4 12.6 2 14" />
      <path d="M6.5 9.3 9.8 6" />
    </IconBase>
  );
}
