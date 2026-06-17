import { CardAbility, CardAbilityAction, CardAbilityCondition } from "../types";

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
