/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, Sparkles, Trophy, Users, Zap, Bot, ArrowRight, ArrowLeft } from "lucide-react";
import { SoundEffects } from "../utils/sounds";

interface WelcomeMenuProps {
  onStartGame: (
    coachName: string,
    teamVibe: string,
    difficulty: "normal" | "tactical" | "legend",
    matchDuration: number,
    legendPercentage: number
  ) => void;
  onInstallClick?: () => void;
}

const TEAM_VIBES = [
  { name: "الفراعنة", color: "from-red-600 to-amber-500", desc: "أداء تكتيكي صلب", emoji: "🇪🇬" },
  { name: "أسود الأطلس", color: "from-emerald-700 to-red-600", desc: "دفاع فولاذي صلب", emoji: "🇲🇦" },
  { name: "نجوم السامبا", color: "from-yellow-400 to-green-600", desc: "مهارات ممتعة", emoji: "🇧🇷" },
  { name: "راقصو التانغو", color: "from-sky-400 to-slate-200 text-slate-800", desc: "تكتيك وذكاء لافت", emoji: "🇦🇷" },
  { name: "كتائب الأخضر", color: "from-green-600 to-emerald-800", desc: "انسجام وسرعة مميزة", emoji: "🇸🇦" },
  { name: "الملكي", color: "from-indigo-600 to-violet-800", desc: "شخصية البطل العريقة", emoji: "👑" }
];

