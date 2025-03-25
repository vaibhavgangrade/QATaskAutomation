async function getListValues(page, locator) {
    try {
        const element = page.locator(locator);
        await expect(element).toBeVisible({ timeout: 5000 });

        // Get text content and split by newline
        const text = await element.textContent();
        const values = text.split('\n')
            .map(item => item.trim())
            .filter(item => item !== '');

        console.log(`Found ${values.length} items:`, values);
        return values;
    } catch (error) {
        console.error('Error getting list values:', error.message);
        throw error;
    }
}

async function getCommonLocators(page, step) {
    const searchText = step.locator?.toString().trim();
    const locatorType = step.locatorType?.toString().toLowerCase().trim();
    const inputType = step.value?.toString().toLowerCase().trim();

    console.log(`🔍 Searching for ${locatorType} with text/attribute: "${searchText}"`);

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

    // Combine all selectors with priority for type-specific patterns
    let allSelectors = [
        ...(inputType && inputTypePatterns[inputType] ? inputTypePatterns[inputType] : []),
        ...commonAttributePatterns,
        ...(elementSpecificSelectors[locatorType] || []),
        ...frameworkPatterns
    ];

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

module.exports = {
    getListValues,
    getCommonLocators,
    handleElementAction,
    getSuffix
};