import { CardAbility, CardAbilityAction, CardAbilityCondition, SpecialCard, PlayerCard, Card, BoosterCard, CardAbilityActionType } from "../types.ts";

// Slot data type used by game components for pitch slots
export interface SlotData {
  card: PlayerCard | null;
  isRevealed: boolean;
  revealedInAttack?: boolean;
  confirmedInAttack?: boolean;
  spent?: boolean;
}

const pushRulesEngineLog = (gs: any, text: string, type: "info" | "success" | "warning" | "danger" | "neutral" = "neutral", isHost: boolean) => {
  if (!gs.logs) gs.logs = [];
  gs.logs.push({
    id: Math.random().toString(),
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    text,
    type,
    sender: isHost ? "host" : "opponent",
    round: (gs.completed_rounds || 0) + 1,
    createdAt: Date.now()
  });
};

export const VALID_TRIGGERS = [
  "CardPlayed",
  "CardRevealed",
  "AttackStarted",
  "DefenseStarted",
  "GoalScored",
  "TurnStarted",
  "TurnEnded",
  "CardDestroyed",
];

export const VALID_CONDITIONS = [
  "IsFaceUp",
  "IsFaceDown",
  "IsLegend",
  "IsAttacker",
  "IsDefender",
  "CardOwnerIsEnemy",
  "HasTag",
  "HasAbility",
];

export const VALID_ACTIONS = [
  "AddStat",
  "RemoveStat",
  "MultiplyStat",
  "DestroyCard",
  "DrawCard",
  "RevealCard",
  "HideCard",
  "SwapCard",
  "StealCard",
  "CopyCard",
  "FreezeCard",
  "SilenceCard",
  "StunCard",
  "AddMoves",
  "ReduceMoves",
  "BlockAttack",
  "BlockDefense",
  "BlockAbility",
  "BlockSpecialCards",
  "CancelAction",
  "ReturnToHand",
];

export const VALID_TARGETS = [
  "Self",
  "Allies",
  "Enemies",
  "SelectedCard",
  "SelectedEnemy",
  "CurrentAttack",
  "CurrentDefense",
  "All",
];

export const VALID_DURATIONS = [
  "Instant",
  "CurrentPhase",
  "CurrentTurn",
  "NextTurn",
  "XTurns",
  "WhileFaceUp",
  "WhileAlive",
  "UntilTrigger",
];

/**
 * Explains an ability in friendly Arabic sentences.
 */
export function explainAbility(ability: CardAbility): string[] {
  const details: string[] = [];

  // Trigger Explanation
  const triggerMap: Record<string, string> = {
    CardPlayed: "عند لعب الورقة أو تفعيل التكتيك",
    CardRevealed: "عند كشف الكارت في الملعب",
    AttackStarted: "عند بدء هجمة للفريق",
    DefenseStarted: "عند بدء محاولة صد وهجوم مضاد للخصم",
    GoalScored: "عند تسجيل هدف في المباراة",
    TurnStarted: "عند بداية دور اللعب",
    TurnEnded: "عند نهاية دور اللعب",
    CardDestroyed: "عند طرد أو استبعاد كارت لاعب من الملعب",
  };
  details.push(`الحدث المسبب (الزناد): ${triggerMap[ability.trigger] || ability.trigger}`);

  // Conditions Explanation
  if (ability.conditions && ability.conditions.length > 0) {
    const condStrings = ability.conditions.map((cond) => {
      switch (cond.type) {
        case "IsFaceUp": return "الكارت مكشوفاً";
        case "IsFaceDown": return "الكارت مقلوباً ومخفياً";
        case "IsLegend": return "الكارت للاعب أسطوري";
        case "IsAttacker": return "صاحب الكارت هو المهاجم حالياً";
        case "IsDefender": return "صاحب الكارت هو المدافع حالياً";
        case "CardOwnerIsEnemy": return "الكارت يخص الخصم المنافس";
        case "HasTag": return `الكارت يمتلك تاغ [ ${cond.value || ""} ]`;
        case "HasAbility": return "الكارت يمتلك قدرة خاصة مفعلة";
        default: return cond.type;
      }
    });
    details.push(`شروط التفعيل: يجب أن يكون ${condStrings.join(" و ")}`);
  } else {
    details.push("شروط التفعيل: تعمل دائماً وبشكل تلقائي دون شروط مسبقة.");
  }

  // Actions Explanation
  if (ability.actions && ability.actions.length > 0) {
    ability.actions.forEach((act, idx) => {
      let actDesc = "";
      const val = act.value ?? 0;
      const sign = val >= 0 ? "+" : "";

      const targetMap: Record<string, string> = {
        Self: "نفس الكارت",
        Allies: "جميع كروت الحلفاء بالملعب",
        Enemies: "جميع كروت الخصوم بالملعب",
        SelectedCard: "الكارت الذي يتم تحديده بالملعب",
        SelectedEnemy: "كارت لاعب الخصم الذي يتم اختياره",
        CurrentAttack: "الهجمة الحالية النشطة",
        CurrentDefense: "الدفاع الحالي النشط",
        All: "جميع كروت الفريقين في الملعب",
      };

      const statMap: Record<string, string> = {
        attack: "الهجوم",
        defense: "الدفاع",
        moves: "الحركات التكتيكية",
        draw: "سحب الكروت",
      };

      const durationMap: Record<string, string> = {
        Instant: "لحظياً فور الاستخدام",
        CurrentPhase: "حتى نهاية الهجمة الحالية فقط",
        CurrentTurn: "حتى نهاية الدور الحالي",
        NextTurn: "حتى نهاية الدور القادم",
        XTurns: `لمدة ${act.durationTurns || 2} أدوار كاملة`,
        WhileFaceUp: "طالما بقي الكارت مكشوفاً بالملعب",
        WhileAlive: "طالما بقي الكارت داخل الملعب ولم يُطرد",
        UntilTrigger: `حتى حدوث الحدث [ ${act.durationTrigger || ""} ]`,
      };

      const durStr = act.duration ? ` [المدة: ${durationMap[act.duration] || act.duration}]` : "";

      switch (act.type) {
        case "AddStat":
          actDesc = `إضافة ${sign}${val} لطاقة [ ${statMap[act.stat || "attack"] || act.stat} ] لـ [ ${targetMap[act.target] || act.target} ]${durStr}`;
          break;
        case "RemoveStat":
          actDesc = `خصم ${val} من طاقة [ ${statMap[act.stat || "attack"] || act.stat} ] لـ [ ${targetMap[act.target] || act.target} ]${durStr}`;
          break;
        case "MultiplyStat":
          actDesc = `مضاعفة طاقة [ ${statMap[act.stat || "attack"] || act.stat} ] بمقدار ${val} أضعاف لـ [ ${targetMap[act.target] || act.target} ]${durStr}`;
          break;
        case "DestroyCard":
          actDesc = `طرد واستبعاد [ ${targetMap[act.target] || act.target} ] خارج الملعب تماماً ببطاقة حمراء 🟥`;
          break;
        case "DrawCard":
          actDesc = `سحب عدد ${val} كروت إضافية من الباقات لـ [ ${targetMap[act.target] || act.target} ]`;
          break;
        case "RevealCard":
          actDesc = `كشف وقلب [ ${targetMap[act.target] || act.target} ] ليصبح وجهاً لأعلى بالملعب`;
          break;
        case "HideCard":
          actDesc = `إخفاء وقلب [ ${targetMap[act.target] || act.target} ] ليصبح وجهاً لأسفل مقلوباً`;
          break;
        case "SwapCard":
          actDesc = `تبديل مراكز [ ${targetMap[act.target] || act.target} ] مع لاعب آخر`;
          break;
        case "StealCard":
          actDesc = `سرقة كارت عشوائي من يد [ ${targetMap[act.target] || act.target} ] وإضافته ليدك`;
          break;
        case "CopyCard":
          actDesc = `نسخ طاقات وقدرات [ ${targetMap[act.target] || act.target} ] الحالية`;
          break;
        case "FreezeCard":
          actDesc = `تجميد ❄️ [ ${targetMap[act.target] || act.target} ] وتعطيل مشاركته بالنقاط${durStr}`;
          break;
        case "SilenceCard":
          actDesc = `كتم وإلغاء 🔇 مفعول القدرة الخاصة لـ [ ${targetMap[act.target] || act.target} ]${durStr}`;
          break;
        case "StunCard":
          actDesc = `صدم 💫 [ ${targetMap[act.target] || act.target} ] وإيقافه بالكامل عن اللعب${durStr}`;
          break;
        case "AddMoves":
          actDesc = `منح عدد +${val} حركات تكتيكية إضافية لـ [ ${targetMap[act.target] || act.target} ] في هذا الدور`;
          break;
        case "ReduceMoves":
          actDesc = `خصم وعرقلة -${val} حركات تكتيكية لـ [ ${targetMap[act.target] || act.target} ]`;
          break;
        case "BlockAttack":
          actDesc = `حظر وحظر شن أي هجمات تكتيكية على [ ${targetMap[act.target] || act.target} ]${durStr}`;
          break;
        case "BlockDefense":
          actDesc = `حظر صد أو مشاركة بالدفاع لـ [ ${targetMap[act.target] || act.target} ]${durStr}`;
          break;
        case "BlockAbility":
          actDesc = `منع وحظر إطلاق أي قدرات تكتيكية لـ [ ${targetMap[act.target] || act.target} ]${durStr}`;
          break;
        case "BlockSpecialCards":
          actDesc = `حظر لعب أي كروت تكتيكية إضافية لـ [ ${targetMap[act.target] || act.target} ]${durStr}`;
          break;
        case "CancelAction":
          actDesc = `إحباط وإبطال الهجمة أو الصد لـ [ ${targetMap[act.target] || act.target} ]`;
          break;
        case "ReturnToHand":
          actDesc = `إرجاع [ ${targetMap[act.target] || act.target} ] إلى يد المدرب ورفع طاقته من الملعب`;
          break;
        default:
          actDesc = `${act.type} على [ ${targetMap[act.target] || act.target} ]`;
      }
      details.push(`إجراء ${idx + 1}: ${actDesc}`);
    });
  }

  return details;
}

