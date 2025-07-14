import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  Copy,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';

interface AuthenticationGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthenticationGuide: React.FC<AuthenticationGuideProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'cors' | 'token' | 'connected-app'>('cors');
  const [showEnvExample, setShowEnvExample] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
              <h3 className="text-lg font-semibold text-gray-900">Authentication Setup Guide</h3>
              <p className="text-sm text-gray-600">Fix authentication issues and connect to Salesforce</p>
            </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'cors', label: 'Fix CORS Issue', urgent: true },
            { id: 'token', label: 'Get Access Token' },
            { id: 'connected-app', label: 'Connected App Setup' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.urgent && (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Local CORS Proxy Instructions */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Using the Local CORS Proxy:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Open a new terminal window</li>
              <li>• Run <code className="bg-blue-100 px-1 rounded">npm run proxy</code> to start the local CORS proxy</li>
              <li>• Keep this terminal running while using the application</li>
              <li>• The app will automatically use this proxy for all Salesforce requests</li>
              <li>• No need to enable the CORS demo server anymore</li>
            </ul>
          </div>

          {activeTab === 'cors' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-900">URGENT: Enable CORS Demo Server</h4>
                    <p className="text-xs text-red-800 mt-1">
                      The authentication error you're seeing is because the CORS Anywhere demo server requires manual activation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Step-by-Step Fix</h4>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Click the button below to open CORS demo page</p>
                      <div className="mt-2">
                        <a 
                          href="https://cors-anywhere.herokuapp.com/corsdemo" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open CORS Demo Server
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Click "Request temporary access to the demo server"</p>
                      <p className="text-xs text-gray-600 mt-1">This enables the CORS proxy for your browser session</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Return to this app and try connecting again</p>
                      <p className="text-xs text-gray-600 mt-1">The authentication should now work properly</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-green-900">After Enabling CORS</h4>
                      <p className="text-xs text-green-800 mt-1">
                        Once you've enabled the CORS demo server, all authentication methods should work properly.
                        This is a one-time setup per browser session.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'token' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Token Authentication (Recommended)</h4>
                    <p className="text-xs text-blue-800 mt-1">
                      The fastest way to connect is using an access token from your browser session.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">How to Get Your Access Token</h4>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Open your browser's Developer Tools</p>
                      <p className="text-xs text-gray-600 mt-1">Press F12 or right-click → Inspect Element</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Go to the Network tab</p>
                      <p className="text-xs text-gray-600 mt-1">Click on the "Network" tab in developer tools</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Log into your Salesforce org</p>
                      <p className="text-xs text-gray-600 mt-1">Navigate to any page in Salesforce (Setup, Home, etc.)</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Find an API request in the Network tab</p>
                      <p className="text-xs text-gray-600 mt-1">Look for requests to "/services/" or containing "salesforce"</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Copy the Authorization header</p>
                      <p className="text-xs text-gray-600 mt-1">Click on a request → Headers → Copy the token after "Bearer "</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-900">Token Format</h4>
                      <p className="text-xs text-yellow-800 mt-1">
                        The token should start with "00D" and be about 100+ characters long. 
                        Don't include the word "Bearer" - just the token itself.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connected-app' && (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-900">Connected App Issues</h4>
                    <p className="text-xs text-orange-800 mt-1">
                      Your current Connected App credentials may not be properly configured. 
                      Follow these steps to create a new one.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Create New Connected App</h4>
                
                <div className="space-y-3">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">1. Basic Information</h5>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      <div>Connected App Name: TrustHunt Enterprise</div>
                      <div>API Name: TrustHunt_Enterprise</div>
                      <div>Contact Email: your-email@domain.com</div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">2. OAuth Settings (Critical)</h5>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Enable OAuth Settings</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-sm font-mono">Callback URL: http://localhost:5173/auth/callback</div>
                      </div>
                      <div className="text-sm font-medium">Selected OAuth Scopes:</div>
                      <div className="space-y-1 ml-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-xs">Access and manage your data (api)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-xs">Perform requests on your behalf at any time (refresh_token, offline_access)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-xs">Full access (full)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">3. Additional Settings</h5>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Require Secret for Web Server Flow</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Require Secret for Refresh Token Flow</span>
                      </div>
                      <div className="text-sm">IP Relaxation: Relax IP restrictions</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">4. Update Environment Variables</h5>
                  <p className="text-sm text-blue-800 mb-3">After creating the Connected App, update your .env file:</p>
                  
                  <div className="relative">
                    <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">
                      <div>VITE_SALESFORCE_CLIENT_ID=your_consumer_key_here</div>
                      <div>VITE_SALESFORCE_CLIENT_SECRET=your_consumer_secret_here</div>
                      <div>VITE_SALESFORCE_REDIRECT_URI=http://localhost:5173/auth/callback</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`VITE_SALESFORCE_CLIENT_ID=your_consumer_key_here
VITE_SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
VITE_SALESFORCE_REDIRECT_URI=http://localhost:5173/auth/callback`)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-green-900">After Setup</h4>
                      <p className="text-xs text-green-800 mt-1">
                        Restart your development server (npm run dev) and try connecting again.
                        The Token Authentication method is recommended for testing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Need help? Check the AUTHENTICATION_SETUP.md file for detailed instructions.
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};