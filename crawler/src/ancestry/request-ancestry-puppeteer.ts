import puppeteer from 'puppeteer';

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
    const browser = await puppeteer.launch({args: ["--no-sandbox", "--disable-setuid-sandbox"]});
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

    const url = `https://www.ancestry.com/search/collections/1265/?${searchParams.toString()}`;
    console.log("Accessing url: ", { url });
    await page.goto(url);
    await page.setViewport({ width: 1080, height: 1024 });

    const id='td[id="resultItem-0"]';
    const name = await page.locator(id).waitHandle();
    console.log("Page Locator Details: \n", name);
    
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



// run();