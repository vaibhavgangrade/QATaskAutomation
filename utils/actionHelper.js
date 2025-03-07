import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { ai } from '@zerostep/playwright';
import { expect } from '@playwright/test';
import { getValueFromJson, convertToAiCommand } from './excelReader.js';

export class ActionHelper {
    constructor() {
        this.networkLogs = [];
    }

    async waitForPageLoadComplete(page, timeout = 30000) {
        try {
            await Promise.race([
                Promise.all([
                    // Wait for DOM content
                    page.waitForLoadState('domcontentloaded', { timeout }),
                   
                    // Check page readiness
                    page.waitForFunction(() => {
                        return new Promise((resolve) => {
                            if (document.readyState === 'complete' && 
                                !document.querySelector('.loading') && 
                                !document.querySelector('.spinner') && 
                                !document.querySelector('[class*="loader"]')) {
                                resolve(true);
                            }
                            
                            // Add MutationObserver to detect when loading elements disappear
                            const observer = new MutationObserver((mutations) => {
                                if (document.readyState === 'complete' && 
                                    !document.querySelector('.loading') && 
                                    !document.querySelector('.spinner') && 
                                    !document.querySelector('[class*="loader"]')) {
                                    observer.disconnect();
                                    resolve(true);
                                }
                            });

                            observer.observe(document.body, {
                                childList: true,
                                subtree: true,
                                attributes: true
                            });

                            // Fallback timeout
                            setTimeout(() => {
                                observer.disconnect();
                                resolve(true);
                            }, 10000);
                        });
                    }, { timeout })
                ]),
                
                // Global timeout
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Page load timeout')), timeout);
                })
            ]);

