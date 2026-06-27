/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CardType = "player" | "special";

export type CardAbilityActionType =
  | "AddStat"
  | "RemoveStat"
  | "MultiplyStat"
  | "DestroyCard"
  | "DrawCard"
  | "RevealCard"
  | "HideCard"
  | "SwapCard"
  | "StealCard"
  | "CopyCard"
  | "FreezeCard"
  | "SilenceCard"
  | "StunCard"
  | "AddMoves"
  | "ReduceMoves"
  | "BlockAttack"
  | "BlockDefense"
  | "BlockAbility"
  | "BlockSpecialCards"
  | "CancelAction"
  | "ReturnToHand";

export interface CardAbilityAction {
  type: CardAbilityActionType;
  stat?: "attack" | "defense" | "moves" | "draw";
  value?: number;
  target:
    | "Self"
    | "Allies"
    | "Enemies"
    | "SelectedCard"
    | "SelectedEnemy"
    | "CurrentAttack"
    | "CurrentDefense"
    | "All";
  duration?:
    | "Instant"
    | "CurrentPhase"
    | "CurrentTurn"
    | "NextTurn"
    | "XTurns"
    | "WhileFaceUp"
    | "WhileAlive"
    | "UntilTrigger";
  durationTurns?: number;
  durationTrigger?: string;
  stackable?: boolean;
  maxUses?: number;
}

export type CardAbilityConditionType =
  | "IsFaceUp"
  | "IsFaceDown"
  | "IsLegend"
  | "IsAttacker"
  | "IsDefender"
  | "CardOwnerIsEnemy"
  | "HasTag"
  | "HasAbility";

export interface CardAbilityCondition {
  type: CardAbilityConditionType;
  value?: string;
}

export type CardAbilityTriggerType =
  | "CardPlayed"
  | "CardRevealed"
  | "AttackStarted"
  | "DefenseStarted"
  | "GoalScored"
  | "TurnStarted"
  | "TurnEnded"
  | "CardDestroyed";

export interface CardAbility {
  trigger: CardAbilityTriggerType;
  conditions: CardAbilityCondition[];
  actions: CardAbilityAction[];
  powerScore?: number;
  maxUses?: number;
}

export type PlayerRole = "attacker" | "defender" | "midfielder" | "goalkeeper";

export interface PlayerCard {
  id: string;
  name: string;
  type: "player";
  isLegend: boolean;
  attack: number;
  defense: number;
  role: PlayerRole;
  roleArabic: string;
  description: string;
  team: string; // e.g. "مصر", "البرتغال", "الأرجنتين"
  avatar: string; // Emoji representing the player
  imageUrl?: string;
  ability?: CardAbility;
  // Runtime game states
  frozen?: boolean;
  frozenTurnsLeft?: number;
  stunned?: boolean;
  stunnedTurnsLeft?: number;
  silenced?: boolean;
  silencedTurnsLeft?: number;
  revealTurn?: number;
  playTurn?: number;
  abilityUses?: number;
}

export type SpecialEffect =
  | "offside"       // تسلل: يلغي نقاط أقوى مهاجم للخصم
  | "wet_pitch"     // عشب مبلل: يقلل دفاع أو هجوم الخصم بمقدار 4 نقاط
  | "counter_attack" // هجمة مرتدة: يعطي المهاجم +4 نقاط هجوم إضافية
  | "fans"          // جمهور حماسي: يعطي أي كارت مكشوف في دورك +3 نقاط
  | "park_the_bus"  // تكتيك الباص: يضيف +6 نقاط للدفاع الإجمال
  | "red_card"      // كارت أحمر: يستبعد كارت لاعب مكشوف للخصم من الملعب تماماً
  | "world_cup";    // طاقة المونديال: تسحب كارتين إضافيين فوراً من المجموعات

export interface SpecialCard {
  id: string;
  name: string;
  type: "special";
  effect: SpecialEffect;
  effectArabic: string;
  description: string;
  icon: string; // Emoji
  imageUrl?: string;
  ability?: CardAbility;
  // Runtime game states
  playTurn?: number;
  durationTurnsLeft?: number;
}

export type Card = PlayerCard | SpecialCard;

export interface BoosterCard {
  id: string;
  value: number; // e.g., +1, +2, +3, +4, +5, +7, +10
  text: string;  // Custom title e.g. "ركلة حرة مباشرة!", "تسديدة صاروخية!"
}

export type GamePhase =
  | "menu"          // شاشة البداية واختيار المدرب
  | "warmup"        // مرحلة التسخين وتجهيز الخطة
  | "player_turn"   // دور اللاعب
  | "ai_turn"       // دور الكمبيوتر
  | "attacking"     // مرحلة هجوم اللاعب والدفاع الردي للكمبيوتر
  | "ai_attacking"  // مرحلة هجوم الكمبيوتر والدفاع الردي للاعب
  | "resolution"    // حسم الهجمة وتحديث النتيجة
  | "game_over";    // شاشة النهاية

export interface ActionLog {
  id: string;
  timestamp: string; // Format like 12:30:15
  text: string;
  type: "info" | "success" | "warning" | "danger" | "neutral";
  sender?: "host" | "opponent" | "player" | "ai" | "system";
  localOnly?: boolean;
  round?: number;
  createdAt?: number;
}

export interface Coach {
  name: string;
  teamVibe: string; // e.g., "الفراعنة", "الساموراي", "الملكي"
  score: number; // Number of goals scored. Target: 5
  pitch: {
    card: PlayerCard | null;
    isRevealed: boolean;
  }[]; // Maximum 5 slots on the pitch
  hand: Card[];
}

export interface GameState {
  phase: GamePhase;
  player: Coach;
  ai: Coach;
  playerMovesLeft: number; // Max 3 per turn
  aiMovesLeft: number; // Max 3 per turn
  playerDeck: PlayerCard[];
  specialDeck: SpecialCard[];
  boosterDeck: BoosterCard[];
  currentAttackerIdx: number | null; // Slot index of active attacker
  currentBooster: BoosterCard | null; // Drawn Booster card
  activeSpecialCards: {
    player: SpecialCard[];
    ai: SpecialCard[];
  };
  attackLog: string[];
  history: ActionLog[];
  turnCount: number;
}
