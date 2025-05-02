import { withDatabase } from "./database";
import { AlumniAnalyzer } from "./scoring";
import { ACADEMY_LOCATIONS, DEFAULT_WEIGHTS } from "./config";
import { getCoordinates } from "./utils/geocoder";

const analyzer = new AlumniAnalyzer({
  academyLocations: ACADEMY_LOCATIONS,
  weights: DEFAULT_WEIGHTS,
});

function extractState(location: string | null): string | null {
  if (!location) return null;
  const stateMatch = location.match(/([A-Z]{2})$/);
  return stateMatch ? stateMatch[1] : null;
}

async function analyzeAndStoreProfile() {
  try {
    await withDatabase(async (db) => {
      const [profile] = await db.fetchProfiles(1);
      if (!profile) {
        console.log("No profiles found in database");
        return;
      }

      const location = profile.json.location as {
        city?: string;
        state?: string;
      };
      const { city, state } = location;

      const coordinates = await getCoordinates(
        city && state ? `${city}, ${state}` : ""
      );

      const analysis = analyzer.analyze({
        academy: profile.json.NAFAcademy,
        trackCertified:
          profile.json.NAFTrackCertified?.toLowerCase().includes("yes") ||
          false,
        highSchool: profile.json.highSchool,
        internship: profile.json.internshipCompany1,
        currentJob: profile.json.currentJob,
        location: coordinates,
      });

      const unconfirmedAnalyzerRecord = {
        profile_url: profile.profile_url,
        confidence_percentage: analysis.confidenceScore,
        full_name: profile.json.fullName,
        email: profile.json.email,
        phone_number: profile.json.phoneNumber,
        high_school: profile.json.highSchool,
        hs_graduation_year: profile.json.HSGraduationYear,
        naf_academy: !!profile.json.NAFAcademy,
        naf_track_certified:
          profile.json.NAFTrackCertified?.toLowerCase().includes("yes") ||
          false,
        address: null,
        city: profile.json.city,
        state: extractState(profile.json.location),
        zip_code: null,
        birthdate: null,
        gender: null,
        ethnicity: null,
        military_branch_served: null,
        current_job: profile.json.currentJob ? [profile.json.currentJob] : [],
        university_grad_year: profile.json.universityGradYear || null,
        university: profile.json.university || null,
        degree: profile.json.degree || null,
        school_district: null,
        internship_company1: profile.json.internshipCompany1 || null,
        internship_end_date1: profile.json.internshipEndDate1 || null,
        internship_company2: null,
        internship_end_date2: null,
        university2: null,
        degree2: null,
      };

      const recordId = await db.insertUnconfirmedAnalyzerRecord(
        unconfirmedAnalyzerRecord
      );

      console.log("\nAnalysis Results:");
      console.log("Profile URL:", profile.profile_url);
      console.log("Definite Alumni:", analysis.isDefiniteAlumni);
      console.log("Confidence Score:", analysis.confidenceScore);
      console.log("NAF Academy:", unconfirmedAnalyzerRecord.naf_academy);
      console.log(
        "NAF Track Certified:",
        unconfirmedAnalyzerRecord.naf_track_certified
      );

      if (recordId) {
        console.log(`Successfully stored analysis (ID: ${recordId})`);
      } else {
        console.log("Failed to store analysis");
      }
    });
  } catch (error) {
    console.error("Analysis pipeline failed:", error);
  }
}

analyzeAndStoreProfile();
