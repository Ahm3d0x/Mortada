/**
 * CardEditor - Form for creating/editing a card within a package.
 * Supports conditional rendering for Player cards vs. Tactical/Special cards.
 */

import React, { useState, useEffect } from "react";
import {
  AdminCard,
  AdminSpecialCard,
  AdminPlayerRole,
  ROLE_LABELS,
  DEFAULT_AVATARS,
} from "./adminTypes";
import CardPreview from "./CardPreview";
import {
  calculatePowerScore,
  VALID_TRIGGERS,
  VALID_CONDITIONS,
  VALID_ACTIONS,
  VALID_TARGETS,
  VALID_DURATIONS,
} from "../utils/rulesEngine";

interface CardEditorProps {
  card?: any; // Can be AdminCard or AdminSpecialCard or null (create mode)
  packageId: string;
  packageType: "player" | "special";
  onSave: (data: any) => void;
  onCancel: () => void;
}

const ROLE_OPTIONS: { role: AdminPlayerRole; emoji: string; label: string }[] = [
  { role: "attacker", emoji: "⚡", label: "مهاجم" },
  { role: "midfielder", emoji: "🎯", label: "وسط" },
  { role: "defender", emoji: "🛡️", label: "مدافع" },
  { role: "goalkeeper", emoji: "🧤", label: "حارس" },
];

const AVATAR_OPTIONS = [
  "⚡", "🔥", "💎", "🌟", "👑", "🚀", "🎯", "🦁",
  "🏹", "🧱", "🛡️", "🧤", "🎻", "📐", "🤖", "🗿",
  "🦾", "✨", "🐐", "🏰", "🏆", "🤙", "🔟", "🪄",
  "👹", "🇪🇬", "🇲🇦", "🇧🇷", "🇦🇷", "🇫🇷", "🇩🇪", "🇪🇸",
  "🇵🇹", "🇮🇹", "🇳🇱", "🇧🇪", "🇭🇷", "🇸🇳", "🇨🇦", "🇰🇷",
];

const EFFECT_OPTIONS = [
  { effect: "offside", label: "تسلل مباغت", effectArabic: "تسلل", desc: "يقع كارت هجوم الخصم بمصيدة التسلل ويلغي نقاط المهاجم الأقوى لديه تماماً لهذه الهجمة.", icon: "🚩" },
  { effect: "wet_pitch", label: "أمطار وغرق العشب", effectArabic: "عشب مبلل", desc: "تبلل أرضية الملعب لتحد من سرعة هجمات أو متانة دفاعات خصمك بمقدار 4 نقاط.", icon: "🌧️" },
  { effect: "counter_attack", label: "مرتدة قاتلة", effectArabic: "هجمة مرتدة", desc: "استغل الاندفاع الهجومي للخصم لخلق هجمة معاكسة حاسمة تزيد هجوم المهاجم بـ +4 نقاط.", icon: "↗️" },
  { effect: "fans", label: "الجمهور الحماسي", effectArabic: "دعم الجماهير", desc: "الهتاف المزلزل بالمدرج يمنح أي لاعب مكشوف بملعبك طاقة هجومية ودفاعية إضافية +3 نقاط.", icon: "🥁" },
  { effect: "park_the_bus", label: "تكتيك ركن الباص", effectArabic: "ركن الباص", desc: "تنظيم دفاعي معقد خلف الكرة يغلق المنافذ بالكامل ليعطي المدافعين المعنيين زيادة دفاعية +6 نقاط.", icon: "🚌" },
  { effect: "red_card", label: "طرد مباشر (حمراء)", effectArabic: "كارت أحمر", desc: "حكم المباراة يتدخل! قم باستبعاد أي كارت لاعب مكشوف لخصمك ومطرود من الملعب حتى نهاية المباراة.", icon: "🟥" },
  { effect: "world_cup", label: "طاقة كأس العالم", effectArabic: "روح المونديال", desc: "شحن معنويات الفريق يتيح لك فوراً سحب كارتين إضافيين (من أي مجموعة تناسب تكتيكاتك).", icon: "🏆" }
];

