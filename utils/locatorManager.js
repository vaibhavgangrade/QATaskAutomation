import fs from 'fs';
import path from 'path';
import { retailerConfig } from '../config/retailers.js';

class LocatorManager {
    constructor() {
        this.parsers = {};
    }

    async extractLocators(parserName, key) {
        try {
            const retailer = process.env.RETAILER || 'amazon';
            const config = retailerConfig[retailer];
            const filePath = path.join(process.cwd(), 'reference-files', config.jsfile);
            console.log('Looking in file:', config.jsfile);
            
            const content = await fs.promises.readFile(filePath, 'utf8');
            console.log(`Searching for key: ${key} in parser: ${parserName}`);

            // Special handling for cart-related keys
            const cartKeys = ['items', 'discounts', 'sales_tax', 'shipping_amount', 'cart_total'];
            if (cartKeys.includes(key)) {
                console.log(`🛒 Extracting cart-specific locator for ${key}`);
            }

            // First try to find function-based parser (like firstNameMobile2Parser)
            const functionPattern = new RegExp(`function\\s+${parserName}\\s*\\([^)]*\\)\\s*{([^}]*)}`, 's');
            const functionMatch = content.match(functionPattern);

            if (functionMatch) {
                const functionBody = functionMatch[1];
                
                // First try to find chained querySelector patterns
                const chainedPattern = /querySelector\(['"](.[^'"]+)['"]\)\.querySelector\(['"](.[^'"]+)['"]\)/g;
                const chainedMatch = chainedPattern.exec(functionBody);
                
                if (chainedMatch) {
                    // For chained selectors like .querySelector('.a-section').querySelector('#deliver-to-customer-text')
                    const selector1 = chainedMatch[1];
                    const selector2 = chainedMatch[2];
                    const combinedSelector = `${selector1} ${selector2}`;
                    
                    if (!this.parsers[parserName]) {
                        this.parsers[parserName] = {};
                    }
                    this.parsers[parserName][key] = combinedSelector;
                    console.log(`✅ Found chained selectors in ${parserName}:`, combinedSelector);
                    return combinedSelector;
                }

                // If no chained selectors, try individual querySelector patterns
                const querySelectorPattern = /querySelector\(['"](.[^'"]+)['"]\)/g;
                const selectors = [];
                let match;
                
                while ((match = querySelectorPattern.exec(functionBody)) !== null) {
                    selectors.push(match[1]);
                }

                if (selectors.length > 0) {
                    const selector = selectors.join(' ');
                    if (!this.parsers[parserName]) {
                        this.parsers[parserName] = {};
                    }
                    this.parsers[parserName][key] = selector;
                    console.log(`✅ Found function parser locator in ${parserName}:`, selector);
                    return selector;
                }
            }

            // If no function parser found, try object-based parsers
            const parserRegexes = [
                // For all retailer js standard format
                new RegExp(`const\\s+${parserName}\\s*=\\s*{([^}]*?)}`, 's'),
                // For object property format
                new RegExp(`${parserName}:\\s*{([^}]*?)}`, 's'),
                // For export format
                new RegExp(`export\\s+const\\s+${parserName}\\s*=\\s*{([^}]*?)}`, 's')
            ];

            let parserContent = null;
            for (const regex of parserRegexes) {
                const match = content.match(regex);
                if (match) {
                    parserContent = match[1];
                    break;
                }
            }

            if (!parserContent) {
                // Only throw error if we haven't found a function parser
                if (!functionMatch) {
                    throw new Error(`Parser ${parserName} not found in file`);
                }
                return null;
            }

            // Different patterns for locator definitions
            const locatorPatterns = [
                // For bluenile.js format with backticks
                new RegExp(`${key}:\\s*constructParser\\(\\s*"${key}",\\s*\`([^\`]+)\``, 'g'),
                // For amazon.js format with quotes
                new RegExp(`${key}:\\s*constructParser\\(\\s*"${key}",\\s*"([^"]+)"`, 'g'),
                // For simple constructParser format
                new RegExp(`${key}:\\s*constructParser\\(\\s*"${key}"\\s*,\\s*['"\`]([^'"\`]+)['"\`]`, 'g'),
                // For constructParser with additional parameters
                new RegExp(`${key}:\\s*constructParser\\([^,]*,\\s*['"\`]([^'"\`]+)['"\`]`, 'g')
            ];

            for (const pattern of locatorPatterns) {
                const match = pattern.exec(parserContent);
                if (match) {
                    const selector = match[1].trim();
                    if (selector) {
                        if (!this.parsers[parserName]) {
                            this.parsers[parserName] = {};
                        }
                        this.parsers[parserName][key] = selector;
                        console.log(`✅ Found locator in ${parserName} for ${key}:`, selector);
                        return selector;
                    }
                }
            }

            console.warn(`❌ No locator found for key: ${key} in parser: ${parserName}`);
            console.warn('Available content:', parserContent);
            return null;

        } catch (error) {
            console.error(`Failed to extract locator for ${parserName}.${key}:`, error);
            throw error;
        }
    }

    async getLocator(parserName, key) {
        if (!parserName || !key) {
            throw new Error(`Invalid parameters: parserName and key are required. Got parserName=${parserName}, key=${key}`);
        }

        console.log(`Getting locator for key: ${key} from parser: ${parserName}`);
        
        // Check if we already have this parser and key cached
        if (this.parsers[parserName]?.[key]) {
            console.log('Found cached locator:', this.parsers[parserName][key]);
            return this.parsers[parserName][key];
        }

        // Otherwise, extract it from the file
        const locator = await this.extractLocators(parserName, key);
        if (!locator) {
            throw new Error(`No locator found for parser: ${parserName}, key: ${key}`);
        }
        return locator;
    }

    getAllLocators() {
        return this.parsers;
    }
}

export const locatorManager = new LocatorManager();