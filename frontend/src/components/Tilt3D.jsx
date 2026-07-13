import React, { useRef, useCallback } from "react";

const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Wraps its children with a real pointer-driven 3D tilt: rotation follows
 * where the cursor/finger actually is over the card, with a matching
 * shadow shift so the depth reads as physical rather than a CSS filter.
 * No-ops entirely under prefers-reduced-motion, and touch drag doesn't
 * fight page scroll — it only engages on pointer devices with hover
 * (desktop mice / trackpads), never intercepting a touch scroll gesture.
 */
export function Tilt3D({ children, className = "", style = {}, max = 10, ...rest }) {
  const ref = useRef(null);
  const frame = useRef(null);

  const handleMove = useCallback(
    (e) => {
      if (PREFERS_REDUCED_MOTION || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * max * 2;
      const rotateX = (0.5 - py) * max * 2;

      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if (!ref.current) return;
        ref.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
        ref.current.style.setProperty("--tilt-shadow-x", `${(px - 0.5) * -18}px`);
        ref.current.style.setProperty("--tilt-shadow-y", `${(py - 0.5) * -18 + 14}px`);
        ref.current.style.setProperty("--tilt-glow-x", `${px * 100}%`);
        ref.current.style.setProperty("--tilt-glow-y", `${py * 100}%`);
      });
    },
    [max]
  );

  const handleLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    ref.current.style.setProperty("--tilt-shadow-x", "0px");
    ref.current.style.setProperty("--tilt-shadow-y", "10px");
  }, []);

  return (
    <div
      ref={ref}
      className={`tilt3d ${className}`}
      style={style}
      onPointerMove={(e) => e.pointerType === "mouse" && handleMove(e)}
      onPointerLeave={handleLeave}
      {...rest}
    >
      {children}
    </div>
  );
}
