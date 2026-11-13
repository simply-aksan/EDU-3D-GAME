import * as THREE from 'three';
import {
  AccessoryId,
  CostumeUniformId,
  UNIFORM_ITEMS
} from './questions';
import {
  attachInteractiveRimGlow,
  MaterialLibrary
} from './GraphicsEngine';

// Shared procedural CanvasTexture generator for crisp signs, gates, and labels
export function createSignTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  borderHex: string,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 46px "Chakra Petch", sans-serif';
    ctx.fillText(title.slice(0, 20), 256, 102);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle.slice(0, 32), 256, 168);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

// Soft radial contact shadow under characters, vehicles, and props
let cachedShadowTex: THREE.CanvasTexture | null = null;
export function createContactShadowMesh(radius = 1.1): THREE.Mesh {
  if (!cachedShadowTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    cachedShadowTex = new THREE.CanvasTexture(canvas);
  }
  const geo = new THREE.CircleGeometry(radius, 20);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: cachedShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.75
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  return mesh;
}

// 1. Composite 10-part Procedural Student Avatar (Grounded at Y=0, upgraded with Clearcoat & Glass)
export function createStudentAvatar(
  uniformId: CostumeUniformId,
  accessories: AccessoryId[],
  materials?: MaterialLibrary
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'StudentAvatar';

  const uniformCfg =
    UNIFORM_ITEMS.find((u) => u.id === uniformId) || UNIFORM_ITEMS[0];

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf4c29f,
    roughness: 0.62,
    metalness: 0.05
  });
  const shirtMat = new THREE.MeshPhysicalMaterial({
    color: uniformCfg.shirtColor,
    roughness: 0.52,
    metalness: 0.08,
    clearcoat: 0.18,
    clearcoatRoughness: 0.35
  });
  const bottomMat = new THREE.MeshStandardMaterial({
    color: uniformCfg.bottomColor,
    roughness: 0.72,
    metalness: 0.08
  });
  const tieMat = new THREE.MeshPhysicalMaterial({
    color: uniformCfg.tieColor,
    roughness: 0.3,
    metalness: 0.22,
    clearcoat: 0.3,
    clearcoatRoughness: 0.15
  });
  const shoeMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    roughness: 0.26,
    metalness: 0.3,
    clearcoat: 0.3,
    clearcoatRoughness: 0.15
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.78,
    metalness: 0.05
  });

  root.add(createContactShadowMesh(0.95));

  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'BodyPivot';
  root.add(bodyPivot);

  // Left & Right Legs + Shoes
  const leftLegPivot = new THREE.Group();
  leftLegPivot.name = 'LeftLeg';
  leftLegPivot.position.set(-0.22, 0.75, 0);
  const legGeo = new THREE.BoxGeometry(0.28, 0.65, 0.28);
  const leftLegMesh = new THREE.Mesh(legGeo, bottomMat);
  leftLegMesh.position.y = -0.3;
  leftLegMesh.castShadow = true;
  leftLegMesh.receiveShadow = true;
  leftLegPivot.add(leftLegMesh);

  const shoeGeo = new THREE.BoxGeometry(0.32, 0.18, 0.42);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.66, 0.06);
  leftShoe.castShadow = true;
  leftLegPivot.add(leftShoe);
  bodyPivot.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.name = 'RightLeg';
  rightLegPivot.position.set(0.22, 0.75, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, bottomMat);
  rightLegMesh.position.y = -0.3;
  rightLegMesh.castShadow = true;
  rightLegMesh.receiveShadow = true;
  rightLegPivot.add(rightLegMesh);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.66, 0.06);
  rightShoe.castShadow = true;
  rightLegPivot.add(rightShoe);
  bodyPivot.add(rightLegPivot);

  // Torso (Shirt)
  const torsoGeo = new THREE.BoxGeometry(0.82, 0.92, 0.48);
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.position.y = 1.22;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Tie / Scout Scarf / Batik Sash
  const tieGeo = new THREE.BoxGeometry(0.18, 0.56, 0.08);
  const tie = new THREE.Mesh(tieGeo, tieMat);
  tie.position.set(0, 1.28, 0.26);
  bodyPivot.add(tie);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.24, 0.76, 0.24);
  const leftArmPivot = new THREE.Group();
  leftArmPivot.name = 'LeftArm';
  leftArmPivot.position.set(-0.56, 1.58, 0);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.y = -0.32;
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);
  bodyPivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.name = 'RightArm';
  rightArmPivot.position.set(0.56, 1.58, 0);
  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.y = -0.32;
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);
  bodyPivot.add(rightArmPivot);

  // Head + Hair + Eyes
  const headGroup = new THREE.Group();
  headGroup.name = 'HeadGroup';
  headGroup.position.set(0, 2.08, 0);

  const headGeo = new THREE.BoxGeometry(0.76, 0.74, 0.72);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  head.receiveShadow = true;
  headGroup.add(head);

  const hairTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.24, 0.78),
    hairMat
  );
  hairTop.position.set(0, 0.34, -0.02);
  hairTop.castShadow = true;
  headGroup.add(hairTop);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const eyeGeo = new THREE.BoxGeometry(0.11, 0.14, 0.05);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.18, 0.04, 0.37);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.18, 0.04, 0.37);
  headGroup.add(leftEye, rightEye);

  // Accessories
  if (accessories.includes('topi_sekolah')) {
    const capCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.46, 0.22, 16),
      bottomMat
    );
    capCrown.position.set(0, 0.48, 0);
    capCrown.castShadow = true;
    const capVisor = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.06, 0.38),
      tieMat
    );
    capVisor.position.set(0, 0.39, 0.35);
    headGroup.add(capCrown, capVisor);
  }

  if (accessories.includes('topi_pramuka')) {
    const beret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.42, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.7 })
    );
    beret.position.set(0.04, 0.48, 0);
    beret.rotation.z = -0.12;
    headGroup.add(beret);
  }

  if (accessories.includes('blangkon')) {
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.42, 0.28, 8),
      new THREE.MeshPhysicalMaterial({
        color: 0xf59e0b,
        metalness: 0.75,
        roughness: 0.2,
        clearcoat: 0.3
      })
    );
    crown.position.set(0, 0.52, 0);
    headGroup.add(crown);
  }

  if (accessories.includes('kacamata')) {
    const lensMat = materials
      ? materials.getGlassMaterial('avatar_glasses', 0x38bdf8, 0.78)
      : new THREE.MeshPhysicalMaterial({
          color: 0x38bdf8,
          metalness: 0.3,
          roughness: 0.1,
          clearcoat: 0.5,
          transparent: true,
          opacity: 0.82
        });
    const glassBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.18, 0.08),
      lensMat
    );
    glassBar.position.set(0, 0.05, 0.39);
    headGroup.add(glassBar);
  }

  bodyPivot.add(headGroup);

  if (accessories.includes('tas_ransel')) {
    const bagMat = new THREE.MeshPhysicalMaterial({
      color: 0xea580c,
      roughness: 0.52,
      metalness: 0.12,
      clearcoat: 0.3
    });
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.68, 0.32), bagMat);
    bag.position.set(0, 1.24, -0.38);
    bag.castShadow = true;
    bodyPivot.add(bag);
  }

  if (accessories.includes('jubah_juara')) {
    const capeMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      roughness: 0.42,
      metalness: 0.18,
      clearcoat: 0.25,
      side: THREE.DoubleSide
    });
    const cape = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 1.28, 0.06),
      capeMat
    );
    cape.position.set(0, 1.02, -0.29);
    cape.rotation.x = 0.18;
    bodyPivot.add(cape);
  }

  return root;
}

