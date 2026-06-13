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
  playerScore: number;
  buttonState?: any; // For compatibility
  aiScore: number;

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
  playerScore,
  aiScore,
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
          title: "التسخين وتعديل الخطة ⚙️",
          desc: "تبادلات مجانية! اضغط كروت الملعب للسحب وتجهيز دكة لاعبيك قبل انطلاق صافرة المباراة.",
          bg: "bg-[#101410]/95 border-[#10b981]/20",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        };
      case "player_turn":
        return {
          title: "دورك التكتيكي جاري 🧠",
          desc: cardsDrawnThisTurn < 2 
            ? "اسحب أولاً كارتين من لوحة كونسول المدرب لبدء تخطيط الهجوم!" 
            : "لديك 3 حركات حرة حاسمة في دورك.",
          bg: "bg-[#101410]/95 border-[#10b981]/20",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        };
      case "ai_turn":
        return {
          title: "تفكير الخصم تكتيكياً 🤖",
          desc: "الخصم يحلل أوراقك الآن وينظم تبديلاته العميقة لمحاصرة حراسك... استعد دفاعياً!",
          bg: "bg-[#101010]/95 border-rose-500/10",
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/20"
        };
      case "attacking":
        return {
          title: "مرحلة الهجوم والتسديد ⚽",
          desc: `المهاجم يستعد للتسديد! هل تود إطلاق التسديدة مباشرة للمرمى؟`,
          bg: "bg-[#101410]/95 border-teal-500/20",
          badge: "bg-teal-500/20 text-teal-300 border-teal-500/40"
        };
      case "ai_attacking":
        return {
          title: "⚠️ غزو مرمى كابتن الفريق!",
          desc: "لديك حركات دفاعية حرة كافية لكشف حارسك وإحباط غاراته!",
          bg: "bg-black/95 border-rose-500/20 shadow-rose-950/20",
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/20"
        };
      case "resolution":
        return {
          title: "مراجعة الهجمة تكتيكياً 📊",
          desc: "يقوم الحكم الآن بحساب إجمالي قوى هجوم الخصم والدفاع المتأهب لشن المرتدة.",
          bg: "bg-[#101410]/95 border-indigo-500/20",
          badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
        };
      default:
        return {
          title: "انتهى اللقاء الرسمي! 🏆",
          desc: "تم تصفير صافرة نهاية المباراة التكتيكية الشائقة للعبة مرتدة.",
          bg: "bg-[#101410]/95 border-amber-500/25",
          badge: "bg-amber-500/10 text-amber-400 border-amber-500/20"
        };
    }
  };

  const currentStyle = getPhaseStyles();

  return (
    <div className={`rounded-2xl border p-3 flex flex-col md:flex-row items-center justify-between gap-4 transition-all backdrop-blur-md relative ${currentStyle.bg}`} id="executive_action_belt_dashboard">
      
      {/* LEFT SECTION: Key Indicators and Small Badges */}
      <div className="flex items-center gap-2.5 flex-wrap text-right justify-start w-full md:w-auto">
        <span className={`px-2.5 py-1 rounded-xl text-xs font-black border tracking-wide uppercase ${currentStyle.badge}`}>
          {currentStyle.title}
        </span>
        
        {/* Sizable stats based on user moves */}
        {phase === "player_turn" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-mono font-black">
              <span className="font-extrabold">{movesLeft} / 3</span>
              <span className="font-sans font-medium text-[9px]">حركة حرة</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg font-mono font-black">
              <span>{cardsDrawnThisTurn} / 2</span>
              <span className="font-sans font-medium text-[9px]">سحبات دورك</span>
            </div>
          </div>
        )}

        {/* AI turn stats */}
        {phase === "ai_turn" && (
          <span className="text-[10px] text-rose-400 font-bold bg-rose-500/5 px-2.5 py-1 rounded-lg border border-rose-500/10 animate-pulse">
            المدرب الخصم يقوم بالتبديل والتعديل الفيرتوال... 🤖
          </span>
        )}

        {/* Attack stats banner */}
        {(phase === "attacking" || phase === "ai_attacking" || phase === "resolution") && (
          <div className="flex items-center gap-2 bg-black/45 px-3 py-1 rounded-xl border border-white/5 font-mono text-xs font-bold">
            <div className="flex items-center gap-1 text-rose-400">
              <span>{attackPower}</span>
              <Swords className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-slate-500 text-[10px]">VS</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <span>{defensePower}</span>
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Compact Status Description */}
      <div className="hidden lg:block flex-1 text-right text-[11px] text-slate-400 truncate max-w-[280px]" title={currentStyle.desc}>
        {currentStyle.desc}
      </div>

      {/* RIGHT SECTION: Compact Action Buttons */}
      <div className="flex items-center justify-end gap-2 w-full md:w-auto">
        {phase === "warmup" && (
          <button
            onClick={onConfirmLineup}
            id="confirm_warmup_lineup_button"
            className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl font-black text-xs md:text-sm shadow-md cursor-pointer transform hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-1 border-none"
          >
            <Sparkles className="w-4 h-4 text-white animate-spin" />
            <span>تأكيد خطة وبدء اللقاء الرسمى 🏁</span>
          </button>
        )}

        {phase === "player_turn" && (
          <>
            {/* Attack Button */}
            <button
              onClick={onDeclareAttack}
              id="declare_tactical_attack_button"
              disabled={movesLeft < 2 || cardsDrawnThisTurn < 2}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white rounded-xl font-black text-xs md:text-sm shadow bg-rose-950/20 cursor-pointer hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed border-none"
            >
              <Swords className="w-4 h-4 text-rose-300" />
              <span>شن هجوم تكتيكي مباشر</span>
            </button>
            
            {/* End turn button */}
            <button
              onClick={onEndTurn}
              id="end_player_turn_button"
              disabled={cardsDrawnThisTurn < 1}
              className="px-3.5 py-2.5 bg-[#121412] text-slate-400 hover:text-white rounded-xl font-bold text-xs border border-white/5 hover:border-white/10 transition-colors shadow-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span>إنهاء دور المدرب 🏁</span>
            </button>
          </>
        )}

        {phase === "attacking" && (
          <button
            onClick={onResolveAttack}
            id="trigger_shooting_resolution_button"
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-black rounded-xl text-xs md:text-sm flex items-center justify-center gap-1 shadow-lg border-none cursor-pointer animate-pulse"
          >
            <span>أطلق ركلة التسديدة الحاسمة ⚽!</span>
          </button>
        )}

        {phase === "ai_attacking" && (
          <button
            onClick={onConfirmDefense}
            id="confirm_defensive_setup_button"
            className="px-5 py-2.5 bg-[#152518] hover:bg-[#203a24] text-emerald-400 border border-emerald-500/25 font-black rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
          >
            <Shield className="w-4 h-4 animate-bounce text-emerald-400" />
            <span>تأكيد المدافعين لقطع الهدف 🛡️</span>
          </button>
        )}

        {phase === "ai_turn" && (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold bg-rose-500/5 px-3 py-2 rounded-lg border border-rose-500/10 animate-pulse">
            <span>تكتيكات الخصم جارية...</span>
          </div>
        )}

        {phase === "game_over" && (
          <button
            onClick={onResetGame}
            id="restart_game_main_button"
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white font-black rounded-xl text-xs md:text-sm transition-colors cursor-pointer border-none shadow-md"
          >
            خوض مواجهة كروية جديدة!
          </button>
        )}
      </div>

    </div>
  );
}
