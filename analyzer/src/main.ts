import { withDatabase } from "./database";
import { AlumniAnalyzer } from "./scoring";
import { ACADEMY_LOCATIONS, DEFAULT_WEIGHTS } from "./config";
import { getCoordinates } from "./utils/geocoder";

const analyzer = new AlumniAnalyzer({
  academyLocations: ACADEMY_LOCATIONS,
  weights: DEFAULT_WEIGHTS,
});

async function analyzeAndStoreProfiles() {
  try {
    await withDatabase(async (db) => {
      const batchSize = 10;
      let offset = 0;
      let processedCount = 0;
      let skippedCount = 0;

      while (true) {
        console.log(`\nFetching batch starting at offset ${offset}`);

        const profiles = await db.fetchProfiles(batchSize, offset);

        if (profiles.length === 0) {
          console.log("\nReached end of profiles");
          console.log(`Total processed: ${processedCount}`);
          console.log(`Total skipped (already existed): ${skippedCount}`);
          break;
        }

        for (const profile of profiles) {
          const existingRecord = await db.fetchExistingRecord(
            profile.profile_url
          );

          if (existingRecord) {
            console.log(
              `Skipping already processed profile: ${profile.profile_url}`
            );
            skippedCount++;
            continue;
          }

          const location = profile.json.location as {
            city?: string;
            state?: string | null;
            country?: string;
          };

          const locationString = [
            location.city,
            location.state,
            location.country,
          ]
            .filter(Boolean)
            .join(", ");

          let coordinates = null;
          try {
            const coords = await getCoordinates(locationString);
            if (coords) {
              coordinates = { lat: coords.lat, lon: coords.lon };
            }
          } catch (error) {
            console.error(`Geocoding failed for ${locationString}:`, error);
          }

          const analysis = analyzer.analyze({
            academy: profile.json.NAFAcademy,
            trackCertified:
              profile.json.NAFTrackCertified?.toLowerCase().includes("yes") ||
              false,
            highSchool: profile.json.highSchool,
            internship: profile.json.internshipCompany1,
            currentJob: profile.json.currentJob,
            location: coordinates || { lat: 0, lon: 0 },
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
            city: location.city || null,
            state: location.state || null,
            zip_code: null,
            birthdate: null,
            gender: null,
            ethnicity: null,
            military_branch_served: null,
            current_job: profile.json.currentJob
              ? [profile.json.currentJob]
              : [],
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
            processedCount++;
          } else {
            console.log("Failed to store analysis");
          }
        }

        offset += batchSize;
      }
    });
  } catch (error) {
    console.error("Analysis pipeline failed:", error);
  }
}

analyzeAndStoreProfiles();
