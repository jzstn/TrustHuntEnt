import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Organization, 
  Vulnerability, 
  AISecurityEvent, 
  CrossOrgAnalysis, 
  TemporalRiskEvent, 
  SecurityScan,
  DashboardMetrics 
} from '../types';

interface SecurityState {
  // Organizations
  organizations: Organization[];
  selectedOrg: Organization | null;
  
  // Vulnerabilities
  vulnerabilities: Vulnerability[];
  
  // AI Security Events
  aiSecurityEvents: AISecurityEvent[];
  
  // Cross-Org Analysis
  crossOrgAnalyses: CrossOrgAnalysis[];
  
  // Temporal Risk Events
  temporalRiskEvents: TemporalRiskEvent[];
  
  // Security Scans
  activeScans: SecurityScan[];
  
  // Dashboard Metrics
  dashboardMetrics: DashboardMetrics;
  
  // UI State
  isLoading: boolean;
  lastUpdated: Date | null;
  
  // Performance tracking
  performanceMetrics: {
    apiResponseTime: number;
    scanDuration: number;
    dataProcessingTime: number;
  };
  
  // Actions
  setOrganizations: (orgs: Organization[]) => void;
  setSelectedOrg: (org: Organization | null) => void;
  addVulnerability: (vulnerability: Vulnerability) => void;
  updateVulnerability: (id: string, updates: Partial<Vulnerability>) => void;
  removeVulnerability: (id: string) => void;
  addAISecurityEvent: (event: AISecurityEvent) => void;
  addCrossOrgAnalysis: (analysis: CrossOrgAnalysis) => void;
  addTemporalRiskEvent: (event: TemporalRiskEvent) => void;
  startSecurityScan: (scan: SecurityScan) => void;
  updateScanProgress: (scanId: string, progress: number) => void;
  completeScan: (scanId: string, results: any) => void;
  updateDashboardMetrics: (metrics: Partial<DashboardMetrics>) => void;
  setLoading: (loading: boolean) => void;
  updatePerformanceMetrics: (metrics: Partial<SecurityState['performanceMetrics']>) => void;
  clearAllData: () => void;
  
  // Computed getters
  getCriticalVulnerabilities: () => Vulnerability[];
  getActiveScansCount: () => number;
  getSecurityScore: () => number;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      // Initial state - all empty for real data only
      organizations: [],
      selectedOrg: null,
      vulnerabilities: [],
      aiSecurityEvents: [],
      crossOrgAnalyses: [],
      temporalRiskEvents: [],
      activeScans: [],
      dashboardMetrics: {
        totalOrgs: 0,
        totalVulnerabilities: 0,
        criticalVulnerabilities: 0,
        averageRiskScore: 0,
        activeScans: 0,
        aiSecurityEvents: 0,
        crossOrgIssues: 0,
        temporalAnomalies: 0,
      },
      isLoading: false,
      lastUpdated: null,
      performanceMetrics: {
        apiResponseTime: 0,
        scanDuration: 0,
        dataProcessingTime: 0,
      },

      // Actions
      setOrganizations: (orgs) => set({ 
        organizations: orgs,
        dashboardMetrics: {
          ...get().dashboardMetrics,
          totalOrgs: orgs.length
        },
        lastUpdated: new Date()
      }),
      
      setSelectedOrg: (org) => set({ selectedOrg: org }),
      
      addVulnerability: (vulnerability) => 
        set((state) => {
          const newVulns = [...state.vulnerabilities, vulnerability];
          const criticalCount = newVulns.filter(v => v.severity === 'critical').length;
          
          return {
            vulnerabilities: newVulns,
            dashboardMetrics: {
              ...state.dashboardMetrics,
              totalVulnerabilities: newVulns.length,
              criticalVulnerabilities: criticalCount
            },
            lastUpdated: new Date()
          };
        }),
      
      updateVulnerability: (id, updates) =>
        set((state) => {
          const updatedVulns = state.vulnerabilities.map(vuln =>
            vuln.id === id ? { ...vuln, ...updates } : vuln
          );
          const criticalCount = updatedVulns.filter(v => v.severity === 'critical').length;
          
          return {
            vulnerabilities: updatedVulns,
            dashboardMetrics: {
              ...state.dashboardMetrics,
              totalVulnerabilities: updatedVulns.length,
              criticalVulnerabilities: criticalCount
            },
            lastUpdated: new Date()
          };
        }),

