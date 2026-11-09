import * as THREE from 'three';
import {
  AccessoryId,
  CostumeUniformId,
  QuestionItem,
  QuestionPack
} from './questions';
import { createSignTexture, createStudentAvatar } from './models3d';
import { ParticleBurstPool, disposeGroupDeep } from './Batch2MiniGames';
import {
  Batch3ContainerContext,
  Batch3InputAction,
  IBatch3MiniGame
} from './Batch3MiniGames';
import {
  BOSS_PILLAR_SPECS,
  CONVEYOR_CHUTE_SPECS,
  GOALIE_ZONE_SPECS,
  PRISM_MONUMENT_SPECS
} from './rules';
import { soundManager } from './sound';

// ============================================================================
// GAME #16: PENJAGA GAWANG PINTAR (3D GOALIE REFLEX — STADIUM PENALTY SHOWDOWN)
// ============================================================================
export class PenjagaGawangGame implements IBatch3MiniGame {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private maxAnisotropy = 4;

  private goalieGroup: THREE.Group | null = null;
  private strikerGroup: THREE.Group | null = null;
  private soccerBall: THREE.Mesh | null = null;
  private goalNetMesh: THREE.Mesh | null = null;
  private zoneGroups: THREE.Group[] = [];
  private interactables: THREE.Object3D[] = [];

  // Bezier penalty kick animation state
  private bezierCurve: THREE.CubicBezierCurve3 | null = null;
  private kickAnimTimer = 0;
  private kickActive = false;
  private goalieTargetPos = new THREE.Vector3(2.0, 0, -7.2);
  private goalieTargetRotZ = 0;
  private netShakeTimer = 0;

  private readonly centerOffset = 2.0;

