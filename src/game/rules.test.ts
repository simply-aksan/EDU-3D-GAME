import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  DEFAULT_QUESTION_PACK,
  MINI_GAME_REGISTRY
} from './questions';
import {
  BIOME_LIGHTING_PRESETS,
  computeProximityGlowIntensity,
  evaluateWaterWaveDisplacement
} from './GraphicsEngine';
import {
  CameraController,
  computeDynamicDifficulty,
  getComboStreakTier,
  JuiceManager,
  PhysicsCharacterController
} from './JuiceEngine';
import {
  computeQuestionTimerVisual,
  computeStarRating,
  computeThumbstickVector,
  getMiniGameControlBriefing,
  UIManager
} from './UIManager';
import {
  BIOME_PIXEL_PALETTES,
  computeIsoDepthKey,
  isoScreenToWorld,
  worldToIsoScreen
} from './IsoPixelEngine';
import {
  buildProgramToStation,
  calculateAnswerReward,
  computePinisiWaveHeight,
  decodeQuestionPackFromHash,
  encodeQuestionPackToHash,
  getLaneX,
  getLevelFromXp,
  getRocketRingCoordinates,
  getXpProgressInLevel,
  PASAR_CHALLENGES,
  ROBOT_START_COORD,
  sampleParabolicTrajectory,
  simulateRobotProgram,
  stepArchitectBlock,
  stepBridgePanel,
  stepCastleDefense,
  stepChemLabExperiment,
  stepMinotaurMazeGate,
  stepPinisiVoyage,
  stepSubmarineSonar,
  stepTowerFloor,
  sampleGoaliePenaltyBezier,
  stepGoaliePenalty,
  stepConveyorSorter,
  stepPrismLaserCast,
  resolveTugOfWarAnswer,
  stepBossBattleAttack,
  validateQuestionPackJson,
  extractYoutubeVideoId,
  generateGeminiTeacherPrompt,
  formatWhatsAppScoreReport
} from './rules';

test('DEFAULT_QUESTION_PACK has at least 30 cross-subject questions with valid 4 options', () => {
  assert.ok(DEFAULT_QUESTION_PACK.questions.length >= 30);
  for (const q of DEFAULT_QUESTION_PACK.questions) {
    assert.equal(q.options.length, 4);
    assert.ok(q.answerIndex >= 0 && q.answerIndex <= 3);
    assert.ok(q.explanation.length > 5);
  }
});

test('MINI_GAME_REGISTRY contains 20 slots and all 20 are featured playable 3D engines', () => {
  assert.equal(MINI_GAME_REGISTRY.length, 20);
  const featured = MINI_GAME_REGISTRY.filter((m) => m.isFeaturedSix);
  assert.equal(featured.length, 20);
});

test('encodeQuestionPackToHash and decodeQuestionPackFromHash round-trip cleanly', () => {
  const samplePack = {
    id: 'test-pack',
    title: 'Kuis Sains Kelas 7',
    subject: 'Sains',
    grade: 'SMP',
    questions: DEFAULT_QUESTION_PACK.questions.slice(0, 3)
  };
  const hash = encodeQuestionPackToHash(samplePack);
  assert.ok(hash.startsWith('#p='));
  const decoded = decodeQuestionPackFromHash(hash);
  assert.ok(decoded !== null);
  assert.equal(decoded?.title, 'Kuis Sains Kelas 7');
  assert.equal(decoded?.questions.length, 3);
  assert.equal(decoded?.questions[0].q, samplePack.questions[0].q);
});

test('XP and Level progression calculations are accurate', () => {
  assert.equal(getLevelFromXp(0), 1);
  assert.equal(getLevelFromXp(99), 1);
  assert.equal(getLevelFromXp(100), 2);
  assert.equal(getLevelFromXp(245), 3);
  assert.equal(getXpProgressInLevel(245), 45);
});

