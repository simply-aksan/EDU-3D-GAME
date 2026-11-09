import * as THREE from 'three';
import {
  AccessoryId,
  CostumeUniformId,
  QuestionItem,
  QuestionPack
} from './questions';
import {
  createContactShadowMesh,
  createSignTexture,
  createStudentAvatar,
  createVehicle,
  updateAvatarAnimation
} from './models3d';
import {
  CATAPULT_TARGET_X,
  getRocketRingCoordinates,
  ROCKET_RING_COORDS,
  sampleParabolicTrajectory
} from './rules';

export interface IMiniGameModule {
  init(
    scene: THREE.Group,
    camera: THREE.PerspectiveCamera,
    questionPack: QuestionPack
  ): void;
  update(deltaTime: number): void;
  cleanup(): void;
}

// Helper to recursively dispose geometries, materials, and textures
export function disposeGroupDeep(root: THREE.Object3D): void {
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

// Zero-GC Pooled 3D Particle Burst System (`THREE.InstancedMesh`)
export class ParticleBurstPool {
  private instanced: THREE.InstancedMesh;
  private count = 48;
  private positions: Float32Array;
  private velocities: Float32Array;
  private ages: Float32Array;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor(parent: THREE.Group) {
    const geo = new THREE.OctahedronGeometry(0.22, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });
    this.instanced = new THREE.InstancedMesh(geo, mat, this.count);
    this.instanced.frustumCulled = false;

    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.ages = new Float32Array(this.count);
    this.ages.fill(99);

    for (let i = 0; i < this.count; i++) {
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.instanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.instanced.instanceMatrix.needsUpdate = true;
    parent.add(this.instanced);
  }

  public emitBurst(
    origin: THREE.Vector3,
    isSuccess: boolean,
    particleCount = 24
  ): void {
    const mat = this.instanced.material as THREE.MeshStandardMaterial;
    mat.color.setHex(isSuccess ? 0x34d399 : 0xf43f5e);
    mat.emissive.setHex(isSuccess ? 0x10b981 : 0xe11d48);

    let spawned = 0;
    for (let i = 0; i < this.count && spawned < particleCount; i++) {
      this.ages[i] = 0;
      this.positions[i * 3] = origin.x;
      this.positions[i * 3 + 1] = origin.y;
      this.positions[i * 3 + 2] = origin.z;

      const theta = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 6.5;
      this.velocities[i * 3] = Math.cos(theta) * speed;
      this.velocities[i * 3 + 1] = 3.0 + Math.random() * 6.5;
      this.velocities[i * 3 + 2] = Math.sin(theta) * speed;

      this.color.setHex(isSuccess ? 0xfacc15 : 0xfb7185);
      this.instanced.setColorAt(i, this.color);
      spawned++;
    }
    if (this.instanced.instanceColor) {
      this.instanced.instanceColor.needsUpdate = true;
    }
  }

  public update(dt: number): void {
    let anyActive = false;
    for (let i = 0; i < this.count; i++) {
      if (this.ages[i] >= 1.0) continue;
      anyActive = true;
      this.ages[i] += dt * 1.4;
      const t = this.ages[i];

      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      this.velocities[i * 3 + 1] -= 15.0 * dt; // gravity

      const scale = Math.max(0, 1 - t);
      this.dummy.position.set(
        this.positions[i * 3],
        this.positions[i * 3 + 1],
        this.positions[i * 3 + 2]
      );
      this.dummy.rotation.set(t * 6, t * 8, 0);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.instanced.setMatrixAt(i, this.dummy.matrix);
    }
    if (anyActive) {
      this.instanced.instanceMatrix.needsUpdate = true;
    }
  }
}

// ============================================================================
// GAME #7: PERTAHANAN KASTIL (ARSENA SAINS) - 3D Tower Defense
// ============================================================================
interface MonsterActor {
  group: THREE.Group;
  x: number;
  z: number;
  speed: number;
  alive: boolean;
  archetype: number;
}

export class PertahananKastilGame implements IMiniGameModule {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private cannonTurret: THREE.Group | null = null;
  private projectileMesh: THREE.Mesh | null = null;
  private projectileActive = false;
  private projectileT = 0;
  private projectileStart = new THREE.Vector3(-9.5, 4.2, 0);
  private projectileTarget = new THREE.Vector3(6, 1.5, 0);
  private monsters: MonsterActor[] = [];
  private elapsed = 0;
  private camPos = new THREE.Vector3(3.5, 10.5, 22);
  private camLook = new THREE.Vector3(-1.5, 2.2, 0);

  public init(
    sceneGroup: THREE.Group,
    camera: THREE.PerspectiveCamera,
    _questionPack: QuestionPack
  ): void {
    this.camera = camera;
    this.rootGroup = new THREE.Group();
    sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.monsters = [];
    this.elapsed = 0;

    // Ground & Enemy Stone Path from Right (+18) to Left Castle (-11)
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(42, 42, 1.0, 36),
      new THREE.MeshStandardMaterial({ color: 0x1e3a2f, roughness: 0.85 })
    );
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.rootGroup.add(ground);

    const pathMesh = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.08, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 })
    );
    pathMesh.position.set(3, 0.04, 0);
    pathMesh.receiveShadow = true;
    this.rootGroup.add(pathMesh);

    // Left 3D Science Castle (-11.5, 0, 0) - 8-part composite structure
    const castleGroup = new THREE.Group();
    castleGroup.position.set(-11.5, 0, 0);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.7,
      metalness: 0.15
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.35,
      metalness: 0.45
    });

    const keep = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 5.2, 5.6),
      stoneMat
    );
    keep.position.y = 2.6;
    keep.castShadow = true;
    keep.receiveShadow = true;
    castleGroup.add(keep);

    // 2 Front Bastion Towers
    [-2.6, 2.6].forEach((tz) => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.3, 6.4, 12),
        stoneMat
      );
      tower.position.set(1.6, 3.2, tz);
      tower.castShadow = true;
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(1.45, 2.0, 12),
        trimMat
      );
      roof.position.set(1.6, 7.4, tz);
      castleGroup.add(tower, roof);
    });

    // Science Plasma Cannon Turret on top of Castle Keep
    this.cannonTurret = new THREE.Group();
    this.cannonTurret.position.set(1.2, 5.4, 0);
    const turretBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 14, 12),
      trimMat
    );
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 2.6, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.75,
        roughness: 0.2
      })
    );
    barrel.rotation.z = -Math.PI / 2;
    barrel.position.set(1.2, 0.2, 0);
    this.cannonTurret.add(turretBase, barrel);
    castleGroup.add(this.cannonTurret);
    this.rootGroup.add(castleGroup);

    // Cannon Plasma Projectile
    this.projectileMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.9,
        roughness: 0.1
      })
    );
    this.projectileMesh.visible = false;
    this.rootGroup.add(this.projectileMesh);

    // Spawn 5 Distinct Monsters along the Right Path
    for (let i = 0; i < 5; i++) {
      const mGroup = this.createMonsterModel(i % 3);
      const startX = 4.5 + i * 3.2;
      const startZ = (i % 2 === 0 ? 1 : -1) * 0.65;
      mGroup.position.set(startX, 0, startZ);
      this.rootGroup.add(mGroup);
      this.monsters.push({
        group: mGroup,
        x: startX,
        z: startZ,
        speed: 0.35 + (i % 3) * 0.1,
        alive: true,
        archetype: i % 3
      });
    }
  }

  private createMonsterModel(archetype: number): THREE.Group {
    const g = new THREE.Group();
    g.add(createContactShadowMesh(1.1));
    const colors = [0xef4444, 0xa855f7, 0xf97316];
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colors[archetype],
      roughness: 0.45,
      metalness: 0.2
    });
    const hornMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.3
    });

    const body = new THREE.Mesh(
      archetype === 0
        ? new THREE.BoxGeometry(1.4, 1.6, 1.4)
        : archetype === 1
        ? new THREE.OctahedronGeometry(1.05, 0)
        : new THREE.CylinderGeometry(0.7, 1.0, 1.6, 8),
      bodyMat
    );
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);

    const hornL = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.65, 8),
      hornMat
    );
    hornL.position.set(0, 2.0, -0.35);
    const hornR = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.65, 8),
      hornMat
    );
    hornR.position.set(0, 2.0, 0.35);
    g.add(hornL, hornR);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    eye.position.set(-0.68, 1.15, 0);
    g.add(eye);

    return g;
  }

  public triggerAnswerAction(isCorrect: boolean): void {
    const aliveMonsters = this.monsters
      .filter((m) => m.alive)
      .sort((a, b) => a.x - b.x);
    const nearest = aliveMonsters[0];

    if (isCorrect && nearest) {
      this.projectileActive = true;
      this.projectileT = 0;
      this.projectileStart.set(-9.2, 5.5, 0);
      this.projectileTarget.set(nearest.x, 1.2, nearest.z);
      if (this.projectileMesh) {
        this.projectileMesh.visible = true;
      }
      // Defeat nearest monster after brief impact
      nearest.alive = false;
      this.particles.emitBurst(
        new THREE.Vector3(nearest.x, 1.4, nearest.z),
        true,
        28
      );
      nearest.group.visible = false;
    } else {
      // Wrong answer: misfire smoke at cannon + monsters surge forward
      this.particles.emitBurst(new THREE.Vector3(-9.2, 5.5, 0), false, 22);
      for (const m of this.monsters) {
        if (m.alive) {
          m.x = Math.max(-7.5, m.x - 1.8);
        }
      }
    }
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.particles.update(dt);

    // Advance surviving monsters slowly toward castle
    for (const m of this.monsters) {
      if (!m.alive) continue;
      m.x = Math.max(-7.8, m.x - m.speed * dt);
      m.group.position.x = m.x;
      m.group.position.y = Math.abs(Math.sin(this.elapsed * 4 + m.x)) * 0.25;
    }

    // Animate plasma cannon projectile
    if (this.projectileActive && this.projectileMesh) {
      this.projectileT += dt * 3.8;
      if (this.projectileT >= 1) {
        this.projectileActive = false;
        this.projectileMesh.visible = false;
      } else {
        const pos = sampleParabolicTrajectory(
          this.projectileStart,
          this.projectileTarget,
          2.6,
          this.projectileT
        );
        this.projectileMesh.position.set(pos.x, pos.y, pos.z);
      }
    }

    const damp = 1 - Math.exp(-6 * dt);
    this.camera.position.lerp(this.camPos, damp);
    this.camera.lookAt(this.camLook);
  }

  public cleanup(): void {
    disposeGroupDeep(this.rootGroup);
    this.rootGroup.clear();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }
}

