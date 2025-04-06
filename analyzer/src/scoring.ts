import { DistanceCalculator } from "./distance";
import type { AlumniCriteria, AnalysisResult, AnalyzerConfig } from "./types";
import { DEFAULT_WEIGHTS, PARTNERED_COMPANIES } from "./config";

export class AlumniAnalyzer {
  private readonly config: AnalyzerConfig;

  constructor(config: AnalyzerConfig) {
    this.config = config;
  }

  private calculateProximityScore(lat: number, lon: number): number {
    const distances = this.config.academyLocations.map((academy) =>
      DistanceCalculator.haversine(lat, lon, academy.lat, academy.lon)
    );

    const minDistanceKm = Math.min(...distances);

    if (minDistanceKm <= DistanceCalculator.milesToKm(50)) {
      return DEFAULT_WEIGHTS.proximityUnder50mi;
    }

    if (minDistanceKm <= DistanceCalculator.milesToKm(100)) {
      return DEFAULT_WEIGHTS.proximity50to100mi;
    }

    return 0;
  }

  public analyze(criteria: AlumniCriteria): AnalysisResult {
    const isDefinite = criteria.academy !== null || criteria.trackCertified;

    if (isDefinite) {
      return {
        isDefiniteAlumni: true,
        confidenceScore: 1,
        breakdown: {
          academyMatch: criteria.academy !== null,
          trackCertified: criteria.trackCertified,
          highSchoolScore: 0,
          internshipScore: 0,
          currentJobScore: 0,
          proximityScore: 0,
        },
      };
    }

    const proximityScore = this.calculateProximityScore(
      criteria.location.lat,
      criteria.location.lon
    );

    const hasValidInternship =
      criteria.internship &&
      PARTNERED_COMPANIES.some((c) => c.name === criteria.internship);

    const hasValidJob =
      criteria.currentJob &&
      PARTNERED_COMPANIES.some((c) => c.name === criteria.currentJob);

    const score = [
      criteria.highSchool ? DEFAULT_WEIGHTS.highSchool : 0,
      hasValidInternship ? DEFAULT_WEIGHTS.internship : 0,
      hasValidJob ? DEFAULT_WEIGHTS.currentJob : 0,
      proximityScore,
    ].reduce((sum, val) => sum + val, 0);

    return {
      isDefiniteAlumni: false,
      confidenceScore: Math.min(score, 1),
      breakdown: {
        academyMatch: false,
        trackCertified: false,
        highSchoolScore: criteria.highSchool ? DEFAULT_WEIGHTS.highSchool : 0,
        internshipScore: hasValidInternship ? DEFAULT_WEIGHTS.internship : 0,
        currentJobScore: hasValidJob ? DEFAULT_WEIGHTS.currentJob : 0,
        proximityScore: proximityScore,
      },
    };
  }
}
