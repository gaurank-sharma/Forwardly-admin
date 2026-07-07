import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5050),
  clientOrigin: process.env.CLIENT_ORIGIN || "https://forwardly-admin.vercel.app",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  mongoUri: process.env.MONGODB_URI || "",
  admin: {
    name: process.env.ADMIN_NAME || "Super Admin",
    email: (process.env.ADMIN_EMAIL || "admin@forwardly.in").toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "admin123",
  },
  googleKey: process.env.GOOGLE_MAPS_API_KEY || "",
  dailyCap: Number(process.env.DAILY_CAP_PER_AGENT || 50),
  minHot: Number(process.env.MIN_HOT_PER_DAY || 15),
  ingestCron: process.env.INGEST_CRON || "0 3 * * *",
  timezone: process.env.TIMEZONE || "Asia/Kolkata",
  cronSecret: process.env.CRON_SECRET || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  openaiKey: process.env.OPENAI_API_KEY || "",
};
