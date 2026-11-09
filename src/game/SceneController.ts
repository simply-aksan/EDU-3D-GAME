import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  AccessoryId,
  BIOMES,
  BiomeId,
  CostumeUniformId,
  DEFAULT_QUESTION_PACK,
  DETECTIVE_CASES,
  PlayableGameId,
  QuestionItem,
  QuestionPack
} from './questions';
import {
  createContactShadowMesh,
  createFountain,
  createGiantGoose,
  createKnowledgeBook,
  createNPCWithMarker,
  createSignTexture,
  createStudentAvatar,
  createSubjectBuilding,
  createVehicle,
  updateAvatarAnimation
} from './models3d';
import {
  ArsitekMenaraGame,
  BalapRoketGame,
  IMiniGameModule,
  LabirinMinotaurGame,
  PanahanKatapelGame,
  PertahananKastilGame
} from './Batch2MiniGames';
import {
  EkspedisiPinisiGame,
  IBatch3MiniGame,
  KokiKimiaGame,
  SelamSamudraGame,
  SirkuitLogikaGame
} from './Batch3MiniGames';
import {
  ArenaBossGame,
  PabrikSortirGame,
  PenjagaGawangGame,
  TarikTambangGame,
  TebakBangunGame
} from './Batch4MiniGames';
import { getLaneX, RobotCommandType, RUNNER_LANES } from './rules';
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

interface MovingVehicleActor {
  mesh: THREE.Group;
  speed: number;
  axis: 'x' | 'z' | 'circle';
  dir: number;
  radius?: number;
  angle?: number;
}

interface RunnerGateGroup {
  group: THREE.Group;
  z: number;
  resolved: boolean;
}

interface RunnerObstacle {
  mesh: THREE.Mesh;
  lane: number;
  z: number;
  type: 'barrier' | 'coin' | 'hoverboard' | 'magnet' | 'lightning';
  active: boolean;
}

export class SceneController {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private activeGroup: THREE.Group;
  private playerAvatar: THREE.Group | null = null;
  private interactables: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();

  private currentBiome: BiomeId = 'kota_ilmu';
  private currentMode: PlayableGameId = 'jelajah_dunia';
  private isTitleTour = true;
  private isPaused = false;

  private uniformId: CostumeUniformId = 'sd';
  private accessories: AccessoryId[] = ['topi_sekolah', 'tas_ransel'];

  // Reusable scratch vectors (Zero-GC render loop)
  private _camTargetPos = new THREE.Vector3();
  private _camLookTarget = new THREE.Vector3();
  private _currentLook = new THREE.Vector3(0, 2, 0);
  private _dummy = new THREE.Object3D();

  // Player physics & movement state
  private playerPos = new THREE.Vector3(0, 0, 14);
  private playerRotY = Math.PI;
  private playerVelY = 0;
  private playerJumpY = 0;
  private walkDistance = 0;
  private keysPressed = new Set<string>();
  private joystickVec = { x: 0, y: 0 };

  // Mode-specific dynamic actors
  private vehicles: MovingVehicleActor[] = [];
  private books: { id: string; subject: string; group: THREE.Group; collected: boolean }[] = [];
  private fountainSpout: THREE.Object3D | null = null;

  // Lari Kilat Runner state
  private runnerLane = 1;
  private runnerSpeed = 16;
  private runnerDistance = 0;
  private runnerCoins = 0;
  private runnerLives = 3;
  private gooseDistance = 7.5; // Meters behind player
  private activePowerUp: string | null = null;
  private powerUpTimer = 0;
  private gooseMesh: THREE.Group | null = null;
  private runnerGate: RunnerGateGroup | null = null;
  private runnerObstacles: RunnerObstacle[] = [];
  private activeRunnerQuestion: QuestionItem | null = null;
  private lastHudSync = 0;

  // Jatuh Bangun Tower state
  private towerFloor = 0; // 0..4
  private towerTargetY = 0;
  private towerPlatforms: THREE.Group[] = [];
  private towerCrown: THREE.Mesh | null = null;

  // Jembatan Juara Bridge state
  private bridgeStep = 0; // 0..6
  private bridgePanels: THREE.Mesh[][] = [];

  // Pasar Nusantara 3D Showcase state
  private pasarDisplayGroup: THREE.Group | null = null;

  // Batch 2 (#7 - #11) & Batch 3 (#12 - #15) Mini-Games modular lifecycle controllers
  private activeQuestionPack: QuestionPack = DEFAULT_QUESTION_PACK;
  private batch2Module: IMiniGameModule | null = null;
  private batch3Module: IBatch3MiniGame | null = null;

