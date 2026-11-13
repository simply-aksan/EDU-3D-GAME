import React, { useEffect, useRef, useState } from 'react';
import {
  BIOMES,
  BiomeId,
  MiniGameSlot
} from '../game/questions';
import {
  computeStarRating,
  computeThumbstickVector,
  getMiniGameControlBriefing,
  uiManager
} from '../game/UIManager';
import { getMiniGameVisualSpec } from './ErgonomicHudWidgets';

export type BottomNavTabId = 'dunia' | 'minigames' | 'wardrobe' | 'materi' | 'teacher';
export type TouchControlMode = 'auto' | 'show' | 'hide';

// ============================================================================
// 1. MICRO STATUS & QUICK SYSTEM BAR (Pure Symbol & Number + Shop + Corner Menu)
// ============================================================================
interface TopCompactBarProps {
  level: number;
  playerName: string;
  coins: number;
  xp: number;
  xpProgress: number | { current: number; required: number; pct: number };
  comboLabel: string;
  isFever: boolean;
  activeGameTitle: string;
  currentZoom: number;
  isMuted: boolean;
  isPaused: boolean;
  streakCount?: number;
  onOpenProfile: () => void;
  onGoHome: () => void;
  onRestartGame: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFullscreen: () => void;
  onOpenHelp: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onOpenSlideMenu?: () => void;
}