            console.log('✅ Page load complete');
            return true;
        } catch (error) {
            console.warn('⚠️ Page load check warning:', error.message);
            return false;
        }
    }

    async takeErrorScreenshot(page, functionName, error) {
        try {
            if (!page?.screenshot) {
                throw new Error('Invalid page object provided');
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
            const screenshotPath = path.join(screenshotsDir, `${functionName}_error_${timestamp}.png`);

            fs.mkdirSync(screenshotsDir, { recursive: true });
            const buffer = await page.screenshot({ fullPage: true });

            // Save to file
            fs.writeFileSync(screenshotPath, buffer);

            // Attach to test report if test object is available
            if (page.test) {
                await page.test.info().attach(`${functionName}_error`, {
                    body: buffer,
                    contentType: 'image/png'
                });
            }

            console.error('Error:', error.message);
            return screenshotPath;
        } catch (screenshotError) {
            console.error('Screenshot failed:', screenshotError.message);
        }
    }

    async handleGoto(page, step) {
        try {

            await page.setDefaultNavigationTimeout(60000);

            const response = await page.goto(step.locator, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            if (!response?.ok()) {
                throw new Error(`Navigation failed: ${response?.status() || 'no response'}`);
            }

            // Add page load check
            await this.waitForPageLoadComplete(page);

            return true;
        } catch (error) {
            await this.takeErrorScreenshot(page, 'handleGoto', error);
            throw error;
        }
    }

    async handleAssert(page, step) {
        try {
            const element = await page.locator(step.locator);
            await element.waitFor({ state: 'visible', timeout: 30000 });
    
            // Get the actual text content
            const actualText = await element.textContent();
            console.log('Actual text:', actualText);
            console.log('Expected text:', step.value);
    
            // Use toContainText for partial matching
            await expect(element).toContainText(step.value, {
                timeout: 30000,
                ignoreCase: true
            });
    
            // Take success screenshot
            const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir, { recursive: true });
            }
    
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotPath = path.join(screenshotsDir, `assert-success-${timestamp}.png`);
            const screenshot = await page.screenshot({ 
                path: screenshotPath,
                fullPage: true 
            });
    
            // Success message
            await page.test.info().annotations.push({
                type: 'success',
                description: `✅ Successfully found text: "${step.value}"`
            });
    
            console.log('✅ Assertion passed');
    
        } catch (error) {
            // Take error screenshot first
            const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir, { recursive: true });
            }
    
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotPath = path.join(screenshotsDir, `assert-error-${timestamp}.png`);
            await page.screenshot({ 
                path: screenshotPath,
                fullPage: true 
            });
    
            // Simplified error message
            await page.test.info().annotations.push({
                type: 'error',
                description: `❌ Failed to find text: "${step.value}"`
            });
    
            console.error(`❌ Failed to find text: "${step.value}"`);
            
            // Throw a simplified error
            throw new Error(`Failed to find text: "${step.value}"`);
        }
    }

    async saveLogs() {
        try {
            const logsDir = path.join(process.cwd(), 'test-results');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }

            const logPath = path.join(logsDir, 'network-logs.json');
            fs.writeFileSync(
                logPath,
                JSON.stringify({ networkLogs: this.networkLogs }, null, 2)
            );
            console.log(`Logs saved to: ${logPath}`);
        } catch (error) {
            console.error('Error saving logs:', error);
        }
    }

    // Move handleResponse inside the class
    async handleResponse(page, test, step, path_dir, file_path) {
        const filePath = path.join(process.cwd(), path_dir, file_path);
        const token = getValueFromJson(filePath, 'networkLogs.0.response.data.token');
        console.log('Token:', token);
        const status = getValueFromJson(filePath, 'networkLogs.0.response.status');
        console.log('Status:', status);
        const url = getValueFromJson(filePath, 'networkLogs.0.request.url');
        console.log('URL:', url);
        await ai(`Enter the '${token}' into '${step.locator}'`, { page, test });
    }

    async handleScrollTo(page, step) {
        try {
            const element = await page.locator(`text=${step.locator}`).first();
            await element.waitFor({ state: 'visible', timeout: 5000 });
            
            // Use evaluate for more control over scroll behavior
            await page.evaluate(async (el) => {
                el.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',    // Vertical alignment
                    inline: 'center'     // Horizontal alignment
                });
            }, await element.elementHandle());
    
            await page.waitForTimeout(1000); // Wait for scroll to complete
        } catch (error) {
            console.warn(`Initial scroll attempt failed: ${error.message}`);
            await page.waitForTimeout(1000);
            try {
                await this.retryScrollTo(page, step);
            } catch (retryError) {
                await this.takeErrorScreenshot(page, 'handleScrollTo', retryError);
                throw retryError;
            }
        }
    }

    async handleOAuthClick(page, step) {
        const authLogs = [];
        const logsDir = 'test-results/auth-logs';
        
        try {
            // Create logs directory if it doesn't exist
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
    
            // Set up request interception
            await page.route('**/*', async route => {
                const request = route.request();
                const url = request.url();
                
                if (url.includes('oauth') || url.includes('auth') || url.includes('token') || url.includes('login')) {
                    const timestamp = new Date().toISOString();
                    const logEntry = {
                        timestamp,
                        type: 'request',
                        url,
                        method: request.method(),
                        headers: request.headers(),
                        postData: request.postData()
                    };
                    
                    authLogs.push(logEntry);
                    console.log('Auth Request:', logEntry);
    
                    // Capture response
                    const response = await route.fetch();
                    try {
                        const responseBody = await response.text();
                        const responseLogEntry = {
                            timestamp,
                            type: 'response',
                            url,
                            status: response.status(),
                            headers: response.headers(),
                            body: responseBody
                        };
                        authLogs.push(responseLogEntry);
                        console.log('Auth Response:', responseLogEntry);
                    } catch (e) {
                        console.warn('Could not capture response body:', e.message);
                    }
                }
                await route.continue();
            });
    
            // Click the OAuth button
            const element = await page.locator(step.locator).first();
            await element.waitFor({ state: 'visible', timeout: 5000 });
    
            // Click and wait for navigation
            await Promise.all([
                page.waitForNavigation({ timeout: 30000 }).catch(() => {}),
                element.click({ timeout: 5000 })
            ]);
    
            // Wait for potential redirects
            await page.waitForTimeout(3000);
    
            // Capture final page state
            const finalState = await page.evaluate(() => ({
                url: window.location.href,
                localStorage: Object.keys(localStorage).reduce((acc, key) => {
                    acc[key] = localStorage.getItem(key);
                    return acc;
                }, {}),
                sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
                    acc[key] = sessionStorage.getItem(key);
                    return acc;
                }, {}),
                cookies: document.cookie
            }));
    
            // Add final state to logs
            authLogs.push({
                timestamp: new Date().toISOString(),
                type: 'final_state',
                ...finalState
            });
    
            // Save logs to file
            const logFileName = 'auth-log-new.json';
            const myfilepath = path.join(process.cwd(), logsDir, logFileName);
            
            fs.writeFileSync(myfilepath, JSON.stringify(authLogs, null, 2));
            console.log(`Auth logs saved to: ${logFileName}`);
    
            await page.waitForTimeout(1000);
    
            // Read the saved file and parse it
            const nfilepath = path.join(process.cwd(), logsDir, logFileName);
            const jsonData = fs.readFileSync(nfilepath, 'utf8');
            const parsedLogs = JSON.parse(jsonData);
    
            // Find the final_state entry
            const finalStateEntry = parsedLogs.find(entry => entry.type === "final_state");
            
            if (!finalStateEntry || !finalStateEntry.localStorage) {
                throw new Error('No localStorage data found in logs');
            }
    
            // Extract values directly from localStorage
            const client_id = finalStateEntry.localStorage.client_id;
            const signInName = finalStateEntry.localStorage.signInName;
            const redirect_uri = finalStateEntry.localStorage.RedirectUri;
    
            console.log('Extracted values:', {
                client_id,
                signInName,
                redirect_uri
            });

            console.log("url:",url);
    
            
            // Validate values
            if (!client_id || !signInName || !redirect_uri) {
                console.error('Missing required parameters:', {
                    client_id: !!client_id,
                    signInName: !!signInName,
                    redirect_uri: !!redirect_uri
                });
                throw new Error('Missing required OAuth parameters');
            }
    
            // Construct URL properly
            const url = new URL(redirect_uri);
            url.searchParams.append('client_id', client_id);
            url.searchParams.append('signInName', signInName);
            
            console.log('Navigating to:', url.toString());
    
            await page.goto(url.toString(), {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
    
            await page.waitForTimeout(2000);
            return true;
    
        } catch (error) {
            console.error('OAuth click error:', error.message);
            
            // Save error logs
            const errorLogEntry = {
                timestamp: new Date().toISOString(),
                type: 'error',
                message: error.message,
                stack: error.stack
            };
            authLogs.push(errorLogEntry);
            
            const errorLogFileName = `auth-error-log-new.json`;
            fs.writeFileSync(
                path.join(process.cwd(), logsDir, errorLogFileName),
                JSON.stringify(authLogs, null, 2)
            );
    
            await this.takeErrorScreenshot(page, 'handleOAuthClick', error);
            throw error;
        }
    }

    async handleClickTo(page, step) {
        try {
            const element = await page.locator(`text=${step.locator}`).first();
            await element.waitFor({ state: 'visible', timeout: 5000 });
    
            // Add small random delay before click
            await page.waitForTimeout(Math.random() * 500 + 200);
    
            // Click with multiple wait strategies
            await Promise.all([
                // Wait for URL change
                page.waitForURL('**/*', { timeout: 30000 })
                    .catch(e => console.warn('URL change timeout:', e.message)),
                
                // Wait for DOM content
                page.waitForLoadState('domcontentloaded', { timeout: 30000 })
                    .catch(e => console.warn('Load state timeout:', e.message)),
                
                // Wait for new elements that typically appear after navigation
                page.waitForSelector('body', { timeout: 30000 })
                    .catch(e => console.warn('Body selector timeout:', e.message)),
    
                // Perform the click
                element.click({ timeout: 5000 })
            ]);

    
            // Additional stability checks
            await Promise.race([
                page.waitForLoadState('load', { timeout: 10000 }),
                this.waitForPageLoadComplete(page)
            ]);
    
        } catch (error) {
            console.warn(`Click attempt failed: ${error.message}`);
            try {
                await this.retryClickTo(page, step);
            } catch (retryError) {
                await this.takeErrorScreenshot(page, 'handleClickTo', retryError);
                throw retryError;
            }
        }
    }

    async handleFillData(page, step) {
    try {
        const element = await page.locator(step.locator);
        await element.waitFor({ state: 'visible', timeout: 5000 });

        // Clear existing value first
        await element.clear();

        // Type the value character by character with random delays
        for (const char of step.value) {
            await element.type(char, { delay: Math.random() * 100 + 50 }); // Random delay between 50-150ms
        }

        await this.waitForPageLoad(page);
    } catch (error) {
        console.warn(`Initial fill attempt failed: ${error.message}`);
        try {
            await this.retryFillData(page, step);
        } catch (retryError) {
            await this.takeErrorScreenshot(page, 'handleFillData', retryError);
            throw retryError;
        }
    }
}

    async handlePressKey(page, step) {
    try {
        const element = await page.locator(step.locator);
        await element.waitFor({ state: 'visible', timeout: 5000 });
        await element.press(step.value);
        await this.waitForPageLoadComplete(page)
    } catch (error) {
        console.warn(`Initial key press attempt failed: ${error.message}`);
        try {
            await this.retryPressKey(page, step);
        } catch (retryError) {
            await this.takeErrorScreenshot(page, 'handlePressKey', retryError);
            throw retryError;
        }
    }
}

    async handleClickLoc(page, step) {
    try {
        // Try to find element by role first (button, link, etc.)
        const element = await page.locator(step.locator);
        await element.waitFor({ state: 'visible', timeout: 5000 });

        // Enhanced click with multiple navigation event listeners
        await Promise.all([
            // page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => { }),
            element.click({ timeout: 5000, force: true })
        ]);
        await this.waitForPageLoadComplete(page)
        // Additional wait to ensure page stability
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => { });
        await page.waitForTimeout(1000);

    } catch (error) {
        await this.takeErrorScreenshot(page, 'handleClickLoc', error);
        throw error;
    }
}

    async handleCheckVisible(page, step) {
    try {
        const element = await page.locator(`text=${step.locator}`);
        await element.waitFor({ state: 'visible', timeout: 30000 });
    } catch (error) {
        console.warn(`Initial visibility check failed: ${error.message}`);
        try {
            await this.retryCheckVisible(page, step);
        } catch (retryError) {
            await this.takeErrorScreenshot(page, 'handleCheckVisible', retryError);
            throw retryError;
        }
    }
}