// ============================================================================
// GAME #8: BALAP ROKET GALAKSI - 3D Space Flight with Answer Rings A/B/C/D
// ============================================================================
export class BalapRoketGame implements IMiniGameModule {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private rocketGroup: THREE.Group | null = null;
  private ringsGroup: THREE.Group | null = null;
  private ringMeshes: THREE.Object3D[] = [];
  private starInstanced: THREE.InstancedMesh | null = null;
  private targetRocketPos = new THREE.Vector2(0, 0.5);
  private currentRocketPos = new THREE.Vector2(0, 0.5);
  private ringsZ = -28;
  private elapsed = 0;
  private maxAnisotropy = 4;

  constructor(maxAnisotropy = 4) {
    this.maxAnisotropy = maxAnisotropy;
  }

  public init(
    sceneGroup: THREE.Group,
    camera: THREE.PerspectiveCamera,
    questionPack: QuestionPack
  ): void {
    this.camera = camera;
    this.rootGroup = new THREE.Group();
    sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.elapsed = 0;

    // 60 Instanced Space Asteroids / Stars
    const starGeo = new THREE.DodecahedronGeometry(0.45, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: 0x1e293b,
      roughness: 0.6
    });
    this.starInstanced = new THREE.InstancedMesh(starGeo, starMat, 60);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const rad = 11 + (i % 4) * 3.5;
      dummy.position.set(
        Math.cos(angle) * rad,
        Math.sin(angle) * rad * 0.65,
        -i * 1.4
      );
      dummy.scale.setScalar(0.5 + (i % 3) * 0.35);
      dummy.updateMatrix();
      this.starInstanced.setMatrixAt(i, dummy.matrix);
    }
    this.starInstanced.instanceMatrix.needsUpdate = true;
    this.starInstanced.computeBoundingSphere();
    this.rootGroup.add(this.starInstanced);

    // Player 3D Space Rocket oriented horizontally toward -Z
    this.rocketGroup = new THREE.Group();
    const rocketModel = createVehicle('rocket');
    rocketModel.rotation.x = -Math.PI / 2;
    rocketModel.scale.setScalar(0.75);
    this.rocketGroup.add(rocketModel);
    this.rocketGroup.position.set(0, 0.5, 2);
    this.rootGroup.add(this.rocketGroup);

    this.buildAnswerRings(questionPack.questions[0]);
  }

  public buildAnswerRings(question?: QuestionItem): void {
    if (this.ringsGroup) {
      disposeGroupDeep(this.ringsGroup);
      this.rootGroup.remove(this.ringsGroup);
    }
    this.ringsGroup = new THREE.Group();
    this.ringMeshes = [];
    this.ringsZ = -18;
    this.ringsGroup.position.z = this.ringsZ;

    const letters = ['A', 'B', 'C', 'D'];
    const ringColors = [0xf59e0b, 0x06b6d4, 0x10b981, 0xec4899];
    const hexStrings = ['#f59e0b', '#06b6d4', '#10b981', '#ec4899'];
    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    ROCKET_RING_COORDS.forEach(([rx, ry], idx) => {
      const holder = new THREE.Group();
      holder.position.set(rx, ry, 0);

      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(2.05, 0.24, 12, 28),
        new THREE.MeshStandardMaterial({
          color: ringColors[idx],
          emissive: ringColors[idx],
          emissiveIntensity: 0.55,
          roughness: 0.2
        })
      );
      holder.add(torus);

      const tex = createSignTexture(
        `CINCIN ${letters[idx]}`,
        opts[idx],
        '#0f172a',
        hexStrings[idx],
        this.maxAnisotropy
      );
      const labelPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.1, 1.35),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      labelPlane.position.set(0, 0, 0.1);
      holder.add(labelPlane);

      holder.userData = {
        interactType: 'rocket_ring',
        optionIndex: idx
      };
      this.ringsGroup!.add(holder);
      this.ringMeshes.push(holder);
    });

    this.rootGroup.add(this.ringsGroup);
  }

  public getInteractables(): THREE.Object3D[] {
    return this.ringMeshes;
  }

  public steerRocket(normX: number, normY: number): void {
    this.targetRocketPos.set(
      THREE.MathUtils.clamp(normX * 5.2, -5.2, 5.2),
      THREE.MathUtils.clamp(normY * 3.0, -2.5, 3.2)
    );
  }

  public flyThroughRing(
    ringIndex: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    const coords = getRocketRingCoordinates(ringIndex);
    this.targetRocketPos.set(coords.x, coords.y);
    this.currentRocketPos.set(coords.x, coords.y);
    if (this.rocketGroup) {
      this.rocketGroup.position.set(coords.x, coords.y, 2);
    }
    this.particles.emitBurst(
      new THREE.Vector3(coords.x, coords.y, -4),
      isCorrect,
      28
    );
    this.buildAnswerRings(nextQuestion);
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.particles.update(dt);

    const damp = 1 - Math.exp(-8 * dt);
    this.currentRocketPos.lerp(this.targetRocketPos, damp);

    if (this.rocketGroup) {
      const dx = this.targetRocketPos.x - this.currentRocketPos.x;
      this.rocketGroup.position.set(
        this.currentRocketPos.x,
        this.currentRocketPos.y + Math.sin(this.elapsed * 4) * 0.12,
        2
      );
      this.rocketGroup.rotation.z = -dx * 0.18;
    }

    if (this.ringsGroup) {
      this.ringsZ += dt * 2.2;
      if (this.ringsZ > -7.5) {
        this.ringsZ = -18;
      }
      this.ringsGroup.position.z = this.ringsZ;
    }

    this.camera.position.lerp(new THREE.Vector3(0, 1.4, 11.5), damp);
    this.camera.lookAt(0, 0.4, -10);
  }

  public cleanup(): void {
    disposeGroupDeep(this.rootGroup);
    this.rootGroup.clear();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }
}