  public init(
    container: Batch3ContainerContext,
    questionPack: QuestionPack,
    _onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    _onGameOver: (victory: boolean) => void
  ): void {
    this.camera = container.camera;
    this.maxAnisotropy = container.maxAnisotropy;

    this.rootGroup = new THREE.Group();
    container.sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.interactables = [];
    this.zoneGroups = [];

    this.camera.position.set(this.centerOffset, 6.2, 14.8);
    this.camera.lookAt(this.centerOffset, 2.3, -6.5);

    // 1. Stadium Green Turf & White Penalty Box Lines
    const pitch = new THREE.Mesh(
      new THREE.BoxGeometry(36, 0.5, 34),
      new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.8
      })
    );
    pitch.position.set(this.centerOffset, -0.25, 0);
    pitch.receiveShadow = true;
    this.rootGroup.add(pitch);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const goalLine = new THREE.Mesh(new THREE.BoxGeometry(24, 0.04, 0.22), lineMat);
    goalLine.position.set(this.centerOffset, 0.02, -7.8);
    const boxFront = new THREE.Mesh(new THREE.BoxGeometry(18, 0.04, 0.2), lineMat);
    boxFront.position.set(this.centerOffset, 0.02, 4.5);
    const penaltySpot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16),
      lineMat
    );
    penaltySpot.position.set(this.centerOffset, 0.03, 5.2);
    this.rootGroup.add(goalLine, boxFront, penaltySpot);

    // 2. Large 3D Goalposts & Netting at Z = -7.8
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.35
    });
    const leftPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 5.6, 12),
      postMat
    );
    leftPost.position.set(this.centerOffset - 5.8, 2.8, -7.8);
    const rightPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 5.6, 12),
      postMat
    );
    rightPost.position.set(this.centerOffset + 5.8, 2.8, -7.8);
    const crossbar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 11.8, 12),
      postMat
    );
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(this.centerOffset, 5.6, -7.8);
    this.rootGroup.add(leftPost, rightPost, crossbar);

    this.goalNetMesh = new THREE.Mesh(
      new THREE.BoxGeometry(11.4, 5.4, 1.6),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        wireframe: true,
        transparent: true,
        opacity: 0.45
      })
    );
    this.goalNetMesh.position.set(this.centerOffset, 2.7, -8.6);
    this.rootGroup.add(this.goalNetMesh);

    // 3. Player Goalie 3D Character in front of goal
    this.goalieGroup = createStudentAvatar('astronot', ['topi_sekolah']);
    this.goalieGroup.scale.setScalar(1.2);
    this.goalieGroup.position.set(this.centerOffset, 0, -7.0);
    this.goalieTargetPos.set(this.centerOffset, 0, -7.0);
    this.goalieTargetRotZ = 0;
    this.rootGroup.add(this.goalieGroup);

    // 4. Robot Striker 3D at Penalty Spot (Z = 6.6)
    this.strikerGroup = this.createRobotStrikerMesh();
    this.strikerGroup.position.set(this.centerOffset, 0, 6.8);
    this.strikerGroup.rotation.y = Math.PI;
    this.rootGroup.add(this.strikerGroup);

    // 5. 3D Soccer Ball at Penalty Spot (Z = 5.2)
    this.soccerBall = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.46, 1),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.15
      })
    );
    this.soccerBall.position.set(this.centerOffset, 0.46, 5.2);
    this.soccerBall.castShadow = true;
    this.rootGroup.add(this.soccerBall);

    // 6. 4 Glowing Target Zones (A, B, C, D) inside Goal Frame
    this.rebuildGoalZones(questionPack.questions[0]);
  }

  private createRobotStrikerMesh(): THREE.Group {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.55,
      roughness: 0.3
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.7), bodyMat);
    torso.position.y = 1.45;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.7), darkMat);
    head.position.y = 2.45;
    const legL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.16, 0.9, 8),
      darkMat
    );
    legL.position.set(-0.28, 0.45, 0);
    const legR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.16, 0.9, 8),
      darkMat
    );
    legR.position.set(0.28, 0.45, 0);
    legR.name = 'StrikerKickLeg';
    g.add(torso, head, legL, legR);
    return g;
  }

  public rebuildGoalZones(question?: QuestionItem): void {
    this.zoneGroups.forEach((zg) => {
      disposeGroupDeep(zg);
      this.rootGroup.remove(zg);
    });
    this.zoneGroups = [];
    this.interactables = [];

    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    GOALIE_ZONE_SPECS.forEach((spec, idx) => {
      const zg = new THREE.Group();
      zg.position.set(this.centerOffset + spec.x, spec.y, spec.z);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.1, 10, 24),
        new THREE.MeshStandardMaterial({
          color: spec.colorHex,
          emissive: spec.colorHex,
          emissiveIntensity: 0.65,
          roughness: 0.25
        })
      );
      zg.add(ring);

      const tex = createSignTexture(
        `ZONA ${spec.label} (${spec.name})`,
        opts[idx],
        '#0f172a',
        spec.cssHex,
        this.maxAnisotropy
      );
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.05, 0.14),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      board.position.set(0, idx < 2 ? 1.35 : -1.25, 0.2);
      zg.add(board);

      zg.userData = {
        interactType: 'batch3_option',
        optionIndex: idx
      };
      this.rootGroup.add(zg);
      this.zoneGroups.push(zg);
      this.interactables.push(zg);
    });
  }

  public triggerPenaltyKick(
    chosenIdx: number,
    answerIdx: number,
    nextQuestion?: QuestionItem
  ): void {
    const saved = chosenIdx === answerIdx;
    soundManager.playGoalieWhistleAndKick(saved);

    const chosenSpec = GOALIE_ZONE_SPECS[chosenIdx] || GOALIE_ZONE_SPECS[0];
    const ballDestSpec = GOALIE_ZONE_SPECS[answerIdx] || GOALIE_ZONE_SPECS[0];

    // Goalie dives toward chosen corner
    this.goalieTargetPos.set(
      this.centerOffset + chosenSpec.x * 0.88,
      Math.max(0.2, chosenSpec.y - 1.2),
      -7.0
    );
    this.goalieTargetRotZ = chosenSpec.x < 0 ? 0.55 : -0.55;

    // CubicBezierCurve3 for curved penalty shot toward answer corner
    const startPt = new THREE.Vector3(this.centerOffset, 0.46, 5.2);
    const endPt = new THREE.Vector3(
      this.centerOffset + ballDestSpec.x,
      ballDestSpec.y,
      ballDestSpec.z
    );
    const curveSide = ballDestSpec.x >= 0 ? 2.6 : -2.6;
    const ctrl1 = new THREE.Vector3(
      this.centerOffset + curveSide,
      3.4,
      1.5
    );
    const ctrl2 = new THREE.Vector3(
      this.centerOffset + ballDestSpec.x * 1.25,
      ballDestSpec.y + 1.2,
      -3.5
    );
    this.bezierCurve = new THREE.CubicBezierCurve3(startPt, ctrl1, ctrl2, endPt);
    this.kickAnimTimer = 0;
    this.kickActive = true;

    if (saved) {
      this.particles.emitBurst(endPt, true, 32);
    } else {
      this.netShakeTimer = 0.65;
      this.particles.emitBurst(endPt, false, 24);
    }

    window.setTimeout(() => {
      if (!this.rootGroup.parent) return;
      this.goalieTargetPos.set(this.centerOffset, 0, -7.0);
      this.goalieTargetRotZ = 0;
      if (this.soccerBall) {
        this.soccerBall.position.set(this.centerOffset, 0.46, 5.2);
      }
      if (nextQuestion) {
        this.rebuildGoalZones(nextQuestion);
      }
    }, 850);
  }

  public update(delta: number, elapsedTime: number): void {
    this.particles.update(delta);

    const damp = 1 - Math.exp(-10 * delta);
    if (this.goalieGroup) {
      this.goalieGroup.position.lerp(this.goalieTargetPos, damp);
      this.goalieGroup.rotation.z = THREE.MathUtils.lerp(
        this.goalieGroup.rotation.z,
        this.goalieTargetRotZ,
        damp
      );
    }

    if (this.kickActive && this.bezierCurve && this.soccerBall) {
      this.kickAnimTimer = Math.min(1, this.kickAnimTimer + delta * 2.6);
      const pt = this.bezierCurve.getPoint(this.kickAnimTimer);
      this.soccerBall.position.copy(pt);
      this.soccerBall.rotation.x += delta * 14;
      this.soccerBall.rotation.y += delta * 10;
      if (this.kickAnimTimer >= 1) {
        this.kickActive = false;
      }
    }

    if (this.strikerGroup) {
      const kickLeg = this.strikerGroup.getObjectByName('StrikerKickLeg');
      if (kickLeg) {
        kickLeg.rotation.x = this.kickActive
          ? Math.sin(this.kickAnimTimer * Math.PI) * -1.1
          : Math.sin(elapsedTime * 3) * 0.1;
      }
    }

    if (this.netShakeTimer > 0 && this.goalNetMesh) {
      this.netShakeTimer -= delta;
      this.goalNetMesh.position.z =
        -8.6 + Math.sin(elapsedTime * 45) * 0.25;
    } else if (this.goalNetMesh) {
      this.goalNetMesh.position.z = -8.6;
    }
  }

  public handleInput(_action: Batch3InputAction): void {}

  public getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  public dispose(): void {
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    disposeGroupDeep(this.rootGroup);
    this.interactables = [];
    this.zoneGroups = [];
  }
}

// ============================================================================
// GAME #17: PABRIK SORTIR (3D CONVEYOR BELT SORTER)
// ============================================================================
export class PabrikSortirGame implements IBatch3MiniGame {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private maxAnisotropy = 4;

  private switchGatePivot: THREE.Group | null = null;
  private cargoBox: THREE.Group | null = null;
  private stampHead: THREE.Mesh | null = null;
  private alarmLight: THREE.PointLight | null = null;
  private alarmBeacon: THREE.Mesh | null = null;
  private rollers: THREE.Mesh[] = [];
  private chuteGroups: THREE.Group[] = [];
  private interactables: THREE.Object3D[] = [];

  private targetGateAngleY: number = CONVEYOR_CHUTE_SPECS[0].gateAngleY;
  private cargoProgress = 0;
  private sortingToChuteIdx: number | null = null;
  private stampAnimTimer = 0;
  private alarmTimer = 0;
  private readonly centerOffset = 2.0;

