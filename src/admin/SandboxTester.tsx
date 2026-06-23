import React, { useState, useEffect } from "react";
import { CardAbility, CardAbilityAction, CardAbilityCondition, CardAbilityTriggerType } from "../types";
import { GameToast } from "../components/GameDialog";
import { AnimatePresence } from "motion/react";
import {
  calculatePowerScore,
  explainAbility,
  validateAbility,
  VALID_TRIGGERS,
  VALID_CONDITIONS,
  VALID_ACTIONS,
  VALID_TARGETS,
  VALID_DURATIONS,
} from "../utils/rulesEngine";
import {
  getPackages,
  createCardInPackage,
  createSpecialCardInPackage,
  saveCardLocally,
  saveSpecialCardLocally,
} from "./adminStore";
import { isSupabaseConfigured } from "../lib/supabase";

// Translate key-value maps for friendly Arabic displays
const TRIGGER_ARABIC: Record<string, string> = {
  CardPlayed: "عند لعب الكارت أو تفعيل التكتيك",
  CardRevealed: "عند كشف الكارت في الملعب",
  AttackStarted: "عند بدء هجمة للفريق",
  DefenseStarted: "عند بدء صد وهجوم مضاد",
  GoalScored: "عند تسجيل هدف بالمباراة",
  TurnStarted: "عند بداية دور اللعب",
  TurnEnded: "عند نهاية دور اللعب",
  CardDestroyed: "عند طرد/استبعاد كارت لاعب",
};

const CONDITION_ARABIC: Record<string, string> = {
  IsFaceUp: "الكارت مكشوف وجهاً لأعلى",
  IsFaceDown: "الكارت مقلوب وجهاً لأسفل",
  IsLegend: "الكارت للاعب أسطوري",
  IsAttacker: "الكارت بوضع هجوم حالياً",
  IsDefender: "الكارت بوضع دفاع حالياً",
  CardOwnerIsEnemy: "الكارت يخص الخصم المنافس",
  HasTag: "يمتلك وسماً/تاغ معين",
  HasAbility: "يمتلك قدرة خاصة مفعلة",
};

const ACTION_ARABIC: Record<string, string> = {
  AddStat: "إضافة نقاط طاقة",
  RemoveStat: "خصم نقاط طاقة",
  MultiplyStat: "مضاعفة نقاط طاقة",
  DestroyCard: "طرد واستبعاد الكارت 🟥",
  DrawCard: "سحب كروت إضافية لليد",
  RevealCard: "كشف الكارت مقلوباً",
  HideCard: "إخفاء وقلب الكارت لأسفل",
  SwapCard: "تبديل مراكز الكارت",
  StealCard: "سرقة كارت من يد الخصم",
  CopyCard: "نسخ طاقة/قدرة كارت آخر",
  FreezeCard: "تجميد الكارت بالكامل ❄️",
  SilenceCard: "كتم الكارت وتعطيل قدرته 🔇",
  StunCard: "صعق وشل حركة الكارت 💫",
  AddMoves: "زيادة الحركات التكتيكية",
  ReduceMoves: "تقليص الحركات التكتيكية",
  CancelAction: "إلغاء وإبطال حركة الخصم تماماً 🚫",
  ReturnToHand: "إعادة الكارت ليد مالكه",
};

const TARGET_ARABIC: Record<string, string> = {
  Self: "نفس الكارت الحالي",
  Allies: "جميع كروت الحلفاء بالملعب",
  Enemies: "جميع كروت الخصم بالملعب",
  SelectedCard: "كارت حليف يتم اختياره يدوياً",
  SelectedEnemy: "كارت خصم يتم اختياره يدوياً",
  CurrentAttack: "الهجمة الحالية النشطة",
  CurrentDefense: "الدفاع الحالي النشط",
  All: "جميع كروت الفريقين بالملعب",
};

const DURATION_ARABIC: Record<string, string> = {
  Instant: "لحظي فور الاستخدام",
  CurrentPhase: "حتى نهاية الهجمة الحالية",
  CurrentTurn: "حتى نهاية الدور الحالي",
  NextTurn: "حتى نهاية الدور القادم",
  XTurns: "لعدد محدد من الأدوار",
  WhileFaceUp: "طالما الكارت مكشوفاً بالملعب",
  WhileAlive: "طالما الكارت بالملعب ولم يُطرد",
  UntilTrigger: "حتى حدوث حدث معين",
};

interface SimulatorSlot {
  id: string;
  card: {
    name: string;
    attack: number;
    defense: number;
    role: "attacker" | "defender" | "midfielder" | "goalkeeper";
    avatar: string;
    isLegend: boolean;
    ability?: CardAbility;
    isCustom?: boolean;
  } | null;
  isRevealed: boolean;
  isFrozen: boolean;
  isSilenced: boolean;
  isStunned: boolean;
  bonusAttack: number;
  bonusDefense: number;
}

