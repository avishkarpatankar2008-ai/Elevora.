export function Logo({
  className = "",
  size = 32,
  showWordmark = true,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="grid place-items-center rounded-[11px] border border-line-strong bg-gradient-to-br from-blue/90 via-navy-900 to-plum/80 shadow-glow-blue"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 17.5 11.5 6l3 6L19 5"
            stroke="#0B1B32"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="19" cy="4.5" r="2" fill="#E5C9D7" />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[17px] font-bold tracking-[-0.02em] text-ink">
          ELEVORA
        </span>
      )}
    </span>
  );
}
