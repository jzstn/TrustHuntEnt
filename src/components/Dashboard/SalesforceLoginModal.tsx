import React, { useState } from 'react';
import { X, Shield, User, Lock, Key, AlertCircle, CheckCircle, Loader, Eye, EyeOff } from 'lucide-react';

interface SalesforceLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (credentials: {
    username: string;
    password: string;
    securityToken?: string;
    instanceUrl: string;
  }) => void;
  isLoading?: boolean;
  error?: string;
}

export const SalesforceLoginModal: React.FC<SalesforceLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  isLoading = false,
  error
}) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    securityToken: '',
    instanceUrl: 'https://cunning-koala-u9ryu3-dev-ed.trailblaze.my.salesforce.com'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showSecurityToken, setShowSecurityToken] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(credentials);
  };

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connect to Salesforce</h3>
              <p className="text-sm text-gray-600">Username & Password Login</p>
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
          {/* Developer Org Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Developer Org Detected</h4>
                <p className="text-xs text-blue-800 mt-1">
                  Using your developer org: <strong>cunning-koala-u9ryu3-dev-ed</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-900">Login Failed</h4>
                  <p className="text-xs text-red-800 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
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
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
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
                Only needed if your org requires it or you're connecting from an untrusted network
              </p>
            </div>

            {/* Instance URL (read-only) */}
            <div>
              <label htmlFor="instanceUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Instance URL
              </label>
              <input
                type="url"
                id="instanceUrl"
                value={credentials.instanceUrl}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                readOnly
              />
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Need Help?</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Use your regular Salesforce login credentials</p>
              <p>• Security token may be required for external connections</p>
              <p>• Check your email for security token if needed</p>
              <p>• Contact your Salesforce admin if you have issues</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};