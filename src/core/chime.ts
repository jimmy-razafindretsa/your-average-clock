let ctx: AudioContext | null = null;

/** Browsers only allow audio after a user gesture: call this from a click handler. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* audio unavailable */
  }
}

/** Soft three-note glass chime. */
export function playChime() {
  try {
    ctx ??= new AudioContext();
    const notes = [880, 1174.66, 1567.98];
    notes.forEach((freq, i) => {
      const t = ctx!.currentTime + i * 0.35;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 1.3);
    });
  } catch {
    /* audio unavailable */
  }
}
