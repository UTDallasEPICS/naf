import { WebDriver, By, until } from 'selenium-webdriver';
import * as fs from 'fs';
import * as path from 'path';

// Class to handle LinkedIn profile access with authwall bypass
export class LinkedInScraper {
  private driver: WebDriver;
  private maxRetries: number;
  private retryDelay: number;
  private pagesDir: string;
  private accessedUrls: Set<string>;

  constructor(driver: WebDriver, maxRetries = 10, retryDelay = 1000) {
    this.driver = driver;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.pagesDir = path.join(process.cwd(), 'pages');
    this.accessedUrls = new Set();
    
    if (!fs.existsSync(this.pagesDir)) {
      fs.mkdirSync(this.pagesDir, { recursive: true });
      console.log('Created "pages" directory for storing HTML files');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async saveHtmlToFile(html: string, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const filePath = path.join(this.pagesDir, filename);
      fs.writeFile(filePath, html, 'utf8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async isAuthwall(): Promise<boolean> {
    const currentUrl = await this.driver.getCurrentUrl();
    const pageSource = await this.driver.getPageSource();
    return currentUrl.includes('authwall') ||
           currentUrl.includes('signup') ||
           pageSource.includes('authwall') ||
           pageSource.includes('Sign in to continue to LinkedIn');
  }

  private async simulateHumanBehavior(): Promise<void> {
    const scrollAmount = Math.floor(Math.random() * 500) + 100;
    await this.driver.executeScript(`window.scrollBy(0, ${scrollAmount});`);
    const randomDelay = Math.floor(Math.random() * 1000) + 500;
    await this.delay(randomDelay);
    
    if (Math.random() > 0.7) {
      const x = Math.floor(Math.random() * 500);
      const y = Math.floor(Math.random() * 500);
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

  private async manageCookies(): Promise<void> {
    const cookies = await this.driver.manage().getCookies();
    for (const cookie of cookies) {
      if (cookie.domain?.includes('linkedin.com') &&
          (cookie.name.includes('auth') || cookie.name.includes('block'))) {
        await this.driver.manage().deleteCookie(cookie.name);
      }
    }
    
    await this.driver.manage().addCookie({
      name: 'lang',
      value: 'v=2&lang=en-us',
      domain: '.linkedin.com'
    });
  }

  // New method to check if profile is already saved
  private profileAlreadySaved(profileUrl: string): boolean {
    try {
      // Extract the profile ID from the URL
      const profileId = profileUrl.split('/in/')[1].split('/')[0].split('?')[0];
      
      // Check if any files in the pages directory start with this profile ID
      const files = fs.readdirSync(this.pagesDir);
      const isAlreadySaved = files.some(file => file.startsWith(`${profileId}_`));
      
      if (isAlreadySaved) {
        console.log(`Profile ${profileId} already saved to disk. Skipping.`);
      }
      
      return isAlreadySaved;
    } catch (error) {
      console.error(`Error checking if profile is saved: ${error}`);
      return false; // If there's an error, assume it's not saved
    }
  }

  public async accessProfile(profileUrl: string, searchResultUrl: string): Promise<boolean> {
    // First check if we've already accessed this URL in the current session
    if (this.accessedUrls.has(profileUrl)) {
      console.log(`Already accessed: ${profileUrl}. Skipping.`);
      return true;
    }
    
    // Then check if we've saved this profile in a previous session
    if (this.profileAlreadySaved(profileUrl)) {
      this.accessedUrls.add(profileUrl); // Add to current session cache
      return true;
    }

    let attempts = 0;
    await this.driver.get('https://www.google.com/');
    await this.delay(1500 + Math.random() * 500);
    await this.driver.executeScript(`
      window.location.href = "${profileUrl}";
    `);
    console.log(`Trying to access: ${profileUrl}`);
    
    while (await this.isAuthwall() && attempts < this.maxRetries) {
      console.log(`Attempt ${attempts + 1}/${this.maxRetries}: Hit authwall, trying again...`);
      
      if (attempts % 3 === 0) {
        await this.driver.get(searchResultUrl);
        await this.delay(this.retryDelay);
        await this.driver.executeScript(`window.open("${profileUrl}", "_self");`);
      } else if (attempts % 3 === 1) {
        await this.driver.get('https://www.google.com/');
        await this.delay(this.retryDelay);
        await this.driver.executeScript(`
          history.pushState({}, '', '${searchResultUrl}');
          window.location.href = "${profileUrl}";
        `);
      } else {
        await this.driver.get(searchResultUrl);
        await this.delay(this.retryDelay);
        await this.driver.executeScript(`
          setTimeout(() => { window.location.href = "${profileUrl}"; }, 500);
        `);
        await this.delay(1000);
      }
      
      await this.manageCookies();
      await this.simulateHumanBehavior();
      attempts++;
      await this.delay(this.retryDelay + Math.random() * 1000);
    }

    if (await this.isAuthwall()) {
      console.log(`Failed to bypass authwall after ${this.maxRetries} attempts.`);
      return false;
    }

    console.log(`Successfully accessed profile after ${attempts} retry attempts.`);
    this.accessedUrls.add(profileUrl);
    
    try {
      await this.delay(2000 + Math.random() * 1000);
      await this.simulateHumanBehavior();
      const pageSource = await this.driver.getPageSource();
      const profileId = profileUrl.split('/in/')[1].split('/')[0].split('?')[0];
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `${profileId}_${timestamp}.html`;
      await this.saveHtmlToFile(pageSource, filename);
      console.log(`HTML saved to pages/${filename}`);
    } catch (error) {
      console.log("Error saving page HTML:", error);
    }
    
    return true;
  }

  public async processProfiles(searchResults: { title: string, link: string }[], searchResultUrl: string): Promise<string[]> {
    const accessedProfiles = [];
    
    for (const result of searchResults) {
      if (result.link.includes('linkedin.com/in/')) {
        console.log(`\nProcessing profile: ${result.title}`);
        console.log(`URL: ${result.link}`);
        
        const success = await this.accessProfile(result.link, searchResultUrl);
        if (success) {
          accessedProfiles.push(result.link);
          console.log(`Successfully accessed profile: ${result.title}`);
        } else {
          console.log(`Failed to access profile: ${result.title}`);
        }
        
        const randomDelay = 3000 + Math.floor(Math.random() * 2000);
        await this.delay(randomDelay);
      }
    }
    
    return accessedProfiles;
  }
}