test('calculateAnswerReward increments combo streak, triggers Fever Mode at 3+ streak, and doubles/5x rewards', () => {
  const r1 = calculateAnswerReward(true, 0, 20, 30);
  assert.equal(r1.nextStreak, 1);
  assert.equal(r1.multiplier, 1);
  assert.equal(r1.isFever, false);
  assert.equal(r1.coinsDelta, 20);
  assert.equal(r1.xpDelta, 30);

  const r2 = calculateAnswerReward(true, 1, 20, 30);
  assert.equal(r2.nextStreak, 2);
  assert.equal(r2.multiplier, 2);
  assert.equal(r2.isFever, false);
  assert.equal(r2.coinsDelta, 30);

  const r3 = calculateAnswerReward(true, 2, 20, 30);
  assert.equal(r3.nextStreak, 3);
  assert.equal(r3.multiplier, 3);
  assert.equal(r3.isFever, true);
  assert.equal(r3.coinsDelta, 40);
  assert.equal(r3.xpDelta, 60);

  const r5 = calculateAnswerReward(true, 4, 20, 30);
  assert.equal(r5.nextStreak, 5);
  assert.equal(r5.multiplier, 5);
  assert.equal(r5.isFever, true);
  assert.equal(r5.xpDelta, 150);

  const wrong = calculateAnswerReward(false, 4, 20, 30);
  assert.equal(wrong.nextStreak, 0);
  assert.equal(wrong.isFever, false);
  assert.equal(wrong.coinsDelta, 0);
});

test('Lari Kilat 4-lane positions map to distinct X coordinates', () => {
  assert.equal(getLaneX(0), -4.5);
  assert.equal(getLaneX(1), -1.5);
  assert.equal(getLaneX(2), 1.5);
  assert.equal(getLaneX(3), 4.5);
});

test('Jatuh Bangun tower survival ascends on correct and drops on wrong', () => {
  const up = stepTowerFloor(2, true, 4);
  assert.equal(up.nextFloor, 3);
  assert.equal(up.won, false);

  const win = stepTowerFloor(3, true, 4);
  assert.equal(win.nextFloor, 4);
  assert.equal(win.won, true);

  const fall = stepTowerFloor(2, false, 4);
  assert.equal(fall.nextFloor, 1);
  assert.equal(fall.fell, true);
});

test('Jembatan Juara glass bridge advances on right panel and shatters on wrong', () => {
  const ok = stepBridgePanel(5, 2, 2, 6);
  assert.equal(ok.panelSolid, true);
  assert.equal(ok.finished, true);

  const miss = stepBridgePanel(2, 0, 3, 6);
  assert.equal(miss.panelSolid, false);
  assert.equal(miss.nextStep, 2);
});

test('Pasar Nusantara covers all 5 visual math challenge types', () => {
  const types = new Set(PASAR_CHALLENGES.map((c) => c.taskType));
  assert.ok(types.has('total_belanja'));
  assert.ok(types.has('kembalian'));
  assert.ok(types.has('diskon'));
  assert.ok(types.has('timbangan'));
  assert.ok(types.has('pecahan_kue'));
});

test('Game #7 Pertahanan Kastil fires cannon on correct answer and damages castle on wrong', () => {
  const hit = stepCastleDefense(100, 4, true, 5);
  assert.equal(hit.firedCannon, true);
  assert.equal(hit.victory, true);

  const miss = stepCastleDefense(25, 2, false, 5);
  assert.equal(miss.firedCannon, false);
  assert.equal(miss.castleHp, 0);
  assert.equal(miss.defeat, true);
});

test('Game #8 Balap Roket maps 4 ring indices to distinct space quadrants', () => {
  const r0 = getRocketRingCoordinates(0);
  const r3 = getRocketRingCoordinates(3);
  assert.notEqual(r0.x, r3.x);
  assert.notEqual(r0.y, r3.y);
});

test('Game #9 Arsitek Menara stacks precisely on correct and tilts/reduces stability on wrong', () => {
  const ok = stepArchitectBlock(5, 90, true, 6);
  assert.equal(ok.tiltAngle, 0);
  assert.equal(ok.victory, true);

  const bad = stepArchitectBlock(2, 30, false, 6);
  assert.notEqual(bad.tiltAngle, 0);
  assert.equal(bad.stability, 0);
  assert.equal(bad.collapsed, true);
});

test('Game #10 Labirin Minotaur unlocks intersection gate on correct answer', () => {
  const g1 = stepMinotaurMazeGate(3, true, 4);
  assert.equal(g1.gateOpened, true);
  assert.equal(g1.escaped, true);

  const g2 = stepMinotaurMazeGate(1, false, 4);
  assert.equal(g2.gateOpened, false);
  assert.equal(g2.gatesUnlocked, 1);
});

