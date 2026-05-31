import { useState, useEffect } from 'react';
import './index.css';

import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { OverviewTab } from './components/tabs/OverviewTab';
import { LiveFeedsTab } from './components/tabs/LiveFeedsTab';
import { AudienceTab } from './components/tabs/AudienceTab';
import { ConversionsTab } from './components/tabs/ConversionsTab';
import { AnomaliesTab } from './components/tabs/AnomaliesTab';
import { ConsoleTab } from './components/tabs/ConsoleTab';
import { POSTab } from './components/tabs/POSTab';


function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return window.location.hash.replace('#', '') || 'overview';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'overview';
      setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  const setTab = (tab: string) => {
    window.location.hash = tab;
    setActiveTab(tab);
  };

  return (
    <div className="dashboard">
      <Sidebar activeTab={activeTab} setActiveTab={setTab} />
      <main className="main-content">
        <TopNav />
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'feeds' && <LiveFeedsTab />}
        {activeTab === 'audience' && <AudienceTab />}
        {activeTab === 'conversions' && <ConversionsTab />}
        {activeTab === 'anomalies' && <AnomaliesTab />}
        {activeTab === 'console' && <ConsoleTab />}
        {activeTab === 'pos' && <POSTab />}
      </main>
    </div>
  );
}

export default App;