export function updateAvatarAnimation(
  avatar: THREE.Group,
  walkDistance: number,
  isMoving: boolean,
  jumpY: number,
  elapsed: number
): void {
  const bodyPivot = avatar.getObjectByName('BodyPivot');
  if (!bodyPivot) return;

  const leftLeg = bodyPivot.getObjectByName('LeftLeg');
  const rightLeg = bodyPivot.getObjectByName('RightLeg');
  const leftArm = bodyPivot.getObjectByName('LeftArm');
  const rightArm = bodyPivot.getObjectByName('RightArm');
  const head = bodyPivot.getObjectByName('HeadGroup');

  bodyPivot.position.y = Math.max(0, jumpY);

  if (isMoving) {
    const swing = Math.sin(walkDistance * 3.6) * 0.65;
    if (leftLeg) leftLeg.rotation.x = swing;
    if (rightLeg) rightLeg.rotation.x = -swing;
    if (leftArm) leftArm.rotation.x = -swing * 0.8;
    if (rightArm) rightArm.rotation.x = swing * 0.8;
    bodyPivot.position.y += Math.abs(Math.cos(walkDistance * 3.6)) * 0.08;
  } else {
    if (leftLeg) leftLeg.rotation.x *= 0.8;
    if (rightLeg) rightLeg.rotation.x *= 0.8;
    if (leftArm) leftArm.rotation.x = Math.sin(elapsed * 2.2) * 0.06;
    if (rightArm) rightArm.rotation.x = -Math.sin(elapsed * 2.2) * 0.06;
  }

  if (head) {
    head.rotation.y = Math.sin(elapsed * 1.5) * 0.08;
  }
}

