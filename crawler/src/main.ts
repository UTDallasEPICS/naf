// import { Builder } from 'selenium-webdriver';
// import { Options } from 'selenium-webdriver/chrome.js';
import puppeteer, { VanillaPuppeteer } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
import { LinkedInScraper } from './linkedinScraper.js';
import { convertNewHtmlFiles } from './html_json.js'; // Import the batch conversion function

// Load environment variables.
console.log(dotenv.config());
// console.log(' .env file: ' + JSON.stringify(process.env))

//Set Puppeteer to stealth mode
puppeteer.use(StealthPlugin());

// Define TypeScript interfaces for Google API data structures.
interface GoogleApiItem {
  title: string;
  link: string;
}
interface GoogleApiResponse {
  error?: string;
  items?: GoogleApiItem[];
}

// Main function definition.
async function searchAndAccessLinkedInProfiles() {
  // Get API credentials from environment.
  const apiKey = process.env.API_KEY;
  const srchID = process.env.SEARCH_ENGINE_ID;

  // Validate essential configuration.
  if (!apiKey || !srchID) {
    console.error('API_KEY or SEARCH_ENGINE_ID not set in .env file');
    process.exit(1);
  }

  // Set search parameters.
  const query = 'site:linkedin.com/in "NAFTrack"';
  const pageSize = 10;
  const totalResultsTarget = 20;
  const pages = Math.ceil(totalResultsTarget / pageSize);
  let allItems: GoogleApiItem[] = [];

  // Configure Chrome options for WebDriver.
  // const chromeOptions = new Options();
  // chromeOptions.addArguments(
  //   '--headless=new',
  //   '--disable-gpu',
  //   '--no-sandbox',
  //   '--disable-dev-shm-usage',
  //   '--disable-blink-features=AutomationControlled',
  //   '--window-size=1920,1080',
  //   '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
  // );
  // chromeOptions.setUserPreferences({
  //   'excludeSwitches': ['enable-automation'],
  //   'useAutomationExtension': false,
  //   'credentials_enable_service': false
  // });

  // Initialize Puppeteer Headless Browser.
  // const driver = await new Builder()
  //   .forBrowser('chrome')
  //   .setChromeOptions(chromeOptions)
  //   .build();
  // const browser = await puppeteer.launch({args: ["--no-sandbox", "--disable-setuid-sandbox"], headless: true, devtools: true})
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1920,1080",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  // Main execution block.
  try {
    // Modify browser properties to hide automation.
    // await driver.executeScript(`
    //   Object.defineProperty(navigator, 'webdriver', { get: () => false });
    //   window.navigator.chrome = { runtime: {} };
    //   if (window.navigator.permissions) {
    //     const originalQuery = window.navigator.permissions.query;
    //     window.navigator.permissions.query = (parameters) => (
    //       parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters)
    //     );
    //   }
    // `);
    
    // Initialize scraper.
    const page = await browser.newPage();
    const scraper = new LinkedInScraper(browser, page, 15, 2000); 
    await convertNewHtmlFiles(); // Process any existing HTML files first

    // Start search.
    console.log(`Starting search for: ${query}`);

    // Prepare indices for parallel page fetching.
    const pageIndices = Array.from({ length: pages }, (_, i) => i);

    // Map page indices to parallel search tasks, replicating original loop logic including delay.
    const searchPromises = pageIndices.map(async (i) => {
        let pageItems: GoogleApiItem[] = [];
        const start = i * pageSize + 1;
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${srchID}&q=${encodeURIComponent(query)}&num=${pageSize}&start=${start}`;

        console.log(`Fetching search results page ${i + 1}, starting at result ${start}...`);

        try {
             // Fetch results for one page via browser script.
            
            // const data = await driver.executeAsyncScript(function(urlToFetch: string, callback: (result: GoogleApiResponse) => void) {
            //     fetch(urlToFetch)
            //         .then(response => response.json())
            //         .then(result => callback(result as GoogleApiResponse))
            //         .catch(error => callback({ error: error.toString() }));
            // }, url) as GoogleApiResponse;
            // const page = await browser.newPage();
            const data = await page.evaluate(async (urlToFetch) => {
            try {
              const res = await fetch(urlToFetch);
              return await res.json();
            } catch (e) {
              return { error: String(e) };
            }
          }, url);


            // Handle response data or errors for the page.
            if (data.error) {
                console.error('Error on page starting at', start, ':', data.error);
            } else if (data.items && data.items.length > 0) {
                pageItems = data.items;
                console.log(`Found ${data.items.length} results on this page.`);
            } else {
                 console.log('No results found on page starting at', start);
            }
        } catch (taskError) {
             console.error(`Error during fetch task for page index ${i}:`, taskError);
        }

        // Apply delay within each task.
        const taskDelay = 1000 + Math.random() * 1000; // Delay between Google API calls
        await new Promise(resolve => setTimeout(resolve, taskDelay));
        return pageItems;
    });

    // Await completion of all parallel search tasks.
    const resultsFromPages = await Promise.all(searchPromises);
    console.log("Search phase complete.");

    // Consolidate results and enforce target limit.
    allItems = resultsFromPages.flat().slice(0, totalResultsTarget);

    // Process profiles if results were found.
    if (allItems.length > 0) {
      console.log(`\nFound ${allItems.length} total results. Starting profile processing...`);
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      // Navigate to Google search page (referer).
      // const page = await browser.newPage();
      page.goto(googleSearchUrl);

      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000)); // Wait after navigating

      // Initiate profile processing via the scraper.
      const accessedProfiles = await scraper.processProfiles(allItems, googleSearchUrl);
      console.log(`\nSuccessfully accessed ${accessedProfiles.length} out of ${allItems.length} profiles targeted.`);
      // Log successfully accessed profiles.
      accessedProfiles.forEach((url, index) => {
        console.log(`${index + 1}. Successfully accessed: ${url}`);
      });
    } else {
      console.log('No results found from Google Search.');
    }
  // Catch errors during main execution.
  } catch (error) {
    console.error('An error occurred during the process:', error);
  // Ensure browser closes properly.
  } finally {
    if (browser) { // Check if driver was successfully initialized
        await browser.close();
        console.log("Browser session ended.");
    } else {
        console.log("Driver not initialized, no browser session to end.");
    }
  }
}

// Execute the main function and catch any top-level errors.
searchAndAccessLinkedInProfiles().catch(console.error);
