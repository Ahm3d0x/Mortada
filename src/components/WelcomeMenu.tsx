/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, Sparkles, Trophy, Users, Zap, Bot } from "lucide-react";
import { SoundEffects } from "../utils/sounds";

interface WelcomeMenuProps {
  onStartGame: (
    coachName: string,
    teamVibe: string,
    difficulty: "normal" | "tactical" | "legend",
    matchDuration: number,
    legendPercentage: number
  ) => void;
}

const TEAM_VIBES = [
  { name: "الفراعنة", color: "from-red-600 to-amber-500", desc: "أداء تكتيكي صلب", emoji: "🇪🇬" },
  { name: "أسود الأطلس", color: "from-emerald-700 to-red-600", desc: "دفاع فولاذي صلب", emoji: "🇲🇦" },
  { name: "نجوم السامبا", color: "from-yellow-400 to-green-600", desc: "مهارات ممتعة", emoji: "🇧🇷" },
  { name: "راقصو التانغو", color: "from-sky-400 to-slate-200 text-slate-800", desc: "تكتيك وذكاء لافت", emoji: "🇦🇷" },
  { name: "كتائب الأخضر", color: "from-green-600 to-emerald-800", desc: "انسجام وسرعة مميزة", emoji: "🇸🇦" },
  { name: "الملكي", color: "from-indigo-600 to-violet-800", desc: "شخصية البطل العريقة", emoji: "👑" }
];

export default function WelcomeMenu({ onStartGame }: WelcomeMenuProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto my-6 p-6 md:p-8 bg-[#121412] rounded-2xl border border-white/10 shadow-2xl text-[#e0e0e0] backdrop-blur-md relative overflow-hidden"
      id="welcome_menu_container"
    >
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.01)_10px,rgba(255,255,255,0.01)_20px)] pointer-events-none" />
      {/* Title Header */}
      <div className="text-center mb-6 relative">
        <div className="absolute inset-0 flex items-center justify-center -top-8 opacity-10">
          <Trophy className="w-48 h-48 text-emerald-500" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs mb-3">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>تحدي تكتيك كروت اللقاء الكروي</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 drop-shadow">
          مرتدة - لعبة تكتيكية
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <div>
          <label className="block text-[#e0e0e0]/70 font-semibold mb-2 text-right text-xs uppercase tracking-wider">
            اسم المدرب:
          </label>
          <input
            id="input_coach_name"
            type="text"
            placeholder="مثلي: الكابتن جوارديولا..."
            required
            maxLength={25}
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/45 border border-white/5 focus:outline-none focus:border-emerald-500 text-white text-right placeholder:text-[#e0e0e0]/30 transition-all font-medium text-sm shadow-inner"
          />
        </div>

        {/* Team Vibe Selector */}
        <div>
          <label className="block text-[#e0e0e0]/70 font-semibold mb-3 text-right text-xs uppercase tracking-wider">
            اختر هوية الفريق:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {TEAM_VIBES.map((vibe) => (
              <button
                key={vibe.name}
                type="button"
                id={`vibe_btn_${vibe.name}`}
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setSelectedVibe(vibe);
                }}
                className={`text-right p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  selectedVibe.name === vibe.name
                    ? "border-emerald-500 bg-[#1a1c1a] shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "border-white/5 bg-[#121412] hover:border-white/10"
                }`}
              >
                <div className={`absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r ${vibe.color}`} />
                <div className="flex items-center justify-between mb-1 mt-1">
                  <span className="text-lg">{vibe.emoji}</span>
                  <span className="font-serif font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                    {vibe.name}
                  </span>
                </div>
                <p className="text-[10px] text-[#e0e0e0]/50 leading-relaxed">
                  {vibe.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Tactical Difficulty Panel */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5">
          <label className="block text-[#e0e0e0]/70 text-xs font-semibold mb-3 text-right uppercase tracking-wider">
            مستوى المدرب الخصم:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "normal", label: "مدرب ناشئ", icon: Users, desc: "سهل", color: "border-emerald-500 text-emerald-400" },
              { id: "tactical", label: "مدرب محترف", icon: Shield, desc: "تكتيكي", color: "border-amber-500 text-amber-400" },
              { id: "legend", label: "جوارديولا", icon: Bot, desc: "أسطوري", color: "border-rose-500 text-rose-400" }
            ].map((lvl) => {
              const IconComponent = lvl.icon;
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
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                    isSelected
                      ? `${lvl.color} bg-[#1a1c1a] shadow-md scale-[1.01]`
                      : "border-white/5 text-[#e0e0e0]/50 bg-transparent hover:border-white/10"
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="font-semibold text-xs">{lvl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Match Duration Panel */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-[#10b981]/15 border border-[#10b981]/20 px-3 py-1 rounded-lg">
              <span className="text-sm font-black text-emerald-400">
                {Math.floor(matchDuration / 60)} دقيقة
              </span>
            </div>
            <label className="block text-[#e0e0e0]/70 text-xs font-semibold text-right uppercase tracking-wider">
              وقت المباراة:
            </label>
          </div>
          <div className="space-y-4">
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
              className="w-full h-2 bg-black/50 border border-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            {/* Quick Presets row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "5 دقائق", value: 300 },
                { label: "10 دقائق", value: 600 },
                { label: "30 دقيقة", value: 1800 },
                { label: "60 دقيقة", value: 3600 }
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
                    className={`py-1.5 px-1 rounded-lg border text-[10px] text-center font-bold tracking-tight transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-500 bg-[#162a1c] text-emerald-300"
                        : "border-white/5 text-[#e0e0e0]/50 hover:border-white/10"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legendary Cards Appearance Ratio Panel */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/20 px-3 py-1 rounded-lg">
              <span className="text-sm font-black text-amber-400">
                {legendPercentage === 0 ? "مستبعدة (0%)" : `${legendPercentage}%`}
              </span>
            </div>
            <label className="block text-[#e0e0e0]/70 text-xs font-semibold text-right uppercase tracking-wider">
              ظهور اللاعبين الأساطير:
            </label>
          </div>
          <div className="space-y-4">
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
              className="w-full h-2 bg-black/50 border border-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            {/* Quick Presets row */}
            <div className="grid grid-cols-5 gap-1 md:gap-2">
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
                    className={`py-1.5 px-0.5 rounded-lg border text-[9px] md:text-[10px] text-center font-bold tracking-tight transition-all cursor-pointer ${
                      isSelected
                        ? "border-amber-500 bg-[#302213] text-amber-300 font-bold"
                        : "border-white/5 text-[#e0e0e0]/50 hover:border-white/10"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Play Button */}
        <div className="pt-4 flex justify-center">
          <button
            type="submit"
            id="start_match_submit_button"
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-full font-bold text-base cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-b-4 border-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-950/60"
          >
            <span>بدء اللقاء 🏁</span>
            <Zap className="w-5 h-5 fill-current" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