/**
 * Validates a JSON ability. Returns isValid: boolean and error message.
 */
export function validateAbility(ability: any): { isValid: boolean; message: string } {
  if (!ability) {
    return { isValid: false, message: "كود القدرة فارغ أو غير معرف!" };
  }
  if (!ability.trigger) {
    return { isValid: false, message: "يجب تحديد حدث مسبب للقدرة (trigger)!" };
  }
  if (!VALID_TRIGGERS.includes(ability.trigger)) {
    return { isValid: false, message: `مسبب القدرة غير معروف [ ${ability.trigger} ]!` };
  }

  if (ability.conditions && Array.isArray(ability.conditions)) {
    for (const cond of ability.conditions) {
      if (!VALID_CONDITIONS.includes(cond.type)) {
        return { isValid: false, message: `شرط غير معروف [ ${cond.type} ]!` };
      }
    }
  }

  if (!ability.actions || !Array.isArray(ability.actions) || ability.actions.length === 0) {
    return { isValid: false, message: "يجب تحديد إجراء (Action) واحد على الأقل!" };
  }

  for (let i = 0; i < ability.actions.length; i++) {
    const act = ability.actions[i];
    if (!VALID_ACTIONS.includes(act.type)) {
      return { isValid: false, message: `الإجراء رقم ${i + 1} غير معروف [ ${act.type} ]!` };
    }
    if (!act.target || !VALID_TARGETS.includes(act.target)) {
      return { isValid: false, message: `مستهدف الإجراء رقم ${i + 1} غير معروف [ ${act.target || ""} ]!` };
    }
    if (act.duration && !VALID_DURATIONS.includes(act.duration)) {
      return { isValid: false, message: `مدة الإجراء رقم ${i + 1} غير معروفة [ ${act.duration} ]!` };
    }
    if (act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat") {
      if (!act.stat) {
        return { isValid: false, message: `يجب تحديد الخاصية المعدلة (stat) للإجراء رقم ${i + 1}!` };
      }
    }
  }

  return { isValid: true, message: "✓ القدرة صالحة ومطابقة لمحرك قواعد مرتدة" };
}

/**
 * Calculates the Card Power Score based on stats and abilities.
 * Returns score (0-100), level (weak, balanced, strong), and balance message.
 */
