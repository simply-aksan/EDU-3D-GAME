import * as THREE from 'three';
import { QuestionItem, QuestionPack } from './questions';
import { createSignTexture, createVehicle } from './models3d';
import { ParticleBurstPool, disposeGroupDeep } from './Batch2MiniGames';
import {
  CHEM_TUBE_SPECS,
  computePinisiWaveHeight,
  PINISI_ISLAND_COORDS,
  ROBOT_LASER_TILES,
  ROBOT_START_COORD,
  ROBOT_STATIONS,
  RobotCommandType,
  RobotStepKeyframe,
  simulateRobotProgram,
  SUBMARINE_CHEST_COORDS
} from './rules';
import { soundManager } from './sound';

export interface Batch3ContainerContext {
  scene: THREE.Scene;
  sceneGroup: THREE.Group;
  camera: THREE.PerspectiveCamera;
  maxAnisotropy: number;
}

export type Batch3InputAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'jump'
  | 'option_0'
  | 'option_1'
  | 'option_2'
  | 'option_3';

export interface IBatch3MiniGame {
  init(
    container: Batch3ContainerContext,
    questionPack: QuestionPack,
    onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    onGameOver: (victory: boolean) => void
  ): void;
  update(delta: number, elapsedTime: number): void;
  handleInput(action: Batch3InputAction): void;
  dispose(): void;
  getInteractables(): THREE.Object3D[];
}

// ============================================================================
// GAME #12: SIRKUIT LOGIKA (ROBOT CODER 3D) — 6x6 Isometric Grid Puzzle
// ============================================================================
export class SirkuitLogikaGame implements IBatch3MiniGame {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private maxAnisotropy = 4;

  private robotGroup: THREE.Group | null = null;
  private stationGroups: THREE.Group[] = [];
  private laserBeams: THREE.Mesh[] = [];
  private interactables: THREE.Object3D[] = [];

  private currentCol = ROBOT_START_COORD.col;
  private currentRow = ROBOT_START_COORD.row;
  private currentDir = 0; // 0: North (-Z), 1: East (+X), 2: South (+Z), 3: West (-X)

  // Step-by-step tween queue
  private tweenQueue: RobotStepKeyframe[] = [];
  private activeKeyframe: RobotStepKeyframe | null = null;
  private stepProgress = 0;
  private startPos = new THREE.Vector3();
  private targetPos = new THREE.Vector3();
  private startRotY = Math.PI;
  private targetRotY = Math.PI;
  private pendingAnswerIdx = 0;

  private readonly camTargetPos = new THREE.Vector3(2.2, 14.0, 12.2);
  private readonly camLookAt = new THREE.Vector3(1.8, 0.4, 0.2);

  private onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void =
    () => {};

  private tileToWorld(col: number, row: number): THREE.Vector3 {
    const x = (col - 2.5) * 2.1 + 2.2;
    const z = (row - 2.5) * 2.1;
    return new THREE.Vector3(x, 0.35, z);
  }

