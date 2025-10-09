import fs from 'node:fs/promises';
import { bulkRequestNamesFromAncestry, type RequestNamesArgs } from './request-names-from-ancestry';

const sampleRequestArgs: RequestNamesArgs = {
  year: 1991,
  city: "Austin",
  state: "Texas",
  countryCode: "USA",
  highSchool: "Bowie High School",
  page: 1,
};


async function testAncestry() {
  const results = (await bulkRequestNamesFromAncestry({
      ...sampleRequestArgs,
      fetch: { pageLimit: 50, mode: "limited" },
      // fetch: { mode: "unlimited" },
    })).map(
    (item) => [item.recordId, item.fields.find((field) => field.label === "Name")?.text],
  );
  
  await fs.writeFile("scratch.results.json", JSON.stringify(results, null, 2));
}

testAncestry().then(() => {
  console.log("Test completed");
})
