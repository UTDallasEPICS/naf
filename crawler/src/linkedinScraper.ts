import { WebDriver, By, until } from 'selenium-webdriver';
import * as fs from 'fs';
import * as path from 'path';

// Class to handle LinkedIn profile access with authwall bypass
export class LinkedInScraper {
  private driver: WebDriver;
  private maxRetries: number;
  private retryDelay: number;
  private pagesDir: string;

  // Initialize the LinkedIn scraper
  // driver - Selenium WebDriver instance
  // maxRetries - Maximum number of retry attempts for authwall bypass
  // retryDelay - Delay between retry attempts in milliseconds
  constructor(driver: WebDriver, maxRetries = 10, retryDelay = 1000) {
    this.driver = driver;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.pagesDir = path.join(process.cwd(), 'pages');
    
    // Create pages directory if it doesn't exist
    if (!fs.existsSync(this.pagesDir)) {
      fs.mkdirSync(this.pagesDir, { recursive: true });
      console.log('Created "pages" directory for storing HTML files');
    }
  }

  // Delay execution for specified milliseconds
  // ms - Milliseconds to delay
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Save HTML content to a file in the pages directory
  // html - HTML content to save
  // filename - Name of the file to save
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

  // Check if the current page is an authwall
  // returns True if on authwall page, false otherwise
  private async isAuthwall(): Promise<boolean> {
    const currentUrl = await this.driver.getCurrentUrl();
    return currentUrl.includes('authwall') || currentUrl.includes('signup');
  }

  // Access a LinkedIn profile with authwall bypass attempts
  // profileUrl - LinkedIn profile URL from Google search results
  // searchResultUrl - Original Google search results URL to go back to
  // returns True if successfully accessed the profile, false otherwise
  public async accessProfile(profileUrl: string, searchResultUrl: string): Promise<boolean> {
    let attempts = 0;
    
    // First try: direct access
    await this.driver.get(profileUrl);
    console.log(`Trying to access: ${profileUrl}`);
    
    // Check if we hit the authwall
    while (await this.isAuthwall() && attempts < this.maxRetries) {
      console.log(`Attempt ${attempts + 1}/${this.maxRetries}: Hit authwall, trying again...`);
      
      // Go back to search results
      await this.driver.get(searchResultUrl);
      await this.delay(this.retryDelay);
      
      // Try accessing the profile directly again (simulating back-and-retry approach)
      await this.driver.get(profileUrl);
      
      attempts++;
      await this.delay(this.retryDelay);
    }
    
    // Check if we successfully bypassed the authwall
    if (await this.isAuthwall()) {
      console.log(`Failed to bypass authwall after ${this.maxRetries} attempts.`);
      return false;
    }
    
    console.log(`Successfully accessed profile after ${attempts} retry attempts.`);
    
    // Get the HTML content and save it to a file
    try {
      // Wait a bit for the page to fully load
      await this.delay(2000);
      
      // Get the page source HTML
      const pageSource = await this.driver.getPageSource();
      
      // Create a filename from the URL
      const profileId = profileUrl.split('/in/')[1].split('/')[0].split('?')[0];
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `${profileId}_${timestamp}.html`;
      
      // Save HTML to file in pages directory
      await this.saveHtmlToFile(pageSource, filename);
      
      console.log(`HTML saved to pages/${filename}`);
      
    } catch (error) {
      console.log("Error saving page HTML:", error);
    }
    
    return true;
  }

  // Process multiple LinkedIn profiles from search results
  // searchResults - Array of search result items with title and link
  // searchResultUrl - Original Google search results URL
  // returns Array of successfully accessed profile URLs
  public async processProfiles(searchResults: { title: string, link: string }[], searchResultUrl: string): Promise<string[]> {
    const accessedProfiles = [];
    
    for (const result of searchResults) {
      // Check if this is a LinkedIn profile URL
      if (result.link.includes('linkedin.com/in/')) {
        console.log(`\nProcessing profile: ${result.title}`);
        console.log(`URL: ${result.link}`);
        
        // Try to access the profile
        const success = await this.accessProfile(result.link, searchResultUrl);
        
        if (success) {
          accessedProfiles.push(result.link);
          console.log(`Successfully accessed profile: ${result.title}`);
          
          // The profile page is currently loaded in the driver and HTML saved to file
        } else {
          console.log(`Failed to access profile: ${result.title}`);
        }
        
        // Add a delay between profiles to avoid being detected as a bot
        await this.delay(3000);
      }
    }
    
    return accessedProfiles;
  }
}