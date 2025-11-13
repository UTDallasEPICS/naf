export type Column = {
  name: string;
  sticky: boolean;
  chars: number;
};

export type Item = {
  recordType: "record";
  collectionId: string;
  recordId: string;
  imageIds: string[];
  collectionTitle: string;
  primaryCategory: string;
  fields: {
    label: string;
    text: string;
    alternateValues: string[];
  }[];
  hasImageViewRights: boolean;
  hasRecordViewRights: boolean;
  recordRightsChecker: string;
  imageRightsChecker: string;
  imageToken: string;
};

export type Response = {
  recordJudgments: null;
  collectionTitle: string;
  collectionId: string;
  columns: Column[];
  page: {
    size: number;
    hitCount: number;
    totalPages: number;
  };
  results: {
    hitCount: number;
    items: Item[];
    // don't really care about this
    facetMetadata: unknown;
    page: {
      number: number;
      cursor: null;
      size: number;
    };
    queryQualityScore: number;
    columns: Column[];
    stickyIndex: 1;
    queryId: string;
  };
  guidance: Array<string>;
  facetFiltersIgnored: Array<any>;
  partnerContract: Record<string, null>;
};