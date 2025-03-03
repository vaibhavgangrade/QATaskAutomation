import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export function readExcelFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Excel file not found at: ${filePath}`);
        }

        const workbook = XLSX.readFile(filePath);

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel file contains no sheets');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (!data || data.length === 0) {
            throw new Error('No data found in Excel sheet');
        }

        return data;
    } catch (error) {
        console.error('Error reading Excel file:', error);
        throw error;
    }
}

export function convertToAiCommand(step) {
    try {
        const action = step.action?.toLowerCase() || '';
        const locator = step.locator || '';
        const value = step.value || '';

        if (!action || !locator) {
            throw new Error('Invalid step: missing action or locator');
        }
        switch (action) {
            case 'click':
                return `Click on the "${locator}"`;
            case 'nclick':
                return `Click on the ${value} web element whose text as "${locator}"`;
            case 'type':
                return `Enter '${value}' in the "${locator}"`;
            case 'select':
                return `Select '${value}' from the element with id or aria-label or name or placeholder or class or label with text as "${locator}"`;
            case 'selectvalue':
                return `ai("Click the dropdown or combo box labeled '${locator}', then select the option '${value}'")`;
            case 'hover':
                return `Hover over the element containing text as "${locator}"`;
            case 'press':
                return `Press ${value} in the element containing text as "${locator}"`;
            case 'pressto':
                return `Press ${value} web element whose text as "${locator}"`;
            case 'scroll':
                if (value.toLowerCase() === 'up') {
                    return `scroll up until you find the element containing text as "${locator}"`;
                } else if (value.toLowerCase() === 'down') {
                    return `scroll down until you find the element containing text as "${locator}"`;
                } else {
                    return `Scroll to the "${locator}"`;
                }    
            case 'verify':
                return `Verify that the element containing text as "${locator}" contains '${value}'`;
            case 'waitfortext':
                return `Wait for any button or element containing "${locator}" to appear as visible`;
            case 'findlocator':
                return `Look for the web element "${locator}" text containing '${value} and click it'`;
            case 'stype':
                if (locator.toLowerCase().includes('search')) {
                    return `Look for a search box or search button at the top of the page. Click it to open or activate the search input. Once the search input is visible and active, carefully type "${value}" into it`;
                }
            case 'dismissmodal':
                return `Look for and close "${locator}" modal popup using common close patterns like X button, close button, or by pressing Escape key`;
            case 'devtools':
                return `got otDevTools and click to the "${locator}" tab in DevTools`;
            default:
                return `${action} ${locator} ${value}`.trim();
        }
    }
    catch (error) {
        console.error('Error converting to AI command:', error);
        throw new Error(`Failed to convert step to AI command: ${error.message}`);
    }
}

export function getValueFromJson(filePath, jsonPath) {
    try {
        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
            return null;
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log(`File doesn't exist: ${filePath}`);
            return null;
        }

        // Read and parse JSON file
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Split the path into parts
        const parts = jsonPath.split('.');
        let value = jsonData;
        
        // Navigate through the object
        for (const part of parts) {
            // Handle array indices
            if (part.includes('[') && part.includes(']')) {
                const [arrayName, indexStr] = part.split('[');
                const index = parseInt(indexStr.replace(']', ''));
                value = value[arrayName][index];
            } else {
                value = value?.[part];
            }
            
            if (value === undefined) {
                console.log(`Path ${jsonPath} not found in JSON`);
                return null;
            }
        }
        
        return value;
    } catch (error) {
        console.error(`Error reading value at path ${jsonPath}:`, error);
        return null;
    }
}