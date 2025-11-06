import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { PrismaClient } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

// POST /api/confirmed_alumni
// Creates a confirmed_alumni record. All fields are optional except the PK,
// which is autoincremented by Prisma/SQLite.
export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient(); 
  const body = await readBody(event);

  // Accept only schema fields; coerce known DateTime/Float fields
  const allowedFields: string[] = [
    "profile_url",
    "confidence_percentage",
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
    "birthdate",
    "internship_end_date1",
    "internship_end_date2",
  ];

  const data: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] === undefined) continue;

    if (dateFields.includes(key)) {
      // Allow ISO string or Date; reject bad dates
      const d = body[key] instanceof Date ? body[key] : new Date(body[key]);
      if (Number.isNaN(d.getTime())) {
        setResponseStatus(event, 400);
        return {
          success: false,
          error: `Invalid date for '${key}'. Use ISO-8601 (e.g., "2025-10-18T15:30:00Z").`,
        };
      }
      data[key] = d;
    } else if (key === "confidence_percentage") {
      const f =
        typeof body[key] === "number" ? body[key] : Number(body[key] as any);
      if (Number.isNaN(f)) {
        setResponseStatus(event, 400);
        return {
          success: false,
          error: "confidence_percentage must be a number",
        };
      }
      data[key] = f;
    } else {
      data[key] = body[key];
    }
  }

  try {
    const created = await prisma.confirmed_alumni.create({ data });
    setResponseStatus(event, 201);
    return {
      success: true,
      data: created,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return {
      success: false,
      error: `Error creating confirmed_alumni: ${message}`,
    };
  }
});
