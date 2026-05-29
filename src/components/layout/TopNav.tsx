import { Bell, Search } from 'lucide-react';

const STORE_ID = "STORE_BLR_002";

export function TopNav() {
  return (
    <header className="top-nav">
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Store Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>{STORE_ID} • Bengaluru, India</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)' }}>
        <Search size={20} style={{ cursor: 'pointer' }} />
        <Bell size={20} style={{ cursor: 'pointer' }} />
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>M</div>
      </div>
    </header>
  );
}
