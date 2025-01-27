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
    const action = step.action.toLowerCase();
    const locator = step.locator;
    const value = step.value || '';

    switch (action) {
        case 'click':
            return `Click on the "${locator}"`;
        case 'type':
            return `Enter "${value}" in the ${locator}`;
        case 'select':
            return `Select "${value}" from the ${locator}`;
        case 'hover':
            return `Hover over the "${locator}"`;
        case 'press':
            return `Press ${value} in the "${locator}"`;
        case 'scroll':
            return `Scroll to the "${locator}"`;
        case 'verify':
            return `Verify that "${locator}" contains "${value}"`;
        default:
            return `${action} ${locator} ${value}`.trim();
    }
}