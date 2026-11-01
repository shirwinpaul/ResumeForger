/** Original logo: a document resting on an anvil with a spark. */
export function ForgeLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="11" y="3" width="18" height="22" rx="2" fill="#eef2ff" stroke="#3730a3" strokeWidth="2" />
      <path d="M15 10h10M15 14h10M15 18h6" stroke="#3730a3" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 26h26c0 3-2 5-5 5h-3l2 5H15l2-5h-4c-4 0-8-2-8-5Z" fill="#334155" />
      <path d="M33 6l1.2 2.6L37 9.8l-2.8 1.2L33 13.6l-1.2-2.6L29 9.8l2.8-1.2Z" fill="#f59e0b" />
    </svg>
  );
}
