import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { load, type CheerioAPI } from 'cheerio';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
dotenv.config();

// Defines the structure for the extracted profile data.
interface ProfileData {
  fullName: string | null;
  jobTitle: string | null;
  location: string | null;
  linkedinLink: string | null;
  email: string | null;
  phoneNumber: string | null;
  highSchool: string | null;
  HSGraduationYear: string | null;
  NAFAcademy: string | null;
  NAFTrackCertified: string | null;
  city: string | null;
  currentJob: string | null;
  universityGradYear: string | null;
  university: string | null;
  degree: string | null;
  internshipCompany1: string | null;
  internshipEndDate1: string | null;
}

// Defines directory paths for input HTML and output JSON files.
const pagesDir = path.join(process.cwd(), 'pages');
const jsonDir = path.join(process.cwd(), 'data_json');


const client = new Client({
  host: process.env.PGHOST,           // Database host
  port: parseInt(process.env.PGPORT || '5432', 10), // Database port (default to 5432)
  user: process.env.PGUSER,           // Database user
  password: process.env.PGPASSWORD,   // Database password
  database: process.env.PGDATABASE    // Database name
});

client.connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
  })
  .catch((err) => {
    console.error('Connection error', err.stack);
  });

// Ensures the necessary directories exist, creating them if needed.
if (!fs.existsSync(pagesDir)) {
    console.log(`Creating pages directory: ${pagesDir}`);
    fs.mkdirSync(pagesDir, { recursive: true });
}
if (!fs.existsSync(jsonDir)) {
    console.log(`Creating JSON directory: ${jsonDir}`);
    fs.mkdirSync(jsonDir, { recursive: true });
}

// Helper function to extract content from a meta tag.
function getMeta($: CheerioAPI, sel: string): string | null {
  return $(sel).attr('content')?.trim() ?? null;
}

// Helper function to extract text content using a primary selector
function getText($: CheerioAPI, primarySelector: string): string | null {
    let text: string | null = null;
    const primaryElement = $(primarySelector).first();
    if (primaryElement.length) {
        text = primaryElement.text().trim();
    }
    return text || null;
}

// Helper function to extract data from JSON-LD script using regex.
function getJsonLd($: CheerioAPI, rx: RegExp): string | null {
  const script = $('script[type="application/ld+json"]').html();
  if (!script) return null;
  const m = script.match(rx);
  return m?.[1]?.trim() ?? null;
}

////////////////////////////////////////////////
// Define types for the parameters
interface CrawlerData {
  [key: string]: any; // JSON can have dynamic keys, so we allow any value type
}

async function insertCrawlerData(profileUrl: string, jsonData: CrawlerData): Promise<void> {
  const query = `
    INSERT INTO crawler_data (profile_url, json)
    VALUES ($1, $2) RETURNING crawler_id;
  `;

  try {
    const res = await client.query(query, [profileUrl, jsonData]);
    console.log('Data inserted with crawler_id:', res.rows[0].crawler_id);
  } catch (error) {
    console.error('Error inserting data:', error);
  }
}


