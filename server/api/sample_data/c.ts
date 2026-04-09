// c.ts
// Sample mock data for alumni database schema

export type ConfirmedAlumni = {
  analyzer_id: number;
  profile_url?: string;
  confidence_percentage?: number;
  full_name?: string;
  email?: string;
  phone_number?: string;
  high_school?: string;
  hs_graduation_year?: string;
  naf_academy?: string;
  naf_track_certified?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  birthdate?: Date;
  gender?: string;
  ethnicity?: string;
  military_branch_served?: string;
  current_job?: string;
  college_major?: string;
  university_grad_year?: string;
  university?: string;
  degree?: string;
  linkedin_link?: string;
  school_district?: string;
  internship_company1?: string;
  internship_end_date1?: Date;
  internship_company2?: string;
  internship_end_date2?: Date;
  university2?: string;
  college_major2?: string;
  degree2?: string;
};

export const confirmedAlumniSample: ConfirmedAlumni[] = [
  {
    analyzer_id: 1,
    profile_url: "https://linkedin.com/in/janedoe",
    confidence_percentage: 98.7,
    full_name: "Jane Doe",
    email: "jane.doe@email.com",
    phone_number: "555-123-4567",
    high_school: "Richardson High School",
    hs_graduation_year: "2018",
    naf_academy: "Engineering",
    naf_track_certified: "STEM",
    address: "123 Main St",
    city: "Richardson",
    state: "TX",
    zip_code: "75080",
    birthdate: new Date("2000-04-15"),
    gender: "Female",
    ethnicity: "Hispanic",
    military_branch_served: "",
    current_job: "Software Engineer",
    college_major: "Computer Science",
    university_grad_year: "2022",
    university: "UT Dallas",
    degree: "Bachelor of Science",
    linkedin_link: "https://linkedin.com/in/janedoe",
    school_district: "Richardson ISD",
    internship_company1: "Texas Instruments",
    internship_end_date1: new Date("2021-08-01"),
    internship_company2: "Capital One",
    internship_end_date2: new Date("2022-05-15"),
    university2: "",
    college_major2: "",
    degree2: "",
  },
  {
    analyzer_id: 2,
    profile_url: "https://linkedin.com/in/johnsmith",
    confidence_percentage: 91.3,
    full_name: "John Smith",
    email: "john.smith@email.com",
    phone_number: "555-987-6543",
    high_school: "Plano East",
    hs_graduation_year: "2017",
    naf_academy: "Business",
    naf_track_certified: "Finance",
    address: "456 Oak Ave",
    city: "Plano",
    state: "TX",
    zip_code: "75074",
    birthdate: new Date("1999-09-20"),
    gender: "Male",
    ethnicity: "White",
    military_branch_served: "Army",
    current_job: "Financial Analyst",
    college_major: "Finance",
    university_grad_year: "2021",
    university: "Texas A&M",
    degree: "BBA",
    linkedin_link: "https://linkedin.com/in/johnsmith",
    school_district: "Plano ISD",
    internship_company1: "JP Morgan",
    internship_end_date1: new Date("2020-08-01"),
    internship_company2: "",
    internship_end_date2: undefined,
    university2: "SMU",
    college_major2: "MBA",
    degree2: "Master of Business Administration",
  },
];

export const crawlerDataSample = [
  {
    crawler_id: 1,
    created_at: new Date(),
    profile_url: "https://linkedin.com/in/janedoe",
    json: {
      source: "linkedin",
      scraped: true,
      skills: ["React", "Node.js", "PostgreSQL"],
    },
  },
];

export const enricherDataSample = [
  {
    enricher_id: 1,
    profile_url: "https://linkedin.com/in/janedoe",
    timestamp: new Date(),
    full_name: "Jane Doe",
    email: "jane.doe@email.com",
    current_job: "Software Engineer",
    university: "UT Dallas",
    degree: "Bachelor of Science",
  },
];

export const unconfirmedAlumniSample = [
  {
    analyzer_id: 1,
    profile_url: "https://linkedin.com/in/sampleuser",
    confidence_percentage: 67.4,
    full_name: "Sample User",
    email: "sample@email.com",
    current_job: "Data Analyst",
    city: "Dallas",
    state: "TX",
  },
];
