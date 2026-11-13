import {
  AccessoryId,
  AuraId,
  BiomeId,
  CostumeUniformId,
  DEFAULT_QUESTION_PACK,
  DETECTIVE_CASES,
  DetectiveCase,
  PetId,
  PlayableGameId,
  PropWeaponId,
  QuestionItem,
  QuestionPack,
  ThemeColorId
} from './questions';
import {
  BOSS_PILLAR_SPECS,
  CHEM_TUBE_SPECS,
  CONVEYOR_CHUTE_SPECS,
  GOALIE_ZONE_SPECS,
  PASAR_CHALLENGES,
  PINISI_ISLAND_COORDS,
  PRISM_MONUMENT_SPECS,
  RobotCommandType,
  RobotStepKeyframe,
  getQuestionsBySubject,
  simulateRobotProgram
} from './rules';
import { JuiceManager, computeDynamicDifficulty } from './JuiceEngine';
import {
  BIOME_PIXEL_PALETTES,
  PixelParticle2D,
  drawCanvasTargetReticle,
  drawDetailedObject2D,
  drawIsoBlock,
  drawPixelSignLabel,
  drawPixelStudentAvatar,
  worldToIsoScreen
} from './IsoPixelEngine';
import { soundManager } from './sound';

export interface SceneCallbacks {
  onOpenBuildingQuiz: (subject: string, buildingTitle: string) => void;
  onOpenNpcDialog: (npcName: string, subject: string) => void;
  onCollectBook: (bookId: string, subject: string) => void;
  onRunnerGateHit: (chosenIndex: number, isCorrect: boolean) => void;
  onRunnerStatsUpdate: (stats: {
    distance: number;
    coins: number;
    lives: number;
    gooseDistance: number;
    activePowerUp: string | null;
  }) => void;
  onRunnerGameOver: (distance: number, coins: number) => void;
  onInspectTkp: (tkpId: number) => void;
  onBridgeStepClick: (optionIndex: number) => void;
  onBatch2OptionClick?: (optionIndex: number) => void;
}

interface IsoBuildingSpec {
  id: string;
  title: string;
  subject: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  topColor: string;
  leftColor: string;
  rightColor: string;
  accentColor: string;
}

interface IsoNpcSpec {
  id: string;
  name: string;
  role: string;
  subject: string;
  x: number;
  z: number;
  shirtHex: string;
}

const ISO_BUILDINGS: IsoBuildingSpec[] = [
  {
    id: 'b_math',
    title: 'Menara Matematika',
    subject: 'Matematika',
    x: -10,
    z: -8,
    w: 96,
    d: 48,
    h: 92,
    topColor: '#38bdf8',
    leftColor: '#0284c7',
    rightColor: '#0369a1',
    accentColor: '#38bdf8'
  },
  {
    id: 'b_science',
    title: 'Kubah Sains & Kimia',
    subject: 'Sains',
    x: 10,
    z: -8,
    w: 96,
    d: 48,
    h: 86,
    topColor: '#34d399',
    leftColor: '#059669',
    rightColor: '#047857',
    accentColor: '#10b981'
  },
  {
    id: 'b_history',
    title: 'Museum Nusantara',
    subject: 'Sejarah',
    x: -11,
    z: 8,
    w: 96,
    d: 48,
    h: 80,
    topColor: '#fbbf24',
    leftColor: '#d97706',
    rightColor: '#b45309',
    accentColor: '#f59e0b'
  },
  {
    id: 'b_lang',
    title: 'Balai Bahasa & Sastra',
    subject: 'Bahasa',
    x: 11,
    z: 8,
    w: 96,
    d: 48,
    h: 80,
    topColor: '#f472b6',
    leftColor: '#db2777',
    rightColor: '#9d174d',
    accentColor: '#ec4899'
  },
  {
    id: 'b_code',
    title: 'Pusat Sirkuit Koding',
    subject: 'Coding',
    x: 0,
    z: -14,
    w: 110,
    d: 56,
    h: 108,
    topColor: '#a78bfa',
    leftColor: '#7c3aed',
    rightColor: '#5b21b6',
    accentColor: '#8b5cf6'
  }
];

const ISO_NPCS: IsoNpcSpec[] = [
  {
    id: 'npc_budi',
    name: 'Pak Guru Budi',
    role: 'Wali Kelas Matematika',
    subject: 'Matematika',
    x: -4.5,
    z: -3.5,
    shirtHex: '#0284c7'
  },
  {
    id: 'npc_siti',
    name: 'Kak Siti Peneliti',
    role: 'Mentor Laboratorium Sains',
    subject: 'Sains',
    x: 5,
    z: -3,
    shirtHex: '#059669'
  },
  {
    id: 'npc_aris',
    name: 'Nakhoda Aris',
    role: 'Sejarawan Bahari Nusantara',
    subject: 'Sejarah',
    x: -4,
    z: 4.5,
    shirtHex: '#d97706'
  },
  {
    id: 'npc_dewi',
    name: 'Kak Dewi Koding',
    role: 'Arsitek Algoritma',
    subject: 'Coding',
    x: 4.5,
    z: 4.5,
    shirtHex: '#7c3aed'
  }
];

interface ClickHotspot {
  id: string;
  screenX: number;
  screenY: number;
  radius: number;
  action: () => void;
}

export class SceneController {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private uniform: CostumeUniformId = 'sd';
  private accessories: AccessoryId[] = ['topi_sekolah', 'tas_ransel'];
  private aura: AuraId = 'none';
  private pet: PetId = 'none';
  private propWeapon: PropWeaponId = 'none';
  private themeColor: ThemeColorId = 'klasik';
  private pack: QuestionPack = DEFAULT_QUESTION_PACK;
  private currentBiome: BiomeId = 'kota_ilmu';
  private activeGame: PlayableGameId = 'jelajah_dunia';

  private rafId: number | null = null;
  private lastTime = 0;
  private elapsedTime = 0;
  private isPaused = false;
  private isTitleTour = true;
  private wardrobeShowcaseActive = false;

  // Player Isometric State
  private playerX = 0;
  private playerZ = 3;
  private playerY = 0;
  private playerVy = 0;
  private playerVx = 0;
  private playerVz = 0;
  private walkPhase = 0;
  private squashX = 1;
  private squashY = 1;

  // Controls
  private keys: Record<string, boolean> = {};
  private joystickVec = { x: 0, y: 0 };
  private hotspots: ClickHotspot[] = [];

  // Juice, Fever & Particles
  private juiceManager = new JuiceManager();
  private feverActive = false;
  private currentScore = 0;
  private currentStreak = 0;
  private particles: PixelParticle2D[] = [];
  private floatingTexts: {
    id: string;
    text: string;
    color: string;
    x: number;
    y: number;
    life: number;
    maxLife: number;
  }[] = [];

  private books: {
    id: string;
    x: number;
    z: number;
    subject: string;
    collected: boolean;
  }[] = [
    { id: 'bk_1', x: -6, z: 0, subject: 'Sains', collected: false },
    { id: 'bk_2', x: 6, z: 0, subject: 'Sejarah', collected: false },
    { id: 'bk_3', x: 0, z: -6, subject: 'Matematika', collected: false },
    { id: 'bk_4', x: 0, z: 7, subject: 'Coding', collected: false },
    { id: 'bk_5', x: 7, z: -6, subject: 'Bahasa', collected: false }
  ];

  // Mini-Game Shared Question & Specific States
  private activeQuestion: QuestionItem = DEFAULT_QUESTION_PACK.questions[0];

  // #2 Lari Kilat
  private runnerLane = 1;
  private runnerDistance = 0;
  private runnerSpeed = 18;
  private runnerCoins = 0;
  private runnerLives = 3;
  private runnerGooseDist = 12;
  private runnerGateZ = -32;
  private runnerPowerup: string | null = null;

  // #3 Jatuh Bangun
  private towerFloor = 0;

  // #4 Detektif Kota
  private detectiveCase: DetectiveCase = DETECTIVE_CASES[0];
  private unlockedTkps: number[] = [];

  // #5 Pasar Nusantara
  private pasarIndex = 0;

  // #6 Jembatan Juara
  private bridgeStep = 0;

  // #7 Pertahanan Kastil
  private castleMonsterProgress = 0;
  private castleCannonFlash = 0;

  // #8 Balap Roket
  private rocketX = 0;
  private rocketY = 0;
  private rocketRingFlash = 0;

  // #9 Arsitek Menara
  private architectFloors = 1;
  private architectTilt = 0;

  // #10 Labirin Minotaur
  private mazeStage = 0;

  // #11 Panahan Katapel
  private catapultArcT = 0;
  private catapultTargetIdx = 0;

  // #12 Sirkuit Logika
  private robotCol = 2;
  private robotRow = 3;
  private robotKeyframes: RobotStepKeyframe[] = [];

  // #13 Selam Samudra
  private subSonarPulse = 0;
  private subTargetChest = -1;

