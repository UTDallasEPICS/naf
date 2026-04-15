import prismaPkg from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import nodemailer from "nodemailer";

const { PrismaClient } = prismaPkg;

const globalForPrisma = globalThis as typeof globalThis & {
  authPrisma?: InstanceType<typeof PrismaClient>;
};

const prisma = globalForPrisma.authPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.authPrisma = prisma;
}

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "replace-this-with-a-long-random-secret",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: false,
  },
  magicLink: {
    enabled: true,
    sendMagicLink: async ({ email, token, url }) => {
      try {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL || "noreply@yourapp.com",
          to: email,
          subject: "Your Magic Link",
          html: `<p>Click <a href="${url}">here</a> to sign in.</p>`,
        });
      } catch (error) {
        console.error("Error sending magic link email:", error);
        throw new Error("Failed to send magic link");
      }
    },
  },
});
