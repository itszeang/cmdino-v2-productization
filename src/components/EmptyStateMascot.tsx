interface Props {
  size?: number;
}

export function EmptyStateMascot({ size = 80 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* body */}
      <rect x="14" y="32" width="36" height="24" rx="8" fill="var(--surface-2)" />
      {/* head */}
      <rect x="38" y="12" width="26" height="24" rx="7" fill="var(--surface-2)" />
      {/* tail */}
      <path d="M14 50 Q2 52 2 62 L8 62 Q8 54 16 52 Z" fill="var(--surface-2)" />
      {/* arm (tiny) */}
      <rect x="44" y="36" width="10" height="6" rx="3" fill="var(--border-subtle)" />
      {/* left leg */}
      <rect x="20" y="54" width="9" height="16" rx="4" fill="var(--surface-2)" />
      {/* right leg */}
      <rect x="34" y="54" width="9" height="16" rx="4" fill="var(--surface-2)" />
      {/* eye */}
      <circle cx="56" cy="22" r="3" fill="var(--app-bg)" />
    </svg>
  );
}