// 2. Subject Building (9-part composite architectural landmark + Proximity Rim Glow)
export function createSubjectBuilding(
  subject: string,
  subtitle: string,
  primaryHex: number,
  accentHex: string,
  maxAnisotropy = 4,
  materials?: MaterialLibrary
): THREE.Group {
  const group = new THREE.Group();

  // Foundation plinth
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.82,
    metalness: 0.12
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.6, 8.2), baseMat);
  base.position.y = 0.3;
  base.receiveShadow = true;
  group.add(base);

  // Main Hall Body
  const wallMat = new THREE.MeshPhysicalMaterial({
    color: primaryHex,
    roughness: 0.52,
    metalness: 0.18,
    clearcoat: 0.22,
    clearcoatRoughness: 0.25
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(8.4, 5.4, 6.8), wallMat);
  body.position.y = 3.3;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Roof Tier + Cornice
  const roofMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.48,
    clearcoat: 0.3
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.7, 7.6), roofMat);
  roof.position.y = 6.35;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Transmissive Crystal Skylight Dome on Roof
  const domeMat = materials
    ? materials.getGlassMaterial(`dome_${subject}`, primaryHex, 0.8)
    : new THREE.MeshPhysicalMaterial({
        color: primaryHex,
        roughness: 0.2,
        metalness: 0.4,
        clearcoat: 0.4,
        transparent: true,
        opacity: 0.85
      });
  const dome = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.2, 4), domeMat);
  dome.position.y = 7.8;
  dome.rotation.y = Math.PI / 4;
  group.add(dome);

  // 4 Front Columns
  const colMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.38,
    metalness: 0.22
  });
  const colGeo = new THREE.CylinderGeometry(0.28, 0.32, 5.2, 12);
  [-3.2, -1.5, 1.5, 3.2].forEach((xOffset) => {
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.set(xOffset, 3.2, 3.55);
    col.castShadow = true;
    col.receiveShadow = true;
    group.add(col);
  });

  // Glowing Entrance Portal with Jambs
  const doorJamb = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.1, 0.4),
    roofMat
  );
  doorJamb.position.set(0, 2.15, 3.45);
  group.add(doorJamb);

  const portalMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 0.75,
    roughness: 0.15,
    clearcoat: 0.5
  });
  const portal = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 2.7, 0.46),
    portalMat
  );
  portal.position.set(0, 2.05, 3.46);
  group.add(portal);

  // Signboard above entrance
  const signTex = createSignTexture(
    `GEDUNG ${subject.toUpperCase()}`,
    subtitle,
    '#0f172a',
    accentHex,
    maxAnisotropy
  );
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 1.8, 0.25),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signBoard.position.set(0, 5.1, 3.92);
  group.add(signBoard);

  // Proximity-activated Rim Glow & Ground Beacon
  const glowColor = new THREE.Color(accentHex).getHex();
  attachInteractiveRimGlow(group, [8.8, 6.2, 7.2], 3.3, glowColor);

  return group;
}

