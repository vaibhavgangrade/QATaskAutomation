import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export function readExcelFile(filePath) {
    try {
        // Validate file existence
        if (!fs.existsSync(filePath)) {
            throw new Error(`Excel file not found at: ${filePath}`);
        }

        // Read the Excel file
        const workbook = XLSX.readFile(filePath);
        
        // Validate workbook has sheets
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel file contains no sheets');
        }

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON with headers
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
            raw: true,
            defval: '',
            header: ['TestID', 'Enabled', 'action', 'locator', 'value', 'waitBefore', 'waitAfter']
        });

        // Validate data presence
        if (!rawData || rawData.length === 0) {
            throw new Error('No data found in Excel sheet');
        }

        // Remove header row if present
        if (rawData[0].TestID === 'TestID') {
            rawData.shift();
        }

        // Group steps by TestID
        const testCases = {};
        rawData.forEach(row => {
            // Skip empty rows
            if (!row.TestID || !row.action) {
                return;
            }

            const testId = row.TestID.trim();
            const isEnabled = (row.Enabled || '').toLowerCase() === 'yes';

            // Only process enabled test cases
            if (isEnabled) {
                // Initialize array for new test case
                if (!testCases[testId]) {
                    testCases[testId] = [];
                }

                // Add step to test case
                testCases[testId].push({
                    action: row.action?.trim(),
                    locator: row.locator?.trim(),
                    value: row.value?.toString().trim(),
                    waitBefore: parseInt(row.waitBefore) || 0,
                    waitAfter: parseInt(row.waitAfter) || 0
                });
            }
        });

        // Validate we have at least one test case
        if (Object.keys(testCases).length === 0) {
            throw new Error('No enabled test cases found in Excel file');
        }

        // Log test case information
        console.log('\nTest Cases loaded:');
        Object.entries(testCases).forEach(([testId, steps]) => {
            console.log(`\nTest Case ${testId}:`);
            console.log(`Total Steps: ${steps.length}`);
            console.log('Steps:', JSON.stringify(steps, null, 2));
        });

        return testCases;

    } catch (error) {
        console.error('Error reading Excel file:', error);
        console.error('File path:', filePath);
        throw new Error(`Failed to read Excel file: ${error.message}`);
    }
}

// Helper function to validate Excel data
function validateExcelData(data) {
    const requiredColumns = ['TestID', 'action', 'locator'];
    const errors = [];

    data.forEach((row, index) => {
        requiredColumns.forEach(column => {
            if (!row[column]) {
                errors.push(`Row ${index + 1}: Missing required column '${column}'`);
            }
        });

        // Validate waitBefore and waitAfter are numbers if present
        if (row.waitBefore && isNaN(parseInt(row.waitBefore))) {
            errors.push(`Row ${index + 1}: waitBefore must be a number`);
        }
        if (row.waitAfter && isNaN(parseInt(row.waitAfter))) {
            errors.push(`Row ${index + 1}: waitAfter must be a number`);
        }
    });

    if (errors.length > 0) {
        throw new Error('Excel validation errors:\n' + errors.join('\n'));
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
                    return `Scroll to the element containing text or text as "${locator}" on page`;
                }    
            case 'verify':
                return `Verify that the element containing text as "${locator}" contains '${value}'`;
            case 'waitfortext':
                return `Wait for the text "${locator}" present on the page`;
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