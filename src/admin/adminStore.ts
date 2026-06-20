/**
 * Admin Store - Supabase Many-to-Many CRUD for packages, player cards, and tactical/special cards.
 * Requires active Supabase configuration (no local storage fallbacks).
 */

import {
  AdminPackage,
  AdminCard,
  AdminSpecialCard,
  PackageExport,
  ROLE_LABELS,
  LEGEND_ROLE_LABELS,
} from "./adminTypes";
import { PlayerCard, SpecialCard, CardAbility } from "../types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ─── Helpers ─────────────────────────────────────────────

function checkSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "Supabase configurations are missing. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
    );
  }
}

export function parseCardAbility(c: any): any {
  if (!c) return c;
  let finalDesc = c.description || "";
  let ability: CardAbility | undefined = undefined;
  try {
    if (c.description && c.description.trim().startsWith("{")) {
      const parsed = JSON.parse(c.description);
      finalDesc = parsed.text || "";
      ability = parsed.ability || undefined;
    }
  } catch (e) {
    // Not JSON
  }
  return { ...c, description: finalDesc, ability };
}

export function serializeCardAbility(cardData: any): any {
  if (!cardData) return cardData;
  const { ability, description, ...rest } = cardData;
  let dbDescription = description || "";
  if (ability) {
    dbDescription = JSON.stringify({ text: description, ability });
  }
  return { ...rest, description: dbDescription };
}

// ═══════════════════════════════════════════════════════════
// PACKAGE CRUD
// ═══════════════════════════════════════════════════════════

export async function getPackages(): Promise<AdminPackage[]> {
  checkSupabase();
  const { data, error } = await supabase!
    .from("packages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching packages:", error);
    return [];
  }
  return (data || []) as AdminPackage[];
}

export async function getPackageById(id: string): Promise<AdminPackage | null> {
  checkSupabase();
  const { data, error } = await supabase!
    .from("packages")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as AdminPackage;
}

export async function createPackage(
  data: { name: string; description: string; image: string; type: "player" | "special"; legend_percentage: number }
): Promise<AdminPackage> {
  checkSupabase();
  const { data: row, error } = await supabase!
    .from("packages")
    .insert([{
      name: data.name,
      description: data.description,
      image: data.image,
      type: data.type,
      legend_percentage: data.legend_percentage,
    }])
    .select()
    .single();
  if (error) {
    console.error("Error creating package:", error);
    throw error;
  }
  return row as AdminPackage;
}

export async function updatePackage(
  id: string,
  updates: { name?: string; description?: string; image?: string; legend_percentage?: number }
): Promise<AdminPackage | null> {
  checkSupabase();
  const { data, error } = await supabase!
    .from("packages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating package:", error);
    return null;
  }
  return data as AdminPackage;
}

export async function deletePackage(id: string): Promise<boolean> {
  checkSupabase();
  const { error } = await supabase!
    .from("packages")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting package:", error);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════
// CENTRAL CARD POOLS & MANY-TO-MANY CRUD APIs
// ═══════════════════════════════════════════════════════════

// Get all player cards in central pool
export async function getAllCentralCards(): Promise<AdminCard[]> {
  checkSupabase();
  const { data, error } = await supabase!
    .from("cards")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("Error fetching central cards:", error);
    return [];
  }
  return (data || []).map(parseCardAbility) as AdminCard[];
}

// Get all tactical cards in central pool
export async function getAllCentralSpecialCards(): Promise<AdminSpecialCard[]> {
  checkSupabase();
  const { data, error } = await supabase!
    .from("special_cards")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("Error fetching central special cards:", error);
    return [];
  }
  return (data || []).map(parseCardAbility) as AdminSpecialCard[];
}

// Get cards linked to a specific package
export async function getCardsByPackage(packageId: string): Promise<AdminCard[]> {
  checkSupabase();
  const { data, error } = await supabase!
    .from("package_cards")
    .select(`
      cards (
        id,
        name,
        attack,
        defense,
        role,
        role_arabic,
        is_legend,
        description,
        team,
        avatar,
        image_url,
        tags,
        created_at,
        updated_at
      )
    `)
    .eq("package_id", packageId);

  if (error) {
    console.error("Error fetching cards for package:", error);
    return [];
  }
  return (data || []).map((row: any) => parseCardAbility(row.cards)).filter(Boolean) as AdminCard[];
}