// ============================================================================
// GAME #9: ARSITEK MENARA - 3D Block Stacker
// ============================================================================
export class ArsitekMenaraGame implements IMiniGameModule {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private craneBlock: THREE.Group | null = null;
  private stackedGroup = new THREE.Group();
  private floorCount = 0;
  private elapsed = 0;

  public init(
    sceneGroup: THREE.Group,
    camera: THREE.PerspectiveCamera,
    _questionPack: QuestionPack
  ): void {
    this.camera = camera;
    this.rootGroup = new THREE.Group();
    sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.stackedGroup = new THREE.Group();
    this.rootGroup.add(this.stackedGroup);
    this.floorCount = 0;
    this.elapsed = 0;

    // Construction Plaza Ground & Foundation Pad
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(36, 36, 1.0, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.rootGroup.add(ground);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.5, 6.4),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
    );
    pad.position.y = 0.25;
    pad.receiveShadow = true;
    this.rootGroup.add(pad);

    // Swinging Crane Block at Top
    this.craneBlock = this.createBuildingFloorMesh(0, 0x38bdf8);
    this.craneBlock.position.set(0, 5.5, 0);
    this.rootGroup.add(this.craneBlock);
  }

  private createBuildingFloorMesh(index: number, colorHex: number): THREE.Group {
    const g = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.45,
      metalness: 0.2
    });
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
      roughness: 0.15
    });

    const core = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.35, 4.2),
      wallMat
    );
    core.castShadow = true;
    core.receiveShadow = true;
    g.add(core);

    // Procedural 3D Windows along front facade
    [-1.2, 0, 1.2].forEach((wx) => {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.65, 0.12),
        winMat
      );
      win.position.set(wx, 0 + (index % 2) * 0.02, 2.12);
      g.add(win);
    });

    return g;
  }

  public dropFloorBlock(
    isCorrect: boolean,
    tiltAngle: number,
    offsetX: number
  ): void {
    const palette = [0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x06b6d4];
    const color = palette[this.floorCount % palette.length];
    const newBlock = this.createBuildingFloorMesh(this.floorCount, color);

    const yPos = 0.5 + this.floorCount * 1.38 + 0.68;
    newBlock.position.set(offsetX, yPos, 0);
    newBlock.rotation.z = tiltAngle;
    this.stackedGroup.add(newBlock);
    this.floorCount++;

    this.particles.emitBurst(
      new THREE.Vector3(offsetX, yPos + 0.5, 1.5),
      isCorrect,
      26
    );
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.particles.update(dt);

    const topY = 0.5 + this.floorCount * 1.38 + 3.6;
    if (this.craneBlock) {
      this.craneBlock.position.set(
        Math.sin(this.elapsed * 2.4) * 2.2,
        topY,
        0
      );
    }

    const damp = 1 - Math.exp(-6 * dt);
    const camY = Math.max(6.5, this.floorCount * 1.2 + 5.5);
    this.camera.position.lerp(new THREE.Vector3(0, camY, 14.5), damp);
    this.camera.lookAt(0, Math.max(2.2, this.floorCount * 0.9), 0);
  }

  public cleanup(): void {
    disposeGroupDeep(this.rootGroup);
    this.rootGroup.clear();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }
}