  private dirToRotationY(dir: number): number {
    // 0: North (-Z) -> PI, 1: East (+X) -> PI/2, 2: South (+Z) -> 0, 3: West (-X) -> -PI/2
    const angles = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];
    return angles[((dir % 4) + 4) % 4];
  }

  public init(
    container: Batch3ContainerContext,
    questionPack: QuestionPack,
    onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    _onGameOver: (victory: boolean) => void
  ): void {
    this.camera = container.camera;
    this.maxAnisotropy = container.maxAnisotropy;
    this.onScoreUpdate = onScoreUpdate;

    this.rootGroup = new THREE.Group();
    container.sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.interactables = [];
    this.stationGroups = [];
    this.laserBeams = [];
    this.tweenQueue = [];
    this.activeKeyframe = null;

    this.camera.position.copy(this.camTargetPos);
    this.camera.lookAt(this.camLookAt);

    // Cyber Space Platform Backdrop
    const cyberFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 28, 0.6, 32),
      new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.85,
        metalness: 0.2
      })
    );
    cyberFloor.position.set(2.2, -1.2, 0);
    this.rootGroup.add(cyberFloor);

    // 6x6 Isometric Grid Tiles
    const tileGeo = new THREE.BoxGeometry(1.92, 0.35, 1.92);
    const tileMatEven = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x0f172a,
      roughness: 0.35,
      metalness: 0.5
    });
    const tileMatOdd = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x082f49,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.5
    });

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const tile = new THREE.Mesh(
          tileGeo,
          (r + c) % 2 === 0 ? tileMatEven : tileMatOdd
        );
        const wp = this.tileToWorld(c, r);
        tile.position.set(wp.x, 0.175, wp.z);
        tile.receiveShadow = true;
        this.rootGroup.add(tile);
      }
    }

    // Red Laser Wall Obstacles
    const pylonGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.2, 10);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.7,
      roughness: 0.3
    });
    const beamGeo = new THREE.BoxGeometry(1.6, 0.18, 0.18);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });

    for (const lt of ROBOT_LASER_TILES) {
      const wp = this.tileToWorld(lt.col, lt.row);
      const laserGroup = new THREE.Group();
      laserGroup.position.set(wp.x, 0.35, wp.z);

      const leftPylon = new THREE.Mesh(pylonGeo, pylonMat);
      leftPylon.position.set(-0.7, 0.6, 0);
      const rightPylon = new THREE.Mesh(pylonGeo, pylonMat);
      rightPylon.position.set(0.7, 0.6, 0);

      const beam1 = new THREE.Mesh(beamGeo, beamMat);
      beam1.position.set(0, 0.5, 0);
      const beam2 = new THREE.Mesh(beamGeo, beamMat);
      beam2.position.set(0, 0.9, 0);

      laserGroup.add(leftPylon, rightPylon, beam1, beam2);
      this.rootGroup.add(laserGroup);
      this.laserBeams.push(beam1, beam2);
    }

    // 4 Battery Stations (A, B, C, D) at the corners
    this.rebuildBatteryStations(questionPack.questions[0]);

    // Procedural 3D Robot Coder Avatar at (2, 3)
    this.robotGroup = this.createRobotCoderModel();
    this.resetRobotToStart();
    this.rootGroup.add(this.robotGroup);
  }

  private createRobotCoderModel(): THREE.Group {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.6,
      roughness: 0.25
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.2
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.85
    });

    // Wheel treads
    const treadGeo = new THREE.BoxGeometry(0.32, 0.4, 1.1);
    const leftTread = new THREE.Mesh(treadGeo, darkMat);
    leftTread.position.set(-0.48, 0.2, 0);
    const rightTread = new THREE.Mesh(treadGeo, darkMat);
    rightTread.position.set(0.48, 0.2, 0);
    g.add(leftTread, rightTread);

    // Chassis torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.75, 0.78),
      bodyMat
    );
    torso.position.y = 0.68;
    torso.castShadow = true;
    g.add(torso);

    // Head + Glowing Cyber Visor
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.58, 0.68),
      bodyMat
    );
    head.position.y = 1.42;
    g.add(head);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.22, 0.1),
      visorMat
    );
    visor.position.set(0, 1.44, 0.34);
    g.add(visor);

    // Antenna
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8),
      darkMat
    );
    stem.position.y = 1.85;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 12),
      visorMat
    );
    bulb.position.y = 2.08;
    bulb.name = 'RobotAntennaBulb';
    g.add(stem, bulb);

    return g;
  }

  public rebuildBatteryStations(question?: QuestionItem): void {
    for (const sg of this.stationGroups) {
      disposeGroupDeep(sg);
      this.rootGroup.remove(sg);
    }
    this.stationGroups = [];
    this.interactables = [];

    const letters = ['A', 'B', 'C', 'D'];
    const colors = [0xf59e0b, 0x06b6d4, 0x10b981, 0xec4899];
    const cssColors = ['#f59e0b', '#06b6d4', '#10b981', '#ec4899'];
    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    ROBOT_STATIONS.forEach((coord, idx) => {
      const wp = this.tileToWorld(coord.col, coord.row);
      const stGroup = new THREE.Group();
      stGroup.position.set(wp.x, 0.35, wp.z);

      // Glowing Battery Pad & Cylinder Core
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.92, 0.18, 16),
        new THREE.MeshStandardMaterial({
          color: colors[idx],
          emissive: colors[idx],
          emissiveIntensity: 0.45,
          roughness: 0.25
        })
      );
      pad.position.y = 0.09;
      stGroup.add(pad);

      const batteryCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 1.05, 14),
        new THREE.MeshStandardMaterial({
          color: colors[idx],
          emissive: colors[idx],
          emissiveIntensity: 0.6,
          metalness: 0.4,
          roughness: 0.2
        })
      );
      batteryCore.position.y = 0.65;
      stGroup.add(batteryCore);

      const tex = createSignTexture(
        `BATERAI ${letters[idx]}`,
        opts[idx],
        '#0f172a',
        cssColors[idx],
        this.maxAnisotropy
      );
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.95, 0.12),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      sign.position.set(0, 1.75, 0);
      stGroup.add(sign);

      stGroup.userData = {
        interactType: 'batch3_option',
        optionIndex: idx
      };
      this.rootGroup.add(stGroup);
      this.stationGroups.push(stGroup);
      this.interactables.push(stGroup);
    });
  }

  public resetRobotToStart(): void {
    this.currentCol = ROBOT_START_COORD.col;
    this.currentRow = ROBOT_START_COORD.row;
    this.currentDir = 0;
    this.tweenQueue = [];
    this.activeKeyframe = null;
    if (this.robotGroup) {
      const wp = this.tileToWorld(this.currentCol, this.currentRow);
      this.robotGroup.position.copy(wp);
      this.robotGroup.rotation.y = this.dirToRotationY(this.currentDir);
    }
  }

  public executeRobotProgram(
    commands: RobotCommandType[],
    answerIdx: number,
    nextQuestion?: QuestionItem
  ): {
    reachedStationIndex: number | null;
    isCorrect: boolean;
    hitLaser: boolean;
  } {
    this.resetRobotToStart();
    const sim = simulateRobotProgram(
      this.currentCol,
      this.currentRow,
      this.currentDir,
      commands
    );
    this.tweenQueue = [...sim.keyframes];
    this.pendingAnswerIdx = answerIdx;

    const isCorrect =
      !sim.hitLaser && sim.reachedStationIndex === answerIdx;

    if (nextQuestion) {
      window.setTimeout(() => {
        if (this.rootGroup.parent) {
          this.rebuildBatteryStations(nextQuestion);
        }
      }, 950);
    }

    return {
      reachedStationIndex: sim.reachedStationIndex,
      isCorrect,
      hitLaser: sim.hitLaser
    };
  }

  public update(delta: number, elapsedTime: number): void {
    this.particles.update(delta);

    for (let i = 0; i < this.laserBeams.length; i++) {
      const b = this.laserBeams[i];
      b.scale.y = 0.85 + Math.sin(elapsedTime * 10 + i) * 0.2;
    }

    if (this.robotGroup) {
      const bulb = this.robotGroup.getObjectByName('RobotAntennaBulb');
      if (bulb) {
        bulb.scale.setScalar(1 + Math.sin(elapsedTime * 8) * 0.18);
      }

      if (!this.activeKeyframe && this.tweenQueue.length > 0) {
        this.activeKeyframe = this.tweenQueue.shift()!;
        this.stepProgress = 0;
        this.startPos.copy(this.robotGroup.position);
        this.targetPos.copy(
          this.tileToWorld(this.activeKeyframe.col, this.activeKeyframe.row)
        );
        this.startRotY = this.robotGroup.rotation.y;
        this.targetRotY = this.dirToRotationY(this.activeKeyframe.dir);
        soundManager.playStep();
      }

      if (this.activeKeyframe) {
        this.stepProgress += delta * 5.2;
        const t = Math.min(1, this.stepProgress);
        this.robotGroup.position.lerpVectors(this.startPos, this.targetPos, t);
        if (this.activeKeyframe.jumped) {
          this.robotGroup.position.y += 4 * 1.4 * t * (1 - t);
        }
        this.robotGroup.rotation.y = THREE.MathUtils.lerp(
          this.startRotY,
          this.targetRotY,
          t
        );

        if (t >= 1) {
          this.currentCol = this.activeKeyframe.col;
          this.currentRow = this.activeKeyframe.row;
          this.currentDir = this.activeKeyframe.dir;

          if (this.activeKeyframe.hitLaser) {
            this.particles.emitBurst(this.robotGroup.position, false, 24);
          } else if (this.tweenQueue.length === 0) {
            const stIdx = ROBOT_STATIONS.findIndex(
              (s) => s.col === this.currentCol && s.row === this.currentRow
            );
            const ok = stIdx === this.pendingAnswerIdx;
            this.particles.emitBurst(this.robotGroup.position, ok, 28);
          }
          this.activeKeyframe = null;
        }
      }
    }

    const damp = 1 - Math.exp(-6 * delta);
    this.camera.position.lerp(this.camTargetPos, damp);
    this.camera.lookAt(this.camLookAt);
  }

  public handleInput(action: Batch3InputAction): void {
    if (action.startsWith('option_')) {
      const idx = Number(action.split('_')[1]);
      this.onScoreUpdate(idx === this.pendingAnswerIdx, idx);
    }
  }

  public getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  public dispose(): void {
    disposeGroupDeep(this.rootGroup);
    this.rootGroup.clear();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    this.interactables = [];
  }
}

