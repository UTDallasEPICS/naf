import { WebDriver, By, until } from 'selenium-webdriver';
import * as fs from 'fs';
import * as path from 'path';
import * as fsPromises from 'fs/promises'; // Use promise-based fs

// Defines the LinkedInScraper class responsible for accessing and saving LinkedIn profiles.
export class LinkedInScraper {
  // Private properties to store the WebDriver instance, retry settings, directory path, and accessed URLs.
  private driver: WebDriver;
  private maxRetries: number;
  private retryDelay: number;
  private pagesDir: string;
  private accessedUrls: Set<string>;

  // Constructor initializes the scraper with a WebDriver instance and optional retry/delay settings.
  // It also ensures the directory for saving HTML pages exists.
  constructor(driver: WebDriver, maxRetries = 10, retryDelay = 1000) {
    this.driver = driver;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.pagesDir = path.join(process.cwd(), 'pages');
    this.accessedUrls = new Set(); // Stores URLs processed in this session

    // Synchronously checks if the target directory exists and creates it if not.
    if (!fs.existsSync(this.pagesDir)) {
      try {
          fs.mkdirSync(this.pagesDir, { recursive: true });
          console.log('Created "pages" directory for storing HTML files');
      } catch (error) {
          console.error('Error creating "pages" directory:', error);
      }
    }
  }

  // Private helper method to introduce a delay using Promises.
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Private method to asynchronously save provided HTML content to a specified file.
  private async saveHtmlToFile(html: string, filename: string): Promise<void> {
     const filePath = path.join(this.pagesDir, filename);
     // Asynchronously writes the file using Node's fs/promises API.
     await fsPromises.writeFile(filePath, html, 'utf8');
  }

  // Private method to check if the current page appears to be a LinkedIn authwall/login/signup page.
  private async isAuthwall(): Promise<boolean> {
    try {
        // Reads the current URL from the browser.
        const currentUrl = await this.driver.getCurrentUrl();
        // Reads the page source (HTML content) from the browser.
        const pageSource = await this.driver.getPageSource();
        // Returns true if URL or source indicates an authentication barrier.
        return currentUrl.includes('authwall') ||
               currentUrl.includes('signup') ||
               pageSource.includes('authwall') ||
               pageSource.includes('Sign in to continue to LinkedIn');
    } catch (error) {
        // Logs a generic warning if an error occurs during the check.
        console.warn(`Authwall check failed: ${error}`);
        // Assumes authwall is present if the check fails.
        return true;
    }
  }

  // Private method to simulate some human-like interactions on the page.
  private async simulateHumanBehavior(): Promise<void> {
     try {
        // Scrolls the window vertically by a random amount.
        const scrollAmount = Math.floor(Math.random() * 500) + 100;
        await this.driver.executeScript(`window.scrollBy(0, ${scrollAmount});`);
        // Waits for a random duration.
        const randomDelay = Math.floor(Math.random() * 1000) + 500;
        await this.delay(randomDelay);

        // Occasionally simulates a mouse movement event.
        if (Math.random() > 0.7) {
          const x = Math.floor(Math.random() * 500);
          const y = Math.floor(Math.random() * 500);
          await this.driver.executeScript(`
              const event = new MouseEvent('mousemove', {
              'view': window, 'bubbles': true, 'cancelable': true, 'clientX': ${x}, 'clientY': ${y}
              });
              document.dispatchEvent(event);
          `);
        }
     } catch(e) {
         // Logs a generic warning if behavior simulation fails.
         console.warn(`Behavior simulation failed: ${e}`);
     }
  }

