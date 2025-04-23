import type { AcademyLocation } from "./config";

export interface AlumniCriteria {
  academy: string | null;
  trackCertified: boolean;
  highSchool: string | null;
  internship: string | null;
  currentJob: string | null;
  location: {
    lat: number;
    lon: number;
  };
}

export interface AnalysisResult {
  isDefiniteAlumni: boolean;
  confidenceScore: number;
  breakdown: {
    academyMatch: boolean;
    trackCertified: boolean;
    highSchoolScore: number;
    internshipScore: number;
    currentJobScore: number;
    proximityScore: number;
  };
  action: string;
}

export type AnalyzerConfig = {
  academyLocations: AcademyLocation[];
  weights: typeof import("./config").DEFAULT_WEIGHTS;
};
