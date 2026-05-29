import { useState } from 'react';
import { Users, ShoppingCart, Activity, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

export function OverviewTab() {
  const [metrics] = useState({
    unique_visitors: 142, conversion_rate: 0.18, queue_depth: 2, abandonment_rate: 0.05
  });

  const [events] = useState([
    { id: 1, type: "ZONE_ENTER", zone: "SKINCARE", time: "Just now" },
    { id: 2, type: "ENTRY", zone: "MAIN_DOOR", time: "2 min ago" },
    { id: 3, type: "BILLING_QUEUE_JOIN", zone: "CHECKOUT", time: "5 min ago" },
    { id: 4, type: "ZONE_DWELL", zone: "FRAGRANCE", time: "8 min ago" },
  ]);

  return (
    <div className="content-grid">
      <div className="card" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Total Visitors</span><Users size={20} color="var(--text-secondary)" /></div>
        <div className="metric-value">{metrics.unique_visitors}</div>
        <div className="trend-up" style={{ marginTop: '0.5rem' }}><TrendingUp size={16} /> +12.5%</div>
      </div>
      <div className="card" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Conversion Rate</span><ShoppingCart size={20} color="var(--text-secondary)" /></div>
        <div className="metric-value">{(metrics.conversion_rate * 100).toFixed(1)}%</div>
        <div className="trend-up" style={{ marginTop: '0.5rem' }}><TrendingUp size={16} /> +2.1%</div>
      </div>
      <div className="card" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Billing Queue</span><Activity size={20} color="var(--text-secondary)" /></div>
        <div className="metric-value">{metrics.queue_depth} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>people</span></div>
        <div className="trend-up" style={{ marginTop: '0.5rem' }}><TrendingUp size={16} /> Normal</div>
      </div>
      <div className="card" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Abandonment Rate</span><AlertCircle size={20} color="var(--text-secondary)" /></div>
        <div className="metric-value">{(metrics.abandonment_rate * 100).toFixed(1)}%</div>
        <div className="trend-down" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}><TrendingDown size={16} /> Stable</div>
      </div>

      <div className="card" style={{ gridColumn: 'span 8', minHeight: '350px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '2rem' }}>Conversion Funnel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <FunnelBar label="Store Entry" count={142} percentage={100} color="var(--accent)" />
          <FunnelBar label="Zone Visit" count={118} percentage={83} color="var(--accent)" />
          <FunnelBar label="Billing Queue" count={45} percentage={31} color="var(--warning)" />
          <FunnelBar label="Purchase (POS)" count={26} percentage={18} color="var(--success)" />
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
        <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '12px' }} />
      </div>
      <div style={{ width: '80px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600 }}>{count}</div>
    </div>
  );
}
