import { defineEventHandler, setResponseStatus, getRouterParam } from "h3";

// DELETE /api/crawler_data/:crawler_id
export default defineEventHandler(async (event) => {
  const prisma = event.context.prisma as any;
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
    const existing = await prisma.crawler_data.findUnique({
      where: { crawler_id: crawlerId },
      select: { crawler_id: true },
    });

    if (!existing) {
      setResponseStatus(event, 404);
      return { success: false, error: "crawler_data not found" };
    }

    await prisma.crawler_data.delete({
      where: { crawler_id: crawlerId },
    });

    setResponseStatus(event, 200);
    return {
      success: true,
      message: "crawler_data deleted successfully",
      id: crawlerId,
    };
  } catch (error: any) {
    if (error?.code === "P2025") {
      setResponseStatus(event, 404);
      return { success: false, error: "crawler_data not found" };
    }
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
