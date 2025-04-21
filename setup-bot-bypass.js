/**
 * Bot Detection Bypass Setup Script
 * 
 * This script helps to integrate the bot detection bypass improvements into the framework.
 * Run this script to:
 * 1. Create the necessary bot bypass enhancement utility
 * 2. Configure your existing test files to use the bypass techniques
 * 3. Update your Playwright configuration for better stealth
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Bot Detection Bypass Framework...');

// Create directories if they don't exist
const utilsDir = path.join(__dirname, 'utils');
if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
    console.log('✅ Created utils directory');
}

// Check if botBypassEnhancement.js already exists
const botBypassFile = path.join(utilsDir, 'botBypassEnhancement.js');
if (fs.existsSync(botBypassFile)) {
    console.log('⚠️ botBypassEnhancement.js already exists, backing it up...');
    fs.copyFileSync(botBypassFile, `${botBypassFile}.backup.${Date.now()}`);
}

// Create the botBypassEnhancement.js file
console.log('📝 Creating botBypassEnhancement.js utility...');
fs.writeFileSync(botBypassFile, `/**
 * Advanced bot detection bypass utilities for multi-retailer testing
 * This module provides enhanced capabilities to avoid bot detection
 * across different e-commerce websites.
 */

import path from 'path';
import fs from 'fs';
import { retailerConfig } from '../config/retailers.js';

/**
 * Apply retailer-specific and general bot detection bypass techniques
 * @param {import('@playwright/test').Page} page - Playwright page object 
 * @param {string} retailer - Retailer name
 */