// 3. Procedural Vehicles (School Bus, City Car, Kapal Pinisi, Space Rocket with Clearcoat 0.3 & Glass)
export function createVehicle(
  type: 'school_bus' | 'car' | 'pinisi' | 'rocket',
  materials?: MaterialLibrary
): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadowMesh(2.0));

  if (type === 'pinisi') {
    const woodHullMat = new THREE.MeshPhysicalMaterial({
      color: 0x78350f,
      roughness: 0.55,
      metalness: 0.12,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2
    });
    const trimMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.45,
      clearcoat: 0.3
    });
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.2, 6.8),
      woodHullMat
    );
    hull.position.y = 0.7;
    hull.castShadow = true;
    group.add(hull);

    const bow = new THREE.Mesh(
      new THREE.ConeGeometry(1.3, 2.4, 4),
      woodHullMat
    );
    bow.rotation.x = Math.PI / 2;
    bow.rotation.z = Math.PI / 4;
    bow.position.set(0, 0.9, 4.4);
    group.add(bow);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 2.8), trimMat);
    cabin.position.set(0, 1.65, -0.4);
    group.add(cabin);

    const mastGeo = new THREE.CylinderGeometry(0.1, 0.14, 5.4, 10);
    const mast1 = new THREE.Mesh(mastGeo, woodHullMat);
    mast1.position.set(0, 3.6, 1.2);
    const mast2 = new THREE.Mesh(mastGeo, woodHullMat);
    mast2.position.set(0, 3.3, -1.2);
    group.add(mast1, mast2);

    const mainSail1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 3.2, 2.1),
      sailMat
    );
    mainSail1.position.set(0, 3.9, 1.2);
    const mainSail2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.9, 1.9),
      sailMat
    );
    mainSail2.position.set(0, 3.6, -1.2);
    group.add(mainSail1, mainSail2);

    return group;
  }

  if (type === 'rocket') {
    const bodyMat = materials
      ? materials.getVehiclePhysicalMaterial('rocket_hull', 0xf8fafc, {
          roughness: 0.22,
          metalness: 0.6,
          clearcoat: 0.3
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0xf8fafc,
          roughness: 0.22,
          metalness: 0.6,
          clearcoat: 0.3
        });
    const noseMat = materials
      ? materials.getVehiclePhysicalMaterial('rocket_nose', 0xef4444, {
          roughness: 0.26,
          metalness: 0.4,
          clearcoat: 0.3
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0xef4444,
          roughness: 0.26,
          metalness: 0.4,
          clearcoat: 0.3
        });
    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.0, 3.8, 16),
      bodyMat
    );
    fuselage.position.y = 2.4;
    fuselage.castShadow = true;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 16), noseMat);
    nose.position.y = 5.1;
    const thruster = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 1.2, 12),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    thruster.position.y = 0.5;
    thruster.rotation.x = Math.PI;
    group.add(fuselage, nose, thruster);
    return group;
  }

  const isBus = type === 'school_bus';
  const length = isBus ? 5.2 : 3.2;
  const height = isBus ? 1.9 : 1.1;
  const paintColor = isBus ? 0xfacc15 : 0x38bdf8;
  const chassisMat = materials
    ? materials.getVehiclePhysicalMaterial(`veh_${type}`, paintColor, {
        roughness: 0.26,
        metalness: 0.38,
        clearcoat: 0.3
      })
    : new THREE.MeshPhysicalMaterial({
        color: paintColor,
        roughness: 0.26,
        metalness: 0.38,
        clearcoat: 0.3
      });
  const glassMat = materials
    ? materials.getGlassMaterial(`veh_glass_${type}`, 0x38bdf8, 0.72)
    : new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.8,
        clearcoat: 0.5,
        transparent: true,
        opacity: 0.78
      });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.8
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, height, length),
    chassisMat
  );
  body.position.y = 0.4 + height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.86, height * 0.55, length * 0.72),
    glassMat
  );
  cabin.position.y = 0.65 + height * 0.75;
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  [
    [-1.0, 0.4, length * 0.32],
    [1.0, 0.4, length * 0.32],
    [-1.0, 0.4, -length * 0.32],
    [1.0, 0.4, -length * 0.32]
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, wy, wz);
    group.add(wheel);
  });

  return group;
}

// 4. Giant Goose ("Angsa Raksasa") Chaser for Lari Kilat
export function createGiantGoose(): THREE.Group {
  const goose = new THREE.Group();
  goose.add(createContactShadowMesh(1.8));

  const featherMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.05,
    clearcoat: 0.2
  });
  const beakMat = new THREE.MeshPhysicalMaterial({
    color: 0xf97316,
    roughness: 0.3,
    metalness: 0.12,
    clearcoat: 0.3
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 16, 14),
    featherMat
  );
  body.scale.set(1.0, 0.85, 1.45);
  body.position.set(0, 1.35, 0);
  body.castShadow = true;
  goose.add(body);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.38, 1.8, 12),
    featherMat
  );
  neck.position.set(0, 2.55, -0.95);
  neck.rotation.x = -0.25;
  goose.add(neck);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 14, 12),
    featherMat
  );
  head.position.set(0, 3.45, -1.2);
  goose.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.75, 10), beakMat);
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 3.4, -1.72);
  goose.add(beak);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
  leftEye.position.set(-0.26, 3.55, -1.45);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
  rightEye.position.set(0.26, 3.55, -1.45);
  goose.add(leftEye, rightEye);

  // Flapping Wings
  const wingGeo = new THREE.BoxGeometry(1.6, 0.16, 1.1);
  const leftWing = new THREE.Mesh(wingGeo, featherMat);
  leftWing.name = 'LeftWing';
  leftWing.position.set(-1.35, 1.55, 0);
  const rightWing = new THREE.Mesh(wingGeo, featherMat);
  rightWing.name = 'RightWing';
  rightWing.position.set(1.35, 1.55, 0);
  goose.add(leftWing, rightWing);

  return goose;
}

