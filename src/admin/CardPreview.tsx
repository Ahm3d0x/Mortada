/**
 * CardPreview - Live preview of a card as it would appear in-game.
 * Shows real card image when image_url is provided, falls back to emoji.
 * Supports both Player and Tactical/Special card previews.
 */

import React from "react";
import { AdminPlayerRole, ROLE_LABELS, LEGEND_ROLE_LABELS } from "./adminTypes";

interface CardPreviewProps {
  name: string;
  team?: string;
  avatar?: string;
  attack?: number;
  defense?: number;
  role?: AdminPlayerRole;
  isLegend?: boolean;
  description?: string;
  imageUrl?: string;
  type?: "player" | "special";
  effectArabic?: string;
  icon?: string;
}

export default function CardPreview({
  name,
  team = "",
  avatar = "⚽",
  attack = 5,
  defense = 5,
  role = "midfielder",
  isLegend = false,
  description = "",
  imageUrl = "",
  type = "player",
  effectArabic = "",
  icon = "🃏",
}: CardPreviewProps) {

  // If a real card image URL is provided, show it as the full card
  if (imageUrl) {
    return (
      <div className="card-preview-container">
        <div style={{ position: "relative", width: 200 }}>
          <img
            src={imageUrl}
            alt={name || "كارت"}
            style={{
              width: "100%",
              borderRadius: 14,
              boxShadow: type === "special"
                ? "0 0 24px rgba(139, 92, 246, 0.3)" // Purple glow for tactics
                : isLegend
                ? "0 0 24px rgba(251,191,36,0.3)"
                : "0 0 16px rgba(52,211,153,0.2)",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div
            style={{
              marginTop: 8,
              textAlign: "center",
              fontSize: 12,
              color: "#888",
            }}
          >
            {name || "اسم الكارت"} — {type === "special" ? "كارت تكتيكي" : (isLegend ? LEGEND_ROLE_LABELS[role] : ROLE_LABELS[role])}
          </div>
        </div>
      </div>
    );
  }

  if (type === "special") {
    // Special/Tactical Card Fallback Preview
    return (
      <div className="card-preview-container">
        <div className="preview-card special-card" style={{ background: "linear-gradient(135deg, #1e1145 0%, #110826 100%)", border: "1px solid rgba(139, 92, 246, 0.25)" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 50,
              height: 50,
              background: "radial-gradient(circle at top left, rgba(139, 92, 246, 0.2), transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              fontSize: 12,
              color: "#8b5cf6",
              fontWeight: 700,
            }}
          >
            🃏
          </div>

          <div className="preview-avatar" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa" }}>
            {icon || "🃏"}
          </div>
          <div className="preview-name" style={{ color: "#fff", fontWeight: "bold" }}>{name || "اسم التكتيك"}</div>
          <div className="preview-team" style={{ color: "#a78bfa", fontSize: 10 }}>كارت تكتيكي خاص</div>
          <div className="preview-role" style={{ color: "#c084fc", background: "rgba(192, 132, 252, 0.1)", border: "1px solid rgba(192, 132, 252, 0.2)" }}>
            {effectArabic || "نوع التأثير"}
          </div>

          {description && (
            <div
              style={{
                fontSize: 9,
                color: "#9ca3af",
                marginTop: 14,
                lineHeight: 1.4,
                maxHeight: 45,
                overflow: "hidden",
                textAlign: "center",
              }}
            >
              {description}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback: player emoji-based preview
  const roleLabel = isLegend ? LEGEND_ROLE_LABELS[role] : ROLE_LABELS[role];
  return (
    <div className="card-preview-container">
      <div className={`preview-card ${isLegend ? "legend-card" : ""}`}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 50,
            height: 50,
            background: isLegend
              ? "radial-gradient(circle at top left, rgba(251,191,36,0.12), transparent)"
              : "radial-gradient(circle at top left, rgba(52,211,153,0.1), transparent)",
            pointerEvents: "none",
          }}
        />

        {isLegend && (
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              fontSize: 12,
              color: "#fbbf24",
              fontWeight: 700,
            }}
          >
            ⭐
          </div>
        )}

        <div className="preview-avatar">{avatar || "⚽"}</div>
        <div className="preview-name">{name || "اسم اللاعب"}</div>
        <div className="preview-team">{team || "الفريق"}</div>
        <div className="preview-role">{roleLabel}</div>

        <div className="preview-stats">
          <div className="preview-stat">
            <div className="preview-stat-value" style={{ color: "#f87171" }}>
              {attack}
            </div>
            <div className="preview-stat-label">هجوم</div>
          </div>
          <div className="preview-stat">
            <div className="preview-stat-value" style={{ color: "#60a5fa" }}>
              {defense}
            </div>
            <div className="preview-stat-label">دفاع</div>
          </div>
        </div>

        {description && (
          <div
            style={{
              fontSize: 9,
              color: "#666",
              marginTop: 8,
              lineHeight: 1.4,
              maxHeight: 36,
              overflow: "hidden",
            }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
