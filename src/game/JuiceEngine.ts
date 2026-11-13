import * as THREE from 'three';
import { PlayableGameId } from './questions';

export interface ComboStreakTier {
  streak: number;
  multiplier: 1 | 2 | 3 | 5;
  isFever: boolean;
  label: string;
  auraIntensity: number;
}

export interface DynamicDifficultyState {
  difficultyFactor: number;
  runnerSpeed: number;
  monsterSpeedMultiplier: number;
  goalieCountdownSec: number;
  opponentAggression: number;
}

export interface SpringVector3State {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

/**
 * Pure helper: Determines the Streak Multiplier (1x, 2x, 3x, 5x FEVER MODE!)
 * and activates Fever Mode when the player answers 3+ questions right in a row.
 */
export function getComboStreakTier(streak: number): ComboStreakTier {
  const safeStreak = Math.max(0, Math.floor(streak));
  if (safeStreak >= 5) {
    return {
      streak: safeStreak,
      multiplier: 5,
      isFever: true,
      label: '5x FEVER MODE!',
      auraIntensity: 1.0
    };
  }
  if (safeStreak >= 3) {
    return {
      streak: safeStreak,
      multiplier: 3,
      isFever: true,
      label: '3x FEVER MODE!',
      auraIntensity: 0.75
    };
  }
  if (safeStreak === 2) {
    return {
      streak: safeStreak,
      multiplier: 2,
      isFever: false,
      label: '2x COMBO!',
      auraIntensity: 0.25
    };
  }
  return {
    streak: safeStreak,
    multiplier: 1,
    isFever: false,
    label: '1x',
    auraIntensity: 0
  };
}

/**
 * Pure helper: Dynamic Difficulty Adjustment (DDA) for action mini-games
 * (Lari Kilat, Pertahanan Kastil, Penjaga Gawang, Tarik Tambang, Arena Boss).
 * Obstacle speed and opponent aggressiveness scale up progressively with score & streak.
 */
export function computeDynamicDifficulty(
  score: number,
  streak: number
): DynamicDifficultyState {
  const safeScore = Math.max(0, score);
  const safeStreak = Math.max(0, streak);

  const scoreComponent = Math.min(0.55, (safeScore / 600) * 0.45);
  const streakComponent = Math.min(0.35, safeStreak * 0.045);
  const difficultyFactor = Number(
    (1.0 + scoreComponent + streakComponent).toFixed(3)
  );

  const runnerSpeed = Number((16.0 * difficultyFactor).toFixed(2));
  const monsterSpeedMultiplier = Number(
    (1.0 + scoreComponent * 0.85 + streakComponent * 0.9).toFixed(3)
  );
  const goalieCountdownSec = Math.max(
    3,
    Math.round(6 - Math.min(2.5, safeScore / 350 + safeStreak * 0.2))
  );
  const opponentAggression = Number(
    (1.0 + Math.min(0.75, safeScore / 700 + safeStreak * 0.04)).toFixed(3)
  );

  return {
    difficultyFactor,
    runnerSpeed,
    monsterSpeedMultiplier,
    goalieCountdownSec,
    opponentAggression
  };
}

/**
 * Pure helper: Steps a 3D second-order damped spring (used for Squash & Stretch).
 */
export function stepSpringScale3D(
  state: SpringVector3State,
  targetX: number,
  targetY: number,
  targetZ: number,
  stiffness: number,
  damping: number,
  dt: number
): SpringVector3State {
  const clampedDt = Math.min(Math.max(dt, 0), 0.05);

  const ax = (targetX - state.x) * stiffness - state.vx * damping;
  const ay = (targetY - state.y) * stiffness - state.vy * damping;
  const az = (targetZ - state.z) * stiffness - state.vz * damping;

  const vx = state.vx + ax * clampedDt;
  const vy = state.vy + ay * clampedDt;
  const vz = state.vz + az * clampedDt;

  const x = state.x + vx * clampedDt;
  const y = state.y + vy * clampedDt;
  const z = state.z + vz * clampedDt;

  return { x, y, z, vx, vy, vz };
}

// ============================================================================
// 1. PHYSICS CHARACTER CONTROLLER (Velocity Damping, Squash & Stretch, Fever Aura)
// ============================================================================
export class PhysicsCharacterController {
  public readonly position = new THREE.Vector3(0, 0, 15);
  public readonly velocity = new THREE.Vector3(0, 0, 0);
  public rotationY = Math.PI;
  public jumpY = 0;
  public verticalVel = 0;
  public walkDistance = 0;
  public isMoving = false;
  public isSprinting = false;

