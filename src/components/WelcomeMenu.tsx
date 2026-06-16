/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, Sparkles, Trophy, Users, Zap, Bot, ArrowRight, ArrowLeft } from "lucide-react";
import { SoundEffects } from "../utils/sounds";
import { getPackages } from "../admin/adminStore";
import { isSupabaseConfigured } from "../lib/supabase";

interface WelcomeMenuProps {
  onStartGame: (
    coachName: string,
    teamVibe: string,
    difficulty: "normal" | "tactical" | "legend",
    matchDuration: number,
    legendPercentage: number,
    maxDrawsPerTurn: number,
    maxMovesPerTurn: number,
    initialCardsCount: number,
    selectedPlayerPkgs: string[],
    selectedSpecialPkgs: string[]
  ) => void;
}

const TEAM_VIBES = [
  { name: "الفراعنة", color: "from-red-600 to-amber-500", desc: "أداء تكتيكي صلب", emoji: "🇪🇬" },
  { name: "أسود الأطلس", color: "from-emerald-700 to-red-600", desc: "دفاع فولاذي صلب", emoji: "🇲🇦" },
  { name: "نجوم السامبا", color: "from-yellow-400 to-green-600", desc: "مهارات ممتعة", emoji: "🇧🇷" },
  { name: "راقصو التانغو", color: "from-sky-400 to-slate-200 text-slate-800", desc: "تكتيك وذكاء لافت", emoji: "🇦🇷" },
  { name: "كتائب الأخضر", color: "from-green-600 to-emerald-800", desc: "انسجام وسرعة مميزة", emoji: "🇸🇦" },
  { name: "الملكي", color: "from-indigo-600 to-violet-850", desc: "شخصية البطل العريقة", emoji: "👑" }
];