const TACTICAL_ICONS = ["🚩", "🌧️", "↗️", "🥁", "🚌", "🟥", "🏆", "🃏", "⚽", "⚡", "🔥", "👑", "⭐", "🧤", "🧱", "🛡️"];

export default function CardEditor({
  card,
  packageId,
  packageType,
  onSave,
  onCancel,
}: CardEditorProps) {
  const isEdit = !!card;

  // Common fields
  const [name, setName] = useState(card?.name || "");
  const [imageUrl, setImageUrl] = useState(card?.image_url || "");
  const [description, setDescription] = useState(card?.description || "");

  // Player fields
  const [team, setTeam] = useState(card?.team || "");
  const [avatar, setAvatar] = useState(card?.avatar || "⚡");
  const [attack, setAttack] = useState(card?.attack ?? 7);
  const [defense, setDefense] = useState(card?.defense ?? 3);
  const [role, setRole] = useState<AdminPlayerRole>(card?.role || "attacker");
  const [isLegend, setIsLegend] = useState(card?.is_legend || false);
  const [tagsStr, setTagsStr] = useState((card?.tags || []).join(", "));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Tactical fields
  const [effect, setEffect] = useState(card?.effect || "offside");
  const [effectArabic, setEffectArabic] = useState(card?.effect_arabic || "تسلل");
  const [icon, setIcon] = useState(card?.icon || "🚩");

  // Dynamic Ability fields
  const [hasAbility, setHasAbility] = useState(!!card?.ability);
  const [abilityTrigger, setAbilityTrigger] = useState(card?.ability?.trigger || "CardRevealed");
  const [abilityConditions, setAbilityConditions] = useState<any[]>(card?.ability?.conditions || []);
  const [abilityActions, setAbilityActions] = useState<any[]>(card?.ability?.actions || []);

  const ABILITY_TEMPLATES = [
    {
      id: "aura_attack",
      label: "أورا هجوم (+2 هجوم للحلفاء طالما الكارت مكشوف)",
      trigger: "CardRevealed",
      conditions: [{ type: "IsFaceUp" }],
      actions: [{ type: "AddStat", stat: "attack", value: 2, target: "Allies", duration: "WhileFaceUp", stackable: true }]
    },
    {
      id: "aura_defense",
      label: "صخرة دفاع (+3 دفاع للحلفاء طالما الكارت مكشوف)",
      trigger: "CardRevealed",
      conditions: [{ type: "IsFaceUp" }],
      actions: [{ type: "AddStat", stat: "defense", value: 3, target: "Allies", duration: "WhileFaceUp", stackable: true }]
    },
    {
      id: "red_card",
      label: "كارت أحمر (طرد لاعب مكشوف للخصم عند اللعب)",
      trigger: "CardPlayed",
      conditions: [],
      actions: [{ type: "DestroyCard", target: "SelectedEnemy", duration: "Instant" }]
    },
    {
      id: "freeze_enemy",
      label: "تجميد الخصم (تجميد كارت للخصم لمدة دورين)",
      trigger: "CardPlayed",
      conditions: [],
      actions: [{ type: "FreezeCard", target: "SelectedEnemy", duration: "XTurns", durationTurns: 2 }]
    },
    {
      id: "wet_pitch",
      label: "ملعب مبلل (-4 هجوم للخصم للهجمة الحالية)",
      trigger: "CardPlayed",
      conditions: [],
      actions: [{ type: "AddStat", stat: "attack", value: -4, target: "Enemies", duration: "CurrentPhase" }]
    },
    {
      id: "counter_attack",
      label: "مرتدة قاتلة (+4 هجوم للهجمة الحالية)",
      trigger: "CardPlayed",
      conditions: [],
      actions: [{ type: "AddStat", stat: "attack", value: 4, target: "CurrentAttack", duration: "CurrentPhase" }]
    },
    {
      id: "fans",
      label: "الجمهور الحماسي (+3 هجوم ليدوم طوال المباراة)",
      trigger: "CardPlayed",
      conditions: [],
      actions: [{ type: "AddStat", stat: "attack", value: 3, target: "Allies", duration: "WhileAlive", stackable: false }]
    },
    {
      id: "park_the_bus",
      label: "ركن الباص (+6 دفاع للهجمة الحالية)",
      trigger: "CardPlayed",
      conditions: [],
      actions: [{ type: "AddStat", stat: "defense", value: 6, target: "CurrentDefense", duration: "CurrentPhase" }]
    },
    {
      id: "world_cup",
      label: "روح المونديال (سحب كارتين إضافيين)",
      trigger: "CardPlayed",
      conditions: [],
      actions: [{ type: "DrawCard", value: 2, target: "Self", duration: "Instant" }]
    }
  ];

  const handleAddCondition = () => {
    setAbilityConditions([...abilityConditions, { type: "IsFaceUp" }]);
  };

  const handleUpdateCondition = (index: number, key: string, val: string) => {
    const next = [...abilityConditions];
    next[index] = { ...next[index], [key]: val };
    setAbilityConditions(next);
  };

  const handleRemoveCondition = (index: number) => {
    setAbilityConditions(abilityConditions.filter((_, i) => i !== index));
  };

  const handleAddAction = () => {
    setAbilityActions([...abilityActions, { type: "AddStat", target: "Allies", stat: "attack", value: 2, duration: "Instant", stackable: true }]);
  };

  const handleUpdateAction = (index: number, key: string, val: any) => {
    const next = [...abilityActions];
    next[index] = { ...next[index], [key]: val };
    setAbilityActions(next);
  };

  const handleRemoveAction = (index: number) => {
    setAbilityActions(abilityActions.filter((_, i) => i !== index));
  };

  const applyTemplate = (templateId: string) => {
    if (!templateId) return;
    const template = ABILITY_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setAbilityTrigger(template.trigger);
      setAbilityConditions(template.conditions);
      setAbilityActions(template.actions);
      setHasAbility(true);
    }
  };

  // Autofill tactical fields on selection
  const handleEffectChange = (selectedEffect: string) => {
    setEffect(selectedEffect);
    const matched = EFFECT_OPTIONS.find((o) => o.effect === selectedEffect);
    if (matched && !isEdit) {
      setName(matched.label);
      setEffectArabic(matched.effectArabic);
      setDescription(matched.desc);
      setIcon(matched.icon);
    }
  };

  useEffect(() => {
    if (packageType === "player" && !card) {
      setAvatar(DEFAULT_AVATARS[role]);
    }
  }, [role, card, packageType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const ability = hasAbility ? {
      trigger: abilityTrigger,
      conditions: abilityConditions,
      actions: abilityActions
    } : undefined;

    if (packageType === "special") {
      onSave({
        name: name.trim(),
        effect,
        effect_arabic: effectArabic.trim(),
        description: description.trim(),
        icon,
        image_url: imageUrl.trim(),
        ability,
      });
    } else {
      const roleArabic = ROLE_LABELS[role];
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      onSave({
        name: name.trim(),
        team: team.trim(),
        avatar,
        attack,
        defense,
        role,
        role_arabic: roleArabic,
        is_legend: isLegend,
        image_url: imageUrl.trim(),
        description: description.trim(),
        tags,
        ability,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 780 }}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? `✏️ تعديل "${card.name}"` : `➕ كارت ${packageType === "special" ? "تكتيكي" : "لاعب"} جديد`}
          </h2>
          <button className="btn-ghost" onClick={onCancel}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {/* Left: Form fields */}
            <div style={{ flex: "1 1 320px", minWidth: 280 }}>
              
              {/* Conditional fields for Special/Tactical packages */}
              {packageType === "special" ? (
                <>
                  {/* Tactical Effect Type */}
                  <div className="form-group">
                    <label className="form-label">نوع التأثير التكتيكي</label>
                    <select
                      className="form-input"
                      value={effect}
                      onChange={(e) => handleEffectChange(e.target.value)}
                    >
                      {EFFECT_OPTIONS.map((opt) => (
                        <option key={opt.effect} value={opt.effect}>
                          {opt.icon} {opt.label} ({opt.effectArabic})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Name */}
                  <div className="form-group">
                    <label className="form-label">اسم الكارت التكتيكي *</label>
                    <input
                      className="form-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثلاً: تسلل مباغت"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Arabic label */}
                  <div className="form-group">
                    <label className="form-label">الاسم العربي للتأثير</label>
                    <input
                      className="form-input"
                      type="text"
                      value={effectArabic}
                      onChange={(e) => setEffectArabic(e.target.value)}
                      placeholder="مثلاً: تسلل"
                      required
                    />
                  </div>

                  {/* Icon selector */}
                  <div className="form-group">
                    <label className="form-label">
                      أيقونة الكارت: <span style={{ fontSize: 20 }}>{icon}</span>
                    </label>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={{ marginBottom: 8 }}
                    >
                      {showEmojiPicker ? "إخفاء الرموز" : "اختر أيقونة 🃏"}
                    </button>
                    {showEmojiPicker && (
                      <div className="emoji-grid">
                        {TACTICAL_ICONS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            className={`emoji-btn ${
                              icon === em ? "selected" : ""
                            }`}
                            onClick={() => {
                              setIcon(em);
                              setShowEmojiPicker(false);
                            }}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Conditional fields for Player packages */
                <>
                  {/* Name */}
                  <div className="form-group">
                    <label className="form-label">اسم اللاعب *</label>
                    <input
                      className="form-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثلاً: كريستيانو رونالدو"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Team */}
                  <div className="form-group">
                    <label className="form-label">الفريق / المنتخب</label>
                    <input
                      className="form-input"
                      type="text"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      placeholder="مثلاً: البرتغال"
                    />
                  </div>

                  {/* Role */}
                  <div className="form-group">
                    <label className="form-label">المركز</label>
                    <div className="role-selector">
                      {ROLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.role}
                          type="button"
                          className={`role-option ${
                            role === opt.role ? "selected" : ""
                          }`}
                          onClick={() => setRole(opt.role)}
                        >
                          <span className="role-emoji">{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Attack Slider */}
                  <div className="form-group">
                    <label className="form-label">قوة الهجوم</label>
                    <div className="stat-slider-container">
                      <input
                        type="range"
                        className="stat-slider attack-slider"
                        min={0}
                        max={15}
                        value={attack}
                        onChange={(e) => setAttack(Number(e.target.value))}
                      />
                      <span className="stat-value attack-val">{attack}</span>
                    </div>
                  </div>

                  {/* Defense Slider */}
                  <div className="form-group">
                    <label className="form-label">قوة الدفاع</label>
                    <div className="stat-slider-container">
                      <input
                        type="range"
                        className="stat-slider defense-slider"
                        min={0}
                        max={15}
                        value={defense}
                        onChange={(e) => setDefense(Number(e.target.value))}
                      />
                      <span className="stat-value defense-val">{defense}</span>
                    </div>
                  </div>

                  {/* Legend Toggle */}
                  <div className="form-group">
                    <label className="form-label">أسطورة؟</label>
                    <div className="toggle-container">
                      <div
                        className={`toggle-switch ${isLegend ? "active" : ""}`}
                        onClick={() => setIsLegend(!isLegend)}
                      >
                        <div className="toggle-dot" />
                      </div>
                      <span
                        className="toggle-label"
                        style={{ color: isLegend ? "#fbbf24" : "#888" }}
                      >
                        {isLegend ? "⭐ أسطورة" : "لاعب عادي"}
                      </span>
                    </div>
                  </div>

                  {/* Avatar Picker */}
                  <div className="form-group">
                    <label className="form-label">
                      الرمز التعبيري:{" "}
                      <span style={{ fontSize: 20 }}>{avatar}</span>
                    </label>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={{ marginBottom: 8 }}
                    >
                      {showEmojiPicker ? "إخفاء الرموز" : "اختر رمزاً 😎"}
                    </button>
                    {showEmojiPicker && (
                      <div className="emoji-grid">
                        {AVATAR_OPTIONS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            className={`emoji-btn ${
                              avatar === em ? "selected" : ""
                            }`}
                            onClick={() => {
                              setAvatar(em);
                              setShowEmojiPicker(false);
                            }}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Dynamic Ability Section */}
              <div className="form-group" style={{
                marginTop: 16,
                padding: 12,
                background: "rgba(52,211,153,0.03)",
                border: "1px solid rgba(52,211,153,0.15)",
                borderRadius: 12
              }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#34d399", fontWeight: "bold" }}>
                  <input
                    type="checkbox"
                    checked={hasAbility}
                    onChange={(e) => setHasAbility(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  تفعيل القدرات التكتيكية المخصصة (Rules Engine)
                </label>

                {hasAbility && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                    
                    {/* Live Balance / Power Score Indicator */}
                    {(() => {
                      const tempAbility = {
                        trigger: abilityTrigger,
                        conditions: abilityConditions,
                        actions: abilityActions
                      };
                      const power = calculatePowerScore(tempAbility, {
                        attack,
                        defense,
                        isLegend: packageType === "player" ? isLegend : false
                      });
                      const badgeBg = power.level === "strong" ? "#ef4444" : power.level === "weak" ? "#3b82f6" : "#10b981";
                      return (
                        <div style={{
                          padding: 10,
                          borderRadius: 8,
                          background: "rgba(0,0,0,0.3)",
                          borderLeft: `4px solid ${badgeBg}`,
                          fontSize: 11,
                          color: "#fff",
                          direction: "rtl",
                          textAlign: "right"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <strong>مقياس اتزان وقوة الكارت:</strong>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: badgeBg,
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: 10
                            }}>
                              {power.score} نقطة ({power.level === "strong" ? "خارق" : power.level === "weak" ? "ضعيف" : "متوازن"})
                            </span>
                          </div>
                          <p style={{ color: "#aaa", margin: 0, fontSize: 10 }}>{power.explanation}</p>
                        </div>
                      );
                    })()}

                    {/* Ability Templates Dropdown */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11, color: "#888" }}>اختيار قالب قدرة جاهز</label>
                      <select
                        className="form-input"
                        style={{ margin: 0, padding: 6, fontSize: 12, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                        onChange={(e) => applyTemplate(e.target.value)}
                        defaultValue=""
                      >
                        <option value="">-- اختر قالب للتحميل التلقائي --</option>
                        {ABILITY_TEMPLATES.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Trigger */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11, color: "#888" }}>الحدث المسبب للقدرة (Trigger) *</label>
                      <select
                        className="form-input"
                        value={abilityTrigger}
                        onChange={(e) => setAbilityTrigger(e.target.value as any)}
                        style={{ margin: 0, padding: 6, fontSize: 12, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                      >
                        <option value="CardRevealed">CardRevealed (عند كشف الكارت في الملعب)</option>
                        <option value="CardPlayed">CardPlayed (عند إنزال أو لعب الكارت)</option>
                        <option value="AttackStarted">AttackStarted (عند بدء الهجمة)</option>
                        <option value="DefenseStarted">DefenseStarted (عند بدء الدفاع والصد)</option>
                        <option value="GoalScored">GoalScored (عند تسجيل هدف)</option>
                        <option value="TurnStarted">TurnStarted (عند بداية الدور)</option>
                        <option value="TurnEnded">TurnEnded (عند نهاية الدور)</option>
                        <option value="CardDestroyed">CardDestroyed (عند طرد أو استبعاد لاعب)</option>
                      </select>
                    </div>

                    {/* Conditions */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "#aaa", fontWeight: "bold" }}>شروط التفعيل (Conditions)</span>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "2px 8px", fontSize: 10, margin: 0, width: "auto" }}
                          onClick={handleAddCondition}
                        >
                          + إضافة شرط
                        </button>
                      </div>
                      {abilityConditions.length === 0 ? (
                        <div style={{ fontSize: 10, color: "#666", fontStyle: "italic", textAlign: "center", padding: 4 }}>تعمل دائماً بدون شروط مسبقة</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {abilityConditions.map((cond, cIdx) => (
                            <div key={cIdx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <select
                                className="form-input"
                                style={{ margin: 0, padding: 4, fontSize: 11, flex: 1, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                                value={cond.type}
                                onChange={(e) => handleUpdateCondition(cIdx, "type", e.target.value)}
                              >
                                <option value="IsFaceUp">IsFaceUp (الكارت مكشوف)</option>
                                <option value="IsFaceDown">IsFaceDown (الكارت مقلوب)</option>
                                <option value="IsAttacker">IsAttacker (صاحب الكارت مهاجم)</option>
                                <option value="IsDefender">IsDefender (صاحب الكارت مدافع)</option>
                                <option value="CardOwnerIsEnemy">CardOwnerIsEnemy (الكارت للخصم)</option>
                                <option value="IsLegend">IsLegend (الكارت أسطوري)</option>
                                <option value="HasTag">HasTag (يمتلك تاغ معين)</option>
                                <option value="HasAbility">HasAbility (يمتلك قدرة نشطة)</option>
                              </select>
                              {cond.type === "HasTag" && (
                                <input
                                  type="text"
                                  placeholder="التاغ"
                                  className="form-input"
                                  style={{ margin: 0, padding: 4, fontSize: 11, width: 80 }}
                                  value={cond.value || ""}
                                  onChange={(e) => handleUpdateCondition(cIdx, "value", e.target.value)}
                                />
                              )}
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: 4, margin: 0, fontSize: 12 }}
                                onClick={() => handleRemoveCondition(cIdx)}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "#aaa", fontWeight: "bold" }}>إجراءات التأثير (Actions) *</span>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "2px 8px", fontSize: 10, margin: 0, width: "auto" }}
                          onClick={handleAddAction}
                        >
                          + إضافة إجراء
                        </button>
                      </div>
                      {abilityActions.length === 0 ? (
                        <div style={{ fontSize: 10, color: "#ef4444", textAlign: "center", padding: 4 }}>تحذير: يجب إضافة إجراء واحد على الأقل!</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {abilityActions.map((act, aIdx) => (
                            <div key={aIdx} style={{ display: "flex", flexDirection: "column", gap: 4, background: "rgba(0,0,0,0.2)", padding: 6, borderRadius: 6, border: "1px solid rgba(255,255,255,0.03)" }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <select
                                  className="form-input"
                                  style={{ margin: 0, padding: 4, fontSize: 11, flex: 1, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                                  value={act.type}
                                  onChange={(e) => handleUpdateAction(aIdx, "type", e.target.value)}
                                >
                                  <option value="AddStat">AddStat (تعديل القيمة هجوم/دفاع/حركات/سحب)</option>
                                  <option value="RemoveStat">RemoveStat (تخفيض القيمة هجوم/دفاع/حركات/سحب)</option>
                                  <option value="MultiplyStat">MultiplyStat (مضاعفة القيمة هجوم/دفاع)</option>
                                  <option value="CancelAction">CancelAction (إحباط هجمة أو صد/تسلل)</option>
                                  <option value="DestroyCard">DestroyCard (طرد واستبعاد كارت)</option>
                                  <option value="DrawCard">DrawCard (سحب كروت إضافية)</option>
                                  <option value="FreezeCard">FreezeCard (تجميد كارت لاعب ❄️)</option>
                                  <option value="SilenceCard">SilenceCard (كتم قدرة كارت لاعب 🔇)</option>
                                  <option value="StunCard">StunCard (صدم كارت لاعب وتعطيله 💫)</option>
                                  <option value="RevealCard">RevealCard (كشف كارت مقلوب)</option>
                                  <option value="HideCard">HideCard (قلب كارت مكشوف لأسفل)</option>
                                  <option value="SwapCard">SwapCard (تبديل كارت)</option>
                                  <option value="StealCard">StealCard (سرقة كارت من الخصم)</option>
                                  <option value="CopyCard">CopyCard (نسخ قدرات كارت آخر)</option>
                                  <option value="AddMoves">AddMoves (زيادة حركات تكتيكية)</option>
                                  <option value="ReduceMoves">ReduceMoves (تقليل حركات الخصم التكتيكية)</option>
                                  <option value="BlockAttack">BlockAttack (حظر هجوم الخصم)</option>
                                  <option value="BlockDefense">BlockDefense (حظر دفاع الخصم)</option>
                                  <option value="BlockAbility">BlockAbility (حظر قدرات كروت الخصم)</option>
                                  <option value="BlockSpecialCards">BlockSpecialCards (حظر كروت التكتيك للخصم)</option>
                                  <option value="ReturnToHand">ReturnToHand (إرجاع الكارت لليد)</option>
                                </select>
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ padding: 4, margin: 0, fontSize: 12 }}
                                  onClick={() => handleRemoveAction(aIdx)}
                                >
                                  ✕
                                </button>
                              </div>

                              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                                {/* Target */}
                                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  <span style={{ fontSize: 9, color: "#888" }}>الهدف:</span>
                                  <select
                                    className="form-input"
                                    style={{ margin: 0, padding: 2, fontSize: 10, width: 85, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                                    value={act.target}
                                    onChange={(e) => handleUpdateAction(aIdx, "target", e.target.value)}
                                  >
                                    <option value="Self">Self (نفسه)</option>
                                    <option value="Allies">Allies (الحلفاء)</option>
                                    <option value="Enemies">Enemies (الخصوم)</option>
                                    <option value="SelectedCard">SelectedCard (كارت مختار)</option>
                                    <option value="SelectedEnemy">SelectedEnemy (كارت خصم مختار)</option>
                                    <option value="CurrentAttack">CurrentAttack (الهجوم الحالي)</option>
                                    <option value="CurrentDefense">CurrentDefense (الدفاع الحالي)</option>
                                    <option value="All">All (جميع كروت الملعب)</option>
                                  </select>
                                </div>

                                {/* AddStat/RemoveStat specific: stat */}
                                {(act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat") && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                    <span style={{ fontSize: 9, color: "#888" }}>الخاصية:</span>
                                    <select
                                      className="form-input"
                                      style={{ margin: 0, padding: 2, fontSize: 10, width: 60, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                                      value={act.stat || "attack"}
                                      onChange={(e) => handleUpdateAction(aIdx, "stat", e.target.value)}
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
                                      style={{ margin: 0, padding: 2, fontSize: 10, width: 45, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                                      value={act.value ?? 2}
                                      onChange={(e) => handleUpdateAction(aIdx, "value", Number(e.target.value))}
                                    />
                                  </div>
                                )}

                                {/* Duration Selection */}
                                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  <span style={{ fontSize: 9, color: "#888" }}>المدة:</span>
                                  <select
                                    className="form-input"
                                    style={{ margin: 0, padding: 2, fontSize: 10, width: 90, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                                    value={act.duration || "Instant"}
                                    onChange={(e) => handleUpdateAction(aIdx, "duration", e.target.value)}
                                  >
                                    <option value="Instant">Instant (فوري)</option>
                                    <option value="CurrentPhase">CurrentPhase (الهجمة الحالية)</option>
                                    <option value="CurrentTurn">CurrentTurn (الدور الحالي)</option>
                                    <option value="NextTurn">NextTurn (الدور القادم)</option>
                                    <option value="XTurns">XTurns (عدد من الأدوار)</option>
                                    <option value="WhileFaceUp">WhileFaceUp (طالما مكشوف)</option>
                                    <option value="WhileAlive">WhileAlive (طالما بالملعب)</option>
                                    <option value="UntilTrigger">UntilTrigger (حتى حدث معين)</option>
                                  </select>
                                </div>

                                {/* XTurns specific: durationTurns */}
                                {act.duration === "XTurns" && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                    <span style={{ fontSize: 9, color: "#888" }}>الأدوار:</span>
                                    <input
                                      type="number"
                                      className="form-input"
                                      style={{ margin: 0, padding: 2, fontSize: 10, width: 40, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                                      value={act.durationTurns ?? 2}
                                      onChange={(e) => handleUpdateAction(aIdx, "durationTurns", Number(e.target.value))}
                                      min={1}
                                    />
                                  </div>
                                )}

                                {/* UntilTrigger specific: durationTrigger */}
                                {act.duration === "UntilTrigger" && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                    <span style={{ fontSize: 9, color: "#888" }}>الحدث:</span>
                                    <input
                                      type="text"
                                      placeholder="مثلاً GoalScored"
                                      className="form-input"
                                      style={{ margin: 0, padding: 2, fontSize: 10, width: 80, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                                      value={act.durationTrigger || ""}
                                      onChange={(e) => handleUpdateAction(aIdx, "durationTrigger", e.target.value)}
                                    />
                                  </div>
                                )}

                                {/* Stackable checkbox */}
                                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  <input
                                    type="checkbox"
                                    id={`stackable_${aIdx}`}
                                    checked={act.stackable !== false}
                                    onChange={(e) => handleUpdateAction(aIdx, "stackable", e.target.checked)}
                                    style={{ width: 12, height: 12, margin: 0 }}
                                  />
                                  <label htmlFor={`stackable_${aIdx}`} style={{ fontSize: 9, color: "#aaa", cursor: "pointer" }}>متراكم؟</label>
                                </div>

                                {/* Max Uses input */}
                                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  <span style={{ fontSize: 9, color: "#888" }}>أقصى استخدام:</span>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ margin: 0, padding: 2, fontSize: 10, width: 35, background: "#0b0c0e", borderColor: "#333", color: "#ddd" }}
                                    value={act.maxUses ?? ""}
                                    onChange={(e) => handleUpdateAction(aIdx, "maxUses", e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="∞"
                                    min={1}
                                  />
                                </div>

                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Common Image URL */}
              <div className="form-group">
                <label className="form-label">رابط صورة الكارت (خارجي)</label>
                <input
                  className="form-input"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="مثال: https://drive.google.com/uc?id=..."
                />
                <span style={{ fontSize: 11, color: "#888", marginTop: 4, display: "block" }}>
                  يمكنك رفع صور الكروت على Google Drive أو Imgur ووضع الرابط هنا ليظهر الكارت بالكامل في اللعبة.
                </span>
              </div>

              {/* Common Description */}
              <div className="form-group">
                <label className="form-label">وصف الكارت</label>
                <textarea
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف مختصر لقدرات الكارت وتأثيره..."
                  rows={3}
                />
              </div>

              {/* Common Tags (Only for Player packages) */}
              {packageType === "player" && (
                <div className="form-group">
                  <label className="form-label">
                    التاغات (مفصولة بفاصلة)
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="مثلاً: captain, speedster"
                  />
                </div>
              )}

            </div>

            {/* Right: Live Preview */}
            <div
              style={{
                flex: "0 0 220px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#888",
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                معاينة مباشرة
              </div>
              <CardPreview
                name={name}
                team={team}
                avatar={avatar}
                attack={attack}
                defense={defense}
                role={role}
                isLegend={isLegend}
                description={description}
                imageUrl={imageUrl}
                type={packageType}
                effectArabic={effectArabic}
                icon={icon}
              />
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid rgba(52,211,153,0.1)",
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
            >
              إلغاء
            </button>
            <button type="submit" className="btn-primary" style={{ width: "auto" }}>
              {isEdit ? "💾 حفظ التعديلات" : "➕ إضافة الكارت"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
