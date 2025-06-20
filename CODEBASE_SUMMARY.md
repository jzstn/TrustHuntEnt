# TrustHunt Enterprise - Codebase Summary for New Chat

## Project Overview
TrustHunt Enterprise is a comprehensive Salesforce security assessment platform with AI monitoring, DAST engine, cross-org analysis, and real-time threat detection. Built for Fortune 500 companies and consulting firms.

## Tech Stack
- **Frontend**: React 18+ with TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **State Management**: Zustand with persistence
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Build Tool**: Vite

## Key Dependencies (package.json)
```json
{
  "dependencies": {
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7",
    "zustand": "^4.5.2",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2"
  }
}
```

## Project Structure
```
src/
├── components/
│   └── Dashboard/
│       ├── TrustHuntDashboard.tsx (Main dashboard)
│       ├── SalesforceTokenModal.tsx (Token auth)
│       ├── SalesforceConnectionModal.tsx (Password auth)
│       ├── OAuthTestModal.tsx (OAuth testing)
│       ├── CorsProxyStatusModal.tsx (CORS management)
│       ├── AISecurityMonitor.tsx
│       ├── CrossOrgAnalysisView.tsx
│       ├── DASTEngineView.tsx
│       ├── VulnerabilityChart.tsx
│       └── [other dashboard components]
├── services/
│   ├── salesforce/
│   │   ├── SalesforceAPIClient.ts (Main API client)
│   │   ├── SalesforceTokenAuth.ts (Token authentication)
│   │   ├── SalesforcePasswordAuth.ts (Password auth)
│   │   ├── SecurityAnalysisService.ts (Security scanning)
│   │   └── CorsProxyManager.ts (CORS proxy handling)
│   ├── dast/
│   │   ├── SalesforceDastEngine.ts (DAST scanning)
│   │   ├── SalesforceWebCrawler.ts (Web crawling)
│   │   ├── PayloadGenerator.ts (Security payloads)
│   │   └── VulnerabilityVerifier.ts (Vuln verification)
│   ├── enterprise/
│   │   └── EnterpriseSecurityOrchestrator.ts (Multi-org management)
│   └── [other services]
├── hooks/
│   ├── useSalesforceTokenAuth.ts
│   └── useSalesforcePasswordAuth.ts
├── store/
│   └── useSecurityStore.ts (Zustand store)
├── types/
│   ├── index.ts (Core types)
│   ├── dast.ts (DAST types)
│   └── enterprise.ts (Enterprise types)
└── App.tsx
```

## Core Features

### 1. Authentication Methods
- **Token Authentication**: Direct access token input (recommended for testing)
- **Password Authentication**: Username/password with security token
- **OAuth Testing**: Test existing OAuth tokens

### 2. CORS Proxy Management
- Multiple CORS proxy fallbacks
- Automatic rate limit detection and switching
- Custom proxy support
- Status monitoring

### 3. Security Analysis
- **SOQL Injection Detection**: Pattern matching in Apex code
- **CRUD/FLS Violations**: Missing sharing declarations
- **Permission Analysis**: Overprivileged users, inactive accounts
- **AI Security Monitoring**: Einstein GPT usage patterns
- **Temporal Risk Analysis**: After-hours access detection

### 4. DAST Engine
- Salesforce-specific web crawling
- Lightning and Visualforce page analysis
- API endpoint discovery
- Vulnerability verification with proof-of-concept

### 5. Enterprise Features
- Multi-organization management
- Cross-org security comparison
- Real-time monitoring
- Compliance reporting (SOC 2, GDPR, HIPAA, PCI DSS)

## Key Components

### Main Dashboard (TrustHuntDashboard.tsx)
```typescript
// Main features:
- Connection management (Token, Password, OAuth test)
- Enterprise metrics overview
- Real-time security monitoring
- Multi-authentication support
- CORS proxy status management
```

### Authentication Services
```typescript
// SalesforceTokenAuth.ts - Token-based auth
- Direct token validation
- CORS proxy integration
- Rate limit handling
- Error recovery

// SalesforcePasswordAuth.ts - Username/password auth
- SOAP login API
- Security token support
- Session management
```

