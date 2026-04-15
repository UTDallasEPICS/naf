import { createAuthClient } from "better-auth/client";

export default defineNuxtPlugin(() => {
  const authClient = createAuthClient({
    baseURL: "http://localhost:3001", // Server is running on port 3001
  });

  return {
    provide: {
      auth: authClient,
    },
  };
});