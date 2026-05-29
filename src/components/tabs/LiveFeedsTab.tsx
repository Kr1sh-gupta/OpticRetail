import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Camera } from 'lucide-react';

export function LiveFeedsTab() {
  const [activeCam, setActiveCam] = useState<any>(null);
  const [overlayActive, setOverlayActive] = useState(false);

  const cameras = [
    { id: 'CAM_ENTRY_01', name: 'Entry Threshold', zone: 'ENTRANCE', status: 'ONLINE' },
    { id: 'CAM_FLOOR_02', name: 'Main Floor', zone: 'SKINCARE/FRAGRANCE', status: 'ONLINE' },
    { id: 'CAM_BILL_03', name: 'Billing Area', zone: 'CHECKOUT', status: 'ONLINE' },
  ];

  if (activeCam) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button onClick={() => { setActiveCam(null); setOverlayActive(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <ArrowLeft size={20} /> Back to Grid
          </button>
          
          <button 
            onClick={() => setOverlayActive(!overlayActive)} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
              background: overlayActive ? 'rgba(0, 255, 65, 0.1)' : 'var(--card-bg)', 
              border: overlayActive ? '1px solid var(--cyber-accent)' : '1px solid var(--border-color)', 
              color: overlayActive ? 'var(--cyber-accent)' : 'var(--text-primary)', 
              padding: '0.5rem 1rem', borderRadius: '8px',
              transition: 'all 0.2s', fontWeight: 600, fontFamily: overlayActive ? 'var(--font-mono)' : 'inherit'
            }}>
            {overlayActive ? <Eye size={18} /> : <EyeOff size={18} />}
            {overlayActive ? 'SYSTEM OVERLAY: ACTIVE' : 'SYSTEM OVERLAY: INACTIVE'}
          </button>
        </div>

        {/* Video Player Container */}
        <div className="card" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          
          {/* Simulated Raw Video Background */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
          <h2 style={{ color: '#333', zIndex: 1, letterSpacing: '4px' }}>RAW CAMERA FEED</h2>

          {/* Sci-Fi System Overlay */}
          {overlayActive && (
             <div className="cyber-overlay">
                <div style={{ position: 'absolute', top: '2rem', left: '2rem', color: 'var(--cyber-accent)' }} className="mono">
                  <p>[ YOLOv8 + BoT-SORT RUNNING ]</p>
                  <p>FEED: {activeCam.id}</p>
                  <p>FPS: 15.2</p>
                </div>
                
                {/* Mock Bounding Boxes */}
                <div className="bounding-box" style={{ top: '30%', left: '40%', width: '120px', height: '250px' }}>
                  <span className="mono" style={{ position: 'absolute', top: '-20px', left: 0, color: 'var(--cyber-accent)', fontSize: '10px', background: 'rgba(0, 255, 65, 0.2)', padding: '2px 4px' }}>VIS_8F9A [0.92]</span>
                </div>
                <div className="bounding-box" style={{ top: '45%', left: '60%', width: '90px', height: '200px', borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
                  <span className="mono" style={{ position: 'absolute', top: '-20px', left: 0, color: 'var(--warning)', fontSize: '10px', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 4px' }}>STAFF [0.88]</span>
                </div>
             </div>
          )}
        </div>
      </div>
    );
  }

  // Camera Grid
  return (
    <div className="content-grid">
      <div style={{ gridColumn: 'span 12', marginBottom: '-1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Live Camera Feeds</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Select a feed to expand and toggle intelligence overlay.</p>
      </div>

      {cameras.map(cam => (
        <div key={cam.id} onClick={() => setActiveCam(cam)} className="card" style={{ gridColumn: 'span 4', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ height: '160px', background: '#000', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', position: 'relative' }}>
             <Camera size={32} color="#333" />
             <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 700 }}>
               <div style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%' }} /> REC
             </div>
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{cam.name}</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <span>{cam.id}</span>
            <span className="mono" style={{ fontSize: '0.75rem' }}>{cam.zone}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
