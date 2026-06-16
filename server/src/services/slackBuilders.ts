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

// ── UC3 ─────────────────────────────────────────────────────────────────────

export function buildPlanChangePreviewBlocks(result: {
  fromPlan: string;
  toPlan: string;
  timing: string;
  proratedAdjustmentInCents: bigint;
  chargeInCents: bigint;
  paymentDueInCents: bigint;
  creditAppliedInCents: bigint;
}): Block[] {
  function fmt(cents: bigint): string {
    return "$" + (Number(cents) / 100).toFixed(2);
  }
  return [
    {
      type: "header",
      text: { type: "plain_text", text: ":mag: Plan change preview", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*From:*\n${result.fromPlan}` },
        { type: "mrkdwn", text: `*To:*\n${result.toPlan}` },
        { type: "mrkdwn", text: `*Timing:*\n${result.timing}` },
        { type: "mrkdwn", text: `*Prorated Adjustment:*\n${fmt(result.proratedAdjustmentInCents)}` },
        { type: "mrkdwn", text: `*Charge Now:*\n${fmt(result.chargeInCents)}` },
        { type: "mrkdwn", text: `*Payment Due:*\n${fmt(result.paymentDueInCents)}` },
        { type: "mrkdwn", text: `*Credit Applied:*\n${fmt(result.creditAppliedInCents)}` },
      ],
    },
  ];
}

export function buildPlanChangeCompleteBlocks(result: {
  fromPlan: string;
  toPlan: string;
  timing: string;
  effectiveDate: string;
  state: string;
}): Block[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: ":arrows_counterclockwise: Plan changed", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*From:*\n${result.fromPlan}` },
        { type: "mrkdwn", text: `*To:*\n${result.toPlan}` },
        { type: "mrkdwn", text: `*Timing:*\n${result.timing}` },
        { type: "mrkdwn", text: `*Effective:*\n${result.effectiveDate}` },
        { type: "mrkdwn", text: `*State:*\n${result.state}` },
      ],
    },
  ];
}

// ── UC6 ─────────────────────────────────────────────────────────────────────

export function buildDigestBlocks(result: {
  consultantId: string;
  windowDays: number;
  activeCount: number;
  totalMrrCents: bigint;
  newInWindow: number;
  churnInWindow: number;
  overdueInvoiceCount: number;
  overdueAmountDue: string;
  generatedAt: string;
}): Block[] {
  const mrrDollars = (Number(result.totalMrrCents) / 100).toFixed(2);
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: ":chart_with_upwards_trend: Billing digest",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Consultant:*\n${result.consultantId}` },
        { type: "mrkdwn", text: `*Window:*\nLast ${result.windowDays} days` },
        { type: "mrkdwn", text: `*Active Subscriptions:*\n${result.activeCount}` },
        { type: "mrkdwn", text: `*Total MRR:*\n$${mrrDollars}/mo` },
        { type: "mrkdwn", text: `*New Signups:*\n${result.newInWindow}` },
        { type: "mrkdwn", text: `*Churn:*\n${result.churnInWindow}` },
        { type: "mrkdwn", text: `*Overdue Invoices:*\n${result.overdueInvoiceCount}` },
        { type: "mrkdwn", text: `*Overdue Amount:*\n$${result.overdueAmountDue}` },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `_Reporting data may lag live state slightly. Generated ${result.generatedAt}._`,
        },
      ],
    },
  ];
}

// ── UC5 ─────────────────────────────────────────────────────────────────────

export function buildInvoiceIssuedBlocks(result: {
  invoiceNumber: string;
  status: string;
  totalAmount: string;
  dueAmount: string;
  dueDate: string;
  publicUrl: string | null;
  emailSent: boolean;
}): Block[] {
  const blocks: Block[] = [
    {
      type: "header",
      text: { type: "plain_text", text: ":receipt: Invoice issued", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Invoice #:*\n${result.invoiceNumber}` },
        { type: "mrkdwn", text: `*Status:*\n${result.status}` },
        { type: "mrkdwn", text: `*Total:*\n$${result.totalAmount}` },
        { type: "mrkdwn", text: `*Amount Due:*\n$${result.dueAmount}` },
        { type: "mrkdwn", text: `*Due Date:*\n${result.dueDate}` },
        { type: "mrkdwn", text: `*Email Sent:*\n${result.emailSent ? "Yes" : "No"}` },
      ],
    },
  ];

  if (result.publicUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Pay Invoice", emoji: true },
          style: "primary",
          url: result.publicUrl,
        },
      ],
    });
  }

  return blocks;
}

// ── UC4 ─────────────────────────────────────────────────────────────────────

export function buildLifecycleCompleteBlocks(result: {
  action: string;
  fromState: string;
  toState: string;
  reasonCode?: string;
  effectiveDate: string;
}): Block[] {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `:vertical_traffic_light: ${result.fromState} → ${result.toState}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Action:*\n${result.action}` },
        { type: "mrkdwn", text: `*Previous State:*\n${result.fromState}` },
        { type: "mrkdwn", text: `*New State:*\n${result.toState}` },
        { type: "mrkdwn", text: `*Effective:*\n${result.effectiveDate}` },
        ...(result.reasonCode
          ? [{ type: "mrkdwn", text: `*Reason:*\n${result.reasonCode}` }]
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