// 5. NPC Warga with floating "!" Exclamation Marker + Proximity Rim Glow
export function createNPCWithMarker(
  name: string,
  shirtHex: number,
  maxAnisotropy = 4,
  materials?: MaterialLibrary
): THREE.Group {
  const npc = createStudentAvatar('batik', [], materials);
  // Tint shirt
  npc.traverse((child) => {
    if (
      (child as THREE.Mesh).isMesh &&
      (child as THREE.Mesh).geometry.type === 'BoxGeometry' &&
      child.position.y === 1.22
    ) {
      ((child as THREE.Mesh).material as THREE.MeshPhysicalMaterial) =
        new THREE.MeshPhysicalMaterial({
          color: shirtHex,
          roughness: 0.45,
          clearcoat: 0.3
        });
    }
  });

  // Exclamation "!" above head
  const bangMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.2
  });
  const bangGroup = new THREE.Group();
  bangGroup.name = 'ExclamationMark';
  bangGroup.position.set(0, 3.25, 0);

  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.08, 0.55, 10),
    bangMat
  );
  bar.position.y = 0.28;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), bangMat);
  dot.position.y = -0.14;
  bangGroup.add(bar, dot);

  const tagTex = createSignTexture(
    name,
    'Klik / Dekati (!)',
    '#1e293b',
    '#f59e0b',
    maxAnisotropy
  );
  const spriteMat = new THREE.SpriteMaterial({ map: tagTex });
  const nameTag = new THREE.Sprite(spriteMat);
  nameTag.scale.set(2.1, 0.95, 1);
  nameTag.position.set(0, 0.95, 0);
  bangGroup.add(nameTag);

  npc.add(bangGroup);

  // Attach proximity-activated Outline / Rim Glow
  attachInteractiveRimGlow(npc, [1.5, 2.5, 1.5], 1.25, shirtHex);

  return npc;
}

// 6. Collectible Glowing Knowledge Book ("Buku Ilmu") + Proximity Rim Glow
export function createKnowledgeBook(colorHex = 0x38bdf8): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadowMesh(0.7));

  const coverMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.35,
    clearcoat: 0.3
  });
  const pagesMat = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    roughness: 0.6
  });

  const bookPivot = new THREE.Group();
  bookPivot.name = 'BookSpin';
  bookPivot.position.y = 1.25;
  bookPivot.rotation.z = 0.35;
  bookPivot.rotation.x = 0.35;

  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.05, 0.24),
    coverMat
  );
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.98, 0.18),
    pagesMat
  );
  pages.position.x = 0.04;
  bookPivot.add(cover, pages);
  group.add(bookPivot);

  attachInteractiveRimGlow(group, [1.3, 1.4, 1.3], 1.25, colorHex);

  return group;
}

// 7. Central City Fountain with Dynamic Wavy Water Shader (`uTime`)
export function createFountain(materials?: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.68,
    metalness: 0.15
  });
  const waterMat = materials
    ? materials.createDynamicWaterMaterial('fountain_water', 0x0ea5e9, 0x0284c7)
    : new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.28,
        roughness: 0.14,
        metalness: 0.2,
        clearcoat: 0.85,
        transparent: true,
        opacity: 0.88
      });

  const outerRing = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.5, 0.75, 24),
    stoneMat
  );
  outerRing.position.y = 0.38;
  outerRing.receiveShadow = true;

  const waterPool = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 3.8, 0.65, 32, 4),
    waterMat
  );
  waterPool.position.y = 0.48;

  const centerPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.95, 2.8, 16),
    stoneMat
  );
  centerPillar.position.y = 1.4;
  centerPillar.castShadow = true;

  const upperBasin = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.1, 0.45, 20),
    stoneMat
  );
  upperBasin.position.y = 2.6;

  const topSpout = new THREE.Mesh(
    new THREE.SphereGeometry(0.65, 16, 16),
    waterMat
  );
  topSpout.name = 'FountainSpout';
  topSpout.position.y = 3.2;

  group.add(outerRing, waterPool, centerPillar, upperBasin, topSpout);
  return group;
}