// ============================================================================
// GAME #13: SELAM SAMUDRA (SUBMARINE SONAR 3D) — Underwater Exploration
// ============================================================================
interface TreasureChestActor {
  group: THREE.Group;
  lidPivot: THREE.Group;
  jellyfish: THREE.Group;
  x: number;
  z: number;
  opened: boolean;
}

export class SelamSamudraGame implements IBatch3MiniGame {
  private rootGroup = new THREE.Group();
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private previousFog: THREE.Fog | THREE.FogExp2 | null = null;
  private particles!: ParticleBurstPool;
  private maxAnisotropy = 4;

  private submarineGroup: THREE.Group | null = null;
  private propeller: THREE.Object3D | null = null;
  private subPos = new THREE.Vector3(2.0, 2.6, 15.0);
  private subTargetPos = new THREE.Vector3(2.0, 2.6, 15.0);
  private subRotY = Math.PI;
  private chests: TreasureChestActor[] = [];
  private planktonPoints: THREE.Points | null = null;
  private interactables: THREE.Object3D[] = [];

  private readonly camTarget = new THREE.Vector3();
  private readonly camLook = new THREE.Vector3();

  private onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void =
    () => {};

  public init(
    container: Batch3ContainerContext,
    questionPack: QuestionPack,
    onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    _onGameOver: (victory: boolean) => void
  ): void {
    this.scene = container.scene;
    this.camera = container.camera;
    this.maxAnisotropy = container.maxAnisotropy;
    this.onScoreUpdate = onScoreUpdate;

    // Apply deep underwater exponential fog
    this.previousFog = this.scene.fog;
    this.scene.fog = new THREE.FogExp2(0x04162c, 0.022);

    this.rootGroup = new THREE.Group();
    container.sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.interactables = [];
    this.chests = [];

    // Seabed Trench Floor
    const seabed = new THREE.Mesh(
      new THREE.CylinderGeometry(48, 48, 1.2, 36),
      new THREE.MeshStandardMaterial({
        color: 0x082f49,
        roughness: 0.9
      })
    );
    seabed.position.y = -0.6;
    seabed.receiveShadow = true;
    this.rootGroup.add(seabed);

    // Floating Bioluminescent Plankton Particles (THREE.Points)
    const count = 140;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 44;
      positions[i * 3 + 1] = 1 + Math.random() * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    const planktonGeo = new THREE.BufferGeometry();
    planktonGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    const planktonMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.25,
      transparent: true,
      opacity: 0.75
    });
    this.planktonPoints = new THREE.Points(planktonGeo, planktonMat);
    this.rootGroup.add(this.planktonPoints);

    // Build 4 Glowing Treasure Chests + Electric Jellyfish Guards
    this.rebuildTreasureChests(questionPack.questions[0]);

    // Build Yellow 3D Submarine with Spinning Propeller & Volumetric Spotlight Cone
    this.submarineGroup = this.createYellowSubmarine();
    this.subPos.set(2.0, 2.6, 15.0);
    this.subTargetPos.copy(this.subPos);
    this.submarineGroup.position.copy(this.subPos);
    this.rootGroup.add(this.submarineGroup);

    this.camera.position.set(2.0, 9.5, 25.5);
    this.camera.lookAt(2.0, 2.0, 0);
  }

  private createYellowSubmarine(): THREE.Group {
    const g = new THREE.Group();
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.35,
      roughness: 0.25
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.1
    });

    // Main Capsule Hull
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 2.8, 16),
      yellowMat
    );
    hull.rotation.x = Math.PI / 2;
    hull.castShadow = true;
    g.add(hull);

    const bow = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 16, 16),
      yellowMat
    );
    bow.position.z = -1.4;
    g.add(bow);

    const stern = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 1.2, 16),
      yellowMat
    );
    stern.rotation.x = Math.PI / 2;
    stern.position.z = 2.0;
    g.add(stern);

    // Conning Tower + Periscope
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 0.9, 12),
      yellowMat
    );
    tower.position.set(0, 1.1, -0.2);
    g.add(tower);

    const viewport = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 12),
      glassMat
    );
    viewport.position.set(0, 0.15, -2.15);
    g.add(viewport);

    // Spinning Rear Propeller
    const propGroup = new THREE.Group();
    propGroup.position.set(0, 0, 2.65);
    const bladeGeo = new THREE.BoxGeometry(1.1, 0.18, 0.08);
    const b1 = new THREE.Mesh(bladeGeo, darkMat);
    const b2 = new THREE.Mesh(bladeGeo, darkMat);
    b2.rotation.z = Math.PI / 2;
    propGroup.add(b1, b2);
    g.add(propGroup);
    this.propeller = propGroup;

    // Front SpotLight + Volumetric Light Cone
    const spotLight = new THREE.SpotLight(0xfef08a, 3.0, 26, Math.PI / 5, 0.5);
    spotLight.position.set(0, 0, -2.3);
    spotLight.target.position.set(0, -1.2, -12);
    g.add(spotLight);
    g.add(spotLight.target);

    const beamCone = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 8.5, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    beamCone.rotation.x = Math.PI / 2;
    beamCone.position.set(0, -0.3, -6.5);
    g.add(beamCone);

    return g;
  }

  public rebuildTreasureChests(question?: QuestionItem): void {
    for (const c of this.chests) {
      disposeGroupDeep(c.group);
      this.rootGroup.remove(c.group);
    }
    this.chests = [];
    this.interactables = [];

    const letters = ['A', 'B', 'C', 'D'];
    const colors = [0xf59e0b, 0x06b6d4, 0x10b981, 0xec4899];
    const cssColors = ['#f59e0b', '#06b6d4', '#10b981', '#ec4899'];
    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    SUBMARINE_CHEST_COORDS.forEach((coord, idx) => {
      const chestGroup = new THREE.Group();
      chestGroup.position.set(coord.x + 2.0, 0, coord.z);

      const woodMat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.65
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: colors[idx],
        emissive: colors[idx],
        emissiveIntensity: 0.45,
        metalness: 0.7,
        roughness: 0.2
      });

      // Chest Base Box
      const baseBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.1, 1.5),
        woodMat
      );
      baseBox.position.y = 0.55;
      chestGroup.add(baseBox);

      // Gold Trim
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.25, 1.6),
        goldMat
      );
      trim.position.y = 0.95;
      chestGroup.add(trim);

      // Hinged Lid Pivot
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 1.1, -0.75);
      const lidMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.65, 1.5),
        goldMat
      );
      lidMesh.position.set(0, 0.32, 0.75);
      lidPivot.add(lidMesh);
      chestGroup.add(lidPivot);

      // Electric Jellyfish Guard floating above chest
      const jellyGroup = new THREE.Group();
      jellyGroup.position.set(0, 3.2, 0);
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.75, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xc026d3,
          emissiveIntensity: 0.65,
          transparent: true,
          opacity: 0.82
        })
      );
      jellyGroup.add(bell);
      for (let t = 0; t < 4; t++) {
        const angle = (t / 4) * Math.PI * 2;
        const tentacle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.03, 1.2, 6),
          new THREE.MeshBasicMaterial({ color: 0xf0abfc })
        );
        tentacle.position.set(
          Math.cos(angle) * 0.35,
          -0.6,
          Math.sin(angle) * 0.35
        );
        jellyGroup.add(tentacle);
      }
      chestGroup.add(jellyGroup);

      // Sonar Label Signboard
      const tex = createSignTexture(
        `PETI ${letters[idx]}`,
        opts[idx],
        '#082f49',
        cssColors[idx],
        this.maxAnisotropy
      );
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.25, 0.14),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      sign.position.set(0, 4.8, 0);
      chestGroup.add(sign);

      chestGroup.userData = {
        interactType: 'batch3_option',
        optionIndex: idx
      };
      this.rootGroup.add(chestGroup);
      this.interactables.push(chestGroup);
      this.chests.push({
        group: chestGroup,
        lidPivot,
        jellyfish: jellyGroup,
        x: coord.x + 2.0,
        z: coord.z,
        opened: false
      });
    });
  }

  public pilotSubmarineToChest(
    chestIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    const chest = this.chests[chestIdx];
    if (!chest) return;

    this.subTargetPos.set(chest.x, 2.4, chest.z + 3.4);
    this.subRotY = Math.atan2(
      chest.x - this.subPos.x,
      chest.z - this.subPos.z
    );

    if (isCorrect) {
      chest.opened = true;
      chest.lidPivot.rotation.x = -Math.PI * 0.65;
      this.particles.emitBurst(
        new THREE.Vector3(chest.x, 1.8, chest.z),
        true,
        32
      );
    } else {
      this.particles.emitBurst(
        new THREE.Vector3(chest.x, 3.2, chest.z),
        false,
        28
      );
    }

    if (nextQuestion) {
      window.setTimeout(() => {
        if (this.rootGroup.parent) {
          this.rebuildTreasureChests(nextQuestion);
        }
      }, 650);
    }
  }

  public steerSubmarine(dx: number, dz: number, dt: number): void {
    const speed = 11.0;
    this.subTargetPos.x = THREE.MathUtils.clamp(
      this.subTargetPos.x + dx * speed * dt,
      -18,
      22
    );
    this.subTargetPos.z = THREE.MathUtils.clamp(
      this.subTargetPos.z + dz * speed * dt,
      -18,
      20
    );
  }

  public update(delta: number, elapsedTime: number): void {
    this.particles.update(delta);

    if (this.propeller) {
      this.propeller.rotation.z += delta * 18;
    }

    // Bobbing electric jellyfish guards
    for (let i = 0; i < this.chests.length; i++) {
      const c = this.chests[i];
      c.jellyfish.position.y = 3.1 + Math.sin(elapsedTime * 3.2 + i * 1.4) * 0.45;
      c.jellyfish.rotation.y += delta * 0.8;
    }

    const damp = 1 - Math.exp(-6.5 * delta);
    this.subPos.lerp(this.subTargetPos, damp);

    if (this.submarineGroup) {
      this.submarineGroup.position.copy(this.subPos);
      this.submarineGroup.position.y += Math.sin(elapsedTime * 2.5) * 0.15;
    }

    this.camTarget.set(this.subPos.x + 1.5, this.subPos.y + 7.2, this.subPos.z + 11.5);
    this.camera.position.lerp(this.camTarget, damp);
    this.camLook.set(this.subPos.x - 1.0, 1.8, this.subPos.z - 8.0);
    this.camera.lookAt(this.camLook);
  }

  public handleInput(action: Batch3InputAction): void {
    const step = 1.8;
    if (action === 'left') this.subTargetPos.x -= step;
    else if (action === 'right') this.subTargetPos.x += step;
    else if (action === 'up') this.subTargetPos.z -= step;
    else if (action === 'down') this.subTargetPos.z += step;
    else if (action.startsWith('option_')) {
      const idx = Number(action.split('_')[1]);
      this.onScoreUpdate(true, idx);
    }
  }

  public getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  public dispose(): void {
    if (this.scene) {
      this.scene.fog = this.previousFog;
    }
    disposeGroupDeep(this.rootGroup);
    this.rootGroup.clear();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    this.interactables = [];
  }
}

