import { toNodeHandler } from "better-auth/node";
import { defineEventHandler } from "h3";

import { auth } from "../../lib/auth";

const handler = toNodeHandler(auth);

export default defineEventHandler(async (event) => {
  await handler(event.node.req, event.node.res);
});
