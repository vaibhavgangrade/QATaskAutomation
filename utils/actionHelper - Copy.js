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
            await page.goto(step.locator, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
        } catch (error) {
            await this.takeErrorScreenshot(page, 'handleGoto', error);
            throw error;
        }
    }

    async handleAssert(page, step) {
        try {
            const element = await page.locator(step.locator);
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await expect(element).toHaveText(step.value);
        } catch (error) {
            await this.takeErrorScreenshot(page, 'handleAssert', error);
            throw error;
        }
    }

    async handleRequest(step, stepIndex) {
        try {
            // ... existing request code ...
            return response;
        } catch (error) {
            this.handleRequestError(error, step, stepIndex);
            throw error;
        }
    }

    async handleResponse(page, step, test) {
        try {
            const filePath = path.join(process.cwd(), 'test-results', 'last-run.json');
            const token = getValueFromJson(filePath, 'networkLogs.0.response.data.token');
            await ai(`Enter the '${token}' into '${step.locator}'`, { page, test });
        } catch (error) {
            await this.takeErrorScreenshot(page, 'handleResponse', error);
            throw error;
        }
    }

    async handleScrollTo(page, step) {
        try {
            const element = await page.locator(`text=${step.locator}`).first();
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.scrollIntoViewIfNeeded();
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

    async handleClickTo(page, step) {
        try {
            const element = await page.locator(`text=${step.locator}`).first();
            await element.waitFor({ state: 'visible', timeout: 5000 });
            await element.click();
            await this.waitForPageLoad(page);
        } catch (error) {
            console.warn(`Initial click attempt failed: ${error.message}`);
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
            await this.waitForPageLoad(page);
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
            const element = await page.getByRole(step.locator, { name: step.value });
            await element.waitFor({ state: 'visible', timeout: 5000 });
            
            // Enhanced click with multiple navigation event listeners
            await Promise.all([
                // page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
                element.click({ timeout: 5000, force: true })
            ]);
            
            // Additional wait to ensure page stability
            await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
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
            await Promise.all([
                page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch((e) => {
                    console.warn('waitForLoadState warning:', e.message);
                }),
                this.waitForPageLoad(page)
            ]);
            const aiCommand = convertToAiCommand(step);
            await page.waitForTimeout(1000);
            console.log(`Executing AI command: ${step.locator}`);
            await ai(aiCommand, { page, test });
            console.log('AI command executed successfully');
        } catch (error) {
            // Take screenshot first
            const screenshotPath = await this.takeErrorScreenshot(page, 'handleAiCommand', error);
            
            // // Create detailed error message
            // const errorMessage = {
            //     step: `Step ${i + 1}`,
            //     command: step.locator,
            //     error: error.message || 'Unknown error',
            //     stack: error.stack || 'No stack trace',
            //     screenshot: screenshotPath
            // };
            
            // console.error('AI Command failed:', errorMessage);
            
            // // Create enhanced error with full details
            // const enhancedError = new Error(`Step ${i + 1} failed: AI command could not be executed. Error: ${error.message || 'Unknown error'}`);
            // enhancedError.originalError = error;
            // enhancedError.details = errorMessage;
            throw error;
        }
    
        await page.waitForTimeout(2000);
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