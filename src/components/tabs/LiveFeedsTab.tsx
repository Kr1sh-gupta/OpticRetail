import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Eye, EyeOff, Camera, ChevronLeft, ChevronRight } from 'lucide-react';

const CAMERAS = [
  { id: 'CAM_FLOOR_01',   name: 'Main Floor Zone A', zone: 'SKINCARE / FRAGRANCE', status: 'ONLINE',  type: 'floor',   file: 'CAM 1.mp4' },
  { id: 'CAM_FLOOR_02',   name: 'Main Floor Zone B', zone: 'MAKEUP / ACCESSORIES', status: 'ONLINE',  type: 'floor',   file: 'CAM 2.mp4' },
  { id: 'CAM_ENTRY_03',   name: 'Entry / Exit',       zone: 'ENTRANCE THRESHOLD',  status: 'ONLINE',  type: 'entry',   file: 'CAM 3.mp4' },
  { id: 'CAM_STORAGE_04', name: 'Storage Room',       zone: 'NON-CUSTOMER ZONE',   status: 'ONLINE',  type: 'storage', file: 'CAM 4.mp4' },
  { id: 'CAM_BILLING_05', name: 'Billing Counter',    zone: 'CHECKOUT / POS',      status: 'ONLINE',  type: 'billing', file: 'CAM 5.mp4' },
];

const CYCLE_INTERVAL_MS = 4000;

