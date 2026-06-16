import { Client, Environment } from "@maxio-com/advanced-billing-sdk";
import { config } from "./config.js";

const environment =
  config.maxio.environment === "EU" ? Environment.EU : Environment.US;

export const maxioClient = new Client({
  basicAuthCredentials: {
    username: config.maxio.apiKey,
    password: "x",
  },
  timeout: 30000,
  environment,
  site: config.maxio.siteSubdomain,
});
