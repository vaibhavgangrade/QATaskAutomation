import { locatorManager } from './locatorManager.js';
const { expect } = require('@playwright/test');

async function getListValues(page, locator) {
    if (!page || !locator) {
        throw new Error(`Invalid parameters: page and locator are required. Got page=${!!page}, locator=${locator}`);
    }

    try {
        const element = page.locator(locator);
        await expect(element).toBeVisible({ timeout: 5000 });

        // Get text content and split by newline
        const text = await element.textContent();
        if (!text) {
            throw new Error(`No text content found for locator: ${locator}`);
        }

        const values = text.split('\n')
            .map(item => item.trim())
            .filter(item => item !== '');

        if (values.length === 0) {
            throw new Error(`No valid values found in text content for locator: ${locator}`);
        }

        console.log(`Found ${values.length} items:`, values);
        return values;
    } catch (error) {
        console.error('Error getting list values:', error.message);
        throw error; // Re-throw the error without any fallback
    }
}

async function getCommonLocators(page, step) {
    // Excel-specific validation
    if (!step || typeof step !== 'object') {
        throw new Error('Invalid step object provided');
    }

    const searchText = step.locator?.toString().trim();
    const locatorType = step.locatorType?.toString().toLowerCase().trim();
    const inputType = step.value?.toString().toLowerCase().trim();

    // Validate required Excel fields
    if (!searchText) {
        throw new Error('Missing required locator text in Excel step');
    }
    if (!locatorType) {
        console.warn('⚠️ No locatorType specified in Excel, defaulting to generic selectors');
    }

    console.log(`🔍 Searching for ${locatorType || 'element'} with text/attribute: "${searchText}"`);
    
    // Handle Excel-specific timeouts if provided
    if (step.waitBefore) {
        await page.waitForTimeout(parseInt(step.waitBefore));
    }

    // Universal ecommerce patterns
    const universalEcommercePatterns = [
        // Generic Product Related
        `${locatorType}[data-product-id*="${searchText}"]`,
        `${locatorType}[data-sku*="${searchText}"]`,
        `${locatorType}[data-item*="${searchText}"]`,

        // Common Shopping Elements
        `${locatorType}[data-cart*="${searchText}"]`,
        `${locatorType}[data-checkout*="${searchText}"]`,
        `${locatorType}[data-basket*="${searchText}"]`,

        // Common Header/Navigation
        `${locatorType}[data-search*="${searchText}"]`,
        `${locatorType}[data-menu*="${searchText}"]`,
        `${locatorType}[data-nav*="${searchText}"]`,

        // Common Footer
        `${locatorType}[data-footer*="${searchText}"]`,
        `${locatorType}[data-section*="${searchText}"]`,

        // Common Button/Input Patterns
        `${locatorType}[name*="search"][value*="${searchText}"]`,
        `${locatorType}[name*="cart"][value*="${searchText}"]`,
        `${locatorType}[name*="checkout"][value*="${searchText}"]`,

        // Price Related
        `${locatorType}[data-price*="${searchText}"]`,
        `${locatorType}[data-amount*="${searchText}"]`,
        `${locatorType}[data-currency*="${searchText}"]`,

        // Common Form Elements
        `${locatorType}[data-form*="${searchText}"]`,
        `${locatorType}[data-input*="${searchText}"]`,
        `${locatorType}[data-field*="${searchText}"]`,

        // Common Authentication
        `${locatorType}[data-login*="${searchText}"]`,
        `${locatorType}[data-account*="${searchText}"]`,
        `${locatorType}[data-auth*="${searchText}"]`,

        // Common UI Elements
        `${locatorType}[data-modal*="${searchText}"]`,
        `${locatorType}[data-popup*="${searchText}"]`,
        `${locatorType}[data-dialog*="${searchText}"]`,

        // Common Content
        `${locatorType}[data-content*="${searchText}"]`,
        `${locatorType}[data-text*="${searchText}"]`,
        `${locatorType}[data-label*="${searchText}"]`,

        // Generic Attribute Combinations
        `${locatorType}[id*="${searchText.toLowerCase()}"]`,
        `${locatorType}[class*="${searchText.toLowerCase()}"]`,
        `${locatorType}[name*="${searchText.toLowerCase()}"]`,

        // Text Content Variations
        `${locatorType}:has-text("${searchText}")`,
        `${locatorType}:text-is("${searchText}")`,
        `${locatorType}:contains("${searchText}")`,

        // Common Testing Attributes
        `${locatorType}[data-test*="${searchText}"]`,
        `${locatorType}[data-testid*="${searchText}"]`,
        `${locatorType}[data-qa*="${searchText}"]`,
        `${locatorType}[data-cy*="${searchText}"]`,

        // Accessibility
        `${locatorType}[aria-label*="${searchText}"]`,
        `${locatorType}[title*="${searchText}"]`,
        `${locatorType}[alt*="${searchText}"]`,

        // Dynamic Content
        `${locatorType}[data-dynamic*="${searchText}"]`,
        `${locatorType}[data-lazy*="${searchText}"]`,
        `${locatorType}[data-load*="${searchText}"]`,

        // Value Based
        `${locatorType}[value*="${searchText}"]`,
        `${locatorType}[placeholder*="${searchText}"]`,

        // Nested Elements
        `${locatorType}:has(> *:text-is("${searchText}"))`,
        `${locatorType}:has(span:text-is("${searchText}"))`,
        `${locatorType}:has(div:text-is("${searchText}"))`,

        // Form Labels
        `label:has-text("${searchText}") + ${locatorType}`,
        `label[for*="${searchText}"] + ${locatorType}`,

        // Common Interactive Elements
        `${locatorType}[role="button"][aria-label*="${searchText}"]`,
        `${locatorType}[role="link"][aria-label*="${searchText}"]`,
        `${locatorType}[role="tab"][aria-label*="${searchText}"]`,

        // Common State Attributes
        `${locatorType}[data-state*="${searchText}"]`,
        `${locatorType}[data-status*="${searchText}"]`,
        `${locatorType}[data-condition*="${searchText}"]`,

        // Enhanced Text Matching Patterns
        `${locatorType}:has-text("${searchText}")`,
        `${locatorType}:text-matches("${searchText}", "i")`,
        `${locatorType}:has-text("${searchText.split(' ').join('.*')}")`,
        `${locatorType}:has-text("${searchText.replace(/ /g, '.*')}")`,
        
        // Enhanced Accessibility Patterns
        `${locatorType}[aria-label*="${searchText}" i]`,
        `${locatorType}[aria-label*="${searchText.split(' ').join('.*')}" i]`,
        `${locatorType}[aria-label*="${searchText.replace(/ /g, '.*')}" i]`,
        
        // Enhanced Role-based Patterns
        `${locatorType}[role="text"]:has-text("${searchText}")`,
        `${locatorType}[role="heading"]:has-text("${searchText}")`,
        `${locatorType}[role="listitem"]:has-text("${searchText}")`,
        
        // Enhanced Nested Text Patterns
        `${locatorType}:has(> *:has-text("${searchText}"))`,
        `${locatorType}:has(span:has-text("${searchText}"))`,
        `${locatorType}:has(div:has-text("${searchText}"))`,
        `${locatorType}:has(p:has-text("${searchText}"))`,
        
        // Enhanced Attribute Combinations
        `${locatorType}[(class|id|name|aria-label)*="${searchText}" i]`,
        `${locatorType}[(class|id|name|aria-label)*="${searchText.split(' ').join('.*')}" i]`,
        
        // Common UI Component Patterns
        `${locatorType}[class*="card"][class*="${searchText.toLowerCase()}"]`,
        `${locatorType}[class*="section"][class*="${searchText.toLowerCase()}"]`,
        `${locatorType}[class*="container"][class*="${searchText.toLowerCase()}"]`,
        
        // Enhanced Text Container Patterns
        `${locatorType}[class*="text"]:has-text("${searchText}")`,
        `${locatorType}[class*="content"]:has-text("${searchText}")`,
        `${locatorType}[class*="description"]:has-text("${searchText}")`,
        
        // Common E-commerce Specific Patterns
        `${locatorType}[class*="payment"]:has-text("${searchText}")`,
        `${locatorType}[class*="checkout"]:has-text("${searchText}")`,
        `${locatorType}[class*="order"]:has-text("${searchText}")`,
        
        // Enhanced Visibility Patterns
        `${locatorType}:visible:has-text("${searchText}")`,
        `${locatorType}:not([style*="display: none"]):has-text("${searchText}")`,
        `${locatorType}:not([style*="visibility: hidden"]):has-text("${searchText}")`
    ];

    // Input type-specific patterns
    const inputTypePatterns = {
        password: [
            'input[type="password"]',
            '#ap_password',
            'input[name="password"]',
            'input[aria-label*="password" i]',
            'input[placeholder*="password" i]',
            'input[type="password"][name*="password"]',
            'input[type="password"][id*="password"]'
        ],
        email: [
            'input[type="email"]',
            'input[name*="email"]',
            'input[id*="email"]',
            'input[aria-label*="email" i]',
            'input[placeholder*="email" i]'
        ],
        text: [
            'input[type="text"]',
            'input:not([type])',
            'input[aria-label*="text"]',
            'input[role="textbox"]'
        ],
        search: [
            'input[type="search"]',
            'input[role="searchbox"]',
            'input[name*="search"]',
            'input[aria-label*="search" i]'
        ],
        tel: [
            'input[type="tel"]',
            'input[name*="phone"]',
            'input[aria-label*="phone" i]',
            'input[placeholder*="phone" i]'
        ],
        number: [
            'input[type="number"]',
            'input[inputmode="numeric"]',
            'input[aria-label*="number" i]'
        ]
    };

    // Common attribute patterns
    const commonAttributePatterns = [
        // Generic attribute name patterns
        `${locatorType}[(name|id|label|aria-label)="${searchText}"]`,
        `${locatorType}[(name|id|label|aria-label)*="${searchText}"]`,
        // Data attributes
        `${locatorType}[data-*="${searchText}"]`,
        `${locatorType}[(data-test|data-testid|data-cy|data-automation)="${searchText}"]`,
        // ARIA attributes
        `${locatorType}[(aria-describedby|aria-label|aria-labelledby)*="${searchText}"]`,
        // Common UI attributes
        `${locatorType}[(title|alt|placeholder|value)*="${searchText}"]`
    ];

    // Element-specific selector strategies
    const elementSpecificSelectors = {
        input: [
            // Add type-specific selectors if type is provided
            ...(inputType && inputTypePatterns[inputType] ? 
                inputTypePatterns[inputType].map(selector => 
                    `${selector}[(name|id|placeholder|aria-label)*="${searchText}"]`
                ) : []),
            // General input patterns
            `input[(type|name|id|aria-label)*="${searchText}"]`,
            `input[type="text"][(name|id|placeholder|aria-label)*="${searchText}"]`,
            `input[type="email"][(name|id|placeholder|aria-label)*="${searchText}"]`,
            `input[type="password"][(name|id|placeholder|aria-label)*="${searchText}"]`,
            `input[type="search"][(name|id|placeholder|aria-label)*="${searchText}"]`,
            // Label associations
            `label:text-matches("${searchText}", "i") + input`,
            `label:has-text("${searchText}") ~ input`,
            `label[for*="${searchText}"] + input`,
            // Role-based
            `[role="textbox"][(name|id|aria-label)*="${searchText}"]`
        ],
        button: [
            `button:has-text("${searchText}")`,
            `button:text-is("${searchText}")`,
            `button[aria-label*="${searchText}" i]`,
            `button:has-text("${searchText}" i)`,
            `button[data-testid*="add_to_cart" i]`,
            `button[class*="add-to-cart" i]`,
            `button[class*="addToCart" i]`,
            `button[id*="add-to-cart" i]`,
            `button[name*="add-to-cart" i]`,
            `button >> text=${searchText}`,
        ],
        select: [
            // Select elements
            `select[(name|id|aria-label)*="${searchText}"]`,
            // Combobox roles
            `[role="combobox"][(name|id|aria-label)*="${searchText}"]`,
            `[role="listbox"][(name|id|aria-label)*="${searchText}"]`,
            // Label associations
            `label:text-matches("${searchText}", "i") + select`
        ],
        div: [
            `div:has-text("${searchText}")`,
            `div:text-is("${searchText}")`,
            `div[aria-label*="${searchText}" i]`,
            `div:has-text("${searchText}" i)`,
            `div[data-testid*="add_to_cart" i]`,
            `div[class*="add-to-cart" i]`,
            `div[class*="addToCart" i]`,
            `div[role="button"]:has-text("${searchText}")`,
            `div[role="button"][aria-label*="${searchText}" i]`,
            `div[data-qa*="add_to_cart_button" i]`,
            `div >> text=${searchText}`,
        ],
        span: [
            // Text content with exact and fuzzy matches
            `span:text-is("${searchText}")`,
            `span:text-matches("${searchText}", "i")`,
            `span:has-text("${searchText}")`,
            
            // Common attributes
            `span[(class|id|role|aria-label)*="${searchText}"]`,
            `span[role][(aria-label|title)*="${searchText}"]`,
            
            // Enhanced checkout-specific patterns for spans
            `span[class*="checkout"]:has-text("${searchText}")`,
            `span[class*="proceed"]:has-text("${searchText}")`,
            `span[class*="cart"]:has-text("${searchText}")`,
            
            // Nested text variations for better matching
            `span:has(> *:text-is("${searchText}"))`,
            `span:has(*:text-matches("${searchText}", "i"))`,
            
            // Common parent elements that might contain spans
            `[class*="button"] span:has-text("${searchText}")`,
            `[class*="checkout"] span:has-text("${searchText}")`,
            `[class*="cart"] span:has-text("${searchText}")`,
            
            // Role-based patterns specific to checkout flows
            `span[role="button"]:has-text("${searchText}")`,
            `span[role="link"]:has-text("${searchText}")`,
            
            // Accessibility patterns
            `span[aria-label*="${searchText}"]`,
            `span[title*="${searchText}"]`,
            
            // Common UI framework patterns for spans
            `span[class*="text"]:has-text("${searchText}")`,
            `span[class*="label"]:has-text("${searchText}")`,
            `span[class*="content"]:has-text("${searchText}")`
        ],
        a: [
            // Link text
            `a:text-matches("${searchText}", "i")`,
            // Common attributes
            `a[(href|title|aria-label)*="${searchText}"]`,
            // Role-based
            `[role="link"]:text-matches("${searchText}", "i")`
        ],
        img: [
            // Image attributes
            `img[(alt|title|src|aria-label)*="${searchText}"]`,
            // Role-based
            `[role="img"][(alt|title|aria-label)*="${searchText}"]`
        ],
        label: [
            // Text content
            `label:text-matches("${searchText}", "i")`,
            // Common attributes
            `label[(for|id|class)*="${searchText}"]`,
            // Role-based
            `[role="label"]:text-matches("${searchText}", "i")`
        ],
        p: [
            // Paragraph text
            `p:text-matches("${searchText}", "i")`,
            // Common attributes
            `p[(class|id|aria-label)*="${searchText}"]`
        ],
        h1: [
            `h1:text-matches("${searchText}", "i")`,
            `h1[(class|id|aria-label)*="${searchText}"]`
        ],
        h2: [
            `h2:text-matches("${searchText}", "i")`,
            `h2[(class|id|aria-label)*="${searchText}"]`
        ],
        h3: [
            `h3:text-matches("${searchText}", "i")`,
            `h3[(class|id|aria-label)*="${searchText}"]`
        ],
        table: [
            // Table elements
            `table[(id|aria-label)*="${searchText}"]`,
            `th:text-matches("${searchText}", "i")`,
            `td:text-matches("${searchText}", "i")`,
            // Role-based
            `[role="grid"][(aria-label)*="${searchText}"]`,
            `[role="gridcell"]:text-matches("${searchText}", "i")`
        ],
        li: [
            // List items
            `li:text-matches("${searchText}", "i")`,
            `li[(class|id|aria-label)*="${searchText}"]`
        ],
        textarea: [
            // Textarea elements
            `textarea[(name|id|placeholder|aria-label)*="${searchText}"]`,
            // Label associations
            `label:text-matches("${searchText}", "i") + textarea`
        ]
    };

    // Framework-specific patterns
    const frameworkPatterns = [
        // Angular
        `[ng-model*="${searchText}"]`,
        `[ng-bind*="${searchText}"]`,
        `[formControlName*="${searchText}"]`,
        // React
        `[data-reactid*="${searchText}"]`,
        // Vue
        `[v-model*="${searchText}"]`,
        // Common UI libraries
        `[class*="mui"][aria-label*="${searchText}"]`,
        `[class*="ant-"][aria-label*="${searchText}"]`,
        `[class*="chakra-"][aria-label*="${searchText}"]`,
        `[class*="bootstrap-"][aria-label*="${searchText}"]`
    ];

    // Combine all selectors with priority for type-specific patterns
    let allSelectors = [
        ...(inputType && inputTypePatterns[inputType] ? inputTypePatterns[inputType] : []),
        ...commonAttributePatterns,
        ...(elementSpecificSelectors[locatorType] || []),
        ...frameworkPatterns
    ];

    // Add these patterns for error messages and notifications
    const additionalPatterns = [
        // Error messages
        `[role="alert"]:has-text("${searchText}")`,
        `[class*="error"]:has-text("${searchText}")`,
        `[class*="message"]:has-text("${searchText}")`,
        `[class*="notification"]:has-text("${searchText}")`,
        
        // Form validation messages
        `[aria-invalid="true"] ~ [role="alert"]`,
        `[data-error]:has-text("${searchText}")`,
        `[class*="validation"]:has-text("${searchText}")`,
        
        // Generic text containers
        `div:has-text("${searchText}")`,
        `span:has-text("${searchText}")`,
        `p:has-text("${searchText}")`,
        
        // Common UI patterns
        `[class*="toast"]:has-text("${searchText}")`,
        `[class*="popup"]:has-text("${searchText}")`,
        `[class*="modal"]:has-text("${searchText}")`
    ];

    allSelectors = [...allSelectors, ...additionalPatterns];

    // Add these patterns to universalEcommercePatterns array
    const additionalHeaderPatterns = [
        // Header navigation patterns
        `${locatorType}[class*="header"][class*="nav"]:has-text("${searchText}")`,
        `${locatorType}[class*="top-nav"]:has-text("${searchText}")`,
        `${locatorType}[class*="utility-nav"]:has-text("${searchText}")`,
        `${locatorType}[class*="user-nav"]:has-text("${searchText}")`,
        
        // Account/Sign in specific patterns
        `${locatorType}[class*="account"]:has-text("${searchText}")`,
        `${locatorType}[class*="sign-in"]:has-text("${searchText}")`,
        `${locatorType}[class*="login"]:has-text("${searchText}")`,
        
        // Common header link patterns
        `a[class*="header-link"]:has-text("${searchText}")`,
        `${locatorType}[class*="header"] a:has-text("${searchText}")`,
        
        // Role-based patterns for navigation
        `${locatorType}[role="navigation"] a:has-text("${searchText}")`,
        `${locatorType}[role="menuitem"]:has-text("${searchText}")`,
        
        // Exact text match with parent containers
        `${locatorType}[class*="header"] :text-is("${searchText}")`,
        `${locatorType}[class*="nav"] :text-is("${searchText}")`,
        
        // Case-insensitive contains text
        `${locatorType}:has-text("${searchText}" i)`,
        
        // Split text patterns (for "Sign In / Register" type text)
        `${locatorType}:has-text("${searchText.split('/')[0]}")`,
        `${locatorType}:has-text("${searchText.split('/')[1]}")`,
    ];

    allSelectors = [...allSelectors, ...additionalHeaderPatterns];

    // Try each selector
    for (const selector of allSelectors) {
        try {
            const element = page.locator(selector);
            const count = await element.count();
            if (count > 0) {
                const isVisible = await element.first().isVisible().catch(() => false);
                if (isVisible) {
                    console.log(`✅ Found ${locatorType} (type: ${inputType || 'any'}) using: ${selector}`);
                    return element.first();
                }
            }
        } catch (error) {
            continue;
        }
    }

    // Try generic text search as last resort
    try {
        const textSelectors = [
            `:text-matches("${searchText}", "i")`,
            `:has-text("${searchText}")`,
            `text=${searchText}`
        ];

        for (const selector of textSelectors) {
            const element = page.locator(selector);
            const isVisible = await element.first().isVisible().catch(() => false);
            if (isVisible) {
                console.log(`⚠️ Found using text selector: ${selector}`);
                return element.first();
            }
        }
    } catch (error) {
        console.log(`❌ No element found for ${locatorType} (type: ${inputType || 'any'}): ${searchText}`);
    }

    return null;
}

