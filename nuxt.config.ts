// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true
    }
  }
})
