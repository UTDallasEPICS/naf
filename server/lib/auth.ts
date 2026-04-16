import prismaPkg from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import nodemailer from "nodemailer";

const { PrismaClient } = prismaPkg;

//preventing multiple database connections in development
const globalForPrisma = globalThis as typeof globalThis & {
  authPrisma?: InstanceType<typeof PrismaClient>;
};

const prisma = globalForPrisma.authPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.authPrisma = prisma;
}

const trustedOrigins = (
  process.env.BETTER_AUTH_TRUSTED_ORIGINS ||
  "http://localhost:3000,http://localhost:3001,http://localhost:3003,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s/g, ""),
  },
});

//main auth configuration
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "160kOB2IQpvMcSSkVHgiNBzF+ubn75S186O2v7SsXFg=",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins,
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        try {
          await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.SMTP_USER,
            to: email,
            subject: "Your NAF magic link",
            html: `<p>Click <a href="${url}">here</a> to sign in.</p>`,
          });
        } catch (error) {
          console.error("Error sending magic link email:", error);
          throw new Error("Failed to send magic link");
        }
      },
    }),
  ],
});
