import { MiniGameSlot, PlayableGameId } from './questions';
import { soundManager } from './sound';

export type UIModalId =
  | 'minigames'
  | 'wardrobe'
  | 'biome'
  | 'teacher'
  | 'materi'
  | 'scorecard'
  | null;

export interface StarRatingInfo {
  stars: 0 | 1 | 2 | 3;
  thresholds: [number, number, number];
  nextTarget: number;
  progressPct: number;
}

export interface QuestionTimerVisual {
  pct: number;
  phase: 'blue' | 'yellow' | 'red';
  colorHex: string;
  strokeClass: string;
  isBlinking: boolean;
}

export interface MiniGameBriefingSpec {
  engineId: PlayableGameId;
  desktopControls: string;
  mobileControls: string;
  objective: string;
  threeStarScore: number;
}

export interface BriefingCardState {
  active: boolean;
  slot: MiniGameSlot;
  spec: MiniGameBriefingSpec;
  remainingMs: number;
  totalMs: number;
}

export interface ThumbstickVector {
  dx: number;
  dy: number;
  clampedX: number;
  clampedY: number;
  magnitude: number;
}

/**
 * Pure helper: Computes 0-3 Star achievement rating and progress toward 3 stars
 * for any mini-game slot in the Bento-Grid launcher.
 */
export function computeStarRating(
  highScore: number,
  threeStarTarget = 240
): StarRatingInfo {
  const safeScore = Math.max(0, Math.floor(highScore));
  const t1 = Math.round(threeStarTarget * 0.35);
  const t2 = Math.round(threeStarTarget * 0.7);
  const t3 = threeStarTarget;

  let stars: 0 | 1 | 2 | 3 = 0;
  let nextTarget = t1;

  if (safeScore >= t3) {
    stars = 3;
    nextTarget = t3;
  } else if (safeScore >= t2) {
    stars = 2;
    nextTarget = t3;
  } else if (safeScore >= t1) {
    stars = 1;
    nextTarget = t2;
  }

  const progressPct = Math.min(100, Math.round((safeScore / t3) * 100));

  return {
    stars,
    thresholds: [t1, t2, t3],
    nextTarget,
    progressPct
  };
}

/**
 * Pure helper: Evaluates the ergonomic curved question timer bar state
 * (Electric Blue #0066FF -> Amber Yellow #FACC15 -> Blinking Crimson Red #F43F5E).
 */
export function computeQuestionTimerVisual(
  remainingSec: number,
  totalSec = 15
): QuestionTimerVisual {
  const safeTotal = Math.max(1, totalSec);
  const clampedRem = Math.max(0, Math.min(safeTotal, remainingSec));
  const pct = Number(((clampedRem / safeTotal) * 100).toFixed(1));

  if (pct > 55) {
    return {
      pct,
      phase: 'blue',
      colorHex: '#0066FF',
      strokeClass: 'text-[#0066FF]',
      isBlinking: false
    };
  }
  if (pct > 25) {
    return {
      pct,
      phase: 'yellow',
      colorHex: '#facc15',
      strokeClass: 'text-amber-400',
      isBlinking: false
    };
  }
  return {
    pct,
    phase: 'red',
    colorHex: '#f43f5e',
    strokeClass: 'text-rose-500',
    isBlinking: true
  };
}

/**
 * Pure helper: Computes normalized floating thumbstick vector and clamped knob offset.
 */
export function computeThumbstickVector(
  originX: number,
  originY: number,
  currentX: number,
  currentY: number,
  maxRadius = 42
): ThumbstickVector {
  const rawDx = currentX - originX;
  const rawDy = currentY - originY;
  const dist = Math.hypot(rawDx, rawDy);
  const safeMax = Math.max(1, maxRadius);

  if (dist < 0.001) {
    return { dx: 0, dy: 0, clampedX: 0, clampedY: 0, magnitude: 0 };
  }

  const clampedDist = Math.min(dist, safeMax);
  const nx = rawDx / dist;
  const ny = rawDy / dist;

  return {
    dx: Number(((nx * clampedDist) / safeMax).toFixed(3)),
    dy: Number(((ny * clampedDist) / safeMax).toFixed(3)),
    clampedX: Number((nx * clampedDist).toFixed(1)),
    clampedY: Number((ny * clampedDist).toFixed(1)),
    magnitude: Number((clampedDist / safeMax).toFixed(3))
  };
}

