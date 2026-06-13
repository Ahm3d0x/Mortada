/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, Sparkles, Trophy, Users, Zap, Bot } from "lucide-react";
import { SoundEffects } from "../utils/sounds";

interface WelcomeMenuProps {
  onStartGame: (coachName: string, teamVibe: string, difficulty: "normal" | "tactical" | "legend") => void;
}

const TEAM_VIBES = [
  { name: "الفراعنة", color: "from-red-600 to-amber-500", desc: "أداء تكتيكي صلب وعمق هجومي هائل وجرينتا مصرية أصيلة.", emoji: "🇪🇬" },
  { name: "أسود الأطلس", color: "from-emerald-700 to-red-600", desc: "مدرسة مغربية فريدة بدفاع فولاذي وهجمات مرتدة خاطفة.", emoji: "🇲🇦" },
  { name: "نجوم السامبا", color: "from-yellow-400 to-green-600", desc: "لمسات ساحرة ومهارات مراوغة أسطورية تبهج المدرجات.", emoji: "🇧🇷" },
  { name: "راقصو التانغو", color: "from-sky-400 to-slate-200 text-slate-800", desc: "تكتيك ذكي ومراوغات في مساحات ضيقة وروح حاسمة.", emoji: "🇦🇷" },
  { name: "كتائب الأخضر", color: "from-green-600 to-emerald-800", desc: "انسجام عالي وكرات بينية قصيرة تدمر أي دفاع.", emoji: "🇸🇦" },
  { name: "الملكي", color: "from-indigo-600 to-violet-800", desc: "شخصية البطل الخالدة القادرة على حسم المباريات بآخر دقيقة.", emoji: "👑" }
];

export default function WelcomeMenu({ onStartGame }: WelcomeMenuProps) {
  const [coachName, setCoachName] = useState("");
  const [selectedVibe, setSelectedVibe] = useState(TEAM_VIBES[0]);
  const [difficulty, setDifficulty] = useState<"normal" | "tactical" | "legend">("normal");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = coachName.trim() || "الكابتن البطل";
    SoundEffects.playWhistle();
    onStartGame(finalName, selectedVibe.name, difficulty);
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
      <div className="text-center mb-8 relative">
        <div className="absolute inset-0 flex items-center justify-center -top-8 opacity-10">
          <Trophy className="w-48 h-48 text-emerald-500" />
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-3">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>بطولة تكتيك كروت كرة القدم</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 drop-shadow">
          لعبة كروت بونطو
        </h1>
        <p className="mt-3 text-slate-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
          تحدي تكتيكي مثير (1 ضد 1). جهز خطتك السحرية، واكشف أوراق حراسك، واهجم بقوة كروت البونطو في طريقك لتسجيل 5 أهداف وتحقيق اللقب!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <div>
          <label className="block text-[#e0e0e0]/70 font-semibold mb-2 text-right text-xs uppercase tracking-wider">
            اسم المدرب الفني الخاص بك:
          </label>
          <input
            id="input_coach_name"
            type="text"
            placeholder="مثلي: الكابتن جوارديولا، المعلم حسن شحاتة..."
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
            اختر أسلوب وهوية فريقك التكتيكي:
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
                className={`text-right p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  selectedVibe.name === vibe.name
                    ? "border-emerald-500 bg-[#1a1c1a] shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "border-white/5 bg-[#121412] hover:border-white/10"
                }`}
              >
                <div className={`absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r ${vibe.color}`} />
                <div className="flex items-center justify-between mb-1.5 mt-1">
                  <span className="text-xl">{vibe.emoji}</span>
                  <span className="font-serif font-bold text-base text-white group-hover:text-emerald-400 transition-colors">
                    {vibe.name}
                  </span>
                </div>
                <p className="text-[11px] text-[#e0e0e0]/50 leading-relaxed font-light">
                  {vibe.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Tactical Difficulty Panel */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5">
          <label className="block text-[#e0e0e0]/70 text-xs font-semibold mb-3 text-right uppercase tracking-wider">
            مستوى المنافسة التكتيكية للذكاء الاصطناعي:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "normal", label: "مدرب ناشئ", icon: Users, desc: "يسهل كشف خطته والتفوق عليه", color: "border-emerald-500 text-emerald-400" },
              { id: "tactical", label: "مدرب محترف", icon: Shield, desc: "يبدل بذكاء ويهجم بحسابات", color: "border-amber-500 text-amber-400" },
              { id: "legend", label: "جوارديولا خصمك", icon: Bot, desc: "ذكاء دفاعي فولاذي وتوقيت قاتل", color: "border-rose-500 text-rose-400" }
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
                  <p className="hidden md:block text-[9px] text-[#e0e0e0]/40 leading-none">{lvl.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Play Button */}
        <div className="pt-4 flex justify-center">
          <button
            type="submit"
            id="start_match_submit_button"
            className="px-10 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-full font-bold text-lg cursor-pointer transform hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 border-b-4 border-emerald-700 flex items-center gap-3 shadow-lg shadow-emerald-950/60"
          >
            <span>صافرة البداية ودخول الملعب</span>
            <Zap className="w-5 h-5 fill-current" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
