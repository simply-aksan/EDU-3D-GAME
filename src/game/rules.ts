import {
  DEFAULT_QUESTION_PACK,
  PlayerProfile,
  QuestionItem,
  QuestionPack
} from './questions';

export const STORAGE_KEY_PROFILE = 'eduverse_3d_profile_v1';
export const STORAGE_KEY_PACK = 'eduverse_3d_question_pack_v1';

export function createDefaultProfile(): PlayerProfile {
  return {
    name: 'Pelajar Nusantara',
    xp: 120,
    level: 2,
    coins: 150,
    uniform: 'sd',
    unlockedUniforms: ['sd'],
    accessories: ['topi_sekolah', 'tas_ransel'],
    unlockedAccessories: ['topi_sekolah', 'tas_ransel'],
    collectedBooks: [],
    highScores: {
      jelajah_dunia: 0,
      lari_kilat: 0,
      jatuh_bangun: 0,
      detektif_kota: 0,
      pasar_nusantara: 0,
      jembatan_juara: 0,
      pertahanan_kastil: 0,
      balap_roket: 0,
      arsitek_menara: 0,
      labirin_minotaur: 0,
      panahan_katapel: 0,
      sirkuit_logika: 0,
      selam_samudra: 0,
      koki_kimia: 0,
      ekspedisi_pinisi: 0,
      penjaga_gawang: 0,
      pabrik_sortir: 0,
      tebak_bangun: 0,
      tarik_tambang: 0,
      arena_boss: 0
    }
  };
}

export function getLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor(safeXp / 100) + 1;
}

export function getXpProgressInLevel(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return safeXp % 100;
}

export function calculateAnswerReward(
  isCorrect: boolean,
  streak: number,
  baseCoins = 25,
  baseXp = 30
): { coinsDelta: number; xpDelta: number; nextStreak: number } {
  if (!isCorrect) {
    return { coinsDelta: 0, xpDelta: 5, nextStreak: 0 };
  }
  const nextStreak = streak + 1;
  const comboMultiplier = Math.min(2.5, 1 + (nextStreak - 1) * 0.25);
  return {
    coinsDelta: Math.round(baseCoins * comboMultiplier),
    xpDelta: Math.round(baseXp * comboMultiplier),
    nextStreak
  };
}

export interface QuestionPackValidationResult {
  valid: boolean;
  pack: QuestionPack | null;
  errors: string[];
  warnings: string[];
}

