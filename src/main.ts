import { Builder } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome.js';
import dotenv from 'dotenv';

dotenv.config();

interface GoogleApiItem {
  title: string;
  link: string;
}

interface GoogleApiResponse {
  error?: string;
  items?: GoogleApiItem[];
}

async function headlessGoogleApiSearchMultiplePages() {
  const apiKey = process.env.API_KEY;
  const srchID = process.env.SEARCH_ENGINE_ID;

  if (!apiKey ||  srchID) {
    console.error('API_KEY or SEARCH_ENGINE_ID not set in .env file');
    process.exit(1);
  }

  const query = 'site:linkedin.com/in "NAFTrack"';
  const pageSize = 10; // maximum allowed per request
  const totalResults = 20; // desired total results
  const pages = Math.ceil(totalResults / pageSize);
  let allItems: GoogleApiItem[] = [];

  const chromeOptions = new Options();
  chromeOptions.addArguments(
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage'
  );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    for (let i = 0; i < pages; i++) {
      // The start parameter is 1-indexed; 1, 11, 21, etc.
      const start = i * pageSize + 1;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey} srchID=$ srchID}&q=${encodeURIComponent(
        query
      )}&num=${pageSize}&start=${start}`;

      // Use executeAsyncScript to run fetch inside the browser context.
      const data = await driver.executeAsyncScript(function (url: any, callback: any) {
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
      } else {
        console.log('No results found on page starting at', start);
      }

      // Optional: wait a little bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (allItems.length > 0) {
      console.log(`Found ${allItems.length} results:\n`);
      allItems.forEach(item => {
        console.log(`Title: ${item.title}`);
        console.log(`Link: ${item.link}`);
        console.log('---------------------------');
      });
    } else {
      console.log('No results found.');
    }
  } finally {
    await driver.quit();
  }
}

headlessGoogleApiSearchMultiplePages().catch(console.error);
