import React, { useState } from 'react';
import {
  ACCESSORY_ITEMS,
  AccessoryId,
  AURA_ITEMS,
  AuraId,
  BIOMES,
  BiomeId,
  CostumeUniformId,
  DEFAULT_QUESTION_PACK,
  MINI_GAME_REGISTRY,
  MiniGameSlot,
  PET_ITEMS,
  PetId,
  PlayerProfile,
  PROP_WEAPON_ITEMS,
  PropWeaponId,
  QuestionItem,
  QuestionPack,
  SCHOOL_GRADE_OPTIONS,
  SUBJECT_PRESET_OPTIONS,
  THEME_COLOR_ITEMS,
  ThemeColorId,
  UNIFORM_ITEMS
} from '../game/questions';
import {
  encodeQuestionPackToHash,
  extractYoutubeVideoId,
  generateGeminiTeacherPrompt,
  getXpProgressInLevel,
  validateQuestionPackJson
} from '../game/rules';
import {
  computeStarRating,
  getMiniGameControlBriefing,
  uiManager
} from '../game/UIManager';
import { getMiniGameVisualSpec } from './ErgonomicHudWidgets';

// ============================================================================
// 1. 20 MINI-GAMES LAUNCHER MODAL (WITH VISUAL GAME PREVIEW CARDS & MODELS)
// ============================================================================
interface MiniGamesModalProps {
  activeSlotId: string;
  highScores: Record<string, number>;
  onSelectSlot: (slot: MiniGameSlot) => void;
  onClose: () => void;
}