  public init(
    container: Batch3ContainerContext,
    questionPack: QuestionPack,
    _onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    _onGameOver: (victory: boolean) => void
  ): void {
    this.camera = container.camera;
    this.maxAnisotropy = container.maxAnisotropy;

    this.rootGroup = new THREE.Group();
    container.sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.rollers = [];
    this.chuteGroups = [];
    this.interactables = [];

    this.camera.position.set(this.centerOffset, 13.5, 14.5);
    this.camera.lookAt(this.centerOffset, 1.0, -1.5);

    // 1. Industrial Factory Floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(34, 0.6, 30),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.7,
        metalness: 0.25
      })
    );
    floor.position.set(this.centerOffset, -0.3, 0);
    floor.receiveShadow = true;
    this.rootGroup.add(floor);

    // 2. Central Conveyor Belt & Rotating Rollers (Z = 9.0 down to Z = 0.5)
    const beltFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.7, 10.5),
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.6,
        roughness: 0.35
      })
    );
    beltFrame.position.set(this.centerOffset, 0.35, 5.2);
    this.rootGroup.add(beltFrame);

    const rollerGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.8, 12);
    rollerGeo.rotateZ(Math.PI / 2);
    const rollerMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2
    });
    for (let i = 0; i < 10; i++) {
      const roller = new THREE.Mesh(rollerGeo, rollerMat);
      roller.position.set(this.centerOffset, 0.72, 9.5 - i * 0.95);
      this.rootGroup.add(roller);
      this.rollers.push(roller);
    }

    // 3. Mechanical Rotating Switch Gate at Junction (Z = 0)
    this.switchGatePivot = new THREE.Group();
    this.switchGatePivot.position.set(this.centerOffset, 0.8, 0.2);
    const gateHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.7, 16),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.65,
        roughness: 0.25
      })
    );
    const gateArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.65, 4.2),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4
      })
    );
    gateArm.position.set(0, 0.2, -2.0);
    this.switchGatePivot.add(gateHub, gateArm);
    this.rootGroup.add(this.switchGatePivot);

    // 4. Pneumatic Stamp Machine ("LULUS") & Red Alarm Light
    const stampArch = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 3.6, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.6,
        roughness: 0.35
      })
    );
    stampArch.position.set(this.centerOffset, 1.8, 1.8);
    this.rootGroup.add(stampArch);

    this.stampHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 1.1, 16),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.5
      })
    );
    this.stampHead.position.set(this.centerOffset, 2.8, 1.8);
    this.rootGroup.add(this.stampHead);

    this.alarmBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.2
      })
    );
    this.alarmBeacon.position.set(this.centerOffset + 2.4, 3.8, 1.8);
    this.rootGroup.add(this.alarmBeacon);

    this.alarmLight = new THREE.PointLight(0xef4444, 0, 16);
    this.alarmLight.position.set(this.centerOffset + 2.4, 4.4, 1.8);
    this.rootGroup.add(this.alarmLight);

    // 5. Glowing 3D Cargo Box on the Conveyor
    this.cargoBox = new THREE.Group();
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 1.35, 1.45),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
        roughness: 0.3
      })
    );
    crate.position.y = 0.7;
    this.cargoBox.add(crate);
    this.cargoBox.position.set(this.centerOffset, 0.72, 8.5);
    this.rootGroup.add(this.cargoBox);

    // 6. 4 Branching Container Chutes (A, B, C, D)
    this.rebuildChuteContainers(questionPack.questions[0]);
  }

  public rebuildChuteContainers(question?: QuestionItem): void {
    this.chuteGroups.forEach((cg) => {
      disposeGroupDeep(cg);
      this.rootGroup.remove(cg);
    });
    this.chuteGroups = [];
    this.interactables = [];

    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    CONVEYOR_CHUTE_SPECS.forEach((spec, idx) => {
      const cg = new THREE.Group();
      cg.position.set(this.centerOffset + spec.endX, 0, spec.endZ);

      // Container bin
      const bin = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 1.8, 2.8),
        new THREE.MeshStandardMaterial({
          color: spec.colorHex,
          roughness: 0.4,
          metalness: 0.3
        })
      );
      bin.position.y = 0.9;
      bin.castShadow = true;
      cg.add(bin);

      // Option Signboard above container
      const tex = createSignTexture(
        `JALUR ${spec.label}`,
        opts[idx],
        '#0f172a',
        spec.cssHex,
        this.maxAnisotropy
      );
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 1.45, 0.16),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      board.position.set(0, 2.75, 0);
      cg.add(board);

      cg.userData = {
        interactType: 'batch3_option',
        optionIndex: idx
      };
      this.rootGroup.add(cg);
      this.chuteGroups.push(cg);
      this.interactables.push(cg);
    });
  }

  public routeCargoToChute(
    chuteIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    const spec = CONVEYOR_CHUTE_SPECS[chuteIdx] || CONVEYOR_CHUTE_SPECS[0];
    this.targetGateAngleY = spec.gateAngleY;
    this.sortingToChuteIdx = chuteIdx;
    this.cargoProgress = 0;

    soundManager.playFactoryStampOrAlarm(isCorrect);

    if (isCorrect) {
      this.stampAnimTimer = 0.6;
      this.particles.emitBurst(
        new THREE.Vector3(this.centerOffset + spec.endX, 2.2, spec.endZ),
        true,
        32
      );
    } else {
      this.alarmTimer = 1.2;
      this.particles.emitBurst(
        new THREE.Vector3(this.centerOffset + spec.endX, 2.2, spec.endZ),
        false,
        28
      );
    }

    if (nextQuestion) {
      window.setTimeout(() => {
        if (this.rootGroup.parent) {
          this.rebuildChuteContainers(nextQuestion);
        }
      }, 750);
    }
  }

  public update(delta: number, elapsedTime: number): void {
    this.particles.update(delta);

    for (const r of this.rollers) {
      r.rotation.x -= delta * 6.0;
    }

    if (this.switchGatePivot) {
      this.switchGatePivot.rotation.y = THREE.MathUtils.lerp(
        this.switchGatePivot.rotation.y,
        this.targetGateAngleY,
        1 - Math.exp(-12 * delta)
      );
    }

    // Animate Cargo Box along conveyor or into selected container
    if (this.cargoBox) {
      if (this.sortingToChuteIdx !== null) {
        const spec = CONVEYOR_CHUTE_SPECS[this.sortingToChuteIdx];
        this.cargoProgress = Math.min(1, this.cargoProgress + delta * 2.4);
        this.cargoBox.position.x = THREE.MathUtils.lerp(
          this.centerOffset,
          this.centerOffset + spec.endX,
          this.cargoProgress
        );
        this.cargoBox.position.z = THREE.MathUtils.lerp(
          1.2,
          spec.endZ,
          this.cargoProgress
        );
        if (this.cargoProgress >= 1) {
          this.sortingToChuteIdx = null;
          this.cargoBox.position.set(this.centerOffset, 0.72, 8.8);
        }
      } else {
        // Gentle cyclic travel from z=8.8 toward junction z=2.0
        const cycle = (elapsedTime * 0.45) % 1;
        this.cargoBox.position.set(
          this.centerOffset,
          0.72,
          8.8 - cycle * 6.2
        );
      }
    }

    // Stamp Head Animation
    if (this.stampHead) {
      if (this.stampAnimTimer > 0) {
        this.stampAnimTimer -= delta;
        this.stampHead.position.y =
          2.0 + Math.sin(this.stampAnimTimer * Math.PI * 3) * -0.7;
      } else {
        this.stampHead.position.y = 2.8;
      }
    }

    // Red Alarm Light Flashing
    if (this.alarmTimer > 0) {
      this.alarmTimer -= delta;
      const pulse = Math.abs(Math.sin(elapsedTime * 22));
      if (this.alarmLight) this.alarmLight.intensity = pulse * 6.0;
      if (this.alarmBeacon) {
        const mat = this.alarmBeacon.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.5 + pulse * 1.5;
      }
    } else {
      if (this.alarmLight) this.alarmLight.intensity = 0;
      if (this.alarmBeacon) {
        const mat = this.alarmBeacon.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.2;
      }
    }
  }

  public handleInput(_action: Batch3InputAction): void {}

  public getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  public dispose(): void {
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    disposeGroupDeep(this.rootGroup);
    this.interactables = [];
    this.chuteGroups = [];
  }
}