test('Game #11 Panahan Katapel parabolic trajectory peaks at t=0.5 and lands on target at t=1', () => {
  const start = { x: 0, y: 1, z: 10 };
  const target = { x: 9, y: 3, z: -14 };
  const mid = sampleParabolicTrajectory(start, target, 6, 0.5);
  const end = sampleParabolicTrajectory(start, target, 6, 1.0);
  assert.ok(mid.y > start.y && mid.y > target.y);
  assert.equal(end.x, target.x);
  assert.equal(end.y, target.y);
  assert.equal(end.z, target.z);
});

test('Game #12 Sirkuit Logika simulates 6x6 robot commands to all 4 battery stations cleanly', () => {
  for (let st = 0; st < 4; st++) {
    const cmds = buildProgramToStation(st);
    const res = simulateRobotProgram(
      ROBOT_START_COORD.col,
      ROBOT_START_COORD.row,
      0,
      cmds
    );
    assert.equal(res.reachedStationIndex, st);
    assert.equal(res.hitLaser, false);
  }
});

test('Game #13 Selam Samudra opens treasure chest on correct answer and reduces oxygen on wrong', () => {
  const ok = stepSubmarineSonar(3, 4, 2, 2, 5);
  assert.equal(ok.isCorrect, true);
  assert.equal(ok.victory, true);

  const bad = stepSubmarineSonar(1, 2, 0, 3, 5);
  assert.equal(bad.isCorrect, false);
  assert.equal(bad.oxygenLives, 0);
  assert.equal(bad.defeat, true);
});

test('Game #14 Koki Kimia tilts test tube 110 degrees and synthesizes crystal on correct reagent', () => {
  const ok = stepChemLabExperiment(4, 3, 1, 1, 5);
  assert.equal(ok.isCorrect, true);
  assert.ok(Math.abs(ok.pourTiltRadians - (110 * Math.PI) / 180) < 0.001);
  assert.equal(ok.victory, true);

  const bad = stepChemLabExperiment(2, 1, 3, 0, 5);
  assert.equal(bad.isCorrect, false);
  assert.equal(bad.safetyLives, 0);
  assert.equal(bad.defeat, true);
});

test('Game #15 Ekspedisi Pinisi computes dynamic wave height and resolves island dock arrivals', () => {
  const h1 = computePinisiWaveHeight(0, 0, 0);
  const h2 = computePinisiWaveHeight(5, 3, 1.2);
  assert.notEqual(h1, h2);

  const ok = stepPinisiVoyage(4, 3, 3, 3, 5);
  assert.equal(ok.isCorrect, true);
  assert.equal(ok.victory, true);
});

test('Game #16 Penjaga Gawang Pintar computes CubicBezier trajectory and resolves penalty saves', () => {
  const p0 = { x: 2, y: 0.5, z: 12 };
  const p1 = { x: -2, y: 3.5, z: 6 };
  const p2 = { x: -4, y: 4.5, z: 0 };
  const p3 = { x: -4.2, y: 4.1, z: -7.6 };
  const startPt = sampleGoaliePenaltyBezier(p0, p1, p2, p3, 0);
  const endPt = sampleGoaliePenaltyBezier(p0, p1, p2, p3, 1);
  assert.equal(startPt.x, p0.x);
  assert.ok(Math.abs(endPt.x - p3.x) < 0.001);

  const saveRes = stepGoaliePenalty(4, 1, 2, 2, 5, 3);
  assert.equal(saveRes.saved, true);
  assert.equal(saveRes.victory, true);
});

test('Game #17 Pabrik Sortir rotates switch gate and stamps LULUS on matching chute', () => {
  const ok = stepConveyorSorter(4, 0, 1, 1, 5, 3);
  assert.equal(ok.passedStamp, true);
  assert.equal(ok.victory, true);

  const alarm = stepConveyorSorter(2, 2, 0, 3, 5, 3);
  assert.equal(alarm.passedStamp, false);
  assert.equal(alarm.defeat, true);
});

