/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Trophy, Swords, Shield, RefreshCw, Clock, Award, Activity, ScrollText, Users, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { ActionLog } from "../types";

interface MatchRoundRecord {
  roundNumber: number;
  attacker: "player" | "ai";
  attackPower: number;
  defensePower: number;
  pontoValue: number;
  pontoText: string;
  isGoal: boolean;
  attackerName: string;
  defenders: string[];
  scoreAfter: { player: number; ai: number };
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
}: GameOverScreenProps) {
  const isPlayerWinner = playerScore >= aiScore;
  const winnerName = isPlayerWinner ? coachName || "المدرب اللاعب" : aiCoachName;
  
  const totalAttackPower = matchRounds
    .filter((r) => r.attacker === "player")
    .reduce((sum, r) => sum + r.attackPower, 0);

  const totalDefensePower = matchRounds
    .filter((r) => r.attacker === "ai")
    .reduce((sum, r) => sum + r.defensePower, 0);

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
    <div className="min-h-screen bg-linear-to-b from-[#040604] via-[#090f09] to-[#040604] text-white p-4 sm:p-6 md:p-8 flex flex-col justify-between select-none relative overflow-y-auto font-sans">
      {/* Background glow matrix */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 right-10 w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col space-y-6 md:space-y-8 z-10 my-auto">
        
        {/* ================= HERO CELEBRATION BLOCK ================= */}
        <div className="text-center flex flex-col items-center justify-center space-y-3 mt-4">
          <motion.div
            initial={{ scale: 0.3, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
            className="relative"
          >
            {/* Pulsating golden aura behind trophy */}
            <motion.div
              className={`absolute inset-0 rounded-full blur-2xl ${
                isPlayerWinner ? "bg-yellow-500/35" : "bg-rose-500/25"
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
              isPlayerWinner ? "border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.25)]" : "border-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
            } relative z-10`}>
              {isPlayerWinner ? (
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-400 drop-shadow-[0_4px_10px_rgba(234,179,8,0.5)] animate-bounce" style={{ animationDuration: '3s' }} />
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
            <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r ${
              isPlayerWinner ? "from-yellow-300 via-amber-400 to-yellow-200" : "from-rose-400 via-red-500 to-rose-300"
            }`}>
              {isPlayerWinner ? "🏁 صــافــرة النــهــايــة: فــوز تــكــتــيــكــي! 🏆" : "🏁 انتهت المواجهة: هزيمة مشرفة"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              {isPlayerWinner
                ? `تهانينا للكابتن ${winnerName}! لقد أحرزت اللقب بعد تخطيط ذكي وتجاوز تكتلات الخصم.`
                : `حظاً أوفر للكابتن ${coachName}! لقد تفوق الكابتن ${winnerName} في الحسابات التكتيكية هذه المرة.`}
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
              <span className="block text-[10px] text-slate-400 font-bold uppercase">{coachName || "اللاعب"}</span>
              <span className="text-2xl sm:text-4xl font-mono font-black text-emerald-400">{playerScore}</span>
            </div>
            <span className="text-xl sm:text-2xl text-slate-500 font-bold">:</span>
            <div className="text-left">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">الكمبيوتر</span>
              <span className="text-2xl sm:text-4xl font-mono font-black text-rose-400">{aiScore}</span>
            </div>
          </motion.div>
        </div>

        {/* ================= KEY MATCH STATISTICS ================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#121412]/60 border border-white/5 p-3 rounded-2xl flex items-center justify-between flex-row-reverse text-right">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[9.5px] text-slate-400 font-bold">إجمالي الحركات/الأدوار</span>
              <span className="text-lg font-mono font-black text-white">{turnCount} دور</span>
            </div>
          </div>

          <div className="bg-[#121412]/60 border border-white/5 p-3 rounded-2xl flex items-center justify-between flex-row-reverse text-right">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[9.5px] text-slate-400 font-bold">جولات الهجوم المستمر</span>
              <span className="text-lg font-mono font-black text-white">{matchRounds.length} هجمة</span>
            </div>
          </div>

          <div className="bg-[#121412]/60 border border-white/5 p-3 rounded-2xl flex items-center justify-between flex-row-reverse text-right">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[9.5px] text-slate-400 font-bold">مستوى صعوبة اللقاء</span>
              <span className="text-sm sm:text-base font-black text-white">{difficultyArabic}</span>
            </div>
          </div>

          <div className="bg-[#121412]/60 border border-white/5 p-3 rounded-2xl flex items-center justify-between flex-row-reverse text-right">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[9.5px] text-slate-400 font-bold">متوسط الهجوم التكتيكي</span>
              <span className="text-lg font-mono font-black text-white">
                {matchRounds.length > 0
                  ? Math.round(totalAttackPower / Math.max(1, matchRounds.filter(r => r.attacker === "player").length))
                  : 0} نقطة
              </span>
            </div>
          </div>
        </div>

        {/* ================= COMPARATIVE STATS (FIFA STYLE) ================= */}
        <div className="bg-[#0c0d0c]/85 border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col space-y-4 text-right">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 flex-row-reverse">
            <div className="flex items-center gap-1.5 text-white">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-black">المواجهة المباشرة والمقارنة الفنية بين المدربين</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-full uppercase">
              تفوق الاستحواذ والأرقام
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 pt-1">
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


        {/* ================= DETAILED GRAPH / SPLIT SECTION ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* RIGHT: Detailed Rounds History (7 cols) */}
          <div className="lg:col-span-7 bg-[#0c0d0c]/85 border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-col h-[380px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 flex-row-reverse">
              <div className="flex items-center gap-1.5 text-white">
                <ScrollText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs sm:text-sm font-black">سجل جولات اللقاء التكتيكية</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-full">
                {matchRounds.length} هجمة مسجلة
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1" id="gameover_rounds_list">
              {matchRounds.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-650 text-center gap-2">
                  <Activity className="w-8 h-8 opacity-25" />
                  <p className="text-xs">لم تسجل أي جولات حاسمة في هذا اللقاء.</p>
                </div>
              ) : (
                matchRounds.map((round, idx) => (
                  <div
                    key={`match-round-${idx}`}
                    className="p-3 bg-white/3 hover:bg-white/5 border border-white/5 rounded-2xl flex flex-col space-y-2 text-right transition-all"
                  >
                    <div className="flex items-center justify-between flex-row-reverse text-[10px]">
                      <div className="flex items-center gap-1 font-bold text-slate-350">
                        <span>الجولة {round.roundNumber}</span>
                      </div>
                      
                      <div className={`px-2 py-0.2 rounded font-black border uppercase tracking-tight ${
                        round.isGoal 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {round.isGoal ? "⚽ جـــوول" : "🧤 تصدي ناجح"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="flex items-center gap-1.5 flex-row-reverse">
                        <span className="text-xs font-black text-white">{round.attackerName}</span>
                        <span className={`text-[9.5px] px-1 py-0.2 rounded ${
                          round.attacker === "player" ? "bg-emerald-600/15 text-emerald-400" : "bg-rose-600/15 text-rose-400"
                        }`}>
                          {round.attacker === "player" ? "هجومك" : "هجوم الخصم"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 font-mono text-xs font-black text-slate-400">
                        <span className="text-white">{round.attackPower}</span>
                        <span>⚔️</span>
                        <span className="mx-0.5 text-slate-650">مقابل</span>
                        <span className="text-white">{round.defensePower}</span>
                        <span>🛡️</span>
                      </div>
                    </div>

                    {/* Defenders list and ponto detail */}
                    <div className="text-[10px] text-slate-405 leading-normal flex items-start gap-1 justify-end flex-row-reverse">
                      {round.pontoValue > 0 && (
                        <span className="bg-[#0b100b] border border-emerald-500/10 px-1.5 py-0.2 rounded text-[9px] text-emerald-300 whitespace-nowrap">
                          {round.pontoText} (+{round.pontoValue})
                        </span>
                      )}
                      {round.defenders.length > 0 && (
                        <span className="text-slate-450 truncate">
                          المدافعون: {round.defenders.join(" ، ")}
                        </span>
                      )}
                    </div>

                    <div className="border-t border-white/3 pt-1.5 flex justify-between items-center flex-row-reverse text-[9px] text-slate-400 font-mono">
                      <span>النتيجة بعد الهجمة:</span>
                      <span className="font-bold text-emerald-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                        {round.scoreAfter.player} - {round.scoreAfter.ai}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LEFT: Complete Event Timeline (5 cols) */}
          <div className="lg:col-span-5 bg-[#0c0d0c]/85 border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-col h-[380px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 flex-row-reverse">
              <div className="flex items-center gap-1.5 text-white">
                <Activity className="w-4 h-4 text-rose-500" />
                <span className="text-xs sm:text-sm font-black">شريط أحداث اللقاء التكتيكي</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-full">
                {logs.length} حدث
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="gameover_logs_timeline">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-650 text-center gap-2">
                  <ScrollText className="w-8 h-8 opacity-25" />
                  <p className="text-xs">سجل الأحداث فارغ بالكامل.</p>
                </div>
              ) : (
                logs.map((log) => {
                  let badgeColor = "bg-slate-950/45 text-slate-450 border-white/5";
                  if (log.type === "success") badgeColor = "bg-emerald-950/20 text-emerald-300 border-emerald-500/10";
                  if (log.type === "danger") badgeColor = "bg-rose-950/25 text-[#fca5a5] border-rose-500/10";
                  if (log.type === "warning") badgeColor = "bg-amber-950/20 text-amber-300 border-amber-500/10";
                  
                  return (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl border text-right text-xs leading-relaxed flex items-start justify-between gap-3 ${badgeColor}`}
                    >
                      <span className="text-[9px] font-mono text-slate-500 shrink-0 self-start mt-0.5 bg-black/35 px-1 py-0.2 rounded">
                        {log.timestamp}
                      </span>
                      <span className="font-semibold flex-1 leading-normal">{log.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ================= BOTTOM ACTION CALL-TO-ACTIONS ================= */}
        <div className="pt-2 pb-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-12 py-3 bg-linear-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black rounded-2xl transition-all cursor-pointer transform hover:scale-105 active:scale-95 shadow-[0_5px_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-black animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-xs sm:text-sm font-sans tracking-wide">العودة للرئيسية وماتش جديد 🔁</span>
          </button>
        </div>

      </div>
    </div>
  );
}
