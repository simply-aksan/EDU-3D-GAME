export type BiomeId = 'kota_ilmu' | 'samudra' | 'angkasa' | 'rimba' | 'nusantara';

export type CostumeUniformId =
  | 'sd'
  | 'smp'
  | 'sma'
  | 'pramuka'
  | 'batik'
  | 'astronot'
  | 'ksatria'
  | 'ninja_siber';

export type AccessoryId =
  | 'topi_sekolah'
  | 'topi_pramuka'
  | 'blangkon'
  | 'kacamata'
  | 'jubah_juara'
  | 'tas_ransel'
  | 'mahkota_emas'
  | 'helm_antariksa'
  | 'visor_holo';

export type AuraId =
  | 'none'
  | 'aura_api'
  | 'aura_es'
  | 'jejak_bintang'
  | 'aura_petir';

export type PetId =
  | 'none'
  | 'garuda_mini'
  | 'kucing_pintar'
  | 'drone_sains'
  | 'naga_nusantara';

export type PropWeaponId =
  | 'none'
  | 'tongkat_sains'
  | 'pedang_prisma'
  | 'perisai_nusantara'
  | 'buku_holo';

export type ThemeColorId =
  | 'klasik'
  | 'emas'
  | 'zamrud'
  | 'siber'
  | 'koral';

export type PlayableGameId =
  | 'jelajah_dunia'
  | 'lari_kilat'
  | 'jatuh_bangun'
  | 'detektif_kota'
  | 'pasar_nusantara'
  | 'jembatan_juara'
  | 'pertahanan_kastil'
  | 'balap_roket'
  | 'arsitek_menara'
  | 'labirin_minotaur'
  | 'panahan_katapel'
  | 'sirkuit_logika'
  | 'selam_samudra'
  | 'koki_kimia'
  | 'ekspedisi_pinisi'
  | 'penjaga_gawang'
  | 'pabrik_sortir'
  | 'tebak_bangun'
  | 'tarik_tambang'
  | 'arena_boss';

export interface QuestionItem {
  id: string;
  subject: string;
  q: string;
  options: [string, string, string, string];
  answerIndex: number;
  explanation: string;
}

export interface QuestionPack {
  id: string;
  title: string;
  subject: string;
  grade: string;
  author?: string;
  youtubeUrl?: string;
  materialSummary?: string;
  teacherWhatsapp?: string;
  questions: QuestionItem[];
}

export const SCHOOL_GRADE_OPTIONS = [
  'SD (Kelas 1-3)',
  'SD (Kelas 4-6)',
  'SMP (Kelas 7-9)',
  'SMA/SMK (Kelas 10-12)',
  'SD / SMP / SMA'
] as const;

export const SUBJECT_PRESET_OPTIONS = [
  'Matematika',
  'Sains',
  'IPS & Nusantara',
  'Bahasa',
  'Informatika',
  'Semua Mata Pelajaran'
] as const;

export interface PlayerProfile {
  name: string;
  xp: number;
  level: number;
  coins: number;
  uniform: CostumeUniformId;
  unlockedUniforms: CostumeUniformId[];
  accessories: AccessoryId[];
  unlockedAccessories: AccessoryId[];
  aura?: AuraId;
  unlockedAuras?: AuraId[];
  pet?: PetId;
  unlockedPets?: PetId[];
  propWeapon?: PropWeaponId;
  unlockedProps?: PropWeaponId[];
  themeColor?: ThemeColorId;
  unlockedThemes?: ThemeColorId[];
  collectedBooks: string[];
  highScores: Record<string, number>;
}

export interface BiomeConfig {
  id: BiomeId;
  name: string;
  subtitle: string;
  skyColor: number;
  fogColor: number;
  groundColor: number;
  roadColor: number;
  accentColor: string;
  description: string;
}

export interface MiniGameSlot {
  slot: number;
  id: string;
  engineId: PlayableGameId;
  title: string;
  category: string;
  description: string;
  controlsHint: string;
  isFeaturedSix: boolean;
  accentHex: string;
}

export const BIOMES: BiomeConfig[] = [
  {
    id: 'kota_ilmu',
    name: 'Kota Ilmu',
    subtitle: 'Metropolis Sains & Teknologi',
    skyColor: 0x1e3a5f,
    fogColor: 0x1e3a5f,
    groundColor: 0x2d4c3e,
    roadColor: 0x1e293b,
    accentColor: '#f59e0b',
    description: 'Jalan raya sibuk, 5 gedung mata pelajaran, air mancur kota, mobil & bus sekolah, serta NPC warga.'
  },
  {
    id: 'samudra',
    name: 'Samudra Biru',
    subtitle: 'Eksplorasi Bawah Laut & Terumbu Karang',
    skyColor: 0x082f49,
    fogColor: 0x0c4a6e,
    groundColor: 0x0f766e,
    roadColor: 0x155e75,
    accentColor: '#06b6d4',
    description: 'Dunia bawah laut dengan terumbu karang bercahaya, kapal karam kuno, dan istana kerang mutiara.'
  },
  {
    id: 'angkasa',
    name: 'Stasiun Angkasa',
    subtitle: 'Koloni Bulan & Sabuk Asteroid',
    skyColor: 0x090d16,
    fogColor: 0x0f172a,
    groundColor: 0x334155,
    roadColor: 0x1e293b,
    accentColor: '#8b5cf6',
    description: 'Kubah koloni bulan, roket peluncur, cincin stasiun orbital, dan sabuk asteroid melayang.'
  },
  {
    id: 'rimba',
    name: 'Rimba Tropis',
    subtitle: 'Hutan Hujan & Gua Kapur Endemik',
    skyColor: 0x14532d,
    fogColor: 0x166534,
    groundColor: 0x15803d,
    roadColor: 0x3f2e21,
    accentColor: '#10b981',
    description: 'Pepohonan raksasa, air terjun bertingkat, gua kristal kapur, dan satwa liar Nusantara.'
  },
  {
    id: 'nusantara',
    name: 'Kepulauan Nusantara',
    subtitle: 'Pelayaran Kapal Pinisi & Candi',
    skyColor: 0x312e81,
    fogColor: 0x3730a3,
    groundColor: 0x0369a1,
    roadColor: 0x78350f,
    accentColor: '#f97316',
    description: 'Gugusan pulau zamrud khatulistiwa, Kapal Pinisi berlayar megah, dan menara candi klasik.'
  }
];

