let audioContext = null;
let soundUnlocked = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

export function unlockNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      soundUnlocked = true;
    }).catch(() => {});
    return;
  }

  soundUnlocked = true;
}

export function playCrisisNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx || !soundUnlocked) return;

  try {
    const start = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(880, start);
    oscillator.frequency.setValueAtTime(660, start + 0.12);
    oscillator.frequency.setValueAtTime(880, start + 0.24);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

    oscillator.start(start);
    oscillator.stop(start + 0.5);
  } catch {
    // Visual notification still works if audio fails.
  }
}

export function playRewardSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx || !soundUnlocked) return;

  try {
    const start = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = start + index * 0.08;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.11, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.3);

      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.32);
    });
  } catch {
    // The reward toast still confirms the award if audio is unavailable.
  }
}

/** Vibration for a critical alert: long pulses (~5 s). Phones only; ignored elsewhere. */
export const CRITICAL_VIBRATION_PATTERN = [800, 250, 800, 250, 800, 250, 1200, 400, 800, 250, 800];

/**
 * Critical alert alarm: a two-tone siren for `durationMs` plus long phone vibration.
 * Returns a stop function (call it when the person closes the alert).
 * Browsers only allow sound/vibration after the person has tapped the page once.
 */
export function startCriticalAlarm({ durationMs = 8000 } = {}) {
  let stopped = false;
  const nodes = [];
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(CRITICAL_VIBRATION_PATTERN);
    }
  } catch {
    // Vibration is optional.
  }

  const ctx = getAudioContext();
  if (ctx && soundUnlocked) {
    try {
      const start = ctx.currentTime;
      const end = start + durationMs / 1000;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.05);
      gain.gain.setValueAtTime(0.3, end - 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      const oscillator = ctx.createOscillator();
      oscillator.type = "square";
      oscillator.connect(gain);
      // High-low siren, half a second per tone.
      for (let t = start, high = true; t < end; t += 0.5, high = !high) {
        oscillator.frequency.setValueAtTime(high ? 960 : 720, t);
      }
      oscillator.start(start);
      oscillator.stop(end);
      nodes.push(oscillator, gain);
    } catch {
      // The pop-up still shows if audio fails.
    }
  }

  return function stopCriticalAlarm() {
    if (stopped) return;
    stopped = true;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(0);
    } catch {
      // ignore
    }
    for (const node of nodes) {
      try {
        if (typeof node.stop === "function") node.stop();
        node.disconnect();
      } catch {
        // already stopped
      }
    }
  };
}
