import { defineEventHandler, setResponseStatus, getRouterParam } from "h3";

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

  try {
    // Optional existence check for a cleaner 404
    const existing = await prisma.confirmed_alumni.findUnique({
      where: { analyzer_id: analyzerId },
      select: { analyzer_id: true },
    });

    if (!existing) {
      setResponseStatus(event, 404);
      return { success: false, error: "confirmed_alumni not found" };
    }

    await prisma.confirmed_alumni.delete({
      where: { analyzer_id: analyzerId },
    });

    setResponseStatus(event, 200);
    return {
      success: true,
      message: "confirmed_alumni deleted successfully",
      id: analyzerId,
    };
  } catch (error: any) {
    if (error?.code === "P2025") {
      setResponseStatus(event, 404);
      return { success: false, error: "confirmed_alumni not found" };
    }
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