export async function applyBotBypassTechniques(page, retailer) {
    console.log(\`📋 Applying bot bypass techniques for \${retailer}...\`);
    
    // Apply general anti-detection techniques
    await applyGeneralBypass(page);
    
    // Apply retailer-specific bypasses if available
    const retailerBypass = retailerBypassStrategies[retailer];
    if (retailerBypass) {
        console.log(\`📋 Applying \${retailer}-specific bypass techniques...\`);
        await retailerBypass(page);
    } else {
        console.log(\`⚠️ No retailer-specific bypass defined for \${retailer}, using general techniques only\`);
    }
    
    return page;
}

/**
 * Applies general anti-detection techniques that work across most sites
 */
async function applyGeneralBypass(page) {
    // 1. Override JS properties frequently used to detect automation
    await page.addInitScript(() => {
        // Hide automation flags
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Chrome automation
        if (window.navigator.chrome) {
            // CriOS mimics iOS Chrome
            window.navigator.userAgent = window.navigator.userAgent.replace('Chrome', 'CriOS');
        }
        
        // Override permissions
        if (navigator.permissions) {
            navigator.permissions.query = (parameters) => {
                return Promise.resolve({ state: parameters.name === 'notifications' ? 'prompt' : 'granted' });
            };
        }
        
        // Randomize hardware properties
        const randomHardwareConcurrency = Math.floor(Math.random() * 8) + 4; // between 4 and 12
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => randomHardwareConcurrency });
        
        // Random device memory (2, 4, or 8)
        const deviceMemoryValues = [2, 4, 8];
        Object.defineProperty(navigator, 'deviceMemory', { 
            get: () => deviceMemoryValues[Math.floor(Math.random() * deviceMemoryValues.length)] 
        });
        
        // Randomize width/height slightly
        const originalWidth = window.screen.width;
        const originalHeight = window.screen.height;
        Object.defineProperty(window.screen, 'width', {
            get: () => originalWidth + (Math.floor(Math.random() * 10) - 5)
        });
        Object.defineProperty(window.screen, 'height', {
            get: () => originalHeight + (Math.floor(Math.random() * 10) - 5)
        });
        
        // Override language preference
        Object.defineProperty(navigator, 'language', {
            get: () => 'en-US'
        });
        
        // Override plugins to look more like a real browser
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const plugins = [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: 'Native Client Executable' }
                ];
                
                const pluginArray = Array.from({ length: plugins.length });
                plugins.forEach((plugin, i) => {
                    pluginArray[i] = plugin;
                });
                
                // Add necessary properties to make it look like PluginArray
                pluginArray.item = (index) => pluginArray[index];
                pluginArray.namedItem = (name) => pluginArray.find(p => p.name === name);
                pluginArray.refresh = () => {};
                
                return pluginArray;
            }
        });
        
        // Override Chrome automation detection
        delete window.chrome;
        window.chrome = {
            app: {
                isInstalled: false,
                InstallState: {
                    DISABLED: 'disabled',
                    INSTALLED: 'installed',
                    NOT_INSTALLED: 'not_installed'
                }
            },
            runtime: {
                OnInstalledReason: {
                    INSTALL: 'install',
                    UPDATE: 'update',
                    CHROME_UPDATE: 'chrome_update',
                    SHARED_MODULE_UPDATE: 'shared_module_update'
                },
                PlatformArch: {
                    ARM: 'arm',
                    ARM64: 'arm64',
                    MIPS: 'mips',
                    MIPS64: 'mips64',
                    X86_32: 'x86-32',
                    X86_64: 'x86-64'
                },
                PlatformOs: {
                    ANDROID: 'android',
                    CROS: 'cros',
                    LINUX: 'linux',
                    MAC: 'mac',
                    OPENBSD: 'openbsd',
                    WIN: 'win'
                }
            }
        };
        
        // Override document.hidden (used for anti-bot monitoring)
        Object.defineProperty(document, 'hidden', { get: () => false });
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
        
        // Override Webdriver/Selenium detection
        delete window.webdriver;
        
        // Override recaptcha detection
        window.botDetectionTests = false;
        window.___grecaptcha_cfg = undefined;

        // Prevent alert/confirm/prompt dialogs from popping up
        window.alert = function() { return true; };
        window.confirm = function() { return true; };
        window.prompt = function() { return ""; };
    });
    
    // 2. Override headers to look more browser-like
    await page.route('**/*', async (route) => {
        const request = route.request();
        if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
            const headers = request.headers();
            
            // Make headers more browser-like
            headers['sec-ch-ua'] = '"Google Chrome";v="123", " Not;A Brand";v="99", "Chromium";v="123"';
            headers['sec-ch-ua-platform'] = '"Windows"';
            headers['sec-ch-ua-mobile'] = '?0';
            
            // Block bot detection scripts
            const url = request.url();
            if (url.includes('captcha') || url.includes('bot') || 
                url.includes('fingerprint') || url.includes('distil') ||
                url.includes('checkpoint') || url.includes('shield') ||
                url.includes('detect') || url.includes('perimeter') ||
                url.includes('datadome') || url.includes('cloudflare') ||
                url.includes('imperva')) {
                console.log(\`🛡️ Detected potential bot detection script: \${url}\`);
                
                // Route through with modified headers instead of blocking
                route.continue({ headers });
            } else {
                route.continue({ headers });
            }
        } else {
            route.continue();
        }
    });
    
    // 3. Add event listeners for monitoring bot detection
    await page.exposeFunction('reportBotDetection', (detail) => {
        console.log(\`🚨 Potential bot detection triggered: \${JSON.stringify(detail)}\`);
    });
    
    await page.evaluate(() => {
        // Monitor DOM for bot detection signs
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check for text content indicating bot detection
                            const element = node;
                            const text = element.textContent?.toLowerCase() || '';
                            if (text.includes('robot') || text.includes('automated') || 
                                text.includes('bot') || text.includes('captcha') ||
                                text.includes('blocked') || text.includes('suspicious') ||
                                text.includes('unusual activity') || text.includes('security check')) {
                                
                                window.reportBotDetection({
                                    element: element.tagName,
                                    text: text.substring(0, 100),
                                    url: window.location.href
                                });
                            }
                        }
                    }
                }
            }
        });
        
        // Start observing
        observer.observe(document.body, { 
            childList: true,
            subtree: true
        });
        
        // Monitor for console errors related to bot detection
        const originalConsoleError = console.error;
        console.error = function(...args) {
            const errorText = args.join(' ').toLowerCase();
            if (errorText.includes('bot') || errorText.includes('captcha') || 
                errorText.includes('security') || errorText.includes('automation')) {
                window.reportBotDetection({
                    type: 'console.error',
                    text: errorText.substring(0, 100)
                });
            }
            originalConsoleError.apply(console, args);
        };
    });
}

/**
 * Collection of retailer-specific bypass strategies
 */
export const retailerBypassStrategies = {
    amazon: async (page) => {
        await page.addInitScript(() => {
            // Amazon-specific JS property overrides
            Object.defineProperty(window, 'fwcim', { value: undefined });
            Object.defineProperty(window, 'amznJQ', { value: undefined });
            
            // Override Amazon fingerprinting functions (specific to Amazon)
            if (typeof window.ue !== 'undefined') {
                window.ue.tag = function() {};
                window.ue.count = function() {};
            }
        });
    },
    
    bluenile: async (page) => {
        await page.addInitScript(() => {
            // Blue Nile specific overrides
            // Override common analytics libraries
            Object.defineProperty(window, 'ga', { value: function() {} });
            Object.defineProperty(window, '_gaq', { value: [] });
            
            // Create dummy sessionStorage values to look like a returning user
            sessionStorage.setItem('bn_session_id', (Math.random() * 1000000).toString(36).substring(2));
            sessionStorage.setItem('bn_visit_count', (Math.floor(Math.random() * 5) + 2).toString());
            
            // Spoof user behavior history
            localStorage.setItem('bn_viewed_products', JSON.stringify([
                { id: 'ring-123', timestamp: Date.now() - 86400000 },
                { id: 'earring-456', timestamp: Date.now() - 43200000 }
            ]));
        });
        
        // Set cookies that would make it look like a returning user
        await page.context().addCookies([
            {
                name: 'bn_user_preferences',
                value: JSON.stringify({ viewMode: 'grid', sortOrder: 'price-asc' }),
                domain: '.bluenile.com',
                path: '/'
            },
            {
                name: 'bn_visit_id',
                value: (Math.random() * 1000000).toString(36).substring(2),
                domain: '.bluenile.com',
                path: '/'
            }
        ]);
    },
    
    walmart: async (page) => {
        await page.addInitScript(() => {
            // Walmart-specific bypasses
            // Disable Walmart's bot detection
            Object.defineProperty(window, 'WALMART', {
                get: () => {
                    return { 
                        security: { botDetection: { isBot: false } },
                        browserVitals: { isBot: false }
                    };
                }
            });
            
            // Set cookies for cart/user state
            document.cookie = \`cart-id=\${Math.random().toString(36).substring(2)}; path=/;\`;
            
            // Create a browsing history in local storage
            localStorage.setItem('wml_visitor_id', Math.random().toString(36).substring(2));
            localStorage.setItem('wml_visit_count', (Math.floor(Math.random() * 10) + 2).toString());
            
            // Hide any global variables that might be used for detection
            if (window.uxCaptcha) {
                window.uxCaptcha = undefined;
            }
        });
    },
    
    nectar: async (page) => {
        await page.addInitScript(() => {
            // Nectar-specific bypasses
            // Override specific fingerprinting methods that Nectar might use
            
            // Mimic normal browser behavior
            localStorage.setItem('returning_visitor', 'true');
            localStorage.setItem('nectar_visit_count', (Math.floor(Math.random() * 5) + 2).toString());
            localStorage.setItem('nectar_first_visit', new Date(Date.now() - (Math.random() * 30 * 86400000)).toISOString());
            
            // Disable potential fingerprinting libraries
            window.fingerprintjs = undefined;
            
            // Specifically for Nectar Sleep, override the TrustedForm script
            if (typeof window.TrustedForm !== 'undefined') {
                window.TrustedForm = { record: () => {}, identifyFields: () => {} };
            }
            
            // Override referrer for organic traffic appearance
            Object.defineProperty(document, 'referrer', { 
                get: () => 'https://www.google.com/' 
            });
        });
        
        // Modify navigator object to appear as normal web browsing
        await page.addInitScript(() => {
            const originalNavigator = window.navigator;
            const navigatorProxy = new Proxy(originalNavigator, {
                get: (target, prop) => {
                    // Custom handling for specific properties
                    if (prop === 'userAgent') {
                        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
                    }
                    if (prop === 'plugins') {
                        // Provide a realistic plugins array
                        const pluginsArray = [];
                        for (let i = 0; i < 3; i++) {
                            pluginsArray.push({
                                name: ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'][i],
                                filename: ['internal-pdf-viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', 'internal-nacl-plugin'][i]
                            });
                        }
                        return pluginsArray;
                    }
                    return target[prop];
                }
            });
            
            // Replace the navigator object
            window.navigator = navigatorProxy;
        });
    }
};

/**
 * Adds human-like behavior to page interactions
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function addHumanBehavior(page) {
    // Add random mouse movements
    await page.evaluate(() => {
        let lastMove = Date.now();
        
        // Move the mouse occasionally
        const moveInterval = setInterval(() => {
            // Only move mouse every 2-5 seconds
            if (Date.now() - lastMove > (Math.random() * 3000 + 2000)) {
                lastMove = Date.now();
                
                // Calculate random position within viewport
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const randomX = Math.floor(Math.random() * viewportWidth);
                const randomY = Math.floor(Math.random() * viewportHeight);
                
                // Create a synthetic mouse event
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: randomX,
                    clientY: randomY,
                    bubbles: true,
                    cancelable: true
                });
                
                // Dispatch event on document
                document.dispatchEvent(mouseEvent);
            }
        }, 500);
        
        // Clean up interval on page unload
        window.addEventListener('beforeunload', () => {
            clearInterval(moveInterval);
        });
    });
    
    // Make scrolling more human-like
    await page.evaluate(() => {
        // Override scrollTo with smoother version
        const originalScrollTo = window.scrollTo;
        window.scrollTo = function(...args) {
            // Call original function with slight delay
            setTimeout(() => {
                originalScrollTo.apply(window, args);
            }, Math.random() * 100 + 50);
        };
        
        // Add slight random noise to scrolling
        window.addEventListener('scroll', (e) => {
            if (Math.random() < 0.1) { // 10% chance
                // Add a minor random scroll
                setTimeout(() => {
                    window.scrollBy(0, Math.floor(Math.random() * 10) - 5);
                }, Math.random() * 200 + 50);
            }
        });
    });
    
    return page;
}

/**
 * Detect if bot detection has been triggered
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<boolean>} - Whether bot detection was found
 */
export async function detectBotBlocking(page) {
    // Check page content for signs of blocking
    const content = await page.content();
    const lowerContent = content.toLowerCase();
    
    // Common signs of bot detection
    const blockingKeywords = [
        'captcha', 'robot', 'automated', 'suspicious', 
        'unusual activity', 'blocked', 'security check',
        'verify you are human', 'access denied', 'forbidden'
    ];
    
    for (const keyword of blockingKeywords) {
        if (lowerContent.includes(keyword)) {
            console.log(\`🚨 Detected bot blocking keyword: "\${keyword}"\`);
            return true;
        }
    }
    
    // Check for captcha iframes
    const captchaSelectors = [
        'iframe[src*="captcha"]',
        'iframe[src*="recaptcha"]',
        'iframe[src*="arkose"]',
        'iframe[title*="captcha"]',
        'iframe[title*="verification"]'
    ];
    
    for (const selector of captchaSelectors) {
        const captchaExists = await page.$(selector).then(Boolean);
        if (captchaExists) {
            console.log(\`🚨 Detected captcha iframe: "\${selector}"\`);
            return true;
        }
    }
    
    // Check for common bot blocking elements
    const blockingSelectors = [
        '.captcha', '#captcha', '.recaptcha', '#recaptcha',
        '[data-testid="robot-check"]', '.bot-check', '#bot-check',
        '.security-check', '#security-check', '.challenge'
    ];
    
    for (const selector of blockingSelectors) {
        const exists = await page.$(selector).then(Boolean);
        if (exists) {
            console.log(\`🚨 Detected blocking element: "\${selector}"\`);
            return true;
        }
    }
    
    return false;
}

/**
 * Get retailer-specific selectors for key UI elements
 * Used for verification of page integrity
 * @param {string} retailer - Retailer name
 * @returns {Object} - Key selectors for retailer's site
 */
export function getRetailerSelectors(retailer) {
    const selectors = {
        amazon: {
            logo: '#nav-logo',
            search: '#twotabsearchtextbox',
            cart: '#nav-cart',
            menu: '#nav-hamburger-menu'
        },
        bluenile: {
            logo: '.bn-logo',
            search: '[data-cy="searchbar-input"]',
            cart: '[data-cy="minicart-link"]',
            menu: '.main-navigation'
        },
        walmart: {
            logo: '[data-testid="header-walmart-logo"]',
            search: '[data-testid="search-form-input"]',
            cart: '[data-testid="header-cart"]',
            menu: '[data-testid="mobile-header-button"]'
        },
        nectar: {
            logo: '.navbar-brand', 
            search: '.search-field',
            cart: '.cart-link',
            menu: '.navbar-toggler'
        }
    };
    
    return selectors[retailer] || {};
}

/**
 * Verify the integrity of a retailer page
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} retailer - Retailer name
 * @returns {Promise<boolean>} - Whether page is valid
 */
export async function verifyPageIntegrity(page, retailer) {
    console.log(\`🔍 Verifying page integrity for \${retailer}...\`);
    
    // First check if we're blocked
    const isBlocked = await detectBotBlocking(page);
    if (isBlocked) {
        console.log(\`🚨 Bot detection triggered on \${retailer}\`);
        return false;
    }
    
    // Get retailer-specific selectors
    const selectors = getRetailerSelectors(retailer);
    
    // Check for key UI elements (at least 2 should be present)
    let validElements = 0;
    let totalElements = 0;
    
    for (const [name, selector] of Object.entries(selectors)) {
        totalElements++;
        try {
            const exists = await page.$(selector).then(Boolean);
            if (exists) {
                validElements++;
                console.log(\`✅ Found \${name} element for \${retailer}\`);
            } else {
                console.log(\`❌ Could not find \${name} element for \${retailer}\`);
            }
        } catch (error) {
            console.log(\`❌ Error checking \${name} element: \${error.message}\`);
        }
    }
    
    // Page is valid if at least 50% of expected elements are present
    const integrity = totalElements > 0 ? (validElements / totalElements) : 0;
    console.log(\`📊 Page integrity: \${Math.round(integrity * 100)}% (\${validElements}/\${totalElements} elements found)\`);
    
    return integrity >= 0.5;
}`);
console.log('✅ Created botBypassEnhancement.js');

// Add import statement to interactions.spec.js
const testSpecFile = path.join(__dirname, 'tests', 'interactions', 'interactions.spec.js');
if (fs.existsSync(testSpecFile)) {
    console.log('📝 Updating interactions.spec.js...');
    let content = fs.readFileSync(testSpecFile, 'utf8');
    
    // Check if imports already exist
    if (!content.includes('botBypassEnhancement.js')) {
        // Add import statement
        content = content.replace(
            `import initialBrowserSetup from '../../utils/initialBrowserSetup.js';`,
            `import initialBrowserSetup from '../../utils/initialBrowserSetup.js';
// Import bot bypass utilities
import { 
    applyBotBypassTechniques, 
    addHumanBehavior, 
    verifyPageIntegrity, 
    detectBotBlocking 
} from '../../utils/botBypassEnhancement.js';`
        );
        
        // Add bot detection events to executionStats
        content = content.replace(
            /const executionStats = {[^}]+}/s,
            (match) => {
                if (!match.includes('botDetectionEvents')) {
                    return match.replace(
                        /failedSteps: 0,/,
                        'failedSteps: 0,\n        botDetectionEvents: 0,'
                    );
                }
                return match;
            }
        );
        
        // Update the test function to apply bot bypass techniques
        content = content.replace(
            /await initialBrowserSetup\.setupBrowser\(context\);(\s+)const actionHelper = new ActionHelper\(page\);/,
            `await initialBrowserSetup.setupBrowser(context);
            
            // Apply bot bypass techniques specific to retailer
            await applyBotBypassTechniques(page, retailer);
            
            // Add human-like behavior to page interactions
            await addHumanBehavior(page);
            
            const actionHelper = new ActionHelper(page);`
        );
        
        fs.writeFileSync(testSpecFile, content);
        console.log('✅ Updated interactions.spec.js');
    } else {
        console.log('⚠️ botBypassEnhancement.js imports already exist in interactions.spec.js');
    }
} else {
    console.log('⚠️ Could not find interactions.spec.js');
}

// Update package.json to add a bot bypass test script
const packageJsonFile = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonFile)) {
    console.log('📝 Updating package.json...');
    let packageJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'));
    
    // Add new script to run tests with bot bypass
    if (!packageJson.scripts['test:bypass']) {
        packageJson.scripts['test:bypass'] = 'cross-env USE_BOT_BYPASS=true npm run clean && cross-env USE_BOT_BYPASS=true npx playwright test tests/interactions/interactions.spec.js --reporter=allure-playwright,html && npm run allure:generate && npm run allure:open';
        fs.writeFileSync(packageJsonFile, JSON.stringify(packageJson, null, 2));
        console.log('✅ Added test:bypass script to package.json');
    } else {
        console.log('⚠️ test:bypass script already exists in package.json');
    }
} else {
    console.log('⚠️ Could not find package.json');
}

console.log('\n🎉 Bot Detection Bypass Framework setup completed!');
console.log('\nTo use the bot detection bypass features:');
console.log('1. Run tests with: npm run test:bypass');
console.log('2. Or run retailer-specific tests with: cross-env RETAILER=nectar USE_BOT_BYPASS=true npm run test:nectar');
console.log('\nHappy testing without bot detection! 🤖✌️'); 