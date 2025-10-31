import puppeteer, { VanillaPuppeteer } from 'puppeteer-extra';

import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Apply the stealth plugin
puppeteer.use(StealthPlugin());


// Arguments to be used in the url
export type RequestNamesArgs = {
  year: number;
  city: string;
  state: string;
  countryCode: string;
  highSchool: string;
  page: number;
  browser: Awaited<ReturnType<VanillaPuppeteer["launch"]>>
};

// Constant values used to access ancestry yearbook page
const constants = {
  usYearbookAncestryCollection: "1265",
  ancestryResultCountPerRequest: 100,
} as const;

// 
export async function puppeteerRequestNames(args: RequestNamesArgs){
  // const browser = puppeteer.launch({args: ["--no-sandbox", "--disable-setuid-sandbox"], headless: true, devtools: true});
  
  const page = await args.browser.newPage();
    const searchParams = new URLSearchParams();
    let returnValues = [];

    searchParams.set(
    "event",
    `${args.year}_${args.city.toLowerCase()}-${args.state.toLowerCase()}-${args.countryCode.toLowerCase()}`,
    );
    searchParams.set("keyword", `${args.highSchool}`);
    searchParams.set("pg", `${args.page}`);
    //searchParams.set("count", `${constants.ancestryResultCountPerRequest}`);
    //searchParams.set("collections", constants.usYearbookAncestryCollection);

    //-----
    const url = `https://www.ancestry.com/search/collections/${constants.usYearbookAncestryCollection}/?${searchParams.toString()}`;
    
    console.log("Accessing url: ", { url });
    await page.goto(url, {waitUntil: 'load'});
    await page.setViewport({ width: 1080, height: 1024 });

    const html = await page.content()
    // console.log(html)
    const tableRowSelector='tbody > tr';
    
    const fullNameList = await page.$$eval(tableRowSelector, nodes =>
      
      nodes.map(n => (n.children[1] as HTMLElement).innerText),
    );
    
    console.log(fullNameList)
    //-----
    const maxPageSelector='#resultsPagination > div > div.ancCol.w66 > nav > span > span'
    const maxPage = await page.$eval(maxPageSelector, el => (el as HTMLElement).innerText);
    
    // await browser.close();
    returnValues.push(fullNameList);
    returnValues.push(maxPage)
    return returnValues as [string[], string];
}

export type BulkRequestNamesArgs = Omit<RequestNamesArgs, "page" | "browser"> & {
  fetch: (
    | {
        mode: "unlimited";
      }
    | {
        mode: "limited";
        pageLimit: number;
      }
  ) & {
    startPage?: number;
  };
};


export async function bulkRequestNamesFromAncestry(args: BulkRequestNamesArgs) {
  const { year, city, state, countryCode, highSchool, fetch } = args;

  const results: string[] = [];

  const startPage = fetch.startPage ?? 1;
  const browser = await puppeteer.launch({args: ["--no-sandbox", "--disable-setuid-sandbox"], headless: true, devtools: true})

  let page = startPage;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await puppeteerRequestNames({
      year,
      city,
      state,
      countryCode,
      highSchool,
      page,
      browser,
    });
    if (!response) {
      console.error("Missing response - breaking early", { response });
      break;
    }
    // const responseResults = response?.results;
    // if (!responseResults) {
    //   console.error("Missing response results - breaking early", {
    //     responseResults,
    //   });
    //   break;
    // }
    // results.push(...responseResults.items);
    let maxPage = parseInt(response[1].replaceAll(",", ""))
    console.log(maxPage);
    hasNextPage = page < maxPage;
    page++;

    const crawledPageCount = page - startPage;

    console.log("Fetched page.", {
      nextPageToCrawl: page,
      crawledPageCount,
      hasNextPage,
    });
    if (fetch.mode === "limited" && crawledPageCount >= fetch.pageLimit) {
      break;
    }
  }

  console.log("Reached page limit or end of search results.");
  await browser.close()
  return results;
}
