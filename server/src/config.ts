import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optionalEnv("PORT", "4000"), 10),

  maxio: {
    apiKey: optionalEnv("MAXIO_API_KEY", ""),
    siteSubdomain: optionalEnv("MAXIO_SITE_SUBDOMAIN", ""),
    environment: optionalEnv("MAXIO_ENVIRONMENT", "US") as "US" | "EU",
    defaultProductFamily: optionalEnv("MAXIO_DEFAULT_PRODUCT_FAMILY", ""),
  },

  slack: {
    botToken: optionalEnv("SLACK_BOT_TOKEN", ""),
    digestChannel: optionalEnv("SLACK_DIGEST_CHANNEL", ""),
  },

  admin: {
    user: optionalEnv("ADMIN_USER", "admin"),
    password: optionalEnv("ADMIN_PASSWORD", "changeme"),
  },

  app: {
    sessionTtlMinutes: parseInt(optionalEnv("SESSION_TTL_MINUTES", "30"), 10),
    demoMode: optionalEnv("DEMO_MODE", "true") === "true",
    digestCron: optionalEnv("DIGEST_CRON", "0 9 * * 1"),
  },
} as const;
