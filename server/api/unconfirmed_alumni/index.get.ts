import { defineEventHandler, readBody, setResponseStatus } from "h3";

export default defineEventHandler(async (event) => {
  const prisma = event.context.prisma as any;
  try {
    const body = await readBody(event);
    if (!body?.profile_url || !body?.name) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing required fields: profile_url or name" };
    }

    const record = await prisma.unconfirmed_alumni.upsert({
      where: { profile_url: body.profile_url },
      update: body,
      create: body,
    });

    setResponseStatus(event, 201);
    return { success: true, message: "Record inserted/updated", record };
  } catch (err: any) {
    setResponseStatus(event, 500);
    return { success: false, error: err.message };
  }
});
