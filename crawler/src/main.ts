import { Builder } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome.js';
import dotenv from 'dotenv';
import { LinkedInScraper } from './linkedinScraper.js';

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
  const srchID = process.env.SEARCH_ENGINE_ID; // cx
  
  if (!apiKey || !srchID) {
    console.error('API_KEY or SEARCH_ENGINE_ID not set in .env file');
    process.exit(1);
  }

  const query = 'site:linkedin.com/in "NAFTrack"';
  const pageSize = 10;
  const totalResults = 10;
  const pages = Math.ceil(totalResults / pageSize);
  let allItems: GoogleApiItem[] = [];
  
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
    await driver.executeScript(`
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
      window.navigator.chrome = {
        runtime: {}
      };
      if (window.navigator.permissions) {
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
        );
      }
    `);

    const scraper = new LinkedInScraper(driver, 15, 2000);
    console.log(`Starting search for: ${query}`);

    for (let i = 0; i < pages; i++) {
      const start = i * pageSize + 1;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${srchID}&q=${encodeURIComponent(query)}&num=${pageSize}&start=${start}`;
      
      console.log(`Fetching search results page ${i + 1}, starting at result ${start}...`);
      
      const data = await driver.executeAsyncScript(function(url: any, callback: any) {
        fetch(url)
          .then((response: any) => response.json())
          .then((result: any) => callback(result))
          .catch((error: any) => callback({ error: error.toString() }));
      }, url) as unknown as GoogleApiResponse;
      
      if (data.error) {
        console.error('Error on page starting at', start, ':', data.error);
        continue;
      }
      
      if (data.items && data.items.length > 0) {
        allItems = allItems.concat(data.items);
        console.log(`Found ${data.items.length} results on this page.`);
      } else {
        console.log('No results found on page starting at', start);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    }

    if (allItems.length > 0) {
      console.log(`\nFound ${allItems.length} total results. Starting profile processing...`);
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      await driver.get(googleSearchUrl);
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
      
      const accessedProfiles = await scraper.processProfiles(allItems, googleSearchUrl);
      console.log(`\nSuccessfully accessed ${accessedProfiles.length} out of ${allItems.length} profiles.`);
      accessedProfiles.forEach((url, index) => {
        console.log(`${index + 1}. Successfully accessed: ${url}`);
      });
    } else {
      console.log('No results found.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await driver.quit();
  }
}

searchAndAccessLinkedInProfiles().catch(console.error);
