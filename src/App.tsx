import { useState } from 'react';
import './index.css';

import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { OverviewTab } from './components/tabs/OverviewTab';
import { LiveFeedsTab } from './components/tabs/LiveFeedsTab';
import { AudienceTab } from './components/tabs/AudienceTab';
import { ConversionsTab } from './components/tabs/ConversionsTab';
import { AnomaliesTab } from './components/tabs/AnomaliesTab';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="dashboard">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <TopNav />
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'feeds' && <LiveFeedsTab />}
        {activeTab === 'audience' && <AudienceTab />}
        {activeTab === 'conversions' && <ConversionsTab />}
        {activeTab === 'anomalies' && <AnomaliesTab />}
      </main>
    </div>
  );
}

export default App;
