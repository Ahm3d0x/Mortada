/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Swords, Shield, Star, RefreshCw } from "lucide-react";
import GameCard from "./GameCard";
import { PlayerCard, SpecialCard, PontoCard } from "../types";

interface TacticalPitchProps {
  playerCoachName: string;
  playerTeam: string;
  playerScore: number;
  playerSlots: { card: PlayerCard | null; isRevealed: boolean; spent?: boolean; revealedInAttack?: boolean }[];
  
  aiCoachName: string;
  aiTeam: string;
  aiScore: number;
  aiSlots: { card: PlayerCard | null; isRevealed: boolean; spent?: boolean; revealedInAttack?: boolean }[];

  selectedSlotIdx: number | null;
  currentAttackerIdx: number | null;
  phase: string;
  playerMovesLeft: number;
  turnCount?: number;

  onSelectSlot: (idx: number) => void;
  isSelectable: (idx: number, isAi: boolean) => boolean;

  playerActiveSpecial: SpecialCard[];
  aiActiveSpecial: SpecialCard[];

  // Embedded drawings on-pitch center (Requirement 7)
  playerDeckCount?: number;
  specialDeckCount?: number;
  cardsDrawnThisTurn?: number;
  onDrawCard?: (deckType: "player" | "special") => void;

  // Lifted hand controls
  isHandExpanded?: boolean;
  setIsHandExpanded?: (val: boolean) => void;
  aiHandCount?: number;
  onInspectCard?: (card: any) => void;

  currentPonto: PontoCard | null;
}

// Tactical Positions Label Map
const SLOT_POSITIONS = [
  { id: "gk", label: "حارس المرمى (GK)", desc: "قدرة دفاعية عالية لصد الغارات", icon: "🧤" },
  { id: "df", label: "مدافع صلب (DF)", desc: "يتدخل لقطع هجمات الخصم", icon: "🛡️" },
  { id: "mf", label: "صانع ألعاب (MF)", desc: "توازن رائع بالدفاع والهجوم", icon: "⚽" },
  { id: "st1", label: "رأس حربة (ST)", desc: "قوة تصويب هجومية فائقة", icon: "🔥" },
  { id: "st2", label: "جناح مهاجم (WF)", desc: "سرعة ومباغتة لتجاوز الدفاع", icon: "⚡" }
];