export function extractYoutubeVideoId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Match standard watch?v=, youtu.be/, /embed/, or /shorts/
  const regex =
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = trimmed.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  // Also accept raw 11-char ID if teacher pasted just the ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function validateQuestionPackJson(
  rawInput: string,
  fallbackMeta?: {
    title?: string;
    subject?: string;
    grade?: string;
    author?: string;
    youtubeUrl?: string;
    materialSummary?: string;
    teacherWhatsapp?: string;
  }
): QuestionPackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawInput || !rawInput.trim()) {
    return {
      valid: false,
      pack: null,
      errors: ['Input JSON masih kosong. Tempelkan hasil JSON dari Gemini atau editor.'],
      warnings
    };
  }

  // Strip Markdown code fences (e.g. ```json ... ```) if pasted directly from Gemini
  let cleaned = rawInput.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json|JSON)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    warnings.push('Blok kode Markdown (```json) otomatis dibersihkan.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return {
      valid: false,
      pack: null,
      errors: [
        `Sintaks JSON tidak valid: ${(err as Error)?.message || 'Periksa tanda kutip dan kurung kurawal.'}`
      ],
      warnings
    };
  }

  // Support both a full QuestionPack object or a raw array of QuestionItems
  let rawObj: Record<string, unknown>;
  if (Array.isArray(parsed)) {
    rawObj = {
      title: fallbackMeta?.title || 'Paket Soal AI Gemini',
      subject: fallbackMeta?.subject || 'Semua Mata Pelajaran',
      grade: fallbackMeta?.grade || 'SMP (Kelas 7-9)',
      questions: parsed
    };
    warnings.push(
      'Array soal terdeteksi dan otomatis dibungkus menjadi objek QuestionPack.'
    );
  } else if (parsed && typeof parsed === 'object') {
    rawObj = parsed as Record<string, unknown>;
  } else {
    return {
      valid: false,
      pack: null,
      errors: ['JSON harus berupa objek paket soal atau array daftar soal.'],
      warnings
    };
  }

  if (!Array.isArray(rawObj.questions) || rawObj.questions.length === 0) {
    return {
      valid: false,
      pack: null,
      errors: ['Properti "questions" wajib berupa array berisi minimal 1 soal.'],
      warnings
    };
  }

  const validQuestions: QuestionItem[] = [];
  const defaultSubject =
    (typeof rawObj.subject === 'string' && rawObj.subject.trim()) ||
    fallbackMeta?.subject ||
    'Umum';

  rawObj.questions.forEach((item: unknown, idx: number) => {
    const qNum = idx + 1;
    if (!item || typeof item !== 'object') {
      errors.push(`Soal #${qNum}: harus berupa objek.`);
      return;
    }
    const qObj = item as Record<string, unknown>;
    const qText =
      typeof qObj.q === 'string'
        ? qObj.q.trim()
        : typeof qObj.question === 'string'
        ? qObj.question.trim()
        : '';

    if (!qText) {
      errors.push(`Soal #${qNum}: properti pertanyaan "q" kosong atau tidak ditemukan.`);
      return;
    }

    if (!Array.isArray(qObj.options) || qObj.options.length !== 4) {
      errors.push(
        `Soal #${qNum}: properti "options" wajib berupa array berisi tepat 4 pilihan jawaban [A, B, C, D].`
      );
      return;
    }

    const opts = qObj.options.map((o) => String(o ?? '').trim());
    if (opts.some((o) => o.length === 0)) {
      errors.push(`Soal #${qNum}: terdapat pilihan jawaban A/B/C/D yang masih kosong.`);
      return;
    }

    const rawAns = Number(qObj.answerIndex);
    if (!Number.isInteger(rawAns) || rawAns < 0 || rawAns > 3) {
      errors.push(
        `Soal #${qNum}: "answerIndex" wajib berupa angka bulat 0 (A), 1 (B), 2 (C), atau 3 (D).`
      );
      return;
    }

    const explanation =
      typeof qObj.explanation === 'string' && qObj.explanation.trim()
        ? qObj.explanation.trim()
        : 'Jawaban benar sesuai pembahasan materi guru.';

    validQuestions.push({
      id:
        typeof qObj.id === 'string' && qObj.id.trim()
          ? qObj.id.trim()
          : `q-${idx + 1}`,
      subject:
        typeof qObj.subject === 'string' && qObj.subject.trim()
          ? qObj.subject.trim()
          : defaultSubject,
      q: qText,
      options: [opts[0], opts[1], opts[2], opts[3]],
      answerIndex: rawAns,
      explanation
    });
  });

  if (errors.length > 0 || validQuestions.length === 0) {
    return {
      valid: false,
      pack: null,
      errors:
        errors.length > 0
          ? errors
          : ['Tidak ada soal valid yang dapat dimuat dari JSON.'],
      warnings
    };
  }

  const pack: QuestionPack = {
    id:
      typeof rawObj.id === 'string' && rawObj.id.trim()
        ? rawObj.id.trim()
        : `pack-${Date.now()}`,
    title:
      (typeof rawObj.title === 'string' && rawObj.title.trim()) ||
      fallbackMeta?.title ||
      `Paket Soal ${defaultSubject}`,
    subject: defaultSubject,
    grade:
      (typeof rawObj.grade === 'string' && rawObj.grade.trim()) ||
      fallbackMeta?.grade ||
      'SMP (Kelas 7-9)',
    author:
      (typeof rawObj.author === 'string' && rawObj.author.trim()) ||
      fallbackMeta?.author ||
      'Guru Eduverse',
    youtubeUrl:
      (typeof rawObj.youtubeUrl === 'string' && rawObj.youtubeUrl.trim()) ||
      fallbackMeta?.youtubeUrl ||
      '',
    materialSummary:
      (typeof rawObj.materialSummary === 'string' &&
        rawObj.materialSummary.trim()) ||
      fallbackMeta?.materialSummary ||
      '',
    teacherWhatsapp:
      (typeof rawObj.teacherWhatsapp === 'string' &&
        rawObj.teacherWhatsapp.trim()) ||
      fallbackMeta?.teacherWhatsapp ||
      '',
    questions: validQuestions
  };

  return {
    valid: true,
    pack,
    errors: [],
    warnings
  };
}

export function generateGeminiTeacherPrompt(params: {
  title: string;
  subject: string;
  grade: string;
  topic: string;
  count?: number;
  youtubeUrl?: string;
  materialSummary?: string;
}): string {
  const count = params.count || 20;
  const cleanTopic =
    params.topic.trim() || `Materi Inti ${params.subject} ${params.grade}`;

  return `Kamu adalah Guru Ahli Kurikulum Nasional Indonesia. Buatkan tepat ${count} soal pilihan ganda berkualitas tinggi beserta ringkasan materi untuk aplikasi game edukasi "EDUVERSE 3D".

SPESIFIKASI PAKET SOAL:
- Judul Paket: "${params.title}"
- Mata Pelajaran: "${params.subject}"
- Jenjang Kelas: "${params.grade}"
- Topik Bahasan: "${cleanTopic}"

ATURAN OUTPUT WAJIB:
1. Keluarkan HANYA format JSON murni yang valid tanpa teks pengantar di luar JSON.
2. Setiap soal wajib memiliki tepat 4 opsi jawaban (array "options" panjang 4) dan "answerIndex" berupa angka 0 (untuk A), 1 (untuk B), 2 (untuk C), atau 3 (untuk D).
3. Sertakan "explanation" (pembahasan singkat & jelas) pada setiap soal.

SCHEMA JSON WAJIB:
{
  "title": "${params.title}",
  "subject": "${params.subject}",
  "grade": "${params.grade}",
  "youtubeUrl": "${params.youtubeUrl || ''}",
  "materialSummary": "Ringkasan materi padat 3-5 poin tentang ${cleanTopic}...",
  "questions": [
    {
      "id": "q1",
      "subject": "${params.subject}",
      "q": "Teks pertanyaan nomor 1...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "answerIndex": 0,
      "explanation": "Pembahasan singkat mengapa jawaban tersebut benar."
    }
  ]
}`;
}

