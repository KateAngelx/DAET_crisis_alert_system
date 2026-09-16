import { isIProgSenderNameError } from "@/lib/iprogSmsErrors";
import { summarizeSmsDeliveryResults } from "@/lib/smsDeliverySummary";

function touristCountPhrase(n) {
  const count = Math.max(0, Number(n) || 0);
  if (count === 0) return null;
  return count === 1 ? "1 tourist" : `${count} tourists`;
}

function wereWas(n) {
  return n === 1 ? "was" : "were";
}

function touristPossessiveSms(n) {
  const count = Math.max(0, Number(n) || 0);
  if (count === 0) return null;
  return count === 1 ? "1 tourist's SMS" : `${count} tourists' SMS`;
}

function aggregateSmsPerRecipient(rows) {
  const counts = {
    sent: 0,
    prefOff: 0,
    suspended: 0,
    noPhone: 0,
    failedSenderName: 0,
    failedOther: 0,
    pending: 0,
  };

  for (const row of rows) {
    if (!row.queued) {
      if (row.skipReason === "sms_pref_off") counts.prefOff += 1;
      else if (row.skipReason === "sms_suspended") counts.suspended += 1;
      else if (row.skipReason === "no_phone" || row.skipReason === "invalid_phone") {
        counts.noPhone += 1;
      }
      continue;
    }
    if (row.status === "sent" && row.messageId) {
      counts.sent += 1;
      continue;
    }
    if (row.status === "failed" || row.error) {
      const err = Array.isArray(row.error) ? row.error.join(" ") : row.error;
      if (isIProgSenderNameError(err)) counts.failedSenderName += 1;
      else counts.failedOther += 1;
      continue;
    }
    counts.pending += 1;
  }

  return counts;
}

function aggregateSmsSentences(counts) {
  const lines = [];

  const sentPhrase = touristCountPhrase(counts.sent);
  if (sentPhrase) {
    lines.push(`${sentPhrase} ${wereWas(counts.sent)} sent an SMS.`);
  }

  const prefOffPhrase = touristCountPhrase(counts.prefOff);
  if (prefOffPhrase) {
    lines.push(`${prefOffPhrase} did not get SMS (SMS is off in their profile).`);
  }

  const suspendedPhrase = touristCountPhrase(counts.suspended);
  if (suspendedPhrase) {
    lines.push(`${suspendedPhrase} did not get SMS (account SMS is paused).`);
  }

  const noPhonePhrase = touristCountPhrase(counts.noPhone);
  if (noPhonePhrase) {
    lines.push(`${noPhonePhrase} did not get SMS (invalid or missing phone on profile).`);
  }

  const senderNameSms = touristPossessiveSms(counts.failedSenderName);
  if (senderNameSms) {
    lines.push(
      `${senderNameSms} ${wereWas(counts.failedSenderName)} not sent — register an approved sender name in iProg (Smart/TNT).`
    );
  }

  const failedOtherSms = touristPossessiveSms(counts.failedOther);
  if (failedOtherSms) {
    lines.push(
      `${failedOtherSms} ${wereWas(counts.failedOther)} not sent — check phone numbers in Profile or use Admin → Settings to diagnose.`
    );
  }

  const pendingPhrase = touristCountPhrase(counts.pending);
  if (pendingPhrase) {
    lines.push(`${pendingPhrase}: SMS pending.`);
  }

  return lines;
}

/** Human-readable Command Center toast after notify-tourists */
export function formatBroadcastNotifyToast(notifyResult) {
  const notified = notifyResult.notified || 0;
  const emailQueued = notifyResult.emailQueued || 0;
  const smsSummary = summarizeSmsDeliveryResults(notifyResult.deliveryResults || []);
  const perRecipient = notifyResult.smsPerRecipient || [];

  const sentences = ["Alert published successfully."];

  const channelParts = [];
  if (notified > 0) channelParts.push(`${notified} in-app`);
  if (emailQueued > 0) channelParts.push(`${emailQueued} email`);
  if (smsSummary.sent > 0) channelParts.push(`${smsSummary.sent} SMS`);
  if (channelParts.length) {
    sentences.push(`Notifications: ${channelParts.join(", ")}.`);
  }

  if (perRecipient.length > 0) {
    const aggLines = aggregateSmsSentences(aggregateSmsPerRecipient(perRecipient));
    if (aggLines.length) sentences.push(aggLines.join(" "));
  } else if (smsSummary.failed > 0) {
    sentences.push("One or more SMS messages could not be sent. Use Admin → Settings to diagnose a phone number.");
  } else if (
    notifyResult.smsDiagnostics?.touristSmsPrefOff > 0 &&
    smsSummary.sent === 0
  ) {
    sentences.push("No SMS was sent — some tourists have SMS turned off in Profile.");
  }

  return sentences.join(" ");
}
