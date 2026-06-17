import React, { useState } from "react";
import { CardAbility, CardAbilityAction, CardAbilityCondition, CardAbilityTriggerType } from "../types";
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

export default function SandboxTester() {
  const [editMode, setEditMode] = useState<"visual" | "json">("visual");
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
    message: "✓ القدرة صالحة ومطابقة لمحرك قواعد مرتدة (Valid)",
    details: [
      "الحدث المسبب (Trigger): عند كشف الكارت في الملعب",
      "شروط التفعيل: يجب أن يكون الكارت مكشوفاً",
      "إجراء 1: إضافة +2 لطاقة الهجوم لـ جميع كروت الحلفاء بالملعب طالما بقي الكارت مكشوفاً بالملعب",
    ],
  });

  // Sandbox Simulator states
  const [simRole, setSimRole] = useState<"attacker" | "defender">("attacker");
  const [simOpponentCards, setSimOpponentCards] = useState<number>(3);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simCalculatedScore, setSimCalculatedScore] = useState<{
    attackerScore: number;
    defenderScore: number;
    winner: string;
  } | null>(null);

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
        message: "✓ القدرة صالحة ومطابقة لمحرك قواعد مرتدة (Valid)",
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

      // Sync visual builder states
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
    const next = [...conditions, { type: "IsFaceUp" } as CardAbilityCondition];
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

  // Run Sandbox Simulation
  const runSimulation = () => {
    const abilityObj = getAbilityObject();
    const check = validateAbility(abilityObj);
    if (!check.isValid) {
      setSimLogs(["خطأ: لا يمكن بدء المحاكاة لأن بنية القدرة غير صالحة!"]);
      setSimCalculatedScore(null);
      return;
    }

    const logs: string[] = [];
    logs.push("🚀 انطلاق صفارة الحكم لبدء المحاكاة التفاعلية للمحرك...");
    logs.push(`⚙️ إعدادات المباراة الافتراضية: الكارت بالمركز [${simRole === "attacker" ? "المهاجم" : "المدافع"}]`);
    logs.push(`👥 عدد كروت الخصم المكشوفة بالملعب: ${simOpponentCards}`);

    let playerAttack = simRole === "attacker" ? mockAttack : 0;
    let playerDefense = simRole === "defender" ? mockDefense : 0;
    let aiAttack = simRole === "defender" ? 8 : 0;
    let aiDefense = simRole === "attacker" ? 6 : 0;

    logs.push(`📊 القوة الأساسية للطرفين: هجوم اللاعب = ${playerAttack} | دفاع الخصم = ${aiDefense}`);
    
    // Evaluate triggers
    logs.push(`📡 فحص الحدث المسبب للقدرة: [ ${abilityObj.trigger} ]`);
    let triggerMatches = false;
    if (abilityObj.trigger === "CardPlayed" || abilityObj.trigger === "CardRevealed") {
      triggerMatches = true;
      logs.push("✓ الحدث متطابق: تم استدعاء/كشف الكارت بنجاح في دورة اللعب.");
    } else if (abilityObj.trigger === "AttackStarted" && simRole === "attacker") {
      triggerMatches = true;
      logs.push("✓ الحدث متطابق: انطلقت هجمة من طرف اللاعب.");
    } else if (abilityObj.trigger === "DefenseStarted" && simRole === "defender") {
      triggerMatches = true;
      logs.push("✓ الحدث متطابق: يقوم اللاعب بالدفاع وصد الهجمة.");
    } else {
      logs.push("⚠️ لم يتطابق الحدث مع حالة اللعب الحالية، لن تفعل القدرة تلقائياً.");
    }

    // Evaluate Conditions
    let conditionsMet = true;
    if (triggerMatches && abilityObj.conditions) {
      for (const cond of abilityObj.conditions) {
        if (cond.type === "IsFaceUp") {
          logs.push("🔍 شرط: هل الكارت مكشوف؟ نعم (مكشوف بالملعب).");
        } else if (cond.type === "IsAttacker") {
          if (simRole !== "attacker") {
            conditionsMet = false;
            logs.push("❌ شرط غير محقق: الكارت ليس بوضعية هجوم.");
          } else {
            logs.push("✓ شرط محقق: الكارت بوضعية هجوم.");
          }
        } else if (cond.type === "IsDefender") {
          if (simRole !== "defender") {
            conditionsMet = false;
            logs.push("❌ شرط غير محقق: الكارت ليس بوضعية دفاع.");
          } else {
            logs.push("✓ شرط محقق: الكارت بوضعية دفاع.");
          }
        } else if (cond.type === "IsLegend") {
          if (!mockIsLegend) {
            conditionsMet = false;
            logs.push("❌ شرط غير محقق: الكارت ليس أسطورياً.");
          } else {
            logs.push("✓ شرط محقق: الكارت أسطوري.");
          }
        }
      }
    }

    let appliedModifiers = { attack: 0, defense: 0 };
    let isActionCancelled = false;

    if (triggerMatches && conditionsMet) {
      logs.push("✅ الشروط محققة بالكامل! جاري معالجة الإجراءات (Actions):");
      abilityObj.actions.forEach((act, i) => {
        const value = act.value ?? 0;
        logs.push(`⚙️ معالجة الإجراء #${i+1} [ ${act.type} ] يستهدف [ ${act.target} ]`);

        const isTargetMatch = 
          (act.target === "Allies" && simRole === "attacker") ||
          (act.target === "Self" && simRole === "attacker") ||
          (act.target === "CurrentAttack" && simRole === "attacker") ||
          (act.target === "Enemies" && simRole === "defender") ||
          (act.target === "SelectedEnemy" && simRole === "defender");

        if (act.type === "AddStat") {
          if (act.stat === "attack") {
            appliedModifiers.attack += value;
            logs.push(`📈 تم تطبيق زيادة طاقة الهجوم بـ +${value} نقاط.`);
          } else if (act.stat === "defense") {
            appliedModifiers.defense += value;
            logs.push(`🛡️ تم تطبيق زيادة طاقة الدفاع بـ +${value} نقاط.`);
          }
        } else if (act.type === "RemoveStat") {
          if (act.stat === "attack") {
            appliedModifiers.attack -= value;
            logs.push(`📉 تم تطبيق تقليل طاقة الهجوم بـ -${value} نقاط.`);
          } else if (act.stat === "defense") {
            appliedModifiers.defense -= value;
            logs.push(`📉 تم تطبيق تقليل طاقة الدفاع بـ -${value} نقاط.`);
          }
        } else if (act.type === "FreezeCard") {
          logs.push(`❄️ تم تجميد اللاعب المستهدف للخصم! لن تحسب نقاط قوته للهجمة.`);
        } else if (act.type === "SilenceCard") {
          logs.push(`🔇 تم كتم الكارت المستهدف! تم تعطيل قدرته الخاصة صامتاً.`);
        } else if (act.type === "StunCard") {
          logs.push(`💫 تم صدم الكارت المستهدف! تم إيقاف حركته كلياً.`);
        } else if (act.type === "CancelAction") {
          isActionCancelled = true;
          logs.push(`🚫 تم إلغاء وإبطال حركة الخصم بالكامل!`);
        } else if (act.type === "DrawCard") {
          logs.push(`🃏 تم تطبيق سحب عدد ${value} كروت إضافية لليد.`);
        }
      });
    } else {
      logs.push("🛑 لم تُفعل القدرة لعدم مطابقة الشروط أو الحدث.");
    }

    // Final calculations
    const finalPlayerAttack = Math.max(0, playerAttack + appliedModifiers.attack);
    const finalPlayerDefense = Math.max(0, playerDefense + appliedModifiers.defense);
    const finalAiDefense = isActionCancelled ? 0 : aiDefense;

    let winnerText = "";
    if (simRole === "attacker") {
      winnerText = finalPlayerAttack > finalAiDefense ? "فوز المهاجم (اللاعب) ⚽" : "صد وتصدي رائع (الخصم) 🧤";
      setSimCalculatedScore({
        attackerScore: finalPlayerAttack,
        defenderScore: finalAiDefense,
        winner: winnerText,
      });
    } else {
      winnerText = finalPlayerDefense >= aiAttack ? "تصدي ناجح (اللاعب) 🛡️" : "هدف للخصم ⚽";
      setSimCalculatedScore({
        attackerScore: aiAttack,
        defenderScore: finalPlayerDefense,
        winner: winnerText,
      });
    }

    logs.push("🏁 انتهاء المحاكاة وحساب النتيجة النهائية بدقة.");
    setSimLogs(logs);
  };

  const abilityObj = getAbilityObject();
  const power = calculatePowerScore(abilityObj, {
    attack: mockAttack,
    defense: mockDefense,
    isLegend: mockIsLegend,
  });

  return (
    <div style={{ padding: 16, direction: "rtl", textAlign: "right" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          paddingBottom: 12,
          marginBottom: 16,
          flexDirection: "row-reverse"
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
            🧪 مختبر القدرات وقواعد اللعبة (Sandbox Tester)
          </h2>
          <p style={{ fontSize: 11, color: "#888", margin: "4px 0 0" }}>
            صمم، اختبر، وحاكي كيفية تنفيذ تأثيرات الكروت التكتيكية والأسطورية ديناميكياً مع محرك المباراة
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 8 }}>
          <button
            className={`btn-secondary ${editMode === "visual" ? "active" : ""}`}
            style={{ margin: 0, padding: "4px 12px", fontSize: 11, background: editMode === "visual" ? "#10b981" : "transparent", color: "#fff" }}
            onClick={() => setEditMode("visual")}
          >
            🎛️ منشئ بصري
          </button>
          <button
            className={`btn-secondary ${editMode === "json" ? "active" : ""}`}
            style={{ margin: 0, padding: "4px 12px", fontSize: 11, background: editMode === "json" ? "#10b981" : "transparent", color: "#fff" }}
            onClick={() => setEditMode("json")}
          >
            📝 محرّر JSON
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        
        {/* Left: Input/Editor Panel */}
        <div style={{ flex: "1 1 350px", minWidth: 320, display: "flex", flexDirection: "column", gap: 14 }}>
          
          {/* Card Mock Stats Panel */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.05)"
          }}>
            <span style={{ fontSize: 11, color: "#aaa", fontWeight: "bold", display: "block", marginBottom: 8 }}>طاقة الكارت الأساسية (لحساب الاتزان):</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 80 }}>
                <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 2 }}>الهجوم</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ margin: 0, padding: 4, background: "#0c0d0f", color: "#fff", borderColor: "#333" }}
                  value={mockAttack}
                  onChange={(e) => setMockAttack(Number(e.target.value))}
                  min={0}
                  max={15}
                />
              </div>
              <div style={{ flex: 1, minWidth: 80 }}>
                <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 2 }}>الدفاع</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ margin: 0, padding: 4, background: "#0c0d0f", color: "#fff", borderColor: "#333" }}
                  value={mockDefense}
                  onChange={(e) => setMockDefense(Number(e.target.value))}
                  min={0}
                  max={15}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "16px 0 0" }}>
                <input
                  type="checkbox"
                  id="mock_is_legend"
                  checked={mockIsLegend}
                  onChange={(e) => setMockIsLegend(e.target.checked)}
                />
                <label htmlFor="mock_is_legend" style={{ fontSize: 11, color: "#fff", cursor: "pointer" }}>كارت أسطورة؟</label>
              </div>
            </div>
          </div>

          {editMode === "json" ? (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>كود JSON للقدرة</span>
                <span style={{ fontSize: 10, color: "#666" }}>تعديل مباشر</span>
              </label>
              <textarea
                className="form-input"
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  background: "#0c0d0f",
                  color: "#a7f3d0",
                  borderColor: "rgba(16,185,129,0.2)",
                  height: 250,
                  direction: "ltr",
                  textAlign: "left",
                }}
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 8 }}
                onClick={handleTestJson}
              >
                ⚙️ التحقق من كود JSON واختبار الصلاحية
              </button>
            </div>
          ) : (
            /* Visual Builder Panel */
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              
              {/* Trigger */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">الحدث المسبب للقدرة (Trigger)</label>
                <select
                  className="form-input"
                  style={{ background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                  value={trigger}
                  onChange={(e) => {
                    setTrigger(e.target.value);
                    syncVisualToJson(e.target.value, conditions, actions);
                  }}
                >
                  {VALID_TRIGGERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditions */}
              <div style={{ background: "rgba(255,255,255,0.01)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexDirection: "row-reverse" }}>
                  <span style={{ fontSize: 12, fontWeight: "bold", color: "#ddd" }}>شروط التفعيل (Conditions)</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "2px 8px", fontSize: 10, margin: 0, width: "auto" }}
                    onClick={handleAddCondition}
                  >
                    + إضافة شرط
                  </button>
                </div>

                {conditions.length === 0 ? (
                  <div style={{ fontSize: 11, color: "#666", textAlign: "center", padding: "8px 0" }}>
                    تعمل القدرة دائماً عند حدوث مسببها دون شروط مسبقة.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {conditions.map((cond, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select
                          className="form-input"
                          style={{ margin: 0, padding: 4, fontSize: 11, flex: 1, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                          value={cond.type}
                          onChange={(e) => handleUpdateCondition(idx, "type", e.target.value)}
                        >
                          {VALID_CONDITIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {cond.type === "HasTag" && (
                          <input
                            type="text"
                            placeholder="التاغ"
                            className="form-input"
                            style={{ margin: 0, padding: 4, fontSize: 11, width: 80, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                            value={cond.value || ""}
                            onChange={(e) => handleUpdateCondition(idx, "value", e.target.value)}
                          />
                        )}
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: 4, margin: 0 }}
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
              <div style={{ background: "rgba(255,255,255,0.01)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexDirection: "row-reverse" }}>
                  <span style={{ fontSize: 12, fontWeight: "bold", color: "#ddd" }}>إجراءات التأثير (Actions)</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "2px 8px", fontSize: 10, margin: 0, width: "auto" }}
                    onClick={handleAddAction}
                  >
                    + إضافة إجراء
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {actions.map((act, idx) => (
                    <div key={idx} style={{ background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexDirection: "row-reverse" }}>
                        <span style={{ fontSize: 10, color: "#888", fontWeight: "bold" }}>إجراء #{idx + 1}</span>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: 2, margin: 0 }}
                          onClick={() => handleRemoveAction(idx)}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select
                          className="form-input"
                          style={{ margin: 0, padding: 4, fontSize: 11, flex: 1, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                          value={act.type}
                          onChange={(e) => handleUpdateAction(idx, "type", e.target.value)}
                        >
                          {VALID_ACTIONS.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {/* Target */}
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 9, color: "#888" }}>الهدف:</span>
                          <select
                            className="form-input"
                            style={{ margin: 0, padding: 2, fontSize: 10, width: 85, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                            value={act.target}
                            onChange={(e) => handleUpdateAction(idx, "target", e.target.value)}
                          >
                            {VALID_TARGETS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* AddStat/RemoveStat specific: stat */}
                        {(act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat") && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 9, color: "#888" }}>الخاصية:</span>
                            <select
                              className="form-input"
                              style={{ margin: 0, padding: 2, fontSize: 10, width: 60, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                              value={act.stat || "attack"}
                              onChange={(e) => handleUpdateAction(idx, "stat", e.target.value)}
                            >
                              <option value="attack">هجوم</option>
                              <option value="defense">دفاع</option>
                              <option value="moves">حركات</option>
                              <option value="draw">سحب</option>
                            </select>
                          </div>
                        )}

                        {/* Value input for numeric types */}
                        {(act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat" || act.type === "DrawCard" || act.type === "AddMoves" || act.type === "ReduceMoves") && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 9, color: "#888" }}>القيمة:</span>
                            <input
                              type="number"
                              className="form-input"
                              style={{ margin: 0, padding: 2, fontSize: 10, width: 45, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                              value={act.value ?? 2}
                              onChange={(e) => handleUpdateAction(idx, "value", Number(e.target.value))}
                            />
                          </div>
                        )}

                        {/* Duration Selection */}
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 9, color: "#888" }}>المدة:</span>
                          <select
                            className="form-input"
                            style={{ margin: 0, padding: 2, fontSize: 10, width: 90, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                            value={act.duration || "Instant"}
                            onChange={(e) => handleUpdateAction(idx, "duration", e.target.value)}
                          >
                            {VALID_DURATIONS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* XTurns specific */}
                        {act.duration === "XTurns" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 9, color: "#888" }}>أدوار:</span>
                            <input
                              type="number"
                              className="form-input"
                              style={{ margin: 0, padding: 2, fontSize: 10, width: 40, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                              value={act.durationTurns ?? 2}
                              onChange={(e) => handleUpdateAction(idx, "durationTurns", Number(e.target.value))}
                              min={1}
                            />
                          </div>
                        )}

                        {/* UntilTrigger specific */}
                        {act.duration === "UntilTrigger" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 9, color: "#888" }}>حدث:</span>
                            <input
                              type="text"
                              placeholder="GoalScored"
                              className="form-input"
                              style={{ margin: 0, padding: 2, fontSize: 10, width: 70, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                              value={act.durationTrigger || ""}
                              onChange={(e) => handleUpdateAction(idx, "durationTrigger", e.target.value)}
                            />
                          </div>
                        )}

                        {/* Stackable */}
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <input
                            type="checkbox"
                            id={`sim_stackable_${idx}`}
                            checked={act.stackable !== false}
                            onChange={(e) => handleUpdateAction(idx, "stackable", e.target.checked)}
                          />
                          <label htmlFor={`sim_stackable_${idx}`} style={{ fontSize: 9, color: "#aaa" }}>متراكم</label>
                        </div>

                        {/* Max Uses */}
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 9, color: "#888" }}>أقصى استخدام:</span>
                          <input
                            type="number"
                            className="form-input"
                            style={{ margin: 0, padding: 2, fontSize: 10, width: 35, background: "#0c0d0f", borderColor: "#333", color: "#fff" }}
                            value={act.maxUses ?? ""}
                            onChange={(e) => handleUpdateAction(idx, "maxUses", e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="∞"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Validation & Simulation Panel */}
        <div style={{ flex: "1 1 300px", minWidth: 280, display: "flex", flexDirection: "column", gap: 14 }}>
          
          {/* Live Balance Card Power Score Banner */}
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRight: `4px solid ${power.level === "strong" ? "#ef4444" : power.level === "weak" ? "#3b82f6" : "#10b981"}`,
            textAlign: "right"
          }}>
            <h4 style={{ margin: 0, fontSize: 13, color: "#fff", fontWeight: "bold" }}>
              مقياس قوة واتزان الكارت:
            </h4>
            <div style={{ fontSize: 24, fontWeight: "black", color: power.level === "strong" ? "#f87171" : power.level === "weak" ? "#60a5fa" : "#34d399", margin: "6px 0" }}>
              {power.score} <span style={{ fontSize: 12, color: "#888" }}>نقطة التوازن الكلية</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#ddd" }}>{power.explanation}</p>
          </div>

          {/* Validation Result Box */}
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: validationResult.isValid ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
              border: validationResult.isValid ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(239,68,68,0.25)",
              textAlign: "right",
            }}
          >
            <h4
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: validationResult.isValid ? "#34d399" : "#f87171",
                margin: 0,
              }}
            >
              {validationResult.message}
            </h4>

            {validationResult.isValid && validationResult.details && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 11, color: "#aaa", fontWeight: "bold" }}>التفسير اللغوي للقواعد (Execution Map):</span>
                <ul
                  style={{
                    margin: "6px 0 0",
                    paddingRight: 16,
                    fontSize: 11,
                    color: "#ddd",
                    lineHeight: 1.6,
                    listStyleType: "circle",
                  }}
                >
                  {validationResult.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Interactive Sandbox Simulator */}
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            textAlign: "right"
          }}>
            <h4 style={{ margin: 0, fontSize: 13, color: "#fbbf24", fontWeight: "bold", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 6 }}>
              ⚡ محاكي معالجة القواعد (Sandbox Simulator)
            </h4>
            <p style={{ fontSize: 10, color: "#888", margin: "4px 0 10px" }}>
              ضع الكارت في حالة مباراة افتراضية وشاهد كيف يعالج المحرك نقاط المباراة
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontSize: 9, color: "#888" }}>موقع الكارت</label>
                <select
                  className="form-input"
                  style={{ margin: 0, padding: 4, background: "#0c0d0f", color: "#fff", borderColor: "#333", fontSize: 11 }}
                  value={simRole}
                  onChange={(e) => setSimRole(e.target.value as any)}
                >
                  <option value="attacker">مهاجم (Attacker)</option>
                  <option value="defender">مدافع (Defender)</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontSize: 9, color: "#888" }}>كروت مكشوفة للخصم</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ margin: 0, padding: 4, background: "#0c0d0f", color: "#fff", borderColor: "#333", fontSize: 11 }}
                  value={simOpponentCards}
                  onChange={(e) => setSimOpponentCards(Number(e.target.value))}
                  min={0}
                  max={5}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", padding: 8, fontSize: 11, fontWeight: "bold" }}
              onClick={runSimulation}
            >
              🚀 تشغيل محاكاة معالجة المباراة
            </button>

            {simLogs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 10, color: "#aaa", fontWeight: "bold" }}>سجل معالجة محرك المباراة (Sim Logs):</span>
                <div style={{
                  background: "#060709",
                  padding: 8,
                  borderRadius: 6,
                  maxHeight: 150,
                  overflowY: "auto",
                  fontSize: 10,
                  color: "#a7f3d0",
                  fontFamily: "monospace",
                  textAlign: "right",
                  lineHeight: 1.5,
                  marginTop: 4
                }}>
                  {simLogs.map((log, i) => (
                    <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: 2, marginBottom: 2 }}>{log}</div>
                  ))}
                </div>
              </div>
            )}

            {simCalculatedScore && (
              <div style={{
                marginTop: 10,
                padding: 8,
                borderRadius: 6,
                background: "rgba(52,211,153,0.06)",
                border: "1px solid rgba(52,211,153,0.15)",
                fontSize: 11,
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>النتيجة: <strong>{simCalculatedScore.winner}</strong></span>
                <span>النقاط: {simCalculatedScore.attackerScore} مقابل {simCalculatedScore.defenderScore}</span>
              </div>
            )}
          </div>

          {/* Quick Copy JSON Box */}
          {validationResult.isValid && (
            <div
              style={{
                padding: 12,
                background: "rgba(0,0,0,0.2)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.05)",
                textAlign: "right",
              }}
            >
              <span style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 6 }}>
                كود الحفظ الجاهز (JSON):
              </span>
              <pre
                style={{
                  fontSize: 10,
                  background: "#060709",
                  padding: 8,
                  borderRadius: 6,
                  color: "#fbbf24",
                  overflowX: "auto",
                  direction: "ltr",
                  textAlign: "left",
                  margin: 0,
                }}
              >
                {rawJson}
              </pre>
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 8, width: "100%", padding: 6, fontSize: 11 }}
                onClick={() => {
                  navigator.clipboard.writeText(rawJson);
                  alert("✅ تم نسخ كود JSON للقدرة إلى الحافظة!");
                }}
              >
                📋 نسخ كود الـ JSON بالكامل
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
