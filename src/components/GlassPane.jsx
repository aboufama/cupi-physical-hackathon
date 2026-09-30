import { useEffect, useRef } from "react";

// Start the textured glass immediately; the poster is only a loading/WebGL fallback.
export default function GlassPane() {
  const ref = useRef(null);
  useEffect(() => {
    let cancelled = false;
    let engine;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => engine?.setPaused(motion.matches);
    const unavailable = () => {
      ref.current.hidden = true;
      delete document.documentElement.dataset.glassReady;
    };
    async function start() {
      try {
        const { createEngine } = await import("../engine/index.js");
        if (cancelled) return;
        ref.current.hidden = false;
        engine = createEngine({
          canvas: ref.current,
          paused: motion.matches,
          onError: unavailable,
        });
      } catch {
        if (!cancelled) unavailable();
      }
    }
    start();
    motion.addEventListener("change", updateMotion);
    return () => {
      cancelled = true;
      motion.removeEventListener("change", updateMotion);
      engine?.dispose();
      delete document.documentElement.dataset.glassReady;
    };
  }, []);
  return (
    <>
      <picture className="scene-poster" aria-hidden="true">
        <source media="(max-width: 760px)" srcSet={`${import.meta.env.BASE_URL}scene-mobile.jpg`} />
        <img
          src={`${import.meta.env.BASE_URL}scene-desktop.jpg`}
          width="1440"
          height="1000"
          alt=""
          fetchPriority="high"
        />
      </picture>
      <canvas id="glass" ref={ref} aria-hidden="true" />
    </>
  );
}
