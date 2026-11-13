import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BiomeId } from './questions';

export interface BiomeLightingPreset {
  id: BiomeId;
  label: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  ambientColor: number;
  ambientIntensity: number;
  rimColor: number;
  rimIntensity: number;
  atmosphereColor: number;
  atmosphereSecondaryColor: number;
  atmosphereDriftY: number;
  atmosphereSize: number;
}

export const BIOME_LIGHTING_PRESETS: Record<BiomeId, BiomeLightingPreset> = {
  kota_ilmu: {
    id: 'kota_ilmu',
    label: 'Siang Cerah di Kota Ilmu',
    skyColor: 0x0b2545,
    fogColor: 0x0f2942,
    fogDensity: 0.01,
    hemiSkyColor: 0x87ceeb,
    hemiGroundColor: 0x1e293b,
    hemiIntensity: 0.7,
    sunColor: 0xfffbeb,
    sunIntensity: 1.4,
    sunPosition: [26, 42, 24],
    ambientColor: 0xe0f2fe,
    ambientIntensity: 0.35,
    rimColor: 0x38bdf8,
    rimIntensity: 0.5,
    atmosphereColor: 0xfef08a,
    atmosphereSecondaryColor: 0x38bdf8,
    atmosphereDriftY: 0.35,
    atmosphereSize: 0.28
  },
  samudra: {
    id: 'samudra',
    label: 'Biendar Bioluminesensi Biru-Cyan di Samudra',
    skyColor: 0x041e34,
    fogColor: 0x062844,
    fogDensity: 0.015,
    hemiSkyColor: 0x22d3ee,
    hemiGroundColor: 0x083344,
    hemiIntensity: 0.85,
    sunColor: 0x67e8f9,
    sunIntensity: 1.25,
    sunPosition: [14, 46, 12],
    ambientColor: 0x0ea5e9,
    ambientIntensity: 0.45,
    rimColor: 0x00e5ff,
    rimIntensity: 0.75,
    atmosphereColor: 0x67e8f9,
    atmosphereSecondaryColor: 0x2dd4bf,
    atmosphereDriftY: 1.15,
    atmosphereSize: 0.34
  },
  angkasa: {
    id: 'angkasa',
    label: 'Kontras Deep-Space di Angkasa',
    skyColor: 0x050814,
    fogColor: 0x070b19,
    fogDensity: 0.008,
    hemiSkyColor: 0x818cf8,
    hemiGroundColor: 0x090d16,
    hemiIntensity: 0.65,
    sunColor: 0xf8fafc,
    sunIntensity: 1.6,
    sunPosition: [34, 44, -18],
    ambientColor: 0x312e81,
    ambientIntensity: 0.3,
    rimColor: 0xc084fc,
    rimIntensity: 0.8,
    atmosphereColor: 0xffffff,
    atmosphereSecondaryColor: 0x818cf8,
    atmosphereDriftY: 0.08,
    atmosphereSize: 0.32
  },
  rimba: {
    id: 'rimba',
    label: 'Sinar Matahari Menembus Kanopi di Rimba',
    skyColor: 0x052e16,
    fogColor: 0x06371b,
    fogDensity: 0.013,
    hemiSkyColor: 0x86efac,
    hemiGroundColor: 0x14532d,
    hemiIntensity: 0.75,
    sunColor: 0xfef08a,
    sunIntensity: 1.38,
    sunPosition: [18, 45, 20],
    ambientColor: 0x4ade80,
    ambientIntensity: 0.32,
    rimColor: 0xa3e635,
    rimIntensity: 0.55,
    atmosphereColor: 0xbef264,
    atmosphereSecondaryColor: 0xfde047,
    atmosphereDriftY: 0.45,
    atmosphereSize: 0.3
  },
  nusantara: {
    id: 'nusantara',
    label: 'Golden Hour Sore di Nusantara',
    skyColor: 0x2e150b,
    fogColor: 0x3b190d,
    fogDensity: 0.011,
    hemiSkyColor: 0xfdba74,
    hemiGroundColor: 0x431407,
    hemiIntensity: 0.78,
    sunColor: 0xffedd5,
    sunIntensity: 1.5,
    sunPosition: [-32, 24, -26],
    ambientColor: 0xfb923c,
    ambientIntensity: 0.38,
    rimColor: 0xf59e0b,
    rimIntensity: 0.68,
    atmosphereColor: 0xfcd34d,
    atmosphereSecondaryColor: 0xf97316,
    atmosphereDriftY: 0.5,
    atmosphereSize: 0.3
  }
};

