require("dotenv").config({
    path: require("path").join(__dirname, "../../.env")
  });
const path = require("path");
const Database = require("better-sqlite3");
const SerpApi = require("google-search-results-nodejs");

const db = new Database(path.join(__dirname, "bryanadams.db"));
const search = new SerpApi.GoogleSearch(process.env.SERPAPI_KEY);

// Add columns if needed
try {
  db.exec(`ALTER TABLE names ADD COLUMN linkedin_url TEXT`);
} catch (err) {}

try {
  db.exec(`ALTER TABLE names ADD COLUMN search_status TEXT`);
} catch (err) {}

try {
  db.exec(`ALTER TABLE names ADD COLUMN last_checked_at TEXT`);
} catch (err) {}

// Remove duplicate names, keeping the smallest id
db.exec(`
  DELETE FROM names
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM names
    GROUP BY value
  )
`);

const getNames = db.prepare(`
  SELECT id, value
  FROM names
  WHERE linkedin_url IS NULL OR linkedin_url = ''
`);

const updateRow = db.prepare(`
  UPDATE names
  SET linkedin_url = ?,
      search_status = ?,
      last_checked_at = datetime('now')
  WHERE id = ?
`);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanGoogleResultUrl(link) {
  if (!link) return null;

  try {
    const url = new URL(link);

    if (url.hostname.includes("linkedin.com") && url.pathname.startsWith("/in/")) {
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

function searchLinkedIn(name, start = 250) {
  return new Promise((resolve, reject) => {
    search.json(
      {
        q: `site:linkedin.com/in "${name}"`,
        num: 10,
        start: start
      },
      (data) => {
        try {
          if (!data.organic_results) return resolve(null);

          for (const result of data.organic_results) {
            if (result.link && result.link.includes("linkedin.com/in/")) {
              return resolve(result.link);
            }
          }

          resolve(null);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

async function main() {
  if (!process.env.SERPAPI_KEY) {
    throw new Error("Missing SERPAPI_KEY in .env");
  }

  const rows = getNames.all();

  if (rows.length === 0) {
    console.log("No names to process.");
    return;
  }

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

      await delay(1500);
    } catch (err) {
      console.error(`Error for ${row.value}: ${err.message}`);
      updateRow.run(null, "error", row.id);
      await delay(2000);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});