async handleAiCommand(page, step, i, test) {
    try {
        // Wait for page to be ready
        await Promise.race([
            Promise.all([
                // Basic page load check
                page.waitForLoadState('domcontentloaded', { timeout: 30000 }),
                            
                // Wait for page to be stable - simplified check
                page.waitForFunction(() => {
                    return document.readyState === 'complete';
                }, { timeout: 30000 })
            ]),
            
            // Fallback timeout
            page.waitForTimeout(30000)
        ]);

        // Short delay for any dynamic content
        await page.waitForTimeout(1000);

        // Execute AI command
        const aiCommand = convertToAiCommand(step);
        console.log(`Executing AI command: ${step.locator}`);
        await ai(aiCommand, { page, test });
        console.log('AI command executed successfully');

    } catch (error) {
        const screenshotPath = await this.takeErrorScreenshot(page, 'handleAiCommand', error);
        throw error;
    }
}

async handleFileUpload(page, step) {
    try {
        if (!step.locator || !step.value) {
            throw new Error('File upload requires both selector and filePath');
        }

        // First try to make the input visible if it's hidden
        await page.evaluate((selector) => {
            const input = document.querySelector(selector);
            if (input) {
                input.style.opacity = '1';
                input.style.display = 'block';
                input.style.visibility = 'visible';
            }
        }, step.locator);

        // Wait for input with reduced visibility requirement
        const fileInput = await page.locator(step.locator);
        
        // Set file even if element is hidden
        await fileInput.setInputFiles(step.value, { force: true });

        // Optional: Reset visibility
        await page.evaluate((selector) => {
            const input = document.querySelector(selector);
            if (input) {
                input.style.opacity = '';
                input.style.display = '';
                input.style.visibility = '';
            }
        }, step.locator);

        await page.waitForTimeout(2000); // Wait for upload

        return true;
    } catch (error) {
        console.error('File upload error:', error.message);
        await this.takeErrorScreenshot(page, 'handleFileUpload', error);
        throw error;
    }
}

    // Retry methods with screenshot functionality
    async retryScrollTo(page, step, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const element = await page.locator(`text=${step.locator}`).first();
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.scrollIntoViewIfNeeded();
            return;
        } catch (error) {
            if (i === maxRetries - 1) {
                await this.takeErrorScreenshot(page, 'retryScrollTo', error);
                throw error;
            }
            await page.waitForTimeout(1000 * Math.pow(2, i));
        }
    }
}

    async retryClickTo(page, step, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const element = await page.locator(`text=${step.locator}`).first();
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.click();
            await this.waitForPageLoad(page);
            return;
        } catch (error) {
            if (i === maxRetries - 1) {
                await this.takeErrorScreenshot(page, 'retryClickTo', error);
                throw error;
            }
            await page.waitForTimeout(1000 * Math.pow(2, i));
        }
    }
}

    async retryFillData(page, step, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const element = await page.locator(step.locator);
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.fill(step.value);
            await this.waitForPageLoad(page);
            return;
        } catch (error) {
            if (i === maxRetries - 1) {
                await this.takeErrorScreenshot(page, 'retryFillData', error);
                throw error;
            }
            await page.waitForTimeout(1000 * Math.pow(2, i));
        }
    }
}

    async retryPressKey(page, step, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const element = await page.locator(step.locator);
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.press(step.value);
            await this.waitForPageLoad(page);
            return;
        } catch (error) {
            if (i === maxRetries - 1) {
                await this.takeErrorScreenshot(page, 'retryPressKey', error);
                throw error;
            }
            await page.waitForTimeout(1000 * Math.pow(2, i));
        }
    }
}

    async retryClickLoc(page, step, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const element = await page.locator(step.locator);
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.click();
            await this.waitForPageLoad(page);
            return;
        } catch (error) {
            if (i === maxRetries - 1) {
                await this.takeErrorScreenshot(page, 'retryClickLoc', error);
                throw error;
            }
            await page.waitForTimeout(1000 * Math.pow(2, i));
        }
    }
}

    async retryCheckVisible(page, step, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const element = await page.locator(`text=${step.locator}`);
            await element.waitFor({ state: 'visible', timeout: 30000 });
            return;
        } catch (error) {
            if (i === maxRetries - 1) {
                await this.takeErrorScreenshot(page, 'retryCheckVisible', error);
                throw error;
            }
            await page.waitForTimeout(1000 * Math.pow(2, i));
        }
    }
}

    // Helper methods
    async waitForPageLoad(page) {
    await Promise.race([
        page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => { }),
        page.waitForTimeout(2000)
    ]);
}

logNetworkRequest(logEntry) {
    this.networkLogs.push(logEntry);
    this.saveNetworkLogs();
}

saveNetworkLogs() {
    const logsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(logsDir, 'last-run.json'),
        JSON.stringify({ networkLogs: this.networkLogs }, null, 2)
    );
}

handleRequestError(error, step, stepIndex) {
    console.error('API Request failed:', {
        url: step.locator,
        method: step.method || 'POST',
        error: error.message,
        response: error.response?.data
    });

    this.logNetworkRequest({
        timestamp: new Date().toISOString(),
        step: stepIndex + 1,
        request: {
            url: step.locator,
            method: step.method || 'POST',
            headers: step.headers,
            body: step.value
        },
        error: {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        }
    });
}
}