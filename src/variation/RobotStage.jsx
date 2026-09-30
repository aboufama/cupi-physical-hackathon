import { useEffect, useRef, useState } from 'react';
import { createRobotStage } from './robot-stage.js';

export default function RobotStage({ className = '' }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const engine = createRobotStage({
      canvas: canvasRef.current,
      container: containerRef.current,
      onReady: () => setStatus('ready'),
      onError: () => setStatus('error'),
    });
    engineRef.current = engine;
    return () => { engine.dispose(); engineRef.current = null; };
  }, []);

  useEffect(() => { engineRef.current?.setPaused(paused); }, [paused]);

  return (
    <div ref={containerRef} data-status={status} className={`robot-stage ${className}`}>
      <canvas
        ref={canvasRef}
        role="img"
        tabIndex={status === 'ready' ? 0 : -1}
        aria-label="Interactive SO-101 robotic arm. Drag horizontally or use left and right arrow keys to rotate. Press Home to reset the view."
        style={{ display: status === 'error' ? 'none' : 'block', width: '100%', height: '100%', touchAction: 'pan-y', cursor: 'grab' }}
      />
      {status !== 'ready' && (
        <div className="robot-stage__fallback" role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center', color: 'var(--v-acid, #e6f58b)' }}>
          <svg aria-hidden="true" viewBox="0 0 240 240" style={{ width: 210, margin: 'auto' }} fill="none" stroke="currentColor" strokeWidth="13" strokeLinejoin="round">
            <path d="M61 210h112M95 204v-28l-27-64 60-69 54 41-19 43M163 127l-19 18m19-18 20 18" />
            <circle cx="68" cy="112" r="15" fill="var(--v-acid, #e2ef64)" />
            <circle cx="128" cy="43" r="15" fill="var(--v-acid, #e2ef64)" />
            <circle cx="182" cy="84" r="11" fill="var(--v-acid, #e2ef64)" />
          </svg>
          <span style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 16 }}>{status === 'loading' ? 'Assembling the exhibit…' : 'SO-101 · Robotic arm'}</span>
        </div>
      )}
      {status === 'ready' && (
        <div className="robot-stage__controls" style={{ position: 'absolute', bottom: 16, left: 18, right: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--v-acid, #e6f58b)' }}>
          <button type="button" className="robot-stage__pause" aria-pressed={paused} onClick={() => setPaused(!paused)} style={{ minHeight: 40, padding: '8px 0', color: 'inherit', background: 'transparent', border: 0, font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', cursor: 'pointer' }}>
            {paused ? '↻ Resume motion' : 'Ⅱ Pause motion'}
          </button>
          <span className="robot-stage__hint" aria-hidden="true">↔ Drag to explore</span>
        </div>
      )}
    </div>
  );
}
