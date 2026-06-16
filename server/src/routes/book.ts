import { Router } from "express";
import { bookSchema } from "../schemas/bookSchema.js";
import { sessionStore } from "../stores/sessionStore.js";
import { transactionStore } from "../stores/transactionStore.js";
import { maxioService } from "../services/maxioService.js";
import { slackService } from "../services/slackService.js";
import {
  buildTxnStartedBlocks,
  buildSubscriptionProgressBlocks,
  buildSubscriptionCompleteBlocks,
  buildFailureBlocks,
} from "../services/slackBuilders.js";
import { CONSULTANTS } from "../data/consultants.js";

export const bookRouter = Router();

bookRouter.post("/api/book", async (req, res): Promise<void> => {
  // 1. Validate — 400 before any external call
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "invalid", error: parsed.error.flatten() });
    return;
  }

  const {
    sessionId,
    firstName,
    lastName,
    email,
    consultantId,
    productHandle,
    collectionMethod,
    couponCode,
  } = parsed.data;

  // 2. Resolve consultant
  const consultant = CONSULTANTS.find((c) => c.id === consultantId);
  if (!consultant) {
    res.status(400).json({ status: "invalid", error: `Unknown consultantId: ${consultantId}` });
    return;
  }

  // 3. Ensure session exists
  sessionStore.ensure(sessionId);

  // 4. Create transaction record
  const txn = transactionStore.create({
    consultantId,
    clientEmail: email,
    type: "subscription",
    state: "started",
  });

  // 5. Ensure Slack channel — failures logged but never thrown to the client
  let channelId = "";
  let channelName = "";
  try {
    const ch = await slackService.ensureTxnChannel(txn, consultant.email);
    channelId = ch.channelId;
    channelName = ch.channelName;
    transactionStore.update(txn.txnId, { channelId, channelName });

    await slackService.postMessage(
      channelId,
      ":wave: Transaction started",
      buildTxnStartedBlocks(consultant.name, email, "Subscription", productHandle),
    );
    await slackService.postMessage(
      channelId,
      ":hourglass_flowing_sand: Creating subscription…",
      buildSubscriptionProgressBlocks(),
    );
  } catch (err) {
    console.error("[book] Slack setup failed (continuing):", err);
  }

  // 6. Drive Maxio operation
  try {
    const result = await maxioService.createSubscription({
      firstName,
      lastName,
      email,
      productHandle,
      collectionMethod,
      couponCode,
    });

    transactionStore.update(txn.txnId, {
      state: "completed",
      subscriptionId: result.subscriptionId,
      planHandle: result.planHandle,
    });
    sessionStore.put(sessionId, { lastResult: result });

    // Post completion to channel
    await slackService.postMessage(
      channelId,
      ":tada: Subscription active",
      buildSubscriptionCompleteBlocks({
        customerName: result.customerName,
        planName: result.planName,
        mrrCents: result.mrrCents,
        state: result.state,
        nextAssessmentAt: result.nextAssessmentAt,
      }),
    );

    res.status(201).json({
      status: "ok",
      txnId: txn.txnId,
      channelId,
      channelName,
      subscriptionId: result.subscriptionId,
      state: result.state,
      planName: result.planName,
      planHandle: result.planHandle,
      mrrCents: result.mrrCents.toString(),
      nextAssessmentAt: result.nextAssessmentAt,
      customerName: result.customerName,
      customerEmail: result.customerEmail,
    });
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message : String(err);
    console.error("[book] Maxio error:", err);

    transactionStore.update(txn.txnId, { state: "failed" });

    await slackService.postMessage(
      channelId,
      ":warning: Booking failed",
      buildFailureBlocks("Booking", errorSummary),
    );

    res.status(200).json({
      status: "maxio_failed",
      txnId: txn.txnId,
      channelId,
      channelName,
      error: errorSummary,
    });
  }
});
