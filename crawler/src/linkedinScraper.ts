import { WebDriver } from 'selenium-webdriver';
import * as fs from 'fs';
import * as path from 'path';
import { convertSingleFile } from './html_json.js';

// Define the LinkedInScraper class to encapsulate the scraping logic.
export class LinkedInScraper {
  // Declare private properties for the Selenium WebDriver instance, retry settings,
  // directory for saving pages, and a set to track accessed URLs.
  private driver: WebDriver;
  private maxRetries: number;
  private retryDelay: number;
  private pagesDir: string;
  private accessedUrls: Set<string>;

  // Constructor to initialize the scraper with a WebDriver instance and optional retry settings.
  // It also ensures the 'pages' directory exists for storing HTML files.
  constructor(driver: WebDriver, maxRetries = 10, retryDelay = 1000) {
    this.driver = driver;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.pagesDir = path.join(process.cwd(), 'pages'); // Define the path for saving HTML pages
    this.accessedUrls = new Set(); // Initialize a set to keep track of visited profile URLs

    // Check if the 'pages' directory exists, create it if it doesn't.
    if (!fs.existsSync(this.pagesDir)) {
      fs.mkdirSync(this.pagesDir, { recursive: true });
      console.log('Created "pages" directory for storing HTML files');
    }
  }

