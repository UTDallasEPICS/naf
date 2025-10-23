import { defineEventHandler, setResponseStatus, getRouterParam } from "h3";

// DELETE /api/unconfirmed_alumni/:analyzer_id
export default defineEventHandler(async (event) => {
  const prisma = event.context.prisma as any;
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
    const existing = await prisma.unconfirmed_alumni.findUnique({
      where: { analyzer_id: analyzerId },
      select: { analyzer_id: true },
    });

    if (!existing) {
      setResponseStatus(event, 404);
      return { success: false, error: "unconfirmed_alumni not found" };
    }

    await prisma.unconfirmed_alumni.delete({
      where: { analyzer_id: analyzerId },
    });

    setResponseStatus(event, 200);
    return {
      success: true,
      message: "unconfirmed_alumni deleted successfully",
      id: analyzerId,
    };
  } catch (error: any) {
    if (error?.code === "P2025") {
      setResponseStatus(event, 404);
      return { success: false, error: "unconfirmed_alumni not found" };
    }
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
