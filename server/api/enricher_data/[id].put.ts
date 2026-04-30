import { defineEventHandler, setResponseStatus } from "h3";

export default defineEventHandler((event) => {
  setResponseStatus(event, 501);
  return { success: false, error: "Not implemented" };
});
