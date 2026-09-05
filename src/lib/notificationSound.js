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
