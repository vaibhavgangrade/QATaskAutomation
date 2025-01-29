# AI-Powered Test Automation Framework (GenAI-QA)

# Introduction 
A robust test automation framework that combines Playwright with AI capabilities for reliable and flexible web testing. This framework uses Excel files for test data management and includes special handling for complex UI interactions.

## Features
- AI-powered element detection and interaction
- Excel-based test data management
- Retry mechanisms for flaky tests
- Shadow DOM support
- Complex UI element handling
- Detailed error reporting

## Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Microsoft Excel (for test data files)

## Installation
1. Clone the repository:
git clone <repository-url>

## Install dependencies
- Playwright installation
npm init playwright@latest

- ZeroStep installation
npm i @zerostep/playwright -D

## Project Structure
├── tests/ # Test files
├── utils/ # Utility functions
│ ├── excelReader.js # Excel file handling and AI command function
│ ├── initialBrowserSetup.js # Bot detection
│ └── testHelper.js # Working on it
├── test-data/ # Excel test data files
└── playwright.config.js # Playwright configuration
└── zerostep.config.json # Store ZeroStep key

### Running Tests
Go to terminal in your IDE (VS-Code) and write following command
npx playwright tesr

#### Basic Actions
- `click`: Click on any element
- `type`: Enter text into input fields
- `select`: Select from dropdown
- `hover`: Hover over elements
- `verify`: Verify element content
- 'waitfortext' : wait until text visible on dom
- 'scroll' : scroll to element, along with added up and down actions to scroll
- 'waitBefore' : wait for provived timeout before element visibility
- 'waitAfter': wait for provived timeout after element visibility

#### Special Actions
- `press`: press on element with keyboard key
- `pressto`: press on an element (will work on it to improve it's functionality)
- `inputclick`: Click input elements
- `scrollto`: Scroll to a specific locator (using playwright techniques here)
- `nclick`: Click nth occurrence of an element
-- Other actions we have added but these are under development, will release in next release


## Best Practices
1. **Test Data Management**
   - Keep test data in Excel files
   - Use clear, descriptive locators

2. **Error Handling**
   - Use retry mechanisms for flaky elements
   - Add appropriate wait times
   - Include detailed error messages

3. **Maintenance**
   - Regular updates of dependencies
   - Review and update test data
   - Monitor test execution logs

4. **Improvements -- In near future**
   - Regular updates of handling different types of locators
   - Execute multiple test cases from this framework
   - Handling of unexpected popups during execution
   - Bypass the current execution if intermittent element is not showing during execution
   -- Other actions we have added but these are under development, will release in next release

# Contribute
QA member can take a clone of this reprository and implement it in your daily QA activities. Wherever you get difficulties, then add a solution for same and contribute to make it a better QA automation framework.

## License
This project is licensed under the Codvo.ai. Contact to admin for the details.