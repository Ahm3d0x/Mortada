/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Trophy, Swords, Shield, RefreshCw, Clock, Award, Activity, ScrollText, ShieldAlert, Globe } from "lucide-react";
import { ActionLog } from "../types";

interface MatchRoundRecord {
  roundNumber: number;
  attacker: "player" | "ai";
  attackPower: number;
  defensePower: number;
  boosterValue: number;
  boosterText: string;
  isGoal: boolean;
  attackerName: string;
  defenders: string[];
  scoreAfter: { player: number; ai: number };
  activePlayer?: string;
  movesPlayed?: number;
  cardsDrawn?: number;
  pitchSnapshot?: {
    player: ({ name: string; attack: number; defense: number; role: string; isRevealed: boolean; spent: boolean } | null)[];
    ai: ({ name: string; attack: number; defense: number; role: string; isRevealed: boolean; spent: boolean } | null)[];
  };
  handSnapshot?: {
    player: (string | null)[];
    ai: (string | null)[];
  };
  timestamp?: string;
}

interface GameOverScreenProps {
  playerScore: number;
  aiScore: number;
  coachName: string;
  aiCoachName: string;
  difficulty: "normal" | "tactical" | "legend";
  turnCount: number;
  logs: ActionLog[];
  matchRounds: MatchRoundRecord[];
  onRestart: () => void;
  isOnline?: boolean;
}

interface StatCompareRowProps {
  label: string;
  playerVal: number | string;
  aiVal: number | string;
  playerPct: number;
}

function StatCompareRow({ label, playerVal, aiVal, playerPct }: StatCompareRowProps) {
  return (
    <div className="flex flex-col space-y-1.5 text-right w-full">
      <div className="flex justify-between items-center text-xs font-bold">
        <span className="font-mono text-rose-400 text-[10.5px] sm:text-xs">{aiVal}</span>
        <span className="text-slate-300 font-sans text-[10px] sm:text-xs">{label}</span>
        <span className="font-mono text-emerald-400 text-[10.5px] sm:text-xs">{playerVal}</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex flex-row-reverse">
        {/* Player bar (green/teal) */}
        <div 
          className="bg-linear-to-r from-emerald-500 to-teal-400 h-full transition-all duration-700 ease-out" 
          style={{ width: `${playerPct}%` }}
        />
        {/* AI bar (rose/red) */}
        <div 
          className="bg-linear-to-r from-rose-500 to-red-500 h-full transition-all duration-700 ease-out" 
          style={{ width: `${100 - playerPct}%` }}
        />
      </div>
    </div>
  );
}

// Safe formatting of coach name without duplicating titles
const formatNameWithTitle = (name: string, defaultTitle: string = "الكابتن") => {
  const trimmed = name.trim();
  if (trimmed.includes("الكابتن") || trimmed.includes("المدرب")) {
    return trimmed;
  }
  return `${defaultTitle} ${trimmed}`;
};

// Structured log parser for Goal & Block calculation details
const parseDetailedLog = (text: string) => {
  const lines = text.split("\n").map(l => l.trim());
  
  // Stadium line starts with 🏟️
  const stadium = lines.find(l => l.startsWith("🏟️")) || "";
  
  // Title starts with ⚽️ or 🛡️ or 🚫 or 🧤
  const title = lines.find(l => l.startsWith("⚽️") || l.startsWith("🛡️") || l.startsWith("🚫") || l.startsWith("🧤")) || "";
  
  // Status line starts with 👉
  const statusLine = lines.find(l => l.startsWith("👉")) || "";
  const statusText = statusLine.replace("👉", "").trim();
  
  // Find total values
  const attackTotalLine = lines.find(l => l.includes("قوة الهجوم الإجمالية")) || "";
  const defenseTotalLine = lines.find(l => l.includes("قوة الدفاع الإجمالية")) || "";
  
  // Extract numbers from totals
  let attackVal = attackTotalLine.match(/\d+/)?.[0] || "";
  let defenseVal = defenseTotalLine.match(/\d+/)?.[0] || "";

  // Fallback: if totals are not in their standard lines, try to find them in the title line
  if (!attackVal || !defenseVal) {
    const comparisonLine = lines.find(l => l.includes("دفاع الخصم") || l.includes("دفاعك") || l.includes("هجومك") || l.includes("هجوم الخصم")) || "";
    if (comparisonLine) {
      const defMatch = comparisonLine.match(/(?:دفاع الخصم|دفاعك)\s*\(?(\d+)\)?/);
      const attMatch = comparisonLine.match(/(?:هجومك|هجوم الخصم)\s*\(?(\d+)\)?/);
      if (defMatch) {
        defenseVal = defenseVal || defMatch[1];
      }
      if (attMatch) {
        attackVal = attackVal || attMatch[1];
      }
    }
  }

  attackVal = attackVal || "0";
  defenseVal = defenseVal || "0";
  
  // Extract breakdown sections
  let attackBreakdown: string[] = [];
  let defenseBreakdown: string[] = [];
  
  let currentSection: "none" | "attack" | "defense" = "none";
  
  for (const line of lines) {
    if (line.includes("[قوة الهجوم ⚔️]:")) {
      currentSection = "attack";
      continue;
    }
    if (line.includes("[قوة الدفاع 🛡️]:")) {
      currentSection = "defense";
      continue;
    }
    if (line.startsWith("----------------") && currentSection === "defense") {
      currentSection = "none";
      continue;
    }
    
    if (currentSection === "attack") {
      if (line && !line.startsWith("----------------") && !line.includes("[قوة")) {
        attackBreakdown.push(line.replace(/^●\s*/, "").trim());
      }
    } else if (currentSection === "defense") {
      if (line && !line.startsWith("----------------") && !line.includes("[قوة")) {
        defenseBreakdown.push(line.replace(/^●\s*/, "").trim());
      }
    }
  }
  
  const scoreLine = lines.find(l => l.startsWith("🏆") || l.startsWith("🚫") || l.includes("النتيجة")) || "";
  
  // Find atmospheric description
  const description = lines.find(l => 
    l && 
    !l.startsWith("🏟️") && 
    !l.startsWith("⚽️") && 
    !l.startsWith("🛡️") && 
    !l.startsWith("👉") && 
    !l.startsWith("---") && 
    !l.includes("الإجمالية") && 
    !l.includes("تفاصيل") && 
    !l.includes("[قوة") && 
    !l.startsWith("●") && 
    !l.startsWith("🏆") && 
    !l.startsWith("🚫")
  ) || "";

  return {
    stadium,
    title,
    description,
    statusText,
    attackVal,
    defenseVal,
    attackBreakdown,
    defenseBreakdown,
    scoreText: scoreLine.replace(/🏆|🚫/, "").trim()
  };
};

