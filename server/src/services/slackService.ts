import { WebClient } from "@slack/web-api";
import { config } from "../config.js";
import { transactionStore } from "../stores/transactionStore.js";
import type { Transaction } from "../types.js";

const slack = new WebClient(config.slack.botToken);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 21);
}

let channelSeq = 0;

function buildChannelName(
  consultantId: string,
  clientEmail: string,
  seq: number,
): string {
  const cSlug = slugify(consultantId);
  const eSlug = slugify(clientEmail.split("@")[0] ?? clientEmail);
  const name = `txn-${cSlug}-${eSlug}-${String(seq).padStart(3, "0")}`;
  return name.slice(0, 80);
}

async function resolveUserId(email: string): Promise<string | null> {
  try {
    const result = await slack.users.lookupByEmail({ email });
    return result.user?.id ?? null;
  } catch {
    return null;
  }
}

export const slackService = {
  async verifyAuth(): Promise<boolean> {
    try {
      await slack.auth.test();
      return true;
    } catch {
      return false;
    }
  },

  async ensureTxnChannel(
    txn: Transaction,
    consultantEmail: string,
  ): Promise<{ channelId: string; channelName: string }> {
    // Reuse existing channel for this consultant↔client pair
    const existing = transactionStore.getChannel(txn.consultantId, txn.clientEmail);
    if (existing) return existing;

    // Create the private channel — retry with incremented seq on name_taken
    let channelId: string | undefined;
    let channelName: string = "";

    for (let attempt = 0; attempt < 10; attempt++) {
      const name = buildChannelName(txn.consultantId, txn.clientEmail, ++channelSeq);
      try {
        const created = await slack.conversations.create({ name, is_private: true });
        channelId = created.channel?.id;
        channelName = created.channel?.name ?? name;
        break;
      } catch (err: unknown) {
        const slackErr = err as { data?: { error?: string } };
        if (slackErr?.data?.error === "name_taken") {
          // Try to find the existing channel by name via conversations.list (requires groups:read)
          try {
            let cursor: string | undefined;
            outer: do {
              const list = await slack.conversations.list({
                types: "private_channel",
                limit: 200,
                ...(cursor ? { cursor } : {}),
              });
              for (const ch of list.channels ?? []) {
                if (ch.name === name) {
                  channelId = ch.id;
                  channelName = ch.name ?? name;
                  console.info(`[slack] Reusing existing channel ${channelName} (${channelId})`);
                  break outer;
                }
              }
              cursor = list.response_metadata?.next_cursor ?? undefined;
            } while (cursor);
          } catch {
            // groups:read not available — continue to next seq attempt
          }
          if (channelId) break;
          // name_taken and couldn't look it up → try next seq number
          continue;
        }
        throw err; // any other Slack error is fatal
      }
    }

    if (!channelId) {
      throw new Error("Could not create or find a Slack channel after multiple attempts");
    }

    // Tier 1 invite: consultant
    const consultantUserId = await resolveUserId(consultantEmail);
    if (consultantUserId) {
      try {
        await slack.conversations.invite({
          channel: channelId,
          users: consultantUserId,
        });
      } catch (err) {
        console.warn(`[slack] Could not invite consultant (${consultantEmail}):`, err);
      }
    } else {
      console.info(`[slack] Consultant (${consultantEmail}) not a workspace member — skipping invite`);
    }

    // Tier 1 invite: client; Tier 2 fallback: note in channel
    const clientUserId = await resolveUserId(txn.clientEmail);
    if (clientUserId) {
      try {
        await slack.conversations.invite({
          channel: channelId,
          users: clientUserId,
        });
      } catch (err) {
        console.warn(`[slack] Could not invite client (${txn.clientEmail}):`, err);
        await this.postMessage(
          channelId,
          `ℹ️ Client (${txn.clientEmail}) could not be added — they will be notified by email.`,
        ).catch(() => undefined);
      }
    } else {
      await this.postMessage(
        channelId,
        `ℹ️ Client (${txn.clientEmail}) is not a workspace member — they will be notified by email.`,
      ).catch(() => undefined);
    }

    // Store for reuse on subsequent actions
    transactionStore.setChannel(
      txn.consultantId,
      txn.clientEmail,
      channelId,
      channelName,
    );

    return { channelId, channelName };
  },

  async postMessage(
    channelId: string,
    text: string,
    blocks?: Record<string, unknown>[],
  ): Promise<void> {
    try {
      await slack.chat.postMessage({
        channel: channelId,
        text,
        ...(blocks && blocks.length > 0 ? { blocks } : {}),
      });
    } catch (err) {
      // Slack failures must never block the HTTP response or the billing result
      console.error(`[slack] postMessage to ${channelId} failed:`, err);
    }
  },
};
