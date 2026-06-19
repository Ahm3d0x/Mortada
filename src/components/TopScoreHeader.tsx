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
const TEAM_EMOJIS: Record<string, React.ReactNode> = {
  "الفراعنة": <img src="https://flagcdn.com/w40/eg.png" className="w-5.5 h-4 object-cover rounded-xs shadow-xs" alt="EG" />,
  "أسود الأطلس": <img src="https://flagcdn.com/w40/ma.png" className="w-5.5 h-4 object-cover rounded-xs shadow-xs" alt="MA" />,
  "نجوم السامبا": <img src="https://flagcdn.com/w40/br.png" className="w-5.5 h-4 object-cover rounded-xs shadow-xs" alt="BR" />,
  "راقصو التانغو": <img src="https://flagcdn.com/w40/ar.png" className="w-5.5 h-4 object-cover rounded-xs shadow-xs" alt="AR" />,
  "كتائب الأخضر": <img src="https://flagcdn.com/w40/sa.png" className="w-5.5 h-4 object-cover rounded-xs shadow-xs" alt="SA" />,
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
    <div className="w-full bg-[#121412]/95 border border-[#10b981]/20 rounded-xl px-4 py-2 shadow-lg backdrop-blur-md relative overflow-hidden" id="broadcasting_top_scoreboard">
      {/* Decorative turf stripes behind */}
      <div className="absolute inset-0 bg-linear-to-r from-emerald-950/10 via-transparent to-emerald-950/10 pointer-events-none" />
      
      {/* Time countdown bar indicator */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-linear-to-r from-teal-500 via-emerald-400 to-amber-500 transition-all duration-1000" style={{ width: `${100 - percentElapsed}%` }} />

      <div className="flex items-center justify-between gap-3 h-8">
        {/* LEFT COMPARTMENT: Player Coach profile */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-linear-to-tr from-emerald-600 to-teal-850 flex items-center justify-center text-sm shadow border border-emerald-400/20">
            {getTeamEmoji(playerTeam)}
          </div>
          <span className="text-[10px] md:text-xs font-black text-emerald-400">
            {playerTeam === "الفراعنة" ? "تكتيكك" : playerTeam}
          </span>
        </div>

        {/* CENTER COMPARTMENT: Compact scoreboard with time */}
        <div className="flex items-center gap-3 bg-black/50 px-3.5 py-1 rounded-lg border border-white/5 shadow-inner select-none">
          {/* Player score */}
          <motion.span 
            key={`player-score-${playerScore}`}
            initial={{ scale: 1.2, color: "#10b981" }}
            animate={{ scale: 1, color: "#ffffff" }}
            className="font-mono text-lg md:text-xl font-black text-white"
          >
            {playerScore}
          </motion.span>
          
          {/* Ticking Timer directly next to result */}
          <div className="flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] md:text-xs font-black text-emerald-400">
              {formatTime(matchTime)}
            </span>
          </div>
          
          {/* AI score */}
          <motion.span 
            key={`ai-score-${aiScore}`}
            initial={{ scale: 1.2, color: "#f97316" }}
            animate={{ scale: 1, color: "#ffffff" }}
            className="font-mono text-lg md:text-xl font-black text-white"
          >
            {aiScore}
          </motion.span>
        </div>

        {/* RIGHT COMPARTMENT: AI Opponent Coach profile */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-xs font-black text-rose-450">
            {aiTeam === "الفراعنة" ? "الخصم" : aiTeam}
          </span>
          <div className="w-7 h-7 rounded-full bg-linear-to-tr from-rose-600 to-amber-850 flex items-center justify-center text-sm shadow border border-rose-500/20">
            {getTeamEmoji(aiTeam)}
          </div>
        </div>
      </div>
    </div>
  );
}
