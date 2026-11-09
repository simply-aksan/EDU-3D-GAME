import { BiomeId } from './questions';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private ambientTimer: number | null = null;

  private ensureContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAmbient();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const pitchVar = 0.95 + Math.random() * 0.1;
    osc.frequency.setValueAtTime(240 * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(580 * pitchVar, now + 0.16);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playCoin(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [987.77, 1318.51]; // B5 -> E6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.18, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.24);
    });
  }

  public playCorrect(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const triad = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    triad.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playWrong(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [195, 145];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + idx * 0.14;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playLevelUp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const fanfare = [440, 554.37, 659.25, 880, 1108.73];
    fanfare.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const t = now + idx * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playStep(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110 + Math.random() * 25, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.05);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Game #16: Referee whistle + soccer ball kick thump + stadium cheer / net rattle
  public playGoalieWhistleAndKick(saved: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Short referee whistle trill
    const whistle = ctx.createOscillator();
    const wGain = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(2650, now);
    whistle.frequency.linearRampToValueAtTime(2820, now + 0.12);
    wGain.gain.setValueAtTime(0.09, now);
    wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    whistle.connect(wGain);
    wGain.connect(ctx.destination);
    whistle.start(now);
    whistle.stop(now + 0.15);

    // Kick bass thump
    const kick = ctx.createOscillator();
    const kGain = ctx.createGain();
    kick.type = 'triangle';
    kick.frequency.setValueAtTime(150, now + 0.12);
    kick.frequency.exponentialRampToValueAtTime(48, now + 0.28);
    kGain.gain.setValueAtTime(0.22, now + 0.12);
    kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    kick.connect(kGain);
    kGain.connect(ctx.destination);
    kick.start(now + 0.12);
    kick.stop(now + 0.31);

    if (saved) {
      this.playCorrect();
    } else {
      this.playWrong();
    }
  }

  // Game #17: Factory conveyor switch + green stamp chime or red alarm siren
  public playFactoryStampOrAlarm(passed: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (passed) {
      // Pneumatic stamp impact + high chime
      const stamp = ctx.createOscillator();
      const sGain = ctx.createGain();
      stamp.type = 'square';
      stamp.frequency.setValueAtTime(180, now);
      stamp.frequency.exponentialRampToValueAtTime(75, now + 0.1);
      sGain.gain.setValueAtTime(0.14, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      stamp.connect(sGain);
      sGain.connect(ctx.destination);
      stamp.start(now);
      stamp.stop(now + 0.13);
      this.playCoin();
    } else {
      // Industrial dual-tone red alarm
      [420, 310].forEach((freq, idx) => {
        const alarm = ctx.createOscillator();
        const aGain = ctx.createGain();
        alarm.type = 'sawtooth';
        const t = now + idx * 0.15;
        alarm.frequency.setValueAtTime(freq, t);
        aGain.gain.setValueAtTime(0.15, t);
        aGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        alarm.connect(aGain);
        aGain.connect(ctx.destination);
        alarm.start(t);
        alarm.stop(t + 0.15);
      });
    }
  }

  // Game #18: Crystal Prism Laser beam hum + rainbow refraction chord
  public playPrismLaser(refracted: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const beam = ctx.createOscillator();
    const bGain = ctx.createGain();
    beam.type = 'sine';
    beam.frequency.setValueAtTime(340, now);
    beam.frequency.exponentialRampToValueAtTime(refracted ? 1180 : 140, now + 0.28);
    bGain.gain.setValueAtTime(0.16, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    beam.connect(bGain);
    bGain.connect(ctx.destination);
    beam.start(now);
    beam.stop(now + 0.32);

    if (refracted) {
      this.playCorrect();
    } else {
      this.playWrong();
    }
  }

  // Game #19: Tug-of-War Power Pull electric surge or slip thud
  public playTugPull(powerPull: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = powerPull ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(powerPull ? 210 : 160, now);
    osc.frequency.exponentialRampToValueAtTime(powerPull ? 620 : 80, now + 0.22);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);

    if (powerPull) {
      this.playCorrect();
    } else {
      this.playWrong();
    }
  }

  // Game #20: Boss Golem roar / Elemental Orb / Ultimate Beam
  public playBossRoarOrBeam(isUltimate: boolean, bossHit: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isUltimate ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(bossHit ? (isUltimate ? 440 : 280) : 95, now);
    osc.frequency.exponentialRampToValueAtTime(
      bossHit ? (isUltimate ? 1320 : 760) : 42,
      now + 0.36
    );
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    if (bossHit) {
      if (isUltimate) {
        this.playLevelUp();
      } else {
        this.playCorrect();
      }
    } else {
      this.playWrong();
    }
  }

  public startAmbient(biome: BiomeId): void {
    this.stopAmbient();
    if (this.isMuted || typeof window === 'undefined') return;

    const scales: Record<BiomeId, number[]> = {
      kota_ilmu: [261.63, 293.66, 329.63, 392.0, 440.0],
      samudra: [220.0, 261.63, 329.63, 392.0, 493.88],
      angkasa: [196.0, 246.94, 293.66, 369.99, 440.0],
      rimba: [293.66, 329.63, 392.0, 440.0, 523.25],
      nusantara: [261.63, 329.63, 349.23, 392.0, 493.88] // Pelog/Slendro-inspired intervals
    };

    const notes = scales[biome] || scales.kota_ilmu;
    let step = 0;

    this.ambientTimer = window.setInterval(() => {
      if (this.isMuted) return;
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const freq = notes[step % notes.length];
      step++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.025, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.45);
    }, 1600);
  }

  public stopAmbient(): void {
    if (this.ambientTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
