/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Swords, Shield, Star, RefreshCw } from "lucide-react";
import GameCard from "./GameCard";
import { PlayerCard } from "../types";

interface TacticalPitchProps {
  playerCoachName: string;
  playerTeam: string;
  playerScore: number;
  playerSlots: { card: PlayerCard | null; isRevealed: boolean }[];
  
  aiCoachName: string;
  aiTeam: string;
  aiScore: number;
  aiSlots: { card: PlayerCard | null; isRevealed: boolean }[];

  selectedSlotIdx: number | null;
  currentAttackerIdx: number | null;
  phase: string;
  playerMovesLeft: number;

  onSelectSlot: (idx: number) => void;
  isSelectable: (idx: number, isAi: boolean) => boolean;
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
  onSelectSlot,
  isSelectable
}: TacticalPitchProps) {

  // Helper to render AI Slots
  const renderAiSlot = (idx: number, isMobile: boolean = false) => {
    const slot = aiSlots[idx];
    if (!slot) return null;
    const selectable = isSelectable(idx, true);
    const isSelected = phase === "attacking" && currentAttackerIdx === idx;
    
    return (
      <div key={`ai_pitch_${idx}`} className={`flex flex-col items-center gap-1 w-full ${isMobile ? 'max-w-[75px] xs:max-w-[85px] sm:max-w-[100px]' : 'max-w-[120px]'}`} id={`ai_slot_pos_${idx}`}>
        <span className="text-[8px] md:text-[9px] font-bold text-slate-500 truncate w-full text-center">
          {isMobile ? SLOT_POSITIONS[idx].icon + " " + SLOT_POSITIONS[idx].label.split(" (")[0] : SLOT_POSITIONS[idx].label}
        </span>

        <div
          onClick={() => selectable && onSelectSlot(idx)}
          className={`relative w-full aspect-[2/3] rounded-xl border flex flex-col items-center justify-center transition-all ${
            slot.card 
              ? "bg-transparent border-transparent" 
              : "bg-black/35 border-white/5 shadow-inner"
          } ${
            selectable 
              ? "cursor-pointer ring-2 ring-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-[1.02] animate-pulse" 
              : "opacity-95"
          }`}
        >
          {slot.card ? (
            <GameCard
              card={slot.card}
              isRevealed={slot.isRevealed}
              size="pitch"
              disabled={!selectable}
              className={isSelected ? "border-rose-500 ring-4 ring-rose-500/30" : ""}
            />
          ) : (
            <div className="text-center p-1.5 flex flex-col items-center justify-center gap-0.5 text-slate-700">
              <span className="text-sm">{SLOT_POSITIONS[idx].icon}</span>
              <span className="text-[7.5px] font-medium leading-tight text-[#e0e0e0]/30">خالٍ</span>
            </div>
          )}

          {slot.card && (
            <div className={`absolute -top-1.5 -left-1.5 px-1 py-0.5 rounded text-[7px] font-bold shadow-md z-20 ${
              slot.isRevealed 
                ? "bg-amber-500 text-black border border-amber-300/30" 
                : "bg-[#1a1c1a] text-[#e0e0e0]/70 border border-white/5"
            }`}>
              {slot.isRevealed ? "مكشوف" : "مخفي"}
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

    return (
      <div key={`player_pitch_${idx}`} className={`flex flex-col items-center gap-1 w-full ${isMobile ? 'max-w-[75px] xs:max-w-[85px] sm:max-w-[100px]' : 'max-w-[120px]'}`} id={`player_slot_pos_${idx}`}>
        <span className="text-[8px] md:text-[9px] font-bold text-slate-300 truncate w-full text-center">
          {isMobile ? SLOT_POSITIONS[idx].icon + " " + SLOT_POSITIONS[idx].label.split(" (")[0] : SLOT_POSITIONS[idx].label}
        </span>

        <div
          onClick={() => selectable && onSelectSlot(idx)}
          className={`relative w-full aspect-[2/3] rounded-xl border flex flex-col items-center justify-center transition-all ${
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
          }`}
        >
          {slot.card ? (
            <GameCard
              card={slot.card}
              isRevealed={slot.isRevealed}
              size="pitch"
              isSelected={isSelected}
              disabled={!selectable}
              className={isActiveAttacker ? "border-emerald-400 ring-4 ring-emerald-500/40" : ""}
            />
          ) : (
            <div className="text-center p-1.5 flex flex-col items-center justify-center gap-0.5 text-slate-600 group hover:text-slate-400">
              <span className="text-xs group-hover:scale-110 transition-transform">➕</span>
              <span className="text-[7.5px] font-medium leading-tight">شغل</span>
            </div>
          )}

          {slot.card && (
            <div className={`absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded text-[7px] font-bold shadow-md z-20 ${
              slot.isRevealed 
                ? "bg-teal-500 text-black border border-teal-300/30" 
                : "bg-[#1a1c1a] text-[#e0e0e0]/70 border border-white/5"
            }`}>
              {slot.isRevealed ? "مكشوف" : "مخفي"}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#0a0c0a] rounded-2xl p-4 md:p-6 border border-white/10 shadow-2xl overflow-hidden relative">
      {/* Pitch Lines Decoration */}
      <div className="absolute inset-0 border border-white/5 mx-6 my-6 pointer-events-none rounded-xl" />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/5 pointer-events-none" />
      <div className="absolute w-24 md:w-36 h-24 md:h-36 rounded-full border border-white/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute w-8 h-8 rounded-full bg-white/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Goal netting structures */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/40 border border-white/5 border-t-0 rounded-b-xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/40 border border-white/5 border-b-0 rounded-t-xl opacity-20 pointer-events-none" />

      <div className="flex flex-col gap-6 relative z-10">

        {/* 1. OPPONENT HALF - AI (RIVAL) */}
        <div>
          {/* AI Header Scoreboard Bar */}
          <div className="flex items-center justify-between pb-3 mb-4 bg-[#121412] border border-white/5 p-3 rounded-xl shadow-lg">
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

          {/* AI Pitch Slots - Desktop layout */}
          <div className="hidden sm:grid sm:grid-cols-5 gap-3 justify-items-center">
            {aiSlots.map((_, idx) => renderAiSlot(idx, false))}
          </div>

          {/* AI Pitch Slots - Mobile 3-Tier Soccer Formation */}
          <div className="flex sm:hidden flex-col gap-2 bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/10 shadow-inner">
            {/* GK Row (Index 0) */}
            <div className="flex justify-center w-full">
              {renderAiSlot(0, true)}
            </div>
            {/* DF & MF Row (Index 1 & 2) */}
            <div className="flex justify-center gap-4 w-full">
              {renderAiSlot(1, true)}
              {renderAiSlot(2, true)}
            </div>
            {/* Forwards Row (Index 3 & 4) */}
            <div className="flex justify-center gap-4 w-full">
              {renderAiSlot(3, true)}
              {renderAiSlot(4, true)}
            </div>
          </div>
        </div>

        {/* Tactical Middle Pitch divider representing center circle */}
        <div className="h-[1px] bg-white/5 my-2 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full bg-[#0a0c0a] border border-white/10 text-[10px] text-[#e0e0e0]/40 font-bold tracking-widest font-mono shadow-md">
            VS
          </div>
        </div>

        {/* 2. PLAYER HALF - YOU (COACH) */}
        <div>
          {/* Player Header Scoreboard Bar */}
          <div className="flex items-center justify-between pb-3 mb-4 bg-[#121412] border border-white/5 p-3 rounded-xl shadow-lg">
            <div className="text-left">
              <span className="text-[10px] text-[#e0e0e0]/40 block mb-0.5 font-sans font-medium">فريقك المختار</span>
              <h3 className="font-serif font-bold text-white text-sm md:text-base leading-none">{playerCoachName}</h3>
            </div>
            {/* Score pill */}
            <div className="flex items-center gap-1.5 bg-[#1a1c1a] border border-white/10 px-3.5 py-1 rounded-full shadow-inner">
              <span className="text-emerald-400 font-mono font-bold text-sm">{playerScore}</span>
              <span className="text-[#e0e0e0]/45 text-[9px] font-sans">أهداف</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#e0e0e0]/30 font-semibold font-sans">الهوية التكتيكية</span>
              <h4 className="text-xs font-bold text-emerald-400">{playerTeam}</h4>
            </div>
          </div>

          {/* Player Pitch Slots - Desktop layout */}
          <div className="hidden sm:grid sm:grid-cols-5 gap-3 justify-items-center">
            {playerSlots.map((_, idx) => renderPlayerSlot(idx, false))}
          </div>

          {/* Player Pitch Slots - Mobile 3-Tier Soccer Formation */}
          <div className="flex sm:hidden flex-col gap-2 bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/10 shadow-inner">
            {/* Forwards Row (Index 3 & 4) */}
            <div className="flex justify-center gap-4 w-full">
              {renderPlayerSlot(3, true)}
              {renderPlayerSlot(4, true)}
            </div>
            {/* DF & MF Row (Index 1 & 2) */}
            <div className="flex justify-center gap-4 w-full">
              {renderPlayerSlot(1, true)}
              {renderPlayerSlot(2, true)}
            </div>
            {/* GK Row (Index 0) */}
            <div className="flex justify-center w-full">
              {renderPlayerSlot(0, true)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
