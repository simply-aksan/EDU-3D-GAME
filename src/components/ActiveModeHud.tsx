import React from 'react';
import {
  DETECTIVE_CASES,
  PlayableGameId,
  QuestionItem
} from '../game/questions';
import {
  BOSS_PILLAR_SPECS,
  CHEM_TUBE_SPECS,
  CONVEYOR_CHUTE_SPECS,
  GOALIE_ZONE_SPECS,
  PASAR_CHALLENGES,
  PINISI_ISLAND_COORDS,
  PRISM_MONUMENT_SPECS,
  RobotCommandType
} from '../game/rules';

interface ActiveModeHudProps {
  mode: PlayableGameId;
  activeSlotTitle: string;
  currentQuestion: QuestionItem;
  streak: number;
  lives: number;
  feedbackBanner: { isCorrect: boolean; text: string } | null;

  // Jelajah Dunia Building / NPC quiz modal
  hubQuizModal: {
    open: boolean;
    title: string;
    subject: string;
  } | null;
  onCloseHubQuiz: () => void;
  onAnswerHubQuiz: (optionIdx: number) => void;

  // Lari Kilat Runner
  runnerStats: {
    distance: number;
    coins: number;
    lives: number;
    gooseDistance: number;
    activePowerUp: string | null;
  };
  onRunnerShiftLane: (dir: -1 | 1) => void;
  onRunnerJump: () => void;

  // Jatuh Bangun Tower
  towerFloor: number;
  onAnswerTower: (optionIdx: number) => void;

  // Detektif Kota Ilmu
  unlockedClues: number[];
  activeTkpId: number | null;
  onSelectTkp: (tkpId: number) => void;
  onAnswerTkpQuestion: (optionIdx: number) => void;
  onSolveMysteryCulprit: (culpritIdx: number) => void;

  // Pasar Nusantara
  pasarCustomerIdx: number;
  pasarServedCount: number;
  onAnswerPasarOrder: (optionIdx: number) => void;

  // Jembatan Juara
  bridgeStep: number;
  onAnswerBridgeStep: (optionIdx: number) => void;

  // Game #7: Pertahanan Kastil (Arsena Sains)
  castleStats: {
    castleHp: number;
    monstersDefeated: number;
  };
  onAnswerCastleDefense: (optionIdx: number) => void;

  // Game #8: Balap Roket Galaksi
  rocketStats: {
    ringsPassed: number;
    shieldLives: number;
  };
  onAnswerRocketRing: (optionIdx: number) => void;

  // Game #9: Arsitek Menara
  architectStats: {
    floors: number;
    stability: number;
  };
  onAnswerArchitectBlock: (optionIdx: number) => void;

  // Game #10: Labirin Minotaur
  mazeGatesUnlocked: number;
  onAnswerMazeGate: (optionIdx: number) => void;

  // Game #11: Panahan Katapel Fisika
  catapultHits: number;
  onAimCatapult: (optionIdx: number) => void;
  onAnswerCatapultShot: (optionIdx: number) => void;

  // Game #12: Sirkuit Logika (Robot Coder 3D)
  robotQueue: RobotCommandType[];
  robotSolvedCount: number;
  onEnqueueRobotCmd: (cmd: RobotCommandType) => void;
  onLoadRobotPresetStation: (stationIdx: number) => void;
  onClearRobotQueue: () => void;
  onRunRobotProgram: () => void;

  // Game #13: Selam Samudra (Submarine Sonar 3D)
  submarineStats: {
    chestsOpened: number;
    oxygenLives: number;
  };
  onAnswerSubmarineChest: (chestIdx: number) => void;

  // Game #14: Koki Kimia (Lab Eksperimen 3D)
  chemStats: {
    synthesizedCount: number;
    labLives: number;
  };
  onAnswerChemTube: (tubeIdx: number) => void;

  // Game #15: Ekspedisi Pinisi (Peta Nusantara 3D)
  pinisiStats: {
    islandsVisited: number;
    hullLives: number;
    windTimeLeft: number;
  };
  onAnswerPinisiIsland: (islandIdx: number) => void;

  // Game #16: Penjaga Gawang Pintar (3D Goalie Reflex)
  goalieStats: {
    saves: number;
    conceded: number;
    shotCountdown: number;
  };
  onAnswerGoalieZone: (zoneIdx: number) => void;

