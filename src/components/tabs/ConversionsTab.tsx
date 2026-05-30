import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

export function ConversionsTab() {
  const [metrics, setMetrics] = useState({
    unique_visitors: 0, conversion_rate: 0, queue_depth: 0, abandonment_rate: 0
  });

  const [funnelStages, setFunnelStages] = useState<any[]>([]);

  useEffect(() => {
    const storeId = "STORE_BLR_002";
    
    const fetchData = () => {
      fetch(`http://localhost:8000/stores/${storeId}/metrics`)
        .then(res => res.json())
        .then(data => { if (!data.error) setMetrics(data); })
        .catch(console.error);

      fetch(`http://localhost:8000/stores/${storeId}/funnel`)
        .then(res => res.json())
        .then(data => { if (data.stages) setFunnelStages(data.stages); })
        .catch(console.error);
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Use the metrics from API to compute cart abandonment and gross conversion
  const grossConversion = (metrics.conversion_rate * 100).toFixed(1) + "%";
  const abandonment = (metrics.abandonment_rate * 100).toFixed(1) + "%";

  return (
    <div className="content-grid" style={{ gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* HEADER WITH FILTERS */}
      <div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 0.5rem 0' }}>Conversion Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Analyze funnel efficiency, queue dynamics, and revenue attribution.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', outline: 'none' }}>
            <option>Today</option>
            <option>Last 7 Days</option>
            <option>This Month</option>
          </select>
          <button style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
            Export Report
          </button>
        </div>
      </div>

      {/* TOP METRICS (BENTO) */}
      <MetricCard title="Gross Conversion Rate" value={grossConversion} trend="Live" positive span={3} />
      <MetricCard title="Current Queue Depth" value={metrics.queue_depth + " people"} trend="Live" positive span={3} />
      <MetricCard title="Cart Abandonment" value={abandonment} trend="Live" positive={false} span={3} />
      <MetricCard title="Total Visitors" value={metrics.unique_visitors} trend="Live" positive span={3} />

      {/* THE FUNNEL */}
      <div className="card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '2rem' }}>Store-to-Purchase Funnel</h3>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '1rem' }}>
           {funnelStages.length > 0 ? funnelStages.map((stage, idx) => {
             const colors = ["var(--accent)", "var(--accent)", "var(--warning)", "var(--success)"];
             const maxCount = funnelStages[0].count || 1;
             const height = Math.max((stage.count / maxCount) * 100, 10) + "%";
             const drop = idx === 0 ? "100%" : (100 - stage.drop_off_pct).toFixed(0) + "%";
             return (
               <div key={stage.stage} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                 <FunnelStage label={stage.stage} value={stage.count} percentage={drop} color={colors[idx]} height={height} />
                 {idx < funnelStages.length - 1 && <div style={{ color: 'var(--text-secondary)' }}>→</div>}
               </div>
             );
           }) : <div style={{ color: 'var(--text-secondary)' }}>Loading funnel...</div>}
        </div>
      </div>

      {/* AI INSIGHTS PANEL */}
      <div className="card" style={{ gridColumn: 'span 4', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent)' }}>
          <Activity size={18} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>AI Conversion Insights</h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>High Queue Abandonment detected between 14:00 - 15:00.</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Wait times exceeded 5 minutes. Reallocating 1 staff member from Fragrance during this window is projected to recover $800/day.
            </p>
          </div>
          
          <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--success)' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>Skincare layout optimization successful.</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Dwell time in Skincare increased by 12% following the end-cap update, driving a 4% lift in overall POS conversion.
            </p>
          </div>
        </div>
      </div>

      {/* ZONE ATTRIBUTION TABLE */}
      <div className="card" style={{ gridColumn: 'span 12' }}>
         <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Attribution by Zone (Mock)</h3>
         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ paddingBottom: '1rem', fontWeight: 500 }}>Zone Name</th>
                <th style={{ paddingBottom: '1rem', fontWeight: 500 }}>Unique Visitors</th>
                <th style={{ paddingBottom: '1rem', fontWeight: 500 }}>Avg. Dwell Time</th>
                <th style={{ paddingBottom: '1rem', fontWeight: 500 }}>Conversion Rate</th>
                <th style={{ paddingBottom: '1rem', fontWeight: 500 }}>Revenue Impact</th>
              </tr>
            </thead>
            <tbody>
              <TableRow zone="Skincare & Cosmetics" visitors="412" dwell="4m 12s" conv="22.4%" rev="$4,200" trend="up" />
              <TableRow zone="Fragrance" visitors="185" dwell="2m 45s" conv="14.2%" rev="$1,850" trend="down" />
              <TableRow zone="Haircare" visitors="105" dwell="1m 30s" conv="8.5%" rev="$640" trend="up" />
              <TableRow zone="New Arrivals (Display)" visitors="340" dwell="0m 45s" conv="18.1%" rev="$2,100" trend="up" />
            </tbody>
         </table>
      </div>

    </div>
  );
}

function MetricCard({ title, value, trend, positive, span }: any) {
  return (
    <div className="card" style={{ gridColumn: `span ${span}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: 600, margin: '1rem 0', color: 'var(--text-primary)', letterSpacing: '-1px' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: positive ? 'var(--success)' : 'var(--danger)' }}>
        {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {trend}
      </div>
    </div>
  );
}

function FunnelStage({ label, value, percentage, color, height }: any) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '200px', justifyContent: 'flex-end', gap: '1rem' }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{percentage}</div>
      <div style={{ width: '100%', height: height, background: 'var(--bg-color)', borderRadius: '8px', position: 'relative', overflow: 'hidden', transition: 'height 0.5s ease' }}>
         <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', background: color, opacity: 0.2 }} />
         <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: color }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  );
}

function TableRow({ zone, visitors, dwell, conv, rev, trend }: any) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
      <td style={{ padding: '1rem 0', fontWeight: 500, color: 'var(--text-primary)' }}>{zone}</td>
      <td style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>{visitors}</td>
      <td style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>{dwell}</td>
      <td style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>{conv}</td>
      <td style={{ padding: '1rem 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
        {rev}
        {trend === 'up' ? <TrendingUp size={14} color="var(--success)" /> : <TrendingDown size={14} color="var(--danger)" />}
      </td>
    </tr>
  );
}
