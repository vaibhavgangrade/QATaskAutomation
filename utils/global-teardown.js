const { execSync } = require('child_process');

async function globalTeardown() {
  try {
    // Generate Allure report
    console.log('Generating Allure report...');
    execSync('npx allure generate allure-results -o allure-report --clean');
    
    // Open Allure report (not in CI)
    if (!process.env.CI) {
      console.log('Opening Allure report...');
      execSync('npx allure open allure-report');
    }
  } catch (error) {
    console.error('Error in global teardown:', error);
  }
}

module.exports = globalTeardown;