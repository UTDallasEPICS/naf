import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __naf_prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__naf_prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__naf_prisma = prisma;
}

