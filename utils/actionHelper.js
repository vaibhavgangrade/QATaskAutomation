import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';
import { convertToAiCommand } from './excelReader.js';
import { locatorManager } from './locatorManager.js';
import axios from 'axios';
import { handleElementAction, getCommonLocators, getSuffix } from './baseFunctions.js';
import path from 'path';    

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

    async handleGoto(page, step, test) {
        return await test.step(`Navigate to: ${step.locator}`, async () => {
            try {
                test.info().annotations.push({
                    type: 'Navigation',
                    description: `🌐 Navigating to: ${step.locator}`
                });

                await page.goto(step.locator, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });

                // Capture page load state
                const screenshot = await page.screenshot();
                await test.info().attach('page-loaded', {
                    body: screenshot,
                    contentType: 'image/png'
                });

                test.info().annotations.push({
                    type: 'Navigation Success',
                    description: `✅ Successfully navigated to: ${step.locator}`
                });
            } catch (error) {
                test.info().annotations.push({
                    type: 'Navigation Failed',
                    description: `❌ Navigation failed: ${error.message}`
                });
                throw error;
            }
        });
    }

    async handleAssert(page, step, test) {
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

                    // Log assertion details
                    await test.info().attach('assertion-details', {
                        contentType: 'application/json',
                        body: Buffer.from(JSON.stringify({
                            expected: step.value,
                            actual: actualValue?.trim(),
                            locator: elementLocator,
                            timestamp: new Date().toISOString()
                        }, null, 2))
                    });

                    await expect(actualValue?.trim()).toContain(step.value.trim());
                } else {
                    const element = page.locator(step.locator);
                    await element.waitFor({ state: 'visible', timeout: 30000 });
                    await expect(element).toContainText(step.value, { timeout: 30000 });
                }

                // Capture success state
                const screenshot = await page.screenshot();
                await test.info().attach('assertion-success', {
                    body: screenshot,
                    contentType: 'image/png'
                });

                test.info().annotations.push({
                    type: 'Assertion Success',
                    description: `✅ Successfully assert value of '+${element}+ with value given : "${step.value}"`
                });

            } catch (error) {
                // Capture failure state
                const screenshot = await page.screenshot();
                await test.info().attach('assertion-failure', {
                    body: screenshot,
                    contentType: 'image/png'
                });

                test.info().annotations.push({
                    type: 'Assertion Failed',
                    description: `❌ Assertion failed: ${error.message}`
                });

                throw error;
            }
        });
    }

    async handleInputData(page, step, test) {
        return await test.step(`Input: "${step.value}" into "${step.locator}"`, async () => {
            try {
                test.info().annotations.push({
                    type: 'Input Start',
                    description: `⌨️ Attempting to input: "${step.value}"`
                });

                const element = await handleElementAction(page, step, 'fill', test);
                
                if (element) {
                    await element.scrollIntoViewIfNeeded();
                    
                    // Capture before state
                    await test.info().attach('before-input', {
                        body: await page.screenshot(),
                        contentType: 'image/png'
                    });

                    try {
                        await element.fill(step.value);
                    } catch {
                        // await element.click({ force: true });
                        await element.clear();
                        await element.type(step.value, { delay: 50 });
                    }

                    // Verify input
                    const inputValue = await element.inputValue();
                    if (inputValue !== step.value) {
                        throw new Error('Input verification failed');
                    }

                    // Capture success state
                    await test.info().attach('after-input', {
                        body: await page.screenshot(),
                        contentType: 'image/png'
                    });

                    test.info().annotations.push({
                        type: 'Input Success',
                        description: `✅ Successfully input using PlayWright: "${step.value}"`
                    });
                    return;
                }
                throw new Error('Element not found');

            } catch (error) {
                test.info().annotations.push({
                    type: 'Input Failed',
                    description: `❌ Input failed: using PlayWright ${step.locatorType} - ${step.locator}`
                });

                // Try Zerostep fallback
                try {
                    test.info().annotations.push({
                        type: 'Fallback',
                        description: '🤖 Attempting Zerostep fallback'
                    });

                    await this.handleAiCommand(page, { ...step, action: 'type' }, test);

                    test.info().annotations.push({
                        type: 'Fallback Success',
                        description: '✅ Zerostep fallback succeeded'
                    });
                } catch (fallbackError) {
                    test.info().annotations.push({
                        type: 'Fallback Failed',
                        description: `❌ Zerostep fallback failed: ${fallbackError.message}`
                    });
                    throw fallbackError;
                }
            }
        });
    }

    async handleTextBasedClick(page, step, test) {
        return await test.step(`Click: "${step.locator}"`, async () => {
            try {
                test.info().annotations.push({
                    type: 'Click Start',
                    description: `🖱️ Attempting to click: "${step.locator}"`
                });
    
                const element = await handleElementAction(page, step, 'click', test);
                
                if (element) {
                    // Capture before state
                    await test.info().attach('before-click', {
                        body: await page.screenshot(),
                        contentType: 'image/png'
                    });
    
                    try {
                        // Scroll and wait for stability
                        await element.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(1000);
    
                        // Verify visibility after scroll
                        const isVisible = await element.isVisible();
                        if (!isVisible) {
                            throw new Error(`Element "${step.locator}" is not visible after scroll`);
                        }
    
                        // Try click with different strategies
                        try {
                            // First attempt: Normal click
                            await element.click({ timeout: 5000 });
                        } catch (normalClickError) {
                            // Second attempt: Force click
                            try {
                                await element.click({ force: true, timeout: 5000 });
                            } catch (forceClickError) {
                                // Final attempt: Focus and Enter
                                await element.focus();
                                await page.waitForTimeout(100);
                                await element.click({ timeout: 5000 });
                            }
                        }
    
                        // Capture after state
                        await page.waitForTimeout(500);
                        await test.info().attach('after-click', {
                            body: await page.screenshot(),
                            contentType: 'image/png'
                        });
    
                        test.info().annotations.push({
                            type: 'Click Success',
                            description: `✅ Successfully clicked using PlayWright: "${step.locator}"`
                        });
                        return;
                    } catch (clickError) {
                        test.info().annotations.push({
                            type: 'Click Failed',
                            description: `⚠️ Click attempt failed: ${clickError.message} using PlayWright`
                        });
                        throw clickError;
                    }
                }
                throw new Error('Element not found');
    
            } catch (error) {
                // Try Zerostep fallback
                test.info().annotations.push({
                    type: 'Fallback',
                    description: `⚠️ Falling back to Zerostep for click: "${step.locator}"`
                });
    
                try {
                    await this.handleAiCommand(page, { ...step, action: 'click' }, test);
                    
                    test.info().annotations.push({
                        type: 'Fallback Success',
                        description: '✅ Zerostep click succeeded'
                    });
                } catch (fallbackError) {
                    test.info().annotations.push({
                        type: 'Fallback Failed',
                        description: `❌ Zerostep click failed: ${fallbackError.message}`
                    });
                    throw fallbackError;
                }
            }
        });
    }

    async handleCheckVisible(page, step, test) {
        return await test.step(`Check visibility: "${step.locator}"`, async () => {
            try {
                test.info().annotations.push({
                    type: 'Visibility Check',
                    description: `👁️ Checking visibility of: "${step.locator}"`
                });

                const element = await handleElementAction(page, step, 'check', test);
                
                if (element) {
                    await element.waitFor({ state: 'visible', timeout: 30000 });
                    
                    // Capture element state
                    const elementHandle = await element.elementHandle();
                    if (elementHandle) {
                        await test.info().attach('element-visible', {
                            body: await elementHandle.screenshot(),
                            contentType: 'image/png'
                        });
                    }

                    test.info().annotations.push({
                        type: 'Visibility Success',
                        description: `✅ Element "${step.locator}" is visible`
                    });
                    
                    return true;
                }
                throw new Error(`Element not found: ${step.locator}`);

            } catch (error) {
                test.info().annotations.push({
                    type: 'Visibility Failed',
                    description: `❌ Visibility check failed: ${error.message}`
                });

                // Try Zerostep fallback
                try {
                    test.info().annotations.push({
                        type: 'Fallback',
                        description: '🤖 Attempting Zerostep visibility check'
                    });

                    await this.handleAiCommand(page, { ...step, action: 'waitfortext' }, test);
                    
                    test.info().annotations.push({
                        type: 'Fallback Success',
                        description: '✅ Zerostep visibility check succeeded'
                    });
                } catch (fallbackError) {
                    test.info().annotations.push({
                        type: 'Fallback Failed',
                        description: `❌ Zerostep visibility check failed: ${fallbackError.message}`
                    });
                    throw fallbackError;
                }
            }
        });
    }

    async handleFileUpload(page, step, test) {
        return await test.step(`Upload file: ${step.value}`, async () => {
            try {
                test.info().annotations.push({
                    type: 'File Upload Start',
                    description: `📁 Attempting to upload: ${step.value}`
                });

                if (!step.locator || !step.value) {
                    throw new Error('File upload requires both selector and filePath');
                }

                // Make file input visible
                await page.evaluate((selector) => {
                    const input = document.querySelector(selector);
                    if (input) {
                        input.style.opacity = '1';
                        input.style.display = 'block';
                        input.style.visibility = 'visible';
                    }
                }, step.locator);

                // Capture before state
                await test.info().attach('before-upload', {
                    body: await page.screenshot(),
                    contentType: 'image/png'
                });

                const fileInput = await page.locator(step.locator);
                await fileInput.setInputFiles(step.value, { force: true });

                // Wait for upload
                await page.waitForTimeout(1000);

                // Capture after state
                await test.info().attach('after-upload', {
                    body: await page.screenshot(),
                    contentType: 'image/png'
                });

                test.info().annotations.push({
                    type: 'Upload Success',
                    description: `✅ Successfully uploaded: ${step.value}`
                });

            } catch (error) {
                test.info().annotations.push({
                    type: 'Upload Failed',
                    description: `❌ File upload failed: ${error.message}`
                });
                throw error;
            }
        });
    }

    async handleRequest(step, test) {
        return await test.step(`API Request: ${step.locator}`, async () => {
            try {
                test.info().annotations.push({
                    type: 'API Request Start',
                    description: `🌐 Making API request to: ${step.locator}`
                });

                const url = step.locator.startsWith('http') ? step.locator : `https://${step.locator}`;
                const requestData = {
                    method: step.method || 'POST',
                    url,
                    data: step.value ? JSON.parse(step.value) : undefined,
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000,
                    validateStatus: () => true
                };

                // Log request details
                await test.info().attach('request-details', {
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify(requestData, null, 2))
                });

                const response = await axios(requestData);

                // Log response
                await test.info().attach('response-details', {
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({
                        status: response.status,
                        statusText: response.statusText,
                        data: response.data
                    }, null, 2))
                });

                test.info().annotations.push({
                    type: 'API Request Success',
                    description: `✅ API request succeeded with status: ${response.status}`
                });

                return response;

            } catch (error) {
                test.info().annotations.push({
                    type: 'API Request Failed',
                    description: `❌ API request failed: ${error.message}`
                });

                await test.info().attach('error-details', {
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

    async handleAiCommand(page, step, test) {
        return await test.step(`AI Command: ${step.action}`, async () => {
            try {
                const aiCommand = convertToAiCommand(step);
                const startTime = Date.now();

                test.info().annotations.push({
                    type: 'AI Command Start',
                    description: `🤖 Starting Zerostep command: ${step.action}`
                });

                // Log command details
                await test.info().attach('command-details', {
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({
                        action: step.action,
                        locator: step.locator,
                        value: step.value,
                        command: aiCommand,
                        timestamp: new Date().toISOString()
                    }, null, 2))
                });

                // Capture before state
                await test.info().attach('before-ai-command', {
                    body: await page.screenshot(),
                    contentType: 'image/png'
                });

                // Execute AI command
                await ai(aiCommand, { page, test });
                const executionTime = Date.now() - startTime;

                // Capture after state
                await page.waitForTimeout(500);
                await test.info().attach('after-ai-command', {
                    body: await page.screenshot(),
                    contentType: 'image/png'
                });

                test.info().annotations.push({
                    type: 'AI Command Success',
                    description: `✅ Zerostep command completed in ${executionTime}ms`
                });

            } catch (error) {
                test.info().annotations.push({
                    type: 'AI Command Failed',
                    description: `❌ Zerostep command failed: ${error.message}`
                });

                await test.info().attach('error-details', {
                    contentType: 'application/json',
                    body: Buffer.from(JSON.stringify({
                        error: error.message,
                        stack: error.stack,
                        timestamp: new Date().toISOString()
                    }, null, 2))
                });

                throw error;
            }
        });
    }

    async handleScroll(page, step, test) {
        return await test.step(`Scroll and Click: "${step.locator}"`, async () => {
            try {
                test.info().annotations.push({
                    type: 'Scroll Start',
                    description: `🔍 Attempting to scroll to and click: "${step.locator}"`
                });
    
                // Get all matching elements using handleElementAction
                const element = await handleElementAction(page, step, 'scroll', test);
                
                if (element) {
                    // Capture before state
                    await test.info().attach('before-scroll', {
                        body: await page.screenshot(),
                        contentType: 'image/png'
                    });
    
                    try {
                        // Get all elements matching the locator
                        const allElements = await page.locator(`${step.locatorType}:has-text("${step.locator}")`).all();
                        const count = allElements.length;
                        
                        test.info().annotations.push({
                            type: 'Elements Found',
                            description: `📍 Found ${count} matching elements`
                        });
    
                        // Get target index (default to 0 if not specified)
                        const targetIndex = step.value ? (parseInt(step.value) - 1) : 0;
    
                        if (count === 0) {
                            throw new Error(`No elements found matching "${step.locator}"`);
                        }
    
                        if (targetIndex >= count) {
                            throw new Error(`Requested element ${targetIndex + 1} but only found ${count} elements`);
                        }
    
                        const targetElement = allElements[targetIndex];
    
                        // Try different scroll strategies
                        try {
                            // First attempt: scrollIntoViewIfNeeded
                            await targetElement.scrollIntoViewIfNeeded();
                            await page.waitForTimeout(1000);
                        } catch (scrollError) {
                            // Second attempt: evaluate scroll
                            await page.evaluate(element => {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, targetElement);
                            await page.waitForTimeout(1000);
                        }
    
                        // Verify element is in viewport
                        const isVisible = await targetElement.isVisible();
                        if (!isVisible) {
                            throw new Error('Element not visible after scroll');
                        }
    
                        // Add click action after successful scroll
                        try {
                            // Wait for element to be visible and stable
                            await targetElement.waitFor({ state: 'visible', timeout: 5000 });
                            // Add a small delay to ensure element is fully rendered
                            await page.waitForTimeout(500);
                            
                            // Attempt to click with navigation handling
                            const [newPage] = await Promise.all([
                                // Listen for new pages
                                page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null),
                                // Click the element
                                targetElement.click({ timeout: 5000, force: false })
                            ]);
                        
                            // If a new page was opened, switch to it
                            if (newPage) {
                                await newPage.waitForLoadState('domcontentloaded', { timeout: 30000 });
                                test.info().annotations.push({
                                    type: 'Navigation',
                                    description: '📄 Switched to new page after click'
                                });
                                return newPage;
                            }
                        
                            test.info().annotations.push({
                                type: 'Click Success',
                                description: '✅ Successfully clicked element after scroll'
                            });
                        } catch (clickError) {
                            throw new Error(`Failed to click after scroll: ${clickError.message}`);
                        }
    
                        // Capture after state
                        await test.info().attach('after-scroll-and-click', {
                            body: await page.screenshot(),
                            contentType: 'image/png'
                        });
    
                        test.info().annotations.push({
                            type: 'Scroll and Click Success',
                            description: `✅ Successfully scrolled to and clicked element ${targetIndex + 1} of ${count} using PlayWright`
                        });
                        return;
    
                    } catch (actionError) {
                        test.info().annotations.push({
                            type: 'Action Failed',
                            description: `⚠️ Scroll and click attempt failed: ${actionError.message} using PlayWright`
                        });
                        throw actionError;
                    }
                }
                throw new Error('Element not found');
    
            } catch (error) {
                // Try Zerostep fallback
                test.info().annotations.push({
                    type: 'Fallback',
                    description: `⚠️ Falling back to Zerostep for scroll and click: "${step.locator}"`
                });
    
                try {
                    await this.handleAiCommand(page, { ...step, action: 'scroll-and-click' }, test);
                    
                    test.info().annotations.push({
                        type: 'Fallback Success',
                        description: '✅ Zerostep scroll and click succeeded'
                    });
                } catch (fallbackError) {
                    test.info().annotations.push({
                        type: 'Fallback Failed',
                        description: `❌ Zerostep scroll and click failed: ${fallbackError.message}`
                    });
                    throw fallbackError;
                }
            }
        });
    }

}
