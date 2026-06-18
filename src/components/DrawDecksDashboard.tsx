/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BoosterCard } from "../types";

interface DrawDecksDashboardProps {
  phase: string;
  playerDeckCount: number;
  specialDeckCount: number;
  cardsDrawnThisTurn: number;
  playerMovesLeft: number;
  selectedHandCardId: string | null;
  selectedPitchSlotIdx: number | null;
  burningCardCount: number;
  currentBooster: BoosterCard | null;
  maxDrawsPerTurn?: number;

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
  currentBooster,
  onDrawCard,
  maxDrawsPerTurn = 2
}: DrawDecksDashboardProps) {

  const isPlayerTurn = phase === "player_turn" || phase === "warmup";
  const isDrawPhase = isPlayerTurn && phase === "player_turn" && cardsDrawnThisTurn < maxDrawsPerTurn;

  return (
    <div className="flex flex-col gap-2" id="decks_dashboard_main_container">
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
                  كارت {playerDeckCount}
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
                  كارت {specialDeckCount}
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
