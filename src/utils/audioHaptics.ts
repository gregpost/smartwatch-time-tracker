// Web Audio and Haptic feedback generator for Samsung Galaxy Watch simulation

class SoundHapticService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private hapticsEnabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  public isSoundEnabled() {
    return this.soundEnabled;
  }

  public isHapticsEnabled() {
    return this.hapticsEnabled;
  }

  /**
   * Mechanical rotary bezel click sound
   * Subtle, crisp metallic click with slight resonant decay
   */
  public playBezelTick(index: number = 0) {
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore
      }
    }

    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Base frequency tuned slightly per index for mechanical charm
      const baseFreq = 1600 + (index % 10) * 35;

      // 1. High transient click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.025);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      // Low mechanical thud
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.04);

      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
      subOsc.start(now);
      subOsc.stop(now + 0.05);
    } catch {
      // Audio playback failsafe
    }
  }

  /**
   * 10-Minute Prompt Vibration Alert
   * Double rhythmic haptic buzz (180ms pulse, 80ms silence, 220ms pulse)
   */
  public playVibrationAlert() {
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([180, 80, 220]);
      } catch {
        // ignore
      }
    }

    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Simulate watch motor rumble
      const pulse = (startTime: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // 130Hz motor vibration frequency
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(135, startTime);

        // Lowpass filter to muffle into realistic wrist motor buzz
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, startTime);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
        gain.gain.setValueAtTime(0.4, startTime + duration - 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Pulse 1
      pulse(now, 0.18);
      // Pulse 2
      pulse(now + 0.26, 0.24);
    } catch {
      // failsafe
    }
  }

  /**
   * Auto-Confirmed Chime
   * Soft pleasant two-tone confirmation
   */
  public playConfirmSound() {
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 100]);
      } catch {
        // ignore
      }
    }

    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [659.25, 880]; // E5, A5 chord

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.36);
      });
    } catch {
      // failsafe
    }
  }
}

export const soundHaptics = new SoundHapticService();