  // Private method to manage browser cookies, specifically removing potential blocking cookies and setting language.
  private async manageCookies(): Promise<void> {
      try {
        // Retrieves all cookies for the current domain.
        const cookies = await this.driver.manage().getCookies();
        // Iterates through cookies and deletes those related to LinkedIn authentication or blocking.
        for (const cookie of cookies) {
          if (cookie.domain?.includes('linkedin.com') &&
              (cookie.name.includes('auth') || cookie.name.includes('block'))) {
            await this.driver.manage().deleteCookie(cookie.name);
          }
        }
        // Adds a cookie to set the language preference to English.
        await this.driver.manage().addCookie({
          name: 'lang', value: 'v=2&lang=en-us', domain: '.linkedin.com'
        });
      } catch(e) {
          // Logs a generic warning if cookie management fails.
          console.warn(`Cookie management failed: ${e}`);
      }
  }

  // Private synchronous method to check if a profile matching the URL has already been saved to disk.
  private profileAlreadySaved(profileUrl: string): boolean {
    try {
      // Extracts the unique profile identifier from the LinkedIn URL.
      const profileIdMatch = profileUrl.match(/linkedin\.com\/in\/([^/?]+)/);
      if (!profileIdMatch || !profileIdMatch[1]) return false; // Return false if ID cannot be extracted.
      const profileId = profileIdMatch[1];
      // Synchronously reads the list of files in the pages directory.
      const files = fs.readdirSync(this.pagesDir);
      // Checks if any filename starts with the extracted profile ID.
      return files.some(file => file.startsWith(`${profileId}_`));
    } catch (error) {
      // Logs an error if the check fails (e.g., directory not found).
      console.error(`Error checking saved profile status: ${error}`);
      // Assumes profile is not saved if an error occurs.
      return false;
    }
  }


  // Public method to attempt accessing a specific LinkedIn profile URL, handling authwalls and retries.
  public async accessProfile(profileUrl: string, searchResultUrl: string): Promise<boolean> {
    // Checks if the URL has already been processed in the current session.
    if (this.accessedUrls.has(profileUrl)) {
      console.log(`Already accessed in this session: ${profileUrl}. Skipping.`);
      return true;
    }
    // Checks if the profile HTML has already been saved to disk in a previous session.
    if (this.profileAlreadySaved(profileUrl)) {
       console.log(`Profile ${profileUrl} already saved to disk. Skipping.`);
       this.accessedUrls.add(profileUrl); // Mark as processed for this session.
       return true;
    }

    // Initializes retry counter.
    let attempts = 0;
    console.log(`Trying to access: ${profileUrl}`);

    try {
        // Navigates indirectly to the profile URL via Google to potentially improve access.
        await this.driver.get('https://www.google.com/');
        await this.delay(1500 + Math.random() * 500);
        await this.driver.executeScript(`window.location.href = arguments[0];`, profileUrl);
        await this.delay(1500 + Math.random() * 1000); // Wait for initial load attempt

       // Enters a loop to retry access if an authwall is detected, up to maxRetries.
       while (await this.isAuthwall() && attempts < this.maxRetries) {
          console.log(`Attempt ${attempts + 1}/${this.maxRetries} for ${profileUrl}: Hit authwall, trying again...`);
          attempts++;

          // Implements different retry strategies based on the attempt number.
          if (attempts % 3 === 0) {
              await this.driver.get(searchResultUrl); // Navigate via referring search result page
              await this.delay(this.retryDelay);
              await this.driver.executeScript(`window.open(arguments[0], "_self");`, profileUrl);
          } else if (attempts % 3 === 1) {
              await this.driver.get('https://www.google.com/'); // Navigate via Google with history manipulation
              await this.delay(this.retryDelay);
              await this.driver.executeScript(`history.pushState({}, '', arguments[0]); window.location.href = arguments[1];`, searchResultUrl, profileUrl);
          } else {
              await this.driver.get(searchResultUrl); // Navigate via referring page with a delayed redirect
              await this.delay(this.retryDelay);
              await this.driver.executeScript(`setTimeout(() => { window.location.href = arguments[0]; }, 500);`, profileUrl);
              await this.delay(1000); // Wait for timeout nav
          }

          // Manages cookies and simulates human behavior between retries.
          await this.manageCookies();
          await this.simulateHumanBehavior();
          await this.delay(this.retryDelay + Math.random() * 1000); // Waits before the next authwall check.
       }

       // Checks if the authwall is still present after all retries.
       if (await this.isAuthwall()) {
         console.log(`Failed to bypass authwall for ${profileUrl} after ${this.maxRetries} attempts.`);
         return false; // Returns false if access failed.
       }

       // Logs success if the authwall was bypassed.
       console.log(`Successfully accessed profile for ${profileUrl} after ${attempts} retries.`);
       this.accessedUrls.add(profileUrl); // Marks URL as successfully accessed in this session.

       // Attempts to save the HTML source of the accessed profile page.
       try {
         await this.delay(2000 + Math.random() * 1000); // Waits before saving.
         await this.simulateHumanBehavior(); // Simulates interaction before saving.
         const pageSource = await this.driver.getPageSource(); // Gets the final page HTML.

         // Extracts profile ID for the filename.
         const profileIdMatch = profileUrl.match(/linkedin\.com\/in\/([^/?]+)/);
         if (!profileIdMatch || !profileIdMatch[1]) throw new Error('Could not extract profile ID');
         const profileId = profileIdMatch[1];

         // Creates a unique filename using profile ID and timestamp.
         const timestamp = new Date().toISOString().replace(/:/g, '-');
         const filename = `${profileId}_${timestamp}.html`;
         // Saves the HTML content to the file.
         await this.saveHtmlToFile(pageSource, filename);
         console.log(`HTML saved to pages/${filename}`);
       } catch (error) {
         // Logs an error if saving the HTML fails.
         console.log(`Error saving page HTML for ${profileUrl}: ${error}`);
       }
       // Returns true indicating successful access (even if saving failed, depending on requirements).
       return true;

    } catch (error) {
        // Logs a critical error if an unexpected issue occurs during the access attempt.
        console.error(`Critical error during accessProfile for ${profileUrl}: ${error}`);
        // Returns false indicating failure.
        return false;
    }
  }


