import puppeteer from 'puppeteer-extra';

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
};

// Constant values used to access ancestry yearbook page
const constants = {
  usYearbookAncestryCollection: "1265",
  ancestryResultCountPerRequest: 100,
} as const;

// 
export async function puppeteerRequestNames(args: RequestNamesArgs){
    const browser = await puppeteer.launch({args: ["--no-sandbox", "--disable-setuid-sandbox"], headless: true, devtools: true});
    const page = await browser.newPage();
    const searchParams = new URLSearchParams();

    searchParams.set(
    "event",
    `${args.year}_${args.city.toLowerCase()}-${args.state.toLowerCase()}-${args.countryCode.toLowerCase()}`,
    );
    searchParams.set("keyword", `${args.highSchool}`);
    searchParams.set("pg", `${args.page}`);
    //searchParams.set("count", `${constants.ancestryResultCountPerRequest}`);
    //searchParams.set("collections", constants.usYearbookAncestryCollection);

    const url = `https://www.ancestry.com/search/collections/${constants.usYearbookAncestryCollection}/?${searchParams.toString()}`;
    
    console.log("Accessing url: ", { url });
    await page.goto(url);
    await page.setViewport({ width: 1080, height: 1024 });

    const html = await page.content()
    console.log(html)
    const tableRowSelector='tbody > tr';

    const fullNameList = await page.$$eval(tableRowSelector, nodes =>
      nodes.map(n => (n.children[1] as HTMLElement).innerText),
    );
    
    console.log(fullNameList)
    
    await browser.close();
}

export type BulkRequestNamesArgs = Omit<RequestNamesArgs, "page"> & {
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