export default function TacticalPitch({
  playerCoachName,
  playerTeam,
  playerScore,
  playerSlots,
  aiCoachName,
  aiTeam,
  aiScore,
  aiSlots,
  selectedSlotIdx,
  currentAttackerIdx,
  phase,
  playerMovesLeft,
  turnCount = 1,
  onSelectSlot,
  isSelectable,
  playerActiveSpecial,
  aiActiveSpecial,
  playerDeckCount = 0,
  specialDeckCount = 0,
  cardsDrawnThisTurn = 0,
  onDrawCard,
  isHandExpanded = false,
  setIsHandExpanded,
  aiHandCount = 3,
  onInspectCard,
  currentPonto
}: TacticalPitchProps) {

  const isPeekMode = true;

  const playerGridCols = playerSlots.length === 3 ? "grid-cols-3" : playerSlots.length === 4 ? "grid-cols-4" : "grid-cols-5";
  const aiGridCols = aiSlots.length === 3 ? "grid-cols-3" : aiSlots.length === 4 ? "grid-cols-4" : "grid-cols-5";

  // Helper to render AI Slots
  const renderAiSlot = (idx: number, isMobile: boolean = false) => {
    const slot = aiSlots[idx];
    if (!slot) return null;
    const selectable = isSelectable(idx, true);
    const isSelected = phase === "attacking" && currentAttackerIdx === idx;
    const isSpent = !!slot.spent;
    const isActiveInPlay = !!slot.revealedInAttack;
    const isOpponentCardRevealed = !!(slot.revealedInAttack || slot.spent || (slot as any).revealedByAbility);
    
    return (
      <div key={`ai_pitch_${idx}`} className={`flex flex-col items-center gap-1 w-full ${isMobile ? 'max-w-[75px] xs:max-w-[85px] sm:max-w-[100px]' : 'max-w-[120px]'}`} id={`ai_slot_pos_${idx}`}>
        <div
          onClick={() => selectable && onSelectSlot(idx)}
          className={`relative w-full aspect-[2/3] rounded-xl border flex flex-col items-center justify-center transition-all duration-300 ${
            slot.card 
              ? "bg-transparent border-transparent" 
              : "bg-black/35 border-white/5 shadow-inner"
          } ${
            selectable 
              ? "cursor-pointer ring-2 ring-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-[1.02] animate-pulse" 
              : "opacity-95"
          } ${isSpent ? "opacity-50 grayscale-[50%] scale-[0.98]" : ""} ${
            isActiveInPlay 
              ? "translate-y-3.5 scale-105 z-30 border-rose-500 ring-4 ring-rose-500/60 shadow-[0_0_25px_rgba(239,68,68,0.9)] animate-pulse"
              : ""
          }`}
        >
          {slot.card ? (
            <div className="relative w-full h-full">
              <GameCard
                card={slot.card}
                isRevealed={isOpponentCardRevealed}
                size="pitch"
                disabled={!selectable}
                onInspect={() => isOpponentCardRevealed && onInspectCard && onInspectCard(slot.card)}
                isActive={isActiveInPlay}
                activeColor="rose"
                className={`${isSelected ? "border-rose-500 ring-4 ring-rose-500/30" : ""} ${isSpent ? "pointer-events-none" : ""}`}
              />
              {isSpent && (
                <div className="absolute inset-0 bg-black/10 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="bg-black/85 text-rose-300 text-[8px] font-bold px-2 py-0.5 rounded border border-rose-500/20 shadow-md">
                    مستهلك ❌
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-1.5 flex flex-col items-center justify-center gap-0.5 text-slate-700">
              <span className="text-sm">🛡️</span>
              <span className="text-[7px] font-bold text-[#e0e0e0]/20">خصم فارغ</span>
            </div>
          )}

          {slot.card && (
            <div className={`absolute -top-1.5 -left-1.5 px-1 py-0.5 rounded text-[7px] font-bold shadow-md z-20 ${
              isSpent
                ? "bg-slate-700 text-slate-400 border border-slate-600"
                : (isOpponentCardRevealed 
                    ? "bg-amber-500 text-black border border-amber-300/30" 
                    : "bg-[#1a1c1a] text-[#e0e0e0]/70 border border-white/5")
            }`}>
              {isSpent ? "مستهلك" : (isOpponentCardRevealed ? "مكشوف" : "مخفي")}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to render Player Slots
  const renderPlayerSlot = (idx: number, isMobile: boolean = false) => {
    const slot = playerSlots[idx];
    if (!slot) return null;
    const selectable = isSelectable(idx, false);
    const isSelected = selectedSlotIdx === idx;
    const isActiveAttacker = phase === "attacking" && currentAttackerIdx === idx;
    const isSpent = !!slot.spent;
    const isActiveInPlay = !!slot.revealedInAttack;

    const peekingThisCard = isPeekMode && !slot.isRevealed;

    return (
      <div key={`player_pitch_${idx}`} className={`flex flex-col items-center gap-1 w-full ${isMobile ? 'max-w-[75px] xs:max-w-[85px] sm:max-w-[100px]' : 'max-w-[120px]'}`} id={`player_slot_pos_${idx}`}>
        <div
          onClick={() => selectable && onSelectSlot(idx)}
          className={`relative w-full aspect-[2/3] rounded-xl border flex flex-col items-center justify-center transition-all duration-300 ${
            slot.card 
              ? "bg-transparent border-transparent" 
              : "bg-black/35 border-white/5 cursor-pointer hover:border-emerald-500/20 shadow-inner"
          } ${
            isSelected 
              ? "border-amber-400 ring-2 ring-amber-400 shadow-md scale-[1.02]" 
              : ""
          } ${
            selectable 
              ? "cursor-pointer ring-2 ring-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-[1.02] animate-pulse" 
              : ""
          } ${isSpent ? "opacity-50 grayscale-[50%] scale-[0.98]" : ""} ${
            isActiveInPlay 
              ? "-translate-y-3.5 scale-105 z-30 border-emerald-500 ring-4 ring-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.9)] animate-pulse"
              : ""
          }`}
        >
          {slot.card ? (
            <div className="relative w-full h-full">
              <GameCard
                card={slot.card}
                isRevealed={slot.isRevealed || isPeekMode}
                size="pitch"
                isSelected={isSelected}
                disabled={!selectable}
                onInspect={() => onInspectCard && onInspectCard(slot.card)}
                isActive={isActiveInPlay}
                activeColor="emerald"
                className={`${isActiveAttacker ? "border-emerald-400 ring-4 ring-emerald-500/40" : ""} ${isSpent ? "pointer-events-none" : ""}`}
              />
              {peekingThisCard && (
                <div className="absolute top-0 right-0 bg-amber-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-bl rounded-tr-xl z-30 shadow animate-pulse pointer-events-none select-none">
                  👁️ معاينة
                </div>
              )}
              {isSpent && (
                <div className="absolute inset-0 bg-black/10 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="bg-black/85 text-emerald-300 text-[8px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 shadow-md">
                    مستهلك ❌
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-1.5 flex flex-col items-center justify-center gap-0.5 text-slate-500 group hover:text-white transition-colors">
              <span className="text-xs group-hover:scale-115 transition-transform duration-200">➕</span>
              <span className="text-[7.5px] font-black leading-tight text-white/35">تنزيل لاعب</span>
            </div>
          )}

          {slot.card && (
            <div className={`absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded text-[7px] font-bold shadow-md z-20 ${
              isSpent
                ? "bg-slate-700 text-slate-400 border border-slate-600"
                : (slot.isRevealed 
                    ? "bg-teal-500 text-black border border-teal-300/30" 
                    : "bg-[#1a1c1a] text-[#e0e0e0]/70 border border-white/5")
            }`}>
              {isSpent ? "مستهلك" : (slot.isRevealed ? "مكشوف" : "مخفي")}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-linear-to-b from-[#0c2a16] via-[#071d0e] to-[#041208] rounded-2xl p-4 md:p-6 border border-emerald-500/35 shadow-[0_16px_48px_rgba(0,0,0,0.65)] overflow-hidden relative">
      {/* Vertical Grass Turf Stripes (Requirement 7) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.15)_50%)] bg-size-[10%_100%]" />
      
      {/* Pitch White Lines Markings (Premium tactical aesthetics) */}
      <div className="absolute inset-0 border-2 border-white/10 mx-4 my-4 pointer-events-none rounded-xl" />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/10 pointer-events-none" />
      <div className="absolute w-28 md:w-44 h-28 md:h-44 rounded-full border-2 border-white/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute w-2.5 h-2.5 rounded-full bg-white/40 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse" />

      {/* Top Penalty Areas (Box 18 & Box 6) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-56 md:w-80 h-16 md:h-24 border-2 border-white/10 border-t-0 pointer-events-none rounded-b-md" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 md:w-40 h-6 md:h-8 border-2 border-white/10 border-t-0 pointer-events-none" />
      
      {/* Bottom Penalty Areas (Box 18 & Box 6) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-56 md:w-80 h-16 md:h-24 border-2 border-white/10 border-b-0 pointer-events-none rounded-t-md" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-28 md:w-40 h-6 md:h-8 border-2 border-white/10 border-b-0 pointer-events-none" />

      {/* Goal netting structures */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-24 md:w-36 h-3 bg-white/10 border border-white/20 border-t-0 rounded-b pointer-events-none" />
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 md:w-36 h-3 bg-white/10 border border-white/20 border-b-0 rounded-t pointer-events-none" />

      <div className="flex flex-col gap-6 relative z-10">

        {/* 1. OPPONENT HALF - AI (RIVER) */}
        <div>
          {/* AI Header Scoreboard Bar - Only displayed on large desktop screens to avoid vertical scroll on mobile */}
          <div className="hidden lg:flex items-center justify-between pb-3 mb-4 bg-[#121412] border border-white/5 p-3 rounded-xl shadow-lg">
            <div className="text-left">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#e0e0e0]/30 font-semibold font-sans">أسلوب اللعب للخصم</span>
              <h4 className="text-xs font-bold text-[#e0e0e0]/70">{aiTeam}</h4>
            </div>
            {/* Score pill */}
            <div className="flex items-center gap-1.5 bg-[#1a1c1a] border border-white/10 px-3.5 py-1 rounded-full shadow-inner">
              <span className="text-white font-mono font-bold text-sm">{aiScore}</span>
              <span className="text-[#e0e0e0]/40 text-[9px] font-sans">أهداف</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#e0e0e0]/40 block mb-0.5 font-sans">المدرب الخصم</span>
              <h3 className="font-serif font-bold text-white text-sm md:text-base leading-none">{aiCoachName}</h3>
            </div>
          </div>

          {/* AI Pitch Slots */}
          <div className={`grid ${aiGridCols} gap-1 md:gap-3 justify-items-center bg-black/35 p-2 md:p-3 rounded-xl border border-rose-500/15 shadow-inner overflow-hidden mb-3`}>
            {aiSlots.map((_, idx) => renderAiSlot(idx, true))}
          </div>

          {/* Symmetrical Opponent Status Bar (Locked indicator) */}
          <div className="w-full bg-rose-950/10 border border-rose-500/10 rounded-xl p-2 flex items-center justify-between gap-1 mb-3">
            <div className="flex items-center gap-1 text-[11px] text-rose-300 font-bold">
              <span>🤖 كروت الخصم</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 text-[10px]" title="أوراق بملعب الخصم">
                <span className="text-rose-400">👝</span>
                <span className="text-white font-mono font-bold">{aiHandCount}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]" title="متبقي باقة كروت اللاعبين">
                <span className="text-emerald-400">🏃‍♂️</span>
                <span className="text-white font-mono font-bold">{playerDeckCount}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]" title="متبقي باقة كروت التكتيك">
                <span className="text-teal-400">⚡</span>
                <span className="text-white font-mono font-bold">{specialDeckCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Middle Pitch divider - Streamlined and narrow on mobile */}
        <div className="relative my-4 flex flex-col items-center justify-center gap-2">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-emerald-500/15" />
          <div className="z-10 bg-[#0c0e0c] border border-emerald-500/20 px-3 py-0.5 rounded-full text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest shadow-[0_0_8px_rgba(16,185,129,0.15)]">
            ⚙️ تكتيكات اللقاء
          </div>

          {currentPonto && (
            <div className="z-10 bg-linear-to-r from-amber-950/80 to-amber-900/80 border border-amber-500/40 px-3 py-1 rounded-xl text-center shadow-[0_0_10px_rgba(245,158,11,0.15)] animate-fadeIn max-w-xs">
              <span className="text-[8.5px] text-amber-400 font-black block uppercase mb-0.5">
                🔥 معزز الهجمة (Ponto)
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[10px] text-white font-extrabold">{currentPonto.text}</span>
                <span className="text-[10px] font-mono font-black text-amber-300 bg-black/45 px-1.5 py-0.2 rounded border border-amber-500/20">
                  +{currentPonto.value} ⚔️
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. PLAYER HALF - YOU (COACH) */}
        <div>
          {/* Symmetrical Player Console */}
          <div className="w-full bg-[#121412]/95 border border-[#10b981]/30 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between px-1.5 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] md:text-[11px] font-black text-emerald-400">⚙️ لوحة التكتيك</span>
              </div>
            </div>

            {/* Active special cards display row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
              {/* Box 1: Player Active Special Cards */}
              <div className="p-3 bg-teal-950/20 border border-teal-500/20 rounded-xl flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#10b981] tracking-wide">⚔️ تكتيكاتي</span>
                </div>
                <div className="min-h-[48px] flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-black/35 rounded-lg border border-white/5">
                  {playerActiveSpecial && playerActiveSpecial.length > 0 ? (
                    playerActiveSpecial.map((card) => {
                      let timerId: any = null;
                      return (
                        <div
                          key={card.id}
                          onPointerDown={() => {
                            timerId = setTimeout(() => {
                              onInspectCard?.(card);
                            }, 500);
                          }}
                          onPointerUp={() => {
                            if (timerId) clearTimeout(timerId);
                          }}
                          onPointerLeave={() => {
                            if (timerId) clearTimeout(timerId);
                          }}
                          onClick={() => onInspectCard?.(card)}
                          title="انقر للتصفح"
                          className="px-2.5 py-1.5 rounded bg-teal-900/60 border border-teal-400/30 text-teal-200 text-[10px] font-black flex items-center gap-1.5 shadow-md cursor-pointer hover:bg-teal-800/85 hover:border-teal-400 transition-all active:scale-95 select-none animate-pulse"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                          <span>{card.name}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-semibold font-sans">❌ لا يوجد</span>
                  )}
                </div>
              </div>

              {/* Box 2: AI/Opponent Active Special Cards */}
              <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-rose-400 tracking-wide">🛡️ تكتيكات الخصم</span>
                </div>
                <div className="min-h-[48px] flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-black/35 rounded-lg border border-white/5">
                  {aiActiveSpecial && aiActiveSpecial.length > 0 ? (
                    aiActiveSpecial.map((card) => {
                      let timerId: any = null;
                      return (
                        <div
                          key={card.id}
                          onPointerDown={() => {
                            timerId = setTimeout(() => {
                              onInspectCard?.(card);
                            }, 500);
                          }}
                          onPointerUp={() => {
                            if (timerId) clearTimeout(timerId);
                          }}
                          onPointerLeave={() => {
                            if (timerId) clearTimeout(timerId);
                          }}
                          onClick={() => onInspectCard?.(card)}
                          title="انقر للتصفح"
                          className="px-2.5 py-1.5 rounded bg-rose-950 border border-rose-500/35 text-rose-200 text-[10px] font-black flex items-center gap-1.5 shadow-md cursor-pointer hover:bg-rose-900/85 hover:border-rose-400 transition-all active:scale-95 select-none animate-pulse"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>{card.name}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-semibold font-sans">❌ لا يوجد</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-1">
              {/* 3. Open Hand Button (البدلاء) */}
              <button
                type="button"
                onClick={() => setIsHandExpanded && setIsHandExpanded(!isHandExpanded)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isHandExpanded
                    ? "border-emerald-500 bg-emerald-950/40 text-emerald-400 ring-2 ring-emerald-500/30"
                    : "border-white/5 bg-black/40 text-slate-400 hover:border-white/10 hover:text-white"
                }`}
                id="board_toggle_hand_widget"
              >
                <span className="text-sm">🔄</span>
                <span className="font-bold text-xs">البدلاء</span>
              </button>
            </div>
          </div>

          {/* Player Pitch Slots - Horizontal Side-by-Side row alignment (Requirement 1) */}
          <div className={`grid ${playerGridCols} gap-1 md:gap-3 justify-items-center bg-emerald-950/10 p-2 md:p-3 rounded-xl border border-emerald-500/10 shadow-inner overflow-hidden`}>
            {playerSlots.map((_, idx) => renderPlayerSlot(idx, true))}
          </div>
        </div>

      </div>
    </div>
  );
}
