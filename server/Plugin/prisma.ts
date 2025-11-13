import { PrismaClient } from '@prisma/client'
import { defineNitroPlugin } from 'nitropack/runtime'  

const prisma = new PrismaClient()

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.prisma = prisma
  })
})