export function formatWhatsAppScoreReport(params: {
  studentName: string;
  level: number;
  packTitle: string;
  subject: string;
  grade: string;
  gameTitle: string;
  score: number;
  bestScore: number;
  status: 'victory' | 'defeat';
  teacherWhatsapp?: string;
}): {
  message: string;
  waUrl: string;
  verificationCode: string;
} {
  const cleanName = params.studentName.trim() || 'Pelajar Nusantara';
  const hashNum =
    (cleanName.length * 37 +
      params.score * 17 +
      params.level * 13 +
      params.bestScore * 7) %
    9999;
  const verificationCode = `EDU-L${params.level}-${params.score}-${String(
    hashNum
  ).padStart(4, '0')}`;
  const statusLabel =
    params.status === 'victory' ? 'LULUS / MISI TUNTAS' : 'SELESAI BERLATIH';

  const message = [
    `*LAPORAN HASIL BELAJAR EDUVERSE 3D*`,
    `----------------------------------`,
    `Nama Murid : *${cleanName}* (Level ${params.level})`,
    `Paket Soal : ${params.packTitle}`,
    `Mapel / Kelas : ${params.subject} (${params.grade})`,
    `Mini-Game 3D : ${params.gameTitle}`,
    `Skor Akhir : *${params.score} Poin* (Rekor: ${params.bestScore})`,
    `Status Misi : *${statusLabel}*`,
    `Kode Verifikasi : \`${verificationCode}\``
  ].join('\n');

  const digitsOnly = (params.teacherWhatsapp || '').replace(/[^0-9]/g, '');
  const normalizedPhone = digitsOnly.startsWith('0')
    ? `62${digitsOnly.slice(1)}`
    : digitsOnly;

  const waUrl = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  return {
    message,
    waUrl,
    verificationCode
  };
}

export function encodeQuestionPackToHash(pack: QuestionPack): string {
  const jsonStr = JSON.stringify(pack);
  const bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `#p=${encodeURIComponent(base64)}`;
}

export function decodeQuestionPackFromHash(hash: string): QuestionPack | null {
  if (!hash) return null;
  const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(cleaned);
  const encoded = params.get('p');
  if (!encoded) return null;

  try {
    const base64 = decodeURIComponent(encoded);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const validation = validateQuestionPackJson(jsonStr);
    return validation.valid ? validation.pack : null;
  } catch {
    return null;
  }
}

export function getQuestionsBySubject(
  pack: QuestionPack,
  subjectFilter?: string
): QuestionItem[] {
  const source =
    pack && Array.isArray(pack.questions) && pack.questions.length > 0
      ? pack.questions
      : DEFAULT_QUESTION_PACK.questions;

  if (!subjectFilter || subjectFilter === 'Semua') {
    return source;
  }
  const filtered = source.filter(
    (item) => item.subject.toLowerCase() === subjectFilter.toLowerCase()
  );
  return filtered.length > 0 ? filtered : source;
}

// Lari Kilat 4-lane runner math
export const RUNNER_LANES = [-4.5, -1.5, 1.5, 4.5] as const;

export function getLaneX(laneIndex: number): number {
  const clamped = Math.max(0, Math.min(3, Math.round(laneIndex)));
  return RUNNER_LANES[clamped];
}

// Jatuh Bangun 4-floor hexagonal tower rules
export function stepTowerFloor(
  currentFloor: number,
  isCorrect: boolean,
  maxFloor = 4
): { nextFloor: number; won: boolean; fell: boolean } {
  if (isCorrect) {
    const nextFloor = Math.min(maxFloor, currentFloor + 1);
    return {
      nextFloor,
      won: nextFloor >= maxFloor,
      fell: false
    };
  }
  const nextFloor = Math.max(0, currentFloor - 1);
  return {
    nextFloor,
    won: false,
    fell: true
  };
}

// Jembatan Juara 6-step island glass bridge rules
export function stepBridgePanel(
  currentStep: number,
  chosenOption: number,
  correctOption: number,
  totalSteps = 6
): { nextStep: number; panelSolid: boolean; finished: boolean } {
  if (chosenOption === correctOption) {
    const nextStep = currentStep + 1;
    return {
      nextStep,
      panelSolid: true,
      finished: nextStep >= totalSteps
    };
  }
  return {
    nextStep: currentStep,
    panelSolid: false,
    finished: false
  };
}

// Pasar Nusantara 5 visual math challenge archetypes
export type PasarTaskType =
  | 'total_belanja'
  | 'kembalian'
  | 'diskon'
  | 'timbangan'
  | 'pecahan_kue';

export interface PasarOrderChallenge {
  id: string;
  customerName: string;
  taskType: PasarTaskType;
  badgeLabel: string;
  prompt: string;
  visualDetail: string;
  options: [string, string, string, string];
  answerIndex: number;
  explanation: string;
  cakeSlicesRemaining?: number;
  cakeSlicesTotal?: number;
  weightGrams?: number;
}

