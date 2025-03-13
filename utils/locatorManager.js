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

            // Find all possible parser objects
            const parserRegexes = [
                // For both amazon.js and bluenile.js standard format
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
                throw new Error(`Parser ${parserName} not found in file`);
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
            console.error('Error during extraction:', error.message);
            throw error;
        }
    }

    async getLocator(parserName, key) {
        console.log(`Getting locator for key: ${key} from parser: ${parserName}`);
        
        // Check if we already have this parser and key cached
        if (this.parsers[parserName]?.[key]) {
            console.log('Found cached locator:', this.parsers[parserName][key]);
            return this.parsers[parserName][key];
        }

        // Otherwise, extract it from the file
        return await this.extractLocators(parserName, key);
    }

    getAllLocators() {
        return this.parsers;
    }
}

export const locatorManager = new LocatorManager();