/**
 * Pure helper: Returns control instructions and 3-Star score target for each mini-game.
 */
export function getMiniGameControlBriefing(
  engineId: PlayableGameId
): MiniGameBriefingSpec {
  const specs: Record<PlayableGameId, MiniGameBriefingSpec> = {
    jelajah_dunia: {
      engineId: 'jelajah_dunia',
      desktopControls: 'WASD / Panah Jalan · Shift Sprint · Klik Gedung & NPC',
      mobileControls: 'Floating Thumbstick Kiri · Tombol Lompat & Tap Objek 3D',
      objective: 'Kunjungi 5 Gedung Mapel, tantang Warga NPC, dan koleksi 5 Buku Ilmu!',
      threeStarScore: 250
    },
    lari_kilat: {
      engineId: 'lari_kilat',
      desktopControls: 'A / D Pindah Jalur · Spasi Lompat · [1/A]-[4/D] Gerbang',
      mobileControls: 'Geser Kiri/Kanan Pindah Jalur · Tap Lompat Rintangan',
      objective: 'Tembur Gerbang Jawaban yang benar sambil menghindari kejaran Angsa Raksasa!',
      threeStarScore: 300
    },
    jatuh_bangun: {
      engineId: 'jatuh_bangun',
      desktopControls: 'Tombol [1/A] [2/B] [3/C] [4/D] · Klik Opsi Jawaban',
      mobileControls: 'Tap Opsi [1/A]-[4/D] untuk melompat naik ke puncak menara',
      objective: 'Capai Lantai 4 Menara Hexagonal dan raih Mahkota Emas!',
      threeStarScore: 240
    },
    detektif_kota: {
      engineId: 'detektif_kota',
      desktopControls: 'WASD Jalan · Klik 4 TKP · [1/A]-[4/D] Pecahkan Petunjuk',
      mobileControls: 'Thumbstick Jalan · Tap TKP & Pilih Tersangka',
      objective: 'Kumpulkan 4 bukti ilmiah di TKP dan tangkap pelaku misteri!',
      threeStarScore: 260
    },
    pasar_nusantara: {
      engineId: 'pasar_nusantara',
      desktopControls: 'Tombol [1/A] [2/B] [3/C] [4/D] Hitung Transaksi Pasar',
      mobileControls: 'Tap Opsi [1/A]-[4/D] Layani Pembeli',
      objective: 'Selesaikan 5 transaksi aritmetika sosial, kembalian, dan pecahan!',
      threeStarScore: 250
    },
    jembatan_juara: {
      engineId: 'jembatan_juara',
      desktopControls: 'Tombol [1/A]-[4/D] atau Klik Panel Kaca Jembatan 3D',
      mobileControls: 'Tap Panel Kaca [1/A]-[4/D] untuk melompat aman',
      objective: 'Seberangi 6 deret panel kaca menuju piala kemenangan!',
      threeStarScore: 260
    },
    pertahanan_kastil: {
      engineId: 'pertahanan_kastil',
      desktopControls: 'Tombol [1/A]-[4/D] Tembakkan Meriam Plasma Kastil',
      mobileControls: 'Tap Opsi [1/A]-[4/D] Hancurkan Monster Terdekat',
      objective: 'Pertahankan HP Kastil dengan menembak 5 gelombang monster!',
      threeStarScore: 250
    },
    balap_roket: {
      engineId: 'balap_roket',
      desktopControls: 'Tombol [1/A]-[4/D] atau Klik Cincin Kosmik di Angkasa',
      mobileControls: 'Tap Cincin [1/A]-[4/D] Kemudikan Roket Galaksi',
      objective: 'Terbangkan roket menembus 5 Cincin Jawaban dengan FOV Hyper-Speed!',
      threeStarScore: 250
    },
    arsitek_menara: {
      engineId: 'arsitek_menara',
      desktopControls: 'Tombol [1/A]-[4/D] Jatuhkan Lantai Gedung Presisi',
      mobileControls: 'Tap Opsi [1/A]-[4/D] Susun Menara',
      objective: 'Tumpuk 6 lantai pencakar langit dengan stabilitas tinggi!',
      threeStarScore: 260
    },
    labirin_minotaur: {
      engineId: 'labirin_minotaur',
      desktopControls: 'Tombol [1/A]-[4/D] Buka Gerbang Persimpangan Labirin',
      mobileControls: 'Tap Opsi [1/A]-[4/D] Pandu Karakter Keluar Labirin',
      objective: 'Buka 4 Gerbang Kristal beruntun untuk keluar dari Labirin Minotaur!',
      threeStarScore: 240
    },
    panahan_katapel: {
      engineId: 'panahan_katapel',
      desktopControls: 'Hover/Klik Target · [1/A]-[4/D] Lontarkan Bola Katapel',
      mobileControls: 'Tap Target [1/A]-[4/D] Tembak Lintasan Parabola',
      objective: 'Robohkan 5 Papan Target Jawaban dengan kurva parabola sempurna!',
      threeStarScore: 250
    },
    sirkuit_logika: {
      engineId: 'sirkuit_logika',
      desktopControls: 'Susun Blok Algoritma / Klik Preset [1/A]-[4/D] · Jalankan',
      mobileControls: 'Tap Preset Rute [1/A]-[4/D] lalu Tap Jalankan Program',
      objective: 'Program Robot Coder 3D menuju Stasiun Baterai tanpa menabrak laser!',
      threeStarScore: 270
    },
    selam_samudra: {
      engineId: 'selam_samudra',
      desktopControls: 'WASD Kemudi Kapal Selam · [1/A]-[4/D] Buka Peti Sonar',
      mobileControls: 'Thumbstick Kemudi · Tap Peti Harta [1/A]-[4/D]',
      objective: 'Temukan 5 Peti Harta Karun Emas di palung bioluminesensi!',
      threeStarScore: 260
    },
    koki_kimia: {
      engineId: 'koki_kimia',
      desktopControls: 'Tombol [1/A]-[4/D] Tuang Tabung Reaksi ke Erlenmeyer',
      mobileControls: 'Tap Tabung Reaksi [1/A]-[4/D] Sintesis Kristal',
      objective: 'Sintesis 5 Kristal Emas Murni tanpa memicu ledakan asap hitam!',
      threeStarScore: 260
    },
    ekspedisi_pinisi: {
      engineId: 'ekspedisi_pinisi',
      desktopControls: 'Tombol [1/A]-[4/D] Layarkan Kapal Pinisi ke Dermaga Pulau',
      mobileControls: 'Tap Dermaga Pulau [1/A]-[4/D] Berlayar',
      objective: 'Kunjungi 5 Dermaga Kepulauan Nusantara mengikuti angin musim!',
      threeStarScore: 260
    },
    penjaga_gawang: {
      engineId: 'penjaga_gawang',
      desktopControls: 'Refleks Cepat [1/A] [2/B] [3/C] [4/D] Tepis Tendangan',
      mobileControls: 'Tap Zona Gawang [1/A]-[4/D] Sebelum Waktu Habis',
      objective: 'Tepis 5 tendangan melengkung Robot Striker sebelum timer habis!',
      threeStarScore: 270
    },
    pabrik_sortir: {
      engineId: 'pabrik_sortir',
      desktopControls: 'Tombol [1/A]-[4/D] Arahkan Palang Conveyor Belt',
      mobileControls: 'Tap Jalur Sortir [1/A]-[4/D] Stempel LULUS',
      objective: 'Sortir 5 peti kargo ke gerbang tujuan yang tepat secara otomatis!',
      threeStarScore: 260
    },
    tebak_bangun: {
      engineId: 'tebak_bangun',
      desktopControls: 'Tombol [1/A]-[4/D] Bidik & Tembakkan Laser Prisma',
      mobileControls: 'Tap Monumen Kristal [1/A]-[4/D] Biaskan Pelangi',
      objective: 'Biaskan 5 Sinar Pelangi dari Monumen Kristal ke Kubah Portal!',
      threeStarScore: 270
    },
    tarik_tambang: {
      engineId: 'tarik_tambang',
      desktopControls: 'Tombol Cepat [1/A]-[4/D] Tarik Tambang Power Pull',
      mobileControls: 'Tap Cepat [1/A]-[4/D] Tarik Tim Robot ke Kiri',
      objective: 'Tarik pita merah tambang hingga melewati batas kemenangan -5.0m!',
      threeStarScore: 280
    },
    arena_boss: {
      engineId: 'arena_boss',
      desktopControls: 'WASD Hindari Shockwave · [1/A]-[4/D] Aktifkan Pilar',
      mobileControls: 'Thumbstick Gerak · Tap Pilar Energi [1/A]-[4/D]',
      objective: 'Rangkai 3x Combo Ultimate Beam untuk mengalahkan Golem Raksasa Ilmu!',
      threeStarScore: 320
    }
  };

  return specs[engineId] || specs.jelajah_dunia;
}

