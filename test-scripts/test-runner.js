/**
 * Test Runner for TrustHunt Enterprise
 * 
 * This script runs all the test cases and generates a summary report.
 */

// Import test modules
const authTests = require('./auth-tests');
const scanTests = require('./scan-tests');
const vulnTests = require('./vulnerability-tests');

// Test configuration
const config = {
  runAll: true,
  categories: {
    authentication: true,
    scanning: true,
    vulnerability: true
  },
  generateReport: true,
  reportFormat: 'console' // 'console', 'json', or 'html'
};

// Run all tests
async function runAllTests() {
  console.log('======================================');
  console.log('TrustHunt Enterprise - Test Execution');
  console.log('======================================');
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.log('--------------------------------------');
  
  const startTime = Date.now();
  
  // Run tests based on configuration
  const results = {};
  
  if (config.runAll || config.categories.authentication) {
    results.authentication = await authTests.runAuthenticationTests();
  }
  
  if (config.runAll || config.categories.scanning) {
    results.scanning = await scanTests.runSecurityScanningTests();
  }
  
  if (config.runAll || config.categories.vulnerability) {
    results.vulnerability = await vulnTests.runVulnerabilityTests();
  }
  
  const endTime = Date.now();
  const executionTime = (endTime - startTime) / 1000;
  
  // Generate summary
  console.log('\n======================================');
  console.log('Test Execution Summary');
  console.log('======================================');
  
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const category in results) {
    let categoryPassed = 0;
    let categoryFailed = 0;
    
    for (const testId in results[category]) {
      if (results[category][testId]) {
        categoryPassed++;
        totalPassed++;
      } else {
        categoryFailed++;
        totalFailed++;
      }
    }
    
    totalTests += Object.keys(results[category]).length;
    
    console.log(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${categoryPassed} passed, ${categoryFailed} failed`);
  }
  
  console.log('--------------------------------------');
  console.log(`Total: ${totalTests} tests, ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`Pass Rate: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
  console.log(`Execution Time: ${executionTime.toFixed(2)} seconds`);
  console.log('======================================');
  
  // Generate report if configured
  if (config.generateReport) {
    generateReport(results, {
      totalTests,
      totalPassed,
      totalFailed,
      executionTime
    });
  }
  
  return {
    results,
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      executionTime
    }
  };
}

// Generate test report
function generateReport(results, summary) {
  if (config.reportFormat === 'console') {
    // Console report already generated above
    return;
  }
  
  if (config.reportFormat === 'json') {
    const jsonReport = JSON.stringify({
      timestamp: new Date().toISOString(),
      summary,
      results
    }, null, 2);
    
    console.log('\nJSON Report:');
    console.log(jsonReport);
    
    // In a real implementation, this would write to a file
    // fs.writeFileSync('test-report.json', jsonReport);
  }
  
  if (config.reportFormat === 'html') {
    // In a real implementation, this would generate an HTML report
    console.log('\nHTML report generation would be implemented here');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});