/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Shield, Swords, Sparkles, Award, Star, Info, Zap } from "lucide-react";
import { Card, PlayerCard, SpecialCard } from "../types";
import { explainAbility, calculatePowerScore } from "../utils/rulesEngine";

interface CardInspectorModalProps {
  card: Card | null;
  onClose: () => void;
}

export default function CardInspectorModal({ card, onClose }: CardInspectorModalProps) {
  if (!card) return null;

  const isPlayer = card.type === "player";
  const player = isPlayer ? (card as PlayerCard) : null;
  const special = !isPlayer ? (card as SpecialCard) : null;

  const abilityExplanation = card.ability ? explainAbility(card.ability) : [];
  const powerScoreData = card.ability ? calculatePowerScore(card.ability, {
    attack: isPlayer && player ? player.attack : 0,
    defense: isPlayer && player ? player.defense : 0,
    isLegend: isPlayer && player ? player.isLegend : false,
  }) : null;

  // Render player descriptions / advantages based on stats
  const getPlayerAdvantages = (p: PlayerCard) => {
    const advantages: string[] = [];
    if (p.isLegend) {
      advantages.push("👑 أسطورة أساسية بقوة استثنائية.");
    }
    if (p.attack >= 12) {
      advantages.push("⚔️ هجوم خارق وتهديف حاسم.");
    }
    if (p.defense >= 12) {
      advantages.push("🛡️ دفاع صلب وقطع كرات ممتاز.");
    }
    if (Math.abs(p.attack - p.defense) <= 2) {
      advantages.push("🔄 لاعب متزن تكتيكياً.");
    }
    if (p.role === "goalkeeper") {
      advantages.push("🧤 حارس مرمى بحراسة فائقة.");
    }
    advantages.push("📊 تكتيك مرن بالمركز.");
    return advantages;
  };

  const getSpecialUsageInstructions = (effect: string): string => {
    switch (effect) {
      case "offside":
        return "تُفعل تلقائياً عندما يبدأ الخصم بالهجوم عليك. تلغي هذه الخطوة القوة الهجومية للمهاجم الأقوى لدى الخصم لتمنع الخطورة تماماً وتسمح لمدافعيك وحارسك بالسيطرة على الكرة.";
      case "wet_pitch":
        return "العب هذا التكتيك خلال دورك؛ يتأثر عشب الملعب بالبلل مما يبطئ حركة الخصم ويقلل قوته الهجومية بمقدار 4 نقاط كاملة، مما يصعب عليه اختراق دفاعاتك.";
      case "counter_attack":
        return "العب هذا كارت هجومي أثناء محاولتك للتسديد. يمنح المهاجم النشط لديك طاقة هجومية إضافية قدرها +4 نقاط لتزيد من احتمال هز شباك الخصم.";
      case "fans":
        return "العب هذا الكارت في دورك ليشعل الجمهور الحماس بالمدرج. يمنح هذا الهتاف زيادة +3 نقاط في الهجوم والدفاع لجميع لاعبيك المكشوفين بالملعب.";
      case "park_the_bus":
        return "العب هذا الكارت في مرحلة الدفاع عند هجوم الخصم. يتراجع لاعبوك لتغطية المرمى وإغلاق المساحات، مما يعزز دفاع مدافعيك المعنيين بالتصدي بـ +6 نقاط دفاعية.";
      case "red_card":
        return "العب الكارت في دورك؛ يتدخل الحكم ليمنحك سلطة طرد أي لاعب لخصمك (مكشوف أو مقلوب) واستبعاده بالبطاقة الحمراء 🟥 خارج اللقاء تماماً، مما يجعله يلعب بنقص عددي.";
      case "world_cup":
        return "العب الكارت في دورك لتحفيز الفريق. يمنحك هذا فوراً الحق بسحب كارتين إضافيين من باقات السحب لتعزز يدك وتزيد من خياراتك التكتيكية.";
      default:
        return "العب هذا الكارت التكتيكي في دورك أو عند الصد بحسب الحاجة. سيقوم محرك القواعد تلقائياً باحتساب تأثيره المبرمج وتطبيقه على الإحصائيات أو اللاعبين بالملعب.";
    }
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
              <div className="space-y-2.5">
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
                    <div className="space-y-2">
                      <div className="text-[10px] sm:text-xs text-slate-300 bg-white/5 p-2 rounded-lg leading-normal">
                        ✨ {special.description}
                      </div>
                      <div className="bg-teal-950/20 border border-teal-500/25 p-2.5 rounded-xl text-right space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-row-reverse text-teal-400 border-b border-white/5 pb-1">
                          <Info className="w-3.5 h-3.5 animate-pulse" />
                          <span className="text-[9.5px] sm:text-xs font-black">إرشادات استخدام التكتيك 💡</span>
                        </div>
                        <p className="text-[9px] sm:text-[10.5px] text-slate-350 leading-relaxed font-medium">
                          {getSpecialUsageInstructions(special.effect)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {player && player.isLegend && (
                  <div className="bg-amber-950/20 border border-amber-500/25 p-2.5 rounded-xl text-right space-y-1.5 mt-1">
                    <div className="flex items-center gap-1.5 flex-row-reverse text-amber-400 border-b border-white/5 pb-1">
                      <Star className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                      <span className="text-[9.5px] sm:text-xs font-black">قوانين وكيفية استعمال الأسطورة 👑</span>
                    </div>
                    <div className="space-y-1 text-[9px] sm:text-[10.5px] text-slate-300 leading-relaxed">
                      <p>● <strong>شرط الإنزال (الحرق):</strong> لا يمكن تنزيل الأسطورة مباشرة بالملعب. لابد من التضحية (حرق) كارتين عاديين من يدك خارج اللعب أولاً، ثم تنزيله في مركز فارغ أو استبداله بلاعب مكشوف.</p>
                      <p>● <strong>الأفضلية الكروية:</strong> يتميز الأسطورة بطاقة قصوى تبلغ 15 نقطة في مركزه المفضل، مما يضمن تفوقاً تكتيكياً ساحقاً للفريق.</p>
                      <p>● <strong>الموازنة الأساسية:</strong> يحصل كارت الأسطورة تلقائياً على +6 نقاط قوة كعازل موازنة في محرك الاحتساب.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Rules Engine Ability Block */}
              {card.ability && (
                <div className="space-y-2 bg-black/45 p-3 rounded-xl border border-emerald-500/20 shadow-inner text-right mt-3">
                  <div className="flex items-center justify-between flex-row-reverse border-b border-white/5 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-row-reverse text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span className="text-[10px] sm:text-xs font-black">القدرة الخاصة المبرمجة ⚙️</span>
                    </div>
                    {powerScoreData && (
                      <div className={`px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center gap-1 ${
                        powerScoreData.level === "strong" 
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                          : powerScoreData.level === "weak"
                          ? "bg-slate-500/10 text-slate-400 border-slate-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                      }`}>
                        <Zap className="w-2.5 h-2.5" />
                        <span>نقاط القوة: {powerScoreData.score}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {abilityExplanation.map((line, idx) => (
                      <div key={idx} className="text-[10px] sm:text-xs text-slate-300 flex items-start justify-end gap-1.5 flex-row-reverse leading-relaxed">
                        <span className="text-emerald-400 mt-0.5">●</span>
                        <span className="flex-1">{line}</span>
                      </div>
                    ))}
                  </div>

                   {powerScoreData?.explanation && (
                    <div className={`mt-2 p-1.5 rounded text-[9px] sm:text-[10px] text-right font-medium leading-normal border ${
                      powerScoreData.level === "strong"
                        ? "bg-rose-950/20 border-rose-800/20 text-rose-300"
                        : powerScoreData.level === "weak"
                        ? "bg-slate-900/35 border-slate-700/20 text-slate-400"
                        : "bg-emerald-950/20 border-emerald-800/20 text-emerald-300"
                    }`}>
                      {powerScoreData.explanation}
                    </div>
                  )}

                  {powerScoreData && powerScoreData.breakdown && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 text-right space-y-2 select-none">
                      <div className="text-[9px] sm:text-[10px] font-black text-[#e0e0e0]/45 uppercase tracking-wider mb-1 flex items-center justify-end gap-1 flex-row-reverse">
                        <span>📊 تفاصيل احتساب موازنة الكارت</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        {/* 1. Base stats */}
                        {powerScoreData.breakdown.base > 0 && (
                          <div>
                            <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                              <span className="font-mono font-bold">{powerScoreData.breakdown.base}</span>
                              <span>القوة البدنية والأساسية (الهجوم/الدفاع)</span>
                            </div>
                            <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-linear-to-r from-emerald-600 to-emerald-400" 
                                style={{ width: `${Math.min(100, (powerScoreData.breakdown.base / 45) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* 2. Legend Buff */}
                        {powerScoreData.breakdown.legend > 0 && (
                          <div>
                            <div className="flex justify-between text-[9px] text-amber-400 mb-0.5">
                              <span className="font-mono font-bold">+{powerScoreData.breakdown.legend}</span>
                              <span>شرف الأسطورة (كارت أسطورة كروي)</span>
                            </div>
                            <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-linear-to-r from-amber-600 to-amber-400" 
                                style={{ width: `${Math.min(100, (powerScoreData.breakdown.legend / 10) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* 3. Ability strength */}
                        {powerScoreData.breakdown.ability > 0 && (
                          <div>
                            <div className="flex justify-between text-[9px] text-teal-400 mb-0.5">
                              <span className="font-mono font-bold">{powerScoreData.breakdown.ability}</span>
                              <span>القوة التكتيكية (القدرة الخاصة وتأثيرها)</span>
                            </div>
                            <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-linear-to-r from-teal-600 to-teal-400" 
                                style={{ width: `${Math.min(100, (powerScoreData.breakdown.ability / 50) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
