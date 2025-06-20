import React, { useState } from 'react';
import { X, Shield, User, Lock, Key, AlertCircle, CheckCircle, Loader, Eye, EyeOff, Building2, ExternalLink, Info, HelpCircle } from 'lucide-react';

interface SalesforceConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (credentials: {
    username: string;
    password: string;
    securityToken?: string;
    instanceUrl: string;
    environment: 'production' | 'sandbox' | 'developer';
  }) => void;
  isLoading?: boolean;
  error?: string;
}

export const SalesforceConnectionModal: React.FC<SalesforceConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isLoading = false,
  error
}) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    securityToken: '',
    instanceUrl: '',
    environment: 'sandbox' as 'production' | 'sandbox' | 'developer'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showSecurityToken, setShowSecurityToken] = useState(false);
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set default instance URL based on environment if not custom
    let finalInstanceUrl = credentials.instanceUrl;
    if (!useCustomUrl) {
      switch (credentials.environment) {
        case 'production':
          finalInstanceUrl = 'https://login.salesforce.com';
          break;
        case 'sandbox':
          finalInstanceUrl = 'https://test.salesforce.com';
          break;
        case 'developer':
          finalInstanceUrl = 'https://login.salesforce.com';
          break;
      }
    }

    onConnect({
      ...credentials,
      instanceUrl: finalInstanceUrl
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const getEnvironmentDescription = (env: string) => {
    switch (env) {
      case 'production':
        return 'Live production environment with real customer data';
      case 'sandbox':
        return 'Testing environment with sample data (Recommended)';
      case 'developer':
        return 'Development environment for building and testing';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connect Salesforce Organization</h3>
              <p className="text-sm text-gray-600">Username & password authentication</p>
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
          {/* CORS Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Demo Mode - CORS Proxy Required</h4>
                <p className="text-xs text-blue-800 mt-1">
                  This demo uses a CORS proxy for Salesforce authentication. You must enable it first.
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-blue-800 font-medium">Steps to enable:</p>
                  <p className="text-xs text-blue-800">1. Click the link below to visit the CORS proxy</p>
                  <p className="text-xs text-blue-800">2. Click "Request temporary access to the demo server"</p>
                  <p className="text-xs text-blue-800">3. Return here and try connecting</p>
                </div>
                <a 
                  href="https://cors-anywhere.herokuapp.com/corsdemo" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 underline mt-2 font-medium"
                >
                  Enable CORS proxy <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>

          {/* Credential Help */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900">Need Salesforce Credentials?</h4>
                <p className="text-xs text-yellow-800 mt-1">
                  If you don't have a Salesforce org, you can create a free Developer Edition:
                </p>
                <a 
                  href="https://developer.salesforce.com/signup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-yellow-600 hover:text-yellow-700 underline mt-1 font-medium"
                >
                  Get Free Developer Org <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                <div className="mt-2">
                  <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-xs text-yellow-600 hover:text-yellow-700 underline"
                  >
                    {showHelp ? 'Hide' : 'Show'} credential help
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Credential Help Details */}
          {showHelp && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">How to find your credentials:</h4>
              <div className="text-xs text-gray-700 space-y-2">
                <div>
                  <strong>Username:</strong> Your Salesforce login email (e.g., user@company.com)
                </div>
                <div>
                  <strong>Password:</strong> Your Salesforce login password
                </div>
                <div>
                  <strong>Security Token:</strong> 
                  <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                    <li>Go to Salesforce → Setup → My Personal Information → Reset My Security Token</li>
                    <li>Click "Reset Security Token" - it will be emailed to you</li>
                    <li>Required if connecting from an untrusted network</li>
                    <li>If login fails without token, try adding it</li>
                  </ul>
                </div>
                <div>
                  <strong>Environment:</strong>
                  <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                    <li><strong>Sandbox:</strong> For testing (recommended for demo)</li>
                    <li><strong>Developer:</strong> Free developer edition orgs</li>
                    <li><strong>Production:</strong> Live business environment</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Environment Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Building2 className="w-4 h-4 inline mr-2" />
              Salesforce Environment
            </label>
            <div className="space-y-3">
              {[
                { value: 'sandbox', label: 'Sandbox', recommended: true },
                { value: 'developer', label: 'Developer Edition' },
                { value: 'production', label: 'Production', warning: true }
              ].map((env) => (
                <label key={env.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="environment"
                    value={env.value}
                    checked={credentials.environment === env.value}
                    onChange={(e) => handleInputChange('environment', e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{env.label}</span>
                      {env.recommended && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Recommended
                        </span>
                      )}
                      {env.warning && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          Caution
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {getEnvironmentDescription(env.value)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Warning for Production */}
          {credentials.environment === 'production' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900">Production Environment Warning</h4>
                  <p className="text-xs text-yellow-800 mt-1">
                    You're connecting to a production environment. TrustHunt will only read 
                    security-related metadata and will not modify any data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-900">Connection Failed</h4>
                  <p className="text-xs text-red-800 mt-1">{error}</p>
                  {error.includes('Invalid username, password, or security token') && (
                    <div className="mt-2 text-xs text-red-800">
                      <p className="font-medium">Common solutions:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Double-check your username and password</li>
                        <li>Try adding your security token to the password field</li>
                        <li>Make sure you're using the correct environment (Sandbox vs Production)</li>
                        <li>Reset your security token if needed</li>
                      </ul>
                    </div>
                  )}
                  {error.includes('CORS') && (
                    <p className="text-xs text-red-800 mt-2">
                      Please visit the CORS proxy link above to enable cross-origin requests.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  id="username"
                  value={credentials.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your.email@company.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Your Salesforce login email address</p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={credentials.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Salesforce password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                If login fails, try appending your security token to your password
              </p>
            </div>

            {/* Security Token */}
            <div>
              <label htmlFor="securityToken" className="block text-sm font-medium text-gray-700 mb-2">
                Security Token <span className="text-gray-500">(if required)</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showSecurityToken ? 'text' : 'password'}
                  id="securityToken"
                  value={credentials.securityToken}
                  onChange={(e) => handleInputChange('securityToken', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Security token (optional)"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowSecurityToken(!showSecurityToken)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecurityToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Get this from Setup → My Personal Information → Reset My Security Token
              </p>
            </div>

            {/* Custom Instance URL */}
            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={useCustomUrl}
                  onChange={(e) => setUseCustomUrl(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Use custom instance URL</span>
              </label>
              
              {useCustomUrl && (
                <input
                  type="url"
                  value={credentials.instanceUrl}
                  onChange={(e) => handleInputChange('instanceUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://your-domain.my.salesforce.com"
                  disabled={isLoading}
                />
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="text-xs text-green-800">
                  <p className="font-medium">Secure Connection</p>
                  <p>Your credentials are transmitted securely and not stored permanently.</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !credentials.username || !credentials.password}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Connect to Salesforce</span>
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Troubleshooting Tips</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• <strong>Invalid credentials:</strong> Check username, password, and security token</p>
              <p>• <strong>Security token:</strong> Required for untrusted networks or API access</p>
              <p>• <strong>Environment:</strong> Use Sandbox for testing, Production for live data</p>
              <p>• <strong>CORS issues:</strong> Enable the CORS proxy using the link above</p>
              <p>• <strong>Need help?</strong> Contact your Salesforce administrator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};