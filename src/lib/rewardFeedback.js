import { playRewardSuccessSound } from "@/lib/notificationSound";

const REWARD_EARNED_EVENT = "daet:reward-earned";
const announcedAwards = new Set();

export function notifyRewardEarned(points, awardId) {
  const amount = Number(points);
  if (typeof window === "undefined" || !Number.isFinite(amount) || amount <= 0 || !awardId) return;
  if (announcedAwards.has(awardId)) return;

  announcedAwards.add(awardId);
  playRewardSuccessSound();
  window.dispatchEvent(new CustomEvent(REWARD_EARNED_EVENT, { detail: { points: amount } }));
}

export { REWARD_EARNED_EVENT };