/**
 * Pure helper to calculate proximity rim-glow intensity (0..1)
 * as the player approaches an interactive 3D object.
 */
export function computeProximityGlowIntensity(
  distanceMeters: number,
  triggerRadius = 11.5,
  elapsedSeconds = 0
): number {
  if (distanceMeters >= triggerRadius) return 0;
  const normalized = Math.max(
    0,
    Math.min(1, 1 - distanceMeters / triggerRadius)
  );
  const pulse = 0.82 + 0.18 * Math.sin(elapsedSeconds * 5.2);
  return Number((normalized * normalized * pulse).toFixed(4));
}

/**
 * Pure helper for dynamic water wave vertex height at (x, z, uTime).
 */
export function evaluateWaterWaveDisplacement(
  x: number,
  z: number,
  uTime: number
): number {
  const waveX = Math.sin(x * 1.35 + uTime * 2.6) * 0.075;
  const waveZ = Math.cos(z * 1.35 + uTime * 2.1) * 0.065;
  const ripple = Math.sin((x + z) * 0.9 - uTime * 3.2) * 0.035;
  return Number((waveX + waveZ + ripple).toFixed(5));
}

// ============================================================================
// 1. CENTRALIZED MATERIAL LIBRARY & PROCEDURAL SHADER UPGRADE
// ============================================================================
export class MaterialLibrary {
  private isSoftwareGl: boolean;
  private cache = new Map<string, THREE.Material>();
  private waterUniforms: { uTime: { value: number } }[] = [];

  constructor(isSoftwareGl = false) {
    this.isSoftwareGl = isSoftwareGl;
  }