  // Squash & Stretch spring state:
  // Squash on jump prepare / landing: (1.15, 0.85, 1.15)
  // Stretch while airborne: (0.9, 1.15, 0.9)
  // Rest scale: (1, 1, 1)
  public scaleState: SpringVector3State = {
    x: 1,
    y: 1,
    z: 1,
    vx: 0,
    vy: 0,
    vz: 0
  };
  private wasAirborne = false;

  // Fever Mode Electric Aura 3D Group
  private feverAuraGroup: THREE.Group | null = null;
  private feverActive = false;
  private feverSparks: THREE.Mesh[] = [];

  // Movement tuning constants
  private readonly acceleration = 68.0;
  private readonly frictionDamping = 9.5;
  private readonly baseMaxSpeed = 10.8;
  private readonly sprintMultiplier = 1.32;
  private readonly gravity = 25.0;

  public attachToAvatar(avatar: THREE.Group): void {
    // Build procedural electric Fever Aura if not already attached
    const existing = avatar.getObjectByName('FeverElectricAura');
    if (existing) {
      this.feverAuraGroup = existing as THREE.Group;
      this.feverAuraGroup.visible = this.feverActive;
      return;
    }

    const aura = new THREE.Group();
    aura.name = 'FeverElectricAura';
    aura.visible = this.feverActive;

    const ringGeo1 = new THREE.TorusGeometry(1.15, 0.045, 10, 32);
    ringGeo1.rotateX(Math.PI / 2);
    const ringMatCyan = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMatCyan);
    ring1.name = 'FeverRingCyan';
    ring1.position.y = 0.25;
    aura.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(0.95, 0.038, 10, 28);
    ringGeo2.rotateX(Math.PI / 2);
    const ringMatGold = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMatGold);
    ring2.name = 'FeverRingGold';
    ring2.position.y = 1.05;
    aura.add(ring2);

