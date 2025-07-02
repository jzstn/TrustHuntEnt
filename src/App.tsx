import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TrustHuntDashboard } from './components/Dashboard/TrustHuntDashboard';
import { VulnerabilityReportsView } from './components/Dashboard/VulnerabilityReportsView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TrustHuntDashboard />} />
        <Route path="/report" element={<VulnerabilityReportsView />} />
      </Routes>
    </Router>
  );
}

export default App;