async function trySelectors(context, selectors) {
    for (const selector of selectors) {
        try {
            const element = context.locator(selector);
            const isVisible = await element.isVisible().catch(() => false);
            if (isVisible) {
                console.log(`✅ Found element in ${context === page ? 'main frame' : 'iframe'}`);
                return element;
            }
        } catch (error) {
            continue;
        }
    }
    return null;
}

async function handleElementAction(page, step, actionType, test) {
    return await test.step(`Locating ${step.locatorType}: "${step.locator}"`, async () => {
        try {
            const element = await getCommonLocators(page, step);

            if (element) {
                await element.waitFor({ state: 'visible', timeout: 5000 });
                
                test.info().annotations.push({
                    type: 'Element Found',
                    description: `✅ Element found using Playwright: ${step.locatorType} - "${step.locator}"`
                });
                
                return element;
            }

            test.info().annotations.push({
                type: 'Element Not Found',
                description: `❌ No element found: ${step.locatorType} - "${step.locator}"`
            });
            return null;
        } catch (error) {
            test.info().annotations.push({
                type: 'Execution Error',
                description: `❌ Error in Playwright execution: ${error.message}`
            });
            return null;
        }
    });
}

// Helper function to get the proper suffix for numbers
function getSuffix(value) {
    if (!value) return '';
    const num = parseInt(value);
    if (isNaN(num)) return value;

    if (num === 1) return 'first';
    if (num === 2) return 'second';
    if (num === 3) return 'third';
    return `${num}th`;
}