### API Client (SalesforceAPIClient.ts)
```typescript
// Features:
- Rate limiting (45 requests per hour)
- CORS proxy fallback
- Retry logic with exponential backoff
- Comprehensive error handling
- SOQL query execution
- Tooling API support
```

### Security Analysis (SecurityAnalysisService.ts)
```typescript
// Vulnerability Detection:
- SOQL injection patterns
- CRUD/FLS violations
- Hardcoded credentials
- Permission escalation
- Temporal anomalies
```

## State Management (Zustand)
```typescript
interface SecurityState {
  organizations: Organization[];
  vulnerabilities: Vulnerability[];
  aiSecurityEvents: AISecurityEvent[];
  crossOrgAnalyses: CrossOrgAnalysis[];
  temporalRiskEvents: TemporalRiskEvent[];
  activeScans: SecurityScan[];
  dashboardMetrics: DashboardMetrics;
  // ... actions and computed getters
}
```

## Type Definitions

### Core Types (types/index.ts)
```typescript
interface Organization {
  id: string;
  name: string;
  type: 'production' | 'sandbox' | 'developer';
  instanceUrl: string;
  isConnected: boolean;
  riskScore: number;
  vulnerabilityCount: number;
}

interface Vulnerability {
  id: string;
  orgId: string;
  type: VulnerabilityType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: string;
  cvssScore: number;
  businessImpact: string;
  remediation: string;
}
```

## Environment Configuration
```env
VITE_SALESFORCE_CLIENT_ID=your_client_id
VITE_SALESFORCE_CLIENT_SECRET=your_client_secret
VITE_SALESFORCE_REDIRECT_URI=http://localhost:5173/auth/callback
```

## Key Features to Highlight in New Chat

### 1. Market-First Capabilities
- AI Security Monitoring (Einstein GPT analysis)
- Cross-Org Security Analysis (multi-environment correlation)
- Temporal Risk Engine (time-based anomaly detection)
- Salesforce DAST Engine (purpose-built for Salesforce)

### 2. Enterprise Scale
- Support for 1000+ Salesforce organizations
- Real-time monitoring and alerting
- Compliance reporting across multiple frameworks
- SIEM integration capabilities

### 3. Technical Excellence
- Comprehensive error handling and recovery
- Rate limiting and CORS proxy management
- Modular architecture with clean separation
- TypeScript throughout for type safety

## Current Issues to Address in New Chat
1. **CORS Proxy Rate Limiting**: Need better handling of 429 errors
2. **Connection Reliability**: Improve fallback mechanisms
3. **Error Recovery**: Better user experience during failures
4. **Performance**: Optimize API request patterns

## Recommended Starting Points for New Chat
1. Start with the authentication system (token-based is most reliable)
2. Implement the core API client with proper error handling
3. Build the security analysis engine
4. Add the dashboard components
5. Integrate DAST capabilities

## Design Principles
- Beautiful, production-worthy UI design
- Comprehensive error handling
- Real-time updates and monitoring
- Enterprise-grade security and compliance
- Modular, maintainable architecture

## Sample Implementation Patterns

### Error Handling Pattern
```typescript
try {
  const result = await apiCall();
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
} catch (error) {
  console.error('Operation failed:', error);
  // Provide user-friendly error message
  // Attempt recovery if possible
  throw new Error(`User-friendly message: ${error.message}`);
}
```

### CORS Proxy Pattern
```typescript
// Try multiple proxies with fallback
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const proxy = corsProxyManager.getCurrentProxy();
  try {
    const response = await fetch(`${proxy}${targetUrl}`, options);
    if (response.status === 429) {
      corsProxyManager.markProxyRateLimited(proxy);
      continue; // Try next proxy
    }
    return response;
  } catch (error) {
    if (attempt === maxAttempts) throw error;
  }
}
```

This summary provides everything needed to recreate the TrustHunt Enterprise platform in a new chat. The codebase is well-structured, follows modern React patterns, and includes comprehensive security analysis capabilities specifically designed for Salesforce environments.