export function calculatePowerScore(
  ability: CardAbility | undefined,
  stats: { attack: number; defense: number; isLegend: boolean }
): {
  score: number;
  level: "weak" | "balanced" | "strong";
  explanation: string;
  breakdown?: {
    base: number;
    legend: number;
    ability: number;
  };
} {
  // Base Stats Score: stats in Mortada range 0-15.
  // Maximum stats = 15 + 15 = 30. We multiply base stats by 1.25.
  let baseScore = (stats.attack + stats.defense) * 1.25;

  // Legend tax/benefit
  if (stats.isLegend) {
    baseScore += 6.0; // Legends require 2 cards sacrificed, so they get +6 buffer
  }

  let abilityScore = 0;

  if (ability && ability.actions) {
    ability.actions.forEach((act) => {
      let actionPower = 0;
      const val = Math.abs(act.value ?? 1);

      // 1. Calculate Base Action Value
      switch (act.type) {
        case "AddStat":
        case "RemoveStat":
          // If value modifies attack/defense
          if (act.stat === "attack" || act.stat === "defense") {
            actionPower += val * 1.5;
          } else {
            // moves / draw
            actionPower += val * 3.5;
          }
          break;
        case "MultiplyStat":
          actionPower += val * 6.0;
          break;
        case "CancelAction":
          actionPower += 9.0;
          break;
        case "DestroyCard":
          actionPower += 11.5; // Reds are highly valued
          break;
        case "DrawCard":
          actionPower += val * 3.0;
          break;
        case "FreezeCard":
        case "StunCard":
          actionPower += 7.0;
          break;
        case "SilenceCard":
          actionPower += 6.5;
          break;
        case "StealCard":
          actionPower += 8.0;
          break;
        case "CopyCard":
          actionPower += 5.5;
          break;
        case "SwapCard":
        case "ReturnToHand":
          actionPower += 4.5;
          break;
        case "AddMoves":
        case "ReduceMoves":
          actionPower += val * 4.5;
          break;
        case "BlockAttack":
        case "BlockDefense":
        case "BlockAbility":
        case "BlockSpecialCards":
          actionPower += 7.5;
          break;
        default:
          actionPower += 4.0;
      }

      // 2. Target Multiplier
      let targetMult = 1.0;
      switch (act.target) {
        case "Self": targetMult = 1.0; break;
        case "SelectedCard": targetMult = 1.25; break;
        case "SelectedEnemy": targetMult = 1.4; break;
        case "CurrentAttack":
        case "CurrentDefense": targetMult = 1.45; break;
        case "Allies":
        case "Enemies": targetMult = 2.0; break; // multi-target
        case "All": targetMult = 2.8; break;
      }
      actionPower *= targetMult;

      // 3. Duration Multiplier
      let durMult = 1.0;
      if (act.duration) {
        switch (act.duration) {
          case "Instant": durMult = 1.0; break;
          case "CurrentPhase": durMult = 1.15; break;
          case "CurrentTurn": durMult = 1.35; break;
          case "NextTurn": durMult = 1.6; break;
          case "XTurns": durMult = 1.1 + (act.durationTurns || 2) * 0.3; break; // 3 turns = 2.0
          case "WhileFaceUp": durMult = 2.1; break;
          case "WhileAlive": durMult = 2.3; break;
          case "UntilTrigger": durMult = 1.8; break;
        }
      }
      actionPower *= durMult;

      // 4. Max uses scaling
      if (act.maxUses && act.maxUses > 0) {
        // Having a limit reduces the power score slightly (limits benefit)
        const limitFactor = act.maxUses === 1 ? 0.65 : act.maxUses === 2 ? 0.8 : 0.9;
        actionPower *= limitFactor;
      }

      abilityScore += actionPower;
    });
  }

  // Total calculated balance score
  const totalScore = Math.round(baseScore + abilityScore);

  // Determine Balance Category
  const maxSafeScore = stats.isLegend ? 46 : 26;
  const minNormalScore = stats.isLegend ? 32 : 12;

  let level: "weak" | "balanced" | "strong" = "balanced";
  let explanation = "";

  if (totalScore > maxSafeScore) {
    level = "strong";
    explanation = `⚠️ الكارت خارق وتوازنه مرتفع جداً (${totalScore} نقطة). ينصح بتقليل القوة أو الطاقات لتجنب كسر متعة المباراة.`;
  } else if (totalScore < minNormalScore) {
    level = "weak";
    explanation = `ℹ️ كارت ضعيف تكتيكياً (${totalScore} نقطة). يمكنك تعويض ذلك بزيادة طاقة الهجوم/الدفاع أو تحسين شروط التأثيرات.`;
  } else {
    level = "balanced";
    explanation = `✓ كارت متوازن تكتيكياً ومثالي للعب (${totalScore} نقطة). يتلاءم بشكل كامل مع توازن الكروت الأخرى.`;
  }

  return {
    score: totalScore,
    level,
    explanation,
    breakdown: {
      base: Math.round((stats.attack + stats.defense) * 1.25),
      legend: stats.isLegend ? 6.0 : 0,
      ability: Math.round(abilityScore)
    }
  };
}

/**
 * Generates a detailed combat calculation with Arabic breakdown text for UI display.
 * Uses the same logic as runRefereeRulesEngine but returns human-readable breakdown.
 */
