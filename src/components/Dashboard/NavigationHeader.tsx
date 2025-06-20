import React from 'react';
import { 
  Shield, 
  BarChart3, 
  Search, 
  FileText, 
  Settings, 
  Bell, 
  User,
  ChevronDown,
  Zap,
  Activity
} from 'lucide-react';

interface NavigationHeaderProps {
  selectedView: 'overview' | 'vulnerabilities' | 'scans' | 'reports';
  onViewChange: (view: 'overview' | 'vulnerabilities' | 'scans' | 'reports') => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  selectedView,
  onViewChange
}) => {
  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: Shield },
    { id: 'scans', label: 'Security Scans', icon: Search },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  SecureForce Pro
                </h1>
                <p className="text-xs text-gray-500">Enterprise Security Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedView === item.id
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* System Status Indicator */}
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-green-600">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">All Systems Operational</span>
              </div>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-2 pl-4 border-l border-gray-200">
              <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded-lg p-2 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">Security Administrator</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};