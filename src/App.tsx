import React from 'react';
import { Shield } from 'lucide-react';

function App() {
  console.log('App component rendering...');
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">TrustHunt Enterprise</h1>
        <p className="text-gray-600">Salesforce Security Assessment Platform</p>
        <div className="mt-4 text-sm text-green-600">
          ✅ App is loading successfully!
        </div>
      </div>
    </div>
  );
}

export default App;