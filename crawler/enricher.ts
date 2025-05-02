import {Builder} from 'selenium-webdriver'; // Builder() is a Selenium class used to construct a WebDriver instance.
import chrome, { ServiceBuilder } from 'selenium-webdriver/chrome'; //we are supposed to mention the browser we will use
import chromedriver from 'chromedriver';
import { Client } from 'pg';
import 'dotenv/config'; // get the dot env file

const client = new Client({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  });

  async function main(){
    try{

        await client.connect();
        console.log('Connected to PostgreSQL');

        const fullName = 'Aashna Gajaria';

        const crawlerRes = await client.query(
            `SELECT json FROM crawler_data WHERE json->>'fullName' = $1 LIMIT 1`,
            [fullName]
          );
      
          if (crawlerRes.rows.length === 0) {
            console.log(`No crawler data found for ${fullName}`);
            return;
          }
      
          const data = crawlerRes.rows[0].json;
      
          // Step 2: Insert relevant fields into enricher_data
          await client.query(`
            INSERT INTO enricher_data (
              profile_url,
              timestamp,
              full_name,
              email,
              phone_number,
              high_school,
              hs_graduation_year,
              naf_academy,
              naf_track_certified,
              city,
              current_job,
              university,
              degree,
              linkedin_link,
              university_grad_year,
              internship_company1,
              internship_end_date1
            ) VALUES (
              $1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14, $15, NULL
            );
          `, [
            data.linkedinLink,         // profile_url
            data.fullName,             // full_name
            data.email,                // email
            data.phoneNumber,          // phone_number
            data.highSchool,           // high_school
            data.HSGraduationYear,     // hs_graduation_year
            data.NAFAcademy,           // naf_academy
            data.NAFTrackCertified,    // naf_track_certified
            data.city,                 // city
            data.currentJob,           // current_job
            data.university,           // university
            data.degree,               // degree
            data.linkedinLink,         // linkedin_link
            data.universityGradYear,   // university_grad_year
            data.internshipCompany1    // internship_company1
          ]);
      
          console.log(`Successfully enriched data for ${fullName}`);

    }
    catch (err) {
        console.error('Error:', err);
      }
    finally{
        await client.end();
    }
  }
  
 main();

const serviceBuilder = new chrome.ServiceBuilder(chromedriver.path);
const Options = chrome.Options;    //The Chrome-specific configuration options you can pass to customize how Chrome runs when used with Selenium WebDriver.

interface Person{
    fullName: String;
    email?: string;
    phone?: string;
    school?: string;
}

interface SearchResult {
    items?: { link: string }[];
    error?: any;
  }
const person: Person = {
    fullName: 'Shahreen Iqbal',
    email: 'singhbarkat1011@gmail.com',
    phone: '',
    school: 'University Of Texas, Dallas',
}


async function findLinkedinProfile(person: Person): Promise<void> {
    const { fullName, school } = person;
    const [firstName, ...lastNameParts] = fullName.split(" ");
    const lastName = lastNameParts.join(" ");

    const apiKey = process.env.API_KEY;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
        console.error('API_KEY or SEARCH_ENGINE_ID not set in .env');
        process.exit(1);
    }

    const queryVariations = [
        `site:linkedin.com/in "${fullName}"`,
        `site:linkedin.com/in "${firstName} ${lastName}"`,
        school ? `site:linkedin.com/in "${fullName}" "${school}"` : '',
        school ? `site:linkedin.com/in "${firstName} ${lastName}" "${school}"` : ''
    ].filter(Boolean); // Remove empty strings

    const chromeOptions = new Options();
    chromeOptions.addArguments(
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-application-cache',
        '--disable-extensions',
        '--disable-notifications',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disk-cache-size=0',
        '--media-cache-size=0',
        '--aggressive-cache-discard'
    );

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .setChromeService(serviceBuilder)
        .build();

    try {
        const allResults: any[] = [];
        const seenUrls = new Set<string>();

        for (const query of queryVariations) {
            console.log(`Searching with query: ${query}`);
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5&${Date.now()}`;

            const data = await driver.executeAsyncScript(function (url: string, callback: Function) {
                fetch(url)
                    .then(res => res.json())
                    .then(result => callback(result))
                    .catch(err => callback({ error: err.toString() }));
            }, url) as SearchResult;

            const results = (data.items || []).filter((item: any) =>
                item.link.includes('linkedin.com/in') && !seenUrls.has(item.link)
            );

            for (const result of results) {
                seenUrls.add(result.link);
                allResults.push(result);
            }
        }

        if (allResults.length === 0) {
            console.log('No LinkedIn profiles found.');
        } else {
            console.log(`Top LinkedIn Matches for "${fullName}":`);
            allResults.forEach((item, index) => {
                console.log(`${index + 1}. ${item.link}`);
            });
        }
    } finally {
        await driver.quit();
    }
}

findLinkedinProfile(person).catch(console.error);