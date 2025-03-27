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

    console.log(`🔍 Searching for ${locatorType} with text/attribute: "${searchText}"`);

    // Base selectors that work for all element types
    const baseSelectors = [
        `${locatorType}:has-text("${searchText}")`,
        `${locatorType}:text("${searchText}")`,
        `${locatorType}[aria-label="${searchText}"]`,
        `${locatorType}[aria-label*="${searchText}"]`,
        `${locatorType}[data-testid*="${searchText}"]`,
        `${locatorType}[data-test*="${searchText}"]`,
        `${locatorType}[data-cy*="${searchText}"]`,
        `${locatorType}[id*="${searchText}"]`,
        `${locatorType}[name="${searchText}"]`
    ];

    // Element-specific selector strategies
    const elementSpecificSelectors = {
        button: [
            `button:has-text("${searchText}")`,
            `button[type="submit"]:has-text("${searchText}")`,
            `button[type="button"]:has-text("${searchText}")`,
            `input[type="button"][value*="${searchText}"]`,
            `input[type="submit"][value*="${searchText}"]`,
            `a:has-text("${searchText}")`,
            `[role="button"]:has-text("${searchText}")`
        ],
        input: [
            `input[placeholder="${searchText}"]`,
            `input[placeholder*="${searchText}"]`,
            `input[type="text"][placeholder*="${searchText}"]`,
            `input[name="${searchText}"]`,
            `textarea[placeholder*="${searchText}"]`,
            `label:has-text("${searchText}") + input`,
            `label:has-text("${searchText}") ~ input`,
            `[role="textbox"][aria-label*="${searchText}"]`
        ],
        select: [
            `select[name="${searchText}"]`,
            `select[aria-label*="${searchText}"]`,
            `label:has-text("${searchText}") + select`,
            `[role="combobox"][aria-label*="${searchText}"]`
        ],
        checkbox: [
            `input[type="checkbox"][name="${searchText}"]`,
            `label:has-text("${searchText}") input[type="checkbox"]`,
            `[role="checkbox"]:has-text("${searchText}")`
        ],
        radio: [
            `input[type="radio"][name="${searchText}"]`,
            `label:has-text("${searchText}") input[type="radio"]`,
            `[role="radio"]:has-text("${searchText}")`
        ],
        link: [
            `a:has-text("${searchText}")`,
            `a[href*="${searchText}"]`,
            `[role="link"]:has-text("${searchText}")`
        ],
        image: [
            `img[alt="${searchText}"]`,
            `img[src*="${searchText}"]`,
            `[role="img"][aria-label*="${searchText}"]`
        ],
        div: [
            `div:has-text("${searchText}")`,
            `div[class*="${searchText}"]`,
            `div[id*="${searchText}"]`
        ],
        span: [
            `span:has-text("${searchText}")`,
            `span[class*="${searchText}"]`,
            `span[id*="${searchText}"]`
        ],
        label: [
            `label:has-text("${searchText}")`,
            `[role="label"]:has-text("${searchText}")`
            `[role="label"][aria-label*="${searchText}"]`
        ],
        table: [
            `table[aria-label*="${searchText}"]`,
            `th:has-text("${searchText}")`,
            `td:has-text("${searchText}")`,
            `[role="grid"][aria-label*="${searchText}"]`
        ],
        dropdown: [
            `select[name="${searchText}"]`,
            `[role="combobox"][aria-label*="${searchText}"]`,
            `[role="listbox"][aria-label*="${searchText}"]`,
            `.dropdown:has-text("${searchText}")`
            `[role="combobox"][aria-label*="${searchText}"]`
        ]
    };

    // Framework-specific selectors
    const frameworkSelectors = [
        // Angular
        `[ng-model="${searchText}"]`,
        `[ng-bind="${searchText}"]`,
        // React
        `[data-reactid*="${searchText}"]`,
        // Vue
        `[v-model="${searchText}"]`,
        // Common UI libraries
        `[class*="MuiButton"][aria-label*="${searchText}"]`, // Material-UI
        `[class*="ant-"][aria-label*="${searchText}"]`, // Ant Design
        `[class*="chakra-"][aria-label*="${searchText}"]` // Chakra UI
    ];

    // Combine all relevant selectors
    let allSelectors = [...baseSelectors];

    // Add element-specific selectors if available
    if (elementSpecificSelectors[locatorType]) {
        allSelectors = [...allSelectors, ...elementSpecificSelectors[locatorType]];
    }

    // Add framework selectors
    allSelectors = [...allSelectors, ...frameworkSelectors];

    // Try each selector strategy
    for (const selector of allSelectors) {
        try {
            const locator = page.locator(selector);
            const count = await locator.count();
            if (count > 0) {
                const isVisible = await locator.first().isVisible().catch(() => false);
                if (isVisible) {
                    console.log(`✅ Found ${locatorType} element using selector: ${selector}`);
                    return locator.first();
                }
            }
        } catch (error) {
            continue;
        }
    }

    // If no element found with specific selectors, try generic text search
    try {
        const genericSelector = `:text("${searchText}")`;
        const element = page.locator(genericSelector);
        const isVisible = await element.first().isVisible().catch(() => false);
        if (isVisible) {
            console.log(`⚠️ Found element using generic text selector: ${genericSelector}`);
            return element.first();
        }
    } catch (error) {
        console.log(`❌ No element found for ${locatorType}: ${searchText}`);
    }

    return null;
}

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

module.exports = {
    getListValues,
    getCommonLocators,
    handleElementAction
};