  public getVehiclePhysicalMaterial(
    key: string,
    colorHex: number,
    options?: {
      roughness?: number;
      metalness?: number;
      clearcoat?: number;
      clearcoatRoughness?: number;
      emissive?: number;
      emissiveIntensity?: number;
    }
  ): THREE.MeshPhysicalMaterial {
    const cacheKey = `phys_${key}_${colorHex.toString(16)}`;
    const existing = this.cache.get(cacheKey) as
      | THREE.MeshPhysicalMaterial
      | undefined;
    if (existing) return existing;

    const mat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: options?.roughness ?? 0.28,
      metalness: options?.metalness ?? 0.42,
      clearcoat: options?.clearcoat ?? 0.3,
      clearcoatRoughness: options?.clearcoatRoughness ?? 0.14,
      emissive: options?.emissive ?? 0x000000,
      emissiveIntensity: options?.emissiveIntensity ?? 0.0
    });
    mat.userData.sharedMaterial = true;
    this.cache.set(cacheKey, mat);
    return mat;
  }

  public getGlassMaterial(
    key: string,
    colorHex = 0x38bdf8,
    opacity = 0.72
  ): THREE.MeshPhysicalMaterial {
    const cacheKey = `glass_${key}_${colorHex.toString(16)}_${opacity}`;
    const existing = this.cache.get(cacheKey) as
      | THREE.MeshPhysicalMaterial
      | undefined;
    if (existing) return existing;

    const mat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.1,
      metalness: 0.12,
      transmission: this.isSoftwareGl ? 0 : 0.65,
      thickness: 0.5,
      ior: 1.48,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: this.isSoftwareGl ? Math.min(0.68, opacity) : opacity
    });
    mat.userData.sharedMaterial = true;
    this.cache.set(cacheKey, mat);
    return mat;
  }

  public createDynamicWaterMaterial(
    key: string,
    colorHex = 0x0ea5e9,
    emissiveHex = 0x0284c7
  ): THREE.MeshPhysicalMaterial {
    const cacheKey = `water_${key}_${colorHex.toString(16)}`;
    const existing = this.cache.get(cacheKey) as
      | THREE.MeshPhysicalMaterial
      | undefined;
    if (existing) return existing;

    const uTimeUniform = { uTime: { value: 0 } };
    this.waterUniforms.push(uTimeUniform);

    const mat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      emissive: emissiveHex,
      emissiveIntensity: 0.28,
      roughness: 0.14,
      metalness: 0.18,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      transmission: this.isSoftwareGl ? 0 : 0.45,
      transparent: true,
      opacity: 0.88
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTimeUniform.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float waveA = sin(transformed.x * 1.35 + uTime * 2.6) * 0.075;
          float waveB = cos(transformed.z * 1.35 + uTime * 2.1) * 0.065;
          float waveC = sin((transformed.x + transformed.z) * 0.9 - uTime * 3.2) * 0.035;
          transformed.y += waveA + waveB + waveC;
          `
        );
    };
    mat.customProgramCacheKey = () => cacheKey;
    mat.userData.sharedMaterial = true;
    this.cache.set(cacheKey, mat);
    return mat;
  }

  public getStandardMaterial(
    key: string,
    colorHex: number,
    roughness = 0.6,
    metalness = 0.15,
    emissiveHex = 0x000000,
    emissiveIntensity = 0
  ): THREE.MeshStandardMaterial {
    const cacheKey = `std_${key}_${colorHex.toString(16)}_${roughness}_${metalness}_${emissiveHex.toString(16)}`;
    const existing = this.cache.get(cacheKey) as
      | THREE.MeshStandardMaterial
      | undefined;
    if (existing) return existing;

    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      metalness,
      emissive: emissiveHex,
      emissiveIntensity
    });
    mat.userData.sharedMaterial = true;
    this.cache.set(cacheKey, mat);
    return mat;
  }

  public createRimGlowMaterial(colorHex = 0x00e5ff): THREE.MeshBasicMaterial {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.0,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return mat;
  }

  public updateShaders(elapsedSeconds: number): void {
    for (let i = 0; i < this.waterUniforms.length; i++) {
      this.waterUniforms[i].uTime.value = elapsedSeconds;
    }
  }

  public disposeAll(): void {
    this.cache.forEach((mat) => mat.dispose());
    this.cache.clear();
    this.waterUniforms = [];
  }
}

/**
 * Attaches a proximity-reactive Outline / Rim Glow shell + ground beacon ring
 * to an interactive 3D object (Subject Building, NPC, Book, Chest, or Gate).
 */
export function attachInteractiveRimGlow(
  target: THREE.Group,
  boundsSize: [number, number, number],
  centerOffsetY: number,
  glowColorHex = 0x00e5ff
): void {
  const rimGroup = new THREE.Group();
  rimGroup.name = 'InteractiveRimGlow';

  // BackSide inverted hull outline shell
  const hullGeo = new THREE.BoxGeometry(
    boundsSize[0] * 1.06,
    boundsSize[1] * 1.05,
    boundsSize[2] * 1.06
  );
  const hullMat = new THREE.MeshBasicMaterial({
    color: glowColorHex,
    transparent: true,
    opacity: 0.0,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.name = 'RimHullMesh';
  hullMesh.position.y = centerOffsetY;
  rimGroup.add(hullMesh);

  // Ground proximity ring beacon
  const radius = Math.max(boundsSize[0], boundsSize[2]) * 0.62;
  const ringGeo = new THREE.RingGeometry(radius * 0.86, radius, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: glowColorHex,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.name = 'RimGroundRing';
  ringMesh.position.y = 0.06;
  rimGroup.add(ringMesh);

  target.add(rimGroup);
}

// ============================================================================
// 2. GLOBAL PARTICLE & ENVIRONMENT ATMOSPHERE ENGINE
// ============================================================================
interface BurstParticleSlot {
  active: boolean;
  kind: 'coin' | 'jump_dust' | 'correct_stars';
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  baseScale: number;
  rotSpeed: number;
  color: THREE.Color;
}

interface ShockwaveRingSlot {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  maxRadius: number;
}

export class ParticleEngine {
  private parentGroup: THREE.Group;
  private atmospherePoints: THREE.Points | null = null;
  private atmospherePositions: Float32Array;
  private atmosphereSpeeds: Float32Array;
  private atmosphereCount = 140;
  private currentDriftY = 0.35;

  private burstInstancedMesh: THREE.InstancedMesh;
  private maxBurstCount = 96;
  private burstPool: BurstParticleSlot[] = [];
  private burstCursor = 0;

  private shockwaveRings: ShockwaveRingSlot[] = [];
  private _dummy = new THREE.Object3D();
  private _zeroScaleMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(scene: THREE.Scene) {
    this.parentGroup = new THREE.Group();
    this.parentGroup.name = 'GlobalParticleEngine';
    scene.add(this.parentGroup);

    this.atmospherePositions = new Float32Array(this.atmosphereCount * 3);
    this.atmosphereSpeeds = new Float32Array(this.atmosphereCount);

    // Build atmospheric particle field
    this.initAtmosphereField(BIOME_LIGHTING_PRESETS.kota_ilmu);

    // Build InstancedMesh pool for burst particles (stars/sparks/dust)
    const burstGeo = new THREE.OctahedronGeometry(0.18, 0);
    const burstMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.burstInstancedMesh = new THREE.InstancedMesh(
      burstGeo,
      burstMat,
      this.maxBurstCount
    );
    this.burstInstancedMesh.frustumCulled = false;

    const defaultColor = new THREE.Color(0xfacc15);
    for (let i = 0; i < this.maxBurstCount; i++) {
      this.burstInstancedMesh.setMatrixAt(i, this._zeroScaleMatrix);
      this.burstInstancedMesh.setColorAt(i, defaultColor);
      this.burstPool.push({
        active: false,
        kind: 'coin',
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        maxAge: 0.6,
        baseScale: 1,
        rotSpeed: 4,
        color: defaultColor.clone()
      });
    }
    this.burstInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.burstInstancedMesh.instanceColor) {
      this.burstInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.parentGroup.add(this.burstInstancedMesh);

    // Build pooled Shockwave Rings for wrong-answer / impact feedback
    const ringGeo = new THREE.RingGeometry(0.65, 0.95, 28);
    ringGeo.rotateX(-Math.PI / 2);
    for (let r = 0; r < 4; r++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.parentGroup.add(mesh);
      this.shockwaveRings.push({
        active: false,
        mesh,
        mat,
        age: 0,
        maxAge: 0.65,
        maxRadius: 4.8
      });
    }
  }

  private initAtmosphereField(preset: BiomeLightingPreset): void {
    if (this.atmospherePoints) {
      this.atmospherePoints.geometry.dispose();
      (this.atmospherePoints.material as THREE.Material).dispose();
      this.parentGroup.remove(this.atmospherePoints);
    }

    const geo = new THREE.BufferGeometry();
    const colors = new Float32Array(this.atmosphereCount * 3);
    const colA = new THREE.Color(preset.atmosphereColor);
    const colB = new THREE.Color(preset.atmosphereSecondaryColor);
    const mixed = new THREE.Color();

    for (let i = 0; i < this.atmosphereCount; i++) {
      const i3 = i * 3;
      this.atmospherePositions[i3] = (Math.random() - 0.5) * 86;
      this.atmospherePositions[i3 + 1] = 0.8 + Math.random() * 22;
      this.atmospherePositions[i3 + 2] = (Math.random() - 0.5) * 86;
      this.atmosphereSpeeds[i] = 0.5 + Math.random() * 1.1;

      mixed.copy(colA).lerp(colB, (i % 5) / 4);
      colors[i3] = mixed.r;
      colors[i3 + 1] = mixed.g;
      colors[i3 + 2] = mixed.b;
    }

    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.atmospherePositions, 3)
    );
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: preset.atmosphereSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.atmospherePoints = new THREE.Points(geo, mat);
    this.atmospherePoints.frustumCulled = false;
    this.currentDriftY = preset.atmosphereDriftY;
    this.parentGroup.add(this.atmospherePoints);
  }

  public setBiomeAtmosphere(biome: BiomeId): void {
    const preset =
      BIOME_LIGHTING_PRESETS[biome] || BIOME_LIGHTING_PRESETS.kota_ilmu;
    this.initAtmosphereField(preset);
  }

  private spawnBurstParticle(
    kind: 'coin' | 'jump_dust' | 'correct_stars',
    origin: THREE.Vector3,
    vx: number,
    vy: number,
    vz: number,
    colorHex: number,
    scale: number,
    maxAge: number
  ): void {
    const slot = this.burstPool[this.burstCursor];
    this.burstCursor = (this.burstCursor + 1) % this.maxBurstCount;

    slot.active = true;
    slot.kind = kind;
    slot.position.copy(origin);
    slot.velocity.set(vx, vy, vz);
    slot.age = 0;
    slot.maxAge = maxAge;
    slot.baseScale = scale;
    slot.rotSpeed = 4 + Math.random() * 6;
    slot.color.setHex(colorHex);
  }

  /**
   * (a) Burst when collecting a Coin or Knowledge Book
   */
  public emitCoinBurst(origin: THREE.Vector3): void {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const speed = 2.4 + Math.random() * 2.2;
      this.spawnBurstParticle(
        'coin',
        origin,
        Math.cos(angle) * speed,
        3.2 + Math.random() * 2.6,
        Math.sin(angle) * speed,
        i % 2 === 0 ? 0xfacc15 : 0x38bdf8,
        1.1,
        0.55
      );
    }
  }

  /**
   * (b) Dust Puff at character's feet when jumping
   */
  public emitJumpDustPuff(feetOrigin: THREE.Vector3): void {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const speed = 1.6 + Math.random() * 1.4;
      this.spawnBurstParticle(
        'jump_dust',
        feetOrigin,
        Math.cos(angle) * speed,
        0.9 + Math.random() * 1.1,
        Math.sin(angle) * speed,
        0xe2e8f0,
        0.95,
        0.42
      );
    }
  }

  /**
   * (c) Golden Star Explosion on Correct Answer
   */
  public emitCorrectStarExplosion(origin: THREE.Vector3): void {
    const palette = [0xfacc15, 0xf59e0b, 0x34d399, 0x38bdf8];
    for (let i = 0; i < 24; i++) {
      const theta = (i / 24) * Math.PI * 2;
      const speed = 3.2 + Math.random() * 3.8;
      this.spawnBurstParticle(
        'correct_stars',
        origin,
        Math.cos(theta) * speed,
        4.2 + Math.random() * 3.8,
        Math.sin(theta) * speed,
        palette[i % palette.length],
        1.45,
        0.78
      );
    }
  }

  /**
   * (d) Red Shockwave Ring + Crimson Sparks on Wrong Answer
   */
  public emitWrongShockwaveRing(origin: THREE.Vector3): void {
    const ringSlot =
      this.shockwaveRings.find((r) => !r.active) || this.shockwaveRings[0];
    ringSlot.active = true;
    ringSlot.age = 0;
    ringSlot.maxAge = 0.65;
    ringSlot.maxRadius = 4.6;
    ringSlot.mesh.position.set(origin.x, Math.max(0.08, origin.y + 0.08), origin.z);
    ringSlot.mesh.scale.setScalar(0.35);
    ringSlot.mat.opacity = 0.92;
    ringSlot.mesh.visible = true;

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 2.8 + Math.random() * 2.0;
      this.spawnBurstParticle(
        'coin',
        origin,
        Math.cos(angle) * speed,
        2.1 + Math.random() * 1.6,
        Math.sin(angle) * speed,
        0xef4444,
        1.15,
        0.52
      );
    }
  }

  public update(dt: number, elapsed: number): void {
    // 1. Update constant atmospheric biome particles
    if (this.atmospherePoints) {
      const posAttr = this.atmospherePoints.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      for (let i = 0; i < this.atmosphereCount; i++) {
        const i3 = i * 3;
        const speed = this.atmosphereSpeeds[i];
        this.atmospherePositions[i3 + 1] += this.currentDriftY * speed * dt;
        this.atmospherePositions[i3] +=
          Math.sin(elapsed * 1.4 + i) * 0.18 * dt;
        if (this.atmospherePositions[i3 + 1] > 23) {
          this.atmospherePositions[i3 + 1] = 0.6;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 2. Update pooled burst particles
    let anyBurstDirty = false;
    for (let i = 0; i < this.maxBurstCount; i++) {
      const p = this.burstPool[i];
      if (!p.active) continue;
      anyBurstDirty = true;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        this.burstInstancedMesh.setMatrixAt(i, this._zeroScaleMatrix);
        continue;
      }

      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;
      if (p.kind !== 'jump_dust') {
        p.velocity.y -= 9.8 * dt;
      } else {
        p.velocity.multiplyScalar(0.92);
      }

      const lifeRatio = 1 - p.age / p.maxAge;
      const scale = p.baseScale * lifeRatio;
      this._dummy.position.copy(p.position);
      this._dummy.rotation.set(
        p.age * p.rotSpeed,
        p.age * p.rotSpeed * 1.2,
        0
      );
      this._dummy.scale.setScalar(Math.max(0.001, scale));
      this._dummy.updateMatrix();
      this.burstInstancedMesh.setMatrixAt(i, this._dummy.matrix);
      this.burstInstancedMesh.setColorAt(i, p.color);
    }

    if (anyBurstDirty) {
      this.burstInstancedMesh.instanceMatrix.needsUpdate = true;
      if (this.burstInstancedMesh.instanceColor) {
        this.burstInstancedMesh.instanceColor.needsUpdate = true;
      }
    }

    // 3. Update expanding red shockwave rings
    for (let r = 0; r < this.shockwaveRings.length; r++) {
      const ring = this.shockwaveRings[r];
      if (!ring.active) continue;
      ring.age += dt;
      if (ring.age >= ring.maxAge) {
        ring.active = false;
        ring.mesh.visible = false;
        continue;
      }
      const progress = ring.age / ring.maxAge;
      const currentScale = 0.35 + progress * ring.maxRadius;
      ring.mesh.scale.setScalar(currentScale);
      ring.mat.opacity = Math.max(0, (1 - progress) * 0.9);
    }
  }

  public dispose(): void {
    if (this.atmospherePoints) {
      this.atmospherePoints.geometry.dispose();
      (this.atmospherePoints.material as THREE.Material).dispose();
    }
    this.burstInstancedMesh.geometry.dispose();
    (this.burstInstancedMesh.material as THREE.Material).dispose();
    for (const r of this.shockwaveRings) {
      r.mesh.geometry.dispose();
      r.mat.dispose();
    }
    this.parentGroup.clear();
  }
}

// ============================================================================
// 3. ADVANCED GRAPHICS & 3-POINT WORLD LIGHTING ENGINE
// ============================================================================
export class GraphicsEngine {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly isSoftwareGl: boolean;
  public readonly maxAnisotropy: number;
  public readonly materials: MaterialLibrary;
  public readonly particles: ParticleEngine;

  public readonly hemiLight: THREE.HemisphereLight;
  public readonly sunLight: THREE.DirectionalLight;
  public readonly ambientLight: THREE.AmbientLight;
  public readonly rimLight: THREE.DirectionalLight;

  private activePreset: BiomeLightingPreset = BIOME_LIGHTING_PRESETS.kota_ilmu;
  private _targetSkyColor = new THREE.Color();
  private _targetHemiSky = new THREE.Color();
  private _targetHemiGround = new THREE.Color();
  private _targetSunColor = new THREE.Color();
  private _targetAmbientColor = new THREE.Color();
  private _targetRimColor = new THREE.Color();
  private _targetSunPos = new THREE.Vector3();
  private _worldPosScratch = new THREE.Vector3();

  constructor(container: HTMLElement) {
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
    this.renderer.toneMappingExposure = 1.12;
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
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.2, 230);
    this.camera.position.set(0, 12, 26);

    // Procedural Studio PBR Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    // 1. 3-Point World Lighting Pipeline:
    // (a) HemisphereLight(0x87ceeb, 0x1e293b, 0.7) for natural sky/ground reflection
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x1e293b, 0.7);
    this.hemiLight.position.set(0, 55, 0);
    this.scene.add(this.hemiLight);

    // (b) DirectionalLight(0xfffbeb, 1.4) as warm sun with 2048x2048 PCFSoftShadowMap
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    this.sunLight.position.set(26, 42, 24);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    const d = 40;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // (c) Soft AmbientLight + Back/Rim Accent Light
    this.ambientLight = new THREE.AmbientLight(0xe0f2fe, 0.35);
    this.scene.add(this.ambientLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    this.rimLight.position.set(-22, 20, -24);
    this.scene.add(this.rimLight);

    this.materials = new MaterialLibrary(this.isSoftwareGl);
    this.particles = new ParticleEngine(this.scene);

    this.applyBiomeLightingImmediate('kota_ilmu');
  }

  public applyBiomeLightingImmediate(biome: BiomeId): void {
    const preset =
      BIOME_LIGHTING_PRESETS[biome] || BIOME_LIGHTING_PRESETS.kota_ilmu;
    this.activePreset = preset;

    this.scene.background = new THREE.Color(preset.skyColor);
    this.scene.fog = new THREE.FogExp2(preset.fogColor, preset.fogDensity);

    this.hemiLight.color.setHex(preset.hemiSkyColor);
    this.hemiLight.groundColor.setHex(preset.hemiGroundColor);
    this.hemiLight.intensity = preset.hemiIntensity;

    this.sunLight.color.setHex(preset.sunColor);
    this.sunLight.intensity = preset.sunIntensity;
    this.sunLight.position.set(
      preset.sunPosition[0],
      preset.sunPosition[1],
      preset.sunPosition[2]
    );

    this.ambientLight.color.setHex(preset.ambientColor);
    this.ambientLight.intensity = preset.ambientIntensity;

    this.rimLight.color.setHex(preset.rimColor);
    this.rimLight.intensity = preset.rimIntensity;

    this.particles.setBiomeAtmosphere(biome);
  }

  /**
   * Smoothly interpolates world lighting & dynamic sky/caustic cycle per frame,
   * updates water wave shaders (`uTime`), and updates proximity Rim Glow on interactables.
   */
  public update(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    interactables: THREE.Object3D[]
  ): void {
    const preset = this.activePreset;
    const lerpAlpha = 1 - Math.exp(-3.5 * dt);

    this._targetSkyColor.setHex(preset.skyColor);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(this._targetSkyColor, lerpAlpha);
    }

    this._targetHemiSky.setHex(preset.hemiSkyColor);
    this._targetHemiGround.setHex(preset.hemiGroundColor);
    this.hemiLight.color.lerp(this._targetHemiSky, lerpAlpha);
    this.hemiLight.groundColor.lerp(this._targetHemiGround, lerpAlpha);
    this.hemiLight.intensity = THREE.MathUtils.lerp(
      this.hemiLight.intensity,
      preset.hemiIntensity,
      lerpAlpha
    );

    this._targetSunColor.setHex(preset.sunColor);
    this.sunLight.color.lerp(this._targetSunColor, lerpAlpha);

    // Subtle dynamic lighting modulation per biome (e.g. underwater bioluminescence / canopy shimmer)
    const dynamicCycleMod =
      preset.id === 'samudra'
        ? Math.sin(elapsed * 2.2) * 0.14
        : preset.id === 'rimba'
        ? Math.sin(elapsed * 1.6) * 0.08
        : Math.sin(elapsed * 0.6) * 0.04;

    this.sunLight.intensity = THREE.MathUtils.lerp(
      this.sunLight.intensity,
      preset.sunIntensity + dynamicCycleMod,
      lerpAlpha
    );

    this._targetSunPos.set(
      preset.sunPosition[0] + Math.sin(elapsed * 0.25) * 1.8,
      preset.sunPosition[1],
      preset.sunPosition[2] + Math.cos(elapsed * 0.25) * 1.8
    );
    this.sunLight.position.lerp(this._targetSunPos, lerpAlpha);

    this._targetAmbientColor.setHex(preset.ambientColor);
    this.ambientLight.color.lerp(this._targetAmbientColor, lerpAlpha);

    this._targetRimColor.setHex(preset.rimColor);
    this.rimLight.color.lerp(this._targetRimColor, lerpAlpha);

    // Update water wave shader uniform `uTime`
    this.materials.updateShaders(elapsed);

    // Update atmospheric & burst particles
    this.particles.update(dt, elapsed);

    // Update Proximity Rim Glow / Outline on interactive objects
    this.updateInteractableRimGlow(playerPos, interactables, elapsed);
  }

  private updateInteractableRimGlow(
    playerPos: THREE.Vector3,
    interactables: THREE.Object3D[],
    elapsed: number
  ): void {
    for (let i = 0; i < interactables.length; i++) {
      const obj = interactables[i];
      if (!obj.visible) continue;
      const rimGroup = obj.getObjectByName('InteractiveRimGlow');
      if (!rimGroup) continue;

      obj.getWorldPosition(this._worldPosScratch);
      const dist = playerPos.distanceTo(this._worldPosScratch);
      const triggerRadius =
        obj.userData?.interactType === 'building' ? 16.5 : 10.5;
      const glow = computeProximityGlowIntensity(dist, triggerRadius, elapsed);

      const hull = rimGroup.getObjectByName('RimHullMesh') as
        | THREE.Mesh
        | undefined;
      const ring = rimGroup.getObjectByName('RimGroundRing') as
        | THREE.Mesh
        | undefined;

      if (hull) {
        const mat = hull.material as THREE.MeshBasicMaterial;
        mat.opacity = glow * 0.42;
      }
      if (ring) {
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = glow * 0.78;
        ring.rotation.z = elapsed * 1.4;
      }
    }
  }

  public dispose(): void {
    this.particles.dispose();
    this.materials.disposeAll();
    this.renderer.dispose();
  }
}