export function LiveFeedsTab() {
  const [activeCamIdx, setActiveCamIdx] = useState<number | null>(null);
  const [overlayActive, setOverlayActive] = useState(false);
  const [cycleProgress, setCycleProgress] = useState(0);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-cycling: rotate through all cameras every 4 seconds when in expanded view
  useEffect(() => {
    if (activeCamIdx === null) return;

    // Progress bar
    setCycleProgress(0);
    progressRef.current = setInterval(() => {
      setCycleProgress(p => Math.min(p + (100 / (CYCLE_INTERVAL_MS / 100)), 100));
    }, 100);

    // Camera rotation
    cycleRef.current = setInterval(() => {
      setActiveCamIdx(prev => (prev === null ? 0 : (prev + 1) % CAMERAS.length));
      setCycleProgress(0);
    }, CYCLE_INTERVAL_MS);

    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [activeCamIdx !== null]);

  const goTo = (idx: number) => {
    if (cycleRef.current) clearInterval(cycleRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setActiveCamIdx(idx);
    setCycleProgress(0);
  };

  const activeCam = activeCamIdx !== null ? CAMERAS[activeCamIdx] : null;

  // ─── Expanded single camera view ───────────────────────────────────────
  if (activeCam !== null && activeCamIdx !== null) {
    const isStorage = activeCam.type === 'storage';

    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => { setActiveCamIdx(null); if (cycleRef.current) clearInterval(cycleRef.current); if (progressRef.current) clearInterval(progressRef.current); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={18} /> Back to Grid
          </button>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Manual prev/next */}
            <button onClick={() => goTo((activeCamIdx - 1 + CAMERAS.length) % CAMERAS.length)}
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.7rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              {activeCamIdx + 1} / {CAMERAS.length}
            </span>
            <button onClick={() => goTo((activeCamIdx + 1) % CAMERAS.length)}
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.7rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <ChevronRight size={16} />
            </button>

            {/* Overlay toggle */}
            <button
              onClick={() => setOverlayActive(!overlayActive)}
              disabled={isStorage}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isStorage ? 'not-allowed' : 'pointer',
                background: overlayActive ? 'rgba(0, 255, 65, 0.1)' : 'var(--card-bg)',
                border: overlayActive ? '1px solid var(--cyber-accent)' : '1px solid var(--border-color)',
                color: overlayActive ? 'var(--cyber-accent)' : 'var(--text-primary)',
                padding: '0.5rem 1rem', borderRadius: '8px', transition: 'all 0.2s',
                fontWeight: 600, opacity: isStorage ? 0.4 : 1,
              }}
            >
              {overlayActive ? <Eye size={16} /> : <EyeOff size={16} />}
              {overlayActive ? 'OVERLAY: ON' : 'OVERLAY: OFF'}
            </button>
          </div>
        </div>

        {/* Auto-cycle progress bar */}
        <div style={{ height: '3px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${cycleProgress}%`, background: 'var(--cyber-accent)', transition: 'width 0.1s linear', borderRadius: '2px' }} />
        </div>

        {/* Camera name strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{activeCam.name}</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{activeCam.id} · {activeCam.zone}</span>
          </div>
          {isStorage && (
            <span style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', border: '1px solid var(--warning)', borderRadius: '6px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>
              NON-CUSTOMER ZONE
            </span>
          )}
        </div>

        {/* Video player area */}
        <div className="card" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', minHeight: '380px' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'radial-gradient(circle, #222 1px, transparent 1px)', backgroundSize: '12px 12px' }} />

          <video
            src={`/@fs/e:/purplle/CCTV Footage/${activeCam.file}`}
            autoPlay
            loop
            muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isStorage ? 0.3 : 1 }}
          />

          {isStorage && (
            <div style={{ textAlign: 'center', zIndex: 1, background: 'rgba(0,0,0,0.6)', padding: '1rem', borderRadius: '8px' }}>
              <Camera size={40} color="#888" style={{ margin: '0 auto' }} />
              <p style={{ color: '#ddd', marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>STORAGE ROOM — ANALYTICS EXCLUDED</p>
            </div>
          )}

          {/* Intelligence overlay — only for customer-facing cameras */}
          {overlayActive && !isStorage && (
            <div className="cyber-overlay">
              <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', color: 'var(--cyber-accent)' }} className="mono">
                <p>[ YOLOv8n ONNX · onnxruntime ]</p>
                <p>FEED: {activeCam.id}</p>
                <p>FPS: 15 · FRAME_SKIP: 5</p>
                <p>MODEL: yolov8n.onnx</p>
              </div>

              {/* Mock customer bounding box */}
              <div className="bounding-box" style={{ top: '30%', left: '35%', width: '110px', height: '240px' }}>
                <span className="mono" style={{ position: 'absolute', top: '-20px', left: 0, color: 'var(--cyber-accent)', fontSize: '10px', background: 'rgba(0,255,65,0.2)', padding: '2px 4px' }}>
                  VIS_A3F9 [0.93] CUSTOMER
                </span>
              </div>

              {/* Mock staff bounding box */}
              <div className="bounding-box" style={{ top: '40%', left: '62%', width: '90px', height: '210px', borderColor: 'var(--warning)', background: 'rgba(245,158,11,0.04)' }}>
                <span className="mono" style={{ position: 'absolute', top: '-20px', left: 0, color: 'var(--warning)', fontSize: '10px', background: 'rgba(245,158,11,0.2)', padding: '2px 4px' }}>
                  STAFF [0.88] EXCLUDED
                </span>
              </div>

              {/* Zone label for billing cameras */}
              {activeCam.type === 'billing' && (
                <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', border: '1px dashed rgba(0,255,65,0.4)', padding: '0.5rem 2rem', color: 'var(--cyber-accent)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  BILLING ZONE · QUEUE DEPTH: 3
                </div>
              )}
            </div>
          )}
        </div>

        {/* Camera thumbnails strip */}
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {CAMERAS.map((cam, idx) => (
            <button key={cam.id} onClick={() => goTo(idx)}
              style={{
                flexShrink: 0, width: '120px', background: idx === activeCamIdx ? 'rgba(0,255,65,0.08)' : 'var(--card-bg)',
                border: idx === activeCamIdx ? '1px solid var(--cyber-accent)' : '1px solid var(--border-color)',
                borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
              }}>
              <div style={{ height: '60px', background: '#111', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
                <Camera size={18} color={idx === activeCamIdx ? 'var(--cyber-accent)' : '#333'} />
              </div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: idx === activeCamIdx ? 'var(--cyber-accent)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cam.id}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Camera grid view ──────────────────────────────────────────────────
  return (
    <div className="content-grid">
      <div style={{ gridColumn: 'span 12', marginBottom: '-0.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Live Camera Feeds</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Select any feed to expand. Auto-cycling activates in expanded view.
        </p>
      </div>

      {CAMERAS.map((cam, idx) => (
        <div
          key={cam.id}
          onClick={() => goTo(idx)}
          className="card"
          style={{
            gridColumn: 'span 4', cursor: 'pointer', transition: 'transform 0.2s',
            border: cam.type === 'storage' ? '1px solid rgba(245,158,11,0.3)' : undefined
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ height: '150px', background: '#000', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
            <video
              src={`/@fs/e:/purplle/CCTV Footage/${cam.file}`}
              autoPlay
              loop
              muted
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: cam.type === 'storage' ? 0.3 : 0.8 }}
            />
            {cam.type === 'storage' && <Camera size={28} color="#aaa" style={{ zIndex: 1 }} />}
            <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 700, zIndex: 2 }}>
              <div style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              REC
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{cam.name}</h3>
            {cam.type === 'storage' && (
              <span style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                EXCLUDED
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{cam.id}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{cam.zone}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
