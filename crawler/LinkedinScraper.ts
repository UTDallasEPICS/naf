import { WebDriver } from 'selenium-webdriver';
import * as fs from 'fs';
import * as path from 'path';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { Client } from 'pg';

const pagesDir = path.join(process.cwd(), 'enricher_pages');
const jsonDir = path.join(process.cwd(), 'enricher_json');

export class EnricherLinkedInScraper {
  private driver: WebDriver;
  private maxRetries: number;
  private retryDelay: number;

  constructor(driver: WebDriver, maxRetries = 5, retryDelay = 2000) {
    this.driver = driver;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    
    // Ensure directories exist
    if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });
    if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async simulateHumanBehavior(): Promise<void> {
    await this.driver.executeScript(`window.scrollBy(0, ${Math.floor(Math.random() * 300) + 100})`);
    await this.delay(500 + Math.random() * 1000);
  }

  public async scrapeAndStoreProfile(profileUrl: string): Promise<boolean> {
    try {
      console.log(`Attempting to scrape: ${profileUrl}`);
      
      // Navigate to profile
      await this.driver.get('https://www.google.com');
      await this.delay(1500);
      await this.driver.executeScript(`window.location.href="${profileUrl}"`);
      
      // Check if page loaded properly
      await this.delay(3000);
      const currentUrl = await this.driver.getCurrentUrl();
      if (!currentUrl.includes('linkedin.com/in/')) {
        throw new Error('Failed to load LinkedIn profile');
      }

      // Save HTML
      await this.simulateHumanBehavior();
      const html = await this.driver.getPageSource();
      const profileId = profileUrl.split('/in/')[1].split('/')[0].split('?')[0];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${profileId}_${timestamp}.html`;
      
      fs.writeFileSync(path.join(pagesDir, filename), html);
      console.log(`Saved HTML: ${filename}`);

      // Convert to JSON and insert to DB
      await this.convertToJson2(filename, profileUrl);
      return true;
    } catch (error) {
      console.error(`Error scraping ${profileUrl}:`, error);
      return false;
    }
  }
  private getBestText($: CheerioAPI, selectors: string[]): string | null {
    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }
    return null;
  }



 // This is just another method to try converting

  private async convertToJson2(htmlFilename: string, profileUrl: string): Promise<void> {
    const htmlPath = path.join(pagesDir, htmlFilename);
    const profileId = htmlFilename.split('_')[0];
    const jsonPath = path.join(jsonDir, `${profileId}.json`);
  
    try {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      const $ = load(html);
  
      // 🔹 Robust selector sets
      const fullName = this.getBestText($, [
        'h1.top-card-layout__title',
        'h1.text-heading-xlarge',
        'h1',
      ]);
  
      const jobTitle = this.getBestText($, [
        'h2.top-card-layout__headline',
        'h2.text-body-medium',
        'h2',
      ]);
  
      const locationText = this.getBestText($, [
        '.top-card-layout__first-subline span:first-child',
        '.top-card__subline-item',
        '.top-card-location',
      ]);
  
      let city = null, state = null;
      if (locationText) {
        const parts = locationText.split(',').map(p => p.trim());
        [city, state] = [parts[0], parts[1]];
      }
  
      // 🔹 Education Section
      let highSchool = null, hsGraduationYear = null;
      let university: string | null = null;
let universityGradYear: string | null = null;
let degree: string | null = null;
      let nafAcademy = null, nafTrackCertified = null;
  
      const educationSection = $('section[data-section="educationsDetails"], section:contains("Education")');
      if (educationSection.length === 0) {
        console.warn(`No education section for ${htmlFilename}`);
      }
  
      educationSection.find('li.education__list-item, li').each((_, el) => {
        const textBlock = $(el).text().toLowerCase();
        const school = $(el).find('h3').first().text().trim();
        const degreeText = $(el).find('h4').first().text().trim();
        const duration = $(el).find('span.date-range').first().text().trim();
        const yearMatch = duration.match(/(\d{4})/);
        const gradYear = yearMatch?.[1] ?? null;
  
        if (textBlock.includes('high school')) {
          highSchool = school;
          hsGraduationYear = gradYear;
        } else {
          university = university || school;
          universityGradYear = universityGradYear || gradYear;
          degree = degree || degreeText;
        }
  
        if (school.toLowerCase().includes('academy of finance')) {
          nafAcademy = school;
        }
        if (degreeText.toLowerCase().includes('naf track')) {
          nafTrackCertified = degreeText;
        }
      });
  
      // 🔹 Experience Section
      let currentJob = null;
      let internship_company1: string | null = null;
      let internship_end_date1 = null;
      let internship_company2: string | null = null;
      let internship_end_date2 = null;
  
      const expSection = $('section[data-section="experience"], section:contains("Experience")');
      if (expSection.length === 0) {
        console.warn(`No experience section for ${htmlFilename}`);
      }
  
      expSection.find('ul > li').each((i, el) => {
        const title = $(el).find('h3 span, h3').first().text().trim();
        const company = $(el).find('h4 span, h4').first().text().trim();
        const duration = $(el).find('span.date-range').first().text().trim();
        const endDateMatch = duration.match(/(\w+\s+\d{4}|\d{4})$/);
        const endDate = endDateMatch?.[0] ?? null;
  
        if (i === 0 && title && company) {
          currentJob = `${title} at ${company}`;
        }
  
        if (/intern(ship)?/i.test(title)) {
          if (!internship_company1) {
            internship_company1 = company;
            internship_end_date1 = endDate;
          } else if (!internship_company2) {
            internship_company2 = company;
            internship_end_date2 = endDate;
          }
        }
      });
  
      // 🔹 Build JSON
      const dbData = {
        profile_url: profileUrl,
        timestamp: new Date().toISOString(),
        full_name: fullName,
        email: null,
        phone_number: null,
        high_school: highSchool,
        hs_graduation_year: hsGraduationYear,
        naf_academy: nafAcademy,
        naf_track_certified: nafTrackCertified,
        address: null,
        city,
        state,
        zip_code: null,
        birthdate: null,
        gender: null,
        ethnicity: null,
        military_branch_served: null,
        current_job: currentJob || jobTitle,
        college_major: null,
        university_grad_year: universityGradYear,
        university,
        degree,
        linkedin_link: profileUrl,
        school_district: null,
        internship_company1,
        internship_end_date1,
        internship_company2,
        internship_end_date2,
        university2: null,
        college_major2: null,
        degree2: null
      };
  
      fs.writeFileSync(jsonPath, JSON.stringify(dbData, null, 2));
      console.log(`Saved JSON: ${jsonPath}`);
  
      await this.insertToEnricherDatabase(dbData);
    } catch (error) {
      console.error(`Error converting ${htmlFilename}:`, error);
      throw error;
    }
  }  
  

  private async convertToJson(htmlFilename: string, profileUrl: string): Promise<void> {
    const htmlPath = path.join(pagesDir, htmlFilename);
    const profileId = htmlFilename.split('_')[0];
    const jsonPath = path.join(jsonDir, `${profileId}.json`);

    try {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      const $ = load(html);

      // Extract basic profile information - UPDATED SELECTORS
      const fullName = this.getText($, 'h1.top-card-layout__title') || 
                      $('h1').text().trim();
      
      const jobTitle = this.getText($, 'h2.top-card-layout__headline') || 
                      $('h2').text().trim();
      
      const locationText = this.getText($, '.top-card-layout__first-subline > span:first-child') || 
                          $('.top-card-location').text().trim();

      // Parse location into city/state
      let city = null;
      let state = null;
      if (locationText) {
        const locationParts = locationText.split(', ');
        city = locationParts[0] || null;
        state = locationParts[1] || null;
      }

      // Extract education information - UPDATED TO USE SECTIONS
      let highSchool = null;
      let hsGraduationYear = null;
      let university = null;
      let universityGradYear = null;
      let degree = null;
      let nafAcademy = null;
      let nafTrackCertified = null;

      const educationSection = $('section[data-section="educationsDetails"]');
      if (educationSection.length > 0) {
        educationSection.find('ul > li.education__list-item').each((_, el) => {
          const school = $(el).find('h3').first().text().trim();
          const degreeText = $(el).find('h4').first().text().trim();
          const duration = $(el).find('span.date-range').first().text().trim();
          
          const yearMatch = duration.match(/(\d{4})/);
          const gradYear = yearMatch ? yearMatch[1] : null;

          if (school.toLowerCase().includes('high school')) {
            highSchool = school;
            hsGraduationYear = gradYear;
          } else {
            university = school;
            universityGradYear = gradYear;
            degree = degreeText;
          }

          if (school.toLowerCase().includes('academy of finance')) {
            nafAcademy = school;
          }
          if (degreeText.toLowerCase().includes('naf track')) {
            nafTrackCertified = degreeText;
          }
        });
      }

      // Extract experience information - UPDATED TO USE SECTIONS
      let currentJob = null;
      let internshipCompany1: string | null = null;
      let internship_end_date1 = null;
      let internship_company2: string | null = null;
      let internship_end_date2 = null;

      const expSection = $('section[data-section="experience"]');
      if (expSection.length > 0) {
        expSection.find('ul > li').each((i, el) => {
          const title = $(el).find('h3 span.experience-item__title').first().text().trim();
          const company = $(el).find('h4 span.experience-item__subtitle').first().text().trim();
          const duration = $(el).find('span.date-range').first().text().trim();
          
          const endDateMatch = duration.match(/(\w+\s+\d{4}|\d{4})$/);
          const endDate = endDateMatch ? endDateMatch[0] : null;

          if (i === 0) {
            currentJob = title ? `${title} at ${company}` : company;
          }

          if (title?.toLowerCase().includes('intern') || 
              title?.toLowerCase().includes('internship')) {
            if (!internshipCompany1) {
              internshipCompany1 = company;
              internship_end_date1 = endDate;
            } else if (!internship_company2) {
              internship_company2 = company;
              internship_end_date2 = endDate;
            }
          }
        });
      }

      // Prepare data for database insertion
      const dbData = {
        profile_url: profileUrl,
        timestamp: new Date().toISOString(),
        full_name: fullName,
        email: null,
        phone_number: null,
        high_school: highSchool,
        hs_graduation_year: hsGraduationYear,
        naf_academy: nafAcademy,
        naf_track_certified: nafTrackCertified,
        address: null,
        city: city,
        state: state,
        zip_code: null,
        birthdate: null,
        gender: null,
        ethnicity: null,
        military_branch_served: null,
        current_job: currentJob || jobTitle,
        college_major: null,
        university_grad_year: universityGradYear,
        university: university,
        degree: degree,
        linkedin_link: profileUrl,
        school_district: null,
        internship_company1: internshipCompany1,
        internship_end_date1: internship_end_date1,
        internship_company2: internship_company2,
        internship_end_date2: internship_end_date2,
        university2: null,
        college_major2: null,
        degree2: null
      };

      // Save JSON
      fs.writeFileSync(jsonPath, JSON.stringify(dbData, null, 2));
      console.log(`Saved JSON: ${jsonPath}`);

      // Insert to database
      await this.insertToEnricherDatabase(dbData);
    } catch (error) {
      console.error(`Error converting ${htmlFilename}:`, error);
      throw error;
    }
  }   

// Add this helper function at class level
private getText($: CheerioAPI, selector: string): string | null {
  const element = $(selector).first();
  return element.length ? element.text().trim() : null;
}
  private async insertToEnricherDatabase(data: any): Promise<void> {
    const client = new Client({
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    });

    try {
      await client.connect();
      await client.query(`
        INSERT INTO enricher_data (
          profile_url, timestamp, full_name, email, phone_number,
          high_school, hs_graduation_year, naf_academy, naf_track_certified,
          address, city, state, zip_code, birthdate, gender, ethnicity,
          military_branch_served, current_job, college_major, university_grad_year,
          university, degree, linkedin_link, school_district,
          internship_company1, internship_end_date1,
          internship_company2, internship_end_date2,
          university2, college_major2, degree2
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31
        )
      `, [
        data.profile_url,
        data.timestamp,
        data.full_name,
        data.email,
        data.phone_number,
        data.high_school,
        data.hs_graduation_year,
        data.naf_academy,
        data.naf_track_certified,
        data.address,
        data.city,
        data.state,
        data.zip_code,
        data.birthdate,
        data.gender,
        data.ethnicity,
        data.military_branch_served,
        data.current_job,
        data.college_major,
        data.university_grad_year,
        data.university,
        data.degree,
        data.linkedin_link,
        data.school_district,
        data.internship_company1,
        data.internship_end_date1,
        data.internship_company2,
        data.internship_end_date2,
        data.university2,
        data.college_major2,
        data.degree2
      ]);
      console.log('Data inserted into enricher_data');
    } catch (error) {
      console.error('Error inserting into enricher_data:', error);
      throw error;
    } finally {
      await client.end();
    }
  }
}