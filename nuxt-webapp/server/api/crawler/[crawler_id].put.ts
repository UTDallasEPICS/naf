import { defineEventHandler, setResponseStatus, getRouterParam, readBody } from "h3";

// PUT /api/crawler_data/:crawler_id
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

  const body = await readBody(event);

  const data: Record<string, any> = {};
  let hasAny = false;

  if ("profile_url" in body) {
    data.profile_url = body.profile_url;
    hasAny = true;
  }

  if ("created_at" in body) {
    hasAny = true;
    if (body.created_at === null || body.created_at === "") {
      data.created_at = null;
    } else {
      const d = body.created_at instanceof Date ? body.created_at : new Date(body.created_at);
      if (Number.isNaN(d.getTime())) {
        setResponseStatus(event, 400);
        return { success: false, error: `Invalid date for 'created_at'. Use ISO-8601.` };
      }
      data.created_at = d;
    }
  }

  if ("json" in body) {
    hasAny = true;
    if (body.json === null) {
      data.json = null;
    } else if (typeof body.json === "string") {
      try {
        data.json = JSON.parse(body.json);
      } catch {
        setResponseStatus(event, 400);
        return { success: false, error: "json must be valid JSON (object/array/stringified JSON)." };
      }
    } else {
      data.json = body.json;
    }
  }

  if (!hasAny) {
    setResponseStatus(event, 400);
    return { success: false, error: "Provide at least one field to update." };
  }

  try {
    const updated = await prisma.crawler_data.update({
      where: { crawler_id: crawlerId },
      data,
    });

    setResponseStatus(event, 200);
    return { success: true, data: updated };
  } catch (error: any) {
    if (error?.code === "P2025") {
      setResponseStatus(event, 404);
      return { success: false, error: `No crawler_data found with crawler_id=${crawlerId}` };
    }
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    setResponseStatus(event, 500);
    return { success: false, error: msg };
  }
});
