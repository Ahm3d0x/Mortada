/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Sparkles, Trophy, Users, Zap, Bot, ArrowRight, ArrowLeft, BookOpen, Settings, PlayCircle, Layers, Volume2, VolumeX } from "lucide-react";
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
  isMobileLandscape?: boolean;
}

const TEAM_VIBES = [
  { name: "الفراعنة", color: "from-red-600 to-amber-500", desc: "أداء تكتيكي صلب", emoji: "🇪🇬" },
  { name: "أسود الأطلس", color: "from-emerald-700 to-red-600", desc: "دفاع فولاذي صلب", emoji: "🇲🇦" },
  { name: "نجوم السامبا", color: "from-yellow-400 to-green-600", desc: "مهارات ممتعة", emoji: "🇧🇷" },
  { name: "راقصو التانغو", color: "from-sky-400 to-slate-200 text-slate-800", desc: "تكتيك وذكاء لافت", emoji: "🇦🇷" },
  { name: "كتائب الأخضر", color: "from-green-600 to-emerald-800", desc: "انسجام وسرعة مميزة", emoji: "🇸🇦" },
  { name: "الملكي", color: "from-indigo-600 to-violet-850", desc: "شخصية البطل العريقة", emoji: "👑" }
];

export default function WelcomeMenu({ onStartGame, isMobileLandscape = false }: WelcomeMenuProps) {
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<"home" | "play" | "decks" | "rules" | "settings">("home");

  // Game Setup States (Wizard under "Play" Tab)
  const [playStep, setPlayStep] = useState<"coach" | "packages" | "match">("coach");
  const [coachName, setCoachName] = useState("");
  const [selectedVibe, setSelectedVibe] = useState(TEAM_VIBES[0]);
  const [difficulty, setDifficulty] = useState<"normal" | "tactical" | "legend">("normal");
  const [matchDuration, setMatchDuration] = useState<number>(180);
  const [legendPercentage, setLegendPercentage] = useState<number>(30);
  const [maxDrawsPerTurn, setMaxDrawsPerTurn] = useState<number>(2);
  const [maxMovesPerTurn, setMaxMovesPerTurn] = useState<number>(3);
  const [initialCardsCount, setInitialCardsCount] = useState<number>(5);

  // Mute State
  const [isMuted, setIsMuted] = useState(SoundEffects.isMuted);

  // Rules Sub-Tab State
  const [rulesCategory, setRulesCategory] = useState<"basics" | "actions" | "attacking" | "specials">("basics");

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

  const toggleMute = () => {
    SoundEffects.isMuted = !SoundEffects.isMuted;
    setIsMuted(SoundEffects.isMuted);
    if (!SoundEffects.isMuted) {
      SoundEffects.playCardDraw();
    }
  };

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

  const triggerFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
        .then(() => {
          const screenOrientation = window.screen && (window.screen.orientation as any);
          if (screenOrientation && screenOrientation.lock) {
            screenOrientation.lock("landscape").catch(() => {});
          }
        })
        .catch((err) => {
          console.warn("Fullscreen toggle failed:", err);
        });
    }
  };

  return (
    <div className="w-full h-full min-h-screen flex flex-col justify-between select-none relative overflow-hidden bg-[#020503] text-[#e0e0e0] font-sans pb-14">
      
      {/* Background soccer pitch line art */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.025)_50%)] bg-size-[10%_100%]" />
        <div className="absolute inset-4 border border-white/20 rounded-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border border-white/25" />
        <div className="absolute top-1/2 left-4 right-4 h-px bg-white/25" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-64 h-24 border border-white/25 border-t-0 rounded-b" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 h-24 border border-white/25 border-b-0 rounded-t" />
      </div>

      {/* Radial glows */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-10 left-1/4 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* TOP GLOWING HEADER */}
      <header className="relative z-10 w-full flex items-center justify-between px-6 py-2.5 bg-black/40 border-b border-white/5 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-base font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-emerald-400 via-teal-300 to-green-400">
            مـرتـدة
          </h1>
        </div>
        
        <button
          onClick={toggleMute}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
          title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </header>

      {/* MIDDLE CONTENT WINDOW */}
      <main className="flex-1 relative z-10 w-full overflow-y-auto px-4 py-2 flex flex-col items-center justify-center max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: HOME */}
          {activeTab === "home" && (
            <motion.div
              key="tab_home"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center justify-center text-center space-y-4"
            >
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-1">
                  تحدي كروت التكتيك الكروي الذكي 🏆
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  لعبة التخطيط التكتيكي
                </h2>
              </div>

              {/* Massive Soccer Ball CTA FAB */}
              <div className="relative my-3 flex items-center justify-center">
                <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                <button
                  type="button"
                  onClick={() => {
                    SoundEffects.playWhistle();
                    triggerFullscreen();
                    setActiveTab("play");
                  }}
                  className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-350 hover:to-teal-400 text-slate-950 rounded-full flex flex-col items-center justify-center gap-1.5 shadow-[0_8px_32px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer z-10 border-4 border-slate-900 group"
                >
                  <span className="text-4xl group-hover:rotate-45 transition-transform duration-300">⚽</span>
                  <span className="text-[10px] font-black tracking-wider uppercase">ابدأ اللعب</span>
                </button>
              </div>

              {/* Quick stats / Vibe Card */}
              <div className="w-full bg-black/45 border border-white/10 rounded-2xl p-3 backdrop-blur-md flex items-center justify-around gap-2 max-w-sm">
                <div className="text-right">
                  <span className="text-[8px] text-slate-500 block">الهوية الافتراضية</span>
                  <span className="text-xs font-black text-[#e0e0e0]">{selectedVibe.emoji} {selectedVibe.name}</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-center">
                  <span className="text-[8px] text-slate-500 block">مستوى المدرب</span>
                  <span className="text-xs font-black text-amber-400">المحترف الأسطوري 🌟</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-left">
                  <span className="text-[8px] text-slate-500 block">الصعوبة الحالية</span>
                  <span className="text-xs font-black text-rose-400">
                    {difficulty === "normal" ? "ناشئ" : difficulty === "tactical" ? "محترف" : "ذكاء أسطوري"}
                  </span>
                </div>
              </div>

              <p className="text-[9.5px] text-slate-400 max-w-xs leading-normal">
                اضغط على الكرة لمشاهدة باقات اللعب وتعديل خطتك، ثم قيادة هجوم كتيبتك الكروية لصد ضربات الخصوم!
              </p>
            </motion.div>
          )}

          {/* TAB 2: PLAY (WIZARD SETUP) */}
          {activeTab === "play" && (
            <motion.div
              key="tab_play"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full"
            >
              <form onSubmit={handleSubmit} className="w-full flex flex-col justify-between">
                
                {/* Play Wizard Step 1: Coach Info */}
                {playStep === "coach" && (
                  <motion.div
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    <div className="text-right border-b border-white/5 pb-1.5 mb-2">
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">مرحلة 1 من 3: الهوية وقائد الفريق</span>
                      <h3 className="text-sm font-black text-white">من هو قائد كتيبتك الكروية؟</h3>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[#e0e0e0]/60 font-black text-right text-[9px]">اسم المدرب القائد:</label>
                      <input
                        type="text"
                        placeholder="مثال: الكابتن جوارديولا..."
                        maxLength={20}
                        value={coachName}
                        onChange={(e) => setCoachName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[#e0e0e0]/60 font-black text-right text-[9px]">اختر هوية وتكتيك الفريق:</label>
                      <div className="grid grid-cols-3 gap-1">
                        {TEAM_VIBES.map((vibe) => (
                          <button
                            key={vibe.name}
                            type="button"
                            onClick={() => {
                              SoundEffects.playCardDraw();
                              setSelectedVibe(vibe);
                            }}
                            className={`flex items-center gap-1 p-1 px-2 rounded-lg border transition-all cursor-pointer text-right min-h-[28px] ${
                              selectedVibe.name === vibe.name
                                ? "border-emerald-500 bg-emerald-950/20 text-white"
                                : "border-white/5 bg-black/25 text-slate-400 hover:border-white/10"
                            }`}
                          >
                            <span className="text-xs">{vibe.emoji}</span>
                            <span className="font-extrabold text-[8.5px] truncate">{vibe.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-3">
                      <button
                        type="button"
                        onClick={() => { SoundEffects.playCardDraw(); setActiveTab("home"); }}
                        className="px-4 py-1 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => { SoundEffects.playCardDraw(); setPlayStep("packages"); }}
                        className="px-5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>التالي: باقات الكروت</span>
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Play Wizard Step 2: Select Packages */}
                {playStep === "packages" && (
                  <motion.div
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    <div className="text-right border-b border-white/5 pb-1.5 mb-2">
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">مرحلة 2 من 3: باقات كروت اللعب</span>
                      <h3 className="text-sm font-black text-white">اختر باقات اللعيبة والكروت التكتيكية للمباراة</h3>
                    </div>

                    <div className="max-h-[120px] overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-emerald-500/20 text-right">
                      {!isSupabaseConfigured ? (
                        <div className="p-2 bg-amber-950/20 border border-amber-500/30 rounded-lg text-right">
                          <p className="text-[9px] text-amber-450 font-bold">⚠️ وضع المحاكاة المحلي نشّط</p>
                          <p className="text-[8px] text-slate-400 mt-0.5 leading-normal">
                            قاعدة البيانات غير متصلة. ستعمل اللعبة تلقائياً بالباقات والكرات التكتيكية الافتراضية المدمجة باللعبة.
                          </p>
                        </div>
                      ) : dbLoading ? (
                        <div className="text-center py-4 text-slate-500 text-[10px]">⏳ جاري تحميل الباقات من السيرفر...</div>
                      ) : (
                        <div className="space-y-2">
                          {/* Search inputs and list items simplified to fit */}
                          <div className="text-[9px] text-emerald-450">باقات اللاعبين المتاحة: {dbPackages.length}</div>
                          {dbPackages.map((pkg) => {
                            const isChecked = selectedPlayerPkgs.includes(pkg.id) || selectedSpecialPkgs.includes(pkg.id);
                            const isPlayer = pkg.type === "player" || !pkg.type;
                            return (
                              <button
                                key={pkg.id}
                                type="button"
                                onClick={() => {
                                  SoundEffects.playCardDraw();
                                  if (isPlayer) {
                                    setSelectedPlayerPkgs(prev => isChecked ? prev.filter(id => id !== pkg.id) : [...prev, pkg.id]);
                                  } else {
                                    setSelectedSpecialPkgs(prev => isChecked ? prev.filter(id => id !== pkg.id) : [...prev, pkg.id]);
                                  }
                                }}
                                className={`w-full p-1.5 rounded-lg border flex items-center justify-between text-right cursor-pointer text-[9px] ${
                                  isChecked ? "border-emerald-500 bg-emerald-950/15" : "border-white/5 bg-black/25 text-slate-400"
                                }`}
                              >
                                <span className="text-[8px] text-slate-500">{pkg.type === "special" ? "تكتيك" : "لاعبين"}</span>
                                <span className="font-extrabold">{pkg.name} {pkg.image}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-3">
                      <button
                        type="button"
                        onClick={() => { SoundEffects.playCardDraw(); setPlayStep("coach"); }}
                        className="px-4 py-1 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer"
                      >
                        السابق
                      </button>
                      <button
                        type="button"
                        onClick={() => { SoundEffects.playCardDraw(); setPlayStep("match"); }}
                        className="px-5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>التالي: صعوبة المباراة</span>
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Play Wizard Step 3: Match Details & Start */}
                {playStep === "match" && (
                  <motion.div
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2.5"
                  >
                    <div className="text-right border-b border-white/5 pb-1.5 mb-2">
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">مرحلة 3 من 3: صعوبة وضوابط المباراة</span>
                      <h3 className="text-sm font-black text-white">اختر صعوبة مدرب الخصم وإعدادات زمن المباراة</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-right">
                      {/* Left Column: Sliders */}
                      <div className="space-y-2 bg-black/20 p-2 border border-white/5 rounded-xl">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px] text-emerald-400">
                            <span>{Math.floor(matchDuration / 60)} د</span>
                            <span className="font-bold">وقت المباراة:</span>
                          </div>
                          <input
                            type="range"
                            min={300}
                            max={1800}
                            step={60}
                            value={matchDuration}
                            onChange={(e) => setMatchDuration(Number(e.target.value))}
                            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px] text-amber-400">
                            <span>{legendPercentage}%</span>
                            <span className="font-bold">نسبة الأساطير:</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={10}
                            value={legendPercentage}
                            onChange={(e) => setLegendPercentage(Number(e.target.value))}
                            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>
                      </div>

                      {/* Right Column: Difficulty selection */}
                      <div className="space-y-1 flex flex-col justify-between">
                        {[
                          { id: "normal", label: "مدرب ناشئ", color: "border-emerald-500 text-emerald-400 bg-emerald-950/15" },
                          { id: "tactical", label: "مدرب محترف", color: "border-amber-500 text-amber-400 bg-amber-950/15" },
                          { id: "legend", label: "جوارديولا (ذكي)", color: "border-rose-500 text-rose-450 bg-rose-950/15" }
                        ].map((lvl) => {
                          const isSelected = difficulty === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => { SoundEffects.playCardDraw(); setDifficulty(lvl.id as any); }}
                              className={`w-full p-1 px-2.5 rounded-lg border text-right font-extrabold text-[9.5px] cursor-pointer transition-all ${
                                isSelected ? lvl.color : "border-white/5 bg-transparent text-slate-500 hover:text-white"
                              }`}
                            >
                              {lvl.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { SoundEffects.playCardDraw(); setPlayStep("packages"); }}
                        className="px-4 py-1 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer"
                      >
                        السابق
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-black font-black text-[10px] rounded-xl flex items-center gap-1 shadow-lg cursor-pointer border-none"
                      >
                        <span>انطلاق المباراة! 🏁⚽</span>
                      </button>
                    </div>
                  </motion.div>
                )}

              </form>
            </motion.div>
          )}

          {/* TAB 3: DECKS GALLERY */}
          {activeTab === "decks" && (
            <motion.div
              key="tab_decks"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full space-y-3"
            >
              <div className="text-right border-b border-white/5 pb-1.5">
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">🎴 مستودع الباقات والتشكيلات</span>
                <h3 className="text-sm font-black text-white">قائمة باقات اللعب المتوفرة بالنظام</h3>
              </div>

              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-right scrollbar-thin scrollbar-thumb-emerald-500/20">
                {dbPackages.length === 0 ? (
                  <div className="p-3 bg-black/35 rounded-xl border border-white/5 text-[9px] text-slate-500 text-center leading-normal">
                    لا يوجد باقات مخصصة حالياً بجدول Supabase. تعمل اللعبة بالباقات والتشكيلات المدمجة محلياً (30 لاعب أسطورة وعادي مع 6 كروت تكتيكية).
                  </div>
                ) : (
                  dbPackages.map((pkg) => (
                    <div key={pkg.id} className="p-2 bg-black/45 border border-white/5 rounded-lg flex items-center justify-between gap-2">
                      <span className="text-[8px] text-slate-500">
                        {pkg.type === "special" ? "باقة تكتيكية خاصة" : "باقة لاعبين"}
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-[10px] block text-emerald-400">{pkg.name} {pkg.image}</span>
                        <span className="text-[8px] text-slate-500 block truncate max-w-[180px]">{pkg.description || "لا يوجد وصف لهذه الباقة"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: RULES BOOK */}
          {activeTab === "rules" && (
            <motion.div
              key="tab_rules"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full space-y-2.5"
            >
              {/* Sub tabs inside rules */}
              <div className="flex border-b border-white/5 bg-black/25 rounded-t-lg overflow-x-auto">
                {[
                  { id: "basics", label: "الأساسيات" },
                  { id: "actions", label: "الحركات" },
                  { id: "attacking", label: "الهجوم" },
                  { id: "specials", label: "التكتيكات" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { SoundEffects.playCardDraw(); setRulesCategory(t.id as any); }}
                    className={`flex-1 py-1.5 text-[9px] font-black text-center border-b-2 cursor-pointer transition-all ${
                      rulesCategory === t.id
                        ? "border-emerald-400 text-emerald-400 bg-white/5"
                        : "border-transparent text-slate-500 hover:text-slate-350"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Scrollable rules text */}
              <div className="max-h-[120px] overflow-y-auto text-right text-[9px] text-slate-300 leading-normal space-y-2 pr-1 scrollbar-thin scrollbar-thumb-emerald-500/20">
                {rulesCategory === "basics" && (
                  <>
                    <h4 className="font-bold text-[10px] text-emerald-400">الهدف والبداية (التسخين):</h4>
                    <p>اللعبة تحدي 1 ضد 1. أول مدرب يسجل <strong className="text-white">5 أهداف (بونت)</strong> هو الفائز.</p>
                    <p>في البداية، يسحب كل مدرب 5 لاعبين ويضعهم أمامه مقلوبين بالملعب. يمنع بدء أي لاعب أسطورة على الملعب في التسخين (يتم إرجاعه للحقيبة في حال ظهوره وسحب كارت بديل).</p>
                  </>
                )}
                {rulesCategory === "actions" && (
                  <>
                    <h4 className="font-bold text-[10px] text-emerald-400">حركات اللعب والدور:</h4>
                    <p>تسحب كارتين في بداية دورك. وتمتلك <strong className="text-white">3 حركات كحد أقصى</strong> في كل دور.</p>
                    <p>الحركات تشمل: تبديل لاعب مكشوف (1 حركة)، تبديل لاعب مقلوب (1 حركة)، إنزال أسطورة (1 حركة + حرق كارتين من يدك)، أو شن هجوم (2 حركة).</p>
                  </>
                )}
                {rulesCategory === "attacking" && (
                  <>
                    <h4 className="font-bold text-[10px] text-emerald-400">قواعد الهجوم والحسم:</h4>
                    <p>يكلف الهجوم حركتين. تختار مهاجماً مقلوباً وتكشف قوته، ثم تسحب كارت معزز الهجمة (بونطو) من +1 إلى +10 عشوائياً لدعم الهجمة.</p>
                    <p>يمتلك الخصم 3 حركات فورية لصد الهجوم بكشف المدافعين أو لعب كروت تكتيكية. نقارن إجمالي قوة الهجوم بالدفاع، وإذا تفوق الهجوم يتم إحراز هدف.</p>
                  </>
                )}
                {rulesCategory === "specials" && (
                  <>
                    <h4 className="font-bold text-[10px] text-emerald-450">الكروت التكتيكية الخاصة:</h4>
                    <p>🚌 ركن الباص: تمنح صد دفاعي قوي بمقدار +6 دفاع.</p>
                    <p>🌧️ عشب مبلل: تقلل قوة هجوم أو دفاع الخصم بـ -4 نقاط.</p>
                    <p>🚩 تسلل مباغت: يلغي نقاط أقوى مهاجم للخصم في الهجمة تماماً.</p>
                    <p>🟥 كارت أحمر: يطرد أي لاعب مكشوف لخصمك نهائياً خارج الملعب.</p>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === "settings" && (
            <motion.div
              key="tab_settings"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full space-y-3.5"
            >
              <div className="text-right border-b border-white/5 pb-1.5">
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">⚙️ إعدادات وخيارات اللعبة</span>
                <h3 className="text-sm font-black text-white">إدارة الصوت ولوحة التحكم</h3>
              </div>

              <div className="space-y-2 text-right">
                {/* Audio Option */}
                <div className="flex items-center justify-between p-2.5 bg-black/35 border border-white/5 rounded-xl">
                  <button
                    onClick={toggleMute}
                    className={`px-4 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer ${
                      isMuted 
                        ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {isMuted ? "الصوت مكتوم 🔇" : "الصوت مفعل 🔊"}
                  </button>
                  <span className="text-xs font-bold text-slate-300">مؤثرات الصوت التكتيكية:</span>
                </div>

                {/* Admin Cabinet link */}
                <div className="flex items-center justify-between p-2.5 bg-black/35 border border-white/5 rounded-xl">
                  <a
                    href="#/admin"
                    className="px-4 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[9.5px] font-bold cursor-pointer transition-colors block text-center"
                  >
                    دخول لوحة التحكم ⚙️
                  </a>
                  <span className="text-xs font-bold text-slate-300">لوحة الإدارة وقواعد البيانات:</span>
                </div>

                {/* Game Info */}
                <div className="text-center text-[8px] text-slate-500 space-y-0.5 pt-1">
                  <div>مرتدة © تحدي التخطيط الكروي الذكي</div>
                  <div>إصدار التحديث التكتيكي v2.1</div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#060807]/95 border-t border-white/5 h-14 w-full px-2 shrink-0 z-30 backdrop-blur-md flex justify-around items-center">
        {[
          { id: "home", label: "الرئيسية", icon: "🏠" },
          { id: "play", label: "اللعب", icon: "⚔️" },
          { id: "decks", label: "الباقات", icon: "🎴" },
          { id: "rules", label: "القوانين", icon: "📜" },
          { id: "settings", label: "الإعدادات", icon: "⚙️" }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                SoundEffects.playCardDraw();
                setActiveTab(tab.id as any);
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-0.5 cursor-pointer relative transition-all ${
                isActive 
                  ? "text-emerald-400 font-black scale-105" 
                  : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[8.5px] tracking-tight leading-none">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-[2.5px] bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
