import { WebDriver } from 'selenium-webdriver';
import * as fs from 'fs';
import * as path from 'path';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { Client } from 'pg';
import { Cheerio, Element } from 'cheerio';

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


//add random delay 
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
      await this.convertToJson(filename, profileUrl);
      return true;
    } catch (error) {
      console.error(`Error scraping ${profileUrl}:`, error);
      return false;
    }
  }


  private async convertToJson(htmlFilename: string, profileUrl: string): Promise<void> {
    const htmlPath = path.join(pagesDir, htmlFilename);
    const profileId = htmlFilename.split('_')[0];
    const jsonPath = path.join(jsonDir, `${profileId}.json`);
  
    try {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      const $ = load(html);

      // 🔹 Name Extraction (with meta tag fallback)
      const getMeta = ($: CheerioAPI, sel: string): string | null => {
        return $(sel).attr('content')?.trim() ?? null;
      };

      const getText = ($: CheerioAPI, primarySelector: string): string | null => {
        let text: string | null = null;
        const primaryElement = $(primarySelector).first();
        if (primaryElement.length) {
            text = primaryElement.text().trim();
        }
        return text || null;
      };

      const getJsonLd = ($: CheerioAPI, rx: RegExp): string | null => {
        const script = $('script[type="application/ld+json"]').html();
        if (!script) return null;
        const m = script.match(rx);
        return m?.[1]?.trim() ?? null;
      };
       const cleanText = (text: string | null): string | null => {
    if (!text) return null;
    return text.replace(/[\n\s]+/g, ' ').trim();
      };

      // 🔹 Name Extraction
      let fullName: string | null = null;
      const firstNameMeta = getMeta($, 'meta[property="profile:first_name"]');
      const lastNameMeta = getMeta($, 'meta[property="profile:last_name"]');
      if (firstNameMeta && lastNameMeta) {
          fullName = `${firstNameMeta} ${lastNameMeta}`;
      } else {
          fullName = firstNameMeta || lastNameMeta || getText($, 'h1.top-card-layout__title');
      }

      // Job Title and Location
      const jobTitleOg = getMeta($, 'meta[property="og:title"]');
      const headlineH2 = getText($, 'h2.top-card-layout__headline');
      const jobTitle = jobTitleOg || headlineH2;
      const locationVisible = getText($, '.top-card-layout__first-subline > span:first-child');
      const locationJsonLd = getJsonLd($, /"addressLocality":"(.*?)"/);
      const location = locationVisible || locationJsonLd;
      const city = locationJsonLd;
      const state = null; // Not extracted in original, can be added if needed
      const linkedinLink = getMeta($, 'meta[property="og:url"]');
      const email = $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '').trim() ?? null;
      const phoneNumber = getText($, 'span.phone');

      // Extract Education Data
      let highSchool: string | null = null;
      let hsGraduationYear: string | null = null;
      let university: string | null = null;
      let degree: string | null = null;
      let universityGradYear: string | null = null;
      const educationSection = $('section[data-section="educationsDetails"]');
      if (educationSection.length > 0) {
          educationSection.find('ul > li.education__list-item').each((_, el) => {
              const schoolNameElement = $(el).find('h3 a').first().length ? $(el).find('h3 a').first() : $(el).find('h3').first();
              const schoolName = cleanText(schoolNameElement.text());
              const degreeMajorElement = $(el).find('h4').first();
              const degreeMajorText = cleanText(degreeMajorElement.text());
              const dateRangeElement = $(el).find('span.date-range').first();
              const dateRangeText = cleanText(dateRangeElement.text());


              if (schoolName?.toLowerCase().includes('high school')) {
                  if (!highSchool) {
                      highSchool = schoolName;
                      if (dateRangeText) {
                          const yearMatch = dateRangeText.match(/(\d{4})\s*$/);
                          hsGraduationYear = yearMatch ? yearMatch[1] : null;
                      }
                  }
              } else {
                  if (!university) {
                      university = schoolName;
                      if (degreeMajorText) {
                          const parts = degreeMajorText.split(',').map(p => p.trim());
                          degree = parts[0]?.replace(/[\n\s]+/g, ' ').trim() || null;
                      }
                      if (dateRangeText) {
                          const yearMatch = dateRangeText.match(/(\d{4})\s*$/);
                          universityGradYear = yearMatch ? yearMatch[1] : null;
                      }
                  }
              }
          });
      }
     

      // NAF Involvement
      let nafAcademy: string | null = null;
      let nafTrackCertified: string | null = null;
      const certSection = $('section[data-section="certifications"]');
      if (certSection.length > 0) {
          certSection.find('ul > li').each((_, el) => {
              const certName = cleanText($(el).find('h3').first().text());
              const issuerName = cleanText($(el).find('h4 a').first().text());

              if (!nafTrackCertified && certName?.toLowerCase().includes('naftrack')) {
                  nafTrackCertified = certName;
              }
              if (!nafAcademy && certName?.toLowerCase().includes('academy of finance')) {
                  nafAcademy = certName;
              }
              if (issuerName?.toLowerCase() === 'naf') {
                  if (!nafTrackCertified) nafTrackCertified = certName ?? "NAF Issued Certification";
                  if (!nafAcademy) nafAcademy = certName ?? "NAF Issued Certification";
              }
          });
      }
      const orgSection = $('section[data-section="organizations"]');
      if (!nafAcademy && orgSection.length > 0) {
          orgSection.find('ul > li').each((_, el) => {
              const orgName = cleanText($(el).find('h3').first().text());
              if (orgName?.toLowerCase().includes('academy of finance')) {
                  nafAcademy = orgName;
                  return false;
              }
          });
      }
      if (!nafAcademy && educationSection.length > 0) {
          educationSection.find('ul > li.education__list-item').each((_, el) => {
              const description = cleanText($(el).find('div[data-section="educations"] p').first().text());
              if (description?.toLowerCase().includes('academy of finance')) {
                  nafAcademy = "Academy of Finance (Mentioned in Education)";
                  return false;
              }
          });
      }

      // Current Job
      let currentJob: string | null = null;
      const expSection = $('section[data-section="experience"]');
      if (expSection.length > 0) {
          const firstExperienceItem = expSection.find('ul.experience__list > li').first();
          const firstExpPosition = firstExperienceItem.hasClass('experience-group')
              ? firstExperienceItem.find('ul.experience-group__positions > li').first()
              : firstExperienceItem;
          if (firstExpPosition.length > 0) {
              const title = cleanText($(firstExpPosition).find('h3 span.experience-item__title').first().text());
              const company = cleanText($(firstExpPosition).find('h4 span.experience-item__subtitle').first().text());
              currentJob = title && company ? `${title} at ${company}` : title || company;
          }
      }
      currentJob = currentJob || headlineH2;

      // Internship Data
      let internship_company1: string | null = null;
      let internship_end_date1: string | null = null;
      let internship_company2: string | null = null;
      let internship_end_date2: string | null = null;
      if (expSection.length > 0) {
          expSection.find('ul > li').each((_, el) => {
              const title = $(el).find('h3 span.experience-item__title').first().text().trim() || null;
              const companyElement = $(el).find('h4 span.experience-item__subtitle').first();
              const dateElement = $(el).find('span.date-range').first();

              if (title?.toLowerCase().includes('intern') || title?.toLowerCase().includes('analyst')) {
                  const durationText = cleanText(dateElement.text());
                  if (durationText && (durationText.includes('mos') || /^\d+\s+yr(s)?$/.test(durationText) || /^\d{1,2}\s+mo(s)?$/.test(durationText))) {
                      if (!internship_company1) {
                          internship_company1 = companyElement.text().trim() || null;
                          if (durationText) {
                              const endDateMatch = durationText.match(/–\s*(\w+\s+\d{4}|\d{4})/);
                              internship_end_date1 = endDateMatch ? endDateMatch[1] : null;
                              if (!internship_end_date1) {
                                  const singleDateMatch = durationText.match(/(\w+\s+\d{4}|\d{4})/);
                                  internship_end_date1 = singleDateMatch ? singleDateMatch[1] : null;
                              }
                          }
                      } else if (!internship_company2) {
                          internship_company2 = companyElement.text().trim() || null;
                          if (durationText) {
                              const endDateMatch = durationText.match(/–\s*(\w+\s+\d{4}|\d{4})/);
                              internship_end_date2 = endDateMatch ? endDateMatch[1] : null;
                              if (!internship_end_date2) {
                                  const singleDateMatch = durationText.match(/(\w+\s+\d{4}|\d{4})/);
                                  internship_end_date2 = singleDateMatch ? singleDateMatch[1] : null;
                              }
                          }
                      }
                  }
              }
          });
      }

      // 🔹 Build JSON (maintaining your exact structure)
      const dbData = {
        profile_url: profileUrl,
        timestamp: new Date().toISOString(),
        full_name: fullName,
        email,
        phone_number: phoneNumber,
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
        linkedin_link: linkedinLink,
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
      // Optionally: throw error; // Keep if you want failures to propagate
    }
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
