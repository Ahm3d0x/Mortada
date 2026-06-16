/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerCard, SpecialCard, PontoCard, PlayerRole } from "./types";

// Famous Football Stars split into regular and legends
export const INITIAL_PLAYER_CARDS: Omit<PlayerCard, "id">[] = [];


// Special action tactical cards
export const INITIAL_SPECIAL_CARDS: Omit<SpecialCard, "id">[] = [
  {
    name: "تسلل مباغت",
    type: "special",
    effect: "offside",
    effectArabic: "تسلل",
    description: "يقع كارت هجوم الخصم بمصيدة التسلل ويلغي نقاط المهاجم الأقوى لديه تماماً لهذه الهجمة.",
    icon: "🚩"
  },
  {
    name: "أمطار وغرق العشب",
    type: "special",
    effect: "wet_pitch",
    effectArabic: "عشب مبلل",
    description: "تبلل أرضية الملعب لتحد من سرعة هجمات أو متانة دفاعات خصمك بمقدار 4 نقاط.",
    icon: "🌧️"
  },
  {
    name: "مرتدة قاتلة",
    type: "special",
    effect: "counter_attack",
    effectArabic: "هجمة مرتدة",
    description: "استغل الاندفاع الهجومي للخصم لخلق هجمة معاكسة حاسمة تزيد هجوم المهاجم بـ +4 نقاط.",
    icon: "↗️"
  },
  {
    name: "الجمهور الحماسي",
    type: "special",
    effect: "fans",
    effectArabic: "دعم الجماهير",
    description: "الهتاف المزلزل بالمدرج يمنح أي لاعب مكشوف بملعبك طاقة هجومية ودفاعية إضافية +3 نقاط.",
    icon: "🥁"
  },
  {
    name: "تكتيك ركن الباص",
    type: "special",
    effect: "park_the_bus",
    effectArabic: "ركن الباص",
    description: "تنظيم دفاعي معقد خلف الكرة يغلق المنافذ بالكامل ليعطي المدافعين المعنيين زيادة دفاعية +6 نقاط.",
    icon: "🚌"
  },
  {
    name: "طرد مباشر (حمراء)",
    type: "special",
    effect: "red_card",
    effectArabic: "كارت أحمر",
    description: "حكم المباراة يتدخل! قم باستبعاد أي كارت لاعب مكشوف لخصمك ومطرود من الملعب حتى نهاية المباراة.",
    icon: "🟥"
  },
  {
    name: "طاقة كأس العالم",
    type: "special",
    effect: "world_cup",
    effectArabic: "روح المونديال",
    description: "شحن معنويات الفريق يتيح لك فوراً سحب كارتين إضافيين (من أي مجموعة تناسب تكتيكاتك).",
    icon: "🏆"
  }
];

// Ponto booster cards drawn on attack to add surprise value to the shot!
export const INITIAL_PONTO_CARDS: Omit<PontoCard, "id">[] = [
  { value: 1, text: "تمريرة أرضية سريعة" },
  { value: 2, text: "عرضية ركنية متقنة" },
  { value: 3, text: "ركلة حرة على مشارف المنطقة" },
  { value: 4, text: "تسديدة مباغتة بقدم غير مفضلة" },
  { value: 5, text: "قذيفة صاروخية بعيدة المدى" },
  { value: 7, text: "اختراق منفرد استثنائي لخطوط الدفاع" },
  { value: 10, text: "ركلة جزاء بآخر دقيقة وسيناريو جنوني" },
  { value: 0, text: "تسديدة خارج الخشبات الثلاث ومصيدة دفاع" }
];

// Helper to fully initialize and shuffle standard player decks with custom legend appearance percentage (from 0 to 100)
// Now checks for admin-created packages first, falls back to hardcoded cards if none exist.
export function generatePlayerDeck(legendRatio: number = 30): PlayerCard[] {
  // Try to load admin-created cards first
  try {
    const raw = localStorage.getItem("mortada_admin_cards");
    if (raw) {
      const adminCardsRaw = JSON.parse(raw);
      if (Array.isArray(adminCardsRaw) && adminCardsRaw.length > 0) {
        // Convert admin cards to PlayerCard format
        const ROLE_LABELS_MAP: Record<string, string> = {
          attacker: "رأس حربة", midfielder: "خط وسط",
          defender: "مدافع", goalkeeper: "حارس مرمى",
        };
        const LEGEND_ROLE_MAP: Record<string, string> = {
          attacker: "أسطورة هجوم", midfielder: "أسطورة خط وسط",
          defender: "أسطورة دفاع", goalkeeper: "أسطورة حراسة مرمى",
        };
        const adminCards: PlayerCard[] = adminCardsRaw.map((c: any, idx: number) => ({
          id: `admin_${c.id || idx}_${Math.random().toString(36).substr(2, 6)}`,
          name: c.name,
          type: "player" as const,
          isLegend: !!c.isLegend,
          attack: c.attack ?? 5,
          defense: c.defense ?? 5,
          role: c.role || "midfielder",
          roleArabic: c.isLegend ? (LEGEND_ROLE_MAP[c.role] || "أسطورة") : (ROLE_LABELS_MAP[c.role] || "لاعب"),
          description: c.description || "",
          team: c.team || "",
          avatar: c.avatar || "⚽",
        }));
        return generateDeckFromPool(adminCards, legendRatio);
      }
    }
  } catch {
    // localStorage not available or parse error, use hardcoded fallback
  }
  
  // Fallback to hardcoded cards
  return generateDeckFromHardcoded(legendRatio);
}

