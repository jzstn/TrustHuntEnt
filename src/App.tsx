import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TrustHuntDashboard } from './components/Dashboard/TrustHuntDashboard';
import { VulnerabilityReportsView } from './components/Dashboard/VulnerabilityReportsView';
import { ScanResultsView } from './components/Dashboard/ScanResultsView';
import { SecurityReportView } from './components/Dashboard/SecurityReportView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TrustHuntDashboard />} />
        <Route path="/report" element={<SecurityReportView />} />
        <Route path="/vulnerabilities" element={<VulnerabilityReportsView />} />
        <Route path="/scan-results" element={<ScanResultsView />} />
      </Routes>
    </Router>
  );
}

export default App;