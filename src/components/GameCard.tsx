/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Shield, Swords, Sparkles, AlertCircle, Ban, Sparkle } from "lucide-react";
import { Card, PlayerCard, SpecialCard } from "../types";

interface GameCardProps {
  card: Card;
  isRevealed: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  isBurning?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function GameCard({
  card,
  isRevealed,
  onClick,
  isSelected,
  isBurning,
  disabled,
  size = "md",
  className = ""
}: GameCardProps) {
  const isPlayer = card.type === "player";

  // Card size parameters
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "w-24 h-36 text-xs";
      case "lg":
        return "w-44 h-64 text-sm";
      default: // md
        return "w-32 h-48 text-xs";
    }
  };

  // Face down rendering (Card Back)
  if (!isRevealed) {
    return (
      <motion.div
        whileHover={disabled ? {} : { y: -6, scale: 1.03 }}
        whileTap={disabled ? {} : { scale: 0.97 }}
        onClick={disabled ? undefined : onClick}
        id={`card_back_${card.id}`}
        className={`relative ${getSizeClasses()} rounded-xl cursor-pointer overflow-hidden shadow-xl select-none border-2 transition-all flex flex-col items-center justify-between p-3 ${
          isSelected
            ? "border-amber-400 bg-[#1a1c1a] ring-4 ring-amber-400/30"
            : "border-white/10 bg-[#1a1c1a] hover:border-white/20"
        } ${disabled ? "opacity-70 cursor-not-allowed" : ""} ${className}`}
      >
        {/* Subtle diagonal line pattern */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.01)_10px,rgba(255,255,255,0.01)_20px)] pointer-events-none" />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/5 pointer-events-none" />
        <div className="absolute w-16 h-16 rounded-full border border-white/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        {/* Top Header details */}
        <div className="w-full flex justify-between items-center opacity-40 text-[9px] text-white/50 font-bold font-mono">
          <span>PONTO</span>
          <span>بونطو</span>
        </div>

        {/* Core soccer design */}
        <div className="flex flex-col items-center gap-1.5 z-10">
          <div className="w-10 h-10 rounded-full bg-[#121412] border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <span className="text-xl opacity-80">⚽</span>
          </div>
          <span className="text-[10px] text-white/60 font-medium tracking-wide text-center">بطاقة مقلوبة</span>
        </div>

        {/* Card back footer */}
        <div className="w-full flex items-center justify-center opacity-25 text-[8px] font-mono text-white/50">
          <span>COACH TACTICAL CARD</span>
        </div>
      </motion.div>
    );
  }

  // Face up rendering
  if (isPlayer) {
    const player = card as PlayerCard;
    const roleColors = {
      attacker: "bg-rose-500/10 text-rose-400 border-rose-500/25",
      defender: "bg-blue-500/10 text-blue-400 border-blue-500/25",
      midfielder: "bg-amber-500/10 text-amber-400 border-amber-500/25",
      goalkeeper: "bg-teal-500/10 text-teal-400 border-teal-500/25"
    };

    return (
      <motion.div
        whileHover={disabled ? {} : { y: -6, scale: 1.03 }}
        whileTap={disabled ? {} : { scale: 0.97 }}
        onClick={disabled ? undefined : onClick}
        id={`card_player_${player.id}`}
        className={`relative ${getSizeClasses()} rounded-xl cursor-pointer overflow-hidden shadow-2xl select-none border flex flex-col justify-between p-3 transition-all ${
          player.isLegend
            ? "border-amber-500 bg-gradient-to-br from-[#1a1c1a] to-black shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            : "border-white/10 bg-[#121412] text-[#e0e0e0]"
        } ${
          isSelected
            ? "border-amber-400 ring-4 ring-amber-400/20 bg-[#1a1c1a]"
            : ""
        } ${
          isBurning
            ? "border-red-500 saturate-[0.15] opacity-55 ring-2 ring-red-500/40"
            : ""
        } ${disabled ? "opacity-30 cursor-not-allowed" : ""} ${className}`}
      >
        {/* Legend Gold Border decoration */}
        {player.isLegend && (
          <div className="absolute top-2 left-2 text-amber-500 text-[8px] font-bold px-1.5 py-0.5 border border-amber-500/40 rounded bg-amber-950/20">
            أساطير
          </div>
        )}

        {/* Card Header (Role and Country flag) */}
        <div className="flex items-center justify-between z-10 w-full mb-1">
          <span className="text-[9px] text-[#e0e0e0]/45 font-medium">{player.team}</span>
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${roleColors[player.role] || ""}`}>
            {player.roleArabic}
          </span>
        </div>

        {/* Central Portrait space */}
        <div className="flex flex-col items-center justify-center my-1 z-10">
          <div className={`relative flex items-center justify-center ${size === "lg" ? "w-16 h-16 text-3xl font-serif" : "w-11 h-11 text-2xl"} rounded-full bg-black/40 border border-white/5 shadow-inner`}>
            {player.isLegend && (
              <span className="absolute -top-1 -right-1 text-xs text-amber-400 animate-pulse">
                ★
              </span>
            )}
            <span>{player.avatar}</span>
          </div>
          <span className={`font-serif font-bold mt-1.5 text-center text-white whitespace-nowrap overflow-hidden text-ellipsis w-full ${size === "lg" ? "text-base" : "text-xs"}`}>
            {player.name}
          </span>
        </div>

        {/* Core Stats Bar */}
        <div className="grid grid-cols-2 gap-1 bg-[#1a1c1a] p-1.5 rounded-lg border border-white/5 z-10 mt-1">
          {/* Attack stat */}
          <div className="flex flex-col items-center justify-center border-l border-white/5">
            <div className="flex items-center gap-0.5 text-rose-400">
              <span className="font-mono font-bold text-xs">{player.attack}</span>
              <Swords className="w-2.5 h-2.5 text-rose-500" />
            </div>
            <span className="text-[7.5px] text-[#e0e0e0]/40 scale-90">هجوم</span>
          </div>

          {/* Defense stat */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-0.5 text-emerald-400">
              <span className="font-mono font-bold text-xs">{player.defense}</span>
              <Shield className="w-2.5 h-2.5 text-emerald-500" />
            </div>
            <span className="text-[7.5px] text-[#e0e0e0]/40 scale-90">دفاع</span>
          </div>
        </div>

        {/* Extra info for large view */}
        {size === "lg" && (
          <p className="text-[9px] text-[#e0e0e0]/50 mt-1.5 leading-tight text-right line-clamp-2">
            {player.description}
          </p>
        )}

        {/* Burn Overlay Action Marker */}
        {isBurning && (
          <div className="absolute inset-0 bg-red-950/40 flex flex-col items-center justify-center text-red-400 font-bold z-20">
            <Ban className="w-5 h-5 stroke-2" />
            <span className="text-[8px] mt-1 text-center">التضحية بالحرق (1/2)</span>
          </div>
        )}
      </motion.div>
    );
  }

  // Face up Special Card rendering
  const special = card as SpecialCard;
  return (
    <motion.div
      whileHover={disabled ? {} : { y: -6, scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={disabled ? undefined : onClick}
      id={`card_special_${special.id}`}
      className={`relative ${getSizeClasses()} rounded-xl cursor-pointer overflow-hidden shadow-2xl select-none border flex flex-col justify-between p-3 transition-all border-teal-500/30 bg-[#121412] ${
        isSelected
          ? "border-amber-400 ring-4 ring-amber-400/20 bg-[#1a1c1a]"
          : ""
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""} ${className}`}
    >
      {/* Top Banner special name */}
      <div className="flex items-center justify-between z-10 w-full mb-1">
        <span className="text-[9px] text-teal-400/80 font-bold flex items-center gap-0.5">
          <Sparkle className="w-2.5 h-2.5 animate-pulse text-teal-400" />
          <span>{special.effectArabic}</span>
        </span>
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-teal-500/10 border border-teal-400/15 text-teal-300">
          تكتيك خاص
        </span>
      </div>

      {/* Central Emoji */}
      <div className="flex flex-col items-center justify-center my-1 z-10 text-center">
        <div className={`flex items-center justify-center ${size === "lg" ? "w-14 h-14 text-3xl" : "w-10 h-10 text-xl"} rounded-full bg-black/40 border border-white/5`}>
          <span>{special.icon}</span>
        </div>
        <span className={`font-serif font-bold mt-1.5 text-center text-teal-200 overflow-hidden text-ellipsis w-full ${size === "lg" ? "text-sm" : "text-[11px]"}`}>
          {special.name}
        </span>
      </div>

      {/* Special descriptor text */}
      <div className="bg-[#1a1c1a] p-1.5 rounded-lg border border-white/5 z-10 text-right mt-1.5 flex-1 flex flex-col justify-center">
        <p className="text-[8.5px] text-[#e0e0e0]/50 leading-relaxed line-clamp-3">
          {special.description}
        </p>
      </div>
    </motion.div>
  );
}
