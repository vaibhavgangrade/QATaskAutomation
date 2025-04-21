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
    const searchText = step.locator?.toString().trim();
    const locatorType = step.locatorType?.toString().toLowerCase().trim();
    const inputType = step.value?.toString().toLowerCase().trim();

    console.log(`🔍 Searching for ${locatorType} with text/attribute: "${searchText}"`);

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
    
        
        // More specific patterns for Best Buy
        `a[class*="-link"]:has(h4:text-is("${searchText}"))`,
        `a:has(h4:text-is("${searchText}")) >> nth=0`,
        `a:has(img[alt*="${searchText}"]) >> nth=0`,
    ]

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
        radio: [
            // Class and type based selectors
            `input.c-radio-input[type="radio"]`,
            `.c-radio-input[type="radio"]`,
            
            // Name based selectors
            `input[type="radio"][name="availability-selection"]`,
            `input[type="radio"][name*="${searchText}"]`,
            
            // ID based selectors
            `input[type="radio"][id*="fulfillment-ispu"]`,
            `input[type="radio"][id*="${searchText}"]`,
            
            // Specific class combinations
            `input.c-radio-input.appearance-none[type="radio"]`,
            
            // Attribute combinations
            `input[type="radio"][class*="c-radio-input"]`,
            `input[type="radio"][class*="appearance-none"]`,
            
            // Parent-based selectors
            `div:has(> input[type="radio"])`,
            `label:has(> input[type="radio"])`,
            
            // Checked state selectors
            `input[type="radio"][checked]`,
            `input[type="radio"][aria-checked="true"]`,
            
            // Position based (for nth selection)
            `input[type="radio"]:nth-child(${searchText})`,
            `input.c-radio-input[type="radio"]:nth-child(${searchText})`,
            
            // Specific to the provided HTML structure
            `input.c-radio-input.appearance-none[type="radio"]:nth-child(${searchText})`,
            `input[type="radio"][name="availability-selection"]:nth-child(${searchText})`
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
            'input[aria-label*="search" i]',
            'input[placeholder="What can we help you find today?]',
            'input[type="search"][id*="search"]'
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

    // Add to commonAttributePatterns
const radioSpecificPatterns = [
    // Radio specific attribute patterns
    `${locatorType}[type="radio"][name="availability-selection"]`,
    `${locatorType}.c-radio-input[type="radio"]`,
    `${locatorType}[type="radio"][class*="c-radio-input"]`,
    
    // Position based patterns
    `${locatorType}[type="radio"]:nth-child(${searchText})`,
    `${locatorType}.c-radio-input[type="radio"]:nth-child(${searchText})`,
    
    // Complex attribute combinations
    `${locatorType}.c-radio-input.appearance-none[type="radio"][name="availability-selection"]`,
    
    // Parent based patterns
    `div:has(> ${locatorType}[type="radio"]:nth-child(${searchText}))`,
    `label:has(> ${locatorType}[type="radio"]:nth-child(${searchText}))`
];


    // Common attribute patterns
    const commonAttributePatterns = [
        // Generic attribute name patterns
        `${locatorType}[(name|id|label|aria-label|)="${searchText}"]`,
        `${locatorType}[(name|id|label|aria-label)*="${searchText}"]`,
        // Data attributes
        `${locatorType}[data-*="${searchText}"]`,
        `${locatorType}[(data-test|data-testid|data-cy|data-automation)="${searchText}"]`,
        // ARIA attributes
        `${locatorType}[(aria-describedby|aria-label|aria-labelledby|aria-controls)*="${searchText}"]`,
        // Common UI attributes
        `${locatorType}[(title|alt|placeholder|value|type)*="${searchText}"]`
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
            // Button variations
            `button:text-matches("${searchText}", "i")`,
            `button[(type|name|id|aria-label)*="${searchText}"]`,
            // Input buttons
            `input[type="button"][(value|name|id)*="${searchText}"]`,
            `input[type="submit"][(value|name|id)*="${searchText}"]`,
            // Role-based buttons
            `[role="button"]:text-matches("${searchText}", "i")`,
            // Links that act as buttons
            `a:text-matches("${searchText}", "i")`,
            `a[(href|title|aria-label)*="${searchText}"]`
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
            // Text content
            `div:text-matches("${searchText}", "i")`,
            // Common attributes
            `div[(class|id|role|aria-label)*="${searchText}"]`,
            // Nested text
            `div:has(text="${searchText}")`,
            // Role-based
            `div[role][(aria-label|title)*="${searchText}"]`
        ],
        span: [
            // Text content
            `span:text-matches("${searchText}", "i")`,
            // Common attributes
            `span[(class|id|role|aria-label)*="${searchText}"]`,
            // Role-based
            `span[role][(aria-label|title)*="${searchText}"]`
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

    // Add these patterns to allSelectors
    let allSelectors = [
        ...commonAttributePatterns,
        ...(elementSpecificSelectors[locatorType] || []),
        ...frameworkPatterns,
        ...universalEcommercePatterns,
        ...additionalPatterns,
        ...radioSpecificPatterns
    ];

    // Try each selector
    for (const selector of allSelectors) {
        try {
            const element = page.locator(selector);
            const count = await element.count();
            if (count > 0) {
                const isVisible = await element.first().isVisible().catch(() => false);
                if (isVisible) {
                    console.log(`✅ Found ${locatorType} (type: ${searchText}) using: ${selector}`);
                    return element;
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
        console.log(`❌ No element found for ${locatorType} (type: ${inputType}): ${searchText}`);
    }

    return null;
}

// async function trySelectors(context, selectors) {
//     for (const selector of selectors) {
//         try {
//             const element = context.locator(selector);
//             const isVisible = await element.isVisible().catch(() => false);
//             if (isVisible) {
//                 console.log(`✅ Found element in ${context === page ? 'main frame' : 'iframe'}`);
//                 return element;
//             }
//         } catch (error) {
//             continue;
//         }
//     }
//     return null;
// }

async function handleElementAction(page, step, actionType, test) {
    return await test.step(`Locating ${step.locatorType}: "${step.locator}"`, async () => {
        try {
            await test.step(`Attempting Playwright selectors`, async () => {
                const element = await getCommonLocators(page, step);

                if (element) {
                    try {
                        await element.waitFor({ state: 'visible', timeout: 5000 });

                        // Add Playwright location details
                        test.info().attachments.push({
                            name: 'Playwright Location Details',
                            contentType: 'application/json',
                            body: Buffer.from(JSON.stringify({
                                executionMethod: 'Playwright',
                                elementType: step.locatorType,
                                locator: step.locator,
                                selector: await element.evaluate(el => el.outerHTML),
                                timestamp: new Date().toISOString()
                            }, null, 2))
                        });

                        return element; // Simply return the element if found
                    } catch (error) {
                        await test.step(`⚠️ Element found but not visible: ${error.message}`, async () => { });
                        return null;
                    }
                }

                await test.step(`⚠️ No element found with Playwright selectors`, async () => { });
                return null;
            });
        } catch (error) {
            await test.step(`❌ Error in Playwright execution: ${error.message}`, async () => { });
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


module.exports = {
    getListValues,
    getCommonLocators,
    handleElementAction,
    getSuffix,
    getElementText,
    getValueFromParser
};