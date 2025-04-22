import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { load, type CheerioAPI } from 'cheerio';

// Define an interface for the structure of the extracted profile data.
// Specifies the expected fields and their types (string or null, boolean).
interface ProfileData {
  fullName: string | null;
  jobTitle: string | null;
  location: string | null;
  linkedinLink: string | null;
  email: string | null;
  phoneNumber: string | null;
  highSchool: string | null;
  HSGraduationYear: string | null;
  NAFAcademy: boolean;
  NAFTrackCertified: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  birthdate: string | null;
  militaryBranchServed: string | null;
  currentJob: string | null;
  collegeMajor: string | null;
  universityGradYear: string | null;
  university: string | null;
  degree: string | null;
  schoolDistrict: string | null;
  internshipCompany1: string | null;
  internshipEndDate1: string | null;
}

// Define constant paths for the directories where HTML pages are stored
// and where the resulting JSON files will be saved.
const pagesDir = path.join(process.cwd(), 'pages');
const jsonDir = path.join(process.cwd(), 'data_json');

// Ensure the 'pages' and 'data_json' directories exist, creating them if necessary.
if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });
if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });

// Helper function to extract content from a meta tag using a CSS selector.
// Takes a CheerioAPI instance ($) and selector string, returns content or null.
function getMeta($: CheerioAPI, sel: string): string | null {
  return $(sel).attr('content') ?? null; // Get 'content' attribute, default to null if not found
}

// Helper function to extract trimmed text content from an element using a CSS selector.
// Takes a CheerioAPI instance ($) and selector string, returns trimmed text or null.
function getText($: CheerioAPI, sel: string): string | null {
  const t = $(sel).text().trim(); // Get text, trim whitespace
  return t || null; // Return text if not empty, otherwise null
}

// Helper function to extract specific data from JSON-LD script tags using a regex.
// Takes a CheerioAPI instance ($) and a RegExp, returns the matched group or null.
function getJsonLd($: CheerioAPI, rx: RegExp): string | null {
  // Find script tags of type application/ld+json and get their HTML content.
  const script = $('script[type="application/ld+json"]').html();
  if (!script) return null; // Return null if no such script found
  // Try to match the regex within the script content.
  const m = script.match(rx);
  return m?.[1] ?? null; // Return the first capture group (m[1]) or null if no match
}

