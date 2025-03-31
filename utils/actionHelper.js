import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';
import { convertToAiCommand } from './excelReader.js';
const { locatorManager } = require('./locatorManager.js');
import axios from 'axios';
import { handleElementAction, getCommonLocators, getSuffix, getValueFromParser, getElementText } from './baseFunctions.js';
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
                    description: `❌ Navigation failed: using playwright: ${step.locator}`
                });
                throw error;
            }
        });
    }

    async handleAssert(page, step, test) {
        return await test.step(`Assert: ${step.value}`, async () => {
            try {
                if (page.isClosed()) return;

                let element;
                let elementLocator;
                let expectedText = step.value;
                let targetIndex = 1; // default to first element

                // Check if value contains index specification (e.g., "2:Expected Text")
                if (step.value && step.value.includes(':')) {
                    const [index, text] = step.value.split(':').map(s => s.trim());
                    targetIndex = parseInt(index) || 1;
                    expectedText = text;
                }

                // Handle parser-based locators (#parserName,key)
                if (step.locator?.startsWith('#')) {
                    const [parserName, keyName] = step.locator.substring(1).split(',').map(s => s.trim());

                    if (!parserName || !keyName) {
                        test.info().annotations.push({
                            type: 'Error',
                            description: `❌ Incomplete format
• Expected: #parserName,key
• Found: ${step.locator}
• Missing: ${!parserName ? 'Parser name' : 'Key name'}`
                        });
                        return false;
                    }

                    // Parser validation
                    try {
                        elementLocator = await locatorManager.getLocator(parserName, keyName);
                        if (!elementLocator) {
                            test.info().annotations.push({
                                type: 'ParserError',
                                description: `❌ Parser configuration
• Parser: ${parserName}.js
• Key: ${keyName}
• Issue: Key not found in parser file`
                            });
                            return false;
                        }
                    } catch (error) {
                        test.info().annotations.push({
                            type: 'Parser Error',
                            description: `❌ Parser error
• File: ${parserName}.js
• Issue: Unable to read parser file`
                        });
                        return false;
                    }
                } else {
                    // Handle direct locators (xpath, css, etc.)
                    elementLocator = step.locator;
                }

                // Element validation
                try {
                    const allElements = await page.locator(elementLocator).all();
                    const count = allElements.length;
                    
                    if (count === 0) {
                        test.info().annotations.push({
                            type: 'Assertion - DOM Parser Error',
                            description: `❌ No elements found with locator: ${elementLocator}`
                        });
                        return false;
                    }

                    // Get text content and visibility of all elements
                    const elementTexts = await Promise.all(
                        allElements.map(async (el) => {
                            const text = (await el.textContent() || '').trim();
                            const isVisible = await el.isVisible();
                            return { text, isVisible, element: el };
                        })
                    );

                    // Filter visible elements
                    const visibleElements = elementTexts.filter(e => e.isVisible);
                    
                    if (targetIndex > visibleElements.length) {
                        test.info().annotations.push({
                            type: 'Assertion Error',
                            description: `❌ Index out of range
• Locator: ${elementLocator}
• Requested: Element #${targetIndex}
• Available: ${visibleElements.length} visible elements
• Total elements: ${count}
• Visible texts: ${visibleElements.map(e => `"${e.text}"`).join(', ')}
• Suggestion: Use index between 1 and ${visibleElements.length}`
                        });
                        return false;
                    }

                    // Get target element
                    const targetElement = visibleElements[targetIndex - 1];
                    const actualText = targetElement.text;

                    // Content validation
                    if (!actualText) {
                        test.info().annotations.push({
                            type: 'Assertion Error',
                            description: `❌ Empty content
• Locator: ${elementLocator}
• Index: ${targetIndex}
• Expected: "${expectedText}"
• Found: Empty element`
                        });
                        return false;
                    }

                    try {
                        await expect(actualText).toContain(expectedText);
                        
                        // Success case
                        test.info().annotations.push({
                            type: 'Assertion Success',
                            description: `✅ Assertion passed
• Locator: ${elementLocator}
• Index: ${targetIndex} of ${visibleElements.length}
• Expected: "${expectedText}"
• Found: "${actualText}"`
                        });
                        return true;
                    } catch (error) {
                        test.info().annotations.push({
                            type: 'Assertion Error',
                            description: `❌ Text mismatch
• Locator: ${elementLocator}
• Index: ${targetIndex} of ${visibleElements.length}
• Expected: "${expectedText}"
• Found: "${actualText}"
• All visible texts: ${visibleElements.map(e => `"${e.text}"`).join(', ')}`
                        });
                        return false;
                    }

                } catch (error) {
                    test.info().annotations.push({
                        type: 'Assertion Error',
                        description: `❌ Assertion failed
• Locator: ${elementLocator}
• Error: ${error.message}`
                    });
                    return false;
                }
            } catch (error) {
                test.info().annotations.push({
                    type: 'Assertion Error',
                    description: `❌ Assertion failed
• Locator: ${step.locator}
• Error: ${error.message}`
                });
                return false;
            }
        });
    }

    async handleCartAssert(page, step, test) {
        return await test.step(`Cart Assert: ${step.value}`, async () => {
            let keyName, parserName;
            try {
                if (page.isClosed()) return;

                if (!step.locator?.startsWith('#')) {
                    throw new Error(`Invalid assert format: Locator must start with # but got: ${step.locator}`);
                }

                [parserName, keyName] = step.locator.substring(1).split(',').map(s => s.trim());

                if (!parserName || !keyName) {
                    throw new Error(`Invalid parser format. Expected #parserName,key but got: ${step.locator}`);
                }

                // Get the locator from the parser
                let elementLocator;
                try {
                    elementLocator = await locatorManager.getLocator(parserName, keyName);
                    if (!elementLocator) {
                        // Combine both error messages into one annotation
                        test.info().annotations.push({
                            type: 'Cart Assertion Failed',
                            description: `❌ Cart assertion failed:
• Parser: ${parserName}
• Key: ${keyName}
• Error: Element not found in parser configuration
• Locator: ${step.locator}
• Action: ${step.action}`
                        });
                        throw new Error(`Element ${keyName} not found in parser ${parserName}`);
                    }
                } catch (error) {
                    // Single error annotation for parser-related failures
                    test.info().annotations.push({
                        type: 'Cart Assertion Failed',
                        description: `❌ Cart assertion failed:
• Parser: ${parserName}
• Key: ${keyName}
• Error: ${error.message}
• Locator: ${step.locator}
• Action: ${step.action}`
                    });
                    throw error;
                }

                // Find all instances of the element
                const elements = await page.locator(elementLocator).all();
                if (elements.length === 0) {
                    test.info().annotations.push({
                        type: 'Assertion - DOM Parser Error',
                        description: `❌ No elements found with locator: ${elementLocator}`
                    });
                    throw new Error(`No elements found with locator: ${elementLocator}`);
                }

                // Log if multiple instances found
                if (elements.length > 1) {
                    test.info().annotations.push({
                        type: 'Multiple Elements',
                        description: `Found ${elements.length} instances of locator: ${elementLocator}`
                    });
                }

                // Process each element's text content
                let foundValue = null;
                for (const element of elements) {
                    let text = await element.textContent() || '';
                    // Clean up the text by removing unwanted characters and HTML
                    text = text.replace(/[\n\r\t]/g, '')
                        .replace(/<[^>]*>/g, '')
                        .trim();

                    if (text) {
                        // Extract numeric value if present
                        const numericMatch = text.match(/[-]?\$?[\d,]+\.?\d*/);
                        if (numericMatch) {
                            const numericValue = parseFloat(numericMatch[0].replace(/[$,]/g, ''));
                            foundValue = {
                                text: text,
                                numeric: numericValue,
                                value: text
                            };
                            break;
                        }
                    }
                }

                if (!foundValue) {
                    test.info().annotations.push({
                        type: 'DOM Parser Data Error',
                        description: `❌ Could not extract valid value from element with locator: ${elementLocator}`
                    });
                    throw new Error(`Could not extract valid value from element with locator: ${elementLocator}`);
                }

                // Initialize cartValues if needed
                if (!this.cartValues) {
                    this.cartValues = {
                        items: 0,
                        discounts: 0,
                        sales_tax: 0,
                        shipping_amount: 0,
                        cart_total: 0
                    };
                }

                this.cartValues[keyName] = foundValue.numeric;

                test.info().annotations.push({
                    type: 'Cart Assert Success',
                    description: `✅ ${keyName} found from ${parserName}: ${foundValue.numeric} (Found in text: "${foundValue.text}")`
                });

            } catch (error) {
                // We don't need to add another annotation here since we already added one above
                throw error;
            }
        });
    }

    async handleInputData(page, step, test) {
        return await test.step(`Input: "${step.value}" into "${step.locator}"`, async () => {
            try {
                // Try with Playwright first
                const element = await handleElementAction(page, step, 'fill', test);
                if (!element) {
                    throw new Error(`Input element not found: "${step.locator}"`);
                }

                try {
                    await element.scrollIntoViewIfNeeded();
                    await element.fill(step.value);
                    
                    test.info().annotations.push({
                        type: 'Input Success',
                        description: `⚡ Input handled by Playwright: "${step.value}" into "${step.locator}"`
                    });
                    return;
                } catch (inputError) {
                    throw new Error(`Element found but input failed: ${inputError.message}`);
                }

            } catch (actionError) {
                test.info().annotations.push({
                    type: 'Action Failed',
                    description: `⚠️ Input attempt failed: on ${step.locator} using Playwright`
                });

                test.info().annotations.push({
                    type: 'Fallback',
                    description: `⚠️ Falling back to Zerostep for input: "${step.locator}"`
                });

                try {
                    await this.handleAiCommand(page, {
                        ...step,
                        action: 'type',
                        additionalContext: `Type "${step.value}" into field labeled or containing text "${step.locator}"`
                    }, test);

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
                if (!element) {
                    throw new Error('Element not found');
                }

                // Capture before state
                await test.info().attach('before-click', {
                    body: await page.screenshot(),
                    contentType: 'image/png'
                });

                try {
                    await element.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(1000);

                    const isVisible = await element.isVisible();
                    if (!isVisible) {
                        throw new Error(`Element "${step.locator}" is not visible after scroll`);
                    }

                    await element.click({ timeout: 5000 });

                    // Capture after state
                    await page.waitForTimeout(500);
                    await test.info().attach('after-click', {
                        body: await page.screenshot(),
                        contentType: 'image/png'
                    });

                    test.info().annotations.push({
                        type: 'Click Success',
                        description: `✅ Successfully clicked using Playwright: "${step.locator}"`
                    });
                    return;

                } catch (clickError) {
                    throw new Error(`Click attempt failed: ${clickError.message}`);
                }

            } catch (actionError) {
                test.info().annotations.push({
                    type: 'Action Failed',
                    description: `⚠️ Click attempt failed: ${actionError.message} using Playwright`
                });

                test.info().annotations.push({
                    type: 'Fallback',
                    description: `⚠️ Falling back to Zerostep for click: "${step.locator}"`
                });

                try {
                    await this.handleAiCommand(page, {
                        ...step,
                        action: 'click',
                        additionalContext: `Click on ${step.locatorType} element containing text or label "${step.locator}"`
                    }, test);
                    
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
                const element = await handleElementAction(page, step, 'check', test);
                if (!element) {
                    throw new Error(`Element not found: "${step.locator}"`);
                }

                try {
                    await element.waitFor({ state: 'visible', timeout: 5000 });
                    
                    test.info().annotations.push({
                        type: 'Visibility Success',
                        description: `⚡ Visibility check handled by Playwright: "${step.locator}"`
                    });
                    return true;
                } catch (visibilityError) {
                    throw new Error(`Element found but not visible: ${visibilityError.message}`);
                }

            } catch (actionError) {
                test.info().annotations.push({
                    type: 'Action Failed',
                    description: `⚠️ Visibility check failed: ${actionError.message} using Playwright`
                });

                test.info().annotations.push({
                    type: 'Fallback',
                    description: `⚠️ Falling back to Zerostep for visibility check: "${step.locator}"`
                });

                try {
                    await this.handleAiCommand(page, {
                        ...step,
                        action: 'waitfortext',
                        additionalContext: `Wait for element containing text "${step.locator}" to be visible`
                    }, test);

                    return true;
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

                // Execute AI command
                await ai(aiCommand, { page, test });
                const executionTime = Date.now() - startTime;

                // Add both annotations to ensure proper counting
                test.info().annotations.push(
                    {
                        type: 'Zerostep Success',  // Add this explicit type
                        description: `✅ Action completed using Zerostep`
                    }
                );

                return true;

            } catch (error) {
                test.info().annotations.push({
                    type: 'AI Command Failed',
                    description: `❌ Zerostep command failed: ${step.locator}`
                });
                throw error;
            }
        });
    }

    async handleScroll(page, step, test) {
        return await test.step(`Scroll: "${step.locator}"`, async () => {
            const suffix = getSuffix(step.value);
            const description = suffix ? 
                `🔍 Attempting to scroll to ${suffix} "${step.locator}"` : 
                `🔍 Attempting to scroll to "${step.locator}"`;

            test.info().annotations.push({
                type: 'Scroll Start',
                description: description
            });

            try {
                const element = await handleElementAction(page, step, 'scroll', test);
                
                if (!element) {
                    throw new Error('Element not found');
                }

                // Capture before state
                await test.info().attach('before-scroll', {
                    body: await page.screenshot(),
                    contentType: 'image/png'
                });

                // Get all elements matching the locator
                const allElements = await page.locator(`${step.locatorType}:has-text("${step.locator}")`).all();
                const count = allElements.length;
                
                test.info().annotations.push({
                    type: 'Elements Found',
                    description: `📍 Found ${count} matching elements`
                });

                const targetIndex = step.value ? (parseInt(step.value) - 1) : 0;

                if (count === 0) {
                    throw new Error(`No elements found matching "${step.locator}"`);
                }

                if (targetIndex >= count) {
                    throw new Error(`Requested ${suffix} element but only found ${count} elements`);
                }

                const targetElement = allElements[targetIndex];

                // Single scroll strategy using Playwright
                await targetElement.scrollIntoViewIfNeeded();
                await page.waitForTimeout(1000);

                // Verify element is in viewport
                const isVisible = await targetElement.isVisible();
                if (!isVisible) {
                    throw new Error(`${suffix} element not visible after scroll`);
                }

                // Capture after state
                await test.info().attach('after-scroll', {
                    body: await page.screenshot(),
                    contentType: 'image/png'
                });

                test.info().annotations.push({
                    type: 'Scroll Success',
                    description: `✅ Successfully scrolled to ${suffix} element using Playwright`
                });
                return;

            } catch (actionError) {
                test.info().annotations.push({
                    type: 'Action Failed',
                    description: `⚠️ Scroll attempt failed: ${actionError.message} using Playwright`
                });

                test.info().annotations.push({
                    type: 'Fallback',
                    description: `⚠️ Falling back to Zerostep for scroll: "${step.locator}"`
                });

                try {
                    await this.handleAiCommand(page, {
                        ...step,
                        action: 'scroll',
                        additionalContext: `Scroll to the ${getSuffix(step.value) || 'first'} element containing text "${step.locator}"`
                    }, test);
                    
                } catch (fallbackError) {
                    test.info().annotations.push({
                        type: 'Fallback Failed',
                        description: `❌ Zerostep scroll failed: ${fallbackError.message}`
                    });
                    throw fallbackError;
                }
            }
        });
    }

    async handleKeyboardAction(page, step, test) {
        return await test.step(`Keyboard Action: ${step.value}`, async () => {
            try {
                const keyName = step.value.toUpperCase();
                
                // Try with Playwright first
                try {
                    switch (keyName) {
                        case 'ENTER':
                            await page.keyboard.press('Enter');
                            break;
                        case 'TAB':
                            await page.keyboard.press('Tab');
                            break;
                        case 'ESCAPE':
                            await page.keyboard.press('Escape');
                            break;
                        case 'ARROWUP':
                            await page.keyboard.press('ArrowUp');
                            break;
                        case 'ARROWDOWN':
                            await page.keyboard.press('ArrowDown');
                            break;
                        case 'ARROWLEFT':
                            await page.keyboard.press('ArrowLeft');
                            break;
                        case 'ARROWRIGHT':
                            await page.keyboard.press('ArrowRight');
                            break;
                        case 'BACKSPACE':
                            await page.keyboard.press('Backspace');
                            break;
                        case 'DELETE':
                            await page.keyboard.press('Delete');
                            break;
                        default:
                            throw new Error(`Unsupported key action: ${keyName}`);
                    }

                    const successMessage = `⚡ Keyboard action handled by Playwright: "${keyName}"`;
                    console.log(successMessage);
                    test.info().annotations.push({
                        type: 'Keyboard Action Success',
                        description: successMessage
                    });
                    return;
                } catch (error) {
                    const playwrightError = `❌ Playwright keyboard action failed: ${error.message}`;
                    console.log(playwrightError);
                    test.info().annotations.push({
                        type: 'Keyboard Action Failed',
                        description: playwrightError
                    });

                    // Fallback to Zerostep
                    const zerostepMessage = `🤖 Attempting keyboard action with Zerostep: "${keyName}"`;
                    console.log(zerostepMessage);
                    test.info().annotations.push({
                        type: 'Keyboard Fallback',
                        description: zerostepMessage
                    });

                    try {
                        await this.handleAiCommand(page, {
                            ...step,
                            action: 'press',
                            additionalContext: `Press keyboard key "${keyName}"`
                        }, test);

                        const successMessage = `✅ Keyboard action handled by Zerostep: "${keyName}"`;
                        console.log(successMessage);
                        test.info().annotations.push({
                            type: 'Keyboard Action Success',
                            description: successMessage
                        });
                        return;
                    } catch (zerostepError) {
                        const finalError = `❌ Keyboard action failed with both Playwright and Zerostep: "${keyName}"`;
                        console.log(finalError);
                        test.info().annotations.push({
                            type: 'Keyboard Action Failed',
                            description: finalError
                        });
                        throw new Error(finalError);
                    }
                }
            } catch (error) {
                test.info().annotations.push({
                    type: 'Action Failed',
                    description: `⚠️ Keyboard action failed: ${error.message} using Playwright`
                });

                test.info().annotations.push({
                    type: 'Fallback',
                    description: `⚠️ Falling back to Zerostep for keyboard action: "${step.value}"`
                });

                try {
                    await this.handleAiCommand(page, {
                        ...step,
                        action: 'press',
                        additionalContext: `Press keyboard key "${step.value}"`
                    }, test);

                } catch (fallbackError) {
                    test.info().annotations.push({
                        type: 'Fallback Failed',
                        description: `❌ Zerostep keyboard action failed: ${fallbackError.message}`
                    });
                    throw fallbackError;
                }
            }
        });
    }
}
