import { Router } from "express";
import { sessionStore } from "../stores/sessionStore.js";
import { transactionStore } from "../stores/transactionStore.js";
import { maxioService } from "../services/maxioService.js";
import { slackService } from "../services/slackService.js";
import { CONSULTANTS } from "../data/consultants.js";
import { config } from "../config.js";

export const metaRouter = Router();

// Cached product list populated at boot
let cachedProducts: Array<{
  handle: string;
  name: string;
  priceInCents: string;
}> = [];

export async function warmProductCache(): Promise<void> {
  if (!config.maxio.apiKey || !config.maxio.siteSubdomain) {
    console.info("[meta] Maxio not configured — skipping product cache warm");
    return;
  }
  try {
    const products = await maxioService.listProducts();
    cachedProducts = products.map((p) => ({
      handle: p.handle,
      name: p.name,
      priceInCents: p.priceInCents.toString(),
    }));
    console.info(`[meta] Product cache warmed: ${cachedProducts.length} products`);
  } catch (err) {
    console.warn("[meta] Failed to warm product cache:", err);
  }
}

metaRouter.get("/api/health", async (_req, res) => {
  const slackOk =
    config.slack.botToken !== ""
      ? await slackService.verifyAuth()
      : false;

  res.json({
    status: "ok",
    sessions: sessionStore.size(),
    transactions: transactionStore.size(),
    maxioSite: config.maxio.siteSubdomain || "(not configured)",
    slackOk,
  });
});

metaRouter.get("/api/products", (_req, res) => {
  res.json({ status: "ok", products: cachedProducts });
});

metaRouter.get("/api/consultants", (_req, res) => {
  res.json({
    status: "ok",
    consultants: CONSULTANTS.map((c) => ({ id: c.id, name: c.name })),
  });
});
