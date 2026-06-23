/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerCard, SpecialCard, BoosterCard, PlayerRole } from "./types";

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
    icon: "🚩",
    ability: {
      trigger: "CardPlayed",
      conditions: [{ type: "CardOwnerIsEnemy" }],
      actions: [{
        type: "CancelAction",
        target: "CurrentAttack",
        duration: "Instant"
      }]
    }
  },
  {
    name: "أمطار وغرق العشب",
    type: "special",
    effect: "wet_pitch",
    effectArabic: "عشب مبلل",
    description: "تبلل أرضية الملعب لتحد من سرعة هجمات أو متانة دفاعات خصمك بمقدار 4 نقاط.",
    icon: "🌧️",
    ability: {
      trigger: "CardPlayed",
      conditions: [{ type: "CardOwnerIsEnemy" }],
      actions: [{
        type: "RemoveStat",
        stat: "attack",
        value: 4,
        target: "CurrentAttack",
        duration: "Instant"
      }]
    }
  },
  {
    name: "مرتدة قاتلة",
    type: "special",
    effect: "counter_attack",
    effectArabic: "هجمة مرتدة",
    description: "استغل الاندفاع الهجومي للخصم لخلق هجمة معاكسة حاسمة تزيد هجوم المهاجم بـ +4 نقاط.",
    icon: "↗️",
    ability: {
      trigger: "CardPlayed",
      conditions: [{ type: "IsAttacker" }],
      actions: [{
        type: "AddStat",
        stat: "attack",
        value: 4,
        target: "CurrentAttack",
        duration: "Instant"
      }]
    }
  },
  {
    name: "الجمهور الحماسي",
    type: "special",
    effect: "fans",
    effectArabic: "دعم الجماهير",
    description: "الهتاف المزلزل بالمدرج يمنح أي لاعب مكشوف بملعبك طاقة هجومية ودفاعية إضافية +3 نقاط.",
    icon: "🥁",
    ability: {
      trigger: "CardPlayed",
      conditions: [],
      actions: [
        {
          type: "AddStat",
          stat: "attack",
          value: 3,
          target: "Allies",
          duration: "Instant"
        },
        {
          type: "AddStat",
          stat: "defense",
          value: 3,
          target: "Allies",
          duration: "Instant"
        }
      ]
    }
  },
  {
    name: "تكتيك ركن الباص",
    type: "special",
    effect: "park_the_bus",
    effectArabic: "ركن الباص",
    description: "تنظيم دفاعي معقد خلف الكرة يغلق المنافذ بالكامل ليعطي المدافعين المعنيين زيادة دفاعية +6 نقاط.",
    icon: "🚌",
    ability: {
      trigger: "CardPlayed",
      conditions: [{ type: "IsDefender" }],
      actions: [{
        type: "AddStat",
        stat: "defense",
        value: 6,
        target: "CurrentDefense",
        duration: "Instant"
      }]
    }
  },
  {
    name: "طرد مباشر (حمراء)",
    type: "special",
    effect: "red_card",
    effectArabic: "كارت أحمر",
    description: "حكم المباراة يتدخل! قم باستبعاد أي كارت لاعب لخصمك (مكشوف أو مقلوب) خارج الملعب تماماً حتى نهاية المباراة.",
    icon: "🟥",
    ability: {
      trigger: "CardPlayed",
      conditions: [],
      actions: [{
        type: "DestroyCard",
        target: "SelectedEnemy",
        duration: "Instant"
      }]
    }
  },
  {
    name: "طاقة كأس العالم",
    type: "special",
    effect: "world_cup",
    effectArabic: "روح المونديال",
    description: "شحن معنويات الفريق يتيح لك فوراً سحب كارتين إضافيين (من أي مجموعة تناسب تكتيكاتك).",
    icon: "🏆",
    ability: {
      trigger: "CardPlayed",
      conditions: [],
      actions: [{
        type: "DrawCard",
        value: 2,
        target: "Self",
        duration: "Instant"
      }]
    }
  }
];