      removeVulnerability: (id) =>
        set((state) => {
          const filteredVulns = state.vulnerabilities.filter(vuln => vuln.id !== id);
          const criticalCount = filteredVulns.filter(v => v.severity === 'critical').length;
          
          return {
            vulnerabilities: filteredVulns,
            dashboardMetrics: {
              ...state.dashboardMetrics,
              totalVulnerabilities: filteredVulns.length,
              criticalVulnerabilities: criticalCount
            },
            lastUpdated: new Date()
          };
        }),
      
      addAISecurityEvent: (event) =>
        set((state) => {
          const newEvents = [...state.aiSecurityEvents, event];
          return {
            aiSecurityEvents: newEvents,
            dashboardMetrics: {
              ...state.dashboardMetrics,
              aiSecurityEvents: newEvents.length
            },
            lastUpdated: new Date()
          };
        }),
      
      addCrossOrgAnalysis: (analysis) =>
        set((state) => {
          const newAnalyses = [...state.crossOrgAnalyses, analysis];
          return {
            crossOrgAnalyses: newAnalyses,
            dashboardMetrics: {
              ...state.dashboardMetrics,
              crossOrgIssues: newAnalyses.length
            },
            lastUpdated: new Date()
          };
        }),
      
      addTemporalRiskEvent: (event) =>
        set((state) => {
          const newEvents = [...state.temporalRiskEvents, event];
          return {
            temporalRiskEvents: newEvents,
            dashboardMetrics: {
              ...state.dashboardMetrics,
              temporalAnomalies: newEvents.length
            },
            lastUpdated: new Date()
          };
        }),
      
      startSecurityScan: (scan) =>
        set((state) => {
          const newScans = [...state.activeScans, scan];
          const activeCount = newScans.filter(s => s.status === 'running').length;
          
          return {
            activeScans: newScans,
            dashboardMetrics: {
              ...state.dashboardMetrics,
              activeScans: activeCount
            },
            lastUpdated: new Date()
          };
        }),
      
      updateScanProgress: (scanId, progress) =>
        set((state) => ({
          activeScans: state.activeScans.map(scan =>
            scan.id === scanId ? { ...scan, progress } : scan
          ),
          lastUpdated: new Date()
        })),
      
      completeScan: (scanId, results) =>
        set((state) => {
          const updatedScans = state.activeScans.filter(scan => scan.id !== scanId);
          const activeCount = updatedScans.filter(s => s.status === 'running').length;
          
          return {
            activeScans: updatedScans,
            dashboardMetrics: {
              ...state.dashboardMetrics,
              activeScans: activeCount
            },
            lastUpdated: new Date()
          };
        }),
      
      updateDashboardMetrics: (metrics) =>
        set((state) => ({
          dashboardMetrics: { ...state.dashboardMetrics, ...metrics },
          lastUpdated: new Date()
        })),
      
      setLoading: (loading) => set({ isLoading: loading }),

      updatePerformanceMetrics: (metrics) =>
        set((state) => ({
          performanceMetrics: { ...state.performanceMetrics, ...metrics },
          lastUpdated: new Date()
        })),

      clearAllData: () => set({
        organizations: [],
        selectedOrg: null,
        vulnerabilities: [],
        aiSecurityEvents: [],
        crossOrgAnalyses: [],
        temporalRiskEvents: [],
        activeScans: [],
        dashboardMetrics: {
          totalOrgs: 0,
          totalVulnerabilities: 0,
          criticalVulnerabilities: 0,
          averageRiskScore: 0,
          activeScans: 0,
          aiSecurityEvents: 0,
          crossOrgIssues: 0,
          temporalAnomalies: 0,
        },
        lastUpdated: new Date()
      }),

      // Computed getters
      getCriticalVulnerabilities: () => {
        const state = get();
        return state.vulnerabilities.filter(v => v.severity === 'critical');
      },

      getActiveScansCount: () => {
        const state = get();
        return state.activeScans.filter(s => s.status === 'running').length;
      },

      getSecurityScore: () => {
        const state = get();
        const orgs = state.organizations;
        
        if (orgs.length === 0) return 0;
        
        const totalScore = orgs.reduce((sum, org) => sum + org.riskScore, 0);
        return Math.round(totalScore / orgs.length);
      },
    }),
    {
      name: 'secureforce-pro-storage',
      partialize: (state) => ({
        organizations: state.organizations,
        selectedOrg: state.selectedOrg,
        dashboardMetrics: state.dashboardMetrics,
        performanceMetrics: state.performanceMetrics,
      }),
    }
  )
);