/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ACCESSORY_ITEMS,
  AccessoryId,
  BIOMES,
  BiomeId,
  CostumeUniformId,
  DEFAULT_QUESTION_PACK,
  DETECTIVE_CASES,
  MINI_GAME_REGISTRY,
  MiniGameSlot,
  PlayableGameId,
  PlayerProfile,
  QuestionPack,
  UNIFORM_ITEMS
} from './game/questions';
import {
  BOSS_PILLAR_SPECS,
  buildProgramToStation,
  calculateAnswerReward,
  CHEM_TUBE_SPECS,
  CONVEYOR_CHUTE_SPECS,
  createDefaultProfile,
  decodeQuestionPackFromHash,
  getLevelFromXp,
  getQuestionsBySubject,
  getXpProgressInLevel,
  GOALIE_ZONE_SPECS,
  PASAR_CHALLENGES,
  PINISI_ISLAND_COORDS,
  PRISM_MONUMENT_SPECS,
  resolveTugOfWarAnswer,
  RobotCommandType,
  stepArchitectBlock,
  stepBossBattleAttack,
  stepBridgePanel,
  stepCastleDefense,
  stepChemLabExperiment,
  stepConveyorSorter,
  stepGoaliePenalty,
  stepMinotaurMazeGate,
  stepPinisiVoyage,
  stepPrismLaserCast,
  stepSubmarineSonar,
  stepTowerFloor,
  STORAGE_KEY_PACK,
  STORAGE_KEY_PROFILE
} from './game/rules';
import { SceneController } from './game/SceneController';
import { soundManager } from './game/sound';
import { TitleScreen } from './components/TitleScreen';
import {
  BiomeModal,
  MiniGamesModal,
  StudentMaterialModal,
  TeacherModal,
  WardrobeModal
} from './components/GameModals';
import { ScoreCardCertificate } from './components/ScoreCardCertificate';
import { ActiveModeHud } from './components/ActiveModeHud';

