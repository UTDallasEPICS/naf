import { defineEventHandler, setResponseStatus } from "h3";
import { PrismaClient } from "@prisma/client";

export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient();

  try {
    const data = await prisma.enricher_data.findMany({
      orderBy: { enricher_id: 'desc' }
    });

    return { success: true, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});