// Get special cards linked to a specific package
export async function getSpecialCardsByPackage(packageId: string): Promise<AdminSpecialCard[]> {
  checkSupabase();
  const { data, error } = await supabase!
    .from("package_special_cards")
    .select(`
      special_cards (
        id,
        name,
        effect,
        effect_arabic,
        description,
        icon,
        image_url,
        created_at,
        updated_at
      )
    `)
    .eq("package_id", packageId);

  if (error) {
    console.error("Error fetching special cards for package:", error);
    return [];
  }
  return (data || []).map((row: any) => parseCardAbility(row.special_cards)).filter(Boolean) as AdminSpecialCard[];
}

// Create player card and link it to package
export async function createCardInPackage(
  packageId: string,
  cardData: Omit<AdminCard, "id" | "created_at" | "updated_at">
): Promise<AdminCard> {
  checkSupabase();
  // 1. Insert in cards central pool
  const dbData = serializeCardAbility(cardData);
  const { data: card, error: cardError } = await supabase!
    .from("cards")
    .insert([dbData])
    .select()
    .single();

  if (cardError) {
    console.error("Error inserting card:", cardError);
    throw cardError;
  }

  // 2. Link in join table
  const { error: linkError } = await supabase!
    .from("package_cards")
    .insert([{ package_id: packageId, card_id: card.id }]);

  if (linkError) {
    console.error("Error linking card to package:", linkError);
    throw linkError;
  }

  return parseCardAbility(card) as AdminCard;
}

// Create special card and link it to package
export async function createSpecialCardInPackage(
  packageId: string,
  cardData: Omit<AdminSpecialCard, "id" | "created_at" | "updated_at">
): Promise<AdminSpecialCard> {
  checkSupabase();
  // 1. Insert in special_cards central pool
  const dbData = serializeCardAbility(cardData);
  const { data: card, error: cardError } = await supabase!
    .from("special_cards")
    .insert([dbData])
    .select()
    .single();

  if (cardError) {
    console.error("Error inserting special card:", cardError);
    throw cardError;
  }

  // 2. Link in join table
  const { error: linkError } = await supabase!
    .from("package_special_cards")
    .insert([{ package_id: packageId, special_card_id: card.id }]);

  if (linkError) {
    console.error("Error linking special card to package:", linkError);
    throw linkError;
  }

  return parseCardAbility(card) as AdminSpecialCard;
}

// Link existing card to player package
export async function linkCardToPackage(packageId: string, cardId: string): Promise<boolean> {
  checkSupabase();
  const { error } = await supabase!
    .from("package_cards")
    .insert([{ package_id: packageId, card_id: cardId }]);
  if (error) {
    console.error("Error linking card:", error);
    throw error;
  }
  return true;
}

// Unlink card from player package
export async function unlinkCardFromPackage(packageId: string, cardId: string): Promise<boolean> {
  checkSupabase();
  const { error } = await supabase!
    .from("package_cards")
    .delete()
    .eq("package_id", packageId)
    .eq("card_id", cardId);
  if (error) {
    console.error("Error unlinking card:", error);
    return false;
  }
  return true;
}

// Link existing special card to special package
export async function linkSpecialCardToPackage(packageId: string, specialCardId: string): Promise<boolean> {
  checkSupabase();
  const { error } = await supabase!
    .from("package_special_cards")
    .insert([{ package_id: packageId, special_card_id: specialCardId }]);
  if (error) {
    console.error("Error linking special card:", error);
    throw error;
  }
  return true;
}

// Unlink special card from special package
export async function unlinkSpecialCardFromPackage(packageId: string, specialCardId: string): Promise<boolean> {
  checkSupabase();
  const { error } = await supabase!
    .from("package_special_cards")
    .delete()
    .eq("package_id", packageId)
    .eq("special_card_id", specialCardId);
  if (error) {
    console.error("Error unlinking special card:", error);
    return false;
  }
  return true;
}