// Function to convert a single HTML file (specified by filename) to a JSON file.
// It parses the HTML, extracts data using helper functions, and writes a JSON file.
export function convertSingleFile(htmlFilename: string) {
  const baseName = path.basename(htmlFilename); // Get the filename part (e.g., 'profile_ts.html')
  const htmlPath = path.join(pagesDir, baseName); // Construct the full path to the HTML file

  // Extract the profile ID from the filename (assumes format 'id_timestamp.html').
  const id = baseName.split('_')[0];
  const jsonPath = path.join(jsonDir, `${id}.json`); // Construct the full path for the output JSON file

  // Check if the JSON file already exists; if so, skip conversion.
  if (fs.existsSync(jsonPath)) {
    // console.log(`JSON file already exists for ${baseName}. Skipping conversion.`);
    return; // Exit the function
  }

  // Check if the source HTML file exists before proceeding.
  if (!fs.existsSync(htmlPath)) {
    console.warn(`HTML file ${baseName} not found at path ${htmlPath} during conversion attempt.`);
    return; // Exit if HTML file is missing
  }

  console.log(`Attempting conversion for: ${baseName}`);
  try {
    // Read the HTML file content.
    const html = fs.readFileSync(htmlPath, 'utf-8');
    // Load the HTML content into Cheerio for parsing.
    const $ = load(html);

    // Create a data object conforming to the ProfileData interface.
    // Use helper functions (getMeta, getText, getJsonLd) to extract data.
    const data: ProfileData = {
      fullName: (() => { // Immediately Invoked Function Expression (IIFE) for complex logic
        const f = getMeta($, 'meta[property="profile:first_name"]');
        const l = getMeta($, 'meta[property="profile:last_name"]');
        return f && l ? `${f} ${l}` : f || l || null; // Combine first/last name if both exist
      })(),
      jobTitle: getMeta($, 'meta[property="og:title"]'), // Extract job title from Open Graph meta tag
      location: getJsonLd($, /"addressLocality":"(.*?)"/), // Extract location from JSON-LD
      linkedinLink: getMeta($, 'meta[property="og:url"]'), // Extract LinkedIn URL from Open Graph meta tag
      email: $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') ?? null, // Extract email from mailto link
      phoneNumber: getText($, 'span.phone'), // Extract phone number from span with class 'phone' (example selector)
      // Extract various profile details from specific meta tags or JSON-LD.
      highSchool: getMeta($, 'meta[property="profile:high_school"]'),
      HSGraduationYear: getMeta($, 'meta[property="profile:hs_graduation_year"]'),
      NAFAcademy: getMeta($, 'meta[property="profile:NAF_academy"]') === 'true', // Convert string 'true' to boolean
      NAFTrackCertified: getMeta($, 'meta[property="profile:NAF_certified"]') === 'true', // Convert string 'true' to boolean
      address: getJsonLd($, /"streetAddress":"(.*?)"/),
      city: getJsonLd($, /"addressLocality":"(.*?)"/), // Note: Same regex as location
      state: getJsonLd($, /"addressRegion":"(.*?)"/),
      zipCode: getJsonLd($, /"postalCode":"(.*?)"/),
      birthdate: getMeta($, 'meta[property="profile:birthdate"]'),
      militaryBranchServed: getMeta($, 'meta[property="profile:military_branch"]'),
      currentJob: getMeta($, 'meta[property="profile:current_job"]'),
      collegeMajor: getMeta($, 'meta[property="profile:college_major"]'),
      universityGradYear: getMeta($, 'meta[property="profile:university_graduation_year"]'),
      university: getMeta($, 'meta[property="profile:university"]'),
      degree: getMeta($, 'meta[property="profile:degree"]'),
      schoolDistrict: getMeta($, 'meta[property="profile:school_district"]'),
      internshipCompany1: getMeta($, 'meta[property="profile:internship_company_1"]'),
      internshipEndDate1: getMeta($, 'meta[property="profile:internship_end_date_1"]'),
    };

    // Write the extracted data object to a JSON file, pretty-printed with 2 spaces.
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully converted ${baseName} → ${id}.json`);
  } catch (err: any) {
    // Handle specific file access errors gracefully (e.g., file busy or just deleted).
    if (err.code === 'EBUSY' || err.code === 'ENOENT') {
      console.warn(`Skipping ${baseName} conversion due to file access issue (${err.code}).`);
    } else {
      // Log other unexpected errors during conversion.
      console.error(`Error converting ${baseName}:`, err);
    }
  }
}

// Asynchronous function to perform a batch conversion of all HTML files in the 'pages' directory
// that do not already have a corresponding JSON file in the 'data_json' directory.
export async function convertNewHtmlFiles() {
  console.log('\n--- Starting batch HTML to JSON conversion ---');
  let convertedCount = 0;
  let skippedCount = 0;

  try {
    // Read all files in the pages directory.
    const files = await fsp.readdir(pagesDir);
    // Filter for files ending with '.html'.
    const htmlFiles = files.filter(f => f.endsWith('.html'));

    console.log(`Found ${htmlFiles.length} HTML files in ${pagesDir}. Checking for conversions...`);

    // Iterate through each found HTML file.
    for (const htmlFile of htmlFiles) {
      // Extract the profile ID from the filename.
      const id = htmlFile.split('_')[0];
      const jsonPath = path.join(jsonDir, `${id}.json`); // Construct the expected JSON path

      try {
        // Check if the corresponding JSON file already exists using the promises API.
        await fsp.access(jsonPath, fs.constants.F_OK);
        // If access succeeds (no error thrown), the file exists. Increment skip count.
        skippedCount++;
      } catch (error: any) {
        // If an error occurs, check if it's 'ENOENT' (Error NO ENTry/File Not Found).
        if (error.code === 'ENOENT') {
          // If JSON file doesn't exist, call convertSingleFile to process the HTML.
          convertSingleFile(htmlFile);
          convertedCount++; // Increment converted count
        } else {
          // Log any other errors encountered during the JSON file check.
          console.error(`Error checking JSON file ${jsonPath}:`, error);
        }
      }
    }

    // Log summary of the batch conversion results.
    console.log(`Batch conversion complete. Converted: ${convertedCount}, Skipped (already exist): ${skippedCount}`);
  } catch (err) {
    // Catch and log errors related to reading the pages directory itself.
    console.error(`Error reading pages directory during batch conversion: ${err}`);
  }

  console.log('--- Finished batch HTML to JSON conversion ---\n');
}

// Function to set up a file system watcher on the 'pages' directory.
// This will automatically trigger `convertSingleFile` when new HTML files are added or changed.
export function startFileWatcher(): void {
  console.log(`Starting file watcher for directory: ${pagesDir}`);

  try {
    // Use fs.watch to monitor the pages directory for changes.
    fs.watch(pagesDir, (eventType, filename) => {
      // Check if the event involves a filename and if it ends with '.html'.
      if (filename && filename.endsWith('.html')) {
        console.log(`File event detected: ${eventType} - ${filename}`);

        // Use setTimeout to debounce and ensure the file write is complete before processing.
        // This helps avoid issues where the watcher triggers before the file is fully written.
        setTimeout(() => {
          const filePath = path.join(pagesDir, filename);
          // Double-check if the file still exists before attempting conversion.
          if (fs.existsSync(filePath)) {
            console.log(`Processing HTML file: ${filename}`);
            convertSingleFile(filename); // Call the conversion function
          } else {
             console.log(`File ${filename} no longer exists. Skipping processing.`);
          }
        }, 500); // Wait 500ms before processing
      }
    });

    console.log('File watcher is running. HTML files will be converted to JSON automatically when saved.');
  } catch (error) {
    // Catch and log any errors that occur during the setup of the file watcher.
    console.error('Error starting file watcher:', error);
  }
}

// Start the file watcher immediately when this module is loaded.
startFileWatcher();

// Check if this script is being run directly (not imported as a module).
// If run directly, execute the batch conversion function.
if (require.main === module) {
  convertNewHtmlFiles();
}