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
  isHandExpanded: boolean;
  setIsHandExpanded: (val: boolean) => void;

  onSelectCard: (id: string) => void;
  onDrawCard: (deckType: "player" | "special") => void;
  onPlaySpecialCard: (id: string) => void;
  onCancelSelection: () => void;
  onInspectCard?: (card: Card) => void;
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
  isHandExpanded,
  setIsHandExpanded,
  onSelectCard,
  onDrawCard,
  onPlaySpecialCard,
  onCancelSelection,
  onInspectCard
}: CoachHandProps) {

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

  if (!isHandExpanded) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-auto">
        <button
          onClick={() => {
            SoundEffects.playCardDraw();
            setIsHandExpanded(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs md:text-sm rounded-full shadow-[0_4px_25px_rgba(16,185,129,0.5)] border border-emerald-400/40 cursor-pointer animate-bounce flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span className="text-base">👝</span>
          <span>حقيبة كروت المدرب اليدوية</span>
          <span className="bg-black/40 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold text-emerald-300">
            {hand.length} كروت
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Modal Backdrop and Overlay Container */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
        
        {/* Tap backdrop to close */}
        <div className="absolute inset-0 cursor-pointer" onClick={() => setIsHandExpanded(false)} />

        {/* Floating Glassmorphic Dialog Box */}
        <div className="bg-[#121412]/95 border border-[#10b981]/25 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] max-w-2xl w-full max-h-[85vh] overflow-y-auto relative z-10 flex flex-col gap-4 animate-fadeIn">
          
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <button
              onClick={() => setIsHandExpanded(false)}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-[#fca5a5] font-bold text-xs rounded-lg border border-rose-500/20 transition-all cursor-pointer"
            >
              إغلاق الأوراق ❌
            </button>
            <div className="text-right flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs md:text-sm font-black text-white">حقيبة كروت المدرب اليدوية</span>
                  <Layers className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[9px] text-[#e0e0e0]/40 leading-none mt-1">
                  ({hand.length} كروت بيدك) - اختر أو اسحب كروتاً وتكتيكات دفاعية وهجومية جديدة
                </p>
              </div>
            </div>
          </div>

          {/* Selected Warning / Alerts */}
          {selectedCardId && (
            <div className="mb-2">
              {renderSelectionAlert()}
            </div>
          )}

          {/* Draw Buttons row inside dialogue */}
          {isDrawPhase && phase !== "warmup" && (
            <div className="bg-black/40 border border-[#10b981]/15 p-3 rounded-xl text-center space-y-2.5">
              <span className="text-amber-400 text-xs font-black animate-pulse block">
                👈 اسحب {2 - cardsDrawnThisTurn} كروت لبدء اللعب هذا الدور!
              </span>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => onDrawCard("special")}
                  disabled={specialDeckCount === 0}
                  className="px-4 py-2 bg-teal-850 hover:bg-teal-700 text-teal-300 border border-teal-500/30 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-45"
                >
                  <span>سحب تكتيك خاص</span>
                  <span className="bg-black/30 px-1.5 py-0.5 rounded font-mono">({specialDeckCount})</span>
                </button>
                <button
                  onClick={() => onDrawCard("player")}
                  disabled={playerDeckCount === 0}
                  className="px-4 py-2 bg-emerald-850 hover:bg-emerald-700 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-45"
                >
                  <span>سحب كارت لاعب</span>
                  <span className="bg-black/30 px-1.5 py-0.5 rounded font-mono">({playerDeckCount})</span>
                </button>
              </div>
            </div>
          )}

          {/* Actual Cards grid carousel list */}
          <div className="flex items-center gap-4 overflow-x-auto py-3 px-1 scroll-smooth min-h-[220px]" id="hands_grid_flow">
            {hand.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center p-8 text-center text-white/40 gap-2 border border-white/5 bg-black/25 rounded-2xl">
                <span className="text-3xl">👝</span>
                <p className="text-xs font-bold leading-relaxed">حقيبتك المخصصة فارغة حالياً. اسحب كروت في بداية دورك!</p>
              </div>
            ) : (
              hand.map((card) => {
                const isSelected = selectedCardId === card.id;
                const isBurning = burningCardIds.includes(card.id);
                
                return (
                  <div key={card.id} className="relative flex-shrink-0 font-sans transform hover:scale-105 transition-transform">
                    <GameCard
                       card={card}
                       isRevealed={true}
                       size="md"
                       isSelected={isSelected}
                       isBurning={isBurning}
                       onInspect={() => onInspectCard && onInspectCard(card)}
                       onClick={() => {
                         SoundEffects.playCardDraw();
                         onSelectCard(card.id);
                         
                         // If we successfully select a non-legend Player card, collapse modal so they see slots to drop it onto!
                         if (card.type === "player") {
                           const pCard = card as PlayerCard;
                           // Only autofold drawer if burn target is not pending
                           if (!pCard.isLegend || burningCardIds.length === 2) {
                             setTimeout(() => {
                               setIsHandExpanded(false);
                             }, 280);
                           }
                         }
                       }}
                    />
                  </div>
                );
              })
            )}
          </div>

          {hand.length > 2 && (
            <div className="text-center text-slate-500 text-[10px] uppercase tracking-wider font-mono animate-pulse">
              ↔ اسحب يميناً ويساراً لتصفح كافة أوراق التكتيك الفائقة بيدك
            </div>
          )}

        </div>
      </div>
    </>
  );
}