test('Game #18 Tebak Bangun & Bayangan refracts rainbow beam on correct monument', () => {
  const ok = stepPrismLaserCast(4, 3, 2, 2, 5);
  assert.equal(ok.refractedRainbow, true);
  assert.equal(ok.victory, true);

  const miss = stepPrismLaserCast(1, 1, 0, 3, 5);
  assert.equal(miss.refractedRainbow, false);
  assert.equal(miss.defeat, true);
});

test('Game #19 Tarik Tambang Juara triggers Power Pull left on correct answer', () => {
  const pull = resolveTugOfWarAnswer(-4.0, true, -5.0, 5.0);
  assert.equal(pull.powerPull, true);
  assert.equal(pull.victory, true);

  const slip = resolveTugOfWarAnswer(4.2, false, -5.0, 5.0);
  assert.equal(slip.powerPull, false);
  assert.equal(slip.defeat, true);
});

test('Game #20 Arena Boss Akhir triggers Ultimate Beam on 3x combo and depletes Boss HP', () => {
  const hit1 = stepBossBattleAttack(100, 3, 0, 1, 1);
  assert.equal(hit1.isUltimateBeam, false);
  assert.equal(hit1.bossHp, 80);

  const ult = stepBossBattleAttack(30, 3, 2, 3, 3);
  assert.equal(ult.isUltimateBeam, true);
  assert.equal(ult.damageDealt, 35);
  assert.equal(ult.bossHp, 0);
  assert.equal(ult.victory, true);
});

test('Teacher Studio validateQuestionPackJson strips markdown fences and validates schema', () => {
  const markdownWrapped = `\`\`\`json
{
  "title": "Ujian Harian Pecahan",
  "subject": "Matematika",
  "grade": "SD (Kelas 4-6)",
  "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ",
  "materialSummary": "Rumus pecahan senilai dan penjumlahan penyebut sama.",
  "questions": [
    {
      "id": "q1",
      "subject": "Matematika",
      "q": "Berapakah 1/4 + 2/4?",
      "options": ["1/4", "2/4", "3/4", "4/4"],
      "answerIndex": 2,
      "explanation": "1 + 2 = 3, sehingga hasilnya 3/4."
    }
  ]
}
\`\`\``;
  const res = validateQuestionPackJson(markdownWrapped);
  assert.equal(res.valid, true);
  assert.ok(res.pack);
  assert.equal(res.pack.title, 'Ujian Harian Pecahan');
  assert.equal(res.pack.grade, 'SD (Kelas 4-6)');
  assert.equal(res.pack.youtubeUrl, 'https://youtu.be/dQw4w9WgXcQ');
  assert.equal(res.pack.questions.length, 1);
  assert.ok(res.warnings.length >= 1);

  const badRes = validateQuestionPackJson('{"questions": [{"q": "Tes?", "options": ["A", "B"], "answerIndex": 0}]}');
  assert.equal(badRes.valid, false);
  assert.ok(badRes.errors[0].includes('4 pilihan'));
});

test('Teacher Studio extractYoutubeVideoId, generateGeminiTeacherPrompt, and formatWhatsAppScoreReport work accurately', () => {
  assert.equal(
    extractYoutubeVideoId('https://www.youtube.com/watch?v=rfscVS0vtbw'),
    'rfscVS0vtbw'
  );
  assert.equal(
    extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  );
  assert.equal(extractYoutubeVideoId('https://example.com'), null);

  const prompt = generateGeminiTeacherPrompt({
    title: 'Kuis Tata Surya',
    subject: 'Sains',
    grade: 'SMP (Kelas 7-9)',
    topic: 'Planet & Gravitasi',
    count: 20
  });
  assert.ok(prompt.includes('20 soal'));
  assert.ok(prompt.includes('Planet & Gravitasi'));

  const wa = formatWhatsAppScoreReport({
    studentName: 'Budi Santoso',
    level: 3,
    packTitle: 'Kuis Tata Surya',
    subject: 'Sains',
    grade: 'SMP (Kelas 7-9)',
    gameTitle: 'Arena Boss Akhir (Raksasa Ilmu 3D)',
    score: 320,
    bestScore: 320,
    status: 'victory',
    teacherWhatsapp: '081234567890'
  });
  assert.ok(wa.verificationCode.startsWith('EDU-L3-320-'));
  assert.ok(wa.waUrl.startsWith('https://wa.me/6281234567890?text='));
});