export const MiniGamesModal: React.FC<MiniGamesModalProps> = ({
  activeSlotId,
  highScores,
  onSelectSlot,
  onClose
}) => {
  const [filter, setFilter] = useState<'all' | 'featured'>('all');
  const slots =
    filter === 'featured'
      ? MINI_GAME_REGISTRY.filter((s) => s.isFeaturedSix)
      : MINI_GAME_REGISTRY;

  const totalStars = MINI_GAME_REGISTRY.reduce((acc, s) => {
    const spec = getMiniGameControlBriefing(s.engineId);
    const info = computeStarRating(
      highScores[s.engineId] || 0,
      spec.threeStarScore
    );
    return acc + info.stars;
  }, 0);

  return (
    <div
      role="dialog"
      aria-label="Daftar 20 Mini-Games Edukasi"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs pointer-events-auto"
    >
      <div className="w-full max-w-6xl max-h-[88vh] flex flex-col rounded-2xl glass-modal overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-zinc-950/70">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 font-display tracking-tight">
              20 Mini-Games Interaktif (Panduan Visual & Model 2D)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono-num">
              Total Bintang: <span className="text-amber-400 font-semibold">{totalStars} / 60 ★</span> · Waktu Menjawab: <span className="text-emerald-400">60 Detik / Soal</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-xl border border-white/8">
              <button
                type="button"
                onClick={() => {
                  uiManager.triggerTactileClick();
                  setFilter('all');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                  filter === 'all'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Semua 20 Game
              </button>
              <button
                type="button"
                onClick={() => {
                  uiManager.triggerTactileClick();
                  setFilter('featured');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                  filter === 'featured'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Unggulan
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                uiManager.triggerTactileClick();
                onClose();
              }}
              aria-label="Tutup Daftar Mini-Games"
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-medium cursor-pointer btn-tactile whitespace-nowrap"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {slots.map((slot) => {
            const isActive = slot.id === activeSlotId;
            const best = highScores[slot.engineId] || 0;
            const briefing = getMiniGameControlBriefing(slot.engineId);
            const visual = getMiniGameVisualSpec(slot.engineId);
            const starInfo = computeStarRating(best, briefing.threeStarScore);

            return (
              <div
                key={slot.id}
                className={`bento-tile flex flex-col justify-between p-4 rounded-2xl ${
                  isActive
                    ? 'border-emerald-400/70 bg-zinc-900/95 ring-1 ring-emerald-400/40'
                    : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono-num">
                    <span>
                      #{String(slot.slot).padStart(2, '0')} · {slot.category}
                    </span>
                    <span
                      className="flex items-center gap-0.5 text-xs"
                      aria-label={`${starInfo.stars} dari 3 Bintang`}
                    >
                      {[1, 2, 3].map((idx) => (
                        <span
                          key={idx}
                          className={
                            idx <= starInfo.stars
                              ? 'text-amber-400'
                              : 'text-zinc-700'
                          }
                        >
                          ★
                        </span>
                      ))}
                    </span>
                  </div>

                  {/* Visual Scene & 2D Model Preview Banner */}
                  <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-white/6 flex items-center gap-2.5 mb-2.5">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-xl shrink-0">
                      {visual.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-emerald-400 truncate">
                        {visual.modelLabel}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono-num truncate">
                        🎯 {visual.targetHint}
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-100 font-display leading-snug">
                    {slot.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {visual.howToPlay}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/8">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono-num mb-2">
                    <span>Skor: {best}</span>
                    <span>3★: {briefing.threeStarScore}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      uiManager.triggerTactileClick(25);
                      onSelectSlot(slot);
                    }}
                    className={`w-full py-2 rounded-xl font-semibold text-xs cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-400 text-zinc-950'
                        : 'bg-zinc-100 hover:bg-white text-zinc-950'
                    }`}
                  >
                    {isActive ? 'Sedang Aktif' : 'Mainkan Game'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. SHOP KUSTOMISASI KARAKTER 5 KATEGORI + TRY-ON INTERAKTIF + ZOOM KAMERA
// ============================================================================
export interface ShopPreviewLoadout {
  uniform: CostumeUniformId;
  accessories: AccessoryId[];
  aura: AuraId;
  pet: PetId;
  propWeapon: PropWeaponId;
  themeColor: ThemeColorId;
}

interface WardrobeModalProps {
  profile: PlayerProfile;
  totalStars?: number;
  currentZoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onSelectUniform: (id: CostumeUniformId) => void;
  onToggleAccessory: (id: AccessoryId) => void;
  onSelectAura?: (id: AuraId) => void;
  onSelectPet?: (id: PetId) => void;
  onSelectPropWeapon?: (id: PropWeaponId) => void;
  onSelectThemeColor?: (id: ThemeColorId) => void;
  onPreviewLoadout?: (preview: ShopPreviewLoadout) => void;
  onUpdateName: (name: string) => void;
  onClose: () => void;
}

type ShopCategoryTab = 'uniform' | 'accessory' | 'aura' | 'pet' | 'prop';

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  profile,
  totalStars = 0,
  currentZoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSelectUniform,
  onToggleAccessory,
  onSelectAura,
  onSelectPet,
  onSelectPropWeapon,
  onSelectThemeColor,
  onPreviewLoadout,
  onUpdateName,
  onClose
}) => {
  const [nameInput, setNameInput] = useState(profile.name);
  const [activeCategory, setActiveCategory] = useState<ShopCategoryTab>('uniform');
  const [tryOnNotice, setTryOnNotice] = useState<string | null>(null);

  // Interactive Try-On State (allows testing locked/unpurchased items on the live character)
  const [previewState, setPreviewState] = useState<ShopPreviewLoadout>({
    uniform: profile.uniform,
    accessories: profile.accessories,
    aura: profile.aura || 'none',
    pet: profile.pet || 'none',
    propWeapon: profile.propWeapon || 'none',
    themeColor: profile.themeColor || 'klasik'
  });

  const xpProgress = getXpProgressInLevel(profile.xp);

  const applyTryOnPreview = (patch: Partial<ShopPreviewLoadout>, label: string) => {
    const next: ShopPreviewLoadout = {
      ...previewState,
      ...patch
    };
    setPreviewState(next);
    setTryOnNotice(`Pratinjau Coba Pakai: ${label}`);
    onPreviewLoadout?.(next);
  };

  const handleResetToOwnedLoadout = () => {
    const owned: ShopPreviewLoadout = {
      uniform: profile.uniform,
      accessories: profile.accessories,
      aura: profile.aura || 'none',
      pet: profile.pet || 'none',
      propWeapon: profile.propWeapon || 'none',
      themeColor: profile.themeColor || 'klasik'
    };
    setPreviewState(owned);
    setTryOnNotice(null);
    onPreviewLoadout?.(owned);
  };

  const unlockedAuras: AuraId[] = profile.unlockedAuras || ['none'];
  const unlockedPets: PetId[] = profile.unlockedPets || ['none'];
  const unlockedProps: PropWeaponId[] = profile.unlockedProps || ['none'];
  const unlockedThemes: ThemeColorId[] = profile.unlockedThemes || ['klasik'];

  const formatReqBadge = (cost: number, minLevel?: number, minStars?: number) => {
    const parts: string[] = [];
    parts.push(cost === 0 ? 'Gratis' : `🪙 ${cost}`);
    if (minLevel) parts.push(`★Lv.${minLevel}`);
    if (minStars) parts.push(`${minStars}★`);
    return parts.join(' · ');
  };

  return (
    <div
      role="dialog"
      aria-label="Shop Kustomisasi Karakter"
      className="fixed inset-0 z-40 flex flex-col lg:flex-row items-stretch justify-end p-3 sm:p-5 wardrobe-dof-vignette pointer-events-none"
    >
      {/* Left Interactive Character Preview Viewport + Camera Zoom Controls */}
      <div className="flex-1 flex flex-col justify-between p-2 sm:p-4 pointer-events-none min-h-[140px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl glass-hud text-xs font-mono-num text-zinc-200 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PRATINJAU KARAKTER LANGSUNG</span>
          </div>

          {/* Interactive Camera Zoom Controls inside Shop */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl glass-hud font-mono-num text-xs text-zinc-200 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                uiManager.triggerTactileClick(15);
                onZoomOut?.();
              }}
              aria-label="Perkecil Pratinjau"
              className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                uiManager.triggerTactileClick(15);
                onResetZoom?.();
              }}
              className="px-2 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] cursor-pointer"
            >
              Zoom {Math.round(currentZoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => {
                uiManager.triggerTactileClick(15);
                onZoomIn?.();
              }}
              aria-label="Perbesar Pratinjau"
              className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Try-On Status Pill at Bottom of Character Viewport */}
        <div className="flex flex-wrap items-center gap-2">
          {tryOnNotice ? (
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl glass-hud text-xs text-emerald-300 pointer-events-auto">
              <span>👁 {tryOnNotice}</span>
              <button
                type="button"
                onClick={handleResetToOwnedLoadout}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl glass-hud text-[11px] text-zinc-400">
              <span>Klik &quot;Coba Pakai&quot; pada item mana saja untuk melihat tampilannya di karakter sebelum membeli</span>
            </div>
          )}
        </div>
      </div>

      {/* Right 5-Category Shop Studio Panel */}
      <div className="w-full lg:max-w-2xl max-h-[86vh] flex flex-col rounded-2xl glass-modal overflow-hidden pointer-events-auto my-auto">
        {/* Header Bar with Economy Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-zinc-950/80">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-zinc-100 font-display">
              Shop Kustomisasi Karakter
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono-num mt-0.5">
              <span className="text-amber-400 font-semibold">🪙 {profile.coins} Koin</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300">★ Lv.{profile.level}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-emerald-400">{totalStars} ★ Bintang</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              uiManager.triggerTactileClick();
              handleResetToOwnedLoadout();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-medium cursor-pointer btn-tactile"
          >
            Tutup
          </button>
        </div>

        {/* 5 Category Tabs */}
        <div className="px-5 py-2.5 bg-zinc-950/60 border-b border-white/8 grid grid-cols-5 gap-1">
          {(
            [
              { id: 'uniform', label: 'Kostum', icon: '👕' },
              { id: 'accessory', label: 'Topi/Kaca', icon: '👑' },
              { id: 'aura', label: 'Aura', icon: '✨' },
              { id: 'pet', label: 'Pet/Drone', icon: '🐾' },
              { id: 'prop', label: 'Alat/Warna', icon: '⚔️' }
            ] as { id: ShopCategoryTab; label: string; icon: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                uiManager.triggerTactileClick(15);
                setActiveCategory(tab.id);
              }}
              className={`py-2 px-1.5 rounded-xl text-xs font-medium flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="truncate text-[11px] sm:text-xs">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Shop Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Compact Player Identity Bar */}
          <div className="p-3 rounded-xl bg-zinc-900/65 border border-white/6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <input
                id="player-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                aria-label="Identitas Pelajar Nusantara"
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-zinc-100"
              />
              <button
                type="button"
                onClick={() => {
                  uiManager.triggerTactileClick();
                  if (nameInput.trim()) onUpdateName(nameInput.trim());
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
              >
                Simpan Nama
              </button>
            </div>
            <div className="text-[11px] font-mono-num text-zinc-400">
              XP {profile.xp} ({xpProgress}% ke Lv.{profile.level + 1})
            </div>
          </div>

          {/* TAB 1: KOSTUM & SERAGAM KARAKTER */}
          {activeCategory === 'uniform' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {UNIFORM_ITEMS.map((item) => {
                const unlocked = profile.unlockedUniforms.includes(item.id);
                const equipped = profile.uniform === item.id;
                const isPreviewing = previewState.uniform === item.id;
                const meetsLevel = !item.minLevel || profile.level >= item.minLevel;
                const meetsStars = !item.minStars || totalStars >= item.minStars;
                const meetsReq = meetsLevel && meetsStars;
                const canAfford = profile.coins >= item.cost && meetsReq;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
                      equipped
                        ? 'bg-zinc-900/95 border-emerald-400/60'
                        : isPreviewing
                        ? 'bg-zinc-900/80 border-zinc-400'
                        : 'bg-zinc-900/50 border-white/6'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-zinc-100">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono-num text-zinc-400 mt-0.5">
                          {unlocked ? '✓ Sudah Dimiliki' : item.badgeLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          uiManager.triggerTactileClick(15);
                          applyTryOnPreview({ uniform: item.id }, item.name);
                        }}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 cursor-pointer shrink-0"
                      >
                        👁 Coba Pakai
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!unlocked && !canAfford}
                      onClick={() => {
                        uiManager.triggerTactileClick(25);
                        onSelectUniform(item.id);
                        applyTryOnPreview({ uniform: item.id }, item.name);
                      }}
                      className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                        equipped
                          ? 'bg-emerald-400 text-zinc-950'
                          : unlocked
                          ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                          : !meetsReq
                          ? 'bg-zinc-950 text-zinc-500 border border-white/5 cursor-not-allowed'
                          : canAfford
                          ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                          : 'bg-zinc-950 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {equipped
                        ? 'Dipakai'
                        : unlocked
                        ? 'Pakai Seragam'
                        : !meetsLevel
                        ? `Buka di Level ${item.minLevel}`
                        : !meetsStars
                        ? `Butuh ${item.minStars} ★ Bintang`
                        : item.cost === 0
                        ? 'Klaim Spesial (Gratis)'
                        : `Beli 🪙 ${item.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: TOPI, MAHKOTA, & KACAMATA */}
          {activeCategory === 'accessory' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACCESSORY_ITEMS.map((acc) => {
                const unlocked = profile.unlockedAccessories.includes(acc.id);
                const equipped = profile.accessories.includes(acc.id);
                const isPreviewing = previewState.accessories.includes(acc.id);
                const meetsLevel = !acc.minLevel || profile.level >= acc.minLevel;
                const meetsStars = !acc.minStars || totalStars >= acc.minStars;
                const meetsReq = meetsLevel && meetsStars;
                const canAfford = profile.coins >= acc.cost && meetsReq;

                return (
                  <div
                    key={acc.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
                      equipped
                        ? 'bg-zinc-900/95 border-emerald-400/60'
                        : isPreviewing
                        ? 'bg-zinc-900/80 border-zinc-400'
                        : 'bg-zinc-900/50 border-white/6'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-zinc-100">
                          {acc.name}
                        </div>
                        <div className="text-[11px] font-mono-num text-zinc-400 mt-0.5">
                          Slot {acc.slot.toUpperCase()} · {unlocked ? '✓ Milikmu' : acc.badgeLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          uiManager.triggerTactileClick(15);
                          const nextAcc = previewState.accessories.includes(acc.id)
                            ? previewState.accessories.filter((a) => a !== acc.id)
                            : [...previewState.accessories, acc.id];
                          applyTryOnPreview({ accessories: nextAcc }, acc.name);
                        }}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 cursor-pointer shrink-0"
                      >
                        👁 Coba Pakai
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!unlocked && !canAfford}
                      onClick={() => {
                        uiManager.triggerTactileClick(25);
                        onToggleAccessory(acc.id);
                      }}
                      className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                        equipped
                          ? 'bg-emerald-400 text-zinc-950'
                          : unlocked
                          ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                          : !meetsReq
                          ? 'bg-zinc-950 text-zinc-500 border border-white/5 cursor-not-allowed'
                          : canAfford
                          ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                          : 'bg-zinc-950 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {equipped
                        ? 'Lepas Aksesori'
                        : unlocked
                        ? 'Pasang'
                        : !meetsLevel
                        ? `Buka di Level ${acc.minLevel}`
                        : !meetsStars
                        ? `Butuh ${acc.minStars} ★ Bintang`
                        : acc.cost === 0
                        ? 'Klaim Spesial (Gratis)'
                        : `Beli 🪙 ${acc.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: EFEK AURA & JEJAK LANGKAH PARTIKEL */}
          {activeCategory === 'aura' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AURA_ITEMS.map((item) => {
                const unlocked = unlockedAuras.includes(item.id);
                const equipped = (profile.aura || 'none') === item.id;
                const isPreviewing = previewState.aura === item.id;
                const meetsLevel = !item.minLevel || profile.level >= item.minLevel;
                const meetsStars = !item.minStars || totalStars >= item.minStars;
                const meetsReq = meetsLevel && meetsStars;
                const canAfford = profile.coins >= item.cost && meetsReq;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                      equipped
                        ? 'bg-zinc-900/95 border-emerald-400/60'
                        : isPreviewing
                        ? 'bg-zinc-900/80 border-zinc-400'
                        : 'bg-zinc-900/50 border-white/6'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        <div>
                          <div className="text-sm font-semibold text-zinc-100">
                            {item.name}
                          </div>
                          <div className="text-[11px] font-mono-num text-zinc-400 mt-0.5">
                            {unlocked ? '✓ Sudah Dimiliki' : formatReqBadge(item.cost, item.minLevel, item.minStars)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          uiManager.triggerTactileClick(15);
                          applyTryOnPreview({ aura: item.id }, item.name);
                        }}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 cursor-pointer shrink-0"
                      >
                        👁 Coba
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!unlocked && !canAfford}
                      onClick={() => {
                        uiManager.triggerTactileClick(25);
                        onSelectAura?.(item.id);
                        applyTryOnPreview({ aura: item.id }, item.name);
                      }}
                      className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                        equipped
                          ? 'bg-emerald-400 text-zinc-950'
                          : unlocked
                          ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                          : !meetsReq
                          ? 'bg-zinc-950 text-zinc-500 border border-white/5 cursor-not-allowed'
                          : canAfford
                          ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                          : 'bg-zinc-950 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {equipped
                        ? 'Aura Aktif'
                        : unlocked
                        ? 'Pakai Aura'
                        : !meetsLevel
                        ? `Buka di Level ${item.minLevel}`
                        : !meetsStars
                        ? `Butuh ${item.minStars} ★ Bintang`
                        : item.cost === 0
                        ? 'Klaim Spesial (Gratis)'
                        : `Beli 🪙 ${item.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: HEWAN PELIHARAAN PENDAMPING (PET / DRONE KECIL) */}
          {activeCategory === 'pet' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PET_ITEMS.map((item) => {
                const unlocked = unlockedPets.includes(item.id);
                const equipped = (profile.pet || 'none') === item.id;
                const isPreviewing = previewState.pet === item.id;
                const meetsLevel = !item.minLevel || profile.level >= item.minLevel;
                const meetsStars = !item.minStars || totalStars >= item.minStars;
                const meetsReq = meetsLevel && meetsStars;
                const canAfford = profile.coins >= item.cost && meetsReq;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                      equipped
                        ? 'bg-zinc-900/95 border-emerald-400/60'
                        : isPreviewing
                        ? 'bg-zinc-900/80 border-zinc-400'
                        : 'bg-zinc-900/50 border-white/6'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-zinc-100">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono-num text-zinc-400 mt-0.5">
                          {unlocked ? '✓ Pendamping Setia' : formatReqBadge(item.cost, item.minLevel, item.minStars)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          uiManager.triggerTactileClick(15);
                          applyTryOnPreview({ pet: item.id }, item.name);
                        }}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 cursor-pointer shrink-0"
                      >
                        👁 Coba
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!unlocked && !canAfford}
                      onClick={() => {
                        uiManager.triggerTactileClick(25);
                        onSelectPet?.(item.id);
                        applyTryOnPreview({ pet: item.id }, item.name);
                      }}
                      className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                        equipped
                          ? 'bg-emerald-400 text-zinc-950'
                          : unlocked
                          ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                          : !meetsReq
                          ? 'bg-zinc-950 text-zinc-500 border border-white/5 cursor-not-allowed'
                          : canAfford
                          ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                          : 'bg-zinc-950 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {equipped
                        ? 'Mendampingi'
                        : unlocked
                        ? 'Ajak Pet'
                        : !meetsLevel
                        ? `Buka di Level ${item.minLevel}`
                        : !meetsStars
                        ? `Butuh ${item.minStars} ★ Bintang`
                        : item.cost === 0
                        ? 'Klaim Spesial (Gratis)'
                        : `Beli 🪙 ${item.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 5: SENJATA / ALAT PERAGA & TEMA WARNA KARAKTER */}
          {activeCategory === 'prop' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-zinc-300 mb-2">
                  Senjata & Alat Peraga Tangan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PROP_WEAPON_ITEMS.map((item) => {
                    const unlocked = unlockedProps.includes(item.id);
                    const equipped = (profile.propWeapon || 'none') === item.id;
                    const isPreviewing = previewState.propWeapon === item.id;
                    const meetsLevel = !item.minLevel || profile.level >= item.minLevel;
                    const meetsStars = !item.minStars || totalStars >= item.minStars;
                    const meetsReq = meetsLevel && meetsStars;
                    const canAfford = profile.coins >= item.cost && meetsReq;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                          equipped
                            ? 'bg-zinc-900/95 border-emerald-400/60'
                            : isPreviewing
                            ? 'bg-zinc-900/80 border-zinc-400'
                            : 'bg-zinc-900/50 border-white/6'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-zinc-100">
                              {item.name}
                            </div>
                            <div className="text-[11px] font-mono-num text-zinc-400 mt-0.5">
                              {unlocked ? '✓ Sudah Dimiliki' : formatReqBadge(item.cost, item.minLevel, item.minStars)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              uiManager.triggerTactileClick(15);
                              applyTryOnPreview({ propWeapon: item.id }, item.name);
                            }}
                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 cursor-pointer shrink-0"
                          >
                            👁 Coba
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={!unlocked && !canAfford}
                          onClick={() => {
                            uiManager.triggerTactileClick(25);
                            onSelectPropWeapon?.(item.id);
                            applyTryOnPreview({ propWeapon: item.id }, item.name);
                          }}
                          className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                            equipped
                              ? 'bg-emerald-400 text-zinc-950'
                              : unlocked
                              ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                              : !meetsReq
                              ? 'bg-zinc-950 text-zinc-500 border border-white/5 cursor-not-allowed'
                              : canAfford
                              ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                              : 'bg-zinc-950 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {equipped
                            ? 'Digenggam'
                            : unlocked
                            ? 'Pegang Alat'
                            : !meetsLevel
                            ? `Buka di Level ${item.minLevel}`
                            : !meetsStars
                            ? `Butuh ${item.minStars} ★ Bintang`
                            : item.cost === 0
                            ? 'Klaim Spesial (Gratis)'
                            : `Beli 🪙 ${item.cost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-zinc-300 mb-2">
                  Tema Warna Karakter
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {THEME_COLOR_ITEMS.map((item) => {
                    const unlocked = unlockedThemes.includes(item.id);
                    const equipped = (profile.themeColor || 'klasik') === item.id;
                    const isPreviewing = previewState.themeColor === item.id;
                    const meetsLevel = !item.minLevel || profile.level >= item.minLevel;
                    const canAfford = profile.coins >= item.cost && meetsLevel;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                          equipped
                            ? 'bg-zinc-900/95 border-emerald-400/60'
                            : isPreviewing
                            ? 'bg-zinc-900/80 border-zinc-400'
                            : 'bg-zinc-900/50 border-white/6'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                              style={{ backgroundColor: item.trimHex }}
                            />
                            <div>
                              <div className="text-sm font-semibold text-zinc-100">
                                {item.name}
                              </div>
                              <div className="text-[11px] font-mono-num text-zinc-400 mt-0.5">
                                {unlocked ? '✓ Sudah Dimiliki' : formatReqBadge(item.cost, item.minLevel)}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              uiManager.triggerTactileClick(15);
                              applyTryOnPreview({ themeColor: item.id }, item.name);
                            }}
                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 cursor-pointer shrink-0"
                          >
                            👁 Coba
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={!unlocked && !canAfford}
                          onClick={() => {
                            uiManager.triggerTactileClick(25);
                            onSelectThemeColor?.(item.id);
                            applyTryOnPreview({ themeColor: item.id }, item.name);
                          }}
                          className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                            equipped
                              ? 'bg-emerald-400 text-zinc-950'
                              : unlocked
                              ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                              : !meetsLevel
                              ? 'bg-zinc-950 text-zinc-500 border border-white/5 cursor-not-allowed'
                              : canAfford
                              ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                              : 'bg-zinc-950 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {equipped
                            ? 'Tema Aktif'
                            : unlocked
                            ? 'Pakai Tema'
                            : !meetsLevel
                            ? `Buka di Level ${item.minLevel}`
                            : item.cost === 0
                            ? 'Klaim Spesial (Gratis)'
                            : `Beli 🪙 ${item.cost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// 3. PILIH DUNIA (5 BIOME WORLD SWITCHER MODAL)
interface BiomeModalProps {
  currentBiome: BiomeId;
  onSelectBiome: (biome: BiomeId) => void;
  onClose: () => void;
}

export const BiomeModal: React.FC<BiomeModalProps> = ({
  currentBiome,
  onSelectBiome,
  onClose
}) => {
  return (
    <div
      role="dialog"
      aria-label="Pilih Dunia 3D"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto"
    >
      <div className="w-full max-w-3xl rounded-2xl glass-modal overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/15 bg-slate-950/60">
          <div>
            <h2 className="text-xl font-bold text-white font-display">
              Pilih Dunia Biom 3D (5 Dunia)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ubah atmosfer langit, pencahayaan, musik prosedural, dan lanskap 3D secara instan
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              uiManager.triggerTactileClick();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-bold cursor-pointer btn-tactile"
          >
            Tutup
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {BIOMES.map((b) => {
            const active = b.id === currentBiome;
            return (
              <div
                key={b.id}
                className={`bento-tile p-4 rounded-2xl flex flex-col justify-between ${
                  active ? 'border-cyan-400 bg-slate-800/90' : ''
                }`}
              >
                <div>
                  <div className="text-xs text-cyan-400 font-semibold">
                    {b.subtitle}
                  </div>
                  <h3 className="text-lg font-bold text-white font-display mt-0.5">
                    {b.name}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {b.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    uiManager.triggerTactileClick(30);
                    onSelectBiome(b.id);
                    onClose();
                  }}
                  className={`mt-4 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer self-start ${
                    active ? 'btn-tactile-amber' : 'btn-tactile-electric'
                  }`}
                >
                  {active ? 'Dunia Aktif' : `Teleport ke ${b.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 4. MODE GURU (TEACHER STUDIO & ZERO-BACKEND SHARE ENGINE `#p=base64`)
interface TeacherModalProps {
  activePack: QuestionPack;
  onApplyPack: (pack: QuestionPack) => void;
  onResetDefault: () => void;
  onOpenStudentMaterial?: () => void;
  onClose: () => void;
}

type TeacherStudioTab = 'visual' | 'materi' | 'ai' | 'share';

export const TeacherModal: React.FC<TeacherModalProps> = ({
  activePack,
  onApplyPack,
  onResetDefault,
  onOpenStudentMaterial,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TeacherStudioTab>('visual');

  // Metadata & Ruang Materi state
  const [packTitle, setPackTitle] = useState(activePack.title);
  const [subject, setSubject] = useState(activePack.subject);
  const [grade, setGrade] = useState(activePack.grade);
  const [author, setAuthor] = useState(
    activePack.author || 'Guru Eduverse 3D'
  );
  const [teacherWhatsapp, setTeacherWhatsapp] = useState(
    activePack.teacherWhatsapp || ''
  );
  const [youtubeUrl, setYoutubeUrl] = useState(activePack.youtubeUrl || '');
  const [materialSummary, setMaterialSummary] = useState(
    activePack.materialSummary || ''
  );

  // Visual Question Editor state (supports both Add New and Edit Existing)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [qSubject, setQSubject] = useState(activePack.subject || 'Matematika');
  const [newQ, setNewQ] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [ansIdx, setAnsIdx] = useState(0);
  const [expl, setExpl] = useState('');

  // AI Prompt Generator & JSON Schema Validator state
  const [aiTopic, setAiTopic] = useState(
    'Pecahan, Persentase, Bangun Ruang & Logika Sains'
  );
  const [aiQuestionCount, setAiQuestionCount] = useState(20);
  const [jsonInput, setJsonInput] = useState(() =>
    JSON.stringify(activePack, null, 2)
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const buildCurrentPackSnapshot = (
    overrideQuestions?: QuestionItem[]
  ): QuestionPack => ({
    ...activePack,
    title: packTitle.trim() || 'Paket Soal Guru Eduverse',
    subject: subject.trim() || 'Semua Mata Pelajaran',
    grade: grade.trim() || 'SMP (Kelas 7-9)',
    author: author.trim() || 'Guru Eduverse 3D',
    teacherWhatsapp: teacherWhatsapp.trim(),
    youtubeUrl: youtubeUrl.trim(),
    materialSummary: materialSummary.trim(),
    questions: overrideQuestions || activePack.questions
  });

  const currentPackSnapshot = buildCurrentPackSnapshot();
  const encodedHash = encodeQuestionPackToHash(currentPackSnapshot);
  const shareUrl = `${window.location.origin}${window.location.pathname}${encodedHash}`;

  const aiPromptTemplate = generateGeminiTeacherPrompt({
    title: packTitle || `Paket Soal ${subject}`,
    subject: subject || 'Matematika',
    grade: grade || 'SMP (Kelas 7-9)',
    topic: aiTopic,
    count: aiQuestionCount,
    youtubeUrl,
    materialSummary
  });

  const youtubeVideoId = extractYoutubeVideoId(youtubeUrl);
  const letters = ['A', 'B', 'C', 'D'];

  const syncAndApplyPack = (updated: QuestionPack, msg: string) => {
    onApplyPack(updated);
    setJsonInput(JSON.stringify(updated, null, 2));
    setValidationErrors([]);
    setStatusMsg(msg);
  };

  const handleSaveMetadataAndMaterial = () => {
    const updated = buildCurrentPackSnapshot();
    syncAndApplyPack(
      updated,
      `Metadata Paket Soal & Ruang Materi ("${updated.title}") berhasil disimpan ke seluruh gedung 3D dan 20 mini-game!`
    );
  };

  const handleSaveQuestionItem = () => {
    if (
      !newQ.trim() ||
      !optA.trim() ||
      !optB.trim() ||
      !optC.trim() ||
      !optD.trim()
    ) {
      setStatusMsg(
        'Mohon lengkapi teks pertanyaan dan keempat pilihan jawaban A, B, C, dan D.'
      );
      return;
    }

    const item: QuestionItem = {
      id:
        editingIndex !== null && activePack.questions[editingIndex]
          ? activePack.questions[editingIndex].id
          : `guru-${Date.now()}`,
      subject: qSubject.trim() || subject.trim() || 'Umum',
      q: newQ.trim(),
      options: [optA.trim(), optB.trim(), optC.trim(), optD.trim()],
      answerIndex: ansIdx,
      explanation: expl.trim() || 'Sesuai pembahasan materi guru.'
    };

    const nextQuestions = [...activePack.questions];
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < nextQuestions.length) {
      nextQuestions[editingIndex] = item;
    } else {
      nextQuestions.unshift(item);
    }

    const updated = buildCurrentPackSnapshot(nextQuestions);
    syncAndApplyPack(
      updated,
      editingIndex !== null
        ? `Soal #${editingIndex + 1} berhasil diperbarui!`
        : `Soal baru berhasil ditambahkan! Total: ${nextQuestions.length} soal aktif.`
    );

    setEditingIndex(null);
    setNewQ('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setExpl('');
  };

  const handleStartEditQuestion = (idx: number) => {
    const q = activePack.questions[idx];
    if (!q) return;
    setEditingIndex(idx);
    setQSubject(q.subject);
    setNewQ(q.q);
    setOptA(q.options[0]);
    setOptB(q.options[1]);
    setOptC(q.options[2]);
    setOptD(q.options[3]);
    setAnsIdx(q.answerIndex);
    setExpl(q.explanation);
    setStatusMsg(`Mengedit Soal #${idx + 1}. Ubah form di atas lalu klik Simpan Perubahan.`);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (activePack.questions.length <= 1) {
      setStatusMsg('Paket soal wajib menyisakan minimal 1 soal aktif.');
      return;
    }
    const nextQuestions = activePack.questions.filter((_, i) => i !== idx);
    const updated = buildCurrentPackSnapshot(nextQuestions);
    if (editingIndex === idx) {
      setEditingIndex(null);
    }
    syncAndApplyPack(
      updated,
      `Soal #${idx + 1} dihapus. Tersisa ${nextQuestions.length} soal aktif.`
    );
  };

  const handleValidateAndApplyJson = (rawText: string) => {
    const result = validateQuestionPackJson(rawText, {
      title: packTitle,
      subject,
      grade,
      author,
      youtubeUrl,
      materialSummary,
      teacherWhatsapp
    });

    if (!result.valid || !result.pack) {
      setValidationErrors(result.errors);
      setStatusMsg('Validasi Schema JSON gagal. Periksa daftar kesalahan di bawah.');
      return;
    }

    setPackTitle(result.pack.title);
    setSubject(result.pack.subject);
    setGrade(result.pack.grade);
    setAuthor(result.pack.author || 'Guru Eduverse 3D');
    setYoutubeUrl(result.pack.youtubeUrl || '');
    setMaterialSummary(result.pack.materialSummary || '');
    setTeacherWhatsapp(result.pack.teacherWhatsapp || '');

    const warnNote =
      result.warnings.length > 0 ? ` (${result.warnings.join(' ')})` : '';
    syncAndApplyPack(
      result.pack,
      `Validasi Schema JSON Sukses! Paket "${result.pack.title}" (${result.pack.questions.length} soal) aktif di seluruh 20 mini-game.${warnNote}`
    );
  };

  const handleOneClickPasteJsonFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        setStatusMsg(
          'Clipboard kosong atau izin baca belum diberikan. Tempelkan JSON langsung pada kotak di bawah lalu klik Validasi & Terapkan.'
        );
        return;
      }
      setJsonInput(clipText);
      handleValidateAndApplyJson(clipText);
    } catch {
      setStatusMsg(
        'Tempelkan hasil JSON dari Gemini pada kotak editor di bawah lalu klik Validasi & Terapkan JSON (1-Klik).'
      );
    }
  };

  const waShareClassText = [
    `*TUGAS GAME EDUKASI — EDUZONE*`,
    `Mapel: *${currentPackSnapshot.subject}* (${currentPackSnapshot.grade})`,
    `Judul: *${currentPackSnapshot.title}* (${currentPackSnapshot.questions.length} Soal)`,
    `Guru: ${currentPackSnapshot.author || 'Guru EDUZONE'}`,
    ``,
    `Klik link berikut untuk langsung belajar di Ruang Materi & bermain 20 Mini-Game EDUZONE:`,
    shareUrl
  ].join('\n');

  const waShareClassUrl = `https://wa.me/?text=${encodeURIComponent(
    waShareClassText
  )}`;

  return (
    <div
      role="dialog"
      aria-label="Mode Guru Teacher Studio dan Share Engine"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-950/88 pointer-events-auto"
    >
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[11px] font-bold text-cyan-300 font-mono-num">
                TEACHER STUDIO
              </span>
              <span className="text-xs text-amber-300 font-mono-num">
                {activePack.questions.length} Soal Aktif · {activePack.subject} ({activePack.grade})
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display mt-1">
              Mode Guru — Visual Editor, Ruang Materi, AI Prompt & Zero-Server Share (#p=)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onOpenStudentMaterial && (
              <button
                type="button"
                onClick={onOpenStudentMaterial}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                Pratinjau Ruang Materi Murid
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Tutup [Esc]
            </button>
          </div>
        </div>

        {/* 4 Studio Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              activeTab === 'visual'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            1. Visual Question Editor ({activePack.questions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('materi')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              activeTab === 'materi'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            2. Ruang Materi & Video YouTube
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              activeTab === 'ai'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            3. AI Prompt Gemini (20 Soal) & Impor JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              activeTab === 'share'
                ? 'bg-fuchsia-500 text-slate-950'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            4. Share Link Tanpa Server (#p=) & WA
          </button>
        </div>

        {/* Main Studio Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {statusMsg && (
            <div
              role="status"
              className="p-3 rounded-xl bg-slate-950 border border-amber-500/70 text-xs text-amber-200 font-semibold flex items-center justify-between gap-2"
            >
              <span>{statusMsg}</span>
              <button
                type="button"
                onClick={() => setStatusMsg(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: VISUAL QUESTION EDITOR */}
          {activeTab === 'visual' && (
            <div className="space-y-5">
              {/* Pack Identity & Grade Selector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Identitas Paket Soal (Nama Mapel, Jenjang SD/SMP/SMA & Info Guru)
                  </h3>
                  <button
                    type="button"
                    onClick={handleSaveMetadataAndMaterial}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Simpan Identitas Paket
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Judul Paket Soal
                    </label>
                    <input
                      type="text"
                      value={packTitle}
                      onChange={(e) => setPackTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nama Mata Pelajaran
                    </label>
                    <input
                      type="text"
                      list="subject-presets"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                    <datalist id="subject-presets">
                      {SUBJECT_PRESET_OPTIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Jenjang Kelas (SD / SMP / SMA)
                    </label>
                    <select
                      aria-label="Jenjang Kelas"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      {SCHOOL_GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      No. WhatsApp Guru (Rekap Nilai)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 081234567890"
                      value={teacherWhatsapp}
                      onChange={(e) => setTeacherWhatsapp(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono-num"
                    />
                  </div>
                </div>
              </div>

              {/* Add / Edit Single Question Form */}
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-amber-300">
                    {editingIndex !== null
                      ? `Edit Soal #${editingIndex + 1}`
                      : 'Tambah Soal Baru ke Daftar Soal'}
                  </h3>
                  {editingIndex !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(null);
                        setNewQ('');
                        setOptA('');
                        setOptB('');
                        setOptC('');
                        setOptD('');
                        setExpl('');
                      }}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-slate-400 mb-1">
                      Teks Pertanyaan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sebuah kubus memiliki rusuk 6 cm. Berapakah volumenya?"
                      value={newQ}
                      onChange={(e) => setNewQ(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Tag Gedung Mapel 3D
                    </label>
                    <select
                      value={qSubject}
                      onChange={(e) => setQSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      {SUBJECT_PRESET_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Opsi Jawaban A"
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Opsi Jawaban B"
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Opsi Jawaban C"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Opsi Jawaban D"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs text-slate-300 font-semibold">
                    Kunci Jawaban:
                    <select
                      aria-label="Kunci Jawaban"
                      value={ansIdx}
                      onChange={(e) => setAnsIdx(Number(e.target.value))}
                      className="ml-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-300 font-bold"
                    >
                      <option value={0}>Opsi A</option>
                      <option value={1}>Opsi B</option>
                      <option value={2}>Opsi C</option>
                      <option value={3}>Opsi D</option>
                    </select>
                  </label>
                  <input
                    type="text"
                    placeholder="Pembahasan singkat (ditampilkan saat murid menjawab)..."
                    value={expl}
                    onChange={(e) => setExpl(e.target.value)}
                    className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveQuestionItem}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    {editingIndex !== null
                      ? 'Simpan Perubahan Soal'
                      : '+ Tambah ke Daftar Soal'}
                  </button>
                </div>
              </div>

              {/* Interactive Question List */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    Daftar Soal Aktif ({activePack.questions.length} Soal)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      onResetDefault();
                      setPackTitle(DEFAULT_QUESTION_PACK.title);
                      setSubject(DEFAULT_QUESTION_PACK.subject);
                      setGrade(DEFAULT_QUESTION_PACK.grade);
                      setYoutubeUrl(DEFAULT_QUESTION_PACK.youtubeUrl || '');
                      setMaterialSummary(
                        DEFAULT_QUESTION_PACK.materialSummary || ''
                      );
                      setJsonInput(
                        JSON.stringify(DEFAULT_QUESTION_PACK, null, 2)
                      );
                      setStatusMsg(
                        'Dikembalikan ke 36 Soal Kurikulum Nasional Bawaan.'
                      );
                    }}
                    className="text-xs text-amber-400 hover:underline cursor-pointer"
                  >
                    Reset ke 36 Soal Bawaan
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {activePack.questions.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-start justify-between gap-2"
                    >
                      <div className="space-y-1 flex-1 min-w-[240px]">
                        <div className="flex items-center gap-2 text-[11px] font-mono-num">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">
                            #{idx + 1} · {item.subject}
                          </span>
                          <span className="text-emerald-400 font-bold">
                            Kunci: {letters[item.answerIndex]} (
                            {item.options[item.answerIndex]})
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white">{item.q}</p>
                        <p className="text-[11px] text-slate-400">
                          Pembahasan: {item.explanation}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditQuestion(idx)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(idx)}
                          className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-xs text-rose-300 font-semibold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RUANG MATERI & VIDEO YOUTUBE */}
          {activeTab === 'materi' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-300">
                      Ruang Materi Pembelajaran (Link Video YouTube & Ringkasan Materi)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Materi ini disertakan ke dalam link #p= dan dapat dibuka murid melalui tombol "Ruang Materi" sebelum atau saat bermain
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveMetadataAndMaterial}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Simpan Ruang Materi
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Link Video Pembelajaran YouTube (Format watch?v= atau youtu.be/)
                  </label>
                  <input
                    type="url"
                    placeholder="Contoh: https://www.youtube.com/watch?v=rfscVS0vtbw"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-cyan-300 font-mono-num"
                  />
                  {youtubeUrl && !youtubeVideoId && (
                    <p className="text-[11px] text-amber-400 mt-1">
                      Masukkan URL YouTube yang valid (misal https://youtu.be/dQw4w9WgXcQ) untuk menampilkan pemutar video.
                    </p>
                  )}
                </div>

                {youtubeVideoId && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-64 mx-auto">
                    <iframe
                      title="Pratinjau Video Pembelajaran YouTube"
                      src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ringkasan Materi / Rumus Penting untuk Murid
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Tuliskan ringkasan materi, rumus inti, atau poin penting yang perlu dipelajari murid sebelum menyelesaikan misi 3D..."
                    value={materialSummary}
                    onChange={(e) => setMaterialSummary(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI PROMPT GENERATOR (COPY-TO-GEMINI) & 1-CLICK JSON SCHEMA VALIDATOR */}
          {activeTab === 'ai' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Copy-to-Gemini Prompt Builder */}
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3">
                <h3 className="text-sm font-bold text-cyan-300">
                  Langkah 1: Generator Prompt AI (Copy-to-Gemini)
                </h3>
                <p className="text-xs text-slate-400">
                  Pilih topik dan jenjang kelas, klik "Salin Prompt AI", lalu tempelkan ke Google Gemini untuk membuat {aiQuestionCount} soal JSON otomatis:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Topik Spesifik Soal
                    </label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="Misal: Sistem Tata Surya & Hukum Newton"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Jumlah Soal
                    </label>
                    <select
                      value={aiQuestionCount}
                      onChange={(e) =>
                        setAiQuestionCount(Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono-num"
                    >
                      <option value={10}>10 Soal JSON</option>
                      <option value={20}>20 Soal JSON</option>
                      <option value={30}>30 Soal JSON</option>
                    </select>
                  </div>
                </div>

                <textarea
                  readOnly
                  rows={8}
                  value={aiPromptTemplate}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-200 font-mono-num"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(aiPromptTemplate);
                      setStatusMsg(
                        `Prompt AI (${aiQuestionCount} Soal ${subject} - ${grade}) berhasil disalin! Tempelkan ke Gemini, lalu salin hasil JSON-nya ke Langkah 2.`
                      );
                    }}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Salin Prompt AI ({aiQuestionCount} Soal JSON)
                  </button>
                </div>
              </div>

              {/* Right: 1-Click Paste & Automatic JSON Schema Validator */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-emerald-300">
                    Langkah 2: Impor JSON 1-Klik & Validasi Schema Otomatis
                  </h3>
                  <button
                    type="button"
                    onClick={handleOneClickPasteJsonFromClipboard}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Tempel & Terapkan dari Clipboard (1-Klik)
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Tempel hasil JSON dari Gemini di bawah (blok ```json otomatis dibersihkan & divalidasi):
                </p>

                <textarea
                  rows={8}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-emerald-300 font-mono-num"
                />

                {validationErrors.length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-950/90 border border-rose-500/70 space-y-1">
                    <div className="text-xs font-bold text-rose-300">
                      Detail Kesalahan Schema JSON:
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-rose-200 space-y-0.5">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleValidateAndApplyJson(jsonInput)}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Validasi Schema & Terapkan JSON Soal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ZERO-SERVER SHAREABLE URL (#p=base64) & WHATSAPP SHARE */}
          {activeTab === 'share' && (
            <div className="p-5 rounded-xl bg-slate-950 border border-fuchsia-500/40 space-y-4">
              <div>
                <h3 className="text-base font-bold text-fuchsia-300">
                  Zero-Server Shareable URL (#p=Base64) — Tanpa Database Eksternal
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Seluruh paket soal ({currentPackSnapshot.questions.length} soal), identitas kelas ({currentPackSnapshot.subject} · {currentPackSnapshot.grade}), beserta Ruang Materi YouTube dikompresi langsung ke dalam URL Hash di bawah ini. Saat murid membuka tautan ini dari WhatsApp, seluruh gedung di Kota 3D dan ke-20 mini-game otomatis memuat soal dari guru!
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 font-mono-num">
                  Link Paket Soal Mandiri ({encodedHash.length} karakter terkompresi):
                </label>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-cyan-300 font-mono-num"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onApplyPack(currentPackSnapshot);
                    window.location.hash = encodedHash;
                    navigator.clipboard?.writeText(shareUrl);
                    setStatusMsg(
                      'Link #p= berhasil disalin ke clipboard dan diaktifkan pada URL browser!'
                    );
                  }}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Salin & Aktifkan Link #p=
                </button>

                <a
                  href={waShareClassUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    onApplyPack(currentPackSnapshot);
                    window.location.hash = encodedHash;
                    navigator.clipboard?.writeText(waShareClassText);
                    setStatusMsg(
                      'Undangan Tugas WhatsApp beserta Link #p= berhasil disalin!'
                    );
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Bagikan Link Tugas ke WhatsApp Kelas</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 5. RUANG MATERI & VIDEO GURU MODAL (STUDENT STUDY ROOM)
interface StudentMaterialModalProps {
  pack: QuestionPack;
  onClose: () => void;
}

export const StudentMaterialModal: React.FC<StudentMaterialModalProps> = ({
  pack,
  onClose
}) => {
  const videoId = extractYoutubeVideoId(pack.youtubeUrl);

  return (
    <div
      role="dialog"
      aria-label="Ruang Materi dan Video Pembelajaran Guru"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/88 pointer-events-auto"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-emerald-500/60 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <div className="text-xs font-bold text-emerald-400 font-mono-num">
              RUANG MATERI GURU · {pack.subject.toUpperCase()} ({pack.grade})
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display mt-0.5">
              {pack.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Tutup & Lanjut Bermain
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {videoId ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold text-cyan-300">
                  Video Pembelajaran YouTube:
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300 hover:underline font-mono-num"
                >
                  Buka di YouTube ↗
                </a>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video">
                <iframe
                  title="Video Materi Pembelajaran"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
              Belum ada tautan video YouTube pada paket soal ini. Guru dapat menambahkannya melalui tombol "Mode Guru" → tab "Ruang Materi & Video YouTube".
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="text-sm font-bold text-amber-300">
              Ringkasan Materi & Konsep Inti ({pack.questions.length} Soal di Dunia 3D)
            </h3>
            <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
              {pack.materialSummary ||
                'Pelajari setiap petunjuk pada gedung mata pelajaran dan 20 mini-game untuk menaklukkan tantangan.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