    this.feverSparks = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.14, 0);
    for (let i = 0; i < 8; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00f0ff : 0xfacc15
      });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      aura.add(spark);
      this.feverSparks.push(spark);
    }

    avatar.add(aura);
    this.feverAuraGroup = aura;
  }

  public setFeverMode(active: boolean): void {
    this.feverActive = active;
    if (this.feverAuraGroup) {
      this.feverAuraGroup.visible = active;
    }
  }

  public isFeverActive(): boolean {
    return this.feverActive;
  }

  /**
   * Triggers jump with takeoff Squash (1.15, 0.85, 1.15) that transitions into
   * airborne Stretch (0.9, 1.15, 0.9) and lands back at (1, 1, 1) via spring physics.
   */
  public triggerJump(impulse = 9.6): boolean {
    if (this.jumpY > 0.05) return false;
    this.verticalVel = impulse;
    // Immediate takeoff squash: scale.set(1.15, 0.85, 1.15)
    this.scaleState.x = 1.15;
    this.scaleState.y = 0.85;
    this.scaleState.z = 1.15;
    // Upward spring impulse toward stretch
    this.scaleState.vx = -2.2;
    this.scaleState.vy = 3.2;
    this.scaleState.vz = -2.2;
    return true;
  }

  /**
   * Manual squash & stretch pulse for interactive actions / answering questions.
   */
  public triggerSquashPulse(sx = 1.15, sy = 0.85, sz = 1.15): void {
    this.scaleState.x = sx;
    this.scaleState.y = sy;
    this.scaleState.z = sz;
  }

  /**
   * Updates velocity-damped horizontal movement, vertical jump physics,
   * Squash & Stretch spring interpolation, and Fever Mode electric aura.
   */
  public update(
    dt: number,
    elapsed: number,
    inputX: number,
    inputZ: number,
    sprintRequested: boolean,
    worldBounds = 42,
    avatar: THREE.Group | null = null
  ): void {
    const inputLen = Math.hypot(inputX, inputZ);
    const hasInput = inputLen > 0.05;
    const normX = hasInput ? inputX / inputLen : 0;
    const normZ = hasInput ? inputZ / inputLen : 0;

    this.isSprinting = hasInput && (sprintRequested || this.feverActive);
    const maxSpeed =
      this.baseMaxSpeed * (this.isSprinting ? this.sprintMultiplier : 1.0);

    if (hasInput) {
      this.velocity.x += normX * this.acceleration * dt;
      this.velocity.z += normZ * this.acceleration * dt;

      const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      if (currentSpeed > maxSpeed) {
        const scale = maxSpeed / currentSpeed;
        this.velocity.x *= scale;
        this.velocity.z *= scale;
      }

      // Smooth angular interpolation for character facing direction
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = targetYaw - this.rotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.rotationY += diff * (1 - Math.exp(-14 * dt));
    } else {
      // Exponential velocity damping (smooth deceleration instead of abrupt stop)
      const damping = Math.exp(-this.frictionDamping * dt);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
      if (Math.hypot(this.velocity.x, this.velocity.z) < 0.08) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.isMoving = horizSpeed > 0.25;

    if (this.isMoving) {
      this.position.x = THREE.MathUtils.clamp(
        this.position.x + this.velocity.x * dt,
        -worldBounds,
        worldBounds
      );
      this.position.z = THREE.MathUtils.clamp(
        this.position.z + this.velocity.z * dt,
        -worldBounds,
        worldBounds
      );
      this.walkDistance += horizSpeed * dt;
    }

    // Vertical Jump & Gravity Physics
    this.updateVerticalAndSquashStretch(dt, elapsed, avatar);
  }

  /**
   * Updates only vertical jump physics, Squash & Stretch spring, and Fever Aura
   * (used in lane-based or fixed-position mini-games like Lari Kilat / Jatuh Bangun).
   */
  public updateVerticalAndSquashStretch(
    dt: number,
    elapsed: number,
    avatar: THREE.Group | null = null
  ): void {
    const isAirborneNow = this.jumpY > 0.001 || this.verticalVel > 0.001;

    if (isAirborneNow) {
      this.jumpY += this.verticalVel * dt;
      this.verticalVel -= this.gravity * dt;
      if (this.jumpY <= 0) {
        this.jumpY = 0;
        this.verticalVel = 0;
        // Landing impact Squash: scale.set(1.15, 0.85, 1.15)
        this.scaleState.x = 1.15;
        this.scaleState.y = 0.85;
        this.scaleState.z = 1.15;
        this.scaleState.vx = 0.8;
        this.scaleState.vy = -1.5;
        this.scaleState.vz = 0.8;
      }
    }

    const airborne = this.jumpY > 0.06;
    this.wasAirborne = airborne;

    // Target scale: (0.9, 1.15, 0.9) while airborne, (1, 1, 1) on ground
    const targetScaleX = airborne ? 0.9 : 1.0;
    const targetScaleY = airborne ? 1.15 : 1.0;
    const targetScaleZ = airborne ? 0.9 : 1.0;

    this.scaleState = stepSpringScale3D(
      this.scaleState,
      targetScaleX,
      targetScaleY,
      targetScaleZ,
      195,
      15.5,
      dt
    );

    if (avatar) {
      avatar.scale.set(
        this.scaleState.x,
        this.scaleState.y,
        this.scaleState.z
      );

      if (!this.feverAuraGroup || this.feverAuraGroup.parent !== avatar) {
        this.attachToAvatar(avatar);
      }

      if (this.feverAuraGroup && this.feverActive) {
        this.feverAuraGroup.visible = true;
        const ringCyan = this.feverAuraGroup.getObjectByName('FeverRingCyan');
        const ringGold = this.feverAuraGroup.getObjectByName('FeverRingGold');
        if (ringCyan) {
          ringCyan.rotation.z = elapsed * 4.5;
          ringCyan.position.y = 0.35 + Math.sin(elapsed * 6) * 0.12;
        }
        if (ringGold) {
          ringGold.rotation.z = -elapsed * 5.2;
          ringGold.position.y = 1.15 + Math.cos(elapsed * 5.5) * 0.16;
        }
        for (let i = 0; i < this.feverSparks.length; i++) {
          const spark = this.feverSparks[i];
          const angle = elapsed * 5.8 + (i / this.feverSparks.length) * Math.PI * 2;
          const radius = 0.95 + Math.sin(elapsed * 8 + i) * 0.18;
          spark.position.set(
            Math.cos(angle) * radius,
            0.4 + ((elapsed * 1.8 + i * 0.25) % 1.8),
            Math.sin(angle) * radius
          );
          spark.rotation.x += dt * 8;
          spark.rotation.y += dt * 10;
        }
      } else if (this.feverAuraGroup) {
        this.feverAuraGroup.visible = false;
      }
    }
  }
}

