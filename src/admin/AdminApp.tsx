/**
 * AdminApp - Main Admin Dashboard shell.
 * Sidebar with package lists divided by type + main content area for package management.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  AdminPackage,
  PackageExport,
} from "./adminTypes";
import {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getCardsByPackage,
  getSpecialCardsByPackage,
  importPackage,
  hasAdminCards,
} from "./adminStore";
import { isSupabaseConfigured } from "../lib/supabase";
import PackageManager from "./PackageManager";
import SandboxTester from "./SandboxTester";
import { GameToast } from "../components/GameDialog";
import { AnimatePresence } from "motion/react";
import "./admin.css";

// Package Emoji Options
const PKG_EMOJIS = [
  "⚽", "🏆", "👑", "🦁", "🔥", "💎", "⭐", "🌍",
  "🇪🇬", "🇲🇦", "🇧🇷", "🇦🇷", "🇫🇷", "🇩🇪", "🇪🇸", "🇮🇹",
  "🇵🇹", "🇳🇱", "🇧🇪", "🇭🇷", "🏟️", "🎖️", "🥇", "🎪",
];

export default function AdminApp() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [activeTab, setActiveTab] = useState<"packages" | "sandbox">("packages");
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [adminCardsActive, setAdminCardsActive] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<AdminPackage | null>(null);
  const [confirmDeletePkg, setConfirmDeletePkg] = useState<string | null>(null);
  const [errorConfig, setErrorConfig] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  // Package form state
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [pkgEmoji, setPkgEmoji] = useState("⚽");
  const [pkgType, setPkgType] = useState<"player" | "special">("player");
  const [pkgLegendPct, setPkgLegendPct] = useState(30);

  const refresh = async () => {
    if (!isSupabaseConfigured) {
      setErrorConfig("تنبيه: إعدادات Supabase غير متوفرة في ملف .env. يرجى توفير VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY لتتمكن من استخدام لوحة الإدارة.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorConfig(null);
    try {
      const freshPkgs = await getPackages();
      setPackages(freshPkgs);

      // Fetch card counts for each package (either standard or special cards)
      const counts: Record<string, number> = {};
      for (const p of freshPkgs) {
        if (p.type === "special") {
          const cards = await getSpecialCardsByPackage(p.id);
          counts[p.id] = cards.length;
        } else {
          const cards = await getCardsByPackage(p.id);
          counts[p.id] = cards.length;
        }
      }
      setCardCounts(counts);

      // Check if custom cards exist
      const active = await hasAdminCards();
      setAdminCardsActive(active);

      // Select first package by default if none is selected
      if (freshPkgs.length > 0 && !selectedPkgId) {
        setSelectedPkgId(freshPkgs[0].id);
      }
    } catch (err: any) {
      console.error("Failed to refresh packages:", err);
      setErrorConfig(err.message || "حدث خطأ غير متوقع أثناء الاتصال بـ Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || null;

  const openCreatePkg = () => {
    setEditingPkg(null);
    setPkgName("");
    setPkgDesc("");
    setPkgEmoji("⚽");
    setPkgType("player");
    setPkgLegendPct(30);
    setShowPkgModal(true);
  };

  const openEditPkg = (pkg: AdminPackage) => {
    setEditingPkg(pkg);
    setPkgName(pkg.name);
    setPkgDesc(pkg.description || "");
    setPkgEmoji(pkg.image);
    setPkgType(pkg.type || "player");
    setPkgLegendPct(pkg.legend_percentage ?? 30);
    setShowPkgModal(true);
  };

  const handleSavePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) return;

    setLoading(true);
    try {
      if (editingPkg) {
        await updatePackage(editingPkg.id, {
          name: pkgName.trim(),
          description: pkgDesc.trim(),
          image: pkgEmoji,
          legend_percentage: pkgLegendPct,
        });
      } else {
        const newPkg = await createPackage({
          name: pkgName.trim(),
          description: pkgDesc.trim(),
          image: pkgEmoji,
          type: pkgType,
          legend_percentage: pkgLegendPct,
        });
        setSelectedPkgId(newPkg.id);
      }
      setShowPkgModal(false);
      await refresh();
    } catch (err) {
      console.error("Error saving package:", err);
      setLoading(false);
    }
  };

  const handleDeletePkg = async (pkgId: string) => {
    setLoading(true);
    try {
      await deletePackage(pkgId);
      setConfirmDeletePkg(null);
      if (selectedPkgId === pkgId) {
        setSelectedPkgId(null);
      }
      await refresh();
    } catch (err) {
      console.error("Error deleting package:", err);
      setLoading(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data: PackageExport = JSON.parse(text);
      if (data.version !== 1 || !data.package) {
        setToast({ message: "❌ ملف غير صالح! تأكد من أنه ملف تصدير حزمة مرتدة.", type: "error" });
        return;
      }
      setLoading(true);
      const result = await importPackage(data);
      setSelectedPkgId(result.package.id);
      await refresh();
      setToast({ message: `✅ تم استيراد "${result.package.name}" مع ${result.cardsImported} كارت!`, type: "success" });
    } catch (err) {
      console.error("Error importing package:", err);
      setToast({ message: "❌ خطأ في قراءة أو استيراد الملف!", type: "error" });
    } finally {
      setLoading(false);
    }
    // Reset input
    if (importRef.current) importRef.current.value = "";
  };

  const filteredPackages = packages.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const playerPackages = filteredPackages.filter((p) => p.type === "player" || !p.type);
  const specialPackages = filteredPackages.filter((p) => p.type === "special");

  const PackageManagerComp = PackageManager as any;

  return (
    <div className="admin-root">
      {errorConfig && (
        <div className="admin-connection-warning" style={{ background: "#ef4444", color: "#fff", padding: "12px", textAlign: "center", fontWeight: "bold", fontSize: "14px" }}>
          ⚠️ {errorConfig}
        </div>
      )}

      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <span className="logo-icon">⚽</span>
            <h1>لوحة إدارة مرتدة</h1>
          </div>

          {/* Back to game */}
          <a
            href="#/"
            className="back-to-game"
            style={{ margin: "8px 8px 0" }}
          >
            ← العودة للعبة
          </a>

          {/* Navigation tabs */}
          <div style={{ padding: "8px 8px 0", display: "flex", gap: 6 }}>
            <button
              onClick={() => setActiveTab("packages")}
              className={`btn-secondary ${activeTab === "packages" ? "active" : ""}`}
              style={{
                flex: 1,
                margin: 0,
                padding: "6px 8px",
                fontSize: "11px",
                background: activeTab === "packages" ? "rgba(16,185,129,0.15)" : "transparent",
                borderColor: activeTab === "packages" ? "#10b981" : "rgba(255,255,255,0.1)",
                color: activeTab === "packages" ? "#10b981" : "#888",
              }}
            >
              📦 الباقات
            </button>
            <button
              onClick={() => setActiveTab("sandbox")}
              className={`btn-secondary ${activeTab === "sandbox" ? "active" : ""}`}
              style={{
                flex: 1,
                margin: 0,
                padding: "6px 8px",
                fontSize: "11px",
                background: activeTab === "sandbox" ? "rgba(16,185,129,0.15)" : "transparent",
                borderColor: activeTab === "sandbox" ? "#10b981" : "rgba(255,255,255,0.1)",
                color: activeTab === "sandbox" ? "#10b981" : "#888",
              }}
            >
              🧪 اختبار القواعد
            </button>
          </div>

          {/* Search packages */}
          <div style={{ padding: "8px 8px 0" }}>
            <input
              type="text"
              placeholder="🔍 ابحث عن حزمة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(0,0,0,0.3)",
                color: "#fff",
                fontSize: "12px",
                outline: "none",
                textAlign: "right",
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto", minHeight: 150, padding: "8px 0" }}>
            {/* Player packages Grid */}
            <div className="sidebar-section-title">باقات اللاعبين (كروت لاعبين)</div>
            {playerPackages.map((p) => {
              const count = cardCounts[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className={`sidebar-item ${
                    selectedPkgId === p.id && activeTab === "packages" ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedPkgId(p.id);
                    setActiveTab("packages");
                  }}
                >
                  <span className="item-emoji">{p.image}</span>
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
                  <span className="item-count">{count}</span>
                </div>
              );
            })}

            {/* Special packages Grid */}
            <div className="sidebar-section-title" style={{ marginTop: "16px" }}>الباقات التكتيكية (تكتيكية خاصة)</div>
            {specialPackages.map((p) => {
              const count = cardCounts[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className={`sidebar-item special-package ${
                    selectedPkgId === p.id && activeTab === "packages" ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedPkgId(p.id);
                    setActiveTab("packages");
                  }}
                >
                  <span className="item-emoji">{p.image}</span>
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
                  <span className="item-count">{count}</span>
                </div>
              );
            })}

            {!loading && packages.length === 0 && (
              <div
                style={{
                  padding: "16px",
                  color: "#555",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                لا توجد حزم بعد
              </div>
            )}
          </div>

          {/* Sidebar bottom actions */}
          <div className="sidebar-actions">
            <button className="btn-primary" onClick={openCreatePkg} disabled={!!errorConfig}>
              ➕ حزمة جديدة
            </button>
            <div style={{ marginTop: 8 }}>
              <button
                className="btn-secondary"
                style={{ width: "100%" }}
                onClick={() => importRef.current?.click()}
                disabled={!!errorConfig}
              >
                📥 استيراد حزمة
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
            </div>

            {/* Stats summary */}
            <div
              style={{
                marginTop: 16,
                padding: "10px",
                background: "rgba(52,211,153,0.05)",
                borderRadius: 10,
                fontSize: 12,
                color: "#888",
                textAlign: "center",
              }}
            >
              {adminCardsActive ? (
                <span style={{ color: "#34d399" }}>
                  ✅ الكروت المخصصة مفعلة في اللعبة
                </span>
              ) : (
                <span>
                  ℹ️ أضف كروت لتفعيلها في اللعبة
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          {activeTab === "sandbox" ? (
            <SandboxTester />
          ) : selectedPkg ? (
            <PackageManagerComp
              key={selectedPkg.id}
              pkg={selectedPkg}
              onEditPackage={() => openEditPkg(selectedPkg)}
              onDeletePackage={() => { setConfirmDeletePkg(selectedPkg.id); }}
              onRefresh={() => { refresh(); }}
            />
          ) : loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
              <div>⏳</div>
              <p>جاري تحميل البيانات...</p>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>مرحباً بك في لوحة الإدارة</h3>
              <p>
                ابدأ بإنشاء حزمة جديدة (لاعبين أو تكتيكات) ثم أضف الكروت بداخلها.
              </p>
              <button
                className="btn-primary"
                style={{ width: "auto" }}
                onClick={openCreatePkg}
                disabled={!!errorConfig}
              >
                ➕ إنشاء أول حزمة
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Package Create/Edit Modal */}
      {showPkgModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPkgModal(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editingPkg ? "✏️ تعديل الحزمة" : "➕ حزمة جديدة"}
              </h2>
              <button
                className="btn-ghost"
                onClick={() => setShowPkgModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePkg}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">اسم الحزمة *</label>
                <input
                  className="form-input"
                  type="text"
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="مثلاً: ريال مدريد أو التكتيكات العالمية"
                  required
                  autoFocus
                />
              </div>

              {/* Package Type */}
              {!editingPkg && (
                <div className="form-group">
                  <label className="form-label">نوع الحزمة</label>
                  <select
                    className="form-input"
                    value={pkgType}
                    onChange={(e) => setPkgType(e.target.value as any)}
                  >
                    <option value="player">🏃 باقة لاعبين (كروت لاعبين)</option>
                    <option value="special">🃏 باقة كروت تكتيكية (تكتيكات خاصة)</option>
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="form-group">
                <label className="form-label">وصف الحزمة</label>
                <textarea
                  className="form-input"
                  value={pkgDesc}
                  onChange={(e) => setPkgDesc(e.target.value)}
                  placeholder="وصف اختياري للحزمة..."
                  rows={2}
                />
              </div>

              {/* Emoji */}
              <div className="form-group">
                <label className="form-label">
                  رمز الحزمة: <span style={{ fontSize: 22 }}>{pkgEmoji}</span>
                </label>
                <div className="emoji-grid">
                  {PKG_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-btn ${
                        pkgEmoji === em ? "selected" : ""
                      }`}
                      onClick={() => setPkgEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend Percentage (only show for player packages) */}
              {pkgType === "player" && (
                <div className="form-group">
                  <label className="form-label">
                    نسبة ظهور الأساطير: {pkgLegendPct}%
                  </label>
                  <div className="stat-slider-container">
                    <input
                      type="range"
                      className="stat-slider"
                      min={0}
                      max={100}
                      value={pkgLegendPct}
                      onChange={(e) =>
                        setPkgLegendPct(Number(e.target.value))
                      }
                    />
                    <span className="stat-value" style={{ color: "#fbbf24" }}>
                      {pkgLegendPct}%
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPkgModal(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: "auto" }}
                >
                  {editingPkg ? "💾 حفظ" : "➕ إنشاء الحزمة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Package Confirmation */}
      {confirmDeletePkg && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmDeletePkg(null)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-dialog">
              <h3>🗑️ حذف الحزمة؟</h3>
              <p>
                سيتم حذف الحزمة فك الارتباط لجميع الكروت المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="confirm-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmDeletePkg(null)}
                >
                  إلغاء
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDeletePkg(confirmDeletePkg)}
                >
                  🗑️ تأكيد الحذف
                </button>
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
