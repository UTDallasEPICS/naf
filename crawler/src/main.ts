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

  // Configure search parameters
  const query = 'site:linkedin.com/in "NAFTrack"';
  const pageSize = 10; // maximum allowed per request
  const totalResults = 10; // desired total results
  const pages = Math.ceil(totalResults / pageSize);
  let allItems: GoogleApiItem[] = [];

  // Configure Chrome WebDriver
  const chromeOptions = new Options();
  chromeOptions.addArguments(
    // Comment out headless mode for debugging if needed
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    // Additional options to make LinkedIn more likely to work
    '--disable-blink-features=AutomationControlled',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Create WebDriver
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    // Set up LinkedIn scraper
    const scraper = new LinkedInScraper(driver);
    
    console.log(`Starting search for: ${query}`);
    
    // First, get search results using Google API
    for (let i = 0; i < pages; i++) {
      // The start parameter is 1-indexed: 1, 11, 21, etc.
      const start = i * pageSize + 1;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${srchID}&q=${encodeURIComponent(query)}&num=${pageSize}&start=${start}`;

      console.log(`Fetching search results page ${i + 1}, starting at result ${start}...`);

      // Use executeAsyncScript to run fetch inside the browser context
      const data = await driver.executeAsyncScript(function(url: any, callback: any) {
        fetch(url)
          .then((response: any) => response.json())
          .then((result: any) => callback(result))
          .catch((error: any) => callback({ error: error.toString() }));
      }, url) as unknown as GoogleApiResponse;

      if (data.error) {
        console.error('Error on page starting at', start, ':', data.error);
        continue; // or break if you want to stop on error
      }

      if (data.items && data.items.length > 0) {
        allItems = allItems.concat(data.items);
        console.log(`Found ${data.items.length} results on this page.`);
      } else {
        console.log('No results found on page starting at', start);
      }

      // Wait a little bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (allItems.length > 0) {
      console.log(`\nFound ${allItems.length} total results. Starting profile processing...`);
      
      // First, visit the search page so we can "go back" to it
      // We simulate a Google search page as our reference to return to
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      await driver.get(googleSearchUrl);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Let page load
      
      // Process all LinkedIn profiles found
      const accessedProfiles = await scraper.processProfiles(allItems, googleSearchUrl);
      
      console.log(`\nSuccessfully accessed ${accessedProfiles.length} out of ${allItems.length} profiles.`);
      
      // Display summary of accessed profiles
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

// Execute the main function
searchAndAccessLinkedInProfiles().catch(console.error);