export function getDetailedCalculation(
  isPlayerSide: boolean,
  isAttackingStage: boolean,
  attackerIdx: number | null,
  activeBooster: BoosterCard | null,
  playerActiveSpecialsList: SpecialCard[],
  aiActiveSpecialsList: SpecialCard[],
  playerSlotsParam: SlotData[],
  aiSlotsParam: SlotData[],
  isPlayerAttacker: boolean
): { total: number; breakdown: string } {
  let baseScore = 0;
  const slots = isPlayerSide ? playerSlotsParam : aiSlotsParam;

  const playerList: string[] = [];
  slots.forEach((slot) => {
    if (slot.card && slot.isRevealed && (slot.revealedInAttack || slot.confirmedInAttack)) {
      if (slot.card.frozen || slot.card.stunned) {
        playerList.push(`   ● ${slot.card.name} (0 [مستبعد - تجميد/صدمة])`);
        return;
      }
      const val = isAttackingStage ? slot.card.attack : slot.card.defense;
      baseScore += val;
      playerList.push(`   ● ${slot.card.name} (${val})`);
    }
  });

  let boosterVal = 0;
  let boosterText = "";
  if (isAttackingStage && activeBooster && isPlayerSide === isPlayerAttacker) {
    baseScore += activeBooster.value;
    boosterVal = activeBooster.value;
    boosterText = activeBooster.text;
  }

  const activeSources: { card: Card; isPlayerOwned: boolean }[] = [];

  playerSlotsParam.forEach((slot) => {
    if (slot.card && slot.isRevealed) {
      activeSources.push({ card: slot.card, isPlayerOwned: true });
    }
  });
  aiSlotsParam.forEach((slot) => {
    if (slot.card && slot.isRevealed) {
      activeSources.push({ card: slot.card, isPlayerOwned: false });
    }
  });
  playerActiveSpecialsList.forEach((spec) => {
    activeSources.push({ card: spec, isPlayerOwned: true });
  });
  aiActiveSpecialsList.forEach((spec) => {
    activeSources.push({ card: spec, isPlayerOwned: false });
  });

  let modifiers = 0;
  let multiplier = 1;
  let cancelStrongestAttacker = false;

  const multiplierLogs: string[] = [];
  const modifierLogs: string[] = [];

  activeSources.forEach((src) => {
    const { card, isPlayerOwned } = src;

    const opponentActiveSpecials = isPlayerOwned ? aiActiveSpecialsList : playerActiveSpecialsList;
    const opponentSlots = isPlayerOwned ? aiSlotsParam : playerSlotsParam;
    const isAbilityBlocked = opponentActiveSpecials.some(c => c.ability?.actions.some(a => a.type === "BlockAbility")) ||
                              opponentSlots.some(s => s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions.some(a => a.type === "BlockAbility"));

    const isSilenced = (card as any).silenced || (card as any).abilityBlocked || isAbilityBlocked;
    if (isSilenced) return;

    if (card.ability) {
      const ability = card.ability;
      const triggerMatches = 
        ((ability.trigger === "CardRevealed" || ability.trigger === "CardPlayed") && card.type === "player") ||
        (ability.trigger === "CardPlayed" && card.type === "special") ||
        (ability.trigger === "AttackStarted" && isAttackingStage) ||
        (ability.trigger === "DefenseStarted" && !isAttackingStage);

      if (triggerMatches) {
        let conditionsMet = true;
        if (ability.conditions) {
          ability.conditions.forEach((cond) => {
            if (cond.type === "IsFaceUp") {
              const ownerSlots = isPlayerOwned ? playerSlotsParam : aiSlotsParam;
              const slot = ownerSlots.find((s) => s.card && s.card.id === card.id);
              const isFaceUp = card.type === "special" || (slot ? slot.isRevealed : false);
              if (!isFaceUp) conditionsMet = false;
            }
            if (cond.type === "IsFaceDown") {
              const ownerSlots = isPlayerOwned ? playerSlotsParam : aiSlotsParam;
              const slot = ownerSlots.find((s) => s.card && s.card.id === card.id);
              const isFaceUp = card.type === "special" || (slot ? slot.isRevealed : false);
              if (isFaceUp) conditionsMet = false;
            }
            if (cond.type === "IsAttacker") {
              const isOwnerAttacking = isPlayerOwned === isPlayerAttacker;
              if (!isOwnerAttacking) conditionsMet = false;
            }
            if (cond.type === "IsDefender") {
              const isOwnerDefending = isPlayerOwned !== isPlayerAttacker;
              if (!isOwnerDefending) conditionsMet = false;
            }
            if (cond.type === "CardOwnerIsEnemy") {
              if (isPlayerOwned === isPlayerSide) conditionsMet = false;
            }
            if (cond.type === "IsLegend") {
              if (card.type === "player" && !(card as PlayerCard).isLegend) {
                conditionsMet = false;
              }
            }
            if (cond.type === "HasTag" && cond.value) {
              const valLower = cond.value.toLowerCase();
              const roleMatch = card.type === "player" && (card as PlayerCard).role?.toLowerCase() === valLower;
              const teamMatch = card.type === "player" && (card as PlayerCard).team?.toLowerCase() === valLower;
              const nameMatch = card.name?.toLowerCase().includes(valLower);
              if (!roleMatch && !teamMatch && !nameMatch) conditionsMet = false;
            }
            if (cond.type === "HasAbility") {
              const hasAb = !!(card.ability || (card as any).ability_type || (card as any).abilityType);
              if (!hasAb) conditionsMet = false;
            }
          });
        }

        if (conditionsMet && ability.actions) {
          ability.actions.forEach((act) => {
            const isCurrentAttackTarget = act.target === "CurrentAttack" && isAttackingStage;
            const isCurrentDefenseTarget = act.target === "CurrentDefense" && !isAttackingStage;

            const isTargetSide = (act.target === "Allies" && isPlayerOwned === isPlayerSide) ||
                                 (act.target === "Enemies" && isPlayerOwned !== isPlayerSide) ||
                                 isCurrentAttackTarget ||
                                 isCurrentDefenseTarget ||
                                 (act.target === "Self" && card === src.card && isPlayerOwned === isPlayerSide);

            if (isTargetSide) {
              if (card.type === "player" && act.duration === "Instant" && (act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat")) {
                return;
              }
              if (act.type === "AddStat") {
                if (act.stat === "attack" && isAttackingStage) {
                  modifiers += act.value ?? 0;
                  modifierLogs.push(`   ● قدرة [${card.name}]: +${act.value} قوة هجوم`);
                }
                if (act.stat === "defense" && !isAttackingStage) {
                  modifiers += act.value ?? 0;
                  modifierLogs.push(`   ● قدرة [${card.name}]: +${act.value} قوة دفاع`);
                }
              } else if (act.type === "RemoveStat") {
                if (act.stat === "attack" && isAttackingStage) {
                  modifiers -= act.value ?? 0;
                  modifierLogs.push(`   ● قدرة [${card.name}]: -${act.value} قوة هجوم`);
                }
                if (act.stat === "defense" && !isAttackingStage) {
                  modifiers -= act.value ?? 0;
                  modifierLogs.push(`   ● قدرة [${card.name}]: -${act.value} قوة دفاع`);
                }
              } else if (act.type === "MultiplyStat") {
                if (act.stat === "attack" && isAttackingStage) {
                  multiplier *= act.value ?? 1;
                  multiplierLogs.push(`   ● مضاعفة [${card.name}]: ×${act.value}`);
                }
                if (act.stat === "defense" && !isAttackingStage) {
                  multiplier *= act.value ?? 1;
                  multiplierLogs.push(`   ● مضاعفة [${card.name}]: ×${act.value}`);
                }
              } else if (act.type === "CancelAction" && isAttackingStage) {
                cancelStrongestAttacker = true;
              }
            }
          });
        }
      }
    } else if (card.type === "special") {
      const spec = card as SpecialCard;
      if (isAttackingStage) {
        if (isPlayerOwned === isPlayerAttacker) {
          if (spec.effect === "counter_attack" && isPlayerSide === isPlayerAttacker) {
            modifiers += 4;
            modifierLogs.push(`   ● تكتيك [${spec.name}]: +4 قوة هجمة مرتدة`);
          }
          if (spec.effect === "fans" && isPlayerSide === isPlayerAttacker) {
            modifiers += 3;
            modifierLogs.push(`   ● تكتيك [${spec.name}]: +3 دعم جماهيري`);
          }
        } else {
          if (spec.effect === "wet_pitch" && isPlayerSide === isPlayerAttacker) {
            modifiers -= 4;
            modifierLogs.push(`   ● تكتيك [${spec.name}]: -4 عشب مبلل`);
          }
          if (spec.effect === "offside" && isPlayerSide === isPlayerAttacker) {
            cancelStrongestAttacker = true;
          }
        }
      } else {
        if (isPlayerOwned !== isPlayerAttacker) {
          if (spec.effect === "park_the_bus" && isPlayerSide !== isPlayerAttacker) {
            modifiers += 6;
            modifierLogs.push(`   ● تكتيك [${spec.name}]: +6 ركن الحافلة`);
          }
          if (spec.effect === "fans" && isPlayerSide !== isPlayerAttacker) {
            modifiers += 3;
            modifierLogs.push(`   ● تكتيك [${spec.name}]: +3 دعم جماهيري`);
          }
        }
      }
    }
  });

  let scoreAfterMultiplier = baseScore * multiplier;
  let finalVal = scoreAfterMultiplier + modifiers;

  let cancelledCardText = "";
  if (isAttackingStage && cancelStrongestAttacker) {
    let maxAttStrength = 0;
    let maxCardName = "";
    slots.forEach((s) => {
      if (s.card && s.isRevealed && (s.revealedInAttack || s.confirmedInAttack)) {
        if (s.card.attack > maxAttStrength) {
          maxAttStrength = s.card.attack;
          maxCardName = s.card.name;
        }
      }
    });
    finalVal -= maxAttStrength;
    if (maxCardName) {
      cancelledCardText = `   ● تسلل نشط: إلغاء نقاط أقوى مهاجم [${maxCardName}] (-${maxAttStrength})`;
    }
  }

  const totalVal = Math.max(0, finalVal);

  const lines: string[] = [];
  if (playerList.length > 0) {
    lines.push(...playerList);
  } else {
    lines.push(`   ● لا يوجد لاعبين نشطين (0)`);
  }

  if (boosterVal > 0) {
    lines.push(`   ● كارت المعزز: +${boosterVal} [${boosterText}]`);
  }

  if (multiplierLogs.length > 0) {
    lines.push(...multiplierLogs);
  }

  if (modifierLogs.length > 0) {
    lines.push(...modifierLogs);
  }

  if (cancelledCardText) {
    lines.push(cancelledCardText);
  }

  const detailString = lines.join("\n");

  return {
    total: totalVal,
    breakdown: detailString
  };
}

/**
 * Server-authoritative rules engine for multiplayer combat resolution.
 * Takes explicit states to avoid React state dependency.
 */
export function runRefereeRulesEngine(
  isPlayerSide: boolean, // Side we are calculating for (true = Player, false = AI/Opponent)
  isAttackingStage: boolean, // Is this an attack calculation? (true = Attack, false = Defense)
  attackerIdx: number | null,
  activeBooster: BoosterCard | null,
  playerActiveSpecials: SpecialCard[],
  aiActiveSpecials: SpecialCard[],
  playerSlots: { card: PlayerCard | null; isRevealed: boolean; revealedInAttack?: boolean; confirmedInAttack?: boolean; spent?: boolean }[],
  aiSlots: { card: PlayerCard | null; isRevealed: boolean; revealedInAttack?: boolean; confirmedInAttack?: boolean; spent?: boolean }[],
  isPlayerAttacker: boolean
): number {
  let score = 0;
  const slots = isPlayerSide ? playerSlots : aiSlots;
  
  if (isAttackingStage) {
    // Base attack score: sum of attack of all revealed player cards on the attacking side
    slots.forEach((slot) => {
      if (slot.card && slot.isRevealed && (slot.revealedInAttack || slot.confirmedInAttack)) {
        if (slot.card.frozen || slot.card.stunned) return;
        score += slot.card.attack;
      }
    });
    if (activeBooster && isPlayerSide === isPlayerAttacker) {
      score += activeBooster.value;
    }
  } else {
    // Base defense score: sum of defense of all revealed player cards on the defending side
    slots.forEach((slot) => {
      if (slot.card && slot.isRevealed && (slot.revealedInAttack || slot.confirmedInAttack)) {
        if (slot.card.frozen || slot.card.stunned) return;
        score += slot.card.defense;
      }
    });
  }

  const activeSources: { card: Card; isPlayerOwned: boolean }[] = [];
  
  playerSlots.forEach((slot) => {
    if (slot.card && slot.isRevealed) {
      activeSources.push({ card: slot.card, isPlayerOwned: true });
    }
  });
  aiSlots.forEach((slot) => {
    if (slot.card && slot.isRevealed) {
      activeSources.push({ card: slot.card, isPlayerOwned: false });
    }
  });
  playerActiveSpecials.forEach((spec) => {
    activeSources.push({ card: spec, isPlayerOwned: true });
  });
  aiActiveSpecials.forEach((spec) => {
    activeSources.push({ card: spec, isPlayerOwned: false });
  });

  let attackModifiers = 0;
  let defenseModifiers = 0;
  let attackMultiplier = 1;
  let defenseMultiplier = 1;
  let cancelStrongestAttacker = false;

  activeSources.forEach((src) => {
    const { card, isPlayerOwned } = src;

    const opponentActiveSpecials = isPlayerOwned ? aiActiveSpecials : playerActiveSpecials;
    const opponentSlots = isPlayerOwned ? aiSlots : playerSlots;
    
    const getAbility = (c: any) => c && (c.ability || (c as any).ability_type || (c as any).abilityType);
    const isAbilityBlocked = opponentActiveSpecials.some(c => {
      const a = getAbility(c);
      return a?.actions?.some((act: any) => act.type === "BlockAbility");
    }) || opponentSlots.some(s => {
      const a = s && s.card && s.isRevealed && !s.card.silenced && getAbility(s.card);
      return a?.actions?.some((act: any) => act.type === "BlockAbility");
    });

    const isSilenced = (card as any).silenced || (card as any).abilityBlocked || isAbilityBlocked;
    if (isSilenced) return;

    // 1. Dynamic Ability execution
    const ability = card.ability || (card as any).ability_type || (card as any).abilityType;
    if (ability) {
      // Check triggers
      const triggerMatches = 
        ((ability.trigger === "CardRevealed" || ability.trigger === "CardPlayed") && card.type === "player") || // While active on field
        (ability.trigger === "CardPlayed" && card.type === "special") || // Specials active this turn
        (ability.trigger === "AttackStarted" && isAttackingStage) ||
        (ability.trigger === "DefenseStarted" && !isAttackingStage);

      if (triggerMatches) {
        // Evaluate conditions
        let conditionsMet = true;
        if (ability.conditions) {
          ability.conditions.forEach((cond) => {
            if (cond.type === "IsFaceUp") {
              const ownerSlots = isPlayerOwned ? playerSlots : aiSlots;
              const slot = ownerSlots.find((s) => s.card && s.card.id === card.id);
              const isFaceUp = card.type === "special" || (slot ? slot.isRevealed : false);
              if (!isFaceUp) conditionsMet = false;
            }
            if (cond.type === "IsFaceDown") {
              const ownerSlots = isPlayerOwned ? playerSlots : aiSlots;
              const slot = ownerSlots.find((s) => s.card && s.card.id === card.id);
              const isFaceUp = card.type === "special" || (slot ? slot.isRevealed : false);
              if (isFaceUp) conditionsMet = false;
            }
            if (cond.type === "IsAttacker") {
              const isOwnerAttacking = isPlayerOwned === isPlayerAttacker;
              if (!isOwnerAttacking) conditionsMet = false;
            }
            if (cond.type === "IsDefender") {
              const isOwnerDefending = isPlayerOwned !== isPlayerAttacker;
              if (!isOwnerDefending) conditionsMet = false;
            }
            if (cond.type === "CardOwnerIsEnemy") {
              if (isPlayerOwned === isPlayerSide) conditionsMet = false;
            }
            if (cond.type === "IsLegend") {
              if (card.type === "player" && !(card as PlayerCard).isLegend) {
                conditionsMet = false;
              }
            }
            if (cond.type === "HasTag" && cond.value) {
              const valLower = cond.value.toLowerCase();
              const roleMatch = card.type === "player" && (card as PlayerCard).role?.toLowerCase() === valLower;
              const teamMatch = card.type === "player" && (card as PlayerCard).team?.toLowerCase() === valLower;
              const nameMatch = card.name?.toLowerCase().includes(valLower);
              if (!roleMatch && !teamMatch && !nameMatch) conditionsMet = false;
            }
            if (cond.type === "HasAbility") {
              const hasAb = !!(card.ability || (card as any).ability_type || (card as any).abilityType);
              if (!hasAb) conditionsMet = false;
            }
          });
        }

        if (conditionsMet && ability.actions) {
          ability.actions.forEach((act) => {
            const isTargetSide = (act.target === "Allies" && isPlayerOwned === isPlayerSide) ||
                                 (act.target === "Enemies" && isPlayerOwned !== isPlayerSide) ||
                                 (act.target === "CurrentAttack" && isAttackingStage) ||
                                 (act.target === "CurrentDefense" && !isAttackingStage) ||
                                 (act.target === "Self" && card === src.card && isPlayerOwned === isPlayerSide);

            if (isTargetSide) {
              if (card.type === "player" && act.duration === "Instant" && (act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat")) {
                return;
              }
              if (act.type === "AddStat") {
                if (act.stat === "attack" && isAttackingStage) {
                  attackModifiers += act.value ?? 0;
                }
                if (act.stat === "defense" && !isAttackingStage) {
                  defenseModifiers += act.value ?? 0;
                }
              } else if (act.type === "RemoveStat") {
                if (act.stat === "attack" && isAttackingStage) {
                  attackModifiers -= act.value ?? 0;
                }
                if (act.stat === "defense" && !isAttackingStage) {
                  defenseModifiers -= act.value ?? 0;
                }
              } else if (act.type === "MultiplyStat") {
                if (act.stat === "attack" && isAttackingStage) {
                  attackMultiplier *= act.value ?? 1;
                }
                if (act.stat === "defense" && !isAttackingStage) {
                  defenseMultiplier *= act.value ?? 1;
                }
              } else if (act.type === "CancelAction" && isAttackingStage) {
                cancelStrongestAttacker = true;
              }
            }
          });
        }
      }
    } else if (card.type === "special") {
      // 2. Fallback to hardcoded special card behaviors
      const spec = card as SpecialCard;
      if (isAttackingStage) {
        if (isPlayerOwned === isPlayerAttacker) {
          if (spec.effect === "counter_attack" && isPlayerSide === isPlayerAttacker) {
            attackModifiers += 4;
          }
          if (spec.effect === "fans" && isPlayerSide === isPlayerAttacker) {
            attackModifiers += 3;
          }
        } else {
          if (spec.effect === "wet_pitch" && isPlayerSide === isPlayerAttacker) {
            attackModifiers -= 4;
          }
          if (spec.effect === "offside" && isPlayerSide === isPlayerAttacker) {
            cancelStrongestAttacker = true;
          }
        }
      } else {
        if (isPlayerOwned !== isPlayerAttacker) {
          if (spec.effect === "park_the_bus" && isPlayerSide !== isPlayerAttacker) {
            defenseModifiers += 6;
          }
          if (spec.effect === "fans" && isPlayerSide !== isPlayerAttacker) {
            defenseModifiers += 3;
          }
        }
      }
    }
  });

  if (isAttackingStage) {
    let finalAttack = (score * attackMultiplier) + attackModifiers;
    if (cancelStrongestAttacker) {
      let maxAttStrength = 0;
      slots.forEach((s) => {
        if (s.card && s.isRevealed && (s.revealedInAttack || s.confirmedInAttack)) {
          maxAttStrength = Math.max(maxAttStrength, s.card.attack);
        }
      });
      finalAttack -= maxAttStrength;
    }
    return Math.max(0, finalAttack);
  } else {
    return Math.max(0, (score * defenseMultiplier) + defenseModifiers);
  }
}

export function recycleCard(gs: any, card: any, isHost: boolean) {
  executeCardInstantEffects(gs, card, isHost ? 'host' : 'opponent', "CardDestroyed", "", "");

  const cleaned = {
    ...card,
    id: `recycled_${card.id.split('_')[0] || 'card'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    frozen: false,
    stunned: false,
    silenced: false,
    frozenTurnsLeft: undefined,
    stunnedTurnsLeft: undefined,
    silencedTurnsLeft: undefined,
    abilityUses: 0
  };

  if (isHost) {
    if (gs.host_deck) {
      gs.host_deck.push(cleaned);
    } else {
      if (!gs.shared_player_deck) {
        gs.shared_player_deck = [];
      }
      gs.shared_player_deck.push(cleaned);
    }
  } else {
    if (gs.opponent_deck) {
      gs.opponent_deck.push(cleaned);
    } else {
      if (!gs.shared_player_deck) {
        gs.shared_player_deck = [];
      }
      gs.shared_player_deck.push(cleaned);
    }
  }
}

export function executeCardInstantEffects(
  gs: any,
  card: any,
  role: 'host' | 'opponent',
  trigger: string,
  hostName: string,
  opponentName: string
) {
  if (!card || !card.ability) return;
  if (card.ability.trigger !== trigger) return;

  const isHost = role === 'host';
  const ownerName = isHost ? hostName : opponentName;
  const enemyName = isHost ? opponentName : hostName;

  const opponentActiveSpecials = isHost ? (gs.active_specials_opponent || []) : (gs.active_specials_host || []);
  const opponentSlots = isHost ? (gs.opponent_slots || []) : (gs.host_slots || []);

  const isAbilityBlocked = opponentActiveSpecials.some((c: any) => c.ability?.actions?.some((a: any) => a.type === "BlockAbility")) ||
                            opponentSlots.some((s: any) => s && s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions?.some((a: any) => a.type === "BlockAbility"));

  const isSilenced = card.silenced || card.abilityBlocked || isAbilityBlocked;
  if (isSilenced) return;

  const maxUses = card.ability.maxUses || 1;
  const currentUses = card.abilityUses || 0;
  if (currentUses >= maxUses) return;

  // Evaluate conditions
  let conditionsMet = true;
  if (card.ability.conditions) {
    const ownerSlots = isHost ? (gs.host_slots || []) : (gs.opponent_slots || []);
    const isPlayerAttacker = gs.attacker_role === 'host';
    const isOwnerAttacking = isHost === isPlayerAttacker;

    card.ability.conditions.forEach((cond: any) => {
      if (cond.type === "IsFaceUp") {
        const slot = ownerSlots.find((s: any) => s && s.card && s.card.id === card.id);
        const isFaceUp = card.type === "special" || (slot ? !!slot.isRevealed : false);
        if (!isFaceUp) conditionsMet = false;
      }
      if (cond.type === "IsFaceDown") {
        const slot = ownerSlots.find((s: any) => s && s.card && s.card.id === card.id);
        const isFaceUp = card.type === "special" || (slot ? !!slot.isRevealed : false);
        if (isFaceUp) conditionsMet = false;
      }
      if (cond.type === "IsAttacker") {
        if (!isOwnerAttacking) conditionsMet = false;
      }
      if (cond.type === "IsDefender") {
        if (isOwnerAttacking) conditionsMet = false;
      }
      if (cond.type === "CardOwnerIsEnemy") {
        if (isHost === isPlayerAttacker) conditionsMet = false;
      }
      if (cond.type === "IsLegend") {
        if (card.type === "player" && !card.isLegend) {
          conditionsMet = false;
        }
      }
      if (cond.type === "HasTag" && cond.value) {
        const valLower = cond.value.toLowerCase();
        const roleMatch = card.type === "player" && card.role?.toLowerCase() === valLower;
        const teamMatch = card.type === "player" && card.team?.toLowerCase() === valLower;
        const nameMatch = card.name?.toLowerCase().includes(valLower);
        if (!roleMatch && !teamMatch && !nameMatch) conditionsMet = false;
      }
      if (cond.type === "HasAbility") {
        const hasAb = !!(card.ability || card.ability_type || card.abilityType);
        if (!hasAb) conditionsMet = false;
      }
    });
  }
  if (!conditionsMet) return;

  // Execute actions
  let movesAdded = 0;
  let cardsDrawn = 0;

  card.ability.actions.forEach((act: any) => {
    const val = act.value || 0;

    // 1. Add / Remove Moves
    if (act.type === "AddMoves") {
      if (isHost) {
        gs.host_moves = (gs.host_moves || 0) + val;
      } else {
        gs.opponent_moves = (gs.opponent_moves || 0) + val;
      }
      movesAdded += val;
    } else if (act.type === "ReduceMoves") {
      if (isHost) {
        gs.opponent_moves = Math.max(0, (gs.opponent_moves || 0) - val);
      } else {
        gs.host_moves = Math.max(0, (gs.host_moves || 0) - val);
      }
      if (!gs.logs) gs.logs = [];
      pushRulesEngineLog(gs, `📉 قدرة [ ${card.name} ]: تم تقليص حركات الخصم بـ -${val}!`, isHost ? "success" : "danger", isHost);
    }

    // 2. Draw Cards
    else if (act.type === "DrawCard") {
      cardsDrawn += val;
    }

    // 3. Stat Modification Actions
    else if (act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat") {
      if (act.stat === "attack" || act.stat === "defense") {
        if (act.duration === "Instant") {
          const modifyStats = (c: any, targetSideHost: boolean) => {
            if (!c) return c;
            const isTarget = (act.target === "Self" && c.id === card.id) ||
                             (act.target === "Allies" && isHost === targetSideHost) ||
                             (act.target === "Enemies" && isHost !== targetSideHost) ||
                             (act.target === "All");
            if (!isTarget) return c;

            const nextCard = { ...c };
            if (act.stat === "attack") {
              if (act.type === "AddStat") nextCard.attack += val;
              if (act.type === "RemoveStat") nextCard.attack = Math.max(0, nextCard.attack - val);
              if (act.type === "MultiplyStat") nextCard.attack *= val;
            } else {
              if (act.type === "AddStat") nextCard.defense += val;
              if (act.type === "RemoveStat") nextCard.defense = Math.max(0, nextCard.defense - val);
              if (act.type === "MultiplyStat") nextCard.defense *= val;
            }
            return nextCard;
          };

          gs.host_slots = (gs.host_slots || []).map((s: any) => s?.card ? { ...s, card: modifyStats(s.card, true) } : s);
          gs.opponent_slots = (gs.opponent_slots || []).map((s: any) => s?.card ? { ...s, card: modifyStats(s.card, false) } : s);
          if (!gs.logs) gs.logs = [];
          pushRulesEngineLog(gs, `⚡ تعديل طاقات: تم تعديل طاقة [ ${act.stat === "attack" ? "الهجوم" : "الدفاع"} ] للكروت المستهدفة بفعل [ ${card.name} ]!`, isHost ? "success" : "danger", isHost);
        }
      } else if (act.stat === "moves") {
        const isTargetHost = (act.target === "Self" && isHost) ||
                             (act.target === "Allies" && isHost) ||
                             (act.target === "Enemies" && !isHost) ||
                             (act.target === "All");

        const isTargetOpponent = (act.target === "Self" && !isHost) ||
                                 (act.target === "Allies" && !isHost) ||
                                 (act.target === "Enemies" && isHost) ||
                                 (act.target === "All");

        if (act.type === "AddStat") {
          if (isTargetHost) gs.host_moves = (gs.host_moves || 0) + val;
          if (isTargetOpponent) gs.opponent_moves = (gs.opponent_moves || 0) + val;
        } else if (act.type === "RemoveStat") {
          if (isTargetHost) gs.host_moves = Math.max(0, (gs.host_moves || 0) - val);
          if (isTargetOpponent) gs.opponent_moves = Math.max(0, (gs.opponent_moves || 0) - val);
        }
      } else if (act.stat === "draw") {
        if (act.type === "AddStat") {
          cardsDrawn += val;
        }
      }
    }

    // 4. Steal Card
    else if (act.type === "StealCard") {
      const ownerHand = isHost ? gs.host_hand : gs.opponent_hand;
      const enemyHand = isHost ? gs.opponent_hand : gs.host_hand;

      if (enemyHand && enemyHand.length > 0) {
        const randIdx = Math.floor(Math.random() * enemyHand.length);
        const stolenCard = enemyHand[randIdx];
        ownerHand.push(stolenCard);
        
        if (isHost) {
          gs.host_hand = ownerHand;
          gs.opponent_hand = enemyHand.filter((_: any, idx: number) => idx !== randIdx);
        } else {
          gs.opponent_hand = ownerHand;
          gs.host_hand = enemyHand.filter((_: any, idx: number) => idx !== randIdx);
        }

        if (!gs.logs) gs.logs = [];
        pushRulesEngineLog(gs, `💸 سرقة: [ ${ownerName} ] قام بسرقة كارت من يد [ ${enemyName} ]!`, isHost ? "success" : "danger", isHost);
      }
    }

    // 5. Copy Card
    else if (act.type === "CopyCard") {
      let bestCard: any = null;
      let maxStats = -1;
      const allSlots = [...(gs.host_slots || []), ...(gs.opponent_slots || [])];
      allSlots.forEach((s: any) => {
        if (s && s.card && s.card.id !== card.id && (s.card.attack + s.card.defense) > maxStats) {
          maxStats = s.card.attack + s.card.defense;
          bestCard = s.card;
        }
      });
      if (bestCard) {
        const copyFrom = bestCard;
        const copyStats = (c: any) => {
          if (c && c.id === card.id) {
            return {
              ...c,
              attack: copyFrom.attack,
              defense: copyFrom.defense,
              ability: copyFrom.ability
            };
          }
          return c;
        };
        gs.host_slots = (gs.host_slots || []).map((s: any) => s?.card ? { ...s, card: copyStats(s.card) } : s);
        gs.opponent_slots = (gs.opponent_slots || []).map((s: any) => s?.card ? { ...s, card: copyStats(s.card) } : s);
        if (!gs.logs) gs.logs = [];
        pushRulesEngineLog(gs, `👥 قدرة الكارت: نسخ الكارت [ ${card.name} ] طاقات وقدرات [ ${bestCard.name} ]!`, isHost ? "success" : "danger", isHost);
      }
    }

    // 6. Swap Card
    else if (act.type === "SwapCard") {
      const slots = isHost ? gs.host_slots : gs.opponent_slots;
      if (slots) {
        const occupiedIndices = slots.map((s: any, i: number) => s && s.card ? i : -1).filter((i: number) => i !== -1);
        if (occupiedIndices.length >= 2) {
          const i1 = occupiedIndices[0];
          const i2 = occupiedIndices[Math.floor(Math.random() * (occupiedIndices.length - 1)) + 1];
          const temp = slots[i1].card;
          slots[i1] = { ...slots[i1], card: slots[i2].card };
          slots[i2] = { ...slots[i2], card: temp };
        }
        if (!gs.logs) gs.logs = [];
        pushRulesEngineLog(gs, `🔄 قدرة [ ${card.name} ]: تم تبديل مراكز اللاعبين بالملعب بشكل عشوائي!`, isHost ? "success" : "danger", isHost);
      }
    }

    // 7. Reveal / Hide Card
    else if (act.type === "RevealCard") {
      const turnCount = gs.turn_count || 1;
      const revealSlot = (s: any, isAlly: boolean) => {
        if (s && s.card) {
          const shouldReveal = (act.target === "Self" && s.card.id === card.id) ||
                              (act.target === "Allies" && isAlly) ||
                              (act.target === "Enemies" && !isAlly);
          if (shouldReveal && !s.isRevealed) {
            s.isRevealed = true;
            s.revealedInTurn = turnCount;
            s.revealedByAbility = true;
            executeCardInstantEffects(gs, s.card, isAlly ? role : (isHost ? 'opponent' : 'host'), "CardRevealed", hostName, opponentName);
            executeCardInstantEffects(gs, s.card, isAlly ? role : (isHost ? 'opponent' : 'host'), "CardPlayed", hostName, opponentName);
          }
        }
        return s;
      };
      gs.host_slots = (gs.host_slots || []).map((s: any) => revealSlot(s, isHost));
      gs.opponent_slots = (gs.opponent_slots || []).map((s: any) => revealSlot(s, !isHost));
    } else if (act.type === "HideCard") {
      const hideSlot = (s: any, isAlly: boolean) => {
        if (s && s.card) {
          const shouldHide = (act.target === "Self" && s.card.id === card.id) ||
                            (act.target === "Allies" && isAlly) ||
                            (act.target === "Enemies" && !isAlly);
          if (shouldHide) {
            s.isRevealed = false;
            s.revealedByAbility = false;
          }
        }
        return s;
      };
      gs.host_slots = (gs.host_slots || []).map((s: any) => hideSlot(s, isHost));
      gs.opponent_slots = (gs.opponent_slots || []).map((s: any) => hideSlot(s, !isHost));
    }

    // 8. Freeze, Silence, Stun, Destroy Status Actions
    else if (act.type === "FreezeCard" || act.type === "SilenceCard" || act.type === "StunCard" || act.type === "DestroyCard") {
      const durationTurns = act.durationTurns || 2;
      const modifyStatus = (s: any, targetSideHost: boolean) => {
        if (!s || !s.card) return s;
        const c = s.card;
        const isTarget = (act.target === "Self" && c.id === card.id) ||
                         (act.target === "Allies" && isHost === targetSideHost) ||
                         (act.target === "Enemies" && isHost !== targetSideHost) ||
                         (act.target === "All");
        if (!isTarget) return s;

        if (act.type === "FreezeCard") {
          c.frozen = true;
          c.frozenTurnsLeft = durationTurns;
        } else if (act.type === "SilenceCard") {
          c.silenced = true;
          c.silencedTurnsLeft = durationTurns;
        } else if (act.type === "StunCard") {
          c.stunned = true;
          c.stunnedTurnsLeft = durationTurns;
        } else if (act.type === "DestroyCard") {
          recycleCard(gs, c, targetSideHost);
          return { card: null, isRevealed: false };
        }
        return { ...s, card: c };
      };

      gs.host_slots = (gs.host_slots || []).map((s: any) => modifyStatus(s, true));
      gs.opponent_slots = (gs.opponent_slots || []).map((s: any) => modifyStatus(s, false));
      if (!gs.logs) gs.logs = [];
      pushRulesEngineLog(gs, `⚡ تطبيق تأثير [ ${act.type} ] على الكروت المستهدفة بالملعب!`, isHost ? "success" : "danger", isHost);
    }
  });

  if (movesAdded > 0) {
    if (!gs.logs) gs.logs = [];
    pushRulesEngineLog(gs, `⚡ قدرة الأسطورة [ ${card.name} ] : تم إضافة +${movesAdded} حركات تكتيكية!`, isHost ? "success" : "danger", isHost);
  }

  // Draw cards if any requested by DrawCard
  if (cardsDrawn > 0) {
    // If client offline opponent (AI) automatic draw
    if (!isHost && gs.opponent_deck && gs.opponent_hand) {
      let currentOppDeck = [...(gs.opponent_deck || [])];
      let currentSpecDeck = [...(gs.special_deck || [])];
      const added: any[] = [];
      
      for (let i = 0; i < cardsDrawn; i++) {
        const drawType = i % 2 === 0 ? "player" : "special";
        if (drawType === "player" && currentOppDeck.length > 0) {
          added.push(currentOppDeck[0]);
          currentOppDeck = currentOppDeck.slice(1);
        } else if (currentSpecDeck.length > 0) {
          added.push(currentSpecDeck[0]);
          currentSpecDeck = currentSpecDeck.slice(1);
        } else if (currentOppDeck.length > 0) {
          added.push(currentOppDeck[0]);
          currentOppDeck = currentOppDeck.slice(1);
        }
      }
      
      if (added.length > 0) {
        gs.opponent_deck = currentOppDeck;
        gs.special_deck = currentSpecDeck;
        gs.opponent_hand = [...(gs.opponent_hand || []), ...added];
        
        if (!gs.logs) gs.logs = [];
        pushRulesEngineLog(gs, `⚡ قدرة الأسطورة [ ${card.name} ] (الخصم): قام الخصم بسحب عدد ${added.length} كروت تلقائياً ليده!`, "danger", isHost);
      }
    } else {
      gs.extra_draws_limit = (gs.extra_draws_limit || 0) + cardsDrawn;
      if (!gs.logs) gs.logs = [];
      pushRulesEngineLog(gs, `⚡ قدرة الأسطورة [ ${card.name} ]: تم زيادة فرصة السحب المتاحة لـ [ ${ownerName} ] بمقدار +${cardsDrawn} كروت إضافية اختيارياً! يمكنه سحبها الآن من المجموعات.`, isHost ? "success" : "danger", isHost);
    }
  }

  card.abilityUses = (card.abilityUses || 0) + 1;
}

