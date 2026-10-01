/**
 * Web Audio API Sound Engine for Standup Roulette
 * Generates synthetic casino audio: wheel spinning hum, ball pocket clicks, and winning fanfare.
 * Zero external audio assets required.
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
    this.volume = 0.5;
    this.isSpinning = false;
    this.spinOsc = null;
    this.spinGain = null;

    // Load initial mute setting from localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const savedMute = localStorage.getItem('standup_roulette_muted');
        if (savedMute !== null) {
          this.muted = savedMute === 'true';
        }
      }
    } catch (e) {
      console.warn('LocalStorage unavailable for audio settings', e);
    }
  }

  /**
   * Initializes or resumes the AudioContext on user interaction
   */
  initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMuted(muted) {
    this.muted = !!muted;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('standup_roulette_muted', String(this.muted));
      }
    } catch (e) {
      // ignore
    }
    if (this.muted && this.isSpinning) {
      this.stopSpinHum();
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Plays a crisp, organic mechanical click/tick when the ball bounces across pocket frets
   * @param {number} intensity - 0.1 to 1.0 depending on ball speed
   */
  playBallTick(intensity = 0.5) {
    if (this.muted) return;
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Slight pitch randomization for natural wooden/brass roulette sound
      const pitchJitter = (Math.random() - 0.5) * 200;
      const baseFreq = 950 + pitchJitter + (intensity * 400);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.025);

      const level = Math.max(0.05, Math.min(1.0, intensity)) * this.volume * 0.45;
      gain.gain.setValueAtTime(level, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.028);
    } catch (err) {
      // Ignore audio synthesis errors on older browsers
    }
  }

  /**
   * Starts a low whirring mechanical sound while wheel and ball are in full motion
   */
  startSpinHum() {
    if (this.muted) return;
    this.initContext();
    if (!this.audioCtx || this.isSpinning) return;

    try {
      this.isSpinning = true;
      const t = this.audioCtx.currentTime;

      this.spinOsc = this.audioCtx.createOscillator();
      this.spinGain = this.audioCtx.createGain();

      this.spinOsc.type = 'sawtooth';
      this.spinOsc.frequency.setValueAtTime(75, t);

      // Low pass filter to create a muffled whir
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, t);

      this.spinGain.gain.setValueAtTime(0.001, t);
      this.spinGain.gain.linearRampToValueAtTime(0.08 * this.volume, t + 0.5);

      this.spinOsc.connect(filter);
      filter.connect(this.spinGain);
      this.spinGain.connect(this.audioCtx.destination);

      this.spinOsc.start(t);
    } catch (err) {
      this.isSpinning = false;
    }
  }

  /**
   * Stops the continuous spin hum
   */
  stopSpinHum() {
    if (!this.isSpinning) return;
    this.isSpinning = false;

    if (this.spinGain && this.audioCtx) {
      try {
        const t = this.audioCtx.currentTime;
        this.spinGain.gain.linearRampToValueAtTime(0.0001, t + 0.2);
        if (this.spinOsc) {
          this.spinOsc.stop(t + 0.25);
        }
      } catch (e) {
        // ignore
      }
    }
    this.spinOsc = null;
    this.spinGain = null;
  }

  /**
   * Plays a celebratory casino win fanfare (pentatonic arpeggio sequence + sparkling chord)
   */
  playWinFanfare() {
    if (this.muted) return;
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      // Arpeggio notes in Hz: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const noteDelay = 0.09;

      notes.forEach((freq, idx) => {
        const t = now + (idx * noteDelay);
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const duration = idx === notes.length - 1 ? 0.7 : 0.2;
        gain.gain.setValueAtTime(0.2 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(t);
        osc.stop(t + duration + 0.05);
      });
    } catch (e) {
      // ignore
    }
  }
}

// Export for browser global & Node test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoundEngine;
}
if (typeof window !== 'undefined') {
  window.SoundEngine = SoundEngine;
}