// ============================================================================
// GAME #18: TEBAK BANGUN & BAYANGAN (3D PRISM & LASER CASTER)
// ============================================================================
export class TebakBangunGame implements IBatch3MiniGame {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private maxAnisotropy = 4;

  private prismTurret: THREE.Group | null = null;
  private laserBeamMesh: THREE.Mesh | null = null;
  private rainbowShafts: THREE.Group | null = null;
  private monumentGroups: THREE.Group[] = [];
  private floatingSilhouettes: THREE.Mesh[] = [];
  private interactables: THREE.Object3D[] = [];

  private aimedIndex = 0;
  private laserTimer = 0;
  private rainbowTimer = 0;
  private readonly centerOffset = 2.2;

  public init(
    container: Batch3ContainerContext,
    questionPack: QuestionPack,
    _onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    _onGameOver: (victory: boolean) => void
  ): void {
    this.camera = container.camera;
    this.maxAnisotropy = container.maxAnisotropy;

    this.rootGroup = new THREE.Group();
    container.sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.monumentGroups = [];
    this.floatingSilhouettes = [];
    this.interactables = [];

    this.camera.position.set(this.centerOffset, 13.8, 16.5);
    this.camera.lookAt(this.centerOffset, 1.5, -1.0);

    // 1. Futuristic Crystal Temple Floor & Portal Ring
    const templeFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 22, 0.8, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.35,
        metalness: 0.55
      })
    );
    templeFloor.position.set(this.centerOffset, -0.4, -1.0);
    templeFloor.receiveShadow = true;
    this.rootGroup.add(templeFloor);

    const portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(6.5, 0.22, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65
      })
    );
    portalRing.rotation.x = Math.PI / 2;
    portalRing.position.set(this.centerOffset, 0.05, -1.0);
    this.rootGroup.add(portalRing);

    // 2. Central 360° Rotatable 3D Prism Cannon
    this.prismTurret = new THREE.Group();
    this.prismTurret.position.set(this.centerOffset, 0, -1.0);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.8, 1.2, 8),
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.7,
        roughness: 0.25
      })
    );
    pedestal.position.y = 0.6;

    const prismCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.15, 0),
      new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.1
      })
    );
    prismCore.position.y = 2.0;

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.35, 2.2, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.8,
        roughness: 0.2
      })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 2.0, -1.2);

    // Laser beam extending forward from Prism Cannon
    const beamGeo = new THREE.CylinderGeometry(0.14, 0.14, 11.5, 10);
    beamGeo.rotateX(Math.PI / 2);
    this.laserBeamMesh = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.92
      })
    );
    this.laserBeamMesh.position.set(0, 2.0, -6.2);
    this.laserBeamMesh.visible = false;

    this.prismTurret.add(pedestal, prismCore, barrel, this.laserBeamMesh);
    this.rootGroup.add(this.prismTurret);

    // 3. Rainbow Refraction Shafts to Temple Ceiling
    this.rainbowShafts = new THREE.Group();
    this.rainbowShafts.position.set(this.centerOffset, 2.2, -1.0);
    const rainbowColors = [0xef4444, 0xfacc15, 0x10b981, 0x38bdf8, 0xa855f7];
    rainbowColors.forEach((hex, i) => {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.35, 12, 8),
        new THREE.MeshBasicMaterial({
          color: hex,
          transparent: true,
          opacity: 0.75
        })
      );
      shaft.position.y = 5.5;
      shaft.rotation.z = (i - 2) * 0.18;
      this.rainbowShafts!.add(shaft);
    });
    this.rainbowShafts.visible = false;
    this.rootGroup.add(this.rainbowShafts);

    // 4. 4 Giant Crystal Monuments (A, B, C, D) with Rotating 3D Geometric Silhouettes
    this.rebuildCrystalMonuments(questionPack.questions[0]);
  }

  public rebuildCrystalMonuments(question?: QuestionItem): void {
    this.monumentGroups.forEach((mg) => {
      disposeGroupDeep(mg);
      this.rootGroup.remove(mg);
    });
    this.monumentGroups = [];
    this.floatingSilhouettes = [];
    this.interactables = [];

    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    PRISM_MONUMENT_SPECS.forEach((spec, idx) => {
      const mg = new THREE.Group();
      mg.position.set(this.centerOffset + spec.x, 0, spec.z);

      // Giant Crystal Pillar
      const crystal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 1.25, 3.4, 6),
        new THREE.MeshStandardMaterial({
          color: spec.colorHex,
          emissive: spec.colorHex,
          emissiveIntensity: 0.35,
          roughness: 0.15,
          metalness: 0.4
        })
      );
      crystal.position.y = 1.7;
      mg.add(crystal);

      // Rotating 3D Geometric Shape Silhouette above monument
      const shapeGeo =
        idx === 0
          ? new THREE.BoxGeometry(1.2, 1.2, 1.2)
          : idx === 1
          ? new THREE.ConeGeometry(0.9, 1.5, 4)
          : idx === 2
          ? new THREE.CylinderGeometry(0.75, 0.75, 1.4, 16)
          : new THREE.IcosahedronGeometry(0.9, 0);
      const silhouette = new THREE.Mesh(
        shapeGeo,
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: spec.colorHex,
          emissiveIntensity: 0.55,
          wireframe: false,
          roughness: 0.2
        })
      );
      silhouette.position.y = 4.4;
      mg.add(silhouette);
      this.floatingSilhouettes.push(silhouette);

      // Option Board
      const tex = createSignTexture(
        `KRISTAL ${spec.label}`,
        opts[idx],
        '#0f172a',
        spec.cssHex,
        this.maxAnisotropy
      );
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 1.4, 0.16),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      board.position.set(0, 2.3, 1.1);
      mg.add(board);

      mg.userData = {
        interactType: 'batch3_option',
        optionIndex: idx
      };
      this.rootGroup.add(mg);
      this.monumentGroups.push(mg);
      this.interactables.push(mg);
    });
  }

  public aimPrismAtMonument(monumentIdx: number): void {
    this.aimedIndex = Math.max(0, Math.min(3, monumentIdx));
  }

  public firePrismLaser(
    monumentIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    this.aimedIndex = Math.max(0, Math.min(3, monumentIdx));
    this.laserTimer = 0.65;
    if (this.laserBeamMesh) {
      this.laserBeamMesh.visible = true;
    }

    soundManager.playPrismLaser(isCorrect);

    const spec =
      PRISM_MONUMENT_SPECS[this.aimedIndex] || PRISM_MONUMENT_SPECS[0];
    const hitPos = new THREE.Vector3(
      this.centerOffset + spec.x,
      2.6,
      spec.z
    );
    this.particles.emitBurst(hitPos, isCorrect, 34);

    if (isCorrect) {
      this.rainbowTimer = 0.85;
      if (this.rainbowShafts) {
        this.rainbowShafts.visible = true;
      }
    }

    if (nextQuestion) {
      window.setTimeout(() => {
        if (this.rootGroup.parent) {
          this.rebuildCrystalMonuments(nextQuestion);
        }
      }, 750);
    }
  }

  public update(delta: number, elapsedTime: number): void {
    this.particles.update(delta);

    for (const s of this.floatingSilhouettes) {
      s.rotation.y += delta * 1.6;
      s.rotation.x += delta * 0.9;
      s.position.y = 4.4 + Math.sin(elapsedTime * 3.0) * 0.2;
    }

    if (this.prismTurret) {
      const spec =
        PRISM_MONUMENT_SPECS[this.aimedIndex] || PRISM_MONUMENT_SPECS[0];
      const targetAngle = Math.atan2(-spec.x, -(spec.z - -1.0));
      this.prismTurret.rotation.y = THREE.MathUtils.lerp(
        this.prismTurret.rotation.y,
        targetAngle,
        1 - Math.exp(-10 * delta)
      );
    }

    if (this.laserTimer > 0) {
      this.laserTimer -= delta;
      if (this.laserTimer <= 0 && this.laserBeamMesh) {
        this.laserBeamMesh.visible = false;
      }
    }

    if (this.rainbowTimer > 0) {
      this.rainbowTimer -= delta;
      if (this.rainbowShafts) {
        this.rainbowShafts.rotation.y += delta * 2.5;
        if (this.rainbowTimer <= 0) {
          this.rainbowShafts.visible = false;
        }
      }
    }
  }

  public handleInput(_action: Batch3InputAction): void {}

  public getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  public dispose(): void {
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    disposeGroupDeep(this.rootGroup);
    this.interactables = [];
    this.monumentGroups = [];
    this.floatingSilhouettes = [];
  }
}