export default function WelcomeMenu({ onStartGame, onInstallClick }: WelcomeMenuProps) {
  const [step, setStep] = useState<"cover" | "coach" | "match" | "opponent">("cover");
  const [coachName, setCoachName] = useState("");
  const [selectedVibe, setSelectedVibe] = useState(TEAM_VIBES[0]);
  const [difficulty, setDifficulty] = useState<"normal" | "tactical" | "legend">("normal");
  const [matchDuration, setMatchDuration] = useState<number>(180);
  const [legendPercentage, setLegendPercentage] = useState<number>(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = coachName.trim() || "الكابتن البطل";
    SoundEffects.playWhistle();
    onStartGame(finalName, selectedVibe.name, difficulty, matchDuration, legendPercentage);
  };

  // Back progress indicator dot map
  const activeDotIndex = step === "cover" ? -1 : step === "coach" ? 0 : step === "match" ? 1 : 2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="max-w-xl mx-auto my-3 p-4 md:p-6 bg-[#0b0e0c]/95 border border-emerald-500/15 rounded-2xl shadow-2xl text-[#e0e0e0] backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[360px] xs:min-h-[385px] md:min-h-[410px] select-none"
      id="welcome_menu_container"
    >
      {/* Visual top corner grids reminiscent of elite soccer games */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none rounded-bl-full" />
      <div className="absolute top-0 left-0 w-16 h-16 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(255,255,255,0.015)_8px,rgba(255,255,255,0.015)_16px)] pointer-events-none" />

      {/* Progress Dots Bar */}
      {step !== "cover" && (
        <div className="flex items-center justify-center gap-1.5 mb-3 shrink-0">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeDotIndex 
                  ? "w-6 bg-emerald-500" 
                  : i < activeDotIndex 
                    ? "w-2 bg-emerald-800" 
                    : "w-2 bg-white/10"
              }`}
            />
          ))}
        </div>
      )}

      {/* Actual Form wrapper */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between h-full">
        
        {/* Step 1: Cover Screen */}
        {step === "cover" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-around text-center py-4 relative"
          >
            {/* Centered Golden Trophy */}
            <div className="relative flex justify-center mb-1">
              <div className="absolute -inset-1 rounded-full bg-emerald-500/10 blur-xl animate-pulse" />
              <div className="w-16 h-16 bg-[#121613] border border-emerald-500/25 rounded-full flex items-center justify-center relative shadow-lg">
                <Trophy className="w-8 h-8 text-amber-400" />
                <Sparkles className="w-4 h-4 text-emerald-400 absolute -top-1 -right-1 animate-ping" />
              </div>
            </div>

            <div className="mb-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-2">
                تحدي تكتيك كروت اللقاء الكروي 🏆
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400">
                مـرتـدة
              </h1>
              <p className="text-[11px] text-[#e0e0e0]/55 font-semibold mt-1">
                لعبة التخطيط الكروي وتحدي الذكاء التكتيكي الذكي
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setStep("coach");
                }}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs md:text-sm rounded-xl flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-b-4 border-emerald-700 shadow-lg cursor-pointer"
              >
                <span>بدء اللعبة وتجهيز الفريق ⚽</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  onInstallClick?.();
                }}
                className="w-full py-2 bg-[#121613] hover:bg-emerald-950/20 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer shadow-md"
              >
                <span>📱 تثبيت اللعبة كبرنامج للموبايل</span>
              </button>
              
              <p className="text-[9px] text-[#e0e0e0]/30">
                نسخة التحديث التكتيكي الشاملة
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 2: Coach and Team Identity Details */}
        {step === "coach" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-between py-1"
          >
            <div>
              <div className="text-right border-b border-white/5 pb-2 mb-2">
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">مرحلة 1: هوية ومسمى القائد</span>
                <h2 className="text-sm font-black text-white mt-0.5">من هو قائد كتيبتك؟</h2>
              </div>

              {/* Name Input */}
              <div className="mb-3">
                <label className="block text-[#e0e0e0]/60 font-black mb-1.5 text-right text-[10px]">
                  اسم المدرب:
                </label>
                <input
                  id="input_coach_name"
                  type="text"
                  placeholder="مثلي: الكابتن جوارديولا..."
                  maxLength={20}
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right placeholder:text-[#e0e0e0]/25 transition-all font-bold text-xs"
                />
              </div>

              {/* Team Vibe Selection Grid - SUPER COMPACT */}
              <div>
                <label className="block text-[#e0e0e0]/60 font-black mb-1.5 text-right text-[10px]">
                  اختر هوية الفريق:
                </label>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {TEAM_VIBES.map((vibe) => (
                    <button
                      key={vibe.name}
                      type="button"
                      id={`vibe_btn_${vibe.name}`}
                      onClick={() => {
                        SoundEffects.playCardDraw();
                        setSelectedVibe(vibe);
                      }}
                      className={`flex items-center gap-1.5 justify-start p-1.5 px-2.5 rounded-lg border transition-all cursor-pointer relative overflow-hidden text-right min-h-[38px] ${
                        selectedVibe.name === vibe.name
                          ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                          : "border-white/5 bg-transparent hover:border-white/10 text-slate-400"
                      }`}
                    >
                      {/* Flag Indicator */}
                      <span className="text-sm">{vibe.emoji}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-extrabold text-[9.5px] truncate leading-tight">{vibe.name}</span>
                        <span className="text-[7.5px] text-slate-500 truncate leading-none mt-0.5">{vibe.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setStep("cover");
                }}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
              >
                رجوع
              </button>
              
              <button
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setStep("match");
                }}
                className="px-5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>التالي: إعدادات اللقاء</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Match settings (Length & Legends Ratio) */}
        {step === "match" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-between py-1"
          >
            <div>
              <div className="text-right border-b border-white/5 pb-2 mb-3">
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">مرحلة 2: ضوابط ومعاملات اللقاء</span>
                <h2 className="text-sm font-black text-white mt-0.5">تحديد زمن اللعب وفرص الأساطير</h2>
              </div>

              {/* Match Duration Panel */}
              <div className="mb-4 bg-black/25 border border-white/5 rounded-xl p-2.5 relative">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="bg-[#10b981]/15 border border-[#10b981]/25 px-2 py-0.5 rounded-lg">
                    <span className="text-[10px] font-black text-emerald-400">
                      {Math.floor(matchDuration / 60)} دقيقة
                    </span>
                  </div>
                  <label className="block text-[#e0e0e0]/75 text-[10px] font-black">
                    وقت المباراة المطلوب:
                  </label>
                </div>
                
                <input
                  type="range"
                  min={300}
                  max={3600}
                  step={60}
                  value={matchDuration}
                  onChange={(e) => {
                    SoundEffects.playCardDraw();
                    setMatchDuration(Number(e.target.value));
                  }}
                  className="w-full h-1 bg-black/50 border border-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                
                {/* Micro presets */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[
                    { label: "5 د", value: 300 },
                    { label: "10 د", value: 600 },
                    { label: "30 د", value: 1800 },
                    { label: "60 د", value: 3600 }
                  ].map((preset) => {
                    const isSelected = matchDuration === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          SoundEffects.playCardDraw();
                          setMatchDuration(preset.value);
                        }}
                        className={`py-1 rounded-md border text-[8.5px] text-center font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-[#162a1c] text-emerald-300"
                            : "border-white/5 bg-transparent text-[#e0e0e0]/40 hover:border-white/10 hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legendary Cards Appearance Ratio Panel */}
              <div className="bg-black/25 border border-white/5 rounded-xl p-2.5 relative">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-lg">
                    <span className="text-[10px] font-black text-amber-400">
                      {legendPercentage === 0 ? "0% (مستبعدة)" : `${legendPercentage}%`}
                    </span>
                  </div>
                  <label className="block text-[#e0e0e0]/75 text-[10px] font-black">
                    نسبة فرصة ظهور أوراق الأساطير:
                  </label>
                </div>
                
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={legendPercentage}
                  onChange={(e) => {
                    SoundEffects.playCardDraw();
                    setLegendPercentage(Number(e.target.value));
                  }}
                  className="w-full h-1 bg-black/50 border border-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                
                {/* Micro presets */}
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {[
                    { label: "0%", value: 0 },
                    { label: "15%", value: 15 },
                    { label: "30%", value: 30 },
                    { label: "60%", value: 60 },
                    { label: "100%", value: 100 }
                  ].map((preset) => {
                    const isSelected = legendPercentage === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          SoundEffects.playCardDraw();
                          setLegendPercentage(preset.value);
                        }}
                        className={`py-1 rounded-md border text-[8.5px] text-center font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-[#302213] text-amber-300 font-extrabold"
                            : "border-white/5 bg-transparent text-[#e0e0e0]/40 hover:border-white/10 hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setStep("coach");
                }}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
              >
                السابق
              </button>
              
              <button
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setStep("opponent");
                }}
                className="px-5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>التالي: مستوى الخصم</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Opponent coach difficulty selection */}
        {step === "opponent" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-between py-1"
          >
            <div>
              <div className="text-right border-b border-white/5 pb-2 mb-3">
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">مرحلة 3: المدرب المقابل</span>
                <h2 className="text-sm font-black text-white mt-0.5">من ستواجه على الخط الفني؟</h2>
              </div>

              {/* Tactical Difficulty Selector */}
              <div className="space-y-1.5">
                {[
                  { id: "normal", label: "مدرب ناشئ", icon: Users, desc: "تكتيك أساسي - مثالي للمبتدئين لاستكشاف الأوراق", color: "border-emerald-500 text-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20" },
                  { id: "tactical", label: "مدرب محترف", icon: Shield, desc: "تكتيك متقدم - يرد بالتبديلات والصد الدفاعي المنظم", color: "border-amber-500 text-amber-400 bg-amber-950/10 hover:bg-amber-950/20" },
                  { id: "legend", label: "جوارديولا (ذكي)", icon: Bot, desc: "ذكاء استباقي فائق - يقرأ تكتيكك ويعدل هجومه ويدمج الأساطير بدقة", color: "border-rose-500 text-rose-450 bg-rose-950/10 hover:bg-rose-950/20" }
                ].map((lvl) => {
                  const IconComp = lvl.icon;
                  const isSelected = difficulty === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      id={`diff_btn_${lvl.id}`}
                      onClick={() => {
                        SoundEffects.playCardDraw();
                        setDifficulty(lvl.id as any);
                      }}
                      className={`w-full p-2.5 rounded-xl border flex items-start gap-3 transition-all text-right cursor-pointer ${
                        isSelected
                          ? `${lvl.color} border-l-4 shadow-md`
                          : "border-white/5 text-[#e0e0e0]/45 bg-transparent hover:border-white/10 hover:text-white"
                      }`}
                    >
                      <div className="p-1 rounded-lg bg-black/40 mt-0.5 shrink-0">
                        <IconComp className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-xs block">{lvl.label}</span>
                        <p className="text-[9.5px] opacity-70 leading-normal mt-0.5">{lvl.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Final Actions */}
            <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setStep("match");
                }}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
              >
                السابق
              </button>
              
              <button
                type="submit"
                id="start_match_submit_button"
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-black text-xs rounded-xl flex items-center gap-1 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <span>بدء اللقاء وانطلاق المباراة 🏁⚡</span>
              </button>
            </div>
          </motion.div>
        )}

      </form>
    </motion.div>
  );
}