export const PASAR_CHALLENGES: PasarOrderChallenge[] = [
  {
    id: 'pasar-1',
    customerName: 'Ibu Ratna',
    taskType: 'total_belanja',
    badgeLabel: 'Total Belanja',
    prompt: 'Ibu Ratna membeli 3 bungkus Beras Merah (@Rp15.000) dan 2 botol Madu Hutan (@Rp20.000). Berapa total belanja seluruhnya?',
    visualDetail: '3× Beras Merah (Rp15.000) + 2× Madu Hutan (Rp20.000)',
    options: ['Rp75.000', 'Rp85.000', 'Rp90.000', 'Rp95.000'],
    answerIndex: 1,
    explanation: '(3 × Rp15.000) + (2 × Rp20.000) = Rp45.000 + Rp40.000 = Rp85.000.'
  },
  {
    id: 'pasar-2',
    customerName: 'Pak Darma',
    taskType: 'kembalian',
    badgeLabel: 'Kembalian Uang',
    prompt: 'Pak Darma membeli Kopi Toraja seharga Rp62.000 dan membayar dengan selembar uang Rp100.000. Berapa uang kembaliannya?',
    visualDetail: 'Bayar: Rp100.000 · Harga Barang: Rp62.000',
    options: ['Rp28.000', 'Rp32.000', 'Rp38.000', 'Rp48.000'],
    answerIndex: 2,
    explanation: 'Kembalian = Rp100.000 - Rp62.000 = Rp38.000.'
  },
  {
    id: 'pasar-3',
    customerName: 'Kak Sinta',
    taskType: 'diskon',
    badgeLabel: 'Persentase Diskon',
    prompt: 'Kain Tenun Ikat seharga Rp80.000 sedang diskon 20% di Pasar Nusantara. Berapa harga setelah diskon?',
    visualDetail: 'Harga Asli: Rp80.000 · Potongan Diskon: 20%',
    options: ['Rp60.000', 'Rp64.000', 'Rp68.000', 'Rp72.000'],
    answerIndex: 1,
    explanation: 'Potongan 20% × Rp80.000 = Rp16.000. Harga bersih = Rp80.000 - Rp16.000 = Rp64.000.'
  },
  {
    id: 'pasar-4',
    customerName: 'Koki Dimas',
    taskType: 'timbangan',
    badgeLabel: 'Timbangan Berat',
    prompt: 'Di atas timbangan kuningan ada 1,25 kg Gula Aren. Jika Koki Dimas ingin genap 2 kg, berapa gram lagi yang harus ditambahkan?',
    visualDetail: 'Timbangan Saat Ini: 1.250 gram · Target: 2.000 gram (2 kg)',
    options: ['500 gram', '650 gram', '750 gram', '850 gram'],
    answerIndex: 2,
    explanation: '2 kg = 2.000 gram. Kekurangan = 2.000 - 1.250 = 750 gram.',
    weightGrams: 1250
  },
  {
    id: 'pasar-5',
    customerName: 'Adik Riko',
    taskType: 'pecahan_kue',
    badgeLabel: 'Pecahan Kue Lapis',
    prompt: 'Satu loyang Kue Bika Ambon dipotong menjadi 8 bagian sama besar. Adik Riko membeli 3 potong. Berapa bagian sisa kue di nampan?',
    visualDetail: 'Total: 8/8 Loyang · Dibeli: 3/8 Loyang',
    options: ['3/8 bagian', '4/8 bagian', '5/8 bagian', '6/8 bagian'],
    answerIndex: 2,
    explanation: '8/8 dikurangi 3/8 menyisakan 5/8 bagian kue di atas nampan.',
    cakeSlicesRemaining: 5,
    cakeSlicesTotal: 8
  }
];

// ============================================================================
// BATCH 2 MINI-GAMES (#7 - #11) PURE LOGIC RULES
// ============================================================================

// Game #7: Pertahanan Kastil (Arsena Sains) — 3D Tower Defense
export function stepCastleDefense(
  castleHp: number,
  monstersDefeated: number,
  isCorrect: boolean,
  targetWaveKills = 5
): {
  castleHp: number;
  monstersDefeated: number;
  firedCannon: boolean;
  victory: boolean;
  defeat: boolean;
} {
  if (isCorrect) {
    const nextKills = monstersDefeated + 1;
    return {
      castleHp,
      monstersDefeated: nextKills,
      firedCannon: true,
      victory: nextKills >= targetWaveKills,
      defeat: false
    };
  }
  const nextHp = Math.max(0, castleHp - 25);
  return {
    castleHp: nextHp,
    monstersDefeated,
    firedCannon: false,
    victory: false,
    defeat: nextHp <= 0
  };
}

// Game #8: Balap Roket Galaksi — 3D Space Flight Ring Quadrants
export const ROCKET_RING_COORDS: readonly [number, number][] = [
  [-5.2, 4.4],
  [5.2, 4.4],
  [-5.2, -1.6],
  [5.2, -1.6]
] as const;

export function getRocketRingCoordinates(ringIndex: number): {
  x: number;
  y: number;
} {
  const clamped = Math.max(0, Math.min(3, Math.floor(ringIndex)));
  const [x, y] = ROCKET_RING_COORDS[clamped];
  return { x, y };
}

