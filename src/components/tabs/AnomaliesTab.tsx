import { useState, useEffect } from 'react';
import { AlertCircle, Video, Play, RefreshCw, CheckCircle, ShieldAlert, Mail, Clock, Users, Flame } from 'lucide-react';

export function AnomaliesTab() {
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    const storeId = "STORE_BLR_002";
    const fetchAnomalies = () => {
      fetch(`http://localhost:8000/stores/${storeId}/anomalies`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAnomalies(data);
        })
        .catch(console.error);
    };

    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="content-grid" style={{ gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* HEADER */}
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle color="var(--danger)" /> Security & Anomaly Detection
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
          Review automated security logs, secure room breaches, and live AI-powered shoplifting detection telemetry.
        </p>
      </div>

      {/* RENDER ACTIVE ANOMALIES */}
      {anomalies.map((anom) => {
        const frameColor = anom.type === 'CRITICAL' ? 'var(--danger)' : anom.type === 'WARN' ? 'var(--warning)' : 'var(--text-secondary)';
        return (
          <AnomalyCard 
            key={anom.id}
            id={anom.id}
            type={anom.type} 
            title={anom.title} 
            time={anom.time} 
            zone={anom.zone} 
            desc={anom.description}
            action={anom.suggested_action}
            frameColor={frameColor}
            noFrame={anom.id === "ANOM_CLEAR"}
          />
        );
      })}

      {/* DETECTIONS DEMO CARD - PLACED SIDE-BY-SIDE WITH "ALL SYSTEMS NORMAL" OR INDEPENDENTLY */}
      <ConcealmentDemoCard />

      {anomalies.length === 0 && (
         <div style={{ gridColumn: 'span 12', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
           Loading active security rules...
         </div>
      )}

    </div>
  );
}

function AnomalyCard({ id, type, title, time, zone, desc, action, frameColor, noFrame }: any) {
  // Render custom premium visualizer depending on the anomaly type
  const renderVisualizer = () => {
    if (noFrame) {
      return (
        <div style={{ color: 'var(--success)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center', padding: '1rem' }}>
          <Video size={40} style={{ opacity: 0.8 }} />
          <span className="mono" style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.5px' }}>STORE OPERATIONS STABLE</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No active security room violations.</span>
        </div>
      );
    }

    if (id === "ANOM_QUEUE_SPIKE") {
      return (
        <div style={{ position: 'absolute', inset: 0, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(245,158,11,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="mono" style={{ color: 'var(--warning)', fontSize: '0.7rem', fontWeight: 700 }}>CAM5 • REGISTERS</span>
            <span className="mono" style={{ color: '#fff', fontSize: '0.7rem' }}>LIVE FEED</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={32} color="var(--warning)" style={{ animation: 'pulse 1s infinite' }} />
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 700 }}>CHECKOUT BOTTLENECK ALERT</span>
            <div style={{ width: '80%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: '92%', height: '100%', background: 'var(--warning)', borderRadius: '3px' }} />
            </div>
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Q-Depth: 14 shoppers (Max threshold: 8)</span>
        </div>
      );
    }

    if (id.startsWith("ANOM_STORAGE")) {
      return (
        <div style={{ position: 'absolute', inset: 0, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(239,68,68,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="mono" style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 700 }}>CAM4 • SECURE ROOM</span>
            <span className="mono" style={{ color: '#fff', fontSize: '0.7rem' }}>ACCESS BREACH</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={32} color="var(--danger)" style={{ animation: 'bounce 1s infinite' }} />
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 800, letterSpacing: '0.5px' }}>SECURE ROOM INTRUSION</span>
            <div style={{ fontSize: '0.65rem', border: '1px solid var(--danger)', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontWeight: 700 }}>
              NON-STAFF VISITOR DETECTED
            </div>
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Zone: INVENTORY STORAGE DOOR A</span>
        </div>
      );
    }

    if (id.startsWith("ANOM_THEFT")) {
      return (
        <div style={{ position: 'absolute', inset: 0, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(239,68,68,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="mono" style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 700 }}>CAM4 • THEFT DETECTOR</span>
            <span className="mono" style={{ color: '#fff', fontSize: '0.7rem' }}>YOLO TELEMETRY</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <Flame size={32} color="var(--danger)" style={{ animation: 'pulse 1.2s infinite' }} />
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 800 }}>SUSPICIOUS OBSCURATION</span>
            <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>YOLO Confidence Drop: 94% → 12% (-82%)</span>
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--danger)', fontWeight: 700 }}>⚠️ EVIDENCE COLLAGE EMAILED</span>
        </div>
      );
    }

    if (id.startsWith("ANOM_LOITER")) {
      return (
        <div style={{ position: 'absolute', inset: 0, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(245,158,11,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="mono" style={{ color: 'var(--warning)', fontSize: '0.7rem', fontWeight: 700 }}>LOITER MONITOR</span>
            <span className="mono" style={{ color: '#fff', fontSize: '0.7rem' }}>TIMED DWELL</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={32} color="var(--warning)" />
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 700 }}>EXCESSIVE STATIONARY DWELL</span>
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Stationary limit exceeded in customer zone</span>
        </div>
      );
    }

    // Default Fallback
    return (
      <>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
        <div className="mono" style={{ position: 'absolute', top: '10px', left: '10px', color: frameColor, fontSize: '0.75rem', fontWeight: 700 }}>REC • {zone}</div>
        <div className="mono" style={{ position: 'absolute', top: '10px', right: '10px', color: '#fff', fontSize: '0.75rem' }}>{time}</div>
        <div style={{ border: `2px dashed ${frameColor}`, width: '80px', height: '140px', position: 'absolute', top: '25%', left: '40%', background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ background: frameColor, color: '#000', fontSize: '0.65rem', fontWeight: 800, padding: '2px 4px', position: 'absolute', top: '-16px', left: '-2px' }}>DETECTED</div>
        </div>
      </>
    );
  };

  return (
    <div className="card" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: `1px solid ${frameColor}` }}>
      
      {/* CCTV FRAME PLACEHOLDER */}
      <div style={{ height: '220px', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderVisualizer()}
      </div>

      {/* CARD CONTENT */}
      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>
          <span className="mono" style={{ fontSize: '0.65rem', background: `rgba(${type === 'CRITICAL' ? '239, 68, 68' : type === 'WARN' ? '245, 158, 11' : '148, 163, 184'}, 0.1)`, color: frameColor, padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
            {type}
          </span>
        </div>
        
        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {desc}
        </p>
        
        {action && (
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: 'var(--accent)', lineHeight: 1.5, fontWeight: 500 }}>
             Action: {action}
          </p>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem' }}>
          {!noFrame && (
            <button style={{ flex: 1, background: frameColor, color: '#000', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              Acknowledge
            </button>
          )}
          <button style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.65rem', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>
            {noFrame ? 'Close' : 'View Full Video'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// BILLIANCE CONCEALMENT AI SIMULATOR
// ----------------------------------------------------------------
function ConcealmentDemoCard() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [emailStatus, setEmailStatus] = useState<string>('idle'); // idle, sending, sent
  const [confidence, setConfidence] = useState<number>(94);

  const runSimulation = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setStep(0);
    setConfidence(94);
    setEmailStatus('idle');
    setLogs(["[BILLIANCE AI] Initializing shoplifting detector...", "[BILLIANCE AI] Loading custom YOLOv8 model weights (yolov8n.onnx)...", "[TRACKER] Tracking suspect (VIS_92A1) in secure room..."]);

    const timeline = [
      { time: 1000, conf: 94, log: "[YOLOv8] Target product detected - confidence: 94% [OK]" },
      { time: 2200, conf: 91, log: "[YOLOv8] Customer interaction detected. Item lifted. confidence: 91% [OK]" },
      { time: 3500, conf: 88, log: "[TRACKER] VIS_92A1 approaching torso area. confidence: 88% [OK]" },
      { time: 4800, conf: 52, log: "[ALERT] YOLO confidence drop detected! confidence: 52% [WARNING: Partial Obscuration]" },
      { time: 6200, conf: 18, log: "[CRITICAL] confidence: 18% [ALERT: Product completely obscured!]" },
      { time: 7500, conf: 4, log: "🚨 [THEFT DETECTED] CONFIDENCE DROP: -90% (exceeds 30% drop threshold!)." },
      { time: 8800, conf: 0, log: "[SMTP GATEWAY] Packaging frame evidence and compiling shoplifting_collage.jpg..." },
      { time: 10000, conf: 0, log: "📨 [MAIL DISPATCH] Simulated email alert with collage successfully sent to security!" }
    ];

    timeline.forEach((item, index) => {
      setTimeout(() => {
        setStep(index + 1);
        setConfidence(item.conf);
        setLogs(prev => [...prev, item.log]);
        
        if (index === 5) {
          // Shoplifting alert trigger
          setEmailStatus('sending');
        }
        if (index === 7) {
          setEmailStatus('sent');
          setIsPlaying(false);
        }
      }, item.time);
    });
  };

  return (
    <div className="card" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: `1px solid var(--accent)` }}>
      
      {/* CCTV FRAME SIMULATED PLAYER */}
      <div style={{ height: '220px', background: '#000', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px' }}>
        
        {/* CCTV Overlays */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', zIndex: 2 }}>
          <div className="mono" style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            AI DEMO • Test3_Staff.mp4
          </div>
          <div className="mono" style={{ color: '#fff', fontSize: '0.75rem' }}>14:57:30 UTC</div>
        </div>

        {/* Video Canvas Graphic */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          
          {/* Animated scans */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '8px 8px' }} />

          {step === 0 && (
            <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', padding: '1rem', zIndex: 2 }}>
              <ShieldAlert size={36} color="var(--accent)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Concealment AI (Billiance Heuristic)</span>
              <button 
                onClick={runSimulation}
                style={{ 
                  background: 'var(--accent)', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '0.5rem 1.25rem', 
                  borderRadius: '20px', 
                  fontWeight: 600, 
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <Play size={12} fill="#fff" /> Start YOLO Simulation
              </button>
            </div>
          )}

          {step > 0 && (
            <div style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              
              {/* Fake Gimmick overlay bounds */}
              {step < 5 && (
                <div style={{ 
                  border: '2px solid #4caf50', 
                  background: 'rgba(76,175,80,0.05)', 
                  width: '100px', 
                  height: '140px', 
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '4px'
                }}>
                  <span className="mono" style={{ background: '#4caf50', color: '#000', fontSize: '0.6rem', padding: '1px 3px', fontWeight: 700, alignSelf: 'flex-start' }}>
                    VIS_92A1: OK
                  </span>
                  <span className="mono" style={{ color: '#4caf50', fontSize: '0.65rem', alignSelf: 'flex-end', fontWeight: 600 }}>
                    CONF: {confidence}%
                  </span>
                </div>
              )}

              {step === 5 && (
                <div style={{ 
                  border: '2px dashed #f59e0b', 
                  background: 'rgba(245,158,11,0.08)', 
                  width: '100px', 
                  height: '140px', 
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '4px',
                  animation: 'pulse 1s infinite'
                }}>
                  <span className="mono" style={{ background: '#f59e0b', color: '#000', fontSize: '0.6rem', padding: '1px 3px', fontWeight: 700, alignSelf: 'flex-start' }}>
                    OBSCURATION
                  </span>
                  <span className="mono" style={{ color: '#f59e0b', fontSize: '0.65rem', alignSelf: 'flex-end', fontWeight: 600 }}>
                    CONF: {confidence}%
                  </span>
                </div>
              )}

              {step >= 6 && (
                <div style={{ 
                  border: '2px solid var(--danger)', 
                  background: 'rgba(239,68,68,0.15)', 
                  width: '100px', 
                  height: '140px', 
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '4px'
                }}>
                  <span className="mono" style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.6rem', padding: '1px 3px', fontWeight: 800, alignSelf: 'flex-start' }}>
                    THEFT DETECTED
                  </span>
                  <span className="mono" style={{ color: 'var(--danger)', fontSize: '0.65rem', alignSelf: 'flex-end', fontWeight: 800 }}>
                    CONF: {confidence}%
                  </span>
                </div>
              )}

            </div>
          )}
        </div>

        {/* BOTTOM METRICS PANEL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', zIndex: 2, background: 'rgba(0,0,0,0.7)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.7rem', display: 'flex', gap: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>YOLO Confidence: <strong style={{ color: confidence > 60 ? '#4caf50' : confidence > 30 ? '#f59e0b' : 'var(--danger)' }}>{confidence}%</strong></span>
            <span>Threshold: <strong>30% drop</strong></span>
          </div>
          {emailStatus === 'sending' && (
            <span style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <RefreshCw size={10} className="spin" /> Email Alert In-Flight
            </span>
          )}
          {emailStatus === 'sent' && (
            <span style={{ color: '#4caf50', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <CheckCircle size={10} /> Email Sent
            </span>
          )}
        </div>
      </div>

      {/* DISCLAIMER BLOCK (VERY CLEAR) */}
      <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: 'var(--accent)' }}>
          <ShieldAlert size={12} /> DEMO MODE — TESTING PHASE
        </div>
        <p style={{ margin: 0, lineHeight: 1.4 }}>
          The person shown in this clip (Aisle 3 Floor) is performing a <strong>choreographed gesture</strong> to validate the Billiance Confidence Drop heuristic. No actual theft is occurring.
        </p>
      </div>

      {/* TELEMETRY FEED TERMINAL */}
      <div style={{ padding: '1rem', background: '#0e131f', fontFamily: 'monospace', fontSize: '0.72rem', height: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)' }}>
        {logs.length === 0 ? (
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>Click "Start YOLO Simulation" above to display live telemetry feeds...</span>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ 
              color: log.includes('🚨') || log.includes('CRITICAL') ? 'var(--danger)' : log.includes('WARNING') || log.includes('ALERT') ? '#f59e0b' : log.includes('successfully') ? '#4caf50' : 'rgba(255,255,255,0.65)',
              borderLeft: log.includes('[BILLIANCE') ? '2px solid var(--accent)' : 'none',
              paddingLeft: log.includes('[BILLIANCE') ? '4px' : 0
            }}>
              {log}
            </div>
          ))
        )}
      </div>

      {/* COLLAGE ATTACHMENT PREVIEW */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Compiled SMTP Email Attachment Evidence:</span>
        
        {step < 6 ? (
          <div style={{ height: '70px', background: 'var(--bg-color)', border: '1px dashed var(--border-color)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
            <Mail size={16} />
            <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem' }}>Waiting for concealment trigger...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            <CollageFrame text="Frame 1: Lifted" border="#4caf50" />
            <CollageFrame text="Frame 2: Torso" border="#4caf50" />
            <CollageFrame text="Frame 3: Obscured" border="#f59e0b" />
            <CollageFrame text="Frame 4: Alert!" border="var(--danger)" isCritical />
          </div>
        )}
      </div>

    </div>
  );
}

function CollageFrame({ text, border, isCritical }: any) {
  return (
    <div style={{ 
      height: '60px', 
      background: '#000', 
      border: `1px solid ${border}`, 
      borderRadius: '4px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      padding: '4px',
      position: 'relative'
    }}>
      <div style={{ width: '100%', height: '100%', opacity: 0.2, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '5px 5px', position: 'absolute', inset: 0 }} />
      <span style={{ fontSize: '0.45rem', color: '#fff', zIndex: 1, fontWeight: 600 }}>REC • AISLE 3</span>
      <span style={{ fontSize: '0.5rem', color: border, zIndex: 1, fontWeight: 700, alignSelf: 'center', textAlign: 'center', textTransform: 'uppercase' }}>
        {isCritical ? "Concealed" : "Tracking"}
      </span>
      <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.4)', zIndex: 1 }}>{text}</span>
    </div>
  );
}