test('GraphicsEngine BIOME_LIGHTING_PRESETS, proximity Rim Glow, and water wave math work accurately', () => {
  assert.equal(BIOME_LIGHTING_PRESETS.kota_ilmu.hemiSkyColor, 0x87ceeb);
  assert.equal(BIOME_LIGHTING_PRESETS.kota_ilmu.hemiGroundColor, 0x1e293b);
  assert.equal(BIOME_LIGHTING_PRESETS.kota_ilmu.hemiIntensity, 0.7);
  assert.equal(BIOME_LIGHTING_PRESETS.kota_ilmu.sunColor, 0xfffbeb);
  assert.equal(BIOME_LIGHTING_PRESETS.kota_ilmu.sunIntensity, 1.4);

  // Proximity Rim Glow is 0 outside trigger radius and > 0 inside
  assert.equal(computeProximityGlowIntensity(18, 12, 0), 0);
  const nearGlow = computeProximityGlowIntensity(2.5, 12, 0.3);
  assert.ok(nearGlow > 0.45 && nearGlow <= 1.0);

  // Periodic water wave displacement varies smoothly over uTime
  const h0 = evaluateWaterWaveDisplacement(2.0, -1.5, 0);
  const h1 = evaluateWaterWaveDisplacement(2.0, -1.5, 1.2);
  assert.notEqual(h0, h1);
  assert.ok(Math.abs(h1) < 0.25);
});

test('JuiceEngine getComboStreakTier and computeDynamicDifficulty scale accurately', () => {
  assert.equal(getComboStreakTier(1).multiplier, 1);
  assert.equal(getComboStreakTier(2).multiplier, 2);
  assert.equal(getComboStreakTier(3).multiplier, 3);
  assert.equal(getComboStreakTier(3).isFever, true);
  assert.equal(getComboStreakTier(5).multiplier, 5);
  assert.equal(getComboStreakTier(5).label, '5x FEVER MODE!');

  const baseDda = computeDynamicDifficulty(0, 0);
  const highDda = computeDynamicDifficulty(450, 5);
  assert.equal(baseDda.runnerSpeed, 16);
  assert.ok(highDda.runnerSpeed > baseDda.runnerSpeed);
  assert.ok(highDda.monsterSpeedMultiplier > baseDda.monsterSpeedMultiplier);
  assert.ok(highDda.goalieCountdownSec < baseDda.goalieCountdownSec);
  assert.ok(highDda.opponentAggression > baseDda.opponentAggression);
});

test('PhysicsCharacterController Squash & Stretch, CameraController Dynamic FOV, and JuiceManager Micro Hit-Stop work accurately', () => {
  const phys = new PhysicsCharacterController();
  const avatar = new THREE.Group();
  phys.attachToAvatar(avatar);

  // Jump triggers takeoff squash (1.15, 0.85, 1.15)
  const jumped = phys.triggerJump(10);
  assert.equal(jumped, true);
  assert.equal(phys.scaleState.x, 1.15);
  assert.equal(phys.scaleState.y, 0.85);
  assert.equal(phys.scaleState.z, 1.15);

  // Airborne updates stretch toward (0.9, 1.15, 0.9)
  for (let i = 0; i < 6; i++) {
    phys.update(0.016, i * 0.016, 0, -1, true, 42, avatar);
  }
  assert.ok(phys.jumpY > 0);
  assert.ok(avatar.scale.y > 1.0);
  assert.ok(avatar.scale.x < 1.05);

  // CameraController widens FOV from 60 toward 72 in Lari Kilat / Sprint
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 200);
  const camCtrl = new CameraController(cam);
  for (let i = 0; i < 20; i++) {
    camCtrl.updateFollow(
      0.03,
      new THREE.Vector3(0, 6, 10),
      new THREE.Vector3(0, 2, -10),
      'lari_kilat',
      true
    );
  }
  assert.ok(cam.fov > 66 && cam.fov <= 72);

  // JuiceManager Micro Hit-Stop sets timeScale = 0.1 for 80ms, then recovers to 1.0
  const scene = new THREE.Scene();
  const juice = new JuiceManager(scene);
  juice.triggerHitStop(0.08, 0.1);
  assert.equal(juice.getTimeScale(), 0.1);
  const scaledDt = juice.update(0.04);
  assert.ok(Math.abs(scaledDt - 0.004) < 1e-6);
  juice.update(0.05);
  assert.equal(juice.getTimeScale(), 1.0);
});

