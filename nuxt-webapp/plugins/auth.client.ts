import { createAuthClient } from "better-auth/client";
import { magicLinkClient } from "better-auth/client/plugins";

export default defineNuxtPlugin(() => {
  const authClient = createAuthClient({
    baseURL: "http://localhost:3001/api/auth", // Server auth route
    plugins: [magicLinkClient()],
  });

  return {
    provide: {
      auth: authClient,
    },
  };
});
