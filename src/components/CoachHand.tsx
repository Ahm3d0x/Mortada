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
  playerSlots: { card: PlayerCard | null; isRevealed: boolean; spent?: boolean; revealedInAttack?: boolean }[];

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
  playerSlots,
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

  // Render descriptive alerts based on the selected card type (super compact)
  const renderSelectionAlert = () => {
    if (!selectedCardId || !selectedCard) return null;

    if (selectedCard.type === "player") {
      const p = selectedCard as PlayerCard;
      if (p.isLegend) {
        const remainingBurn = 2 - burningCardIds.length;
        return (
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg py-0.5 px-2 text-right text-[10px] text-amber-300 flex items-center justify-between gap-2 animate-fadeIn shrink-0">
            <div className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />
              <span className="font-extrabold text-[10px]">تنزيل الأسطورة {p.name}!</span>
              <span className="opacity-70">({remainingBurn > 0 ? `حدد ${remainingBurn} أوراق أخرى لحرقها` : "اختر مركز بالملعب للتنزيل"})</span>
            </div>
            <button
              onClick={onCancelSelection}
              className="px-1.5 py-px text-[9px] rounded bg-black/45 border border-white/10 text-white/60 hover:text-white hover:bg-amber-900/30 transition-colors"
            >
              إلغاء ✕
            </button>
          </div>
        );
      } else {
        return (
          <div className="bg-[#121412] border border-white/5 rounded-lg py-0.5 px-2 text-right text-[10px] text-emerald-400 flex items-center justify-between gap-2 animate-fadeIn shrink-0">
            <span className="flex-1 opacity-90">
              انقر فوق أي من مراكزك في الملعب لتنزيل <strong className="text-white">{p.name}</strong> 🏃‍♂️
            </span>
            <button
              onClick={onCancelSelection}
              className="px-1.5 py-px text-[9px] rounded bg-black/45 border border-white/10 text-white/60 hover:text-white"
            >
              إلغاء ✕
            </button>
          </div>
        );
      }
    } else {
      const spec = selectedCard as SpecialCard;
      return (
        <div className="bg-teal-950/40 border border-teal-500/30 rounded-lg py-0.5 px-2 text-right text-[10px] text-teal-300 flex items-center justify-between gap-2 animate-fadeIn shrink-0">
          <span className="font-extrabold text-[10px] text-teal-400">{spec.name}</span>
          <button
            onClick={() => onPlaySpecialCard(spec.id)}
            disabled={movesLeft === 0 && phase !== "ai_attacking"}
            className="px-2 py-0.5 rounded bg-teal-600 text-white font-black hover:bg-teal-500 text-[9px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            تفعيل التكتيك ⚡
          </button>
        </div>
      );
    }
  };

  if (!isHandExpanded) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col justify-between" id="inline_coach_hand_system">
      {/* Header Row - ultra compact to prevent vertical overflow */}
      <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-1 shrink-0">
        
        {/* Left: Close Button (✕ icon only to save space) */}
        <button
          onClick={() => setIsHandExpanded(false)}
          className="w-5 h-5 flex items-center justify-center bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 rounded-md transition-all cursor-pointer font-bold text-xs"
          title="إغلاق الحقيبة"
        >
          ✕
        </button>

        {/* Dynamic alerts or draw choices in center */}
        <div className="flex-1 flex justify-center overflow-hidden">
          {selectedCardId ? (
            renderSelectionAlert()
          ) : (
            isPlayerTurn && (phase === "player_turn" || phase === "warmup") && (
              <div className="flex items-center gap-1.5 py-px">
                {phase !== "warmup" && (
                  <button
                    type="button"
                    onClick={() => onDrawCard("special")}
                    disabled={specialDeckCount === 0 || cardsDrawnThisTurn >= 2}
                    className="px-1.5 py-0.5 bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 border border-teal-500/30 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <span>تكتيك</span>
                    <span className="bg-black/30 px-1 py-px rounded font-mono text-[8px] font-bold">{specialDeckCount}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDrawCard("player")}
                  disabled={playerDeckCount === 0 || (phase === "warmup" && playerSlots.filter(s => s.card !== null).length >= 5) || (phase !== "warmup" && cardsDrawnThisTurn >= 2)}
                  className="px-1.5 py-0.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <span>لاعب</span>
                  <span className="bg-black/30 px-1 py-px rounded font-mono text-[8px] font-bold">{playerDeckCount}</span>
                </button>
              </div>
            )
          )}
        </div>

        {/* Right: Badge and Title */}
        <div className="text-right flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-[#e0e0e0]/50 font-black">({hand.length})</span>
          <span className="text-[10px] font-black text-white">حقيبة البدلاء</span>
          <Layers className="w-3 h-3 text-emerald-500" />
        </div>
      </div>

      {/* Actual Cards grid list - scroll horizontal - compact height */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 scroll-smooth scrollbar-none" id="hands_grid_flow">
        {hand.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center p-2 text-center text-white/30 gap-1 border border-white/5 bg-black/25 rounded-lg h-full">
            <span className="text-base">👝</span>
            <p className="text-[9px] font-medium leading-relaxed">الحقيبة فارغة حالياً.</p>
          </div>
        ) : (
          hand.map((card) => {
            const isSelected = selectedCardId === card.id;
            const isBurning = burningCardIds.includes(card.id);
            
            return (
              <div key={card.id} className="relative flex-shrink-0 font-sans transform hover:scale-[1.03] transition-transform">
                {/* We render GameCard using sm size for compact, comfortable handling */}
                <GameCard
                   card={card}
                   isRevealed={true}
                   size="sm"
                   isSelected={isSelected}
                   isBurning={isBurning}
                   onInspect={() => onInspectCard && onInspectCard(card)}
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

    </div>
  );
}
