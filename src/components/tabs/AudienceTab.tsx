import { AlertCircle } from 'lucide-react';

export function AudienceTab() {
  return (
    <div className="content-grid">
      <div style={{ gridColumn: 'span 12', marginBottom: '-1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Spatial & Audience Intelligence</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Real-time Re-ID tracking, VLM clothing signatures, and zone density.</p>
      </div>

      {/* STORE FLOOR PLAN HEATMAP */}
      <div className="card" style={{ gridColumn: 'span 7', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Live Store Heatmap</h3>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%' }}/> Shoppers</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: '8px', height: '8px', background: 'var(--warning)', borderRadius: '2px' }}/> Staff</span>
          </div>
        </div>

        {/* Abstract Store Map Layout */}
        <div style={{ flex: 1, background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px', padding: '4px' }}>
          <ZoneBox name="ENTRANCE" shoppers={2} staff={1} active />
          <ZoneBox name="SKINCARE" shoppers={8} staff={0} alert="HIGH DENSITY" />
          <ZoneBox name="FRAGRANCE" shoppers={3} staff={1} />
          <ZoneBox name="CHECKOUT" shoppers={12} staff={1} alert="BOTTLENECK" />
        </div>
      </div>

      {/* VLM VISITOR SIGNATURES */}
      <div className="card" style={{ gridColumn: 'span 5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>VLM Visitor Signatures</h3>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>OSNET RE-ID</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <VisitorSignature id="VIS_8F9A" type="RETURNING" traits={['Red Jacket', 'Glasses', 'Backpack']} time="2m 14s" />
          <VisitorSignature id="VIS_3C22" type="NEW" traits={['White Tee', 'Blue Jeans']} time="12m 05s" />
          <VisitorSignature id="STF_99B1" type="STAFF" traits={['Black Uniform', 'Lanyard']} time="4h 12m" staff />
          <VisitorSignature id="VIS_7A4C" type="SUSPICIOUS" traits={['Heavy Coat', 'Mask', 'Cap']} time="1m 02s" danger />
        </div>
      </div>

      {/* DYNAMIC STAFF REALLOCATION */}
      <div className="card" style={{ gridColumn: 'span 12' }}>
         <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Smart Staff Reallocation Engine</h3>
         <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', padding: '1rem 1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: 'var(--warning)', color: '#000', padding: '0.5rem', borderRadius: '50%' }}><AlertCircle size={20} /></div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--warning)' }}>ACTION REQUIRED: Shift Staff S1</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Checkout bottleneck detected (12 shoppers). Move staff from Fragrance (low traffic) to Checkout.</p>
              </div>
            </div>
            <button style={{ background: 'var(--warning)', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>
              DISPATCH NOTIFICATION
            </button>
         </div>
      </div>

    </div>
  );
}

function ZoneBox({ name, shoppers, staff, alert, active }: any) {
  return (
    <div style={{ background: active ? 'rgba(59, 130, 246, 0.05)' : 'var(--card-bg)', borderRadius: '4px', border: alert ? '1px solid var(--danger)' : '1px solid var(--border-color)', padding: '1rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="mono" style={{ fontSize: '0.75rem', color: alert ? 'var(--danger)' : 'var(--text-secondary)' }}>{name}</span>
        {alert && <span style={{ fontSize: '0.65rem', background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{alert}</span>}
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignContent: 'center', gap: '6px', marginTop: '1rem' }}>
        {Array.from({ length: shoppers }).map((_, i) => (
          <div key={`sh-${i}`} style={{ width: '10px', height: '10px', background: 'var(--accent)', borderRadius: '50%', boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)' }} />
        ))}
        {Array.from({ length: staff }).map((_, i) => (
          <div key={`st-${i}`} style={{ width: '12px', height: '12px', background: 'var(--warning)', borderRadius: '2px', boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)' }} />
        ))}
      </div>
    </div>
  );
}

function VisitorSignature({ id, type, traits, time, staff, danger }: any) {
  const color = danger ? 'var(--danger)' : staff ? 'var(--warning)' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{id}</div>
          <div style={{ fontSize: '0.65rem', padding: '2px 6px', background: `rgba(${danger ? '239, 68, 68' : staff ? '245, 158, 11' : '59, 130, 246'}, 0.1)`, color: color, borderRadius: '4px', fontWeight: 700 }}>{type}</div>
        </div>
        <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Dwell: {time}</div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {traits.map((t: string) => (
           <span key={t} style={{ fontSize: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-secondary)' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