// Build deck from a pool of PlayerCard objects (used for admin cards)
export function generateDeckFromPool(pool: PlayerCard[], legendRatio: number): PlayerCard[] {
  const normalCards = pool.filter(c => !c.isLegend);
  const legendCards = pool.filter(c => c.isLegend);
  
  const totalDeckSize = Math.max(35, pool.length);
  const numLegends = Math.min(legendCards.length, Math.max(0, Math.round((legendRatio / 100) * totalDeckSize)));
  const numNormals = Math.max(0, totalDeckSize - numLegends);
  
  const shuffledLegends = [...legendCards].sort(() => Math.random() - 0.5);
  const shuffledNormals = [...normalCards].sort(() => Math.random() - 0.5);
  
  const selected: PlayerCard[] = [];
  
  for (let i = 0; i < numLegends; i++) {
    if (shuffledLegends.length > 0) {
      const card = shuffledLegends[i % shuffledLegends.length];
      selected.push({ ...card, id: `adm_${i}_${Math.random().toString(36).substr(2, 9)}` });
    }
  }
  
  for (let i = 0; i < numNormals; i++) {
    if (shuffledNormals.length > 0) {
      const card = shuffledNormals[i % shuffledNormals.length];
      selected.push({ ...card, id: `adm_n${i}_${Math.random().toString(36).substr(2, 9)}` });
    }
  }
  
  return selected.sort(() => Math.random() - 0.5);
}

// Original hardcoded deck generation
function generateDeckFromHardcoded(legendRatio: number): PlayerCard[] {
  const normalCards = INITIAL_PLAYER_CARDS.filter(c => !c.isLegend);
  const legendCards = INITIAL_PLAYER_CARDS.filter(c => c.isLegend);
  
  // Total target deck size is 35 cards to keep matches balanced and rich
  const totalDeckSize = 35;
  const numLegends = Math.min(legendCards.length, Math.max(0, Math.round((legendRatio / 100) * totalDeckSize)));
  const numNormals = Math.max(0, totalDeckSize - numLegends);
  
  // Shuffle pools before selection
  const shuffledLegends = [...legendCards].sort(() => Math.random() - 0.5);
  const shuffledNormals = [...normalCards].sort(() => Math.random() - 0.5);
  
  const selectedLegends: Omit<PlayerCard, "id">[] = [];
  const selectedNormals: Omit<PlayerCard, "id">[] = [];
  
  for (let i = 0; i < numLegends; i++) {
    const card = shuffledLegends[i % shuffledLegends.length];
    selectedLegends.push(card);
  }
  
  for (let i = 0; i < numNormals; i++) {
    const card = shuffledNormals[i % shuffledNormals.length];
    selectedNormals.push(card);
  }
  
  const combined = [...selectedLegends, ...selectedNormals].sort(() => Math.random() - 0.5);
  
  return combined.map((card, idx) => ({
    ...card,
    id: `play_${idx}_${Math.random().toString(36).substr(2, 9)}`
  } as PlayerCard));
}

// Helper to fully initialize and shuffle standard special decks
export function generateSpecialDeck(): SpecialCard[] {
  // Multiply counts to make sure we don't run dry easily
  const duplicated: Omit<SpecialCard, "id">[] = [];
  for (let i = 0; i < 3; i++) {
    duplicated.push(...INITIAL_SPECIAL_CARDS);
  }
  return duplicated.map((card, idx) => ({
    ...card,
    id: `spec_${idx}_${Math.random().toString(36).substr(2, 9)}`
  } as SpecialCard)).sort(() => Math.random() - 0.5);
}

// Build special deck from a pool of SpecialCard objects (used for admin packages)
export function generateSpecialDeckFromPool(pool: SpecialCard[]): SpecialCard[] {
  const duplicated: SpecialCard[] = [];
  const targetSize = 25;
  const repeatCount = pool.length > 0 ? Math.max(1, Math.ceil(targetSize / pool.length)) : 1;
  for (let i = 0; i < repeatCount; i++) {
    duplicated.push(...pool);
  }
  return duplicated.map((card, idx) => ({
    ...card,
    id: `spec_${idx}_${Math.random().toString(36).substr(2, 9)}`
  } as SpecialCard)).sort(() => Math.random() - 0.5);
}

// Helper to fully initialize and shuffle Ponto decks 
export function generatePontoDeck(): PontoCard[] {
  const duplicated: Omit<PontoCard, "id">[] = [];
  for (let i = 0; i < 4; i++) {
    duplicated.push(...INITIAL_PONTO_CARDS);
  }
  return duplicated.map((card, idx) => ({
    ...card,
    id: `ponto_${idx}_${Math.random().toString(36).substr(2, 9)}`
  } as PontoCard)).sort(() => Math.random() - 0.5);
}
