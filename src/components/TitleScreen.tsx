import React from 'react';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenMiniGames: () => void;
  onOpenTeacherMode: () => void;
  activePackTitle: string;
  questionCount: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenMiniGames,
  onOpenTeacherMode,
  activePackTitle,
  questionCount
}) => {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 md:p-12 pointer-events-none bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/70">
      {/* Top quiet metadata bar */}
      <div className="flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 font-medium">
          <span>EDUVERSE 3D</span>
          <span aria-hidden="true">·</span>
          <span>5 Dunia Biom Interaktif</span>
          <span aria-hidden="true">·</span>
          <span>20 Mini-Game Edukasi</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-amber-300 font-mono-num">
          <span>{activePackTitle}</span>
          <span aria-hidden="true">·</span>
          <span>{questionCount} Soal Aktif</span>
        </div>
      </div>

      {/* Main Asymmetric Left-Third Hero Lockup (leaving 60% live 3D world negative space) */}
      <div className="my-auto max-w-2xl pointer-events-auto">
        {/* Custom Inline SVG Crest & Title Emblem */}
        <div className="mb-5 flex items-center gap-4">
          <svg
            viewBox="0 0 72 72"
            className="w-16 h-16 shrink-0"
            aria-hidden="true"
          >
            <polygon
              points="36,4 66,20 66,52 36,68 6,52 6,20"
              fill="#0f172a"
              stroke="#f59e0b"
              strokeWidth="4"
            />
            <polygon
              points="36,12 58,24 58,48 36,60 14,48 14,24"
              fill="#1e293b"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <path
              d="M24 38 L36 22 L48 38 L36 50 Z"
              fill="#f59e0b"
            />
            <circle cx="36" cy="36" r="5" fill="#fef08a" />
          </svg>
          <div>
            <p className="text-xs font-semibold tracking-wider text-amber-400">
              DUNIA BELAJAR INTERAKTIF NUSANTARA
            </p>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-display leading-none mt-1">
              EDUVERSE <span className="text-amber-400">3D</span>
            </h1>
          </div>
        </div>

        <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-7 max-w-lg">
          Jelajahi Kota Ilmu, Samudra, Angkasa, Rimba, hingga pelayaran Kapal
          Pinisi Nusantara. Taklukkan seluruh 20 Mini-Game 3D Interaktif
          berbasis Universal Question Engine & kurikulum nasional.
        </p>

        {/* Up to 3 clean menu actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartGame();
            }}
            className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-slate-950 font-bold text-sm sm:text-base transition-transform shadow-lg cursor-pointer whitespace-nowrap"
          >
            Mulai Petualangan 3D
          </button>

          <button
            type="button"
            onClick={onOpenMiniGames}
            className="px-5 py-3.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-slate-100 border border-slate-700 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Pilih 20 Mini-Games
          </button>

          <button
            type="button"
            onClick={onOpenTeacherMode}
            className="px-4 py-3.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-cyan-300 border border-cyan-800/70 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Mode Guru (Soal & AI)
          </button>
        </div>
      </div>

      {/* Single flat borderless inline control hint at bottom safe margin */}
      <div className="text-xs text-slate-300 tracking-wide">
        WASD / Panah Bergerak · Spasi Lompat · Klik Objek 3D Interaksi · P Jeda · Tekan Enter atau Spasi untuk Mulai
      </div>
    </div>
  );
};
