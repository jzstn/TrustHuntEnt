import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, ExternalLink, Info, Settings } from 'lucide-react';
import { CorsProxyManager } from '../../services/salesforce/CorsProxyManager';

interface CorsProxyStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CorsProxyStatusModal: React.FC<CorsProxyStatusModalProps> = ({ isOpen, onClose }) => {
  const [proxyStatus, setProxyStatus] = useState<Array<{proxy: string, rateLimited: boolean, resetTime?: number}>>([]);
  const [customProxy, setCustomProxy] = useState('');
  const corsProxyManager = CorsProxyManager.getInstance();

  useEffect(() => {
    if (isOpen) {
      updateProxyStatus();
      const interval = setInterval(updateProxyStatus, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const updateProxyStatus = () => {
    setProxyStatus(corsProxyManager.getProxyStatus());
  };

  const addCustomProxy = () => {
    if (customProxy.trim()) {
      try {
        corsProxyManager.addCustomProxy(customProxy.trim());
        setCustomProxy('');
        updateProxyStatus();
      } catch (error) {
        alert('Invalid proxy URL format');
      }
    }
  };

  const formatResetTime = (resetTime?: number) => {
    if (!resetTime) return 'Unknown';
    const now = Date.now();
    const diff = resetTime - now;
    if (diff <= 0) return 'Available now';
    
    const minutes = Math.ceil(diff / (1000 * 60));
    if (minutes < 60) return `${minutes} minutes`;
    
    const hours = Math.ceil(minutes / 60);
    return `${hours} hours`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">CORS Proxy Status</h3>
              <p className="text-sm text-gray-600">Monitor and manage CORS proxy connections</p>
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
          {/* Rate Limit Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-900">CORS Proxy Rate Limits</h4>
                <p className="text-xs text-amber-800 mt-1">
                  Public CORS proxies have rate limits. The app automatically switches between available proxies.
                  For unlimited access, consider setting up your own CORS proxy.
                </p>
              </div>
            </div>
          </div>

          {/* Proxy Status List */}
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-medium text-gray-900">Available CORS Proxies</h4>
            
            {proxyStatus.map((proxy, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {proxy.rateLimited ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {proxy.proxy.replace('https://', '').replace('/', '')}
                      </p>
                      <p className="text-xs text-gray-600">
                        {proxy.rateLimited ? 'Rate Limited' : 'Available'}
                      </p>
                    </div>
                  </div>
                  
                  {proxy.rateLimited && (
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Reset in: {formatResetTime(proxy.resetTime)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Proxy */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add Custom CORS Proxy</h4>
            <div className="flex space-x-3">
              <input
                type="url"
                value={customProxy}
                onChange={(e) => setCustomProxy(e.target.value)}
                placeholder="https://your-cors-proxy.com/"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                onClick={addCustomProxy}
                disabled={!customProxy.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Add your own CORS proxy URL for unlimited requests
            </p>
          </div>

          {/* Setup Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Setup Your Own CORS Proxy</h4>
                <p className="text-xs text-blue-800 mt-1 mb-2">
                  For production use or unlimited requests, set up your own CORS proxy:
                </p>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Clone the CORS Anywhere repository</li>
                  <li>Deploy to Heroku, Vercel, or your preferred platform</li>
                  <li>Add your proxy URL using the form above</li>
                </ol>
                <div className="mt-2">
                  <a 
                    href="https://github.com/Rob--W/cors-anywhere" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    CORS Anywhere GitHub Repository
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Current Status Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Current Status</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Total proxies: {proxyStatus.length}</p>
              <p>• Available: {proxyStatus.filter(p => !p.rateLimited).length}</p>
              <p>• Rate limited: {proxyStatus.filter(p => p.rateLimited).length}</p>
              <p>• Active proxy: {corsProxyManager.getCurrentProxy().replace('https://', '').replace('/', '')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};