// Game #9: Arsitek Menara — 3D Block Stacker Precision & Stability
export function stepArchitectBlock(
  currentFloors: number,
  currentStability: number,
  isCorrect: boolean,
  targetFloors = 6
): {
  floors: number;
  stability: number;
  tiltAngle: number;
  offsetX: number;
  victory: boolean;
  collapsed: boolean;
} {
  const nextFloors = currentFloors + 1;
  if (isCorrect) {
    return {
      floors: nextFloors,
      stability: Math.min(100, currentStability + 5),
      tiltAngle: 0,
      offsetX: 0,
      victory: nextFloors >= targetFloors,
      collapsed: false
    };
  }
  const nextStability = Math.max(0, currentStability - 30);
  const sign = nextFloors % 2 === 0 ? 1 : -1;
  return {
    floors: nextFloors,
    stability: nextStability,
    tiltAngle: sign * 0.16,
    offsetX: sign * 0.85,
    victory: false,
    collapsed: nextStability <= 0
  };
}

// Game #10: Labirin Minotaur — 3D Procedural Maze Intersection Gates
export function stepMinotaurMazeGate(
  gatesUnlocked: number,
  isCorrect: boolean,
  totalGates = 4
): {
  gatesUnlocked: number;
  gateOpened: boolean;
  escaped: boolean;
} {
  if (isCorrect) {
    const next = Math.min(totalGates, gatesUnlocked + 1);
    return {
      gatesUnlocked: next,
      gateOpened: true,
      escaped: next >= totalGates
    };
  }
  return {
    gatesUnlocked,
    gateOpened: false,
    escaped: false
  };
}

// Game #11: Panahan Katapel Fisika — Parabolic Trajectory Curve Math
export const CATAPULT_TARGET_X: readonly number[] = [-9, -3, 3, 9] as const;

export function sampleParabolicTrajectory(
  start: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  arcHeight: number,
  t: number
): { x: number; y: number; z: number } {
  const u = Math.max(0, Math.min(1, t));
  const x = start.x + (target.x - start.x) * u;
  const z = start.z + (target.z - start.z) * u;
  const baseLinearY = start.y + (target.y - start.y) * u;
  const parabolaBump = 4 * arcHeight * u * (1 - u);
  return {
    x,
    y: baseLinearY + parabolaBump,
    z
  };
}

// ============================================================================
// BATCH 3 MINI-GAMES (#12 - #15) PURE LOGIC RULES
// ============================================================================

// Game #12: Sirkuit Logika (Robot Coder 3D) — 6x6 Isometric Grid Puzzle
export type RobotCommandType = 'maju' | 'kiri' | 'kanan' | 'lompat';

export interface GridCoord {
  col: number;
  row: number;
}

// 4 Battery Stations at the 4 corners of the 6x6 grid (0..5)
export const ROBOT_STATIONS: readonly GridCoord[] = [
  { col: 0, row: 0 }, // Station A (Top-Left)
  { col: 5, row: 0 }, // Station B (Top-Right)
  { col: 0, row: 5 }, // Station C (Bottom-Left)
  { col: 5, row: 5 }  // Station D (Bottom-Right)
] as const;

export const ROBOT_START_COORD: GridCoord = { col: 2, row: 3 };

// Laser obstacle tiles on the 6x6 grid
export const ROBOT_LASER_TILES: readonly GridCoord[] = [
  { col: 1, row: 1 },
  { col: 4, row: 1 },
  { col: 1, row: 4 },
  { col: 4, row: 4 }
] as const;

export interface RobotStepKeyframe {
  col: number;
  row: number;
  dir: number; // 0: North (-Z), 1: East (+X), 2: South (+Z), 3: West (-X)
  jumped: boolean;
  hitLaser: boolean;
}

export function simulateRobotProgram(
  startCol: number,
  startRow: number,
  startDir: number,
  commands: RobotCommandType[],
  lasers: readonly GridCoord[] = ROBOT_LASER_TILES
): {
  keyframes: RobotStepKeyframe[];
  finalCol: number;
  finalRow: number;
  finalDir: number;
  reachedStationIndex: number | null;
  hitLaser: boolean;
} {
  let col = startCol;
  let row = startRow;
  let dir = ((startDir % 4) + 4) % 4;
  let hitLaser = false;
  const keyframes: RobotStepKeyframe[] = [];

  const dCol = [0, 1, 0, -1];
  const dRow = [-1, 0, 1, 0];

  const isLaser = (c: number, r: number) =>
    lasers.some((l) => l.col === c && l.row === r);

  for (const cmd of commands) {
    if (cmd === 'kiri') {
      dir = (dir + 3) % 4;
      keyframes.push({ col, row, dir, jumped: false, hitLaser: false });
    } else if (cmd === 'kanan') {
      dir = (dir + 1) % 4;
      keyframes.push({ col, row, dir, jumped: false, hitLaser: false });
    } else if (cmd === 'maju') {
      const nc = Math.max(0, Math.min(5, col + dCol[dir]));
      const nr = Math.max(0, Math.min(5, row + dRow[dir]));
      col = nc;
      row = nr;
      const laserHit = isLaser(col, row);
      if (laserHit) hitLaser = true;
      keyframes.push({ col, row, dir, jumped: false, hitLaser: laserHit });
    } else if (cmd === 'lompat') {
      // Jumps 2 tiles forward over a laser obstacle
      const nc = Math.max(0, Math.min(5, col + dCol[dir] * 2));
      const nr = Math.max(0, Math.min(5, row + dRow[dir] * 2));
      col = nc;
      row = nr;
      const laserHit = isLaser(col, row);
      if (laserHit) hitLaser = true;
      keyframes.push({ col, row, dir, jumped: true, hitLaser: laserHit });
    }
  }

  const stationIdx = ROBOT_STATIONS.findIndex(
    (s) => s.col === col && s.row === row
  );

  return {
    keyframes,
    finalCol: col,
    finalRow: row,
    finalDir: dir,
    reachedStationIndex: stationIdx >= 0 ? stationIdx : null,
    hitLaser
  };
}

