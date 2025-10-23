import { defineEventHandler, setResponseStatus, getRouterParam, readBody } from "h3";

export default defineEventHandler(async (event) => {
  const prisma = event.context.prisma as any; // PrismaClient attached via plugin
  const idParam = getRouterParam(event, "analyzer_id") ?? getRouterParam(event, "id");
  const analyzerId = Number(idParam);

  if (!idParam) {
    setResponseStatus(event, 400);
    return { success: false, error: "analyzer_id is required in the path." };
  }
  if (!Number.isInteger(analyzerId) || analyzerId <= 0) {
    setResponseStatus(event, 400);
    return { success: false, error: "analyzer_id must be a positive integer." };
  }

  const body = await readBody(event);

  // Only allow model fields to be updated
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
  let hasAny = false;

  for (const key of allowedFields) {
    if (!(key in body)) continue; // skip fields not provided
    hasAny = true;

    const val = (body as any)[key];

    if (dateFields.includes(key)) {
      if (val === null || val === undefined || val === "") {
        data[key] = null;
      } else {
        const d = val instanceof Date ? val : new Date(val);
        if (Number.isNaN(d.getTime())) {
          setResponseStatus(event, 400);
          return { success: false, error: `Invalid date for '${key}'. Use ISO-8601.` };
        }
        data[key] = d;
      }
    } else if (key === "confidence_percentage") {
      if (val === null || val === undefined || val === "") {
        data[key] = null;
      } else {
        const f = typeof val === "number" ? val : Number(val);
        if (Number.isNaN(f)) {
          setResponseStatus(event, 400);
          return { success: false, error: "confidence_percentage must be a number." };
        }
        data[key] = f;
      }
    } else {
      data[key] = val; // strings/nullable strings
    }
  }

  if (!hasAny) {
    setResponseStatus(event, 400);
    return {
      success: false,
      error: "Provide at least one field to update.",
    };
  }

  try {
    const updated = await prisma.confirmed_alumni.update({
      where: { analyzer_id: analyzerId },
      data,
    });

    setResponseStatus(event, 200);
    return { success: true, data: updated };
  } catch (error: any) {
    if (error?.code === "P2025") {
      // Prisma: record not found
      setResponseStatus(event, 404);
      return {
        success: false,
        error: `No confirmed_alumni found with analyzer_id=${analyzerId}`,
      };
    }
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
