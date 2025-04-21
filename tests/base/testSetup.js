import { readExcelFile } from '../../utils/excelReader';
import path from 'path';
import fs from 'fs';
import { ActionHelper } from '../../utils/actionHelper.js';

export async function setupTestData() {
    let testSteps;
    const excelPath = path.join(__dirname, '../../testData/bluenile.xlsx');

    // Check if file exists before trying to read it
    if (!fs.existsSync(excelPath)) {
        console.error(`Excel file not found at: ${excelPath}`);
        throw new Error(`Excel file not found at: ${excelPath}`);
    }

    console.log(`Reading Excel file from: ${excelPath}`);
    testSteps = readExcelFile(excelPath);
    console.log(`Successfully loaded ${testSteps.length} steps from Excel`);

    if (testSteps.length > 0) {
        console.log('Sample step:', testSteps[0]);
    }

    // Create a new instance of ActionHelper
    const actionHelper = new ActionHelper();

    return { testSteps, actionHelper };
}