// Helper method to get text from element
async function getElementText(element) {
    try {
        // Try different methods to get text
        let text = await element.textContent();
        if (text?.trim()) return text;

        text = await element.innerText();
        if (text?.trim()) return text;

        text = await element.inputValue();
        if (text?.trim()) return text;

        text = await element.getAttribute('value');
        if (text?.trim()) return text;

        return '';
    } catch (error) {
        console.error('Error getting element text:', error);
        return '';
    }
}

// Helper function to get value using parser
async function getValueFromParser(page, parserName, key) {
    try {
        console.log(`🔍 Processing ${parserName}`);
        
        // Parse input format "#parsers,items"
        const [parserId, keyId] = parserName.split(',');
        const cleanParserId = parserId.replace('#', '');
        
        console.log(`Looking for ${keyId} in ${cleanParserId}`);

        // Get base locator from amazon.js
        const baseLocator = await locatorManager.getLocator(cleanParserId, keyId);
        
        if (!baseLocator) {
            throw new Error(`No locator found for ${keyId} in ${cleanParserId}`);
        }

        // Get the container element
        const container = page.locator(baseLocator);
        await container.waitFor({ state: 'visible', timeout: 30000 });

        // Define search terms
        const searchTerms = {
            cart_total: ["Order total", "Total"],
            items: ["Items:", "Item:", "Items"],
            shipping_amount: ["Shipping & handling", "Shipping"],
            sales_tax: ["Estimated tax", "Tax"],
            discounts: ["Discount", "Savings", "-$"]
        };

        // Find matching element
        const elements = await container.locator('tr, li').all();
        let matchingText = '';

        for (const element of elements) {
            const text = await element.textContent();
            const terms = searchTerms[keyId];
            if (terms.some(term => text.includes(term))) {
                matchingText = text.trim();
                break;
            }
        }

        if (!matchingText) {
            throw new Error(`Could not find ${keyId} in the summary table`);
        }

        // Extract numeric value
        let value = '0';
        let numeric = 0;

        if (matchingText.toLowerCase().includes('free')) {
            value = 'FREE';
            numeric = 0;
        } else {
            const valueMatch = matchingText.match(/\$?([-]?\d+,?\d*\.?\d*)/);
            if (valueMatch) {
                value = valueMatch[0];
                numeric = parseFloat(valueMatch[1].replace(/,/g, ''));
                
                // Handle discounts
                if (matchingText.includes('-') || keyId === 'discounts') {
                    numeric = -Math.abs(numeric);
                }
            } else {
                throw new Error(`No numeric value found in: ${matchingText}`);
            }
        }

        console.log(`✅ Found ${keyId}:`, { value, numeric });
        return {
            value: value,
            numeric: numeric,
            locator: baseLocator
        };

    } catch (error) {
        console.error(`❌ Error processing ${key}:`, error.message);
        throw error;
    }
}

