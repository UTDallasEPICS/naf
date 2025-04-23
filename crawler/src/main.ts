import { Builder } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome.js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import { LinkedInScraper } from './linkedinScraper.js';

// Load environment variables.
dotenv.config();

interface GoogleApiItem {
  title: string;
  link: string;
}

interface GoogleApiResponse {
  error?: string;
  items?: GoogleApiItem[];
}

async function searchAndAccessLinkedInProfiles() {
  const apiKey = process.env.API_KEY;
  const srchID = process.env.SEARCH_ENGINE_ID;

  if (!apiKey || !srchID) {
    console.error('API_KEY or SEARCH_ENGINE_ID not set in .env file');
    process.exit(1);
  }

  // Read academies from academies.txt
  const academies = fs.readFileSync('academies.txt', 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const pageSize = 10;
  const totalResultsTarget = 20;
  const pages = Math.ceil(totalResultsTarget / pageSize);

  const chromeOptions = new Options();
  chromeOptions.addArguments(
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1920,1080',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
  );
  chromeOptions.setUserPreferences({
    'excludeSwitches': ['enable-automation'],
    'useAutomationExtension': false,
    'credentials_enable_service': false
  });

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    // Hide automation
    await driver.executeScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.navigator.chrome = { runtime: {} };
      if (window.navigator.permissions) {
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters)
        );
      }
    `);

    const scraper = new LinkedInScraper(driver, 15, 2000);

    // Iterate through academies
    for (const academy of academies) {
      const query = `site:linkedin.com/in "NAFTrack" "${academy}"`;
      console.log(`\n=== Processing academy: ${academy} ===`);

      const pageIndices = Array.from({ length: pages }, (_, i) => i);

      const searchPromises = pageIndices.map(async (i) => {
        let pageItems: GoogleApiItem[] = [];
        const start = i * pageSize + 1;
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${srchID}&q=${encodeURIComponent(query)}&num=${pageSize}&start=${start}`;
        console.log(`Fetching search results page ${i + 1}, starting at result ${start}...`);
        try {
          const data = await driver.executeAsyncScript(function(urlToFetch: string, callback: (result: GoogleApiResponse) => void) {
            fetch(urlToFetch)
              .then(response => response.json())
              .then(result => callback(result as GoogleApiResponse))
              .catch(error => callback({ error: error.toString() }));
          }, url) as GoogleApiResponse;
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
        const taskDelay = 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, taskDelay));
        return pageItems;
      });

      const resultsFromPages = await Promise.all(searchPromises);
      let allItems = resultsFromPages.flat().slice(0, totalResultsTarget);

      if (allItems.length > 0) {
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await driver.get(googleSearchUrl);
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
        const accessedProfiles = await scraper.processProfiles(allItems, googleSearchUrl);
        console.log(`\nSuccessfully accessed ${accessedProfiles.length} out of ${allItems.length} profiles for academy: ${academy}.`);
        accessedProfiles.forEach((url, index) => {
          console.log(`${index + 1}. Successfully accessed: ${url}`);
        });
      } else {
        console.log(`No results found for academy: ${academy}.`);
      }
    }
  } catch (error) {
    console.error('An error occurred during the process:', error);
  } finally {
    await driver.quit();
    console.log("Browser session ended.");
  }
}

searchAndAccessLinkedInProfiles().catch(console.error);
