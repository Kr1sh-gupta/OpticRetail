import { useState, useEffect } from 'react';
import { Users, ShoppingCart, Activity, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

export function OverviewTab() {
  const [metrics, setMetrics] = useState({
    unique_visitors: 0, conversion_rate: 0, queue_depth: 0, abandonment_rate: 0
  });

  const [funnelStages, setFunnelStages] = useState<any[]>([]);

  const [events] = useState([
    { id: 1, type: "ZONE_ENTER", zone: "SKINCARE", time: "Just now" },
    { id: 2, type: "ENTRY", zone: "MAIN_DOOR", time: "2 min ago" },
    { id: 3, type: "BILLING_QUEUE_JOIN", zone: "CHECKOUT", time: "5 min ago" },
    { id: 4, type: "ZONE_DWELL", zone: "FRAGRANCE", time: "8 min ago" },
  ]);

  useEffect(() => {
    const storeId = "STORE_BLR_002";
    
    // Fetch metrics
    fetch(`http://localhost:8000/stores/${storeId}/metrics`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setMetrics(data);
      })
      .catch(console.error);

    // Fetch funnel
    fetch(`http://localhost:8000/stores/${storeId}/funnel`)
      .then(res => res.json())
      .then(data => {
        if (data.stages) setFunnelStages(data.stages);
      })
      .catch(console.error);

    // Set up polling every 5 seconds for live feel
    const interval = setInterval(() => {
      fetch(`http://localhost:8000/stores/${storeId}/metrics`)
        .then(res => res.json())
        .then(data => { if (!data.error) setMetrics(data); })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="content-grid">
      <div className="card" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Total Visitors</span><Users size={20} color="var(--text-secondary)" /></div>
        <div className="metric-value">{metrics.unique_visitors}</div>
        <div className="trend-up" style={{ marginTop: '0.5rem' }}><TrendingUp size={16} /> Live</div>
      </div>
      <div className="card" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Conversion Rate</span><ShoppingCart size={20} color="var(--text-secondary)" /></div>
        <div className="metric-value">{(metrics.conversion_rate * 100).toFixed(1)}%</div>
        <div className="trend-up" style={{ marginTop: '0.5rem' }}><TrendingUp size={16} /> Live</div>
      </div>
      <div className="card" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Billing Queue</span><Activity size={20} color="var(--text-secondary)" /></div>
        <div className="metric-value">{metrics.queue_depth} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>people</span></div>
        <div className="trend-up" style={{ marginTop: '0.5rem' }}><TrendingUp size={16} /> Live</div>
      </div>
      <div className="card" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Abandonment Rate</span><AlertCircle size={20} color="var(--text-secondary)" /></div>
        <div className="metric-value">{(metrics.abandonment_rate * 100).toFixed(1)}%</div>
        <div className="trend-down" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}><TrendingDown size={16} /> Live</div>
      </div>

      <div className="card" style={{ gridColumn: 'span 8', minHeight: '350px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '2rem' }}>Conversion Funnel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {funnelStages.length > 0 ? funnelStages.map((stage, idx) => {
             const colors = ["var(--accent)", "var(--accent)", "var(--warning)", "var(--success)"];
             const color = colors[idx % colors.length];
             const maxCount = funnelStages[0].count || 1;
             const percentage = Math.max((stage.count / maxCount) * 100, 2); // At least 2% to show the bar
             return (
               <FunnelBar key={stage.stage} label={stage.stage} count={stage.count} percentage={percentage} color={color} />
             );
          }) : (
             <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading funnel data...</div>
          )}
        </div>
      </div>
      <div className="card" style={{ gridColumn: 'span 4' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Recent Events</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {events.map((event: any) => (
            <div key={event.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '8px' }}>
                <Activity size={16} color="var(--accent)" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>{event.type}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{event.zone} • {event.time}</p>
              </div>
            </div>
          ))}
        </div>
        <button style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', marginTop: '1rem', cursor: 'pointer', fontWeight: 500 }}>
          View All Logs
        </button>
      </div>
    </div>
  );
}

function FunnelBar({ label, count, percentage, color }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: '120px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ flex: 1, background: 'var(--bg-color)', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '12px', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ width: '80px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600 }}>{count}</div>
    </div>
  );
}
