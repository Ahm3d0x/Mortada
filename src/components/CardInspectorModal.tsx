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
      advantages.push("👑 أسطورة الملاعب: يتمتع بخصائص خارقة وحصانة تكتيكية بنسبة 100%.");
    }
    if (p.attack >= 85) {
      advantages.push("🔥 هداف قناص: دقة تصويب هائلة وقدرة فائقة على ترجمة أنصاف الفرص لأهداف محققة.");
    }
    if (p.defense >= 85) {
      advantages.push("🛡️ صخرة دفاعية: ذكاء حاد في قطع الكرات وإحباط غارات المهاجمين بمثالية.");
    }
    if (Math.abs(p.attack - p.defense) <= 15) {
      advantages.push("🔄 محرك متزن: قدرة هائلة على الربط والدعم المتواصل من الدفاع للهجوم.");
    }
    if (p.role === "goalkeeper") {
      advantages.push("🧤 حامي العرين: ردود فعل خارقة تمنع أثقل التسديدات وتثبت النتيجة.");
    }
    advantages.push("📊 تكتيك مرن: يمكن تنزيله في أي خانة بالملعب بمجرد سحبه وتتحول خانته لمركزه فوراً.");
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
          className="relative max-w-2xl w-full bg-[#121412] rounded-3xl overflow-hidden border border-emerald-500/30 shadow-[0_20px_60px_rgba(16,185,129,0.25)] flex flex-col md:flex-row z-10"
        >
          {/* Aesthetic background matrix */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_15px,rgba(255,255,255,0.01)_15px,rgba(255,255,255,0.01)_30px)] pointer-events-none" />

          {/* Close trigger button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-black/60 border border-white/10 text-white hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
            id="close_inspector_btn"
          >
            <X className="w-5 h-5" />
          </button>

          {/* LEFT: Stunning large rotating card display */}
          <div className="md:w-1/2 p-6 flex flex-col items-center justify-center bg-gradient-to-b from-black via-[#070907] to-[#121412] border-b md:border-b-0 md:border-l border-white/5 relative">
            <div className="absolute top-4 left-4 flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-900/35 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5" />
              <span>معاينة ثلاثية الأبعاد</span>
            </div>

            {/* Glowing card pedestal */}
            <div className="absolute w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl -bottom-10" />

            {/* Giant inspect Card face */}
            <motion.div
              initial={{ rotateY: 180, scale: 0.8 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 20 }}
              className="relative p-1 md:p-3 rounded-2xl border-2 flex flex-col justify-between w-52 h-72 text-sm shadow-2xl overflow-hidden select-none bg-gradient-to-b from-[#181918] to-black"
              style={{
                borderColor: player?.isLegend ? "#fbbf24" : special ? "#2dd4bf" : "rgba(255,255,255,0.1)",
                boxShadow: player?.isLegend ? "0 0 30px rgba(251,191,36,0.15)" : special ? "0 0 30px rgba(45,212,191,0.15)" : "none"
              }}
            >
              {/* Star sparkles for legends */}
              {player?.isLegend && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <Star className="absolute top-3 left-3 w-4.5 h-4.5 text-amber-400 animate-spin" />
                  <Star className="absolute bottom-3 right-3 w-3 h-3 text-amber-400 animate-pulse" />
                </div>
              )}

              {/* CARD CONTENT HEADER */}
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] text-[#e0e0e0]/55 font-bold uppercase font-sans">
                  {player ? player.team : "كارت تكتيك"}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border tracking-tight ${
                  player ? "bg-rose-500/10 text-rose-400 border-rose-500/25" : "bg-teal-500/10 text-teal-400 border-teal-400/25"
                }`}>
                  {player ? player.roleArabic : "سحر"}
                </span>
              </div>

              {/* IMAGE / ICON CENTER */}
              <div className="flex flex-col items-center justify-center my-2 z-10 text-center">
                <span className="text-5xl drop-shadow-lg mb-2">
                  {player ? player.avatar : special ? special.icon : "⚽"}
                </span>
                <span className="font-serif font-black text-lg text-white">
                  {player ? player.name : special ? special.name : ""}
                </span>
              </div>

              {/* STATS OR DESCRIPTIONS */}
              {player ? (
                <div className="grid grid-cols-2 gap-1 bg-[#0c0e0c]/90 p-2 rounded-xl border border-white/5 z-10">
                  <div className="flex flex-col items-center border-l border-white/5">
                    <div className="flex items-center gap-1 text-rose-400">
                      <span className="font-mono text-base font-black">{player.attack}</span>
                      <Swords className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[8px] text-[#e0e0e0]/40 font-bold">هيجوم</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-emerald-400">
                      <span className="font-mono text-base font-black">{player.defense}</span>
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[8px] text-[#e0e0e0]/40 font-bold">ديفاع</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#121412] p-2 rounded-xl border border-white/5 z-10 text-right">
                  <span className="text-[9px] text-[#e0e0e0]/50 line-clamp-2">
                    {special?.effectArabic}
                  </span>
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT: Core Detailed Description and Specialty listings */}
          <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between text-right relative">
            <div className="space-y-4">
              {/* Title Section */}
              <div>
                <span className={`text-[10px] md:text-sm font-black tracking-wider uppercase ${player?.isLegend ? "text-amber-400" : "text-emerald-400"} font-sans`}>
                  {player ? `${player.roleArabic} التشكيلة الفائزة` : "كروت السخرية السحرية"}
                </span>
                <h2 className="text-2xl font-black text-white mt-1">
                  {player ? player.name : special ? special.name : ""}
                </h2>
              </div>

              {/* Player Stat Bars directly */}
              {player && (
                <div className="space-y-3 bg-black/35 p-4 rounded-xl border border-white/5">
                  {/* Attacking progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1 text-rose-400 font-bold">
                        <span>{player.attack}</span>
                        <Swords className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-slate-400 font-bold">القوة الهجومية والتصويب</span>
                    </div>
                    <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${player.attack}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-red-600 to-rose-400"
                      />
                    </div>
                  </div>

                  {/* Defending progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1 text-emerald-400 font-bold">
                        <span>{player.defense}</span>
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-slate-400 font-bold">الصلابة الدفاعية والتدخلات</span>
                    </div>
                    <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${player.defense}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-teal-600 to-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Advantage list block */}
              <div>
                <div className="flex items-center justify-start gap-1.5 flex-row-reverse text-slate-400 mb-2">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black">المميزات والفوائد التكتيكية:</span>
                </div>
                
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {player ? (
                    getPlayerAdvantages(player).map((adv, idx) => (
                      <div key={idx} className="text-xs text-slate-300 bg-white/5 p-2 rounded-lg leading-relaxed">
                        {adv}
                      </div>
                    ))
                  ) : special ? (
                    <>
                      <div className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-lg leading-relaxed">
                        ✨ <strong className="text-teal-400">تأثير الكرت السحري:</strong> {special.description}
                      </div>
                      <div className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-lg leading-relaxed">
                        🔄 <strong className="text-teal-400">طريقة الاستخدام:</strong> اسحب الكارت ليدك أولاً من الكونسول الفني، ثم انقر عليه لتفعل تأثير السحر أو أحرقه للتخلص من لاعب الخصم.
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Back Button */}
            <div className="mt-6 pt-4 border-t border-white/5">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gradient-to-r from-[#1b2b1e] to-black hover:from-[#26412b] border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 text-xs font-black rounded-xl transition-all cursor-pointer shadow-md"
              >
                رجوع وتخطي المعاينة الفنية
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
