import { defineEventHandler, setResponseStatus, getRouterParam } from "h3";
import { PrismaClient } from "@prisma/client";

// GET /api/unconfirmed_alumni/:analyzer_id
export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient();
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

  try {
    const row = await prisma.unconfirmed_alumni.findUnique({
      where: { analyzer_id: analyzerId },
    });

    if (!row) {
      setResponseStatus(event, 404);
      return { success: false, error: `No unconfirmed_alumni found with analyzer_id=${analyzerId}` };
    }

    setResponseStatus(event, 200);
    return { success: true, data: row };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
