import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TrustHuntDashboard } from './components/Dashboard/TrustHuntDashboard';

// Get the base path from Vite's base config
const basename = import.meta.env.BASE_URL;

function App() {
  return (
    <Router basename={basename}>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<TrustHuntDashboard />} />
          <Route path="/dashboard" element={<TrustHuntDashboard />} />
          {/* Add other routes as needed */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
