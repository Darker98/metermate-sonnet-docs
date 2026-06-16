import { Router } from "express";
import { adminGuard } from "../auth.js";
import { digestSchema } from "../schemas/digestSchema.js";
import { sessionStore } from "../stores/sessionStore.js";
import { transactionStore } from "../stores/transactionStore.js";
import { maxioService } from "../services/maxioService.js";
import { slackService } from "../services/slackService.js";
import { buildDigestBlocks, buildFailureBlocks } from "../services/slackBuilders.js";
import { config } from "../config.js";

export const digestRouter = Router();

digestRouter.post("/api/digest", adminGuard, async (req, res): Promise<void> => {
  // 1. Validate
  const parsed = digestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "invalid", error: parsed.error.flatten() });
    return;
  }

  const { sessionId, consultantId, windowDays } = parsed.data;

  // 2. Touch session
  if (sessionStore.get(sessionId)) sessionStore.put(sessionId, {});

  // 3. Resolve consultant's subscription IDs from in-memory store
  const consultantTxns = transactionStore.getByConsultant(consultantId);
  const subscriptionIds = consultantTxns
    .map((t) => t.subscriptionId!)
    .filter((id) => id != null);

  const digestChannel = config.slack.digestChannel;

  // 4. Post in-progress to digest channel
  await slackService.postMessage(
    digestChannel,
    `:chart_with_upwards_trend: Building billing digest for *${consultantId}*…`,
    [],
  );

  // 5. Build digest from Maxio
  try {
    const digest = await maxioService.buildDigest({ subscriptionIds, windowDays });

    const generatedAt = new Date().toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });

    sessionStore.put(sessionId, { lastResult: digest });

    await slackService.postMessage(
      digestChannel,
      ":chart_with_upwards_trend: Billing digest",
      buildDigestBlocks({
        consultantId,
        windowDays,
        generatedAt,
        ...digest,
      }),
    );

    res.status(200).json({
      status: "ok",
      consultantId,
      windowDays,
      digestChannel,
      activeCount: digest.activeCount,
      totalMrrCents: digest.totalMrrCents.toString(),
      newInWindow: digest.newInWindow,
      churnInWindow: digest.churnInWindow,
      overdueInvoiceCount: digest.overdueInvoiceCount,
      overdueAmountDue: digest.overdueAmountDue,
      generatedAt,
    });
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message : String(err);
    console.error("[digest] error:", err);

    await slackService.postMessage(
      digestChannel,
      ":warning: Digest failed",
      buildFailureBlocks("Billing digest", errorSummary),
    );

    res.status(200).json({
      status: "maxio_failed",
      consultantId,
      error: errorSummary,
    });
  }
});