export interface WardrobeUniformItem {
  id: CostumeUniformId;
  name: string;
  cost: number;
  minLevel?: number;
  minStars?: number;
  shirtColor: number;
  bottomColor: number;
  tieColor: number;
  badgeLabel: string;
}

export interface WardrobeAccessoryItem {
  id: AccessoryId;
  name: string;
  cost: number;
  minLevel?: number;
  minStars?: number;
  slot: 'head' | 'face' | 'back';
  badgeLabel: string;
}

export interface ShopAuraItem {
  id: AuraId;
  name: string;
  cost: number;
  minLevel?: number;
  minStars?: number;
  colorHex: string;
  secondaryHex: string;
  icon: string;
}

export interface ShopPetItem {
  id: PetId;
  name: string;
  cost: number;
  minLevel?: number;
  minStars?: number;
  primaryHex: string;
  accentHex: string;
  icon: string;
}

export interface ShopPropWeaponItem {
  id: PropWeaponId;
  name: string;
  cost: number;
  minLevel?: number;
  minStars?: number;
  colorHex: string;
  icon: string;
}

export interface ShopThemeColorItem {
  id: ThemeColorId;
  name: string;
  cost: number;
  minLevel?: number;
  hairHex: string;
  skinHex: string;
  trimHex: string;
}

export const UNIFORM_ITEMS: WardrobeUniformItem[] = [
  {
    id: 'sd',
    name: 'Seragam SD',
    cost: 0,
    shirtColor: 0xf8fafc,
    bottomColor: 0xb91c1c,
    tieColor: 0xdc2626,
    badgeLabel: 'Gratis'
  },
  {
    id: 'smp',
    name: 'Seragam SMP',
    cost: 50,
    shirtColor: 0xf8fafc,
    bottomColor: 0x1d4ed8,
    tieColor: 0x1e40af,
    badgeLabel: '🪙 50'
  },
  {
    id: 'sma',
    name: 'Seragam SMA',
    cost: 80,
    shirtColor: 0xf8fafc,
    bottomColor: 0x64748b,
    tieColor: 0x475569,
    badgeLabel: '🪙 80'
  },
  {
    id: 'pramuka',
    name: 'Pramuka Lengkap',
    cost: 100,
    shirtColor: 0xa16207,
    bottomColor: 0x713f12,
    tieColor: 0xdc2626,
    badgeLabel: '🪙 100'
  },
  {
    id: 'batik',
    name: 'Batik Emas',
    cost: 150,
    shirtColor: 0xd97706,
    bottomColor: 0x1e293b,
    tieColor: 0xfef08a,
    badgeLabel: '🪙 150'
  },
  {
    id: 'astronot',
    name: 'Kosmonot Sains',
    cost: 220,
    minLevel: 2,
    shirtColor: 0x38bdf8,
    bottomColor: 0x0284c7,
    tieColor: 0xf59e0b,
    badgeLabel: '🪙 220 · ★Lv.2'
  },
  {
    id: 'ksatria',
    name: 'Zirah Ksatria Nusantara',
    cost: 280,
    minLevel: 3,
    shirtColor: 0xf59e0b,
    bottomColor: 0x78350f,
    tieColor: 0xef4444,
    badgeLabel: '🪙 280 · ★Lv.3'
  },
  {
    id: 'ninja_siber',
    name: 'Setelan Ninja Siber',
    cost: 340,
    minStars: 3,
    shirtColor: 0x18181b,
    bottomColor: 0x09090b,
    tieColor: 0x10b981,
    badgeLabel: '🪙 340 · 3★'
  }
];

export const ACCESSORY_ITEMS: WardrobeAccessoryItem[] = [
  { id: 'topi_sekolah', name: 'Topi Sekolah', cost: 0, slot: 'head', badgeLabel: 'Gratis' },
  { id: 'tas_ransel', name: 'Tas Ransel', cost: 0, slot: 'back', badgeLabel: 'Gratis' },
  { id: 'kacamata', name: 'Kacamata Sains', cost: 60, slot: 'face', badgeLabel: '🪙 60' },
  { id: 'topi_pramuka', name: 'Baret Pramuka', cost: 90, slot: 'head', badgeLabel: '🪙 90' },
  { id: 'blangkon', name: 'Blangkon Batik', cost: 140, slot: 'head', badgeLabel: '🪙 140' },
  { id: 'jubah_juara', name: 'Jubah Sang Juara', cost: 180, minLevel: 2, slot: 'back', badgeLabel: '🪙 180 · ★Lv.2' },
  { id: 'mahkota_emas', name: 'Mahkota Raja Ilmu', cost: 240, minLevel: 3, slot: 'head', badgeLabel: '🪙 240 · ★Lv.3' },
  { id: 'helm_antariksa', name: 'Helm Kubah Antariksa', cost: 260, minStars: 2, slot: 'head', badgeLabel: '🪙 260 · 2★' },
  { id: 'visor_holo', name: 'Visor Laser Hologram', cost: 200, minStars: 2, slot: 'face', badgeLabel: '🪙 200 · 2★' }
];

export const AURA_ITEMS: ShopAuraItem[] = [
  { id: 'none', name: 'Tanpa Aura', cost: 0, colorHex: '#71717a', secondaryHex: '#52525b', icon: '○' },
  { id: 'aura_api', name: 'Aura Api Emas', cost: 120, colorHex: '#f59e0b', secondaryHex: '#ef4444', icon: '🔥' },
  { id: 'aura_es', name: 'Aura Kristal Es', cost: 150, colorHex: '#38bdf8', secondaryHex: '#bae6fd', icon: '❄' },
  { id: 'jejak_bintang', name: 'Jejak Bintang Kosmik', cost: 200, minLevel: 2, colorHex: '#a855f7', secondaryHex: '#fde047', icon: '✦' },
  { id: 'aura_petir', name: 'Aura Petir Siber', cost: 260, minStars: 3, colorHex: '#10b981', secondaryHex: '#34d399', icon: '⚡' }
];