test('UIManager computes 1-3 Star ratings, curved timer states (Blue->Yellow->Blinking Red), thumbstick vectors, and [1]-[4] shortcuts', () => {
  // 1-3 Star Rating thresholds (default target 240: 84 -> 1★, 168 -> 2★, 240 -> 3★)
  assert.equal(computeStarRating(0).stars, 0);
  assert.equal(computeStarRating(95).stars, 1);
  assert.equal(computeStarRating(210).stars, 2);
  const s3 = computeStarRating(350);
  assert.equal(s3.stars, 3);
  assert.equal(s3.progressPct, 100);

  // Curved Timer: Blue (>55%) -> Yellow (25..55%) -> Blinking Red (<25%)
  const tBlue = computeQuestionTimerVisual(12, 16);
  assert.equal(tBlue.phase, 'blue');
  assert.equal(tBlue.colorHex, '#0066FF');
  assert.equal(tBlue.isBlinking, false);

  const tYellow = computeQuestionTimerVisual(6, 16);
  assert.equal(tYellow.phase, 'yellow');
  assert.equal(tYellow.colorHex, '#facc15');
  assert.equal(tYellow.isBlinking, false);

  const tRed = computeQuestionTimerVisual(3, 16);
  assert.equal(tRed.phase, 'red');
  assert.equal(tRed.colorHex, '#f43f5e');
  assert.equal(tRed.isBlinking, true);

  // Floating Thumbstick vector clamping and center zeroing
  const dead = computeThumbstickVector(50, 50, 50, 50, 44);
  assert.equal(dead.dx, 0);
  assert.equal(dead.dy, 0);

  const clamped = computeThumbstickVector(50, 50, 150, 50, 44);
  assert.equal(clamped.clampedX, 44);
  assert.equal(clamped.dx, 1);

  // Keyboard shortcuts [1/A]..[4/D]
  assert.equal(UIManager.resolveShortcutKeyToOptionIndex('Digit1'), 0);
  assert.equal(UIManager.resolveShortcutKeyToOptionIndex('Digit4'), 3);
  assert.equal(UIManager.resolveShortcutKeyToOptionIndex('Numpad2'), 1);
  assert.equal(UIManager.resolveShortcutKeyToOptionIndex('KeyW'), null);

  // Control briefing exists for all 20 mini-games
  for (const slot of MINI_GAME_REGISTRY) {
    const brief = getMiniGameControlBriefing(slot.engineId);
    assert.ok(brief.threeStarScore >= 240);
    assert.ok(brief.objective.length > 10);
  }
});

test('IsoPixelEngine 2:1 Isometric projection round-trips cleanly, sorts depth, and EDUZONE branding is active', () => {
  const originX = 640;
  const originY = 360;
  const iso = worldToIsoScreen(3, -2, 0, originX, originY);
  const world = isoScreenToWorld(iso.x, iso.y, originX, originY);
  assert.equal(world.gridX, 3);
  assert.equal(world.gridZ, -2);

  // Painter's algorithm depth increases from north-west (-3,-3) to south-east (3,3)
  assert.ok(computeIsoDepthKey(3, 3) > computeIsoDepthKey(-3, -3));
  assert.equal(BIOME_PIXEL_PALETTES.kota_ilmu.accentHex, '#0066FF');

  // Verify EDUZONE branding in prompt and WhatsApp score report
  const prompt = generateGeminiTeacherPrompt({
    title: 'Kuis IPA',
    subject: 'Sains',
    grade: 'SD',
    topic: 'Ekosistem',
    count: 10
  });
  assert.ok(prompt.includes('EDUZONE'));

  const wa = formatWhatsAppScoreReport({
    studentName: 'Siti',
    level: 2,
    packTitle: 'Kuis IPA',
    subject: 'Sains',
    grade: 'SD',
    gameTitle: 'Jelajah Dunia',
    score: 250,
    bestScore: 250,
    status: 'victory'
  });
  assert.ok(wa.message.includes('EDUZONE'));
});