  // #14 Koki Kimia
  private chemPourTube = -1;
  private chemPourTimer = 0;

  // #15 Ekspedisi Pinisi
  private pinisiShipX = 0;
  private pinisiShipZ = 0;

  // #16 Penjaga Gawang
  private goalieDiveZone = -1;
  private goalieBallT = 0;

  // #17 Pabrik Sortir
  private conveyorGateIdx = 0;

  // #18 Tebak Bangun
  private prismAimIdx = 0;
  private prismLaserTimer = 0;

  // #19 Tarik Tambang
  private tugRopeOffset = 0;

  // #20 Arena Boss
  private bossHitFlash = 0;
  private bossBeamPillar = -1;
  private bossUltimateActive = false;

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'w-full h-full block cursor-pointer select-none';
    this.canvas.style.imageRendering = 'pixelated';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.ctx = context;

    for (let i = 0; i < 120; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        color: '#facc15',
        life: 0,
        maxLife: 1,
        gravity: 260
      });
    }

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);

    this.pickRandomQuestion();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private handleResize = (): void => {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(320, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(240, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    this.keys[code] = true;

    if (this.activeGame === 'lari_kilat') {
      if (code === 'KeyA' || code === 'ArrowLeft') {
        this.shiftRunnerLane(-1);
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        this.shiftRunnerLane(1);
      } else if (code === 'Space') {
        this.triggerJumpOrAction();
      }
    } else if (code === 'Space') {
      this.triggerJumpOrAction();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private handlePointerDown = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    for (const spot of this.hotspots) {
      const dx = px - spot.screenX;
      const dy = py - spot.screenY;
      if (dx * dx + dy * dy <= spot.radius * spot.radius) {
        spot.action();
        return;
      }
    }
  };

  private pickRandomQuestion(subject?: string): QuestionItem {
    const list = getQuestionsBySubject(this.pack, subject);
    const q = list[Math.floor(Math.random() * list.length)] || list[0];
    this.activeQuestion = q;
    return q;
  }

  // ==========================================================================
  // PUBLIC API FOR APP.TSX
  // ==========================================================================

  public setQuestionPack(pack: QuestionPack): void {
    this.pack = pack;
    this.pickRandomQuestion();
  }

  public setWardrobe(
    uniform: CostumeUniformId,
    accessories: AccessoryId[],
    extra?: {
      aura?: AuraId;
      pet?: PetId;
      propWeapon?: PropWeaponId;
      themeColor?: ThemeColorId;
    }
  ): void {
    this.uniform = uniform;
    this.accessories = accessories;
    if (extra) {
      if (extra.aura !== undefined) this.aura = extra.aura;
      if (extra.pet !== undefined) this.pet = extra.pet;
      if (extra.propWeapon !== undefined) this.propWeapon = extra.propWeapon;
      if (extra.themeColor !== undefined) this.themeColor = extra.themeColor;
    }
  }

  private getExtraLoadout() {
    return {
      aura: this.aura,
      pet: this.pet,
      propWeapon: this.propWeapon,
      themeColor: this.themeColor
    };
  }

  public setTitleTour(active: boolean): void {
    this.isTitleTour = active;
  }

  public setWardrobeInspection(active: boolean): void {
    this.wardrobeShowcaseActive = active;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public setBiome(biome: BiomeId): void {
    this.currentBiome = biome;
    soundManager.startAmbient(biome);
  }

  public setVirtualJoystick(x: number, z: number): void {
    this.joystickVec = { x, y: z };
  }

  public shiftRunnerLane(dir: -1 | 1): void {
    this.runnerLane = Math.max(0, Math.min(3, this.runnerLane + dir));
    soundManager.playStep();
  }

  public triggerJumpOrAction(): void {
    if (this.playerY <= 0.05) {
      this.playerVy = 8.5;
      this.squashX = 1.22;
      this.squashY = 0.78;
      soundManager.playJump();
      this.spawnPixelBurst(0, -10, '#e2e8f0', 10);
    }
  }

  private cameraZoom = 1.0;

  public setCameraZoom(zoomDelta: number): void {
    this.cameraZoom = Math.max(0.65, Math.min(1.85, Number((this.cameraZoom + zoomDelta).toFixed(2))));
  }

  public resetCameraZoom(): void {
    this.cameraZoom = 1.0;
  }

  public getCameraZoom(): number {
    return this.cameraZoom;
  }

  public triggerInteractAction(): void {
    // 1. If in runner mode or jumping, trigger jump
    if (this.activeGame === 'lari_kilat') {
      this.triggerJumpOrAction();
      return;
    }

    // 2. In Open-World Hub, check if near any building, NPC, or book
    if (this.activeGame === 'jelajah_dunia') {
      for (const b of ISO_BUILDINGS) {
        const dist = Math.hypot(this.playerX - b.x, this.playerZ - b.z);
        if (dist < 5.5) {
          this.callbacks.onOpenBuildingQuiz(b.subject, b.title);
          soundManager.playCoin();
          return;
        }
      }
      for (const npc of ISO_NPCS) {
        const dist = Math.hypot(this.playerX - npc.x, this.playerZ - npc.z);
        if (dist < 4.0) {
          this.callbacks.onOpenNpcDialog(npc.name, npc.subject);
          soundManager.playCoin();
          return;
        }
      }
      for (const bk of this.books) {
        if (!bk.collected) {
          const dist = Math.hypot(this.playerX - bk.x, this.playerZ - bk.z);
          if (dist < 3.0) {
            bk.collected = true;
            soundManager.playCoin();
            this.callbacks.onCollectBook(bk.id, bk.subject);
            return;
          }
        }
      }
    }

    // Default: trigger jump or action squish
    this.triggerJumpOrAction();
  }

  public updateRunnerQuestionGate(nextQ: QuestionItem): void {
    this.activeQuestion = nextQ;
  }

  public aimCatapult(optionIdx: number): void {
    this.catapultTargetIdx = optionIdx;
  }

  public triggerAnswerFeedbackParticles(
    isCorrect: boolean,
    streak: number,
    xpDelta = 30,
    score = 0
  ): void {
    this.currentStreak = streak;
    this.currentScore = score;
    this.feverActive = streak >= 3;
    soundManager.setFeverMode(this.feverActive);

    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;

    if (isCorrect) {
      this.juiceManager.triggerHitStop(0.08, 0.12);
      this.squashX = 0.85;
      this.squashY = 1.22;
      this.spawnPixelBurst(0, -24, '#facc15', 22);
      const label =
        streak >= 3
          ? `+${xpDelta} XP! FEVER x${streak}!`
          : `+${xpDelta} XP! TEPAT!`;
      this.floatingTexts.push({
        id: `ft-${Date.now()}`,
        text: label,
        color: streak >= 3 ? '#22d3ee' : '#fde047',
        x: w * 0.5,
        y: h * 0.42,
        life: 0,
        maxLife: 1.1
      });
    } else {
      this.juiceManager.triggerHitStop(0.06, 0.2);
      this.squashX = 1.25;
      this.squashY = 0.75;
      this.spawnPixelBurst(0, -18, '#ef4444', 18);
      this.floatingTexts.push({
        id: `ft-${Date.now()}`,
        text: 'KURANG TEPAT!',
        color: '#f87171',
        x: w * 0.5,
        y: h * 0.45,
        life: 0,
        maxLife: 1.0
      });
    }
  }

  public setMode(
    mode: PlayableGameId,
    initialQuestion?: QuestionItem,
    pack?: QuestionPack
  ): void {
    if (pack) {
      this.pack = pack;
    }
    this.activeGame = mode;
    this.playerX = 0;
    this.playerZ = 3;
    this.playerY = 0;
    this.playerVy = 0;
    this.activeQuestion = initialQuestion || this.pickRandomQuestion();

    // Reset mode-specific states
    this.runnerLane = 1;
    this.runnerDistance = 0;
    this.runnerCoins = 0;
    this.runnerLives = 3;
    this.runnerSpeed = 18;
    this.runnerGooseDist = 12;
    this.runnerGateZ = -28;
    this.towerFloor = 0;
    this.bridgeStep = 0;
    this.castleMonsterProgress = 0;
    this.architectFloors = 1;
    this.architectTilt = 0;
    this.mazeStage = 0;
    this.robotCol = 2;
    this.robotRow = 3;
    this.robotKeyframes = [];
    this.tugRopeOffset = 0;
    this.bossHitFlash = 0;
    this.bossBeamPillar = -1;
  }

  public setTowerFloorVisual(nextFloor: number, fell: boolean): void {
    this.towerFloor = nextFloor;
    this.spawnPixelBurst(0, -20, fell ? '#ef4444' : '#22c55e', 18);
  }

  public resolveBridgeStepVisual(
    stepIdx: number,
    _chosenIdx: number,
    panelSolid: boolean
  ): void {
    this.bridgeStep = panelSolid ? stepIdx + 1 : stepIdx;
    this.spawnPixelBurst(0, -15, panelSolid ? '#38bdf8' : '#ef4444', 16);
  }

  public triggerCastleCannon(isCorrect: boolean): void {
    this.castleCannonFlash = 0.5;
    if (isCorrect) {
      this.castleMonsterProgress = 0;
      this.spawnPixelBurst(80, -20, '#f97316', 24);
    }
  }

  public triggerRocketRing(
    optionIdx: number,
    isCorrect: boolean,
    nextQ: QuestionItem
  ): void {
    this.rocketRingFlash = 0.45;
    const angles = [-0.8, 0.8, -0.4, 0.4];
    this.rocketX = Math.sin(angles[optionIdx] || 0) * 90;
    this.rocketY = (optionIdx < 2 ? -1 : 1) * 35;
    this.activeQuestion = nextQ;
    this.spawnPixelBurst(
      this.rocketX,
      this.rocketY,
      isCorrect ? '#22d3ee' : '#ef4444',
      20
    );
  }

  public triggerArchitectDrop(
    isCorrect: boolean,
    tiltAngle: number,
    _offsetX: number
  ): void {
    if (isCorrect) {
      this.architectFloors += 1;
    }
    this.architectTilt = tiltAngle;
    this.spawnPixelBurst(0, -35, isCorrect ? '#facc15' : '#ef4444', 18);
  }

  public triggerMazeGate(isCorrect: boolean): void {
    if (isCorrect) {
      this.mazeStage += 1;
    }
    this.spawnPixelBurst(0, -20, isCorrect ? '#10b981' : '#ef4444', 18);
  }

  public triggerCatapultShot(
    optionIdx: number,
    isCorrect: boolean,
    nextQ: QuestionItem
  ): void {
    this.catapultTargetIdx = optionIdx;
    this.catapultArcT = 0.01;
    this.activeQuestion = nextQ;
    this.spawnPixelBurst(0, -25, isCorrect ? '#f59e0b' : '#ef4444', 20);
  }

  public resetRobotCoder(): void {
    this.robotCol = 2;
    this.robotRow = 3;
    this.robotKeyframes = [];
  }

  public runRobotCoderProgram(
    queue: RobotCommandType[],
    answerIndex: number,
    nextQ: QuestionItem
  ): ReturnType<typeof simulateRobotProgram> & { isCorrect: boolean } {
    const sim = simulateRobotProgram(2, 3, 0, queue);
    this.robotKeyframes = sim.keyframes;
    this.robotCol = sim.finalCol;
    this.robotRow = sim.finalRow;
    const isCorrect =
      sim.reachedStationIndex === answerIndex && !sim.hitLaser;
    if (isCorrect) {
      this.activeQuestion = nextQ;
    }
    this.spawnPixelBurst(0, -18, isCorrect ? '#a855f7' : '#ef4444', 18);
    return { ...sim, isCorrect };
  }

  public triggerSubmarineChest(
    chestIdx: number,
    isCorrect: boolean,
    nextQ: QuestionItem
  ): void {
    this.subTargetChest = chestIdx;
    this.subSonarPulse = 1.0;
    this.activeQuestion = nextQ;
    this.spawnPixelBurst(0, -15, isCorrect ? '#06b6d4' : '#ef4444', 20);
  }

  public triggerChemPour(
    tubeIdx: number,
    isCorrect: boolean,
    nextQ: QuestionItem
  ): void {
    this.chemPourTube = tubeIdx;
    this.chemPourTimer = 0.8;
    this.activeQuestion = nextQ;
    this.spawnPixelBurst(0, -30, isCorrect ? '#ec4899' : '#ef4444', 24);
  }

  public triggerPinisiIsland(
    islandIdx: number,
    isCorrect: boolean,
    nextQ: QuestionItem
  ): void {
    const target = PINISI_ISLAND_COORDS[islandIdx] || PINISI_ISLAND_COORDS[0];
    this.pinisiShipX = target.x * 0.35;
    this.pinisiShipZ = target.z * 0.35;
    this.activeQuestion = nextQ;
    this.spawnPixelBurst(0, -20, isCorrect ? '#14b8a6' : '#ef4444', 20);
  }

  public triggerGoalieKick(
    zoneIdx: number,
    answerIndex: number,
    nextQ: QuestionItem
  ): void {
    const isCorrect = zoneIdx === answerIndex;
    this.goalieDiveZone = zoneIdx;
    this.goalieBallT = 1.0;
    this.activeQuestion = nextQ;
    soundManager.playGoalieWhistleAndKick(isCorrect);
    this.spawnPixelBurst(0, -25, isCorrect ? '#22c55e' : '#ef4444', 22);
  }

  public triggerConveyorRoute(
    chuteIdx: number,
    isCorrect: boolean,
    nextQ: QuestionItem
  ): void {
    this.conveyorGateIdx = chuteIdx;
    this.activeQuestion = nextQ;
    soundManager.playFactoryStampOrAlarm(isCorrect);
    this.spawnPixelBurst(0, -20, isCorrect ? '#f97316' : '#ef4444', 20);
  }

  public aimPrismMonument(monumentIdx: number): void {
    this.prismAimIdx = monumentIdx;
  }

  public triggerPrismLaser(
    aimedIdx: number,
    isCorrect: boolean,
    nextQ: QuestionItem
  ): void {
    this.prismAimIdx = aimedIdx;
    this.prismLaserTimer = 0.75;
    this.activeQuestion = nextQ;
    soundManager.playPrismLaser(isCorrect);
    this.spawnPixelBurst(0, -25, isCorrect ? '#38bdf8' : '#ef4444', 24);
  }

  public triggerTugOfWarPull(ropeOffset: number, isCorrect: boolean): void {
    this.tugRopeOffset = ropeOffset;
    soundManager.playTugPull(isCorrect);
    this.spawnPixelBurst(0, -20, isCorrect ? '#eab308' : '#ef4444', 20);
  }

  public triggerBossPillarAttack(
    pillarIdx: number,
    isCorrect: boolean,
    isUltimateBeam: boolean,
    _victory: boolean,
    nextQ: QuestionItem
  ): void {
    this.bossBeamPillar = pillarIdx;
    this.bossHitFlash = 0.7;
    this.bossUltimateActive = isUltimateBeam;
    this.activeQuestion = nextQ;
    soundManager.playBossRoarOrBeam(isUltimateBeam, isCorrect);
    this.spawnPixelBurst(
      0,
      -40,
      isCorrect ? (isUltimateBeam ? '#22d3ee' : '#f43f5e') : '#ef4444',
      30
    );
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    soundManager.stopAmbient();
  }

  // ==========================================================================
  // PARTICLE ENGINE 2D
  // ==========================================================================

  private spawnPixelBurst(
    offsetX: number,
    offsetY: number,
    color: string,
    count: number
  ): void {
    const cx = (this.canvas.clientWidth || 800) * 0.5 + offsetX;
    const cy = (this.canvas.clientHeight || 600) * 0.52 + offsetY;
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 140;
        p.active = true;
        p.x = cx;
        p.y = cy;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 50;
        p.size = 4 + Math.floor(Math.random() * 4);
        p.color = color;
        p.life = 0;
        p.maxLife = 0.45 + Math.random() * 0.35;
        p.gravity = 260;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  // ==========================================================================
  // MAIN GAME LOOP & UPDATE
  // ==========================================================================

  private loop = (now: number): void => {
    const rawDt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    const dt = this.juiceManager.update(rawDt);
    this.elapsedTime += dt;

    if (!this.isPaused) {
      this.update(dt);
    }
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    // Squash & stretch spring back to (1,1)
    this.squashX += (1 - this.squashX) * Math.min(1, dt * 12);
    this.squashY += (1 - this.squashY) * Math.min(1, dt * 12);

    // Jump vertical physics
    if (this.playerY > 0 || this.playerVy !== 0) {
      this.playerY += this.playerVy * dt;
      this.playerVy -= 24 * dt;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVy = 0;
        this.squashX = 1.18;
        this.squashY = 0.82;
      }
    }

    // Input movement vector
    let moveX = this.joystickVec.x;
    let moveZ = this.joystickVec.y;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    if (this.isTitleTour) {
      this.playerX = Math.sin(this.elapsedTime * 0.4) * 4;
      this.playerZ = Math.cos(this.elapsedTime * 0.4) * 4;
      this.walkPhase += dt * 1.4;
    } else if (
      (this.activeGame === 'jelajah_dunia' ||
        this.activeGame === 'detektif_kota') &&
      !this.wardrobeShowcaseActive
    ) {
      const speed = 7.5;
      this.playerVx = moveX * speed;
      this.playerVz = moveZ * speed;
      this.playerX = Math.max(
        -16,
        Math.min(16, this.playerX + this.playerVx * dt)
      );
      this.playerZ = Math.max(
        -16,
        Math.min(16, this.playerZ + this.playerVz * dt)
      );

      if (len > 0.1) {
        this.walkPhase += dt * 2.2;
      }
    }

    // Update active particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y -= 42 * dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update mode-specific timers
    if (this.activeGame === 'lari_kilat' && !this.isTitleTour) {
      this.updateRunner(dt);
    } else if (this.activeGame === 'pertahanan_kastil') {
      this.castleMonsterProgress =
        (this.castleMonsterProgress + dt * 0.18) % 1;
      if (this.castleCannonFlash > 0) this.castleCannonFlash -= dt;
    } else if (this.activeGame === 'balap_roket') {
      if (this.rocketRingFlash > 0) this.rocketRingFlash -= dt;
      this.rocketX += moveX * 140 * dt;
      this.rocketY += moveZ * 110 * dt;
      this.rocketX = Math.max(-160, Math.min(160, this.rocketX));
      this.rocketY = Math.max(-80, Math.min(80, this.rocketY));
    } else if (this.activeGame === 'panahan_katapel') {
      if (this.catapultArcT > 0) {
        this.catapultArcT += dt * 1.6;
        if (this.catapultArcT >= 1) this.catapultArcT = 0;
      }
    } else if (this.activeGame === 'selam_samudra') {
      if (this.subSonarPulse > 0) {
        this.subSonarPulse = Math.max(0, this.subSonarPulse - dt * 0.8);
      }
    } else if (this.activeGame === 'koki_kimia') {
      if (this.chemPourTimer > 0) {
        this.chemPourTimer = Math.max(0, this.chemPourTimer - dt);
      }
    } else if (this.activeGame === 'penjaga_gawang') {
      if (this.goalieBallT > 0) {
        this.goalieBallT = Math.max(0, this.goalieBallT - dt * 1.4);
      }
    } else if (this.activeGame === 'tebak_bangun') {
      if (this.prismLaserTimer > 0) {
        this.prismLaserTimer = Math.max(0, this.prismLaserTimer - dt);
      }
    } else if (this.activeGame === 'arena_boss') {
      if (this.bossHitFlash > 0) {
        this.bossHitFlash = Math.max(0, this.bossHitFlash - dt);
      }
    }
  }

  private updateRunner(dt: number): void {
    const dda = computeDynamicDifficulty(this.currentScore, this.currentStreak);
    this.runnerSpeed = dda.runnerSpeed;
    this.runnerDistance += this.runnerSpeed * dt;
    this.runnerGateZ += this.runnerSpeed * dt;

    if (this.runnerGateZ >= 4) {
      const q = this.activeQuestion;
      const isCorrect = this.runnerLane === q.answerIndex;
      this.callbacks.onRunnerGateHit(this.runnerLane, isCorrect);
      if (isCorrect) {
        this.runnerCoins += 35;
        this.runnerGooseDist = Math.min(15, this.runnerGooseDist + 2);
      } else {
        this.runnerLives = Math.max(0, this.runnerLives - 1);
        this.runnerGooseDist = Math.max(0, this.runnerGooseDist - 4.5);
        if (this.runnerGooseDist <= 0.5 || this.runnerLives <= 0) {
          this.callbacks.onRunnerGameOver(
            Math.floor(this.runnerDistance),
            this.runnerCoins
          );
        }
      }
      this.runnerGateZ = -32;
    }

    this.callbacks.onRunnerStatsUpdate({
      distance: Math.floor(this.runnerDistance),
      coins: this.runnerCoins,
      lives: this.runnerLives,
      gooseDistance: Math.round(this.runnerGooseDist),
      activePowerUp: this.runnerPowerup
    });
  }

  // ==========================================================================
  // MASTER 2.5D ISOMETRIC PIXEL-ART RENDERER
  // ==========================================================================

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 600;
    this.hotspots = [];

    const palette =
      BIOME_PIXEL_PALETTES[this.currentBiome] ||
      BIOME_PIXEL_PALETTES.kota_ilmu;

    // 1. Retro 16-Bit Sky Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, palette.skyTop);
    grad.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Retro Pixel Horizon Stars
    this.drawPixelAtmosphereBackdrop(ctx, width, height, palette.accentHex);

    ctx.save();
    if (this.cameraZoom !== 1.0) {
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(this.cameraZoom, this.cameraZoom);
      ctx.translate(-width * 0.5, -height * 0.5);
    }
    if (this.wardrobeShowcaseActive) {
      this.drawWardrobeShowcaseScene(ctx, width, height);
    } else {
      switch (this.activeGame) {
        case 'jelajah_dunia':
          this.renderOpenWorldIsoHub(ctx, width, height);
          break;
        case 'lari_kilat':
          this.renderRunnerIso(ctx, width, height);
          break;
        case 'jatuh_bangun':
          this.renderTowerSurvivalIso(ctx, width, height);
          break;
        case 'detektif_kota':
          this.renderDetectiveIso(ctx, width, height);
          break;
        case 'pasar_nusantara':
          this.renderPasarIso(ctx, width, height);
          break;
        case 'jembatan_juara':
          this.renderBridgeIso(ctx, width, height);
          break;
        case 'pertahanan_kastil':
          this.renderCastleDefenseIso(ctx, width, height);
          break;
        case 'balap_roket':
          this.renderRocketFlightIso(ctx, width, height);
          break;
        case 'arsitek_menara':
          this.renderArchitectIso(ctx, width, height);
          break;
        case 'labirin_minotaur':
          this.renderMazeIso(ctx, width, height);
          break;
        case 'panahan_katapel':
          this.renderCatapultIso(ctx, width, height);
          break;
        case 'sirkuit_logika':
          this.renderRobotCoderIso(ctx, width, height);
          break;
        case 'selam_samudra':
          this.renderSubmarineIso(ctx, width, height);
          break;
        case 'koki_kimia':
          this.renderChemLabIso(ctx, width, height);
          break;
        case 'ekspedisi_pinisi':
          this.renderPinisiVoyageIso(ctx, width, height);
          break;
        case 'penjaga_gawang':
          this.renderGoalieIso(ctx, width, height);
          break;
        case 'pabrik_sortir':
          this.renderConveyorIso(ctx, width, height);
          break;
        case 'tebak_bangun':
          this.renderPrismLaserIso(ctx, width, height);
          break;
        case 'tarik_tambang':
          this.renderTugOfWarIso(ctx, width, height);
          break;
        case 'arena_boss':
          this.renderBossBattleIso(ctx, width, height);
          break;
      }
    }
    ctx.restore();

    // 3. Render 16-Bit Pixel Burst Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // 4. Render Floating Combat/Score Texts
    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '900 18px "Plus Jakarta Sans", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#020617';
      ctx.fillText(ft.text, ft.x + 2, ft.y + 2);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private drawPixelAtmosphereBackdrop(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    accentHex: string
  ): void {
    ctx.save();
    for (let i = 0; i < 28; i++) {
      const sx = (i * 137 + Math.floor(this.elapsedTime * 12)) % width;
      const sy = (i * 73) % Math.floor(height * 0.45);
      const pulse = Math.sin(this.elapsedTime * 3 + i) > 0 ? 3 : 2;
      ctx.fillStyle = i % 3 === 0 ? accentHex : 'rgba(255,255,255,0.45)';
      ctx.fillRect(sx, sy, pulse, pulse);
    }
    ctx.restore();
  }

  private drawWardrobeShowcaseScene(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.32;
    const cy = height * 0.62;

    drawIsoBlock(
      ctx,
      cx,
      cy + 24,
      190,
      96,
      26,
      '#27272a',
      '#18181b',
      '#09090b',
      '#52525b'
    );
    drawIsoBlock(
      ctx,
      cx,
      cy + 2,
      140,
      70,
      14,
      '#3f3f46',
      '#27272a',
      '#18181b',
      '#a1a1aa'
    );

    drawPixelStudentAvatar(
      ctx,
      cx,
      cy - 14,
      this.uniform,
      this.accessories,
      this.elapsedTime * 0.6,
      true,
      this.squashX,
      this.squashY,
      5.8,
      this.feverActive,
      this.getExtraLoadout()
    );
  }

  // ==========================================================================
  // #1 OPEN-WORLD HUB: JELAJAH DUNIA (ISOMETRIC 2.5D PIXEL CITY)
  // ==========================================================================

  private renderOpenWorldIsoHub(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const palette = BIOME_PIXEL_PALETTES[this.currentBiome];
    const playerIso = worldToIsoScreen(this.playerX, this.playerZ, 0, 0, 0);
    const originX = width * 0.5 - playerIso.x * 0.65;
    const originY = height * 0.54 - playerIso.y * 0.65;

    // Draw Isometric Tile Checkerboard & Crossroad
    for (let gx = -14; gx <= 14; gx += 2) {
      for (let gz = -14; gz <= 14; gz += 2) {
        const pt = worldToIsoScreen(gx, gz, 0, originX, originY);
        if (
          pt.x < -80 ||
          pt.x > width + 80 ||
          pt.y < -80 ||
          pt.y > height + 80
        ) {
          continue;
        }
        const isRoad = Math.abs(gx) <= 2 || Math.abs(gz) <= 2;
        const isAlt = ((gx + gz) / 2) % 2 === 0;
        const topCol = isRoad
          ? palette.roadTop
          : isAlt
          ? palette.tileTopA
          : palette.tileTopB;
        drawIsoBlock(
          ctx,
          pt.x,
          pt.y,
          128,
          64,
          6,
          topCol,
          palette.tileLeft,
          palette.tileRight,
          isRoad ? palette.roadBorder : 'rgba(2,6,23,0.4)'
        );
      }
    }

    const renderQueue: { depth: number; draw: () => void }[] = [];

    // Central Isometric Fountain / Biome Monument
    const fPt = worldToIsoScreen(0, 0, 0, originX, originY);
    renderQueue.push({
      depth: fPt.depth,
      draw: () => {
        drawIsoBlock(
          ctx,
          fPt.x,
          fPt.y,
          84,
          42,
          18,
          palette.waterA,
          '#0284c7',
          '#0369a1',
          palette.waterB
        );
        const jetH = 26 + Math.sin(this.elapsedTime * 5) * 6;
        drawIsoBlock(
          ctx,
          fPt.x,
          fPt.y - 18,
          28,
          14,
          jetH,
          '#e0f2fe',
          '#38bdf8',
          '#0284c7'
        );
      }
    });

    // 5 Subject Buildings
    for (const b of ISO_BUILDINGS) {
      const bPt = worldToIsoScreen(b.x, b.z, 0, originX, originY);
      const dist = Math.hypot(this.playerX - b.x, this.playerZ - b.z);
      const isNear = dist < 4.8;

      this.hotspots.push({
        id: b.id,
        screenX: bPt.x,
        screenY: bPt.y - b.h * 0.5,
        radius: 56,
        action: () => this.callbacks.onOpenBuildingQuiz(b.subject, b.title)
      });

      renderQueue.push({
        depth: bPt.depth,
        draw: () => {
          drawIsoBlock(
            ctx,
            bPt.x,
            bPt.y,
            b.w,
            b.d,
            b.h,
            b.topColor,
            b.leftColor,
            b.rightColor,
            isNear ? '#22d3ee' : 'rgba(2,6,23,0.85)'
          );
          ctx.fillStyle = '#fef08a';
          for (let wy = 24; wy < b.h - 16; wy += 22) {
            ctx.fillRect(bPt.x - 24, bPt.y - wy, 8, 10);
            ctx.fillRect(bPt.x + 12, bPt.y - wy, 8, 10);
          }
          drawPixelSignLabel(
            ctx,
            bPt.x,
            bPt.y - b.h - 14,
            b.title,
            `[KLIK KUIS ${b.subject.toUpperCase()}]`,
            b.accentColor,
            isNear
          );
        }
      });
    }

    // 4 Interactive NPCs
    for (const npc of ISO_NPCS) {
      const nPt = worldToIsoScreen(npc.x, npc.z, 0, originX, originY);
      const dist = Math.hypot(this.playerX - npc.x, this.playerZ - npc.z);
      const isNear = dist < 3.2;

      this.hotspots.push({
        id: npc.id,
        screenX: nPt.x,
        screenY: nPt.y - 28,
        radius: 38,
        action: () => this.callbacks.onOpenNpcDialog(npc.name, npc.subject)
      });

      renderQueue.push({
        depth: nPt.depth,
        draw: () => {
          drawPixelStudentAvatar(
            ctx,
            nPt.x,
            nPt.y,
            'batik',
            ['kacamata'],
            this.elapsedTime * 0.4,
            false,
            1,
            1,
            2.8,
            false
          );
          drawPixelSignLabel(
            ctx,
            nPt.x,
            nPt.y - 64,
            npc.name,
            npc.role,
            npc.shirtHex,
            isNear
          );
        }
      });
    }

    // Collectible Knowledge Books
    for (const bk of this.books) {
      if (bk.collected) continue;
      const dist = Math.hypot(this.playerX - bk.x, this.playerZ - bk.z);
      if (dist < 1.8 && !this.isTitleTour) {
        bk.collected = true;
        soundManager.playCoin();
        this.callbacks.onCollectBook(bk.id, bk.subject);
        continue;
      }
      const bkPt = worldToIsoScreen(
        bk.x,
        bk.z,
        0.5 + Math.sin(this.elapsedTime * 4) * 0.25,
        originX,
        originY
      );
      this.hotspots.push({
        id: bk.id,
        screenX: bkPt.x,
        screenY: bkPt.y - 12,
        radius: 30,
        action: () => {
          bk.collected = true;
          soundManager.playCoin();
          this.callbacks.onCollectBook(bk.id, bk.subject);
        }
      });
      renderQueue.push({
        depth: bkPt.depth,
        draw: () => {
          drawIsoBlock(
            ctx,
            bkPt.x,
            bkPt.y,
            26,
            14,
            16,
            '#fde047',
            '#eab308',
            '#ca8a04',
            '#ffffff'
          );
          drawPixelSignLabel(
            ctx,
            bkPt.x,
            bkPt.y - 26,
            `BUKU ${bk.subject.toUpperCase()}`,
            '+30 Koin',
            '#facc15',
            false
          );
        }
      });
    }

    // Player Avatar
    const pScreen = worldToIsoScreen(
      this.playerX,
      this.playerZ,
      this.playerY,
      originX,
      originY
    );
    renderQueue.push({
      depth: pScreen.depth + 0.1,
      draw: () => {
        drawPixelStudentAvatar(
          ctx,
          pScreen.x,
          pScreen.y,
          this.uniform,
          this.accessories,
          this.walkPhase,
          Math.hypot(this.playerVx, this.playerVz) > 0.2 || this.isTitleTour,
          this.squashX,
          this.squashY,
          3.4,
          this.feverActive,
          this.getExtraLoadout()
        );
      }
    });

    renderQueue.sort((a, b) => a.depth - b.depth);
    for (const item of renderQueue) {
      item.draw();
    }
  }

  // ==========================================================================
  // #2 LARI KILAT (ISOMETRIC 4-LANE RUNNER + GIANT GOOSE MODEL)
  // ==========================================================================

  private renderRunnerIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.62;

    const laneColors = ['#0284c7', '#0369a1', '#0284c7', '#0369a1'];
    for (let l = 0; l < 4; l++) {
      const lx = cx + (l - 1.5) * 92;
      drawIsoBlock(
        ctx,
        lx,
        cy + 40,
        84,
        320,
        14,
        laneColors[l],
        '#0f172a',
        '#1e293b',
        '#38bdf8'
      );

      const gateProgress = (this.runnerGateZ + 32) / 36;
      const gy = cy - 150 + gateProgress * 170;
      const labels = ['1/A', '2/B', '3/C', '4/D'];
      const gateColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

      drawIsoBlock(
        ctx,
        lx,
        gy,
        68,
        24,
        48,
        gateColors[l],
        '#1e293b',
        '#0f172a',
        '#ffffff'
      );
      drawCanvasTargetReticle(
        ctx,
        lx,
        gy - 22,
        labels[l],
        gateColors[l],
        this.elapsedTime,
        this.runnerLane === l
      );

      this.hotspots.push({
        id: `lane_${l}`,
        screenX: lx,
        screenY: cy,
        radius: 48,
        action: () => {
          this.runnerLane = l;
        }
      });
    }

    const playerLaneX = cx + (this.runnerLane - 1.5) * 92;
    drawPixelStudentAvatar(
      ctx,
      playerLaneX,
      cy + 20 - this.playerY * 14,
      this.uniform,
      this.accessories,
      this.elapsedTime * 3.5,
      true,
      this.squashX,
      this.squashY,
      3.5,
      this.feverActive,
      this.getExtraLoadout()
    );

    // Chasing Giant Goose Model behind player
    drawDetailedObject2D(
      ctx,
      'goose',
      playerLaneX,
      cy + 105,
      '#ffffff',
      this.elapsedTime,
      1.15
    );
  }

  // ==========================================================================
  // #3 JATUH BANGUN (ISOMETRIC HEXAGONAL 4-FLOOR TOWER)
  // ==========================================================================

  private renderTowerSurvivalIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const baseY = height * 0.78;
    const floorColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#eab308'];

    for (let f = 0; f <= 4; f++) {
      const fy = baseY - f * 68;
      const isCurrent = f === this.towerFloor;
      drawIsoBlock(
        ctx,
        cx,
        fy,
        240 - f * 18,
        110 - f * 8,
        24,
        floorColors[f],
        '#1e293b',
        '#0f172a',
        isCurrent ? '#22d3ee' : '#ffffff'
      );
      drawPixelSignLabel(
        ctx,
        cx - 140,
        fy - 10,
        f === 4 ? 'PUNCAK MAHKOTA' : `LANTAI ${f + 1}`,
        isCurrent ? 'POSISI KAMU' : '',
        floorColors[f],
        isCurrent
      );
    }

    const avatarY = baseY - this.towerFloor * 68 - 26;
    drawPixelStudentAvatar(
      ctx,
      cx,
      avatarY,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      this.squashX,
      this.squashY,
      3.4,
      this.feverActive,
      this.getExtraLoadout()
    );
  }

  // ==========================================================================
  // #4 DETEKTIF KOTA ILMU (ISOMETRIC 4-TKP INVESTIGATION)
  // ==========================================================================

  private renderDetectiveIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.56;
    const tkpCoords = [
      { id: 1, x: -170, y: -60 },
      { id: 2, x: 170, y: -60 },
      { id: 3, x: -170, y: 75 },
      { id: 4, x: 170, y: 75 }
    ];

    drawIsoBlock(
      ctx,
      cx,
      cy + 40,
      520,
      260,
      16,
      '#1e293b',
      '#0f172a',
      '#020617',
      '#8b5cf6'
    );

    for (const tkp of tkpCoords) {
      const unlocked = this.unlockedTkps.includes(tkp.id);
      const tx = cx + tkp.x;
      const ty = cy + tkp.y;
      const tkpInfo = this.detectiveCase.tkpList.find((t) => t.id === tkp.id);

      drawIsoBlock(
        ctx,
        tx,
        ty,
        110,
        56,
        28,
        unlocked ? '#10b981' : '#f59e0b',
        '#1e293b',
        '#0f172a',
        '#ffffff'
      );
      // Draw Witness Person at each TKP
      drawPixelStudentAvatar(
        ctx,
        tx,
        ty - 26,
        tkp.id % 2 === 0 ? 'sma' : 'batik',
        ['kacamata'],
        this.elapsedTime * 0.5,
        false,
        1,
        1,
        2.5,
        false
      );
      drawCanvasTargetReticle(
        ctx,
        tx,
        ty - 46,
        `TKP ${tkp.id}`,
        unlocked ? '#10b981' : '#f59e0b',
        this.elapsedTime,
        !unlocked
      );
      drawPixelSignLabel(
        ctx,
        tx,
        ty - 95,
        tkpInfo?.witness || `Saksi #${tkp.id}`,
        unlocked ? '✓ Bukti' : 'Klik Periksa',
        unlocked ? '#10b981' : '#f59e0b',
        !unlocked
      );

      this.hotspots.push({
        id: `tkp_${tkp.id}`,
        screenX: tx,
        screenY: ty - 20,
        radius: 56,
        action: () => this.callbacks.onInspectTkp(tkp.id)
      });
    }

    drawPixelStudentAvatar(
      ctx,
      cx,
      cy + 10,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      1,
      1,
      3.5,
      this.feverActive,
      this.getExtraLoadout()
    );
  }

  // ==========================================================================
  // #5 PASAR NUSANTARA (ISOMETRIC PIXEL STALL & SCALE)
  // ==========================================================================

  private renderPasarIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.62;
    const order = PASAR_CHALLENGES[this.pasarIndex] || PASAR_CHALLENGES[0];

    drawIsoBlock(
      ctx,
      cx,
      cy + 25,
      340,
      160,
      46,
      '#d97706',
      '#b45309',
      '#78350f',
      '#fde047'
    );

    // Visual Goods & Scales on the market table
    drawDetailedObject2D(ctx, 'parcel', cx - 18, cy - 28, '#f59e0b', this.elapsedTime, 0.85);
    drawDetailedObject2D(ctx, 'flask', cx + 22, cy - 28, '#10b981', this.elapsedTime, 0.7);

    drawPixelStudentAvatar(
      ctx,
      cx - 85,
      cy - 24,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      1,
      1,
      3.6,
      this.feverActive,
      this.getExtraLoadout()
    );
    drawPixelStudentAvatar(
      ctx,
      cx + 85,
      cy - 16,
      'batik',
      ['blangkon'],
      this.elapsedTime * 0.6,
      false,
      1,
      1,
      3.4,
      false
    );

    drawPixelSignLabel(
      ctx,
      cx + 85,
      cy - 92,
      order.customerName,
      order.visualDetail,
      '#10b981',
      true
    );
  }

  // ==========================================================================
  // #6 JEMBATAN JUARA (ISOMETRIC 6-STEP GLASS BRIDGE)
  // ==========================================================================

  private renderBridgeIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const startY = height * 0.78;
    const labels = ['1/A', '2/B', '3/C', '4/D'];

    for (let s = 0; s < 6; s++) {
      const sy = startY - s * 46;
      const isDone = s < this.bridgeStep;
      const isCurrent = s === this.bridgeStep;
      for (let col = 0; col < 4; col++) {
        const px = cx + (col - 1.5) * 86;
        drawIsoBlock(
          ctx,
          px,
          sy,
          68,
          32,
          10,
          isDone ? '#10b981' : isCurrent ? '#38bdf8' : '#1e293b',
          '#0284c7',
          '#0369a1',
          isCurrent ? '#fde047' : '#38bdf8'
        );
        if (isCurrent) {
          drawCanvasTargetReticle(
            ctx,
            px,
            sy - 6,
            labels[col],
            '#38bdf8',
            this.elapsedTime,
            true
          );
          this.hotspots.push({
            id: `bridge_${col}`,
            screenX: px,
            screenY: sy,
            radius: 38,
            action: () => this.callbacks.onBridgeStepClick(col)
          });
        }
      }
    }

    const playerY = startY - Math.min(5, this.bridgeStep) * 46 - 14;
    drawPixelStudentAvatar(
      ctx,
      cx,
      playerY,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      this.squashX,
      this.squashY,
      3.2,
      this.feverActive,
      this.getExtraLoadout()
    );
  }

  // ==========================================================================
  // #7 PERTAHANAN KASTIL (CASTLE, CANNON MODEL & HORNED MONSTER MODEL)
  // ==========================================================================

  private renderCastleDefenseIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.62;

    drawIsoBlock(
      ctx,
      cx - 180,
      cy + 10,
      130,
      70,
      95,
      '#475569',
      '#334155',
      '#1e293b',
      '#94a3b8'
    );
    drawPixelStudentAvatar(
      ctx,
      cx - 195,
      cy - 86,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      1,
      1,
      3,
      this.feverActive,
      this.getExtraLoadout()
    );
    // Detailed Cannon Model on Castle Wall
    drawDetailedObject2D(ctx, 'cannon', cx - 145, cy - 82, '#38bdf8', this.elapsedTime, 1);

    const mx = cx + 190 - this.castleMonsterProgress * 280;
    drawDetailedObject2D(ctx, 'monster', mx, cy - 5, '#ef4444', this.elapsedTime, 1.25);
    drawCanvasTargetReticle(ctx, mx, cy - 35, 'TARGET', '#ef4444', this.elapsedTime, true);

    if (this.castleCannonFlash > 0) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 125, cy - 88);
      ctx.lineTo(mx, cy - 20);
      ctx.stroke();
    }
  }

  // ==========================================================================
  // #8 BALAP ROKET GALAKSI (SPACE ROCKET MODEL & 4 RING TARGETS)
  // ==========================================================================

  private renderRocketFlightIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.56;
    const quadrants = [
      { label: '1/A', x: -155, y: -55, col: '#ef4444' },
      { label: '2/B', x: 155, y: -55, col: '#3b82f6' },
      { label: '3/C', x: -155, y: 55, col: '#10b981' },
      { label: '4/D', x: 155, y: 55, col: '#f59e0b' }
    ];

    quadrants.forEach((q, idx) => {
      drawCanvasTargetReticle(
        ctx,
        cx + q.x,
        cy + q.y,
        q.label,
        q.col,
        this.elapsedTime,
        true
      );
      this.hotspots.push({
        id: `ring_${idx}`,
        screenX: cx + q.x,
        screenY: cy + q.y,
        radius: 46,
        action: () => this.callbacks.onBatch2OptionClick?.(idx)
      });
    });

    const rx = cx + this.rocketX;
    const ry = cy + this.rocketY;
    drawDetailedObject2D(ctx, 'rocket', rx, ry, '#38bdf8', this.elapsedTime, 1.2);
  }

  // ==========================================================================
  // #9 ARSITEK MENARA (ISOMETRIC BLOCK STACKER + BUILDER AVATAR)
  // ==========================================================================

  private renderArchitectIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const baseY = height * 0.78;
    const blockCols = [
      '#0284c7',
      '#10b981',
      '#f59e0b',
      '#ec4899',
      '#8b5cf6',
      '#eab308'
    ];

    for (let i = 0; i < this.architectFloors; i++) {
      const by = baseY - i * 34;
      const offset = Math.sin(this.architectTilt * (i + 1)) * 14;
      drawIsoBlock(
        ctx,
        cx + offset,
        by,
        140 - i * 6,
        70 - i * 3,
        30,
        blockCols[i % blockCols.length],
        '#1e293b',
        '#0f172a',
        '#ffffff'
      );
    }

    drawPixelStudentAvatar(
      ctx,
      cx - 125,
      baseY,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      1,
      1,
      3.4,
      this.feverActive,
      this.getExtraLoadout()
    );
  }

  // ==========================================================================
  // #10 LABIRIN MINOTAUR (ISOMETRIC DUNGEON GATES)
  // ==========================================================================

  private renderMazeIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.62;
    drawIsoBlock(
      ctx,
      cx,
      cy + 20,
      420,
      210,
      18,
      '#3f2e21',
      '#291d14',
      '#1c130d',
      '#10b981'
    );

    const gates = ['1/A', '2/B', '3/C', '4/D'];
    gates.forEach((g, idx) => {
      const gx = cx + (idx - 1.5) * 95;
      drawIsoBlock(
        ctx,
        gx,
        cy - 25,
        66,
        34,
        58,
        '#10b981',
        '#047857',
        '#064e3b',
        '#fde047'
      );
      drawCanvasTargetReticle(
        ctx,
        gx,
        cy - 54,
        g,
        '#10b981',
        this.elapsedTime,
        true
      );
    });

    drawPixelStudentAvatar(
      ctx,
      cx,
      cy + 15,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      1,
      1,
      3.4,
      this.feverActive,
      this.getExtraLoadout()
    );
  }

  // ==========================================================================
  // #11 PANAHAN KATAPEL FISIKA (SIEGE CATAPULT MODEL & PARABOLIC TARGETS)
  // ==========================================================================

  private renderCatapultIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.64;

    drawDetailedObject2D(
      ctx,
      'catapult',
      cx - 180,
      cy + 6,
      '#d97706',
      this.elapsedTime,
      1.3
    );
    drawPixelStudentAvatar(
      ctx,
      cx - 230,
      cy + 16,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      1,
      1,
      3.1,
      this.feverActive,
      this.getExtraLoadout()
    );

    const cols = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
    const labels = ['1/A', '2/B', '3/C', '4/D'];
    for (let i = 0; i < 4; i++) {
      const tx = cx + 40 + i * 58;
      const ty = cy - 10 + (i % 2) * 28;
      drawIsoBlock(
        ctx,
        tx,
        ty,
        48,
        24,
        42,
        cols[i],
        '#1e293b',
        '#0f172a',
        '#ffffff'
      );
      drawCanvasTargetReticle(
        ctx,
        tx,
        ty - 24,
        labels[i],
        cols[i],
        this.elapsedTime,
        this.catapultTargetIdx === i
      );
      this.hotspots.push({
        id: `catapult_${i}`,
        screenX: tx,
        screenY: ty,
        radius: 36,
        action: () => this.callbacks.onBatch2OptionClick?.(i)
      });
    }

    if (this.catapultArcT > 0) {
      const tx = cx + 40 + this.catapultTargetIdx * 58;
      const bx = cx - 180 + (tx - (cx - 180)) * this.catapultArcT;
      const by = cy - Math.sin(this.catapultArcT * Math.PI) * 140;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(bx, by, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================================================
  // #12 SIRKUIT LOGIKA (6x6 ISOMETRIC ROBOT CODER MODEL)
  // ==========================================================================

  private renderRobotCoderIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const originX = width * 0.5;
    const originY = height * 0.45;
    const cornerCoords = [
      { c: 0, r: 0, label: '1/A' },
      { c: 5, r: 0, label: '2/B' },
      { c: 0, r: 5, label: '3/C' },
      { c: 5, r: 5, label: '4/D' }
    ];

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const pt = worldToIsoScreen(
          (c - 2.5) * 1.4,
          (r - 2.5) * 1.4,
          0,
          originX,
          originY
        );
        const isCorner = (c === 0 || c === 5) && (r === 0 || r === 5);
        drawIsoBlock(
          ctx,
          pt.x,
          pt.y,
          54,
          27,
          10,
          isCorner ? '#10b981' : (c + r) % 2 === 0 ? '#334155' : '#1e293b',
          '#0f172a',
          '#020617',
          isCorner ? '#fde047' : '#475569'
        );
      }
    }

    cornerCoords.forEach((cc, idx) => {
      const pt = worldToIsoScreen(
        (cc.c - 2.5) * 1.4,
        (cc.r - 2.5) * 1.4,
        0.2,
        originX,
        originY
      );
      drawCanvasTargetReticle(ctx, pt.x, pt.y - 8, cc.label, '#10b981', this.elapsedTime, false);
      this.hotspots.push({
        id: `robot_station_${idx}`,
        screenX: pt.x,
        screenY: pt.y,
        radius: 36,
        action: () => this.callbacks.onBatch2OptionClick?.(idx)
      });
    });

    const rPt = worldToIsoScreen(
      (this.robotCol - 2.5) * 1.4,
      (this.robotRow - 2.5) * 1.4,
      0.3,
      originX,
      originY
    );
    drawDetailedObject2D(ctx, 'robot', rPt.x, rPt.y - 6, '#38bdf8', this.elapsedTime, 1.15);
  }

  // ==========================================================================
  // #13 SELAM SAMUDRA (SUBMARINE MODEL & 4 TREASURE CHEST MODELS)
  // ==========================================================================

  private renderSubmarineIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.56;
    const chests = [
      { label: '1/A', x: -160, y: -40 },
      { label: '2/B', x: 160, y: -40 },
      { label: '3/C', x: -160, y: 65 },
      { label: '4/D', x: 160, y: 65 }
    ];

    drawDetailedObject2D(
      ctx,
      'submarine',
      cx,
      cy - 10 + Math.sin(this.elapsedTime * 3) * 8,
      '#facc15',
      this.elapsedTime,
      1.25
    );

    if (this.subSonarPulse > 0) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, (1 - this.subSonarPulse) * 240, 0, Math.PI * 2);
      ctx.stroke();
    }

    chests.forEach((ch, idx) => {
      drawDetailedObject2D(
        ctx,
        'chest',
        cx + ch.x,
        cy + ch.y,
        '#d97706',
        this.elapsedTime,
        1.15
      );
      drawCanvasTargetReticle(
        ctx,
        cx + ch.x,
        cy + ch.y - 10,
        ch.label,
        '#06b6d4',
        this.elapsedTime,
        this.subTargetChest === idx
      );
      this.hotspots.push({
        id: `chest_${idx}`,
        screenX: cx + ch.x,
        screenY: cy + ch.y,
        radius: 44,
        action: () => this.callbacks.onBatch2OptionClick?.(idx)
      });
    });
  }

  // ==========================================================================
  // #14 KOKI KIMIA (CHEMIST AVATAR & 4 GLASS ERLENMEYER FLASKS)
  // ==========================================================================

  private renderChemLabIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.64;
    const labels = ['1/A', '2/B', '3/C', '4/D'];

    drawIsoBlock(
      ctx,
      cx,
      cy + 24,
      380,
      160,
      36,
      '#334155',
      '#1e293b',
      '#0f172a',
      '#38bdf8'
    );

    drawPixelStudentAvatar(
      ctx,
      cx,
      cy - 18,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      1,
      1,
      3.5,
      this.feverActive,
      this.getExtraLoadout()
    );

    CHEM_TUBE_SPECS.forEach((tube, idx) => {
      const tx = cx + (idx - 1.5) * 86;
      const lift =
        this.chemPourTube === idx && this.chemPourTimer > 0 ? -28 : 0;
      drawDetailedObject2D(
        ctx,
        'flask',
        tx,
        cy - 14 + lift,
        tube.cssHex,
        this.elapsedTime,
        1.15
      );
      drawCanvasTargetReticle(
        ctx,
        tx,
        cy - 34 + lift,
        labels[idx],
        tube.cssHex,
        this.elapsedTime,
        this.chemPourTube === idx
      );
      this.hotspots.push({
        id: `tube_${idx}`,
        screenX: tx,
        screenY: cy - 18,
        radius: 42,
        action: () => this.callbacks.onBatch2OptionClick?.(idx)
      });
    });
  }

  // ==========================================================================
  // #15 EKSPEDISI PINISI (PINISI SAILING SHIP MODEL & 4 ISLAND DOCKS)
  // ==========================================================================

  private renderPinisiVoyageIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.56;
    const labels = ['1/A', '2/B', '3/C', '4/D'];

    PINISI_ISLAND_COORDS.forEach((isl, idx) => {
      const ix = cx + (idx % 2 === 0 ? -175 : 175);
      const iy = cy + (idx < 2 ? -55 : 65);
      drawIsoBlock(
        ctx,
        ix,
        iy,
        96,
        48,
        24,
        '#10b981',
        '#047857',
        '#d97706',
        '#fde047'
      );
      drawCanvasTargetReticle(
        ctx,
        ix,
        iy - 16,
        labels[idx],
        '#10b981',
        this.elapsedTime,
        true
      );
      drawPixelSignLabel(
        ctx,
        ix,
        iy - 64,
        isl.name.split(' (')[0],
        '',
        '#10b981',
        false
      );
      this.hotspots.push({
        id: `island_${idx}`,
        screenX: ix,
        screenY: iy,
        radius: 48,
        action: () => this.callbacks.onBatch2OptionClick?.(idx)
      });
    });

    const sx = cx + this.pinisiShipX * 5;
    const sy = cy + this.pinisiShipZ * 3 + Math.sin(this.elapsedTime * 3) * 5;
    drawDetailedObject2D(ctx, 'pinisi', sx, sy, '#f59e0b', this.elapsedTime, 1.3);
  }

  // ==========================================================================
  // #16 PENJAGA GAWANG PINTAR (STADIUM GOALFRAME, KEEPER & SOCCER BALL)
  // ==========================================================================

  private renderGoalieIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.58;
    const labels = ['1/A', '2/B', '3/C', '4/D'];

    drawIsoBlock(
      ctx,
      cx,
      cy + 30,
      440,
      200,
      14,
      '#15803d',
      '#166534',
      '#14532d',
      '#ffffff'
    );

    // Goalpost Frame
    ctx.strokeStyle = '#fafafa';
    ctx.lineWidth = 5;
    ctx.strokeRect(cx - 150, cy - 95, 300, 95);

    GOALIE_ZONE_SPECS.forEach((z, idx) => {
      const zx = cx + (idx % 2 === 0 ? -115 : 115);
      const zy = cy + (idx < 2 ? -68 : -10);
      drawCanvasTargetReticle(
        ctx,
        zx,
        zy,
        labels[idx],
        z.cssHex,
        this.elapsedTime,
        this.goalieDiveZone === idx
      );
      this.hotspots.push({
        id: `goalie_${idx}`,
        screenX: zx,
        screenY: zy,
        radius: 44,
        action: () => this.callbacks.onBatch2OptionClick?.(idx)
      });
    });

    const diveX =
      this.goalieDiveZone >= 0
        ? cx + (this.goalieDiveZone % 2 === 0 ? -90 : 90)
        : cx;
    drawPixelStudentAvatar(
      ctx,
      diveX,
      cy + 6,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      1,
      1,
      3.6,
      this.feverActive,
      this.getExtraLoadout()
    );
    drawDetailedObject2D(ctx, 'soccer_ball', diveX, cy + 32, '#ffffff', this.elapsedTime, 1.1);
  }

  // ==========================================================================
  // #17 PABRIK SORTIR (CONVEYOR PARCELS & 4 CHUTES)
  // ==========================================================================

  private renderConveyorIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.62;
    const labels = ['1/A', '2/B', '3/C', '4/D'];

    drawIsoBlock(
      ctx,
      cx,
      cy + 25,
      360,
      150,
      20,
      '#475569',
      '#334155',
      '#1e293b',
      '#f97316'
    );
    drawDetailedObject2D(ctx, 'parcel', cx, cy + 5, '#d97706', this.elapsedTime, 1.2);

    CONVEYOR_CHUTE_SPECS.forEach((ch, idx) => {
      const chx = cx + (idx - 1.5) * 95;
      drawIsoBlock(
        ctx,
        chx,
        cy - 30,
        68,
        34,
        38,
        ch.cssHex,
        '#1e293b',
        '#0f172a',
        '#ffffff'
      );
      drawCanvasTargetReticle(
        ctx,
        chx,
        cy - 54,
        labels[idx],
        ch.cssHex,
        this.elapsedTime,
        this.conveyorGateIdx === idx
      );
      this.hotspots.push({
        id: `chute_${idx}`,
        screenX: chx,
        screenY: cy - 30,
        radius: 42,
        action: () => this.callbacks.onBatch2OptionClick?.(idx)
      });
    });
  }

  // ==========================================================================
  // #18 TEBAK BANGUN & BAYANGAN (CRYSTAL PRISM MODELS & LASER)
  // ==========================================================================

  private renderPrismLaserIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.58;
    const labels = ['1/A', '2/B', '3/C', '4/D'];

    drawDetailedObject2D(ctx, 'prism', cx, cy - 8, '#38bdf8', this.elapsedTime, 1.3);

    PRISM_MONUMENT_SPECS.forEach((m, idx) => {
      const mx = cx + (idx % 2 === 0 ? -170 : 170);
      const my = cy + (idx < 2 ? -55 : 65);
      drawDetailedObject2D(ctx, 'prism', mx, my - 10, m.cssHex, this.elapsedTime, 1.15);
      drawCanvasTargetReticle(
        ctx,
        mx,
        my - 28,
        labels[idx],
        m.cssHex,
        this.elapsedTime,
        this.prismAimIdx === idx
      );
      this.hotspots.push({
        id: `prism_${idx}`,
        screenX: mx,
        screenY: my,
        radius: 44,
        action: () => this.callbacks.onBatch2OptionClick?.(idx)
      });

      if (this.prismAimIdx === idx && this.prismLaserTimer > 0) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22);
        ctx.lineTo(mx, my - 22);
        ctx.stroke();
      }
    });
  }

  // ==========================================================================
  // #19 TARIK TAMBANG JUARA (VERSUS TUG-OF-WAR TEAMS)
  // ==========================================================================

  private renderTugOfWarIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.62;
    const shift = this.tugRopeOffset * 22;

    drawIsoBlock(
      ctx,
      cx,
      cy + 20,
      440,
      160,
      16,
      '#334155',
      '#1e293b',
      '#0f172a',
      '#eab308'
    );

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 170 + shift, cy - 18);
    ctx.lineTo(cx + 170 + shift, cy - 18);
    ctx.stroke();

    // Center Red Flag on Rope
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 4 + shift, cy - 18, 8, 18);

    // Player Team (2 Avatars)
    drawPixelStudentAvatar(
      ctx,
      cx - 120 + shift,
      cy,
      this.uniform,
      this.accessories,
      this.elapsedTime * 2,
      true,
      1,
      1,
      3.5,
      this.feverActive,
      this.getExtraLoadout()
    );
    drawPixelStudentAvatar(
      ctx,
      cx - 165 + shift,
      cy + 4,
      'pramuka',
      ['topi_pramuka'],
      this.elapsedTime * 2,
      true,
      1,
      1,
      3.1,
      false
    );

    // Rival Robot Team (2 Robots)
    drawDetailedObject2D(ctx, 'robot', cx + 120 + shift, cy - 2, '#ef4444', this.elapsedTime, 1.15);
    drawDetailedObject2D(ctx, 'robot', cx + 165 + shift, cy + 2, '#ef4444', this.elapsedTime, 1.0);
  }

  // ==========================================================================
  // #20 ARENA BOSS AKHIR (COLOSSAL GOLEM BOSS MODEL & 4 ELEMENTAL PILLARS)
  // ==========================================================================

  private renderBossBattleIso(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.58;
    const labels = ['1/A', '2/B', '3/C', '4/D'];

    const shake =
      this.bossHitFlash > 0 ? Math.sin(this.elapsedTime * 50) * 8 : 0;
    drawDetailedObject2D(
      ctx,
      'golem_boss',
      cx + shake,
      cy - 10,
      '#e11d48',
      this.elapsedTime,
      1.25
    );

    BOSS_PILLAR_SPECS.forEach((p, idx) => {
      const px = cx + (idx % 2 === 0 ? -185 : 185);
      const py = cy + (idx < 2 ? -35 : 70);
      drawIsoBlock(
        ctx,
        px,
        py,
        68,
        34,
        56,
        p.cssHex,
        '#1e293b',
        '#0f172a',
        '#ffffff'
      );
      drawCanvasTargetReticle(
        ctx,
        px,
        py - 36,
        labels[idx],
        p.cssHex,
        this.elapsedTime,
        this.bossBeamPillar === idx
      );
      this.hotspots.push({
        id: `pillar_${idx}`,
        screenX: px,
        screenY: py,
        radius: 44,
        action: () => this.callbacks.onBatch2OptionClick?.(idx)
      });

      if (this.bossBeamPillar === idx && this.bossHitFlash > 0) {
        ctx.strokeStyle = this.bossUltimateActive ? '#22d3ee' : p.cssHex;
        ctx.lineWidth = this.bossUltimateActive ? 8 : 4;
        ctx.beginPath();
        ctx.moveTo(px, py - 50);
        ctx.lineTo(cx, cy - 55);
        ctx.stroke();
      }
    });

    drawPixelStudentAvatar(
      ctx,
      cx,
      cy + 85,
      this.uniform,
      this.accessories,
      this.elapsedTime,
      false,
      1,
      1,
      3.5,
      this.feverActive,
      this.getExtraLoadout()
    );
  }
}
