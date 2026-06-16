import {
  SubscriptionsController,
  ProductsController,
  SubscriptionComponentsController,
  SubscriptionProductsController,
  SubscriptionStatusController,
  InvoicesController,
  CollectionMethod,
  CreateInvoiceStatus,
  ApiError,
} from "@maxio-com/advanced-billing-sdk";
import type { CreateSubscriptionRequest } from "@maxio-com/advanced-billing-sdk";
import { maxioClient } from "../maxioClient.js";

const subscriptionsController = new SubscriptionsController(maxioClient);
const productsController = new ProductsController(maxioClient);
const subscriptionComponentsController = new SubscriptionComponentsController(maxioClient);
const subscriptionProductsController = new SubscriptionProductsController(maxioClient);
const subscriptionStatusController = new SubscriptionStatusController(maxioClient);
const invoicesController = new InvoicesController(maxioClient);

export interface CreateSubscriptionParams {
  firstName: string;
  lastName: string;
  email: string;
  productHandle: string;
  collectionMethod: "automatic" | "remittance";
  couponCode?: string;
}

export interface SubscriptionResult {
  subscriptionId: number;
  state: string;
  planName: string;
  planHandle: string;
  mrrCents: bigint;
  nextAssessmentAt: string;
  customerEmail: string;
  customerName: string;
}

export interface ProductSummary {
  handle: string;
  name: string;
  priceInCents: bigint;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.result as Record<string, unknown> | undefined;
    if (body && typeof body === "object") {
      const errors = (body as { errors?: unknown }).errors;
      if (Array.isArray(errors)) return errors.join("; ");
    }
    return `Maxio API error ${err.statusCode}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export const maxioService = {
  async createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<SubscriptionResult> {
    const body: CreateSubscriptionRequest = {
      subscription: {
        productHandle: params.productHandle,
        paymentCollectionMethod:
          params.collectionMethod === "automatic"
            ? CollectionMethod.Automatic
            : CollectionMethod.Remittance,
        customerAttributes: {
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          // email as reference provides idempotency: same email re-submit reuses customer
          reference: params.email,
        },
        ...(params.couponCode ? { couponCode: params.couponCode } : {}),
      },
    };

    let response;
    try {
      response = await subscriptionsController.createSubscription(body);
    } catch (err) {
      const msg = extractErrorMessage(err);
      // Customer reference already exists → retry using the existing customer by reference
      if (msg.toLowerCase().includes("must be unique") || msg.toLowerCase().includes("reference")) {
        const retryBody: CreateSubscriptionRequest = {
          subscription: {
            productHandle: params.productHandle,
            paymentCollectionMethod: body.subscription?.paymentCollectionMethod,
            customerReference: params.email,
            ...(params.couponCode ? { couponCode: params.couponCode } : {}),
          },
        };
        try {
          response = await subscriptionsController.createSubscription(retryBody);
        } catch (retryErr) {
          throw new Error(extractErrorMessage(retryErr));
        }
      } else {
        throw new Error(msg);
      }
    }

    const sub = response.result?.subscription;
    if (!sub) {
      throw new Error("Maxio returned no subscription in response");
    }

    return {
      subscriptionId: sub.id ?? 0,
      state: sub.state ?? "unknown",
      planName: sub.product?.name ?? params.productHandle,
      planHandle: sub.product?.handle ?? params.productHandle,
      mrrCents: sub.productPriceInCents ?? BigInt(0),
      nextAssessmentAt: sub.nextAssessmentAt ?? "",
      customerEmail: sub.customer?.email ?? params.email,
      customerName: [sub.customer?.firstName, sub.customer?.lastName]
        .filter(Boolean)
        .join(" ") || `${params.firstName} ${params.lastName}`,
    };
  },

  async recordUsage(params: {
    subscriptionId: number;
    componentHandle: string;
    quantity: number;
    memo?: string;
    timestamp?: string;
  }): Promise<{ usageId: bigint; quantity: number; periodTotal: number; componentHandle: string }> {
    const componentId = `handle:${params.componentHandle}`;

    // Build memo — append timestamp note if supplied
    const memoText = [
      params.memo,
      params.timestamp ? `at ${params.timestamp}` : undefined,
    ]
      .filter(Boolean)
      .join(" — ") || undefined;

    let recordedQty = params.quantity;
    let usageId: bigint = BigInt(0);

    try {
      const createRes = await subscriptionComponentsController.createUsage(
        params.subscriptionId,
        componentId,
        { usage: { quantity: params.quantity, memo: memoText } },
      );
      const u = createRes.result?.usage;
      if (u) {
        usageId = u.id ?? BigInt(0);
        const raw = u.quantity;
        recordedQty =
          typeof raw === "number"
            ? raw
            : typeof raw === "string"
            ? parseFloat(raw)
            : params.quantity;
      }
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }

    // Fetch period total (sum of all usage records for this component)
    let periodTotal = 0;
    try {
      const listRes = await subscriptionComponentsController.listUsages({
        subscriptionIdOrReference: params.subscriptionId,
        componentId,
      });
      periodTotal = (listRes.result ?? []).reduce((sum, u) => {
        const raw = u.quantity;
        const qty =
          typeof raw === "number"
            ? raw
            : typeof raw === "string"
            ? parseFloat(raw)
            : 0;
        return sum + (isNaN(qty) ? 0 : qty);
      }, 0);
    } catch {
      // Non-fatal — use the recorded quantity as a floor
      periodTotal = recordedQty;
    }

    return {
      usageId,
      quantity: recordedQty,
      periodTotal,
      componentHandle: params.componentHandle,
    };
  },

  async previewPlanChange(params: {
    subscriptionId: number;
    targetHandle: string;
  }): Promise<{
    proratedAdjustmentInCents: bigint;
    chargeInCents: bigint;
    paymentDueInCents: bigint;
    creditAppliedInCents: bigint;
  }> {
    let response;
    try {
      response = await subscriptionProductsController.previewSubscriptionProductMigration(
        params.subscriptionId,
        { migration: { productHandle: params.targetHandle } },
      );
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }

    const m = response.result?.migration;
    return {
      proratedAdjustmentInCents: m?.proratedAdjustmentInCents ?? BigInt(0),
      chargeInCents: m?.chargeInCents ?? BigInt(0),
      paymentDueInCents: m?.paymentDueInCents ?? BigInt(0),
      creditAppliedInCents: m?.creditAppliedInCents ?? BigInt(0),
    };
  },

  async applyPlanChange(params: {
    subscriptionId: number;
    targetHandle: string;
    timing: "prorate" | "at-renewal";
  }): Promise<{
    state: string;
    planName: string;
    planHandle: string;
    nextAssessmentAt: string;
    nextProductName: string | null;
  }> {
    if (params.timing === "prorate") {
      // Apply immediately with proration
      let response;
      try {
        response = await subscriptionProductsController.migrateSubscriptionProduct(
          params.subscriptionId,
          { migration: { productHandle: params.targetHandle } },
        );
      } catch (err) {
        throw new Error(extractErrorMessage(err));
      }
      const sub = response.result?.subscription;
      return {
        state: sub?.state ?? "unknown",
        planName: sub?.product?.name ?? params.targetHandle,
        planHandle: sub?.product?.handle ?? params.targetHandle,
        nextAssessmentAt: sub?.nextAssessmentAt ?? "",
        nextProductName: null,
      };
    } else {
      // Schedule at renewal: look up product ID by handle, then set nextProductId
      let productId: number;
      try {
        const pr = await productsController.readProductByHandle(params.targetHandle);
        productId = pr.result?.product?.id ?? 0;
        if (!productId) throw new Error(`Product not found for handle: ${params.targetHandle}`);
      } catch (err) {
        throw new Error(extractErrorMessage(err));
      }

      let response;
      try {
        response = await subscriptionsController.updateSubscription(
          params.subscriptionId,
          { subscription: { nextProductId: String(productId) } },
        );
      } catch (err) {
        throw new Error(extractErrorMessage(err));
      }
      const sub = response.result?.subscription;
      return {
        state: sub?.state ?? "unknown",
        planName: sub?.product?.name ?? params.targetHandle,
        planHandle: sub?.product?.handle ?? params.targetHandle,
        nextAssessmentAt: sub?.nextAssessmentAt ?? "",
        nextProductName: params.targetHandle,
      };
    }
  },

  async createAndIssueInvoice(params: {
    subscriptionId: number;
    clientEmail: string;
    lineItems?: { title: string; quantity: string; unitPrice: string; description?: string }[];
    memo?: string;
    sendEmail: boolean;
  }): Promise<{
    uid: string;
    invoiceNumber: string;
    status: string;
    totalAmount: string;
    dueAmount: string;
    dueDate: string;
    publicUrl: string | null;
    emailSent: boolean;
  }> {
    // Create invoice with status "open" — issues it immediately in one step
    let createResponse;
    try {
      createResponse = await invoicesController.createInvoice(
        params.subscriptionId,
        {
          invoice: {
            status: CreateInvoiceStatus.Open,
            ...(params.lineItems && params.lineItems.length > 0
              ? {
                  lineItems: params.lineItems.map((item) => ({
                    title: item.title,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    ...(item.description ? { description: item.description } : {}),
                  })),
                }
              : {}),
            ...(params.memo ? { memo: params.memo } : {}),
          },
        },
      );
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }

    const issuedInvoice = createResponse.result?.invoice;
    if (!issuedInvoice?.uid) {
      throw new Error("Maxio returned no invoice uid after create");
    }

    const uid = issuedInvoice.uid;

    // Optionally send email to client
    let emailSent = false;
    if (params.sendEmail) {
      try {
        await invoicesController.sendInvoice(uid, {
          recipientEmails: [params.clientEmail],
        });
        emailSent = true;
      } catch {
        // Non-fatal — invoice is still issued
      }
    }

    return {
      uid,
      invoiceNumber: issuedInvoice?.number ?? uid,
      status: issuedInvoice?.status ?? "open",
      totalAmount: issuedInvoice?.totalAmount ?? "0.00",
      dueAmount: issuedInvoice?.dueAmount ?? "0.00",
      dueDate: issuedInvoice?.dueDate ?? "",
      publicUrl: issuedInvoice?.publicUrl ?? null,
      emailSent,
    };
  },

  async lifecycleAction(params: {
    subscriptionId: number;
    action: "pause" | "resume" | "cancel" | "reactivate";
    cancelType?: "immediate" | "end-of-period";
    reasonCode?: string;
  }): Promise<{ state: string; canceledAt: string | null; resumesAt: string | null }> {
    let response;
    try {
      switch (params.action) {
        case "pause":
          response = await subscriptionStatusController.pauseSubscription(
            params.subscriptionId,
            {},
          );
          break;
        case "resume":
          response = await subscriptionStatusController.resumeSubscription(
            params.subscriptionId,
            undefined,
          );
          break;
        case "cancel":
          response = await subscriptionStatusController.cancelSubscription(
            params.subscriptionId,
            {
              subscription: {
                cancelAtEndOfPeriod: params.cancelType === "end-of-period",
                ...(params.reasonCode ? { reasonCode: params.reasonCode } : {}),
              },
            },
          );
          break;
        case "reactivate":
          response = await subscriptionStatusController.reactivateSubscription(
            params.subscriptionId,
            {},
          );
          break;
      }
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }

    const sub = (response as { result?: { subscription?: { state?: string; canceledAt?: string | null; resumesAt?: string | null } } })?.result?.subscription;
    return {
      state: sub?.state ?? "unknown",
      canceledAt: sub?.canceledAt ?? null,
      resumesAt: sub?.resumesAt ?? null,
    };
  },

  async listProducts(): Promise<ProductSummary[]> {
    let response;
    try {
      response = await productsController.listProducts({});
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }

    return (response.result ?? []).map((pr) => ({
      handle: pr.product?.handle ?? "",
      name: pr.product?.name ?? "",
      priceInCents: pr.product?.priceInCents ?? BigInt(0),
    }));
  },
};
