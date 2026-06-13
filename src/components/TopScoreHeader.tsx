/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Trophy, ShieldAlert, Swords } from "lucide-react";

interface TopScoreHeaderProps {
  playerCoachName: string;
  playerTeam: string;
  playerScore: number;
  aiCoachName: string;
  aiTeam: string;
  aiScore: number;
  matchTime: number; // in seconds
  initialMatchTime: number; // in seconds
  phase: string;
  difficulty: string;
}

// Map team vibes to flags/emojis
const TEAM_EMOJIS: Record<string, string> = {
  "الفراعنة": "🇪🇬",
  "أسود الأطلس": "🇲🇦",
  "نجوم السامبا": "🇧🇷",
  "راقصو التانغو": "🇦🇷",
  "كتائب الأخضر": "🇸🇦",
  "الملكي": "👑"
};

const DIFFICULTY_LABELS: Record<string, string> = {
  "normal": "مدرب مبدئ ⭐️",
  "tactical": "تكتيك محترف 🔥",
  "legend": "أيقونة غوارديولا 🏆"
};

export default function TopScoreHeader({
  playerCoachName,
  playerTeam,
  playerScore,
  aiCoachName,
  aiTeam,
  aiScore,
  matchTime,
  initialMatchTime,
  phase,
  difficulty
}: TopScoreHeaderProps) {

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getTeamEmoji = (team: string) => TEAM_EMOJIS[team] || "⚽";

  // Calculate percentage of time elapsed
  const percentElapsed = ((initialMatchTime - matchTime) / initialMatchTime) * 100;

  return (
    <div className="w-full bg-[#121412]/90 border border-[#10b981]/20 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-md relative overflow-hidden" id="broadcasting_top_scoreboard">
      {/* Decorative turf stripes behind */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-transparent to-emerald-950/20 pointer-events-none" />
      
      {/* Time countdown bar indicator */}
      <div className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-500 transition-all duration-1000" style={{ width: `${100 - percentElapsed}%` }} />

      <div className="grid grid-cols-12 items-center gap-2">
        {/* LEFT COMPARTMENT: Player Coach profile */}
        <div className="col-span-5 md:col-span-4 flex items-center justify-start gap-2.5 text-left md:text-right flex-row-reverse">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center text-xl shadow border border-emerald-400/30">
            {getTeamEmoji(playerTeam)}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] md:text-[10px] text-emerald-400 font-black uppercase tracking-wider font-sans">
              الملعب المحلي : {playerTeam}
            </span>
            <span className="text-xs md:text-sm font-black text-white truncate max-w-[120px] md:max-w-[200px]" title={playerCoachName}>
              {playerCoachName}
            </span>
          </div>
        </div>

        {/* CENTER COMPARTMENT: The Live Score and digital ledger clock */}
        <div className="col-span-7 md:col-span-4 flex flex-col items-center justify-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/5 shadow-inner">
          <div className="flex items-center gap-4">
            {/* Player goals count */}
            <motion.span 
              key={`player-score-${playerScore}`}
              initial={{ scale: 1.4, color: "#10b981" }}
              animate={{ scale: 1, color: "#ffffff" }}
              className="font-mono text-2xl md:text-3xl font-extrabold text-white tracking-widest px-1"
            >
              {playerScore}
            </motion.span>
            
            {/* Divider sign */}
            <span className="text-[#e0e0e0]/30 font-semibold text-xs font-mono uppercase tracking-widest">
              VS
            </span>
            
            {/* AI goals count */}
            <motion.span 
              key={`ai-score-${aiScore}`}
              initial={{ scale: 1.4, color: "#f97316" }}
              animate={{ scale: 1, color: "#ffffff" }}
              className="font-mono text-2xl md:text-3xl font-extrabold text-white tracking-widest px-1"
            >
              {aiScore}
            </motion.span>
          </div>

          {/* Time Digital Box and live ticking */}
          <div className="flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full px-4">
            <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="font-mono text-xs md:text-sm font-black tracking-widest text-[#10b981] drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              {formatTime(matchTime)}
            </span>
          </div>
        </div>

        {/* RIGHT COMPARTMENT: AI Opponent Coach profile */}
        <div className="hidden md:col-span-4 md:flex items-center justify-end gap-2.5 text-right">
          <div className="flex flex-col items-start text-left">
            <span className="text-[9px] md:text-[10px] text-rose-400 font-black tracking-wider uppercase font-sans">
              ⚔️ {DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS["normal"]}
            </span>
            <span className="text-xs md:text-sm font-black text-white truncate max-w-[150px]">
              المدرب {aiCoachName}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-amber-700 flex items-center justify-center text-xl shadow border border-rose-500/30">
            {getTeamEmoji(aiTeam)}
          </div>
        </div>
      </div>
    </div>
  );
}
