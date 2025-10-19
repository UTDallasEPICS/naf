import type { Item, Response } from "./ancestry-api-types";

export type RequestNamesArgs = {
  year: number;
  city: string;
  state: string;
  countryCode: string;
  highSchool: string;
  page: number;
};

const constants = {
  usYearbookAncestryCollection: "1265",
  ancestryResultCountPerRequest: 100,
} as const;

export async function requestNamesFromAncestry(args: RequestNamesArgs) {
  const searchParams = new URLSearchParams();

  searchParams.set(
    "event",
    `${args.year}_${args.city.toLowerCase()}-${args.state.toLowerCase()}-${args.countryCode.toLowerCase()}`,
  );
  searchParams.set("pg", `${args.page}`);
  searchParams.set("keyword", `${args.highSchool}`);
  searchParams.set("count", `${constants.ancestryResultCountPerRequest}`);
  searchParams.set("collections", constants.usYearbookAncestryCollection);

  const url = `https://www.ancestry.com/api/search-results/collection-results?${searchParams.toString()}`;

  console.log("Sending request...", { url });
  const response = await fetch(url);

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    console.log("Successfully converted to JSON.");
    return data as Response;
  } catch (error) {
    console.error("Failed to convert response to JSON:", error);
    console.error("Response text:", text);
  }
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

export async function bulkRequestNamesFromAncestry(args: BulkRequestNamesArgs) {
  const { year, city, state, countryCode, highSchool, fetch } = args;

  const results: Item[] = [];

  const startPage = fetch.startPage ?? 1;

  let page = startPage;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await requestNamesFromAncestry({
      year,
      city,
      state,
      countryCode,
      highSchool,
      page,
    });
    if (!response) {
      console.error("Missing response - breaking early", { response });
      break;
    }
    const responseResults = response?.results;
    if (!responseResults) {
      console.error("Missing response results - breaking early", {
        responseResults,
      });
      break;
    }
    results.push(...responseResults.items);
    hasNextPage = page < response.page.totalPages;
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

  return results;
}
