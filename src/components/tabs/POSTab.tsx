import { useState, useEffect } from 'react';
import { CreditCard, PlusCircle, RefreshCw, CheckCircle, IndianRupee, Database, Clock } from 'lucide-react';

export function POSTab() {
  const storeId = "STORE_BLR_002";
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [txnId, setTxnId] = useState('');
  const [basketValue, setBasketValue] = useState('1500');
  const [timestamp, setTimestamp] = useState('');

  // Generate a random transaction ID and set timestamp
  const initializeForm = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setTxnId(`TXN_${randomNum}`);
    
    // Set to current date-time in local ISO format (suitable for datetime-local input)
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
    setTimestamp(localISOTime);
  };

  const fetchTransactions = () => {
    setLoading(true);
    fetch(`http://localhost:8000/stores/${storeId}/transactions?limit=25`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTransactions(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    initializeForm();
    fetchTransactions();
    // Auto refresh every 10 seconds for real-time sales dashboard sync
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnId || !basketValue || !timestamp) {
      alert("Please fill out all fields.");
      return;
    }

    setSubmitting(true);
    const payload = {
      transaction_id: txnId,
      timestamp: new Date(timestamp).toISOString(),
      basket_value_inr: parseFloat(basketValue)
    };

    fetch(`http://localhost:8000/stores/${storeId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to submit transaction.");
        return res.json();
      })
      .then(() => {
        initializeForm();
        fetchTransactions();
        // Visual confirmation alert
        alert(`Successfully registered POS Transaction ${payload.transaction_id} worth ₹${payload.basket_value_inr}!`);
      })
      .catch(err => {
        alert("Error submitting transaction: " + err.message);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="content-grid" style={{ gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* HEADER WITH TITLE */}
      <div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 0.5rem 0' }}>POS System Integration</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Simulate and monitor store POS transaction data. Correlates purchase streams with visual customer funnels in real-time.
          </p>
        </div>
        <button 
          onClick={fetchTransactions} 
          disabled={loading}
          style={{ 
            background: 'var(--card-bg)', 
            border: '1px solid var(--border-color)', 
            color: 'var(--text-primary)', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px', 
            fontSize: '0.875rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            cursor: 'pointer' 
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Sync POS
        </button>
      </div>

      {/* POS TRANSACTION SIMULATOR CARD */}
      <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <CreditCard size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>POS Terminal Simulator</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Store ID Readonly */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Terminal Store</label>
            <div style={{ 
              background: 'var(--bg-color)', 
              border: '1px solid var(--border-color)', 
              padding: '0.6rem 0.75rem', 
              borderRadius: '6px', 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Database size={14} />
              {storeId} (Brigade Road, BLR)
            </div>
          </div>

          {/* Transaction ID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Transaction ID</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={txnId} 
                onChange={(e) => setTxnId(e.target.value)} 
                required 
                style={{ 
                  flex: 1, 
                  background: 'var(--bg-color)', 
                  border: '1px solid var(--border-color)', 
                  padding: '0.6rem 0.75rem', 
                  borderRadius: '6px', 
                  fontSize: '0.875rem', 
                  color: 'var(--text-primary)',
                  outline: 'none'
                }} 
              />
              <button 
                type="button" 
                onClick={initializeForm}
                style={{ 
                  background: 'var(--card-bg)', 
                  border: '1px solid var(--border-color)', 
                  padding: '0.6rem', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Timestamp */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Purchase Timestamp</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="datetime-local" 
                value={timestamp} 
                onChange={(e) => setTimestamp(e.target.value)} 
                required 
                style={{ 
                  width: '100%',
                  background: 'var(--bg-color)', 
                  border: '1px solid var(--border-color)', 
                  padding: '0.6rem 0.75rem', 
                  borderRadius: '6px', 
                  fontSize: '0.875rem', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }} 
              />
            </div>
          </div>

          {/* Basket Value */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Basket Value (INR)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-secondary)' }}>
                <IndianRupee size={14} />
              </div>
              <input 
                type="number" 
                min="1" 
                step="0.01"
                value={basketValue} 
                onChange={(e) => setBasketValue(e.target.value)} 
                required 
                style={{ 
                  width: '100%',
                  background: 'var(--bg-color)', 
                  border: '1px solid var(--border-color)', 
                  padding: '0.6rem 0.75rem 0.6rem 2rem', 
                  borderRadius: '6px', 
                  fontSize: '0.875rem', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            style={{ 
              marginTop: '0.5rem',
              background: 'var(--accent)', 
              border: 'none', 
              color: 'white', 
              padding: '0.75rem', 
              borderRadius: '6px', 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem', 
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            <PlusCircle size={16} />
            {submitting ? 'Submitting...' : 'Register Sale'}
          </button>
        </form>
      </div>

      {/* POS TRANSACTION HISTORY TABLE */}
      <div className="card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <Database size={18} color="var(--success)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Sales Ledger & Real-time Feeds</h3>
        </div>

        {loading && transactions.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" />
            <span style={{ marginLeft: '0.5rem' }}>Loading transaction ledger...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '0.5rem' }}>
            <Clock size={32} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: '0.875rem' }}>No transaction records found.</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Submit a simulated transaction to start seeding.</span>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Transaction ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Store ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Basket Value</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Gateway</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.85rem' }}>
                {transactions.map((tx) => (
                  <tr key={tx.transaction_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{tx.transaction_id}</td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>{storeId}</td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                      ₹{parseFloat(tx.basket_value_inr).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                      <span style={{ 
                        background: 'rgba(76, 175, 80, 0.1)', 
                        color: '#4caf50', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <CheckCircle size={10} />
                        SUCCESS
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
