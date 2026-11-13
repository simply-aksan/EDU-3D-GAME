import {
  ACCESSORY_ITEMS,
  AccessoryId,
  AURA_ITEMS,
  AuraId,
  BiomeId,
  CostumeUniformId,
  PET_ITEMS,
  PetId,
  PROP_WEAPON_ITEMS,
  PropWeaponId,
  THEME_COLOR_ITEMS,
  ThemeColorId,
  UNIFORM_ITEMS
} from './questions';

export interface IsoScreenPoint {
  x: number;
  y: number;
  depth: number;
}

export interface IsoWorldPoint {
  gridX: number;
  gridZ: number;
}

export interface PixelParticle2D {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
}

export interface FloatingPixelText2D {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface CharacterCustomLoadout {
  uniform: CostumeUniformId;
  accessories: AccessoryId[];
  aura?: AuraId;
  pet?: PetId;
  propWeapon?: PropWeaponId;
  themeColor?: ThemeColorId;
}

export interface ClickableIsoHotspot {
  id: string;
  screenX: number;
  screenY: number;
  radius: number;
  interactType:
    | 'building'
    | 'npc'
    | 'tkp'
    | 'bridge_panel'
    | 'batch2_option';
  subject?: string;
  title?: string;
  npcName?: string;
  tkpId?: number;
  optionIndex?: number;
}

export const ISO_TILE_WIDTH = 64;
export const ISO_TILE_HEIGHT = 32;

/**
 * Pure helper: Projects 3D/Isometric world grid coordinates (gridX, gridZ, heightY)
 * into 2D screen coordinates using classic 2:1 Isometric diamond projection.
 */
export function worldToIsoScreen(
  gridX: number,
  gridZ: number,
  heightY = 0,
  originX = 0,
  originY = 0,
  tileW = ISO_TILE_WIDTH,
  tileH = ISO_TILE_HEIGHT
): IsoScreenPoint {
  const x = originX + (gridX - gridZ) * (tileW * 0.5);
  const y = originY + (gridX + gridZ) * (tileH * 0.5) - heightY * 18;
  const depth = gridX + gridZ + heightY * 0.05;
  return { x, y, depth };
}

/**
 * Pure helper: Unprojects 2D screen coordinates (screenX, screenY) back into
 * Isometric world grid coordinates (gridX, gridZ) on the ground plane (heightY = 0).
 */
export function isoScreenToWorld(
  screenX: number,
  screenY: number,
  originX = 0,
  originY = 0,
  tileW = ISO_TILE_WIDTH,
  tileH = ISO_TILE_HEIGHT
): IsoWorldPoint {
  const dx = screenX - originX;
  const dy = screenY - originY;
  const halfW = tileW * 0.5;
  const halfH = tileH * 0.5;
  const gridX = (dy / halfH + dx / halfW) * 0.5;
  const gridZ = (dy / halfH - dx / halfW) * 0.5;
  return {
    gridX: Number(gridX.toFixed(3)),
    gridZ: Number(gridZ.toFixed(3))
  };
}

/**
 * Pure helper: Computes painter's algorithm depth key for sorting isometric sprites.
 */
export function computeIsoDepthKey(
  gridX: number,
  gridZ: number,
  layerBoost = 0
): number {
  return Number((gridX + gridZ + layerBoost).toFixed(4));
}

export interface BiomePixelPalette {
  skyTop: string;
  skyBottom: string;
  tileTopA: string;
  tileTopB: string;
  tileLeft: string;
  tileRight: string;
  roadTop: string;
  roadBorder: string;
  waterA: string;
  waterB: string;
  accentHex: string;
  treeFoliageA: string;
  treeFoliageB: string;
  treeTrunk: string;
}

export const BIOME_PIXEL_PALETTES: Record<BiomeId, BiomePixelPalette> = {
  kota_ilmu: {
    skyTop: '#06132e',
    skyBottom: '#0f294a',
    tileTopA: '#10b981',
    tileTopB: '#059669',
    tileLeft: '#047857',
    tileRight: '#065f46',
    roadTop: '#1e293b',
    roadBorder: '#38bdf8',
    waterA: '#0284c7',
    waterB: '#38bdf8',
    accentHex: '#0066FF',
    treeFoliageA: '#22c55e',
    treeFoliageB: '#15803d',
    treeTrunk: '#78350f'
  },
  samudra: {
    skyTop: '#021024',
    skyBottom: '#052659',
    tileTopA: '#0891b2',
    tileTopB: '#0e7490',
    tileLeft: '#155e75',
    tileRight: '#164e63',
    roadTop: '#0f172a',
    roadBorder: '#22d3ee',
    waterA: '#0369a1',
    waterB: '#06b6d4',
    accentHex: '#22d3ee',
    treeFoliageA: '#f43f5e',
    treeFoliageB: '#fb7185',
    treeTrunk: '#0d9488'
  },
  angkasa: {
    skyTop: '#030712',
    skyBottom: '#1e1b4b',
    tileTopA: '#312e81',
    tileTopB: '#1e1b4b',
    tileLeft: '#1e1b4b',
    tileRight: '#0f172a',
    roadTop: '#111827',
    roadBorder: '#a855f7',
    waterA: '#4c1d95',
    waterB: '#7c3aed',
    accentHex: '#a855f7',
    treeFoliageA: '#38bdf8',
    treeFoliageB: '#818cf8',
    treeTrunk: '#475569'
  },
  rimba: {
    skyTop: '#051f14',
    skyBottom: '#0c3823',
    tileTopA: '#16a34a',
    tileTopB: '#15803d',
    tileLeft: '#166534',
    tileRight: '#14532d',
    roadTop: '#422006',
    roadBorder: '#84cc16',
    waterA: '#0d9488',
    waterB: '#14b8a6',
    accentHex: '#22c55e',
    treeFoliageA: '#4ade80',
    treeFoliageB: '#16a34a',
    treeTrunk: '#713f12'
  },
  nusantara: {
    skyTop: '#1e112a',
    skyBottom: '#451a03',
    tileTopA: '#d97706',
    tileTopB: '#b45309',
    tileLeft: '#92400e',
    tileRight: '#78350f',
    roadTop: '#292524',
    roadBorder: '#f59e0b',
    waterA: '#0284c7',
    waterB: '#38bdf8',
    accentHex: '#f59e0b',
    treeFoliageA: '#fbbf24',
    treeFoliageB: '#d97706',
    treeTrunk: '#57534e'
  }
};

function numToHex(colorNum: number): string {
  return `#${colorNum.toString(16).padStart(6, '0')}`;
}

/**
 * Draws an isometric 2.5D diamond block (tile or building volume) with crisp borders.
 */
export function drawIsoBlock(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  width: number,
  depth: number,
  height: number,
  topColor: string,
  leftColor: string,
  rightColor: string,
  strokeColor = 'rgba(2, 6, 23, 0.7)'
): void {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const topY = screenY - height;

  // Top Diamond Face
  ctx.beginPath();
  ctx.moveTo(screenX, topY - hd);
  ctx.lineTo(screenX + hw, topY);
  ctx.lineTo(screenX, topY + hd);
  ctx.lineTo(screenX - hw, topY);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();

  if (height > 0.5) {
    // Left Face
    ctx.beginPath();
    ctx.moveTo(screenX - hw, topY);
    ctx.lineTo(screenX, topY + hd);
    ctx.lineTo(screenX, screenY + hd);
    ctx.lineTo(screenX - hw, screenY);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();
    ctx.stroke();

    // Right Face
    ctx.beginPath();
    ctx.moveTo(screenX + hw, topY);
    ctx.lineTo(screenX, topY + hd);
    ctx.lineTo(screenX, screenY + hd);
    ctx.lineTo(screenX + hw, screenY);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Draws a detailed 2D Student Avatar with custom uniform, accessories, aura,
 * pet companion, handheld prop/weapon, and theme colors.
 */
export function drawPixelStudentAvatar(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  uniformId: CostumeUniformId,
  accessories: AccessoryId[],
  walkPhase: number,
  isMoving: boolean,
  scaleX = 1,
  scaleY = 1,
  pixelScale = 3,
  isFever = false,
  extraLoadout?: {
    aura?: AuraId;
    pet?: PetId;
    propWeapon?: PropWeaponId;
    themeColor?: ThemeColorId;
  }
): void {
  const uniformCfg =
    UNIFORM_ITEMS.find((u) => u.id === uniformId) || UNIFORM_ITEMS[0];
  const shirtHex = numToHex(uniformCfg.shirtColor);
  const bottomHex = numToHex(uniformCfg.bottomColor);
  const tieHex = numToHex(uniformCfg.tieColor);

  const auraId = extraLoadout?.aura || 'none';
  const petId = extraLoadout?.pet || 'none';
  const propId = extraLoadout?.propWeapon || 'none';
  const themeId = extraLoadout?.themeColor || 'klasik';
  const themeCfg =
    THEME_COLOR_ITEMS.find((t) => t.id === themeId) || THEME_COLOR_ITEMS[0];

  ctx.save();
  ctx.translate(Math.round(screenX), Math.round(screenY));
  ctx.scale(scaleX, scaleY);

  const p = pixelScale;

  // 1. Ground Shadow & Aura / Footstep Ring
  ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7 * p, 2.5 * p, 0, 0, Math.PI * 2);
  ctx.fill();

  if (auraId !== 'none' || isFever) {
    const auraSpec = AURA_ITEMS.find((a) => a.id === auraId);
    const primaryAura = isFever ? '#22d3ee' : auraSpec?.colorHex || '#f59e0b';
    const secondaryAura = isFever ? '#38bdf8' : auraSpec?.secondaryHex || '#ef4444';
    const pulse = 1 + Math.sin(walkPhase * 4) * 0.12;

    ctx.save();
    ctx.strokeStyle = primaryAura;
    ctx.lineWidth = Math.max(1.5, p * 0.6);
    ctx.beginPath();
    ctx.ellipse(0, -1 * p, 9 * p * pulse, 3.5 * p * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Floating Aura Particles around body
    for (let i = 0; i < 4; i++) {
      const ang = walkPhase * 3 + i * (Math.PI * 0.5);
      const ax = Math.cos(ang) * 7.5 * p;
      const ay = -9 * p + Math.sin(ang * 1.5) * 6 * p;
      ctx.fillStyle = i % 2 === 0 ? primaryAura : secondaryAura;
      ctx.fillRect(ax - p * 0.8, ay - p * 0.8, p * 1.6, p * 1.6);
    }
    ctx.restore();
  }

  // 2. Accessories behind body (Jubah Juara / Tas Ransel)
  if (accessories.includes('jubah_juara')) {
    const capeWave = Math.sin(walkPhase * 5) * 1.2;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect((-6.5 + capeWave * 0.3) * p, -12 * p, 13 * p, 9.5 * p);
    ctx.fillStyle = '#facc15';
    ctx.fillRect((-6.5 + capeWave * 0.3) * p, -3.5 * p, 13 * p, 1.2 * p);
  }
  if (accessories.includes('tas_ransel')) {
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-5.5 * p, -11.5 * p, 1.5 * p, 5.5 * p);
    ctx.fillRect(4 * p, -11.5 * p, 1.5 * p, 5.5 * p);
  }

  // 3. Animated Legs & Shoes
  const legOffset = isMoving ? Math.sin(walkPhase * 8) * 1.8 : 0;
  ctx.fillStyle = bottomHex;
  ctx.fillRect(-3.2 * p, (-5.5 + legOffset) * p, 2.4 * p, 4.5 * p);
  ctx.fillRect(0.8 * p, (-5.5 - legOffset) * p, 2.4 * p, 4.5 * p);

  // Shoes with white sole detail
  ctx.fillStyle = '#18181b';
  ctx.fillRect(-3.5 * p, (-1.2 + legOffset) * p, 2.8 * p, 1.6 * p);
  ctx.fillRect(0.8 * p, (-1.2 - legOffset) * p, 2.8 * p, 1.6 * p);
  ctx.fillStyle = '#e4e4e7';
  ctx.fillRect(-3.5 * p, (-0.1 + legOffset) * p, 2.8 * p, 0.5 * p);
  ctx.fillRect(0.8 * p, (-0.1 - legOffset) * p, 2.8 * p, 0.5 * p);

  // 4. Torso / Uniform Shirt + Belt + Collar
  ctx.fillStyle = shirtHex;
  ctx.fillRect(-4.2 * p, -11.5 * p, 8.4 * p, 6.2 * p);
  // Belt
  ctx.fillStyle = '#18181b';
  ctx.fillRect(-4.2 * p, -6 * p, 8.4 * p, 0.9 * p);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-1 * p, -6 * p, 2 * p, 0.9 * p);

  // Collar & Tie
  ctx.fillStyle = themeCfg.trimHex;
  ctx.fillRect(-2.5 * p, -11.5 * p, 5 * p, 1 * p);
  ctx.fillStyle = tieHex;
  ctx.fillRect(-1 * p, -10.8 * p, 2 * p, 4.2 * p);

  // 5. Arms & Hands
  ctx.fillStyle = shirtHex;
  ctx.fillRect(-6.2 * p, (-11.2 - legOffset * 0.5) * p, 2 * p, 4.2 * p);
  ctx.fillRect(4.2 * p, (-11.2 + legOffset * 0.5) * p, 2 * p, 4.2 * p);
  ctx.fillStyle = themeCfg.skinHex;
  ctx.fillRect(-6.2 * p, (-7.2 - legOffset * 0.5) * p, 2 * p, 1.6 * p);
  ctx.fillRect(4.2 * p, (-7.2 + legOffset * 0.5) * p, 2 * p, 1.6 * p);

  // 6. Handheld Prop / Weapon (Right or Left Hand)
  if (propId !== 'none') {
    const propBob = Math.sin(walkPhase * 4) * 0.6;
    ctx.save();
    ctx.translate(6 * p, (-8 + propBob) * p);
    if (propId === 'buku_holo') {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-1 * p, -2 * p, 3.5 * p, 4 * p);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-0.5 * p, -1.5 * p, 2.5 * p, 3 * p);
    } else if (propId === 'tongkat_sains') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, -6 * p, 1.2 * p, 9 * p);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(0.6 * p, -7 * p, 2.2 * p, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f3e8ff';
      ctx.fillRect(0.2 * p, -7.8 * p, 0.8 * p, 0.8 * p);
    } else if (propId === 'perisai_nusantara') {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-1.5 * p, -3.5 * p, 4 * p, 5.5 * p);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-0.8 * p, -2.8 * p, 2.6 * p, 4 * p);
    } else if (propId === 'pedang_prisma') {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, -9 * p, 1.4 * p, 7.5 * p);
      ctx.fillStyle = '#a7f3d0';
      ctx.fillRect(0.3 * p, -8.5 * p, 0.6 * p, 6.5 * p);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-1 * p, -1.8 * p, 3.4 * p, 1 * p);
    }
    ctx.restore();
  }

  // 7. Head, Ears, Expressive Eyes, Eyebrows & Smile
  ctx.fillStyle = themeCfg.skinHex;
  ctx.fillRect(-4.2 * p, -17.5 * p, 8.4 * p, 6.2 * p);
  // Ears
  ctx.fillRect(-5 * p, -15.2 * p, 0.9 * p, 2 * p);
  ctx.fillRect(4.1 * p, -15.2 * p, 0.9 * p, 2 * p);

  // Hair
  ctx.fillStyle = themeCfg.hairHex;
  ctx.fillRect(-4.6 * p, -19.2 * p, 9.2 * p, 2.6 * p);
  ctx.fillRect(-4.6 * p, -17.5 * p, 1.1 * p, 3.2 * p);
  ctx.fillRect(3.5 * p, -17.5 * p, 1.1 * p, 3.2 * p);

  // Eyes & Pupils
  ctx.fillStyle = '#09090b';
  ctx.fillRect(-2.6 * p, -15.2 * p, 1.4 * p, 1.7 * p);
  ctx.fillRect(1.2 * p, -15.2 * p, 1.4 * p, 1.7 * p);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2.3 * p, -15.1 * p, 0.6 * p, 0.6 * p);
  ctx.fillRect(1.5 * p, -15.1 * p, 0.6 * p, 0.6 * p);
  // Smile
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(-1.2 * p, -12.7 * p, 2.4 * p, 0.6 * p);

  // 8. Head & Face Accessories
  if (accessories.includes('kacamata')) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1, p * 0.45);
    ctx.strokeRect(-3.1 * p, -15.6 * p, 2.5 * p, 2.1 * p);
    ctx.strokeRect(0.6 * p, -15.6 * p, 2.5 * p, 2.1 * p);
  }
  if (accessories.includes('visor_holo')) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.78)';
    ctx.fillRect(-3.8 * p, -15.6 * p, 7.6 * p, 2 * p);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillRect(-3 * p, -15.2 * p, 6 * p, 0.5 * p);
  }
  if (accessories.includes('topi_sekolah')) {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-4.6 * p, -20.5 * p, 9.2 * p, 2 * p);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3.5 * p, -19 * p, 8.2 * p, 0.8 * p);
  }
  if (accessories.includes('topi_pramuka')) {
    ctx.fillStyle = '#713f12';
    ctx.fillRect(-5 * p, -20.6 * p, 10 * p, 2.2 * p);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1 * p, -19.8 * p, 2 * p, 1 * p);
  }
  if (accessories.includes('blangkon')) {
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-4.4 * p, -21.2 * p, 8.8 * p, 2.5 * p);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-1.2 * p, -20.4 * p, 2.4 * p, 1.2 * p);
  }
  if (accessories.includes('mahkota_emas')) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-4.2 * p, -21.5 * p, 8.4 * p, 2.4 * p);
    ctx.fillRect(-4.2 * p, -22.8 * p, 1.6 * p, 1.5 * p);
    ctx.fillRect(-0.8 * p, -23.2 * p, 1.6 * p, 1.9 * p);
    ctx.fillRect(2.6 * p, -22.8 * p, 1.6 * p, 1.5 * p);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-0.5 * p, -21 * p, 1 * p, 1 * p);
  }
  if (accessories.includes('helm_antariksa')) {
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = Math.max(1.5, p * 0.55);
    ctx.strokeRect(-5.2 * p, -20.5 * p, 10.4 * p, 9.2 * p);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.fillRect(-5 * p, -20.2 * p, 10 * p, 8.8 * p);
  }

  // 9. Pet / Drone Companion beside Character
  if (petId !== 'none') {
    const petBob = Math.sin(walkPhase * 4.5) * 1.4;
    ctx.save();
    ctx.translate(-10.5 * p, (-11 + petBob) * p);
    if (petId === 'kucing_pintar') {
      // Cute Orange Cat Companion
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-2.5 * p, 3 * p, 5 * p, 4 * p);
      // Cat ears
      ctx.fillRect(-2.5 * p, 1.6 * p, 1.2 * p, 1.5 * p);
      ctx.fillRect(1.3 * p, 1.6 * p, 1.2 * p, 1.5 * p);
      // Eyes
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-1.5 * p, 4 * p, 0.8 * p, 0.8 * p);
      ctx.fillRect(0.7 * p, 4 * p, 0.8 * p, 0.8 * p);
    } else if (petId === 'drone_sains') {
      // Floating Science Drone
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-3 * p, -1.5 * p, 6 * p, 3 * p);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-1 * p, -0.5 * p, 2 * p, 1.2 * p);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-4 * p, -2.3 * p, 8 * p, 0.6 * p);
    } else if (petId === 'garuda_mini') {
      // Golden Garuda Mini with flapping wings
      const wingY = Math.sin(walkPhase * 9) * 1.5;
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-2.5 * p, -1 * p, 5 * p, 3.8 * p);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-5 * p, (-1 + wingY) * p, 2.5 * p, 2 * p);
      ctx.fillRect(2.5 * p, (-1 + wingY) * p, 2.5 * p, 2 * p);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-0.8 * p, 0.2 * p, 1.6 * p, 1.2 * p);
    } else if (petId === 'naga_nusantara') {
      // Emerald Mini Dragon
      const wingY = Math.cos(walkPhase * 8) * 1.4;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-2.5 * p, -1.5 * p, 5 * p, 4.2 * p);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-4.5 * p, (-1.2 + wingY) * p, 2 * p, 2.2 * p);
      ctx.fillRect(2.5 * p, (-1.2 + wingY) * p, 2 * p, 2.2 * p);
      ctx.fillRect(-1.5 * p, -2.6 * p, 0.9 * p, 1.2 * p);
      ctx.fillRect(0.6 * p, -2.6 * p, 0.9 * p, 1.2 * p);
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws a recognizable 2D Object, Vehicle, or Creature Model for the 20 Mini-Games
 * so every game scene is visually clear and self-explanatory.
 */