// Helper to build a clean valid robot program from ROBOT_START_COORD (2,3) facing North (0) to Station A/B/C/D
export function buildProgramToStation(stationIndex: number): RobotCommandType[] {
  switch (stationIndex) {
    case 0: // Station A (0,0) from (2,3) facing North
      return ['maju', 'maju', 'maju', 'kiri', 'maju', 'maju'];
    case 1: // Station B (5,0) from (2,3) facing North
      return ['maju', 'maju', 'maju', 'kanan', 'maju', 'maju', 'maju'];
    case 2: // Station C (0,5) from (2,3) facing North
      return ['kiri', 'maju', 'maju', 'kiri', 'maju', 'maju'];
    default: // Station D (5,5) from (2,3) facing North
      return ['kanan', 'maju', 'maju', 'maju', 'kanan', 'maju', 'maju'];
  }
}

// Game #13: Selam Samudra (Submarine Sonar 3D) — 4 Treasure Chests on Ocean Floor
export const SUBMARINE_CHEST_COORDS: readonly { x: number; y: number; z: number }[] = [
  { x: -12, y: 0.6, z: -12 }, // Chest A
  { x: 12, y: 0.6, z: -12 },  // Chest B
  { x: -12, y: 0.6, z: 6 },   // Chest C
  { x: 12, y: 0.6, z: 6 }     // Chest D
] as const;

export function stepSubmarineSonar(
  oxygenLives: number,
  chestsOpened: number,
  chosenChestIndex: number,
  answerIndex: number,
  targetChests = 5
): {
  oxygenLives: number;
  chestsOpened: number;
  isCorrect: boolean;
  victory: boolean;
  defeat: boolean;
} {
  const isCorrect = chosenChestIndex === answerIndex;
  if (isCorrect) {
    const nextChests = chestsOpened + 1;
    return {
      oxygenLives,
      chestsOpened: nextChests,
      isCorrect: true,
      victory: nextChests >= targetChests,
      defeat: false
    };
  }
  const nextOx = Math.max(0, oxygenLives - 1);
  return {
    oxygenLives: nextOx,
    chestsOpened,
    isCorrect: false,
    victory: false,
    defeat: nextOx <= 0
  };
}

// Game #14: Koki Kimia (Lab Eksperimen 3D) — 4 Colored Test Tubes (A: Merah, B: Biru, C: Hijau, D: Ungu)
export const CHEM_TUBE_SPECS = [
  { label: 'A', name: 'Merah', colorHex: 0xef4444, cssHex: '#ef4444', x: -4.2 },
  { label: 'B', name: 'Biru', colorHex: 0x3b82f6, cssHex: '#3b82f6', x: -1.4 },
  { label: 'C', name: 'Hijau', colorHex: 0x10b981, cssHex: '#10b981', x: 1.4 },
  { label: 'D', name: 'Ungu', colorHex: 0xa855f7, cssHex: '#a855f7', x: 4.2 }
] as const;

export function stepChemLabExperiment(
  experimentsDone: number,
  safetyLives: number,
  chosenTubeIndex: number,
  answerIndex: number,
  targetExperiments = 5
): {
  experimentsDone: number;
  safetyLives: number;
  isCorrect: boolean;
  pourTiltRadians: number;
  victory: boolean;
  defeat: boolean;
} {
  const isCorrect = chosenTubeIndex === answerIndex;
  const pourTiltRadians = (110 * Math.PI) / 180;
  if (isCorrect) {
    const nextDone = experimentsDone + 1;
    return {
      experimentsDone: nextDone,
      safetyLives,
      isCorrect: true,
      pourTiltRadians,
      victory: nextDone >= targetExperiments,
      defeat: false
    };
  }
  const nextLives = Math.max(0, safetyLives - 1);
  return {
    experimentsDone,
    safetyLives: nextLives,
    isCorrect: false,
    pourTiltRadians,
    victory: false,
    defeat: nextLives <= 0
  };
}

// Game #15: Ekspedisi Pinisi (Peta Nusantara 3D) — Dynamic Wave Math & 4 Cultural Islands
export const PINISI_ISLAND_COORDS: readonly { x: number; z: number; name: string }[] = [
  { x: -24, z: -22, name: 'Pulau A (Barat Laut)' },
  { x: 24, z: -22, name: 'Pulau B (Timur Laut)' },
  { x: -24, z: 18, name: 'Pulau C (Barat Daya)' },
  { x: 24, z: 18, name: 'Pulau D (Tenggara)' }
] as const;

export function computePinisiWaveHeight(
  x: number,
  z: number,
  time: number
): number {
  return Math.sin(time * 2.1 + x * 0.18) * Math.cos(time * 1.7 + z * 0.18) * 0.55;
}

export function stepPinisiVoyage(
  islandsVisited: number,
  hullLives: number,
  chosenIslandIndex: number,
  answerIndex: number,
  targetIslands = 5
): {
  islandsVisited: number;
  hullLives: number;
  isCorrect: boolean;
  victory: boolean;
  defeat: boolean;
} {
  const isCorrect = chosenIslandIndex === answerIndex;
  if (isCorrect) {
    const nextVisited = islandsVisited + 1;
    return {
      islandsVisited: nextVisited,
      hullLives,
      isCorrect: true,
      victory: nextVisited >= targetIslands,
      defeat: false
    };
  }
  const nextHull = Math.max(0, hullLives - 1);
  return {
    islandsVisited,
    hullLives: nextHull,
    isCorrect: false,
    victory: false,
    defeat: nextHull <= 0
  };
}

// ============================================================================
// BATCH 4 MINI-GAMES (#16 - #20) PURE LOGIC RULES
// ============================================================================

// Game #16: Penjaga Gawang Pintar (3D Goalie Reflex) — 4 Goal Target Zones & Cubic Bezier Curve
export const GOALIE_ZONE_SPECS = [
  { label: 'A', name: 'Kiri Atas', x: -4.2, y: 4.1, z: -7.6, colorHex: 0x22c55e, cssHex: '#22c55e' },
  { label: 'B', name: 'Kanan Atas', x: 4.2, y: 4.1, z: -7.6, colorHex: 0x06b6d4, cssHex: '#06b6d4' },
  { label: 'C', name: 'Kiri Bawah', x: -4.2, y: 1.5, z: -7.6, colorHex: 0xf59e0b, cssHex: '#f59e0b' },
  { label: 'D', name: 'Kanan Bawah', x: 4.2, y: 1.5, z: -7.6, colorHex: 0xec4899, cssHex: '#ec4899' }
] as const;

export function sampleGoaliePenaltyBezier(
  p0: { x: number; y: number; z: number },
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number },
  p3: { x: number; y: number; z: number },
  t: number
): { x: number; y: number; z: number } {
  const u = Math.max(0, Math.min(1, t));
  const inv = 1 - u;
  const b0 = inv * inv * inv;
  const b1 = 3 * inv * inv * u;
  const b2 = 3 * inv * u * u;
  const b3 = u * u * u;
  return {
    x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
    z: b0 * p0.z + b1 * p1.z + b2 * p2.z + b3 * p3.z
  };
}

export function stepGoaliePenalty(
  saves: number,
  goalsConceded: number,
  chosenZoneIndex: number,
  answerIndex: number,
  targetSaves = 5,
  maxConceded = 3
): {
  saves: number;
  goalsConceded: number;
  saved: boolean;
  victory: boolean;
  defeat: boolean;
} {
  const saved = chosenZoneIndex === answerIndex;
  if (saved) {
    const nextSaves = saves + 1;
    return {
      saves: nextSaves,
      goalsConceded,
      saved: true,
      victory: nextSaves >= targetSaves,
      defeat: false
    };
  }
  const nextConceded = goalsConceded + 1;
  return {
    saves,
    goalsConceded: nextConceded,
    saved: false,
    victory: false,
    defeat: nextConceded >= maxConceded
  };
}

// Game #17: Pabrik Sortir (3D Conveyor Belt Sorter) — 4 Container Chutes & Switch Gate Angles
export const CONVEYOR_CHUTE_SPECS = [
  { label: 'A', name: 'Kontainer A', gateAngleY: -0.65, endX: -7.5, endZ: -6.5, colorHex: 0x22c55e, cssHex: '#22c55e' },
  { label: 'B', name: 'Kontainer B', gateAngleY: -0.22, endX: -2.5, endZ: -8.5, colorHex: 0x06b6d4, cssHex: '#06b6d4' },
  { label: 'C', name: 'Kontainer C', gateAngleY: 0.22, endX: 2.5, endZ: -8.5, colorHex: 0xf59e0b, cssHex: '#f59e0b' },
  { label: 'D', name: 'Kontainer D', gateAngleY: 0.65, endX: 7.5, endZ: -6.5, colorHex: 0xa855f7, cssHex: '#a855f7' }
] as const;

export function stepConveyorSorter(
  sortedCount: number,
  alarmsTriggered: number,
  selectedGateIndex: number,
  answerIndex: number,
  targetSorted = 5,
  maxAlarms = 3
): {
  sortedCount: number;
  alarmsTriggered: number;
  passedStamp: boolean;
  gateAngleY: number;
  victory: boolean;
  defeat: boolean;
} {
  const clampedGate = Math.max(0, Math.min(3, selectedGateIndex));
  const gateAngleY = CONVEYOR_CHUTE_SPECS[clampedGate].gateAngleY;
  const passedStamp = clampedGate === answerIndex;
  if (passedStamp) {
    const nextSorted = sortedCount + 1;
    return {
      sortedCount: nextSorted,
      alarmsTriggered,
      passedStamp: true,
      gateAngleY,
      victory: nextSorted >= targetSorted,
      defeat: false
    };
  }
  const nextAlarms = alarmsTriggered + 1;
  return {
    sortedCount,
    alarmsTriggered: nextAlarms,
    passedStamp: false,
    gateAngleY,
    victory: false,
    defeat: nextAlarms >= maxAlarms
  };
}