// Update card in central pool
export async function updateCard(
  id: string,
  updates: Partial<Omit<AdminCard, "id" | "created_at">>
): Promise<AdminCard | null> {
  checkSupabase();
  const dbUpdates = serializeCardAbility(updates);
  const { data, error } = await supabase!
    .from("cards")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating card:", error);
    return null;
  }
  return parseCardAbility(data) as AdminCard;
}

// Update special card in central pool
export async function updateSpecialCard(
  id: string,
  updates: Partial<Omit<AdminSpecialCard, "id" | "created_at">>
): Promise<AdminSpecialCard | null> {
  checkSupabase();
  const dbUpdates = serializeCardAbility(updates);
  const { data, error } = await supabase!
    .from("special_cards")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating special card:", error);
    return null;
  }
  return parseCardAbility(data) as AdminSpecialCard;
}

// Delete card completely from central pool (ON DELETE CASCADE unlinks it)
export async function deleteCard(id: string): Promise<boolean> {
  checkSupabase();
  const { error } = await supabase!
    .from("cards")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting card:", error);
    return false;
  }
  return true;
}

// Delete special card completely from central pool
export async function deleteSpecialCard(id: string): Promise<boolean> {
  checkSupabase();
  const { error } = await supabase!
    .from("special_cards")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting special card:", error);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════
// PACKAGE STATS
// ═══════════════════════════════════════════════════════════

export interface PackageStats {
  totalCards: number;
  legendsCount: number;
  normalCount: number;
  avgAttack: number;
  avgDefense: number;
  roleBreakdown: Record<string, number>;
}

export async function getPackageStats(packageId: string): Promise<PackageStats> {
  const cards = await getCardsByPackage(packageId);
  const legends = cards.filter((c) => c.is_legend);
  const totalAttack = cards.reduce((sum, c) => sum + c.attack, 0);
  const totalDefense = cards.reduce((sum, c) => sum + c.defense, 0);

  const roleBreakdown: Record<string, number> = {};
  cards.forEach((c) => {
    const label = c.is_legend
      ? LEGEND_ROLE_LABELS[c.role] || "أسطورة"
      : ROLE_LABELS[c.role] || "لاعب";
    roleBreakdown[label] = (roleBreakdown[label] || 0) + 1;
  });

  return {
    totalCards: cards.length,
    legendsCount: legends.length,
    normalCount: cards.length - legends.length,
    avgAttack: cards.length > 0 ? Math.round((totalAttack / cards.length) * 10) / 10 : 0,
    avgDefense: cards.length > 0 ? Math.round((totalDefense / cards.length) * 10) / 10 : 0,
    roleBreakdown,
  };
}

// ═══════════════════════════════════════════════════════════
// GAME INTEGRATION
// ═══════════════════════════════════════════════════════════

export function getMockPlayerCards(packageIds?: string[]): PlayerCard[] {
  const pkgs = packageIds && packageIds.length > 0 ? packageIds : ["pkg_egypt", "pkg_legends", "pkg_europe"];
  const list: PlayerCard[] = [];

  const ROLE_LABELS_MAP: Record<string, string> = {
    attacker: "رأس حربة", midfielder: "خط وسط",
    defender: "مدافع", goalkeeper: "حارس مرمى",
  };
  const LEGEND_ROLE_MAP: Record<string, string> = {
    attacker: "أسطورة هجوم", midfielder: "أسطورة خط وسط",
    defender: "أسطورة دفاع", goalkeeper: "أسطورة حراسة مرمى",
  };

  if (pkgs.includes("pkg_egypt")) {
    const egyptNames = [
      'M. El Shenawy', 'Ahmed Hegazi', 'Mohamed Salah', 'Mohamed Elneny', 'Trezeguet', 
      'Mostafa Mohamed', 'Omar Marmoush', 'Ahmed Sayed Zizo', 'Mohamed Magdy Afsha', 'Hamdi Fathi', 
      'Emam Ashour', 'Marwan Attia', 'Mohamed Abdelmonem', 'Yasser Ibrahim', 'Mohamed Hany', 
      'Omar Kamal', 'Ahmed Fatouh', 'M. Abou Gabal', 'Mostafa Shobeir', 'Ramy Rabia', 
      'Mohamed Sherif', 'Mahmoud Kahraba', 'Ahmed Hassan Koka', 'Mahmoud Shikabala', 'Abdallah Said', 
      'Tarek Hamed', 'Amr Elsolia', 'Ramadan Sobhi', 'Mostafa Fathi', 'Mohamed Ibrahim'
    ];

    egyptNames.forEach((name, i) => {
      const idx = i + 1;
      let role = "attacker";
      let roleArabic = "مهاجم سريع";
      let att = Math.floor(Math.random() * 5) + 10;
      let def = Math.floor(Math.random() * 4) + 3;
      let avatar = "⚡";
      let isLegend = false;

      if ([1, 18, 19].includes(idx)) {
        role = "goalkeeper";
        roleArabic = "حارس مرمى";
        att = Math.floor(Math.random() * 3) + 1;
        def = Math.floor(Math.random() * 4) + 11;
        avatar = "🧤";
      } else if ([2, 13, 14, 15, 16, 17, 20].includes(idx)) {
        role = "defender";
        roleArabic = "مدافع صلب";
        att = Math.floor(Math.random() * 4) + 2;
        def = Math.floor(Math.random() * 5) + 10;
        avatar = "🛡️";
      } else if ([4, 9, 10, 11, 12, 25, 26, 27].includes(idx)) {
        role = "midfielder";
        roleArabic = "لاعب وسط";
        att = Math.floor(Math.random() * 5) + 6;
        def = Math.floor(Math.random() * 5) + 7;
        avatar = "🏃";
      }

      if ([3, 5, 8, 11, 25].includes(idx)) {
        isLegend = true;
        att = 15;
        avatar = "👑";
        roleArabic = LEGEND_ROLE_MAP[role] || `أسطورة ${roleArabic}`;
      } else {
        roleArabic = ROLE_LABELS_MAP[role] || roleArabic;
      }

      list.push({
        id: `mock_egypt_${idx}`,
        name,
        type: "player",
        isLegend,
        attack: att,
        defense: def,
        role: role as any,
        roleArabic,
        description: "لاعب منتخب مصر الفراعنة للمباريات المحلية.",
        team: "مصر",
        avatar,
      });
    });
  }

  if (pkgs.includes("pkg_legends")) {
    const legendNames = [
      'Cristiano Ronaldo', 'Lionel Messi', 'Zinedine Zidane', 'Paolo Maldini', 'Gianluigi Buffon', 
      'Ronaldinho', 'Pele', 'Diego Maradona', 'Johan Cruyff', 'Ronaldo Nazario', 
      'Thierry Henry', 'David Beckham', 'Andrea Pirlo', 'Xavi Hernandez', 'Andres Iniesta', 
      'Steven Gerrard', 'Frank Lampard', 'Roberto Carlos', 'Carles Puyol', 'Alessandro Nesta', 
      'Fabio Cannavaro', 'Iker Casillas', 'Oliver Kahn', 'Zlatan Ibrahimovic', 'Wayne Rooney', 
      'Luis Figo', 'Kaka', 'Luka Modric', 'Karim Benzema', 'Neymar Jr'
    ];

    legendNames.forEach((name, i) => {
      const idx = i + 1;
      let role = "attacker";
      let roleArabic = "مهاجم أسطوري خارق";
      let att = 15;
      let def = Math.floor(Math.random() * 3) + 3;
      let avatar = "👑";

      if ([5, 22, 23].includes(idx)) {
        role = "goalkeeper";
        roleArabic = "أسطورة حراسة المرمى";
        att = 1;
        def = 15;
      } else if ([4, 18, 19, 20, 21].includes(idx)) {
        role = "defender";
        roleArabic = "أسطورة دفاعية صلبة";
        att = Math.floor(Math.random() * 3) + 3;
        def = 15;
      } else if ([3, 13, 14, 15, 16, 17, 28].includes(idx)) {
        role = "midfielder";
        roleArabic = "مايسترو خط الوسط";
        att = Math.floor(Math.random() * 3) + 12;
        def = Math.floor(Math.random() * 3) + 9;
      }

      list.push({
        id: `mock_legend_${idx}`,
        name,
        type: "player",
        isLegend: true,
        attack: att,
        defense: def,
        role: role as any,
        roleArabic,
        description: "من أعظم أساطير كرة القدم في التاريخ.",
        team: "الأساطير",
        avatar,
      });
    });
  }

  if (pkgs.includes("pkg_europe")) {
    const europeNames = [
      'Haaland', 'Mbappe', 'De Bruyne', 'Salah', 'Vinicius Jr', 
      'Bellingham', 'Kane', 'Rodri', 'Saka', 'Musiala', 
      'Wirtz', 'Van Dijk', 'Ruben Dias', 'Courtois', 'Alisson', 
      'Ter Stegen', 'Kimmich', 'Bernardo Silva', 'Bruno Fernandes', 'Griezmann', 
      'Lewandowski', 'Son Heung-min', 'Foden', 'Rice', 'Saliba', 
      'Alexander-Arnold', 'Robertson', 'Carvajal', 'Rudiger', 'Lamine Yamal'
    ];

    europeNames.forEach((name, i) => {
      const idx = i + 1;
      let role = "attacker";
      let roleArabic = "مهاجم سريع";
      let att = Math.floor(Math.random() * 5) + 10;
      let def = Math.floor(Math.random() * 4) + 3;
      let avatar = "⚽";
      let isLegend = false;

      if ([14, 15, 16].includes(idx)) {
        role = "goalkeeper";
        roleArabic = "حارس مرمى";
        att = Math.floor(Math.random() * 3) + 1;
        def = Math.floor(Math.random() * 4) + 11;
        avatar = "🧤";
      } else if ([12, 13, 25, 26, 27, 28, 29].includes(idx)) {
        role = "defender";
        roleArabic = "مدافع صلب";
        att = Math.floor(Math.random() * 4) + 2;
        def = Math.floor(Math.random() * 5) + 10;
        avatar = "🛡️";
      } else if ([3, 6, 8, 10, 11, 17, 18, 19, 24].includes(idx)) {
        role = "midfielder";
        roleArabic = "لاعب وسط";
        att = Math.floor(Math.random() * 5) + 6;
        def = Math.floor(Math.random() * 5) + 7;
        avatar = "🏃";
      }

      if ([1, 2, 3, 6].includes(idx)) { // Haaland, Mbappe, De Bruyne, Salah
        isLegend = true;
        att = 15;
        avatar = "👑";
        roleArabic = LEGEND_ROLE_MAP[role] || `أسطورة ${roleArabic}`;
      } else {
        roleArabic = ROLE_LABELS_MAP[role] || roleArabic;
      }

      list.push({
        id: `mock_europe_${idx}`,
        name,
        type: "player",
        isLegend,
        attack: att,
        defense: def,
        role: role as any,
        roleArabic,
        description: "أحد نجوم الصف الأول بالأندية الأوروبية الكبرى.",
        team: "أوروبا",
        avatar,
      });
    });
  }

  return list;
}

export function getMockSpecialCards(packageIds?: string[]): SpecialCard[] {
  const pkgs = packageIds && packageIds.length > 0 ? packageIds : ["pkg_tactics_classic", "pkg_tactics_modern"];
  const list: SpecialCard[] = [];

  if (pkgs.includes("pkg_tactics_classic")) {
    list.push(
      {
        id: "mock_spec_offside",
        name: "مصيدة التسلل 🚩",
        type: "special",
        effect: "offside",
        effectArabic: "مصيدة تسلل دفاعية",
        description: "تفعيل مصيدة التسلل لقطع هجمة الخصم المندفعة.",
        icon: "🚩",
      },
      {
        id: "mock_spec_bus",
        name: "ركن الحافلة 🚌",
        type: "special",
        effect: "park_the_bus",
        effectArabic: "تأمين دفاعي مكثف",
        description: "التراجع الكامل للدفاع وتأمين المرمى لمنع استقبال أهداف.",
        icon: "🚌",
      },
      {
        id: "mock_spec_fans",
        name: "هتاف الجماهير 🗣️",
        type: "special",
        effect: "fans",
        effectArabic: "حماس جماهيري كبير",
        description: "حماس الجماهير يزيد طاقة هجومك ودفاعك لدور كامل.",
        icon: "🗣️",
      }
    );
  }

  if (pkgs.includes("pkg_tactics_modern")) {
    list.push(
      {
        id: "mock_spec_red_card",
        name: "بطاقة حمراء 🟥",
        type: "special",
        effect: "red_card",
        effectArabic: "بطاقة حمراء طرد",
        description: "طرد لاعب من تشكيلة الخصم فوراً لتقليل قوته.",
        icon: "🟥",
      },
      {
        id: "mock_spec_counter",
        name: "المرتدة السريعة ⚡",
        type: "special",
        effect: "counter_attack",
        effectArabic: "مرتدة خاطفة هجومية",
        description: "شن هجوم مرتد سريع ومفاجئ يربك دفاعات الخصم.",
        icon: "⚡",
      },
      {
        id: "mock_spec_wet",
        name: "أرضية رطبة 🌧️",
        type: "special",
        effect: "wet_pitch",
        effectArabic: "تأثير المطر على الملعب",
        description: "الطقس الماطر يقلل سرعة ودفاع كلا الفريقين لدورين.",
        icon: "🌧️",
      }
    );
  }

  return list;
}

/**
 * Convert admin player cards into game-ready PlayerCard[] format.
 * Called by WelcomeMenu/App logic to load player packages.
 */
export async function getCardsForGame(packageIds?: string[]): Promise<PlayerCard[]> {
  if (!isSupabaseConfigured) {
    return getMockPlayerCards(packageIds);
  }
  checkSupabase();
  let query = supabase!.from("package_cards").select(`
    cards (
      id,
      name,
      attack,
      defense,
      role,
      role_arabic,
      is_legend,
      description,
      team,
      avatar,
      image_url,
      tags
    )
  `);

  if (packageIds && packageIds.length > 0) {
    query = query.in("package_id", packageIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching cards for game:", error);
    return [];
  }

  // Deduplicate
  const cardMap = new Map<string, any>();
  (data || []).forEach((row: any) => {
    if (row.cards) {
      cardMap.set(row.cards.id, row.cards);
    }
  });

  const cardsList = Array.from(cardMap.values());

  return cardsList.map((c, idx) => {
    const parsed = parseCardAbility(c);
    return {
      id: `admin_${c.id}_${idx}`,
      name: c.name,
      type: "player" as const,
      isLegend: c.is_legend,
      attack: c.attack,
      defense: c.defense,
      role: c.role,
      roleArabic: c.is_legend
        ? LEGEND_ROLE_LABELS[c.role] || c.role_arabic
        : ROLE_LABELS[c.role] || c.role_arabic,
      description: parsed.description || "",
      team: c.team || "",
      avatar: c.avatar || "⚽",
      imageUrl: c.image_url || "",
      ability: parsed.ability,
    };
  });
}

/**
 * Convert admin tactical cards into game-ready SpecialCard[] format.
 * Called by WelcomeMenu/App logic to load tactical packages.
 */
export async function getSpecialCardsForGame(packageIds?: string[]): Promise<SpecialCard[]> {
  if (!isSupabaseConfigured) {
    return getMockSpecialCards(packageIds);
  }
  checkSupabase();
  let query = supabase!.from("package_special_cards").select(`
    special_cards (
      id,
      name,
      effect,
      effect_arabic,
      description,
      icon,
      image_url
    )
  `);

  if (packageIds && packageIds.length > 0) {
    query = query.in("package_id", packageIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching special cards for game:", error);
    return [];
  }

  // Deduplicate
  const cardMap = new Map<string, any>();
  (data || []).forEach((row: any) => {
    if (row.special_cards) {
      cardMap.set(row.special_cards.id, row.special_cards);
    }
  });

  const cardsList = Array.from(cardMap.values());

  return cardsList.map((c, idx) => {
    const parsed = parseCardAbility(c);
    return {
      id: `admin_spec_${c.id}_${idx}`,
      name: c.name,
      type: "special" as const,
      effect: c.effect as any,
      effectArabic: c.effect_arabic || "",
      description: parsed.description || "",
      icon: c.icon || "🃏",
      imageUrl: c.image_url || "",
      ability: parsed.ability,
    };
  });
}

/**
 * Check if there are any admin-created packages with cards.
 */
export async function hasAdminCards(): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return true; // Mock data is always available
  }
  checkSupabase();
  const { count: cardCount, error: cardError } = await supabase!
    .from("cards")
    .select("*", { count: "exact", head: true });
  if (cardError) return false;

  const { count: specCount, error: specError } = await supabase!
    .from("special_cards")
    .select("*", { count: "exact", head: true });
  if (specError) return false;

  return (cardCount !== null && cardCount > 0) || (specCount !== null && specCount > 0);
}

// ═══════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════════════

export async function exportPackage(packageId: string): Promise<PackageExport | null> {
  const pkg = await getPackageById(packageId);
  if (!pkg) return null;

  if (pkg.type === "special") {
    const specialCards = await getSpecialCardsByPackage(packageId);
    return {
      version: 1,
      package: pkg,
      specialCards,
      exportedAt: new Date().toISOString(),
    };
  } else {
    const cards = await getCardsByPackage(packageId);
    return {
      version: 1,
      package: pkg,
      cards,
      exportedAt: new Date().toISOString(),
    };
  }
}

export async function importPackage(data: PackageExport): Promise<{
  package: AdminPackage;
  cardsImported: number;
}> {
  const newPkg = await createPackage({
    name: data.package.name + " (مستورد)",
    description: data.package.description,
    image: data.package.image,
    type: data.package.type || "player",
    legend_percentage: data.package.legend_percentage || 30,
  });

  let count = 0;
  if (newPkg.type === "special" && data.specialCards) {
    for (const card of data.specialCards) {
      await createSpecialCardInPackage(newPkg.id, {
        name: card.name,
        effect: card.effect,
        effect_arabic: card.effect_arabic,
        description: card.description || "",
        icon: card.icon || "🃏",
        image_url: card.image_url || "",
      });
      count++;
    }
  } else if (data.cards) {
    for (const card of data.cards) {
      await createCardInPackage(newPkg.id, {
        name: card.name,
        attack: card.attack,
        defense: card.defense,
        role: card.role,
        role_arabic: card.role_arabic,
        is_legend: card.is_legend,
        description: card.description || "",
        team: card.team || "",
        avatar: card.avatar || "⚽",
        image_url: card.image_url || "",
        tags: card.tags || [],
      });
      count++;
    }
  }

  return { package: newPkg, cardsImported: count };
}

export function saveCardLocally(card: any): void {
  try {
    const raw = localStorage.getItem("mortada_admin_cards");
    const cards = raw ? JSON.parse(raw) : [];
    const newCard = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: card.name,
      attack: Number(card.attack ?? 5),
      defense: Number(card.defense ?? 5),
      role: card.role || "midfielder",
      role_arabic: card.role_arabic || card.roleArabic || "لاعب",
      is_legend: !!(card.is_legend || card.isLegend),
      description: card.description || "",
      team: card.team || "",
      avatar: card.avatar || "⚽",
      image_url: card.image_url || card.imageUrl || "",
      tags: card.tags || [],
      ability: card.ability,
    };
    cards.push(newCard);
    localStorage.setItem("mortada_admin_cards", JSON.stringify(cards));
  } catch (e) {
    console.error("Failed to save card locally:", e);
  }
}

export function saveSpecialCardLocally(card: any): void {
  try {
    const raw = localStorage.getItem("mortada_admin_special_cards");
    const cards = raw ? JSON.parse(raw) : [];
    const newCard = {
      id: `local_spec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: card.name,
      effect: card.effect || "custom",
      effect_arabic: card.effect_arabic || card.effectArabic || "",
      description: card.description || "",
      icon: card.icon || "🃏",
      image_url: card.image_url || card.imageUrl || "",
      ability: card.ability,
    };
    cards.push(newCard);
    localStorage.setItem("mortada_admin_special_cards", JSON.stringify(cards));
  } catch (e) {
    console.error("Failed to save special card locally:", e);
  }
}
