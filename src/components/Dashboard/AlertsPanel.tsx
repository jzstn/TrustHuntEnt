import React from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  Zap, 
  X,
  ChevronRight,
  Info
} from 'lucide-react';
import { useSecurityStore } from '../../store/useSecurityStore';

export const AlertsPanel: React.FC = () => {
  const { vulnerabilities, aiSecurityEvents, temporalRiskEvents } = useSecurityStore();

  // Generate real-time alerts from actual data
  const generateAlerts = () => {
    const alerts = [];

    // Critical vulnerabilities
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      alerts.push({
        id: 'critical-vulns',
        type: 'critical',
        title: `${criticalVulns.length} Critical Vulnerabilities`,
        description: `${criticalVulns[0]?.title || 'Security issues'} and ${criticalVulns.length - 1} more`,
        timestamp: 'Active now',
        icon: Shield,
        action: 'View Details'
      });
    }

    // High-risk AI events
    const highRiskAI = aiSecurityEvents.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical');
    if (highRiskAI.length > 0) {
      alerts.push({
        id: 'ai-risk',
        type: 'warning',
        title: 'High-Risk AI Activity',
        description: `${highRiskAI.length} AI security events detected`,
        timestamp: 'Last hour',
        icon: Zap,
        action: 'Investigate'
      });
    }

    // After-hours access
    const afterHours = temporalRiskEvents.filter(e => e.businessHoursViolation);
    if (afterHours.length > 0) {
      alerts.push({
        id: 'after-hours',
        type: 'warning',
        title: 'After-Hours Access Detected',
        description: `${afterHours.length} users accessed system outside business hours`,
        timestamp: 'Last 24 hours',
        icon: Clock,
        action: 'Review'
      });
    }

    // If no real alerts, show system status
    if (alerts.length === 0) {
      alerts.push({
        id: 'system-ok',
        type: 'info',
        title: 'All Systems Secure',
        description: 'No critical security alerts at this time',
        timestamp: 'Current status',
        icon: Shield,
        action: 'View Dashboard'
      });
    }

    return alerts;
  };

  const alerts = generateAlerts();

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const criticalCount = alerts.filter(a => a.type === 'critical').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
          Security Alerts
        </h3>
        {criticalCount > 0 ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {criticalCount} Critical
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
            Secure
          </span>
        )}
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`border rounded-lg p-4 ${getAlertColor(alert.type)} hover:shadow-sm transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <alert.icon className={`w-5 h-5 mt-0.5 ${getIconColor(alert.type)}`} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  {alert.action}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </button>
                {alert.type !== 'info' && (
                  <button className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-red-600">
              {alerts.filter(a => a.type === 'critical').length}
            </div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {alerts.filter(a => a.type === 'warning').length}
            </div>
            <div className="text-xs text-gray-600">Warning</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              {alerts.filter(a => a.type === 'info').length}
            </div>
            <div className="text-xs text-gray-600">Info</div>
          </div>
        </div>
      </div>
    </div>
  );
};