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
import { uiManager } from '../game/UIManager';
import { ErgonomicQuestionDeck } from './ErgonomicHudWidgets';

interface ActiveModeHudProps {
  mode: PlayableGameId;
  activeSlotTitle: string;
  currentQuestion: QuestionItem;
  streak: number;
  lives: number;
  feedbackBanner: { isCorrect: boolean; text: string } | null;

  hubQuizModal: {
    open: boolean;
    title: string;
    subject: string;
  } | null;
  onCloseHubQuiz: () => void;
  onAnswerHubQuiz: (optionIdx: number) => void;

  runnerStats: {
    distance: number;
    coins: number;
    lives: number;
    gooseDistance: number;
    activePowerUp: string | null;
  };
  onRunnerShiftLane: (dir: -1 | 1) => void;
  onRunnerJump: () => void;

  towerFloor: number;
  onAnswerTower: (optionIdx: number) => void;

  unlockedClues: number[];
  activeTkpId: number | null;
  onSelectTkp: (tkpId: number) => void;
  onAnswerTkpQuestion: (optionIdx: number) => void;
  onSolveMysteryCulprit: (culpritIdx: number) => void;

  pasarCustomerIdx: number;
  pasarServedCount: number;
  onAnswerPasarOrder: (optionIdx: number) => void;

  bridgeStep: number;
  onAnswerBridgeStep: (optionIdx: number) => void;

  castleStats: {
    castleHp: number;
    monstersDefeated: number;
  };
  onAnswerCastleDefense: (optionIdx: number) => void;

  rocketStats: {
    ringsPassed: number;
    shieldLives: number;
  };
  onAnswerRocketRing: (optionIdx: number) => void;

  architectStats: {
    floors: number;
    stability: number;
  };
  onAnswerArchitectBlock: (optionIdx: number) => void;

  mazeGatesUnlocked: number;
  onAnswerMazeGate: (optionIdx: number) => void;

  catapultHits: number;
  onAimCatapult: (optionIdx: number) => void;
  onAnswerCatapultShot: (optionIdx: number) => void;

  robotQueue: RobotCommandType[];
  robotSolvedCount: number;
  onEnqueueRobotCmd: (cmd: RobotCommandType) => void;
  onLoadRobotPresetStation: (stationIdx: number) => void;
  onClearRobotQueue: () => void;
  onRunRobotProgram: () => void;

  submarineStats: {
    chestsOpened: number;
    oxygenLives: number;
  };
  onAnswerSubmarineChest: (chestIdx: number) => void;

  chemStats: {
    synthesizedCount: number;
    labLives: number;
  };
  onAnswerChemTube: (tubeIdx: number) => void;

  pinisiStats: {
    islandsVisited: number;
    hullLives: number;
    windTimeLeft: number;
  };
  onAnswerPinisiIsland: (islandIdx: number) => void;

  goalieStats: {
    saves: number;
    conceded: number;
    shotCountdown: number;
  };
  onAnswerGoalieZone: (zoneIdx: number) => void;

  sorterStats: {
    sortedCount: number;
    alarmsCount: number;
  };
  onAnswerConveyorChute: (chuteIdx: number) => void;

  prismStats: {
    portalsOpened: number;
    shieldLives: number;
    aimedIndex: number;
  };
  onAimPrismMonument: (monumentIdx: number) => void;
  onFirePrismLaser: () => void;

  tugStats: {
    ropeOffset: number;
    pullsCount: number;
  };
  onAnswerTugOfWar: (optionIdx: number) => void;

  bossStats: {
    bossHp: number;
    playerHp: number;
    comboCount: number;
  };
  onAnswerBossPillar: (pillarIdx: number) => void;
}