// ============================================================================
// UI MANAGER CLASS (Orchestrates Haptics, Tactile Audio, Camera Cinema, Briefing)
// ============================================================================
export class UIManager {
  private activeModal: UIModalId = null;
  private briefingState: BriefingCardState | null = null;

  public getActiveModal(): UIModalId {
    return this.activeModal;
  }

  public setActiveModal(modal: UIModalId): boolean {
    this.activeModal = modal;
    this.triggerTactileClick();
    return modal === 'wardrobe';
  }

  public isWardrobeCinemaActive(): boolean {
    return this.activeModal === 'wardrobe';
  }

  /**
   * Triggers tactile mechanical click sound + 30ms mobile haptic vibration.
   */
  public triggerTactileClick(vibrateMs = 20): void {
    soundManager.playStep();
    this.triggerHaptic(vibrateMs);
  }

  /**
   * Triggers 30ms haptic vibration on supported mobile/touch devices
   * when pressing answer buttons or joystick actions.
   */
  public triggerHaptic(durationMs = 30): void {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Ignore on unsupported desktop browsers
      }
    }
  }

  /**
   * Starts a 1.5-second (1500ms) Interactive Loading/Briefing Card transition
   * when switching between mini-games.
   */
  public createBriefingTransition(
    slot: MiniGameSlot,
    durationMs = 1500
  ): BriefingCardState {
    const spec = getMiniGameControlBriefing(slot.engineId);
    this.briefingState = {
      active: true,
      slot,
      spec,
      remainingMs: durationMs,
      totalMs: durationMs
    };
    return this.briefingState;
  }

  /**
   * Maps keyboard shortcuts [1, 2, 3, 4] or [A, B, C, D] to option index 0..3.
   */
  public static resolveShortcutKeyToOptionIndex(code: string): number | null {
    switch (code) {
      case 'Digit1':
      case 'Numpad1':
        return 0;
      case 'Digit2':
      case 'Numpad2':
        return 1;
      case 'Digit3':
      case 'Numpad3':
        return 2;
      case 'Digit4':
      case 'Numpad4':
        return 3;
      default:
        return null;
    }
  }
}

export const uiManager = new UIManager();
