export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-[#F59E0B] via-[#EA580C] to-[#9A3412] shadow-[0_8px_26px_rgba(234,88,12,.32)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 17 11.5 6l3 6 4.5-8"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="19" cy="4" r="2" fill="white" />
        </svg>
      </span>
      <span className="text-[18px] font-bold tracking-[-.03em] text-ink-900">ELEVORA</span>
    </span>
  );
}
