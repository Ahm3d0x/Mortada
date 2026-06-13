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
  isSelectable,
  playerDeckCount = 0,
  specialDeckCount = 0,
  cardsDrawnThisTurn = 0,
  onDrawCard,
  isHandExpanded = false,
  setIsHandExpanded,
  aiHandCount = 3,
  onInspectCard
}: TacticalPitchProps) {

  const [isPeekMode, setIsPeekMode] = React.useState(false);

  // Helper to render AI Slots
  const renderAiSlot = (idx: number, isMobile: boolean = false) => {
    const slot = aiSlots[idx];
    if (!slot) return null;
    const selectable = isSelectable(idx, true);
    const isSelected = phase === "attacking" && currentAttackerIdx === idx;
    
    return (
      <div key={`ai_pitch_${idx}`} className={`flex flex-col items-center gap-1 w-full ${isMobile ? 'max-w-[75px] xs:max-w-[85px] sm:max-w-[100px]' : 'max-w-[120px]'}`} id={`ai_slot_pos_${idx}`}>
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
              onInspect={() => slot.isRevealed && onInspectCard && onInspectCard(slot.card)}
              className={isSelected ? "border-rose-500 ring-4 ring-rose-500/30" : ""}
            />
          ) : (
            <div className="text-center p-1.5 flex flex-col items-center justify-center gap-0.5 text-slate-700">
              <span className="text-sm">🛡️</span>
              <span className="text-[7px] font-bold text-[#e0e0e0]/20">خصم فارغ</span>
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

    const peekingThisCard = isPeekMode && !slot.isRevealed;

    return (
      <div key={`player_pitch_${idx}`} className={`flex flex-col items-center gap-1 w-full ${isMobile ? 'max-w-[75px] xs:max-w-[85px] sm:max-w-[100px]' : 'max-w-[120px]'}`} id={`player_slot_pos_${idx}`}>
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
            <div className="relative w-full h-full">
              <GameCard
                card={slot.card}
                isRevealed={slot.isRevealed || isPeekMode}
                size="pitch"
                isSelected={isSelected}
                disabled={!selectable}
                onInspect={() => onInspectCard && onInspectCard(slot.card)}
                className={isActiveAttacker ? "border-emerald-400 ring-4 ring-emerald-500/40" : ""}
              />
              {peekingThisCard && (
                <div className="absolute top-0 right-0 bg-amber-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-bl rounded-tr-xl z-30 shadow animate-pulse pointer-events-none select-none">
                  👁️ معاينة
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
    <div className="w-full bg-gradient-to-b from-[#0c2a16] via-[#071d0e] to-[#041208] rounded-2xl p-4 md:p-6 border border-emerald-500/35 shadow-[0_16px_48px_rgba(0,0,0,0.65)] overflow-hidden relative">
      {/* Vertical Grass Turf Stripes (Requirement 7) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.15)_50%)] bg-[size:10%_100%]" />
      
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

          {/* AI Pitch Slots - Restored horizontal alignment (Faced-down / hidden at the top) */}
          <div className="grid grid-cols-5 gap-1 md:gap-3 justify-items-center bg-black/35 p-2 md:p-3 rounded-xl border border-rose-500/15 shadow-inner overflow-hidden mb-3">
            {aiSlots.map((_, idx) => renderAiSlot(idx, true))}
          </div>

          {/* Symmetrical Opponent Status Bar (Locked indicator) */}
          <div className="w-full bg-rose-950/20 border border-rose-500/10 rounded-xl p-2.5 flex flex-col xs:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs">🤖</span>
              <span className="text-[10px] md:text-xs text-rose-300 font-bold">كروت ومجموعات المنافس</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md text-[9px] font-mono border border-white/5">
                <span className="text-rose-400">👝</span>
                <span className="text-white font-bold">{aiHandCount} باليد</span>
              </div>
              <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md text-[9px] font-mono border border-white/5">
                <span className="text-amber-400">🏃‍♂️</span>
                <span className="text-white font-bold">{playerDeckCount} الباقة</span>
              </div>
              <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md text-[9px] font-mono border border-white/5">
                <span className="text-teal-400">⚡</span>
                <span className="text-white font-bold">{specialDeckCount} كروت التكتيك</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Middle Pitch divider - Streamlined and narrow on mobile */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-x-0 h-[2px] bg-emerald-500/20" />
          <div className="z-10 bg-[#0c0e0c] border border-emerald-500/30 px-4 py-1 rounded-full text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            ⚙️ تكتيكات اللقاء الكروي ⚙️
          </div>
        </div>

        {/* 2. PLAYER HALF - YOU (COACH) */}
        <div>
          {/* Symmetrical Player Console */}
          <div className="w-full bg-[#121412]/95 border border-[#10b981]/30 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col gap-2 mb-4">
            <div className="flex items-center justify-between px-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] md:text-[11px] font-black text-emerald-400">لوحة التحكم التكتيكية للمدرب</span>
              </div>
              <span className="text-[8px] text-[#e0e0e0]/30 font-mono font-black">ACTIVE COACH UTILITIES</span>
            </div>
            
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
              {/* 1. Draw Player Button */}
              <button
                type="button"
                onClick={() => onDrawCard && onDrawCard("player")}
                disabled={playerDeckCount === 0 || (phase !== "player_turn" && phase !== "warmup") || cardsDrawnThisTurn >= 2}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  (phase === "warmup" && playerSlots.filter(s => s.card !== null).length < 5) || (phase === "player_turn" && cardsDrawnThisTurn < 2)
                    ? "border-emerald-500 bg-emerald-950/40 text-emerald-400 ring-2 ring-emerald-500/30 animate-pulse"
                    : "border-white/5 bg-black/40 text-slate-400 hover:border-white/10 hover:text-white"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                id="board_draw_player_widget"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">🏃‍♂️</span>
                  <span className="font-bold text-[10px] md:text-xs">سحب كارت لاعب</span>
                </div>
                <span className="text-[8px] font-mono opacity-60">الباقي: {playerDeckCount}</span>
              </button>

              {/* 2. Draw Special Button */}
              <button
                type="button"
                onClick={() => onDrawCard && onDrawCard("special")}
                disabled={specialDeckCount === 0 || phase === "warmup" || phase !== "player_turn" || cardsDrawnThisTurn >= 2}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  (phase === "player_turn" && cardsDrawnThisTurn < 2)
                    ? "border-teal-500 bg-teal-950/40 text-teal-400 hover:border-teal-400"
                    : "border-white/5 bg-black/40 text-slate-400 hover:border-white/10 hover:text-white"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                id="board_draw_special_widget"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">⚡</span>
                  <span className="font-bold text-[10px] md:text-xs">سحب كارت تكتيك</span>
                </div>
                <span className="text-[8px] font-mono opacity-60">الباقي: {specialDeckCount}</span>
              </button>

              {/* 3. Open Hand Button */}
              <button
                type="button"
                onClick={() => setIsHandExpanded && setIsHandExpanded(!isHandExpanded)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isHandExpanded
                    ? "border-amber-500 bg-amber-950/40 text-amber-400 ring-2 ring-amber-500/30"
                    : "border-white/5 bg-black/40 text-slate-400 hover:border-white/10 hover:text-white"
                }`}
                id="board_toggle_hand_widget"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">👝</span>
                  <span className="font-bold text-[10px] md:text-xs">حقيبة اللعب اليدوية</span>
                </div>
                <span className="text-[8px] font-mono opacity-60">{isHandExpanded ? "إخفاء الحقيبة" : "فتح الكروت بيدك"}</span>
              </button>

              {/* 4. Peek Pitch Cards Button */}
              <button
                type="button"
                onClick={() => setIsPeekMode(!isPeekMode)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isPeekMode
                    ? "border-purple-500 bg-purple-950/40 text-purple-400 ring-2 ring-purple-500/30"
                    : "border-white/5 bg-black/40 text-slate-400 hover:border-white/10 hover:text-white"
                }`}
                id="board_preview_peek_widget"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">👁️</span>
                  <span className="font-bold text-[10px] md:text-xs">معاينة خطتك سرياً</span>
                </div>
                <span className="text-[8px] font-mono opacity-60">{isPeekMode ? "إيقاف المعاينة" : "رؤية خصائص كروتك"}</span>
              </button>
            </div>
          </div>

          {/* Player Pitch Slots - Horizontal Side-by-Side row alignment (Requirement 1) */}
          <div className="grid grid-cols-5 gap-1 md:gap-3 justify-items-center bg-emerald-950/10 p-2 md:p-3 rounded-xl border border-emerald-500/10 shadow-inner overflow-hidden">
            {playerSlots.map((_, idx) => renderPlayerSlot(idx, true))}
          </div>
        </div>

      </div>
    </div>
  );
}