export const PET_ITEMS: ShopPetItem[] = [
  { id: 'none', name: 'Tanpa Pendamping', cost: 0, primaryHex: '#71717a', accentHex: '#52525b', icon: '○' },
  { id: 'kucing_pintar', name: 'Kucing Oren Pintar', cost: 140, primaryHex: '#f97316', accentHex: '#fef08a', icon: '🐱' },
  { id: 'drone_sains', name: 'Drone Holo Sains', cost: 190, minLevel: 2, primaryHex: '#38bdf8', accentHex: '#10b981', icon: '🛸' },
  { id: 'garuda_mini', name: 'Garuda Emas Mini', cost: 250, minLevel: 3, primaryHex: '#eab308', accentHex: '#dc2626', icon: '🦅' },
  { id: 'naga_nusantara', name: 'Naga Zamrud Kecil', cost: 320, minStars: 3, primaryHex: '#10b981', accentHex: '#fde047', icon: '🐉' }
];

export const PROP_WEAPON_ITEMS: ShopPropWeaponItem[] = [
  { id: 'none', name: 'Tangan Kosong', cost: 0, colorHex: '#71717a', icon: '○' },
  { id: 'buku_holo', name: 'Kitab Hologram', cost: 90, colorHex: '#38bdf8', icon: '📖' },
  { id: 'tongkat_sains', name: 'Tongkat Kristal Sains', cost: 160, minLevel: 2, colorHex: '#a855f7', icon: '🪄' },
  { id: 'perisai_nusantara', name: 'Perisai Emas Garuda', cost: 210, minLevel: 2, colorHex: '#eab308', icon: '🛡' },
  { id: 'pedang_prisma', name: 'Pedang Cahaya Prisma', cost: 290, minStars: 3, colorHex: '#10b981', icon: '⚔' }
];

export const THEME_COLOR_ITEMS: ShopThemeColorItem[] = [
  { id: 'klasik', name: 'Klasik Nusantara', cost: 0, hairHex: '#18181b', skinHex: '#f4c29f', trimHex: '#ffffff' },
  { id: 'emas', name: 'Surya Keemasan', cost: 70, hairHex: '#92400e', skinHex: '#fcd34d', trimHex: '#fef08a' },
  { id: 'zamrud', name: 'Zamrud Rimba', cost: 90, hairHex: '#064e3b', skinHex: '#f4c29f', trimHex: '#34d399' },
  { id: 'siber', name: 'Siber Perak', cost: 120, minLevel: 2, hairHex: '#e2e8f0', skinHex: '#f1f5f9', trimHex: '#38bdf8' },
  { id: 'koral', name: 'Koral Samudra', cost: 140, minLevel: 2, hairHex: '#881337', skinHex: '#fbcfe8', trimHex: '#fb7185' }
];