async function handleTextBasedClick(page, step, test) {
    return await test.step(`Click: "${step.locator}"`, async () => {
        try {
            // Get element using handleElementAction
            const element = await handleElementAction(page, step, 'click', test);
            if (!element) {
                throw new Error(`Element not found: ${step.locator}`);
            }

            // Simple pre-click setup
            await element.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);

            // Simple click with retry
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    // Log attempt
                    test.info().annotations.push({
                        type: 'Click Attempt',
                        description: `Attempt ${attempt} to click "${step.locator}"`
                    });

                    // Check visibility
                    const isVisible = await element.isVisible();
                    if (!isVisible) {
                        throw new Error('Element is not visible');
                    }

                    // Try click with different strategies
                    if (attempt === 1) {
                        // Normal click
                        await element.click({ timeout: 5000 });
                    } else if (attempt === 2) {
                        // Force click
                        await element.click({ force: true, timeout: 5000 });
                    } else {
                        // JavaScript click
                        await page.evaluate(el => el.click(), element);
                    }

                    // Wait for any navigation
                    await page.waitForLoadState('domcontentloaded').catch(() => {});

                    // Log success
                    test.info().annotations.push({
                        type: 'Click Success',
                        description: `Successfully clicked "${step.locator}" on attempt ${attempt}`
                    });

                    return true;
                } catch (clickError) {
                    if (attempt === 3) {
                        throw clickError;
                    }
                    await page.waitForTimeout(1000);
                }
            }
        } catch (error) {
            // Log failure
            test.info().annotations.push({
                type: 'Click Failed',
                description: `Failed to click "${step.locator}": ${error.message}`
            });

            // Fallback to AI command
            try {
                await this.handleAiCommand(page, {
                    ...step,
                    action: 'click',
                    additionalContext: `Click on ${step.locatorType} containing "${step.locator}"`
                }, test);
                return true;
            } catch (fallbackError) {
                throw new Error(`Failed to click element: ${error.message}`);
            }
        }
    });
}

module.exports = {
    getListValues,
    getCommonLocators,
    handleElementAction,
    getSuffix,
    getElementText,
    getValueFromParser,
    handleTextBasedClick
};