// Converts a single HTML file to a JSON file.
export async function convertSingleFile(htmlFilename: string) {
  // Set up file paths and extract profile ID.
  const baseName = path.basename(htmlFilename);
  const htmlPath = path.join(pagesDir, baseName);
  const idMatch = baseName.match(/^([^_]+)/);
  if (!idMatch) {
      console.warn(`Could not extract ID from filename: ${baseName}. Skipping conversion.`);
      return;
  }
  const id = idMatch[1];
  const jsonPath = path.join(jsonDir, `${id}.json`);

  // Skip if JSON already exists or HTML doesn't exist.
  if (fs.existsSync(jsonPath)) {
    return;
  }
  if (!fs.existsSync(htmlPath)) {
    console.warn(`[convertSingleFile] HTML file ${baseName} not found at path ${htmlPath}. Skipping.`);
    return;
  }

  console.log(`[convertSingleFile] Attempting conversion for: ${baseName}`);
  try {
    // Load HTML content using Cheerio.
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = load(html);

    // Extract Basic Profile Information.
    let fullName: string | null = null;
    const firstNameMeta = getMeta($, 'meta[property="profile:first_name"]');
    const lastNameMeta = getMeta($, 'meta[property="profile:last_name"]');
    if (firstNameMeta && lastNameMeta) {
        fullName = `${firstNameMeta} ${lastNameMeta}`;
    } else {
        // *** Removed fallback selector array from getText call ***
        fullName = firstNameMeta || lastNameMeta || getText($, 'h1.top-card-layout__title');
    }
    const jobTitleOg = getMeta($, 'meta[property="og:title"]');
    const headlineH2 = getText($, 'h2.top-card-layout__headline');
    const jobTitle = jobTitleOg || headlineH2;
    const locationVisible = getText($, '.top-card-layout__first-subline > span:first-child');
    const locationJsonLd = getJsonLd($, /"addressLocality":"(.*?)"/);
    const location = locationVisible || locationJsonLd;
    const city = locationJsonLd;
    const linkedinLink = getMeta($, 'meta[property="og:url"]');
    const email = $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '').trim() ?? null;
    const phoneNumber = getText($, 'span.phone');

    // Extract Education Data.
    let highSchool: string | null = null;
    let HSGraduationYear: string | null = null;
    let university: string | null = null;
    let degree: string | null = null;
    let universityGradYear: string | null = null;
    const educationSection = $('section[data-section="educationsDetails"]');
    if (educationSection.length > 0) {
        educationSection.find('ul > li.education__list-item').each((_, el) => {
            const schoolNameElement = $(el).find('h3 a').first().length ? $(el).find('h3 a').first() : $(el).find('h3').first();
            const schoolName = schoolNameElement.text().trim() || null;
            const degreeMajorElement = $(el).find('h4').first();
            const degreeMajorText = degreeMajorElement.text().trim() || null;
            const dateRangeElement = $(el).find('span.date-range').first();
            const dateRangeText = dateRangeElement.text().trim() || null;

            if (schoolName?.toLowerCase().includes('high school')) {
                if (!highSchool) {
                    highSchool = schoolName;
                    if (dateRangeText) {
                        const yearMatch = dateRangeText.match(/(\d{4})\s*$/);
                        HSGraduationYear = yearMatch ? yearMatch[1] : null;
                    }
                }
            } else {
                 if (!university) {
                    university = schoolName;
                    if (degreeMajorText) {
                        const parts = degreeMajorText.split(',').map(p => p.trim());
                        degree = parts[0] || null;
                    }
                     if (dateRangeText) {
                        const yearMatch = dateRangeText.match(/(\d{4})\s*$/);
                        universityGradYear = yearMatch ? yearMatch[1] : null;
                    }
                 }
            }
        });
    } else {
        console.log(`[convertSingleFile] Education section not found for ${baseName}`);
    }

    // Check for NAF Involvement (Capture String).
    let NAFAcademy: string | null = null;
    let NAFTrackCertified: string | null = null;
    const certSection = $('section[data-section="certifications"]');
    if (certSection.length > 0) {
        certSection.find('ul > li').each((_, el) => {
            const certName = $(el).find('h3').first().text().trim() || null;
            const issuerName = $(el).find('h4 a').first().text().trim() || null;
            if (!NAFTrackCertified && certName?.toLowerCase().includes('naftrack')) {
                NAFTrackCertified = certName;
            }
            if (!NAFAcademy && certName?.toLowerCase().includes('academy of finance')) {
                NAFAcademy = certName;
            }
            if (issuerName?.toLowerCase() === 'naf') {
                 if (!NAFTrackCertified) NAFTrackCertified = certName ?? "NAF Issued Certification";
                 if (!NAFAcademy) NAFAcademy = certName ?? "NAF Issued Certification";
            }
        });
    }
    const orgSection = $('section[data-section="organizations"]');
     if (!NAFAcademy && orgSection.length > 0) {
        orgSection.find('ul > li').each((_, el) => {
            const orgName = $(el).find('h3').first().text().trim() || null;
            if (orgName?.toLowerCase().includes('academy of finance')) {
                NAFAcademy = orgName;
                return false;
            }
        });
    }
    if (!NAFAcademy && educationSection.length > 0) {
        educationSection.find('ul > li.education__list-item').each((_, el) => {
            const description = $(el).find('div[data-section="educations"] p').first().text().trim() || null;
            if (description?.toLowerCase().includes('academy of finance')) {
                NAFAcademy = "Academy of Finance (Mentioned in Education)";
                return false;
            }
        });
    }

    // Extract Current Job.
    let currentJob: string | null = null;
    const expSection = $('section[data-section="experience"]');
    if (expSection.length > 0) {
        const firstExperienceItem = expSection.find('ul.experience__list > li').first();
        const firstExpPosition = firstExperienceItem.hasClass('experience-group')
            ? firstExperienceItem.find('ul.experience-group__positions > li').first()
            : firstExperienceItem;
        if (firstExpPosition.length > 0) {
            const title = $(firstExpPosition).find('h3 span.experience-item__title').first().text().trim() || null;
            const company = $(firstExpPosition).find('h4 span.experience-item__subtitle').first().text().trim() || null;
            currentJob = title && company ? `${title} at ${company}` : title || company;
        }
    }
    currentJob = currentJob || headlineH2;

    // Extract Internship Data.
    let internshipCompany1: string | null = null;
    let internshipEndDate1: string | null = null;
    if (expSection.length > 0) {
         expSection.find('ul > li').each((_, el) => {
            const title = $(el).find('h3 span.experience-item__title').first().text().trim() || null;
            const companyElement = $(el).find('h4 span.experience-item__subtitle').first();
            const dateElement = $(el).find('span.date-range').first();

            if (title?.toLowerCase().includes('intern') || title?.toLowerCase().includes('analyst')) {
                const durationText = dateElement.text().trim() || null;
                if (durationText && (durationText.includes('mos') || /^\d+\s+yr(s)?$/.test(durationText) || /^\d{1,2}\s+mo(s)?$/.test(durationText))) {
                     if (!internshipCompany1) {
                        internshipCompany1 = companyElement.text().trim() || null;
                         if (durationText) {
                            const endDateMatch = durationText.match(/–\s*(\w+\s+\d{4}|\d{4})/);
                            internshipEndDate1 = endDateMatch ? endDateMatch[1] : null;
                             if (!internshipEndDate1) {
                                 const singleDateMatch = durationText.match(/(\w+\s+\d{4}|\d{4})/);
                                 internshipEndDate1 = singleDateMatch ? singleDateMatch[1] : null;
                             }
                        }
                     }
                }
            }
        });
    }

    // Assemble Final JSON Data.
    const data: ProfileData = {
      fullName: fullName,
      jobTitle: jobTitle,
      location: location,
      linkedinLink: linkedinLink,
      email: email,
      phoneNumber: phoneNumber,
      highSchool: highSchool,
      HSGraduationYear: HSGraduationYear,
      NAFAcademy: NAFAcademy,
      NAFTrackCertified: NAFTrackCertified,
      city: city,
      currentJob: currentJob,
      universityGradYear: universityGradYear,
      university: university,
      degree: degree,
      internshipCompany1: internshipCompany1,
      internshipEndDate1: internshipEndDate1,
    };

    // Write Data to JSON File.
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[convertSingleFile] Successfully converted ${baseName} -> ${id}.json`);

    // Insert JSON data into PostgreSQL (using the insertCrawlerData function)
    try {
      await insertCrawlerData(baseName, data);  // Use this to insert into PostgreSQL
      console.log(`[convertSingleFile] Successfully inserted ${baseName} -> ${id} into database`);
    } catch (error: unknown) {
      // Handle the error properly when it's unknown
      if (error instanceof Error) {
        console.error(`[convertSingleFile] Error inserting data into PostgreSQL:`, error.message);
      } else {
        console.error(`[convertSingleFile] Unknown error occurred during insertion.`);
      }
    }

  } catch (err: any) {
  console.error(`[convertSingleFile] Error converting ${baseName}:`, err);
  }
}

// Processes existing HTML files that haven't been converted to JSON yet.
// Processes existing HTML files that haven't been converted to JSON yet.
export async function convertNewHtmlFiles() {
  console.log('\n--- Starting batch HTML to JSON conversion ---');
  let convertedCount = 0;
  let skippedCount = 0;

  try {
    // Read HTML directory and filter for .html files.
    const files = await fsp.readdir(pagesDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    console.log(`Found ${htmlFiles.length} HTML files in ${pagesDir}. Checking for conversions...`);

    // Loop through HTML files, check if JSON exists, convert if not.
    for (const htmlFile of htmlFiles) {
      const idMatch = htmlFile.match(/^([^_]+)/);
      if (!idMatch) {
        console.log(`Skipping ${htmlFile}: Could not extract ID from filename.`);
        continue;
      }
      const id = idMatch[1];
      const jsonPath = path.join(jsonDir, `${id}.json`);
      console.log(`Checking: ${htmlFile} (ID: ${id}, Expecting JSON: ${jsonPath})`);

      try {
        if (fs.existsSync(jsonPath)) {
          console.log(`Skipping ${htmlFile}: JSON already exists.`);
          skippedCount++;
        } else {
          console.log(`Converting ${htmlFile}: JSON not found.`);
          await convertSingleFile(htmlFile);
          convertedCount++;

          // After converting the file, insert the data into the database
          const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); // Read the JSON file
          await insertCrawlerData(htmlFile, jsonData); // Insert into the database
          console.log(`[convertNewHtmlFiles] Successfully inserted data for ${htmlFile} into database.`);
        }
      } catch (error: unknown) {
        console.error(`Error processing ${htmlFile}:`, error);
      }
    }

    // Log batch completion summary.
    console.log(`Batch conversion complete. Converted: ${convertedCount}, Skipped (already exist): ${skippedCount}`);
  } catch (err: unknown) {
    console.error(`Error reading pages directory during batch conversion:`, err);
  }
  console.log('Finished HTML to JSON conversion\n');
}