export default function WelcomeMenu({ onStartGame }: WelcomeMenuProps) {
  const [step, setStep] = useState<"cover" | "coach" | "packages" | "match" | "opponent">("cover");
  const [coachName, setCoachName] = useState("");
  const [selectedVibe, setSelectedVibe] = useState(TEAM_VIBES[0]);
  const [difficulty, setDifficulty] = useState<"normal" | "tactical" | "legend">("normal");
  const [matchDuration, setMatchDuration] = useState<number>(180);
  const [legendPercentage, setLegendPercentage] = useState<number>(30);
  const [maxDrawsPerTurn, setMaxDrawsPerTurn] = useState<number>(2);
  const [maxMovesPerTurn, setMaxMovesPerTurn] = useState<number>(3);
  const [initialCardsCount, setInitialCardsCount] = useState<number>(5);

  // Packages loading
  const [dbPackages, setDbPackages] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [selectedPlayerPkgs, setSelectedPlayerPkgs] = useState<string[]>([]);
  const [selectedSpecialPkgs, setSelectedSpecialPkgs] = useState<string[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [specialSearch, setSpecialSearch] = useState("");

  useEffect(() => {
    if (isSupabaseConfigured) {
      setDbLoading(true);
      getPackages()
        .then((pkgs) => {
          setDbPackages(pkgs);
          setDbLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load packages in WelcomeMenu:", err);
          setDbLoading(false);
        });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = coachName.trim() || "الكابتن البطل";
    SoundEffects.playWhistle();
    onStartGame(
      finalName,
      selectedVibe.name,
      difficulty,
      matchDuration,
      legendPercentage,
      maxDrawsPerTurn,
      maxMovesPerTurn,
      initialCardsCount,
      selectedPlayerPkgs,
      selectedSpecialPkgs
    );
  };

  // Back progress indicator dot map
  const activeDotIndex = step === "cover" ? -1 : step === "coach" ? 0 : step === "packages" ? 1 : step === "match" ? 2 : 3;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="max-w-xl mx-auto my-3 p-4 md:p-6 bg-[#0b0e0c]/95 border border-emerald-500/15 rounded-2xl shadow-2xl text-[#e0e0e0] backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[360px] xs:min-h-[385px] md:min-h-[410px] select-none"
      id="welcome_menu_container"
    >
      {/* Visual top corner grids */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none rounded-bl-full" />
      <div className="absolute top-0 left-0 w-16 h-16 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(255,255,255,0.015)_8px,rgba(255,255,255,0.015)_16px)] pointer-events-none" />

      {/* Progress Dots Bar */}
      {step !== "cover" && (
        <div className="flex items-center justify-center gap-1.5 mb-3 shrink-0">
          {[0, 1, 2, 3].map((i) => (
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

      {/* Admin dashboard link for convenience */}
      {step === "cover" && (
        <a
          href="#/admin"
          className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-950/35 border border-emerald-500/25 hover:bg-emerald-900/35 text-[10px] text-emerald-400 font-bold transition-all cursor-pointer z-10"
        >
          ⚙️ لوحة التحكم الإدارية
        </a>
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

              {/* Team Vibe Selection Grid */}
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
                  setStep("packages");
                }}
                className="px-5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>التالي: باقات اللعب</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Choose Player & Special/Tactical Packages */}
        {step === "packages" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-between py-1"
          >
            <div>
              <div className="text-right border-b border-white/5 pb-2 mb-2">
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">مرحلة 2: باقات اللعب المستخدمة</span>
                <h2 className="text-sm font-black text-white mt-0.5">اختر باقات اللعيبة والكرات التكتيكية للماتش</h2>
              </div>

              <div className="max-h-[200px] xs:max-h-[240px] md:max-h-[270px] overflow-y-auto pr-1.5 space-y-3 select-none scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                
                {!isSupabaseConfigured ? (
                  <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-right">
                    <p className="text-[10px] text-amber-450 font-bold">⚠️ وضع الاتصال المحلي (قاعدة البيانات غير متصلة)</p>
                    <p className="text-[9px] text-[#e0e0e0]/70 mt-1 leading-normal">
                      لم يتم اكتشاف إعدادات Supabase في ملف .env. ستعمل اللعبة تلقائياً بالباقات الافتراضية المدمجة في اللعبة.
                    </p>
                  </div>
                ) : dbLoading ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    ⏳ جاري تحميل الباقات المتاحة من Supabase...
                  </div>
                ) : (
                  <>
                    {(() => {
                      const playerPkgs = dbPackages.filter(p => p.type === "player" || !p.type);
                      const specialPkgs = dbPackages.filter(p => p.type === "special");

                      const filteredPlayerPkgs = playerPkgs.filter(p => 
                        p.name.toLowerCase().includes(playerSearch.toLowerCase()) || 
                        (p.description || "").toLowerCase().includes(playerSearch.toLowerCase())
                      );

                      const filteredSpecialPkgs = specialPkgs.filter(p => 
                        p.name.toLowerCase().includes(specialSearch.toLowerCase()) || 
                        (p.description || "").toLowerCase().includes(specialSearch.toLowerCase())
                      );

                      return (
                        <>
                          {/* Player Packages list */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <input
                                type="text"
                                placeholder="🔍 ابحث عن باقة لاعبين..."
                                value={playerSearch}
                                onChange={(e) => setPlayerSearch(e.target.value)}
                                className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white text-right text-[9px] focus:outline-none focus:border-emerald-500 flex-1"
                              />
                              <label className="block text-[#e0e0e0]/60 font-black text-right text-[10px] shrink-0">
                                باقات اللاعبين المتاحة:
                              </label>
                            </div>
                            {playerPkgs.length === 0 ? (
                              <p className="text-[9px] text-slate-500 text-right">لا توجد باقات لاعبين. سيتم استخدام الباقة الافتراضية المدمجة.</p>
                            ) : filteredPlayerPkgs.length === 0 ? (
                              <p className="text-[9px] text-slate-500 text-right font-medium">لا توجد نتائج مطابقة لبحثك.</p>
                            ) : (
                              <div className="space-y-1">
                                {filteredPlayerPkgs.map((pkg) => {
                                  const isChecked = selectedPlayerPkgs.includes(pkg.id);
                                  return (
                                    <button
                                      key={pkg.id}
                                      type="button"
                                      onClick={() => {
                                        SoundEffects.playCardDraw();
                                        setSelectedPlayerPkgs(prev =>
                                          isChecked ? prev.filter(id => id !== pkg.id) : [...prev, pkg.id]
                                        );
                                      }}
                                      className={`w-full p-2 rounded-lg border flex items-center justify-between text-right cursor-pointer ${
                                        isChecked
                                          ? "border-emerald-500 bg-emerald-950/15 text-white"
                                          : "border-white/5 bg-black/20 text-slate-400 hover:border-white/10"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          readOnly
                                          className="accent-emerald-500"
                                        />
                                        <span className="text-[8px] text-slate-500">
                                          {pkg.legend_percentage}% أساطير
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-right">
                                          <span className="font-extrabold text-[11px] block">{pkg.name}</span>
                                          <span className="text-[8px] text-slate-500 block truncate max-w-[150px]">{pkg.description || "لا يوجد وصف"}</span>
                                        </div>
                                        <span className="text-sm">{pkg.image}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Special Packages list */}
                          <div style={{ marginTop: "12px" }}>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <input
                                type="text"
                                placeholder="🔍 ابحث عن باقة تكتيكية..."
                                value={specialSearch}
                                onChange={(e) => setSpecialSearch(e.target.value)}
                                className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white text-right text-[9px] focus:outline-none focus:border-emerald-500 flex-1"
                              />
                              <label className="block text-[#e0e0e0]/60 font-black text-right text-[10px] shrink-0">
                                باقات الكروت التكتيكية المتاحة:
                              </label>
                            </div>
                            {specialPkgs.length === 0 ? (
                              <p className="text-[9px] text-slate-500 text-right">لا توجد باقات كروت تكتيكية. سيتم استخدام الكروت التكتيكية الافتراضية.</p>
                            ) : filteredSpecialPkgs.length === 0 ? (
                              <p className="text-[9px] text-slate-500 text-right font-medium">لا توجد نتائج مطابقة لبحثك.</p>
                            ) : (
                              <div className="space-y-1">
                                {filteredSpecialPkgs.map((pkg) => {
                                  const isChecked = selectedSpecialPkgs.includes(pkg.id);
                                  return (
                                    <button
                                      key={pkg.id}
                                      type="button"
                                      onClick={() => {
                                        SoundEffects.playCardDraw();
                                        setSelectedSpecialPkgs(prev =>
                                          isChecked ? prev.filter(id => id !== pkg.id) : [...prev, pkg.id]
                                        );
                                      }}
                                      className={`w-full p-2 rounded-lg border flex items-center justify-between text-right cursor-pointer ${
                                        isChecked
                                          ? "border-emerald-500 bg-emerald-950/15 text-white"
                                          : "border-white/5 bg-black/20 text-slate-400 hover:border-white/10"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        readOnly
                                        className="accent-emerald-500"
                                      />
                                      <div className="flex items-center gap-2">
                                        <div className="text-right">
                                          <span className="font-extrabold text-[11px] block">{pkg.name}</span>
                                          <span className="text-[8px] text-slate-500 block truncate max-w-[150px]">{pkg.description || "لا يوجد وصف"}</span>
                                        </div>
                                        <span className="text-sm">{pkg.image}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}

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

        {/* Step 4: Match settings (Length & Legends Ratio) */}
        {step === "match" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-between py-1"
          >
            <div className="flex-1 flex flex-col justify-start">
              <div className="text-right border-b border-white/5 pb-2 mb-3">
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">مرحلة 3: ضوابط ومعاملات اللقاء</span>
                <h2 className="text-sm font-black text-white mt-0.5">تحديد زمن اللعب وفرص الأساطير والإعدادات</h2>
              </div>

              {/* Scrollable container for settings options */}
              <div className="max-h-[220px] xs:max-h-[260px] md:max-h-[290px] overflow-y-auto pr-1.5 space-y-3.5 select-none scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                
                {/* Match Duration Panel */}
                <div className="bg-black/25 border border-white/5 rounded-xl p-2.5 relative">
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

                {/* Custom Draws Panel */}
                <div className="bg-black/25 border border-white/5 rounded-xl p-2.5 relative">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-lg">
                      <span className="text-[10px] font-black text-emerald-450">
                        {maxDrawsPerTurn} سحبات
                      </span>
                    </div>
                    <label className="block text-[#e0e0e0]/75 text-[10px] font-black">
                      عدد سحبات الورق لكل دور:
                    </label>
                  </div>
                  
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={maxDrawsPerTurn}
                    onChange={(e) => {
                      SoundEffects.playCardDraw();
                      setMaxDrawsPerTurn(Number(e.target.value));
                    }}
                    className="w-full h-1 bg-black/50 border border-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  
                  {/* Micro presets */}
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const isSelected = maxDrawsPerTurn === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            SoundEffects.playCardDraw();
                            setMaxDrawsPerTurn(val);
                          }}
                          className={`py-1 rounded-md border text-[8.5px] text-center font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "border-emerald-500 bg-[#162a1c] text-emerald-300 font-extrabold"
                              : "border-white/5 bg-transparent text-[#e0e0e0]/40 hover:border-white/10 hover:text-white"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Moves Panel */}
                <div className="bg-black/25 border border-white/5 rounded-xl p-2.5 relative">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-lg">
                      <span className="text-[10px] font-black text-amber-450">
                        {maxMovesPerTurn} حركات
                      </span>
                    </div>
                    <label className="block text-[#e0e0e0]/75 text-[10px] font-black">
                      عدد الحركات لكل دور:
                    </label>
                  </div>
                  
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={maxMovesPerTurn}
                    onChange={(e) => {
                      SoundEffects.playCardDraw();
                      setMaxMovesPerTurn(Number(e.target.value));
                    }}
                    className="w-full h-1 bg-black/50 border border-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  
                  {/* Micro presets */}
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const isSelected = maxMovesPerTurn === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            SoundEffects.playCardDraw();
                            setMaxMovesPerTurn(val);
                          }}
                          className={`py-1 rounded-md border text-[8.5px] text-center font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "border-amber-500 bg-[#302213] text-amber-300 font-extrabold"
                              : "border-white/5 bg-transparent text-[#e0e0e0]/40 hover:border-white/10 hover:text-white"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Initial Cards Count Panel */}
                <div className="bg-black/25 border border-white/5 rounded-xl p-2.5 relative">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="bg-teal-500/15 border border-teal-500/25 px-2 py-0.5 rounded-lg">
                      <span className="text-[10px] font-black text-teal-400">
                        {initialCardsCount} كروت
                      </span>
                    </div>
                    <label className="block text-[#e0e0e0]/75 text-[10px] font-black">
                      عدد كروت البداية لكل لاعب:
                    </label>
                  </div>
                  
                  <input
                    type="range"
                    min={3}
                    max={10}
                    step={1}
                    value={initialCardsCount}
                    onChange={(e) => {
                      SoundEffects.playCardDraw();
                      setInitialCardsCount(Number(e.target.value));
                    }}
                    className="w-full h-1 bg-black/50 border border-white/5 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                  
                  {/* Micro presets */}
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {[3, 5, 7, 10].map((val) => {
                      const isSelected = initialCardsCount === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            SoundEffects.playCardDraw();
                            setInitialCardsCount(val);
                          }}
                          className={`py-1 rounded-md border text-[8.5px] text-center font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "border-teal-500 bg-[#142628] text-teal-300 font-extrabold"
                              : "border-white/5 bg-transparent text-[#e0e0e0]/40 hover:border-white/10 hover:text-white"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setStep("packages");
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

        {/* Step 5: Opponent coach difficulty selection */}
        {step === "opponent" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-between py-1"
          >
            <div>
              <div className="text-right border-b border-white/5 pb-2 mb-3">
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">مرحلة 4: المدرب المقابل</span>
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