export const TopCompactBar: React.FC<TopCompactBarProps> = ({
  level,
  coins,
  isFever,
  currentZoom,
  isMuted,
  streakCount = 0,
  onOpenProfile,
  onGoHome,
  onRestartGame,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFullscreen,
  onOpenHelp,
  onToggleMute,
  onOpenSlideMenu
}) => {
  return (
    <header className="w-full px-3 pt-3 flex items-center justify-between gap-2 pointer-events-none z-30">
      {/* Left Floating Island: Pure Symbol & Number Status + Direct Shop Trigger */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            uiManager.triggerTactileClick(15);
            onGoHome();
          }}
          title="Beranda"
          aria-label="Beranda"
          className="min-w-[40px] min-h-[40px] sm:min-w-[42px] sm:min-h-[42px] rounded-xl glass-hud flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800/80 cursor-pointer btn-tactile"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4m8-11v10a1 1 0 01-1 1h-4m-6 0h6" />
          </svg>
        </button>

        <div className="h-[40px] sm:h-[42px] px-3.5 rounded-xl glass-hud flex items-center gap-3 font-mono-num text-xs">
          <button
            type="button"
            onClick={() => {
              uiManager.triggerTactileClick(15);
              onOpenProfile();
            }}
            title="Level & Profil"
            className="flex items-center gap-1 text-zinc-100 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <span className="text-zinc-400">★</span>
            <span className="font-semibold">{level}</span>
          </button>

          <span className="text-zinc-700" aria-hidden="true">·</span>

          <button
            type="button"
            onClick={() => {
              uiManager.triggerTactileClick(15);
              onOpenProfile();
            }}
            title="Koin & Shop Kustomisasi"
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
          >
            <span>🪙</span>
            <span>{coins}</span>
          </button>

          {(streakCount > 0 || isFever) && (
            <>
              <span className="text-zinc-700" aria-hidden="true">·</span>
              <div
                className={`flex items-center gap-0.5 font-semibold ${
                  isFever ? 'text-emerald-400 animate-pulse' : 'text-zinc-300'
                }`}
              >
                <span>⚡</span>
                <span>{Math.max(1, streakCount)}x</span>
              </div>
            </>
          )}
        </div>

        {/* Dedicated Shop Karakter Button */}
        <button
          type="button"
          onClick={() => {
            uiManager.triggerTactileClick(18);
            onOpenProfile();
          }}
          title="Shop Kustomisasi Karakter"
          aria-label="Shop Karakter"
          data-testid="open-shop-button"
          className="h-[40px] sm:h-[42px] px-3 rounded-xl glass-hud hover:bg-zinc-800/80 flex items-center gap-1.5 text-xs font-medium text-zinc-200 hover:text-white cursor-pointer btn-tactile"
        >
          <span>🛍</span>
          <span className="hidden sm:inline">Shop</span>
        </button>
      </div>

      {/* Right Floating Island: Icon-Only Controls + Hidden Slide-Over Menu Trigger */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Compact Zoom Strip */}
        <div className="hidden sm:flex items-center h-[42px] px-1 rounded-xl glass-hud font-mono-num text-xs text-zinc-300">
          <button
            type="button"
            onClick={() => {
              uiManager.triggerTactileClick(15);
              onZoomOut();
            }}
            title="Perkecil Kamera (-)"
            aria-label="Perkecil Kamera"
            className="w-8 h-8 rounded-lg hover:bg-zinc-800/80 flex items-center justify-center cursor-pointer"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              uiManager.triggerTactileClick(15);
              onResetZoom();
            }}
            title="Reset Zoom"
            className="px-1.5 h-8 rounded-lg hover:bg-zinc-800/80 flex items-center justify-center text-[11px] cursor-pointer"
          >
            {Math.round(currentZoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => {
              uiManager.triggerTactileClick(15);
              onZoomIn();
            }}
            title="Perbesar Kamera (+)"
            aria-label="Perbesar Kamera"
            className="w-8 h-8 rounded-lg hover:bg-zinc-800/80 flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Restart Button */}
        <button
          type="button"
          onClick={() => {
            uiManager.triggerTactileClick(20);
            onRestartGame();
          }}
          title="Ulangi"
          aria-label="Ulangi"
          className="min-w-[40px] min-h-[40px] sm:min-w-[42px] sm:min-h-[42px] rounded-xl glass-hud flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800/80 cursor-pointer btn-tactile"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.5 14.5A8 8 0 0019 12M18.5 9.5A8 8 0 005 12" />
          </svg>
        </button>

        {/* Mute Button */}
        <button
          type="button"
          onClick={() => {
            uiManager.triggerTactileClick(15);
            onToggleMute();
          }}
          title="Suara"
          aria-label="Suara"
          className="hidden md:flex min-w-[42px] min-h-[42px] rounded-xl glass-hud items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800/80 cursor-pointer btn-tactile text-xs"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={() => {
            uiManager.triggerTactileClick(15);
            onToggleFullscreen();
          }}
          title="Layar Penuh"
          aria-label="Layar Penuh"
          className="hidden sm:flex min-w-[42px] min-h-[42px] rounded-xl glass-hud items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800/80 cursor-pointer btn-tactile"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4m8 0h4v4m0 8v4h-4M8 20H4v-4" />
          </svg>
        </button>

        {/* Help (?) Button */}
        <button
          type="button"
          onClick={() => {
            uiManager.triggerTactileClick(15);
            onOpenHelp();
          }}
          title="Bantuan (?)"
          aria-label="Bantuan"
          className="min-w-[40px] min-h-[40px] sm:min-w-[42px] sm:min-h-[42px] rounded-xl glass-hud flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800/80 font-mono-num text-xs font-bold cursor-pointer btn-tactile"
        >
          ?
        </button>

        {/* Hidden Slide-Over Menu Trigger (Primary Navigation Corner Button) */}
        <button
          type="button"
          onClick={() => {
            uiManager.triggerTactileClick(20);
            onOpenSlideMenu?.();
          }}
          title="Menu (M)"
          aria-label="Buka Menu"
          data-testid="slide-over-menu-trigger"
          className="min-w-[42px] min-h-[42px] px-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center gap-1.5 font-medium text-xs cursor-pointer btn-tactile shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};

// ============================================================================
// 2. DUAL-ZONE TOUCH GAMEPAD (Hidden on Desktop by default + Optional Override)
// ============================================================================
interface DualZoneTouchGamepadProps {
  isRunnerMode: boolean;
  touchControlMode?: TouchControlMode;
  onMoveVector: (dx: number, dy: number) => void;
  onShiftLane: (dir: -1 | 1) => void;
  onJump: () => void;
  onInteract: () => void;
}

export const DualZoneTouchGamepad: React.FC<DualZoneTouchGamepadProps> = ({
  isRunnerMode,
  touchControlMode = 'auto',
  onMoveVector,
  onShiftLane,
  onJump,
  onInteract
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const [isMobileOrTabletViewport, setIsMobileOrTabletViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    return coarse && window.innerWidth < 1024;
  });

  useEffect(() => {
    const checkDevice = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setIsMobileOrTabletViewport(coarse && window.innerWidth < 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Desktop Controller Rule:
  // - 'hide': always hidden
  // - 'auto': hidden completely on Desktop; only shown on mobile/tablet coarse pointers (< 1024px)
  // - 'show': explicitly shown (for touch-screen laptops or user preference)
  const shouldRender =
    touchControlMode === 'show' ||
    (touchControlMode === 'auto' && isMobileOrTabletViewport);

  if (!shouldRender) {
    return null;
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const vec = computeThumbstickVector(cx, cy, e.clientX, e.clientY, 36);
    setKnob({ x: vec.clampedX, y: vec.clampedY, active: true });
    uiManager.triggerHaptic(12);

    if (isRunnerMode && Math.abs(vec.dx) > 0.4) {
      onShiftLane(vec.dx < 0 ? -1 : 1);
    } else {
      onMoveVector(vec.dx, vec.dy);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!knob.active) return;
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const vec = computeThumbstickVector(cx, cy, e.clientX, e.clientY, 36);
    setKnob({ x: vec.clampedX, y: vec.clampedY, active: true });
    if (!isRunnerMode) {
      onMoveVector(vec.dx, vec.dy);
    }
  };

  const handlePointerUp = () => {
    setKnob({ x: 0, y: 0, active: false });
    onMoveVector(0, 0);
  };

  return (
    <div
      data-testid="dual-zone-touch-gamepad"
      className="fixed bottom-5 left-4 right-4 z-20 flex items-end justify-between pointer-events-none"
    >
      {/* Left Ghost Joystick Ring */}
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Joystick Gerak"
        className="pointer-events-auto relative w-24 h-24 rounded-full bg-zinc-950/35 border border-white/12 backdrop-blur-xs flex items-center justify-center touch-none cursor-pointer"
      >
        <div
          style={{
            transform: `translate3d(${knob.x}px, ${knob.y}px, 0)`
          }}
          className={`w-10 h-10 rounded-full transition-transform duration-75 flex items-center justify-center ${
            knob.active
              ? 'bg-zinc-100/90 scale-105'
              : 'bg-zinc-200/25 border border-white/20'
          }`}
        />
      </div>

      {/* Right Ghost Action & Jump Buttons */}
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            uiManager.triggerTactileClick(20);
            onInteract();
          }}
          aria-label="Aksi"
          className="w-13 h-13 rounded-full bg-zinc-950/45 hover:bg-zinc-900/70 border border-white/15 text-zinc-200 flex items-center justify-center text-sm font-mono-num font-semibold cursor-pointer btn-tactile backdrop-blur-xs"
        >
          E
        </button>

        <button
          type="button"
          onClick={() => {
            uiManager.triggerTactileClick(25);
            onJump();
          }}
          aria-label="Lompat"
          className="w-14 h-14 rounded-full bg-zinc-100/85 hover:bg-white text-zinc-950 flex items-center justify-center text-base font-bold cursor-pointer btn-tactile shadow-md"
        >
          ↑
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 3. HIDDEN SLIDE-OVER MENU DRAWER (Visual Game Cards + Touch Toggle + Shop)
// ============================================================================
interface QuickGameDrawerProps {
  open: boolean;
  onClose: () => void;
  slots: MiniGameSlot[];
  activeEngineId: string;
  highScores?: Record<string, number>;
  currentBiome?: BiomeId;
  isMuted?: boolean;
  currentZoom?: number;
  touchControlMode?: TouchControlMode;
  onChangeTouchControlMode?: (mode: TouchControlMode) => void;
  onSelectSlot: (slot: MiniGameSlot) => void;
  onSelectBiome?: (biome: BiomeId) => void;
  onOpenWardrobe?: () => void;
  onOpenMateri?: () => void;
  onOpenTeacher?: () => void;
  onOpenScorecard?: () => void;
  onGoHome?: () => void;
  onRestartGame?: () => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

export const QuickGameDrawer: React.FC<QuickGameDrawerProps> = ({
  open,
  onClose,
  slots,
  activeEngineId,
  highScores = {},
  currentBiome = 'kota_ilmu',
  isMuted = false,
  currentZoom = 1,
  touchControlMode = 'auto',
  onChangeTouchControlMode,
  onSelectSlot,
  onSelectBiome,
  onOpenWardrobe,
  onOpenMateri,
  onOpenTeacher,
  onOpenScorecard,
  onGoHome,
  onRestartGame,
  onToggleMute,
  onToggleFullscreen,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) => {
  const [section, setSection] = useState<'games' | 'biomes' | 'system'>('games');

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Menu Samping"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px] pointer-events-auto"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-md h-full glass-modal border-l border-white/10 flex flex-col justify-between p-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drawer Bar */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/8">
            <span className="text-sm font-semibold tracking-tight text-zinc-100 font-display">
              EDUZONE
            </span>
            <button
              type="button"
              onClick={() => {
                uiManager.triggerTactileClick(15);
                onClose();
              }}
              aria-label="Tutup Menu"
              className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Clean Segmented Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900/90 rounded-xl my-3 border border-white/6">
            <button
              type="button"
              onClick={() => setSection('games')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                section === 'games'
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              20 Games
            </button>
            <button
              type="button"
              onClick={() => setSection('biomes')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                section === 'biomes'
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dunia
            </button>
            <button
              type="button"
              onClick={() => setSection('system')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                section === 'system'
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Menu
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {section === 'games' &&
            slots.map((slot) => {
              const isCurrent = slot.engineId === activeEngineId;
              const best = highScores[slot.engineId] || 0;
              const spec = getMiniGameControlBriefing(slot.engineId);
              const visual = getMiniGameVisualSpec(slot.engineId);
              const stars = computeStarRating(best, spec.threeStarScore).stars;

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    uiManager.triggerTactileClick(20);
                    onSelectSlot(slot);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-xl flex items-start gap-3 text-left transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-900/65 hover:bg-zinc-800/85 text-zinc-200 border border-white/6'
                  }`}
                >
                  {/* Visual Game Model Icon Badge */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      isCurrent ? 'bg-zinc-950/15' : 'bg-zinc-800/90'
                    }`}
                  >
                    {visual.icon}
                  </div>

                  {/* Game Preview Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[11px] font-mono-num ${
                            isCurrent ? 'text-zinc-600' : 'text-zinc-500'
                          }`}
                        >
                          {String(slot.slot).padStart(2, '0')}
                        </span>
                        <span className="text-xs font-semibold truncate">
                          {slot.title}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-mono-num shrink-0 ${
                          isCurrent ? 'text-zinc-800' : 'text-amber-400'
                        }`}
                      >
                        {'★'.repeat(stars)}
                        {'☆'.repeat(3 - stars)}
                      </span>
                    </div>

                    <div
                      className={`text-[11px] mt-0.5 truncate font-medium ${
                        isCurrent ? 'text-zinc-700' : 'text-emerald-400/90'
                      }`}
                    >
                      {visual.modelLabel}
                    </div>

                    <div
                      className={`text-[11px] mt-0.5 line-clamp-2 leading-snug ${
                        isCurrent ? 'text-zinc-600' : 'text-zinc-400'
                      }`}
                    >
                      {visual.howToPlay}
                    </div>
                  </div>
                </button>
              );
            })}

          {section === 'biomes' &&
            BIOMES.map((b) => {
              const active = b.id === currentBiome;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    uiManager.triggerTactileClick(20);
                    onSelectBiome?.(b.id);
                    onClose();
                  }}
                  className={`w-full px-3.5 py-3 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-200 border border-white/5'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{b.name}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        active ? 'text-zinc-700' : 'text-zinc-400'
                      }`}
                    >
                      {b.subtitle}
                    </div>
                  </div>
                  <span className="text-xs font-mono-num opacity-70">{active ? '✓' : '→'}</span>
                </button>
              );
            })}

          {section === 'system' && (
            <div className="space-y-2 pt-1">
              {/* Featured Shop Kustomisasi Karakter Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWardrobe?.();
                }}
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-between text-xs font-semibold cursor-pointer"
              >
                <span>🛍 Shop & Kustomisasi Karakter</span>
                <span>→</span>
              </button>

              {/* Desktop / Touch Controller Mode Selector */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Kontrol Sentuh Layar</span>
                  <span className="text-[11px] font-mono-num text-zinc-500">
                    {touchControlMode === 'auto'
                      ? 'Sembunyi di Desktop'
                      : touchControlMode === 'show'
                      ? 'Selalu Tampil'
                      : 'Sembunyi Total'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-950 rounded-lg border border-white/5">
                  {(['auto', 'show', 'hide'] as TouchControlMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        uiManager.triggerTactileClick(15);
                        onChangeTouchControlMode?.(mode);
                      }}
                      className={`py-1 rounded text-[11px] font-medium cursor-pointer ${
                        touchControlMode === mode
                          ? 'bg-zinc-100 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {mode === 'auto'
                        ? 'Otomatis'
                        : mode === 'show'
                        ? 'Tampil'
                        : 'Sembunyi'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Zoom Controls inside Drawer */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Zoom Kamera</span>
                <div className="flex items-center gap-1.5 font-mono-num text-xs">
                  <button
                    type="button"
                    onClick={onZoomOut}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={onResetZoom}
                    className="px-2 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                  >
                    {Math.round(currentZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={onZoomIn}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMateri?.();
                }}
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 flex items-center justify-between text-xs text-zinc-200 cursor-pointer"
              >
                <span>Materi Belajar</span>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTeacher?.();
                }}
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 flex items-center justify-between text-xs text-zinc-200 cursor-pointer"
              >
                <span>Mode Guru</span>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScorecard?.();
                }}
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 flex items-center justify-between text-xs text-zinc-200 cursor-pointer"
              >
                <span>Rapor & Sertifikat</span>
                <span>→</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs text-zinc-300 cursor-pointer"
                >
                  {isMuted ? '🔇 Bisu' : '🔊 Suara'}
                </button>
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs text-zinc-300 cursor-pointer"
                >
                  ⛶ Layar Penuh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRestartGame?.();
                  }}
                  className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs text-zinc-300 cursor-pointer"
                >
                  ↺ Ulangi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoHome?.();
                  }}
                  className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs text-zinc-300 cursor-pointer"
                >
                  ⌂ Beranda
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

// Kept as a no-op export so any legacy imports remain valid while freeing 100% of bottom viewport
export const MobileBottomNavBar: React.FC<{
  activeTab: BottomNavTabId;
  onSelectTab: (tab: BottomNavTabId) => void;
  currentBiomeName?: string;
}> = () => null;

// ============================================================================
// 4. MINIMALIST HELP MODAL (Clean Symbol & Key Map)
// ============================================================================
interface HelpGuideModalProps {
  open: boolean;
  onClose: () => void;
  activeGameTitle: string;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  open,
  onClose
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Kontrol"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl glass-modal p-5 text-zinc-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <span className="text-sm font-semibold">Panduan Kontrol & Waktu</span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2 text-xs font-mono-num">
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-zinc-400">Waktu per Soal</span>
            <span className="text-emerald-400">60 Detik</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-zinc-400">Gerak Karakter</span>
            <span>WASD / Panah</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-zinc-400">Lompat</span>
            <span>Spasi / ↑</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-zinc-400">Interaksi Target</span>
            <span>E / Tap Target [1–4]</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-zinc-400">Jawab Cepat</span>
            <span>Tombol 1 · 2 · 3 · 4</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-400">Zoom Kamera</span>
            <span>− / 100% / +</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
