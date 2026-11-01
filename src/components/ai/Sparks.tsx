"use client";

import { motion, useReducedMotion } from "framer-motion";

const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(angle) * 26, y: Math.sin(angle) * 18, delay: (i % 3) * 0.04, color: i % 2 ? "var(--accent)" : "var(--primary)" };
});

/**
 * A small burst of forge sparks, played once when an AI suggestion arrives.
 * Decorative only (hidden from screen readers) and skipped with reduced motion.
 */
export function Sparks() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span aria-hidden="true" className="pointer-events-none relative inline-block h-0 w-0 align-middle">
      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full"
          style={{ background: s.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.x, y: s.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.7, delay: s.delay, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}