// ============================================================================
// GAME #10: LABIRIN MINOTAUR - 3D Procedural Maze with Top-Down Angled Camera
// ============================================================================
export class LabirinMinotaurGame implements IMiniGameModule {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private playerAvatar: THREE.Group | null = null;
  private minotaurGroup: THREE.Group | null = null;
  private gateMeshes: THREE.Mesh[] = [];
  private currentCheckpointIdx = 0;
  private elapsed = 0;
  private uniformId: CostumeUniformId = 'sd';
  private accessories: AccessoryId[] = ['topi_sekolah', 'tas_ransel'];

  private readonly checkpoints = [
    new THREE.Vector3(0, 0, 10),
    new THREE.Vector3(-4, 0, 4),
    new THREE.Vector3(4, 0, -2),
    new THREE.Vector3(-2, 0, -8),
    new THREE.Vector3(0, 0, -13)
  ];

  constructor(
    uniform: CostumeUniformId = 'sd',
    accessories: AccessoryId[] = ['topi_sekolah', 'tas_ransel']
  ) {
    this.uniformId = uniform;
    this.accessories = accessories;
  }

  public init(
    sceneGroup: THREE.Group,
    camera: THREE.PerspectiveCamera,
    _questionPack: QuestionPack
  ): void {
    this.camera = camera;
    this.rootGroup = new THREE.Group();
    sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.gateMeshes = [];
    this.currentCheckpointIdx = 0;
    this.elapsed = 0;

    // Labyrinth Stone Floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(28, 0.6, 34),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
    );
    floor.position.y = -0.3;
    floor.receiveShadow = true;
    this.rootGroup.add(floor);

