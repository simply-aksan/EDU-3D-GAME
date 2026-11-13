import React from 'react';
import { uiManager } from '../game/UIManager';

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
  questionCount
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6 pointer-events-none bg-zinc-950/45 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-3xl glass-modal p-8 pointer-events-auto text-center flex flex-col items-center">
        {/* Minimalist Geometric Monogram */}
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-5">
          <div className="w-4 h-4 rotate-45 bg-zinc-100 rounded-[3px]" />
        </div>

        {/* Clean Brand Wordmark */}
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 font-display">
          EDUZONE
        </h1>

        {/* Symbol & Number Only Status */}
        <div className="mt-2 mb-8 flex items-center gap-3 text-xs text-zinc-400 font-mono-num">
          <span>★ 20</span>
          <span aria-hidden="true">·</span>
          <span>📚 {questionCount}</span>
        </div>

        {/* Primary Action */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            uiManager.triggerTactileClick(25);
            onStartGame();
          }}
          className="w-full h-12 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm cursor-pointer btn-tactile flex items-center justify-center gap-2"
        >
          <span>Mulai</span>
        </button>

        {/* Minimalist Secondary Triggers */}
        <div className="w-full grid grid-cols-2 gap-2.5 mt-2.5">
          <button
            type="button"
            onClick={() => {
              uiManager.triggerTactileClick(20);
              onOpenMiniGames();
            }}
            className="h-11 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 text-zinc-300 hover:text-zinc-100 border border-white/8 text-xs font-medium cursor-pointer btn-tactile flex items-center justify-center gap-1.5"
          >
            <span>☰</span>
            <span>20 Games</span>
          </button>

          <button
            type="button"
            onClick={() => {
              uiManager.triggerTactileClick(20);
              onOpenTeacherMode();
            }}
            className="h-11 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 text-zinc-300 hover:text-zinc-100 border border-white/8 text-xs font-medium cursor-pointer btn-tactile flex items-center justify-center gap-1.5"
          >
            <span>⚙</span>
            <span>Guru</span>
          </button>
        </div>
      </div>
    </div>
  );
};
