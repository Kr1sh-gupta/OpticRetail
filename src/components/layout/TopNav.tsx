import { useState, useEffect } from 'react';
import { Bell, Search, Clock } from 'lucide-react';

const STORE_ID = "STORE_BLR_002";

export function TopNav() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  return (
    <header className="top-nav">
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Store Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>{STORE_ID} • Bengaluru, India</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          background: 'var(--card-bg)', 
          border: '1px solid var(--border-color)', 
          padding: '0.375rem 0.75rem', 
          borderRadius: '6px', 
          fontSize: '0.875rem', 
          color: 'var(--text-primary)', 
          fontWeight: 600,
          fontFamily: 'monospace'
        }}>
          <Clock size={16} color="var(--accent)" />
          <span>{formatTime(time)}</span>
        </div>
        <Search size={20} style={{ cursor: 'pointer' }} />
        <Bell size={20} style={{ cursor: 'pointer' }} />
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>M</div>
      </div>
    </header>
  );
}