  // Game #17: Pabrik Sortir (3D Conveyor Belt Sorter)
  sorterStats: {
    sortedCount: number;
    alarmsCount: number;
  };
  onAnswerConveyorChute: (chuteIdx: number) => void;

  // Game #18: Tebak Bangun & Bayangan (3D Prism & Laser Caster)
  prismStats: {
    portalsOpened: number;
    shieldLives: number;
    aimedIndex: number;
  };
  onAimPrismMonument: (monumentIdx: number) => void;
  onFirePrismLaser: () => void;

  // Game #19: Tarik Tambang Juara (3D Versus Tug-of-War)
  tugStats: {
    ropeOffset: number;
    pullsCount: number;
  };
  onAnswerTugOfWar: (optionIdx: number) => void;

  // Game #20: Arena Boss Akhir (Raksasa Ilmu 3D)
  bossStats: {
    bossHp: number;
    playerHp: number;
    comboCount: number;
  };
  onAnswerBossPillar: (pillarIdx: number) => void;
}

const CMD_LABEL: Record<RobotCommandType, string> = {
  maju: 'Maju',
  kiri: 'Belok Kiri',
  kanan: 'Belok Kanan',
  lompat: 'Lompat Laser'
};

export const ActiveModeHud: React.FC<ActiveModeHudProps> = ({
  mode,
  currentQuestion,
  streak,
  lives,
  feedbackBanner,
  hubQuizModal,
  onCloseHubQuiz,
  onAnswerHubQuiz,
  runnerStats,
  onRunnerShiftLane,
  onRunnerJump,
  towerFloor,
  onAnswerTower,
  unlockedClues,
  activeTkpId,
  onSelectTkp,
  onAnswerTkpQuestion,
  onSolveMysteryCulprit,
  pasarCustomerIdx,
  pasarServedCount,
  onAnswerPasarOrder,
  bridgeStep,
  onAnswerBridgeStep,
  castleStats,
  onAnswerCastleDefense,
  rocketStats,
  onAnswerRocketRing,
  architectStats,
  onAnswerArchitectBlock,
  mazeGatesUnlocked,
  onAnswerMazeGate,
  catapultHits,
  onAimCatapult,
  onAnswerCatapultShot,
  robotQueue,
  robotSolvedCount,
  onEnqueueRobotCmd,
  onLoadRobotPresetStation,
  onClearRobotQueue,
  onRunRobotProgram,
  submarineStats,
  onAnswerSubmarineChest,
  chemStats,
  onAnswerChemTube,
  pinisiStats,
  onAnswerPinisiIsland,
  goalieStats,
  onAnswerGoalieZone,
  sorterStats,
  onAnswerConveyorChute,
  prismStats,
  onAimPrismMonument,
  onFirePrismLaser,
  tugStats,
  onAnswerTugOfWar,
  bossStats,
  onAnswerBossPillar
}) => {
  const letters = ['A', 'B', 'C', 'D'];
  const detectiveCase = DETECTIVE_CASES[0];
  const currentPasar =
    PASAR_CHALLENGES[pasarCustomerIdx % PASAR_CHALLENGES.length];

  return (
    <>
      {/* Feedback Toast Banner */}
      {feedbackBanner && (
        <div
          role="status"
          className={`fixed bottom-44 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold shadow-xl pointer-events-none max-w-xl text-center ${
            feedbackBanner.isCorrect
              ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200'
              : 'bg-rose-950/95 border-rose-400 text-rose-200'
          }`}
        >
          {feedbackBanner.text}
        </div>
      )}

      {/* MODE 1: JELAJAH DUNIA BUILDING / NPC QUIZ DIALOG */}
      {mode === 'jelajah_dunia' && hubQuizModal?.open && (
        <div
          role="dialog"
          aria-label={hubQuizModal.title}
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75 pointer-events-auto"
        >
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-amber-500/60 p-6 shadow-2xl">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2 font-mono-num">
              <span>
                {hubQuizModal.title} · Mapel {currentQuestion.subject}
              </span>
              <span>
                Nyawa: {lives}/3 · Combo: {streak}×
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white leading-snug mb-4">
              {currentQuestion.q}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerHubQuiz(idx)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-left text-xs sm:text-sm text-white font-semibold cursor-pointer transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onCloseHubQuiz}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold cursor-pointer"
              >
                Keluar Gedung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: LARI KILAT (4-LANE ENDLESS RUNNER COMPACT HUD) */}
      {mode === 'lari_kilat' && (
        <div className="fixed top-28 xl:top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-3xl px-3 pointer-events-none">
          <div className="p-3.5 rounded-xl bg-slate-950/92 border border-cyan-500/50 shadow-xl pointer-events-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 mb-1.5 font-mono-num">
              <span>
                Jarak: {runnerStats.distance} m · Koin Lari: {runnerStats.coins}
              </span>
              <span className="text-amber-300">
                Angsa Raksasa: {runnerStats.gooseDistance} m di belakang!
              </span>
              <span>
                Nyawa: {runnerStats.lives}/3
                {runnerStats.activePowerUp
                  ? ` · Power-Up: ${runnerStats.activePowerUp.toUpperCase()}`
                  : ''}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white mb-2">
              Target Gerbang: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 truncate"
                >
                  <strong className="text-amber-400 mr-1.5">
                    Lajur {letters[idx]}:
                  </strong>
                  {opt}
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onRunnerShiftLane(-1)}
                className="px-3.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
              >
                ← Geser Kiri [A]
              </button>
              <button
                type="button"
                onClick={onRunnerJump}
                className="px-4 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-slate-950 cursor-pointer"
              >
                Lompat Rintangan [Spasi]
              </button>
              <button
                type="button"
                onClick={() => onRunnerShiftLane(1)}
                className="px-3.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
              >
                Geser Kanan [D] →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: JATUH BANGUN (3D HEXAGONAL TOWER SURVIVAL) */}
      {mode === 'jatuh_bangun' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-md pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-pink-500/50 shadow-xl">
            <div className="flex items-center justify-between text-xs text-pink-300 font-mono-num mb-1.5">
              <span>MENARA HEXA · LANTAI {towerFloor} / 4</span>
              <span>Combo {streak}×</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white mb-3">
              {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerTower(idx)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-pink-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-pink-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: DETEKTIF KOTA ILMU (3D 4-TKP MYSTERY INVESTIGATION) */}
      {mode === 'detektif_kota' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-violet-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-violet-300 font-mono-num">
              <span>KASUS: {detectiveCase.title}</span>
              <span>Bukti: {unlockedClues.length}/4</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {detectiveCase.summary}
            </p>

            {/* 4 TKP Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {detectiveCase.tkpList.map((tkp) => {
                const isSolved = unlockedClues.includes(tkp.id);
                const isSelected = activeTkpId === tkp.id;
                return (
                  <button
                    key={tkp.id}
                    type="button"
                    onClick={() => onSelectTkp(tkp.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                      isSolved
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300'
                        : isSelected
                        ? 'bg-violet-600 border-violet-300 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-violet-400'
                    }`}
                  >
                    TKP #{tkp.id} {isSolved ? '✓' : ''}
                  </button>
                );
              })}
            </div>

            {/* Active TKP Forensic Question or Clue */}
            {activeTkpId !== null && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-2">
                {(() => {
                  const tkpObj = detectiveCase.tkpList.find(
                    (t) => t.id === activeTkpId
                  )!;
                  const solved = unlockedClues.includes(tkpObj.id);
                  return (
                    <>
                      <div className="text-xs font-bold text-amber-300">
                        {tkpObj.name} · Saksi: {tkpObj.witness}
                      </div>
                      <p className="text-xs text-slate-200 italic">
                        "{tkpObj.testimony}"
                      </p>
                      {solved ? (
                        <div className="p-2 rounded bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-300 font-semibold">
                          {tkpObj.clueFound}
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <div className="text-xs font-bold text-white">
                            Uji Forensik: {currentQuestion.q}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {currentQuestion.options.map((opt, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => onAnswerTkpQuestion(idx)}
                                className="px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-left text-xs text-white font-medium cursor-pointer"
                              >
                                <strong className="text-violet-400 mr-1.5">
                                  {letters[idx]}.
                                </strong>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Final Arrest Panel once at least 2 clues are unlocked */}
            {unlockedClues.length >= 2 && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/60 space-y-2">
                <div className="text-xs font-bold text-amber-300">
                  Tangkap Pelaku Utama Berdasarkan Bukti TKP:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {detectiveCase.culpritOptions.map((suspect, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSolveMysteryCulprit(idx)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs text-left cursor-pointer"
                    >
                      Tangkap: {suspect}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 5: PASAR NUSANTARA (3D SHOPKEEPER & VISUAL MATH SIM) */}
      {mode === 'pasar_nusantara' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-emerald-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-mono-num">
              <span>
                WARUNG NUSANTARA · Pembeli {pasarServedCount + 1} / 5
              </span>
              <span>{currentPasar.badgeLabel}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-amber-300 font-mono-num">
              Visual Meja Warung: {currentPasar.visualDetail}
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              {currentPasar.customerName}: "{currentPasar.prompt}"
            </p>
            <div className="grid grid-cols-2 gap-2">
              {currentPasar.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerPasarOrder(idx)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-400 text-left text-xs sm:text-sm text-white font-bold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 6: JEMBATAN JUARA (3D ISLAND GLASS BRIDGE A/B/C/D) */}
      {mode === 'jembatan_juara' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-orange-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-orange-300 font-mono-num">
              <span>JEMBATAN KACA · LANGKAH {bridgeStep + 1} / 6</span>
              <span>Nyawa Panel: {lives}/3</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              {currentQuestion.q}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerBridgeStep(idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-orange-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-orange-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 7: PERTAHANAN KASTIL (ARSENA SAINS — 3D TOWER DEFENSE) */}
      {mode === 'pertahanan_kastil' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-sky-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-sky-300 font-mono-num">
              <span>BENTENG ARSENA SAINS · HP: {castleStats.castleHp}%</span>
              <span>Monster Tumbang: {castleStats.monstersDefeated} / 5</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Amunisi Meriam Partikel: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerCastleDefense(idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-sky-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 8: BALAP ROKET GALAKSI (3D SPACE FLIGHT RING SELECTOR) */}
      {mode === 'balap_roket' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-indigo-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-mono-num">
              <span>CINCIN GALAKSI: {rocketStats.ringsPassed} / 5</span>
              <span>Perisai Roket: {rocketStats.shieldLives}/3</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Arahkan Roket ke Cincin Jawaban: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerRocketRing(idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 9: ARSITEK MENARA (3D PRECISION BLOCK STACKER) */}
      {mode === 'arsitek_menara' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-amber-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-amber-300 font-mono-num">
              <span>LANTAI TERSUSUN: {architectStats.floors} / 6</span>
              <span>Stabilitas Struktur: {architectStats.stability}%</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Kalibrasi Derek Lantai: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerArchitectBlock(idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 10: LABIRIN MINOTAUR (3D PROCEDURAL MAZE WITH INTERSECTION GATES) */}
      {mode === 'labirin_minotaur' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-teal-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-teal-300 font-mono-num">
              <span>GERBANG PERSIMPANGAN: {mazeGatesUnlocked} / 4</span>
              <span>Nyawa: {lives}/3</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Sandi Buka Gerbang Labirin #{Math.min(4, mazeGatesUnlocked + 1)}: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerMazeGate(idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-teal-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-teal-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 11: PANAHAN KATAPEL FISIKA (3D PARABOLIC TRAJECTORY SLINGSHOT) */}
      {mode === 'panahan_katapel' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-rose-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-rose-300 font-mono-num">
              <span>TARGET KATAPEL FISIKA: {catapultHits} / 5</span>
              <span>Lintasan Parabola Aktif</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Bidik Papan Target A/B/C/D: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseEnter={() => onAimCatapult(idx)}
                  onFocus={() => onAimCatapult(idx)}
                  onClick={() => onAnswerCatapultShot(idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-rose-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-rose-500 text-white font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 12: SIRKUIT LOGIKA (ROBOT CODER 3D — 6x6 ISOMETRIC GRID PUZZLE) */}
      {mode === 'sirkuit_logika' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-cyan-500/60 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs text-cyan-300 font-mono-num">
              <span>ROBOT CODER 6×6 · STASIUN BATERAI: {robotSolvedCount} / 5</span>
              <span>Nyawa Sirkuit: {lives}/3</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Program Robot ke Stasiun Jawaban: {currentQuestion.q}
            </p>

            {/* 4 Battery Station Option Labels + Quick Route Builder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onLoadRobotPresetStation(idx)}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded bg-cyan-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                      {letters[idx]}
                    </span>
                    <span className="truncate">{opt}</span>
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono-num shrink-0">
                    Rute {letters[idx]}
                  </span>
                </button>
              ))}
            </div>

            {/* Step-by-Step Command Queue Builder */}
            <div className="pt-1 border-t border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  ['maju', 'kiri', 'kanan', 'lompat'] as RobotCommandType[]
                ).map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => onEnqueueRobotCmd(cmd)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-cyan-200 cursor-pointer"
                  >
                    + {CMD_LABEL[cmd]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onClearRobotQueue}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono-num text-amber-300 min-h-[32px] flex flex-wrap items-center gap-1">
                {robotQueue.length === 0 ? (
                  <span className="text-slate-400">
                    Antrean kosong — klik tombol perintah atau klik Rute Stasiun A/B/C/D
                  </span>
                ) : (
                  robotQueue.map((c, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-cyan-200"
                    >
                      {i + 1}.{CMD_LABEL[c]}
                    </span>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={onRunRobotProgram}
                className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide cursor-pointer shadow-lg"
              >
                JALANKAN PROGRAM ({robotQueue.length} Langkah)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 13: SELAM SAMUDRA (SUBMARINE SONAR 3D) */}
      {mode === 'selam_samudra' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-sky-500/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-sky-300 font-mono-num">
              <span>SONAR KAPAL SELAM · PETI HARTA: {submarineStats.chestsOpened} / 5</span>
              <span>Oksigen: {submarineStats.oxygenLives}/3</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Kemudikan Kapal Selam [WASD] atau Pilih Peti Harta: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerSubmarineChest(idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>Peti {letters[idx]}: {opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 14: KOKI KIMIA (LAB EKSPERIMEN 3D) */}
      {mode === 'koki_kimia' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-purple-500/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-purple-300 font-mono-num">
              <span>LAB KOKI KIMIA · SINTESIS EMAS: {chemStats.synthesizedCount} / 5</span>
              <span>Keamanan Lab: {chemStats.labLives}/3</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Tuang Tabung Reaksi (Klik Tabung 3D atau Tombol): {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => {
                const tubeSpec = CHEM_TUBE_SPECS[idx] || CHEM_TUBE_SPECS[0];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAnswerChemTube(idx)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-400 text-left text-xs text-white font-semibold cursor-pointer"
                  >
                    <span
                      className="w-6 h-6 rounded text-white font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: tubeSpec.cssHex }}
                    >
                      {letters[idx]}
                    </span>
                    <span>
                      {tubeSpec.name}: {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 15: EKSPEDISI PINISI (PETA NUSANTARA 3D) */}
      {mode === 'ekspedisi_pinisi' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-emerald-500/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-mono-num">
              <span>PELAYARAN PINISI · PULAU: {pinisiStats.islandsVisited} / 5</span>
              <span>
                Lambung: {pinisiStats.hullLives}/3 · Angin: {pinisiStats.windTimeLeft}s
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Layar Pinisi Menuju Dermaga Pulau Jawaban: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => {
                const isl = PINISI_ISLAND_COORDS[idx] || PINISI_ISLAND_COORDS[0];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAnswerPinisiIsland(idx)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-400 text-left text-xs text-white font-semibold cursor-pointer"
                  >
                    <span className="w-6 h-6 rounded bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                      {letters[idx]}
                    </span>
                    <span>
                      {isl.name.split(' (')[0]}: {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 16: PENJAGA GAWANG PINTAR (3D GOALIE REFLEX — BEZIER PENALTY SHOWDOWN) */}
      {mode === 'penjaga_gawang' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-lime-500/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-lime-300 font-mono-num">
              <span>PENALTI STADION · TEPISAN: {goalieStats.saves} / 5</span>
              <span>
                Kebobolan: {goalieStats.conceded}/3 · Waktu: {goalieStats.shotCountdown}s
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Kunci Sudut Lompatan Kiper 3D: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => {
                const zone = GOALIE_ZONE_SPECS[idx] || GOALIE_ZONE_SPECS[0];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAnswerGoalieZone(idx)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-lime-400 text-left text-xs text-white font-semibold cursor-pointer"
                  >
                    <span
                      className="w-6 h-6 rounded text-slate-950 font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: zone.cssHex }}
                    >
                      {letters[idx]}
                    </span>
                    <span>
                      {zone.name}: {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 17: PABRIK SORTIR (3D CONVEYOR BELT SORTER) */}
      {mode === 'pabrik_sortir' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-amber-500/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-amber-300 font-mono-num">
              <span>CONVEYOR PABRIK · LULUS CAP: {sorterStats.sortedCount} / 5</span>
              <span>Alarm Salah Sortir: {sorterStats.alarmsCount}/3</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Putar Switch Gate ke Jalur Kontainer: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => {
                const chute =
                  CONVEYOR_CHUTE_SPECS[idx] || CONVEYOR_CHUTE_SPECS[0];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAnswerConveyorChute(idx)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-left text-xs text-white font-semibold cursor-pointer"
                  >
                    <span
                      className="w-6 h-6 rounded text-slate-950 font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: chute.cssHex }}
                    >
                      {letters[idx]}
                    </span>
                    <span>
                      {chute.name}: {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 18: TEBAK BANGUN & BAYANGAN (3D PRISM & LASER CASTER) */}
      {mode === 'tebak_bangun' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-fuchsia-500/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-fuchsia-300 font-mono-num">
              <span>KUIL PRISMA · PORTAL PELANGI: {prismStats.portalsOpened} / 5</span>
              <span>Perisai Optik: {prismStats.shieldLives}/3</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Arahkan Meriam Prisma ke Monumen Kristal: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => {
                const mon =
                  PRISM_MONUMENT_SPECS[idx] || PRISM_MONUMENT_SPECS[0];
                const isAimed = prismStats.aimedIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAimPrismMonument(idx)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs text-white font-semibold cursor-pointer ${
                      isAimed
                        ? 'bg-fuchsia-950/90 border-fuchsia-400'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-fuchsia-400'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded text-slate-950 font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: mon.cssHex }}
                    >
                      {letters[idx]}
                    </span>
                    <span className="truncate">
                      {mon.name}: {opt}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onFirePrismLaser}
              className="w-full py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide cursor-pointer shadow-lg"
            >
              TEMBAK SINAR ILMU (Target: Kristal {letters[prismStats.aimedIndex]})
            </button>
          </div>
        </div>
      )}

      {/* MODE 19: TARIK TAMBANG JUARA (3D VERSUS TUG-OF-WAR) */}
      {mode === 'tarik_tambang' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-orange-500/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-orange-300 font-mono-num">
              <span>ARENA LAVA · TARIKAN TIM: {tugStats.pullsCount}×</span>
              <span>
                Posisi Pita Merah: {tugStats.ropeOffset <= 0 ? 'Unggul Kiri' : 'Tertarik Kanan'} ({tugStats.ropeOffset.toFixed(1)}m)
              </span>
            </div>
            {/* Visual Rope Meter */}
            <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500 transition-all"
                style={{
                  width: `${Math.max(5, Math.min(95, 50 - (tugStats.ropeOffset / 3.2) * 50))}%`
                }}
              />
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Power Pull Tim Kita vs Tim Robot: {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerTugOfWar(idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-orange-400 text-left text-xs text-white font-semibold cursor-pointer"
                >
                  <span className="w-6 h-6 rounded bg-orange-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                    {letters[idx]}
                  </span>
                  <span>Tarik {letters[idx]}: {opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 20: ARENA BOSS AKHIR (RAKSASA ILMU 3D — COLOSSEUM ACTION QUIZ) */}
      {mode === 'arena_boss' && (
        <div className="fixed top-28 xl:top-20 left-3 right-3 sm:left-4 sm:right-auto z-20 sm:w-full sm:max-w-lg pointer-events-auto">
          <div className="p-4 rounded-2xl bg-slate-950/92 border border-rose-500/70 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs text-rose-300 font-mono-num">
              <span>GOLEM RAKSASA ILMU · HP: {bossStats.bossHp}%</span>
              <span>
                Perisai: {bossStats.playerHp}/3 · Combo: {bossStats.comboCount}×
              </span>
            </div>
            {/* Boss HP Bar */}
            <div className="w-full h-3 rounded-full bg-slate-900 border border-rose-500/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-400 transition-all"
                style={{ width: `${Math.max(0, bossStats.bossHp)}%` }}
              />
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">
              Aktifkan Pilar Elemen (Hindari Zona Merah [WASD]): {currentQuestion.q}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => {
                const pillar =
                  BOSS_PILLAR_SPECS[idx] || BOSS_PILLAR_SPECS[0];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAnswerBossPillar(idx)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-rose-400 text-left text-xs text-white font-semibold cursor-pointer"
                  >
                    <span
                      className="w-6 h-6 rounded text-slate-950 font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: pillar.cssHex }}
                    >
                      {letters[idx]}
                    </span>
                    <span>
                      {pillar.name}: {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

