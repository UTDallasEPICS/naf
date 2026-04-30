import { defineEventHandler, getHeader, setResponseStatus } from "h3";

function readBearerToken(headerValue: string | undefined) {
  if (!headerValue) return undefined;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

export default defineEventHandler((event) => {
  if (!event.path.startsWith("/api/")) return;

  // Allow CORS preflight through (auth happens on the actual request).
  if (event.method === "OPTIONS") return;

  // If not configured, keep current "open" behavior for local dev.
  const expected = process.env.NAF_API_KEY;
  if (!expected) return;

  const provided =
    getHeader(event, "x-api-key") ??
    readBearerToken(getHeader(event, "authorization"));

  if (!provided || provided !== expected) {
    setResponseStatus(event, 401);
    return { success: false, error: "Unauthorized" };
  }
});

