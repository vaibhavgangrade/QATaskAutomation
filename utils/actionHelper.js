import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';
import { convertToAiCommand } from './excelReader.js';
import { locatorManager } from './locatorManager.js';
import axios from 'axios';
import path from 'path';

//Add these helper functions at the top of the file
function getPageName(url) {
    try {
        return new URL(url).pathname.split('/').filter(Boolean).pop() || 'Homepage';
    } catch {
        return url;
    }
}

function getBusinessValue(value) {
    return value?.replace(/['"]/g, '').trim() || 'N/A';
}

function getFieldName(locator) {
    return locator?.includes('=') ? locator.split('=').pop() : locator;
}


export class ActionHelper {
    constructor(page) {
        this.page = page;
    }

    async handleGoto(page, step) {
        console.log(`Navigating to: ${step.locator}`);
        await page.goto(step.locator, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
    }

    async handleAssert(page, step) {
        return await test.step(`Assert: ${step.value}`, async () => {
            try {
                if (page.isClosed()) return;

                if (step.locator.startsWith('#')) {
                    const [parserName, keyName] = step.locator.substring(1).split(',').map(s => s.trim());
                    const elementLocator = await locatorManager.getLocator(parserName, keyName);
                    
                    if (!elementLocator) {
                        throw new Error(`No locator found for key: ${keyName} in parser: ${parserName}`);
                    }

                    const element = page.locator(elementLocator);
                    await element.waitFor({ state: 'visible', timeout: 30000 });
                    const actualValue = await element.textContent();

                    test.info().attachments.push({
                        name: 'Assertion Details',
                        contentType: 'application/json',
                        body: Buffer.from(JSON.stringify({
                            expected: step.value,
                            actual: actualValue?.trim(),
                            locator: elementLocator
                        }, null, 2))
                    });

                    await expect(actualValue?.trim()).toContain(step.value.trim());
                } else {
                    const element = page.locator(step.locator);
                    await element.waitFor({ state: 'visible', timeout: 30000 });
                    await expect(element).toContainText(step.value, { timeout: 30000 });
                }

                const screenshot = await page.screenshot();
                test.info().attachments.push({
                    name: 'Assertion Success',
                    contentType: 'image/png',
                    body: screenshot
                });
                test.info().annotations.push({
                    type: 'validation',
                    description: `Successfully verified ${getBusinessValue(step.value)}`
                });
            } catch (error) {
                const screenshot = await page.screenshot();
                test.info().attachments.push({
                    name: 'Assertion Failure',
                    contentType: 'image/png',
                    body: screenshot
                });
                throw error;
            }
        });
    }

    async handleFillData(page, step) {
        return await test.step(`Fill data: ${step.value} in ${step.locator}`, async () => {
            try {
                const element = await page.locator(step.locator);
                await element.waitFor({ state: 'visible', timeout: 5000 });
                await element.clear();
                await element.type(step.value, { delay: 50 });

                test.info().attachments.push({
                    name: 'Fill Data Details',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({
                        locator: step.locator,
                        value: step.value,
                        action: 'type'
                    }, null, 2))
                });

                const screenshot = await page.screenshot();
                test.info().attachments.push({
                    name: 'After Fill Data',
                    contentType: 'image/png',
                    body: screenshot
                });
            } catch (error) {
                test.info().attachments.push({
                    name: 'Fill Data Error',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({ error: error.message }, null, 2))
                });
                throw error;
            }
        });
    }

    async handleClick(page, step) {
        console.log(`Clicking element: ${step.locator}`);
        await page.click(`text=${step.locator}`, {
            timeout: 30000
        });
    }

    async handleWaitForText(page, step) {
        console.log(`Waiting for text: ${step.locator}`);
        await page.waitForSelector(`text=${step.locator}`, {
            state: 'visible',
            timeout: 30000
        });
    }

    async handleScroll(page, step) {
        console.log(`Scrolling to: ${step.locator}`);
        const element = await page.waitForSelector(`text=${step.locator}`, {
            timeout: 30000
        });
        await element.scrollIntoViewIfNeeded();
    }

    async handleCheckVisible(page, step) {
        return await test.step(`Check visibility: ${step.locator}`, async () => {
            try {
                const element = await page.locator(`text=${step.locator}`);
                await element.waitFor({ state: 'visible', timeout: 30000 });

                test.info().attachments.push({
                    name: 'Visibility Check',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({
                        locator: step.locator,
                        isVisible: true
                    }, null, 2))
                });

                const screenshot = await page.screenshot();
                test.info().attachments.push({
                    name: 'Element Visible',
                    contentType: 'image/png',
                    body: screenshot
                });
            } catch (error) {
                test.info().attachments.push({
                    name: 'Visibility Error',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({ error: error.message }, null, 2))
                });
                throw error;
            }
        });
    }

    async handleFileUpload(page, step) {
        return await test.step(`Upload file: ${step.value}`, async () => {
            try {
                if (!step.locator || !step.value) {
                    throw new Error('File upload requires both selector and filePath');
                }

                await page.evaluate((selector) => {
                    const input = document.querySelector(selector);
                    if (input) {
                        input.style.opacity = '1';
                        input.style.display = 'block';
                        input.style.visibility = 'visible';
                    }
                }, step.locator);

                const fileInput = await page.locator(step.locator);
                await fileInput.setInputFiles(step.value, { force: true });

                test.info().attachments.push({
                    name: 'Upload Details',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({
                        selector: step.locator,
                        filePath: step.value
                    }, null, 2))
                });

                const screenshot = await page.screenshot();
                test.info().attachments.push({
                    name: 'After Upload',
                    contentType: 'image/png',
                    body: screenshot
                });
            } catch (error) {
                test.info().attachments.push({
                    name: 'Upload Error',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({ error: error.message }, null, 2))
                });
                throw error;
            }
        });
    }

    async handleRequest(step, i) {
        return await test.step(`API Request: ${step.locator}`, async () => {
            try {
                const url = step.locator.startsWith('http') ? step.locator : `https://${step.locator}`;
                const response = await axios({
                    method: step.method || 'POST',
                    url,
                    data: step.value ? JSON.parse(step.value) : undefined,
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000,
                    validateStatus: () => true
                });

                test.info().attachments.push({
                    name: 'API Request Details',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({
                        request: {
                            url,
                            method: step.method || 'POST',
                            data: step.value
                        },
                        response: {
                            status: response.status,
                            statusText: response.statusText,
                            data: response.data
                        }
                    }, null, 2))
                });

                return response;
            } catch (error) {
                test.info().attachments.push({
                    name: 'API Error',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({
                        error: error.message,
                        response: error.response?.data
                    }, null, 2))
                });
                throw error;
            }
        });
    }

    async handleAiCommand(page, step, i, test) {
        return await test.step(`AI Command: ${step.action}`, async () => {
            try {
                const aiCommand = convertToAiCommand(step);
                
                test.info().attachments.push({
                    name: 'AI Command Details',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({
                        command: aiCommand,
                        step: step
                    }, null, 2))
                });

                await ai(aiCommand, { page, test });

                const screenshot = await page.screenshot();
                test.info().attachments.push({
                    name: 'After AI Command',
                    contentType: 'image/png',
                    body: screenshot
                });
            } catch (error) {
                test.info().attachments.push({
                    name: 'AI Command Error',
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({ error: error.message }, null, 2))
                });
                throw error;
            }
        });
    }
}