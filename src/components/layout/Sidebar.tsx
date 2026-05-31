import { LayoutDashboard, Users, ShoppingCart, Activity, AlertCircle, Video, Settings, Terminal } from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab }: any) {
  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--accent)', padding: '0.5rem', borderRadius: '8px' }}>
          <Activity size={20} color="white" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>OpticRetail</h2>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <NavItem icon={<Video size={18} />} label="Live Feeds" active={activeTab === 'feeds'} onClick={() => setActiveTab('feeds')} />
        <NavItem icon={<Users size={18} />} label="Audience" active={activeTab === 'audience'} onClick={() => setActiveTab('audience')} />
        <NavItem icon={<ShoppingCart size={18} />} label="Conversions" active={activeTab === 'conversions'} onClick={() => setActiveTab('conversions')} />
        <NavItem icon={<AlertCircle size={18} />} label="Anomalies" active={activeTab === 'anomalies'} onClick={() => setActiveTab('anomalies')} />
        <NavItem icon={<Terminal size={18} />} label="Console & Logs" active={activeTab === 'console'} onClick={() => setActiveTab('console')} />
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <NavItem icon={<Settings size={18} />} label="Settings" />
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active = false, onClick }: any) {
  return (
    <div onClick={onClick} style={{ 
      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer',
      backgroundColor: active ? 'var(--card-bg)' : 'transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      border: active ? '1px solid var(--border-color)' : '1px solid transparent',
      transition: 'all 0.2s'
    }}>
      {icon}
      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</span>
    </div>
  );
}