// ============================================================================
// GAME #14: KOKI KIMIA (LAB EKSPERIMEN 3D) — First-Person Interactive Lab
// ============================================================================
interface TestTubeActor {
  group: THREE.Group;
  liquidMesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  colorHex: number;
}

interface SmokePuff {
  mesh: THREE.Mesh;
  age: number;
  active: boolean;
}

export class KokiKimiaGame implements IBatch3MiniGame {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private maxAnisotropy = 4;

  private mainBeakerLiquid: THREE.Mesh | null = null;
  private goldenCrystal: THREE.Mesh | null = null;
  private bunsenFlame: THREE.Mesh | null = null;
  private testTubes: TestTubeActor[] = [];
  private smokePuffs: SmokePuff[] = [];
  private interactables: THREE.Object3D[] = [];

  // Pour animation state
  private pouringTubeIdx: number | null = null;
  private pourTimer = 0;
  private pouringWasCorrect = false;
  private shakeTimer = 0;

  private readonly baseCamPos = new THREE.Vector3(2.2, 6.2, 11.8);
  private readonly baseCamLook = new THREE.Vector3(0.5, 2.5, 0);

  private onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void =
    () => {};

  public init(
    container: Batch3ContainerContext,
    questionPack: QuestionPack,
    onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    _onGameOver: (victory: boolean) => void
  ): void {
    this.camera = container.camera;
    this.maxAnisotropy = container.maxAnisotropy;
    this.onScoreUpdate = onScoreUpdate;

    this.rootGroup = new THREE.Group();
    container.sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.testTubes = [];
    this.smokePuffs = [];
    this.interactables = [];
    this.pouringTubeIdx = null;
    this.pourTimer = 0;
    this.shakeTimer = 0;

    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.baseCamLook);