export default function SandboxTester() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [editMode, setEditMode] = useState<"visual" | "json" | "help">("visual");
  const [rawJson, setRawJson] = useState<string>(
    JSON.stringify(
      {
        trigger: "CardRevealed",
        conditions: [{ type: "IsFaceUp" }],
        actions: [
          {
            type: "AddStat",
            stat: "attack",
            value: 2,
            target: "Allies",
            duration: "WhileFaceUp",
            stackable: true,
          },
        ],
      },
      null,
      2
    )
  );

  // Card stats for Power Score calculation
  const [mockAttack, setMockAttack] = useState<number>(8);
  const [mockDefense, setMockDefense] = useState<number>(4);
  const [mockIsLegend, setMockIsLegend] = useState<boolean>(false);

  // Visual Form state
  const [trigger, setTrigger] = useState<string>("CardRevealed");
  const [conditions, setConditions] = useState<CardAbilityCondition[]>([
    { type: "IsFaceUp" },
  ]);
  const [actions, setActions] = useState<CardAbilityAction[]>([
    { type: "AddStat", stat: "attack", value: 2, target: "Allies", duration: "WhileFaceUp", stackable: true },
  ]);

  // Validation Result
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    details?: string[];
  }>({
    isValid: true,
    message: "✓ القدرة صالحة ومطابقة لمحرك قواعد مرتدة",
    details: [
      "الحدث المسبب: عند كشف الكارت في الملعب",
      "شروط التفعيل: يجب أن يكون الكارت مكشوفاً",
      "إجراء 1: إضافة +2 لطاقة الهجوم لـ جميع كروت الحلفاء بالملعب طالما بقي الكارت مكشوفاً بالملعب",
    ],
  });

  // Package Management & Direct Save States
  const [supabaseActive, setSupabaseActive] = useState<boolean>(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [saveType, setSaveType] = useState<"player" | "special">("player");
  const [saveName, setSaveName] = useState<string>("");
  const [saveRole, setSaveRole] = useState<"attacker" | "midfielder" | "defender" | "goalkeeper">("attacker");
  const [saveAvatar, setSaveAvatar] = useState<string>("⚡");
  const [saveTeam, setSaveTeam] = useState<string>("");
  const [saveDescription, setSaveDescription] = useState<string>("");
  const [saveArabicEffect, setSaveArabicEffect] = useState<string>("");
  const [selectedPkgId, setSelectedPkgId] = useState<string>("");

  // Simulator Pitch States
  const [simSlotsPlayer, setSimSlotsPlayer] = useState<SimulatorSlot[]>(
    Array.from({ length: 5 }, (_, i) => ({
      id: `p_sim_${i}`,
      card: null,
      isRevealed: false,
      isFrozen: false,
      isSilenced: false,
      isStunned: false,
      bonusAttack: 0,
      bonusDefense: 0,
    }))
  );

  const [simSlotsOpponent, setSimSlotsOpponent] = useState<SimulatorSlot[]>(
    Array.from({ length: 5 }, (_, i) => ({
      id: `o_sim_${i}`,
      card: null,
      isRevealed: false,
      isFrozen: false,
      isSilenced: false,
      isStunned: false,
      bonusAttack: 0,
      bonusDefense: 0,
    }))
  );

  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simPhase, setSimPhase] = useState<"setup" | "attack" | "defense">("setup");
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<{ index: number; isAi: boolean } | null>(null);
  const [manualPlayerSlotIdx, setManualPlayerSlotIdx] = useState<number | null>(null);
  const [manualOpponentSlotIdx, setManualOpponentSlotIdx] = useState<number | null>(null);
  const [clashMode, setClashMode] = useState<"attack" | "defense">("attack");

  // States for spawning custom card in slot on-the-fly
  const [customSpawnName, setCustomSpawnName] = useState<string>("");
  const [customSpawnAttack, setCustomSpawnAttack] = useState<number>(8);
  const [customSpawnDefense, setCustomSpawnDefense] = useState<number>(5);
  const [customSpawnIsLegend, setCustomSpawnIsLegend] = useState<boolean>(false);
  const [customSpawnRole, setCustomSpawnRole] = useState<"attacker" | "midfielder" | "defender" | "goalkeeper">("attacker");
  const [customSpawnAttachAbility, setCustomSpawnAttachAbility] = useState<boolean>(true);

  // Active Duel matchup state
  const [activeDuel, setActiveDuel] = useState<{
    playerName: string;
    playerBase: number;
    playerBonus: number;
    playerTotal: number;
    playerIsLegend: boolean;
    playerAvatar: string;
    opponentName: string;
    opponentBase: number;
    opponentBonus: number;
    opponentTotal: number;
    opponentIsLegend: boolean;
    opponentAvatar: string;
    clashMode: "attack" | "defense";
    winner: "player" | "opponent" | "draw";
    mathExplanation: string;
  } | null>(null);

  useEffect(() => {
    const active = isSupabaseConfigured;
    setSupabaseActive(active);
    if (active) {
      getPackages()
        .then((pkgs) => {
          setPackages(pkgs);
          if (pkgs.length > 0) {
            setSelectedPkgId(pkgs[0].id);
          }
        })
        .catch(console.error);
    }
  }, []);

  const getAbilityObject = (): CardAbility => {
    if (editMode === "json") {
      try {
        return JSON.parse(rawJson);
      } catch (e) {
        return { trigger: trigger as any, conditions, actions };
      }
    }
    return { trigger: trigger as any, conditions, actions };
  };

  const handleValidate = (abilityObj: CardAbility) => {
    const check = validateAbility(abilityObj);
    if (check.isValid) {
      const arabicDetails = explainAbility(abilityObj);
      setValidationResult({
        isValid: true,
        message: "✓ القدرة صالحة ومطابقة لمحرك قواعد مرتدة",
        details: arabicDetails,
      });
    } else {
      setValidationResult({
        isValid: false,
        message: `✗ خطأ في القواعد: ${check.message}`,
      });
    }
  };

  const handleTestJson = () => {
    try {
      const obj = JSON.parse(rawJson);
      handleValidate(obj);
      setTrigger(obj.trigger || "CardRevealed");
      setConditions(obj.conditions || []);
      setActions(obj.actions || []);
    } catch (e: any) {
      setValidationResult({
        isValid: false,
        message: `فشل التحقق: كود JSON غير صالح! خطأ في القراءة: ${e.message}`,
      });
    }
  };

  const syncVisualToJson = (newTrigger: string, newConditions: any[], newActions: any[]) => {
    const obj: CardAbility = {
      trigger: newTrigger as CardAbilityTriggerType,
      conditions: newConditions,
      actions: newActions,
    };
    const str = JSON.stringify(obj, null, 2);
    setRawJson(str);
    handleValidate(obj);
  };

  const handleAddCondition = () => {
    // Avoid duplicates or overlap
    const hasFaceUp = conditions.some((c) => c.type === "IsFaceUp");
    const hasFaceDown = conditions.some((c) => c.type === "IsFaceDown");
    const nextType = hasFaceUp ? "IsLegend" : "IsFaceUp";
    
    const next = [...conditions, { type: nextType } as CardAbilityCondition];
    setConditions(next);
    syncVisualToJson(trigger, next, actions);
  };

  const handleRemoveCondition = (idx: number) => {
    const next = conditions.filter((_, i) => i !== idx);
    setConditions(next);
    syncVisualToJson(trigger, next, actions);
  };

  const handleUpdateCondition = (idx: number, key: string, val: string) => {
    const next = [...conditions];
    next[idx] = { ...next[idx], [key]: val };
    setConditions(next);
    syncVisualToJson(trigger, next, actions);
  };

  const handleAddAction = () => {
    const next = [
      ...actions,
      { type: "AddStat", stat: "attack", value: 2, target: "Allies", duration: "Instant", stackable: true } as CardAbilityAction,
    ];
    setActions(next);
    syncVisualToJson(trigger, conditions, next);
  };

  const handleRemoveAction = (idx: number) => {
    const next = actions.filter((_, i) => i !== idx);
    setActions(next);
    syncVisualToJson(trigger, conditions, next);
  };

  const handleUpdateAction = (idx: number, key: string, val: any) => {
    const next = [...actions];
    next[idx] = { ...next[idx], [key]: val };
    setActions(next);
    syncVisualToJson(trigger, conditions, next);
  };

  // Detailed friendly Arabic narration generator
  const generateArabicNarration = (ability: CardAbility): string => {
    if (!ability) return "لا توجد قدرة محددة حالياً.";

    const triggerMap: Record<string, string> = {
      CardPlayed: "يتم لعب الكارت أو تفعيل التكتيك",
      CardRevealed: "يتم كشف الكارت وجهاً لأعلى في الملعب",
      AttackStarted: "تبدأ هجمة جديدة للفريق",
      DefenseStarted: "يبدأ الخصم بالهجوم ونقوم بصد دفاعي",
      GoalScored: "يتم تسجيل هدف بالمباراة",
      TurnStarted: "يبدأ دور لعب جديد",
      TurnEnded: "ينتهي دور اللعب الحالي",
      CardDestroyed: "يتم طرد أو استبعاد كارت لاعب من الملعب",
    };

    const condMap: Record<string, string> = {
      IsFaceUp: "يكون الكارت مكشوفاً بالملعب وجهاً لأعلى",
      IsFaceDown: "يكون الكارت مقلوباً ومخفياً وجهاً لأسفل",
      IsLegend: "يكون الكارت للاعب أسطوري",
      IsAttacker: "يكون الكارت بوضعية هجوم حالياً",
      IsDefender: "يكون الكارت بوضعية دفاع حالياً",
      CardOwnerIsEnemy: "يكون الكارت ملكاً للخصم المنافس",
      HasTag: "يمتلك الكارت وسماً/تاغ معين",
      HasAbility: "يمتلك الكارت قدرة خاصة نشطة",
    };

    const targetMap: Record<string, string> = {
      Self: "نفسه (هذا الكارت)",
      Allies: "جميع كروت زملائه الحلفاء بالملعب",
      Enemies: "جميع كروت الخصم المتواجدة بالملعب",
      SelectedCard: "كارت حليف يتم اختياره يدوياً بالملعب",
      SelectedEnemy: "كارت لاعب للخصم يتم اختياره يدوياً",
      CurrentAttack: "الهجمة الحالية النشطة",
      CurrentDefense: "الدفاع الحالي النشط",
      All: "جميع كروت اللاعبين للفريقين بالملعب",
    };

    const statMap: Record<string, string> = {
      attack: "الهجوم",
      defense: "الدفاع",
      moves: "الحركات التكتيكية",
      draw: "سحب الكروت",
    };

    const durationMap: Record<string, string> = {
      Instant: "لحظياً وبلحظتها",
      CurrentPhase: "حتى نهاية الهجمة الجارية فقط",
      CurrentTurn: "حتى نهاية الدور الحالي",
      NextTurn: "حتى نهاية الدور القادم",
      XTurns: "لأدوار محددة",
      WhileFaceUp: "طالما بقي الكارت مكشوفاً بالملعب وجهاً لأعلى",
      WhileAlive: "طالما بقي الكارت داخل الملعب ولم يُطرد",
      UntilTrigger: "حتى حدوث حدث محدد",
    };

    const triggerStr = triggerMap[ability.trigger] || ability.trigger;

    let condsStr = "";
    if (ability.conditions && ability.conditions.length > 0) {
      condsStr = " وبشرط أن " + ability.conditions.map(c => {
        let suffix = "";
        if (c.type === "HasTag" && c.value) suffix = ` [${c.value}]`;
        return (condMap[c.type] || c.type) + suffix;
      }).join(" وأن ");
    } else {
      condsStr = " دون أي شروط مسبقة";
    }

    let actionsStr = "";
    if (ability.actions && ability.actions.length > 0) {
      actionsStr = ability.actions.map((act, i) => {
        const val = act.value ?? 0;
        const absVal = Math.abs(val);

        let durText = "";
        if (act.duration) {
          if (act.duration === "XTurns" && act.durationTurns) {
            durText = ` لمـدة ${act.durationTurns} أدوار`;
          } else if (act.duration === "UntilTrigger" && act.durationTrigger) {
            durText = ` حتى حدوث حدث (${act.durationTrigger})`;
          } else {
            durText = ` ${durationMap[act.duration] || act.duration}`;
          }
        }

        let actTypeStr = "";
        switch (act.type) {
          case "AddStat":
            actTypeStr = `بزيادة طاقة ${statMap[act.stat || "attack"] || act.stat} بمقدار +${absVal} نقطة`;
            break;
          case "RemoveStat":
            actTypeStr = `بخصم طاقة ${statMap[act.stat || "attack"] || act.stat} بمقدار -${absVal} نقطة`;
            break;
          case "MultiplyStat":
            actTypeStr = `بمضاعفة طاقة ${statMap[act.stat || "attack"] || act.stat} بمقدار ${absVal} أضعاف`;
            break;
          case "DestroyCard":
            actTypeStr = `بطرد واستبعاد الكارت من الملعب كلياً ببطاقة حمراء 🟥`;
            break;
          case "DrawCard":
            actTypeStr = `بسحب عدد ${absVal} كارت إضافي إلى يده`;
            break;
          case "RevealCard":
            actTypeStr = `بكشف الكارت ليصبح مقلوباً لأعلى بالملعب`;
            break;
          case "HideCard":
            actTypeStr = `بإخفاء وقلب الكارت ليصبح وجهاً لأسفل بالملعب`;
            break;
          case "FreezeCard":
            actTypeStr = `بتجميد الكارت بالكامل ❄️ (لن يشارك بالنقاط)`;
            break;
          case "SilenceCard":
            actTypeStr = `بكتم صوت الكارت وتعطيل قدراته التكتيكية 🔇`;
            break;
          case "StunCard":
            actTypeStr = `بصعق الكارت وشل حركته مؤقتاً 💫`;
            break;
          case "CancelAction":
            actTypeStr = `بإلغاء وإبطال حركة الخصم بالكامل 🚫`;
            break;
          case "ReturnToHand":
            actTypeStr = `بإعادة الكارت إلى يد المدرب`;
            break;
          default:
            actTypeStr = `بتأثير (${act.type})`;
        }

        const targetText = targetMap[act.target] || act.target;
        return `سيقوم ${actTypeStr} مستهدفاً {${targetText}}${durText}`;
      }).join(" و ");
    } else {
      actionsStr = "لن يقوم بأي إجراء حالياً.";
    }

    return `شرح مفسر: هذا اللاعب عندما "${triggerStr}"${condsStr}، فإنه بالحال سيقوم بالآتي: ${actionsStr}.`;
  };

  // Convert visual rule to card and save immediately (Online or Local Storage Fallback)
  const handleSaveCard = async () => {
    if (!saveName.trim()) {
      setToast({ message: "الرجاء إدخال اسم الكارت أولاً!", type: "warning" });
      return;
    }

    const currentAbility = getAbilityObject();
    const isSavePlayer = saveType === "player";

    // Setup payload
    const cardPayload: any = {
      name: saveName.trim(),
      description: saveDescription.trim() || `كارت تم إنشاؤه عبر المطور. ${generateArabicNarration(currentAbility)}`,
      ability: currentAbility,
    };

    if (isSavePlayer) {
      cardPayload.attack = mockAttack;
      cardPayload.defense = mockDefense;
      cardPayload.role = saveRole;
      cardPayload.role_arabic = isSavePlayer ? (saveRole === "attacker" ? "رأس حربة" : saveRole === "midfielder" ? "خط وسط" : saveRole === "defender" ? "مدافع" : "حارس مرمى") : "";
      cardPayload.is_legend = mockIsLegend;
      cardPayload.avatar = saveAvatar;
      cardPayload.team = saveTeam.trim() || "تطوير محلي";
      cardPayload.tags = ["مطور", saveRole];
      cardPayload.image_url = "";
    } else {
      cardPayload.effect = "custom";
      cardPayload.effect_arabic = saveArabicEffect.trim() || "تأثير تكتيكي";
      cardPayload.icon = saveAvatar || "🃏";
      cardPayload.image_url = "";
    }

      try {
        if (supabaseActive && selectedPkgId) {
          // Save to Database Package
          if (isSavePlayer) {
            await createCardInPackage(selectedPkgId, cardPayload);
          } else {
            await createSpecialCardInPackage(selectedPkgId, cardPayload);
          }
          setToast({ message: "🎉 تم حفظ الكارت بنجاح وربطه بالباقة في قاعدة البيانات!", type: "success" });
        } else {
          // Save to Local Storage fallback
          if (isSavePlayer) {
            saveCardLocally(cardPayload);
          } else {
            saveSpecialCardLocally(cardPayload);
          }
          setToast({ message: "💾 تم حفظ الكارت محلياً بنجاح في المتصفح! ستتمكن من اللعب به فوراً في وضع الأوفلاين.", type: "success" });
        }

        // Reset save form states
        setSaveName("");
        setSaveDescription("");
        setSaveArabicEffect("");
      } catch (e: any) {
        console.error(e);
        setToast({ message: `خطأ في الحفظ: ${e.message || "حدث خطأ غير متوقع."}`, type: "error" });
      }
    };

  // ----------------------------------------------------
  // INTERACTIVE MINI-PITCH SIMULATOR LOGIC
  // ----------------------------------------------------

  const addSimLog = (text: string) => {
    setSimLogs((prev) => [...prev, `[${new Date().toTimeString().split(" ")[0]}] ${text}`]);
  };

  // Reset Pitch Simulator
  const handleResetSimulator = () => {
    setSimSlotsPlayer(
      Array.from({ length: 5 }, (_, i) => ({
        id: `p_sim_${i}`,
        card: null,
        isRevealed: false,
        isFrozen: false,
        isSilenced: false,
        isStunned: false,
        bonusAttack: 0,
        bonusDefense: 0,
      }))
    );
    setSimSlotsOpponent(
      Array.from({ length: 5 }, (_, i) => ({
        id: `o_sim_${i}`,
        card: null,
        isRevealed: false,
        isFrozen: false,
        isSilenced: false,
        isStunned: false,
        bonusAttack: 0,
        bonusDefense: 0,
      }))
    );
    setSimLogs(["🏁 تم إفراغ وإعادة تهيئة الملعب بالكامل."]);
    setSelectedSlotIndex(null);
  };

  // Spawn the custom card under test on the selected slot
  const handleSpawnTestCard = (slotIdx: number, isAi: boolean) => {
    const customCard = {
      name: saveName.trim() || "كارت الاختبار التكتيكي",
      attack: mockAttack,
      defense: mockDefense,
      role: saveRole,
      avatar: saveAvatar || "⚡",
      isLegend: mockIsLegend,
      ability: getAbilityObject(),
      isCustom: true,
    };

    if (isAi) {
      const next = [...simSlotsOpponent];
      next[slotIdx] = {
        ...next[slotIdx],
        card: customCard,
        isRevealed: true,
      };
      setSimSlotsOpponent(next);
      addSimLog(`✨ تم استدعاء كارت الاختبار بالملعب بالخصم في المركز #${slotIdx + 1}`);
    } else {
      const next = [...simSlotsPlayer];
      next[slotIdx] = {
        ...next[slotIdx],
        card: customCard,
        isRevealed: true,
      };
      setSimSlotsPlayer(next);
      addSimLog(`✨ تم استدعاء كارت الاختبار بالملعب في المركز #${slotIdx + 1}`);
    }
    setSelectedSlotIndex(null);
  };

  // Quick autofill empty slots with dummy players
  const handleAutofillSimulator = () => {
    const dummyNamesPlayer = ["محمد صلاح 🇪🇬", "تريزيجيه ⚡", "مصطفى محمد ⚽", "عمر مرموش 🔥", "الشناوي 🧤"];
    const dummyNamesOpponent = ["رونالدو 🇵🇹", "ميسي 🇦🇷", "مبابي 🇫🇷", "نيمار 🇧🇷", "بوفون 🧤"];

    const filledPlayer = simSlotsPlayer.map((slot, i) => {
      if (slot.card) return slot;
      return {
        ...slot,
        isRevealed: true,
        card: {
          name: dummyNamesPlayer[i],
          attack: i === 4 ? 1 : 8 - i,
          defense: i === 4 ? 9 : 4 + i,
          role: i === 4 ? "goalkeeper" as const : i % 2 === 0 ? "attacker" as const : "midfielder" as const,
          avatar: i === 4 ? "🧤" : "⚽",
          isLegend: i === 0,
        },
      };
    });

    const filledOpponent = simSlotsOpponent.map((slot, i) => {
      if (slot.card) return slot;
      return {
        ...slot,
        isRevealed: i % 2 === 0, // Some are face down
        card: {
          name: dummyNamesOpponent[i],
          attack: i === 4 ? 0 : 7 - i,
          defense: i === 4 ? 10 : 5 + i,
          role: i === 4 ? "goalkeeper" as const : i % 2 === 0 ? "attacker" as const : "defender" as const,
          avatar: i === 4 ? "🧤" : "👤",
          isLegend: i === 0,
        },
      };
    });

    setSimSlotsPlayer(filledPlayer);
    setSimSlotsOpponent(filledOpponent);
    addSimLog("👥 تم ملء باقي مراكز الملعب بفريقين افتراضيين لتجربة القدرات.");
  };

  // Rules Engine Mock Evaluator on the Simulator State
  const runRulesEngineSimulator = (triggerEvent: string, eventSourceSlotId?: string) => {
    addSimLog(`📡 فحص معالجة الحدث المسبب: [ ${triggerEvent} ]`);

    let nextPlayer = [...simSlotsPlayer];
    let nextOpponent = [...simSlotsOpponent];

    // Helper function to apply actions
    const processAbility = (
      ability: CardAbility,
      ownerIsAi: boolean,
      sourceIdx: number
    ) => {
      ability.actions.forEach((act, actIdx) => {
        const val = act.value ?? 0;
        addSimLog(`⚙️ تنفيذ إجراء #${actIdx + 1} (${act.type}) مستهدفاً [${act.target}]`);

        // Resolve target slots
        let targets: SimulatorSlot[] = [];
        if (act.target === "Self") {
          targets = ownerIsAi ? [nextOpponent[sourceIdx]] : [nextPlayer[sourceIdx]];
        } else if (act.target === "Allies") {
          targets = ownerIsAi ? nextOpponent : nextPlayer;
        } else if (act.target === "Enemies") {
          targets = ownerIsAi ? nextPlayer : nextOpponent;
        } else if (act.target === "SelectedEnemy") {
          // Fallback if none selected
          targets = ownerIsAi 
            ? nextPlayer.filter(s => s.card !== null)
            : nextOpponent.filter(s => s.card !== null);
          // Just take the first active for mock purposes
          if (targets.length > 0) targets = [targets[0]];
        } else if (act.target === "All") {
          targets = [...nextPlayer, ...nextOpponent];
        }

        targets.forEach((t) => {
          if (!t.card) return;
          switch (act.type) {
            case "AddStat":
              if (act.stat === "attack") t.bonusAttack += val;
              if (act.stat === "defense") t.bonusDefense += val;
              addSimLog(`   📈 إضافة تعديل ${val >= 0 ? "+" : ""}${val} طاقة ${act.stat} على ${t.card.name}`);
              break;
            case "RemoveStat":
              if (act.stat === "attack") t.bonusAttack -= val;
              if (act.stat === "defense") t.bonusDefense -= val;
              addSimLog(`   📉 خصم تعديل -${val} طاقة ${act.stat} على ${t.card.name}`);
              break;
            case "FreezeCard":
              t.isFrozen = true;
              addSimLog(`   ❄️ تم تجميد اللاعب ${t.card.name} بالكامل!`);
              break;
            case "SilenceCard":
              t.isSilenced = true;
              addSimLog(`   🔇 تم كتم وتصفير قدرات اللاعب ${t.card.name}`);
              break;
            case "StunCard":
              t.isStunned = true;
              addSimLog(`   💫 تم صعق وشل اللاعب ${t.card.name}`);
              break;
            case "DestroyCard":
              t.card = null;
              addSimLog(`   🟥 طرد واستبعاد اللاعب ${t.card ? (t.card as any).name : ""} خارج الملعب!`);
              break;
            case "RevealCard":
              t.isRevealed = true;
              addSimLog(`   👁️ تم كشف وجه كارت اللاعب ${t.card.name}`);
              break;
            case "HideCard":
              t.isRevealed = false;
              addSimLog(`   🙈 تم إخفاء وقلب كارت اللاعب ${t.card.name}`);
              break;
            case "CancelAction":
              addSimLog(`   🚫 تم إحباط حركة الخصم بالكامل!`);
              break;
            default:
              break;
          }
        });
      });
    };

    // Evaluate Player cards abilities
    nextPlayer.forEach((slot, idx) => {
      if (slot.card && slot.card.ability && !slot.isSilenced) {
        if (slot.card.ability.trigger === triggerEvent) {
          // Check conditions
          let condsMet = true;
          slot.card.ability.conditions.forEach((cond) => {
            if (cond.type === "IsFaceUp" && !slot.isRevealed) condsMet = false;
            if (cond.type === "IsFaceDown" && slot.isRevealed) condsMet = false;
            if (cond.type === "IsLegend" && !slot.card?.isLegend) condsMet = false;
            if (cond.type === "IsAttacker" && simPhase !== "attack") condsMet = false;
            if (cond.type === "IsDefender" && simPhase !== "defense") condsMet = false;
          });

          if (condsMet) {
            addSimLog(`✅ قدرة اللاعب [${slot.card.name}] تطابقت شروطها!`);
            processAbility(slot.card.ability, false, idx);
          }
        }
      }
    });

    // Evaluate AI cards abilities
    nextOpponent.forEach((slot, idx) => {
      if (slot.card && slot.card.ability && !slot.isSilenced) {
        if (slot.card.ability.trigger === triggerEvent) {
          // Check conditions
          let condsMet = true;
          slot.card.ability.conditions.forEach((cond) => {
            if (cond.type === "IsFaceUp" && !slot.isRevealed) condsMet = false;
            if (cond.type === "IsFaceDown" && slot.isRevealed) condsMet = false;
            if (cond.type === "IsLegend" && !slot.card?.isLegend) condsMet = false;
            if (cond.type === "IsAttacker" && simPhase !== "defense") condsMet = false; // Inverse for AI
            if (cond.type === "IsDefender" && simPhase !== "attack") condsMet = false;
          });

          if (condsMet) {
            addSimLog(`✅ قدرة خصم [${slot.card.name}] تطابقت شروطها!`);
            processAbility(slot.card.ability, true, idx);
          }
        }
      }
    });

    setSimSlotsPlayer(nextPlayer);
    setSimSlotsOpponent(nextOpponent);
  };

  // Trigger Action menu operations on a slot
  const handleSlotAction = (action: "reveal" | "play" | "destroy" | "freeze" | "silence" | "stun" | "clear") => {
    if (selectedSlotIndex === null) return;
    const { index, isAi } = selectedSlotIndex;

    let next = isAi ? [...simSlotsOpponent] : [...simSlotsPlayer];
    const target = next[index];

    if (!target.card) {
      setSelectedSlotIndex(null);
      return;
    }

    switch (action) {
      case "reveal":
        target.isRevealed = true;
        addSimLog(`👁️ تم الكشف اليدوي للاعب [${target.card.name}]`);
        runRulesEngineSimulator("CardRevealed", target.id);
        break;
      case "play":
        target.isRevealed = true;
        addSimLog(`🃏 تم تفعيل ولعب اللاعب [${target.card.name}]`);
        runRulesEngineSimulator("CardPlayed", target.id);
        break;
      case "destroy":
        addSimLog(`🟥 طرد واستبعاد اللاعب [${target.card.name}] من الملعب`);
        target.card = null;
        runRulesEngineSimulator("CardDestroyed", target.id);
        break;
      case "freeze":
        target.isFrozen = !target.isFrozen;
        addSimLog(`❄️ تجميل/إلغاء تجميد اللاعب [${target.card.name}]`);
        break;
      case "silence":
        target.isSilenced = !target.isSilenced;
        addSimLog(`🔇 كتم/إلغاء كتم قدرات اللاعب [${target.card.name}]`);
        break;
      case "stun":
        target.isStunned = !target.isStunned;
        addSimLog(`💫 صعق/إلغاء صعق اللاعب [${target.card.name}]`);
        break;
      case "clear":
        target.card = null;
        addSimLog(`🧹 إزالة اللاعب من هذا المركز`);
        break;
    }

    if (isAi) {
      setSimSlotsOpponent(next);
    } else {
      setSimSlotsPlayer(next);
    }
    setSelectedSlotIndex(null);
  };

  // Simulate dynamic Clash / Shootout scores
  const handleSimulateClash = (mode: "attack" | "defense") => {
    setSimPhase(mode);
    addSimLog(`⚽ انطلاق هجمة ومحاكاة التسديد! حالة اللعب: ${mode === "attack" ? "هجوم للفريق" : "صد ودفاع من الفريق"}`);

    // First, run triggers
    runRulesEngineSimulator(mode === "attack" ? "AttackStarted" : "DefenseStarted");

    // Calculate totals
    let playerTotal = 0;
    let aiTotal = 0;

    simSlotsPlayer.forEach((slot) => {
      if (!slot.card || slot.isFrozen || slot.isStunned) return;
      if (mode === "attack") {
        playerTotal += Math.max(0, slot.card.attack + slot.bonusAttack);
      } else {
        playerTotal += Math.max(0, slot.card.defense + slot.bonusDefense);
      }
    });

    simSlotsOpponent.forEach((slot) => {
      if (!slot.card || slot.isFrozen || slot.isStunned) return;
      if (mode === "attack") {
        // AI is defending
        aiTotal += Math.max(0, slot.card.defense + slot.bonusDefense);
      } else {
        // AI is attacking
        aiTotal += Math.max(0, slot.card.attack + slot.bonusAttack);
      }
    });

    const isGoal = playerTotal > aiTotal;
    addSimLog(`📊 نتيجة المحاكاة: نقاط فريقك = ${playerTotal} | نقاط الخصم = ${aiTotal}`);
    if (mode === "attack") {
      if (isGoal) {
        addSimLog(`🎉 هدف! هجومك الكاسح (${playerTotal}) تفوق على دفاعات الخصم (${aiTotal})! ⚽`);
      } else {
        addSimLog(`🛡️ تصدي ناجح! تمكن دفاع الخصم (${aiTotal}) من قطع كرتك الحالية (${playerTotal}).`);
      }
    } else {
      if (playerTotal >= aiTotal) {
        addSimLog(`🧤 تصدي رائع! نجحت خطتك الدفاعية (${playerTotal}) في تشتيت هجمات الخصم (${aiTotal})!`);
      } else {
        addSimLog(`⚽ هدف للخصم! اخترق هجوم الخصم (${aiTotal}) حائط الصد لديك (${playerTotal}).`);
      }
    }
  };

  const abilityObj = getAbilityObject();
  const power = calculatePowerScore(abilityObj, {
    attack: mockAttack,
    defense: mockDefense,
    isLegend: mockIsLegend,
  });

  return (
    <div style={{ padding: 16, direction: "rtl", textAlign: "right", color: "#e0e0e0" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          paddingBottom: 12,
          marginBottom: 16,
          flexDirection: "row"
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0 }}>
            🧪 مختبر القدرات وقواعد اللعبة
          </h2>
          <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 0" }}>
            صمم، اختبر، وحاكي كيفية تنفيذ تأثيرات الكروت التكتيكية والأسطورية ديناميكياً مع محرك المباراة
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 8 }}>
          <button
            style={{
              margin: 0,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: "bold",
              borderRadius: 6,
              background: editMode === "visual" ? "#10b981" : "transparent",
              color: editMode === "visual" ? "#000" : "#fff",
              border: "none",
              cursor: "pointer"
            }}
            onClick={() => setEditMode("visual")}
          >
            🎛️ منشئ بصري عربي
          </button>
          <button
            style={{
              margin: 0,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: "bold",
              borderRadius: 6,
              background: editMode === "json" ? "#10b981" : "transparent",
              color: editMode === "json" ? "#000" : "#fff",
              border: "none",
              cursor: "pointer"
            }}
            onClick={() => setEditMode("json")}
          >
            📝 محرر الكود الهيكلي
          </button>
          <button
            style={{
              margin: 0,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: "bold",
              borderRadius: 6,
              background: editMode === "help" ? "#10b981" : "transparent",
              color: editMode === "help" ? "#000" : "#fff",
              border: "none",
              cursor: "pointer"
            }}
            onClick={() => setEditMode("help")}
          >
            📖 دليل استخدام القواعد والقدرات
          </button>
        </div>
      </div>

      {editMode === "help" ? (
        <div style={{
          background: "rgba(255,255,255,0.01)",
          padding: 24,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.05)",
          lineHeight: "1.8",
          fontSize: 13,
          color: "#ddd",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          animation: "fadeIn 0.3s ease"
        }}>
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12, marginBottom: 4 }}>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fbbf24", margin: 0 }}>
              📖 الدليل الشامل والكامل لصناعة وتجربة القدرات الخاصة والأسطورية
            </h3>
            <p style={{ fontSize: 12, color: "#aaa", margin: "6px 0 0" }}>
              تعلم كيف تصمم كروتك الخاصة بقواعد ذكية ومحكمة، وكيف يعمل محرك المباراة والملعب التفاعلي لحساب النقاط بدقة متناهية.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {/* Card 1: What are special abilities */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: 16, borderRadius: 12 }}>
              <h4 style={{ color: "#10b981", fontSize: 15, fontWeight: "bold", margin: "0 0 10px 0" }}>
                ✨ 1. ما هي القدرات الخاصة وكيف يتم تركيبها؟
              </h4>
              <p style={{ margin: 0, color: "#bbb", fontSize: 12 }}>
                القدرة الخاصة هي نظام ذكي يتم تفعيله ديناميكياً خلال المباراة. يتكون الكود الهيكلي لأي قدرة من ثلاثة أركان أساسية:
              </p>
              <ul style={{ paddingRight: 16, marginTop: 8, listStyleType: "disc", color: "#bbb", fontSize: 12 }}>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#fff" }}>الحدث المسبب (الزناد):</strong> الشرارة التي تطلق القدرة، مثل كشف الكارت بالملعب، أو تنزيل الكارت للعب، أو بدء هجمة جديدة، أو تسجيل هدف.</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#fff" }}>شروط التحقق (القيود):</strong> شروط لابد من استيفائها لكي يتفعل التأثير (مثال: أن يكون الكارت مكشوفاً للأعلى، أو أن يكون صاحب الكارت هو المهاجم حالياً).</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#fff" }}>إجراءات التأثير:</strong> النتيجة الفعلية للقدرة (مثال: زيادة نقاط طاقة الهجوم أو الدفاع لحلفائك، تجميد كارت الخصم ❄️، كتم قدرات لاعب 🔇، أو استبعاده ببطاقة حمراء 🟥).</li>
              </ul>
            </div>

            {/* Card 2: Legendary Abilities */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: 16, borderRadius: 12 }}>
              <h4 style={{ color: "#fbbf24", fontSize: 15, fontWeight: "bold", margin: "0 0 10px 0" }}>
                👑 2. القدرات الأسطورية وكيف تعمل؟
              </h4>
              <p style={{ margin: 0, color: "#bbb", fontSize: 12 }}>
                الكروت الأسطورية هي كروت خارقة تتمتع بامتيازات مذهلة، ولكن تنزيلها للملعب يتطلب تضحية خاصة:
              </p>
              <ul style={{ paddingRight: 16, marginTop: 8, listStyleType: "disc", color: "#bbb", fontSize: 12 }}>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#fff" }}>شروط التنزيل (الحرق):</strong> لإنزال كارت أسطوري بالملعب، يتطلب الأمر حرق عدد من الكروت من يدك كقربان تضحية (يمكن ضبط هذا العدد في إعدادات اللعب، أو ضبطه على صفر لتنزيلها بشكل طبيعي).</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#fff" }}>توازن القوة التكتيكية:</strong> نظراً لتكلفة إنزالها الباهظة، يسمح محرك اللعبة للقدرة الأسطورية بسقف توازن أعلى بكثير يصل إلى 46 نقطة (مقارنة بـ 26 نقطة فقط للكارت العادي) حيث يُعطى الكارت الأسطوري بونص تعويضي قيمته +6 نقاط بشكل مدمج.</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#fff" }}>تخصيص التأثير:</strong> يمكنك صناعة قواعد خاصة باللاعب الأسطوري فقط بإضافة شرط "الكارت للاعب أسطوري"، مما يعطيه هيبة وقوة تتفوق على الكروت العادية.</li>
              </ul>
            </div>

            {/* Card 3: Interactive Simulation */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: 16, borderRadius: 12 }}>
              <h4 style={{ color: "#60a5fa", fontSize: 15, fontWeight: "bold", margin: "0 0 10px 0" }}>
                🏟️ 3. كيفية تشغيل القواعد والتحقق منها يدوياً بالملعب
              </h4>
              <p style={{ margin: 0, color: "#bbb", fontSize: 12 }}>
                لقد وفرنا لك ملعب محاكاة تفاعلي لتلعب وتختبر بنفسك خطوة بخطوة وتراقب تأثيرات القدرات والنتائج مباشرة:
              </p>
              <ul style={{ paddingRight: 16, marginTop: 8, listStyleType: "disc", color: "#bbb", fontSize: 12 }}>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#fff" }}>إنزال كروت الاختبار:</strong> انقر على أي مركز فارغ بالملعب التفاعلي، واختر "إنزال كارت الاختبار" لوضع الكارت الذي تصممه حالياً، أو استخدم نموذج "استدعاء لاعب مخصص" لكتابة طاقات مخصصة وتحديد هل هو أسطوري أم عادي.</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#fff" }}>إطلاق الأحداث يدوياً:</strong> استخدم أزرار التحكم بالملعب لتجميد الكروت، كشفها، طردها، أو كتم صوتها. ستلاحظ تحديث نقاط القوة والهجوم بالحال.</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#fff" }}>المواجهة الثنائية اليدوية:</strong> اختر لاعباً من فريقك ولاعباً من الخصم من القوائم المنسدلة، ثم اضغط على زر تشغيل المواجهة لمشاهدة صدام مباشر بينهما وحساب النتيجة side-by-side (جنباً إلى جنب) وتأثير الأسطورة عليهما.</li>
              </ul>
            </div>
          </div>

          <div style={{ 
            background: "rgba(16, 185, 129, 0.05)", 
            border: "1px solid rgba(16, 185, 129, 0.2)", 
            padding: 16, 
            borderRadius: 12,
            marginTop: 10
          }}>
            <h4 style={{ color: "#34d399", fontSize: 14, fontWeight: "bold", margin: "0 0 8px 0" }}>
              💡 دليل التحقق والاتزان التكتيكي (خطوة بخطوة):
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "#bbb" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ color: "#fbbf24", fontWeight: "bold" }}>الخطوة الأولى:</span>
                <span>صمم قدرتك باستخدام المنشئ البصري أو بكتابة الكود الهيكلي، وتحقق من صحتها من خلال تقرير الاتزان.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ color: "#fbbf24", fontWeight: "bold" }}>الخطوة الثانية:</span>
                <span>اكتب اسماً مناسباً للكارت واحفظه، ثم قم بإنزاله في مركز حليف بالملعب.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ color: "#fbbf24", fontWeight: "bold" }}>الخطوة الثالثة:</span>
                <span>قم بإنزال لاعبين خصوم بالملعب (تلقائياً أو يدوياً)، ثم انقر على الكارت الخاص بك واضغط "لعب وتفعيل الكارت" أو "كشف الكارت" لتطلق حدث تفعيل القدرة.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ color: "#fbbf24", fontWeight: "bold" }}>الخطوة الرابعة:</span>
                <span>تأمل لوحة حساب النقاط التفصيلية جنبًا إلى جنب لتتأكد من أن نقاط طاقة الهجوم والدفاع تمت إضافتها أو خصمها بشكل صحيح ومنطقي، وأن حالة التجميد ❄️ أو الكتم 🔇 أثرت على حساباتك تماماً كما صممت.</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              type="button"
              style={{
                padding: "10px 24px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#000",
                fontSize: 13,
                fontWeight: "900",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16,185,129,0.2)"
              }}
              onClick={() => setEditMode("visual")}
            >
              🚀 ابدأ الآن في تصميم الكروت واختبارها بصرياً
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Left column: Visual form / JSON text */}
          <div style={{ flex: "1 1 420px", minWidth: 350, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Card Mock Stats Panel */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              padding: 14,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <span style={{ fontSize: 12, color: "#34d399", fontWeight: "bold", display: "block", marginBottom: 10 }}>
                📊 طاقات الكارت الافتراضية للتجربة والاتزان:
              </span>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 80 }}>
                  <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>الهجوم الأساسي</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: "100%", padding: 6, background: "#0c0d0f", color: "#fff", border: "1px solid #333", borderRadius: 6 }}
                    value={mockAttack}
                    onChange={(e) => setMockAttack(Number(e.target.value))}
                    min={0}
                    max={15}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 80 }}>
                  <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>الدفاع الأساسي</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: "100%", padding: 6, background: "#0c0d0f", color: "#fff", border: "1px solid #333", borderRadius: 6 }}
                    value={mockDefense}
                    onChange={(e) => setMockDefense(Number(e.target.value))}
                    min={0}
                    max={15}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "20px 0 0" }}>
                  <input
                    type="checkbox"
                    id="mock_is_legend"
                    checked={mockIsLegend}
                    onChange={(e) => setMockIsLegend(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <label htmlFor="mock_is_legend" style={{ fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: "bold" }}>كارت أسطورة؟ ✨</label>
                </div>
              </div>
            </div>

            {editMode === "json" ? (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>كود الوصف الهيكلي للقدرة</span>
                  <span style={{ fontSize: 11, color: "#666" }}>تعديل مباشر</span>
                </label>
                <textarea
                  className="form-input"
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    background: "#0c0d0f",
                    color: "#a7f3d0",
                    borderColor: "rgba(16,185,129,0.2)",
                    height: 280,
                    direction: "ltr",
                    textAlign: "left",
                    width: "100%",
                    padding: 8,
                    borderRadius: 8
                  }}
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: 10, width: "100%", padding: 8 }}
                  onClick={handleTestJson}
                >
                  ⚙️ التحقق من كود الوصف الهيكلي واختبار الصلاحية
                </button>
              </div>
            ) : (
              /* Visual Builder Panel */
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Trigger */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>
                    الحدث المسبب للقدرة (الزناد)
                  </label>
                <select
                  className="form-input"
                  style={{ width: "100%", padding: 8, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                  value={trigger}
                  onChange={(e) => {
                    setTrigger(e.target.value);
                    syncVisualToJson(e.target.value, conditions, actions);
                  }}
                >
                  {VALID_TRIGGERS.map((t) => (
                    <option key={t} value={t}>
                      {TRIGGER_ARABIC[t] || t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditions */}
              <div style={{ background: "rgba(255,255,255,0.01)", padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: "#ddd" }}>شروط التفعيل (Conditions)</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "4px 12px", fontSize: 11, margin: 0, width: "auto", border: "1px solid #444" }}
                    onClick={handleAddCondition}
                  >
                    + إضافة شرط
                  </button>
                </div>

                {conditions.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#666", textAlign: "center", padding: "12px 0" }}>
                    تعمل القدرة دائماً عند حدوث مسببها دون شروط مسبقة.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {conditions.map((cond, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select
                          className="form-input"
                          style={{ padding: 6, fontSize: 12, flex: 1, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                          value={cond.type}
                          onChange={(e) => handleUpdateCondition(idx, "type", e.target.value)}
                        >
                          {VALID_CONDITIONS.map((c) => (
                            <option key={c} value={c}>
                              {CONDITION_ARABIC[c] || c}
                            </option>
                          ))}
                        </select>
                        {cond.type === "HasTag" && (
                          <input
                            type="text"
                            placeholder="التاغ"
                            className="form-input"
                            style={{ padding: 6, fontSize: 12, width: 90, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                            value={cond.value || ""}
                            onChange={(e) => handleUpdateCondition(idx, "value", e.target.value)}
                          />
                        )}
                        <button
                          type="button"
                          style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 16, cursor: "pointer" }}
                          onClick={() => handleRemoveCondition(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ background: "rgba(255,255,255,0.01)", padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: "#ddd" }}>إجراءات التأثير (Actions)</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "4px 12px", fontSize: 11, margin: 0, width: "auto", border: "1px solid #444" }}
                    onClick={handleAddAction}
                  >
                    + إضافة إجراء
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {actions.map((act, idx) => (
                    <div key={idx} style={{ background: "rgba(0,0,0,0.25)", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#10b981", fontWeight: "bold" }}>إجراء #{idx + 1}</span>
                        <button
                          type="button"
                          style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 14, cursor: "pointer" }}
                          onClick={() => handleRemoveAction(idx)}
                        >
                          ✕ حذف الإجراء
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select
                          className="form-input"
                          style={{ padding: 6, fontSize: 12, flex: 1, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                          value={act.type}
                          onChange={(e) => handleUpdateAction(idx, "type", e.target.value)}
                        >
                          {VALID_ACTIONS.map((a) => (
                            <option key={a} value={a}>
                              {ACTION_ARABIC[a] || a}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {/* Target */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 11, color: "#888" }}>المستهدف:</span>
                          <select
                            className="form-input"
                            style={{ padding: 4, fontSize: 11, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                            value={act.target}
                            onChange={(e) => handleUpdateAction(idx, "target", e.target.value)}
                          >
                            {VALID_TARGETS.map((t) => (
                              <option key={t} value={t}>
                                {TARGET_ARABIC[t] || t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* AddStat/RemoveStat specific: stat */}
                        {(act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat") && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "#888" }}>الخاصية:</span>
                            <select
                              className="form-input"
                              style={{ padding: 4, fontSize: 11, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                              value={act.stat || "attack"}
                              onChange={(e) => handleUpdateAction(idx, "stat", e.target.value)}
                            >
                              <option value="attack">الهجوم</option>
                              <option value="defense">الدفاع</option>
                              <option value="moves">الحركات</option>
                              <option value="draw">سحب كروت</option>
                            </select>
                          </div>
                        )}

                        {/* Value input for numeric types */}
                        {(act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat" || act.type === "DrawCard" || act.type === "AddMoves" || act.type === "ReduceMoves") && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "#888" }}>القيمة:</span>
                            <input
                              type="number"
                              className="form-input"
                              style={{ padding: 4, fontSize: 11, width: 55, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                              value={act.value ?? 2}
                              onChange={(e) => handleUpdateAction(idx, "value", Number(e.target.value))}
                            />
                          </div>
                        )}

                        {/* Duration Selection */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 11, color: "#888" }}>المدة:</span>
                          <select
                            className="form-input"
                            style={{ padding: 4, fontSize: 11, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                            value={act.duration || "Instant"}
                            onChange={(e) => handleUpdateAction(idx, "duration", e.target.value)}
                          >
                            {VALID_DURATIONS.map((d) => (
                              <option key={d} value={d}>
                                {DURATION_ARABIC[d] || d}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* XTurns specific */}
                        {act.duration === "XTurns" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "#888" }}>أدوار:</span>
                            <input
                              type="number"
                              className="form-input"
                              style={{ padding: 4, fontSize: 11, width: 50, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                              value={act.durationTurns ?? 2}
                              onChange={(e) => handleUpdateAction(idx, "durationTurns", Number(e.target.value))}
                              min={1}
                            />
                          </div>
                        )}

                        {/* UntilTrigger specific */}
                        {act.duration === "UntilTrigger" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "#888" }}>حدث:</span>
                            <input
                              type="text"
                              placeholder="GoalScored"
                              className="form-input"
                              style={{ padding: 4, fontSize: 11, width: 85, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6 }}
                              value={act.durationTrigger || ""}
                              onChange={(e) => handleUpdateAction(idx, "durationTrigger", e.target.value)}
                            />
                          </div>
                        )}

                        {/* Stackable */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input
                            type="checkbox"
                            id={`sim_stackable_${idx}`}
                            checked={act.stackable !== false}
                            onChange={(e) => handleUpdateAction(idx, "stackable", e.target.checked)}
                            style={{ cursor: "pointer" }}
                          />
                          <label htmlFor={`sim_stackable_${idx}`} style={{ fontSize: 11, color: "#aaa", cursor: "pointer" }}>متراكم</label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Explanations, Save form, and interactive mini-pitch */}
        <div style={{ flex: "1 1 500px", minWidth: 350, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Narrative Story Explanation */}
          <div style={{
            padding: 14,
            borderRadius: 12,
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)",
          }}>
            <h4 style={{ margin: "0 0 6px 0", fontSize: 14, color: "#34d399", fontWeight: "bold" }}>
              📖 شرح القدرة لغوياً للاعب:
            </h4>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "#ddd" }}>
              {generateArabicNarration(abilityObj)}
            </p>
          </div>

          {/* Direct Card Creation & Saving Panel */}
          <div style={{
            padding: 14,
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: 14, color: "#fbbf24", fontWeight: "bold", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 6 }}>
              ✨ حفظ القواعد وتحويلها إلى كارت بالملعب:
            </h4>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 3 }}>نوع الكارت</label>
                <select
                  className="form-input"
                  style={{ width: "100%", padding: 6, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 12 }}
                  value={saveType}
                  onChange={(e) => setSaveType(e.target.value as any)}
                >
                  <option value="player">كارت لاعب (مع طاقة هجوم/دفاع)</option>
                  <option value="special">كارت تكتيكي خاص</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 3 }}>اسم الكارت/اللاعب</label>
                <input
                  type="text"
                  placeholder="كريستيانو، تكتيك التسلل..."
                  className="form-input"
                  style={{ width: "100%", padding: 6, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 12 }}
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
              </div>
            </div>

            {saveType === "player" ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 3 }}>المركز</label>
                  <select
                    className="form-input"
                    style={{ width: "100%", padding: 6, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 12 }}
                    value={saveRole}
                    onChange={(e) => setSaveRole(e.target.value as any)}
                  >
                    <option value="attacker">مهاجم</option>
                    <option value="midfielder">خط وسط</option>
                    <option value="defender">مدافع</option>
                    <option value="goalkeeper">حارس مرمى</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 3 }}>الفريق/المنتخب</label>
                  <input
                    type="text"
                    placeholder="مصر، ريال مدريد..."
                    className="form-input"
                    style={{ width: "100%", padding: 6, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 12 }}
                    value={saveTeam}
                    onChange={(e) => setSaveTeam(e.target.value)}
                  />
                </div>
                <div style={{ width: 80 }}>
                  <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 3 }}>أيقونة/رمز</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: "100%", padding: 6, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 12, textAlign: "center" }}
                    value={saveAvatar}
                    onChange={(e) => setSaveAvatar(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 3 }}>الاسم العربي للتأثير (مثلاً: تسلل)</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: "100%", padding: 6, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 12 }}
                    value={saveArabicEffect}
                    onChange={(e) => setSaveArabicEffect(e.target.value)}
                  />
                </div>
                <div style={{ width: 80 }}>
                  <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 3 }}>أيقونة التكتيك</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: "100%", padding: 6, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 12, textAlign: "center" }}
                    value={saveAvatar}
                    onChange={(e) => setSaveAvatar(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 3 }}>باقة الكروت المستهدفة للحفظ</label>
              {supabaseActive ? (
                <select
                  className="form-input"
                  style={{ width: "100%", padding: 6, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 6, fontSize: 12 }}
                  value={selectedPkgId}
                  onChange={(e) => setSelectedPkgId(e.target.value)}
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.type === "special" ? "باقة تكتيكية" : "باقة لاعبين"})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{
                  padding: "6px 10px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#f59e0b"
                }}>
                  ⚠️ السيرفر غير متصل. سيتم حفظ الكارت مباشرة في المتصفح (Local Storage) ليكون جاهزاً للعب بدون إنترنت.
                </div>
              )}
            </div>

            <button
              type="button"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#000",
                fontSize: 12,
                fontWeight: "900",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16,185,129,0.2)"
              }}
              onClick={handleSaveCard}
            >
              🚀 حفظ وإنشاء الكارت فوراً بالملعب
            </button>
          </div>

          {/* Interactive 5v5 Mini-Pitch Simulator */}
          <div style={{
            padding: 14,
            borderRadius: 12,
            background: "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 8, marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 14, color: "#10b981", fontWeight: "bold" }}>
                🏟️ ملعب المحاكاة التفاعلي المباشر
              </h4>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  style={{ background: "#333", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer" }}
                  onClick={handleAutofillSimulator}
                >
                  👥 ملء الفرق تلقائياً
                </button>
                <button
                  type="button"
                  style={{ background: "#ef4444", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer" }}
                  onClick={handleResetSimulator}
                >
                  🧹 مسح الملعب
                </button>
              </div>
            </div>

            {/* Simulated Pitch Field */}
            <div style={{
              background: "#081c15",
              border: "2px solid #2d6a4f",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Soccer field white line markings */}
              <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(255,255,255,0.08)", pointerEvents: "none", borderRadius: 8 }} />
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 80, height: 80, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", pointerEvents: "none" }} />

              {/* AI Team Slots (Opponent) */}
              <div>
                <span style={{ fontSize: 9, color: "#f87171", display: "block", marginBottom: 4, textAlign: "center", fontWeight: "black" }}>
                  👹 فريق الخصم (الكمبيوتر)
                </span>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {simSlotsOpponent.map((slot, i) => (
                    <div
                      key={slot.id}
                      style={{
                        width: 70,
                        height: 90,
                        borderRadius: 8,
                        background: slot.card ? "linear-gradient(180deg, #2a0808, #180303)" : "rgba(239,68,68,0.03)",
                        border: selectedSlotIndex?.isAi && selectedSlotIndex?.index === i
                          ? "2px solid #fbbf24"
                          : slot.isFrozen
                          ? "2px solid #3b82f6"
                          : slot.isSilenced
                          ? "2px solid #6b7280"
                          : slot.isStunned
                          ? "2px solid #eab308"
                          : "1px dashed rgba(239,68,68,0.25)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.2s"
                      }}
                      onClick={() => setSelectedSlotIndex({ index: i, isAi: true })}
                    >
                      {slot.card ? (
                        <>
                          <span style={{ fontSize: 18 }}>{slot.card.avatar}</span>
                          <span style={{ fontSize: 8, fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "90%", textAlign: "center" }}>
                            {slot.card.name}
                          </span>
                          <div style={{ display: "flex", gap: 4, fontSize: 8, marginTop: 2 }}>
                            <span style={{ color: "#ef4444" }}>⚔️ {slot.card.attack + slot.bonusAttack}</span>
                            <span style={{ color: "#3b82f6" }}>🛡️ {slot.card.defense + slot.bonusDefense}</span>
                          </div>
                          {/* Status Badge Overlays */}
                          <div style={{ position: "absolute", top: 2, left: 2, display: "flex", gap: 1 }}>
                            {slot.isFrozen && <span title="مجمد" style={{ fontSize: 8 }}>❄️</span>}
                            {slot.isSilenced && <span title="مكتوم" style={{ fontSize: 8 }}>🔇</span>}
                            {slot.isStunned && <span title="مصدوم" style={{ fontSize: 8 }}>💫</span>}
                          </div>
                          {slot.card.isCustom && (
                            <span style={{ position: "absolute", bottom: 1, right: 1, background: "#fbbf24", color: "#000", fontSize: 6, padding: "0 2px", borderRadius: 2, fontWeight: "black" }}>
                              مختبر
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }}>مركز {i + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Player Team Slots */}
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 9, color: "#60a5fa", display: "block", marginBottom: 4, textAlign: "center", fontWeight: "black" }}>
                  🛡️ فريقك (اللاعب الحليف)
                </span>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {simSlotsPlayer.map((slot, i) => (
                    <div
                      key={slot.id}
                      style={{
                        width: 70,
                        height: 90,
                        borderRadius: 8,
                        background: slot.card ? "linear-gradient(180deg, #081d2c, #030d15)" : "rgba(96,165,250,0.03)",
                        border: !selectedSlotIndex?.isAi && selectedSlotIndex?.index === i
                          ? "2px solid #fbbf24"
                          : slot.isFrozen
                          ? "2px solid #3b82f6"
                          : slot.isSilenced
                          ? "2px solid #6b7280"
                          : slot.isStunned
                          ? "2px solid #eab308"
                          : "1px dashed rgba(96,165,250,0.25)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.2s"
                      }}
                      onClick={() => setSelectedSlotIndex({ index: i, isAi: false })}
                    >
                      {slot.card ? (
                        <>
                          <span style={{ fontSize: 18 }}>{slot.card.avatar}</span>
                          <span style={{ fontSize: 8, fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "90%", textAlign: "center" }}>
                            {slot.card.name}
                          </span>
                          <div style={{ display: "flex", gap: 4, fontSize: 8, marginTop: 2 }}>
                            <span style={{ color: "#ef4444" }}>⚔️ {slot.card.attack + slot.bonusAttack}</span>
                            <span style={{ color: "#3b82f6" }}>🛡️ {slot.card.defense + slot.bonusDefense}</span>
                          </div>
                          {/* Status Badge Overlays */}
                          <div style={{ position: "absolute", top: 2, left: 2, display: "flex", gap: 1 }}>
                            {slot.isFrozen && <span title="مجمد" style={{ fontSize: 8 }}>❄️</span>}
                            {slot.isSilenced && <span title="مكتوم" style={{ fontSize: 8 }}>🔇</span>}
                            {slot.isStunned && <span title="مصدوم" style={{ fontSize: 8 }}>💫</span>}
                          </div>
                          {slot.card.isCustom && (
                            <span style={{ position: "absolute", bottom: 1, right: 1, background: "#fbbf24", color: "#000", fontSize: 6, padding: "0 2px", borderRadius: 2, fontWeight: "black" }}>
                              مختبر
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }}>مركز {i + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Clicked Slot Menu Drawer */}
            {selectedSlotIndex !== null && (() => {
              const currentSlot = selectedSlotIndex.isAi 
                ? simSlotsOpponent[selectedSlotIndex.index] 
                : simSlotsPlayer[selectedSlotIndex.index];

              return (
                <div style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(10, 15, 20, 0.95)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                  animation: "fadeIn 0.2s"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: "bold", color: "#fbbf24" }}>
                      ⚙️ إدارة مركز الملعب #{selectedSlotIndex.index + 1} ({selectedSlotIndex.isAi ? "فريق الخصم" : "فريقك الحليف"})
                    </span>
                    <button
                      type="button"
                      style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12 }}
                      onClick={() => {
                        setSelectedSlotIndex(null);
                        setCustomSpawnName("");
                      }}
                    >
                      ✕ إغلاق
                    </button>
                  </div>

                  {!currentSlot.card ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          style={{
                            flex: 1,
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            color: "#000",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: "bold",
                            cursor: "pointer"
                          }}
                          onClick={() => handleSpawnTestCard(selectedSlotIndex.index, selectedSlotIndex.isAi)}
                        >
                          🃏 إنزال كارت الاختبار الحالي هنا
                        </button>
                      </div>

                      <div style={{
                        padding: 10,
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)"
                      }}>
                        <span style={{ fontSize: 11, color: "#34d399", fontWeight: "bold", display: "block", marginBottom: 8 }}>
                          ➕ أو استدعاء لاعب مخصص فوراً:
                        </span>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          <div style={{ flex: "1 1 120px" }}>
                            <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 2 }}>اسم اللاعب</label>
                            <input
                              type="text"
                              placeholder="مثال: محمد صلاح"
                              style={{ width: "100%", padding: 5, fontSize: 11, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4 }}
                              value={customSpawnName}
                              onChange={(e) => setCustomSpawnName(e.target.value)}
                            />
                          </div>
                          <div style={{ width: 80 }}>
                            <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 2 }}>المركز</label>
                            <select
                              style={{ width: "100%", padding: 4, fontSize: 11, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4 }}
                              value={customSpawnRole}
                              onChange={(e) => setCustomSpawnRole(e.target.value as any)}
                            >
                              <option value="attacker">مهاجم</option>
                              <option value="midfielder">وسط</option>
                              <option value="defender">مدافع</option>
                              <option value="goalkeeper">حارس</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                          <div style={{ width: 65 }}>
                            <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 2 }}>الهجوم</label>
                            <input
                              type="number"
                              min={0}
                              max={15}
                              style={{ width: "100%", padding: 5, fontSize: 11, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4 }}
                              value={customSpawnAttack}
                              onChange={(e) => setCustomSpawnAttack(Number(e.target.value))}
                            />
                          </div>
                          <div style={{ width: 65 }}>
                            <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 2 }}>الدفاع</label>
                            <input
                              type="number"
                              min={0}
                              max={15}
                              style={{ width: "100%", padding: 5, fontSize: 11, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4 }}
                              value={customSpawnDefense}
                              onChange={(e) => setCustomSpawnDefense(Number(e.target.value))}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, paddingTop: 12 }}>
                            <input
                              type="checkbox"
                              id="custom_spawn_legend"
                              checked={customSpawnIsLegend}
                              onChange={(e) => setCustomSpawnIsLegend(e.target.checked)}
                              style={{ width: 14, height: 14, cursor: "pointer" }}
                            />
                            <label htmlFor="custom_spawn_legend" style={{ fontSize: 11, color: "#fff", cursor: "pointer" }}>أسطورة؟ ✨</label>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, paddingTop: 12 }}>
                            <input
                              type="checkbox"
                              id="custom_spawn_attach_ability"
                              checked={customSpawnAttachAbility}
                              onChange={(e) => setCustomSpawnAttachAbility(e.target.checked)}
                              style={{ width: 14, height: 14, cursor: "pointer" }}
                            />
                            <label htmlFor="custom_spawn_attach_ability" style={{ fontSize: 11, color: "#aaa", cursor: "pointer" }}>ربط القدرة؟ ⚙️</label>
                          </div>
                        </div>

                        <button
                          type="button"
                          style={{
                            width: "100%",
                            background: "#3b82f6",
                            color: "#fff",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: "bold",
                            cursor: "pointer"
                          }}
                          onClick={() => {
                            const customCard = {
                              name: customSpawnName.trim() || `لاعب مخصص #${selectedSlotIndex.index + 1}`,
                              attack: customSpawnAttack,
                              defense: customSpawnDefense,
                              role: customSpawnRole,
                              avatar: customSpawnIsLegend ? "👑" : "🏃",
                              isLegend: customSpawnIsLegend,
                              ability: customSpawnAttachAbility ? getAbilityObject() : undefined,
                              isCustom: true
                            };

                            if (selectedSlotIndex.isAi) {
                              const next = [...simSlotsOpponent];
                              next[selectedSlotIndex.index] = {
                                ...next[selectedSlotIndex.index],
                                card: customCard,
                                isRevealed: true
                              };
                              setSimSlotsOpponent(next);
                              addSimLog(`✨ تم إنزال لاعب مخصص [${customCard.name}] (${customSpawnIsLegend ? "أسطورة" : "عادي"}) في مركز الخصم #${selectedSlotIndex.index + 1}`);
                            } else {
                              const next = [...simSlotsPlayer];
                              next[selectedSlotIndex.index] = {
                                ...next[selectedSlotIndex.index],
                                card: customCard,
                                isRevealed: true
                              };
                              setSimSlotsPlayer(next);
                              addSimLog(`✨ تم إنزال لاعب مخصص [${customCard.name}] (${customSpawnIsLegend ? "أسطورة" : "عادي"}) في مركز الحليف #${selectedSlotIndex.index + 1}`);
                            }

                            setCustomSpawnName("");
                            setCustomSpawnAttack(8);
                            setCustomSpawnDefense(5);
                            setCustomSpawnIsLegend(false);
                            setSelectedSlotIndex(null);
                          }}
                        >
                          ➕ استدعاء الكارت المخصص للملعب
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: "bold" }}
                          onClick={() => handleSlotAction("reveal")}
                        >
                          👁️ كشف الكارت
                        </button>
                        <button
                          type="button"
                          style={{ background: "#8b5cf6", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: "bold" }}
                          onClick={() => handleSlotAction("play")}
                        >
                          ⚡ لعب وتفعيل الكارت
                        </button>
                        <button
                          type="button"
                          style={{ background: currentSlot.isFrozen ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid #3b82f6", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                          onClick={() => handleSlotAction("freeze")}
                        >
                          {currentSlot.isFrozen ? "❄️ إلغاء التجميد" : "❄️ تجميد الكارت"}
                        </button>
                        <button
                          type="button"
                          style={{ background: currentSlot.isSilenced ? "rgba(107,114,128,0.3)" : "rgba(107,114,128,0.1)", color: "#9ca3af", border: "1px solid #6b7280", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                          onClick={() => handleSlotAction("silence")}
                        >
                          {currentSlot.isSilenced ? "🔇 إلغاء كتم القدرة" : "🔇 كتم القدرة"}
                        </button>
                        <button
                          type="button"
                          style={{ background: currentSlot.isStunned ? "rgba(234,179,8,0.3)" : "rgba(234,179,8,0.1)", color: "#facc15", border: "1px solid #eab308", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                          onClick={() => handleSlotAction("stun")}
                        >
                          {currentSlot.isStunned ? "💫 إلغاء الصعق" : "💫 صعق الكارت"}
                        </button>
                        <button
                          type="button"
                          style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: "bold" }}
                          onClick={() => handleSlotAction("destroy")}
                        >
                          🟥 طرد واستبعاد الكارت
                        </button>
                      </div>

                      {/* Manual stats modification panel */}
                      <div style={{
                        marginTop: 10,
                        padding: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: 8,
                        width: "100%"
                      }}>
                        <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: "bold", display: "block", marginBottom: 6 }}>
                          📊 تعديل طاقات هذا الكارت يدوياً بالملعب:
                        </span>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 60 }}>
                            <label style={{ fontSize: 9, color: "#aaa", display: "block", marginBottom: 2 }}>الهجوم الأساسي</label>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              style={{ width: "100%", padding: 4, fontSize: 10, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4 }}
                              value={currentSlot.card.attack}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const next = selectedSlotIndex.isAi ? [...simSlotsOpponent] : [...simSlotsPlayer];
                                if (next[selectedSlotIndex.index].card) {
                                  next[selectedSlotIndex.index].card!.attack = val;
                                  if (selectedSlotIndex.isAi) setSimSlotsOpponent(next);
                                  else setSimSlotsPlayer(next);
                                }
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 60 }}>
                            <label style={{ fontSize: 9, color: "#aaa", display: "block", marginBottom: 2 }}>الدفاع الأساسي</label>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              style={{ width: "100%", padding: 4, fontSize: 10, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4 }}
                              value={currentSlot.card.defense}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const next = selectedSlotIndex.isAi ? [...simSlotsOpponent] : [...simSlotsPlayer];
                                if (next[selectedSlotIndex.index].card) {
                                  next[selectedSlotIndex.index].card!.defense = val;
                                  if (selectedSlotIndex.isAi) setSimSlotsOpponent(next);
                                  else setSimSlotsPlayer(next);
                                }
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 60 }}>
                            <label style={{ fontSize: 9, color: "#aaa", display: "block", marginBottom: 2 }}>بونص الهجوم</label>
                            <input
                              type="number"
                              style={{ width: "100%", padding: 4, fontSize: 10, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4 }}
                              value={currentSlot.bonusAttack}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const next = selectedSlotIndex.isAi ? [...simSlotsOpponent] : [...simSlotsPlayer];
                                next[selectedSlotIndex.index].bonusAttack = val;
                                if (selectedSlotIndex.isAi) setSimSlotsOpponent(next);
                                else setSimSlotsPlayer(next);
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 60 }}>
                            <label style={{ fontSize: 9, color: "#aaa", display: "block", marginBottom: 2 }}>بونص الدفاع</label>
                            <input
                              type="number"
                              style={{ width: "100%", padding: 4, fontSize: 10, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4 }}
                              value={currentSlot.bonusDefense}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const next = selectedSlotIndex.isAi ? [...simSlotsOpponent] : [...simSlotsPlayer];
                                next[selectedSlotIndex.index].bonusDefense = val;
                                if (selectedSlotIndex.isAi) setSimSlotsOpponent(next);
                                else setSimSlotsPlayer(next);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* بوابة المواجهة اليدوية الثنائية (لاعب ضد لاعب) */}
            <div style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <span style={{ fontSize: 11, fontWeight: "bold", color: "#fbbf24" }}>
                ⚔️ اختبار المواجهة الثنائية اليدوية (لاعب ضد لاعب):
              </span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: "#888", display: "block", marginBottom: 2 }}>اختر لاعبك:</label>
                  <select
                    value={manualPlayerSlotIdx ?? ""}
                    onChange={(e) => setManualPlayerSlotIdx(e.target.value === "" ? null : Number(e.target.value))}
                    style={{ width: "100%", padding: 4, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4, fontSize: 10 }}
                  >
                    <option value="">-- اختر كارت حليف --</option>
                    {simSlotsPlayer.map((s, idx) => (
                      <option key={s.id} value={idx} disabled={!s.card}>
                        مركز {idx + 1}: {s.card ? s.card.name : "فارغ"}
                      </option>
                    ))}
                  </select>
                </div>
                <span style={{ fontSize: 12, color: "#444" }}>ضد</span>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: "#888", display: "block", marginBottom: 2 }}>اختر الخصم:</label>
                  <select
                    value={manualOpponentSlotIdx ?? ""}
                    onChange={(e) => setManualOpponentSlotIdx(e.target.value === "" ? null : Number(e.target.value))}
                    style={{ width: "100%", padding: 4, background: "#0c0d0f", border: "1px solid #333", color: "#fff", borderRadius: 4, fontSize: 10 }}
                  >
                    <option value="">-- اختر كارت خصم --</option>
                    {simSlotsOpponent.map((s, idx) => (
                      <option key={s.id} value={idx} disabled={!s.card}>
                        مركز {idx + 1}: {s.card ? s.card.name : "فارغ"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                disabled={manualPlayerSlotIdx === null || manualOpponentSlotIdx === null}
                style={{
                  padding: 8,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  borderRadius: 6,
                  color: "#000",
                  fontWeight: "black",
                  fontSize: 11,
                  cursor: "pointer",
                  opacity: (manualPlayerSlotIdx === null || manualOpponentSlotIdx === null) ? 0.5 : 1
                }}
                onClick={() => {
                  if (manualPlayerSlotIdx === null || manualOpponentSlotIdx === null) return;
                  const pSlot = simSlotsPlayer[manualPlayerSlotIdx];
                  const oSlot = simSlotsOpponent[manualOpponentSlotIdx];
                  if (!pSlot.card || !oSlot.card) return;

                  // Decide stats based on clashMode
                  const pBase = clashMode === "attack" ? pSlot.card.attack : pSlot.card.defense;
                  const pBonus = clashMode === "attack" ? pSlot.bonusAttack : pSlot.bonusDefense;
                  const pTotal = pSlot.isFrozen || pSlot.isStunned ? 0 : Math.max(0, pBase + pBonus);

                  const oBase = clashMode === "attack" ? oSlot.card.defense : oSlot.card.attack;
                  const oBonus = clashMode === "attack" ? oSlot.bonusDefense : oSlot.bonusAttack;
                  const oTotal = oSlot.isFrozen || oSlot.isStunned ? 0 : Math.max(0, oBase + oBonus);

                  let winner: "player" | "opponent" | "draw" = "draw";
                  if (pTotal > oTotal) winner = "player";
                  else if (pTotal < oTotal) winner = "opponent";

                  let mathExplanation = "";
                  if (clashMode === "attack") {
                    mathExplanation = `يقوم الحليف [${pSlot.card.name}] بشن هجوم بقوة ${pTotal} نقاط (${pBase} أساسي + ${pBonus >= 0 ? "+" : ""}${pBonus} معززات)، بينما يتصدى الخصم [${oSlot.card.name}] بدفاع قوته ${oTotal} نقاط (${oBase} أساسي + ${oBonus >= 0 ? "+" : ""}${oBonus} معززات).`;
                  } else {
                    mathExplanation = `يقوم الخصم [${oSlot.card.name}] بالهجوم بقوة ${oTotal} نقاط (${oBase} أساسي + ${oBonus >= 0 ? "+" : ""}${oBonus} معززات)، بينما يتصدى الحليف [${pSlot.card.name}] بدفاع قوته ${pTotal} نقاط (${pBase} أساسي + ${pBonus >= 0 ? "+" : ""}${pBonus} معززات).`;
                  }

                  if (pSlot.card.isLegend || oSlot.card.isLegend) {
                    const legendNames = [];
                    if (pSlot.card.isLegend) legendNames.push(`[${pSlot.card.name}] (الحليف الأسطوري)`);
                    if (oSlot.card.isLegend) legendNames.push(`[${oSlot.card.name}] (الخصم الأسطوري)`);
                    mathExplanation += ` وتأثير الكارت الأسطوري ${legendNames.join(" و ")} يظهر في تعديل طاقات الملعب الإضافية وتفعيل شروط القواعد الخاصة بالمباراة!`;
                  }

                  setActiveDuel({
                    playerName: pSlot.card.name,
                    playerBase: pBase,
                    playerBonus: pBonus,
                    playerTotal: pTotal,
                    playerIsLegend: pSlot.card.isLegend,
                    playerAvatar: pSlot.card.avatar,
                    opponentName: oSlot.card.name,
                    opponentBase: oBase,
                    opponentBonus: oBonus,
                    opponentTotal: oTotal,
                    opponentIsLegend: oSlot.card.isLegend,
                    opponentAvatar: oSlot.card.avatar,
                    clashMode: clashMode,
                    winner: winner,
                    mathExplanation: mathExplanation,
                  });

                  addSimLog(`⚔️ مواجهة ثنائية يدوية: [${pSlot.card.name}] (${pTotal} نقطة) ضد [${oSlot.card.name}] (${oTotal} نقطة) - الفائز: ${winner === "player" ? "الحليف ⚽" : winner === "opponent" ? "الخصم 🧤" : "تعادل 🤝"}`);
                }}
              >
                تشغيل المواجهة الثنائية اليدوية ⚔️
              </button>
            </div>

            {/* Live Duel Arena Card */}
            {activeDuel && (
              <div style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 10,
                background: "linear-gradient(135deg, #091a15, #020705)",
                border: activeDuel.winner === "player" 
                  ? "2px solid #10b981" 
                  : activeDuel.winner === "opponent" 
                  ? "2px solid #ef4444" 
                  : "2px solid #fbbf24",
                boxShadow: "0 8px 25px rgba(0,0,0,0.6)",
                position: "relative",
                animation: "scaleUp 0.25s ease"
              }}>
                <button
                  type="button"
                  style={{ position: "absolute", top: 6, left: 6, background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14 }}
                  onClick={() => setActiveDuel(null)}
                >
                  ✕ إغلاق
                </button>

                <div style={{ textAlign: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>
                    🏟️ حلبة الصدام الثنائي المباشر ({activeDuel.clashMode === "attack" ? "الحليف يهاجم والخصم يدافع" : "الخصم يهاجم والحليف يدافع"})
                  </span>
                  <h5 style={{ margin: "4px 0 0 0", fontSize: 14, fontWeight: "900", color: activeDuel.winner === "player" ? "#34d399" : activeDuel.winner === "opponent" ? "#f87171" : "#fbbf24" }}>
                    {activeDuel.winner === "player" 
                      ? "⚽ جول! الحليف يسجل هدفاً كاسحاً" 
                      : activeDuel.winner === "opponent" 
                      ? "🧤 تصدي ناجح! الخصم يصد الهجمة" 
                      : "🤝 تعادل تكتيكي! صدام متكافئ"}
                  </h5>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                  {/* Player Slot details */}
                  <div style={{ 
                    flex: 1, 
                    textAlign: "center", 
                    padding: 8, 
                    borderRadius: 8, 
                    background: "rgba(96,165,250,0.04)", 
                    border: activeDuel.playerIsLegend ? "1px solid #fbbf24" : "1px solid rgba(255,255,255,0.05)"
                  }}>
                    <span style={{ fontSize: 24, display: "block" }}>{activeDuel.playerAvatar}</span>
                    <span style={{ fontSize: 11, fontWeight: "bold", color: activeDuel.playerIsLegend ? "#fbbf24" : "#fff", display: "block" }}>
                      {activeDuel.playerIsLegend && "👑 "}
                      {activeDuel.playerName}
                    </span>
                    <span style={{ fontSize: 9, color: "#888", display: "block" }}>
                      {activeDuel.clashMode === "attack" ? "القوة: هجوم" : "القوة: دفاع"}
                    </span>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: "bold", color: "#60a5fa" }}>{activeDuel.playerTotal}</span>
                      <span style={{ fontSize: 9, color: "#aaa", display: "block" }}>
                        ({activeDuel.playerBase} أساسي {activeDuel.playerBonus >= 0 ? "+" : ""}{activeDuel.playerBonus} معزز)
                      </span>
                    </div>
                  </div>

                  <span style={{ fontSize: 16, fontWeight: "bold", color: "#444" }}>ضد</span>

                  {/* Opponent Slot details */}
                  <div style={{ 
                    flex: 1, 
                    textAlign: "center", 
                    padding: 8, 
                    borderRadius: 8, 
                    background: "rgba(239,68,68,0.04)", 
                    border: activeDuel.opponentIsLegend ? "1px solid #fbbf24" : "1px solid rgba(255,255,255,0.05)"
                  }}>
                    <span style={{ fontSize: 24, display: "block" }}>{activeDuel.opponentAvatar}</span>
                    <span style={{ fontSize: 11, fontWeight: "bold", color: activeDuel.opponentIsLegend ? "#fbbf24" : "#fff", display: "block" }}>
                      {activeDuel.opponentIsLegend && "👑 "}
                      {activeDuel.opponentName}
                    </span>
                    <span style={{ fontSize: 9, color: "#888", display: "block" }}>
                      {activeDuel.clashMode === "attack" ? "القوة: دفاع" : "القوة: هجوم"}
                    </span>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: "bold", color: "#f87171" }}>{activeDuel.opponentTotal}</span>
                      <span style={{ fontSize: 9, color: "#aaa", display: "block" }}>
                        ({activeDuel.opponentBase} أساسي {activeDuel.opponentBonus >= 0 ? "+" : ""}{activeDuel.opponentBonus} معزز)
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  marginTop: 8, 
                  padding: 8, 
                  borderRadius: 6, 
                  background: "rgba(255,255,255,0.02)", 
                  fontSize: 10, 
                  color: "#bbb", 
                  lineHeight: 1.4,
                  textAlign: "right"
                }}>
                  <strong>📊 تحليل القوى والحسابات:</strong>
                  <p style={{ margin: "2px 0 0 0" }}>{activeDuel.mathExplanation}</p>
                </div>
              </div>
            )}

            {/* Test Shootout clashes panel */}
            <div style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 8,
              background: "rgba(255,255,255,0.01)",
              border: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <span style={{ fontSize: 11, fontWeight: "bold", color: "#aaa" }}>
                ⚔️ اختبار تصادم الهجوم والدفاع المباشر للمباراة بالكامل:
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: 8,
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    border: "none",
                    borderRadius: 6,
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                  onClick={() => handleSimulateClash("attack")}
                >
                  🚀 محاكاة تسديد الهجوم (فريقنا يهاجم)
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: 8,
                    background: "linear-gradient(135deg, #f59e0b, #b45309)",
                    border: "none",
                    borderRadius: 6,
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                  onClick={() => handleSimulateClash("defense")}
                >
                  🛡️ محاكاة صد الدفاع (فريقنا يدافع)
                </button>
              </div>
            </div>

            {/* لوحة حساب النقاط التفصيلية جنبًا إلى جنب */}
            <div style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: "bold", color: "#fbbf24" }}>
                  📊 لوحة حساب النقاط المباشرة التفصيلية (جنبًا إلى جنب)
                </span>
                <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.3)", padding: 2, borderRadius: 6 }}>
                  <button
                    type="button"
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      padding: "2px 6px",
                      background: clashMode === "attack" ? "#3b82f6" : "transparent",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                    onClick={() => setClashMode("attack")}
                  >
                    فريقنا يهاجم ⚔️
                  </button>
                  <button
                    type="button"
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      padding: "2px 6px",
                      background: clashMode === "defense" ? "#f59e0b" : "transparent",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                    onClick={() => setClashMode("defense")}
                  >
                    فريقنا يدافع 🛡️
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {/* Player side */}
                <div style={{ flex: 1, background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 6, border: "1px solid rgba(96,165,250,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: "bold", color: "#60a5fa", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 2, marginBottom: 4 }}>
                    <span>النقاط</span>
                    <span>لاعب فريقك</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {simSlotsPlayer.map((slot, i) => {
                      if (!slot.card) {
                        return (
                          <div key={slot.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#555" }}>
                            <span>0</span>
                            <span>مركز {i + 1}: خالي</span>
                          </div>
                        );
                      }
                      const base = clashMode === "attack" ? slot.card.attack : slot.card.defense;
                      const bonus = clashMode === "attack" ? slot.bonusAttack : slot.bonusDefense;
                      const total = Math.max(0, base + bonus);
                      const invalid = slot.isFrozen || slot.isStunned;
                      const final = invalid ? 0 : total;

                      return (
                        <div key={slot.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: invalid ? "#ef4444" : "#fff", opacity: invalid ? 0.6 : 1 }}>
                          <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                            {invalid ? (slot.isFrozen ? "❄️ 0" : "💫 0") : `${final} (${base}${bonus >= 0 ? "+" : ""}${bonus})`}
                          </span>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 65 }} title={slot.card.name}>
                            {slot.card.isLegend && <span style={{ color: "#fbbf24", marginRight: 2 }} title="كارت أسطورة">👑 </span>}
                            {slot.card.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 6, paddingTop: 4, fontSize: 10, fontWeight: "bold", color: "#60a5fa" }}>
                    <span>{simSlotsPlayer.reduce((sum, slot) => {
                      if (!slot.card || slot.isFrozen || slot.isStunned) return sum;
                      const base = clashMode === "attack" ? slot.card.attack : slot.card.defense;
                      const bonus = clashMode === "attack" ? slot.bonusAttack : slot.bonusDefense;
                      return sum + Math.max(0, base + bonus);
                    }, 0)}</span>
                    <span>القوة {clashMode === "attack" ? "الهجومية" : "الدفاعية"}:</span>
                  </div>
                </div>

                {/* AI side */}
                <div style={{ flex: 1, background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 6, border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: "bold", color: "#f87171", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 2, marginBottom: 4 }}>
                    <span>النقاط</span>
                    <span>لاعب الخصم</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {simSlotsOpponent.map((slot, i) => {
                      if (!slot.card) {
                        return (
                          <div key={slot.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#555" }}>
                            <span>0</span>
                            <span>مركز {i + 1}: خالي</span>
                          </div>
                        );
                      }
                      const base = clashMode === "attack" ? slot.card.defense : slot.card.attack;
                      const bonus = clashMode === "attack" ? slot.bonusDefense : slot.bonusAttack;
                      const total = Math.max(0, base + bonus);
                      const invalid = slot.isFrozen || slot.isStunned;
                      const final = invalid ? 0 : total;

                      return (
                        <div key={slot.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: invalid ? "#ef4444" : "#fff", opacity: invalid ? 0.6 : 1 }}>
                          <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                            {invalid ? (slot.isFrozen ? "❄️ 0" : "💫 0") : `${final} (${base}${bonus >= 0 ? "+" : ""}${bonus})`}
                          </span>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 65 }} title={slot.card.name}>
                            {slot.card.isLegend && <span style={{ color: "#fbbf24", marginRight: 2 }} title="كارت أسطورة">👑 </span>}
                            {slot.card.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 6, paddingTop: 4, fontSize: 10, fontWeight: "bold", color: "#f87171" }}>
                    <span>{simSlotsOpponent.reduce((sum, slot) => {
                      if (!slot.card || slot.isFrozen || slot.isStunned) return sum;
                      const base = clashMode === "attack" ? slot.card.defense : slot.card.attack;
                      const bonus = clashMode === "attack" ? slot.bonusDefense : slot.bonusAttack;
                      return sum + Math.max(0, base + bonus);
                    }, 0)}</span>
                    <span>القوة {clashMode === "attack" ? "الدفاعية" : "الهجومية"}:</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulator Console Logs */}
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>
                📟 سجل محاكاة القواعد الفعلي المباشر:
              </span>
              <div style={{
                background: "#050807",
                border: "1px solid #1a2c26",
                padding: 8,
                borderRadius: 6,
                maxHeight: 130,
                overflowY: "auto",
                fontSize: 10,
                color: "#52b788",
                fontFamily: "monospace",
                textAlign: "right",
                lineHeight: 1.6
              }}>
                {simLogs.length === 0 ? (
                  <div style={{ color: "#666" }}>الملعب جاهز للمحاكاة. قم بإنزال الكروت والتفاعل معها لتظهر التقارير هنا.</div>
                ) : (
                  simLogs.map((log, i) => (
                    <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: 2, marginBottom: 2 }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      <AnimatePresence>
        {toast && (
          <GameToast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
