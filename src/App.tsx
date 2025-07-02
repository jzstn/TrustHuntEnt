import React, { useState } from 'react';
import { TrustHuntDashboard } from './components/Dashboard/TrustHuntDashboard';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SecurityReportView } from './components/Dashboard/SecurityReportView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TrustHuntDashboard />} />
        <Route path="/report" element={<SecurityReportView />} />
      </Routes>
    </Router>
  );
}

export default App;