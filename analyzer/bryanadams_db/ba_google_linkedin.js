require("dotenv").config({
    path: require("path").join(__dirname, "../../.env") // from bryanadams_db -> analyzer -> naf
  });
  
  const path = require("path");
  const Database = require("better-sqlite3");
  
  const db = new Database(path.join(__dirname, "bryanadams.db"));
  
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const GOOGLE_CX = process.env.GOOGLE_CX;
  
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    throw new Error("Missing GOOGLE_API_KEY or GOOGLE_CX in .env");
  }
  
  const START_AT_NAME = 242; // starts at the 242nd name
  const OFFSET = START_AT_NAME - 1;
  
  try { db.exec(`ALTER TABLE names ADD COLUMN linkedin_url TEXT`); } catch (err) {}
  try { db.exec(`ALTER TABLE names ADD COLUMN search_status TEXT`); } catch (err) {}
  try { db.exec(`ALTER TABLE names ADD COLUMN last_checked_at TEXT`); } catch (err) {}
  
  const getNames = db.prepare(`
    SELECT id, value
    FROM names
    WHERE linkedin_url IS NULL OR linkedin_url = ''
    ORDER BY id
    LIMIT -1 OFFSET ?
  `);
  
  const updateRow = db.prepare(`
    UPDATE names
    SET linkedin_url = ?,
        search_status = ?,
        last_checked_at = datetime('now')
    WHERE id = ?
  `);
  
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function cleanLinkedInUrl(link) {
    if (!link) return null;
  
    try {
      const url = new URL(link);
  
      if (
        url.hostname.includes("linkedin.com") &&
        url.pathname.startsWith("/in/")
      ) {
        url.search = "";
        url.hash = "";
        return url.toString();
      }
  
      return null;
    } catch {
      return null;
    }
  }
  
  async function searchLinkedIn(name) {
    const query = `site:linkedin.com/in "${name}"`;
  
    const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
    url.searchParams.set("key", GOOGLE_API_KEY);
    url.searchParams.set("cx", GOOGLE_CX);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "5");
  
    const response = await fetch(url);
  
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google API error ${response.status}: ${body}`);
    }
  
    const data = await response.json();
  
    if (!data.items || data.items.length === 0) {
      return null;
    }
  
    for (const item of data.items) {
      const cleaned = cleanLinkedInUrl(item.link);
      if (cleaned) return cleaned;
    }
  
    return null;
  }
  
  async function main() {
    const rows = getNames.all(OFFSET);
  
    console.log(`Starting at name #${START_AT_NAME}`);
    console.log(`Names left to check: ${rows.length}`);
  
    for (const row of rows) {
      try {
        console.log(`Searching: ${row.value}`);
  
        const linkedinUrl = await searchLinkedIn(row.value);
  
        if (linkedinUrl) {
          updateRow.run(linkedinUrl, "found", row.id);
          console.log(`Found: ${linkedinUrl}`);
        } else {
          updateRow.run(null, "not_found", row.id);
          console.log("No LinkedIn profile found.");
        }
  
        await delay(1000);
      } catch (err) {
        console.error(`Error for ${row.value}: ${err.message}`);
        updateRow.run(null, "error", row.id);
        await delay(2000);
      }
    }
  
    console.log("Done.");
  }
  
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });