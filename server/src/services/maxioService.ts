import {
  SubscriptionsController,
  ProductsController,
  CollectionMethod,
  ApiError,
} from "@maxio-com/advanced-billing-sdk";
import type { CreateSubscriptionRequest } from "@maxio-com/advanced-billing-sdk";
import { maxioClient } from "../maxioClient.js";

const subscriptionsController = new SubscriptionsController(maxioClient);
const productsController = new ProductsController(maxioClient);

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
      throw new Error(extractErrorMessage(err));
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
