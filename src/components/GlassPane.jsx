import { useEffect, useRef } from 'react';
import { createEngine } from '../engine/index.js';

// The pane of frosted glass with the SO-101 behind it. React owns the element; the engine owns everything
// drawn on it. The copy, sign-up and sponsors are ordinary DOM above this canvas, and the engine reads their
// layout to paint the words and to place the liquid-glass slabs.
export default function GlassPane() {
  const ref = useRef(null);
  useEffect(() => {
    const engine = createEngine({ canvas: ref.current });
    return () => engine.dispose();
  }, []);
  return <canvas id="glass" ref={ref} aria-hidden="true" />;
}