// Game #18: Tebak Bangun & Bayangan (3D Prism & Laser Caster) — 4 Crystal Monuments
export const PRISM_MONUMENT_SPECS = [
  { label: 'A', name: 'Monumen Kubus A', angleY: Math.PI * 0.75, x: -9.5, z: -7.5, shape: 'cube', colorHex: 0x38bdf8, cssHex: '#38bdf8' },
  { label: 'B', name: 'Monumen Limas B', angleY: -Math.PI * 0.75, x: 9.5, z: -7.5, shape: 'cone', colorHex: 0xa855f7, cssHex: '#a855f7' },
  { label: 'C', name: 'Monumen Silinder C', angleY: Math.PI * 0.25, x: -9.5, z: 5.5, shape: 'cylinder', colorHex: 0x10b981, cssHex: '#10b981' },
  { label: 'D', name: 'Monumen Ikosahedron D', angleY: -Math.PI * 0.25, x: 9.5, z: 5.5, shape: 'icosahedron', colorHex: 0xf59e0b, cssHex: '#f59e0b' }
] as const;

export function stepPrismLaserCast(
  portalsOpened: number,
  shieldEnergy: number,
  aimedMonumentIndex: number,
  answerIndex: number,
  targetPortals = 5
): {
  portalsOpened: number;
  shieldEnergy: number;
  refractedRainbow: boolean;
  victory: boolean;
  defeat: boolean;
} {
  const refractedRainbow = aimedMonumentIndex === answerIndex;
  if (refractedRainbow) {
    const nextPortals = portalsOpened + 1;
    return {
      portalsOpened: nextPortals,
      shieldEnergy,
      refractedRainbow: true,
      victory: nextPortals >= targetPortals,
      defeat: false
    };
  }
  const nextShield = Math.max(0, shieldEnergy - 1);
  return {
    portalsOpened,
    shieldEnergy: nextShield,
    refractedRainbow: false,
    victory: false,
    defeat: nextShield <= 0
  };
}

// Game #19: Tarik Tambang Juara (3D Versus Tug-of-War) — Rope Position Math (-5.0 Left Win .. +5.0 Right Lose)
export function stepTugOfWarPassive(
  ropeOffset: number,
  dt: number,
  robotPullSpeed = 0.28,
  loseThresholdRight = 5.0
): {
  ropeOffset: number;
  defeat: boolean;
} {
  const nextOffset = Math.min(loseThresholdRight, ropeOffset + robotPullSpeed * dt);
  return {
    ropeOffset: nextOffset,
    defeat: nextOffset >= loseThresholdRight
  };
}

export function resolveTugOfWarAnswer(
  ropeOffset: number,
  isCorrect: boolean,
  winThresholdLeft = -5.0,
  loseThresholdRight = 5.0
): {
  ropeOffset: number;
  powerPull: boolean;
  victory: boolean;
  defeat: boolean;
} {
  if (isCorrect) {
    const nextOffset = Math.max(winThresholdLeft, ropeOffset - 1.45);
    return {
      ropeOffset: nextOffset,
      powerPull: true,
      victory: nextOffset <= winThresholdLeft,
      defeat: false
    };
  }
  const nextOffset = Math.min(loseThresholdRight, ropeOffset + 1.15);
  return {
    ropeOffset: nextOffset,
    powerPull: false,
    victory: false,
    defeat: nextOffset >= loseThresholdRight
  };
}

// Game #20: Arena Boss Akhir (Raksasa Ilmu 3D) — 4 Elemental Pillars, Boss HP & 3x Ultimate Beam
export const BOSS_PILLAR_SPECS = [
  { label: 'A', name: 'Pilar Surya A', x: -10.5, z: -2.0, colorHex: 0xf59e0b, cssHex: '#f59e0b' },
  { label: 'B', name: 'Pilar Samudra B', x: 10.5, z: -2.0, colorHex: 0x06b6d4, cssHex: '#06b6d4' },
  { label: 'C', name: 'Pilar Angkasa C', x: -7.5, z: 8.5, colorHex: 0xa855f7, cssHex: '#a855f7' },
  { label: 'D', name: 'Pilar Rimba D', x: 7.5, z: 8.5, colorHex: 0x10b981, cssHex: '#10b981' }
] as const;

export function stepBossBattleAttack(
  bossHp: number,
  playerHp: number,
  comboCount: number,
  chosenPillarIndex: number,
  answerIndex: number
): {
  bossHp: number;
  playerHp: number;
  comboCount: number;
  isCorrect: boolean;
  isUltimateBeam: boolean;
  damageDealt: number;
  victory: boolean;
  defeat: boolean;
} {
  const isCorrect = chosenPillarIndex === answerIndex;
  if (isCorrect) {
    const nextCombo = comboCount + 1;
    const isUltimateBeam = nextCombo >= 3;
    const damageDealt = isUltimateBeam ? 35 : 20;
    const nextBossHp = Math.max(0, bossHp - damageDealt);
    return {
      bossHp: nextBossHp,
      playerHp,
      comboCount: isUltimateBeam ? 0 : nextCombo,
      isCorrect: true,
      isUltimateBeam,
      damageDealt,
      victory: nextBossHp <= 0,
      defeat: false
    };
  }
  const nextPlayerHp = Math.max(0, playerHp - 1);
  return {
    bossHp,
    playerHp: nextPlayerHp,
    comboCount: 0,
    isCorrect: false,
    isUltimateBeam: false,
    damageDealt: 0,
    victory: false,
    defeat: nextPlayerHp <= 0
  };
}

