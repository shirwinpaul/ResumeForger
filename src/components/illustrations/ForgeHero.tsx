/** Original hero illustration: a resume being forged on an anvil, with sparks. */
export function ForgeHero({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 300" className={className} role="img" aria-label="A resume being forged on an anvil">
      <defs>
        <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="180" cy="250" rx="150" ry="22" fill="url(#glow)" />
      {/* Document */}
      <g transform="rotate(-6 180 110)">
        <rect x="120" y="28" width="120" height="156" rx="8" fill="#ffffff" stroke="#3730a3" strokeWidth="3" />
        <rect x="136" y="46" width="60" height="9" rx="3" fill="#3730a3" />
        <rect x="136" y="62" width="88" height="5" rx="2" fill="#94a3b8" />
        <rect x="136" y="80" width="40" height="6" rx="2" fill="#b45309" />
        <rect x="136" y="92" width="88" height="4" rx="2" fill="#cbd5e1" />
        <rect x="136" y="101" width="80" height="4" rx="2" fill="#cbd5e1" />
        <rect x="136" y="110" width="84" height="4" rx="2" fill="#cbd5e1" />
        <rect x="136" y="126" width="40" height="6" rx="2" fill="#b45309" />
        <rect x="136" y="138" width="88" height="4" rx="2" fill="#cbd5e1" />
        <rect x="136" y="147" width="70" height="4" rx="2" fill="#cbd5e1" />
        <rect x="136" y="156" width="78" height="4" rx="2" fill="#cbd5e1" />
      </g>
      {/* Anvil */}
      <path
        d="M70 190h200c0 14-10 24-26 24h-34l14 26H136l14-26h-40c-24 0-40-10-40-24Z"
        fill="#334155"
      />
      <path d="M270 190h30c-4 8-14 12-30 12Z" fill="#475569" />
      <rect x="120" y="240" width="120" height="14" rx="4" fill="#1e293b" />
      {/* Hammer */}
      <g transform="rotate(28 290 70)">
        <rect x="283" y="58" width="12" height="90" rx="5" fill="#92400e" />
        <rect x="262" y="40" width="54" height="26" rx="5" fill="#475569" />
      </g>
      {/* Sparks */}
      {[
        [252, 112, 9],
        [272, 140, 6],
        [236, 92, 5],
        [300, 120, 7],
        [90, 120, 6],
        [70, 150, 4],
      ].map(([x, y, r], i) => (
        <path
          key={i}
          d={`M${x} ${y - r}l${r * 0.3} ${r * 0.7}l${r * 0.7} ${r * 0.3}l-${r * 0.7} ${r * 0.3}l-${r * 0.3} ${r * 0.7}l-${r * 0.3} -${r * 0.7}l-${r * 0.7} -${r * 0.3}l${r * 0.7} -${r * 0.3}Z`}
          fill={i % 2 ? "#f59e0b" : "#fbbf24"}
        />
      ))}
    </svg>
  );
}
