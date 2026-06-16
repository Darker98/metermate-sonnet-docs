/**
 * Phase 1 seed — creates MeterMate products and components in the Maxio test site.
 * Run once: npm run seed
 * Idempotent: skips items whose handle already exists (422).
 */
import "dotenv/config";
import {
  Client,
  Environment,
  ProductsController,
  ComponentsController,
  PricingScheme,
  IntervalUnit,
  ApiError,
} from "@maxio-com/advanced-billing-sdk";
import { config } from "./config.js";

// Family: cp-exp-result-v2  (ID 3008805)
const FAMILY_ID = "3008805";

const client = new Client({
  basicAuthCredentials: {
    username: config.maxio.apiKey,
    password: "x",
  },
  timeout: 30000,
  environment:
    config.maxio.environment === "EU" ? Environment.EU : Environment.US,
  site: config.maxio.siteSubdomain,
});

const productsController = new ProductsController(client);
const componentsController = new ComponentsController(client);

function isHandleTaken(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.statusCode !== 422) return false;
  const body = JSON.stringify(err.result ?? "");
  return (
    body.toLowerCase().includes("handle") &&
    (body.toLowerCase().includes("taken") ||
      body.toLowerCase().includes("already"))
  );
}

async function upsertProduct(
  name: string,
  handle: string,
  priceInCents: bigint,
): Promise<void> {
  try {
    const res = await productsController.createProduct(FAMILY_ID, {
      product: {
        name,
        handle,
        description: `MeterMate — ${name}`,
        priceInCents,
        interval: 1,
        intervalUnit: IntervalUnit.Month,
      },
    });
    const id = res.result?.product?.id ?? "?";
    console.log(`  ✓ Created product    : ${handle}  (id: ${id})`);
  } catch (err) {
    if (isHandleTaken(err)) {
      console.log(`  → Already exists     : ${handle}  (skipped)`);
    } else {
      throw err;
    }
  }
}

async function upsertMeteredComponent(
  name: string,
  handle: string,
  unitName: string,
  unitPrice: string,
): Promise<void> {
  try {
    const res = await componentsController.createMeteredComponent(FAMILY_ID, {
      meteredComponent: {
        name,
        handle,
        unitName,
        pricingScheme: PricingScheme.PerUnit,
        unitPrice,
      },
    });
    const id = res.result?.component?.id ?? "?";
    console.log(`  ✓ Created component  : ${handle}  (id: ${id})`);
  } catch (err) {
    if (isHandleTaken(err)) {
      console.log(`  → Already exists     : ${handle}  (skipped)`);
    } else {
      throw err;
    }
  }
}

async function seed(): Promise<void> {
  console.log("\n── MeterMate Seed ──────────────────────────────────────");
  console.log(`  Site   : ${config.maxio.siteSubdomain}`);
  console.log(`  Family : cp-exp-result-v2 (ID: ${FAMILY_ID})`);
  console.log("────────────────────────────────────────────────────────\n");

  console.log("Plans:");
  await upsertProduct("MeterMate Basic", "mm-basic-mm", BigInt(9900));   // $99.00 /mo
  await upsertProduct("MeterMate Pro",   "mm-pro-mm",   BigInt(29900));  // $299.00 /mo

  console.log("\nComponents:");
  await upsertMeteredComponent(
    "MM Consulting Minutes",
    "mm-consulting-minutes-mm",
    "minute",
    "2.00",   // $2.00 per minute
  );
  await upsertMeteredComponent(
    "MM API Calls",
    "mm-api-calls-mm",
    "api call",
    "0.01",   // $0.01 per api call
  );

  console.log("\n────────────────────────────────────────────────────────");
  console.log("  Seed complete.\n");
}

seed().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
