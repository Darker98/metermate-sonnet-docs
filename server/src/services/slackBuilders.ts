// Pure Block Kit builder functions — no Slack SDK dependency, fully unit-testable.

type Block = Record<string, unknown>;

export function buildTxnStartedBlocks(
  consultantId: string,
  clientEmail: string,
  type: string,
  plan: string,
): Block[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: ":wave: Transaction started", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Consultant:*\n${consultantId}` },
        { type: "mrkdwn", text: `*Client:*\n${clientEmail}` },
        { type: "mrkdwn", text: `*Type:*\n${type}` },
        { type: "mrkdwn", text: `*Plan:*\n${plan}` },
      ],
    },
  ];
}

export function buildSubscriptionProgressBlocks(): Block[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":hourglass_flowing_sand: Creating subscription…",
      },
    },
  ];
}

export function buildSubscriptionCompleteBlocks(result: {
  customerName: string;
  planName: string;
  mrrCents: bigint | number;
  state: string;
  nextAssessmentAt: string;
}): Block[] {
  const mrrDollars = (Number(result.mrrCents) / 100).toFixed(2);
  const nextBill = result.nextAssessmentAt
    ? new Date(result.nextAssessmentAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  return [
    {
      type: "header",
      text: { type: "plain_text", text: ":tada: Subscription active", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Customer:*\n${result.customerName}` },
        { type: "mrkdwn", text: `*Plan:*\n${result.planName}` },
        { type: "mrkdwn", text: `*MRR:*\n$${mrrDollars}/mo` },
        { type: "mrkdwn", text: `*State:*\n${result.state}` },
        { type: "mrkdwn", text: `*Next Bill:*\n${nextBill}` },
      ],
    },
  ];
}

// ── UC2 ─────────────────────────────────────────────────────────────────────

export function buildUsageProgressBlocks(componentHandle: string, quantity: number): Block[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:bar_chart: Recording *${quantity}* unit(s) of *${componentHandle}*…`,
      },
    },
  ];
}

export function buildUsageCompleteBlocks(result: {
  componentHandle: string;
  quantity: number;
  periodTotal: number;
  memo?: string;
}): Block[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: ":white_check_mark: Usage recorded", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Component:*\n${result.componentHandle}` },
        { type: "mrkdwn", text: `*Quantity:*\n${result.quantity}` },
        { type: "mrkdwn", text: `*Period Total:*\n${result.periodTotal}` },
        { type: "mrkdwn", text: `*Billing:*\nAccrues to next invoice` },
        ...(result.memo
          ? [{ type: "mrkdwn", text: `*Memo:*\n${result.memo}` }]
          : []),
      ],
    },
  ];
}

export function buildFailureBlocks(ucLabel: string, errorSummary: string): Block[] {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `:warning: ${ucLabel} failed`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Error:*\n${errorSummary}` },
    },
  ];
}
