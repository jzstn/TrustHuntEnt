import React, { useState } from 'react';
import { X, Shield, CheckCircle, XCircle, Loader, Key, Info, ExternalLink, AlertTriangle } from 'lucide-react';

interface OAuthTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OAuthTestModal: React.FC<OAuthTestModalProps> = ({ isOpen, onClose }) => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [useCorsProxy, setUseCorsProxy] = useState(true);

  if (!isOpen) return null;

  const testOAuthConnection = async () => {
    if (!accessToken || !instanceUrl) {
      alert('Please provide both access token and instance URL');
      return;
    }

    setIsLoading(true);
    setTestResults(null);

    try {
      console.log('🔍 Testing OAuth connection...');
      
      // Test 1: Basic API call to verify token
      const limitsUrl = `${instanceUrl}/services/data/v58.0/limits`;
      const finalUrl = useCorsProxy ? `https://cors-anywhere.herokuapp.com/${limitsUrl}` : limitsUrl;
      console.log('Testing URL:', finalUrl);
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Add CORS proxy headers if using proxy
      if (useCorsProxy) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
      }
      
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const results = {
        tokenValid: false,
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseData: null,
        error: null,
        userInfo: null,
        orgInfo: null
      };

      if (response.ok) {
        results.tokenValid = true;
        results.responseData = await response.json();
        console.log('✅ Token is valid!');

        // Test 2: Get user info
        try {
          const userInfoUrl = `${instanceUrl}/services/oauth2/userinfo`;
          const finalUserInfoUrl = useCorsProxy ? `https://cors-anywhere.herokuapp.com/${userInfoUrl}` : userInfoUrl;
          
          const userInfoResponse = await fetch(finalUserInfoUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
              ...(useCorsProxy && { 'X-Requested-With': 'XMLHttpRequest' })
            }
          });

          if (userInfoResponse.ok) {
            results.userInfo = await userInfoResponse.json();
            console.log('✅ User info retrieved');
          }
        } catch (error) {
          console.log('⚠️ User info failed:', error);
        }

        // Test 3: Get organization info
        try {
          const orgUrl = `${instanceUrl}/services/data/v58.0/query?q=SELECT Id, Name, OrganizationType FROM Organization LIMIT 1`;
          const finalOrgUrl = useCorsProxy ? `https://cors-anywhere.herokuapp.com/${orgUrl}` : orgUrl;
          
          const orgResponse = await fetch(finalOrgUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
              ...(useCorsProxy && { 'X-Requested-With': 'XMLHttpRequest' })
            }
          });

          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            results.orgInfo = orgData.records[0];
            console.log('✅ Organization info retrieved');
          }
        } catch (error) {
          console.log('⚠️ Organization info failed:', error);
        }

      } else {
        const errorText = await response.text();
        results.error = errorText;
        console.log('❌ Token validation failed:', errorText);
      }

      setTestResults(results);

    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResults({
        tokenValid: false,
        error: error.message,
        responseStatus: null,
        responseHeaders: {},
        responseData: null,
        userInfo: null,
        orgInfo: null
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">OAuth Connection Test</h3>
              <p className="text-sm text-gray-600">Test your Salesforce OAuth token and connection</p>
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
          {/* CORS Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-900">Local CORS Proxy Available</h4>
                <p className="text-xs text-amber-800 mt-1">
                  This app uses a local CORS proxy to handle Salesforce API requests.
                  Make sure the proxy is running with <code>npm run proxy</code> in a separate terminal.
                </p>
                <div className="mt-2">
                  <p className="text-xs text-amber-800">
                    If you haven't started the proxy, run <code>npm run proxy</code> in a new terminal window.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">How to get your OAuth token:</h4>
                <ol className="text-xs text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                  <li>Open your browser's Developer Tools (F12)</li>
                  <li>Go to the Network tab</li>
                  <li>Log into your Salesforce org</li>
                  <li>Look for any API request in the Network tab</li>
                  <li>Check the Authorization header and copy the token after "Bearer "</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Test Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="instanceUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Instance URL
              </label>
              <input
                type="url"
                id="instanceUrl"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://your-instance.salesforce.com"
              />
            </div>

            <div>
              <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
                Access Token
              </label>
              <textarea
                id="accessToken"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                rows={3}
                placeholder="00Dxx0000000000!AQEAQEOKxdlkwt..."
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="useCorsProxy"
                checked={useCorsProxy}
                onChange={(e) => setUseCorsProxy(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="useCorsProxy" className="text-sm text-gray-700">
                Use CORS proxy (required for browser testing)
              </label>
            </div>

            <button
              onClick={testOAuthConnection}
              disabled={isLoading || !accessToken || !instanceUrl}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Testing Connection...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Test OAuth Connection</span>
                </>
              )}
            </button>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="space-y-6">
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Test Results</h4>

                {/* Connection Status */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    {testResults.tokenValid ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <h5 className="font-medium text-gray-900">
                        {testResults.tokenValid ? 'Connection Successful' : 'Connection Failed'}
                      </h5>
                      <p className="text-sm text-gray-600">
                        Status: {testResults.responseStatus || 'No response'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                {testResults.userInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h5 className="font-medium text-green-900 mb-2">User Information</h5>
                    <div className="text-sm text-green-800 space-y-1">
                      <p><strong>Name:</strong> {testResults.userInfo.name}</p>
                      <p><strong>Email:</strong> {testResults.userInfo.email}</p>
                      <p><strong>Username:</strong> {testResults.userInfo.preferred_username}</p>
                      <p><strong>User ID:</strong> {testResults.userInfo.user_id}</p>
                      <p><strong>Organization ID:</strong> {testResults.userInfo.organization_id}</p>
                    </div>
                  </div>
                )}

                {/* Organization Info */}
                {testResults.orgInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h5 className="font-medium text-blue-900 mb-2">Organization Information</h5>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Name:</strong> {testResults.orgInfo.Name}</p>
                      <p><strong>Type:</strong> {testResults.orgInfo.OrganizationType}</p>
                      <p><strong>ID:</strong> {testResults.orgInfo.Id}</p>
                    </div>
                  </div>
                )}

                {/* API Response Data */}
                {testResults.responseData && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">API Response (Limits)</h5>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(testResults.responseData, null, 2))}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Copy JSON
                      </button>
                    </div>
                    <pre className="text-xs text-gray-700 bg-white p-3 rounded border overflow-auto max-h-40">
                      {JSON.stringify(testResults.responseData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Error Details */}
                {testResults.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h5 className="font-medium text-red-900 mb-2">Error Details</h5>
                    <pre className="text-sm text-red-800 whitespace-pre-wrap">
                      {testResults.error}
                    </pre>
                  </div>
                )}

                {/* Response Headers */}
                {Object.keys(testResults.responseHeaders).length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">Response Headers</h5>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(testResults.responseHeaders, null, 2))}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Copy Headers
                      </button>
                    </div>
                    <pre className="text-xs text-gray-700 bg-white p-3 rounded border overflow-auto max-h-40">
                      {JSON.stringify(testResults.responseHeaders, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};