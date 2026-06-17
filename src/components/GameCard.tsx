/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Shield, Swords, Sparkles, Ban, Sparkle } from "lucide-react";
import { Card, PlayerCard, SpecialCard } from "../types";
// @ts-ignore
import coverImg from "../../card/cover.png";

interface GameCardProps {
  card: Card;
  isRevealed: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  isBurning?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg" | "pitch";
  className?: string;
  onInspect?: () => void;
  isActive?: boolean;
  activeColor?: "emerald" | "rose";
}

const getShortRole = (role: string) => {
  switch (role) {
    case "goalkeeper": return "🧤 حارس";
    case "defender": return "🛡️ دفاع";
    case "midfielder": return "⚽ وسط";
    case "attacker": return "🔥 هجوم";
    default: return "🏃‍♂️ لاعب";
  }
};

export default function GameCard({
  card,
  isRevealed,
  onClick,
  isSelected,
  isBurning,
  disabled,
  size = "md",
  className = "",
  onInspect,
  isActive = false,
  activeColor = "emerald"
}: GameCardProps) {
  const isPlayer = card.type === "player";
  const cardImageUrl = (card as any).imageUrl || (card as any).image_url || (card as any).image;
  const hasImage = !!cardImageUrl;
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const longPressedRef = React.useRef<boolean>(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || !onInspect) return;
    longPressedRef.current = false;
    // Set a timeout for 500ms for solid long-press detection
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(50); // Premium haptic vibe feedback!
      }
      onInspect();
    }, 500);
  };

  const handlePointerUpOrCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (longPressedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressedRef.current = false; // Reset
      return;
    }
    if (disabled) return;
    if (onClick) onClick();
  };

  // Card size parameters
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "w-24 h-36 text-[10px]";
      case "pitch":
        return "w-full h-full text-[10.5px]";
      case "lg":
        return "w-44 h-64 text-sm";
      default: // md
        return "w-32 h-48 text-xs";
    }
  };

  const getPaddingClasses = () => {
    switch (size) {
      case "sm":
        return "p-1.5";
      case "pitch":
        return "p-0.5 xs:p-1";
      case "lg":
        return "p-5";
      default: // md
        return "p-3";
    }
  };

  // Determine border and hover effects
  const isLegend = isPlayer && (card as PlayerCard).isLegend;
  const isSpecial = card.type === "special";

  const isFrozen = isPlayer && (card as PlayerCard).frozen;
  const isStunned = isPlayer && (card as PlayerCard).stunned;
  const isSilenced = isPlayer && (card as PlayerCard).silenced;

  return (
    <div 
      style={{ perspective: "1200px" }}
      className={`relative ${getSizeClasses()} ${className}`}
    >
      {/* 3D Rotator card element */}
      <motion.div
        id={`card_3d_wrapper_${card.id}`}
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpOrCancel}
        onPointerLeave={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        style={{ 
          transformStyle: "preserve-3d",
          width: "100%",
          height: "100%"
        }}
        initial={{ scale: 0.7, opacity: 0, rotateY: 180 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          rotateY: isRevealed ? 0 : 180 
        }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 160, 
          damping: 22,
          opacity: { duration: 0.4 }
        }}
        whileHover={disabled ? {} : { 
          y: -10,
          rotateX: -4,
          rotateY: isRevealed ? 4 : 176,
          scale: 1.05,
          transition: { type: "spring", stiffness: 400, damping: 15 }
        }}
        whileTap={disabled ? {} : { scale: 0.95 }}
        className="relative cursor-pointer w-full h-full"
      >

        {/* ==================== CARD BACK FACE ==================== */}
        <div 
          style={{ 
            backfaceVisibility: "hidden",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transform: "rotateY(180deg)"
          }}
          className={`rounded-2xl overflow-hidden select-none w-full h-full shadow-lg transition-all ${
            isActive
              ? activeColor === "rose"
                ? "ring-4 ring-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.7)] border-rose-400 animate-pulse"
                : "ring-4 ring-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.7)] border-emerald-400 animate-pulse"
              : ""
          } ${
            isSelected
              ? "ring-4 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
              : ""
          } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          <img src={coverImg} className="w-full h-full object-cover" alt="Card Cover" />
        </div>


        {/* ==================== CARD FRONT FACE ==================== */}
        <div 
          style={{ 
            backfaceVisibility: "hidden",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transform: "rotateY(0deg)"
          }}
          className={`rounded-2xl overflow-hidden select-none flex flex-col justify-between ${getPaddingClasses()} ${
            hasImage
              ? "border-none bg-transparent shadow-none"
              : isLegend
              ? "border border-amber-500/35 bg-gradient-to-br from-[#241d11] via-[#0f0e0b] to-black text-[#e0e0e0] shadow-[0_5px_15px_rgba(245,158,11,0.18)]"
              : isSpecial
              ? "border border-teal-500/20 bg-gradient-to-br from-[#0b1b19] via-[#090e0c] to-black text-teal-100 shadow-[0_5px_15px_rgba(20,184,166,0.18)]"
              : "border border-white/5 bg-gradient-to-b from-[#131413] to-black text-[#e0e0e0] shadow-xl"
          } ${
            isActive
              ? activeColor === "rose"
                ? "ring-4 ring-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.7)] border-rose-400 z-45 animate-pulse"
                : "ring-4 ring-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.7)] border-emerald-400 z-45 animate-pulse"
              : ""
          } ${
            isSelected
              ? "ring-4 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
              : ""
          } ${
            isBurning
              ? "border-red-500 saturate-[0.12] opacity-55 ring-2 ring-red-500/30"
              : ""
          } ${disabled ? "opacity-35 cursor-not-allowed" : ""}`}
        >
          {/* Status Overlay Indicators */}
          {isFrozen && (
            <div className="absolute inset-0 bg-blue-500/25 backdrop-blur-[1px] flex flex-col items-center justify-center z-30 rounded-2xl border border-blue-400/40">
              <span className="text-2xl animate-pulse">❄️</span>
              {size !== "sm" && size !== "pitch" && (
                <span className="text-[10px] text-blue-200 mt-1 font-bold">مجمد</span>
              )}
            </div>
          )}

          {isStunned && (
            <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[0.5px] flex flex-col items-center justify-center z-30 rounded-2xl border border-amber-400/30">
              <span className="text-2xl animate-spin" style={{ animationDuration: '4s' }}>💫</span>
              {size !== "sm" && size !== "pitch" && (
                <span className="text-[10px] text-amber-200 mt-1 font-bold">مصدوم</span>
              )}
            </div>
          )}

          {isSilenced && (
            <div className="absolute inset-0 bg-red-500/15 backdrop-blur-[0.5px] flex flex-col items-center justify-center z-30 rounded-2xl border border-red-400/35">
              <span className="text-2xl animate-bounce">🔇</span>
              {size !== "sm" && size !== "pitch" && (
                <span className="text-[10px] text-red-200 mt-1 font-bold font-sans">صامت</span>
              )}
            </div>
          )}

          {/* If there's a card image URL, render the full-size image as the card's front face */}
          {hasImage ? (
            <div className="absolute inset-0 w-full h-full z-0">
              <img
                src={cardImageUrl}
                alt={card.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  // Add fallback emoji text if the image fails to load
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    const fallback = document.createElement("div");
                    fallback.className = "absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-2 text-center";
                    fallback.innerHTML = `<span style="font-size:24px;">⚠️</span><span style="font-size:10px;margin-top:4px;">${card.name}</span>`;
                    parent.appendChild(fallback);
                  }
                }}
              />
              {/* Overlay stats subtly at the bottom so players know the values during gameplay */}
              {isPlayer && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-around bg-black/85 py-0.5 px-2 rounded-full border border-white/10 gap-1.5 z-10 whitespace-nowrap">
                  <span className="text-rose-450 font-mono text-[9px] font-black flex items-center gap-0.5">⚔️ {(card as PlayerCard).attack}</span>
                  <span className="text-white/20 text-[8px]">|</span>
                  <span className="text-emerald-450 font-mono text-[9px] font-black flex items-center gap-0.5">🛡️ {(card as PlayerCard).defense}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Shimmer Sweep Animation Overlay (for Legends and Specials) */}
              {(isLegend || isSpecial) && (
                <motion.div 
                  className={`absolute top-0 -left-[140%] w-[100%] h-full transform skew-x-30 pointer-events-none z-0 ${
                    isLegend 
                      ? "bg-linear-to-r from-transparent via-amber-400/10 to-transparent" 
                      : "bg-linear-to-r from-transparent via-teal-400/10 to-transparent"
                  }`}
                  animate={{ left: ["-140%", "140%"] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                />
              )}

              {/* Golden starry particles for legends */}
              {isLegend && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                  <Sparkles className="absolute top-2 right-2 w-3 h-3 text-amber-400/30 animate-pulse" />
                  <Sparkles className="absolute bottom-3 left-2.5 w-2 h-2 text-amber-400/25 animate-bounce" />
                </div>
              )}

              {/* Legend Gold Accent Banner */}
              {isPlayer && (card as PlayerCard).isLegend && (
                <div className="absolute top-1.5 left-1.5 text-amber-500 text-[8px] font-black px-1.5 py-0.5 border border-amber-500/35 rounded bg-amber-950/25 z-10 flex items-center gap-0.5">
                  <span>★</span>
                  {size !== "pitch" && <span>أسطورة</span>}
                </div>
              )}

              {/* 1. Header Row (Role/Spec indicator) */}
              {isPlayer ? (
                (() => {
                  const player = card as PlayerCard;
                  const roleColors = {
                    attacker: "bg-rose-500/10 text-rose-400 border-rose-500/25",
                    defender: "bg-blue-500/10 text-blue-400 border-blue-500/25",
                    midfielder: "bg-amber-500/10 text-amber-400 border-amber-500/25",
                    goalkeeper: "bg-teal-500/10 text-teal-400 border-teal-500/25"
                  };
                  
                  return (
                    <div className={`flex items-center justify-between z-10 w-full ${size === "pitch" ? "mb-0.5" : "mb-1"}`}>
                      {size !== "pitch" && (
                        <span className="text-[9px] text-[#e0e0e0]/45 font-black whitespace-nowrap overflow-hidden text-ellipsis max-w-[55%]">
                          {player.team}
                        </span>
                      )}
                      <span className={`px-1 rounded text-[8px] font-black border tracking-tight ${roleColors[player.role] || ""} ${size === "pitch" ? "mx-auto text-[8px] px-1 py-0.5" : ""}`}>
                        {size === "pitch" ? getShortRole(player.role) : player.roleArabic}
                      </span>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const special = card as SpecialCard;
                  return (
                    <div className={`flex items-center justify-between z-10 w-full ${size === "pitch" ? "mb-0.5" : "mb-1"}`}>
                      {size !== "pitch" ? (
                        <span className="text-[8.5px] text-teal-400/80 font-black flex items-center gap-0.5 max-w-[65%] whitespace-nowrap overflow-hidden text-ellipsis">
                          <Sparkle className="w-2.5 h-2.5 animate-spin text-teal-400" />
                          <span>{special.effectArabic}</span>
                        </span>
                      ) : (
                        <span className="mx-auto text-[8px] text-teal-300 font-extrabold">⚡ تكتيك</span>
                      )}
                      {size !== "pitch" && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-teal-500/10 border border-teal-400/20 text-teal-300">
                          تأثير
                        </span>
                      )}
                    </div>
                  );
                })()
              )}

              {/* 2. Visual Centerpiece Portrait / Icon Container */}
              {isPlayer ? (
                (() => {
                  const player = card as PlayerCard;
                  return (
                    <div className={`flex flex-col items-center justify-center z-10 w-full ${size === "pitch" ? "my-0" : "my-0.5"}`}>
                      <motion.div 
                        whileHover={{ scale: 1.12, rotate: 5 }}
                        className={`relative flex items-center justify-center ${
                          size === "lg" 
                            ? "w-16 h-16 text-3xl" 
                            : size === "pitch" 
                            ? "w-6 h-6 text-xs xs:w-8 xs:h-8 xs:text-sm sm:w-9 sm:h-9 sm:text-base md:w-10 md:h-10 md:text-lg" 
                            : "w-11 h-11 text-2xl"
                        } rounded-full bg-[#1a1c1a]/80 border border-white/5 shadow-inner`}
                      >
                        <span>{player.avatar}</span>
                      </motion.div>
                      <span className={`font-serif font-black text-center text-white whitespace-nowrap overflow-hidden text-ellipsis w-full ${
                        size === "lg" ? "text-base mt-1" : size === "pitch" ? "text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-sans tracking-tight leading-none mt-0.5" : "text-xs mt-1"
                      }`}>
                        {player.name}
                      </span>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const special = card as SpecialCard;
                  return (
                    <div className="flex flex-col items-center justify-center my-0.5 z-10 text-center">
                      <motion.div 
                        whileHover={{ scale: 1.15, rotate: -5 }}
                        className={`flex items-center justify-center ${
                          size === "lg" 
                            ? "w-14 h-14 text-3xl" 
                            : size === "pitch" 
                            ? "w-6 h-6 text-xs xs:w-7 h-7 xs:text-sm sm:w-8 h-8 sm:text-base md:w-9 md:h-9" 
                            : "w-10 h-10 text-xl"
                        } rounded-full bg-black/40 border border-white/5`}
                      >
                        <span>{special.icon}</span>
                      </motion.div>
                      <span className={`font-serif font-black text-center text-teal-200 overflow-hidden text-ellipsis w-full ${
                        size === "lg" ? "text-sm mt-1" : size === "pitch" ? "text-[7.5px] xs:text-[8.5px] leading-none mt-0.5" : "text-[11px] mt-1"
                      }`}>
                        {special.name}
                      </span>
                    </div>
                  );
                })()
              )}

              {/* 3. Footer Stats Grid or Card Descriptions */}
              {isPlayer ? (
                (() => {
                  const player = card as PlayerCard;
                  if (size === "pitch") {
                    return (
                      <div className="flex items-center justify-around bg-black/60 py-0.5 px-0.5 rounded border border-white/5 z-10 w-full mt-auto">
                        <div className="flex items-center gap-0.2 md:gap-0.5 text-rose-400">
                          <span className="font-mono text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black">{player.attack}</span>
                          <span className="text-[8px] xs:text-[10px]">⚔️</span>
                        </div>
                        <div className="w-[1px] h-2 bg-white/10" />
                        <div className="flex items-center gap-0.2 md:gap-0.5 text-emerald-400">
                          <span className="font-mono text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black">{player.defense}</span>
                          <span className="text-[8px] xs:text-[10px]">🛡️</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 gap-1 bg-[#090b0a]/90 p-1.5 rounded-lg border border-white/5 z-10 mt-0.5">
                      <div className="flex flex-col items-center justify-center border-l border-white/5">
                        <div className="flex items-center gap-0.5 text-rose-400 font-bold">
                          <span className="font-mono text-xs font-black">
                            {player.attack}
                          </span>
                          <Swords className="w-3 h-3 text-rose-500" />
                        </div>
                        <span className="text-[7.5px] text-[#e0e0e0]/40 mt-0.5 scale-90 font-bold">هجوم</span>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center gap-0.5 text-emerald-400 font-bold">
                          <span className="font-mono text-xs font-black">
                            {player.defense}
                          </span>
                          <Shield className="w-3 h-3 text-emerald-500" />
                        </div>
                        <span className="text-[7.5px] text-[#e0e0e0]/40 mt-0.5 scale-90 font-bold font-sans">دفاع</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const special = card as SpecialCard;
                  if (size === "pitch") {
                    return (
                      <div className="bg-teal-950/20 py-0.5 px-1 border border-teal-500/25 rounded z-10 text-center w-full">
                        <span className="text-[8px] text-teal-300 font-extrabold font-serif">⚡ مهارة</span>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-[#1a1c1a]/95 p-1 rounded-md border border-white/5 z-10 text-right mt-1 flex-1 flex flex-col justify-center">
                      <p className="text-[8.5px] text-[#e0e0e0]/55 leading-tight line-clamp-3">
                        {special.description}
                      </p>
                    </div>
                  );
                })()
              )}

              {/* Extra info text for large scale layout */}
              {size === "lg" && isPlayer && (
                <p className="text-[9.5px] text-[#e0e0e0]/55 mt-1.5 leading-normal text-right line-clamp-2 z-10 font-sans">
                  {(card as PlayerCard).description}
                </p>
              )}
            </>
          )}

          {/* Burn Overlay Action Marker */}
          {isBurning && (
            <div className="absolute inset-0 bg-red-950/45 flex flex-col items-center justify-center text-red-400 font-black z-20 rounded-2xl font-sans">
              <Ban className="w-6 h-6 stroke-3 animate-spin" />
              <span className="text-[9px] mt-1 text-center font-bold tracking-wide">تضحية لحرق لاعب</span>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
