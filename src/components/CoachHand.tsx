/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sparkles, Trash2, ArrowUpCircle, Flame, Layers } from "lucide-react";
import GameCard from "./GameCard";
import { Card, PlayerCard, SpecialCard, GamePhase } from "../types";
import { SoundEffects } from "../utils/sounds";

interface CoachHandProps {
  hand: Card[];
  selectedCardId: string | null;
  burningCardIds: string[];
  movesLeft: number;
  phase: GamePhase;
  playerDeckCount: number;
  specialDeckCount: number;
  cardsDrawnThisTurn: number;
  maxDrawsPerTurn: number;
  initialCardsCount: number;
  isPlayerTurn: boolean;
  isHandExpanded: boolean;
  setIsHandExpanded: (val: boolean) => void;
  playerSlots: { card: PlayerCard | null; isRevealed: boolean; spent?: boolean; revealedInAttack?: boolean }[];

  onSelectCard: (id: string) => void;
  onDrawCard: (deckType: "player" | "special") => void;
  onPlaySpecialCard: (id: string) => void;
  onCancelSelection: () => void;
  onInspectCard?: (card: Card) => void;
  legendBurnLimit: number;
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
  maxDrawsPerTurn,
  initialCardsCount,
  isPlayerTurn,
  isHandExpanded,
  setIsHandExpanded,
  playerSlots,
  onSelectCard,
  onDrawCard,
  onPlaySpecialCard,
  onCancelSelection,
  onInspectCard,
  legendBurnLimit
}: CoachHandProps) {

  // Determine if drawing phase is active
  const slotsDrawn = playerSlots.filter((s) => s.card !== null).length;
  const handPlayersDrawn = hand.filter((c) => c.type === "player").length;
  const totalDrawnInWarmup = slotsDrawn + handPlayersDrawn;

  const isDrawPhase = isPlayerTurn && (
    phase === "warmup"
      ? totalDrawnInWarmup < initialCardsCount
      : (phase === "player_turn" && cardsDrawnThisTurn < maxDrawsPerTurn)
  );

  const selectedCard = hand.find((c) => c.id === selectedCardId);
  const isLegendSelected = selectedCard?.type === "player" && (selectedCard as PlayerCard).isLegend;

  // Render descriptive alerts based on the selected card type (super compact)
  const renderSelectionAlert = () => {
    if (!selectedCardId || !selectedCard) return null;

    let alertContent = null;
    if (selectedCard.type === "player") {
      const p = selectedCard as PlayerCard;
      if (p.isLegend) {
        const remainingBurn = legendBurnLimit - burningCardIds.length;
        alertContent = (
          <div className="bg-amber-950/90 backdrop-blur-sm border border-amber-500/30 rounded-lg py-1 px-2 text-right text-[10px] text-amber-300 flex items-center justify-between gap-2 animate-fadeIn w-full shadow-lg">
            <div className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />
              <span className="font-extrabold text-[10px]">تنزيل الأسطورة {p.name}!</span>
              <span className="opacity-70">
                ({legendBurnLimit <= 0 || remainingBurn <= 0 ? "اختر مركز بالملعب للتنزيل" : `حدد ${remainingBurn} أوراق أخرى لحرقها`})
              </span>
            </div>
            <button
              onClick={onCancelSelection}
              className="px-1.5 py-0.5 text-[9px] rounded bg-black/45 border border-white/10 text-white/60 hover:text-white hover:bg-amber-900/30 transition-colors cursor-pointer"
            >
              إلغاء ✕
            </button>
          </div>
        );
      } else {
        alertContent = (
          <div className="bg-[#121412]/90 backdrop-blur-sm border border-white/10 rounded-lg py-1 px-2 text-right text-[10px] text-emerald-400 flex items-center justify-between gap-2 animate-fadeIn w-full shadow-lg">
            <span className="flex-1 opacity-90">
              انقر فوق أي من مراكزك في الملعب لتنزيل <strong className="text-white">{p.name}</strong> 🏃‍♂️
            </span>
            <button
              onClick={onCancelSelection}
              className="px-1.5 py-0.5 text-[9px] rounded bg-black/45 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              إلغاء ✕
            </button>
          </div>
        );
      }
    } else {
      const spec = selectedCard as SpecialCard;
      alertContent = (
        <div className="bg-teal-950/90 backdrop-blur-sm border border-teal-500/30 rounded-lg py-1 px-2 text-right text-[10px] text-teal-300 flex items-center justify-between gap-2 animate-fadeIn w-full shadow-lg">
          <span className="font-extrabold text-[10px] text-teal-400">{spec.name}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPlaySpecialCard(spec.id)}
              disabled={movesLeft === 0 && phase !== "ai_attacking"}
              className="px-2 py-0.5 rounded bg-teal-600 text-white font-black hover:bg-teal-500 text-[9px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              تفعيل التكتيك ⚡
            </button>
            <button
              onClick={onCancelSelection}
              className="px-1.5 py-0.5 text-[9px] rounded bg-black/45 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              إلغاء ✕
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute top-1 left-8 right-1 z-40 flex justify-center">
        {alertContent}
      </div>
    );
  };

  if (!isHandExpanded) {
    return null;
  }

  return (
    <div className="w-full h-full relative flex flex-col justify-center" id="inline_coach_hand_system">
      {/* Floating Close Button */}
      <button
        onClick={() => setIsHandExpanded(false)}
        className="absolute top-1 left-1 z-50 w-5 h-5 flex items-center justify-center bg-rose-600/35 hover:bg-rose-600/65 border border-rose-500/20 text-rose-200 rounded text-[10px] font-bold transition-all shadow-md cursor-pointer hover:scale-105"
        title="إغلاق الحقيبة"
      >
        ✕
      </button>

      {/* Floating Selection Alert Overlay */}
      {renderSelectionAlert()}

      {/* Actual Cards grid list - scroll horizontal - occupies full container height */}
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
