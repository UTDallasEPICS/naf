import { defineEventHandler, setResponseStatus, getRouterParam } from "h3";

// GET /api/enricher_data/:enricher_id
export default defineEventHandler(async (event) => {
  const prisma = event.context.prisma as any;
  const idParam = getRouterParam(event, "enricher_id") ?? getRouterParam(event, "id");
  const enricherId = Number(idParam);

  if (!idParam) {
    setResponseStatus(event, 400);
    return { success: false, error: "enricher_id is required in the path." };
  }
  if (!Number.isInteger(enricherId) || enricherId <= 0) {
    setResponseStatus(event, 400);
    return { success: false, error: "enricher_id must be a positive integer." };
  }

  try {
    const row = await prisma.enricher_data.findUnique({
      where: { enricher_id: enricherId },
    });

    if (!row) {
      setResponseStatus(event, 404);
      return { success: false, error: `No enricher_data found with enricher_id=${enricherId}` };
    }

    setResponseStatus(event, 200);
    return { success: true, data: row };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
