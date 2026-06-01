import { useState, useEffect } from 'react';
import { Users, ShoppingCart, Activity, AlertCircle, TrendingUp, TrendingDown, Terminal, Shield } from 'lucide-react';

export function OverviewTab() {
  const [metrics, setMetrics] = useState({
    unique_visitors: 0, conversion_rate: 0, queue_depth: 0, abandonment_rate: 0, total_staff: 0
  });

  const [funnelStages, setFunnelStages] = useState<any[]>([]);
  const [pipelineLogs, setPipelineLogs] = useState<any[]>([]);

  const [events, setEvents] = useState<any[]>([
    { id: "MOCK1", type: "ZONE_ENTER", zone: "SKINCARE", time: "20:10:29", is_staff: false },
    { id: "MOCK2", type: "ENTRY", zone: "MAIN_DOOR", time: "20:10:03", is_staff: false },
    { id: "MOCK3", type: "BILLING_QUEUE_JOIN", zone: "CHECKOUT", time: "20:09:48", is_staff: false },
  ]);

  const getLogColor = (message: string, level: string) => {
    if (level === 'ERROR' || message.includes('| ERROR |')) return '#ff5252';
    if (level === 'WARNING' || message.includes('| WARNING |')) return '#ffd740';
    if (message.includes('[SKIP]')) return '#78909c';
    if (message.includes('[EMIT]') || message.includes('Sent')) return '#69f0ae';
    if (message.includes('[TRACKER]') || message.includes('REENTRY')) return '#e040fb';
    if (message.includes('Processing:')) return '#40c4ff';
    return '#eceff1';
  };

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

    // Fetch logs
    const fetchLogs = () => {
      fetch('http://localhost:8000/pipeline/logs')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Get last 5 logs and reverse so newest log is at the very top of the card
            const latest5 = data.slice(-5).reverse();
            setPipelineLogs(latest5);
          }
        })
        .catch(() => { });
    };

    const fetchEvents = () => {
      fetch('http://localhost:8000/events/recent')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setEvents(data);
          }
        })
        .catch(() => { });
    };

    fetchLogs();
    fetchEvents();

    // Set up polling every 5 seconds for live feel
    const interval = setInterval(() => {
      fetch(`http://localhost:8000/stores/${storeId}/metrics`)
        .then(res => res.json())
        .then(data => { if (!data.error) setMetrics(data); })
        .catch(() => { });

      fetchLogs();
      fetchEvents();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleStartPipeline = () => {
    window.dispatchEvent(new Event('reset_sim_clock'));
    fetch('http://localhost:8000/pipeline/logs', { method: 'DELETE' })
      .then(() => setPipelineLogs([]))
      .then(() => fetch('http://localhost:8000/pipeline/start', { method: 'POST' }))
      .then(res => res.json())
      .then(() => alert("Simulation started! CCTV and POS feeds are now streaming live."))
      .catch(console.error);
  };

  return (
    <div className="content-grid">
      <div style={{ gridColumn: 'span 12', background: 'rgba(255, 179, 0, 0.15)', border: '1px solid #ffb300', padding: '1rem 1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, color: '#ffb300', fontSize: '1.1rem', fontWeight: 600 }}>Enterprise Demo Simulation</h3>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Click start to automatically stream synchronized historical CCTV feeds and POS transactions.</p>
        </div>
        <button 
          onClick={handleStartPipeline}
          style={{ background: '#ffb300', color: '#000', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Start Simulation
        </button>
      </div>

      <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Total Visitors</span><Users size={20} color="var(--text-secondary)" /></div>
          <div className="metric-value">{metrics.unique_visitors}</div>
          <div className="trend-up" style={{ marginTop: '0.5rem' }}><TrendingUp size={16} /> Live</div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Conversion Rate</span><ShoppingCart size={20} color="var(--text-secondary)" /></div>
          <div className="metric-value">{(metrics.conversion_rate * 100).toFixed(1)}%</div>
          <div className="trend-up" style={{ marginTop: '0.5rem' }}><TrendingUp size={16} /> Live</div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Total Staff</span><Shield size={20} color="var(--accent)" /></div>
          <div className="metric-value">{metrics.total_staff}</div>
          <div className="trend-up" style={{ marginTop: '0.5rem', color: 'var(--accent)' }}><TrendingUp size={16} /> Live</div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Billing Queue</span><Activity size={20} color="var(--text-secondary)" /></div>
          <div className="metric-value">{metrics.queue_depth} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>people</span></div>
          <div className="trend-up" style={{ marginTop: '0.5rem' }}><TrendingUp size={16} /> Live</div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="metric-label">Abandonment Rate</span><AlertCircle size={20} color="var(--text-secondary)" /></div>
          <div className="metric-value">{(metrics.abandonment_rate * 100).toFixed(1)}%</div>
          <div className="trend-down" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}><TrendingDown size={16} /> Live</div>
        </div>
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
      <div className="card" style={{ gridColumn: 'span 4', gridRow: 'span 2', display: 'flex', flexDirection: 'column', minHeight: '725px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Recent Events</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
          {events.map((event: any) => {
            const getEventIconAndColor = (type: string, isStaff: boolean) => {
              if (isStaff) {
                return { icon: <Shield size={16} color="var(--accent)" />, label: "STAFF_INTERACTION" };
              }
              if (type.includes("QUEUE")) {
                return { icon: <Activity size={16} color="var(--warning)" />, label: type };
              }
              if (type.includes("ENTRY") || type.includes("EXIT") || type.includes("REENTRY")) {
                return { icon: <Users size={16} color="var(--success)" />, label: type };
              }
              return { icon: <ShoppingCart size={16} color="var(--text-secondary)" />, label: type };
            };

            const { icon, label } = getEventIconAndColor(event.type, event.is_staff);

            return (
              <div key={event.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '0.825rem' }}>{label}</p>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.725rem', marginTop: '0.25rem' }}>{event.zone} • {event.time}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        <button 
          onClick={() => { window.location.hash = 'feeds'; }}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '6px',
            marginTop: 'auto',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          View Live Feeds
        </button>
      </div>

      <div className="card" style={{ gridColumn: 'span 8', minHeight: '345px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Terminal size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Live Pipeline Console</h3>
        </div>
        
        <div style={{
          flex: 1,
          background: '#09090b',
          border: '1px solid #1e1e24',
          borderRadius: '8px',
          padding: '1rem',
          fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
          fontSize: '0.725rem',
          lineHeight: '1.6',
          overflowX: 'auto',
          overflowY: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.8)'
        }}>
          {pipelineLogs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, gap: '0.5rem', color: '#6b7280', textAlign: 'center' }}>
              <Terminal size={24} color="#4b5563" />
              <p style={{ margin: 0, fontSize: '0.775rem' }}>No active logs. Run the edge pipeline locally.</p>
            </div>
          ) : (
            pipelineLogs.map((log) => (
              <div key={log.id} style={{
                color: getLogColor(log.message, log.level),
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}>
                {log.message}
              </div>
            ))
          )}
        </div>

        <button 
          onClick={() => { window.location.hash = 'console'; }}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '6px',
            marginTop: '1rem',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          Open Console & View All Logs
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
