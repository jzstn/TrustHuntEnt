import React, { useState } from 'react';
import { X, Shield, Key, AlertTriangle, CheckCircle, Loader, Eye, EyeOff, Code, Info, Settings, ExternalLink } from 'lucide-react';
import { CorsProxyStatusModal } from './CorsProxyStatusModal';

interface SalesforceTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (credentials: {
    accessToken: string;
    instanceUrl: string;
    orgType: 'production' | 'sandbox' | 'developer';
  }) => void;
  isLoading?: boolean;
  error?: string;
}

export const SalesforceTokenModal: React.FC<SalesforceTokenModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isLoading = false,
  error
}) => {
  const [credentials, setCredentials] = useState({
    accessToken: '',
    instanceUrl: '',
    orgType: 'developer' as 'production' | 'sandbox' | 'developer'
  });
  const [showToken, setShowToken] = useState(false);
  const [showCorsStatus, setShowCorsStatus] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.accessToken.trim()) {
      alert('Please enter an access token');
      return;
    }
    
    if (!credentials.instanceUrl.trim()) {
      alert('Please enter an instance URL');
      return;
    }
    
    onConnect(credentials);
  };

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const isRateLimitError = error?.includes('rate limit') || error?.includes('429') || error?.includes('too many requests');
  const isNetworkError = error?.includes('Failed to fetch') || error?.includes('Network error');
  const isCorsError = error?.includes('corsdemo') || error?.includes('CORS') || error?.includes('cors-anywhere');

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Key className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Connect with Access Token</h3>
                <p className="text-sm text-gray-600">Direct token authentication for testing</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">

            {/* Connection Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Automatic CORS Handling</h4>
                    <div className="text-xs text-blue-800 mt-1 space-y-1">
                      <p>• Tries direct connection first (fastest)</p>
                      <p>• Uses public CORS proxies automatically</p>
                      <p>• Switches between proxies if rate limited</p>
                      <p>• Improved error handling and recovery</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCorsStatus(true)}
                  className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  <Settings className="w-3 h-3" />
                  <span>Status</span>
                </button>
              </div>
            </div>

            {/* Rate Limit Error */}
            {isRateLimitError && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-900">CORS Proxy Rate Limited</h4>
                    <p className="text-xs text-orange-800 mt-1">
                      The current CORS proxy has reached its rate limit. The app will automatically try alternative proxies.
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-orange-800 font-medium">Solutions:</p>
                      <p className="text-xs text-orange-800">• Wait a few minutes and try again</p>
                      <p className="text-xs text-orange-800">• The app will try different proxies automatically</p>
                      <p className="text-xs text-orange-800">• Check proxy status using the button above</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Network Error */}
            {isNetworkError && !isCorsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-900">Connection Failed</h4>
                    <p className="text-xs text-red-800 mt-1">
                      Unable to connect to Salesforce. Please check your internet connection and instance URL.
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-red-800 font-medium">Troubleshooting:</p>
                      <p className="text-xs text-red-800">• Verify the instance URL is correct</p>
                      <p className="text-xs text-red-800">• Check your internet connection</p>
                      <p className="text-xs text-red-800">• Ensure the access token is valid</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* General Error Display */}
            {error && !isRateLimitError && !isNetworkError && !isCorsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-900">Connection Failed</h4>
                    <p className="text-xs text-red-800 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Connection Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Organization Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Organization Type
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'developer', label: 'Developer Edition', description: 'Free developer org (trailblaze.my.salesforce.com)' },
                    { value: 'sandbox', label: 'Sandbox', description: 'Testing environment' },
                    { value: 'production', label: 'Production', description: 'Live business environment' }
                  ].map((type) => (
                    <label key={type.value} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="orgType"
                        value={type.value}
                        checked={credentials.orgType === type.value}
                        onChange={(e) => handleInputChange('orgType', e.target.value)}
                        className="w-4 h-4 text-green-600"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-600">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Instance URL */}
              <div>
                <label htmlFor="instanceUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Instance URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="instanceUrl"
                  value={credentials.instanceUrl}
                  onChange={(e) => handleInputChange('instanceUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="https://your-domain.my.salesforce.com"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Your Salesforce instance URL</p>
              </div>

              {/* Access Token */}
              <div>
                <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <textarea
                    id="accessToken"
                    value={credentials.accessToken}
                    onChange={(e) => handleInputChange('accessToken', e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-xs resize-none"
                    placeholder="00Dxx0000000000!AQEAQEOKxdlkwt..."
                    rows={3}
                    required
                    disabled={isLoading}
                    style={{ filter: showToken ? 'none' : 'blur(4px)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your Salesforce session access token (starts with "00D")
                </p>
              </div>

              {/* How to get token */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Code className="w-4 h-4 mr-2" />
                  How to get an access token:
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>1. Open your browser's Developer Tools (F12)</p>
                  <p>2. Go to Network tab and log into Salesforce</p>
                  <p>3. Look for any API request and check the Authorization header</p>
                  <p>4. Copy the token after "Bearer " (without "Bearer ")</p>
                  <p>5. Or use Workbench, Postman, or other API tools to get a token</p>
                </div>
              </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              {/* Security Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <Shield className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <h4 className="text-sm font-medium text-green-900">Ready to Connect</h4>
                  <div className="text-xs text-green-800 mt-1 space-y-1">
                    <p>• Automatic CORS proxy handling</p>
                    <p>• Multiple fallback services</p>
                    <p>• No additional setup required</p>
                    <p>• Enhanced error recovery</p>
              </div>

              {/* Submit Button */}
                type="submit"
                disabled={isLoading || !credentials.accessToken || !credentials.instanceUrl}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Connect with Token</span>
                  </>
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Method</h4>
            </div>
          </div>
        </div>
      </div>

      {/* CORS Proxy Status Modal */}
      <CorsProxyStatusModal 
        isOpen={showCorsStatus} 
        onClose={() => setShowCorsStatus(false)} 
      />
    </>
  );
};