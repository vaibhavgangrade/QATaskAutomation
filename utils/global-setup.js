const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function globalSetup() {
  // Create necessary directories
  const dirs = ['test-results', 'test-results/screenshots', 'test-results/videos', 'allure-results'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Clean up old results
  if (fs.existsSync('allure-report')) {
    fs.rmSync('allure-report', { recursive: true, force: true });
  }

  console.log('Global setup completed');
}

module.exports = globalSetup;