type GameShellState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneCtrlRef = useRef<SceneController | null>(null);

  // Check ?autostart=1 query param
  const [shellState, setShellState] = useState<GameShellState>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });

  // Load PlayerProfile from localStorage
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) {
        return { ...createDefaultProfile(), ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return createDefaultProfile();
  });

  // Load QuestionPack from URL hash (#p=base64) or localStorage or default 36 questions
  const [questionPack, setQuestionPack] = useState<QuestionPack>(() => {
    const fromHash = decodeQuestionPackFromHash(window.location.hash);
    if (fromHash) return fromHash;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PACK);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_QUESTION_PACK;
  });

  // World & Active Mini-Game Slot
  const [currentBiome, setCurrentBiome] = useState<BiomeId>('kota_ilmu');
  const [activeSlot, setActiveSlot] = useState<MiniGameSlot>(
    MINI_GAME_REGISTRY[0]
  );
  const [isMuted, setIsMuted] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Active modals
  const [openModal, setOpenModal] = useState<
    'minigames' | 'wardrobe' | 'biome' | 'teacher' | 'materi' | 'scorecard' | null
  >(null);

  // Universal Question Engine runtime state
  const [questionIdx, setQuestionIdx] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState<string>('Semua');
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [sessionScore, setSessionScore] = useState(0);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    isCorrect: boolean;
    text: string;
  } | null>(null);

  // Mode-specific states (Games #1–#6)
  const [hubQuizModal, setHubQuizModal] = useState<{
    open: boolean;
    title: string;
    subject: string;
  } | null>(null);

  const [runnerStats, setRunnerStats] = useState({
    distance: 0,
    coins: 0,
    lives: 3,
    gooseDistance: 7.5,
    activePowerUp: null as string | null
  });

  const [towerFloor, setTowerFloor] = useState(0);
  const [unlockedClues, setUnlockedClues] = useState<number[]>([]);
  const [activeTkpId, setActiveTkpId] = useState<number | null>(1);
  const [pasarCustomerIdx, setPasarCustomerIdx] = useState(0);
  const [pasarServedCount, setPasarServedCount] = useState(0);
  const [bridgeStep, setBridgeStep] = useState(0);

  // Mode-specific states (Batch Games #7–#11)
  const [castleStats, setCastleStats] = useState({
    castleHp: 100,
    monstersDefeated: 0
  });
  const [rocketStats, setRocketStats] = useState({
    ringsPassed: 0,
    shieldLives: 3
  });
  const [architectStats, setArchitectStats] = useState({
    floors: 0,
    stability: 100
  });
  const [mazeGatesUnlocked, setMazeGatesUnlocked] = useState(0);
  const [catapultHits, setCatapultHits] = useState(0);

  // Mode-specific states (Batch Games #12–#15)
  const [robotQueue, setRobotQueue] = useState<RobotCommandType[]>(() =>
    buildProgramToStation(0)
  );
  const [robotSolvedCount, setRobotSolvedCount] = useState(0);
  const [submarineStats, setSubmarineStats] = useState({
    chestsOpened: 0,
    oxygenLives: 3
  });
  const [chemStats, setChemStats] = useState({
    synthesizedCount: 0,
    labLives: 3
  });
  const [pinisiStats, setPinisiStats] = useState({
    islandsVisited: 0,
    hullLives: 3,
    windTimeLeft: 45
  });

  // Mode-specific states (Batch Games #16–#20)
  const [goalieStats, setGoalieStats] = useState({
    saves: 0,
    conceded: 0,
    shotCountdown: 6
  });
  const [sorterStats, setSorterStats] = useState({
    sortedCount: 0,
    alarmsCount: 0
  });
  const [prismStats, setPrismStats] = useState({
    portalsOpened: 0,
    shieldLives: 3,
    aimedIndex: 0
  });
  const [tugStats, setTugStats] = useState({
    ropeOffset: 0,
    pullsCount: 0
  });
  const [bossStats, setBossStats] = useState({
    bossHp: 100,
    playerHp: 3,
    comboCount: 0
  });

  // Outcome modal snapshot ('victory' | 'defeat')
  const [outcomeSnapshot, setOutcomeSnapshot] = useState<{
    type: 'victory' | 'defeat';
    title: string;
    subtitle: string;
    score: number;
    best: number;
  } | null>(null);

  // Sync profile & questionPack to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PACK, JSON.stringify(questionPack));
    } catch {
      // ignore
    }
    sceneCtrlRef.current?.setQuestionPack(questionPack);
  }, [questionPack]);

  // Listen to URL hash changes (#p=base64EncodedJSON)
  useEffect(() => {
    const onHashChange = () => {
      const fromHash = decodeQuestionPackFromHash(window.location.hash);
      if (fromHash) {
        setQuestionPack(fromHash);
        showFeedback(
          true,
          `Paket Soal "${fromHash.title}" (${fromHash.questions.length} soal) berhasil dimuat dari Link Guru!`
        );
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Mirror shellState to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = shellState;
    if (sceneCtrlRef.current) {
      sceneCtrlRef.current.setTitleTour(shellState === 'title');
      sceneCtrlRef.current.setPaused(
        shellState === 'paused' ||
          shellState === 'gameover' ||
          openModal !== null
      );
    }
  }, [shellState, openModal]);

  const activeQuestions = getQuestionsBySubject(questionPack, subjectFilter);
  const currentQuestion =
    activeQuestions[questionIdx % activeQuestions.length] ||
    DEFAULT_QUESTION_PACK.questions[0];

  const showFeedback = (isCorrect: boolean, text: string) => {
    setFeedbackBanner({ isCorrect, text });
    window.setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  };

  const awardPlayerProgress = (
    isCorrect: boolean,
    baseCoins = 25,
    baseXp = 30
  ) => {
    const reward = calculateAnswerReward(isCorrect, streak, baseCoins, baseXp);
    setStreak(reward.nextStreak);
    const nextScore = sessionScore + (isCorrect ? reward.xpDelta : 0);
    setSessionScore(nextScore);

    setProfile((prev) => {
      const newXp = prev.xp + reward.xpDelta;
      const newLevel = getLevelFromXp(newXp);
      if (newLevel > prev.level) {
        soundManager.playLevelUp();
      }
      const modeId = activeSlot.engineId;
      const prevBest = prev.highScores[modeId] || 0;
      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        coins: prev.coins + reward.coinsDelta,
        highScores: {
          ...prev.highScores,
          [modeId]: Math.max(prevBest, nextScore)
        }
      };
    });
  };

  // Latest callbacks ref for Three.js SceneController
  const callbacksRef = useRef({
    onOpenBuildingQuiz: (subject: string, buildingTitle: string) => {
      setSubjectFilter(subject);
      setQuestionIdx((i) => i + 1);
      setLives(3);
      setHubQuizModal({
        open: true,
        title: buildingTitle,
        subject
      });
    },
    onOpenNpcDialog: (npcName: string, subject: string) => {
      setSubjectFilter(subject);
      setQuestionIdx((i) => i + 1);
      setLives(3);
      setHubQuizModal({
        open: true,
        title: `Tantangan Warga: ${npcName}`,
        subject
      });
    },
    onCollectBook: (bookId: string, subject: string) => {
      setProfile((prev) => {
        const already = prev.collectedBooks.includes(bookId);
        const newXp = prev.xp + 40;
        return {
          ...prev,
          xp: newXp,
          level: getLevelFromXp(newXp),
          coins: prev.coins + 30,
          collectedBooks: already
            ? prev.collectedBooks
            : [...prev.collectedBooks, bookId]
        };
      });
      showFeedback(
        true,
        `Buku Ilmu ${subject} dikoleksi! +30 Koin & +40 XP`
      );
    },
    onRunnerGateHit: (chosenIndex: number, isCorrect: boolean) => {
      awardPlayerProgress(isCorrect, 35, 40);
      const letters = ['A', 'B', 'C', 'D'];
      if (isCorrect) {
        showFeedback(
          true,
          `Gerbang ${letters[chosenIndex]} BENAR! +35 Koin · Angsa Raksasa tertinggal!`
        );
      } else {
        showFeedback(
          false,
          `Gerbang ${letters[chosenIndex]} SALAH! ${currentQuestion.explanation}`
        );
      }
      const nextIdx = questionIdx + 1;
      setQuestionIdx(nextIdx);
      const nextQ = activeQuestions[nextIdx % activeQuestions.length];
      sceneCtrlRef.current?.updateRunnerQuestionGate(nextQ);
    },
    onRunnerStatsUpdate: (stats: {
      distance: number;
      coins: number;
      lives: number;
      gooseDistance: number;
      activePowerUp: string | null;
    }) => {
      setRunnerStats(stats);
    },
    onRunnerGameOver: (distance: number, coins: number) => {
      setOutcomeSnapshot({
        type: 'defeat',
        title: 'Tertangkap Angsa Raksasa!',
        subtitle: `Kamu berlari sejauh ${distance} meter dan mengumpulkan ${coins} Koin Lari.`,
        score: distance + coins,
        best: Math.max(
          profile.highScores.lari_kilat || 0,
          distance + coins
        )
      });
      setShellState('gameover');
    },
    onInspectTkp: (tkpId: number) => {
      setActiveTkpId(tkpId);
    },
    onBridgeStepClick: (optionIndex: number) => {
      handleAnswerBridgeStep(optionIndex);
    },
    onBatch2OptionClick: (optionIndex: number) => {
      if (activeSlot.engineId === 'balap_roket') {
        handleAnswerRocketRing(optionIndex);
      } else if (activeSlot.engineId === 'panahan_katapel') {
        handleAnswerCatapultShot(optionIndex);
      } else if (activeSlot.engineId === 'sirkuit_logika') {
        handleLoadRobotPresetStation(optionIndex);
      } else if (activeSlot.engineId === 'selam_samudra') {
        handleAnswerSubmarineChest(optionIndex);
      } else if (activeSlot.engineId === 'koki_kimia') {
        handleAnswerChemTube(optionIndex);
      } else if (activeSlot.engineId === 'ekspedisi_pinisi') {
        handleAnswerPinisiIsland(optionIndex);
      } else if (activeSlot.engineId === 'penjaga_gawang') {
        handleAnswerGoalieZone(optionIndex);
      } else if (activeSlot.engineId === 'pabrik_sortir') {
        handleAnswerConveyorChute(optionIndex);
      } else if (activeSlot.engineId === 'tebak_bangun') {
        handleAimPrismMonument(optionIndex);
      } else if (activeSlot.engineId === 'tarik_tambang') {
        handleAnswerTugOfWar(optionIndex);
      } else if (activeSlot.engineId === 'arena_boss') {
        handleAnswerBossPillar(optionIndex);
      }
    }
  });

  // Keep callbacksRef fresh
  useEffect(() => {
    callbacksRef.current.onRunnerGateHit = (
      chosenIndex: number,
      isCorrect: boolean
    ) => {
      awardPlayerProgress(isCorrect, 35, 40);
      const letters = ['A', 'B', 'C', 'D'];
      if (isCorrect) {
        showFeedback(
          true,
          `Gerbang ${letters[chosenIndex]} BENAR! +35 Koin · Angsa Raksasa tertinggal!`
        );
      } else {
        showFeedback(
          false,
          `Gerbang ${letters[chosenIndex]} SALAH! ${currentQuestion.explanation}`
        );
      }
      const nextIdx = questionIdx + 1;
      setQuestionIdx(nextIdx);
      const nextQ = activeQuestions[nextIdx % activeQuestions.length];
      sceneCtrlRef.current?.updateRunnerQuestionGate(nextQ);
    };
    callbacksRef.current.onBridgeStepClick = (optionIndex: number) => {
      handleAnswerBridgeStep(optionIndex);
    };
    callbacksRef.current.onBatch2OptionClick = (optionIndex: number) => {
      if (activeSlot.engineId === 'balap_roket') {
        handleAnswerRocketRing(optionIndex);
      } else if (activeSlot.engineId === 'panahan_katapel') {
        handleAnswerCatapultShot(optionIndex);
      } else if (activeSlot.engineId === 'sirkuit_logika') {
        handleLoadRobotPresetStation(optionIndex);
      } else if (activeSlot.engineId === 'selam_samudra') {
        handleAnswerSubmarineChest(optionIndex);
      } else if (activeSlot.engineId === 'koki_kimia') {
        handleAnswerChemTube(optionIndex);
      } else if (activeSlot.engineId === 'ekspedisi_pinisi') {
        handleAnswerPinisiIsland(optionIndex);
      } else if (activeSlot.engineId === 'penjaga_gawang') {
        handleAnswerGoalieZone(optionIndex);
      } else if (activeSlot.engineId === 'pabrik_sortir') {
        handleAnswerConveyorChute(optionIndex);
      } else if (activeSlot.engineId === 'tebak_bangun') {
        handleAimPrismMonument(optionIndex);
      } else if (activeSlot.engineId === 'tarik_tambang') {
        handleAnswerTugOfWar(optionIndex);
      } else if (activeSlot.engineId === 'arena_boss') {
        handleAnswerBossPillar(optionIndex);
      }
    };
  });

  // Periodic HUD ticker for Goalie Reflex shot timer
  useEffect(() => {
    if (shellState !== 'playing' || openModal !== null) return;
    if (activeSlot.engineId !== 'penjaga_gawang') return;
    const timer = window.setInterval(() => {
      setGoalieStats((prev) => ({
        ...prev,
        shotCountdown: prev.shotCountdown <= 1 ? 6 : prev.shotCountdown - 1
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [shellState, openModal, activeSlot.engineId]);

  // Mount Three.js WebGLRenderer once
  useEffect(() => {
    if (!canvasMountRef.current) return;
    const ctrl = new SceneController(canvasMountRef.current, {
      onOpenBuildingQuiz: (s, t) =>
        callbacksRef.current.onOpenBuildingQuiz(s, t),
      onOpenNpcDialog: (n, s) => callbacksRef.current.onOpenNpcDialog(n, s),
      onCollectBook: (id, s) => callbacksRef.current.onCollectBook(id, s),
      onRunnerGateHit: (idx, ok) =>
        callbacksRef.current.onRunnerGateHit(idx, ok),
      onRunnerStatsUpdate: (st) =>
        callbacksRef.current.onRunnerStatsUpdate(st),
      onRunnerGameOver: (d, c) => callbacksRef.current.onRunnerGameOver(d, c),
      onInspectTkp: (id) => callbacksRef.current.onInspectTkp(id),
      onBridgeStepClick: (idx) => callbacksRef.current.onBridgeStepClick(idx),
      onBatch2OptionClick: (idx) =>
        callbacksRef.current.onBatch2OptionClick?.(idx)
    });
    ctrl.setQuestionPack(questionPack);
    ctrl.setWardrobe(profile.uniform, profile.accessories);
    ctrl.setTitleTour(shellState === 'title');
    sceneCtrlRef.current = ctrl;

    return () => {
      ctrl.destroy();
      sceneCtrlRef.current = null;
    };
  }, []);

  // Keyboard shortcuts for Title Start (Enter/Space) and Pause (Escape/P)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (shellState === 'title' && openModal === null) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (openModal !== null) {
          setOpenModal(null);
          return;
        }
        if (shellState === 'playing') {
          setShellState('paused');
        } else if (shellState === 'paused') {
          setShellState('playing');
        }
      } else if (e.code === 'KeyH' && shellState === 'playing' && !openModal) {
        setDockCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shellState, openModal]);

  const handleStartGame = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOpenModal(null);
    setOutcomeSnapshot(null);
    setShellState('playing');
    soundManager.playCorrect();
    soundManager.startAmbient(currentBiome);
  };

  const handleSwitchMiniGameSlot = (slot: MiniGameSlot) => {
    setActiveSlot(slot);
    setOpenModal(null);
    setHubQuizModal(null);
    setOutcomeSnapshot(null);
    setLives(3);
    setStreak(0);
    setSessionScore(0);
    setTowerFloor(0);
    setUnlockedClues([]);
    setActiveTkpId(1);
    setPasarCustomerIdx(0);
    setPasarServedCount(0);
    setBridgeStep(0);
    setCastleStats({ castleHp: 100, monstersDefeated: 0 });
    setRocketStats({ ringsPassed: 0, shieldLives: 3 });
    setArchitectStats({ floors: 0, stability: 100 });
    setMazeGatesUnlocked(0);
    setCatapultHits(0);
    setRobotQueue(buildProgramToStation(0));
    setRobotSolvedCount(0);
    setSubmarineStats({ chestsOpened: 0, oxygenLives: 3 });
    setChemStats({ synthesizedCount: 0, labLives: 3 });
    setPinisiStats({ islandsVisited: 0, hullLives: 3, windTimeLeft: 45 });
    setGoalieStats({ saves: 0, conceded: 0, shotCountdown: 6 });
    setSorterStats({ sortedCount: 0, alarmsCount: 0 });
    setPrismStats({ portalsOpened: 0, shieldLives: 3, aimedIndex: 0 });
    setTugStats({ ropeOffset: 0, pullsCount: 0 });
    setBossStats({ bossHp: 100, playerHp: 3, comboCount: 0 });

    // Optional biome pairing for thematic slots
    if (
      slot.id === 'selam_karang' ||
      slot.id === 'jembatan_kristal' ||
      slot.engineId === 'selam_samudra'
    ) {
      setCurrentBiome('samudra');
      sceneCtrlRef.current?.setBiome('samudra');
    } else if (
      slot.id === 'roket_orbit' ||
      slot.id === 'kubah_mars' ||
      slot.engineId === 'balap_roket' ||
      slot.engineId === 'tebak_bangun'
    ) {
      setCurrentBiome('angkasa');
      sceneCtrlRef.current?.setBiome('angkasa');
    } else if (
      slot.id === 'titian_rimba' ||
      slot.id === 'safari_endemi' ||
      slot.engineId === 'tarik_tambang' ||
      slot.engineId === 'arena_boss'
    ) {
      setCurrentBiome('rimba');
      sceneCtrlRef.current?.setBiome('rimba');
    } else if (
      slot.id === 'balap_pinisi' ||
      slot.id === 'puncak_candi' ||
      slot.engineId === 'ekspedisi_pinisi' ||
      slot.engineId === 'penjaga_gawang'
    ) {
      setCurrentBiome('nusantara');
      sceneCtrlRef.current?.setBiome('nusantara');
    } else {
      setCurrentBiome('kota_ilmu');
      sceneCtrlRef.current?.setBiome('kota_ilmu');
    }

    const nextQ = activeQuestions[(questionIdx + 1) % activeQuestions.length];
    setQuestionIdx((i) => i + 1);
    sceneCtrlRef.current?.setMode(slot.engineId, nextQ, questionPack);
    setShellState('playing');
  };

  // Mode 1: Jelajah Dunia Building / NPC Answer Handler
  const handleAnswerHubQuiz = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 30, 35);
    if (isCorrect) {
      soundManager.playCorrect();
      showFeedback(
        true,
        `BENAR! +30 Koin & +35 XP · ${currentQuestion.explanation}`
      );
      setQuestionIdx((i) => i + 1);
    } else {
      soundManager.playWrong();
      const nextLives = lives - 1;
      setLives(nextLives);
      showFeedback(false, `Kurang Tepat! ${currentQuestion.explanation}`);
      if (nextLives <= 0) {
        setHubQuizModal(null);
      } else {
        setQuestionIdx((i) => i + 1);
      }
    }
  };

  // Mode 3: Jatuh Bangun Tower Answer Handler
  const handleAnswerTower = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 35, 40);
    const res = stepTowerFloor(towerFloor, isCorrect, 4);
    setTowerFloor(res.nextFloor);
    sceneCtrlRef.current?.setTowerFloorVisual(res.nextFloor, res.fell);
    setQuestionIdx((i) => i + 1);

    if (isCorrect) {
      soundManager.playCorrect();
      showFeedback(
        true,
        `Naik ke Lantai ${res.nextFloor}! ${currentQuestion.explanation}`
      );
      if (res.won) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Mahkota Puncak Menara Direbut!',
          subtitle: 'Kamu berhasil menaklukkan 4 lantai Menara Heksagonal Jatuh Bangun!',
          score: sessionScore + 150,
          best: Math.max(
            profile.highScores.jatuh_bangun || 0,
            sessionScore + 150
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      showFeedback(
        false,
        `Lantai Runtuh ke Lantai ${res.nextFloor}! ${currentQuestion.explanation}`
      );
    }
  };

  // Mode 4: Detektif Kota Ilmu TKP Answer & Culprit Handler
  const handleAnswerTkpQuestion = (optionIdx: number) => {
    if (activeTkpId === null) return;
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 35, 40);
    setQuestionIdx((i) => i + 1);
    if (isCorrect) {
      soundManager.playCorrect();
      if (!unlockedClues.includes(activeTkpId)) {
        setUnlockedClues((prev) => [...prev, activeTkpId]);
      }
      showFeedback(
        true,
        `Analisis Forensik TKP #${activeTkpId} Berhasil! Bukti Kunci Terbuka.`
      );
    } else {
      soundManager.playWrong();
      showFeedback(
        false,
        `Analisis belum tepat: ${currentQuestion.explanation}`
      );
    }
  };

  const handleSolveMysteryCulprit = (culpritIdx: number) => {
    const activeCase = DETECTIVE_CASES[0];
    const isCorrect = culpritIdx === activeCase.culpritIndex;
    if (isCorrect) {
      soundManager.playLevelUp();
      awardPlayerProgress(true, 80, 100);
      setOutcomeSnapshot({
        type: 'victory',
        title: 'Kasus Kota Ilmu Terpecahkan!',
        subtitle: activeCase.deductionExplanation,
        score: sessionScore + 200,
        best: Math.max(
          profile.highScores.detektif_kota || 0,
          sessionScore + 200
        )
      });
      setShellState('gameover');
    } else {
      soundManager.playWrong();
      showFeedback(
        false,
        'Tersangka tersebut memiliki alibi kuat! Periksa kembali petunjuk biner & magnetik di TKP.'
      );
    }
  };

  // Mode 5: Pasar Nusantara Shopkeeper Answer Handler
  const handleAnswerPasarOrder = (optionIdx: number) => {
    const order = PASAR_CHALLENGES[pasarCustomerIdx % PASAR_CHALLENGES.length];
    const isCorrect = optionIdx === order.answerIndex;
    awardPlayerProgress(isCorrect, 40, 45);
    if (isCorrect) {
      soundManager.playCoin();
      const nextServed = pasarServedCount + 1;
      setPasarServedCount(nextServed);
      setPasarCustomerIdx((i) => i + 1);
      showFeedback(true, `Transaksi Tepat! +40 Koin · ${order.explanation}`);
      if (nextServed >= 5) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Warung Pasar Nusantara Laris Manis!',
          subtitle:
            'Seluruh 5 antrean pembeli berhasil dilayani dengan perhitungan matematika akurat!',
          score: sessionScore + 200,
          best: Math.max(
            profile.highScores.pasar_nusantara || 0,
            sessionScore + 200
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      showFeedback(false, `Hitungan kurang tepat! ${order.explanation}`);
    }
  };

  // Mode 6: Jembatan Juara Glass Bridge Answer Handler
  const handleAnswerBridgeStep = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 35, 40);
    const res = stepBridgePanel(
      bridgeStep,
      optionIdx,
      currentQuestion.answerIndex,
      6
    );
    sceneCtrlRef.current?.resolveBridgeStepVisual(
      bridgeStep,
      optionIdx,
      res.panelSolid
    );
    setQuestionIdx((i) => i + 1);

    if (res.panelSolid) {
      soundManager.playCorrect();
      setBridgeStep(res.nextStep);
      showFeedback(
        true,
        `Panel Kaca Kokoh! Maju ke Langkah ${res.nextStep}/6.`
      );
      if (res.finished) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Garis Finish Jembatan Juara Tercapai!',
          subtitle:
            'Kamu menyeberangi seluruh 6 baris panel kaca pulau terapung dengan sempurna!',
          score: sessionScore + 220,
          best: Math.max(
            profile.highScores.jembatan_juara || 0,
            sessionScore + 220
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      const nextLives = lives - 1;
      setLives(nextLives);
      showFeedback(
        false,
        `Panel Kaca Retak! ${currentQuestion.explanation}`
      );
      if (nextLives <= 0) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Terjatuh dari Jembatan Kaca!',
          subtitle: `Kamu mencapai Langkah ${bridgeStep}/6. Ayo coba seberangi lagi!`,
          score: sessionScore,
          best: Math.max(profile.highScores.jembatan_juara || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 7: Pertahanan Kastil (Arsena Sains) Handler
  const handleAnswerCastleDefense = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 40, 45);
    sceneCtrlRef.current?.triggerCastleCannon(isCorrect);
    const res = stepCastleDefense(
      castleStats.castleHp,
      castleStats.monstersDefeated,
      isCorrect,
      5
    );
    setCastleStats({
      castleHp: res.castleHp,
      monstersDefeated: res.monstersDefeated
    });
    setQuestionIdx((i) => i + 1);

    if (isCorrect) {
      soundManager.playCorrect();
      showFeedback(
        true,
        `Meriam Partikel Mengenai Monster! (${res.monstersDefeated}/5) · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Benteng Arsena Sains Jaya!',
          subtitle:
            'Seluruh gelombang monster berhasil dihentikan oleh meriam partikelmu!',
          score: sessionScore + 220,
          best: Math.max(
            profile.highScores.pertahanan_kastil || 0,
            sessionScore + 220
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      showFeedback(
        false,
        `Meleset! Monster mendekat & HP Kastil ${res.castleHp}% · ${currentQuestion.explanation}`
      );
      if (res.defeat) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Benteng Arsena Sains Ditembus!',
          subtitle:
            'HP Kastil habis diserang monster. Ayo isi ulang meriam partikelmu!',
          score: sessionScore,
          best: Math.max(
            profile.highScores.pertahanan_kastil || 0,
            sessionScore
          )
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 8: Balap Roket Galaksi Handler
  const handleAnswerRocketRing = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 40, 45);
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    sceneCtrlRef.current?.triggerRocketRing(optionIdx, isCorrect, nextQ);
    setQuestionIdx(nextIdx);
    const letters = ['A', 'B', 'C', 'D'];

    if (isCorrect) {
      soundManager.playCorrect();
      const nextRings = rocketStats.ringsPassed + 1;
      setRocketStats((s) => ({ ...s, ringsPassed: nextRings }));
      showFeedback(
        true,
        `Roket Melewati Cincin ${letters[optionIdx]}! (${nextRings}/5) · ${currentQuestion.explanation}`
      );
      if (nextRings >= 5) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Juara Balap Roket Galaksi!',
          subtitle:
            'Roketmu menembus seluruh 5 Cincin Orbit Jawaban dengan kecepatan warp!',
          score: sessionScore + 230,
          best: Math.max(
            profile.highScores.balap_roket || 0,
            sessionScore + 230
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      const nextShield = rocketStats.shieldLives - 1;
      setRocketStats((s) => ({ ...s, shieldLives: nextShield }));
      showFeedback(
        false,
        `Turbulensi Cincin ${letters[optionIdx]}! ${currentQuestion.explanation}`
      );
      if (nextShield <= 0) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Perisai Roket Habis!',
          subtitle:
            'Roket mengalami turbulensi asteroid. Ayo terbang lagi di orbit galaksi!',
          score: sessionScore,
          best: Math.max(profile.highScores.balap_roket || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 9: Arsitek Menara Handler
  const handleAnswerArchitectBlock = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 40, 45);
    const res = stepArchitectBlock(
      architectStats.floors,
      architectStats.stability,
      isCorrect,
      6
    );
    sceneCtrlRef.current?.triggerArchitectDrop(
      isCorrect,
      res.tiltAngle,
      res.offsetX
    );
    setArchitectStats({
      floors: res.floors,
      stability: res.stability
    });
    setQuestionIdx((i) => i + 1);

    if (isCorrect) {
      soundManager.playCorrect();
      showFeedback(
        true,
        `Lantai #${res.floors} Terpasang Presisi! Stabilitas ${res.stability}% · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Mahakarya Arsitek Menara Selesai!',
          subtitle:
            'Menara 6 lantai berdiri tegak dan presisi di jantung Kota Ilmu!',
          score: sessionScore + 240,
          best: Math.max(
            profile.highScores.arsitek_menara || 0,
            sessionScore + 240
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      showFeedback(
        false,
        `Balok Miring! Stabilitas turun ke ${res.stability}% · ${currentQuestion.explanation}`
      );
      if (res.collapsed) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Struktur Menara Runtuh!',
          subtitle:
            'Stabilitas menara habis akibat kemiringan balok. Mari rancang ulang!',
          score: sessionScore,
          best: Math.max(profile.highScores.arsitek_menara || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 10: Labirin Minotaur Handler
  const handleAnswerMazeGate = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 40, 45);
    sceneCtrlRef.current?.triggerMazeGate(isCorrect);
    const res = stepMinotaurMazeGate(mazeGatesUnlocked, isCorrect, 4);
    setMazeGatesUnlocked(res.gatesUnlocked);
    setQuestionIdx((i) => i + 1);

    if (res.gateOpened) {
      soundManager.playCorrect();
      showFeedback(
        true,
        `Gerbang Labirin #${res.gatesUnlocked} Terbuka! ${currentQuestion.explanation}`
      );
      if (res.escaped) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Berhasil Keluar dari Labirin Minotaur!',
          subtitle:
            'Seluruh 4 gerbang persimpangan kuno terbuka dan artefak berhasil diamankan!',
          score: sessionScore + 230,
          best: Math.max(
            profile.highScores.labirin_minotaur || 0,
            sessionScore + 230
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      const nextLives = lives - 1;
      setLives(nextLives);
      showFeedback(
        false,
        `Gerbang Terkunci! ${currentQuestion.explanation}`
      );
      if (nextLives <= 0) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Tersesat di Labirin Minotaur!',
          subtitle: `Kamu berhasil membuka ${mazeGatesUnlocked}/4 gerbang. Coba lagi!`,
          score: sessionScore,
          best: Math.max(profile.highScores.labirin_minotaur || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 11: Panahan Katapel Fisika Handler
  const handleAnswerCatapultShot = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 40, 45);
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    sceneCtrlRef.current?.triggerCatapultShot(optionIdx, isCorrect, nextQ);
    setQuestionIdx(nextIdx);
    const letters = ['A', 'B', 'C', 'D'];

    if (isCorrect) {
      soundManager.playCorrect();
      const nextHits = catapultHits + 1;
      setCatapultHits(nextHits);
      showFeedback(
        true,
        `Katapel Tepat Sasaran Papan ${letters[optionIdx]}! (${nextHits}/5) · ${currentQuestion.explanation}`
      );
      if (nextHits >= 5) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Master Katapel Fisika Parabola!',
          subtitle:
            'Kelima papan target jawaban berhasil dirobohkan dengan lintasan parabola sempurna!',
          score: sessionScore + 240,
          best: Math.max(
            profile.highScores.panahan_katapel || 0,
            sessionScore + 240
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      showFeedback(
        false,
        `Tembakan Papan ${letters[optionIdx]} Meleset! ${currentQuestion.explanation}`
      );
    }
  };

  // Mode 12: Sirkuit Logika (Robot Coder 3D) Handlers
  const handleEnqueueRobotCmd = (cmd: RobotCommandType) => {
    setRobotQueue((prev) => (prev.length < 10 ? [...prev, cmd] : prev));
    soundManager.playStep();
  };

  const handleLoadRobotPresetStation = (stationIdx: number) => {
    const preset = buildProgramToStation(stationIdx);
    setRobotQueue(preset);
    soundManager.playStep();
    const letters = ['A', 'B', 'C', 'D'];
    showFeedback(
      true,
      `Rute Algoritma ke Stasiun Baterai ${letters[stationIdx]} dimuat (${preset.length} langkah). Klik JALANKAN PROGRAM!`
    );
  };

  const handleClearRobotQueue = () => {
    setRobotQueue([]);
    sceneCtrlRef.current?.resetRobotCoder();
  };

  const handleRunRobotProgram = () => {
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    const simRes = sceneCtrlRef.current?.runRobotCoderProgram(
      robotQueue,
      currentQuestion.answerIndex,
      nextQ
    );
    const isCorrect = Boolean(simRes?.isCorrect);
    awardPlayerProgress(isCorrect, 45, 50);
    const letters = ['A', 'B', 'C', 'D'];

    if (isCorrect) {
      soundManager.playCorrect();
      const nextSolved = robotSolvedCount + 1;
      setRobotSolvedCount(nextSolved);
      setQuestionIdx(nextIdx);
      showFeedback(
        true,
        `Program Sukses! Robot Mengisi Stasiun Baterai ${letters[currentQuestion.answerIndex]} (${nextSolved}/5) · ${currentQuestion.explanation}`
      );
      if (nextSolved >= 5) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Master Algoritma Sirkuit Logika!',
          subtitle:
            'Robot Coder 3D berhasil mengeksekusi seluruh 5 misi stasiun baterai tanpa menabrak laser!',
          score: sessionScore + 250,
          best: Math.max(
            profile.highScores.sirkuit_logika || 0,
            sessionScore + 250
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      const nextLives = lives - 1;
      setLives(nextLives);
      const reason = simRes?.hitLaser
        ? 'Robot menabrak Dinding Laser Merah!'
        : simRes?.reachedStationIndex !== null &&
          simRes?.reachedStationIndex !== undefined
        ? `Robot mendarat di Stasiun ${letters[simRes.reachedStationIndex]} yang salah!`
        : 'Robot belum sampai di Stasiun Baterai jawaban!';
      showFeedback(false, `${reason} ${currentQuestion.explanation}`);
      if (nextLives <= 0) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Korsleting Sirkuit Robot Coder!',
          subtitle:
            'Baterai cadangan habis. Susun kembali antrean perintah Maju, Belok, dan Lompat Laser!',
          score: sessionScore,
          best: Math.max(profile.highScores.sirkuit_logika || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 13: Selam Samudra (Submarine Sonar 3D) Handler
  const handleAnswerSubmarineChest = (chestIdx: number) => {
    const isCorrect = chestIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 45, 50);
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    sceneCtrlRef.current?.triggerSubmarineChest(chestIdx, isCorrect, nextQ);
    const res = stepSubmarineSonar(
      submarineStats.oxygenLives,
      submarineStats.chestsOpened,
      chestIdx,
      currentQuestion.answerIndex,
      5
    );
    setSubmarineStats({
      chestsOpened: res.chestsOpened,
      oxygenLives: res.oxygenLives
    });
    setQuestionIdx(nextIdx);
    const letters = ['A', 'B', 'C', 'D'];

    if (isCorrect) {
      soundManager.playCoin();
      showFeedback(
        true,
        `Peti Harta ${letters[chestIdx]} Terbuka! Gelembung Koin Emas Melimpah (${res.chestsOpened}/5) · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Kapten Sonar Samudra Dalam!',
          subtitle:
            'Kelima Peti Harta Karun Palung Samudra berhasil ditemukan oleh Kapal Selam Kuningmu!',
          score: sessionScore + 250,
          best: Math.max(
            profile.highScores.selam_samudra || 0,
            sessionScore + 250
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      showFeedback(
        false,
        `Sengatan Ubur-Ubur Listrik di Peti ${letters[chestIdx]}! Oksigen ${res.oxygenLives}/3 · ${currentQuestion.explanation}`
      );
      if (res.defeat) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Tekanan Oksigen Kapal Selam Habis!',
          subtitle:
            'Kapal selam terlalu sering tersengat ubur-ubur penjaga peti. Ayo menyelam kembali!',
          score: sessionScore,
          best: Math.max(profile.highScores.selam_samudra || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 14: Koki Kimia (Lab Eksperimen 3D) Handler
  const handleAnswerChemTube = (tubeIdx: number) => {
    const isCorrect = tubeIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 45, 50);
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    sceneCtrlRef.current?.triggerChemPour(tubeIdx, isCorrect, nextQ);
    const res = stepChemLabExperiment(
      chemStats.synthesizedCount,
      chemStats.labLives,
      tubeIdx,
      currentQuestion.answerIndex,
      5
    );
    setChemStats({
      synthesizedCount: res.experimentsDone,
      labLives: res.safetyLives
    });
    setQuestionIdx(nextIdx);
    const tubeSpec = CHEM_TUBE_SPECS[tubeIdx] || CHEM_TUBE_SPECS[0];

    if (isCorrect) {
      soundManager.playCorrect();
      showFeedback(
        true,
        `Reaksi Tabung ${tubeSpec.label} (${tubeSpec.name}) Berhasil! Kristal Emas Terbentuk (${res.experimentsDone}/5) · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Profesor Koki Kimia Terbaik!',
          subtitle:
            'Kelima formula kimia berhasil disintesis menjadi Kristal Emas Murni di Labu Erlenmeyer!',
          score: sessionScore + 250,
          best: Math.max(
            profile.highScores.koki_kimia || 0,
            sessionScore + 250
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      showFeedback(
        false,
        `Ledakan Asap Hitam dari Tabung ${tubeSpec.label}! Keamanan Lab ${res.safetyLives}/3 · ${currentQuestion.explanation}`
      );
      if (res.defeat) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Laboratorium Penuh Asap Hitam!',
          subtitle:
            'Tiga kali salah mencampur cairan kimia. Bersihkan Labu Erlenmeyer dan coba lagi!',
          score: sessionScore,
          best: Math.max(profile.highScores.koki_kimia || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 15: Ekspedisi Pinisi (Peta Nusantara 3D) Handler
  const handleAnswerPinisiIsland = (islandIdx: number) => {
    const isCorrect = islandIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 45, 50);
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    sceneCtrlRef.current?.triggerPinisiIsland(islandIdx, isCorrect, nextQ);
    const res = stepPinisiVoyage(
      pinisiStats.islandsVisited,
      pinisiStats.hullLives,
      islandIdx,
      currentQuestion.answerIndex,
      5
    );
    setPinisiStats({
      islandsVisited: res.islandsVisited,
      hullLives: res.hullLives,
      windTimeLeft: isCorrect
        ? Math.min(60, pinisiStats.windTimeLeft + 5)
        : Math.max(10, pinisiStats.windTimeLeft - 5)
    });
    setQuestionIdx(nextIdx);
    const isl = PINISI_ISLAND_COORDS[islandIdx] || PINISI_ISLAND_COORDS[0];

    if (isCorrect) {
      soundManager.playCorrect();
      showFeedback(
        true,
        `Kapal Pinisi Berlabuh di ${isl.name}! (${res.islandsVisited}/5) · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Nakhoda Agung Ekspedisi Pinisi!',
          subtitle:
            'Kapal Pinisi berhasil mengarungi ombak Nusantara dan berlabuh di 5 Pulau Budaya dengan selamat!',
          score: sessionScore + 260,
          best: Math.max(
            profile.highScores.ekspedisi_pinisi || 0,
            sessionScore + 260
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playWrong();
      showFeedback(
        false,
        `Terjebak Pusaran Air di sekitar ${isl.name}! Lambung ${res.hullLives}/3 · ${currentQuestion.explanation}`
      );
      if (res.defeat) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Kapal Pinisi Terhadang Pusaran Air!',
          subtitle:
            'Lambung kapal butuh perbaikan di galangan. Ayo berlayar kembali melintasi Nusantara!',
          score: sessionScore,
          best: Math.max(
            profile.highScores.ekspedisi_pinisi || 0,
            sessionScore
          )
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 16: Penjaga Gawang Pintar (3D Goalie Reflex) Handler
  const handleAnswerGoalieZone = (zoneIdx: number) => {
    const isCorrect = zoneIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 45, 50);
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    sceneCtrlRef.current?.triggerGoalieKick(
      zoneIdx,
      currentQuestion.answerIndex,
      nextQ
    );
    const res = stepGoaliePenalty(
      goalieStats.saves,
      goalieStats.conceded,
      zoneIdx,
      currentQuestion.answerIndex,
      5,
      3
    );
    setGoalieStats({
      saves: res.saves,
      conceded: res.goalsConceded,
      shotCountdown: 6
    });
    setQuestionIdx(nextIdx);
    const zone = GOALIE_ZONE_SPECS[zoneIdx] || GOALIE_ZONE_SPECS[0];

    if (res.saved) {
      soundManager.playGoalieWhistleAndKick(true);
      showFeedback(
        true,
        `Tepisan Akrobatik Kiper di ${zone.name}! (${res.saves}/5) · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Kiper Emas Stadion Nusantara!',
          subtitle:
            'Kelima tendangan melengkung Robot Striker berhasil ditepis dengan refleks luar biasa!',
          score: sessionScore + 260,
          best: Math.max(
            profile.highScores.penjaga_gawang || 0,
            sessionScore + 260
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playGoalieWhistleAndKick(false);
      showFeedback(
        false,
        `Bola Menembus Jaring Gawang! Kebobolan ${res.goalsConceded}/3 · ${currentQuestion.explanation}`
      );
      if (res.defeat) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Gawang Kebobolan 3 Kali!',
          subtitle:
            'Robot Striker memenangkan adu penalti. Baca soal dan kunci sudut lompatan lebih cepat!',
          score: sessionScore,
          best: Math.max(profile.highScores.penjaga_gawang || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 17: Pabrik Sortir (3D Conveyor Belt Sorter) Handler
  const handleAnswerConveyorChute = (chuteIdx: number) => {
    const isCorrect = chuteIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 45, 50);
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    sceneCtrlRef.current?.triggerConveyorRoute(chuteIdx, isCorrect, nextQ);
    const res = stepConveyorSorter(
      sorterStats.sortedCount,
      sorterStats.alarmsCount,
      chuteIdx,
      currentQuestion.answerIndex,
      5,
      3
    );
    setSorterStats({
      sortedCount: res.sortedCount,
      alarmsCount: res.alarmsTriggered
    });
    setQuestionIdx(nextIdx);
    const chute = CONVEYOR_CHUTE_SPECS[chuteIdx] || CONVEYOR_CHUTE_SPECS[0];

    if (res.passedStamp) {
      soundManager.playFactoryStampOrAlarm(true);
      showFeedback(
        true,
        `Stempel LULUS di ${chute.name}! (${res.sortedCount}/5) · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Manajer Otomasi Pabrik Sortir!',
          subtitle:
            'Seluruh 5 kargo ekspedisi berhasil diarahkan oleh Switch Gate dan dicap LULUS!',
          score: sessionScore + 260,
          best: Math.max(
            profile.highScores.pabrik_sortir || 0,
            sessionScore + 260
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playFactoryStampOrAlarm(false);
      showFeedback(
        false,
        `Alarm Merah menyala di ${chute.name}! Kargo masuk Daur Ulang (${res.alarmsTriggered}/3) · ${currentQuestion.explanation}`
      );
      if (res.defeat) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Jalur Conveyor Belt Terhenti!',
          subtitle:
            'Terlalu banyak kargo salah jalur. Kalibrasi ulang Switch Gate dan coba lagi!',
          score: sessionScore,
          best: Math.max(profile.highScores.pabrik_sortir || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 18: Tebak Bangun & Bayangan (3D Prism & Laser Caster) Handlers
  const handleAimPrismMonument = (monumentIdx: number) => {
    setPrismStats((prev) => ({ ...prev, aimedIndex: monumentIdx }));
    sceneCtrlRef.current?.aimPrismMonument(monumentIdx);
    soundManager.playStep();
  };

  const handleFirePrismLaser = () => {
    const aimedIdx = prismStats.aimedIndex;
    const isCorrect = aimedIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 45, 50);
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    sceneCtrlRef.current?.triggerPrismLaser(aimedIdx, isCorrect, nextQ);
    const res = stepPrismLaserCast(
      prismStats.portalsOpened,
      prismStats.shieldLives,
      aimedIdx,
      currentQuestion.answerIndex,
      5
    );
    setPrismStats((prev) => ({
      ...prev,
      portalsOpened: res.portalsOpened,
      shieldLives: res.shieldEnergy
    }));
    setQuestionIdx(nextIdx);
    const mon = PRISM_MONUMENT_SPECS[aimedIdx] || PRISM_MONUMENT_SPECS[0];

    if (res.refractedRainbow) {
      soundManager.playPrismLaser(true);
      showFeedback(
        true,
        `Bias Pelangi dari ${mon.name} Membuka Portal! (${res.portalsOpened}/5) · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Penjaga Kuil Prisma Cahaya!',
          subtitle:
            'Kelima Monumen Kristal Geometri membiaskan spektrum pelangi ke kubah kuil!',
          score: sessionScore + 260,
          best: Math.max(
            profile.highScores.tebak_bangun || 0,
            sessionScore + 260
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playPrismLaser(false);
      showFeedback(
        false,
        `Sinar Laser Memantul dari ${mon.name}! Perisai Optik ${res.shieldEnergy}/3 · ${currentQuestion.explanation}`
      );
      if (res.defeat) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Perisai Meriam Prisma Retak!',
          subtitle:
            'Sinar laser memantul kembali tiga kali. Perhatikan bangun ruang pada monumen kristal!',
          score: sessionScore,
          best: Math.max(profile.highScores.tebak_bangun || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 19: Tarik Tambang Juara (3D Versus Tug-of-War) Handler
  const handleAnswerTugOfWar = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 45, 50);
    const nextIdx = questionIdx + 1;
    const res = resolveTugOfWarAnswer(tugStats.ropeOffset, isCorrect);
    sceneCtrlRef.current?.triggerTugOfWarPull(res.ropeOffset, isCorrect);
    setTugStats((prev) => ({
      ropeOffset: res.ropeOffset,
      pullsCount: prev.pullsCount + (isCorrect ? 1 : 0)
    }));
    setQuestionIdx(nextIdx);

    if (isCorrect) {
      soundManager.playTugPull(true);
      showFeedback(
        true,
        `POWER PULL! Tim Kita Menarik Tambang ke Kiri (${res.ropeOffset.toFixed(1)}m) · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Juara Tarik Tambang Arena Lava!',
          subtitle:
            'Tim karaktermu berhasil menarik Tim Robot melewati garis kemenangan!',
          score: sessionScore + 270,
          best: Math.max(
            profile.highScores.tarik_tambang || 0,
            sessionScore + 270
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playTugPull(false);
      showFeedback(
        false,
        `Terpeleset! Tim Robot Menarik Pita Merah (${res.ropeOffset.toFixed(1)}m) · ${currentQuestion.explanation}`
      );
      if (res.defeat) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Tambang Tertarik ke Sisi Robot!',
          subtitle:
            'Pita merah melewati batas platform kanan. Ayo gabungkan tenaga dan tarik kembali!',
          score: sessionScore,
          best: Math.max(profile.highScores.tarik_tambang || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Mode 20: Arena Boss Akhir (Raksasa Ilmu 3D) Handler
  const handleAnswerBossPillar = (pillarIdx: number) => {
    const isCorrect = pillarIdx === currentQuestion.answerIndex;
    awardPlayerProgress(isCorrect, 55, 65);
    const nextIdx = questionIdx + 1;
    const nextQ = activeQuestions[nextIdx % activeQuestions.length];
    const res = stepBossBattleAttack(
      bossStats.bossHp,
      bossStats.playerHp,
      bossStats.comboCount,
      pillarIdx,
      currentQuestion.answerIndex
    );
    sceneCtrlRef.current?.triggerBossPillarAttack(
      pillarIdx,
      isCorrect,
      res.isUltimateBeam,
      res.victory,
      nextQ
    );
    setBossStats({
      bossHp: res.bossHp,
      playerHp: res.playerHp,
      comboCount: res.comboCount
    });
    setQuestionIdx(nextIdx);
    const pillar = BOSS_PILLAR_SPECS[pillarIdx] || BOSS_PILLAR_SPECS[0];

    if (isCorrect) {
      soundManager.playBossRoarOrBeam(res.isUltimateBeam, true);
      showFeedback(
        true,
        res.isUltimateBeam
          ? `ULTIMATE BEAM 3× COMBO dari ${pillar.name}! HP Golem Sisa ${res.bossHp}% · ${currentQuestion.explanation}`
          : `Bola Energi ${pillar.name} Menghantam Inti Golem! HP Boss ${res.bossHp}% · ${currentQuestion.explanation}`
      );
      if (res.victory) {
        soundManager.playLevelUp();
        setOutcomeSnapshot({
          type: 'victory',
          title: 'Golem Raksasa Ilmu Berhasil Ditaklukkan!',
          subtitle:
            'Peti Harta Karun Abadi Terbuka di tengah Colosseum! Kamu menamatkan tantangan puncak EDUVERSE 3D!',
          score: sessionScore + 320,
          best: Math.max(
            profile.highScores.arena_boss || 0,
            sessionScore + 320
          )
        });
        setShellState('gameover');
      }
    } else {
      soundManager.playBossRoarOrBeam(false, false);
      showFeedback(
        false,
        `Golem Menghantam Arena! Perisai ${res.playerHp}/3 · ${currentQuestion.explanation}`
      );
      if (res.defeat) {
        setOutcomeSnapshot({
          type: 'defeat',
          title: 'Kewalahan Menghadapi Golem Raksasa Ilmu!',
          subtitle:
            'Perisai energimu habis terkena gelombang kejut Golem. Bangkit kembali di Colosseum!',
          score: sessionScore,
          best: Math.max(profile.highScores.arena_boss || 0, sessionScore)
        });
        setShellState('gameover');
      }
    }
  };

  // Wardrobe Uniform & Accessory Handlers
  const handleSelectUniform = (id: CostumeUniformId) => {
    const item = UNIFORM_ITEMS.find((u) => u.id === id);
    if (!item) return;
    setProfile((prev) => {
      const unlocked = prev.unlockedUniforms.includes(id);
      if (!unlocked && prev.coins < item.cost) return prev;
      const nextCoins = unlocked ? prev.coins : prev.coins - item.cost;
      const nextUnlocked = unlocked
        ? prev.unlockedUniforms
        : [...prev.unlockedUniforms, id];
      sceneCtrlRef.current?.setWardrobe(id, prev.accessories);
      soundManager.playCoin();
      return {
        ...prev,
        coins: nextCoins,
        uniform: id,
        unlockedUniforms: nextUnlocked
      };
    });
  };

  const handleToggleAccessory = (id: AccessoryId) => {
    const item = ACCESSORY_ITEMS.find((a) => a.id === id);
    if (!item) return;
    setProfile((prev) => {
      const unlocked = prev.unlockedAccessories.includes(id);
      if (!unlocked && prev.coins < item.cost) return prev;
      const nextCoins = unlocked ? prev.coins : prev.coins - item.cost;
      const nextUnlocked = unlocked
        ? prev.unlockedAccessories
        : [...prev.unlockedAccessories, id];
      const equipped = prev.accessories.includes(id);
      const nextAccessories = equipped
        ? prev.accessories.filter((a) => a !== id)
        : [...prev.accessories, id];
      sceneCtrlRef.current?.setWardrobe(prev.uniform, nextAccessories);
      soundManager.playCoin();
      return {
        ...prev,
        coins: nextCoins,
        accessories: nextAccessories,
        unlockedAccessories: nextUnlocked
      };
    });
  };

  const xpProgress = getXpProgressInLevel(profile.xp);
  const activeBiomeObj =
    BIOMES.find((b) => b.id === currentBiome) || BIOMES[0];

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Dedicated WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        data-testid="webgl-canvas-container"
        className="fixed inset-0 w-full h-full z-0"
      />

      {/* TITLE SCREEN OVERLAY */}
      {shellState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenMiniGames={() => setOpenModal('minigames')}
          onOpenTeacherMode={() => setOpenModal('teacher')}
          activePackTitle={questionPack.title}
          questionCount={questionPack.questions.length}
        />
      )}

      {/* PLAYING HUD OVERLAY */}
      {shellState !== 'title' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between">
          {/* TOP BAR HUD: Profile, XP Bar, Coins, Wardrobe, World Switcher, 20 Mini-Games, Mode Guru */}
          <div className="p-3 sm:px-5 flex flex-wrap items-center justify-between gap-2 pointer-events-auto bg-slate-950/90 border-b border-slate-800/90">
            {/* Left: Player Avatar Badge, Name, Level & XP Progress, Coins */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpenModal('wardrobe')}
                aria-label="Profil Pelajar dan Lemari Gaya"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-bold font-display flex items-center justify-center text-sm">
                  L{profile.level}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight">
                    {profile.name}
                  </div>
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>
              </button>

              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 font-mono-num whitespace-nowrap">
                {profile.coins} Koin · {profile.xp} XP
              </div>

              <div className="hidden 2xl:flex items-center gap-1.5 text-xs text-slate-300 font-mono-num">
                <span>Mode: {activeSlot.title}</span>
                <span aria-hidden="true">·</span>
                <span>Dunia: {activeBiomeObj.name}</span>
                <span aria-hidden="true">·</span>
                <span>Buku: {profile.collectedBooks.length}/5</span>
              </div>
            </div>

            {/* Right: Core Action Buttons + Utility Icons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOpenModal('wardrobe')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 cursor-pointer whitespace-nowrap"
              >
                Lemari Gaya
              </button>
              <button
                type="button"
                onClick={() => setOpenModal('biome')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-300 cursor-pointer whitespace-nowrap"
              >
                Pilih Dunia ({activeBiomeObj.name})
              </button>
              <button
                type="button"
                onClick={() => setOpenModal('minigames')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                20 Mini-Games
              </button>
              <button
                type="button"
                onClick={() => setOpenModal('materi')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-700/70 text-xs font-semibold text-purple-300 cursor-pointer whitespace-nowrap"
              >
                Ruang Materi
              </button>
              <button
                type="button"
                onClick={() => setOpenModal('scorecard')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-600/70 text-xs font-semibold text-amber-300 cursor-pointer whitespace-nowrap"
              >
                Kartu Nilai
              </button>
              <button
                type="button"
                onClick={() => setOpenModal('teacher')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-700/70 text-xs font-semibold text-cyan-300 cursor-pointer whitespace-nowrap"
              >
                Mode Guru
              </button>

              {/* Compact SVG Utility Buttons (Mute [M] & Pause [P]) */}
              <button
                type="button"
                tabIndex={-1}
                aria-label={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  const m = soundManager.toggleMute();
                  setIsMuted(m);
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  {isMuted ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Jeda Permainan"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShellState((s) => (s === 'paused' ? 'playing' : 'paused'));
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* ACTIVE MINI-GAME INTERACTIVE HUD */}
          <ActiveModeHud
            mode={activeSlot.engineId}
            activeSlotTitle={activeSlot.title}
            currentQuestion={currentQuestion}
            streak={streak}
            lives={lives}
            feedbackBanner={feedbackBanner}
            hubQuizModal={hubQuizModal}
            onCloseHubQuiz={() => setHubQuizModal(null)}
            onAnswerHubQuiz={handleAnswerHubQuiz}
            runnerStats={runnerStats}
            onRunnerShiftLane={(dir) =>
              sceneCtrlRef.current?.shiftRunnerLane(dir)
            }
            onRunnerJump={() => sceneCtrlRef.current?.triggerJumpOrAction()}
            towerFloor={towerFloor}
            onAnswerTower={handleAnswerTower}
            unlockedClues={unlockedClues}
            activeTkpId={activeTkpId}
            onSelectTkp={(id) => setActiveTkpId(id)}
            onAnswerTkpQuestion={handleAnswerTkpQuestion}
            onSolveMysteryCulprit={handleSolveMysteryCulprit}
            pasarCustomerIdx={pasarCustomerIdx}
            pasarServedCount={pasarServedCount}
            onAnswerPasarOrder={handleAnswerPasarOrder}
            bridgeStep={bridgeStep}
            onAnswerBridgeStep={handleAnswerBridgeStep}
            castleStats={castleStats}
            onAnswerCastleDefense={handleAnswerCastleDefense}
            rocketStats={rocketStats}
            onAnswerRocketRing={handleAnswerRocketRing}
            architectStats={architectStats}
            onAnswerArchitectBlock={handleAnswerArchitectBlock}
            mazeGatesUnlocked={mazeGatesUnlocked}
            onAnswerMazeGate={handleAnswerMazeGate}
            catapultHits={catapultHits}
            onAimCatapult={(idx) => sceneCtrlRef.current?.aimCatapult(idx)}
            onAnswerCatapultShot={handleAnswerCatapultShot}
            robotQueue={robotQueue}
            robotSolvedCount={robotSolvedCount}
            onEnqueueRobotCmd={handleEnqueueRobotCmd}
            onLoadRobotPresetStation={handleLoadRobotPresetStation}
            onClearRobotQueue={handleClearRobotQueue}
            onRunRobotProgram={handleRunRobotProgram}
            submarineStats={submarineStats}
            onAnswerSubmarineChest={handleAnswerSubmarineChest}
            chemStats={chemStats}
            onAnswerChemTube={handleAnswerChemTube}
            pinisiStats={pinisiStats}
            onAnswerPinisiIsland={handleAnswerPinisiIsland}
            goalieStats={goalieStats}
            onAnswerGoalieZone={handleAnswerGoalieZone}
            sorterStats={sorterStats}
            onAnswerConveyorChute={handleAnswerConveyorChute}
            prismStats={prismStats}
            onAimPrismMonument={handleAimPrismMonument}
            onFirePrismLaser={handleFirePrismLaser}
            tugStats={tugStats}
            onAnswerTugOfWar={handleAnswerTugOfWar}
            bossStats={bossStats}
            onAnswerBossPillar={handleAnswerBossPillar}
          />

          {/* MOBILE / TOUCH VIRTUAL JOYSTICK & ACTION BUTTON + COLLAPSIBLE BOTTOM DOCK */}
          <div className="relative flex flex-col items-center pb-3 px-4">
            {/* Touch D-Pad & Jump Button for Mobile/Tablet */}
            <div className="w-full flex items-end justify-between mb-2 sm:hidden pointer-events-auto">
              <div className="grid grid-cols-3 gap-1 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800">
                <div />
                <button
                  type="button"
                  onPointerDown={() =>
                    sceneCtrlRef.current?.setVirtualJoystick(0, -1)
                  }
                  onPointerUp={() =>
                    sceneCtrlRef.current?.setVirtualJoystick(0, 0)
                  }
                  className="w-10 h-10 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center"
                >
                  ▲
                </button>
                <div />
                <button
                  type="button"
                  onPointerDown={() => {
                    if (activeSlot.engineId === 'lari_kilat') {
                      sceneCtrlRef.current?.shiftRunnerLane(-1);
                    } else {
                      sceneCtrlRef.current?.setVirtualJoystick(-1, 0);
                    }
                  }}
                  onPointerUp={() =>
                    sceneCtrlRef.current?.setVirtualJoystick(0, 0)
                  }
                  className="w-10 h-10 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onPointerDown={() =>
                    sceneCtrlRef.current?.setVirtualJoystick(0, 1)
                  }
                  onPointerUp={() =>
                    sceneCtrlRef.current?.setVirtualJoystick(0, 0)
                  }
                  className="w-10 h-10 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onPointerDown={() => {
                    if (activeSlot.engineId === 'lari_kilat') {
                      sceneCtrlRef.current?.shiftRunnerLane(1);
                    } else {
                      sceneCtrlRef.current?.setVirtualJoystick(1, 0);
                    }
                  }}
                  onPointerUp={() =>
                    sceneCtrlRef.current?.setVirtualJoystick(0, 0)
                  }
                  className="w-10 h-10 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center"
                >
                  ▶
                </button>
              </div>

              <button
                type="button"
                onClick={() => sceneCtrlRef.current?.triggerJumpOrAction()}
                className="px-5 py-4 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg"
              >
                LOMPAT / AKSI
              </button>
            </div>

            {/* Collapsible Bottom Control Dock (Cinema / Zen Mode Toggle) */}
            <div className="pointer-events-auto flex flex-col items-center max-w-[min(1280px,97vw)] w-full">
              <button
                type="button"
                onClick={() => setDockCollapsed((c) => !c)}
                className="px-3.5 py-1 rounded-t-lg bg-slate-950/90 border border-b-0 border-slate-800 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                {dockCollapsed
                  ? '▴ Tampilkan Dock 20 Mode Utama [H]'
                  : '▾ Sembunyikan Kontrol [H]'}
              </button>

              {!dockCollapsed && (
                <div className="w-full p-2 rounded-2xl bg-slate-950/92 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-1.5">
                  {/* Quick Switcher for All 20 Core Playable 3D Modes */}
                  <div className="flex flex-wrap items-center gap-1">
                    {MINI_GAME_REGISTRY.map((slot) => {
                      const isCurrent = activeSlot.engineId === slot.engineId;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSwitchMiniGameSlot(slot)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                          }`}
                        >
                          {slot.slot}. {slot.title}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Hub Quiz Action when in Jelajah Dunia */}
                  {activeSlot.engineId === 'jelajah_dunia' && (
                    <button
                      type="button"
                      onClick={() =>
                        setHubQuizModal({
                          open: true,
                          title: `Kuis Cepat ${activeBiomeObj.name}`,
                          subject: 'Semua'
                        })
                      }
                      className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                    >
                      Ujian Cepat Gedung Mapel
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {shellState === 'paused' && (
        <div
          role="dialog"
          aria-label="Permainan Dijeda"
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto"
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-center space-y-4">
            <h2 className="text-2xl font-bold text-white font-display">
              Permainan Dijeda
            </h2>
            <p className="text-xs text-slate-300">
              Mode Aktif: {activeSlot.title} · Dunia: {activeBiomeObj.name}
            </p>
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono-num">
              <div>
                <div className="text-xs text-slate-400">Skor Sesi</div>
                <div className="text-lg font-bold text-amber-400">
                  {sessionScore}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Total Koin</div>
                <div className="text-lg font-bold text-emerald-400">
                  {profile.coins}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                Lanjutkan Main [P / Esc]
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMiniGameSlot(activeSlot)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
              >
                Ulangi Mode Ini
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-sm cursor-pointer"
              >
                Kembali ke Layar Judul
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / GAME OVER MODAL WITH 3D CANVAS CERTIFICATE & WA SHARE */}
      {shellState === 'gameover' && outcomeSnapshot && (
        <div
          role="dialog"
          aria-label={outcomeSnapshot.title}
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/90 pointer-events-auto overflow-y-auto"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-amber-500/70 p-5 sm:p-6 shadow-2xl text-center space-y-4 my-auto">
            <div className="text-xs font-bold tracking-wider text-amber-400 uppercase">
              {outcomeSnapshot.type === 'victory'
                ? 'MISI BERHASIL DITAKLUKKAN · KARTU HASIL BELAJAR 3D'
                : 'MISI BELUM TUNTAS · KARTU HASIL BELAJAR 3D'}
            </div>
            <h2 className="text-2xl font-bold text-white font-display">
              {outcomeSnapshot.title}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {outcomeSnapshot.subtitle}
            </p>

            {/* Canvas-to-Image Kartu Hasil Belajar & Share WA */}
            <ScoreCardCertificate
              studentName={profile.name}
              level={profile.level}
              xp={profile.xp}
              coins={profile.coins}
              packTitle={questionPack.title}
              subject={questionPack.subject}
              grade={questionPack.grade}
              author={questionPack.author}
              teacherWhatsapp={questionPack.teacherWhatsapp}
              gameTitle={activeSlot.title}
              score={outcomeSnapshot.score}
              bestScore={outcomeSnapshot.best}
              status={outcomeSnapshot.type}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={() => handleSwitchMiniGameSlot(activeSlot)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                Main Lagi Sekarang
              </button>
              <button
                type="button"
                onClick={() => {
                  setShellState('playing');
                  setOpenModal('minigames');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
              >
                Pilih Mini-Game Lain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE MODALS */}
      {openModal === 'minigames' && (
        <MiniGamesModal
          activeSlotId={activeSlot.id}
          highScores={profile.highScores}
          onSelectSlot={handleSwitchMiniGameSlot}
          onClose={() => setOpenModal(null)}
        />
      )}

      {openModal === 'wardrobe' && (
        <WardrobeModal
          profile={profile}
          onSelectUniform={handleSelectUniform}
          onToggleAccessory={handleToggleAccessory}
          onUpdateName={(name) => setProfile((p) => ({ ...p, name }))}
          onClose={() => setOpenModal(null)}
        />
      )}

      {openModal === 'biome' && (
        <BiomeModal
          currentBiome={currentBiome}
          onSelectBiome={(b) => {
            setCurrentBiome(b);
            sceneCtrlRef.current?.setBiome(b);
          }}
          onClose={() => setOpenModal(null)}
        />
      )}

      {openModal === 'materi' && (
        <StudentMaterialModal
          pack={questionPack}
          onClose={() => setOpenModal(null)}
        />
      )}

      {openModal === 'scorecard' && (
        <div
          role="dialog"
          aria-label="Kartu Hasil Belajar 3D"
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/90 pointer-events-auto overflow-y-auto"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-amber-500/70 p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  SERTIFIKAT & REKAP SKOR WHATSAPP
                </div>
                <h2 className="text-xl font-bold text-white font-display">
                  Kartu Hasil Belajar 3D ({activeSlot.title})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Tutup [Esc]
              </button>
            </div>

            <ScoreCardCertificate
              studentName={profile.name}
              level={profile.level}
              xp={profile.xp}
              coins={profile.coins}
              packTitle={questionPack.title}
              subject={questionPack.subject}
              grade={questionPack.grade}
              author={questionPack.author}
              teacherWhatsapp={questionPack.teacherWhatsapp}
              gameTitle={activeSlot.title}
              score={
                outcomeSnapshot?.score ??
                Math.max(sessionScore, profile.highScores[activeSlot.engineId] || 0)
              }
              bestScore={
                Math.max(
                  sessionScore,
                  profile.highScores[activeSlot.engineId] || 0
                )
              }
              status="victory"
            />
          </div>
        </div>
      )}

      {openModal === 'teacher' && (
        <TeacherModal
          activePack={questionPack}
          onApplyPack={(pack) => setQuestionPack(pack)}
          onResetDefault={() => setQuestionPack(DEFAULT_QUESTION_PACK)}
          onOpenStudentMaterial={() => setOpenModal('materi')}
          onClose={() => setOpenModal(null)}
        />
      )}
    </main>
  );
}
