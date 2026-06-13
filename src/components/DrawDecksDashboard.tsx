/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Layers, HelpCircle, AlertCircle, Zap, ShieldAlert, Swords, HeartHandshake } from "lucide-react";
import { PontoCard } from "../types";

interface DrawDecksDashboardProps {
  phase: string;
  playerDeckCount: number;
  specialDeckCount: number;
  cardsDrawnThisTurn: number;
  playerMovesLeft: number;
  selectedHandCardId: string | null;
  selectedPitchSlotIdx: number | null;
  burningCardCount: number;
  currentPonto: PontoCard | null;

  onDrawCard: (deckType: "player" | "special") => void;
}

export default function DrawDecksDashboard({
  phase,
  playerDeckCount,
  specialDeckCount,
  cardsDrawnThisTurn,
  playerMovesLeft,
  selectedHandCardId,
  selectedPitchSlotIdx,
  burningCardCount,
  currentPonto,
  onDrawCard
}: DrawDecksDashboardProps) {

  const isPlayerTurn = phase === "player_turn" || phase === "warmup";
  const isDrawPhase = isPlayerTurn && phase === "player_turn" && cardsDrawnThisTurn < 2;

  // Build the live instruction message based on the exact gameplay state
  const getCoachGuideline = () => {
    if (phase === "warmup") {
      return {
        title: "تجهيز التكتيك الأولي",
        main: "مرحلة التسخين نشطة! قم بتبديل كروت اللاعبين من يدك (بالأسفل) مع أي مكان فارغ أو مقلوب بالملعب مجاناً لتحديد تشكيلتك المقفلة.",
        action: "💡 انقر على كارت لاعب بيدك أولاً، ثم انقر على المركز الذي تريد وضعه فيه بالملعب. بمجرد الانتهاء، اضغط زر 'تأكيد الخطة والدخول للملعب'."
      };
    }

    if (phase === "player_turn") {
      if (cardsDrawnThisTurn < 2) {
        return {
          title: "عملية سحب الكروت الإلزامية",
          main: `مرحلة بداية الدور! يجب عليك سحب كارتين الآن لتفعيل حركاتك التكتيكية. قمت بسحب (${cardsDrawnThisTurn}/2) كروت حتى الآن.`,
          action: "👉 انقر مباشرة على باقة اللاعبين 🎴 أو باقة التكتيك ⚡ في اليمين لسحب الكارتين الآن!"
        };
      }

      if (selectedHandCardId) {
        return {
          title: "تنزيل الكارت المختار",
          main: "لقد قمت بتحديد كارت من يدك وتقوم الآن بتوجيه الموضع المناسب له على أرضية الملعب.",
          action: "👉 انقر فوق أحد المربعات في صفك بالملعب لتنزيل هذا اللاعب مكانه (يكلف حركة واحدة)."
        };
      }

      if (selectedPitchSlotIdx !== null) {
        return {
          title: "التسديد والاستعداد للهجوم",
          main: "لقد حددت لاعب من ملعبك كقائد للهجوم المباغت على مرمى الخصم.",
          action: "👉 اضغط الآن على زر 'إعلان هجوم تكتيكي ⚔️' في الشريط بالمرتصف لبدء المعركة الكروية!"
        };
      }

      return {
        title: "مرحلة الحركات الحرة",
        main: `لديك حالياً (${playerMovesLeft} حركات) متبقية. يمكنك تنظيم تشكيلة الملعب أو شن غارة هجومية مدمرة.`,
        action: "💪 للتبديل: اضغط لاعب بيدك ثم مركز بالملعب | ⚔️ للهجوم: انقر على لاعب مقلوب بملعبك ثم انقر 'إعلان هجوم تكتيكي' بالمرتصف."
      };
    }

    if (phase === "attacking") {
      return {
        title: "دعم الهجمة والتسديد الحاسم",
        main: "أنت الآن في مرحلة هجومية شرسة! قواك الضاربة ومعزز المرتدة جاهزون لشق شباك الخصم.",
        action: "⚽ اضغط زر 'أطلق تسديدة الهدف ⚽!' بالمنتصف لاحتساب الحكم ومعرفة ما إذا كنت ستحرز هدفاً، أو استخدم حركتك المتبقية لكشف لاعب آخر بالملعب."
      };
    }

    if (phase === "ai_attacking") {
      return {
        title: "دفاع مستميت عاجل",
        main: "الخصم يشن هجوماً حاداً على شباك حامي عرينك بالملعب ولديك 3 حركات صد دفاعية مفاجئة!",
        action: "🛡️ انقر على كروت اللاعبين المقلوبة بملعبك لكشفها فوراً (تصدي ورفع الدفاع ميكانيكياً) أو العب كارت تكتيك دفاعي من يدك لكسر هجمتهم، ثم اضغط 'تأكيد خطة قطع الكرة'."
      };
    }

    if (phase === "ai_turn") {
      return {
        title: "انتظار تكتيك الخصم",
        main: "المدرب المنافس يقوم بسحب كروت وتوجيه التبديلات الصامتة لمحاصرة فريقك.",
        action: "⏳ ترقب قليلاً ريثما ينتهي المدرب المنافس من لعب أوراقه لتبدأ ردود أفعالك."
      };
    }

    if (phase === "resolution") {
      return {
        title: "حسم ودراسة القرار التكتيكي",
        main: "شاشات احتفال الحكم ونقاط الهجوم مقابل الدفاع معروضة الآن.",
        action: "👉 انقر على زر 'متابعة تكتيك اللقاء الكروي' بالنافذة المنبثقة للاستمرار باللعب وتحويل الأدوار."
      };
    }

    return {
      title: "المباراة منتهية",
      main: "صافرة النهاية أغلقت اللوح الإجمالي.",
      action: "🏆 اضغط زر 'خوض مقابلة جديدة للبطولة!' لإعادة التحدي."
    };
  };

  const advice = getCoachGuideline();
  const [showAdvice, setShowAdvice] = React.useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="decks_dashboard_main_container">
      
      {/* LEFT: Live Dynamic Onboarding Coach Guidelines */}
      <div className="md:col-span-2 bg-[#0c0d0c] border border-white/5 rounded-xl p-4 flex flex-col items-stretch gap-2 text-right">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdvice(!showAdvice)}
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs rounded border border-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>{showAdvice ? "إخفاء النصائح ❌" : "مساعد تكتيكي؟ 📋 عرض النصائح الكروية"}</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              توجيهات المدرب المساعد ✨
            </span>
            <h4 className="text-sm font-bold text-white font-serif">{advice.title}</h4>
          </div>
        </div>

        {showAdvice && (
          <div className="pt-2 border-t border-white/5 space-y-2 animate-fadeIn">
            <p className="text-xs text-[#e0e0e0]/70 leading-relaxed">
              {advice.main}
            </p>
            <div className="text-[11px] text-amber-400 font-medium flex items-center justify-end gap-1">
              <span>{advice.action}</span>
              <span>⚡</span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Beautiful Interactive Deck Stacks */}
      <div className="bg-[#121412] border border-white/10 rounded-xl p-4 flex items-center justify-around gap-2 relative overflow-hidden">
        
        {/* PLAYER DECK PACK */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => isDrawPhase && onDrawCard("player")}
            disabled={!isDrawPhase || playerDeckCount === 0}
            className={`relative group w-20 h-28 rounded-lg cursor-pointer transition-all ${
              isDrawPhase
                ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-black animate-pulse"
                : "opacity-80"
            }`}
            id="players_interactive_deck_stack"
            title={isDrawPhase ? "اضغط لسحب كارت لاعب" : "اسحب في دورك فقط"}
          >
            {/* 3D stacked cards look */}
            <div className="absolute top-1 left-1 w-full h-full bg-emerald-950/20 border border-emerald-500/5 rounded-lg pointer-events-none" />
            <div className="absolute top-0.5 left-0.5 w-full h-full bg-emerald-900/30 border border-emerald-500/10 rounded-lg pointer-events-none" />
            <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-emerald-950 to-green-950 border border-emerald-500/30 rounded-lg shadow-lg flex flex-col items-center justify-between p-2 flex-shrink-0">
              
              <div className="w-full flex justify-between items-center text-[7px] text-emerald-400 font-mono">
                <span>DF/ST</span>
                <span>باقة لاعبين</span>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <span className="text-xl">🏃‍♂️</span>
                <span className="text-[8px] text-white/60 font-bold font-serif leading-none mt-1">كروت اللاعبين</span>
              </div>

              <div className="w-full flex items-center justify-center">
                <span className="bg-black/30 text-[9px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded-full">
                  {playerDeckCount} كارت
                </span>
              </div>
            </div>
          </button>
          <span className="text-[10px] text-white/50 block mt-1.5 text-center">باقة اللاعبين</span>
        </div>

        {/* SPECIAL / TACTICS DECK PACK */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => isDrawPhase && onDrawCard("special")}
            disabled={!isDrawPhase || specialDeckCount === 0}
            className={`relative group w-20 h-28 rounded-lg cursor-pointer transition-all ${
              isDrawPhase
                ? "ring-2 ring-teal-400 ring-offset-2 ring-offset-black animate-pulse"
                : "opacity-80"
            }`}
            id="specials_interactive_deck_stack"
            title={isDrawPhase ? "اضغط لسحب كارت تكتيك" : "اسحب في دورك فقط"}
          >
            {/* 3D stacked cards look */}
            <div className="absolute top-1 left-1 w-full h-full bg-teal-950/20 border border-teal-500/5 rounded-lg pointer-events-none" />
            <div className="absolute top-0.5 left-0.5 w-full h-full bg-teal-900/30 border border-teal-500/10 rounded-lg pointer-events-none" />
            <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-teal-950 to-slate-950 border border-teal-500/30 rounded-lg shadow-lg flex flex-col items-center justify-between p-2 flex-shrink-0">
              
              <div className="w-full flex justify-between items-center text-[7px] text-teal-400 font-mono">
                <span>SPC</span>
                <span>باقة خطط</span>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <span className="text-xl">⚡</span>
                <span className="text-[8px] text-teal-200 font-bold font-serif leading-none mt-1">تكتيك خاص</span>
              </div>

              <div className="w-full flex items-center justify-center">
                <span className="bg-black/30 text-[9px] font-mono font-bold text-teal-400 px-1.5 py-0.5 rounded-full">
                  {specialDeckCount} كارت
                </span>
              </div>
            </div>
          </button>
          <span className="text-[10px] text-white/50 block mt-1.5 text-center">باقة التكتيكات</span>
        </div>

      </div>
    </div>
  );
}