// Booster booster cards drawn on attack to add surprise value to the shot!
export const INITIAL_BOOSTER_CARDS: Omit<BoosterCard, "id">[] = [
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

/**
 * Generates two completely disjoint decks from the same card pool.
 * Each physical card from the pool appears in at most ONE of the two decks.
 * Cards removed from the field (burned/replaced/expired) return to a shared
 * discard pile so they can be reshuffled back when decks run low.
 *
 * Strategy:
 * - Shuffle the pool once
 * - Split the first half to playerDeck and second half to aiDeck
 * - If pool is small, cycle through but track which original card IDs are used per side
 */
export function generateUniqueDecks(
  pool: PlayerCard[],
  legendRatio: number
): { playerDeck: PlayerCard[]; aiDeck: PlayerCard[] } {
  if (!pool || !Array.isArray(pool) || pool.length === 0) {
    return { playerDeck: [], aiDeck: [] };
  }

  // Deduplicate pool by name to prevent player duplicates across the game
  const seenNames = new Set<string>();
  const allCards: PlayerCard[] = [];
  pool.forEach((card) => {
    if (card && card.name) {
      const normalizedName = card.name.trim().toLowerCase();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        allCards.push(card);
      }
    }
  });

  // 1. Filter warmup pool (non-legendary player cards)
  let warmupPool: PlayerCard[] = [];
  try {
    warmupPool = allCards.filter(card => card && (card as any).rarity !== 'legendary' && !card.isLegend && !(card as any).is_legend && card.type === 'player');
  } catch (e) {
    console.error("Warmup pool filtering failed in client:", e);
  }

  if (!warmupPool || warmupPool.length === 0) {
    warmupPool = allCards.filter(card => card && card.type === 'player');
  }
  if (!warmupPool || warmupPool.length === 0) {
    warmupPool = allCards.filter(Boolean);
  }

  // Shuffle warmup pool
  const shuffledWarmup = [...warmupPool].sort(() => Math.random() - 0.5);

  // Extract warmup cards safely
  const hostWarmup: PlayerCard[] = [];
  const oppWarmup: PlayerCard[] = [];
  
  const targetWarmupCount = Math.min(5, Math.floor(shuffledWarmup.length / 2));
  for (let i = 0; i < targetWarmupCount; i++) {
    if (shuffledWarmup.length > 0) {
      const c = shuffledWarmup.pop();
      if (c) hostWarmup.push(c);
    }
    if (shuffledWarmup.length > 0) {
      const c = shuffledWarmup.pop();
      if (c) oppWarmup.push(c);
    }
  }

  // Remaining pool of cards
  const selectedWarmupIds = new Set<string>();
  hostWarmup.forEach(c => { if (c) selectedWarmupIds.add(c.id); });
  oppWarmup.forEach(c => { if (c) selectedWarmupIds.add(c.id); });

  const mainPool = allCards.filter(card => card && !selectedWarmupIds.has(card.id));

  // Split the main pool using the legend ratio
  const legendCards = mainPool.filter(c => c.isLegend || (c as any).is_legend || (c as any).rarity === 'legendary').sort(() => Math.random() - 0.5);
  const normalCards = mainPool.filter(c => !c.isLegend && !(c as any).is_legend && (c as any).rarity !== 'legendary').sort(() => Math.random() - 0.5);

  const targetSizePerDeck = Math.max(15, Math.floor(mainPool.length / 2));
  const numLegendsPerDeck = Math.min(
    Math.floor(legendCards.length / 2),
    Math.max(0, Math.round((legendRatio / 100) * targetSizePerDeck))
  );
  const numNormalsPerDeck = Math.max(0, targetSizePerDeck - numLegendsPerDeck);

  const hostMain: PlayerCard[] = [];
  const oppMain: PlayerCard[] = [];

  // Assign legends alternately
  const legendPool = [...legendCards];
  for (let i = 0; i < legendPool.length; i++) {
    const card = legendPool[i];
    if (hostMain.filter(c => c.isLegend).length < numLegendsPerDeck) {
      hostMain.push(card);
    } else if (oppMain.filter(c => c.isLegend).length < numLegendsPerDeck) {
      oppMain.push(card);
    }
  }

  // Fill remaining legend slots
  let legendRemainder = legendPool.slice(numLegendsPerDeck * 2);
  legendRemainder.forEach((card, i) => {
    if (i % 2 === 0 && hostMain.filter(c => c.isLegend).length < numLegendsPerDeck + 2) {
      hostMain.push(card);
    } else if (oppMain.filter(c => c.isLegend).length < numLegendsPerDeck + 2) {
      oppMain.push(card);
    }
  });

  // Assign normals
  const normalPool = [...normalCards];
  const halfNormals = Math.floor(normalPool.length / 2);
  for (let i = 0; i < normalPool.length; i++) {
    const card = normalPool[i];
    if (i < halfNormals && hostMain.filter(c => !c.isLegend).length < numNormalsPerDeck) {
      hostMain.push(card);
    } else if (i >= halfNormals && oppMain.filter(c => !c.isLegend).length < numNormalsPerDeck) {
      oppMain.push(card);
    } else {
      if (hostMain.filter(c => !c.isLegend).length <= oppMain.filter(c => !c.isLegend).length) {
        hostMain.push(card);
      } else {
        oppMain.push(card);
      }
    }
  }

  const hostShuffledMain = hostMain.filter(Boolean).sort(() => Math.random() - 0.5);
  const oppShuffledMain = oppMain.filter(Boolean).sort(() => Math.random() - 0.5);

  const finalHostDeck = [...hostWarmup.filter(Boolean), ...hostShuffledMain];
  const finalOppDeck = [...oppWarmup.filter(Boolean), ...oppShuffledMain];

  return {
    playerDeck: finalHostDeck.map((c, idx) => ({ ...c, id: `p_c_${idx}_${Math.random().toString(36).substr(2, 6)}` })),
    aiDeck: finalOppDeck.map((c, idx) => ({ ...c, id: `o_c_${idx}_${Math.random().toString(36).substr(2, 6)}` }))
  };
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

// Helper to map special card abilities from effect if missing
export function mapSpecialCardAbility(card: any): any {
  if (card.ability) {
    if (typeof card.ability === "string") {
      try {
        return JSON.parse(card.ability);
      } catch {
        return card.ability;
      }
    }
    return card.ability;
  }
  switch (card.effect) {
    case "offside":
      return {
        trigger: "CardPlayed",
        conditions: [{ type: "CardOwnerIsEnemy" }],
        actions: [{ type: "CancelAction", target: "CurrentAttack", duration: "Instant" }]
      };
    case "wet_pitch":
      return {
        trigger: "CardPlayed",
        conditions: [{ type: "CardOwnerIsEnemy" }],
        actions: [{ type: "RemoveStat", stat: "attack", value: 4, target: "CurrentAttack", duration: "Instant" }]
      };
    case "counter_attack":
      return {
        trigger: "CardPlayed",
        conditions: [{ type: "IsAttacker" }],
        actions: [{ type: "AddStat", stat: "attack", value: 4, target: "CurrentAttack", duration: "Instant" }]
      };
    case "fans":
      return {
        trigger: "CardPlayed",
        conditions: [],
        actions: [
          { type: "AddStat", stat: "attack", value: 3, target: "Allies", duration: "Instant" },
          { type: "AddStat", stat: "defense", value: 3, target: "Allies", duration: "Instant" }
        ]
      };
    case "park_the_bus":
      return {
        trigger: "CardPlayed",
        conditions: [{ type: "IsDefender" }],
        actions: [{ type: "AddStat", stat: "defense", value: 6, target: "CurrentDefense", duration: "Instant" }]
      };
    case "red_card":
      return {
        trigger: "CardPlayed",
        conditions: [],
        actions: [{ type: "DestroyCard", target: "SelectedEnemy", duration: "Instant" }]
      };
    case "world_cup":
      return {
        trigger: "CardPlayed",
        conditions: [],
        actions: [{ type: "DrawCard", value: 2, target: "Self", duration: "Instant" }]
      };
    default:
      return undefined;
  }
}

// Helper to fully initialize and shuffle standard special decks
export function generateSpecialDeck(): SpecialCard[] {
  let pool = [...INITIAL_SPECIAL_CARDS];
  try {
    const raw = localStorage.getItem("mortada_admin_special_cards");
    if (raw) {
      const customSpecials = JSON.parse(raw);
      if (Array.isArray(customSpecials) && customSpecials.length > 0) {
        const formatted = customSpecials.map((c: any) => ({
          name: c.name,
          type: "special" as const,
          effect: c.effect || "custom",
          effectArabic: c.effectArabic || c.effect_arabic || "",
          description: c.description || "",
          icon: c.icon || "🃏",
          imageUrl: c.image_url || c.imageUrl || "",
          ability: c.ability,
        }));
        pool = [...formatted, ...pool];
      }
    }
  } catch (e) {
    // ignore
  }

  // Multiply counts to make sure we don't run dry easily
  const duplicated: Omit<SpecialCard, "id">[] = [];
  const repetitions = pool.length > 5 ? 2 : 3;
  for (let i = 0; i < repetitions; i++) {
    duplicated.push(...pool);
  }
  return duplicated.map((card, idx) => ({
    ...card,
    id: `spec_${idx}_${Math.random().toString(36).substr(2, 9)}`,
    ability: mapSpecialCardAbility(card)
  } as SpecialCard)).sort(() => Math.random() - 0.5);
}

// Build special deck from a pool of SpecialCard objects (used for admin packages)
export function generateSpecialDeckFromPool(pool: SpecialCard[]): SpecialCard[] {
  let finalPool = [...pool];
  if (finalPool.length === 0) {
    try {
      const raw = localStorage.getItem("mortada_admin_special_cards");
      if (raw) {
        const customSpecials = JSON.parse(raw);
        if (Array.isArray(customSpecials) && customSpecials.length > 0) {
          finalPool = customSpecials.map((c: any, idx: number) => ({
            id: `admin_spec_local_${c.id || idx}`,
            name: c.name,
            type: "special" as const,
            effect: c.effect || "custom",
            effectArabic: c.effectArabic || c.effect_arabic || "",
            description: c.description || "",
            icon: c.icon || "🃏",
            imageUrl: c.image_url || c.imageUrl || "",
            ability: c.ability,
          }));
        }
      }
    } catch {}
  }
  const duplicated: SpecialCard[] = [];
  const targetSize = 25;
  const repeatCount = finalPool.length > 0 ? Math.max(1, Math.ceil(targetSize / finalPool.length)) : 1;
  for (let i = 0; i < repeatCount; i++) {
    duplicated.push(...finalPool);
  }
  return duplicated.map((card, idx) => ({
    ...card,
    id: `spec_${idx}_${Math.random().toString(36).substr(2, 9)}`,
    ability: mapSpecialCardAbility(card)
  } as SpecialCard)).sort(() => Math.random() - 0.5);
}


// Helper to fully initialize and shuffle Booster decks
export function generateBoosterDeck(maxBonusValue: number = 10): BoosterCard[] {
  const scaledCards = INITIAL_BOOSTER_CARDS.map(c => {
    let val = c.value;
    if (c.value > 0) {
      val = Math.max(1, Math.round((c.value / 10) * maxBonusValue));
    }
    return { ...c, value: val };
  });
  const duplicated: Omit<BoosterCard, "id">[] = [];
  for (let i = 0; i < 4; i++) {
    duplicated.push(...scaledCards);
  }
  return duplicated.map((card, idx) => ({
    ...card,
    id: `booster_${idx}_${Math.random().toString(36).substr(2, 9)}`
  } as BoosterCard)).sort(() => Math.random() - 0.5);
}

// Generates disjoint decks for host/player and guest/AI from the admin or hardcoded card pool
export function generateUniquePlayerDecks(legendRatio: number = 30): { playerDeck: PlayerCard[]; aiDeck: PlayerCard[] } {
  let pool: PlayerCard[] = [];
  try {
    const raw = localStorage.getItem("mortada_admin_cards");
    if (raw) {
      const adminCardsRaw = JSON.parse(raw);
      if (Array.isArray(adminCardsRaw) && adminCardsRaw.length > 0) {
        const ROLE_LABELS_MAP: Record<string, string> = {
          attacker: "رأس حربة", midfielder: "خط وسط",
          defender: "مدافع", goalkeeper: "حارس مرمى",
        };
        const LEGEND_ROLE_MAP: Record<string, string> = {
          attacker: "أسطورة هجوم", midfielder: "أسطورة خط وسط",
          defender: "أسطورة دفاع", goalkeeper: "أسطورة حراسة مرمى",
        };
        pool = adminCardsRaw.map((c: any, idx: number) => ({
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
      }
    }
  } catch {}
  
  if (pool.length === 0) {
    // Fallback to hardcoded pool if admin pool empty
    pool = INITIAL_PLAYER_CARDS.map((card, idx) => ({
      ...card,
      id: `play_${idx}_${Math.random().toString(36).substr(2, 9)}`,
      type: "player" as const
    } as PlayerCard));
  }

  return generateUniqueDecks(pool, legendRatio);
}