// ============================================================================
// 2. CAMERA CONTROLLER (Smooth Lerp Follow, Dynamic FOV 60->72, Directional Shake)
// ============================================================================
export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private readonly currentLookAt = new THREE.Vector3(0, 2, 0);
  private readonly basePosition = new THREE.Vector3();
  private readonly shakeOffset = new THREE.Vector3();
  private readonly directionalOffset = new THREE.Vector3();
  private readonly directionalVel = new THREE.Vector3();

  private trauma = 0;
  private shakeSeed = 0;

  public readonly defaultFov = 60;
  public readonly sprintFov = 72;
  private currentFov = 60;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.basePosition.copy(camera.position);
    this.currentFov = camera.fov || 60;
  }

  /**
   * Triggers a proportional directional camera kick + trauma shake
   * (e.g., collision with obstacle, Boss ground slam, cannon recoil, or wrong answer).
   */
  public triggerDirectionalShake(
    direction: THREE.Vector3,
    intensity = 0.55
  ): void {
    const clamped = THREE.MathUtils.clamp(intensity, 0.05, 1.5);
    this.trauma = Math.min(1.0, this.trauma + clamped * 0.65);

    const dir = direction.clone();
    if (dir.lengthSq() < 0.0001) {
      dir.set(0, -0.5, 1).normalize();
    } else {
      dir.normalize();
    }

    this.directionalVel.addScaledVector(dir, clamped * 9.5);
  }

  public addTrauma(amount: number): void {
    this.trauma = THREE.MathUtils.clamp(this.trauma + amount, 0, 1.0);
  }

  public getCurrentFov(): number {
    return this.currentFov;
  }

  /**
   * Smoothly follows target position & lookAt with exponential lerp,
   * updates Dynamic FOV (60 -> 72 during sprint / Lari Kilat / Balap Roket),
   * and applies directional spring + trauma screen shake.
   */
  public updateFollow(
    realDt: number,
    desiredPosition: THREE.Vector3,
    desiredLookAt: THREE.Vector3,
    mode: PlayableGameId,
    isHighSpeedOrSprint: boolean,
    followSpeed = 8.0
  ): void {
    const safeDt = Math.min(Math.max(realDt, 0.001), 0.05);
    const lerpFactor = 1 - Math.exp(-followSpeed * safeDt);

    this.basePosition.lerp(desiredPosition, lerpFactor);
    this.currentLookAt.lerp(desiredLookAt, lerpFactor);

    // Dynamic FOV: widens from 60 to 72 in Lari Kilat, Balap Roket, or while Sprinting/Fever
    const wantsWideFov =
      mode === 'lari_kilat' ||
      mode === 'balap_roket' ||
      isHighSpeedOrSprint;
    const targetFov = wantsWideFov ? this.sprintFov : this.defaultFov;
    const fovLerp = 1 - Math.exp(-6.5 * safeDt);
    this.currentFov = THREE.MathUtils.lerp(
      this.currentFov,
      targetFov,
      fovLerp
    );

    if (Math.abs(this.camera.fov - this.currentFov) > 0.02) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    this.applyShakeToCamera(safeDt);
  }

  /**
   * Applies Dynamic FOV and Directional Screen Shake when a mini-game module
   * sets its own static/custom camera position.
   */
  public updateShakeAndFovOnly(
    realDt: number,
    mode: PlayableGameId,
    isHighSpeedOrSprint: boolean
  ): void {
    const safeDt = Math.min(Math.max(realDt, 0.001), 0.05);
    const wantsWideFov =
      mode === 'lari_kilat' ||
      mode === 'balap_roket' ||
      isHighSpeedOrSprint;
    const targetFov = wantsWideFov ? this.sprintFov : this.defaultFov;
    this.currentFov = THREE.MathUtils.lerp(
      this.currentFov,
      targetFov,
      1 - Math.exp(-6.5 * safeDt)
    );
    if (Math.abs(this.camera.fov - this.currentFov) > 0.02) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    if (this.trauma > 0.001 || this.directionalOffset.lengthSq() > 0.0001) {
      this.updateShakeVectors(safeDt);
      this.camera.position.add(this.shakeOffset);
    }
  }

  private updateShakeVectors(dt: number): void {
    // Spring return for directional impulse
    const stiffness = 140;
    const damping = 12;
    const ax =
      -this.directionalOffset.x * stiffness - this.directionalVel.x * damping;
    const ay =
      -this.directionalOffset.y * stiffness - this.directionalVel.y * damping;
    const az =
      -this.directionalOffset.z * stiffness - this.directionalVel.z * damping;

    this.directionalVel.x += ax * dt;
    this.directionalVel.y += ay * dt;
    this.directionalVel.z += az * dt;

    this.directionalOffset.x += this.directionalVel.x * dt;
    this.directionalOffset.y += this.directionalVel.y * dt;
    this.directionalOffset.z += this.directionalVel.z * dt;

    // Quadratic trauma shake decay
    this.shakeOffset.copy(this.directionalOffset);
    if (this.trauma > 0) {
      this.shakeSeed += dt * 42;
      const shakeMag = this.trauma * this.trauma * 0.55;
      this.shakeOffset.x += Math.sin(this.shakeSeed * 1.7) * shakeMag;
      this.shakeOffset.y += Math.cos(this.shakeSeed * 2.3) * shakeMag * 0.8;
      this.shakeOffset.z += Math.sin(this.shakeSeed * 1.3) * shakeMag * 0.6;
      this.trauma = Math.max(0, this.trauma - dt * 1.75);
    }
  }

  private applyShakeToCamera(dt: number): void {
    this.updateShakeVectors(dt);
    this.camera.position.copy(this.basePosition).add(this.shakeOffset);
    this.camera.lookAt(
      this.currentLookAt.x + this.shakeOffset.x * 0.35,
      this.currentLookAt.y + this.shakeOffset.y * 0.35,
      this.currentLookAt.z
    );
  }
}

