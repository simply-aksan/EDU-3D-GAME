import React, { useEffect, useRef, useState } from 'react';
import { MiniGameSlot, PlayableGameId, QuestionItem } from '../game/questions';
import {
  computeQuestionTimerVisual,
  computeStarRating,
  computeThumbstickVector,
  getMiniGameControlBriefing,
  uiManager
} from '../game/UIManager';

// ============================================================================
// VISUAL PREVIEW & HOW-TO-PLAY DIAGRAM SPECS FOR ALL 20 MINI-GAMES
// ============================================================================
export interface MiniGameVisualPreviewSpec {
  icon: string;
  modelLabel: string;
  visualScene: string;
  howToPlay: string;
  targetHint: string;
}

export function getMiniGameVisualSpec(engineId: PlayableGameId): MiniGameVisualPreviewSpec {
  const specs: Record<PlayableGameId, MiniGameVisualPreviewSpec> = {
    jelajah_dunia: {
      icon: '🏛️',
      modelLabel: 'Gedung Ilmu & Warga NPC',
      visualScene: 'Kota Ilmu 2.5D dengan 4 Gedung Mapel, NPC Warga, & Buku Melayang',
      howToPlay: 'Dekati Gedung Ilmu atau NPC lalu tekan [E] / Tap untuk membuka kuis.',
      targetHint: 'Tap Gedung / Jawab [1–4]'
    },
    lari_kilat: {
      icon: '🦢',
      modelLabel: 'Angsa Raksasa & 4 Gerbang Lajur',
      visualScene: 'Lintasan Lari 4 Lajur dikejar Angsa Raksasa di belakang karakter',
      howToPlay: 'Geser karakter ke lajur Gerbang [1/A]–[4/D] yang sesuai jawaban benar.',
      targetHint: 'Pindah Lajur A/D atau ←/→'
    },
    jatuh_bangun: {
      icon: '🗼',
      modelLabel: 'Menara Heksagonal & Mahkota',
      visualScene: 'Menara 4 Lantai dengan Mahkota Juara berkilau di puncak',
      howToPlay: 'Jawab benar untuk melompat naik lantai; salah membuat lantai retak.',
      targetHint: 'Pilih Lantai [1/A]–[4/D]'
    },
    detektif_kota: {
      icon: '🕵️',
      modelLabel: '3 TKP & 4 Tersangka Kota',
      visualScene: 'Area TKP berbaris pita kuning polisi dengan kaca pembesar & 4 tersangka',
      howToPlay: 'Periksa TKP dengan menjawab soal forensik lalu tangkap pelaku utama.',
      targetHint: 'Tap TKP & Pilih [1–4]'
    },
    pasar_nusantara: {
      icon: '🏮',
      modelLabel: 'Warung Tenda & Pembeli NPC',
      visualScene: 'Kios Pasar Nusantara dengan peti komoditas & antrean pembeli',
      howToPlay: 'Hitung total belanja atau kembalian yang diminta pembeli secara tepat.',
      targetHint: 'Pilih Nominal [1/A]–[4/D]'
    },
    jembatan_juara: {
      icon: '🌉',
      modelLabel: '6 Baris Panel Kaca Kristal',
      visualScene: 'Jembatan kaca di atas jurang dengan 4 panel pilihan di tiap langkah',
      howToPlay: 'Injak panel kaca [1/A]–[4/D] yang berlabel jawaban benar hingga seberang.',
      targetHint: 'Tap Panel Kaca [1–4]'
    },
    pertahanan_kastil: {
      icon: '🏰',
      modelLabel: 'Meriam Partikel & Monster Gelap',
      visualScene: 'Benteng batu dengan Meriam Partikel menghadang gelombang Monster',
      howToPlay: 'Pilih amunisi jawaban benar untuk menembakkan meriam ke Monster.',
      targetHint: 'Tembak Amunisi [1–4]'
    },
    balap_roket: {
      icon: '🚀',
      modelLabel: 'Roket Galaksi & 4 Cincin Orbit',
      visualScene: 'Roket antariksa meluncur menembus 4 Cincin Orbit Jawaban di galaksi',
      howToPlay: 'Arahkan roket menembus Cincin Orbit [1/A]–[4/D] yang bernilai benar.',
      targetHint: 'Tap Cincin [1/A]–[4/D]'
    },
    arsitek_menara: {
      icon: '🏗️',
      modelLabel: 'Crane & Balok Menara Presisi',
      visualScene: 'Derek konstruksi menurunkan blok lantai di atas fondasi Kota Ilmu',
      howToPlay: 'Jawab tepat agar balok mendarat lurus di tengah dan menara tetap stabil.',
      targetHint: 'Pasang Balok [1–4]'
    },
    labirin_minotaur: {
      icon: '🐂',
      modelLabel: 'Monster Minotaur & 4 Gerbang Kuno',
      visualScene: 'Persimpangan labirin batu kuno dijaga Minotaur bertanduk',
      howToPlay: 'Buka segel Gerbang Kuno [1/A]–[4/D] yang benar untuk keluar dari labirin.',
      targetHint: 'Buka Gerbang [1–4]'
    },
    panahan_katapel: {
      icon: '🎯',
      modelLabel: 'Katapel Kayu & 4 Papan Target',
      visualScene: 'Katapel fisika membidik 4 papan target berjarak di lapangan panahan',
      howToPlay: 'Bidik dan lontarkan batu katapel ke Papan Target [1/A]–[4/D] yang tepat.',
      targetHint: 'Bidik Target [1/A]–[4/D]'
    },
    sirkuit_logika: {
      icon: '🤖',
      modelLabel: 'Robot Coder & 4 Stasiun Baterai',
      visualScene: 'Papan sirkuit mikro dengan Robot beroda, dinding laser, & 4 Stasiun',
      howToPlay: 'Pilih rute stasiun [1/A]–[4/D] lalu jalankan program agar robot mengisi daya.',
      targetHint: 'Rute Stasiun [1–4]'
    },
    selam_samudra: {
      icon: '🚤',
      modelLabel: 'Kapal Selam Kuning & 4 Peti Harta',
      visualScene: 'Palung laut dalam dengan Kapal Selam sonar & 4 Peti Harta Karun',
      howToPlay: 'Pindai sonar dan buka Peti Harta [1/A]–[4/D] yang menyimpan jawaban.',
      targetHint: 'Buka Peti [1/A]–[4/D]'
    },
    koki_kimia: {
      icon: '🧪',
      modelLabel: '4 Labu Erlenmeyer Berwarna',
      visualScene: 'Meja laboratorium dengan 4 Labu Kimia menggelembung & kristal emas',
      howToPlay: 'Tuangkan tabung reagen [1/A]–[4/D] yang benar untuk mensintesis kristal.',
      targetHint: 'Tuang Tabung [1–4]'
    },
    ekspedisi_pinisi: {
      icon: '⛵',
      modelLabel: 'Kapal Pinisi & 4 Pulau Nusantara',
      visualScene: 'Kapal layar Pinisi berlayar menuju 4 Pulau Budaya di peta samudra',
      howToPlay: 'Arahkan kemudi Pinisi berlabuh ke Pulau [1/A]–[4/D] yang sesuai jawaban.',
      targetHint: 'Layar ke Pulau [1–4]'
    },
    penjaga_gawang: {
      icon: '⚽',
      modelLabel: 'Kiper, Striker & 4 Sudut Gawang',
      visualScene: 'Gawang stadion dengan Robot Striker menendang bola ke 4 sudut target',
      howToPlay: 'Lompat menepis bola di Sudut Gawang [1/A]–[4/D] yang berlabel jawaban benar.',
      targetHint: 'Tepis Sudut [1/A]–[4/D]'
    },
    pabrik_sortir: {
      icon: '📦',
      modelLabel: 'Conveyor Belt & 4 Jalur Kargo',
      visualScene: 'Mesin ban berjalan membawa paket kargo menuju 4 jalur gerbang sortir',
      howToPlay: 'Arahkan paket kargo ke Jalur Sortir [1/A]–[4/D] yang tepat agar dicap LULUS.',
      targetHint: 'Pilih Jalur [1/A]–[4/D]'
    },
    tebak_bangun: {
      icon: '💎',
      modelLabel: 'Meriam Laser & 4 Monumen Prisma',
      visualScene: 'Kuil optik dengan meriam cahaya membidik 4 Monumen Kristal Prisma',
      howToPlay: 'Bidik Monumen Prisma [1/A]–[4/D] yang benar lalu tembakkan sinar pelangi.',
      targetHint: 'Bidik Prisma [1–4]'
    },
    tarik_tambang: {
      icon: '🪢',
      modelLabel: 'Tim Pelajar vs Tim Robot di Arena',
      visualScene: 'Jembatan tambang di atas kawah dengan pita merah penanda tarikan',
      howToPlay: 'Jawab cepat dan tepat untuk menarik tambang ke sisi timmu hingga menang.',
      targetHint: 'Tarik Tambang [1–4]'
    },
    arena_boss: {
      icon: '👹',
      modelLabel: 'Boss Golem Raksasa & 4 Pilar Rune',
      visualScene: 'Colosseum dengan Boss Golem Raksasa di tengah 4 Pilar Energi Kristal',
      howToPlay: 'Aktifkan Pilar Energi [1/A]–[4/D] yang benar untuk menembakkan laser ke Golem.',
      targetHint: 'Aktifkan Pilar [1–4]'
    }
  };
  return specs[engineId] || specs.jelajah_dunia;
}

