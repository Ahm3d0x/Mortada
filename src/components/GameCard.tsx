/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Shield, Swords, Sparkles, Ban, Sparkle } from "lucide-react";
import { Card, PlayerCard, SpecialCard } from "../types";

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
}

export default function GameCard({
  card,
  isRevealed,
  onClick,
  isSelected,
  isBurning,
  disabled,
  size = "md",
  className = "",
  onInspect
}: GameCardProps) {
  const isPlayer = card.type === "player";
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || !onInspect) return;
    // Set a timeout for 500ms for solid long-press detection
    timerRef.current = setTimeout(() => {
      onInspect();
    }, 500);
  };

  const handlePointerUpOrCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Card size parameters
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "w-24 h-36 text-[10px]";
      case "pitch":
        return "w-full max-w-[110px] h-[160px] xs:w-[110px] xs:h-[160px] md:w-[130px] md:h-[190px] text-[10.5px]";
      case "lg":
        return "w-44 h-64 text-sm";
      default: // md
        return "w-32 h-48 text-xs";
    }
  };

  const getPaddingClasses = () => {
    switch (size) {
      case "sm":
        return "p-2";
      case "pitch":
        return "p-2 md:p-3";
      case "lg":
        return "p-5";
      default: // md
        return "p-3";
    }
  };

  // Determine border and hover effects
  const isLegend = isPlayer && (card as PlayerCard).isLegend;
  const isSpecial = card.type === "special";

  return (
    <div 
      style={{ perspective: "1200px" }}
      className={`relative ${getSizeClasses()} ${className}`}
    >
      {/* 3D Rotator card element */}
      <motion.div
        id={`card_3d_wrapper_${card.id}`}
        onClick={disabled ? undefined : onClick}
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
          className={`rounded-2xl overflow-hidden select-none border-2 flex flex-col justify-between ${getPaddingClasses()} ${
            isSelected
              ? "border-amber-400 bg-gradient-to-b from-[#1b1c1b] to-black ring-4 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              : "border-white/10 bg-gradient-to-b from-[#141514] to-black hover:border-white/20"
          } ${disabled ? "opacity-70 cursor-not-allowed" : ""} shadow-xl transition-colors`}
        >
          {/* Subtle diagonal grid pattern */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.015)_10px,rgba(255,255,255,0.015)_20px)] pointer-events-none" />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/5 pointer-events-none" />
          <div className="absolute w-16 h-16 rounded-full border border-white/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          
          {/* Top Header details */}
          <div className="w-full flex justify-between items-center opacity-40 text-[9px] text-white/50 font-black font-mono">
            <span>{size === "pitch" ? "MORTADA" : "COUNTER"}</span>
            <span>مرتدة</span>
          </div>

          {/* Core soccer design */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <motion.div 
              animate={{ 
                rotate: [0, 360],
                scale: [0.95, 1.05, 0.95]
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className={`${size === "pitch" ? "w-8 h-8" : "w-10 h-10"} rounded-full bg-[#121412] border border-white/10 flex items-center justify-center shadow-lg`}
            >
              <span className={`${size === "pitch" ? "text-sm" : "text-xl"} opacity-85`}>⚽</span>
            </motion.div>
            <span className={`${size === "pitch" ? "text-[8px]" : "text-[10px]"} text-[#10b981] font-black tracking-widest uppercase`}>
              تكتيك مخفي
            </span>
          </div>

          {/* Card back footer */}
          <div className="w-full flex items-center justify-center opacity-25 text-[8px] font-mono text-white/50 font-bold">
            <span>{size === "pitch" ? "TACTIC" : "COACH HAND CARD"}</span>
          </div>
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
          className={`rounded-2xl overflow-hidden select-none border flex flex-col justify-between ${getPaddingClasses()} ${
            isLegend
              ? "border-amber-400 bg-gradient-to-br from-[#241d11] via-[#0f0e0b] to-black shadow-[0_5px_15px_rgba(245,158,11,0.18)]"
              : isSpecial
              ? "border-teal-400/40 bg-gradient-to-br from-[#0b1b19] via-[#090e0c] to-black shadow-[0_5px_15px_rgba(20,184,166,0.18)]"
              : "border-white/10 bg-gradient-to-b from-[#131413] to-black text-[#e0e0e0] shadow-xl"
          } ${
            isSelected
              ? "border-amber-400 ring-4 ring-amber-400/25 bg-[#1a1c1a]"
              : ""
          } ${
            isBurning
              ? "border-red-500 saturate-[0.12] opacity-55 ring-2 ring-red-500/30"
              : ""
          } ${disabled ? "opacity-35 cursor-not-allowed" : ""}`}
        >
          {/* Shimmer Sweep Animation Overlay (for Legends and Specials) */}
          {(isLegend || isSpecial) && (
            <motion.div 
              className={`absolute top-0 -left-[140%] w-[100%] h-full transform skew-x-30 pointer-events-none z-0 ${
                isLegend 
                  ? "bg-gradient-to-r from-transparent via-amber-400/10 to-transparent" 
                  : "bg-gradient-to-r from-transparent via-teal-400/10 to-transparent"
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
              <span>أسطورة</span>
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
                  <span className={`px-1 rounded text-[8px] font-black border tracking-tight ${roleColors[player.role] || ""} ${size === "pitch" ? "mx-auto text-[8.5px] px-1.5 py-0.5" : ""}`}>
                    {player.roleArabic}
                  </span>
                </div>
              );
            })()
          ) : (
            (() => {
              const special = card as SpecialCard;
              return (
                <div className={`flex items-center justify-between z-10 w-full ${size === "pitch" ? "mb-0.5" : "mb-1"}`}>
                  <span className="text-[8.5px] text-teal-400/80 font-black flex items-center gap-0.5 max-w-[65%] whitespace-nowrap overflow-hidden text-ellipsis">
                    <Sparkle className="w-2.5 h-2.5 animate-spin text-teal-400" />
                    <span>{special.effectArabic}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-teal-500/10 border border-teal-400/20 text-teal-300">
                    تأثير
                  </span>
                </div>
              );
            })()
          )}

          {/* 2. Visual Centerpiece Portrait / Icon Container */}
          {isPlayer ? (
            (() => {
              const player = card as PlayerCard;
              return (
                <div className="flex flex-col items-center justify-center my-0.5 z-10">
                  <motion.div 
                    whileHover={{ scale: 1.12, rotate: 5 }}
                    className={`relative flex items-center justify-center ${
                      size === "lg" 
                        ? "w-16 h-16 text-3xl" 
                        : size === "pitch" 
                        ? "w-11 h-11 text-xl" 
                        : "w-11 h-11 text-2xl"
                    } rounded-full bg-[#1a1c1a]/80 border border-white/5 shadow-inner`}
                  >
                    <span>{player.avatar}</span>
                  </motion.div>
                  <span className={`font-serif font-black mt-1 text-center text-white whitespace-nowrap overflow-hidden text-ellipsis w-full ${
                    size === "lg" ? "text-base" : size === "pitch" ? "text-[11px] font-sans tracking-tight" : "text-xs"
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
                        ? "w-9 h-9 text-xl" 
                        : "w-10 h-10 text-xl"
                    } rounded-full bg-black/40 border border-white/5`}
                  >
                    <span>{special.icon}</span>
                  </motion.div>
                  <span className={`font-serif font-black mt-1 text-center text-teal-200 overflow-hidden text-ellipsis w-full ${
                    size === "lg" ? "text-sm" : size === "pitch" ? "text-[10px]" : "text-[11px]"
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
              return (
                <div className={`grid grid-cols-2 gap-1 bg-[#090b0a]/90 ${
                  size === "pitch" ? "p-1 rounded-md" : "p-1.5 rounded-lg"
                } border border-white/5 z-10 mt-0.5`}>
                  
                  {/* Attack stat banner */}
                  <div className="flex flex-col items-center justify-center border-l border-white/5">
                    <div className="flex items-center gap-0.5 text-rose-400">
                      <span className={`font-mono font-black ${size === "pitch" ? "text-[12px]" : "text-xs"}`}>
                        {player.attack}
                      </span>
                      <Swords className="w-3 h-3 text-rose-500" />
                    </div>
                    {size !== "pitch" && (
                      <span className="text-[7.5px] text-[#e0e0e0]/40 mt-0.5 scale-90 font-bold">هجوم</span>
                    )}
                  </div>

                  {/* Defense stat banner */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-0.5 text-emerald-400">
                      <span className={`font-mono font-black ${size === "pitch" ? "text-[12px]" : "text-xs"}`}>
                        {player.defense}
                      </span>
                      <Shield className="w-3 h-3 text-emerald-500" />
                    </div>
                    {size !== "pitch" && (
                      <span className="text-[7.5px] text-[#e0e0e0]/40 mt-0.5 scale-90 font-bold font-sans">دفاع</span>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
              const special = card as SpecialCard;
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

          {/* Burn Overlay Action Marker */}
          {isBurning && (
            <div className="absolute inset-0 bg-red-950/45 flex flex-col items-center justify-center text-red-400 font-black z-20 rounded-2xl">
              <Ban className="w-6 h-6 stroke-3 animate-spin" />
              <span className="text-[9px] mt-1 text-center font-bold tracking-wide">تضحية لحرق لاعب</span>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
