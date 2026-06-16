/**
 * PackageManager - Package cards view, stats, and card linking/editing.
 * Supports Player packages and Tactical/Special packages.
 */

import React, { useState, useEffect } from "react";
import {
  AdminPackage,
  AdminCard,
  AdminSpecialCard,
  ROLE_LABELS,
  LEGEND_ROLE_LABELS,
} from "./adminTypes";
import {
  getCardsByPackage,
  getSpecialCardsByPackage,
  getAllCentralCards,
  getAllCentralSpecialCards,
  getPackageStats,
  createCardInPackage,
  createSpecialCardInPackage,
  linkCardToPackage,
  linkSpecialCardToPackage,
  unlinkCardFromPackage,
  unlinkSpecialCardFromPackage,
  updateCard,
  updateSpecialCard,
  deleteCard,
  deleteSpecialCard,
  exportPackage,
  PackageStats,
} from "./adminStore";
import CardEditor from "./CardEditor";

interface PackageManagerProps {
  pkg: AdminPackage;
  onEditPackage: () => void;
  onDeletePackage: () => void;
  onRefresh: () => void;
}

export default function PackageManager({
  pkg,
  onEditPackage,
  onDeletePackage,
  onRefresh,
}: PackageManagerProps) {
  const isSpecialPkg = pkg.type === "special";

  // Cards lists
  const [playerCards, setPlayerCards] = useState<AdminCard[]>([]);
  const [specialCards, setSpecialCards] = useState<AdminSpecialCard[]>([]);

  // Central pools (for linking)
  const [centralPlayerPool, setCentralPlayerPool] = useState<AdminCard[]>([]);
  const [centralSpecialPool, setCentralSpecialPool] = useState<AdminSpecialCard[]>([]);
  const [linkTargetId, setLinkTargetId] = useState("");

  const [stats, setStats] = useState<PackageStats>({
    totalCards: 0,
    legendsCount: 0,
    normalCount: 0,
    avgAttack: 0,
    avgDefense: 0,
    roleBreakdown: {},
  });

  const [loading, setLoading] = useState(true);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null); // Player or special card
  
  // Delete/Unlink states
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Search and Filtering states
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [effectFilter, setEffectFilter] = useState("all");

  // Bulk Linking Modal states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedLinkCardIds, setSelectedLinkCardIds] = useState<string[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  const handleLinkCardsBatch = async () => {
    if (selectedLinkCardIds.length === 0) return;
    setLoading(true);
    try {
      if (isSpecialPkg) {
        await Promise.all(selectedLinkCardIds.map(id => linkSpecialCardToPackage(pkg.id, id)));
      } else {
        await Promise.all(selectedLinkCardIds.map(id => linkCardToPackage(pkg.id, id)));
      }
      setSelectedLinkCardIds([]);
      setShowLinkModal(false);
      await refreshCards();
      onRefresh();
    } catch (err) {
      console.error("Error linking batch cards:", err);
      setLoading(false);
    }
  };

  const refreshCards = async () => {
    setLoading(true);
    try {
      if (isSpecialPkg) {
        const fetchedSpecials = await getSpecialCardsByPackage(pkg.id);
        setSpecialCards(fetchedSpecials);

        // Fetch central specials for linking dropdown (excluding ones already linked)
        const allSpecials = await getAllCentralSpecialCards();
        const linkedIds = new Set(fetchedSpecials.map((c) => c.id));
        setCentralSpecialPool(allSpecials.filter((c) => !linkedIds.has(c.id)));
      } else {
        const fetchedPlayers = await getCardsByPackage(pkg.id);
        const fetchedStats = await getPackageStats(pkg.id);
        setPlayerCards(fetchedPlayers);
        setStats(fetchedStats);

        // Fetch central players for linking dropdown (excluding ones already linked)
        const allPlayers = await getAllCentralCards();
        const linkedIds = new Set(fetchedPlayers.map((c) => c.id));
        setCentralPlayerPool(allPlayers.filter((c) => !linkedIds.has(c.id)));
      }
      setLinkTargetId("");
    } catch (err) {
      console.error("Failed to load cards/stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCards();
  }, [pkg.id]);

  const handleSaveCard = async (data: any) => {
    setLoading(true);
    try {
      if (isSpecialPkg) {
        if (editingCard) {
          await updateSpecialCard(editingCard.id, data);
        } else {
          await createSpecialCardInPackage(pkg.id, data);
        }
      } else {
        if (editingCard) {
          await updateCard(editingCard.id, data);
        } else {
          await createCardInPackage(pkg.id, data);
        }
      }
      setShowCardEditor(false);
      setEditingCard(null);
      await refreshCards();
      onRefresh(); // Refresh parent package counts
    } catch (err) {
      console.error("Error saving card:", err);
      setLoading(false);
    }
  };

  const handleLinkCard = async () => {
    if (!linkTargetId) return;
    setLoading(true);
    try {
      if (isSpecialPkg) {
        await linkSpecialCardToPackage(pkg.id, linkTargetId);
      } else {
        await linkCardToPackage(pkg.id, linkTargetId);
      }
      await refreshCards();
      onRefresh();
    } catch (err) {
      console.error("Error linking card:", err);
      setLoading(false);
    }
  };

  const handleUnlinkCard = async () => {
    if (!selectedCardId) return;
    setLoading(true);
    try {
      if (isSpecialPkg) {
        await unlinkSpecialCardFromPackage(pkg.id, selectedCardId);
      } else {
        await unlinkCardFromPackage(pkg.id, selectedCardId);
      }
      setShowDeleteConfirm(false);
      setSelectedCardId(null);
      await refreshCards();
      onRefresh();
    } catch (err) {
      console.error("Error unlinking card:", err);
      setLoading(false);
    }
  };

  const handleDeleteCardCompletely = async () => {
    if (!selectedCardId) return;
    setLoading(true);
    try {
      if (isSpecialPkg) {
        await deleteSpecialCard(selectedCardId);
      } else {
        await deleteCard(selectedCardId);
      }
      setShowDeleteConfirm(false);
      setSelectedCardId(null);
      await refreshCards();
      onRefresh();
    } catch (err) {
      console.error("Error deleting card completely:", err);
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportPackage(pkg.id);
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mortada_package_${pkg.name.replace(/\s+/g, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting package:", err);
    }
  };

  const totalCardsCount = isSpecialPkg ? specialCards.length : playerCards.length;

  const filteredPlayerCards = playerCards.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
      (c.team || "").toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(cardSearchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || c.role === roleFilter;
    const matchesRarity =
      rarityFilter === "all" ||
      (rarityFilter === "legend" && c.is_legend) ||
      (rarityFilter === "normal" && !c.is_legend);
    return matchesSearch && matchesRole && matchesRarity;
  });

  const filteredSpecialCards = specialCards.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
      (c.effect_arabic || "").toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(cardSearchQuery.toLowerCase());
    const matchesEffect = effectFilter === "all" || c.effect === effectFilter;
    return matchesSearch && matchesEffect;
  });

  const filteredCardsCount = isSpecialPkg ? filteredSpecialCards.length : filteredPlayerCards.length;

  return (
    <div>
      {/* Package Header */}
      <div className="package-header">
        <div className="pkg-icon">{pkg.image}</div>
        <div className="pkg-info" style={{ flex: 1 }}>
          <h2>{pkg.name} <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 12, background: isSpecialPkg ? "#6d28d9" : "#047857", color: "#fff", marginRight: 8 }}>{isSpecialPkg ? "تكتيكية" : "لاعبين"}</span></h2>
          <p>{pkg.description || "لا يوجد وصف"}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={onEditPackage}>
            ✏️ تعديل
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            📤 تصدير
          </button>
          <button className="btn-danger" onClick={onDeletePackage}>
            🗑️ حذف الحزمة
          </button>
        </div>
      </div>

      {/* Stats Row (only for Player packages) */}
      {!isSpecialPkg ? (
        <div className="package-stats-row">
          <div className="pkg-stat-chip">
            🃏 <span className="chip-value">{stats.totalCards}</span> كارت لاعب
          </div>
          <div className="pkg-stat-chip">
            ⭐ <span className="chip-value">{stats.legendsCount}</span> أسطورة
          </div>
          <div className="pkg-stat-chip">
            ⚔️ متوسط هجوم{" "}
            <span className="chip-value">{stats.avgAttack}</span>
          </div>
          <div className="pkg-stat-chip">
            🛡️ متوسط دفاع{" "}
            <span className="chip-value">{stats.avgDefense}</span>
          </div>
          {Object.entries(stats.roleBreakdown).map(([r, count]) => (
            <div className="pkg-stat-chip" key={r}>
              {r} <span className="chip-value">{count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="package-stats-row">
          <div className="pkg-stat-chip" style={{ borderColor: "#8b5cf6" }}>
            🃏 <span className="chip-value" style={{ color: "#a78bfa" }}>{specialCards.length}</span> كارت تكتيكي خاص
          </div>
        </div>
      )}

      {/* Search and Filters Section */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
          background: "rgba(255,255,255,0.02)",
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            className="form-input"
            style={{ margin: 0, padding: "8px 12px", fontSize: 13, background: "#0b0c0e", borderColor: "#333", color: "#ddd", width: "100%" }}
            placeholder="🔍 ابحث عن كارت بالاسم، الفريق، الوصف..."
            value={cardSearchQuery}
            onChange={(e) => setCardSearchQuery(e.target.value)}
          />
        </div>

        {!isSpecialPkg ? (
          <>
            {/* Player Role Filter */}
            <div>
              <select
                className="form-input"
                style={{ margin: 0, padding: "8px 12px", fontSize: 13, background: "#0b0c0e", borderColor: "#333", color: "#ddd", width: 140 }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">جميع المراكز</option>
                <option value="attacker">مهاجم</option>
                <option value="midfielder">خط وسط</option>
                <option value="defender">مدافع</option>
                <option value="goalkeeper">حارس مرمى</option>
              </select>
            </div>

            {/* Player Rarity/Legend Filter */}
            <div>
              <select
                className="form-input"
                style={{ margin: 0, padding: "8px 12px", fontSize: 13, background: "#0b0c0e", borderColor: "#333", color: "#ddd", width: 140 }}
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
              >
                <option value="all">جميع الفئات</option>
                <option value="legend">⭐ أساطير</option>
                <option value="normal">🏃 لاعبين عاديين</option>
              </select>
            </div>
          </>
        ) : (
          /* Tactical Special Cards Effect Filter */
          <div>
            <select
              className="form-input"
              style={{ margin: 0, padding: "8px 12px", fontSize: 13, background: "#0b0c0e", borderColor: "#333", color: "#ddd", width: 180 }}
              value={effectFilter}
              onChange={(e) => setEffectFilter(e.target.value)}
            >
              <option value="all">جميع التأثيرات التكتيكية</option>
              <option value="offside">تسلل (Offside)</option>
              <option value="wet_pitch">ملعب رطب (Wet Pitch)</option>
              <option value="counter_attack">مرتدة سريعة (Counter Attack)</option>
              <option value="fans">جماهير وصيحات (Fans)</option>
              <option value="park_the_bus">ركن الحافلة (Park the Bus)</option>
              <option value="red_card">بطاقة حمراء (Red Card)</option>
              <option value="world_cup">كأس العالم (World Cup)</option>
            </select>
          </div>
        )}
      </div>

      {/* Title & Actions Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#a0a0a0",
          }}
        >
          الكروت في هذه الحزمة ({filteredCardsCount} من أصل {totalCardsCount})
        </h3>
        
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {((!isSpecialPkg && (centralPlayerPool.length > 0 || playerCards.length > 0)) || (isSpecialPkg && (centralSpecialPool.length > 0 || specialCards.length > 0))) && (
            <button
              className="btn-secondary"
              style={{ width: "auto", padding: "8px 16px" }}
              onClick={() => {
                setSelectedLinkCardIds([]);
                setModalSearchQuery("");
                setShowLinkModal(true);
              }}
              disabled={loading}
            >
              🔗 مشاركة كروت موجودة
            </button>
          )}

          <button
            className="btn-primary"
            style={{ width: "auto", padding: "8px 16px" }}
            onClick={() => {
              setEditingCard(null);
              setShowCardEditor(true);
            }}
            disabled={loading}
          >
            ➕ إضافة كارت جديد
          </button>
        </div>
      </div>

      {/* Loading state / Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>
          <div className="loading-spinner" style={{ marginBottom: 12 }}>⏳</div>
          <p>جاري تحميل الكروت...</p>
        </div>
      ) : totalCardsCount === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🃏</div>
          <h3>لا توجد كروت بعد</h3>
          <p>
            ابدأ بإضافة كروت جديدة أو ربط كروت موجودة بهذه الحزمة.
          </p>
          <button
            className="btn-primary"
            style={{ width: "auto" }}
            onClick={() => {
              setEditingCard(null);
              setShowCardEditor(true);
            }}
          >
            ➕ إضافة أول كارت
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {/* Render Player Cards */}
          {!isSpecialPkg &&
            filteredPlayerCards.map((c) => (
              <div
                key={c.id}
                className={`card-item ${c.is_legend ? "legend" : ""}`}
                onClick={() => {
                  setEditingCard(c);
                  setShowCardEditor(true);
                }}
              >
                <div className="card-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const span = document.createElement("span");
                          span.innerText = c.avatar || "⚽";
                          parent.appendChild(span);
                        }
                      }}
                    />
                  ) : (
                    c.avatar
                  )}
                </div>
                <div className="card-name">{c.name}</div>
                <div className="card-team">{c.team}</div>
                <div className="card-stats">
                  <div className="stat-badge attack">⚔️ {c.attack}</div>
                  <div className="stat-badge defense">🛡️ {c.defense}</div>
                </div>
                <span className={`card-role-badge ${c.is_legend ? "legend-badge" : ""}`}>
                  {c.is_legend ? "⭐ " + LEGEND_ROLE_LABELS[c.role] : ROLE_LABELS[c.role]}
                </span>
                
                {/* Options delete / unlink */}
                <button
                  className="btn-ghost"
                  style={{ position: "absolute", top: 8, left: 8, padding: 4, fontSize: 14, color: "#666" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCardId(c.id);
                    setShowDeleteConfirm(true);
                  }}
                  title="إلغاء الربط أو حذف الكارت"
                >
                  🗑️
                </button>
              </div>
            ))}

          {/* Render Special/Tactical Cards */}
          {isSpecialPkg &&
            filteredSpecialCards.map((c) => (
              <div
                key={c.id}
                className="card-item special-card-item"
                style={{ background: "#110826", borderColor: "rgba(139, 92, 246, 0.2)" }}
                onClick={() => {
                  setEditingCard(c);
                  setShowCardEditor(true);
                }}
              >
                <div className="card-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa" }}>
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const span = document.createElement("span");
                          span.innerText = c.icon || "🃏";
                          parent.appendChild(span);
                        }
                      }}
                    />
                  ) : (
                    c.icon || "🃏"
                  )}
                </div>
                <div className="card-name" style={{ color: "#fff", fontWeight: "bold" }}>{c.name}</div>
                <div className="card-team" style={{ color: "#a78bfa" }}>{c.effect_arabic}</div>
                <div className="card-stats" style={{ color: "#9ca3af", fontSize: 10, textAlign: "center", height: 28, overflow: "hidden", marginTop: 4 }}>
                  {c.description}
                </div>
                <span className="card-role-badge" style={{ background: "rgba(139, 92, 246, 0.2)", color: "#a78bfa", borderColor: "rgba(139, 92, 246, 0.3)" }}>
                  تأثير: {c.effect}
                </span>

                {/* Options delete / unlink */}
                <button
                  className="btn-ghost"
                  style={{ position: "absolute", top: 8, left: 8, padding: 4, fontSize: 14, color: "#666" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCardId(c.id);
                    setShowDeleteConfirm(true);
                  }}
                  title="إلغاء الربط أو حذف الكارت"
                >
                  🗑️
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Card Editor Modal */}
      {showCardEditor && (
        <CardEditor
          card={editingCard}
          packageId={pkg.id}
          packageType={pkg.type || "player"}
          onSave={handleSaveCard}
          onCancel={() => {
            setShowCardEditor(false);
            setEditingCard(null);
          }}
        />
      )}

      {/* Unlink / Complete Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowDeleteConfirm(false);
            setSelectedCardId(null);
          }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 450 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-dialog" style={{ textAlign: "center", padding: "10px" }}>
              <h3>🗑️ خيارات حذف الكارت</h3>
              <p style={{ color: "#aaa", fontSize: 13, marginBottom: 20 }}>
                بما أن الكروت يمكن أن ترتبط بأكثر من باقة، يرجى اختيار الإجراء المطلوب:
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  className="btn-secondary"
                  style={{ width: "100%", padding: "10px" }}
                  onClick={handleUnlinkCard}
                >
                  🔗 إلغاء ربط الكارت من هذه الحزمة فقط
                </button>
                
                <button
                  className="btn-danger"
                  style={{ width: "100%", padding: "10px" }}
                  onClick={handleDeleteCardCompletely}
                >
                  💀 حذف الكارت نهائياً من قاعدة البيانات (كل الحزم)
                </button>

                <button
                  className="btn-ghost"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedCardId(null);
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Existing Cards Modal */}
      {showLinkModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowLinkModal(false)}
          style={{
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)"
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: 650,
              width: "90%",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              background: "#0d0f11",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: 16,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(16, 185, 129, 0.03)"
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
                🔗 مشاركة كروت موجودة في الحزمة
              </h2>
              <button
                className="btn-ghost"
                onClick={() => setShowLinkModal(false)}
                style={{ fontSize: 18, padding: 4, cursor: "pointer", color: "#888" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Search and Select All controls */}
            <div style={{ padding: "16px 20px 10px", display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="text"
                className="form-input"
                style={{ margin: 0, padding: "8px 12px", fontSize: 13, background: "#18181b", borderColor: "#333", color: "#ddd" }}
                placeholder="🔍 ابحث في الكروت العامة المتوفرة لربطها..."
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
              />
            </div>

            {/* Modal Main Content (Scrollable list with checkboxes) */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 20px 16px",
                minHeight: 200,
              }}
            >
              {(() => {
                const availablePool = isSpecialPkg ? centralSpecialPool : centralPlayerPool;
                
                // Filter available pool
                const filteredPool = availablePool.filter((c) => {
                  if (isSpecialPkg) {
                    const sc = c as AdminSpecialCard;
                    return (
                      sc.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                      (sc.effect_arabic || "").toLowerCase().includes(modalSearchQuery.toLowerCase())
                    );
                  } else {
                    const pc = c as AdminCard;
                    return (
                      pc.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                      (pc.team || "").toLowerCase().includes(modalSearchQuery.toLowerCase())
                    );
                  }
                });

                if (filteredPool.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#555", fontSize: 13 }}>
                      {availablePool.length === 0 
                        ? "جميع الكروت المتوفرة مرتبطة بالفعل بهذه الحزمة!" 
                        : "لا توجد نتائج مطابقة لبحثك."}
                    </div>
                  );
                }

                return (
                  <div>
                    {/* Header Select All toggle */}
                    <div 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between",
                        padding: "8px 10px", 
                        marginBottom: 10,
                        background: "rgba(255,255,255,0.02)", 
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.05)"
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#aaa", cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={filteredPool.length > 0 && filteredPool.every(c => selectedLinkCardIds.includes(c.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const toAdd = filteredPool.map(c => c.id);
                              setSelectedLinkCardIds(prev => Array.from(new Set([...prev, ...toAdd])));
                            } else {
                              const toRemove = new Set(filteredPool.map(c => c.id));
                              setSelectedLinkCardIds(prev => prev.filter(id => !toRemove.has(id)));
                            }
                          }}
                          className="accent-emerald-500"
                        />
                        تحديد الكل في صفحة البحث الحالية
                      </label>
                      <span style={{ fontSize: 11, color: "#888" }}>
                        محدد {selectedLinkCardIds.length} كارت
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {filteredPool.map((c) => {
                        const isChecked = selectedLinkCardIds.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              borderRadius: 10,
                              background: isChecked ? "rgba(16, 185, 129, 0.05)" : "#131517",
                              border: isChecked ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255,255,255,0.03)",
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                            onClick={() => {
                              setSelectedLinkCardIds(prev =>
                                isChecked ? prev.filter(id => id !== c.id) : [...prev, c.id]
                              );
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by parent onClick
                                className="accent-emerald-500"
                              />
                              
                              {/* Avatar/Icon preview */}
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  background: isSpecialPkg ? "rgba(139, 92, 246, 0.1)" : "rgba(255,255,255,0.05)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 16,
                                  color: isSpecialPkg ? "#a78bfa" : "#fff",
                                  overflow: "hidden",
                                  border: isSpecialPkg ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid rgba(255,255,255,0.05)"
                                }}
                              >
                                {(() => {
                                  if (isSpecialPkg) {
                                    const sc = c as AdminSpecialCard;
                                    return sc.image_url ? (
                                      <img src={sc.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      sc.icon || "🃏"
                                    );
                                  } else {
                                    const pc = c as AdminCard;
                                    return pc.image_url ? (
                                      <img src={pc.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      pc.avatar || "⚽"
                                    );
                                  }
                                })()}
                              </div>

                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: 13, fontWeight: "bold", color: "#fff", display: "block" }}>
                                  {c.name}
                                </span>
                                <span style={{ fontSize: 10, color: "#888", display: "block", marginTop: 2 }}>
                                  {isSpecialPkg 
                                    ? (c as AdminSpecialCard).effect_arabic 
                                    : `${(c as AdminCard).team} • ${ROLE_LABELS[(c as AdminCard).role] || (c as AdminCard).role_arabic}`}
                                </span>
                              </div>
                            </div>

                            {/* stats badges for players */}
                            {!isSpecialPkg && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <span style={{ fontSize: 10, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "2px 6px", borderRadius: 4, fontWeight: "bold" }}>
                                  ⚔️ {(c as AdminCard).attack}
                                </span>
                                <span style={{ fontSize: 10, background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "2px 6px", borderRadius: 4, fontWeight: "bold" }}>
                                  🛡️ {(c as AdminCard).defense}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(0,0,0,0.2)"
              }}
            >
              <button
                className="btn-secondary"
                onClick={() => setShowLinkModal(false)}
                style={{ margin: 0 }}
              >
                إلغاء
              </button>
              
              <button
                className="btn-primary"
                onClick={handleLinkCardsBatch}
                disabled={loading || selectedLinkCardIds.length === 0}
                style={{ margin: 0, width: "auto", padding: "10px 24px" }}
              >
                {loading ? "⏳ جاري الربط..." : `🔗 ربط الكروت المحددة (${selectedLinkCardIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