  // Private helper method to introduce a delay using Promises and setTimeout.
  // This is used to pause execution, mimicking human browsing behavior.
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Private helper method to save HTML content to a specified file.
  // Returns a Promise that resolves when the file is written or rejects on error.
  private async saveHtmlToFile(html: string, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const filePath = path.join(this.pagesDir, filename); // Construct the full file path
      // Write the HTML content to the file using UTF-8 encoding.
      fs.writeFile(filePath, html, 'utf8', (err) => {
        if (err) {
          reject(err); // Reject the promise if there's an error
        } else {
          resolve(); // Resolve the promise on successful write
        }
      });
    });
  }

  // Private method to check if the current page is a LinkedIn authentication wall or signup page.
  // It checks the URL and page source for specific indicators.
  private async isAuthwall(): Promise<boolean> {
    const currentUrl = await this.driver.getCurrentUrl(); // Get the current URL
    const pageSource = await this.driver.getPageSource(); // Get the full HTML source of the page
    // Return true if the URL or page source contains authwall/signup keywords.
    return currentUrl.includes('authwall') ||
           currentUrl.includes('signup') ||
           pageSource.includes('authwall') ||
           pageSource.includes('Sign in to continue to LinkedIn');
  }

  // Private method to simulate human-like interactions on the page.
  // Includes random scrolling and occasional mouse movements.
  private async simulateHumanBehavior(): Promise<void> {
    // Scroll down by a random amount.
    const scrollAmount = Math.floor(Math.random() * 500) + 100;
    await this.driver.executeScript(`window.scrollBy(0, ${scrollAmount});`);
    // Wait for a random short delay.
    const randomDelay = Math.floor(Math.random() * 1000) + 500;
    await this.delay(randomDelay);

    // Simulate a mouse move event occasionally (30% chance).
    if (Math.random() > 0.7) {
      const x = Math.floor(Math.random() * 500);
      const y = Math.floor(Math.random() * 500);
      // Execute JavaScript to dispatch a 'mousemove' event.
      await this.driver.executeScript(`
        const event = new MouseEvent('mousemove', {
          'view': window,
          'bubbles': true,
          'cancelable': true,
          'clientX': ${x},
          'clientY': ${y}
        });
        document.dispatchEvent(event);
      `);
    }
  }

  // Private method to manage cookies, specifically removing potential blocking/auth cookies
  // and ensuring the language cookie is set to English.
  private async manageCookies(): Promise<void> {
    const cookies = await this.driver.manage().getCookies(); // Get all cookies
    // Iterate through cookies and delete any LinkedIn auth/block related cookies.
    for (const cookie of cookies) {
      if (cookie.domain?.includes('linkedin.com') &&
          (cookie.name.includes('auth') || cookie.name.includes('block'))) {
        await this.driver.manage().deleteCookie(cookie.name);
      }
    }

    // Add/ensure the language cookie is set to English for consistency.
    await this.driver.manage().addCookie({
      name: 'lang',
      value: 'v=2&lang=en-us',
      domain: '.linkedin.com'
    });
  }

  // Private method to check if a profile's HTML has already been saved to disk.
  // It extracts the profile ID and checks if a file starting with that ID exists.
  private profileAlreadySaved(profileUrl: string): boolean {
    try {
      // Extract the unique profile identifier from the URL.
      const profileId = profileUrl.split('/in/')[1].split('/')[0].split('?')[0];

      // Read the contents of the pages directory.
      const files = fs.readdirSync(this.pagesDir);
      // Check if any file starts with the extracted profile ID.
      const isAlreadySaved = files.some(file => file.startsWith(`${profileId}_`));

      if (isAlreadySaved) {
        console.log(`Profile ${profileId} already saved to disk. Skipping.`);
      }

      return isAlreadySaved; // Return true if found, false otherwise
    } catch (error) {
      console.error(`Error checking if profile is saved: ${error}`);
      return false; // Return false in case of any error during the check
    }
  }

  // Public method to access a specific LinkedIn profile URL, attempting to bypass the authwall.
  // It uses various retry strategies and simulates human behavior.
  public async accessProfile(profileUrl: string, searchResultUrl: string): Promise<boolean> {

    // Skip if the URL has already been accessed in this session.
    if (this.accessedUrls.has(profileUrl)) {
      console.log(`Already accessed: ${profileUrl}. Skipping.`);
      return true;
    }

    // Skip if the profile HTML has already been saved in a previous run.
    if (this.profileAlreadySaved(profileUrl)) {
      this.accessedUrls.add(profileUrl); // Mark as accessed even if skipped due to prior save
      return true;
    }

    let attempts = 0;
    // Navigate initially via Google to potentially set better referrers/cookies.
    await this.driver.get('https://www.google.com/');
    await this.delay(1500 + Math.random() * 500); // Wait a bit
    // Use JavaScript to navigate to the profile URL.
    await this.driver.executeScript(`
      window.location.href = "${profileUrl}";
    `);
    console.log(`Trying to access: ${profileUrl}`);

    // Loop while the authwall is detected and retry attempts are within the limit.
    while (await this.isAuthwall() && attempts < this.maxRetries) {
      console.log(`Attempt ${attempts + 1}/${this.maxRetries}: Hit authwall, trying again...`);

      // Employ different navigation strategies based on the attempt number.
      if (attempts % 3 === 0) { // Strategy 1: Go back to search results, then open profile in same tab.
        await this.driver.get(searchResultUrl);
        await this.delay(this.retryDelay);
        await this.driver.executeScript(`window.open("${profileUrl}", "_self");`);
      } else if (attempts % 3 === 1) { // Strategy 2: Go to Google, manipulate history, then navigate.
        await this.driver.get('https://www.google.com/');
        await this.delay(this.retryDelay);
        await this.driver.executeScript(`
          history.pushState({}, '', '${searchResultUrl}');
          window.location.href = "${profileUrl}";
        `);
      } else { // Strategy 3: Go back to search results, wait slightly, then navigate.
        await this.driver.get(searchResultUrl);
        await this.delay(this.retryDelay);
        await this.driver.executeScript(`
          setTimeout(() => { window.location.href = "${profileUrl}"; }, 500);
        `);
        await this.delay(1000); // Extra delay after triggering navigation
      }

      // Manage cookies and simulate human behavior between attempts.
      await this.manageCookies();
      await this.simulateHumanBehavior();
      attempts++;
      await this.delay(this.retryDelay + Math.random() * 1000); // Wait before the next check/attempt
    }

    // Check if the authwall is still present after all retries.
    if (await this.isAuthwall()) {
      console.log(`Failed to bypass authwall after ${this.maxRetries} attempts.`);
      return false; // Return false indicating failure
    }

    // Log success if the authwall was bypassed.
    console.log(`Successfully accessed profile after ${attempts} retry attempts.`);
    this.accessedUrls.add(profileUrl); // Add to the set of successfully accessed URLs

    // Try to save the HTML source of the successfully accessed profile page.
    try {
      await this.delay(2000 + Math.random() * 1000); // Wait for the page to potentially load fully
      await this.simulateHumanBehavior(); // Perform some actions before saving
      const pageSource = await this.driver.getPageSource(); // Get the final page source
      // Extract profile ID and create a timestamped filename.
      const profileId = profileUrl.split('/in/')[1].split('/')[0].split('?')[0];
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `${profileId}_${timestamp}.html`;
      // Save the HTML to the file.
      await this.saveHtmlToFile(pageSource, filename);
      console.log(`HTML saved to pages/${filename}`);
      // Trigger the conversion of the saved HTML to JSON.
      convertSingleFile(filename);
    } catch (error) {
      console.log("Error saving page HTML:", error);
      // Note: Access might have been successful, but saving failed. Still return true for access.
    }

    return true; // Return true indicating successful access (even if saving failed)
  }

  // Public method to iterate through a list of search results (profiles).
  // It calls accessProfile for each LinkedIn profile link found.
  public async processProfiles(searchResults: { title: string, link: string }[], searchResultUrl: string): Promise<string[]> {
    const accessedProfiles = []; // Array to store URLs of successfully accessed profiles

    // Loop through each search result object.
    for (const result of searchResults) {
      // Check if the link is a LinkedIn profile URL.
      if (result.link.includes('linkedin.com/in/')) {
        console.log(`\nProcessing profile: ${result.title}`);
        console.log(`URL: ${result.link}`);

        // Attempt to access the profile using the accessProfile method.
        const success = await this.accessProfile(result.link, searchResultUrl);
        if (success) {
          accessedProfiles.push(result.link); // Add to list if successful
          console.log(`Successfully accessed profile: ${result.title}`);
        } else {
          console.log(`Failed to access profile: ${result.title}`);
        }

        // Add a random delay between processing profiles to avoid rate limiting.
        const randomDelay = 3000 + Math.floor(Math.random() * 2000);
        await this.delay(randomDelay);
      }
    }

    return accessedProfiles; // Return the list of successfully accessed profile URLs
  }
}