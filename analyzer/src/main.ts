import { AlumniAnalyzer } from "./scoring";
import { ACADEMY_LOCATIONS, DEFAULT_WEIGHTS } from "./config";
import type { AlumniCriteria, AnalysisResult } from "./types";

const analyzer = new AlumniAnalyzer({
  academyLocations: ACADEMY_LOCATIONS,
  weights: DEFAULT_WEIGHTS,
});

export function analyzeAlumni(data: AlumniCriteria): AnalysisResult {
  return analyzer.analyze(data);
}

// Hardcoded test case - testing, delete later
const testInput: AlumniCriteria = {
  academy: null,
  trackCertified: false,
  highSchool: "Brooklyn Tech",
  internship: "Google",
  currentJob: "Microsoft",
  location: {
    lat: 40.7128, // NYC coordinates
    lon: -74.006,
  },
};

// Run analysis
const result = analyzeAlumni(testInput);

// Display results
console.log("Test Case Results:");
console.log("Definite Alumni:", result.isDefiniteAlumni);
console.log("Confidence Score:", result.confidenceScore);
console.log("Score Breakdown:", result.breakdown);
console.log("Action:", result.action);