    // Procedural 3D Maze Walls (InstancedMesh for crisp performance)
    const wallCoords: [number, number, number, number][] = [
      // [x, z, width, depth]
      [-11, 0, 1.5, 30],
      [11, 0, 1.5, 30],
      [-5, 14, 12, 1.5],
      [6, 14, 10, 1.5],
      [5, 7, 11, 1.5],
      [-6, 1, 10, 1.5],
      [5, -5, 10, 1.5],
      [-5, -11, 10, 1.5],
      [0, -15, 22, 1.5]
    ];

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.7,
      metalness: 0.1
    });
    wallCoords.forEach(([wx, wz, ww, wd]) => {
      const wMesh = new THREE.Mesh(
        new THREE.BoxGeometry(ww, 2.8, wd),
        wallMat
      );
      wMesh.position.set(wx, 1.4, wz);
      wMesh.castShadow = true;
      wMesh.receiveShadow = true;
      this.rootGroup.add(wMesh);
    });

    // 4 Glowing Intersection Gates
    const gateCoords = [
      { x: -4, z: 4, color: 0xf59e0b },
      { x: 4, z: -2, color: 0x06b6d4 },
      { x: -2, z: -8, color: 0x10b981 },
      { x: 0, z: -12, color: 0xa855f7 }
    ];

    gateCoords.forEach((gc, idx) => {
      const gate = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 2.6, 0.5),
        new THREE.MeshStandardMaterial({
          color: gc.color,
          emissive: gc.color,
          emissiveIntensity: 0.45,
          roughness: 0.25
        })
      );
      gate.position.set(gc.x, 1.3, gc.z);
      this.rootGroup.add(gate);
      this.gateMeshes.push(gate);
      if (idx === 0) {
        // Highlight first gate
        gate.scale.setScalar(1.05);
      }
    });

    // 3D Minotaur Guardian & Golden Chalice at Maze Sanctum (0, 0, -13.5)
    this.minotaurGroup = new THREE.Group();
    const minoBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.2, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.6 })
    );
    minoBody.position.y = 1.1;
    const hornGeo = new THREE.ConeGeometry(0.22, 0.85, 8);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
    const hL = new THREE.Mesh(hornGeo, hornMat);
    hL.position.set(-0.65, 2.4, 0);
    hL.rotation.z = 0.5;
    const hR = new THREE.Mesh(hornGeo, hornMat);
    hR.position.set(0.65, 2.4, 0);
    hR.rotation.z = -0.5;
    this.minotaurGroup.add(minoBody, hL, hR);
    this.minotaurGroup.position.set(2.2, 0, -13.2);
    this.rootGroup.add(this.minotaurGroup);

    // Player Avatar
    this.playerAvatar = createStudentAvatar(this.uniformId, this.accessories);
    this.playerAvatar.position.copy(this.checkpoints[0]);
    this.playerAvatar.rotation.y = Math.PI;
    this.rootGroup.add(this.playerAvatar);
  }

  public unlockNextGate(isCorrect: boolean): void {
    const gate = this.gateMeshes[this.currentCheckpointIdx];
    const targetPos =
      this.checkpoints[
        Math.min(this.checkpoints.length - 1, this.currentCheckpointIdx + 1)
      ];

    if (isCorrect && gate) {
      gate.position.y = -1.6; // Slide gate into floor
      this.particles.emitBurst(
        new THREE.Vector3(targetPos.x, 1.5, targetPos.z),
        true,
        28
      );
      this.currentCheckpointIdx = Math.min(
        this.checkpoints.length - 1,
        this.currentCheckpointIdx + 1
      );
    } else if (gate) {
      this.particles.emitBurst(
        new THREE.Vector3(gate.position.x, 1.5, gate.position.z),
        false,
        20
      );
    }
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.particles.update(dt);

    const damp = 1 - Math.exp(-6.5 * dt);
    const target = this.checkpoints[this.currentCheckpointIdx];

    if (this.playerAvatar) {
      const dist = this.playerAvatar.position.distanceTo(target);
      this.playerAvatar.position.lerp(target, damp);
      updateAvatarAnimation(
        this.playerAvatar,
        this.elapsed * 4,
        dist > 0.25,
        0,
        this.elapsed
      );
    }

    if (this.minotaurGroup) {
      this.minotaurGroup.position.x = 2.0 + Math.sin(this.elapsed * 2) * 1.4;
    }

    // Top-Down Angled Camera
    this.camera.position.lerp(new THREE.Vector3(0, 22.5, 16.5), damp);
    this.camera.lookAt(0, 0, -1.5);
  }

  public cleanup(): void {
    disposeGroupDeep(this.rootGroup);
    this.rootGroup.clear();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }
}