export function drawDetailedObject2D(
  ctx: CanvasRenderingContext2D,
  type:
    | 'goose'
    | 'monster'
    | 'cannon'
    | 'rocket'
    | 'catapult'
    | 'robot'
    | 'submarine'
    | 'chest'
    | 'flask'
    | 'pinisi'
    | 'soccer_ball'
    | 'parcel'
    | 'prism'
    | 'golem_boss',
  x: number,
  y: number,
  colorHex = '#38bdf8',
  animPhase = 0,
  scale = 1
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);

  switch (type) {
    case 'goose': {
      // Giant White Goose with flapping wings & orange beak
      const wing = Math.sin(animPhase * 8) * 6;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Wings
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-32, -8 + wing, 14, 10);
      ctx.fillRect(18, -8 + wing, 14, 10);
      // Neck & Head
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -28, 12, 22);
      ctx.beginPath();
      ctx.arc(0, -30, 10, 0, Math.PI * 2);
      ctx.fill();
      // Orange Beak & Eyes
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-7, -28, 14, 6);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-5, -34, 3, 3);
      ctx.fillRect(2, -34, 3, 3);
      break;
    }

    case 'cannon': {
      // Mounted Castle Cannon on wooden wheels
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-26, 4, 48, 14);
      // Barrel
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-18, -14, 46, 20, 6);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Wheel
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(-4, 14, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.stroke();
      break;
    }

    case 'monster': {
      // Horned Science Monster
      const bob = Math.sin(animPhase * 5) * 4;
      ctx.translate(0, bob);
      // Horns
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-18, -28);
      ctx.lineTo(-26, -44);
      ctx.lineTo(-8, -32);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, -28);
      ctx.lineTo(26, -44);
      ctx.lineTo(8, -32);
      ctx.fill();
      // Body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-24, -32, 48, 44, 12);
      ctx.fill();
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Glowing Eyes & Fangs
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-13, -20, 8, 6);
      ctx.fillRect(5, -20, 8, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -6, 5, 6);
      ctx.fillRect(5, -6, 5, 6);
      break;
    }

    case 'rocket': {
      // Space Rocket with flame thruster, fins, and porthole
      const flame = 10 + Math.sin(animPhase * 15) * 5;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-10, 18);
      ctx.lineTo(0, 18 + flame);
      ctx.lineTo(10, 18);
      ctx.fill();
      // Fins
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-22, 4, 10, 14);
      ctx.fillRect(12, 4, 10, 14);
      // Fuselage
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-14, -26, 28, 44, 10);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Nose cone & Porthole
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-14, -20);
      ctx.lineTo(0, -38);
      ctx.lineTo(14, -20);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, -8, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'catapult': {
      // Wooden Siege Catapult with arm & projectile
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-28, 4, 56, 12);
      ctx.fillRect(-10, -22, 8, 28);
      // Throwing Arm
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-24, -32);
      ctx.stroke();
      // Bucket & Boulder
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(-24, -34, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'robot': {
      // Logic Circuit Robot with antenna & LED screen
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2, -38, 4, 10);
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(0, -40, 4, 0, Math.PI * 2);
      ctx.fill();
      // Head & Body
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(-16, -28, 32, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-11, -23, 22, 11);
      // Eyes
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-8, -20, 5, 5);
      ctx.fillRect(3, -20, 5, 5);
      // Wheels
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-18, -4, 6, 8);
      ctx.fillRect(12, -4, 6, 8);
      break;
    }

    case 'submarine': {
      // Yellow Ocean Submarine with periscope & portholes
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-6, -34, 8, 14);
      ctx.fillRect(-6, -34, 14, 5);
      // Hull
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(0, -10, 42, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Portholes
      ctx.fillStyle = '#38bdf8';
      for (const px of [-16, 0, 16]) {
        ctx.beginPath();
        ctx.arc(px, -10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'chest': {
      // Treasure Chest with gold bands
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.roundRect(-24, -18, 48, 28, 5);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-24, -6, 48, 4);
      ctx.fillRect(-4, -9, 8, 9);
      break;
    }

    case 'flask': {
      // Chemistry Erlenmeyer Flask with colored liquid & bubbles
      ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
      ctx.beginPath();
      ctx.moveTo(-8, -36);
      ctx.lineTo(8, -36);
      ctx.lineTo(20, 8);
      ctx.lineTo(-20, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Colored reagent inside
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.moveTo(-12, -14);
      ctx.lineTo(12, -14);
      ctx.lineTo(18, 6);
      ctx.lineTo(-18, 6);
      ctx.closePath();
      ctx.fill();
      // Neck rim
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-10, -38, 20, 4);
      break;
    }

    case 'pinisi': {
      // Traditional Nusantara Pinisi Sailing Ship
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(-38, -4);
      ctx.lineTo(42, -4);
      ctx.lineTo(28, 14);
      ctx.lineTo(-28, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Masts & Sails
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(-6, -48);
      ctx.lineTo(22, -10);
      ctx.lineTo(-6, -10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, -42);
      ctx.lineTo(-32, -10);
      ctx.lineTo(-10, -10);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'soccer_ball': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'parcel': {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-18, -16, 36, 26);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.strokeRect(-18, -16, 36, 26);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-4, -16, 8, 26);
      break;
    }

    case 'prism': {
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(24, 10);
      ctx.lineTo(-24, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }

    case 'golem_boss': {
      // Colossal Elemental Golem Boss
      const bob = Math.sin(animPhase * 3) * 5;
      ctx.translate(0, bob);
      // Giant Shoulders & Torso
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.roundRect(-52, -74, 104, 78, 16);
      ctx.fill();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Glowing Energy Core on Chest
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(0, -34, 15, 0, Math.PI * 2);
      ctx.fill();
      // Boss Head & Glowing Eyes
      ctx.fillStyle = '#4c0519';
      ctx.fillRect(-24, -98, 48, 26);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-15, -89, 10, 6);
      ctx.fillRect(5, -89, 10, 6);
      break;
    }
  }

  ctx.restore();
}

