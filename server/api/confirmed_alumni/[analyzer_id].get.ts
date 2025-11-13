import { defineEventHandler, setResponseStatus, getRouterParam } from "h3";
import { PrismaClient } from "@prisma/client";

export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient(); // PrismaClient attached via plugin
  const idParam = getRouterParam(event, "id");
  console.log(idParam);
  const analyzerId = Number(idParam);

  if (!idParam) {
    setResponseStatus(event, 400);
    return { success: false, error: "ID is required in the path." };
  }
  if (!Number.isInteger(analyzerId) || analyzerId <= 0) {
    setResponseStatus(event, 400);
    return { success: false, error: "ID must be a positive integer." };
  }

  try {
    const row = await prisma.confirmed_alumni.findUnique({
      where: { analyzer_id: analyzerId },
    });

    if (!row) {
      setResponseStatus(event, 404);
      return {
        success: false,
        error: `No confirmed_alumni found with analyzer_id=${analyzerId}`,
      };
    }

    setResponseStatus(event, 200);
    return {
      success: true,
      data: row,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
