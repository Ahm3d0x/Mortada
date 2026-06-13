/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerCard, SpecialCard, PontoCard, PlayerRole } from "./types";

// Famous Football Stars split into regular and legends
export const INITIAL_PLAYER_CARDS: Omit<PlayerCard, "id">[] = [
  // ATTACKERS (Forward / رأس حربة)
  {
    name: "محمد صلاح",
    type: "player",
    isLegend: false,
    attack: 9,
    defense: 2,
    role: "attacker",
    roleArabic: "رأس حربة",
    description: "فخر العرب وصانع التاريخ! سريع ويسدد بدقة لا تخطئ.",
    team: "مصر",
    avatar: "👑"
  },
  {
    name: "مبابي",
    type: "player",
    isLegend: false,
    attack: 9,
    defense: 1,
    role: "attacker",
    roleArabic: "رأس حربة",
    description: "القطار الفرنسي السريع. يصعب على أي مدافع ملاحقته.",
    team: "فرنسا",
    avatar: "⚡"
  },
  {
    name: "هالاند",
    type: "player",
    isLegend: false,
    attack: 9,
    defense: 1,
    role: "attacker",
    roleArabic: "رأس حربة",
    description: "الهداف النرويجي المدمر بنية جسدية خارقة وقدرة تهديفية مرعبة.",
    team: "النرويج",
    avatar: "🤖"
  },
  {
    name: "رياض محرز",
    type: "player",
    isLegend: false,
    attack: 8,
    defense: 2,
    role: "attacker",
    roleArabic: "رأس حربة",
    description: "ساحر ثنائيات ومراوغ رائع بقدمه اليسرى السحرية.",
    team: "الجزائر",
    avatar: "✨"
  },
  {
    name: "ليونيل ميسي",
    type: "player",
    isLegend: false,
    attack: 9,
    defense: 1,
    role: "attacker",
    roleArabic: "رأس حربة",
    description: "البرغوث عبقري المراوغة والتوجيه الفني المتكامل.",
    team: "الأرجنتين",
    avatar: "🐐"
  },
  {
    name: "رونالدو CR7",
    type: "player",
    isLegend: false,
    attack: 9,
    defense: 1,
    role: "attacker",
    roleArabic: "رأس حربة",
    description: "صاروخ ماديرا، عقلية الفوز المذهلة والارتقاء الخارق.",
    team: "البرتغال",
    avatar: "🚀"
  },
  {
    name: "ساديو ماني",
    type: "player",
    isLegend: false,
    attack: 8,
    defense: 2,
    role: "attacker",
    roleArabic: "رأس حربة",
    description: "مهاجم نشيط ومقاتل على كل كرة بسرعات خارقة وصناعة فرص.",
    team: "السنغال",
    avatar: "🦁"
  },

  // MIDFIELDERS (صانع ألعاب / وسط)
  {
    name: "كيفين دي بروين",
    type: "player",
    isLegend: false,
    attack: 7,
    defense: 6,
    role: "midfielder",
    roleArabic: "خط وسط",
    description: "مهندس التمريرات والمستحيل الذي يرى الثغرات قبل الجميع.",
    team: "بلجيكا",
    avatar: "🎯"
  },
  {
    name: "لوكا مودريتش",
    type: "player",
    isLegend: false,
    attack: 6,
    defense: 6,
    role: "midfielder",
    roleArabic: "خط وسط",
    description: "قائد الكروات الخبير، هدوء وثبات وتنقل أنيق بالكرة.",
    team: "كرواتيا",
    avatar: "🎻"
  },
  {
    name: "توني كروس",
    type: "player",
    isLegend: false,
    attack: 5,
    defense: 7,
    role: "midfielder",
    roleArabic: "خط وسط",
    description: "المترونوم الألماني الصامت ممرر الكرات كالموجات اللاسلكية بدقة 100%.",
    team: "ألمانيا",
    avatar: "📐"
  },
  {
    name: "جود بيلينجهام",
    type: "player",
    isLegend: false,
    attack: 7,
    defense: 7,
    role: "midfielder",
    roleArabic: "خط وسط",
    description: "الجوهرة الشابة القادرة على العودة للدفاع والمباغتة بالهجوم.",
    team: "إنجلترا",
    avatar: "💎"
  },
  {
    name: "إلكاي جوندوغان",
    type: "player",
    isLegend: false,
    attack: 6,
    defense: 5,
    role: "midfielder",
    roleArabic: "خط وسط",
    description: "داعم الهجمات الذكي وصاحب الأهداف الحاسمة بذكائه التكتيكي.",
    team: "ألمانيا",
    avatar: "🧠"
  },

  // DEFENDERS (مدافع صلب)
  {
    name: "فيرجيل فان دايك",
    type: "player",
    isLegend: false,
    attack: 2,
    defense: 9,
    role: "defender",
    roleArabic: "مدافع",
    description: "الصخرة الهولندية منيعة الحصون، يصعب جداً تجاوزه.",
    team: "هولندا",
    avatar: "🧱"
  },
  {
    name: "أشرف حكيمي",
    type: "player",
    isLegend: false,
    attack: 4,
    defense: 8,
    role: "defender",
    roleArabic: "مدافع",
    description: "الظهير المغربي الطائر سرعة خاطفة بالارتداد ودفاع قوي ومثالي.",
    team: "المغرب",
    avatar: "🏹"
  },
  {
    name: "روبن دياز",
    type: "player",
    isLegend: false,
    attack: 1,
    defense: 9,
    role: "defender",
    roleArabic: "مدافع",
    description: "مدافع برتغالي شرس في الالتحامات وصاحب تغطية ذكية.",
    team: "البرتغال",
    avatar: "🛡️"
  },
  {
    name: "خاليدو كوليبالي",
    type: "player",
    isLegend: false,
    attack: 1,
    defense: 8,
    role: "defender",
    roleArabic: "مدافع",
    description: "العملاق السنغالي منيع الكرات العالية ومحطم الهجمات بدقة.",
    team: "السنغال",
    avatar: "🗿"
  },
  {
    name: "رونالد أراوخو",
    type: "player",
    isLegend: false,
    attack: 2,
    defense: 8,
    role: "defender",
    roleArabic: "مدافع",
    description: "مدافع صلب ذو فدائية عالية وسرعات فائقة في قطع الكرة.",
    team: "الأوروغواي",
    avatar: "🦾"
  },

  // GOALKEEPERS (حارس المرمى)
  {
    name: "ياسين بونو",
    type: "player",
    isLegend: false,
    attack: 0,
    defense: 9,
    role: "goalkeeper",
    roleArabic: "حارس مرمى",
    description: "حامي العرين المغربي وبطل ضربات الترجيح وثبات ملحمي.",
    team: "المغرب",
    avatar: "🧤"
  },
  {
    name: "مارك تير شتيغن",
    type: "player",
    isLegend: false,
    attack: 1,
    defense: 8,
    role: "goalkeeper",
    roleArabic: "حارس مرمى",
    description: "جدار كتلونيا الألماني المتمرس في بناء اللعب والتصديات الانعكاسية.",
    team: "ألمانيا",
    avatar: "🛑"
  },
  {
    name: "تيبو كورتوا",
    type: "player",
    isLegend: false,
    attack: 0,
    defense: 9,
    role: "goalkeeper",
    roleArabic: "حارس مرمى",
    description: "العملاق البلجيكي الأخطبوطي مسدود الأفق على المهاجمين.",
    team: "بلجيكا",
    avatar: "🕸️"
  },

  // LEGENDS (الأساطير - Must NOT be generated in first 5 pitch slots directly)
  {
    name: "زين الدين زيدان",
    type: "player",
    isLegend: true,
    attack: 9,
    defense: 8,
    role: "midfielder",
    roleArabic: "أسطورة خط وسط",
    description: "ملك الكنترول الفرنسي وساحر النهائيات بالرأسيات واللقطات الخالدة.",
    team: "فرنسا",
    avatar: "🌟"
  },
  {
    name: "رونالدينيو",
    type: "player",
    isLegend: true,
    attack: 10,
    defense: 3,
    role: "attacker",
    roleArabic: "أسطورة هجوم",
    description: "ساحر السامبا وضاحك الملاعب مبدع الحركات الخادعة والتصويبات المقوسة الفريدة.",
    team: "البرازيل",
    avatar: "🤙"
  },
  {
    name: "دييغو مارادونا",
    type: "player",
    isLegend: true,
    attack: 10,
    defense: 2,
    role: "attacker",
    roleArabic: "أسطورة هجوم",
    description: "العبقري الأرجنتيني، صانع الإعجاز ومراوغ منتخبات بأكملها بمفرده.",
    team: "الأرجنتين",
    avatar: "🔟"
  },
  {
    name: "بيليه",
    type: "player",
    isLegend: true,
    attack: 10,
    defense: 2,
    role: "attacker",
    roleArabic: "أسطورة هجوم",
    description: "جوهرة البرازيل وبطل المونديالات الثلاثة، سيد كرة القدم عبر التاريخ.",
    team: "البرازيل",
    avatar: "👑"
  },
  {
    name: "باولو مالديني",
    type: "player",
    isLegend: true,
    attack: 2,
    defense: 10,
    role: "defender",
    roleArabic: "أسطورة دفاع",
    description: "الأناقة والتدخلات المثالية الإيطالية التاريخية، لم يتفوق عليه أحد.",
    team: "إيطاليا",
    avatar: "🏰"
  },
  {
    name: "جانلويجي بوفون",
    type: "player",
    isLegend: true,
    attack: 0,
    defense: 10,
    role: "goalkeeper",
    roleArabic: "أسطورة حراسة مرمى",
    description: "حارس الحراس الأسطوري، يقف بالمرصاد لأعظم التسديدات لربع قرن.",
    team: "إيطاليا",
    avatar: "🏆"
  },
  {
    name: "رونالدو الظاهرة",
    type: "player",
    isLegend: true,
    attack: 10,
    defense: 2,
    role: "attacker",
    roleArabic: "أسطورة هجوم",
    description: "مهاجم متكامل خارق ومخيف للخصوم بإنهاء هجمات هو الأكثر فتكاً بسطح الأرض.",
    team: "البرازيل",
    avatar: "🇧🇷"
  }
];

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

// Helper to fully initialize and shuffle standard player decks
export function generatePlayerDeck(): PlayerCard[] {
  const cards: Omit<PlayerCard, "id">[] = [];
  INITIAL_PLAYER_CARDS.forEach(card => {
    if (card.isLegend) {
      cards.push(card);
    } else {
      // Duplicate non-legends 4 times to increase standard/common players significantly
      cards.push(card);
      cards.push(card);
      cards.push(card);
      cards.push(card);
    }
  });

  return cards.map((card, idx) => ({
    ...card,
    id: `play_${idx}_${Math.random().toString(36).substr(2, 9)}`
  } as PlayerCard)).sort(() => Math.random() - 0.5);
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
