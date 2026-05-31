import { useState, useEffect, useRef } from 'react';
import { Terminal, RefreshCw, Trash2, ShieldAlert, Cpu, CheckCircle, Play } from 'lucide-react';

export function ConsoleTab() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isOffline, setIsOffline] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchStatusAndLogs = () => {
    // 1. Fetch status
    fetch('http://localhost:8000/pipeline/status')
      .then(res => {
        if (!res.ok) throw new Error('Status offline');
        return res.json();
      })
      .then(data => {
        setStatus(data);
        if (data.updated_at) {
          const lastUpdated = new Date(data.updated_at).getTime();
          // Adjust for timezone differences if any, check if within 12 seconds
          const now = new Date().getTime();
          const diffSec = Math.abs(now - lastUpdated) / 1000;
          
          if (diffSec > 12) {
            setIsOffline(true);
          } else {
            setIsOffline(false);
          }
        } else {
          setIsOffline(true);
        }
      })
      .catch(() => {
        setIsOffline(true);
      });

    // 2. Fetch logs
    fetch('http://localhost:8000/pipeline/logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatusAndLogs();
    
    // Poll every 2 seconds for high-fidelity updates
    const interval = setInterval(fetchStatusAndLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Check if the user is close to the bottom (within 20px)
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 20;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  const handleClearLogs = () => {
    fetch('http://localhost:8000/pipeline/logs', { method: 'DELETE' })
      .then(() => setLogs([]))
      .catch(console.error);
  };

  const handleStartPipeline = () => {
    fetch('http://localhost:8000/pipeline/logs', { method: 'DELETE' })
      .then(() => setLogs([]))
      .then(() => fetch('http://localhost:8000/pipeline/start', { method: 'POST' }))
      .then(res => res.json())
      .then(() => {
        fetchStatusAndLogs();
      })
      .catch(console.error);
  };

  const handleStopPipeline = () => {
    fetch('http://localhost:8000/pipeline/stop', { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        fetchStatusAndLogs();
      })
      .catch(console.error);
  };

  const getLogColor = (message: string, level: string) => {
    if (level === 'ERROR' || message.includes('| ERROR |')) return '#ff5252';
    if (level === 'WARNING' || message.includes('| WARNING |')) return '#ffd740';
    if (message.includes('[SKIP]')) return '#78909c';
    if (message.includes('[EMIT]') || message.includes('Sent')) return '#69f0ae';
    if (message.includes('[TRACKER]') || message.includes('REENTRY')) return '#e040fb';
    if (message.includes('Processing:')) return '#40c4ff';
    return '#eceff1';
  };

  const activeStatus = isOffline ? 'OFFLINE' : (status?.status || 'IDLE');
  
  return (
    <div className="content-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
      
      {/* 1. PIPELINE ENGINE STATUS HEADER CARD */}
      <div className="card" style={{ gridColumn: 'span 12', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: activeStatus === 'PROCESSING' ? 'rgba(255, 179, 0, 0.1)' : activeStatus === 'OFFLINE' ? 'rgba(255, 82, 82, 0.1)' : 'rgba(76, 175, 80, 0.1)',
            padding: '0.75rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Cpu size={24} color={activeStatus === 'PROCESSING' ? '#ffb300' : activeStatus === 'OFFLINE' ? '#ff5252' : '#4caf50'} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>YOLOv8 Edge Computer Vision Engine</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isOffline 
                ? 'Edge pipeline is offline. Run locally to process streams.' 
                : activeStatus === 'PROCESSING' 
                  ? `Active: Processing retail store CCTV streams.` 
                  : 'Idle: Waiting for execution run.'}
            </p>
          </div>
        </div>

        {/* Live Status Badge & Pipeline Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Start Button */}
          <button
            onClick={handleStartPipeline}
            disabled={!isOffline && activeStatus === 'PROCESSING'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: (!isOffline && activeStatus === 'PROCESSING') ? 'rgba(76, 175, 80, 0.05)' : 'var(--accent)',
              border: (!isOffline && activeStatus === 'PROCESSING') ? '1px solid rgba(76, 175, 80, 0.1)' : '1px solid var(--accent)',
              color: (!isOffline && activeStatus === 'PROCESSING') ? '#71717a' : '#ffffff',
              padding: '0.4rem 0.9rem',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: (!isOffline && activeStatus === 'PROCESSING') ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (!isOffline && activeStatus === 'PROCESSING') ? 0.5 : 1
            }}
          >
            <Play size={12} fill="currentColor" />
            Start Run
          </button>

          {/* Stop Button */}
          <button
            onClick={handleStopPipeline}
            disabled={isOffline || activeStatus !== 'PROCESSING'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: (isOffline || activeStatus !== 'PROCESSING') ? 'rgba(255, 82, 82, 0.05)' : '#ff5252',
              border: (isOffline || activeStatus !== 'PROCESSING') ? '1px solid rgba(255, 82, 82, 0.1)' : '1px solid #ff5252',
              color: (isOffline || activeStatus !== 'PROCESSING') ? '#71717a' : '#ffffff',
              padding: '0.4rem 0.9rem',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: (isOffline || activeStatus !== 'PROCESSING') ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (isOffline || activeStatus !== 'PROCESSING') ? 0.5 : 1
            }}
          >
            <span style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '1px' }} />
            Stop Run
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.9rem',
            borderRadius: '20px',
            fontWeight: 600,
            fontSize: '0.8rem',
            background: activeStatus === 'PROCESSING' 
              ? 'rgba(255, 179, 0, 0.15)' 
              : activeStatus === 'OFFLINE' 
                ? 'rgba(255, 82, 82, 0.15)' 
                : 'rgba(76, 175, 80, 0.15)',
            color: activeStatus === 'PROCESSING' ? '#ffb300' : activeStatus === 'OFFLINE' ? '#ff5252' : '#4caf50',
            border: activeStatus === 'PROCESSING' 
              ? '1px solid rgba(255, 179, 0, 0.3)' 
              : activeStatus === 'OFFLINE' 
                ? '1px solid rgba(255, 82, 82, 0.3)' 
                : '1px solid rgba(76, 175, 80, 0.3)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: activeStatus === 'PROCESSING' ? '#ffb300' : activeStatus === 'OFFLINE' ? '#ff5252' : '#4caf50',
              animation: activeStatus === 'PROCESSING' ? 'pulse 1.5s infinite' : 'none'
            }} />
            {activeStatus}
          </div>
        </div>
      </div>

      {/* 2. HEARTBEAT OFFLINE WARNING BANNER */}
      {isOffline && (
        <div className="card" style={{
          gridColumn: 'span 12',
          background: 'rgba(255, 82, 82, 0.05)',
          border: '1px dashed rgba(255, 82, 82, 0.4)',
          padding: '1.25rem',
          borderRadius: '8px',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}>
          <ShieldAlert size={22} color="#ff5252" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ff5252' }}>Computer Vision Pipeline Not Running</h4>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              The React frontend is ready but is not receiving analytics updates. Please open a terminal in <strong>e:\purplle\pipeline</strong> on your computer and run:
            </p>
            <pre style={{
              margin: '0.75rem 0 0 0',
              background: 'rgba(0,0,0,0.4)',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '0.825rem',
              color: '#eceff1',
              border: '1px solid var(--border-color)',
              overflowX: 'auto'
            }}>
              .\venv\Scripts\activate<br />
              python detect.py
            </pre>
          </div>
        </div>
      )}

      {/* 3. PROGRESS TRACKER CARD */}
      {!isOffline && activeStatus === 'PROCESSING' && (
        <div className="card" style={{ gridColumn: 'span 12', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Active Cam: <span style={{ color: 'var(--text-primary)' }}>{status?.camera_id || 'N/A'}</span>
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Processing Speed: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{status?.fps || 0.0} FPS</span>
            </span>
          </div>

          {/* Linear Progress Bar */}
          <div style={{ width: '100%', background: 'var(--bg-color)', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.75rem', position: 'relative' }}>
            <div style={{
              width: `${status?.percentage || 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent) 0%, #a855f7 100%)',
              borderRadius: '5px',
              transition: 'width 0.4s ease-out',
              boxShadow: '0 0 8px var(--accent)'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Frame {status?.current_frame || 0} / {status?.total_frames || 0}</span>
            <span>{status?.percentage?.toFixed(1) || 0}% Complete</span>
          </div>
        </div>
      )}

      {/* 4. CONSOLE LOGS TAB */}
      <div className="card" style={{ gridColumn: 'span 12', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '520px', border: '1px solid var(--border-color)' }}>
        
        {/* Console Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={18} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Raw Execution Log Output</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Auto Scroll Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={autoScroll} 
                onChange={(e) => setAutoScroll(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto-Scroll
            </label>

            {/* Clear Console Logs */}
            <button 
              onClick={handleClearLogs}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 82, 82, 0.4)';
                e.currentTarget.style.color = '#ff5252';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Trash2 size={14} />
              Clear Console
            </button>
          </div>
        </div>

        <div 
          onScroll={handleScroll}
          style={{
            flex: 1,
            background: '#09090b',
            border: '1px solid #1e1e24',
          borderRadius: '8px',
          padding: '1.25rem',
          fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
          fontSize: '0.825rem',
          lineHeight: '1.6',
          overflowY: 'auto',
          maxHeight: '440px',
          minHeight: '360px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
        }}>
          {logs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, gap: '0.75rem', color: '#6b7280' }}>
              <Terminal size={32} color="#4b5563" />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                {isOffline ? 'Waiting for local pipeline connection...' : 'Console is cleared. Run pipeline to stream logs.'}
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id} 
                style={{ 
                  color: getLogColor(log.message, log.level),
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  marginBottom: '0.2rem',
                  display: 'flex',
                  gap: '0.5rem'
                }}
              >
                {/* formatted log message */}
                <span>{log.message}</span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
      
      {/* Dynamic Keyframes injected globally */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />

    </div>
  );
}