    // 3D Laboratory Table & Tiled Backdrop
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(22, 1.2, 12),
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.45,
        metalness: 0.2
      })
    );
    table.position.set(1.8, -0.6, 0);
    table.receiveShadow = true;
    this.rootGroup.add(table);

    // Bunsen Burner + Animated Flame under Giant Erlenmeyer Flask at X = 2.0, Z = 1.5
    const burnerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.85, 0.45, 16),
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.8,
        roughness: 0.25
      })
    );
    burnerBase.position.set(2.0, 0.22, 1.5);
    this.rootGroup.add(burnerBase);

    this.bunsenFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.85, 12),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.88
      })
    );
    this.bunsenFlame.position.set(2.0, 0.75, 1.5);
    this.rootGroup.add(this.bunsenFlame);

    // Giant Erlenmeyer Flask (Main Beaker)
    const flaskGroup = new THREE.Group();
    flaskGroup.position.set(2.0, 1.0, 1.5);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.2
    });
    const flaskCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 1.75, 2.4, 24),
      glassMat
    );
    flaskCone.position.y = 1.2;
    const flaskNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.68, 0.9, 24),
      glassMat
    );
    flaskNeck.position.y = 2.75;
    flaskGroup.add(flaskCone, flaskNeck);

    // Main Beaker Liquid inside Erlenmeyer
    this.mainBeakerLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 1.58, 1.45, 22),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.85,
        roughness: 0.2
      })
    );
    this.mainBeakerLiquid.position.y = 0.8;
    flaskGroup.add(this.mainBeakerLiquid);

    // Floating Golden Crystal (hidden until correct synthesis)
    this.goldenCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.8,
        metalness: 0.85,
        roughness: 0.1
      })
    );
    this.goldenCrystal.position.set(2.0, 4.8, 1.5);
    this.goldenCrystal.visible = false;
    this.rootGroup.add(this.goldenCrystal);

    this.rootGroup.add(flaskGroup);

    // Pre-allocate Black Smoke Puffs for Wrong Chemical Reactions
    const smokeGeo = new THREE.SphereGeometry(0.55, 12, 12);
    for (let i = 0; i < 8; i++) {
      const sm = new THREE.Mesh(
        smokeGeo,
        new THREE.MeshBasicMaterial({
          color: 0x1e293b,
          transparent: true,
          opacity: 0
        })
      );
      sm.visible = false;
      this.rootGroup.add(sm);
      this.smokePuffs.push({ mesh: sm, age: 0, active: false });
    }

    // Wooden Rack + 4 Colored Test Tubes (A: Merah, B: Biru, C: Hijau, D: Ungu)
    const rackWood = new THREE.Mesh(
      new THREE.BoxGeometry(12.5, 0.55, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 })
    );
    rackWood.position.set(2.0, 0.28, -2.2);
    this.rootGroup.add(rackWood);

    this.rebuildTestTubes(questionPack.questions[0]);
  }

  public rebuildTestTubes(question?: QuestionItem): void {
    for (const tt of this.testTubes) {
      disposeGroupDeep(tt.group);
      this.rootGroup.remove(tt.group);
    }
    this.testTubes = [];
    this.interactables = [];

    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    CHEM_TUBE_SPECS.forEach((spec, idx) => {
      const tubeGroup = new THREE.Group();
      const bx = spec.x + 2.0;
      const by = 1.65;
      const bz = -2.2;
      tubeGroup.position.set(bx, by, bz);

      // Transparent Glass Cylinder (opacity: 0.65)
      const glassTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 2.3, 18),
        new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          transparent: true,
          opacity: 0.65,
          roughness: 0.12
        })
      );
      tubeGroup.add(glassTube);

      // Colored Reagent Liquid inside Test Tube
      const liquidMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 1.6, 16),
        new THREE.MeshStandardMaterial({
          color: spec.colorHex,
          emissive: spec.colorHex,
          emissiveIntensity: 0.45,
          roughness: 0.2
        })
      );
      liquidMesh.position.y = -0.22;
      tubeGroup.add(liquidMesh);

      // Label Signboard above tube
      const tex = createSignTexture(
        `TABUNG ${spec.label} (${spec.name})`,
        opts[idx],
        '#0f172a',
        spec.cssHex,
        this.maxAnisotropy
      );
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(2.55, 1.0, 0.12),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      sign.position.set(0, 1.9, 0);
      tubeGroup.add(sign);

      tubeGroup.userData = {
        interactType: 'batch3_option',
        optionIndex: idx
      };

      this.rootGroup.add(tubeGroup);
      this.interactables.push(tubeGroup);
      this.testTubes.push({
        group: tubeGroup,
        liquidMesh,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        colorHex: spec.colorHex
      });
    });
  }

  public pourTestTube(
    tubeIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    if (tubeIdx < 0 || tubeIdx >= this.testTubes.length) return;
    this.pouringTubeIdx = tubeIdx;
    this.pourTimer = 1.1;
    this.pouringWasCorrect = isCorrect;

    // Emit liquid droplet particles pouring into Main Beaker
    this.particles.emitBurst(new THREE.Vector3(2.0, 3.8, 1.5), isCorrect, 32);

    if (this.mainBeakerLiquid) {
      const mat = this.mainBeakerLiquid.material as THREE.MeshStandardMaterial;
      if (isCorrect) {
        // Sparkling Gold Liquid + Floating 3D Crystal
        mat.color.setHex(0xfacc15);
        mat.emissive.setHex(0xf59e0b);
        mat.emissiveIntensity = 0.85;
        if (this.goldenCrystal) {
          this.goldenCrystal.visible = true;
        }
      } else {
        // Dark Smoke Reaction + Camera Screen Shake
        mat.color.setHex(0x334155);
        mat.emissive.setHex(0xef4444);
        mat.emissiveIntensity = 0.35;
        if (this.goldenCrystal) {
          this.goldenCrystal.visible = false;
        }
        this.shakeTimer = 0.65;
        this.spawnBlackSmokePuffs();
      }
    }

    if (nextQuestion) {
      window.setTimeout(() => {
        if (this.rootGroup.parent) {
          this.rebuildTestTubes(nextQuestion);
        }
      }, 850);
    }
  }

  private spawnBlackSmokePuffs(): void {
    this.smokePuffs.forEach((sp, i) => {
      sp.active = true;
      sp.age = i * 0.08;
      sp.mesh.visible = true;
      sp.mesh.position.set(
        2.0 + (Math.random() - 0.5) * 0.8,
        3.8 + i * 0.2,
        1.5 + (Math.random() - 0.5) * 0.8
      );
      sp.mesh.scale.setScalar(0.5);
      const mat = sp.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.85;
    });
  }

  public update(delta: number, elapsedTime: number): void {
    this.particles.update(delta);

    // Bunsen flame flicker
    if (this.bunsenFlame) {
      this.bunsenFlame.scale.y = 0.9 + Math.sin(elapsedTime * 18) * 0.18;
    }

    // Floating Golden Crystal spin
    if (this.goldenCrystal && this.goldenCrystal.visible) {
      this.goldenCrystal.rotation.y += delta * 2.4;
      this.goldenCrystal.position.y = 4.8 + Math.sin(elapsedTime * 4) * 0.22;
    }

    // Gentle liquid surface sway & 110-degree pouring animation
    for (let i = 0; i < this.testTubes.length; i++) {
      const tt = this.testTubes[i];
      tt.liquidMesh.rotation.z = Math.sin(elapsedTime * 2.6 + i) * 0.06;

      if (this.pouringTubeIdx === i && this.pourTimer > 0) {
        // Float above Main Beaker (2.0, 4.4, 1.5) and tilt 110 degrees
        tt.group.position.lerp(new THREE.Vector3(1.2, 4.4, 1.5), delta * 9);
        const targetTilt = -(110 * Math.PI) / 180;
        tt.group.rotation.z = THREE.MathUtils.lerp(
          tt.group.rotation.z,
          targetTilt,
          delta * 9
        );
      } else {
        tt.group.position.lerp(
          new THREE.Vector3(tt.baseX, tt.baseY, tt.baseZ),
          delta * 7
        );
        tt.group.rotation.z = THREE.MathUtils.lerp(
          tt.group.rotation.z,
          0,
          delta * 7
        );
      }
    }

    if (this.pourTimer > 0) {
      this.pourTimer -= delta;
      if (this.pourTimer <= 0) {
        this.pouringTubeIdx = null;
      }
    }

    // Expand & fade black smoke puffs
    for (const sp of this.smokePuffs) {
      if (!sp.active) continue;
      sp.age += delta;
      sp.mesh.position.y += delta * 2.2;
      sp.mesh.scale.addScalar(delta * 1.6);
      const mat = sp.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.85 - sp.age * 0.9);
      if (mat.opacity <= 0.02) {
        sp.active = false;
        sp.mesh.visible = false;
      }
    }

    // Camera + Screen Shake on Wrong Answer
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const sx = (Math.random() - 0.5) * 0.45;
      const sy = (Math.random() - 0.5) * 0.45;
      this.camera.position.set(
        this.baseCamPos.x + sx,
        this.baseCamPos.y + sy,
        this.baseCamPos.z
      );
    } else {
      this.camera.position.lerp(this.baseCamPos, delta * 6);
    }
    this.camera.lookAt(this.baseCamLook);
  }

  public handleInput(action: Batch3InputAction): void {
    if (action.startsWith('option_')) {
      const idx = Number(action.split('_')[1]);
      this.onScoreUpdate(this.pouringWasCorrect, idx);
    }
  }

  public getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  public dispose(): void {
    disposeGroupDeep(this.rootGroup);
    this.rootGroup.clear();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    this.interactables = [];
  }
}

