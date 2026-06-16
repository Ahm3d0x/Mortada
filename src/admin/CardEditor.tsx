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

    if (packageType === "special") {
      onSave({
        name: name.trim(),
        effect,
        effect_arabic: effectArabic.trim(),
        description: description.trim(),
        icon,
        image_url: imageUrl.trim(),
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