export const MINI_GAME_REGISTRY: MiniGameSlot[] = [
  {
    slot: 1,
    id: 'jelajah_dunia',
    engineId: 'jelajah_dunia',
    title: 'Jelajah Dunia',
    category: 'Open-World Hub',
    description: 'Kelilingi 5 dunia 3D, masuki Gedung Mapel untuk kuis combo, koleksi Buku Ilmu, dan bantu NPC warga.',
    controlsHint: 'WASD / Panah Bergerak · Spasi Lompat · Klik Gedung / NPC',
    isFeaturedSix: true,
    accentHex: '#f59e0b'
  },
  {
    slot: 2,
    id: 'lari_kilat',
    engineId: 'lari_kilat',
    title: 'Lari Kilat',
    category: '4-Lane 3D Runner',
    description: 'Lari cepat di 4 lajur, lompati rintangan, ambil magnet & hoverboard, dan terobos Gerbang Jawaban A/B/C/D sebelum ditangkap Angsa Raksasa!',
    controlsHint: 'A/D atau Kiri/Kanan Pindah Lajur · Spasi Lompat',
    isFeaturedSix: true,
    accentHex: '#06b6d4'
  },
  {
    slot: 3,
    id: 'jatuh_bangun',
    engineId: 'jatuh_bangun',
    title: 'Jatuh Bangun',
    category: '3D Tower Survival',
    description: 'Menara heksagonal 4 lantai. Jawab benar untuk melesat naik lantai, jawab salah lantai runtuh! Rebut Mahkota di puncak.',
    controlsHint: 'Pilih Panel Jawaban A/B/C/D · WASD Geser Karakter',
    isFeaturedSix: true,
    accentHex: '#ec4899'
  },
  {
    slot: 4,
    id: 'detektif_kota',
    engineId: 'detektif_kota',
    title: 'Detektif Kota Ilmu',
    category: '3D Mystery Investigation',
    description: 'Kunjungi 4 TKP di kota, periksa petunjuk & kesaksian saksi, lalu pecahkan soal analisis untuk membuka bukti kunci.',
    controlsHint: 'WASD Jalan ke TKP 1-4 atau Klik TKP · Analisis Bukti',
    isFeaturedSix: true,
    accentHex: '#8b5cf6'
  },
  {
    slot: 5,
    id: 'pasar_nusantara',
    engineId: 'pasar_nusantara',
    title: 'Pasar Nusantara',
    category: '3D Shopkeeper & Math Sim',
    description: 'Jaga warung 3D! Hitung total belanja, kembalian uang, diskon, timbangan berat, dan pecahan kue untuk antrean pembeli.',
    controlsHint: 'Pilih Nominal Jawaban Tepat · Layani 5 Pembeli',
    isFeaturedSix: true,
    accentHex: '#10b981'
  },
  {
    slot: 6,
    id: 'jembatan_juara',
    engineId: 'jembatan_juara',
    title: 'Jembatan Juara',
    category: '3D Island Glass Bridge',
    description: 'Seberangi gugusan pulau terapung melalui 6 baris panel kaca A/B/C/D. Pilih jawaban benar agar kaca kokoh hingga garis Finish!',
    controlsHint: 'Klik atau Tekan 1-4 (A/B/C/D) Melangkah ke Panel Kaca',
    isFeaturedSix: true,
    accentHex: '#f97316'
  },
  {
    slot: 7,
    id: 'pertahanan_kastil',
    engineId: 'pertahanan_kastil',
    title: 'Pertahanan Kastil (Arsena Sains)',
    category: '3D Tower Defense',
    description: 'Benteng 3D di sisi kiri diserbu monster dari jalur kanan! Setiap jawaban benar menembakkan meriam partikel ke monster terdekat.',
    controlsHint: 'Pilih Jawaban A/B/C/D Tembak Meriam Partikel',
    isFeaturedSix: true,
    accentHex: '#38bdf8'
  },
  {
    slot: 8,
    id: 'balap_roket',
    engineId: 'balap_roket',
    title: 'Balap Roket Galaksi',
    category: '3D Space Flight',
    description: 'Kendalikan roket antariksa dengan kursor/joystick melewati Cincin Jawaban A/B/C/D yang melayang di orbit galaksi.',
    controlsHint: 'Gerakkan Kursor / Joystick · Pilih Cincin A/B/C/D',
    isFeaturedSix: true,
    accentHex: '#6366f1'
  },
  {
    slot: 9,
    id: 'arsitek_menara',
    engineId: 'arsitek_menara',
    title: 'Arsitek Menara',
    category: '3D Block Stacker',
    description: 'Derek konstruksi 3D menjatuhkan lantai gedung dengan presisi saat jawaban benar; jawaban salah membuat balok miring dan mengurangi stabilitas.',
    controlsHint: 'Jawab Soal untuk Kalibrasi Derek Lantai Presisi',
    isFeaturedSix: true,
    accentHex: '#fbbf24'
  },
  {
    slot: 10,
    id: 'labirin_minotaur',
    engineId: 'labirin_minotaur',
    title: 'Labirin Minotaur',
    category: '3D Procedural Maze',
    description: 'Labirin batu 3D dengan kamera top-down angled. Pintu gerbang di setiap persimpangan hanya terbuka jika soal terjawab benar!',
    controlsHint: 'Jawab Benar untuk Membuka 4 Gerbang Persimpangan Labirin',
    isFeaturedSix: true,
    accentHex: '#14b8a6'
  },
  {
    slot: 11,
    id: 'panahan_katapel',
    engineId: 'panahan_katapel',
    title: 'Panahan Katapel Fisika',
    category: '3D Parabolic Slingshot',
    description: 'Bidik katapel 3D dengan lintasan kurva parabola menuju 4 papan target jawaban (A/B/C/D) di kejauhan.',
    controlsHint: 'Arahkan Lintasan Parabola · Tembak Papan Target A/B/C/D',
    isFeaturedSix: true,
    accentHex: '#f43f5e'
  },
  {
    slot: 12,
    id: 'sirkuit_logika',
    engineId: 'sirkuit_logika',
    title: 'Sirkuit Logika (Robot Coder 3D)',
    category: '3D Isometric Grid Puzzle',
    description: 'Program antrean perintah Robot 3D (Maju, Belok Kiri/Kanan, Lompat Laser) di grid siber 6x6 menuju Stasiun Baterai A/B/C/D.',
    controlsHint: 'Susun Perintah Maju/Belok/Lompat · Klik JALANKAN PROGRAM',
    isFeaturedSix: true,
    accentHex: '#38bdf8'
  },
  {
    slot: 13,
    id: 'selam_samudra',
    engineId: 'selam_samudra',
    title: 'Selam Samudra (Submarine Sonar 3D)',
    category: '3D Underwater Sonar',
    description: 'Kemudikan Kapal Selam Kuning berlampu sorot menembus palung laut untuk membuka Peti Harta Karun A/B/C/D yang dijaga ubur-ubur listrik.',
    controlsHint: 'WASD / Joystick Kemudi Kapal Selam · Sinar & Buka Peti A/B/C/D',
    isFeaturedSix: true,
    accentHex: '#06b6d4'
  },
  {
    slot: 14,
    id: 'koki_kimia',
    engineId: 'koki_kimia',
    title: 'Koki Kimia (Lab Eksperimen 3D)',
    category: '3D First-Person Lab',
    description: 'Klik Tabung Reaksi 3D berwarna (A: Merah, B: Biru, C: Hijau, D: Ungu) untuk menuangkan reagen ke Labu Erlenmeyer Utama di atas pembakar Bunsen.',
    controlsHint: 'Klik Tabung Reaksi 3D A/B/C/D · Sintesis Kristal Emas',
    isFeaturedSix: true,
    accentHex: '#a855f7'
  },
  {
    slot: 15,
    id: 'ekspedisi_pinisi',
    engineId: 'ekspedisi_pinisi',
    title: 'Ekspedisi Pinisi (Peta Nusantara 3D)',
    category: '3D Naval Navigation',
    description: 'Arahkan Kapal Pinisi 7 layar melintasi gelombang samudra 3D dinamis dan pusaran air menuju Dermaga Pulau Budaya A/B/C/D.',
    controlsHint: 'WASD / Kemudi Haluan Pinisi · Berlabuh di Dermaga Pulau A/B/C/D',
    isFeaturedSix: true,
    accentHex: '#f97316'
  },
  {
    slot: 16,
    id: 'penjaga_gawang',
    engineId: 'penjaga_gawang',
    title: 'Penjaga Gawang Pintar (3D Goalie Reflex)',
    category: '3D Stadium Penalty Showdown',
    description: 'Kunci sudut lompatan Kiper 3D (A: Kiri Atas, B: Kanan Atas, C: Kiri Bawah, D: Kanan Bawah) untuk menepis tendangan melengkung Robot Striker!',
    controlsHint: 'Pilih Sudut Gawang A/B/C/D Sebelum Waktu Habis · Tepis Bola',
    isFeaturedSix: true,
    accentHex: '#22c55e'
  },
  {
    slot: 17,
    id: 'pabrik_sortir',
    engineId: 'pabrik_sortir',
    title: 'Pabrik Sortir (3D Conveyor Belt Sorter)',
    category: '3D Industrial Automation',
    description: 'Putar lengan Switch Gate 3D untuk mengarahkan Kotak Kargo Bercahaya di atas conveyor belt ke Jalur Kontainer A/B/C/D yang tepat.',
    controlsHint: 'Klik / Tekan A/B/C/D Putar Gerbang Sortir · Cap LULUS Hijau',
    isFeaturedSix: true,
    accentHex: '#0ea5e9'
  },
  {
    slot: 18,
    id: 'tebak_bangun',
    engineId: 'tebak_bangun',
    title: 'Tebak Bangun & Bayangan (3D Prism & Laser)',
    category: '3D Spatial & Optical Puzzle',
    description: 'Putar Meriam Prisma 360 derajat di kuil kristal dan tembakkan Sinar Ilmu ke Monumen Kristal A/B/C/D dengan siluet bangun ruang.',
    controlsHint: 'Putar Prisma [A/D] atau Pilih Monumen · Klik TEMBAK SINAR ILMU',
    isFeaturedSix: true,
    accentHex: '#a855f7'
  },
  {
    slot: 19,
    id: 'tarik_tambang',
    engineId: 'tarik_tambang',
    title: 'Tarik Tambang Juara (3D Versus Tug-of-War)',
    category: '3D Competitive Tug-of-War',
    description: 'Tarik tambang 3v3 di atas jembatan kolam lava melawan Tim Robot! Jawab cepat untuk memicu Power Pull kilat biru hingga lawan tercebur.',
    controlsHint: 'Jawab Cepat A/B/C/D untuk Power Pull · Tarik Pita Merah ke Kiri',
    isFeaturedSix: true,
    accentHex: '#f43f5e'
  },
  {
    slot: 20,
    id: 'arena_boss',
    engineId: 'arena_boss',
    title: 'Arena Boss Akhir (Raksasa Ilmu 3D)',
    category: '3D Action Quiz Boss Battle',
    description: 'Hindari lingkaran meteor merah Golem Raksasa Ilmu 3D di arena koloseum dan aktifkan 4 Pilar Elemen A/B/C/D untuk menembakkan Orb Energi & Ultimate Beam!',
    controlsHint: 'WASD Hindari Zona Merah · Aktifkan Pilar A/B/C/D Serang Inti Boss',
    isFeaturedSix: true,
    accentHex: '#eab308'
  }
];

export const DEFAULT_QUESTION_PACK: QuestionPack = {
  id: 'eduverse-default-36',
  title: 'Paket Soal Nasional Lintas Mapel (36 Soal)',
  subject: 'Semua Mata Pelajaran',
  grade: 'SD / SMP / SMA',
  author: 'Tim Kurikulum Eduverse 3D',
  youtubeUrl: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
  materialSummary:
    '1. Matematika: Diskon (%) = (Persentase / 100) × Harga Awal. Luas Persegi = s × s, Volume Balok = p × l × t (1 liter = 1 dm³ = 1.000 cm³).\n2. Sains / IPA: Fotosintesis terjadi di kloroplas daun menghasilkan glukosa & oksigen. Mitokondria adalah pusat respirasi sel penghasil ATP.\n3. IPS & Nusantara: Garis Wallace memisahkan fauna tipe Asiatis (barat) dan tipe Peralihan (tengah). Kapal Pinisi berasal dari Sulawesi Selatan.\n4. Bahasa & Informatika: Paragraf deduktif memiliki gagasan utama di awal paragraf. Bilangan biner berbasis 2 (0 dan 1).',
  teacherWhatsapp: '',
  questions: [
    // MATEMATIKA (1 - 7)
    {
      id: 'm1',
      subject: 'Matematika',
      q: 'Sebuah toko buku memberikan diskon 25% untuk ensiklopedia seharga Rp120.000. Berapa harga yang harus dibayar?',
      options: ['Rp85.000', 'Rp90.000', 'Rp95.000', 'Rp100.000'],
      answerIndex: 1,
      explanation: 'Diskon 25% dari Rp120.000 adalah Rp30.000. Maka harga bayar = Rp120.000 - Rp30.000 = Rp90.000.'
    },
    {
      id: 'm2',
      subject: 'Matematika',
      q: 'Keliling sebuah taman berbentuk persegi adalah 64 meter. Berapakah luas taman tersebut?',
      options: ['128 m²', '196 m²', '256 m²', '324 m²'],
      answerIndex: 2,
      explanation: 'Sisi persegi = 64 / 4 = 16 m. Luas persegi = 16 × 16 = 256 m².'
    },
    {
      id: 'm3',
      subject: 'Matematika',
      q: 'Hasil dari 3/4 + 2/5 dalam bentuk pecahan paling sederhana adalah...',
      options: ['5/9', '23/20', '19/20', '6/20'],
      answerIndex: 1,
      explanation: 'Samakan penyebut ke 20: (15/20) + (8/20) = 23/20.'
    },
    {
      id: 'm4',
      subject: 'Matematika',
      q: 'Sebuah bus sekolah melaju dengan kecepatan rata-rata 60 km/jam. Berapa jarak yang ditempuh dalam waktu 2,5 jam?',
      options: ['120 km', '135 km', '150 km', '180 km'],
      answerIndex: 2,
      explanation: 'Jarak = Kecepatan × Waktu = 60 km/jam × 2,5 jam = 150 km.'
    },
    {
      id: 'm5',
      subject: 'Matematika',
      q: 'Jika 3x + 7 = 28, maka nilai dari 2x + 5 adalah...',
      options: ['14', '19', '21', '25'],
      answerIndex: 1,
      explanation: '3x = 21 sehingga x = 7. Maka 2x + 5 = 2(7) + 5 = 19.'
    },
    {
      id: 'm6',
      subject: 'Matematika',
      q: 'Volume sebuah akuarium berbentuk balok dengan panjang 50 cm, lebar 30 cm, dan tinggi 40 cm adalah...',
      options: ['45 liter', '60 liter', '75 liter', '120 liter'],
      answerIndex: 1,
      explanation: 'Volume = 50 × 30 × 40 = 60.000 cm³ = 60 liter (dm³).'
    },
    {
      id: 'm7',
      subject: 'Matematika',
      q: 'Perbandingan kelereng Andi dan Budi adalah 3 : 5. Jika jumlah kelereng mereka 64 butir, berapa kelereng Budi?',
      options: ['24 butir', '32 butir', '40 butir', '45 butir'],
      answerIndex: 2,
      explanation: 'Total bagian = 3 + 5 = 8. Kelereng Budi = (5/8) × 64 = 40 butir.'
    },

    // SAINS (8 - 14)
    {
      id: 's1',
      subject: 'Sains',
      q: 'Proses tumbuhan hijau mengubah karbon dioksida dan air menjadi glukosa dan oksigen dengan bantuan cahaya matahari disebut...',
      options: ['Respirasi', 'Fotosintesis', 'Transpirasi', 'Fermentasi'],
      answerIndex: 1,
      explanation: 'Fotosintesis berlangsung di kloroplas daun menggunakan energi foton matahari.'
    },
    {
      id: 's2',
      subject: 'Sains',
      q: 'Planet di Tata Surya yang dikenal memiliki cincin paling mencolok dari bongkahan es dan debu adalah...',
      options: ['Jupiter', 'Saturnus', 'Uranus', 'Neptunus'],
      answerIndex: 1,
      explanation: 'Saturnus memiliki sistem cincin spektakuler yang sebagian besar terdiri atas partikel es air.'
    },
    {
      id: 's3',
      subject: 'Sains',
      q: 'Perubahan wujud benda dari gas langsung menjadi padat tanpa melalui wujud cair disebut...',
      options: ['Menyublim', 'Mengkristal (Deposisi)', 'Mengembun', 'Membeku'],
      answerIndex: 1,
      explanation: 'Mengkristal atau deposisi adalah perubahan wujud dari gas ke padat, contohnya pembentukan salju.'
    },
    {
      id: 's4',
      subject: 'Sains',
      q: 'Organel sel yang berfungsi sebagai pusat penghasil energi (ATP) melalui respirasi seluler adalah...',
      options: ['Ribosom', 'Lisosom', 'Mitokondria', 'Badan Golgi'],
      answerIndex: 2,
      explanation: 'Mitokondria dijuluki "The Powerhouse of the Cell" karena memproduksi ATP.'
    },
    {
      id: 's5',
      subject: 'Sains',
      q: 'Bunyi tidak dapat merambat melalui ruang hampa udara karena bunyi merupakan gelombang...',
      options: ['Elektromagnetik', 'Mekanik', 'Cahaya', 'Transversal murni'],
      answerIndex: 1,
      explanation: 'Gelombang mekanik membutuhkan medium partikel (padat, cair, atau gas) untuk merambat.'
    },
    {
      id: 's6',
      subject: 'Sains',
      q: 'Bagian mata manusia yang berfungsi mengatur banyak sedikitnya cahaya yang masuk ke mata adalah...',
      options: ['Retina', 'Kornea', 'Iris dan Pupil', 'Saraf Optik'],
      answerIndex: 2,
      explanation: 'Iris mengatur ukuran bukaan pupil sesuai intensitas cahaya di sekitar.'
    },
    {
      id: 's7',
      subject: 'Sains',
      q: 'Logam yang berwujud cair pada suhu ruang (sekitar 25°C) dan dulu sering dipakai pada termometer adalah...',
      options: ['Aluminium', 'Raksa (Merkuri)', 'Timbal', 'Tembaga'],
      answerIndex: 1,
      explanation: 'Raksa (Hg) memiliki titik beku -38,8°C sehingga tetap cair pada suhu kamar.'
    },

    // BAHASA INDONESIA & LITERASI (15 - 20)
    {
      id: 'b1',
      subject: 'Bahasa',
      q: 'Kalimat yang memiliki gagasan pokok di awal paragraf disebut paragraf...',
      options: ['Induktif', 'Deduktif', 'Campuran', 'Naratif'],
      answerIndex: 1,
      explanation: 'Paragraf deduktif menempatkan kalimat utama di awal paragraf lalu diikuti kalimat penjelas.'
    },
    {
      id: 'b2',
      subject: 'Bahasa',
      q: 'Penulisan kata baku yang tepat menurut Kamus Besar Bahasa Indonesia (KBBI) adalah...',
      options: ['Apotik, Aktifitas, Praktek', 'Apotek, Aktivitas, Praktik', 'Apotek, Aktifitas, Praktik', 'Apotik, Aktivitas, Praktek'],
      answerIndex: 1,
      explanation: 'Bentuk baku sesuai KBBI adalah Apotek, Aktivitas, dan Praktik.'
    },
    {
      id: 'b3',
      subject: 'Bahasa',
      q: 'Majas yang melukiskan benda mati seolah-olah memiliki sifat atau perilaku seperti manusia disebut...',
      options: ['Hiperbola', 'Metafora', 'Personifikasi', 'Litotes'],
      answerIndex: 2,
      explanation: 'Personifikasi memberikan sifat insani pada benda tak bernyawa, misalnya "ombak berlarian ke tepi pantai".'
    },
    {
      id: 'b4',
      subject: 'Bahasa',
      q: 'Antonim (lawan kata) dari kata "konservatif" dalam konteks pemikiran adalah...',
      options: ['Tradisional', 'Progresif', 'Pasif', 'Statis'],
      answerIndex: 1,
      explanation: 'Konservatif berarti kolot/mempertahankan keadaan lama, lawan katanya progresif (maju/terbuka pembaruan).'
    },
    {
      id: 'b5',
      subject: 'Bahasa',
      q: 'Bagian teks eksplanasi yang berisi urutan sebab-akibat terjadinya suatu fenomena alam disebut...',
      options: ['Pernyataan Umum', 'Deretan Penjelas', 'Interpretasi', 'Orientasi'],
      answerIndex: 1,
      explanation: 'Struktur teks eksplanasi terdiri dari Pernyataan Umum, Deretan Penjelas (sebab-akibat), dan Interpretasi.'
    },
    {
      id: 'b6',
      subject: 'Bahasa',
      q: 'Peribahasa "Bagai air di daun talas" memiliki makna seseorang yang...',
      options: ['Sangat dermawan kepada sesama', 'Tidak memiliki pendirian yang tetap', 'Selalu tenang menghadapi masalah', 'Rajin menabung sejak kecil'],
      answerIndex: 1,
      explanation: 'Air di atas daun talas mudah bergulir ke sana kemari, melambangkan sifat plin-plan atau tidak tetap pendirian.'
    },

    // SEJARAH & NUSANTARA (21 - 28)
    {
      id: 'h1',
      subject: 'Sejarah',
      q: 'Kapal layar tradisional kebanggaan suku Bugis-Makassar dari Sulawesi Selatan yang diakui UNESCO sebagai Warisan Budaya Takbenda adalah...',
      options: ['Kapal Jung', 'Kapal Pinisi', 'Kapal Cadik', 'Kapal Lancang Kuning'],
      answerIndex: 1,
      explanation: 'Seni pembuatan Kapal Pinisi dari Sulawesi Selatan ditetapkan UNESCO pada tahun 2017.'
    },
    {
      id: 'h2',
      subject: 'Sejarah',
      q: 'Naskah Proklamasi Kemerdekaan Indonesia pada malam 16 Agustus 1945 dirumuskan di kediaman...',
      options: ['Laksamana Tadashi Maeda', 'Achmad Soebardjo', 'Sayuti Melik', 'Dr. Radjiman Wedyodiningrat'],
      answerIndex: 0,
      explanation: 'Perumusan teks proklamasi dilakukan di rumah Laksamana Muda Tadashi Maeda di Jalan Imam Bonjol No. 1.'
    },
    {
      id: 'h3',
      subject: 'Sejarah',
      q: 'Kerajaan maritim bercorak Buddha terbesar di Nusantara yang berpusat di Palembang, Sumatera Selatan adalah...',
      options: ['Majapahit', 'Sriwijaya', 'Kutai Martadipura', 'Tarumanagara'],
      answerIndex: 1,
      explanation: 'Kerajaan Sriwijaya merupakan pusat perdagangan maritim dan pembelajaran agama Buddha di Asia Tenggara.'
    },
    {
      id: 'h4',
      subject: 'Sejarah',
      q: 'Sumpah Palapa yang bertekad menyatukan wilayah kepulauan Nusantara diucapkan oleh Mahapatih...',
      options: ['Hayam Wuruk', 'Gajah Mada', 'Ken Arok', 'Raden Wijaya'],
      answerIndex: 1,
      explanation: 'Mahapatih Gajah Mada mengucapkan Sumpah Palapa saat diangkat menjadi Patih Amangkubhumi Majapahit.'
    },
    {
      id: 'h5',
      subject: 'Sejarah',
      q: 'Alat musik tradisional asal Nusa Tenggara Timur yang terbuat dari daun lontar dan dimainkan dengan cara dipetik adalah...',
      options: ['Angklung', 'Sasando', 'Tifa', 'Kolintang'],
      answerIndex: 1,
      explanation: 'Sasando berasal dari Pulau Rote, NTT, menggunakan tabung bambu dan resonator daun lontar.'
    },
    {
      id: 'h6',
      subject: 'Sejarah',
      q: 'Garis khayal biogeografi yang memisahkan tipe fauna Indonesia bagian Barat (Asiatis) dan bagian Tengah (Peralihan) adalah...',
      options: ['Garis Weber', 'Garis Wallace', 'Garis Khatulistiwa', 'Garis Lydekker'],
      answerIndex: 1,
      explanation: 'Garis Wallace membentang dari Selat Lombok hingga Selat Makassar, memisahkan fauna Asiatis dan Wallacea.'
    },
    {
      id: 'h7',
      subject: 'Sejarah',
      q: 'Tokoh pahlawan pendidikan nasional pendiri Taman Siswa yang memiliki semboyan "Tut Wuri Handayani" adalah...',
      options: ['K.H. Ahmad Dahlan', 'Ki Hadjar Dewantara', 'R.A. Kartini', 'Douwes Dekker'],
      answerIndex: 1,
      explanation: 'Ki Hadjar Dewantara (Soewardi Soerjaningrat) mendirikan Perguruan Taman Siswa pada 3 Juli 1922.'
    },
    {
      id: 'h8',
      subject: 'Sejarah',
      q: 'Candi Borobudur di Jawa Tengah dibangun pada masa pemerintahan Dinasti...',
      options: ['Sanjaya', 'Syailendra', 'Isyana', 'Girindra'],
      answerIndex: 1,
      explanation: 'Candi Borobudur dibangun pada abad ke-8 hingga ke-9 Masehi pada masa kejayaan Dinasti Syailendra.'
    },

    // CODING & LOGIKA KOMPUTASI (29 - 36)
    {
      id: 'c1',
      subject: 'Coding',
      q: 'Dalam pemrograman, struktur data yang bekerja dengan prinsip LIFO (Last In, First Out) seperti tumpukan piring adalah...',
      options: ['Queue (Antrean)', 'Stack (Tumpukan)', 'Graph', 'Linked List'],
      answerIndex: 1,
      explanation: 'Stack menggunakan prinsip LIFO: elemen yang terakhir dimasukkan adalah yang pertama dikeluarkan (pop).'
    },
    {
      id: 'c2',
      subject: 'Coding',
      q: 'Berapakah nilai desimal dari bilangan biner 1011₂?',
      options: ['9', '10', '11', '13'],
      answerIndex: 2,
      explanation: '1011₂ = (1 × 8) + (0 × 4) + (1 × 2) + (1 × 1) = 8 + 0 + 2 + 1 = 11.'
    },
    {
      id: 'c3',
      subject: 'Coding',
      q: 'Manakah operator logika yang hanya menghasilkan nilai TRUE jika KEDUA pernyataan bernilai TRUE?',
      options: ['OR (||)', 'AND (&&)', 'NOT (!)', 'XOR (^)'],
      answerIndex: 1,
      explanation: 'Operator konjungsi AND (&&) mewajibkan semua operan bernilai benar agar hasilnya benar.'
    },
    {
      id: 'c4',
      subject: 'Coding',
      q: 'Jika variabel x = 4, lalu dijalankan perulangan sebanyak 3 kali yang setiap langkahnya menambahkan 3 ke x, berapakah nilai akhir x?',
      options: ['10', '12', '13', '16'],
      answerIndex: 2,
      explanation: 'Nilai awal 4 + (3 × 3) = 4 + 9 = 13.'
    },
    {
      id: 'c5',
      subject: 'Coding',
      q: 'Dalam pengembangan web modern, bahasa standar yang digunakan untuk mengatur tata letak dan tampilan visual halaman adalah...',
      options: ['HTML', 'CSS', 'SQL', 'Python'],
      answerIndex: 1,
      explanation: 'CSS (Cascading Style Sheets) mengatur warna, tipografi, grid, dan animasi elemen HTML.'
    },
    {
      id: 'c6',
      subject: 'Coding',
      q: 'Algoritma pencarian yang membagi dua data terurut secara berulang untuk menemukan target dengan cepat disebut...',
      options: ['Linear Search', 'Binary Search', 'Bubble Sort', 'Depth-First Search'],
      answerIndex: 1,
      explanation: 'Binary Search memiliki kompleksitas O(log n) dengan membelah rentang pencarian pada array terurut.'
    },
    {
      id: 'c7',
      subject: 'Coding',
      q: 'Pada array berindeks nol `const buah = ["Apel", "Jeruk", "Mangga", "Pisang"]`, apakah nilai dari `buah[2]`?',
      options: ['Apel', 'Jeruk', 'Mangga', 'Pisang'],
      answerIndex: 2,
      explanation: 'Karena indeks dimulai dari 0 (0: Apel, 1: Jeruk, 2: Mangga), maka buah[2] adalah "Mangga".'
    },
    {
      id: 'c8',
      subject: 'Coding',
      q: 'Langkah sistematis dan logis yang disusun secara berurutan untuk menyelesaikan suatu masalah komputasi disebut...',
      options: ['Kompilator', 'Algoritma', 'Variabel', 'Basis Data'],
      answerIndex: 1,
      explanation: 'Algoritma adalah urutan langkah terstruktur dan terbatas untuk menyelesaikan masalah.'
    }
  ]
};

export interface DetectiveCase {
  id: string;
  title: string;
  summary: string;
  tkpList: {
    id: number;
    name: string;
    witness: string;
    testimony: string;
    clueFound: string;
  }[];
  culpritOptions: [string, string, string, string];
  culpritIndex: number;
  deductionExplanation: string;
}

export const DETECTIVE_CASES: DetectiveCase[] = [
  {
    id: 'case-1',
    title: 'Misteri Hilangnya Mahkota Kristal Museum Sains',
    summary: 'Mahkota Kristal optik di gedung pusat Kota Ilmu lenyap tepat pukul 19:00 saat pemadaman listrik singkat. Periksa 4 TKP dan analisis petunjuk ilmiahnya!',
    tkpList: [
      {
        id: 1,
        name: 'TKP 1: Ruang Pamer Utama',
        witness: 'Penjaga Budi',
        testimony: 'Pelaku meninggalkan jejak serbuk logam yang tertarik kuat oleh magnet permanen di dekat etalase kaca.',
        clueFound: 'Bukti #1: Serbuk Kobalt/Nikel Feromagnetik dari bengkel robotik.'
      },
      {
        id: 2,
        name: 'TKP 2: Panel Listrik Sektor B',
        witness: 'Teknisi Sari',
        testimony: 'Sekring diputus menggunakan kode biner 4-bit yang bernilai desimal 13 pada terminal akses.',
        clueFound: 'Bukti #2: Log akses kartu ber-ID 1101₂ (Nomor Teknis 13).'
      },
      {
        id: 3,
        name: 'TKP 3: Taman Air Mancur Kota',
        witness: 'Pedagang Buku Raka',
        testimony: 'Seseorang berlari ke arah timur sambil membawa tas kedap air berwarna biru tua.',
        clueFound: 'Bukti #3: Kuitansi pembelian bahan kimia laboratorium pH basa.'
      },
      {
        id: 4,
        name: 'TKP 4: Dermaga Kanal Sains',
        witness: 'Nakhoda Pinisi Arif',
        testimony: 'Pelaku menyembunyikan kotak di gudang nomor 13 yang terkunci rapat.',
        clueFound: 'Bukti #4: Kartu akses atas nama Profesor Viktor (Teknisi Lab #13).'
      }
    ],
    culpritOptions: [
      'Asisten Arkeolog Dina (ID #07)',
      'Profesor Viktor (Teknisi Robotik ID #13)',
      'Kurator Lukisan Hendra (ID #04)',
      'Petugas Taman Bayu (ID #09)'
    ],
    culpritIndex: 1,
    deductionExplanation: 'Serbuk feromagnetik bengkel robotik dan kode akses biner 1101₂ (13) mengarah langsung pada Profesor Viktor (ID #13).'
  }
];
