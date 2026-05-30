import { useState, useEffect } from 'react';
import { AlertCircle, Video } from 'lucide-react';

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
    const interval = setInterval(fetchAnomalies, 10000); // Check for anomalies every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="content-grid" style={{ gap: '1.5rem', paddingBottom: '2rem' }}>
      
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle color="var(--danger)" /> Security & Anomaly Detection
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Review captured frames and video snippets of automated system alerts.</p>
      </div>

      {anomalies.map((anom) => {
        const frameColor = anom.type === 'CRITICAL' ? 'var(--danger)' : anom.type === 'WARN' ? 'var(--warning)' : 'var(--text-secondary)';
        return (
          <AnomalyCard 
            key={anom.id}
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

      {anomalies.length === 0 && (
         <div style={{ gridColumn: 'span 12', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
           Loading anomalies...
         </div>
      )}

    </div>
  );
}

function AnomalyCard({ type, title, time, zone, desc, action, frameColor, noFrame }: any) {
  return (
    <div className="card" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: `1px solid ${frameColor}` }}>
      
      {/* CCTV FRAME PLACEHOLDER */}
      <div style={{ height: '200px', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {noFrame ? (
           <div style={{ color: 'var(--success)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={32} />
              <span className="mono">NO FEED REQUIRED</span>
           </div>
        ) : (
           <>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
              <div className="mono" style={{ position: 'absolute', top: '10px', left: '10px', color: frameColor, fontSize: '0.75rem', fontWeight: 700 }}>REC • {zone}</div>
              <div className="mono" style={{ position: 'absolute', top: '10px', right: '10px', color: '#fff', fontSize: '0.75rem' }}>{time}</div>
              
              {/* Fake detection bounding box */}
              <div style={{ border: `2px dashed ${frameColor}`, width: '80px', height: '140px', position: 'absolute', top: '30%', left: '40%', background: 'rgba(255,255,255,0.05)' }}>
                 <div style={{ background: frameColor, color: '#000', fontSize: '0.65rem', fontWeight: 800, padding: '2px 4px', position: 'absolute', top: '-16px', left: '-2px' }}>DETECTED</div>
              </div>
           </>
        )}
      </div>

      {/* CARD CONTENT */}
      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>
          <span className="mono" style={{ fontSize: '0.65rem', background: `rgba(${type === 'CRITICAL' ? '239, 68, 68' : type === 'WARN' ? '245, 158, 11' : '148, 163, 184'}, 0.1)`, color: frameColor, padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
            {type}
          </span>
        </div>
        
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
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