// ============================================================================
// GAME #19: TARIK TAMBANG JUARA (3D VERSUS TUG-OF-WAR)
// ============================================================================
export class TarikTambangGame implements IBatch3MiniGame {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;

  private ropeAssembly: THREE.Group | null = null;
  private playerTeamGroup: THREE.Group | null = null;
  private robotTeamGroup: THREE.Group | null = null;
  private interactables: THREE.Object3D[] = [];

  private ropeOffset = 0; // -5.0 (Player Left Win) .. +5.0 (Robot Right Win)
  private targetRopeOffset = 0;
  private teamLeanAngle = 0;
  private shakeTimer = 0;
  private readonly centerOffset = 2.2;
  private readonly baseCamPos = new THREE.Vector3(2.2, 6.8, 15.2);

  public init(
    container: Batch3ContainerContext,
    _questionPack: QuestionPack,
    _onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    _onGameOver: (victory: boolean) => void
  ): void {
    this.camera = container.camera;

    this.rootGroup = new THREE.Group();
    container.sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.interactables = [];
    this.ropeOffset = 0;
    this.targetRopeOffset = 0;

    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.centerOffset, 1.8, 0);

    // 1. Glowing Lava Pit Below Suspension Bridge
    const lavaPool = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 0.8, 32),
      new THREE.MeshStandardMaterial({
        color: 0xea580c,
        emissive: 0xdc2626,
        emissiveIntensity: 0.65,
        roughness: 0.4
      })
    );
    lavaPool.position.set(this.centerOffset, -2.2, 0);
    this.rootGroup.add(lavaPool);

    // Left & Right Bridge Platforms with Gap in the Center
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.75
    });
    const leftDeck = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.6, 5.2),
      platformMat
    );
    leftDeck.position.set(this.centerOffset - 7.2, -0.3, 0);
    const rightDeck = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.6, 5.2),
      platformMat
    );
    rightDeck.position.set(this.centerOffset + 7.2, -0.3, 0);
    this.rootGroup.add(leftDeck, rightDeck);

    // Victory boundary markers
    const winLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.12, 5.2),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    winLine.position.set(this.centerOffset - 3.5, 0.05, 0);
    const loseLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.12, 5.2),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    loseLine.position.set(this.centerOffset + 3.5, 0.05, 0);
    this.rootGroup.add(winLine, loseLine);

    // 2. Rope Assembly + Red Center Ribbon + 3v3 Teams
    this.ropeAssembly = new THREE.Group();
    this.ropeAssembly.position.set(this.centerOffset, 0, 0);

    const ropeGeo = new THREE.CylinderGeometry(0.14, 0.14, 18.5, 12);
    ropeGeo.rotateZ(Math.PI / 2);
    const ropeMesh = new THREE.Mesh(
      ropeGeo,
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.85
      })
    );
    ropeMesh.position.y = 1.25;
    this.ropeAssembly.add(ropeMesh);

    // Red Marker Ribbon at the center of the rope
    const ribbonRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.09, 10, 20),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.6
      })
    );
    ribbonRing.rotation.y = Math.PI / 2;
    ribbonRing.position.set(0, 1.25, 0);
    const ribbonFlag = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.95, 4),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.5
      })
    );
    ribbonFlag.rotation.x = Math.PI;
    ribbonFlag.position.set(0, 0.75, 0);
    this.ropeAssembly.add(ribbonRing, ribbonFlag);

    // Player Team (3 3D Student Characters on Left)
    this.playerTeamGroup = new THREE.Group();
    const uniforms: CostumeUniformId[] = ['sd', 'smp', 'batik'];
    uniforms.forEach((u, idx) => {
      const member = createStudentAvatar(u, ['topi_sekolah']);
      member.position.set(-3.2 - idx * 1.9, 0, (idx % 2 === 0 ? 0.35 : -0.35));
      member.rotation.y = Math.PI / 2;
      this.playerTeamGroup!.add(member);
    });
    this.ropeAssembly.add(this.playerTeamGroup);

    // Opponent Team (3 3D Robot Characters on Right)
    this.robotTeamGroup = new THREE.Group();
    for (let r = 0; r < 3; r++) {
      const bot = this.createTugRobotMesh();
      bot.position.set(3.2 + r * 1.9, 0, (r % 2 === 0 ? -0.35 : 0.35));
      bot.rotation.y = -Math.PI / 2;
      this.robotTeamGroup.add(bot);
    }
    this.ropeAssembly.add(this.robotTeamGroup);

    this.rootGroup.add(this.ropeAssembly);
  }

  private createTugRobotMesh(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.3, 0.75),
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.7,
        roughness: 0.3
      })
    );
    body.position.y = 1.3;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.65, 0.7),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        emissiveIntensity: 0.4
      })
    );
    head.position.y = 2.3;
    g.add(body, head);
    return g;
  }

  public triggerTugPull(newRopeOffset: number, isCorrect: boolean): void {
    this.targetRopeOffset = newRopeOffset;
    soundManager.playTugPull(isCorrect);

    if (isCorrect) {
      // Power Pull: lean back + blue lightning burst + light camera shake
      this.teamLeanAngle = 0.36;
      this.shakeTimer = 0.4;
      this.particles.emitBurst(
        new THREE.Vector3(this.centerOffset - 4.0, 2.2, 0),
        true,
        34
      );
    } else {
      // Slip forward
      this.teamLeanAngle = -0.25;
      this.particles.emitBurst(
        new THREE.Vector3(this.centerOffset + 2.0, 2.0, 0),
        false,
        24
      );
    }
  }

  public update(delta: number, elapsedTime: number): void {
    this.particles.update(delta);

    // Passive opponent pull slight drift between answers
    this.targetRopeOffset = Math.min(
      5.0,
      this.targetRopeOffset + delta * 0.14
    );

    const damp = 1 - Math.exp(-8 * delta);
    this.ropeOffset = THREE.MathUtils.lerp(
      this.ropeOffset,
      this.targetRopeOffset,
      damp
    );

    if (this.ropeAssembly) {
      this.ropeAssembly.position.x = this.centerOffset + this.ropeOffset * 0.7;
    }

    this.teamLeanAngle = THREE.MathUtils.lerp(this.teamLeanAngle, 0.1, damp);
    if (this.playerTeamGroup) {
      this.playerTeamGroup.children.forEach((ch) => {
        ch.rotation.x = -this.teamLeanAngle;
      });
    }
    if (this.robotTeamGroup) {
      this.robotTeamGroup.children.forEach((ch, idx) => {
        ch.rotation.x = -0.18 + Math.sin(elapsedTime * 5 + idx) * 0.08;
      });
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      this.camera.position.set(
        this.baseCamPos.x + Math.sin(elapsedTime * 48) * 0.16,
        this.baseCamPos.y + Math.cos(elapsedTime * 42) * 0.12,
        this.baseCamPos.z
      );
    } else {
      this.camera.position.copy(this.baseCamPos);
    }
  }

  public handleInput(_action: Batch3InputAction): void {}

  public getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  public dispose(): void {
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    disposeGroupDeep(this.rootGroup);
  }
}