// ============================================================================
// GAME #11: PANAHAN KATAPEL FISIKA - 3D Parabolic Slingshot & 4 Target Boards
// ============================================================================
export class PanahanKatapelGame implements IMiniGameModule {
  private rootGroup = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private particles!: ParticleBurstPool;
  private catapultArm: THREE.Mesh | null = null;
  private boulderMesh: THREE.Mesh | null = null;
  private arcDots: THREE.InstancedMesh | null = null;
  private targetBoards: THREE.Object3D[] = [];
  private aimedIndex = 0;
  private flying = false;
  private flightT = 0;
  private flightTargetIdx = 0;
  private flightWasCorrect = false;
  private elapsed = 0;
  private maxAnisotropy = 4;

  private readonly startOrigin = { x: 0, y: 1.8, z: 9.5 };
  private readonly camTarget = new THREE.Vector3(3.2, 8.2, 19.5);

  constructor(maxAnisotropy = 4) {
    this.maxAnisotropy = maxAnisotropy;
  }

  public init(
    sceneGroup: THREE.Group,
    camera: THREE.PerspectiveCamera,
    questionPack: QuestionPack
  ): void {
    this.camera = camera;
    this.rootGroup = new THREE.Group();
    sceneGroup.add(this.rootGroup);
    this.particles = new ParticleBurstPool(this.rootGroup);
    this.targetBoards = [];
    this.flying = false;
    this.flightT = 0;
    this.elapsed = 0;

    // Range Field Ground
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(42, 42, 1.0, 36),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 })
    );
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.rootGroup.add(ground);

    // 3D Wooden Catapult / Slingshot at (0, 0, 9.5)
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.7
    });
    const baseFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.6, 3.6),
      woodMat
    );
    baseFrame.position.set(0, 0.3, 9.5);
    baseFrame.castShadow = true;
    this.rootGroup.add(baseFrame);

    this.catapultArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.35, 3.2),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 })
    );
    this.catapultArm.position.set(0, 1.35, 9.5);
    this.catapultArm.rotation.x = 0.28;
    this.rootGroup.add(this.catapultArm);

    // Parabolic Trajectory Arc Preview (`THREE.InstancedMesh` of 18 glowing spheres)
    const dotGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.arcDots = new THREE.InstancedMesh(dotGeo, dotMat, 18);
    this.arcDots.frustumCulled = false;
    this.rootGroup.add(this.arcDots);
    this.updateParabolicArcPreview(0);

    // Flying Projectile Boulder
    this.boulderMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.52, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.5,
        roughness: 0.25
      })
    );
    this.boulderMesh.position.set(
      this.startOrigin.x,
      this.startOrigin.y,
      this.startOrigin.z
    );
    this.rootGroup.add(this.boulderMesh);

    this.buildTargetBoards(questionPack.questions[0]);
  }

  public buildTargetBoards(question?: QuestionItem): void {
    for (const tb of this.targetBoards) {
      disposeGroupDeep(tb);
      this.rootGroup.remove(tb);
    }
    this.targetBoards = [];

    const letters = ['A', 'B', 'C', 'D'];
    const colors = [0xf59e0b, 0x06b6d4, 0x10b981, 0xec4899];
    const hexStrings = ['#f59e0b', '#06b6d4', '#10b981', '#ec4899'];
    const opts = question?.options || ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];

    CATAPULT_TARGET_X.forEach((tx, idx) => {
      const boardGroup = new THREE.Group();
      boardGroup.position.set(tx, 0, -13);

      // Stand post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 3.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
      );
      post.position.y = 1.6;
      boardGroup.add(post);

      // Bullseye Disc
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.1, 0.3, 24),
        new THREE.MeshStandardMaterial({
          color: colors[idx],
          roughness: 0.35
        })
      );
      disc.rotation.x = Math.PI / 2;
      disc.position.set(0, 3.2, 0);
      disc.castShadow = true;
      boardGroup.add(disc);

      const innerBullseye = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 0.36, 20),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      innerBullseye.rotation.x = Math.PI / 2;
      innerBullseye.position.set(0, 3.2, 0.04);
      boardGroup.add(innerBullseye);

      // Sign Label above target board
      const tex = createSignTexture(
        `TARGET ${letters[idx]}`,
        opts[idx],
        '#0f172a',
        hexStrings[idx],
        this.maxAnisotropy
      );
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.8, 1.5),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      sign.position.set(0, 5.9, 0);
      boardGroup.add(sign);

      boardGroup.userData = {
        interactType: 'catapult_target',
        optionIndex: idx
      };
      this.rootGroup.add(boardGroup);
      this.targetBoards.push(boardGroup);
    });
  }

  public getInteractables(): THREE.Object3D[] {
    return this.targetBoards;
  }

  public updateParabolicArcPreview(targetIdx: number): void {
    this.aimedIndex = Math.max(0, Math.min(3, targetIdx));
    if (!this.arcDots) return;
    const dummy = new THREE.Object3D();
    const targetCoord = {
      x: CATAPULT_TARGET_X[this.aimedIndex],
      y: 3.2,
      z: -13
    };

    for (let i = 0; i < 18; i++) {
      const t = (i + 1) / 19;
      const pt = sampleParabolicTrajectory(
        this.startOrigin,
        targetCoord,
        6.2,
        t
      );
      dummy.position.set(pt.x, pt.y, pt.z);
      dummy.scale.setScalar(1 - t * 0.35);
      dummy.updateMatrix();
      this.arcDots.setMatrixAt(i, dummy.matrix);
    }
    this.arcDots.instanceMatrix.needsUpdate = true;
    this.arcDots.computeBoundingSphere();
  }

  public fireCatapultAtTarget(
    targetIdx: number,
    isCorrect: boolean,
    nextQuestion?: QuestionItem
  ): void {
    this.updateParabolicArcPreview(targetIdx);
    this.flightTargetIdx = targetIdx;
    this.flightWasCorrect = isCorrect;
    this.flying = true;
    this.flightT = 0;

    if (this.catapultArm) {
      this.catapultArm.rotation.x = -0.65;
    }

    const impactPos = new THREE.Vector3(
      CATAPULT_TARGET_X[targetIdx],
      3.2,
      -13
    );
    this.particles.emitBurst(impactPos, isCorrect, 30);

    if (nextQuestion) {
      this.buildTargetBoards(nextQuestion);
    }
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.particles.update(dt);

    if (this.catapultArm) {
      this.catapultArm.rotation.x = THREE.MathUtils.lerp(
        this.catapultArm.rotation.x,
        0.28,
        dt * 5
      );
    }

    if (this.flying && this.boulderMesh) {
      this.flightT += dt * 2.4;
      if (this.flightT >= 1.0) {
        this.flying = false;
        this.boulderMesh.position.set(
          this.startOrigin.x,
          this.startOrigin.y,
          this.startOrigin.z
        );
      } else {
        const targetCoord = {
          x: CATAPULT_TARGET_X[this.flightTargetIdx],
          y: 3.2,
          z: -13
        };
        const pt = sampleParabolicTrajectory(
          this.startOrigin,
          targetCoord,
          6.2,
          this.flightT
        );
        this.boulderMesh.position.set(pt.x, pt.y, pt.z);
      }
    }

    const damp = 1 - Math.exp(-6 * dt);
    this.camera.position.lerp(this.camTarget, damp);
    this.camera.lookAt(-2.5, 2.5, -6);
  }

  public cleanup(): void {
    disposeGroupDeep(this.rootGroup);
    this.rootGroup.clear();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }
}
