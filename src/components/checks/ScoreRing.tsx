"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

/** ATS score ring that animates up to the score (instant with reduced motion). */
export function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const reduce = useReducedMotion();
  const value = useMotionValue(0);
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = useTransform(value, (v) => circumference * (1 - v / 100));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(value, score, {
      duration: reduce ? 0 : 1.1,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, reduce, value]);

  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`ATS score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={10} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dash }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-3xl font-extrabold">{display}</span>
        <span className="text-xs text-muted">/ 100</span>
      </div>
    </div>
  );
}
