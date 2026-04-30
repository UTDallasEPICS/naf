require("dotenv").config({
    path: require("path").join(__dirname, "../../.env")
  });
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
if (!SERPAPI_KEY) throw new Error("Missing SERPAPI_KEY in .env");

const INPUT_FILE = "academies.txt";
const DB_FILE = "academy_alumni_links.db";

// Change this to the line/index where you want to resume
const START_INDEX = 11;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readAcademies() {
  return fs.readFileSync(INPUT_FILE, "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

function buildQueries(academy) {
  return [
    `"${academy}" alumni database`,
    `"${academy}" alumni directory`,
    `"${academy}" alumni association`,
    `"${academy}" classmates alumni`,
    `"${academy}" site:alumniclass.com`,
    `"${academy}" site:classmates.com`,
    `"${academy}" site:allhighschools.com`,
  ];
}

function scoreResult(result) {
  const text = `${result.title || ""} ${result.link || ""} ${result.snippet || ""}`.toLowerCase();

  let score = 0;
  if (text.includes("alumni")) score += 5;
  if (text.includes("database")) score += 4;
  if (text.includes("directory")) score += 4;
  if (text.includes("association")) score += 3;
  if (text.includes("classmates")) score += 3;
  if (text.includes("alumniclass")) score += 3;
  if (text.includes("allhighschools")) score += 2;

  return score;
}

function openDb() {
  const db = new sqlite3.Database(DB_FILE);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS academy_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        academy TEXT NOT NULL,
        link TEXT NOT NULL,
        title TEXT,
        snippet TEXT,
        query TEXT,
        score INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(academy, link)
      )
    `);
  });

  return db;
}

function insertResult(db, result) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT OR IGNORE INTO academy_links
      (academy, link, title, snippet, query, score)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        result.academy,
        result.link,
        result.title,
        result.snippet,
        result.query,
        result.score,
      ],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function searchSerpApi(query) {
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: SERPAPI_KEY,
    num: "10",
    gl: "us",
    hl: "en",
  });

  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`SerpAPI error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  const db = openDb();

  const academies = readAcademies().slice(START_INDEX);

  console.log(`Starting at index ${START_INDEX}`);
  console.log(`Academies remaining: ${academies.length}`);

  for (const academy of academies) {
    console.log(`Searching: ${academy}`);

    for (const query of buildQueries(academy)) {
      try {
        const data = await searchSerpApi(query);
        const results = data.organic_results || [];

        for (const result of results) {
          if (!result.link) continue;

          const row = {
            academy,
            link: result.link,
            title: result.title || "",
            snippet: result.snippet || "",
            query,
            score: scoreResult(result),
          };

          await insertResult(db, row);
        }

        await delay(1200);
      } catch (err) {
        console.error(`Error on "${query}": ${err.message}`);
      }
    }
  }

  db.close();
  console.log(`Done. Results saved to ${DB_FILE}`);
}

main();