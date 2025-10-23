import { defineEventHandler, readBody, setResponseStatus } from "h3";

// POST /api/enricher_data
export default defineEventHandler(async (event) => {
  const prisma = event.context.prisma as any;
  const body = await readBody(event);

  const allowedFields: string[] = [
    "profile_url",
    "timestamp",
    "full_name",
    "email",
    "phone_number",
    "high_school",
    "hs_graduation_year",
    "naf_academy",
    "naf_track_certified",
    "address",
    "city",
    "state",
    "zip_code",
    "birthdate",
    "gender",
    "ethnicity",
    "military_branch_served",
    "current_job",
    "college_major",
    "university_grad_year",
    "university",
    "degree",
    "linkedin_link",
    "school_district",
    "internship_company1",
    "internship_end_date1",
    "internship_company2",
    "internship_end_date2",
    "university2",
    "college_major2",
    "degree2",
  ];

  const dateFields: string[] = [
    "timestamp",
    "birthdate",
    "internship_end_date1",
    "internship_end_date2",
  ];

  const data: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] === undefined) continue;

    const val = body[key];
    if (dateFields.includes(key)) {
      if (val === null || val === "") {
        data[key] = null;
      } else {
        const d = val instanceof Date ? val : new Date(val);
        if (Number.isNaN(d.getTime())) {
          setResponseStatus(event, 400);
          return { success: false, error: `Invalid date for '${key}'. Use ISO-8601.` };
        }
        data[key] = d;
      }
    } else {
      data[key] = val;
    }
  }

  try {
    const created = await prisma.enricher_data.create({ data });
    setResponseStatus(event, 201);
    return { success: true, data: created };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: `Error creating enricher_data: ${msg}` };
  }
});