// ============================================================================
// 1. MINIMALIST QUESTION CARD (60-Second Timer, Symbol & Number Status)
// ============================================================================
interface ErgonomicQuestionDeckProps {
  modeTitle: string;
  statusLeft: string;
  statusRight: string;
  question: QuestionItem;
  optionPrefixes?: string[];
  onSelectOption: (optionIdx: number) => void;
  onHoverOption?: (optionIdx: number) => void;
  extraControls?: React.ReactNode;
}

const QUESTION_DURATION_SEC = 60;

export const ErgonomicQuestionDeck: React.FC<ErgonomicQuestionDeckProps> = ({
  modeTitle,
  statusLeft,
  statusRight,
  question,
  optionPrefixes,
  onSelectOption,
  onHoverOption,
  extraControls
}) => {
  const [remainingSec, setRemainingSec] = useState(QUESTION_DURATION_SEC);

  useEffect(() => {
    setRemainingSec(QUESTION_DURATION_SEC);
    const interval = window.setInterval(() => {
      setRemainingSec((prev) =>
        prev <= 0.2 ? QUESTION_DURATION_SEC : Number((prev - 0.2).toFixed(1))
      );
    }, 200);
    return () => window.clearInterval(interval);
  }, [question.id, question.q]);

  const timerVis = computeQuestionTimerVisual(remainingSec, QUESTION_DURATION_SEC);

  return (
    <section
      aria-label={modeTitle}
      data-testid="ergonomic-question-deck"
      className="fixed top-15 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-3 pointer-events-auto"
    >
      <div className="rounded-2xl glass-hud overflow-hidden">
        {/* Ultra-thin 2px Top Timer Line (60 Seconds Full Duration) */}
        <div className="w-full h-0.5 bg-zinc-800/80">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${timerVis.pct}%`,
              backgroundColor: timerVis.isBlinking ? '#f43f5e' : '#10b981'
            }}
          />
        </div>

        <div className="px-4 py-3">
          {/* Quiet Symbol & Number Status Row */}
          <div className="flex items-center justify-between gap-2 text-xs font-mono-num text-zinc-400 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-zinc-200 font-medium truncate">{statusLeft}</span>
              {statusRight && (
                <>
                  <span className="text-zinc-700" aria-hidden="true">·</span>
                  <span className="truncate">{statusRight}</span>
                </>
              )}
            </div>

            <span
              className={`shrink-0 ${
                timerVis.isBlinking ? 'text-rose-400 font-semibold' : 'text-emerald-400'
              }`}
              title="Waktu menjawab 60 detik per soal"
            >
              ⏱ {Math.ceil(remainingSec)}s
            </span>
          </div>

          {/* Question Prompt */}
          <p className="text-xs sm:text-sm font-medium text-zinc-100 leading-snug mb-2.5">
            {question.q}
          </p>

          {/* 4 Minimalist Answer Buttons synced with [1/A]..[4/D] Canvas Reticles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {question.options.map((opt, idx) => {
              const letters = ['A', 'B', 'C', 'D'];
              return (
                <button
                  key={idx}
                  type="button"
                  onPointerEnter={() => onHoverOption?.(idx)}
                  onClick={() => {
                    uiManager.triggerTactileClick(20);
                    onSelectOption(idx);
                  }}
                  className="btn-tactile flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/85 hover:bg-zinc-800 border border-white/8 hover:border-emerald-400/50 text-left text-xs text-zinc-100 cursor-pointer"
                >
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono-num text-emerald-400 font-semibold shrink-0">
                    {idx + 1}/{letters[idx]}
                  </span>
                  <span className="truncate font-medium">
                    {optionPrefixes?.[idx] ? `${optionPrefixes[idx]} · ` : ''}
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {extraControls && (
            <div className="mt-2 pt-2 border-t border-white/6">
              {extraControls}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 2. VISUAL MISSION BRIEFING CARD (Clear Illustration + How-To-Play + Target Info)
// ============================================================================
interface MissionBriefingCardProps {
  slot: MiniGameSlot;
  highScore: number;
  onDismiss: () => void;
}

export const MissionBriefingCard: React.FC<MissionBriefingCardProps> = ({
  slot,
  highScore,
  onDismiss
}) => {
  const spec = getMiniGameControlBriefing(slot.engineId);
  const visual = getMiniGameVisualSpec(slot.engineId);
  const starInfo = computeStarRating(highScore, spec.threeStarScore);

  return (
    <div
      role="status"
      aria-label={slot.title}
      data-testid="mission-briefing-card"
      onClick={() => {
        uiManager.triggerTactileClick(15);
        onDismiss();
      }}
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs pointer-events-auto cursor-pointer"
    >
      <div className="w-full max-w-sm rounded-2xl glass-modal p-5 text-center space-y-3 border border-white/12">
        <div className="flex items-center justify-between text-xs font-mono-num text-zinc-400">
          <span>GAME #{String(slot.slot).padStart(2, '0')}</span>
          <span className="text-amber-400">
            {'★'.repeat(starInfo.stars)}
            {'☆'.repeat(3 - starInfo.stars)}
          </span>
        </div>

        {/* Visual Model & Target Illustration Box */}
        <div className="py-3 px-3.5 rounded-xl bg-zinc-900/90 border border-white/8 flex items-center gap-3 text-left">
          <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
            {visual.icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-emerald-400 truncate">
              {visual.modelLabel}
            </div>
            <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">
              {visual.howToPlay}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100 font-display">
            {slot.title}
          </h2>
          <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-mono-num text-zinc-400">
            <span>🎯 {visual.targetHint}</span>
            <span>·</span>
            <span>⏱ 60d/soal</span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            uiManager.triggerTactileClick(15);
            onDismiss();
          }}
          className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold cursor-pointer"
        >
          Mulai Main
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 3. FLOATING THUMBSTICK LEGACY EXPORT
// ============================================================================
interface FloatingThumbstickProps {
  isRunnerMode: boolean;
  onMoveVector: (dx: number, dy: number) => void;
  onShiftLane: (dir: -1 | 1) => void;
  onJumpOrAction: () => void;
}

export const FloatingThumbstick: React.FC<FloatingThumbstickProps> = ({
  isRunnerMode,
  onMoveVector,
  onShiftLane,
  onJumpOrAction
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0, active: false });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const vec = computeThumbstickVector(cx, cy, e.clientX, e.clientY, 36);
    setKnobOffset({ x: vec.clampedX, y: vec.clampedY, active: true });
    uiManager.triggerHaptic(12);

    if (isRunnerMode && Math.abs(vec.dx) > 0.45) {
      onShiftLane(vec.dx < 0 ? -1 : 1);
    } else {
      onMoveVector(vec.dx, vec.dy);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!knobOffset.active) return;
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const vec = computeThumbstickVector(cx, cy, e.clientX, e.clientY, 36);
    setKnobOffset({ x: vec.clampedX, y: vec.clampedY, active: true });
    if (!isRunnerMode) {
      onMoveVector(vec.dx, vec.dy);
    }
  };

  const handlePointerUp = () => {
    setKnobOffset({ x: 0, y: 0, active: false });
    onMoveVector(0, 0);
  };

  return (
    <div className="w-full flex items-end justify-between mb-2 sm:hidden pointer-events-auto">
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-testid="floating-thumbstick"
        className="relative w-22 h-22 rounded-full bg-zinc-950/35 border border-white/15 flex items-center justify-center touch-none cursor-pointer"
      >
        <div
          style={{
            transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`
          }}
          className="w-9 h-9 rounded-full bg-zinc-100/70 transition-transform duration-75"
        />
      </div>

      <button
        type="button"
        onClick={() => {
          uiManager.triggerTactileClick(20);
          onJumpOrAction();
        }}
        className="w-12 h-12 rounded-full bg-zinc-100/85 text-zinc-950 font-bold text-sm cursor-pointer"
      >
        ↑
      </button>
    </div>
  );
};