// ============================================================================
// GAME #20: ARENA BOSS AKHIR (RAKSASA ILMU 3D — COLOSSEUM BOSS BATTLE)
// ============================================================================
export class ArenaBossGame implements IBatch3MiniGame {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private maxAnisotropy = 4;
  private uniformId: CostumeUniformId;
  private accessories: AccessoryId[];

  private bossGolem: THREE.Group | null = null;
  private bossCoreMesh: THREE.Mesh | null = null;
  private playerAvatar: THREE.Group | null = null;
  private playerPos = new THREE.Vector3(2.5, 0, 10.5);
  private dangerRing: THREE.Mesh | null = null;
  private energyOrb: THREE.Mesh | null = null;
  private ultimateBeam: THREE.Mesh | null = null;
  private pillarGroups: THREE.Group[] = [];
  private interactables: THREE.Object3D[] = [];

  private orbStart = new THREE.Vector3();
  private orbTarget = new THREE.Vector3(2.5, 4.8, -8.5);
  private orbTimer = 0;
  private orbActive = false;
  private ultimateTimer = 0;
  private bossStunTimer = 0;
  private bossDefeated = false;

  private readonly centerOffset = 2.5;

  constructor(
    uniformId: CostumeUniformId = 'sd',
    accessories: AccessoryId[] = ['topi_sekolah', 'tas_ransel']
  ) {
    this.uniformId = uniformId;
    this.accessories = accessories;
  }

