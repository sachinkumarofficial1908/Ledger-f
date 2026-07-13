import React, { useEffect, useRef, useState } from "react";

const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function formatMoney(n) {
  const sign = n < 0 ? "–" : "";
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
}

/** Counts up from its previous value to the current one over ~500ms, ease-out. */
export function AnimatedMoney({ value, style }) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const frame = useRef(null);

  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) {
      setDisplay(value);
      prevValue.current = value;
      return;
    }

    const from = prevValue.current;
    const to = value;
    const duration = 500;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        prevValue.current = to;
      }
    }
    frame.current = requestAnimationFrame(tick);
    return () => frame.current && cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span style={style}>{formatMoney(display)}</span>;
}
