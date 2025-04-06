export interface AcademyLocation {
  city: string;
  state: string;
  lat: number;
  lon: number;
}

export const ACADEMY_LOCATIONS: AcademyLocation[] = [
  {
    city: "Atmore",
    state: "AL",
    lat: 31.025837,
    lon: -87.506462,
  },
  {
    city: "Glendale",
    state: "AZ",
    lat: 33.548264,
    lon: -112.191696,
  },
  {
    city: "Los Angeles",
    state: "CA",
    lat: 34.052235,
    lon: -118.243683,
  },
  {
    city: "Miami",
    state: "FL",
    lat: 25.761681,
    lon: -80.191788,
  },
  // Add rest of academies
];

export interface PartnerCompany {
  name: string;
}

export const PARTNERED_COMPANIES: PartnerCompany[] = [
  {
    name: "Canva",
  },
  {
    name: "HOSA",
  },
  {
    name: "Verizon",
  },
  // Add rest of companies
];

export const DEFAULT_WEIGHTS = {
  highSchool: 0.25,
  internship: 0.2,
  currentJob: 0.15,
  proximityUnder50mi: 0.1,
  proximity50to100mi: 0.05,
} as const;
