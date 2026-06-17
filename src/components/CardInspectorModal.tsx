/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Shield, Swords, Sparkles, Award, Star, Info, Zap } from "lucide-react";
import { Card, PlayerCard, SpecialCard } from "../types";

interface CardInspectorModalProps {
  card: Card | null;
  onClose: () => void;
}

export default function CardInspectorModal({ card, onClose }: CardInspectorModalProps) {
  if (!card) return null;

  const isPlayer = card.type === "player";
  const player = isPlayer ? (card as PlayerCard) : null;
  const special = !isPlayer ? (card as SpecialCard) : null;

  // Render player descriptions / advantages based on stats
  const getPlayerAdvantages = (p: PlayerCard) => {
    const advantages: string[] = [];
    if (p.isLegend) {
      advantages.push("👑 أسطورة أساسية بقوة استثنائية.");
    }
    if (p.attack >= 85) {
      advantages.push("⚔️ هجوم خارق وتهديف حاسم.");
    }
    if (p.defense >= 85) {
      advantages.push("🛡️ دفاع صلب وقطع كرات ممتاز.");
    }
    if (Math.abs(p.attack - p.defense) <= 15) {
      advantages.push("🔄 لاعب متزن تكتيكياً.");
    }
    if (p.role === "goalkeeper") {
      advantages.push("🧤 حارس مرمى بحراسة فائقة.");
    }
    advantages.push("📊 تكتيك مرن بالمركز.");
    return advantages;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl" id="cinematic_card_inspector">
        {/* Animated Background overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-zoom-out"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.9, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="relative max-w-lg md:max-w-xl w-full max-h-[92%] overflow-y-auto bg-[#121412] rounded-3xl border border-emerald-500/30 shadow-[0_20px_60px_rgba(16,185,129,0.25)] flex flex-col md:flex-row z-10 mx-auto"
        >
          {/* Aesthetic background matrix */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_15px,rgba(255,255,255,0.01)_15px,rgba(255,255,255,0.01)_30px)] pointer-events-none" />

          {/* Close trigger button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-40 p-2 rounded-full bg-black/60 border border-white/10 text-white hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
            id="close_inspector_btn"
          >
            <X className="w-4 h-4" />
          </button>

          {/* LEFT: Stunning rotating card display */}
          <div className="md:w-[45%] p-4 md:p-6 flex flex-col items-center justify-center bg-linear-to-b from-black via-[#070907] to-[#121412] border-b md:border-b-0 md:border-l border-white/5 relative">
            <div className="absolute top-3 left-3 flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-900/35 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
              <Zap className="w-2 h-2" />
              <span>معاينة للبطاقة</span>
            </div>

            {/* Glowing card pedestal */}
            <div className="absolute w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl -bottom-10" />

            {/* Giant inspect Card face */}
            <motion.div
              initial={{ rotateY: 180, scale: 0.8 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 20 }}
              className="relative p-2 rounded-2xl border-2 flex flex-col justify-between w-40 h-56 md:w-44 md:h-64 text-xs md:text-sm shadow-2xl overflow-hidden select-none bg-linear-to-b from-[#181918] to-black mt-4 md:mt-0"
              style={{
                borderColor: player?.isLegend ? "#fbbf24" : special ? "#2dd4bf" : "rgba(255,255,255,0.1)",
                boxShadow: player?.isLegend ? "0 0 20px rgba(251,191,36,0.12)" : special ? "0 0 20px rgba(45,212,191,0.12)" : "none"
              }}
            >
              {/* Star sparkles for legends */}
              {player?.isLegend && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <Star className="absolute top-2 left-2 w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <Star className="absolute bottom-2 right-2 w-2.5 h-2.5 text-amber-400 animate-pulse" />
                </div>
              )}

              {/* CARD CONTENT HEADER */}
              <div className="flex items-center justify-between z-10 w-full mb-1">
                <span className="text-[8px] md:text-[9.5px] text-[#e0e0e0]/55 font-bold uppercase font-sans whitespace-nowrap overflow-hidden text-ellipsis max-w-[60%]">
                  {player ? player.team : "كارت تكتيك"}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[8px] md:text-[9.5px] font-black border tracking-tight ${
                  player ? "bg-rose-500/10 text-rose-400 border-rose-500/25" : "bg-teal-500/10 text-teal-400 border-teal-400/25"
                }`}>
                  {player ? player.roleArabic : "تأثير"}
                </span>
              </div>

              {/* IMAGE / ICON CENTER */}
              <div className="flex flex-col items-center justify-center my-1 z-10 text-center">
                <span className="text-4xl md:text-5xl drop-shadow-lg mb-1">
                  {player ? player.avatar : special ? special.icon : "⚽"}
                </span>
                <span className="font-serif font-black text-sm md:text-base text-white line-clamp-1">
                  {player ? player.name : special ? special.name : ""}
                </span>
              </div>

              {/* STATS OR DESCRIPTIONS */}
              {player ? (
                <div className="grid grid-cols-2 gap-0.5 bg-[#0c0e0c]/90 p-1.5 rounded-lg border border-white/5 z-10">
                  <div className="flex flex-col items-center border-l border-white/5">
                    <div className="flex items-center gap-0.5 text-rose-400">
                      <span className="font-mono text-xs md:text-sm font-black">{player.attack}</span>
                      <Swords className="w-3 h-3" />
                    </div>
                    <span className="text-[7.5px] text-[#e0e0e0]/45 font-bold">هجوم</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-0.5 text-emerald-400">
                      <span className="font-mono text-xs md:text-sm font-black">{player.defense}</span>
                      <Shield className="w-3 h-3" />
                    </div>
                    <span className="text-[7.5px] text-[#e0e0e0]/45 font-bold">دفاع</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#121412] p-1.5 rounded-lg border border-white/5 z-10 text-center">
                  <span className="text-[8px] md:text-[9.5px] text-[#e0e0e0]/55 line-clamp-2">
                    {special?.effectArabic}
                  </span>
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT: Core Detailed Description and Specialty listings */}
          <div className="md:w-[55%] p-4 md:p-6 flex flex-col justify-between text-right relative">
            <div className="space-y-3">
              {/* Title Section */}
              <div>
                <span className={`text-[9px] md:text-xs font-black tracking-wider uppercase ${player?.isLegend ? "text-amber-400" : "text-emerald-400"} font-sans`}>
                  {player ? `${player.roleArabic}` : "تكتيك خاص"}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white mt-0.5">
                  {player ? player.name : special ? special.name : ""}
                </h2>
              </div>

              {/* Player Stat Bars directly */}
              {player && (
                <div className="space-y-2 bg-black/35 p-3 rounded-xl border border-white/5">
                  {/* Attacking progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs mb-0.5">
                      <div className="flex items-center gap-1 text-rose-400 font-bold">
                        <span>{player.attack}</span>
                        <Swords className="w-3 h-3" />
                      </div>
                      <span className="text-slate-400 font-bold">هجوم ⚔️</span>
                    </div>
                    <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${player.attack}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-linear-to-r from-red-600 to-rose-400"
                      />
                    </div>
                  </div>

                  {/* Defending progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs mb-0.5">
                      <div className="flex items-center gap-1 text-emerald-400 font-bold">
                        <span>{player.defense}</span>
                        <Shield className="w-3 h-3" />
                      </div>
                      <span className="text-slate-400 font-bold">دفاع 🛡️</span>
                    </div>
                    <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${player.defense}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-linear-to-r from-teal-600 to-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Advantage list block */}
              <div>
                <div className="flex items-center justify-start gap-1 pr-1 flex-row-reverse text-slate-400 mb-1">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] sm:text-xs font-black">مواصفات التكتيك الخاص بالبطاقة:</span>
                </div>
                
                <div className="space-y-1.5 max-h-[120px] md:max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                  {player ? (
                    getPlayerAdvantages(player).map((adv, idx) => (
                      <div key={idx} className="text-[10px] sm:text-xs text-slate-300 bg-white/5 p-1.5 rounded-lg leading-nomral">
                        {adv}
                      </div>
                    ))
                  ) : special ? (
                    <>
                      <div className="text-[10px] sm:text-xs text-slate-300 bg-white/5 p-2 rounded-lg leading-normal">
                        ✨ {special.description}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Back Button */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <button
                onClick={onClose}
                className="w-full py-2 bg-linear-to-r from-[#1b2b1e] to-black hover:from-[#26412b] border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 text-xs font-black rounded-xl transition-all cursor-pointer shadow-md"
              >
                إغلاق ✕
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