  public init(
    container: Batch3ContainerContext,
    questionPack: QuestionPack,
    _onScoreUpdate: (isCorrect: boolean, chosenIndex: number) => void,
    _onGameOver: (victory: boolean) => void
  ): void {
    this.camera = container.camera;
    this.maxAnisotropy = container.maxAnisotropy;

    this.rootGroup = new THREE.Group();
    container.sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.pillarGroups = [];
    this.interactables = [];
    this.bossDefeated = false;

    this.camera.position.set(this.centerOffset, 13.5, 22.0);
    this.camera.lookAt(this.centerOffset, 2.8, -2.5);

    // 1. Grand Circular Colosseum Arena
    const arenaFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 21.5, 1.0, 36),
      new THREE.MeshStandardMaterial({
        color: 0x292524,
        roughness: 0.75,
        metalness: 0.2
      })
    );
    arenaFloor.position.set(this.centerOffset, -0.5, 0);
    arenaFloor.receiveShadow = true;
    this.rootGroup.add(arenaFloor);

    // Colosseum Perimeter Columns
    const colGeo = new THREE.CylinderGeometry(0.65, 0.75, 6.5, 10);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.7
    });
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(
        this.centerOffset + Math.cos(ang) * 18.5,
        3.25,
        Math.sin(ang) * 18.5
      );
      this.rootGroup.add(col);
    }

    // 2. Giant Boss Golem ("Raksasa Ilmu 3D") at Z = -8.5
    this.bossGolem = this.createBossGolemMesh();
    this.bossGolem.position.set(this.centerOffset, 0, -8.5);
    this.rootGroup.add(this.bossGolem);

    // 3. Flashing Red Danger Zone Ring (Real-Time Dodge Phase)
    this.dangerRing = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.5, 28),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      })
    );
    this.dangerRing.rotation.x = -Math.PI / 2;
    this.dangerRing.position.set(this.centerOffset + 3.5, 0.06, 6.5);
    this.rootGroup.add(this.dangerRing);

    // 4. Player Character in the Arena
    this.playerAvatar = createStudentAvatar(this.uniformId, this.accessories);
    this.playerPos.set(this.centerOffset, 0, 10.5);
    this.playerAvatar.position.copy(this.playerPos);
    this.playerAvatar.rotation.y = Math.PI;
    this.rootGroup.add(this.playerAvatar);

    // 5. Giant Energy Orb & Ultimate Beam
    this.energyOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.9
      })
    );
    this.energyOrb.visible = false;
    this.rootGroup.add(this.energyOrb);

    const ultGeo = new THREE.CylinderGeometry(0.85, 0.85, 19.0, 16);
    ultGeo.rotateX(Math.PI / 2);
    this.ultimateBeam = new THREE.Mesh(
      ultGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.92
      })
    );
    this.ultimateBeam.position.set(this.centerOffset, 3.6, 1.0);
    this.ultimateBeam.visible = false;
    this.rootGroup.add(this.ultimateBeam);

    // 6. 4 Elemental Counter-Attack Pillars (A, B, C, D)
    this.rebuildElementalPillars(questionPack.questions[0]);
  }

  private createBossGolemMesh(): THREE.Group {
    const g = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x44403c,
      roughness: 0.8,
      metalness: 0.25
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });

    // Legs & Torso
    const legL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 1.6), rockMat);
    legL.position.set(-1.5, 1.4, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 1.6), rockMat);
    legR.position.set(1.5, 1.4, 0);
    const torso = new THREE.Mesh(
      new THREE.DodecahedronGeometry(3.1, 0),
      rockMat
    );
    torso.position.y = 4.6;
    torso.castShadow = true;

    // Glowing Chest Core
    this.bossCoreMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.25, 0),
      coreMat
    );
    this.bossCoreMesh.position.set(0, 4.6, 2.2);

    // Head & Glowing Eyes
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.0), rockMat);
    head.position.set(0, 7.6, 0.2);
    const eyeGeo = new THREE.BoxGeometry(0.45, 0.22, 0.15);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.5, 7.7, 1.22);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.5, 7.7, 1.22);

    // Giant Stone Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.8, 1.4), rockMat);
    armL.position.set(-3.8, 4.5, 0.4);
    armL.name = 'BossArmL';
    const armR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.8, 1.4), rockMat);
    armR.position.set(3.8, 4.5, 0.4);
    armR.name = 'BossArmR';

    g.add(
      legL,
      legR,
      torso,
      this.bossCoreMesh,
      head,
      eyeL,
      eyeR,
      armL,
      armR
    );
    return g;
  }

  public rebuildElementalPillars(question?: QuestionItem): void {
    this.pillarGroups.forEach((pg) => {
      disposeGroupDeep(pg);
      this.rootGroup.remove(pg);
    });
    this.pillarGroups = [];
    this.interactables = [];

    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    BOSS_PILLAR_SPECS.forEach((spec, idx) => {
      const pg = new THREE.Group();
      pg.position.set(this.centerOffset + spec.x, 0, spec.z);

      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 1.05, 3.2, 8),
        new THREE.MeshStandardMaterial({
          color: spec.colorHex,
          emissive: spec.colorHex,
          emissiveIntensity: 0.4,
          roughness: 0.25
        })
      );
      column.position.y = 1.6;
      pg.add(column);

      const orbTop = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.65, 0),
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: spec.colorHex,
          emissiveIntensity: 0.8
        })
      );
      orbTop.position.y = 3.8;
      pg.add(orbTop);

      const tex = createSignTexture(
        spec.name.toUpperCase(),
        opts[idx],
        '#0f172a',
        spec.cssHex,
        this.maxAnisotropy
      );
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 1.4, 0.16),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      board.position.set(0, 2.5, 1.0);
      pg.add(board);

      pg.userData = {
        interactType: 'batch3_option',
        optionIndex: idx
      };
      this.rootGroup.add(pg);
      this.pillarGroups.push(pg);
      this.interactables.push(pg);
    });
  }

  public steerPlayerInArena(dx: number, dz: number, dt: number): void {
    const speed = 10.5;
    this.playerPos.x = THREE.MathUtils.clamp(
      this.playerPos.x + dx * speed * dt,
      this.centerOffset - 14,
      this.centerOffset + 14
    );
    this.playerPos.z = THREE.MathUtils.clamp(
      this.playerPos.z + dz * speed * dt,
      -2,
      14
    );
    if (this.playerAvatar) {
      this.playerAvatar.position.copy(this.playerPos);
      this.playerAvatar.rotation.y = Math.atan2(dx, dz);
    }
  }

  public triggerPillarCounterAttack(
    pillarIdx: number,
    isCorrect: boolean,
    isUltimate: boolean,
    bossDefeated: boolean,
    nextQuestion?: QuestionItem
  ): void {
    const spec = BOSS_PILLAR_SPECS[pillarIdx] || BOSS_PILLAR_SPECS[0];
    soundManager.playBossRoarOrBeam(isUltimate, isCorrect);

    // Move player near selected pillar
    this.playerPos.set(
      this.centerOffset + spec.x * 0.72,
      0,
      spec.z + 1.5
    );
    if (this.playerAvatar) {
      this.playerAvatar.position.copy(this.playerPos);
      this.playerAvatar.lookAt(this.centerOffset, 2.0, -8.5);
    }

    if (isCorrect) {
      this.orbStart.set(this.centerOffset + spec.x, 3.8, spec.z);
      this.orbTarget.set(this.centerOffset, 4.6, -6.5);
      this.orbTimer = 0;
      this.orbActive = true;
      if (this.energyOrb) {
        this.energyOrb.visible = true;
        this.energyOrb.position.copy(this.orbStart);
      }
      this.bossStunTimer = 0.85;
      this.bossDefeated = bossDefeated;

      if (isUltimate && this.ultimateBeam) {
        this.ultimateTimer = 0.75;
        this.ultimateBeam.visible = true;
      }

      this.particles.emitBurst(this.orbTarget, true, isUltimate ? 40 : 28);
    } else {
      // Boss slams ground & emits red shockwave
      this.particles.emitBurst(
        new THREE.Vector3(this.playerPos.x, 1.5, this.playerPos.z),
        false,
        28
      );
    }

    if (nextQuestion && !bossDefeated) {
      window.setTimeout(() => {
        if (this.rootGroup.parent) {
          this.rebuildElementalPillars(nextQuestion);
        }
      }, 750);
    }
  }

  public update(delta: number, elapsedTime: number): void {
    this.particles.update(delta);

    // Animate Boss Golem idle / stun / defeat cutscene
    if (this.bossGolem) {
      const armL = this.bossGolem.getObjectByName('BossArmL');
      const armR = this.bossGolem.getObjectByName('BossArmR');
      if (this.bossDefeated) {
        this.bossGolem.position.y = THREE.MathUtils.lerp(
          this.bossGolem.position.y,
          -3.2,
          delta * 2.5
        );
        this.bossGolem.rotation.x = THREE.MathUtils.lerp(
          this.bossGolem.rotation.x,
          0.45,
          delta * 2.5
        );
      } else if (this.bossStunTimer > 0) {
        this.bossStunTimer -= delta;
        this.bossGolem.position.x =
          this.centerOffset + Math.sin(elapsedTime * 42) * 0.35;
      } else {
        this.bossGolem.position.x = this.centerOffset;
        this.bossGolem.position.y = Math.sin(elapsedTime * 2.2) * 0.18;
        if (armL) armL.rotation.x = Math.sin(elapsedTime * 2.8) * 0.45;
        if (armR) armR.rotation.x = -Math.sin(elapsedTime * 2.8) * 0.45;
      }
    }

    if (this.bossCoreMesh) {
      this.bossCoreMesh.rotation.y += delta * 2.2;
      this.bossCoreMesh.rotation.z += delta * 1.4;
    }

    // Real-time Danger Zone Ring pulsing on the arena floor
    if (this.dangerRing) {
      const pulse = 0.85 + Math.sin(elapsedTime * 8) * 0.2;
      this.dangerRing.scale.setScalar(pulse);
      this.dangerRing.position.x =
        this.centerOffset + Math.sin(elapsedTime * 0.9) * 5.5;
      this.dangerRing.position.z = 5.5 + Math.cos(elapsedTime * 0.7) * 3.5;
    }

    // Energy Orb flight from Pillar to Boss Core
    if (this.orbActive && this.energyOrb) {
      this.orbTimer = Math.min(1, this.orbTimer + delta * 3.2);
      this.energyOrb.position.lerpVectors(
        this.orbStart,
        this.orbTarget,
        this.orbTimer
      );
      if (this.orbTimer >= 1) {
        this.orbActive = false;
        this.energyOrb.visible = false;
      }
    }

    if (this.ultimateTimer > 0 && this.ultimateBeam) {
      this.ultimateTimer -= delta;
      if (this.ultimateTimer <= 0) {
        this.ultimateBeam.visible = false;
      }
    }
  }

  public handleInput(_action: Batch3InputAction): void {}

  public getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  public dispose(): void {
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    disposeGroupDeep(this.rootGroup);
    this.interactables = [];
    this.pillarGroups = [];
  }
}
