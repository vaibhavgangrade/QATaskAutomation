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

<<<<<<< HEAD
        if (!action || !locator) {
            throw new Error('Invalid step: missing action or locator');
        }
        switch (action) {
            case 'click':
                return `Click the button or div or span or input with text" ${locator}"`;
            case 'nclick':
                return `Click the ${value} button or div or span or input with text "${locator}"`;
            case 'type':
                return `Type '${value}' into the field labeled "${locator}"`;
            case 'select':
                return `Select '${value}' from the element containing text "${locator}"`;
            case 'hover':
                return `Hover over the element containing text "${locator}"`;
            case 'press':
                return `Press ${value} in the element "${locator}"`;
            case 'pressto':
                return `Press ${value} "${locator}" on page`;
            case 'scroll':
                if (value.toLowerCase() === 'up') {
                    return `scroll up until you find the element containing text "${locator}"`;
                } else if (value.toLowerCase() === 'down') {
                    return `scroll down until you find the element containing text "${locator}"`;
                } else {
                    return `scroll until element containing text "${locator}" is visible`;
                }    
            case 'verify':
                return `Verify that the element containing text "${locator}" contains '${value}'`;
            case 'waitfortext':
                return `Wait for any button or element containing "${locator}" to appear as visible`;
            case 'findlocator':
                return `Look for elements with "${locator}" text containing '${value} and click it'`;
            case 'stype':
                if (locator.toLowerCase().includes('search')) {
                    return `Look for a search box or search button at the top of the page. Click it to open or activate the search input. Once the search input is visible and active, carefully type "${value}" into it`;
                }
            case 'dismissmodal':
                return `Look for and close "${locator}" modal popup using common close patterns like X button, close button, or by pressing Escape key`;
            default:
                return `${action} ${locator} ${value}`.trim();
        }
    }
    catch (error) {
        console.error('Error converting to AI command:', error);
        throw new Error(`Failed to convert step to AI command: ${error.message}`);
=======
    switch (action) {
        case 'click':
            return `Click on the element containing text "${locator}"`;
        case 'nclick':
            return `Click the ${value} "${locator}" text on the page`;
        case 'type':
            return `Type '${value}' into the field labeled ${locator}`;
        case 'select':
            return `Select '${value}' from the element containing text "${locator}"`;   
        case 'hover':
            return `Hover over the element containing text "${locator}"`;
        case 'press':
            return `Press '${value}' in the element "${locator}"`;
        case 'scroll':
            return `scroll until the element containing text "${locator}" is visible`;
        case 'verify':
            return `Verify that the element containing text "${locator}" contains '${value}'`;
        case 'waitfortext':
            return `Wait until the text "${locator}" becomes visible on the page`;
        case 'findlocator':
            return `Look for elements with "${locator}" text containing '${value} and click it'`;
        case 'stype':
            if (locator.toLowerCase().includes('search')) {
                return `Look for a search box or search button at the top of the page. Click it to open or activate the search input. Once the search input is visible and active, carefully type "${value}" into it`;
            }   
        default:
            return `${action} ${locator} ${value}`.trim();
>>>>>>> 556aab0990d0af230088553d82886a9c94ad0b9c
    }
}