const renderDetailedLog = (log: ActionLog) => {
  const parsed = parseDetailedLog(log.text);
  const isGoal = log.text.includes("⚽️") || log.text.includes("جــوووول");
  
  return (
    <div 
      key={log.id} 
      className="bg-black/60 border border-white/10 rounded-lg p-1.5 flex flex-col gap-1.5 text-right text-[8.5px] font-sans text-slate-200 shadow-inner"
      dir="rtl"
    >
      {/* Stadium Info */}
      {parsed.stadium && (
        <div className="flex items-center justify-end text-[7.5px] text-slate-400 border-b border-white/5 pb-0.5">
          <span className="text-teal-400 font-bold">{parsed.stadium}</span>
        </div>
      )}

      {/* Commentary Title & Description */}
      <div className="flex flex-col gap-0.5">
        {parsed.title && <div className="font-extrabold text-white text-[9.5px]">{parsed.title}</div>}
        {parsed.description && <div className="text-slate-400 italic font-medium text-[8px]">{parsed.description}</div>}
      </div>

      {/* Status banner */}
      {parsed.statusText && (
        <div className={`p-1 rounded text-[9px] font-bold leading-normal ${
          isGoal ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/20" : "bg-blue-950/50 text-blue-300 border border-blue-500/20"
        }`}>
          👉 {parsed.statusText}
        </div>
      )}

      {/* Versus Comparison Bar */}
      <div className="grid grid-cols-2 gap-1 bg-black/35 p-0.5 rounded border border-white/5 text-[8px] font-bold text-center">
        <div className="flex items-center justify-center gap-1 border-l border-white/5">
          <span className="text-red-400">⚔️ الهجوم:</span>
          <span className="font-mono text-[9px] text-white bg-red-950 px-1 rounded font-black">{parsed.attackVal}</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-blue-400">🛡️ الدفاع:</span>
          <span className="font-mono text-[9px] text-white bg-blue-950 px-1 rounded font-black">{parsed.defenseVal}</span>
        </div>
      </div>

      {/* Technical Breakdown */}
      <div className="flex flex-col gap-1 border-t border-white/5 pt-1">
        {/* Attack detail */}
        {parsed.attackBreakdown.length > 0 && (
          <div className="flex flex-col gap-0.5 bg-red-950/10 p-1 rounded border border-red-500/10">
            <span className="text-[8px] text-red-300 font-bold mb-0.5 border-b border-red-500/10 pb-0.5 text-right">⚔️ تفاصيل الهجوم:</span>
            {parsed.attackBreakdown.map((line, i) => {
              const clean = line.replace(/^[●\s\-]+/, "").trim();
              if (!clean) return null;
              const isPlayer = /^[a-zA-Z].*?\(\d+\)/.test(clean);
              if (isPlayer) {
                const name = clean.replace(/\(\d+\)/, "").trim();
                const score = clean.match(/\(\d+\)/)?.[0].replace(/[()]/g, "") || "0";
                return (
                  <div key={i} className="flex items-center justify-between text-[8px]" dir="ltr">
                    <span className="text-slate-350 font-medium">{name}</span>
                    <span className="font-mono text-[8px] text-red-400 bg-red-950/50 px-1 rounded font-black">+{score}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="text-right text-[8px] text-amber-200/90 leading-normal" dir="rtl">
                  {clean}
                </div>
              );
            })}
          </div>
        )}

        {/* Defense detail */}
        {parsed.defenseBreakdown.length > 0 && (
          <div className="flex flex-col gap-0.5 bg-blue-950/10 p-1 rounded border border-blue-500/10">
            <span className="text-[8px] text-blue-300 font-bold mb-0.5 border-b border-blue-500/10 pb-0.5 text-right">🛡️ تفاصيل الدفاع:</span>
            {parsed.defenseBreakdown.map((line, i) => {
              const clean = line.replace(/^[●\s\-]+/, "").trim();
              if (!clean) return null;
              const isPlayer = /^[a-zA-Z].*?\(\d+\)/.test(clean);
              if (isPlayer) {
                const name = clean.replace(/\(\d+\)/, "").trim();
                const score = clean.match(/\(\d+\)/)?.[0].replace(/[()]/g, "") || "0";
                return (
                  <div key={i} className="flex items-center justify-between text-[8px]" dir="ltr">
                    <span className="text-slate-350 font-medium">{name}</span>
                    <span className="font-mono text-[8px] text-blue-400 bg-blue-950/50 px-1 rounded font-black">+{score}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="text-right text-[8px] text-amber-200/90 leading-normal" dir="rtl">
                  {clean}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Outcome Score Banner */}
      {parsed.scoreText && (
        <div className="bg-amber-950/35 border border-amber-500/20 rounded p-0.5 text-center font-black text-amber-300 text-[8.5px]">
          🏆 {parsed.scoreText}
        </div>
      )}
    </div>
  );
};

const groupLogsByTurns = (logsList: ActionLog[], isOnline?: boolean, opponentName?: string) => {
  const groups: { title: string; type: "player" | "ai" | "system"; logs: ActionLog[] }[] = [];
  let currentGroup: { title: string; type: "player" | "ai" | "system"; logs: ActionLog[] } | null = null;

  logsList.forEach((log) => {
    const text = log.text;
    
    // Check if this log marks a turn transition
    const isPlayerTurnStart = text.includes("عدنا لدورك") || text.includes("متابعة دور الماتش");
    const isAiTurnStart = text.includes("ينتقل دور التوجيه واللعب للخصم");
    const isWarmupOrKickoff = text.includes("صافرة ركلة البداية") || text.includes("مرحلة التسخين");

    if (isPlayerTurnStart) {
      const turnMatch = text.match(/الدور\s*(\d+)/);
      const title = turnMatch ? `الدور التكتيكي الخاص بك (الدور ${turnMatch[1]})` : "دورتك التكتيكية الجديدة";
      currentGroup = { title, type: "player", logs: [log] };
      groups.push(currentGroup);
    } else if (isAiTurnStart) {
      const displayOpponentName = opponentName ? formatNameWithTitle(opponentName, "الكابتن") : "الخصم";
      const title = isOnline ? `دور المنافس (${displayOpponentName})` : "دور المدرب الغريم (تكتيك روبوت)";
      currentGroup = { title, type: "ai", logs: [log] };
      groups.push(currentGroup);
    } else if (isWarmupOrKickoff) {
      currentGroup = { title: "بداية اللقاء والتسخين", type: "system", logs: [log] };
      groups.push(currentGroup);
    } else {
      if (!currentGroup) {
        currentGroup = { title: "بداية اللعب", type: "system", logs: [] };
        groups.push(currentGroup);
      }
      currentGroup.logs.push(log);
    }
  });

  return groups;
};

export default function GameOverScreen({
  playerScore,
  aiScore,
  coachName,
  aiCoachName,
  difficulty,
  turnCount,
  logs,
  matchRounds,
  onRestart,
  isOnline = false,
}: GameOverScreenProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "stats" | "history">("summary");
  const [activeHistoryTab, setActiveHistoryTab] = useState<"rounds" | "logs">("rounds");
  const [expandedRoundIdx, setExpandedRoundIdx] = useState<number | null>(null);

  const isDraw = playerScore === aiScore;
  const isPlayerWinner = playerScore > aiScore;
  const winnerName = isPlayerWinner 
    ? formatNameWithTitle(coachName || "المدرب اللاعب", "الكابتن") 
    : formatNameWithTitle(aiCoachName, isOnline ? "الكابتن" : "المدرب");
  
  const totalAttackPower = matchRounds
    .filter((r) => r.attacker === "player")
    .reduce((sum, r) => sum + r.attackPower, 0);

  const difficultyArabic = {
    normal: "ناشئ",
    tactical: "محترف",
    legend: "أسطورة",
  }[difficulty] || difficulty;

  // Player statistics calculations
  const playerAttacks = matchRounds.filter((r) => r.attacker === "player");
  const playerGoals = playerScore;
  const playerSaves = matchRounds.filter((r) => r.attacker === "ai" && !r.isGoal).length;
  const playerMaxAttack = Math.max(...playerAttacks.map((r) => r.attackPower), 0);
  const playerTotalAttackPower = playerAttacks.reduce((sum, r) => sum + r.attackPower, 0);

  // AI statistics calculations
  const aiAttacks = matchRounds.filter((r) => r.attacker === "ai");
  const aiGoals = aiScore;
  const aiSaves = matchRounds.filter((r) => r.attacker === "player" && !r.isGoal).length;
  const aiMaxAttack = Math.max(...aiAttacks.map((r) => r.attackPower), 0);
  const aiTotalAttackPower = aiAttacks.reduce((sum, r) => sum + r.attackPower, 0);

  // Attack power share (offense dominance)
  const totalAttackPowerSum = playerTotalAttackPower + aiTotalAttackPower;
  const playerDominance = totalAttackPowerSum > 0 ? Math.round((playerTotalAttackPower / totalAttackPowerSum) * 100) : 50;

  // Conversion rates (goals scored relative to attacks)
  const playerConversion = playerAttacks.length > 0 ? Math.round((playerGoals / playerAttacks.length) * 100) : 0;
  const aiConversion = aiAttacks.length > 0 ? Math.round((aiGoals / aiAttacks.length) * 100) : 0;

  // Max Attack ratio
  const maxAttackSum = playerMaxAttack + aiMaxAttack;
  const playerMaxAttackPct = maxAttackSum > 0 ? Math.round((playerMaxAttack / maxAttackSum) * 100) : 50;

  // Saves ratio
  const totalSaves = playerSaves + aiSaves;
  const playerSavesPct = totalSaves > 0 ? Math.round((playerSaves / totalSaves) * 100) : 50;

  // Conversion ratio
  const conversionSum = playerConversion + aiConversion;
  const conversionPct = conversionSum > 0 ? Math.round((playerConversion / conversionSum) * 100) : 50;

  return (
    <div className="h-full min-h-full bg-linear-to-b from-[#040604] via-[#090f09] to-[#040604] text-white p-3 sm:p-6 md:p-8 flex flex-col justify-between select-none relative overflow-y-auto font-sans">
      {/* Background glow matrix */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 right-10 w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col z-10 my-auto">
        
        {/* Compact header for other tabs */}
        {activeTab !== "summary" && (
          <div className="max-w-xl mx-auto w-full flex justify-between items-center bg-[#0c0d0c]/80 border border-white/5 backdrop-blur-md rounded-2xl p-2.5 mb-3 px-4 z-10 relative">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                isPlayerWinner 
                  ? "bg-yellow-500/10 text-yellow-400" 
                  : isDraw 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : "bg-rose-500/10 text-rose-500"
              }`}>
                {isPlayerWinner ? (
                  <Trophy className="w-3 h-3 animate-pulse" />
                ) : isDraw ? (
                  <Activity className="w-3 h-3 animate-pulse" />
                ) : (
                  <ShieldAlert className="w-3 h-3 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] font-black text-slate-350">
                {isPlayerWinner 
                  ? "فوز تكتيكي مستحق 🏆" 
                  : isDraw 
                    ? "تعادل تكتيكي مثير 🤝" 
                    : "هزيمة مشرفة 🏁"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-black">
              <span className="text-emerald-400">{playerScore}</span>
              <span className="text-slate-500">:</span>
              <span className="text-rose-400">{aiScore}</span>
            </div>
          </div>
        )}

        {/* Segmented Controller (Tab Bar) */}
        <div className="flex bg-[#0c0d0c]/85 border border-white/5 p-1 rounded-2xl gap-1.5 relative z-10 w-full mb-4 max-w-md mx-auto shrink-0">
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex-1 py-2 text-[10px] sm:text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "summary"
                ? "bg-linear-to-r from-emerald-600 to-teal-500 text-black shadow-md"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>النتيجة والملخص</span>
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 py-2 text-[10px] sm:text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "stats"
                ? "bg-linear-to-r from-emerald-600 to-teal-500 text-black shadow-md"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>المقارنة الفنية</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-[10px] sm:text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "history"
                ? "bg-linear-to-r from-emerald-600 to-teal-500 text-black shadow-md"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>سجل اللقاء</span>
          </button>
        </div>

        {/* Tab views switcher */}
        <div className="flex-1 w-full max-w-4xl mx-auto z-10 flex flex-col justify-start relative mb-4">
          
          {/* TAB 1: RESULT & SUMMARY */}
          {activeTab === "summary" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 w-full"
            >
              {/* ================= HERO CELEBRATION BLOCK ================= */}
              <div className="text-center flex flex-col items-center justify-center space-y-3">
                <motion.div
                  initial={{ scale: 0.3, rotate: -45, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
                  className="relative"
                >
                  <motion.div
                    className={`absolute inset-0 rounded-full blur-2xl ${
                      isPlayerWinner 
                        ? "bg-yellow-500/35" 
                        : isDraw 
                          ? "bg-emerald-500/25" 
                          : "bg-rose-500/25"
                    }`}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0.9, 0.5],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-black/40 border ${
                    isPlayerWinner 
                      ? "border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.25)]" 
                      : isDraw 
                        ? "border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                        : "border-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                  } relative z-10`}>
                    {isPlayerWinner ? (
                      <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-400 drop-shadow-[0_4px_10px_rgba(234,179,8,0.5)] animate-bounce" style={{ animationDuration: '3s' }} />
                    ) : isDraw ? (
                      <Activity className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 drop-shadow-[0_4px_10px_rgba(16,185,129,0.5)] animate-pulse" />
                    ) : (
                      <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12 text-rose-500 drop-shadow-[0_4px_10px_rgba(239,68,68,0.5)] animate-pulse" />
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-1"
                >
                  <h1 className={`text-xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r ${
                    isPlayerWinner 
                      ? "from-yellow-300 via-amber-400 to-yellow-200" 
                      : isDraw 
                        ? "from-emerald-300 via-teal-400 to-emerald-200" 
                        : "from-rose-400 via-red-500 to-rose-300"
                  }`}>
                    {isPlayerWinner 
                      ? "🏁 صــافــرة النــهــايــة: فــوز تــكــتــيــكــي! 🏆" 
                      : isDraw 
                        ? "🏁 صــافــرة النــهــايــة: تــعــادل تــكــتــيــكــي! 🤝" 
                        : "🏁 انتهت المواجهة: هزيمة مشرفة 🏁"}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
                    {isPlayerWinner
                      ? (isOnline 
                          ? `تهانينا لـ ${winnerName}! لقد حققت الفوز في هذه المواجهة المباشرة بعد أداء تكتيكي رائع.`
                          : `تهانينا لـ ${winnerName}! لقد أحرزت اللقب بعد تخطيط ذكي وتجاوز تكتلات الخصم.`)
                      : isDraw
                        ? (isOnline
                            ? `مباراة قوية ومتكافئة! تقاسم الكابتن ${formatNameWithTitle(coachName, "الكابتن")} والكابتن ${formatNameWithTitle(aiCoachName, "الكابتن")} السيطرة والنتيجة بالتعادل بنتيجة ${playerScore} - ${aiScore}.`
                            : `مباراة قوية ومتكافئة! تقاسم الكابتن ${formatNameWithTitle(coachName, "الكابتن")} والمدرب ${formatNameWithTitle(aiCoachName, "المدرب")} السيطرة والنتيجة بالتعادل بنتيجة ${playerScore} - ${aiScore}.`)
                        : (isOnline
                            ? `حظاً أوفر لـ ${formatNameWithTitle(coachName, "الكابتن")}! لقد تفوق الكابتن ${winnerName} في الحسابات التكتيكية للمباراة وحسم النصر.`
                            : `حظاً أوفر لـ ${formatNameWithTitle(coachName, "الكابتن")}! لقد تفوق ${winnerName} في الحسابات التكتيكية هذه المرة.`)}
                  </p>
                </motion.div>

                {/* Glowing Score Line */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                  className="bg-[#0b0e0b]/90 border border-emerald-500/25 px-8 sm:px-12 py-3 rounded-3xl shadow-[0_10px_30px_rgba(16,185,129,0.12)] flex items-center justify-center gap-6"
                >
                  <div className="text-right">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">{coachName || "اللاعب"}</span>
                    <span className="text-xl sm:text-3xl font-mono font-black text-emerald-400">{playerScore}</span>
                  </div>
                  <span className="text-lg sm:text-xl text-slate-500 font-bold">:</span>
                  <div className="text-left">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">{isOnline ? aiCoachName : "الكمبيوتر"}</span>
                    <span className="text-xl sm:text-3xl font-mono font-black text-rose-400">{aiScore}</span>
                  </div>
                </motion.div>
              </div>

              {/* ================= KEY MATCH STATISTICS ================= */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl mx-auto pt-2">
                <div className="bg-[#121412]/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between flex-row-reverse text-right">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[8px] sm:text-[9px] text-slate-400 font-bold">إجمالي الحركات/الأدوار</span>
                    <span className="text-sm sm:text-base font-mono font-black text-white">{turnCount} دور</span>
                  </div>
                </div>

                <div className="bg-[#121412]/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between flex-row-reverse text-right">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Swords className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[8px] sm:text-[9px] text-slate-400 font-bold">جولات الهجوم المستمر</span>
                    <span className="text-sm sm:text-base font-mono font-black text-white">{matchRounds.length} هجمة</span>
                  </div>
                </div>

                <div className="bg-[#121412]/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between flex-row-reverse text-right">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                    {isOnline ? <Globe className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="block text-[8px] sm:text-[9px] text-slate-400 font-bold">
                      {isOnline ? "نمط المواجهة" : "مستوى صعوبة اللقاء"}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white">
                      {isOnline ? "تحدي أونلاين مباشر 🌐" : difficultyArabic}
                    </span>
                  </div>
                </div>

                <div className="bg-[#121412]/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between flex-row-reverse text-right">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[8px] sm:text-[9px] text-slate-400 font-bold">متوسط الهجوم التكتيكي</span>
                    <span className="text-sm sm:text-base font-mono font-black text-white">
                      {matchRounds.length > 0
                        ? Math.round(totalAttackPower / Math.max(1, matchRounds.filter(r => r.attacker === "player").length))
                        : 0} نقطة
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: TECHNICAL COMPARISON */}
          {activeTab === "stats" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl mx-auto"
            >
              <div className="bg-[#0c0d0c]/85 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col space-y-4 text-right">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 flex-row-reverse">
                  <div className="flex items-center gap-1.5 text-white">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs sm:text-sm font-black">المواجهة المباشرة والمقارنة الفنية بين المدربين</span>
                  </div>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-full uppercase">
                    تفوق الاستحواذ والأرقام
                  </span>
                </div>

                <div className="flex flex-col space-y-4 pt-1">
                  <StatCompareRow
                    label="الضغط الهجومي والاستحواذ (⚔️)"
                    playerVal={`${playerTotalAttackPower} نقطة`}
                    aiVal={`${aiTotalAttackPower} نقطة`}
                    playerPct={playerDominance}
                  />
                  <StatCompareRow
                    label="معدل استغلال الفرص للأهداف (⚽)"
                    playerVal={`${playerConversion}%`}
                    aiVal={`${aiConversion}%`}
                    playerPct={conversionPct}
                  />
                  <StatCompareRow
                    label="التصديات الدفاعية الصلبة (🧤)"
                    playerVal={`${playerSaves} تصدي`}
                    aiVal={`${aiSaves} تصدي`}
                    playerPct={playerSavesPct}
                  />
                  <StatCompareRow
                    label="أقوى تسديدة هجومية محققة (💥)"
                    playerVal={`${playerMaxAttack} قوة`}
                    aiVal={`${aiMaxAttack} قوة`}
                    playerPct={playerMaxAttackPct}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: TIMELINE AND ROUND HISTORY */}
          {activeTab === "history" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl mx-auto flex flex-col"
            >
              <div className="bg-[#0c0d0c]/85 border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col h-[260px] sm:h-[380px]">
                
                {/* Sub-tab selectors inside the history section */}
                <div className="flex justify-end gap-1 mb-3 bg-[#080908] p-1 border border-white/5 rounded-xl shrink-0">
                  <button
                    onClick={() => setActiveHistoryTab("logs")}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                      activeHistoryTab === "logs"
                        ? "bg-rose-500/15 border border-rose-500/20 text-rose-300 animate-fadeIn"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    شريط الأحداث ({logs.length})
                  </button>
                  <button
                    onClick={() => setActiveHistoryTab("rounds")}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                      activeHistoryTab === "rounds"
                        ? "bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 animate-fadeIn"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    الجولات التكتيكية ({matchRounds.length})
                  </button>
                </div>

                {/* Switchable lists with locked scrollbars */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {activeHistoryTab === "rounds" ? (
                    <div className="space-y-2.5 pr-1" id="gameover_rounds_list">
                      {matchRounds.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-2 py-10">
                          <Activity className="w-8 h-8 opacity-25 animate-pulse" />
                          <p className="text-xs">لم تسجل أي جولات حاسمة في هذا اللقاء.</p>
                        </div>
                      ) : (
                        matchRounds.map((round, idx) => (
                          <div
                            key={`match-round-${idx}`}
                            onClick={() => setExpandedRoundIdx(expandedRoundIdx === idx ? null : idx)}
                            className="p-3 bg-white/3 hover:bg-white/5 border border-white/5 rounded-xl flex flex-col space-y-2 text-right transition-all cursor-pointer select-none"
                          >
                            <div className="flex items-center justify-between flex-row-reverse text-[9px]">
                              <div className="flex items-center gap-1.5 font-bold text-slate-350">
                                <span>الجولة {round.roundNumber}</span>
                                <span className="text-[7px] text-slate-400">
                                  {expandedRoundIdx === idx ? "▲" : "▼"}
                                </span>
                              </div>
                              
                              <div className={`px-2 py-0.2 rounded font-black border uppercase tracking-tight ${
                                round.isGoal 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-md"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-md"
                              }`}>
                                {round.isGoal ? "⚽ جـــوول" : "🧤 تصدي ناجح"}
                              </div>
                            </div>

                            <div className="flex items-center justify-between flex-row-reverse">
                              <div className="flex items-center gap-1.5 flex-row-reverse">
                                <span className="text-xs font-black text-white">{round.attackerName}</span>
                                <span className={`text-[8px] px-1 py-0.2 rounded ${
                                  round.attacker === "player" ? "bg-emerald-600/15 text-emerald-400" : "bg-rose-600/15 text-rose-400"
                                }`}>
                                  {round.attacker === "player" ? "هجومك" : "هجوم الخصم"}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1 font-mono text-xs font-black text-slate-400">
                                <span className="text-white">{round.attackPower}</span>
                                <span>⚔️</span>
                                <span className="mx-0.5 text-slate-500">مقابل</span>
                                <span className="text-white">{round.defensePower}</span>
                                <span>🛡️</span>
                              </div>
                            </div>

                            {/* Defenders list and booster detail */}
                            <div className="text-[9px] text-slate-400 leading-normal flex items-start gap-1 justify-end flex-row-reverse">
                              {round.boosterValue > 0 && (
                                <span className="bg-[#0b100b] border border-emerald-500/10 px-1.5 py-0.2 rounded text-[8px] text-emerald-300 whitespace-nowrap">
                                  {round.boosterText} (+{round.boosterValue})
                                </span>
                              )}
                              {round.defenders.length > 0 && (
                                <span className="text-slate-400 truncate">
                                  المدافعون: {round.defenders.join(" ، ")}
                                </span>
                              )}
                            </div>

                            <div className="border-t border-white/3 pt-1.5 flex justify-between items-center flex-row-reverse text-[8px] text-slate-450 font-mono">
                              <span>النتيجة بعد الهجمة:</span>
                              <span className="font-bold text-emerald-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                {round.scoreAfter.player} - {round.scoreAfter.ai}
                              </span>
                            </div>

                            {/* Collapsible details panel */}
                            {expandedRoundIdx === idx && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="border-t border-white/5 pt-2 mt-1 space-y-2 text-[8px] text-slate-300 overflow-hidden"
                                onClick={(e) => e.stopPropagation()} // Prevent clicking details from collapsing card
                              >
                                {/* Turn stats (Moves / Draws) */}
                                <div className="grid grid-cols-2 gap-2 text-center bg-black/20 p-1.5 rounded-lg border border-white/5">
                                  <div className="flex flex-col">
                                    <span className="text-[6.5px] text-slate-400">الحركات الملعوبة</span>
                                    <span className="font-bold text-white font-mono">{round.movesPlayed !== undefined ? `${round.movesPlayed} حركات` : "—"}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[6.5px] text-slate-400">الكروت المسحوبة</span>
                                    <span className="font-bold text-white font-mono">{round.cardsDrawn !== undefined ? `${round.cardsDrawn} كروت` : "—"}</span>
                                  </div>
                                </div>

                                {/* Pitch Snapshot */}
                                {round.pitchSnapshot && (
                                  <div className="flex flex-col space-y-1">
                                    <div className="text-[7.5px] font-bold text-emerald-400 border-b border-white/5 pb-0.5">🟢 حالة الملعب في هذه الجولة:</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {/* Player slots */}
                                      <div className="bg-emerald-950/20 p-1.5 rounded-lg border border-emerald-500/10 flex flex-col space-y-1">
                                        <div className="font-black text-emerald-300 text-[6.5px] text-center border-b border-emerald-500/15 pb-0.5">ملعبك</div>
                                        {round.pitchSnapshot.player && round.pitchSnapshot.player.map((slot, sIdx) => {
                                          if (!slot) return <div key={sIdx} className="text-[6px] text-slate-500 text-center italic">فارغ</div>;
                                          return (
                                            <div key={sIdx} className="flex justify-between items-center text-[6.5px] leading-tight">
                                              <span className={`text-[5.5px] px-0.5 rounded ${slot.spent ? 'bg-rose-900/40 text-rose-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
                                                {slot.spent ? 'مستهلك' : 'نشط'}
                                              </span>
                                              <span className="font-black text-white truncate max-w-[60px]">{slot.name}</span>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* AI slots */}
                                      <div className="bg-rose-950/20 p-1.5 rounded-lg border border-rose-500/10 flex flex-col space-y-1">
                                        <div className="font-black text-rose-300 text-[6.5px] text-center border-b border-rose-500/15 pb-0.5">ملعب الخصم</div>
                                        {round.pitchSnapshot.ai && round.pitchSnapshot.ai.map((slot, sIdx) => {
                                          if (!slot) return <div key={sIdx} className="text-[6px] text-slate-500 text-center italic">فارغ</div>;
                                          return (
                                            <div key={sIdx} className="flex justify-between items-center text-[6.5px] leading-tight">
                                              <span className={`text-[5.5px] px-0.5 rounded ${slot.spent ? 'bg-rose-900/40 text-rose-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
                                                {slot.spent ? 'مستهلك' : 'نشط'}
                                              </span>
                                              <span className="font-black text-white truncate max-w-[60px]">{slot.isRevealed ? slot.name : "لاعب مقلوب"}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Hands Snapshot */}
                                {round.handSnapshot && (
                                  <div className="grid grid-cols-2 gap-2 text-[6.5px] bg-black/10 p-1.5 rounded-lg border border-white/5">
                                    <div className="flex flex-col space-y-0.5">
                                      <span className="text-slate-400 font-bold">كروت يدك:</span>
                                      <div className="text-white font-medium truncate max-w-[120px]">
                                        {round.handSnapshot.player && round.handSnapshot.player.length > 0 
                                          ? round.handSnapshot.player.join("، ") 
                                          : "لا يوجد"}
                                      </div>
                                    </div>
                                    <div className="flex flex-col space-y-0.5 text-left items-start">
                                      <span className="text-slate-400 font-bold self-end">كروت يد الخصم:</span>
                                      <span className="text-white font-bold">{round.handSnapshot.ai ? `${round.handSnapshot.ai.length} كروت` : "—"}</span>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 pr-1" id="gameover_logs_timeline">
                      {logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-2 py-10">
                          <ScrollText className="w-8 h-8 opacity-25 animate-pulse" />
                          <p className="text-xs">سجل الأحداث فارغ بالكامل.</p>
                        </div>
                      ) : (
                        groupLogsByTurns(logs, isOnline, aiCoachName).map((group, groupIdx) => {
                          let borderClass = "border-blue-500/15";
                          let bgClass = "bg-linear-to-b from-blue-950/10 to-black/35";
                          let badgeColor = "bg-blue-500/5 text-blue-400 border-blue-500/15";
                          let badgeText = "مباراة";
                          let titleColor = "text-blue-400";
                          
                          if (group.type === "player") {
                            borderClass = "border-emerald-500/20";
                            bgClass = "bg-linear-to-b from-emerald-950/15 to-black/35";
                            badgeColor = "bg-emerald-500/5 text-emerald-400 border-emerald-500/15";
                            badgeText = "دورك";
                            titleColor = "text-emerald-400";
                          } else if (group.type === "ai") {
                            borderClass = "border-rose-500/15";
                            bgClass = "bg-linear-to-b from-rose-950/10 to-black/35";
                            badgeColor = "bg-rose-500/5 text-rose-400 border-rose-500/15";
                            badgeText = "الخصم";
                            titleColor = "text-rose-400";
                          }
                          
                          const groupTime = group.logs[0]?.timestamp || "";
                          
                          return (
                            <div 
                              key={`gameover-commentary-group-${groupIdx}`} 
                              className={`border ${borderClass} ${bgClass} rounded-xl p-1.5 px-2 flex flex-col gap-1 transition-all mb-2`}
                            >
                              {/* Group Header */}
                              <div className="flex items-center justify-between flex-row-reverse border-b border-white/5 pb-0.5 text-[8px] font-bold">
                                <span className={`${titleColor}`}>{group.title}</span>
                                <div className="flex items-center gap-1 flex-row">
                                  {groupTime && (
                                    <span className="text-slate-450 font-mono text-[7px] bg-white/5 px-1 py-0.2 rounded border border-white/5">
                                      ⏱ {groupTime}
                                    </span>
                                  )}
                                  <span className={`px-1 py-0.2 rounded text-[7px] border font-sans font-black ${badgeColor}`}>
                                    {badgeText}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Group Logs */}
                              <div className="flex flex-col gap-1">
                                {group.logs.map((log) => {
                                  const isDetailed = log.text.includes("تفاصيل الحسبة الفنية:");
                                  if (isDetailed) {
                                    return renderDetailedLog(log);
                                  }
                                  
                                  const isDanger = log.type === "danger";
                                  const isSuccess = log.type === "success";
                                  const isWarning = log.type === "warning";
                                  let colorClass = "text-slate-300";
                                  if (isDanger) colorClass = "text-[#ff6b6b]";
                                  else if (isSuccess) colorClass = "text-[#00ff88] font-semibold";
                                  else if (isWarning) colorClass = "text-amber-400";
                                  
                                  return (
                                    <div key={log.id} className="text-[8.5px] leading-snug border-b border-white/5 last:border-0 pb-0.5 last:pb-0 flex items-start gap-1 justify-end font-sans">
                                      <span className={`${colorClass} flex-1 text-right whitespace-pre-line leading-normal`}>{log.text}</span>
                                      <span className="text-emerald-500/40 shrink-0 self-center text-[7px]">•</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* ================= BOTTOM ACTION CALL-TO-ACTIONS ================= */}
        <div className="pt-2 pb-4 border-t border-white/5 flex items-center justify-center shrink-0 z-10 relative">
          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-12 py-3 bg-linear-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black rounded-2xl transition-all cursor-pointer transform hover:scale-[1.03] active:scale-95 shadow-[0_5px_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-black animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-xs sm:text-sm font-sans tracking-wide">العودة للرئيسية وماتش جديد 🔁</span>
          </button>
        </div>

      </div>
    </div>
  );
}