  // Animation loop handles
  private frameId = 0;
  private isDisposed = false;
  private lastTimestamp = performance.now();
  private elapsed = 0;

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.2, 220);
    this.camera.position.set(0, 12, 26);

    // Studio Environment Map (PMREM RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    // Balanced 3-point warm/cool lighting
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.85);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    keyLight.position.set(24, 38, 22);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 38;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 110;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    rimLight.position.set(-20, 18, -24);
    this.scene.add(rimLight);

    this.activeGroup = new THREE.Group();
    this.scene.add(this.activeGroup);

    this.bindEvents();
    this.rebuildActiveScene();
    this.startLoop();
  }

  public updateCallbacks(callbacks: SceneCallbacks): void {
    this.callbacks = callbacks;
  }

  public setTitleTour(isTitle: boolean): void {
    this.isTitleTour = isTitle;
    if (!isTitle) {
      this.keysPressed.clear();
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.keysPressed.clear();
    }
  }

  public setVirtualJoystick(x: number, y: number): void {
    this.joystickVec.x = x;
    this.joystickVec.y = y;
  }

  public triggerJumpOrAction(): void {
    if (this.currentMode === 'lari_kilat') {
      if (this.playerJumpY <= 0.05) {
        this.playerVelY = 10.5;
        soundManager.playJump();
      }
      return;
    }
    if (this.playerJumpY <= 0.05) {
      this.playerVelY = 9.2;
      soundManager.playJump();
    }
  }

  public shiftRunnerLane(delta: -1 | 1): void {
    if (this.currentMode !== 'lari_kilat') return;
    this.runnerLane = Math.max(0, Math.min(3, this.runnerLane + delta));
    soundManager.playStep();
  }

  public setBiome(biome: BiomeId): void {
    if (this.currentBiome === biome) return;
    this.currentBiome = biome;
    this.rebuildActiveScene();
    soundManager.startAmbient(biome);
  }

  public setQuestionPack(pack: QuestionPack): void {
    this.activeQuestionPack = pack;
  }

  public setMode(
    mode: PlayableGameId,
    initialQuestion?: QuestionItem,
    pack?: QuestionPack
  ): void {
    this.currentMode = mode;
    if (pack) {
      this.activeQuestionPack = pack;
    }
    if (initialQuestion) {
      this.activeRunnerQuestion = initialQuestion;
    }
    this.rebuildActiveScene();
  }

  public triggerCastleCannon(isCorrect: boolean): void {
    if (this.batch2Module instanceof PertahananKastilGame) {
      this.batch2Module.triggerAnswerAction(isCorrect);
    }
  }

  public triggerRocketRing(
    ringIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    if (this.batch2Module instanceof BalapRoketGame) {
      this.batch2Module.flyThroughRing(ringIdx, isCorrect, nextQuestion);
      this.interactables = this.batch2Module.getInteractables();
    }
  }

  public triggerArchitectDrop(
    isCorrect: boolean,
    tiltAngle: number,
    offsetX: number
  ): void {
    if (this.batch2Module instanceof ArsitekMenaraGame) {
      this.batch2Module.dropFloorBlock(isCorrect, tiltAngle, offsetX);
    }
  }

  public triggerMazeGate(isCorrect: boolean): void {
    if (this.batch2Module instanceof LabirinMinotaurGame) {
      this.batch2Module.unlockNextGate(isCorrect);
    }
  }

  public aimCatapult(targetIdx: number): void {
    if (this.batch2Module instanceof PanahanKatapelGame) {
      this.batch2Module.updateParabolicArcPreview(targetIdx);
    }
  }

  public triggerCatapultShot(
    targetIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    if (this.batch2Module instanceof PanahanKatapelGame) {
      this.batch2Module.fireCatapultAtTarget(
        targetIdx,
        isCorrect,
        nextQuestion
      );
      this.interactables = this.batch2Module.getInteractables();
    }
  }

  public runRobotCoderProgram(
    commands: RobotCommandType[],
    answerIdx: number,
    nextQuestion?: QuestionItem
  ): {
    reachedStationIndex: number | null;
    isCorrect: boolean;
    hitLaser: boolean;
  } | null {
    if (this.batch3Module instanceof SirkuitLogikaGame) {
      const res = this.batch3Module.executeRobotProgram(
        commands,
        answerIdx,
        nextQuestion
      );
      this.interactables = this.batch3Module.getInteractables();
      return res;
    }
    return null;
  }

  public resetRobotCoder(): void {
    if (this.batch3Module instanceof SirkuitLogikaGame) {
      this.batch3Module.resetRobotToStart();
    }
  }

  public triggerSubmarineChest(
    chestIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    if (this.batch3Module instanceof SelamSamudraGame) {
      this.batch3Module.pilotSubmarineToChest(
        chestIdx,
        isCorrect,
        nextQuestion
      );
      this.interactables = this.batch3Module.getInteractables();
    }
  }

  public triggerChemPour(
    tubeIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    if (this.batch3Module instanceof KokiKimiaGame) {
      this.batch3Module.pourTestTube(tubeIdx, isCorrect, nextQuestion);
      this.interactables = this.batch3Module.getInteractables();
    }
  }

  public triggerPinisiIsland(
    islandIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    if (this.batch3Module instanceof EkspedisiPinisiGame) {
      this.batch3Module.sailToIsland(islandIdx, isCorrect, nextQuestion);
      this.interactables = this.batch3Module.getInteractables();
    }
  }

  public triggerGoalieKick(
    chosenIdx: number,
    answerIdx: number,
    nextQuestion?: QuestionItem
  ): void {
    if (this.batch3Module instanceof PenjagaGawangGame) {
      this.batch3Module.triggerPenaltyKick(chosenIdx, answerIdx, nextQuestion);
      this.interactables = this.batch3Module.getInteractables();
    }
  }

  public triggerConveyorRoute(
    chuteIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    if (this.batch3Module instanceof PabrikSortirGame) {
      this.batch3Module.routeCargoToChute(chuteIdx, isCorrect, nextQuestion);
      this.interactables = this.batch3Module.getInteractables();
    }
  }

  public aimPrismMonument(monumentIdx: number): void {
    if (this.batch3Module instanceof TebakBangunGame) {
      this.batch3Module.aimPrismAtMonument(monumentIdx);
    }
  }

  public triggerPrismLaser(
    monumentIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    if (this.batch3Module instanceof TebakBangunGame) {
      this.batch3Module.firePrismLaser(monumentIdx, isCorrect, nextQuestion);
      this.interactables = this.batch3Module.getInteractables();
    }
  }

  public triggerTugOfWarPull(
    newRopeOffset: number,
    isCorrect: boolean
  ): void {
    if (this.batch3Module instanceof TarikTambangGame) {
      this.batch3Module.triggerTugPull(newRopeOffset, isCorrect);
    }
  }

  public triggerBossPillarAttack(
    pillarIdx: number,
    isCorrect: boolean,
    isUltimate: boolean,
    bossDefeated: boolean,
    nextQuestion?: QuestionItem
  ): void {
    if (this.batch3Module instanceof ArenaBossGame) {
      this.batch3Module.triggerPillarCounterAttack(
        pillarIdx,
        isCorrect,
        isUltimate,
        bossDefeated,
        nextQuestion
      );
      this.interactables = this.batch3Module.getInteractables();
    }
  }

  public setWardrobe(
    uniform: CostumeUniformId,
    accessories: AccessoryId[]
  ): void {
    this.uniformId = uniform;
    this.accessories = [...accessories];
    if (this.playerAvatar && this.playerAvatar.parent) {
      const parent = this.playerAvatar.parent;
      const pos = this.playerAvatar.position.clone();
      const rotY = this.playerAvatar.rotation.y;
      this.disposeObject3D(this.playerAvatar);
      parent.remove(this.playerAvatar);

      this.playerAvatar = createStudentAvatar(this.uniformId, this.accessories);
      this.playerAvatar.position.copy(pos);
      this.playerAvatar.rotation.y = rotY;
      parent.add(this.playerAvatar);
    }
  }

  // Strict Scene Lifecycle & Memory Management (`disposeScene()`)
  private disposeObject3D(root: THREE.Object3D): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (std.map) std.map.dispose();
          if (std.emissiveMap) std.emissiveMap.dispose();
          if (std.bumpMap) std.bumpMap.dispose();
          m.dispose();
        }
      }
    });
  }

  public disposeScene(): void {
    if (this.batch2Module) {
      this.batch2Module.cleanup();
      this.batch2Module = null;
    }
    if (this.batch3Module) {
      this.batch3Module.dispose();
      this.batch3Module = null;
    }
    this.interactables = [];
    this.vehicles = [];
    this.books = [];
    this.runnerObstacles = [];
    this.runnerGate = null;
    this.gooseMesh = null;
    this.fountainSpout = null;
    this.towerPlatforms = [];
    this.towerCrown = null;
    this.bridgePanels = [];
    this.pasarDisplayGroup = null;

    this.disposeObject3D(this.activeGroup);
    this.activeGroup.clear();
  }

  public rebuildActiveScene(): void {
    this.disposeScene();

    const biomeCfg =
      BIOMES.find((b) => b.id === this.currentBiome) || BIOMES[0];
    this.scene.background = new THREE.Color(biomeCfg.skyColor);
    this.scene.fog = new THREE.FogExp2(biomeCfg.fogColor, 0.011);

    // Spawn player avatar
    this.playerAvatar = createStudentAvatar(this.uniformId, this.accessories);
    this.playerJumpY = 0;
    this.playerVelY = 0;

    if (this.currentMode === 'jelajah_dunia') {
      this.buildJelajahDunia(biomeCfg);
    } else if (this.currentMode === 'lari_kilat') {
      this.buildLariKilat(biomeCfg);
    } else if (this.currentMode === 'jatuh_bangun') {
      this.buildJatuhBangun(biomeCfg);
    } else if (this.currentMode === 'detektif_kota') {
      this.buildDetektifKota(biomeCfg);
    } else if (this.currentMode === 'pasar_nusantara') {
      this.buildPasarNusantara(biomeCfg);
    } else if (this.currentMode === 'jembatan_juara') {
      this.buildJembatanJuara(biomeCfg);
    } else if (this.currentMode === 'pertahanan_kastil') {
      this.batch2Module = new PertahananKastilGame();
      this.batch2Module.init(
        this.activeGroup,
        this.camera,
        this.activeQuestionPack
      );
    } else if (this.currentMode === 'balap_roket') {
      this.scene.background = new THREE.Color(0x090d16);
      this.scene.fog = new THREE.FogExp2(0x090d16, 0.012);
      const roketGame = new BalapRoketGame(this.maxAnisotropy);
      roketGame.init(
        this.activeGroup,
        this.camera,
        this.activeQuestionPack
      );
      this.interactables = roketGame.getInteractables();
      this.batch2Module = roketGame;
    } else if (this.currentMode === 'arsitek_menara') {
      this.batch2Module = new ArsitekMenaraGame();
      this.batch2Module.init(
        this.activeGroup,
        this.camera,
        this.activeQuestionPack
      );
    } else if (this.currentMode === 'labirin_minotaur') {
      this.batch2Module = new LabirinMinotaurGame(
        this.uniformId,
        this.accessories
      );
      this.batch2Module.init(
        this.activeGroup,
        this.camera,
        this.activeQuestionPack
      );
    } else if (this.currentMode === 'panahan_katapel') {
      const katapelGame = new PanahanKatapelGame(this.maxAnisotropy);
      katapelGame.init(
        this.activeGroup,
        this.camera,
        this.activeQuestionPack
      );
      this.interactables = katapelGame.getInteractables();
      this.batch2Module = katapelGame;
    } else if (this.currentMode === 'sirkuit_logika') {
      this.scene.background = new THREE.Color(0x070b19);
      this.scene.fog = new THREE.FogExp2(0x070b19, 0.016);
      const robotGame = new SirkuitLogikaGame();
      robotGame.init(
        {
          scene: this.scene,
          sceneGroup: this.activeGroup,
          camera: this.camera,
          maxAnisotropy: this.maxAnisotropy
        },
        this.activeQuestionPack,
        (_ok, idx) => this.callbacks.onBatch2OptionClick?.(idx),
        () => {}
      );
      this.interactables = robotGame.getInteractables();
      this.batch3Module = robotGame;
    } else if (this.currentMode === 'selam_samudra') {
      const subGame = new SelamSamudraGame();
      subGame.init(
        {
          scene: this.scene,
          sceneGroup: this.activeGroup,
          camera: this.camera,
          maxAnisotropy: this.maxAnisotropy
        },
        this.activeQuestionPack,
        (_ok, idx) => this.callbacks.onBatch2OptionClick?.(idx),
        () => {}
      );
      this.interactables = subGame.getInteractables();
      this.batch3Module = subGame;
    } else if (this.currentMode === 'koki_kimia') {
      this.scene.background = new THREE.Color(0x0f172a);
      this.scene.fog = new THREE.FogExp2(0x0f172a, 0.018);
      const chemGame = new KokiKimiaGame();
      chemGame.init(
        {
          scene: this.scene,
          sceneGroup: this.activeGroup,
          camera: this.camera,
          maxAnisotropy: this.maxAnisotropy
        },
        this.activeQuestionPack,
        (_ok, idx) => this.callbacks.onBatch2OptionClick?.(idx),
        () => {}
      );
      this.interactables = chemGame.getInteractables();
      this.batch3Module = chemGame;
    } else if (this.currentMode === 'ekspedisi_pinisi') {
      this.scene.background = new THREE.Color(0x0c4a6e);
      this.scene.fog = new THREE.FogExp2(0x0c4a6e, 0.011);
      const pinisiGame = new EkspedisiPinisiGame();
      pinisiGame.init(
        {
          scene: this.scene,
          sceneGroup: this.activeGroup,
          camera: this.camera,
          maxAnisotropy: this.maxAnisotropy
        },
        this.activeQuestionPack,
        (_ok, idx) => this.callbacks.onBatch2OptionClick?.(idx),
        () => {}
      );
      this.interactables = pinisiGame.getInteractables();
      this.batch3Module = pinisiGame;
    } else if (this.currentMode === 'penjaga_gawang') {
      this.scene.background = new THREE.Color(0x0f172a);
      this.scene.fog = new THREE.FogExp2(0x0f172a, 0.012);
      const goalieGame = new PenjagaGawangGame();
      goalieGame.init(
        {
          scene: this.scene,
          sceneGroup: this.activeGroup,
          camera: this.camera,
          maxAnisotropy: this.maxAnisotropy
        },
        this.activeQuestionPack,
        (_ok, idx) => this.callbacks.onBatch2OptionClick?.(idx),
        () => {}
      );
      this.interactables = goalieGame.getInteractables();
      this.batch3Module = goalieGame;
    } else if (this.currentMode === 'pabrik_sortir') {
      this.scene.background = new THREE.Color(0x090d16);
      this.scene.fog = new THREE.FogExp2(0x090d16, 0.015);
      const sorterGame = new PabrikSortirGame();
      sorterGame.init(
        {
          scene: this.scene,
          sceneGroup: this.activeGroup,
          camera: this.camera,
          maxAnisotropy: this.maxAnisotropy
        },
        this.activeQuestionPack,
        (_ok, idx) => this.callbacks.onBatch2OptionClick?.(idx),
        () => {}
      );
      this.interactables = sorterGame.getInteractables();
      this.batch3Module = sorterGame;
    } else if (this.currentMode === 'tebak_bangun') {
      this.scene.background = new THREE.Color(0x070b19);
      this.scene.fog = new THREE.FogExp2(0x070b19, 0.015);
      const prismGame = new TebakBangunGame();
      prismGame.init(
        {
          scene: this.scene,
          sceneGroup: this.activeGroup,
          camera: this.camera,
          maxAnisotropy: this.maxAnisotropy
        },
        this.activeQuestionPack,
        (_ok, idx) => this.callbacks.onBatch2OptionClick?.(idx),
        () => {}
      );
      this.interactables = prismGame.getInteractables();
      this.batch3Module = prismGame;
    } else if (this.currentMode === 'tarik_tambang') {
      this.scene.background = new THREE.Color(0x1c1917);
      this.scene.fog = new THREE.FogExp2(0x1c1917, 0.014);
      const tugGame = new TarikTambangGame();
      tugGame.init(
        {
          scene: this.scene,
          sceneGroup: this.activeGroup,
          camera: this.camera,
          maxAnisotropy: this.maxAnisotropy
        },
        this.activeQuestionPack,
        (_ok, idx) => this.callbacks.onBatch2OptionClick?.(idx),
        () => {}
      );
      this.interactables = tugGame.getInteractables();
      this.batch3Module = tugGame;
    } else if (this.currentMode === 'arena_boss') {
      this.scene.background = new THREE.Color(0x18181b);
      this.scene.fog = new THREE.FogExp2(0x18181b, 0.012);
      const bossGame = new ArenaBossGame(this.uniformId, this.accessories);
      bossGame.init(
        {
          scene: this.scene,
          sceneGroup: this.activeGroup,
          camera: this.camera,
          maxAnisotropy: this.maxAnisotropy
        },
        this.activeQuestionPack,
        (_ok, idx) => this.callbacks.onBatch2OptionClick?.(idx),
        () => {}
      );
      this.interactables = bossGame.getInteractables();
      this.batch3Module = bossGame;
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  // =========================================================================
  // 1. JELAJAH DUNIA (Open-World Hub across 5 Biomes)
  // =========================================================================
  private buildJelajahDunia(biomeCfg: (typeof BIOMES)[0]): void {
    // Ground terrain
    const groundGeo = new THREE.CylinderGeometry(85, 85, 1.2, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: biomeCfg.groundColor,
      roughness: 0.85,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.6;
    ground.receiveShadow = true;
    this.activeGroup.add(ground);

    // Cross Roads + Ring Plaza
    const roadMat = new THREE.MeshStandardMaterial({
      color: biomeCfg.roadColor,
      roughness: 0.75,
      metalness: 0.1
    });
    const roadNS = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 96), roadMat);
    roadNS.position.y = 0.03;
    roadNS.receiveShadow = true;
    const roadEW = new THREE.Mesh(new THREE.BoxGeometry(96, 0.06, 7.2), roadMat);
    roadEW.position.y = 0.04;
    roadEW.receiveShadow = true;
    const ringPlaza = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 11, 0.08, 32),
      roadMat
    );
    ringPlaza.position.y = 0.04;
    this.activeGroup.add(roadNS, roadEW, ringPlaza);

    // Central Fountain / Biome Monument
    const fountain = createFountain();
    this.fountainSpout = fountain.getObjectByName('FountainSpout') || null;
    this.activeGroup.add(fountain);

    // 5 Subject Buildings around the hub
    const subjects = [
      {
        subject: 'Matematika',
        sub: 'Aljabar · Geometri · Aritmetika',
        color: 0x2563eb,
        accent: '#60a5fa',
        x: -20,
        z: -18,
        rotY: Math.PI / 6
      },
      {
        subject: 'Sains',
        sub: 'Fisika · Biologi · Astronomi',
        color: 0x059669,
        accent: '#34d399',
        x: 20,
        z: -18,
        rotY: -Math.PI / 6
      },
      {
        subject: 'Bahasa',
        sub: 'Literasi · Sastra · KBBI',
        color: 0xd97706,
        accent: '#fbbf24',
        x: -24,
        z: 12,
        rotY: Math.PI / 2.5
      },
      {
        subject: 'Sejarah',
        sub: 'Nusantara · Budaya · Dunia',
        color: 0xb91c1c,
        accent: '#f87171',
        x: 24,
        z: 12,
        rotY: -Math.PI / 2.5
      },
      {
        subject: 'Coding',
        sub: 'Algoritma · Logika · Robotik',
        color: 0x7c3aed,
        accent: '#c084fc',
        x: 0,
        z: -28,
        rotY: 0
      }
    ];

    subjects.forEach((b) => {
      const bld = createSubjectBuilding(
        b.subject,
        b.sub,
        b.color,
        b.accent,
        this.maxAnisotropy
      );
      bld.position.set(b.x, 0, b.z);
      bld.rotation.y = b.rotY;
      bld.userData = {
        interactType: 'building',
        subject: b.subject,
        title: `Gedung ${b.subject}`
      };
      this.activeGroup.add(bld);
      this.interactables.push(bld);
    });

    // 4 Interactive NPC Warga with "!"
    const npcs = [
      { name: 'Pak Guru Budi', subject: 'Matematika', hex: 0x2563eb, x: -9, z: -8 },
      { name: 'Dokter Rani', subject: 'Sains', hex: 0x10b981, x: 9, z: -8 },
      { name: 'Sastrawan Seno', subject: 'Bahasa', hex: 0xf59e0b, x: -10, z: 8 },
      { name: 'Nakhoda Alif', subject: 'Sejarah', hex: 0xef4444, x: 10, z: 8 }
    ];

    npcs.forEach((n) => {
      const npcMesh = createNPCWithMarker(n.name, n.hex, this.maxAnisotropy);
      npcMesh.position.set(n.x, 0, n.z);
      npcMesh.lookAt(0, 0, 0);
      npcMesh.userData = {
        interactType: 'npc',
        npcName: n.name,
        subject: n.subject
      };
      this.activeGroup.add(npcMesh);
      this.interactables.push(npcMesh);
    });

    // 5 Collectible Knowledge Books ("Buku Ilmu")
    const bookPlacements = [
      { id: 'book-mat', subject: 'Matematika', x: -14, z: 0, color: 0x3b82f6 },
      { id: 'book-sai', subject: 'Sains', x: 14, z: 0, color: 0x10b981 },
      { id: 'book-bah', subject: 'Bahasa', x: 0, z: 22, color: 0xf59e0b },
      { id: 'book-sej', subject: 'Sejarah', x: -15, z: -26, color: 0xef4444 },
      { id: 'book-cod', subject: 'Coding', x: 15, z: -26, color: 0xa855f7 }
    ];

    bookPlacements.forEach((bp) => {
      const book = createKnowledgeBook(bp.color);
      book.position.set(bp.x, 0, bp.z);
      book.userData = {
        interactType: 'book',
        bookId: bp.id,
        subject: bp.subject
      };
      this.activeGroup.add(book);
      this.interactables.push(book);
      this.books.push({
        id: bp.id,
        subject: bp.subject,
        group: book,
        collected: false
      });
    });

    // Biome-specific Vehicles & Landmarks
    if (this.currentBiome === 'nusantara' || this.currentBiome === 'samudra') {
      const pinisi1 = createVehicle('pinisi');
      pinisi1.position.set(-16, 0, 18);
      this.activeGroup.add(pinisi1);
      this.vehicles.push({
        mesh: pinisi1,
        speed: 0.45,
        axis: 'circle',
        dir: 1,
        radius: 34,
        angle: 0
      });
    } else if (this.currentBiome === 'angkasa') {
      const rocket = createVehicle('rocket');
      rocket.position.set(14, 0, -12);
      this.activeGroup.add(rocket);
      this.vehicles.push({
        mesh: rocket,
        speed: 0.55,
        axis: 'circle',
        dir: 1,
        radius: 30,
        angle: 1.5
      });
    } else {
      const bus = createVehicle('school_bus');
      bus.position.set(-22, 0, 2);
      bus.rotation.y = Math.PI / 2;
      this.activeGroup.add(bus);
      this.vehicles.push({
        mesh: bus,
        speed: 7.5,
        axis: 'x',
        dir: 1
      });

      const car = createVehicle('car');
      car.position.set(2, 0, -24);
      this.activeGroup.add(car);
      this.vehicles.push({
        mesh: car,
        speed: 9.0,
        axis: 'z',
        dir: 1
      });
    }

    // InstancedMesh for 60 Trees / Coral Reefs / Asteroids around perimeter
    this.buildBiomeInstancedFoliage(this.currentBiome);

    // Position Player on open road facing the central fountain & Coding building
    this.playerPos.set(0, 0, 15);
    this.playerRotY = Math.PI;
    if (this.playerAvatar) {
      this.playerAvatar.position.copy(this.playerPos);
      this.playerAvatar.rotation.y = this.playerRotY;
      this.activeGroup.add(this.playerAvatar);
    }
  }

  private buildBiomeInstancedFoliage(biome: BiomeId): void {
    const count = 48;
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 2.2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: biome === 'angkasa' ? 0x64748b : 0x78350f,
      roughness: 0.85
    });
    const crownGeo =
      biome === 'angkasa'
        ? new THREE.DodecahedronGeometry(1.4, 0)
        : biome === 'samudra'
        ? new THREE.TorusKnotGeometry(0.85, 0.28, 24, 6)
        : new THREE.ConeGeometry(1.65, 3.6, 8);

    const crownColor =
      biome === 'samudra'
        ? 0xf43f5e
        : biome === 'angkasa'
        ? 0x94a3b8
        : biome === 'nusantara'
        ? 0x16a34a
        : 0x15803d;

    const crownMat = new THREE.MeshStandardMaterial({
      color: crownColor,
      roughness: 0.65,
      metalness: 0.1
    });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);
    trunks.castShadow = !this.isSoftwareGl;
    crowns.castShadow = !this.isSoftwareGl;

    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 36 + (i % 3) * 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.85 + (i % 4) * 0.15;

      this._dummy.position.set(x, 1.1 * scale, z);
      this._dummy.rotation.set(0, angle, 0);
      this._dummy.scale.setScalar(scale);
      this._dummy.updateMatrix();
      trunks.setMatrixAt(i, this._dummy.matrix);

      this._dummy.position.set(x, 3.1 * scale, z);
      this._dummy.updateMatrix();
      crowns.setMatrixAt(i, this._dummy.matrix);

      tint.setHSL(
        (biome === 'samudra' ? 0.92 : 0.34) + (i % 5) * 0.02,
        0.7,
        0.42
      );
      crowns.setColorAt(i, tint);
    }

    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();

    this.activeGroup.add(trunks, crowns);
  }

  // =========================================================================
  // 2. LARI KILAT (3D 4-Lane Endless Runner + Answer Gates + Giant Goose)
  // =========================================================================
  private buildLariKilat(biomeCfg: (typeof BIOMES)[0]): void {
    this.runnerLane = 1;
    this.runnerDistance = 0;
    this.runnerCoins = 0;
    this.runnerLives = 3;
    this.gooseDistance = 7.5;
    this.activePowerUp = null;
    this.powerUpTimer = 0;

    // Highway Track
    const highway = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 0.5, 180),
      new THREE.MeshStandardMaterial({
        color: biomeCfg.roadColor,
        roughness: 0.75
      })
    );
    highway.position.set(0, -0.25, -55);
    highway.receiveShadow = true;
    this.activeGroup.add(highway);

    // 4-Lane Divider Stripes
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    [-3.0, 0, 3.0].forEach((lx) => {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.04, 170),
        stripeMat
      );
      line.position.set(lx, 0.03, -55);
      this.activeGroup.add(line);
    });

    // Side Guardrails
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.5,
      roughness: 0.3
    });
    [-7.3, 7.3].forEach((rx) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.9, 180),
        railMat
      );
      rail.position.set(rx, 0.45, -55);
      this.activeGroup.add(rail);
    });

    // Player at Z=0
    this.playerPos.set(getLaneX(this.runnerLane), 0, 0);
    this.playerRotY = Math.PI;
    if (this.playerAvatar) {
      this.playerAvatar.position.copy(this.playerPos);
      this.playerAvatar.rotation.y = Math.PI;
      this.activeGroup.add(this.playerAvatar);
    }

    // Chasing Giant Goose behind player at Z = +gooseDistance
    this.gooseMesh = createGiantGoose();
    this.gooseMesh.position.set(this.playerPos.x, 0, this.gooseDistance);
    this.activeGroup.add(this.gooseMesh);

    // Spawn Obstacles, Coins, and Power-Ups
    const barrierGeo = new THREE.BoxGeometry(2.1, 1.15, 0.6);
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.4
    });
    const coinGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.16, 16);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.75,
      roughness: 0.2
    });
    const powerMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.7,
      roughness: 0.2
    });

    for (let i = 0; i < 18; i++) {
      const lane = i % 4;
      const z = -18 - i * 8.5;
      const isCoin = i % 3 !== 0;
      const isPower = i === 5 || i === 11 || i === 16;

      const mesh = new THREE.Mesh(
        isPower
          ? new THREE.OctahedronGeometry(0.65, 0)
          : isCoin
          ? coinGeo
          : barrierGeo,
        isPower ? powerMat : isCoin ? coinMat : barrierMat
      );
      mesh.position.set(getLaneX(lane), isCoin || isPower ? 1.0 : 0.6, z);
      mesh.castShadow = !this.isSoftwareGl;
      this.activeGroup.add(mesh);

      const pTypes: ('hoverboard' | 'magnet' | 'lightning')[] = [
        'hoverboard',
        'magnet',
        'lightning'
      ];
      this.runnerObstacles.push({
        mesh,
        lane,
        z,
        type: isPower ? pTypes[i % 3] : isCoin ? 'coin' : 'barrier',
        active: true
      });
    }

    // Spawn 4-Lane Answer Gate (A / B / C / D)
    this.spawnRunnerAnswerGate(-72);
  }

  public updateRunnerQuestionGate(question: QuestionItem): void {
    this.activeRunnerQuestion = question;
    if (this.currentMode === 'lari_kilat') {
      if (this.runnerGate) {
        this.disposeObject3D(this.runnerGate.group);
        this.activeGroup.remove(this.runnerGate.group);
      }
      this.spawnRunnerAnswerGate(-70);
    }
  }

  private spawnRunnerAnswerGate(zPos: number): void {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, zPos);

    const letters = ['A', 'B', 'C', 'D'];
    const colors = ['#f59e0b', '#06b6d4', '#10b981', '#ec4899'];
    const options = this.activeRunnerQuestion?.options || [
      'Opsi A',
      'Opsi B',
      'Opsi C',
      'Opsi D'
    ];

    RUNNER_LANES.forEach((lx, idx) => {
      const tex = createSignTexture(
        `GERBANG ${letters[idx]}`,
        options[idx],
        '#0f172a',
        colors[idx],
        this.maxAnisotropy
      );
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(2.75, 2.8, 0.28),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.92
        })
      );
      panel.position.set(lx, 1.6, 0);
      gateGroup.add(panel);
    });

    this.activeGroup.add(gateGroup);
    this.runnerGate = {
      group: gateGroup,
      z: zPos,
      resolved: false
    };
  }

  // =========================================================================
  // 3. JATUH BANGUN (3D 4-Floor Hexagonal Tower Survival + Crown at Peak)
  // =========================================================================
  private buildJatuhBangun(biomeCfg: (typeof BIOMES)[0]): void {
    this.towerFloor = 0;
    this.towerTargetY = 0;
    this.towerPlatforms = [];

    // Lava / Energy Pool Base below Floor 0
    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 24, 0.8, 32),
      new THREE.MeshStandardMaterial({
        color: biomeCfg.groundColor,
        emissive: 0x0f172a,
        roughness: 0.6
      })
    );
    pool.position.y = -4.5;
    this.activeGroup.add(pool);

    const floorColors = [0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xeab308];

    for (let f = 0; f <= 4; f++) {
      const floorGroup = new THREE.Group();
      floorGroup.position.y = f * 4.5;

      // Central Hexagonal Platform + 6 Surrounding Hex Tiles
      const hexGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.55, 6);
      const hexMat = new THREE.MeshStandardMaterial({
        color: floorColors[f],
        roughness: 0.35,
        metalness: 0.25
      });

      const centerHex = new THREE.Mesh(hexGeo, hexMat);
      centerHex.position.y = -0.28;
      centerHex.receiveShadow = true;
      floorGroup.add(centerHex);

      for (let h = 0; h < 6; h++) {
        const angle = (h / 6) * Math.PI * 2;
        const ringHex = new THREE.Mesh(hexGeo, hexMat.clone());
        ringHex.position.set(
          Math.cos(angle) * 3.9,
          -0.28,
          Math.sin(angle) * 3.9
        );
        ringHex.receiveShadow = true;
        floorGroup.add(ringHex);
      }

      this.activeGroup.add(floorGroup);
      this.towerPlatforms.push(floorGroup);
    }

    // Golden Crown at Floor 4 (Peak)
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      metalness: 0.85,
      roughness: 0.15
    });
    this.towerCrown = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.1, 0),
      crownMat
    );
    this.towerCrown.position.set(0, 4 * 4.5 + 2.2, 0);
    this.activeGroup.add(this.towerCrown);

    this.playerPos.set(0, 0, 0);
    this.playerRotY = 0;
    if (this.playerAvatar) {
      this.playerAvatar.position.copy(this.playerPos);
      this.activeGroup.add(this.playerAvatar);
    }
  }

  public setTowerFloorVisual(floor: number, fell: boolean): void {
    if (fell && this.towerPlatforms[this.towerFloor]) {
      // Visual shake on previous platform tiles
      const prev = this.towerPlatforms[this.towerFloor];
      prev.children.forEach((tile, idx) => {
        if (idx > 0) tile.position.y = -0.9;
      });
    }
    this.towerFloor = Math.max(0, Math.min(4, floor));
    this.towerTargetY = this.towerFloor * 4.5;
    this.playerVelY = 8.0;
  }

  // =========================================================================
  // 4. DETEKTIF KOTA ILMU (4 Crime Scene TKP Mystery Investigation)
  // =========================================================================
  private buildDetektifKota(biomeCfg: (typeof BIOMES)[0]): void {
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(52, 52, 1, 36),
      new THREE.MeshStandardMaterial({
        color: biomeCfg.roadColor,
        roughness: 0.8
      })
    );
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.activeGroup.add(ground);

    const activeCase = DETECTIVE_CASES[0];
    const tkpCoords = [
      { x: -12, z: -10, color: 0xf59e0b },
      { x: 12, z: -10, color: 0x06b6d4 },
      { x: -12, z: 10, color: 0x10b981 },
      { x: 12, z: 10, color: 0xa855f7 }
    ];

    activeCase.tkpList.forEach((tkp, idx) => {
      const coord = tkpCoords[idx];
      const tkpGroup = new THREE.Group();
      tkpGroup.position.set(coord.x, 0, coord.z);

      // Glowing Police/Mystery Investigation Ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 3.1, 24),
        new THREE.MeshBasicMaterial({
          color: coord.color,
          side: THREE.DoubleSide
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      tkpGroup.add(ring);

      // Evidence Pedestal
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.85, 1.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
      );
      ped.position.y = 0.7;
      tkpGroup.add(ped);

      // Witness NPC
      const witness = createNPCWithMarker(
        `TKP ${tkp.id}: ${tkp.witness}`,
        coord.color,
        this.maxAnisotropy
      );
      witness.position.set(1.6, 0, -0.8);
      tkpGroup.add(witness);

      tkpGroup.userData = {
        interactType: 'tkp',
        tkpId: tkp.id
      };
      this.activeGroup.add(tkpGroup);
      this.interactables.push(tkpGroup);
    });

    this.playerPos.set(0, 0, 16);
    this.playerRotY = Math.PI;
    if (this.playerAvatar) {
      this.playerAvatar.position.copy(this.playerPos);
      this.playerAvatar.rotation.y = this.playerRotY;
      this.activeGroup.add(this.playerAvatar);
    }
  }

  // =========================================================================
  // 5. PASAR NUSANTARA (3D Warung Shopkeeper & Visual Math Simulation)
  // =========================================================================
  private buildPasarNusantara(biomeCfg: (typeof BIOMES)[0]): void {
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(36, 36, 1, 32),
      new THREE.MeshStandardMaterial({
        color: biomeCfg.groundColor,
        roughness: 0.85
      })
    );
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    this.activeGroup.add(floor);

    // 3D Wooden Warung Counter & Bamboo Canopy
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.7
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.6
    });

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 1.8, 2.4),
      woodMat
    );
    counter.position.set(0, 0.9, 0);
    counter.castShadow = true;
    counter.receiveShadow = true;
    this.activeGroup.add(counter);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(7.4, 2.0, 4),
      roofMat
    );
    canopy.position.set(0, 6.8, -0.5);
    canopy.rotation.y = Math.PI / 4;
    this.activeGroup.add(canopy);

    [-4.8, 4.8].forEach((px) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 5.8, 10),
        woodMat
      );
      post.position.set(px, 2.9, -0.5);
      this.activeGroup.add(post);
    });

    // Visual Math Props on the Warung Counter:
    // Left: Brass Weighing Scale ("Timbangan Berat")
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.75,
      roughness: 0.25
    });
    const scaleBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.7, 0.9, 14),
      brassMat
    );
    scaleBase.position.set(-2.8, 2.25, 0.2);
    const scalePan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.6, 0.22, 16),
      brassMat
    );
    scalePan.position.set(-2.8, 2.8, 0.2);
    this.activeGroup.add(scaleBase, scalePan);

    // Center: Fractional Bika Ambon Cake Wheel ("Pecahan Kue 8 Bagian")
    this.pasarDisplayGroup = new THREE.Group();
    this.pasarDisplayGroup.position.set(0, 1.95, 0.25);
    const sliceMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.45
    });
    for (let s = 0; s < 5; s++) {
      const angle = (s / 8) * Math.PI * 2;
      const slice = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.95,
          0.95,
          0.35,
          6,
          1,
          false,
          angle,
          (Math.PI * 2) / 9
        ),
        sliceMat
      );
      this.pasarDisplayGroup.add(slice);
    }
    this.activeGroup.add(this.pasarDisplayGroup);

    // Right: Rice Sacks & Honey Jars
    const sack = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 0.85),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 })
    );
    sack.position.set(2.8, 2.35, 0.2);
    this.activeGroup.add(sack);

    // Player as Shopkeeper behind counter
    this.playerPos.set(0, 0, -1.8);
    this.playerRotY = 0;
    if (this.playerAvatar) {
      this.playerAvatar.position.copy(this.playerPos);
      this.playerAvatar.rotation.y = 0;
      this.activeGroup.add(this.playerAvatar);
    }

    // Customer NPC Queue to the right side of counter facing the stall
    const buyerColors = [0x10b981, 0x3b82f6, 0xec4899];
    buyerColors.forEach((hex, idx) => {
      const buyer = createNPCWithMarker(
        `Pembeli #${idx + 1}`,
        hex,
        this.maxAnisotropy
      );
      buyer.position.set(2.2 + idx * 2.1, 0, 2.8 + idx * 0.8);
      buyer.lookAt(0, 1.2, 0);
      this.activeGroup.add(buyer);
    });
  }

  // =========================================================================
  // 6. JEMBATAN JUARA (3D Island Glass Bridge with A/B/C/D Panels)
  // =========================================================================
  private buildJembatanJuara(biomeCfg: (typeof BIOMES)[0]): void {
    this.bridgeStep = 0;
    this.bridgePanels = [];

    // Start Floating Island & Finish Trophy Island
    const rockMat = new THREE.MeshStandardMaterial({
      color: biomeCfg.groundColor,
      roughness: 0.8
    });
    const startIsland = new THREE.Mesh(
      new THREE.ConeGeometry(8.5, 6.5, 10),
      rockMat
    );
    startIsland.rotation.x = Math.PI;
    startIsland.position.set(0, -3.25, 6);
    this.activeGroup.add(startIsland);

    const endIsland = new THREE.Mesh(
      new THREE.ConeGeometry(9.5, 7.5, 10),
      rockMat
    );
    endIsland.rotation.x = Math.PI;
    endIsland.position.set(0, -3.75, -42);
    this.activeGroup.add(endIsland);

    // Finish Archway
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.7,
      roughness: 0.25
    });
    const finishBanner = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 1.4, 0.5),
      archMat
    );
    finishBanner.position.set(0, 4.5, -38);
    this.activeGroup.add(finishBanner);

    const letters = ['A', 'B', 'C', 'D'];
    const panelX = [-4.8, -1.6, 1.6, 4.8];

    for (let step = 0; step < 6; step++) {
      const rowZ = -step * 6.2 - 2.5;
      const rowPanels: THREE.Mesh[] = [];

      for (let col = 0; col < 4; col++) {
        const tex = createSignTexture(
          `PANEL ${letters[col]}`,
          `Langkah ${step + 1}`,
          '#0c4a6e',
          '#38bdf8',
          this.maxAnisotropy
        );
        const panelMat = new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          opacity: 0.82,
          roughness: 0.15,
          metalness: 0.3
        });
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 0.32, 3.8),
          panelMat
        );
        panel.position.set(panelX[col], 0, rowZ);
        panel.userData = {
          interactType: 'bridge_panel',
          stepIndex: step,
          optionIndex: col
        };
        this.activeGroup.add(panel);
        this.interactables.push(panel);
        rowPanels.push(panel);
      }
      this.bridgePanels.push(rowPanels);
    }

    this.playerPos.set(0, 0, 4.2);
    this.playerRotY = Math.PI;
    if (this.playerAvatar) {
      this.playerAvatar.position.copy(this.playerPos);
      this.playerAvatar.rotation.y = Math.PI;
      this.activeGroup.add(this.playerAvatar);
    }
  }

  public resolveBridgeStepVisual(
    stepIndex: number,
    optionIndex: number,
    isCorrect: boolean
  ): void {
    const row = this.bridgePanels[stepIndex];
    if (!row || !row[optionIndex]) return;
    const panel = row[optionIndex];
    const mat = panel.material as THREE.MeshStandardMaterial;

    const panelX = [-4.8, -1.6, 1.6, 4.8];

    if (isCorrect) {
      mat.color.setHex(0x10b981);
      mat.opacity = 1.0;
      this.bridgeStep = stepIndex + 1;
      const targetZ =
        this.bridgeStep >= 6 ? -39.0 : -stepIndex * 6.2 - 2.5;
      this.playerPos.set(panelX[optionIndex], 0, targetZ);
      this.playerVelY = 7.5;
    } else {
      mat.color.setHex(0xef4444);
      mat.opacity = 0.25;
      panel.position.y = -2.2;
    }
  }

  // =========================================================================
  // INPUT & RAYCASTING HANDLERS
  // =========================================================================
  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener(
      'pointerdown',
      this.handlePointerDown
    );
    this.renderer.domElement.addEventListener(
      'pointermove',
      this.handlePointerMove
    );
  }

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.isTitleTour || this.isPaused) return;
    if (this.batch2Module instanceof BalapRoketGame) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.batch2Module.steerRocket(nx, ny);
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (this.isTitleTour || this.isPaused) return;

    if (
      this.currentMode === 'lari_kilat' &&
      !this.keysPressed.has(code)
    ) {
      if (code === 'KeyA' || code === 'ArrowLeft') {
        this.shiftRunnerLane(-1);
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        this.shiftRunnerLane(1);
      } else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        this.triggerJumpOrAction();
      }
    } else if (code === 'Space' && !this.keysPressed.has(code)) {
      this.triggerJumpOrAction();
    }

    this.keysPressed.add(code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed.delete(e.code);
  };

  private handleBlur = (): void => {
    this.keysPressed.clear();
    this.joystickVec.x = 0;
    this.joystickVec.y = 0;
  };

  private handleResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.isTitleTour || this.isPaused) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, true);
    if (hits.length === 0) return;

    let node: THREE.Object3D | null = hits[0].object;
    while (node && !node.userData?.interactType) {
      node = node.parent;
    }
    if (!node || !node.userData) return;

    const { interactType } = node.userData;
    if (interactType === 'building') {
      this.callbacks.onOpenBuildingQuiz(
        node.userData.subject,
        node.userData.title
      );
    } else if (interactType === 'npc') {
      this.callbacks.onOpenNpcDialog(
        node.userData.npcName,
        node.userData.subject
      );
    } else if (interactType === 'book') {
      const bookEntry = this.books.find(
        (b) => b.id === node!.userData.bookId
      );
      if (bookEntry && !bookEntry.collected) {
        bookEntry.collected = true;
        bookEntry.group.visible = false;
        soundManager.playCoin();
        this.callbacks.onCollectBook(bookEntry.id, bookEntry.subject);
      }
    } else if (interactType === 'tkp') {
      this.callbacks.onInspectTkp(node.userData.tkpId);
    } else if (interactType === 'bridge_panel') {
      if (node.userData.stepIndex === this.bridgeStep) {
        this.callbacks.onBridgeStepClick(node.userData.optionIndex);
      }
    } else if (
      interactType === 'rocket_ring' ||
      interactType === 'catapult_target' ||
      interactType === 'batch3_option'
    ) {
      const idx =
        node.userData.optionIndex ??
        node.userData.ringIndex ??
        node.userData.targetIndex ??
        0;
      this.callbacks.onBatch2OptionClick?.(idx);
    }
  };

  // =========================================================================
  // MAIN SIMULATION & RENDER LOOP (with Software-WebGL `afterDraw` Pacing)
  // =========================================================================
  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.isDisposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(rawDt, 0.05);

      if (!this.isPaused) {
        this.elapsed += dt;
        this.updateSimulation(dt);
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = window.requestAnimationFrame(tick);
      }
    };

    this.lastTimestamp = performance.now();
    this.frameId = window.requestAnimationFrame(tick);
  }

  private updateSimulation(dt: number): void {
    const dampFactor = 1 - Math.exp(-7.5 * dt);

    // Title Screen Live Camera Spline Tour
    if (this.isTitleTour) {
      const orbitAngle = this.elapsed * 0.25;
      this._camTargetPos.set(
        Math.sin(orbitAngle) * 32,
        14 + Math.sin(this.elapsed * 0.5) * 2,
        Math.cos(orbitAngle) * 32
      );
      this.camera.position.lerp(this._camTargetPos, dampFactor);
      this._camLookTarget.set(0, 2.5, 0);
      this._currentLook.lerp(this._camLookTarget, dampFactor);
      this.camera.lookAt(this._currentLook);
      this.updateAmbientProps(dt);
      return;
    }

    // Jump Gravity Physics
    if (this.playerJumpY > 0 || this.playerVelY > 0) {
      this.playerJumpY += this.playerVelY * dt;
      this.playerVelY -= 24 * dt;
      if (this.playerJumpY <= 0) {
        this.playerJumpY = 0;
        this.playerVelY = 0;
      }
    }

    this.updateAmbientProps(dt);

    if (
      this.currentMode === 'jelajah_dunia' ||
      this.currentMode === 'detektif_kota'
    ) {
      this.updateFreeRoamMovement(dt, dampFactor);
    } else if (this.currentMode === 'lari_kilat') {
      this.updateLariKilatSimulation(dt, dampFactor);
    } else if (this.currentMode === 'jatuh_bangun') {
      this.updateJatuhBangunSimulation(dt, dampFactor);
    } else if (this.currentMode === 'pasar_nusantara') {
      this.updatePasarNusantaraSimulation(dt, dampFactor);
    } else if (this.currentMode === 'jembatan_juara') {
      this.updateJembatanJuaraSimulation(dt, dampFactor);
    } else if (this.batch2Module) {
      this.batch2Module.update(dt);
    } else if (this.batch3Module) {
      let dx = this.joystickVec.x;
      let dz = this.joystickVec.y;
      if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp'))
        dz -= 1;
      if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown'))
        dz += 1;
      if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft'))
        dx -= 1;
      if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight'))
        dx += 1;

      if (Math.hypot(dx, dz) > 0.05) {
        if (this.batch3Module instanceof SelamSamudraGame) {
          this.batch3Module.steerSubmarine(dx, dz, dt);
        } else if (this.batch3Module instanceof ArenaBossGame) {
          this.batch3Module.steerPlayerInArena(dx, dz, dt);
        }
      }
      this.batch3Module.update(dt, this.elapsed);
    }
  }

  private updateAmbientProps(dt: number): void {
    if (this.fountainSpout) {
      this.fountainSpout.position.y =
        3.2 + Math.sin(this.elapsed * 4.5) * 0.18;
    }

    for (const v of this.vehicles) {
      if (v.axis === 'x') {
        v.mesh.position.x += v.speed * v.dir * dt;
        if (v.mesh.position.x > 40) v.mesh.position.x = -40;
      } else if (v.axis === 'z') {
        v.mesh.position.z += v.speed * v.dir * dt;
        if (v.mesh.position.z > 40) v.mesh.position.z = -40;
      } else if (v.axis === 'circle') {
        v.angle = (v.angle || 0) + v.speed * dt;
        const r = v.radius || 32;
        v.mesh.position.x = Math.cos(v.angle) * r;
        v.mesh.position.z = Math.sin(v.angle) * r;
        v.mesh.rotation.y = -v.angle;
      }
    }

    for (const b of this.books) {
      if (b.collected) continue;
      const spin = b.group.getObjectByName('BookSpin');
      if (spin) {
        spin.rotation.y += dt * 1.8;
        spin.position.y = 1.25 + Math.sin(this.elapsed * 3) * 0.15;
      }
      if (this.playerPos.distanceTo(b.group.position) < 2.2) {
        b.collected = true;
        b.group.visible = false;
        soundManager.playCoin();
        this.callbacks.onCollectBook(b.id, b.subject);
      }
    }
  }

  private updateFreeRoamMovement(dt: number, dampFactor: number): void {
    let moveX = this.joystickVec.x;
    let moveZ = this.joystickVec.y;

    if (
      this.keysPressed.has('KeyW') ||
      this.keysPressed.has('ArrowUp')
    )
      moveZ -= 1;
    if (
      this.keysPressed.has('KeyS') ||
      this.keysPressed.has('ArrowDown')
    )
      moveZ += 1;
    if (
      this.keysPressed.has('KeyA') ||
      this.keysPressed.has('ArrowLeft')
    )
      moveX -= 1;
    if (
      this.keysPressed.has('KeyD') ||
      this.keysPressed.has('ArrowRight')
    )
      moveX += 1;

    const len = Math.hypot(moveX, moveZ);
    const isMoving = len > 0.05;
    if (isMoving) {
      moveX /= len;
      moveZ /= len;
      const speed = 10.5;
      this.playerPos.x = THREE.MathUtils.clamp(
        this.playerPos.x + moveX * speed * dt,
        -42,
        42
      );
      this.playerPos.z = THREE.MathUtils.clamp(
        this.playerPos.z + moveZ * speed * dt,
        -42,
        42
      );
      this.playerRotY = Math.atan2(moveX, moveZ);
      this.walkDistance += speed * dt;
    }

    if (this.playerAvatar) {
      this.playerAvatar.position.copy(this.playerPos);
      this.playerAvatar.rotation.y = this.playerRotY;
      updateAvatarAnimation(
        this.playerAvatar,
        this.walkDistance,
        isMoving,
        this.playerJumpY,
        this.elapsed
      );
    }

    this._camTargetPos.set(
      this.playerPos.x,
      this.playerPos.y + 10.5,
      this.playerPos.z + 15.5
    );
    this.camera.position.lerp(this._camTargetPos, dampFactor);
    this._camLookTarget.set(
      this.playerPos.x,
      this.playerPos.y + 1.8,
      this.playerPos.z - 2.0
    );
    this._currentLook.lerp(this._camLookTarget, dampFactor);
    this.camera.lookAt(this._currentLook);
  }

  private updateLariKilatSimulation(dt: number, dampFactor: number): void {
    const speedMult = this.activePowerUp === 'lightning' ? 1.45 : 1.0;
    const stepZ = this.runnerSpeed * speedMult * dt;
    this.runnerDistance += stepZ;
    this.walkDistance += stepZ * 0.7;

    if (this.powerUpTimer > 0) {
      this.powerUpTimer -= dt;
      if (this.powerUpTimer <= 0) {
        this.activePowerUp = null;
      }
    }

    const targetX = getLaneX(this.runnerLane);
    this.playerPos.x = THREE.MathUtils.lerp(
      this.playerPos.x,
      targetX,
      1 - Math.exp(-14 * dt)
    );

    if (this.playerAvatar) {
      this.playerAvatar.position.set(this.playerPos.x, 0, 0);
      this.playerAvatar.rotation.y = Math.PI;
      updateAvatarAnimation(
        this.playerAvatar,
        this.walkDistance,
        true,
        this.playerJumpY,
        this.elapsed
      );
    }

    // Update Giant Goose chaser behind player
    if (this.gooseMesh) {
      this.gooseMesh.position.x = THREE.MathUtils.lerp(
        this.gooseMesh.position.x,
        this.playerPos.x,
        dampFactor
      );
      this.gooseMesh.position.z = this.gooseDistance;
      const lw = this.gooseMesh.getObjectByName('LeftWing');
      const rw = this.gooseMesh.getObjectByName('RightWing');
      const flap = Math.sin(this.elapsed * 14) * 0.45;
      if (lw) lw.rotation.z = flap;
      if (rw) rw.rotation.z = -flap;
    }

    // Move obstacles & coins toward player (Z = 0)
    for (const obs of this.runnerObstacles) {
      obs.z += stepZ;
      if (obs.type === 'coin' && this.activePowerUp === 'magnet' && obs.z > -18) {
        obs.mesh.position.x = THREE.MathUtils.lerp(
          obs.mesh.position.x,
          this.playerPos.x,
          0.2
        );
      } else {
        obs.mesh.position.x = getLaneX(obs.lane);
      }
      obs.mesh.position.z = obs.z;
      if (obs.type !== 'barrier') {
        obs.mesh.rotation.y += dt * 3;
      }

      if (obs.active && Math.abs(obs.z) < 0.95) {
        const dx = Math.abs(obs.mesh.position.x - this.playerPos.x);
        if (dx < 1.15) {
          if (obs.type === 'coin') {
            obs.active = false;
            obs.mesh.visible = false;
            this.runnerCoins += 10;
            soundManager.playCoin();
          } else if (obs.type === 'barrier') {
            if (this.playerJumpY < 0.85 && this.activePowerUp !== 'hoverboard') {
              obs.active = false;
              obs.mesh.visible = false;
              this.runnerLives = Math.max(0, this.runnerLives - 1);
              this.gooseDistance = Math.max(2.2, this.gooseDistance - 2.2);
              soundManager.playWrong();
              if (this.runnerLives <= 0) {
                this.callbacks.onRunnerGameOver(
                  Math.round(this.runnerDistance),
                  this.runnerCoins
                );
                return;
              }
            }
          } else {
            // Power-up collected!
            obs.active = false;
            obs.mesh.visible = false;
            this.activePowerUp = obs.type;
            this.powerUpTimer = 7.0;
            soundManager.playLevelUp();
          }
        }
      }

      if (obs.z > 10) {
        obs.z = -140 - Math.random() * 15;
        obs.lane = Math.floor(Math.random() * 4);
        obs.active = true;
        obs.mesh.visible = true;
      }
    }

    // Move Answer Gate toward player
    if (this.runnerGate) {
      this.runnerGate.z += stepZ;
      this.runnerGate.group.position.z = this.runnerGate.z;

      if (!this.runnerGate.resolved && this.runnerGate.z >= -0.6) {
        this.runnerGate.resolved = true;
        const chosenLane = this.runnerLane;
        const correctIdx = this.activeRunnerQuestion?.answerIndex ?? 0;
        const isCorrect = chosenLane === correctIdx;

        if (isCorrect) {
          this.runnerCoins += 35;
          this.gooseDistance = Math.min(9.5, this.gooseDistance + 1.5);
          soundManager.playCorrect();
        } else {
          this.runnerLives = Math.max(0, this.runnerLives - 1);
          this.gooseDistance = Math.max(2.0, this.gooseDistance - 2.2);
          soundManager.playWrong();
        }
        this.callbacks.onRunnerGateHit(chosenLane, isCorrect);
        if (this.runnerLives <= 0) {
          this.callbacks.onRunnerGameOver(
            Math.round(this.runnerDistance),
            this.runnerCoins
          );
          return;
        }
      }
    }

    // Sync HUD at ~10Hz
    if (this.elapsed - this.lastHudSync > 0.12) {
      this.lastHudSync = this.elapsed;
      this.callbacks.onRunnerStatsUpdate({
        distance: Math.round(this.runnerDistance),
        coins: this.runnerCoins,
        lives: this.runnerLives,
        gooseDistance: Number(this.gooseDistance.toFixed(1)),
        activePowerUp: this.activePowerUp
      });
    }

    this._camTargetPos.set(this.playerPos.x * 0.45, 6.2, 9.8);
    this.camera.position.lerp(this._camTargetPos, dampFactor);
    this._camLookTarget.set(this.playerPos.x * 0.3, 1.8, -12);
    this._currentLook.lerp(this._camLookTarget, dampFactor);
    this.camera.lookAt(this._currentLook);
  }

  private updateJatuhBangunSimulation(dt: number, dampFactor: number): void {
    this.playerPos.y = THREE.MathUtils.lerp(
      this.playerPos.y,
      this.towerTargetY,
      dampFactor
    );
    if (this.playerAvatar) {
      this.playerAvatar.position.set(0, this.playerPos.y, 0);
      updateAvatarAnimation(
        this.playerAvatar,
        this.walkDistance,
        false,
        this.playerJumpY,
        this.elapsed
      );
    }
    if (this.towerCrown) {
      this.towerCrown.rotation.y += dt * 1.8;
    }

    this._camTargetPos.set(0, this.playerPos.y + 6.5, 13.5);
    this.camera.position.lerp(this._camTargetPos, dampFactor);
    this._camLookTarget.set(0, this.playerPos.y + 1.8, 0);
    this._currentLook.lerp(this._camLookTarget, dampFactor);
    this.camera.lookAt(this._currentLook);
  }

  private updatePasarNusantaraSimulation(dt: number, dampFactor: number): void {
    if (this.pasarDisplayGroup) {
      this.pasarDisplayGroup.rotation.y += dt * 0.6;
    }
    if (this.playerAvatar) {
      updateAvatarAnimation(
        this.playerAvatar,
        0,
        false,
        this.playerJumpY,
        this.elapsed
      );
    }
    this._camTargetPos.set(-1.8, 4.1, 8.2);
    this.camera.position.lerp(this._camTargetPos, dampFactor);
    this._camLookTarget.set(0.4, 2.1, 0);
    this._currentLook.lerp(this._camLookTarget, dampFactor);
    this.camera.lookAt(this._currentLook);
  }

  private updateJembatanJuaraSimulation(dt: number, dampFactor: number): void {
    if (this.playerAvatar) {
      this.playerAvatar.position.lerp(this.playerPos, dampFactor);
      updateAvatarAnimation(
        this.playerAvatar,
        this.walkDistance,
        false,
        this.playerJumpY,
        this.elapsed
      );
    }

    this._camTargetPos.set(
      this.playerPos.x * 0.4,
      this.playerPos.y + 8.5,
      this.playerPos.z + 12.5
    );
    this.camera.position.lerp(this._camTargetPos, dampFactor);
    this._camLookTarget.set(0, 0.8, this.playerPos.z - 6.5);
    this._currentLook.lerp(this._camLookTarget, dampFactor);
    this.camera.lookAt(this._currentLook);
  }

  public destroy(): void {
    this.isDisposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener(
      'pointerdown',
      this.handlePointerDown
    );
    this.renderer.domElement.removeEventListener(
      'pointermove',
      this.handlePointerMove
    );
    this.disposeScene();
    this.renderer.dispose();
  }
}