const CMD_SYMBOL: Record<RobotCommandType, string> = {
  maju: '↑',
  kiri: '↺',
  kanan: '↻',
  lompat: '⚡'
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
      {/* Minimalist Feedback Toast (Compact Symbol + Concise Line) */}
      {feedbackBanner && (
        <div
          role="status"
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full border text-xs font-medium shadow-lg pointer-events-none max-w-md truncate ${
            feedbackBanner.isCorrect
              ? 'bg-zinc-950/90 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-950/90 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedbackBanner.isCorrect ? '✓ ' : '✕ '}
          {feedbackBanner.text}
        </div>
      )}

      {/* MODE 1: JELAJAH DUNIA BUILDING / NPC QUIZ DIALOG */}
      {mode === 'jelajah_dunia' && hubQuizModal?.open && (
        <div
          role="dialog"
          aria-label={hubQuizModal.title}
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs pointer-events-auto"
        >
          <div className="w-full max-w-lg rounded-2xl glass-modal p-5">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-3 font-mono-num">
              <span>{hubQuizModal.title}</span>
              <div className="flex items-center gap-2.5">
                <span className="text-rose-400">♥ {lives}</span>
                {streak > 0 && <span>⚡ {streak}x</span>}
                <button
                  type="button"
                  onClick={() => {
                    uiManager.triggerTactileClick(15);
                    onCloseHubQuiz();
                  }}
                  className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            <h3 className="text-sm sm:text-base font-medium text-zinc-100 leading-snug mb-4">
              {currentQuestion.q}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    uiManager.triggerTactileClick(20);
                    onAnswerHubQuiz(idx);
                  }}
                  className="btn-tactile flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/8 hover:border-white/20 text-left text-xs text-zinc-100 font-medium cursor-pointer"
                >
                  <span className="text-zinc-500 font-mono-num text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: LARI KILAT (Pure Symbol & Number Runner HUD) */}
      {mode === 'lari_kilat' && (
        <div className="fixed top-15 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-3 pointer-events-none">
          <div className="p-3 rounded-2xl glass-hud pointer-events-auto">
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-1.5 font-mono-num">
              <div className="flex items-center gap-3">
                <span className="text-zinc-100 font-medium">{runnerStats.distance}m</span>
                <span className="text-amber-400">🪙 {runnerStats.coins}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>🦢 {runnerStats.gooseDistance}m</span>
                <span className="text-rose-400">♥ {runnerStats.lives}</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-zinc-100 mb-2">
              {currentQuestion.q}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {currentQuestion.options.map((opt, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900/85 border border-white/8 text-xs text-zinc-200 truncate"
                >
                  <span className="text-zinc-500 mr-1.5 font-mono-num">
                    {letters[idx]}
                  </span>
                  {opt}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  uiManager.triggerTactileClick(15);
                  onRunnerShiftLane(-1);
                }}
                className="px-3.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/8 text-xs text-zinc-200 cursor-pointer btn-tactile"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => {
                  uiManager.triggerTactileClick(20);
                  onRunnerJump();
                }}
                className="px-4 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-semibold cursor-pointer btn-tactile"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => {
                  uiManager.triggerTactileClick(15);
                  onRunnerShiftLane(1);
                }}
                className="px-3.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/8 text-xs text-zinc-200 cursor-pointer btn-tactile"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: JATUH BANGUN */}
      {mode === 'jatuh_bangun' && (
        <ErgonomicQuestionDeck
          modeTitle="Menara"
          statusLeft={`▲ ${towerFloor}/4`}
          statusRight={`⚡ ${streak}x`}
          question={currentQuestion}
          onSelectOption={onAnswerTower}
        />
      )}

      {/* MODE 4: DETEKTIF KOTA ILMU */}
      {mode === 'detektif_kota' && (
        <div className="fixed top-15 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-3 pointer-events-auto">
          <div className="p-3.5 rounded-2xl glass-hud space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono-num">
              <div className="flex items-center gap-1.5">
                {detectiveCase.tkpList.map((tkp) => {
                  const isSolved = unlockedClues.includes(tkp.id);
                  const isSelected = activeTkpId === tkp.id;
                  return (
                    <button
                      key={tkp.id}
                      type="button"
                      onClick={() => {
                        uiManager.triggerTactileClick(15);
                        onSelectTkp(tkp.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        isSolved
                          ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                          : isSelected
                          ? 'bg-zinc-100 text-zinc-950'
                          : 'bg-zinc-900 text-zinc-400 border border-white/8'
                      }`}
                    >
                      #{tkp.id} {isSolved ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
              <span className="text-amber-400">🔍 {unlockedClues.length}/4</span>
            </div>

            {activeTkpId !== null && (
              <div className="pt-1 space-y-2">
                {(() => {
                  const tkpObj = detectiveCase.tkpList.find(
                    (t) => t.id === activeTkpId
                  )!;
                  const solved = unlockedClues.includes(tkpObj.id);
                  return solved ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300">
                      ✓ {tkpObj.clueFound}
                    </div>
                  ) : (
                    <>
                      <div className="text-xs font-medium text-zinc-100">
                        {currentQuestion.q}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {currentQuestion.options.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              uiManager.triggerTactileClick(20);
                              onAnswerTkpQuestion(idx);
                            }}
                            className="btn-tactile flex items-center gap-2 px-2.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/8 text-left text-xs text-zinc-100 cursor-pointer"
                          >
                            <span className="text-zinc-500 font-mono-num text-[11px]">
                              {idx + 1}
                            </span>
                            <span className="truncate">{opt}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {unlockedClues.length >= 2 && (
              <div className="pt-2 border-t border-white/8 grid grid-cols-2 gap-1.5">
                {detectiveCase.culpritOptions.map((suspect, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      uiManager.triggerTactileClick(20);
                      onSolveMysteryCulprit(idx);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs text-left cursor-pointer truncate"
                  >
                    🎯 {suspect}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 5: PASAR NUSANTARA */}
      {mode === 'pasar_nusantara' && (
        <ErgonomicQuestionDeck
          modeTitle="Pasar"
          statusLeft={`🛒 ${pasarServedCount + 1}/5`}
          statusRight={`⚡ ${streak}x`}
          question={{
            id: currentPasar.id,
            subject: 'Aritmetika',
            q: `${currentPasar.prompt} (${currentPasar.visualDetail})`,
            options: currentPasar.options,
            answerIndex: currentPasar.answerIndex,
            explanation: currentPasar.explanation
          }}
          onSelectOption={onAnswerPasarOrder}
        />
      )}

      {/* MODE 6: JEMBATAN JUARA */}
      {mode === 'jembatan_juara' && (
        <ErgonomicQuestionDeck
          modeTitle="Jembatan"
          statusLeft={`👣 ${bridgeStep + 1}/6`}
          statusRight={`♥ ${lives}`}
          question={currentQuestion}
          onSelectOption={onAnswerBridgeStep}
        />
      )}

      {/* MODE 7: PERTAHANAN KASTIL */}
      {mode === 'pertahanan_kastil' && (
        <ErgonomicQuestionDeck
          modeTitle="Kastil"
          statusLeft={`🛡 ${castleStats.castleHp}%`}
          statusRight={`🎯 ${castleStats.monstersDefeated}/5`}
          question={currentQuestion}
          onSelectOption={onAnswerCastleDefense}
        />
      )}

      {/* MODE 8: BALAP ROKET GALAKSI */}
      {mode === 'balap_roket' && (
        <ErgonomicQuestionDeck
          modeTitle="Roket"
          statusLeft={`◎ ${rocketStats.ringsPassed}/5`}
          statusRight={`♥ ${rocketStats.shieldLives}`}
          question={currentQuestion}
          onSelectOption={onAnswerRocketRing}
        />
      )}

      {/* MODE 9: ARSITEK MENARA */}
      {mode === 'arsitek_menara' && (
        <ErgonomicQuestionDeck
          modeTitle="Arsitek"
          statusLeft={`▣ ${architectStats.floors}/6`}
          statusRight={`⚖ ${architectStats.stability}%`}
          question={currentQuestion}
          onSelectOption={onAnswerArchitectBlock}
        />
      )}

      {/* MODE 10: LABIRIN MINOTAUR */}
      {mode === 'labirin_minotaur' && (
        <ErgonomicQuestionDeck
          modeTitle="Labirin"
          statusLeft={`🔑 ${mazeGatesUnlocked}/4`}
          statusRight={`♥ ${lives}`}
          question={currentQuestion}
          onSelectOption={onAnswerMazeGate}
        />
      )}

      {/* MODE 11: PANAHAN KATAPEL FISIKA */}
      {mode === 'panahan_katapel' && (
        <ErgonomicQuestionDeck
          modeTitle="Katapel"
          statusLeft={`🎯 ${catapultHits}/5`}
          statusRight={`⚡ ${streak}x`}
          question={currentQuestion}
          onHoverOption={onAimCatapult}
          onSelectOption={onAnswerCatapultShot}
        />
      )}

      {/* MODE 12: SIRKUIT LOGIKA */}
      {mode === 'sirkuit_logika' && (
        <ErgonomicQuestionDeck
          modeTitle="Sirkuit"
          statusLeft={`🔋 ${robotSolvedCount}/5`}
          statusRight={`♥ ${lives}`}
          question={currentQuestion}
          optionPrefixes={['A', 'B', 'C', 'D']}
          onSelectOption={onLoadRobotPresetStation}
          extraControls={
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {(['maju', 'kiri', 'kanan', 'lompat'] as RobotCommandType[]).map(
                  (cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => {
                        uiManager.triggerTactileClick(15);
                        onEnqueueRobotCmd(cmd);
                      }}
                      className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono-num text-zinc-200 cursor-pointer"
                    >
                      {CMD_SYMBOL[cmd]}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => {
                    uiManager.triggerTactileClick(15);
                    onClearRobotQueue();
                  }}
                  className="px-2 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-400 cursor-pointer"
                >
                  ↺
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-num text-zinc-400 truncate max-w-[140px]">
                  {robotQueue.map((c) => CMD_SYMBOL[c]).join(' ')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    uiManager.triggerTactileClick(20);
                    onRunRobotProgram();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs cursor-pointer"
                >
                  ▶ ({robotQueue.length})
                </button>
              </div>
            </div>
          }
        />
      )}

      {/* MODE 13: SELAM SAMUDRA */}
      {mode === 'selam_samudra' && (
        <ErgonomicQuestionDeck
          modeTitle="Samudra"
          statusLeft={`💎 ${submarineStats.chestsOpened}/5`}
          statusRight={`🫧 ${submarineStats.oxygenLives}`}
          question={currentQuestion}
          optionPrefixes={['A', 'B', 'C', 'D']}
          onSelectOption={onAnswerSubmarineChest}
        />
      )}

      {/* MODE 14: KOKI KIMIA */}
      {mode === 'koki_kimia' && (
        <ErgonomicQuestionDeck
          modeTitle="Kimia"
          statusLeft={`⚗ ${chemStats.synthesizedCount}/5`}
          statusRight={`♥ ${chemStats.labLives}`}
          question={currentQuestion}
          optionPrefixes={CHEM_TUBE_SPECS.map((_, i) => letters[i])}
          onSelectOption={onAnswerChemTube}
        />
      )}

      {/* MODE 15: EKSPEDISI PINISI */}
      {mode === 'ekspedisi_pinisi' && (
        <ErgonomicQuestionDeck
          modeTitle="Pinisi"
          statusLeft={`⛵ ${pinisiStats.islandsVisited}/5`}
          statusRight={`♥ ${pinisiStats.hullLives} · ⏱ ${pinisiStats.windTimeLeft}s`}
          question={currentQuestion}
          optionPrefixes={PINISI_ISLAND_COORDS.map((_, i) => letters[i])}
          onSelectOption={onAnswerPinisiIsland}
        />
      )}

      {/* MODE 16: PENJAGA GAWANG PINTAR */}
      {mode === 'penjaga_gawang' && (
        <ErgonomicQuestionDeck
          modeTitle="Gawang"
          statusLeft={`🧤 ${goalieStats.saves}/5`}
          statusRight={`✕ ${goalieStats.conceded}/3 · ⏱ ${goalieStats.shotCountdown}s`}
          question={currentQuestion}
          optionPrefixes={GOALIE_ZONE_SPECS.map((_, i) => letters[i])}
          onSelectOption={onAnswerGoalieZone}
        />
      )}

      {/* MODE 17: PABRIK SORTIR */}
      {mode === 'pabrik_sortir' && (
        <ErgonomicQuestionDeck
          modeTitle="Sortir"
          statusLeft={`📦 ${sorterStats.sortedCount}/5`}
          statusRight={`⚠ ${sorterStats.alarmsCount}/3`}
          question={currentQuestion}
          optionPrefixes={CONVEYOR_CHUTE_SPECS.map((_, i) => letters[i])}
          onSelectOption={onAnswerConveyorChute}
        />
      )}

      {/* MODE 18: TEBAK BANGUN & BAYANGAN */}
      {mode === 'tebak_bangun' && (
        <ErgonomicQuestionDeck
          modeTitle="Prisma"
          statusLeft={`△ ${prismStats.portalsOpened}/5`}
          statusRight={`♥ ${prismStats.shieldLives}`}
          question={currentQuestion}
          optionPrefixes={PRISM_MONUMENT_SPECS.map((_, i) => letters[i])}
          onSelectOption={onAimPrismMonument}
          extraControls={
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono-num text-zinc-400">
                ◎ {letters[prismStats.aimedIndex]}
              </span>
              <button
                type="button"
                onClick={() => {
                  uiManager.triggerTactileClick(20);
                  onFirePrismLaser();
                }}
                className="px-3.5 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs cursor-pointer"
              >
                ⚡ Tembak ({letters[prismStats.aimedIndex]})
              </button>
            </div>
          }
        />
      )}

      {/* MODE 19: TARIK TAMBANG JUARA */}
      {mode === 'tarik_tambang' && (
        <ErgonomicQuestionDeck
          modeTitle="Tambang"
          statusLeft={`⇄ ${tugStats.pullsCount}x`}
          statusRight={`${tugStats.ropeOffset.toFixed(1)}m`}
          question={currentQuestion}
          optionPrefixes={['A', 'B', 'C', 'D']}
          onSelectOption={onAnswerTugOfWar}
          extraControls={
            <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-zinc-100 transition-all duration-300"
                style={{
                  width: `${Math.max(5, Math.min(95, 50 - (tugStats.ropeOffset / 3.2) * 50))}%`
                }}
              />
            </div>
          }
        />
      )}

      {/* MODE 20: ARENA BOSS AKHIR */}
      {mode === 'arena_boss' && (
        <ErgonomicQuestionDeck
          modeTitle="Boss"
          statusLeft={`👾 ${bossStats.bossHp}%`}
          statusRight={`♥ ${bossStats.playerHp} · ⚡ ${bossStats.comboCount}x`}
          question={currentQuestion}
          optionPrefixes={BOSS_PILLAR_SPECS.map((_, i) => letters[i])}
          onSelectOption={onAnswerBossPillar}
          extraControls={
            <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${Math.max(0, bossStats.bossHp)}%` }}
              />
            </div>
          }
        />
      )}
    </>
  );
};
