import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { PrismaClient } from "@prisma/client";

// POST /api/crawler_data
export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient();
  const body = await readBody(event);

  const data: Record<string, any> = {};

  // profile_url (string | null)
  if (body.profile_url !== undefined) data.profile_url = body.profile_url;

  // created_at (Date | null) – defaults to now() if omitted by Prisma
  if (body.created_at !== undefined) {
    if (body.created_at === null || body.created_at === "") {
      data.created_at = null;
    } else {
      const d = body.created_at instanceof Date ? body.created_at : new Date(body.created_at);
      if (Number.isNaN(d.getTime())) {
        setResponseStatus(event, 400);
        return { success: false, error: `Invalid date for 'created_at'. Use ISO-8601.` };
      }
      data.created_at = d;
    }
  }

  // json (Json | null)
  if (body.json !== undefined) {
    if (body.json === null) {
      data.json = null;
    } else if (typeof body.json === "string") {
      try {
        data.json = JSON.parse(body.json);
      } catch {
        setResponseStatus(event, 400);
        return { success: false, error: "json must be valid JSON (object/array/stringified JSON)." };
      }
    } else {
      data.json = body.json;
    }
  }

  try {
    const created = await prisma.crawler_data.create({ data });
    setResponseStatus(event, 201);
    return { success: true, data: created };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: `Error creating crawler_data: ${msg}` };
  }
});
