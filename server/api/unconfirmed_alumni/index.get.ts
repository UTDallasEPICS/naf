import { defineEventHandler, setResponseStatus } from "h3";
import { PrismaClient } from "@prisma/client";

export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient();

  try {
    const alumni = await prisma.unconfirmed_alumni.findMany({
      orderBy: { analyzer_id: 'desc' }
    });

    return { success: true, data: alumni };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
