import { defineEventHandler, setResponseStatus, getRouterParam } from "h3";
import { PrismaClient } from "@prisma/client";

// GET /api/crawler_data/:crawler_id
export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient() as any;
  const idParam = getRouterParam(event, "crawler_id") ?? getRouterParam(event, "id");
  const crawlerId = Number(idParam);

  if (!idParam) {
    setResponseStatus(event, 400);
    return { success: false, error: "crawler_id is required in the path." };
  }
  if (!Number.isInteger(crawlerId) || crawlerId <= 0) {
    setResponseStatus(event, 400);
    return { success: false, error: "crawler_id must be a positive integer." };
  }

  try {
    const row = await prisma.crawler_data.findUnique({
      where: { crawler_id: crawlerId },
    });

    if (!row) {
      setResponseStatus(event, 404);
      return { success: false, error: `No crawler_data found with crawler_id=${crawlerId}` };
    }

    setResponseStatus(event, 200);
    return { success: true, data: row };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
