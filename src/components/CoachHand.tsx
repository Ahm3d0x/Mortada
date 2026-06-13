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

  // Render descriptive alerts based on the selected card type
  const renderSelectionAlert = () => {
    if (!selectedCardId || !selectedCard) return null;

    if (selectedCard.type === "player") {
      const p = selectedCard as PlayerCard;
      if (p.isLegend) {
        const remainingBurn = 2 - burningCardIds.length;
        return (
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-2.5 text-right text-xs text-amber-300 flex items-center justify-between gap-3 animate-fadeIn">
            <button
              onClick={onCancelSelection}
              className="px-2 py-0.5 rounded bg-black/45 border border-white/5 text-[10px] text-white/50 hover:text-white hover:bg-[#1a1c1a] transition-colors"
            >
              إلغاء
            </button>
            <div className="flex-1">
              <span className="font-bold font-serif flex items-center justify-end gap-1 text-xs text-amber-400">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>تحضير الأسطورة {p.name}!</span>
              </span>
              <p className="text-[#e0e0e0]/60 mt-0.5 text-[10px]">
                {remainingBurn > 0 
                  ? `يتطلب حرق قطعتين: اختر ${remainingBurn} أوراق أخرى` 
                  : "جاهز! انقر مركزاً شاغراً بالملعب"}
              </p>
            </div>
          </div>
        );
      } else {
        return (
          <div className="bg-[#1a1c1a] border border-white/5 rounded-xl p-2.5 text-right text-xs text-[#e0e0e0]/80 flex items-center justify-between gap-3 animate-fadeIn">
            <button
              onClick={onCancelSelection}
              className="px-2 py-0.5 rounded bg-black/45 border border-white/5 text-[10px] text-white/50 hover:text-white"
            >
              إلغاء
            </button>
            <p className="flex-1 text-[#e0e0e0]/70 text-[10px]">
              انقر مركزاً بالملعب لتنزيل <strong className="text-emerald-400">{p.name}</strong> 🏃‍♂️
            </p>
          </div>
        );
      }
    } else {
      const spec = selectedCard as SpecialCard;
      return (
        <div className="bg-teal-950/20 border border-teal-500/20 rounded-xl p-2.5 text-right text-xs text-teal-300 flex items-center justify-between gap-3 animate-fadeIn">
          <button
            onClick={() => onPlaySpecialCard(spec.id)}
            disabled={movesLeft === 0 && phase !== "ai_attacking"}
            className="px-3 py-1 rounded bg-teal-600 text-white font-bold hover:bg-teal-500 text-[10px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            تفعيل التكتيك
          </button>
          <div className="flex-1">
            <span className="font-bold text-xs text-teal-400 font-serif">{spec.name}</span>
          </div>
        </div>
      );
    }
  };

  if (!isHandExpanded) {
    return null;
  }

  return (
    <div className="w-full bg-[#121412]/95 border border-[#10b981]/35 rounded-2xl p-4 md:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] flex flex-col gap-4 animate-fadeIn mt-4 relative overflow-hidden" id="inline_coach_hand_system">
      {/* Subtle grass vein texture inside hand bag */}
      <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent top-0" />

      {/* Header row */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <button
          onClick={() => setIsHandExpanded(false)}
          className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-bold text-xs rounded-lg border border-rose-500/20 transition-all cursor-pointer"
        >
          إخفاء ❌
        </button>
        <div className="text-right flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs md:text-sm font-black text-white">أوراقي</span>
              <Layers className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[9px] text-[#e0e0e0]/40 leading-none mt-1">
              ({hand.length} أوراق بيدك)
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

      {/* Draw Buttons row inside inline drawer */}
      {isPlayerTurn && (phase === "player_turn" || phase === "warmup") && (
        <div className="bg-black/45 border border-emerald-500/10 p-2.5 rounded-xl text-center space-y-2">
          <span className="text-emerald-400 text-[10px] font-semibold block animate-pulse">
            {phase === "warmup" 
              ? `التسخين: اسحب (${playerSlots.filter(s => s.card !== null).length}/5) لاعبين`
              : `سحب كروت اللقاء (مسحوب: ${cardsDrawnThisTurn}/2)`}
          </span>
          <div className="flex items-center justify-center gap-3">
            {phase !== "warmup" && (
              <button
                type="button"
                onClick={() => onDrawCard("special")}
                disabled={specialDeckCount === 0 || cardsDrawnThisTurn >= 2}
                className="px-3 py-1.5 bg-teal-950/50 hover:bg-teal-900/60 text-teal-300 border border-teal-500/40 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>سحب تكتيك</span>
                <span className="bg-black/40 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">{specialDeckCount}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onDrawCard("player")}
              disabled={playerDeckCount === 0 || (phase === "warmup" && playerSlots.filter(s => s.card !== null).length >= 5) || (phase !== "warmup" && cardsDrawnThisTurn >= 2)}
              className="px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>سحب لاعب</span>
              <span className="bg-black/40 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">{playerDeckCount}</span>
            </button>
          </div>
        </div>
      )}

      {/* Actual Cards grid list */}
      <div className="flex items-center gap-4 overflow-x-auto py-3 px-1 scroll-smooth min-h-[220px] scrollbar-thin scrollbar-thumb-white/10" id="hands_grid_flow">
        {hand.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center p-8 text-center text-white/40 gap-2 border border-white/5 bg-black/25 rounded-2xl">
            <span className="text-3xl">👝</span>
            <p className="text-xs font-bold leading-relaxed">الحقيبة فارغة حالياً.</p>
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
                   }}
                />
              </div>
            );
          })
        )}
      </div>

      {hand.length > 2 && (
        <div className="text-center text-slate-500 text-[10px] uppercase tracking-wider font-mono animate-pulse">
          ↔ تصفح الأوراق بيدك
        </div>
      )}

    </div>
  );
}
