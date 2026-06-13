/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sparkles, Trash2, ArrowUpCircle, Flame, Layers } from "lucide-react";
import GameCard from "./GameCard";
import { Card, PlayerCard, SpecialCard } from "../types";
import { SoundEffects } from "../utils/sounds";

interface CoachHandProps {
  hand: Card[];
  selectedCardId: string | null;
  burningCardIds: string[];
  movesLeft: number;
  phase: string;
  playerDeckCount: number;
  specialDeckCount: number;
  cardsDrawnThisTurn: number; // Max 2 can be drawn per turn
  isPlayerTurn: boolean;

  onSelectCard: (id: string) => void;
  onDrawCard: (deckType: "player" | "special") => void;
  onPlaySpecialCard: (id: string) => void;
  onCancelSelection: () => void;
}

export default function CoachHand({
  hand,
  selectedCardId,
  burningCardIds,
  movesLeft,
  phase,
  playerDeckCount,
  specialDeckCount,
  cardsDrawnThisTurn,
  isPlayerTurn,
  onSelectCard,
  onDrawCard,
  onPlaySpecialCard,
  onCancelSelection
}: CoachHandProps) {
  const [isHandExpanded, setIsHandExpanded] = React.useState(true);

  // Determine if drawing phase is active
  const isDrawPhase = isPlayerTurn && (phase === "player_turn" || phase === "warmup") && cardsDrawnThisTurn < 2;

  const selectedCard = hand.find((c) => c.id === selectedCardId);
  const isLegendSelected = selectedCard?.type === "player" && (selectedCard as PlayerCard).isLegend;

  // Render descriptive alerts based on the selected card type
  const renderSelectionAlert = () => {
    if (!selectedCardId || !selectedCard) return null;

    if (selectedCard.type === "player") {
      const p = selectedCard as PlayerCard;
      if (p.isLegend) {
        const remainingBurn = 2 - burningCardIds.length;
        return (
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-right text-xs text-amber-300 flex items-center justify-between gap-3 animate-fadeIn">
            <button
              onClick={onCancelSelection}
              className="px-2.5 py-1 rounded bg-black/45 border border-white/5 text-xs text-white/50 hover:text-white hover:bg-[#1a1c1a] transition-colors"
            >
              إلغاء
            </button>
            <div className="flex-1">
              <span className="font-bold font-serif flex items-center justify-end gap-1 text-sm text-amber-400">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>تحضير نزول الأسطورة {p.name}!</span>
              </span>
              <p className="text-[#e0e0e0]/60 mt-0.5">
                {remainingBurn > 0 
                  ? `قانون اللعبة يتطلب "حرق" كارتين من يدك أولاً. اختر ${remainingBurn} كارت آخر للحرق من يدك.` 
                  : "تم حرق كارتين بنجاح! الآن اضغط على أي مركز بالملعب لتنزيل الأسطورة مكانه."}
              </p>
            </div>
          </div>
        );
      } else {
        return (
          <div className="bg-[#1a1c1a] border border-white/5 rounded-xl p-3 text-right text-xs text-[#e0e0e0]/80 flex items-center justify-between gap-3 animate-fadeIn">
            <button
              onClick={onCancelSelection}
              className="px-2.5 py-1 rounded bg-black/45 border border-white/5 text-xs text-white/50 hover:text-white"
            >
              إلغاء التحديد
            </button>
            <p className="flex-1 text-[#e0e0e0]/70">
              لقد حددت اللاعب <strong className="text-emerald-400">{p.name}</strong>. اضغط الآن على مركز بالملعب في صفك لتنزيله بدلاً من اللاعب المتواجد فيه (يكلف 1 حركة).
            </p>
          </div>
        );
      }
    } else {
      const spec = selectedCard as SpecialCard;
      return (
        <div className="bg-teal-950/20 border border-teal-500/20 rounded-xl p-3 text-right text-xs text-teal-300 flex items-center justify-between gap-3 animate-fadeIn">
          <button
            onClick={() => onPlaySpecialCard(spec.id)}
            disabled={movesLeft === 0 && phase !== "ai_attacking"}
            className="px-4 py-1.5 rounded bg-teal-600 text-white font-bold hover:bg-teal-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            تفعيل التكتيك الخاص
          </button>
          <div className="flex-1">
            <span className="font-bold text-sm text-teal-400 font-serif">{spec.name}</span>
            <p className="text-[#e0e0e0]/55 text-[10px] mt-0.5">{spec.description}</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="bg-[#121412] border border-white/10 rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
      {/* Hand Banner Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4 mb-4 gap-4">
        {/* Draw Buttons stack */}
        {isDrawPhase && phase !== "warmup" ? (
          <div className="flex items-center gap-2">
            {/* Draw Special card */}
            <button
              onClick={() => onDrawCard("special")}
              disabled={specialDeckCount === 0}
              id="draw_special_card_button"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-55"
            >
              <span>سحب تكتيك خاص</span>
              <span className="bg-black/20 px-1 py-0.5 rounded text-[10px]">({specialDeckCount})</span>
            </button>
            {/* Draw Player card */}
            <button
              onClick={() => onDrawCard("player")}
              disabled={playerDeckCount === 0}
              id="draw_player_card_button"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-55"
            >
              <span>سحب كارت لاعب</span>
              <span className="bg-black/20 px-1 py-0.5 rounded text-[10px]">({playerDeckCount})</span>
            </button>
            <span className="text-amber-400 text-xs font-bold animate-pulse text-right">
              ← اسحب {2 - cardsDrawnThisTurn} كروت لبدء اللعب!
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[#e0e0e0]/45">
            <span className="text-xs font-mono">باقات الملعب</span>
            <span className="text-xs px-2.5 py-0.5 bg-[#1a1c1a] rounded-full border border-white/5 text-[#e0e0e0]/60">
              لاعبين ({playerDeckCount}) | تكتيك ({specialDeckCount})
            </span>
          </div>
        )}

        <div className="text-right flex items-center gap-3">
          <button
            onClick={() => setIsHandExpanded(!isHandExpanded)}
            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 font-bold text-xs rounded border border-emerald-500/30 transition-all cursor-pointer"
          >
            {isHandExpanded ? "إغلاق أوراق اليد 👁️" : "عرض كروت اليد 👝"}
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs md:text-sm font-semibold text-white">حقيبة كروت المدرب اليدوية</span>
              <Layers className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[10px] text-[#e0e0e0]/30 leading-none mt-1">
              تضم كروت الحرس الخاص والتكتيك المخطط لتنفيذ حركات اللعب ({hand.length} كروت)
            </p>
          </div>
        </div>
      </div>

      {isHandExpanded && (
        <>
          {/* Selected Action warning Alert placeholder */}
          {selectedCardId && (
            <div className="mb-4">
              {renderSelectionAlert()}
            </div>
          )}

          {/* Actual Hand Cards Grid Scrollable representation */}
          <div className="flex items-center gap-4 overflow-x-auto py-3 px-1 scroll-smooth min-h-[220px]" id="hands_grid_flow">
            {hand.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center p-8 text-center text-white/40 gap-2 border border-white/5 bg-black/25 rounded-xl">
                <span className="text-2xl">👝</span>
                <p className="text-xs leading-none">حقيبتك المخصصة فارغة حالياً. اسحب كروت في بداية دورك!</p>
              </div>
            ) : (
              hand.map((card) => {
                const isSelected = selectedCardId === card.id;
                const isBurning = burningCardIds.includes(card.id);
                
                return (
                  <div key={card.id} className="relative flex-shrink-0 font-sans">
                    <GameCard
                       card={card}
                       isRevealed={true}
                       size="md"
                       isSelected={isSelected}
                       isBurning={isBurning}
                       onClick={() => {
                         SoundEffects.playCardDraw();
                         onSelectCard(card.id);
                       }}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Horizontal scroll indicators on mobile */}
          {hand.length > 2 && (
            <div className="flex sm:hidden justify-center items-center gap-1.5 text-slate-500 text-[10px] mt-2 animate-pulse font-sans">
              <span>↔ اسحب لليمين واليسار لتصَفُّح باقي تكتيكات يدك</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
