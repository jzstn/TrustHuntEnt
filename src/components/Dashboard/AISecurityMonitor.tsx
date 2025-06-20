import React from 'react';
import { Zap, Brain, AlertCircle, Clock, Shield, TrendingUp } from 'lucide-react';
import { AISecurityEvent } from '../../types';
import { format } from 'date-fns';

interface AISecurityMonitorProps {
  events: AISecurityEvent[];
}

export const AISecurityMonitor: React.FC<AISecurityMonitorProps> = ({ events }) => {
  const criticalEvents = events.filter(e => e.riskLevel === 'critical' || e.riskLevel === 'high');
  const businessHoursViolations = events.filter(e => e.businessHoursViolation);
  const sensitiveDataExposures = events.filter(e => e.sensitiveDataExposed);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'einstein_gpt_access': return <Brain className="w-4 h-4" />;
      case 'copilot_data_exposure': return <Zap className="w-4 h-4" />;
      case 'ai_anomaly': return <AlertCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Zap className="w-5 h-5 text-blue-600 mr-2" />
            AI Security Monitor
          </h3>
          <p className="text-sm text-gray-600">Einstein GPT & Copilot security analysis</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-blue-600">
          <TrendingUp className="w-4 h-4" />
          <span>Live Monitoring</span>
        </div>
      </div>

      {/* AI Security Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{criticalEvents.length}</div>
          <div className="text-xs text-red-600">Critical Events</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{businessHoursViolations.length}</div>
          <div className="text-xs text-orange-600">After Hours</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{sensitiveDataExposures.length}</div>
          <div className="text-xs text-purple-600">Data Exposed</div>
        </div>
      </div>

      {/* Recent AI Security Events */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <AlertCircle className="w-4 h-4 text-blue-600 mr-2" />
          Recent AI Security Events
        </h4>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className={`p-2 rounded-lg ${getRiskLevelColor(event.riskLevel)}`}>
                {getEventTypeIcon(event.eventType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(event.riskLevel)}`}>
                    {event.riskLevel.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  User: {event.userId} • {format(event.timestamp, 'MMM dd, HH:mm')}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs">
                  {event.businessHoursViolation && (
                    <span className="flex items-center text-orange-600">
                      <Clock className="w-3 h-3 mr-1" />
                      After Hours
                    </span>
                  )}
                  {event.sensitiveDataExposed && (
                    <span className="flex items-center text-red-600">
                      <Shield className="w-3 h-3 mr-1" />
                      Sensitive Data
                    </span>
                  )}
                </div>
                {event.dataAccessed.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Data Accessed:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.dataAccessed.slice(0, 3).map((field, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {field}
                        </span>
                      ))}
                      {event.dataAccessed.length > 3 && (
                        <span className="text-xs text-gray-500">+{event.dataAccessed.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Security Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">AI Security Insights</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <span className="text-sm text-blue-800">Einstein GPT Usage Pattern</span>
            <span className="text-xs text-blue-600">↑ 23% increase</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
            <span className="text-sm text-yellow-800">Copilot Data Access</span>
            <span className="text-xs text-yellow-600">5 sensitive fields</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
            <span className="text-sm text-green-800">AI Security Score</span>
            <span className="text-xs text-green-600">87% (Good)</span>
          </div>
        </div>
      </div>
    </div>
  );
};