/**
 * Draws a pulsing target reticle & number/letter badge directly on an interactive
 * 2D canvas target so players immediately see where to click or aim.
 */
export function drawCanvasTargetReticle(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  badgeText: string,
  colorHex = '#10b981',
  animPhase = 0,
  isSelected = false
): void {
  ctx.save();
  const bounce = Math.sin(animPhase * 5) * 4;
  const rx = Math.round(screenX);
  const ry = Math.round(screenY);

  // Pulsing ground/object ring
  ctx.strokeStyle = isSelected ? '#ffffff' : colorHex;
  ctx.lineWidth = isSelected ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.arc(rx, ry, 22 + Math.sin(animPhase * 4) * 3, 0, Math.PI * 2);
  ctx.stroke();

  // Floating pointer badge above object
  const by = ry - 36 + bounce;
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.roundRect(rx - 16, by - 11, 32, 20, 6);
  ctx.fill();
  ctx.strokeStyle = isSelected ? '#ffffff' : colorHex;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fafafa';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, rx, by + 3);
  ctx.restore();
}

/**
 * Draws a clean, minimalist sign label above an isometric building, NPC, or target.
 */
export function drawPixelSignLabel(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  title: string,
  subtitle: string,
  accentColor = '#38bdf8',
  isHighlighted = false
): void {
  ctx.save();
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
  const w =
    Math.max(
      ctx.measureText(title).width,
      subtitle ? ctx.measureText(subtitle).width : 0
    ) + 18;
  const h = subtitle ? 30 : 20;
  const bx = Math.round(screenX - w * 0.5);
  const by = Math.round(screenY - h);

  ctx.fillStyle = isHighlighted ? 'rgba(24, 24, 27, 0.96)' : 'rgba(9, 9, 11, 0.85)';
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 6);
  ctx.fill();

  ctx.strokeStyle = isHighlighted ? '#fafafa' : accentColor;
  ctx.lineWidth = isHighlighted ? 1.8 : 1;
  ctx.stroke();

  ctx.fillStyle = '#fafafa';
  ctx.textAlign = 'center';
  ctx.fillText(title, screenX, by + 13);
  if (subtitle) {
    ctx.fillStyle = isHighlighted ? '#fde047' : '#a1a1aa';
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.fillText(subtitle, screenX, by + 24);
  }
  ctx.restore();
}
