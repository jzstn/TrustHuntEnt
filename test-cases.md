# TrustHunt Enterprise - UAT Test Cases

## Authentication Test Cases

### TC-AUTH-001: Token Authentication
**Description:** Verify that users can authenticate using a Salesforce access token
**Preconditions:** User has a valid Salesforce access token and instance URL
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Click "Token" button in the header
3. Enter a valid instance URL (e.g., https://yourinstance.my.salesforce.com)
4. Enter a valid access token
5. Select the correct organization type
6. Click "Connect with Token"
**Expected Result:** User is successfully authenticated and connected to Salesforce

### TC-AUTH-002: Invalid Token Authentication
**Description:** Verify that appropriate error messages are displayed for invalid tokens
**Preconditions:** None
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Click "Token" button in the header
3. Enter a valid instance URL
4. Enter an invalid access token
5. Select any organization type
6. Click "Connect with Token"
**Expected Result:** Error message indicating invalid token is displayed

### TC-AUTH-003: CORS Proxy Functionality
**Description:** Verify that the CORS proxy works correctly
**Preconditions:** Local CORS proxy is running
**Steps:**
1. Start the local CORS proxy with `npm run proxy`
2. Navigate to the TrustHunt Enterprise dashboard
3. Click "Token" button in the header
4. Enter valid credentials
5. Click "Connect with Token"
**Expected Result:** Connection is successful using the local CORS proxy

### TC-AUTH-004: CORS Proxy Fallback
**Description:** Verify that the application falls back to alternative proxies if the local one fails
**Preconditions:** Local CORS proxy is NOT running
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Click "Token" button in the header
3. Enter valid credentials
4. Click "Connect with Token"
**Expected Result:** Connection is successful using one of the fallback CORS proxies

## Security Scanning Test Cases

### TC-SCAN-001: Start Security Scan
**Description:** Verify that users can initiate a security scan
**Preconditions:** User is authenticated with Salesforce
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Click "Start Scan" button
**Expected Result:** Security scan is initiated and progress is displayed

### TC-SCAN-002: View Scan Results
**Description:** Verify that scan results are displayed correctly
**Preconditions:** User has completed a security scan
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Wait for scan to complete
3. Observe the dashboard
**Expected Result:** Scan results are displayed with vulnerabilities categorized by severity

### TC-SCAN-003: Export Scan Report
**Description:** Verify that users can export scan results
**Preconditions:** User has completed a security scan
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Click "Scan Results" in the navigation
3. Click "Export Report" button
**Expected Result:** Report is downloaded in JSON format

## Vulnerability Management Test Cases

### TC-VULN-001: View Vulnerability Details
**Description:** Verify that users can view detailed information about vulnerabilities
**Preconditions:** User has completed a security scan with vulnerabilities detected
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Click "Vulnerabilities" in the navigation
3. Click "Show Details" on a vulnerability
**Expected Result:** Detailed information about the vulnerability is displayed

### TC-VULN-002: Filter Vulnerabilities
**Description:** Verify that users can filter vulnerabilities by severity and type
**Preconditions:** User has completed a security scan with vulnerabilities detected
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Click "Vulnerabilities" in the navigation
3. Use the severity filter to select "Critical"
4. Use the type filter to select a specific vulnerability type
**Expected Result:** Only vulnerabilities matching the selected filters are displayed

### TC-VULN-003: Search Vulnerabilities
**Description:** Verify that users can search for vulnerabilities
**Preconditions:** User has completed a security scan with vulnerabilities detected
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Click "Vulnerabilities" in the navigation
3. Enter a search term in the search box
**Expected Result:** Only vulnerabilities matching the search term are displayed

## Cross-Browser Compatibility Test Cases

### TC-COMP-001: Chrome Compatibility
**Description:** Verify that the application works correctly in Chrome
**Preconditions:** User has Chrome browser installed
**Steps:**
1. Open the TrustHunt Enterprise application in Chrome
2. Test authentication and scanning functionality
**Expected Result:** Application functions correctly in Chrome

### TC-COMP-002: Firefox Compatibility
**Description:** Verify that the application works correctly in Firefox
**Preconditions:** User has Firefox browser installed
**Steps:**
1. Open the TrustHunt Enterprise application in Firefox
2. Test authentication and scanning functionality
**Expected Result:** Application functions correctly in Firefox

### TC-COMP-003: Edge Compatibility
**Description:** Verify that the application works correctly in Edge
**Preconditions:** User has Edge browser installed
**Steps:**
1. Open the TrustHunt Enterprise application in Edge
2. Test authentication and scanning functionality
**Expected Result:** Application functions correctly in Edge

## Performance Test Cases

### TC-PERF-001: Multiple Organization Handling
**Description:** Verify that the application can handle multiple Salesforce organizations
**Preconditions:** User has access to multiple Salesforce organizations
**Steps:**
1. Connect to the first Salesforce organization
2. Perform a security scan
3. Connect to a second Salesforce organization
4. Perform another security scan
**Expected Result:** Application correctly manages and displays data for multiple organizations

### TC-PERF-002: Large Organization Scanning
**Description:** Verify that the application can handle scanning large Salesforce organizations
**Preconditions:** User has access to a large Salesforce organization (100+ Apex classes)
**Steps:**
1. Connect to the large Salesforce organization
2. Initiate a security scan
**Expected Result:** Scan completes successfully within a reasonable time frame

## Error Handling Test Cases

### TC-ERR-001: Network Error Recovery
**Description:** Verify that the application recovers gracefully from network errors
**Preconditions:** User is authenticated with Salesforce
**Steps:**
1. Disconnect from the internet
2. Attempt to perform a security scan
3. Reconnect to the internet
4. Retry the security scan
**Expected Result:** Application displays appropriate error messages and recovers when connectivity is restored

### TC-ERR-002: Rate Limit Handling
**Description:** Verify that the application handles API rate limits correctly
**Preconditions:** User is authenticated with Salesforce
**Steps:**
1. Rapidly perform multiple security scans to trigger rate limiting
**Expected Result:** Application displays appropriate rate limit messages and implements backoff strategy

## Accessibility Test Cases

### TC-ACC-001: Keyboard Navigation
**Description:** Verify that the application can be navigated using keyboard only
**Preconditions:** None
**Steps:**
1. Navigate to the TrustHunt Enterprise dashboard
2. Use Tab, Enter, and arrow keys to navigate through the application
**Expected Result:** All functionality is accessible via keyboard

### TC-ACC-002: Screen Reader Compatibility
**Description:** Verify that the application works with screen readers
**Preconditions:** Screen reader software is installed
**Steps:**
1. Enable screen reader
2. Navigate through the TrustHunt Enterprise application
**Expected Result:** Screen reader correctly announces UI elements and content

## Security Test Cases

### TC-SEC-001: Token Storage Security
**Description:** Verify that access tokens are stored securely
**Preconditions:** User has authenticated with Salesforce
**Steps:**
1. Authenticate with Salesforce
2. Inspect browser storage (localStorage, sessionStorage)
**Expected Result:** Tokens are not stored in plain text

### TC-SEC-002: Session Timeout
**Description:** Verify that the application handles session timeouts correctly
**Preconditions:** User has authenticated with Salesforce
**Steps:**
1. Authenticate with Salesforce
2. Wait for the Salesforce session to expire (typically 2 hours)
3. Attempt to perform a security scan
**Expected Result:** Application detects expired session and prompts for re-authentication