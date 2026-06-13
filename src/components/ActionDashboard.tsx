/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Swords, Shield, Zap, Sparkles, AlertTriangle, ArrowLeftCircle, Bot } from "lucide-react";
import { GamePhase, PontoCard } from "../types";

interface ActionDashboardProps {
  phase: GamePhase;
  movesLeft: number;
  playerCoachName: string;
  aiCoachName: string;
  cardsDrawnThisTurn: number;
  currentPonto: PontoCard | null;
  activeAttackerName: string | null;
  attackPower: number;
  defensePower: number;

  onConfirmLineup: () => void;
  onDeclareAttack: () => void;
  onEndTurn: () => void;
  onResolveAttack: () => void;
  onConfirmDefense: () => void;
  onResetGame: () => void;
}

export default function ActionDashboard({
  phase,
  movesLeft,
  playerCoachName,
  aiCoachName,
  cardsDrawnThisTurn,
  currentPonto,
  activeAttackerName,
  attackPower,
  defensePower,
  onConfirmLineup,
  onDeclareAttack,
  onEndTurn,
  onResolveAttack,
  onConfirmDefense,
  onResetGame
}: ActionDashboardProps) {

  // Return background & badge styling based on target phase
  const getPhaseStyles = () => {
    switch (phase) {
      case "warmup":
        return {
          title: "مرحلة تحضير الخطة والتسخين",
          desc: "الآن، تبادلاتك مجانية وبلا حدود! قم بتبديل كروت اللاعبين في يدك مع اللاعبين المتواجدين مقلوبين على رقعة الملعب لتهيئة دكة هجومك ودفاعك السليم قبل إطلاق المباراة.",
          bg: "bg-[#121412] border-white/10 shadow-black/40",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        };
      case "player_turn":
        return {
          title: `دورك التكتيكي يا كابتن ${playerCoachName}`,
          desc: cardsDrawnThisTurn < 2 
            ? "اسحب أولاً كارتين من مجموعات اللاعبين والتكتيك التكتيكية في الأعلى لتنشيط حركاتك الاستثنائية!" 
            : "لديك 3 حركات حرة حاسمة في دورك. يمكنك نقل لاعب ليدك ومبادلته (1 حركة)، تضحية بـ 2 كارت وإنزال الأسطورة (1 حركة)، أو شن هجوم تكتيكي على مرمى الخصم (2 حركات).",
          bg: "bg-[#121412] border-white/10 shadow-black/30",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        };
      case "ai_turn":
        return {
          title: `تفكير الخصم - المدرب ${aiCoachName}`,
          desc: "الخصم يحلل أوراقك المخفية الآن وينظم تبديلاته العميقة لمحاصرة حراسك... استعد دفاعياً!",
          bg: "bg-black/30 border-white/5 shadow-black/45",
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold"
        };
      case "attacking":
        return {
          title: "مرحلة الهجوم والتسديد 활",
          desc: `لقد حددت المهاجم [ ${activeAttackerName || "صاحب التسديدة" } ] للتقدم، وسحبت كارت البونطو المنشط لتعزيز تسديدتك! هل تود استغلال آخر حركة لك لكشف لاعب مكشوف آخر أو إطلاق التسديدة مباشرة للمرمى؟`,
          bg: "bg-[#121412] border-teal-500/20 shadow-black/30",
          badge: "bg-teal-500/20 text-teal-300 border-teal-500/40"
        };
      case "ai_attacking":
        return {
          title: "⚠️ إنذار بالخطر! الخصم يشن هجوماً عليك",
          desc: `المدرب العبقري ${aiCoachName} يعلن الهجوم بطلقة نارية! لديك 3 حركات دفاعية حرة فورية لكشف حراس المرمى والمدافعين من ملعبك أو لعب كروت خاصة لإفشال تسديداته وتقليص قواها!`,
          bg: "bg-black/40 border-rose-500/20 shadow-black/45 animate-pulse",
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/30"
        };
      case "resolution":
        return {
          title: "محاكمة الهجمة واحتساب النقاط",
          desc: "يقوم الحكم الآن بجمع إجمالي نقاط المهاجم والمدرب مع البونطو مقارنة بقدرة الصد التكتيكية لخطوط الدفاع المتأهبة.",
          bg: "bg-[#121412] border-white/5 shadow-black/30",
          badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
        };
      default:
        return {
          title: "انتهت المقابلة!",
          desc: "تم تصفير صافرة النهاية للمباراة التكتيكية الشيقة لبونطو. يمكنك الاستبيان من إحصائيات اللعب وإعادة خوض البطولة مجدداً.",
          bg: "bg-[#121412] border-white/10",
          badge: "bg-amber-500/10 text-amber-400"
        };
    }
  };

  const currentStyle = getPhaseStyles();

  return (
    <div className={`rounded-xl border p-5 flex flex-col md:flex-row items-center justify-between gap-5 transition-all shadow-xl ${currentStyle.bg}`}>
      
      {/* 1. Description and Info text */}
      <div className="text-right flex-1 space-y-2">
        <div className="flex items-center justify-end gap-2.5">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold border ${currentStyle.badge}`}>
            {currentStyle.title}
          </span>
          {phase === "player_turn" && cardsDrawnThisTurn >= 2 && (
            <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
              <span>{movesLeft} / 3</span>
              <span className="font-sans">الحركات المتبقية</span>
            </div>
          )}
        </div>
        <p className="text-[#e0e0e0]/70 text-xs md:text-sm leading-relaxed font-light">
          {currentStyle.desc}
        </p>

        {/* Live Attack score metrics during resolution or active attack */}
        {(phase === "attacking" || phase === "ai_attacking" || phase === "resolution") && (
          <div className="flex items-center justify-end gap-4 mt-3 bg-black/45 p-2.5 rounded-xl border border-white/5 font-mono text-xs md:text-sm">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="font-bold text-base">{defensePower}</span>
              <span className="text-[10px] font-sans">إجمالي الدفاع</span>
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            
            <span className="text-[#e0e0e0]/20">◀ VS ▶</span>
            
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="font-bold text-base">{attackPower}</span>
              <span className="text-[10px] font-sans">إجمالي الهجوم</span>
              <Swords className="w-4 h-4 text-rose-500" />
            </div>
            
            {currentPonto && (
              <div className="border-r border-white/5 pr-3 mr-1 flex items-center gap-1 text-amber-400 text-[11px] font-sans">
                <span>كارت البونطو: ({currentPonto.text} +{currentPonto.value})</span>
                <span>🔥</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Action Buttons Column */}
      <div className="flex flex-wrap items-center justify-center gap-3 md:flex-shrink-0 min-w-[180px]">
        {phase === "warmup" && (
          <button
            onClick={onConfirmLineup}
            id="confirm_warmup_lineup_button"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-extrabold text-xs md:text-sm shadow-md cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 border-none"
          >
            <Sparkles className="w-4 h-4" />
            <span>تأكيد الخطة والدخول للملعب</span>
          </button>
        )}

        {phase === "player_turn" && (
          <>
            {/* Attack Button */}
            <button
              onClick={onDeclareAttack}
              id="declare_tactical_attack_button"
              disabled={movesLeft < 2 || cardsDrawnThisTurn < 2}
              className="px-5 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white rounded font-extrabold text-xs md:text-sm shadow-md cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border-none"
            >
              <Swords className="w-4 h-4" />
              <span>إعلان هجوم تكتيكي ⚔️</span>
            </button>
            
            {/* End turn button */}
            <button
              onClick={onEndTurn}
              id="end_player_turn_button"
              disabled={cardsDrawnThisTurn < 2}
              className="px-5 py-3 bg-transparent hover:bg-white/5 text-slate-300 rounded font-bold text-xs md:text-sm border border-white/10 transition-colors shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>إنهاء دور المدرب 🏁</span>
            </button>
          </>
        )}

        {phase === "attacking" && (
          <button
            onClick={onResolveAttack}
            id="trigger_shooting_resolution_button"
            className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded text-xs md:text-sm flex items-center gap-1.5 shadow-lg border-none cursor-pointer animate-bounce"
          >
            <span>أطلق تسديدة الهدف ⚽!</span>
          </button>
        )}

        {phase === "ai_attacking" && (
          <button
            onClick={onConfirmDefense}
            id="confirm_defensive_setup_button"
            className="px-6 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded text-xs md:text-sm flex items-center gap-1.5 border-none cursor-pointer animate-pulse"
          >
            <Shield className="w-4 h-4" />
            <span>تأكيد خطة قطع الكرة 🛡️</span>
          </button>
        )}

        {phase === "ai_turn" && (
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold bg-rose-500/5 px-4 py-2.5 rounded border border-white/5 animate-pulse">
            <Bot className="w-4 h-4" />
            <span>المدرب المنافس يقوم بحركات لعبه...</span>
          </div>
        )}

        {phase === "game_over" && (
          <button
            onClick={onResetGame}
            id="restart_game_main_button"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-sm transition-colors cursor-pointer border-none shadow-md"
          >
            خوض مقابلة جديدة للبطولة!
          </button>
        )}
      </div>

    </div>
  );
}
