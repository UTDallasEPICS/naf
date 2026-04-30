import { defineEventHandler, setResponseStatus } from "h3";
import { prisma } from "../../utils/prisma";

export default defineEventHandler(async (event) => {
  try {
    const alumni = await prisma.confirmed_alumni.findMany({
      orderBy: { analyzer_id: 'desc' }
    });

    return {
      success: true,
      data: alumni
    };
  } catch (error) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : error instanceof Error
          ? error.message
          : "Unknown error";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