  // Public method to process a list of search results in parallel.
  public async processProfiles(searchResults: { title: string, link: string }[], searchResultUrl: string): Promise<string[]> {

    // Logs the start of parallel processing and includes a generic warning.
    console.log(`Starting parallel processing for ${searchResults.length} results...`);

    // Maps each search result to an asynchronous operation (Promise).
    const processingPromises = searchResults.map(async (result) => {
        // Initializes success flag and link variable for this specific result.
        let success = false;
        let accessedLink: string | null = null;

        // Checks if the result link is a valid LinkedIn profile URL.
        if (result.link.includes('linkedin.com/in/')) {
            // Logs the initiation of processing for this specific profile.
            console.log(`\nInitiating parallel processing for: ${result.title} (${result.link})`);
            // Calls the accessProfile method to handle access, retries, and saving.
            success = await this.accessProfile(result.link, searchResultUrl);

            // If accessProfile returns true, marks the link as accessed and logs success.
            if (success) {
                accessedLink = result.link;
                console.log(`Successfully processed in parallel: ${result.title}`);
            } else {
                // Logs failure if accessProfile returns false.
                console.log(`Failed to process in parallel: ${result.title}`);
            }
        }
        // Returns the link if successfully accessed, otherwise returns null.
        return accessedLink;
    });

    // Waits for all the asynchronous operations initiated by .map() to complete.
    const results = await Promise.all(processingPromises);

    // Filters the results array to keep only the successfully accessed links (non-null values).
    const successfullyAccessedLinks = results.filter((link): link is string => link !== null);

    // Logs the completion of the parallel batch and the number of successes.
    console.log(`Parallel processing batch complete. Accessed ${successfullyAccessedLinks.length} new profiles.`);

    // Returns the array of successfully accessed profile URLs.
    return successfullyAccessedLinks;
  }
}