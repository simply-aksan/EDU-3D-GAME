import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_QUESTION_PACK,
  MINI_GAME_REGISTRY
} from './questions';
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

test('calculateAnswerReward increments combo streak and scales coins/xp', () => {
  const r1 = calculateAnswerReward(true, 0, 20, 30);
  assert.equal(r1.nextStreak, 1);
  assert.equal(r1.coinsDelta, 20);

  const r2 = calculateAnswerReward(true, 2, 20, 30);
  assert.equal(r2.nextStreak, 3);
  assert.equal(r2.coinsDelta, 30);

  const wrong = calculateAnswerReward(false, 4, 20, 30);
  assert.equal(wrong.nextStreak, 0);
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