// ============================================================================
// GAME #15: EKSPEDISI PINISI (PETA NUSANTARA 3D) — 3D Naval Navigation
// ============================================================================
export class EkspedisiPinisiGame implements IBatch3MiniGame {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private maxAnisotropy = 4;

  private oceanMesh: THREE.Mesh | null = null;
  private pinisiShip: THREE.Group | null = null;
  private shipPos = new THREE.Vector3(2.0, 0, 2.0);
  private shipTargetPos = new THREE.Vector3(2.0, 0, 2.0);
  private shipRotY = Math.PI;
  private islandGroups: THREE.Group[] = [];
  private whirlpools: THREE.Group[] = [];
  private interactables: THREE.Object3D[] = [];

  private readonly camTarget = new THREE.Vector3();
  private readonly camLook = new THREE.Vector3();
  private readonly dummy = new THREE.Object3D();

  private onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void =
    () => {};

  public init(
    container: Batch3ContainerContext,
    questionPack: QuestionPack,
    onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    _onGameOver: (victory: boolean) => void
  ): void {
    this.camera = container.camera;
    this.maxAnisotropy = container.maxAnisotropy;
    this.onScoreUpdate = onScoreUpdate;

    this.rootGroup = new THREE.Group();
    container.sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.islandGroups = [];
    this.whirlpools = [];
    this.interactables = [];

    // Dynamic 3D Ocean PlaneGeometry(120, 120, 48, 48)
    const oceanGeo = new THREE.PlaneGeometry(120, 120, 48, 48);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25,
      roughness: 0.3,
      metalness: 0.4,
      flatShading: true
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.receiveShadow = true;
    this.rootGroup.add(this.oceanMesh);

    // InstancedMesh Coconut Palms across all 4 Cultural Islands (4 islands * 4 trees = 16 instances)
    const palmCount = 16;
    const trunkInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.18, 0.28, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }),
      palmCount
    );
    const crownInst = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1.4, 1.5, 7),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 }),
      palmCount
    );

    let instIdx = 0;
    PINISI_ISLAND_COORDS.forEach((isl) => {
      for (let t = 0; t < 4; t++) {
        const angle = (t / 4) * Math.PI * 2 + 0.4;
        const tx = isl.x + Math.cos(angle) * 3.2;
        const tz = isl.z + Math.sin(angle) * 3.2;

        this.dummy.position.set(tx, 2.2, tz);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        trunkInst.setMatrixAt(instIdx, this.dummy.matrix);

        this.dummy.position.set(tx, 3.8, tz);
        this.dummy.updateMatrix();
        crownInst.setMatrixAt(instIdx, this.dummy.matrix);
        instIdx++;
      }
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    this.rootGroup.add(trunkInst, crownInst);

    // Spinning Whirlpool Obstacles between islands
    const whirlCoords = [
      { x: -10, z: -8 },
      { x: 10, z: -8 },
      { x: 0, z: 10 }
    ];
    whirlCoords.forEach((wc) => {
      const wg = new THREE.Group();
      wg.position.set(wc.x, 0.35, wc.z);
      for (let r = 1; r <= 3; r++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r * 0.95, 0.12, 8, 24),
          new THREE.MeshBasicMaterial({
            color: 0x7dd3fc,
            transparent: true,
            opacity: 0.65
          })
        );
        ring.rotation.x = Math.PI / 2;
        wg.add(ring);
      }
      this.rootGroup.add(wg);
      this.whirlpools.push(wg);
    });

    // Build 4 Cultural Islands with Lighthouses & Docks
    this.rebuildIslands(questionPack.questions[0]);

    // Procedural 3D Kapal Pinisi with 7 Sails
    this.pinisiShip = this.createSevenSailPinisi();
    this.shipPos.set(2.0, 0.2, 4.0);
    this.shipTargetPos.copy(this.shipPos);
    this.pinisiShip.position.copy(this.shipPos);
    this.rootGroup.add(this.pinisiShip);

    this.camera.position.set(4.0, 16.5, 24.0);
    this.camera.lookAt(0, 1.5, -4.0);
  }

  private createSevenSailPinisi(): THREE.Group {
    const g = createVehicle('pinisi');
    g.scale.setScalar(1.25);

    // Add extra jib and topsails so the Pinisi proudly unfurls 7 sails total
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.5,
      side: THREE.DoubleSide
    });
    const extraPositions = [
      { x: 0, y: 3.6, z: -1.4, w: 0.9, h: 0.8 },
      { x: 0, y: 3.6, z: 0.4, w: 0.9, h: 0.8 },
      { x: 0, y: 2.2, z: -2.2, w: 0.7, h: 1.1 },
      { x: 0, y: 2.6, z: -2.6, w: 0.6, h: 0.9 },
      { x: 0, y: 2.3, z: 1.6, w: 0.8, h: 1.1 }
    ];
    for (const sp of extraPositions) {
      const sail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, sp.h, sp.w),
        sailMat
      );
      sail.position.set(sp.x, sp.y, sp.z);
      g.add(sail);
    }
    return g;
  }

  public rebuildIslands(question?: QuestionItem): void {
    for (const ig of this.islandGroups) {
      disposeGroupDeep(ig);
      this.rootGroup.remove(ig);
    }
    this.islandGroups = [];
    this.interactables = [];

    const letters = ['A', 'B', 'C', 'D'];
    const colors = [0xf59e0b, 0x06b6d4, 0x10b981, 0xec4899];
    const cssColors = ['#f59e0b', '#06b6d4', '#10b981', '#ec4899'];
    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    PINISI_ISLAND_COORDS.forEach((coord, idx) => {
      const ig = new THREE.Group();
      ig.position.set(coord.x, 0, coord.z);

      // Sandy Island Mound
      const mound = new THREE.Mesh(
        new THREE.ConeGeometry(6.2, 2.6, 12),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 })
      );
      mound.position.y = 0.8;
      ig.add(mound);

      // Lighthouse Tower
      const lighthouse = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.85, 4.2, 12),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
      );
      lighthouse.position.set(0, 3.2, 0);
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 12),
        new THREE.MeshStandardMaterial({
          color: colors[idx],
          emissive: colors[idx],
          emissiveIntensity: 0.85
        })
      );
      beacon.position.set(0, 5.5, 0);
      ig.add(lighthouse, beacon);

      // Wooden Dock Pier
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.35, 4.5),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
      );
      pier.position.set(0, 0.65, 5.2);
      ig.add(pier);

      // Dock Option Signboard
      const tex = createSignTexture(
        `DERMAGA PULAU ${letters[idx]}`,
        opts[idx],
        '#0f172a',
        cssColors[idx],
        this.maxAnisotropy
      );
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 1.9, 0.18),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      sign.position.set(0, 6.9, 0);
      ig.add(sign);

      ig.userData = {
        interactType: 'batch3_option',
        optionIndex: idx
      };

      this.rootGroup.add(ig);
      this.islandGroups.push(ig);
      this.interactables.push(ig);
    });
  }

  public sailToIsland(
    islandIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    const coord = PINISI_ISLAND_COORDS[islandIdx];
    if (!coord) return;

    this.shipTargetPos.set(coord.x * 0.65, 0.2, coord.z * 0.65 + 4.0);
    this.shipRotY = Math.atan2(
      coord.x - this.shipPos.x,
      coord.z - this.shipPos.z
    );

    this.particles.emitBurst(
      new THREE.Vector3(coord.x, 3.2, coord.z + 3.0),
      isCorrect,
      32
    );

    if (nextQuestion) {
      window.setTimeout(() => {
        if (this.rootGroup.parent) {
          this.rebuildIslands(nextQuestion);
        }
      }, 650);
    }
  }

  public update(delta: number, elapsedTime: number): void {
    this.particles.update(delta);

    // Real-time 3D Vertex Wave Animation on PlaneGeometry(120, 120, 48, 48)
    if (this.oceanMesh) {
      const posAttr = this.oceanMesh.geometry.attributes
        .position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        const vy = computePinisiWaveHeight(vx, vz, elapsedTime);
        posAttr.setY(i, vy);
      }
      posAttr.needsUpdate = true;
    }

    // Spin Whirlpools
    for (const wp of this.whirlpools) {
      wp.rotation.y += delta * 2.8;
    }

    const damp = 1 - Math.exp(-5.5 * delta);
    this.shipPos.lerp(this.shipTargetPos, damp);

    // Pitch and roll Pinisi according to dynamic ocean wave slope
    if (this.pinisiShip) {
      const waveY = computePinisiWaveHeight(
        this.shipPos.x,
        this.shipPos.z,
        elapsedTime
      );
      this.pinisiShip.position.set(this.shipPos.x, waveY + 0.15, this.shipPos.z);
      this.pinisiShip.rotation.y = THREE.MathUtils.lerp(
        this.pinisiShip.rotation.y,
        this.shipRotY,
        damp
      );
      this.pinisiShip.rotation.z = Math.sin(elapsedTime * 2.4) * 0.08;
      this.pinisiShip.rotation.x = Math.cos(elapsedTime * 2.0) * 0.06;
    }

    this.camTarget.set(
      this.shipPos.x + 4.5,
      15.5,
      this.shipPos.z + 21.0
    );
    this.camera.position.lerp(this.camTarget, damp);
    this.camLook.set(this.shipPos.x - 2.0, 1.5, this.shipPos.z - 8.0);
    this.camera.lookAt(this.camLook);
  }

  public handleInput(action: Batch3InputAction): void {
    const step = 2.4;
    if (action === 'left') this.shipTargetPos.x -= step;
    else if (action === 'right') this.shipTargetPos.x += step;
    else if (action === 'up') this.shipTargetPos.z -= step;
    else if (action === 'down') this.shipTargetPos.z += step;
    else if (action.startsWith('option_')) {
      const idx = Number(action.split('_')[1]);
      this.onScoreUpdate(true, idx);
    }
  }

  public getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  public dispose(): void {
    disposeGroupDeep(this.rootGroup);
    this.rootGroup.clear();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    this.interactables = [];
  }
}