// ============================================================================
// 3. JUICE MANAGER (Micro Hit-Stop timeScale=0.1 & 3D Floating Combat/Score Text)
// ============================================================================
interface FloatingCombatSprite {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  texture: THREE.CanvasTexture;
  age: number;
  maxLife: number;
  velY: number;
  baseScaleX: number;
  baseScaleY: number;
}

export class JuiceManager {
  private scene?: THREE.Scene;
  private floatingSprites: FloatingCombatSprite[] = [];

  // Micro Hit-Stop state (timeScale = 0.1 for 80ms on impact)
  private hitStopTimer = 0;
  private hitStopScale = 1.0;

  constructor(scene?: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Triggers a Micro Hit-Stop (default: timeScale = 0.1 for 80ms / 0.08s)
   * right when a projectile hits or the player answers a question.
   */
  public triggerHitStop(durationSec = 0.08, timeScale = 0.1): void {
    this.hitStopTimer = Math.max(this.hitStopTimer, durationSec);
    this.hitStopScale = timeScale;
  }

  public getTimeScale(): number {
    return this.hitStopTimer > 0 ? this.hitStopScale : 1.0;
  }

  public isHitStopActive(): boolean {
    return this.hitStopTimer > 0;
  }

  /**
   * Spawns a 3D Floating Combat / Score Text Sprite that pops in and floats upward
   * (e.g., "+150 XP! CRITICAL BRAIN!", "5x FEVER MODE!", "COMBO x3!").
   */
  public spawnFloatingText(
    worldPos: THREE.Vector3,
    headline: string,
    subline = '',
    accentColor = '#00f0ff',
    isCritical = false
  ): void {
    if (typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // High-contrast neo-brutalist badge pill background
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = isCritical ? 6 : 4;
    ctx.beginPath();
    ctx.roundRect(16, 16, 480, subline ? 128 : 96, 22);
    ctx.fill();
    ctx.stroke();

    // Headline text
    ctx.font = isCritical
      ? '900 40px "Fredoka", "Plus Jakarta Sans", sans-serif'
      : '800 36px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#020617';
    ctx.strokeText(headline, 256, subline ? 58 : 64);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(headline, 256, subline ? 58 : 64);

    // Subline text (e.g., "CRITICAL BRAIN! · 5x FEVER MODE!")
    if (subline) {
      ctx.font = '800 24px "JetBrains Mono", "Plus Jakarta Sans", monospace';
      ctx.strokeText(subline, 256, 108);
      ctx.fillStyle = accentColor;
      ctx.fillText(subline, 256, 108);
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(worldPos);
    sprite.position.y += 2.6;
    sprite.renderOrder = 999;

    const baseScaleX = isCritical ? 4.8 : 4.0;
    const baseScaleY = baseScaleX * (160 / 512);
    sprite.scale.set(baseScaleX * 0.2, baseScaleY * 0.2, 1);

    this.scene?.add(sprite);
    this.floatingSprites.push({
      sprite,
      material,
      texture,
      age: 0,
      maxLife: isCritical ? 1.55 : 1.25,
      velY: isCritical ? 2.4 : 1.9,
      baseScaleX,
      baseScaleY
    });
  }

  /**
   *Updates Hit-Stop timer and animates all active 3D Floating Combat Text sprites
   * using unscaled real deltaTime. Returns the scaled simulation dt.
   */
  public update(realDt: number): number {
    const safeDt = Math.min(Math.max(realDt, 0), 0.05);

    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - safeDt);
    }

    for (let i = this.floatingSprites.length - 1; i >= 0; i--) {
      const item = this.floatingSprites[i];
      item.age += safeDt;
      const progress = item.age / item.maxLife;

      if (progress >= 1) {
        this.scene?.remove(item.sprite);
        item.material.dispose();
        item.texture.dispose();
        this.floatingSprites.splice(i, 1);
        continue;
      }

      // Elastic pop-in during first 18% of lifetime
      const popScale =
        progress < 0.18
          ? THREE.MathUtils.lerp(0.25, 1.18, progress / 0.18)
          : progress < 0.3
          ? THREE.MathUtils.lerp(1.18, 1.0, (progress - 0.18) / 0.12)
          : 1.0;

      item.sprite.scale.set(
        item.baseScaleX * popScale,
        item.baseScaleY * popScale,
        1
      );
      item.sprite.position.y += item.velY * safeDt * (1 - progress * 0.45);

      // Smooth fade-out in final 30% of lifetime
      item.material.opacity =
        progress > 0.7 ? Math.max(0, 1 - (progress - 0.7) / 0.3) : 1.0;
    }

    return safeDt * this.getTimeScale();
  }

  public clearAll(): void {
    for (const item of this.floatingSprites) {
      this.scene?.remove(item.sprite);
      item.material.dispose();
      item.texture.dispose();
    }
    this.floatingSprites = [];
    this.hitStopTimer = 0;
  }
}
