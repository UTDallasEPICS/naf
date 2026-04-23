const fs = require('fs');
const Database = require('better-sqlite3');

// open/create database
const db = new Database('bryanadams.db');

// create table
db.exec(`
  CREATE TABLE IF NOT EXISTS names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL
  )
`);

// read file
const fileData = fs.readFileSync('names.txt', 'utf-8');

// split into lines
const names = fileData.split('\n');

// prepare insert statement
const insert = db.prepare("INSERT INTO names (value) VALUES (?)");

// OPTIONAL: use transaction for speed
const insertMany = db.transaction((namesArray) => {
  for (const name of namesArray) {
    const trimmed = name.trim();
    if (trimmed.length > 0) { // skip empty lines
      insert.run(trimmed);
    }
  }
});

// run it
insertMany(names);

console.log("Inserted names successfully!");
const rows = db.prepare("SELECT * FROM names").all();
console.log(rows);