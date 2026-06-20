/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Swords, Shield, RefreshCw, Sparkles, HelpCircle, Volume2, Gamepad2, Timer, AlertCircle } from "lucide-react";

import { 
  Card, PlayerCard, SpecialCard, BoosterCard, GamePhase, ActionLog, Coach, GameState, CardAbilityTriggerType 
} from "../types";
import { 
  generatePlayerDeck, generateSpecialDeck, generateBoosterDeck,
  generateDeckFromPool, generateSpecialDeckFromPool, INITIAL_SPECIAL_CARDS,
  generateUniqueDecks, generateUniquePlayerDecks
} from "../cardsData";
import { getCardsForGame, getSpecialCardsForGame, getMockPlayerCards, getMockSpecialCards } from "../admin/adminStore";
import { SoundEffects } from "../utils/sounds";
import Confetti from "./Confetti";

import WelcomeMenu from "./WelcomeMenu";
import Multilobby from "./Multilobby";
import { supabaseService, MatchRoom, isSupabaseConfigured, supabase } from "../lib/supabase";
import { gameAuth } from "../lib/gameAuth";
import GameTutorialPanel from "./GameTutorialPanel";
import TacticalPitch from "./TacticalPitch";
import GameCard from "./GameCard";
import CoachHand from "./CoachHand";
import ActionTickerLog from "./ActionTickerLog";
import ActionDashboard from "./ActionDashboard";
import DrawDecksDashboard from "./DrawDecksDashboard";
import TopScoreHeader from "./TopScoreHeader";
import CardInspectorModal from "./CardInspectorModal";
import GameOverScreen from "./GameOverScreen";

// Helper to format timestamps 
import { getRandom } from "../utils/random";
import {
  goalTitles,
  goalDescriptions,
  defenseTitles,
  defenseDescriptions,
  stadiumPhrases
} from "../utils/commentaryPhrases";

// Structured log parser for Goal & Block calculation details
const parseDetailedLog = (text: string) => {
  const lines = text.split("\n").map(l => l.trim());
  
  // Stadium line starts with 🏟️
  const stadium = lines.find(l => l.startsWith("🏟️")) || "";
  
  // Title starts with ⚽️ or 🛡️ or 🚫 or 🧤
  const title = lines.find(l => l.startsWith("⚽️") || l.startsWith("🛡️") || l.startsWith("🚫") || l.startsWith("🧤")) || "";
  
  // Status line starts with 👉
  const statusLine = lines.find(l => l.startsWith("👉")) || "";
  const statusText = statusLine.replace("👉", "").trim();
  
  // Find total values
  const attackTotalLine = lines.find(l => l.includes("قوة الهجوم الإجمالية")) || "";
  const defenseTotalLine = lines.find(l => l.includes("قوة الدفاع الإجمالية")) || "";
  
  // Extract numbers from totals
  let attackVal = attackTotalLine.match(/\d+/)?.[0] || "";
  let defenseVal = defenseTotalLine.match(/\d+/)?.[0] || "";

  // Fallback: if totals are not in their standard lines, try to find them in the title line
  if (!attackVal || !defenseVal) {
    const comparisonLine = lines.find(l => l.includes("دفاع الخصم") || l.includes("دفاعك") || l.includes("هجومك") || l.includes("هجوم الخصم")) || "";
    if (comparisonLine) {
      const defMatch = comparisonLine.match(/(?:دفاع الخصم|دفاعك)\s*\(?(\d+)\)?/);
      const attMatch = comparisonLine.match(/(?:هجومك|هجوم الخصم)\s*\(?(\d+)\)?/);
      if (defMatch) {
        defenseVal = defenseVal || defMatch[1];
      }
      if (attMatch) {
        attackVal = attackVal || attMatch[1];
      }
    }
  }

  attackVal = attackVal || "0";
  defenseVal = defenseVal || "0";
  
  // Extract breakdown sections
  let attackBreakdown: string[] = [];
  let defenseBreakdown: string[] = [];
  
  let currentSection: "none" | "attack" | "defense" = "none";
  
  for (const line of lines) {
    if (line.includes("[قوة الهجوم ⚔️]:")) {
      currentSection = "attack";
      continue;
    }
    if (line.includes("[قوة الدفاع 🛡️]:")) {
      currentSection = "defense";
      continue;
    }
    if (line.startsWith("----------------") && currentSection === "defense") {
      currentSection = "none";
      continue;
    }
    
    if (currentSection === "attack") {
      if (line && !line.startsWith("----------------") && !line.includes("[قوة")) {
        attackBreakdown.push(line.replace(/^●\s*/, "").trim());
      }
    } else if (currentSection === "defense") {
      if (line && !line.startsWith("----------------") && !line.includes("[قوة")) {
        defenseBreakdown.push(line.replace(/^●\s*/, "").trim());
      }
    }
  }
  
  const scoreLine = lines.find(l => l.startsWith("🏆") || l.startsWith("🚫") || l.includes("النتيجة")) || "";
  
  // Find atmospheric description (usually line 3 or 4, not stadium, title, status, or math sections)
  const description = lines.find(l => 
    l && 
    !l.startsWith("🏟️") && 
    !l.startsWith("⚽️") && 
    !l.startsWith("🛡️") && 
    !l.startsWith("👉") && 
    !l.startsWith("---") && 
    !l.includes("الإجمالية") && 
    !l.includes("تفاصيل") && 
    !l.includes("[قوة") && 
    !l.startsWith("●") && 
    !l.startsWith("🏆") && 
    !l.startsWith("🚫")
  ) || "";

  return {
    stadium,
    title,
    description,
    statusText,
    attackVal,
    defenseVal,
    attackBreakdown,
    defenseBreakdown,
    scoreText: scoreLine.replace(/🏆|🚫/, "").trim()
  };
};

const renderDetailedLog = (log: { id: string; timestamp: string; text: string; type: string }) => {
  const parsed = parseDetailedLog(log.text);
  const isGoal = log.text.includes("⚽️") || log.text.includes("جــوووول");
  
  return (
    <div 
      key={log.id} 
      className="bg-black/60 border border-white/10 rounded-lg p-1.5 flex flex-col gap-1.5 text-right text-[8.5px] font-sans text-slate-200 shadow-inner"
      dir="rtl"
    >
      {/* Stadium Info */}
      {parsed.stadium && (
        <div className="flex items-center justify-end text-[7.5px] text-slate-400 border-b border-white/5 pb-0.5">
          <span className="text-teal-400 font-bold">{parsed.stadium}</span>
        </div>
      )}

      {/* Commentary Title & Description */}
      <div className="flex flex-col gap-0.5">
        {parsed.title && <div className="font-extrabold text-white text-[9.5px]">{parsed.title}</div>}
        {parsed.description && <div className="text-slate-400 italic font-medium text-[8px]">{parsed.description}</div>}
      </div>

      {/* Status banner */}
      {parsed.statusText && (
        <div className={`p-1 rounded text-[9px] font-bold leading-normal ${
          isGoal ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/20" : "bg-blue-950/50 text-blue-300 border border-blue-500/20"
        }`}>
          👉 {parsed.statusText}
        </div>
      )}

      {/* Versus Comparison Bar */}
      <div className="grid grid-cols-2 gap-1 bg-black/35 p-0.5 rounded border border-white/5 text-[8px] font-bold text-center">
        <div className="flex items-center justify-center gap-1 border-l border-white/5">
          <span className="text-red-400">⚔️ الهجوم:</span>
          <span className="font-mono text-[9px] text-white bg-red-950 px-1 rounded font-black">{parsed.attackVal}</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-blue-400">🛡️ الدفاع:</span>
          <span className="font-mono text-[9px] text-white bg-blue-950 px-1 rounded font-black">{parsed.defenseVal}</span>
        </div>
      </div>

      {/* Technical Breakdown */}
      <div className="flex flex-col gap-1 border-t border-white/5 pt-1">
        {/* Attack detail */}
        {parsed.attackBreakdown.length > 0 && (
          <div className="flex flex-col gap-0.5 bg-red-950/10 p-1 rounded border border-red-500/10">
            <span className="text-[8px] text-red-300 font-bold mb-0.5 border-b border-red-500/10 pb-0.5 text-right">⚔️ تفاصيل الهجوم:</span>
            {parsed.attackBreakdown.map((line, i) => {
              const clean = line.replace(/^[●\s\-]+/, "").trim();
              if (!clean) return null;
              const isPlayer = /^[a-zA-Z].*?\(\d+\)/.test(clean);
              if (isPlayer) {
                const name = clean.replace(/\(\d+\)/, "").trim();
                const score = clean.match(/\(\d+\)/)?.[0].replace(/[()]/g, "") || "0";
                return (
                  <div key={i} className="flex items-center justify-between text-[8px]" dir="ltr">
                    <span className="text-slate-350 font-medium">{name}</span>
                    <span className="font-mono text-[8px] text-red-400 bg-red-950/50 px-1 rounded font-black">+{score}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="text-right text-[8px] text-amber-200/90 leading-normal" dir="rtl">
                  {clean}
                </div>
              );
            })}
          </div>
        )}

        {/* Defense detail */}
        {parsed.defenseBreakdown.length > 0 && (
          <div className="flex flex-col gap-0.5 bg-blue-950/10 p-1 rounded border border-blue-500/10">
            <span className="text-[8px] text-blue-300 font-bold mb-0.5 border-b border-blue-500/10 pb-0.5 text-right">🛡️ تفاصيل الدفاع:</span>
            {parsed.defenseBreakdown.map((line, i) => {
              const clean = line.replace(/^[●\s\-]+/, "").trim();
              if (!clean) return null;
              const isPlayer = /^[a-zA-Z].*?\(\d+\)/.test(clean);
              if (isPlayer) {
                const name = clean.replace(/\(\d+\)/, "").trim();
                const score = clean.match(/\(\d+\)/)?.[0].replace(/[()]/g, "") || "0";
                return (
                  <div key={i} className="flex items-center justify-between text-[8px]" dir="ltr">
                    <span className="text-slate-350 font-medium">{name}</span>
                    <span className="font-mono text-[8px] text-blue-400 bg-blue-950/50 px-1 rounded font-black">+{score}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="text-right text-[8px] text-amber-200/90 leading-normal" dir="rtl">
                  {clean}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Outcome Score Banner */}
      {parsed.scoreText && (
        <div className="bg-amber-950/35 border border-amber-500/20 rounded p-1 text-center font-black text-amber-300 text-[9px]">
          🏆 {parsed.scoreText}
        </div>
      )}
    </div>
  );
};

const groupLogsByTurns = (logsList: any[]) => {
  const groups: { title: string; type: "player" | "ai" | "system"; logs: any[] }[] = [];
  let currentGroup: { title: string; type: "player" | "ai" | "system"; logs: any[] } | null = null;

  logsList.forEach((log) => {
    const text = log.text;
    
    // Check if this log marks a turn transition
    const isPlayerTurnStart = text.includes("عدنا لدورك") || text.includes("متابعة دور الماتش");
    const isAiTurnStart = text.includes("ينتقل دور التوجيه واللعب للخصم");
    const isWarmupOrKickoff = text.includes("صافرة ركلة البداية") || text.includes("مرحلة التسخين");

    if (isPlayerTurnStart) {
      const turnMatch = text.match(/الدور\s*(\d+)/);
      const title = turnMatch ? `الدور التكتيكي الخاص بك (الدور ${turnMatch[1]})` : "دورتك التكتيكية الجديدة";
      currentGroup = { title, type: "player", logs: [log] };
      groups.push(currentGroup);
    } else if (isAiTurnStart) {
      currentGroup = { title: "دور المدرب الغريم (تكتيك روبوت)", type: "ai", logs: [log] };
      groups.push(currentGroup);
    } else if (isWarmupOrKickoff) {
      currentGroup = { title: "بداية اللقاء والتسخين", type: "system", logs: [log] };
      groups.push(currentGroup);
    } else {
      if (!currentGroup) {
        currentGroup = { title: "بداية اللعب", type: "system", logs: [] };
        groups.push(currentGroup);
      }
      currentGroup.logs.push(log);
    }
  });

  return groups;
};

const getFormattedTime = () => {
  const now = new Date();
  return now.toTimeString().split(" ")[0];
};

// Safe formatting of coach name without duplicating titles
const formatNameWithTitle = (name: string, defaultTitle: string = "الكابتن") => {
  const trimmed = name.trim();
  if (trimmed.includes("الكابتن") || trimmed.includes("المدرب")) {
    return trimmed;
  }
  return `${defaultTitle} ${trimmed}`;
};

const recycleCard = (card: PlayerCard): PlayerCard => ({
  ...card,
  id: `recycled_${card.id.split('_')[0] || 'card'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  frozen: false,
  stunned: false,
  silenced: false,
  frozenTurnsLeft: undefined,
  stunnedTurnsLeft: undefined,
  silencedTurnsLeft: undefined
});

const formatGoalLog = (
  isPlayerAttack: boolean,
  attackVal: number,
  defenseVal: number,
  attackBrk: string,
  defBrk: string,
  scoreText: string
) => {
  const title = getRandom(goalTitles);
  const description = getRandom(goalDescriptions);
  const stadium = getRandom(stadiumPhrases);
  const status = isPlayerAttack
    ? `نجح هجومك الشرس (${attackVal} ⚡) في اختراق دفاع الخصم (${defenseVal} 🧱)`
    : `اخترق هجوم الخصم (${attackVal} ⚡) خط دفاعك الصلد (${defenseVal} 🧱)`;
  
  return `${stadium}
${title}
${description}
👉 ${status}
----------------------------------
🔥 قوة الهجوم الإجمالية: ${attackVal} ⚡
🛡️ قوة الدفاع الإجمالية: ${defenseVal} 🧱

📊 تفاصيل الحسبة الفنية:
[قوة الهجوم ⚔️]:
${attackBrk}

[قوة الدفاع 🛡️]:
${defBrk || "   ● لا يوجد مدافعين نشطين (0)"}
----------------------------------
🏆 النتيجة الحالية: ${scoreText}`;
};

const formatBlockLog = (
  isPlayerAttack: boolean,
  attackVal: number,
  defenseVal: number,
  attackBrk: string,
  defBrk: string,
  scoreText: string
) => {
  const title = getRandom(defenseTitles);
  const description = getRandom(defenseDescriptions);
  const stadium = getRandom(stadiumPhrases);
  const status = isPlayerAttack
    ? `تصدى جدار الخصم (${defenseVal} 🧱) لتسديدتك القوية (${attackVal} ⚡)`
    : `نجح جدارك الدفاعي (${defenseVal} 🧱) في إحباط غزو الخصم (${attackVal} ⚡)`;

  return `${stadium}
${title}
${description}
👉 ${status}
----------------------------------
🛡️ قوة الدفاع الإجمالية: ${defenseVal} 🧱
🔥 قوة الهجوم الإجمالية: ${attackVal} ⚡

📊 تفاصيل الحسبة الفنية:
[قوة الدفاع 🛡️]:
${defBrk || "   ● لا يوجد مدافعين نشطين (0)"}

[قوة الهجوم ⚔️]:
${attackBrk}
----------------------------------
🚫 النتيجة مستمرة: ${scoreText}`;
};

const getTeamFlagAndName = (vibe: string) => {
  const defaultFlag = "⚽";
  const defaultName = "راقصو التانغو";
  
  const mapping: Record<string, { flag: React.ReactNode, name: string }> = {
    "الفراعنة": {
      flag: <img src="https://flagcdn.com/w40/eg.png" className="w-4.5 h-3 object-cover rounded-xs shadow-xs align-middle inline-block" alt="EG" />,
      name: "الفراعنة"
    },
    "أسود الأطلس": {
      flag: <img src="https://flagcdn.com/w40/ma.png" className="w-4.5 h-3 object-cover rounded-xs shadow-xs align-middle inline-block" alt="MA" />,
      name: "أسود الأطلس"
    },
    "نجوم السامبا": {
      flag: <img src="https://flagcdn.com/w40/br.png" className="w-4.5 h-3 object-cover rounded-xs shadow-xs align-middle inline-block" alt="BR" />,
      name: "نجوم السامبا"
    },
    "راقصو التانغو": {
      flag: <img src="https://flagcdn.com/w40/ar.png" className="w-4.5 h-3 object-cover rounded-xs shadow-xs align-middle inline-block" alt="AR" />,
      name: "راقصو التانغو"
    },
    "كتائب الأخضر": {
      flag: <img src="https://flagcdn.com/w40/sa.png" className="w-4.5 h-3 object-cover rounded-xs shadow-xs align-middle inline-block" alt="SA" />,
      name: "كتائب الأخضر"
    },
    "الملكي": {
      flag: <span className="leading-none text-[10px] md:text-xs">👑</span>,
      name: "الملكي"
    }
  };

  return mapping[vibe] || { flag: <span className="leading-none text-[10px] md:text-xs">{defaultFlag}</span>, name: vibe || defaultName };
};

const maskCardIfHidden = (card: Card | null, isRevealed: boolean): Card | null => {
  if (!card) return null;
  if (isRevealed) return card;
  return {
    id: card.id,
    type: card.type,
    name: "مجهول",
    avatar: "👤",
    description: "",
    rarity: "common",
    isLegend: false,
    frozen: (card as any).frozen,
    stunned: (card as any).stunned,
    silenced: (card as any).silenced,
  } as any;
};

interface GameOnlineProps {
  config: {
    room: MatchRoom;
    role: "host" | "opponent";
  };
  onReturnToMenu: () => void;
}

export default function GameOnline({ config, onReturnToMenu }: GameOnlineProps) {
  const currentUser = gameAuth.getCurrentUser();
  const defaultSettings = currentUser?.default_match_settings;

  // Helper to safely fetch card name, hiding it if it's a face-down player card
  const getSafeCardName = (card: Card | null | undefined, isPlayerOwned: boolean): string => {
    if (!card) return "";
    if (card.type === "special") {
      return card.name;
    }
    const slots = isPlayerOwned ? playerSlots : aiSlots;
    const slot = slots.find((s) => s.card && s.card.id === card.id);
    if (slot && slot.isRevealed) {
      return card.name;
    }
    const isLegend = (card as PlayerCard).isLegend;
    if (isPlayerOwned) {
      return isLegend ? "لاعبك الأسطوري" : "لاعبك";
    } else {
      return isLegend ? "نجم الخصم الأسطوري" : "لاعب الخصم";
    }
  };

  // Helper to generate detailed calculation breakdown
  const getDetailedCalculation = (
    isPlayerSide: boolean,
    isAttackingStage: boolean,
    attackerIdx: number | null,
    activeBooster: BoosterCard | null,
    playerActiveSpecialsList: SpecialCard[],
    aiActiveSpecialsList: SpecialCard[],
    playerSlotsOverride?: typeof playerSlots,
    aiSlotsOverride?: typeof aiSlots
  ): { total: number; breakdown: string } => {
    let baseScore = 0;
    const slots = playerSlotsOverride && aiSlotsOverride 
      ? (isPlayerSide ? playerSlotsOverride : aiSlotsOverride)
      : (isPlayerSide ? playerSlots : aiSlots);

    const playerList: string[] = [];
    slots.forEach((slot) => {
      if (slot.card && slot.isRevealed && slot.revealedInAttack) {
        if (slot.card.frozen || slot.card.stunned) {
          playerList.push(`   ● ${slot.card.name} (0 [مستبعد - تجميد/صدمة])`);
          return;
        }
        const val = isAttackingStage ? slot.card.attack : slot.card.defense;
        baseScore += val;
        playerList.push(`   ● ${slot.card.name} (${val})`);
      }
    });

    let boosterVal = 0;
    let boosterText = "";
    if (isAttackingStage && activeBooster && isPlayerSide === isPlayerAttacker) {
      baseScore += activeBooster.value;
      boosterVal = activeBooster.value;
      boosterText = activeBooster.text;
    }

    const activeSources: { card: Card; isPlayerOwned: boolean }[] = [];
    const activePlayerSlots = playerSlotsOverride || playerSlots;
    const activeAiSlots = aiSlotsOverride || aiSlots;
    
    activePlayerSlots.forEach((slot) => {
      if (slot.card && slot.isRevealed) {
        activeSources.push({ card: slot.card, isPlayerOwned: true });
      }
    });
    activeAiSlots.forEach((slot) => {
      if (slot.card && slot.isRevealed) {
        activeSources.push({ card: slot.card, isPlayerOwned: false });
      }
    });
    playerActiveSpecialsList.forEach((spec) => {
      activeSources.push({ card: spec, isPlayerOwned: true });
    });
    aiActiveSpecialsList.forEach((spec) => {
      activeSources.push({ card: spec, isPlayerOwned: false });
    });

    let modifiers = 0;
    let multiplier = 1;
    let cancelStrongestAttacker = false;

    const multiplierLogs: string[] = [];
    const modifierLogs: string[] = [];

    activeSources.forEach((src) => {
      const { card, isPlayerOwned } = src;

      if (card.ability) {
        const opponentActiveSpecials = isPlayerOwned ? aiActiveSpecialsList : playerActiveSpecialsList;
        const opponentSlots = isPlayerOwned 
          ? (aiSlotsOverride || aiSlots) 
          : (playerSlotsOverride || playerSlots);
        const isAbilityBlocked = opponentActiveSpecials.some(c => c.ability?.actions.some(a => a.type === "BlockAbility")) ||
                                  opponentSlots.some(s => s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions.some(a => a.type === "BlockAbility"));

        const isSilenced = (card as any).silenced || (card as any).abilityBlocked || isAbilityBlocked;
        if (isSilenced) return;

        const ability = card.ability;
        const triggerMatches = 
          ((ability.trigger === "CardRevealed" || ability.trigger === "CardPlayed") && card.type === "player") ||
          (ability.trigger === "CardPlayed" && card.type === "special") ||
          (ability.trigger === "AttackStarted" && isAttackingStage) ||
          (ability.trigger === "DefenseStarted" && !isAttackingStage);

        if (triggerMatches) {
          let conditionsMet = true;
          if (ability.conditions) {
            ability.conditions.forEach((cond) => {
              if (cond.type === "IsAttacker") {
                const isOwnerAttacking = isPlayerOwned === isPlayerAttacker;
                if (!isOwnerAttacking) conditionsMet = false;
              }
              if (cond.type === "IsDefender") {
                const isOwnerDefending = isPlayerOwned !== isPlayerAttacker;
                if (!isOwnerDefending) conditionsMet = false;
              }
              if (cond.type === "CardOwnerIsEnemy") {
                if (isPlayerOwned === isPlayerSide) conditionsMet = false;
              }
              if (cond.type === "IsLegend") {
                if (card.type === "player" && !(card as PlayerCard).isLegend) {
                  conditionsMet = false;
                }
              }
            });
          }

          if (conditionsMet && ability.actions) {
            ability.actions.forEach((act) => {
              const isCurrentAttackTarget = act.target === "CurrentAttack" && isAttackingStage;
              const isCurrentDefenseTarget = act.target === "CurrentDefense" && !isAttackingStage;

              const isTargetSide = (act.target === "Allies" && isPlayerOwned === isPlayerSide) ||
                                   (act.target === "Enemies" && isPlayerOwned !== isPlayerSide) ||
                                   isCurrentAttackTarget ||
                                   isCurrentDefenseTarget ||
                                   (act.target === "Self" && card === src.card && isPlayerOwned === isPlayerSide);

              if (isTargetSide) {
                if (act.type === "AddStat") {
                  if (act.stat === "attack" && isAttackingStage) {
                    modifiers += act.value ?? 0;
                    modifierLogs.push(`   ● قدرة [${card.name}]: +${act.value} قوة هجوم`);
                  }
                  if (act.stat === "defense" && !isAttackingStage) {
                    modifiers += act.value ?? 0;
                    modifierLogs.push(`   ● قدرة [${card.name}]: +${act.value} قوة دفاع`);
                  }
                } else if (act.type === "RemoveStat") {
                  if (act.stat === "attack" && isAttackingStage) {
                    modifiers -= act.value ?? 0;
                    modifierLogs.push(`   ● قدرة [${card.name}]: -${act.value} قوة هجوم`);
                  }
                  if (act.stat === "defense" && !isAttackingStage) {
                    modifiers -= act.value ?? 0;
                    modifierLogs.push(`   ● قدرة [${card.name}]: -${act.value} قوة دفاع`);
                  }
                } else if (act.type === "MultiplyStat") {
                  if (act.stat === "attack" && isAttackingStage) {
                    multiplier *= act.value ?? 1;
                    multiplierLogs.push(`   ● مضاعفة [${card.name}]: ×${act.value}`);
                  }
                  if (act.stat === "defense" && !isAttackingStage) {
                    multiplier *= act.value ?? 1;
                    multiplierLogs.push(`   ● مضاعفة [${card.name}]: ×${act.value}`);
                  }
                } else if (act.type === "CancelAction" && isAttackingStage) {
                  cancelStrongestAttacker = true;
                }
              }
            });
          }
        }
      } else if (card.type === "special") {
        const spec = card as SpecialCard;
        if (isAttackingStage) {
          if (isPlayerOwned === isPlayerAttacker) {
            if (spec.effect === "counter_attack" && isPlayerSide === isPlayerAttacker) {
              modifiers += 4;
              modifierLogs.push(`   ● تكتيك [${spec.name}]: +4 قوة هجمة مرتدة`);
            }
            if (spec.effect === "fans" && isPlayerSide === isPlayerAttacker) {
              modifiers += 3;
              modifierLogs.push(`   ● تكتيك [${spec.name}]: +3 دعم جماهيري`);
            }
          } else {
            if (spec.effect === "wet_pitch" && isPlayerSide === isPlayerAttacker) {
              modifiers -= 4;
              modifierLogs.push(`   ● تكتيك [${spec.name}]: -4 عشب مبلل`);
            }
            if (spec.effect === "offside" && isPlayerSide === isPlayerAttacker) {
              cancelStrongestAttacker = true;
            }
          }
        } else {
          if (isPlayerOwned !== isPlayerAttacker) {
            if (spec.effect === "park_the_bus" && isPlayerSide !== isPlayerAttacker) {
              modifiers += 6;
              modifierLogs.push(`   ● تكتيك [${spec.name}]: +6 ركن الحافلة`);
            }
            if (spec.effect === "fans" && isPlayerSide !== isPlayerAttacker) {
              modifiers += 3;
              modifierLogs.push(`   ● تكتيك [${spec.name}]: +3 دعم جماهيري`);
            }
          }
        }
      }
    });

    let scoreAfterMultiplier = baseScore * multiplier;
    let finalVal = scoreAfterMultiplier + modifiers;
    
    let cancelledCardText = "";
    if (isAttackingStage && cancelStrongestAttacker) {
      let maxAttStrength = 0;
      let maxCardName = "";
      slots.forEach((s) => {
        if (s.card && s.isRevealed && s.revealedInAttack) {
          if (s.card.attack > maxAttStrength) {
            maxAttStrength = s.card.attack;
            maxCardName = s.card.name;
          }
        }
      });
      finalVal -= maxAttStrength;
      if (maxCardName) {
        cancelledCardText = `   ● تسلل نشط: إلغاء نقاط أقوى مهاجم [${maxCardName}] (-${maxAttStrength})`;
      }
    }

    const totalVal = Math.max(0, finalVal);

    const lines: string[] = [];
    if (playerList.length > 0) {
      lines.push(...playerList);
    } else {
      lines.push(`   ● لا يوجد لاعبين نشطين (0)`);
    }

    if (boosterVal > 0) {
      lines.push(`   ● كارت المعزز: +${boosterVal} [${boosterText}]`);
    }

    if (multiplierLogs.length > 0) {
      lines.push(...multiplierLogs);
    }

    if (modifierLogs.length > 0) {
      lines.push(...modifierLogs);
    }

    if (cancelledCardText) {
      lines.push(cancelledCardText);
    }

    const detailString = lines.join("\n");

    return {
      total: totalVal,
      breakdown: detailString
    };
  };

  const isSpecialCardsBlocked = (isPlayerOwned: boolean) => {
    const opponentActiveSpecials = isPlayerOwned ? aiActiveSpecial : playerActiveSpecial;
    const opponentSlots = isPlayerOwned ? aiSlots : playerSlots;
    return opponentActiveSpecials.some(c => c.ability?.actions.some(a => a.type === "BlockSpecialCards")) ||
           opponentSlots.some(s => s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions.some(a => a.type === "BlockSpecialCards"));
  };

  const isAttackBlockedFor = (isPlayerSide: boolean) => {
    const opponentActiveSpecials = isPlayerSide ? aiActiveSpecial : playerActiveSpecial;
    const opponentSlots = isPlayerSide ? aiSlots : playerSlots;
    return opponentActiveSpecials.some(c => c.ability?.actions.some(a => a.type === "BlockAttack")) ||
           opponentSlots.some(s => s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions.some(a => a.type === "BlockAttack"));
  };

  const isDefenseBlockedFor = (isPlayerSide: boolean) => {
    const opponentActiveSpecials = isPlayerSide ? aiActiveSpecial : playerActiveSpecial;
    const opponentSlots = isPlayerSide ? aiSlots : playerSlots;
    return opponentActiveSpecials.some(c => c.ability?.actions.some(a => a.type === "BlockDefense")) ||
           opponentSlots.some(s => s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions.some(a => a.type === "BlockDefense"));
  };

  const triggerAttackStartedAbilities = (attackerSide: "player" | "ai") => {
    if (attackerSide === "player") {
      playerSlots.forEach((slot) => {
        if (slot.card && slot.isRevealed) {
          triggerCardInstantEffects(slot.card, true, "AttackStarted");
        }
      });
      aiSlots.forEach((slot) => {
        if (slot.card && slot.isRevealed) {
          triggerCardInstantEffects(slot.card, false, "DefenseStarted");
        }
      });
    } else {
      aiSlots.forEach((slot) => {
        if (slot.card && slot.isRevealed) {
          triggerCardInstantEffects(slot.card, false, "AttackStarted");
        }
      });
      playerSlots.forEach((slot) => {
        if (slot.card && slot.isRevealed) {
          triggerCardInstantEffects(slot.card, true, "DefenseStarted");
        }
      });
    }
  };

  const triggerCardDestroyedAbilities = (destroyedCard: PlayerCard, isPlayer: boolean) => {
    if (destroyedCard.ability?.trigger === "CardDestroyed") {
      triggerCardInstantEffects(destroyedCard, isPlayer, "CardDestroyed");
    }
    const mySlots = isPlayer ? playerSlots : aiSlots;
    mySlots.forEach((slot) => {
      if (slot.card && slot.card.id !== destroyedCard.id && slot.isRevealed) {
        if (slot.card.ability?.trigger === "CardDestroyed") {
          triggerCardInstantEffects(slot.card, isPlayer, "CardDestroyed");
        }
      }
    });
    const opponentSlots = isPlayer ? aiSlots : playerSlots;
    opponentSlots.forEach((slot) => {
      if (slot.card && slot.isRevealed) {
        if (slot.card.ability?.trigger === "CardDestroyed") {
          triggerCardInstantEffects(slot.card, !isPlayer, "CardDestroyed");
        }
      }
    });
  };

  // Static AI properties
  const aiCoachName = "المدرب الغريم (تكتيك روبوت)";
  const aiTeam = "كتائب الروبوت الذكية 🤖";
  const [maxDrawsPerTurn, setMaxDrawsPerTurn] = useState<number>(defaultSettings?.maxDrawsPerTurn ?? 2);
  const [defaultMaxDrawsPerTurn, setDefaultMaxDrawsPerTurn] = useState<number>(defaultSettings?.maxDrawsPerTurn ?? 2);
  const [maxMovesPerTurn, setMaxMovesPerTurn] = useState<number>(defaultSettings?.maxMovesPerTurn ?? 3);
  const [defenseDrawsLimit, setDefenseDrawsLimit] = useState<number>(defaultSettings?.maxDrawsPerTurn ? defaultSettings.maxDrawsPerTurn + 1 : 3);
  const [legendBurnLimit, setLegendBurnLimit] = useState<number>(defaultSettings?.legendBurnLimit ?? 2);
  const [initialCardsCount, setInitialCardsCount] = useState<number>(defaultSettings?.initialCardsCount ?? 5);

  // Mobile & Orientation state
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isLockedLandscape, setIsLockedLandscape] = useState(false);

  useEffect(() => {
    const checkLayout = () => {
      const touchCapable = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmall = window.innerWidth < 768 || window.innerHeight < 768;
      setIsMobile(touchCapable || isSmall);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkLayout();
    window.addEventListener("resize", checkLayout);
    window.addEventListener("orientationchange", checkLayout);

    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener("change", checkLayout);
    }

    return () => {
      window.removeEventListener("resize", checkLayout);
      window.removeEventListener("orientationchange", checkLayout);
      if (window.screen && window.screen.orientation) {
        window.screen.orientation.removeEventListener("change", checkLayout);
      }
    };
  }, []);

  const isMobileLandscape = isMobile && (isPortrait || window.innerHeight < 520);
  const isRotated = isMobile && isPortrait && !isLockedLandscape;

  // Request fullscreen and orientation lock on any click/touch anywhere from the beginning
  useEffect(() => {
    const handleFirstInteraction = () => {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen()
          .then(() => {
            const screenOrientation = window.screen && (window.screen.orientation as any);
            if (screenOrientation && screenOrientation.lock) {
              screenOrientation.lock("landscape")
                .then(() => {
                  setIsLockedLandscape(true);
                })
                .catch((err: any) => {
                  console.warn("Orientation lock on first interaction failed:", err);
                });
            }
          })
          .catch((err) => {
            console.warn("Fullscreen request on first interaction failed:", err);
          });
      }
      // Clean up after first interaction
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // Lock html/body overflow to prevent double scrollbars / elastic bounce
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.margin = "";
      document.body.style.padding = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, []);

  // Lobby section tab
  const [menuTab, setMenuTab] = useState<"solo" | "multi">("solo");

  // Multiplayer states
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [multiplayerRole, setMultiplayerRole] = useState<"host" | "opponent" | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState("الخصم التكتيكي أونلاين 🌐");
  const [opponentVibe, setOpponentVibe] = useState("الملكي");
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [otherConfirmed, setOtherConfirmed] = useState(false);
  const [attackerRole, setAttackerRole] = useState<"host" | "opponent" | null>(null);

  // Main Game state variables
  const [phase, setPhase] = useState<GamePhase>("menu");
  const phaseRef = useRef<GamePhase>("menu");
  const isResolvingRef = useRef<boolean>(false);
  const isAIExecutingRef = useRef<boolean>(false);
  const opponentLastActiveRef = useRef<number>(Date.now() + 10000);

  // Keep phaseRef synchronized with state phase
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const [coachName, setCoachName] = useState(currentUser?.name || "");
  const [teamVibe, setTeamVibe] = useState(currentUser?.team_name || "");
  const [difficulty, setDifficulty] = useState<"normal" | "tactical" | "legend">(defaultSettings?.difficulty || "normal");

  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  // Decks
  const [playerDeck, setPlayerDeck] = useState<PlayerCard[]>([]);
  const [aiDeck, setAiDeck] = useState<PlayerCard[]>([]);

  const recyclePlayerCard = (card: PlayerCard) => {
    triggerCardDestroyedAbilities(card, true);
    const cleaned: PlayerCard = {
      ...card,
      id: `recycled_${card.id.split('_')[0] || 'card'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      frozen: false,
      stunned: false,
      silenced: false,
      frozenTurnsLeft: undefined,
      stunnedTurnsLeft: undefined,
      silencedTurnsLeft: undefined
    };
    setPlayerDeck((prev) => [...prev, cleaned]);
  };

  const recycleAiCard = (card: PlayerCard) => {
    triggerCardDestroyedAbilities(card, false);
    const cleaned: PlayerCard = {
      ...card,
      id: `recycled_${card.id.split('_')[0] || 'card'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      frozen: false,
      stunned: false,
      silenced: false,
      frozenTurnsLeft: undefined,
      stunnedTurnsLeft: undefined,
      silencedTurnsLeft: undefined
    };
    setAiDeck((prev) => [...prev, cleaned]);
  };
  const [specialDeck, setSpecialDeck] = useState<SpecialCard[]>([]);
  const [boosterDeck, setBoosterDeck] = useState<BoosterCard[]>([]);
  const [maxBonusValue, setMaxBonusValue] = useState<number>(10);
  const [legendPercentage, setLegendPercentage] = useState<number>(30);
  const [warmupTimeLimit, setWarmupTimeLimit] = useState<number>(30);
  const [warmupTimeLeft, setWarmupTimeLeft] = useState<number>(30);

  // Coaches pitch slots (exactly 5 slots)
  const [playerSlots, setPlayerSlots] = useState<{ card: PlayerCard | null; isRevealed: boolean; spent?: boolean; revealedInAttack?: boolean; confirmedInAttack?: boolean }[]>(
    Array(5).fill(null).map(() => ({ card: null, isRevealed: false }))
  );
  const [aiSlots, setAiSlots] = useState<{ card: PlayerCard | null; isRevealed: boolean; spent?: boolean; revealedInAttack?: boolean; confirmedInAttack?: boolean }[]>(
    Array(5).fill(null).map(() => ({ card: null, isRevealed: false }))
  );

  // Hands
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);

  // Turn tracking
  const [playerMovesLeft, setPlayerMovesLeft] = useState(3);
  const [aiMovesLeft, setAiMovesLeft] = useState(3);
  const [cardsDrawnThisTurn, setCardsDrawnThisTurn] = useState(0);
  const [aiCardsDrawnThisTurn, setAiCardsDrawnThisTurn] = useState(0);
  const [turnCount, setTurnCount] = useState(1);

  // Selection states
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [burningCardIds, setBurningCardIds] = useState<string[]>([]);
  const [selectedPitchSlotIdx, setSelectedPitchSlotIdx] = useState<number | null>(null);

  // Active Attack States
  const [currentAttackerIdx, setCurrentAttackerIdx] = useState<number | null>(null);
  const [currentBooster, setCurrentBooster] = useState<BoosterCard | null>(null);
  // Special tactical buffs applied specifically to current action
  const [playerActiveSpecial, setPlayerActiveSpecial] = useState<SpecialCard[]>([]);
  const [aiActiveSpecial, setAiActiveSpecial] = useState<SpecialCard[]>([]);

  // Defense moves left counter (for resolving of other turns)
  const [defenseMovesLeft, setDefenseMovesLeft] = useState(3);
  const [isShotDeclared, setIsShotDeclared] = useState(false);
  const [isPlayerAttacker, setIsPlayerAttacker] = useState<boolean>(true);
  const [isAttackBlocked, setIsAttackBlocked] = useState<boolean>(false);
  const [hasScoredThisTurn, setHasScoredThisTurn] = useState<boolean>(false);

  // Lists of logs
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [tempPhaseLogs, setTempPhaseLogs] = useState<ActionLog[]>([]);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Goal explosion cinematic state
  const [celebrationMessage, setCelebrationMessage] = useState<{ title: string; subtitle: string; isGoal: boolean } | null>(null);
  const [activeTargetingCard, setActiveTargetingCard] = useState<SpecialCard | null>(null);
  const [screenShaken, setScreenShaken] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const triggerScreenShake = () => {
    setScreenShaken(true);
    setTimeout(() => {
      setScreenShaken(false);
    }, 450);
  };

  const [matchRounds, setMatchRounds] = useState<any[]>([]);
  const [cinematicEvent, setCinematicEvent] = useState<{
    type: "tactical" | "ability" | "flip" | "goal" | "block";
    title: string;
    subtitle: string;
    cardName?: string;
    cardIcon?: string;
    isLegend?: boolean;
  } | null>(null);
  
  // Match countdown timer
  const [matchTime, setMatchTime] = useState<number>(defaultSettings?.matchDuration ?? 180);
  const [initialMatchTime, setInitialMatchTime] = useState<number>(defaultSettings?.matchDuration ?? 180);
  const [gameMode, setGameMode] = useState<"time" | "rounds">(defaultSettings?.gameMode ?? "time");
  const [winningGoals, setWinningGoals] = useState<number>(defaultSettings?.winningGoals ?? 5);
  const [totalRounds, setTotalRounds] = useState<number>(defaultSettings?.totalRounds ?? 10);
  const [halfTimeBreakDuration, setHalfTimeBreakDuration] = useState<number>(defaultSettings?.halfTimeBreakDuration ?? 30);
  const [completedRounds, setCompletedRounds] = useState<number>(0);
  const [firstHalfKickoffRole, setFirstHalfKickoffRole] = useState<"player" | "ai">("player");
  const [secondHalfKickoffRole, setSecondHalfKickoffRole] = useState<"player" | "ai">("ai");
  const [matchHalf, setMatchHalf] = useState<1 | 2>(1);
  const [isHalfTimeBreak, setIsHalfTimeBreak] = useState<boolean>(false);
  const [halfTimeBreakLeft, setHalfTimeBreakLeft] = useState<number>(0);
  const [turnTimeLimit, setTurnTimeLimit] = useState<number>(0);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(0);

  // Lifted state to control hand bag openness
  const [isHandExpanded, setIsHandExpanded] = useState<boolean>(false);

  // Package Loading States
  const [isGameLoading, setIsGameLoading] = useState<boolean>(false);
  const [gameLoadError, setGameLoadError] = useState<string | null>(null);

  // Zooms and inspects selected card detailed stats
  const [inspectedCard, setInspectedCard] = useState<Card | null>(null);
  
  // Ripple waves for action click triggers
  const [btnRipples, setBtnRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const latestStateRef = useRef<any>({});
  latestStateRef.current = {
    phase,
    playerSlots,
    aiSlots,
    playerHand,
    aiHand,
    playerScore,
    aiScore,
    playerMovesLeft,
    aiMovesLeft,
    logs,
    currentBooster,
    currentAttackerIdx,
    playerActiveSpecial,
    aiActiveSpecial,
    cardsDrawnThisTurn,
    turnCount,
    defenseMovesLeft,
    playerDeck,
    aiDeck,
    specialDeck,
    boosterDeck,
    attackerRole,
    isShotDeclared,
    gameMode,
    winningGoals,
    totalRounds,
    halfTimeBreakDuration,
    completedRounds,
    firstHalfKickoffRole,
    secondHalfKickoffRole,
    matchHalf,
    isHalfTimeBreak,
    halfTimeBreakLeft,
    matchTime,
    initialMatchTime,
  };

  const isReceivingUpdate = React.useRef(false);
  const pendingSyncOverrides = React.useRef<any>({});
  const syncTimeoutId = React.useRef<any>(null);
  const customLogContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customLogContainerRef.current) {
      customLogContainerRef.current.scrollTop = customLogContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Auto-dismiss celebration/event window after 3 seconds
  useEffect(() => {
    if (celebrationMessage) {
      const timer = setTimeout(() => {
        handleAcknowledgeResolution();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [celebrationMessage]);

  // Sync current local state to Supabase
  // Sync current local state to Supabase
  const syncToSupabaseInstance = async (
    overridePhaseOrOpts?: GamePhase | {
      phase?: GamePhase;
      playerSlots?: { card: PlayerCard | null; isRevealed: boolean }[];
      aiSlots?: { card: PlayerCard | null; isRevealed: boolean }[];
      playerHand?: Card[];
      aiHand?: Card[];
      playerScore?: number;
      aiScore?: number;
      playerMoves?: number;
      aiMoves?: number;
      logs?: ActionLog[];
      currentBooster?: BoosterCard | null;
      currentAttackIdx?: number | null;
      activeSpecialPlayer?: SpecialCard[];
      activeSpecialAi?: SpecialCard[];
      cardsDrawn?: number;
      turnCount?: number;
      defenseMoves?: number;
      playerDeck?: PlayerCard[];
      aiDeck?: PlayerCard[];
      specialDeck?: SpecialCard[];
      boosterDeck?: BoosterCard[];
      attackerRole?: "host" | "opponent" | null;
      isShotDeclared?: boolean;
      gameMode?: "time" | "rounds";
      winningGoals?: number;
      totalRounds?: number;
      halfTimeBreakDuration?: number;
      completedRounds?: number;
      firstHalfKickoffRole?: "player" | "ai";
      secondHalfKickoffRole?: "player" | "ai";
      matchHalf?: 1 | 2;
      isHalfTimeBreak?: boolean;
      halfTimeBreakLeft?: number;
      matchTime?: number;
      initialMatchTime?: number;
    },
    overridePlayerSlots?: { card: PlayerCard | null; isRevealed: boolean }[],
    overrideAiSlots?: { card: PlayerCard | null; isRevealed: boolean }[],
    overridePlayerHand?: Card[],
    overrideAiHand?: Card[],
    overridePlayerScore?: number,
    overrideAiScore?: number,
    overridePlayerMoves?: number,
    overrideAiMoves?: number,
    overrideLogs?: ActionLog[],
    overrideCurrentBooster?: BoosterCard | null,
    overrideCurrentAttackIdx?: number | null,
    overrideActiveSpecialPlayer?: SpecialCard[],
    overrideActiveSpecialAi?: SpecialCard[],
    overrideCardsDrawn?: number,
    overrideTurnCount?: number,
    overrideDefenseMoves?: number,
    overridePlayerDeck?: PlayerCard[],
    overrideAiDeck?: PlayerCard[],
    overrideSpecialDeck?: SpecialCard[],
    overrideBoosterDeck?: BoosterCard[],
    overrideAttackerRole?: "host" | "opponent" | null,
    overrideIsShotDeclared?: boolean,
    overrideGameMode?: "time" | "rounds",
    overrideWinningGoals?: number,
    overrideTotalRounds?: number,
    overrideHalfTimeBreakDuration?: number,
    overrideCompletedRounds?: number,
    overrideFirstHalfKickoffRole?: "player" | "ai",
    overrideSecondHalfKickoffRole?: "player" | "ai",
    overrideMatchHalf?: 1 | 2,
    overrideIsHalfTimeBreak?: boolean,
    overrideHalfTimeBreakLeft?: number,
    overrideMatchTime?: number,
    overrideInitialMatchTime?: number
  ) => {
    if (syncTimeoutId.current) {
      clearTimeout(syncTimeoutId.current);
      syncTimeoutId.current = null;
    }
    const accumulatedOverrides = { ...pendingSyncOverrides.current };
    pendingSyncOverrides.current = {};

    const state = latestStateRef.current;
    const resolvedRole = multiplayerRole;
    const resolvedRoomId = currentRoomId;
    if (!resolvedRoomId) return;

    const isOpts = typeof overridePhaseOrOpts === "object" && overridePhaseOrOpts !== null;
    const opts = isOpts ? (overridePhaseOrOpts as any) : {};
    const resolvedPhase = isOpts ? opts.phase : (overridePhaseOrOpts !== undefined ? overridePhaseOrOpts : undefined);

    const finalPhase = resolvedPhase !== undefined ? resolvedPhase : (accumulatedOverrides.phase !== undefined ? accumulatedOverrides.phase : state.phase);
    const resolvedPlayerSlots = overridePlayerSlots !== undefined ? overridePlayerSlots : (opts.playerSlots !== undefined ? opts.playerSlots : (accumulatedOverrides.playerSlots !== undefined ? accumulatedOverrides.playerSlots : state.playerSlots));
    const resolvedAiSlots = overrideAiSlots !== undefined ? overrideAiSlots : (opts.aiSlots !== undefined ? opts.aiSlots : (accumulatedOverrides.aiSlots !== undefined ? accumulatedOverrides.aiSlots : state.aiSlots));
    const resolvedPlayerHand = overridePlayerHand !== undefined ? overridePlayerHand : (opts.playerHand !== undefined ? opts.playerHand : (accumulatedOverrides.playerHand !== undefined ? accumulatedOverrides.playerHand : state.playerHand));
    const resolvedAiHand = overrideAiHand !== undefined ? overrideAiHand : (opts.aiHand !== undefined ? opts.aiHand : (accumulatedOverrides.aiHand !== undefined ? accumulatedOverrides.aiHand : state.aiHand));
    const resolvedPlayerScore = overridePlayerScore !== undefined ? overridePlayerScore : (opts.playerScore !== undefined ? opts.playerScore : (accumulatedOverrides.playerScore !== undefined ? accumulatedOverrides.playerScore : state.playerScore));
    const resolvedAiScore = overrideAiScore !== undefined ? overrideAiScore : (opts.aiScore !== undefined ? opts.aiScore : (accumulatedOverrides.aiScore !== undefined ? accumulatedOverrides.aiScore : state.aiScore));
    const resolvedPlayerMoves = overridePlayerMoves !== undefined ? overridePlayerMoves : (opts.playerMoves !== undefined ? opts.playerMoves : (accumulatedOverrides.playerMoves !== undefined ? accumulatedOverrides.playerMoves : state.playerMovesLeft));
    const resolvedAiMoves = overrideAiMoves !== undefined ? overrideAiMoves : (opts.aiMoves !== undefined ? opts.aiMoves : (accumulatedOverrides.aiMoves !== undefined ? accumulatedOverrides.aiMoves : state.aiMovesLeft));
    const resolvedLogs = overrideLogs !== undefined ? overrideLogs : (opts.logs !== undefined ? opts.logs : (accumulatedOverrides.logs !== undefined ? accumulatedOverrides.logs : state.logs));
    const resolvedBooster = overrideCurrentBooster !== undefined ? overrideCurrentBooster : (opts.currentBooster !== undefined ? opts.currentBooster : (accumulatedOverrides.currentBooster !== undefined ? accumulatedOverrides.currentBooster : state.currentBooster));
    const resolvedAttackerIdx = overrideCurrentAttackIdx !== undefined ? overrideCurrentAttackIdx : (opts.currentAttackIdx !== undefined ? opts.currentAttackIdx : (accumulatedOverrides.currentAttackIdx !== undefined ? accumulatedOverrides.currentAttackIdx : state.currentAttackerIdx));
    const resolvedSpecialP = overrideActiveSpecialPlayer !== undefined ? overrideActiveSpecialPlayer : (opts.activeSpecialPlayer !== undefined ? opts.activeSpecialPlayer : (accumulatedOverrides.activeSpecialPlayer !== undefined ? accumulatedOverrides.activeSpecialPlayer : state.playerActiveSpecial));
    const resolvedSpecialA = overrideActiveSpecialAi !== undefined ? overrideActiveSpecialAi : (opts.activeSpecialAi !== undefined ? opts.activeSpecialAi : (accumulatedOverrides.activeSpecialAi !== undefined ? accumulatedOverrides.activeSpecialAi : state.aiActiveSpecial));
    const resolvedDrawn = overrideCardsDrawn !== undefined ? overrideCardsDrawn : (opts.cardsDrawn !== undefined ? opts.cardsDrawn : (accumulatedOverrides.cardsDrawn !== undefined ? accumulatedOverrides.cardsDrawn : state.cardsDrawnThisTurn));
    const resolvedTurnCount = overrideTurnCount !== undefined ? overrideTurnCount : (opts.turnCount !== undefined ? opts.turnCount : (accumulatedOverrides.turnCount !== undefined ? accumulatedOverrides.turnCount : state.turnCount));
    const resolvedDefenseMoves = overrideDefenseMoves !== undefined ? overrideDefenseMoves : (opts.defenseMoves !== undefined ? opts.defenseMoves : (accumulatedOverrides.defenseMoves !== undefined ? accumulatedOverrides.defenseMoves : state.defenseMovesLeft));
    const resolvedPlayerDeck = overridePlayerDeck !== undefined ? overridePlayerDeck : (opts.playerDeck !== undefined ? opts.playerDeck : (accumulatedOverrides.playerDeck !== undefined ? accumulatedOverrides.playerDeck : state.playerDeck));
    const resolvedAiDeck = overrideAiDeck !== undefined ? overrideAiDeck : (opts.aiDeck !== undefined ? opts.aiDeck : (accumulatedOverrides.aiDeck !== undefined ? accumulatedOverrides.aiDeck : state.aiDeck));
    const resolvedSpecialDeck = overrideSpecialDeck !== undefined ? overrideSpecialDeck : (opts.specialDeck !== undefined ? opts.specialDeck : (accumulatedOverrides.specialDeck !== undefined ? accumulatedOverrides.specialDeck : state.specialDeck));
    const resolvedBoosterDeck = overrideBoosterDeck !== undefined ? overrideBoosterDeck : (opts.boosterDeck !== undefined ? opts.boosterDeck : (accumulatedOverrides.boosterDeck !== undefined ? accumulatedOverrides.boosterDeck : state.boosterDeck));
    const resolvedAttackerRole = overrideAttackerRole !== undefined ? overrideAttackerRole : (opts.attackerRole !== undefined ? opts.attackerRole : (accumulatedOverrides.attackerRole !== undefined ? accumulatedOverrides.attackerRole : state.attackerRole));
    const resolvedIsShotDeclared = overrideIsShotDeclared !== undefined ? overrideIsShotDeclared : (opts.isShotDeclared !== undefined ? opts.isShotDeclared : (accumulatedOverrides.isShotDeclared !== undefined ? accumulatedOverrides.isShotDeclared : state.isShotDeclared));

    const resolvedGameMode = overrideGameMode !== undefined ? overrideGameMode : (opts.gameMode !== undefined ? opts.gameMode : (accumulatedOverrides.gameMode !== undefined ? accumulatedOverrides.gameMode : state.gameMode));
    const resolvedWinningGoals = overrideWinningGoals !== undefined ? overrideWinningGoals : (opts.winningGoals !== undefined ? opts.winningGoals : (accumulatedOverrides.winningGoals !== undefined ? accumulatedOverrides.winningGoals : state.winningGoals));
    const resolvedTotalRounds = overrideTotalRounds !== undefined ? overrideTotalRounds : (opts.totalRounds !== undefined ? opts.totalRounds : (accumulatedOverrides.totalRounds !== undefined ? accumulatedOverrides.totalRounds : state.totalRounds));
    const resolvedHalfTimeBreakDuration = overrideHalfTimeBreakDuration !== undefined ? overrideHalfTimeBreakDuration : (opts.halfTimeBreakDuration !== undefined ? opts.halfTimeBreakDuration : (accumulatedOverrides.halfTimeBreakDuration !== undefined ? accumulatedOverrides.halfTimeBreakDuration : state.halfTimeBreakDuration));
    const resolvedCompletedRounds = overrideCompletedRounds !== undefined ? overrideCompletedRounds : (opts.completedRounds !== undefined ? opts.completedRounds : (accumulatedOverrides.completedRounds !== undefined ? accumulatedOverrides.completedRounds : state.completedRounds));
    const resolvedMatchHalf = overrideMatchHalf !== undefined ? overrideMatchHalf : (opts.matchHalf !== undefined ? opts.matchHalf : (accumulatedOverrides.matchHalf !== undefined ? accumulatedOverrides.matchHalf : state.matchHalf));
    const resolvedIsHalfTimeBreak = overrideIsHalfTimeBreak !== undefined ? overrideIsHalfTimeBreak : (opts.isHalfTimeBreak !== undefined ? opts.isHalfTimeBreak : (accumulatedOverrides.isHalfTimeBreak !== undefined ? accumulatedOverrides.isHalfTimeBreak : state.isHalfTimeBreak));
    const resolvedHalfTimeBreakLeft = overrideHalfTimeBreakLeft !== undefined ? overrideHalfTimeBreakLeft : (opts.halfTimeBreakLeft !== undefined ? opts.halfTimeBreakLeft : (accumulatedOverrides.halfTimeBreakLeft !== undefined ? accumulatedOverrides.halfTimeBreakLeft : state.halfTimeBreakLeft));
    const resolvedMatchTime = overrideMatchTime !== undefined ? overrideMatchTime : (opts.matchTime !== undefined ? opts.matchTime : (accumulatedOverrides.matchTime !== undefined ? accumulatedOverrides.matchTime : state.matchTime));
    const resolvedInitialMatchTime = overrideInitialMatchTime !== undefined ? overrideInitialMatchTime : (opts.initialMatchTime !== undefined ? opts.initialMatchTime : (accumulatedOverrides.initialMatchTime !== undefined ? accumulatedOverrides.initialMatchTime : state.initialMatchTime));

    const resolvedFirstKickoff = resolvedRole === "host"
      ? (overrideFirstHalfKickoffRole !== undefined ? overrideFirstHalfKickoffRole : (opts.firstHalfKickoffRole !== undefined ? opts.firstHalfKickoffRole : (accumulatedOverrides.firstHalfKickoffRole !== undefined ? accumulatedOverrides.firstHalfKickoffRole : state.firstHalfKickoffRole)))
      : (overrideFirstHalfKickoffRole !== undefined
          ? (overrideFirstHalfKickoffRole === "player" ? "ai" : "player")
          : (opts.firstHalfKickoffRole !== undefined
              ? (opts.firstHalfKickoffRole === "player" ? "ai" : "player")
              : (accumulatedOverrides.firstHalfKickoffRole !== undefined
                  ? (accumulatedOverrides.firstHalfKickoffRole === "player" ? "ai" : "player")
                  : (state.firstHalfKickoffRole === "player" ? "ai" : "player"))));

    const resolvedSecondKickoff = resolvedRole === "host"
      ? (overrideSecondHalfKickoffRole !== undefined ? overrideSecondHalfKickoffRole : (opts.secondHalfKickoffRole !== undefined ? opts.secondHalfKickoffRole : (accumulatedOverrides.secondHalfKickoffRole !== undefined ? accumulatedOverrides.secondHalfKickoffRole : state.secondHalfKickoffRole)))
      : (overrideSecondHalfKickoffRole !== undefined
          ? (overrideSecondHalfKickoffRole === "player" ? "ai" : "player")
          : (opts.secondHalfKickoffRole !== undefined
              ? (opts.secondHalfKickoffRole === "player" ? "ai" : "player")
              : (accumulatedOverrides.secondHalfKickoffRole !== undefined
                  ? (accumulatedOverrides.secondHalfKickoffRole === "player" ? "ai" : "player")
                  : (state.secondHalfKickoffRole === "player" ? "ai" : "player"))));

    // Convert from local perspective to Host perspective (canonical)
    const host_slots = resolvedRole === "host" ? resolvedPlayerSlots : resolvedAiSlots;
    const opponent_slots = resolvedRole === "host" ? resolvedAiSlots : resolvedPlayerSlots;
    const host_hand = resolvedRole === "host" ? resolvedPlayerHand : resolvedAiHand;
    const opponent_hand = resolvedRole === "host" ? resolvedAiHand : resolvedPlayerHand;
    const host_score = resolvedRole === "host" ? resolvedPlayerScore : resolvedAiScore;
    const opponent_score = resolvedRole === "host" ? resolvedAiScore : resolvedPlayerScore;
    const host_moves = resolvedRole === "host" ? resolvedPlayerMoves : resolvedAiMoves;
    const opponent_moves = resolvedRole === "host" ? resolvedAiMoves : resolvedPlayerMoves;
    const host_special = resolvedRole === "host" ? resolvedSpecialP : resolvedSpecialA;
    const opponent_special = resolvedRole === "host" ? resolvedSpecialA : resolvedSpecialP;
    const host_deck = resolvedRole === "host" ? resolvedPlayerDeck : resolvedAiDeck;
    const opponent_deck = resolvedRole === "host" ? resolvedAiDeck : resolvedPlayerDeck;

    // Invert phase if Opponent is uploading
    let canonicalPhase = finalPhase;
    if (resolvedRole === "opponent") {
      if (finalPhase === "player_turn") canonicalPhase = "ai_turn";
      else if (finalPhase === "ai_turn") canonicalPhase = "player_turn";
      else if (finalPhase === "attacking") canonicalPhase = "ai_attacking";
      else if (finalPhase === "ai_attacking") canonicalPhase = "attacking";
    }

    const syncState = {
      phase: canonicalPhase,
      host_slots,
      opponent_slots,
      host_hand,
      opponent_hand,
      host_score,
      opponent_score,
      host_moves,
      opponent_moves,
      logs: resolvedLogs,
      current_booster: resolvedBooster,
      booster_deck: resolvedBoosterDeck,
      current_ponto: resolvedBooster, // for backwards compatibility
      ponto_deck: resolvedBoosterDeck, // for backwards compatibility
      current_attacker_idx: resolvedAttackerIdx,
      active_specials_host: host_special,
      active_specials_opponent: opponent_special,
      cards_drawn: resolvedDrawn,
      turn_count: resolvedTurnCount,
      defense_moves_left: resolvedDefenseMoves,
      player_deck: resolvedPlayerDeck,
      host_player_deck: host_deck,
      opponent_player_deck: opponent_deck,
      special_deck: resolvedSpecialDeck,
      attacker_role: resolvedAttackerRole,
      last_updated_by: resolvedRole,
      max_bonus_value: maxBonusValue,
      is_shot_declared: resolvedIsShotDeclared,
      game_mode: resolvedGameMode,
      winning_goals: resolvedWinningGoals,
      total_rounds: resolvedTotalRounds,
      half_time_break_duration: resolvedHalfTimeBreakDuration,
      completed_rounds: resolvedCompletedRounds,
      first_half_kickoff_role: resolvedFirstKickoff,
      second_half_kickoff_role: resolvedSecondKickoff,
      match_half: resolvedMatchHalf,
      is_half_time_break: resolvedIsHalfTimeBreak,
      half_time_break_left: resolvedHalfTimeBreakLeft,
      match_time: resolvedMatchTime,
      initial_match_time: resolvedInitialMatchTime
    };

    try {
      await supabaseService.updateRoomState(resolvedRoomId, {
        game_state: syncState,
        current_turn: canonicalPhase === "player_turn" ? "host" : "opponent"
      });
    } catch (e) {
      console.error("Multiplayer sync error", e);
    }
  };

  // Run a delayed sync to allow all batched state mutations to commit
  const syncMultiplayerIfActive = (overrides?: any) => {
    if (!isMultiplayer) return;
    if (overrides) {
      pendingSyncOverrides.current = {
        ...pendingSyncOverrides.current,
        ...overrides
      };
    }
    if (syncTimeoutId.current) {
      clearTimeout(syncTimeoutId.current);
    }
    syncTimeoutId.current = setTimeout(() => {
      syncTimeoutId.current = null;
      const currentOverrides = { ...pendingSyncOverrides.current };
      pendingSyncOverrides.current = {};
      syncToSupabaseInstance(currentOverrides);
    }, 100);
  };

  // Countdown Timer ticking
  useEffect(() => {
    if (phase === "menu" || phase === "game_over") return;
    if (gameMode === "rounds") return;

    if (isHalfTimeBreak) {
      const breakTimer = setInterval(() => {
        setHalfTimeBreakLeft((prev) => {
          if (prev <= 1) {
            if (isMultiplayer && multiplayerRole !== "host") {
              // Opponent waits for host to sync transition
              return 0;
            }
            clearInterval(breakTimer);
            setIsHalfTimeBreak(false);
            setMatchHalf(2);

            const nextAttackingPlayer = (secondHalfKickoffRole === "player");
            const resolvedAttRole: "host" | "opponent" = nextAttackingPlayer ? "host" : "opponent";
            setAttackerRole(resolvedAttRole);
            setIsPlayerAttacker(nextAttackingPlayer);
            setPhase(nextAttackingPlayer ? "player_turn" : "ai_turn");

            const finalPMoves = nextAttackingPlayer ? maxMovesPerTurn : 0;
            const finalAMoves = nextAttackingPlayer ? 0 : maxMovesPerTurn;

            if (nextAttackingPlayer) {
              setPlayerMovesLeft(finalPMoves);
              setAiMovesLeft(finalAMoves);
              setCardsDrawnThisTurn(0);
            } else {
              setPlayerMovesLeft(finalPMoves);
              setAiMovesLeft(finalAMoves);
              setAiCardsDrawnThisTurn(0);
            }

            const secondHalfLogMsg = `⏱️ بداية الشوط الثاني! ركلة البداية مع ${(secondHalfKickoffRole === "player") ? coachName : aiCoachName}.`;
            addLog(secondHalfLogMsg, "success");
            SoundEffects.playWhistle();

            if (isMultiplayer) {
              const updatedLogs = [
                ...logs,
                {
                  id: Math.random().toString(),
                  timestamp: getFormattedTime(),
                  text: secondHalfLogMsg,
                  type: "success" as const
                }
              ];
              syncToSupabaseInstance({
                phase: nextAttackingPlayer ? "player_turn" : "ai_turn",
                attackerRole: resolvedAttRole,
                playerMoves: finalPMoves,
                aiMoves: finalAMoves,
                cardsDrawn: 0,
                matchHalf: 2,
                isHalfTimeBreak: false,
                halfTimeBreakLeft: 0,
                logs: updatedLogs
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(breakTimer);
    }

    const timer = setInterval(() => {
      setMatchTime((prev) => {
        const halfTimePoint = Math.floor(initialMatchTime / 2);

        // Transition to half-time break
        if (matchHalf === 1 && prev <= halfTimePoint) {
          clearInterval(timer);
          setIsHalfTimeBreak(true);
          setHalfTimeBreakLeft(halfTimeBreakDuration);

          // Clear active attack and specials states
          setCurrentAttackerIdx(null);
          setCurrentBooster(null);
          setPlayerActiveSpecial([]);
          setAiActiveSpecial([]);

          addLog(`⏰ نهاية الشوط الأول! النتيجة الحالية: ${playerScore} - ${aiScore}. استراحة الشوطين لمدة ${halfTimeBreakDuration} ثانية...`, "warning");
          SoundEffects.playWhistle();
          if (isMultiplayer) {
            if (multiplayerRole === "host") {
              syncToSupabaseInstance({
                isHalfTimeBreak: true,
                halfTimeBreakLeft: halfTimeBreakDuration,
                matchHalf: 1,
                currentAttackIdx: null,
                currentBooster: null,
                activeSpecialPlayer: [],
                activeSpecialAi: []
              });
            }
          }
          return halfTimePoint;
        }

        if (prev <= 1) {
          clearInterval(timer);
          SoundEffects.playWhistle();
          setPhase("game_over");

          // Determine the winner based on goals
          if (playerScore > aiScore) {
            const victoryMsg = `⏰ انتهى وقت المباراة الرسمي! تكتيكات ${formatNameWithTitle(coachName, "الكابتن")} حسمت النصر التاريخي بالنتيجة ${playerScore} - ${aiScore}! ⚽🏆`;
            setLogs(prevLogs => [
              { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), text: victoryMsg, type: "success" },
              ...prevLogs
            ]);
            setShowConfetti(true);
          } else if (aiScore > playerScore) {
            const lossMsg = `⏰ انتهى وقت المباراة الرسمي! للأسف الخصم ${formatNameWithTitle(aiCoachName, "المدرب")} حقق الفوز تكتيكياً بنتيجة ${aiScore} - ${playerScore}.`;
            setLogs(prevLogs => [
              { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), text: lossMsg, type: "danger" },
               ...prevLogs
            ]);
          } else {
            const drawMsg = `⏰ نهاية الوقت الأصلي بالتعادل التكتيكي المثير ${playerScore} - ${aiScore}! ركلات الترجيح المفتوحة ستحرك الكأس!`;
            setLogs(prevLogs => [
              { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), text: drawMsg, type: "neutral" },
              ...prevLogs
            ]);
          }

          if (isMultiplayer) {
            if (multiplayerRole === "host") {
              syncToSupabaseInstance("game_over");
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, playerScore, aiScore, coachName, aiCoachName, isMultiplayer, gameMode, isHalfTimeBreak, matchHalf, initialMatchTime, halfTimeBreakDuration, secondHalfKickoffRole]);

  // Turn Timer countdown hook
  useEffect(() => {
    if (phase === "menu" || phase === "game_over") return;
    if (turnTimeLimit <= 0) return;

    if (phase !== "player_turn" && phase !== "ai_turn") return;

    const timerId = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          
          if (phase === "player_turn") {
            addLog("⏰ انتهى زمن دورك! تم نقل اللعب تلقائياً للخصم.", "danger");
            handleEndPlayerTurn();
          } else if (phase === "ai_turn") {
            if (isMultiplayer) {
              // In multiplayer, the opponent's client will handle their own timeout.
              // We just wait for their state update.
              return 0;
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [phase, turnTimeLimit, isMultiplayer, multiplayerRole, logs, turnCount, maxMovesPerTurn, defaultMaxDrawsPerTurn]);

  // Reset turn timer when phase changes
  useEffect(() => {
    if (phase === "player_turn" || phase === "ai_turn") {
      setTurnTimeLeft(turnTimeLimit);
    }
  }, [phase, turnTimeLimit]);

  // Automatic transfer turn on completion of draws and moves - Requirement 3
  useEffect(() => {
    if (phase !== "player_turn") return;

    // Both drawing quota or empty deck(s) AND move quota (0 moves left) must be completed
    const cannotDrawMore = cardsDrawnThisTurn >= maxDrawsPerTurn || (playerDeck.length === 0 && specialDeck.length === 0);
    const hasNoMoves = playerMovesLeft <= 0;

    if (hasNoMoves && cannotDrawMore) {
      const timer = setTimeout(() => {
        // Double check phase is still player_turn before auto-ending
        if (phaseRef.current === "player_turn") {
          addLog("⚙️ انتقال تكتيكي تلقائي: انتهت حركاتك وسحباتك لهذا الدور، ينتقل التحكم للخصم!", "neutral");
          handleEndPlayerTurn();
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [phase, playerMovesLeft, cardsDrawnThisTurn, playerDeck.length, specialDeck.length]);

  // TurnStarted & TurnEnded triggers
  const prevPhaseRef = useRef<GamePhase>("menu");
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    if (prevPhase !== phase) {
      // Turn Ended Triggers
      if (prevPhase === "player_turn") {
        playerSlots.forEach((slot) => {
          if (slot.card && slot.isRevealed) {
            triggerCardInstantEffects(slot.card, true, "TurnEnded");
          }
        });
      } else if (prevPhase === "ai_turn") {
        aiSlots.forEach((slot) => {
          if (slot.card && slot.isRevealed) {
            triggerCardInstantEffects(slot.card, false, "TurnEnded");
          }
        });
      }

      // Turn Started Triggers
      if (phase === "player_turn") {
        playerSlots.forEach((slot) => {
          if (slot.card && slot.isRevealed) {
            triggerCardInstantEffects(slot.card, true, "TurnStarted");
          }
        });
      } else if (phase === "ai_turn") {
        aiSlots.forEach((slot) => {
          if (slot.card && slot.isRevealed) {
            triggerCardInstantEffects(slot.card, false, "TurnStarted");
          }
        });
      }

      prevPhaseRef.current = phase;
    }
  }, [phase, playerSlots, aiSlots]);

  // Warmup Timer countdown hook
  const playerSlotsRef = useRef(playerSlots);
  const playerDeckRef = useRef(playerDeck);
  useEffect(() => {
    playerSlotsRef.current = playerSlots;
  }, [playerSlots]);
  useEffect(() => {
    playerDeckRef.current = playerDeck;
  }, [playerDeck]);

  useEffect(() => {
    if (phase !== "warmup") return;
    if (isGameLoading) return;

    const warmupTimerId = setInterval(() => {
      setWarmupTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(warmupTimerId);
          let tempSlots = [...playerSlotsRef.current];
          let tempDeck = [...playerDeckRef.current];
          let addedCount = 0;

          for (let i = 0; i < tempSlots.length; i++) {
            if (tempSlots[i].card === null) {
              const nonLegendIdx = tempDeck.findIndex((c) => !c.isLegend);
              if (nonLegendIdx !== -1) {
                tempSlots[i] = { card: tempDeck[nonLegendIdx], isRevealed: false };
                tempDeck.splice(nonLegendIdx, 1);
                addedCount++;
              }
            }
          }

          setPlayerSlots(tempSlots);
          setPlayerDeck(tempDeck);

          if (addedCount > 0) {
            addLog(`[التسخين تلقائي] انتهى وقت التسخين! تم سحب ${addedCount} لاعبين تلقائياً لتكملة تشكيلتك بالملعب.`, "success");
          }

          confirmLineupWithData(tempSlots, tempDeck);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(warmupTimerId);
  }, [phase, isGameLoading, otherConfirmed, isMultiplayer, multiplayerRole, firstHalfKickoffRole, currentRoomId]);

  // Real-time receiver subscriber
  useEffect(() => {
    if (!isMultiplayer || !currentRoomId || !multiplayerRole) return;

    const unsubscribe = supabaseService.subscribeToRoom(currentRoomId, (updatedRoom) => {
      // Warmup state confirmation updates
      const hostConfirm = !!updatedRoom.host_confirmed;
      const oppConfirm = !!updatedRoom.opponent_confirmed;
      const isMeHost = multiplayerRole === "host";
      
      setMyConfirmed(isMeHost ? hostConfirm : oppConfirm);
      setOtherConfirmed(isMeHost ? oppConfirm : hostConfirm);

      const gs = updatedRoom.game_state;
      if (gs) {
        const hostLastActive = gs.host_last_active || 0;
        const opponentLastActive = gs.opponent_last_active || 0;
        const oppActiveTime = multiplayerRole === "host" ? opponentLastActive : hostLastActive;
        if (oppActiveTime > 0) {
          opponentLastActiveRef.current = oppActiveTime;
        } else if (gs.last_updated_by && gs.last_updated_by !== multiplayerRole) {
          opponentLastActiveRef.current = Date.now();
        }
      }

      if (hostConfirm && oppConfirm && phase === "warmup" && gs) {
        const firstKickoff = gs.first_half_kickoff_role || "player"; // "player" means host starts
        const hostStarts = firstKickoff === "player";
        const isMyTurn = (isMeHost && hostStarts) || (!isMeHost && !hostStarts);

        const nextPhase = isMyTurn ? "player_turn" : "ai_turn";
        setPhase(nextPhase);
        setCardsDrawnThisTurn(0);
        setPlayerMovesLeft(isMyTurn ? maxMovesPerTurn : 0);
        setAiMovesLeft(isMyTurn ? 0 : maxMovesPerTurn);

        const starterName = hostStarts ? updatedRoom.host_name : (updatedRoom.opponent_name || "الخصم");
        const startMsg = `🪙 القرعة العشوائية تحدد البداية! ركلة البداية واللعب الأول لصالح [ ${starterName} ]! ⚽`;
        addLog(startMsg, "success");
      }

      if (!gs) return;

      // Skip updates made by myself
      if (gs.last_updated_by === multiplayerRole) return;

      isReceivingUpdate.current = true;

      // Extract and translate canonical properties to our local view
      const canonicalPhase = gs.phase;
      let incomingLocalPhase = canonicalPhase;

      if (multiplayerRole === "opponent") {
        if (canonicalPhase === "player_turn") incomingLocalPhase = "ai_turn";
        else if (canonicalPhase === "ai_turn") incomingLocalPhase = "player_turn";
        else if (canonicalPhase === "attacking") incomingLocalPhase = "ai_attacking";
        else if (canonicalPhase === "ai_attacking") incomingLocalPhase = "attacking";
      }

      // Slot and Hand Translation
      const my_slots = multiplayerRole === "host" ? gs.host_slots : gs.opponent_slots;
      const enemy_slots = multiplayerRole === "host" ? gs.opponent_slots : gs.host_slots;
      const my_hand = multiplayerRole === "host" ? gs.host_hand : gs.opponent_hand;
      const enemy_hand = multiplayerRole === "host" ? gs.opponent_hand : gs.host_hand;

      // Score and moves translation
      const my_score = multiplayerRole === "host" ? gs.host_score : gs.opponent_score;
      const enemy_score = multiplayerRole === "host" ? gs.opponent_score : gs.host_score;
      const my_moves = multiplayerRole === "host" ? gs.host_moves : gs.opponent_moves;
      const enemy_moves = multiplayerRole === "host" ? gs.opponent_moves : gs.host_moves;

      // Active specials translation
      const my_special = multiplayerRole === "host" ? gs.active_specials_host : gs.active_specials_opponent;
      const enemy_special = multiplayerRole === "host" ? gs.active_specials_opponent : gs.active_specials_host;

      // Remote coach metadata
      const enemyName = multiplayerRole === "host" ? updatedRoom.opponent_name : updatedRoom.host_name;
      const enemyVibe = multiplayerRole === "host" ? updatedRoom.opponent_vibe : updatedRoom.host_vibe;

      if (enemyName) setOpponentName(enemyName);
      if (enemyVibe) setOpponentVibe(enemyVibe);

      // Lock phase state mapping
      setPhase(incomingLocalPhase);
      if (my_slots !== undefined && my_slots !== null) setPlayerSlots(my_slots);
      if (enemy_slots !== undefined && enemy_slots !== null) setAiSlots(enemy_slots);
      if (my_hand !== undefined && my_hand !== null) setPlayerHand(my_hand);
      if (enemy_hand !== undefined && enemy_hand !== null) setAiHand(enemy_hand);
      if (my_score !== undefined) setPlayerScore(my_score);
      if (enemy_score !== undefined) setAiScore(enemy_score);
      if (my_moves !== undefined) setPlayerMovesLeft(my_moves);
      if (enemy_moves !== undefined) setAiMovesLeft(enemy_moves);
      if (gs.logs !== undefined && gs.logs !== null) setLogs(gs.logs);
      if (gs.max_bonus_value !== undefined) {
        setMaxBonusValue(gs.max_bonus_value);
      }
      if (gs.current_booster !== undefined) setCurrentBooster(gs.current_booster);
      else if (gs.current_ponto !== undefined) setCurrentBooster(gs.current_ponto);
      if (gs.current_attacker_idx !== undefined) setCurrentAttackerIdx(gs.current_attacker_idx);
      if (my_special !== undefined && my_special !== null) setPlayerActiveSpecial(my_special);
      if (enemy_special !== undefined && enemy_special !== null) setAiActiveSpecial(enemy_special);
      if (gs.cards_drawn !== undefined) setCardsDrawnThisTurn(gs.cards_drawn);
      if (gs.turn_count !== undefined) setTurnCount(gs.turn_count);
      if (gs.defense_moves_left !== undefined) setDefenseMovesLeft(gs.defense_moves_left);
      if (gs.is_shot_declared !== undefined) setIsShotDeclared(gs.is_shot_declared);

      if (gs.match_time !== undefined) setMatchTime(gs.match_time);
      if (gs.match_half !== undefined) setMatchHalf(gs.match_half);
      if (gs.is_half_time_break !== undefined) setIsHalfTimeBreak(gs.is_half_time_break);
      if (gs.half_time_break_left !== undefined) setHalfTimeBreakLeft(gs.half_time_break_left);
      if (gs.game_mode !== undefined) setGameMode(gs.game_mode);
      if (gs.winning_goals !== undefined) setWinningGoals(gs.winning_goals);
      if (gs.total_rounds !== undefined) setTotalRounds(gs.total_rounds);
      if (gs.completed_rounds !== undefined) setCompletedRounds(gs.completed_rounds);
      if (gs.initial_match_time !== undefined) setInitialMatchTime(gs.initial_match_time);

      if (gs.room_settings) {
        const rs = gs.room_settings;
        if (rs.turnTimeLimit !== undefined) {
          setTurnTimeLimit(rs.turnTimeLimit);
        }
        if (rs.warmupTimeLimit !== undefined) {
          setWarmupTimeLimit(rs.warmupTimeLimit);
        }
      }

      if (gs.first_half_kickoff_role !== undefined) {
        setFirstHalfKickoffRole(multiplayerRole === "host" ? gs.first_half_kickoff_role : (gs.first_half_kickoff_role === "player" ? "ai" : "player"));
      }
      if (gs.second_half_kickoff_role !== undefined) {
        setSecondHalfKickoffRole(multiplayerRole === "host" ? gs.second_half_kickoff_role : (gs.second_half_kickoff_role === "player" ? "ai" : "player"));
      }

      const my_deck = multiplayerRole === "host" ? (gs.host_player_deck || gs.player_deck) : gs.opponent_player_deck;
      const enemy_deck = multiplayerRole === "host" ? gs.opponent_player_deck : (gs.host_player_deck || gs.player_deck);

      if (my_deck !== undefined && my_deck !== null) setPlayerDeck(my_deck);
      if (enemy_deck !== undefined && enemy_deck !== null) setAiDeck(enemy_deck);
      if (gs.special_deck !== undefined && gs.special_deck !== null) setSpecialDeck(gs.special_deck);
      const incomingAttackerRole = gs.attacker_role || null;
      setAttackerRole(incomingAttackerRole);
      if (incomingAttackerRole) {
        setIsPlayerAttacker(incomingAttackerRole === multiplayerRole);
      } else {
        if (incomingLocalPhase === "player_turn" || incomingLocalPhase === "attacking") {
          setIsPlayerAttacker(true);
        } else if (incomingLocalPhase === "ai_turn" || incomingLocalPhase === "ai_attacking") {
          setIsPlayerAttacker(false);
        }
      }

      setTimeout(() => {
        isReceivingUpdate.current = false;
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [isMultiplayer, currentRoomId, multiplayerRole, phase]);

  // Real-time broadcast heartbeat (Supabase realtime)
  useEffect(() => {
    if (!isMultiplayer || !currentRoomId || !multiplayerRole) return;
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase.channel(`heartbeat-${currentRoomId}`);

    channel
      .on("broadcast", { event: "ping" }, ({ payload }) => {
        if (payload && payload.role !== multiplayerRole) {
          opponentLastActiveRef.current = Date.now();
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "ping",
            payload: { role: multiplayerRole }
          });
        }
      });

    const interval = setInterval(() => {
      channel.send({
        type: "broadcast",
        event: "ping",
        payload: { role: multiplayerRole }
      });
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isMultiplayer, currentRoomId, multiplayerRole]);

  // Real-time broadcast heartbeat (Local fallback)
  useEffect(() => {
    if (!isMultiplayer || !currentRoomId || !multiplayerRole) return;
    if (isSupabaseConfigured && supabase) return;

    const localBc = new BroadcastChannel(`local-heartbeat-${currentRoomId}`);
    
    const listener = (event: MessageEvent) => {
      const { data } = event;
      if (data && data.role !== multiplayerRole && data.type === "ping") {
        opponentLastActiveRef.current = Date.now();
      }
    };
    
    localBc.addEventListener("message", listener);
    
    const interval = setInterval(() => {
      localBc.postMessage({ type: "ping", role: multiplayerRole });
    }, 4000);
    
    return () => {
      localBc.removeEventListener("message", listener);
      localBc.close();
      clearInterval(interval);
    };
  }, [isMultiplayer, currentRoomId, multiplayerRole]);

  // Disconnection checker (every 4 seconds)
  useEffect(() => {
    if (!isMultiplayer || !currentRoomId || !multiplayerRole) return;
    if (phase === "menu" || phase === "game_over") return;

    const checker = setInterval(() => {
      const timeSinceOpponentActive = Date.now() - opponentLastActiveRef.current;
      if (timeSinceOpponentActive > 20000) { // 20 seconds timeout
        clearInterval(checker);
        SoundEffects.playWhistle();
        setPhase("game_over");
        
        // Declare victory for ME
        setPlayerScore(winningGoals);
        const winMsg = `🚨 انسحاب الخصم! تم إعلان فوزك بالمباراة تلقائياً بسبب انقطاع اتصال منافسك لأكثر من ٢٠ ثانية. 🏆`;
        const nextLogs = [
          { id: Math.random().toString(), timestamp: getFormattedTime(), text: winMsg, type: "success" as const },
          ...logs
        ];
        setLogs(nextLogs);
        setShowConfetti(true);

        syncToSupabaseInstance({
          phase: "game_over",
          playerScore: winningGoals,
          logs: nextLogs
        });

        try {
          supabaseService.updateRoomState(currentRoomId, {
            status: "finished"
          });
        } catch (e) {
          console.error("Failed to sync forfeit room state:", e);
        }
      }
    }, 4000);

    return () => clearInterval(checker);
  }, [isMultiplayer, currentRoomId, multiplayerRole, phase, winningGoals]);

  // Handler to starting the multiplayer match from lobby
  const handleStartMultiplayerGame = async (room: MatchRoom, role: "host" | "opponent") => {
    setIsMultiplayer(true);
    setMultiplayerRole(role);
    setCurrentRoomId(room.id);

    const isHost = role === "host";
    const myName = isHost ? room.host_name : (room.opponent_name || "مبارز أونلاين ⚔️");
    const myVibe = isHost ? room.host_vibe : (room.opponent_vibe || "الملكي");
    const enemyName = isHost ? (room.opponent_name || "قائد الخصم ⚔️") : room.host_name;
    const enemyVibe = isHost ? (room.opponent_vibe || "الملكي") : room.host_vibe;

    setCoachName(myName);
    setTeamVibe(myVibe);
    setOpponentName(enemyName);
    setOpponentVibe(enemyVibe);

    // Sync match settings from Room Game State
    const rs = room.game_state?.room_settings || {};
    const customLegendPct = rs.legendPercentage !== undefined ? rs.legendPercentage : legendPercentage;
    const customMaxBonus = rs.maxBonusValue !== undefined ? rs.maxBonusValue : maxBonusValue;
    const customMaxDraws = rs.maxDrawsPerTurn !== undefined ? rs.maxDrawsPerTurn : maxDrawsPerTurn;
    const customMaxMoves = rs.maxMovesPerTurn !== undefined ? rs.maxMovesPerTurn : maxMovesPerTurn;
    const customLegendBurn = rs.legendBurnLimit !== undefined ? rs.legendBurnLimit : legendBurnLimit;
    const customInitialCards = rs.initialCardsCount !== undefined ? rs.initialCardsCount : initialCardsCount;
    const customGameMode = rs.gameMode !== undefined ? rs.gameMode : gameMode;
    const customWinningGoals = rs.winningGoals !== undefined ? rs.winningGoals : winningGoals;
    const customTotalRounds = rs.totalRounds !== undefined ? rs.totalRounds : totalRounds;
    const customHalfTimeDuration = rs.halfTimeBreakDuration !== undefined ? rs.halfTimeBreakDuration : halfTimeBreakDuration;
    const customMatchDuration = rs.matchDuration !== undefined ? rs.matchDuration : matchTime;

    setLegendPercentage(customLegendPct);
    setMaxBonusValue(customMaxBonus);
    setMaxDrawsPerTurn(customMaxDraws);
    setDefaultMaxDrawsPerTurn(customMaxDraws);
    setMaxMovesPerTurn(customMaxMoves);
    setLegendBurnLimit(customLegendBurn);
    setInitialCardsCount(customInitialCards);
    setGameMode(customGameMode);
    setWinningGoals(customWinningGoals);
    setTotalRounds(customTotalRounds);
    setHalfTimeBreakDuration(customHalfTimeDuration);
    setMatchTime(customMatchDuration);
    setInitialMatchTime(customMatchDuration);

    const customTurnTimeLimit = rs.turnTimeLimit !== undefined ? rs.turnTimeLimit : 0;
    setTurnTimeLimit(customTurnTimeLimit);
    setTurnTimeLeft(customTurnTimeLimit);

    const customWarmupTimeLimit = rs.warmupTimeLimit !== undefined ? rs.warmupTimeLimit : 30;
    setWarmupTimeLimit(customWarmupTimeLimit);
    setWarmupTimeLeft(customWarmupTimeLimit);

    if (isHost) {
      setIsGameLoading(true);
      setGameLoadError(null);

      let pDeck: PlayerCard[] = [];
      let pDeckOpponent: PlayerCard[] = [];
      let sDeck: SpecialCard[] = [];

      try {
        const selectedPlayerPkgs = rs.selectedPlayerPkgs;
        const selectedSpecialPkgs = rs.selectedSpecialPkgs;

        // Fetch customized player cards
        let fetchedPlayers: PlayerCard[] = [];
        if (selectedPlayerPkgs && selectedPlayerPkgs.length > 0) {
          try {
            fetchedPlayers = await getCardsForGame(selectedPlayerPkgs);
          } catch (err) {
            console.error("Error loading selected player packages, falling back to default pool:", err);
          }
        }
        if (!fetchedPlayers || fetchedPlayers.length < 10) {
          fetchedPlayers = getMockPlayerCards(selectedPlayerPkgs);
        }
        
        // Fetch customized special cards
        let fetchedSpecials: SpecialCard[] = [];
        if (selectedSpecialPkgs && selectedSpecialPkgs.length > 0) {
          try {
            fetchedSpecials = await getSpecialCardsForGame(selectedSpecialPkgs);
          } catch (err) {
            console.error("Error loading selected special packages, falling back to default pool:", err);
          }
        }
        if (selectedSpecialPkgs && selectedSpecialPkgs.length > 0 && (!fetchedSpecials || fetchedSpecials.length === 0)) {
          fetchedSpecials = getMockSpecialCards(selectedSpecialPkgs);
        }

        if (fetchedPlayers && fetchedPlayers.length >= 10) {
          const { playerDeck: uniqueP, aiDeck: uniqueOpp } = generateUniqueDecks(fetchedPlayers, customLegendPct);
          pDeck = uniqueP;
          pDeckOpponent = uniqueOpp;
        } else {
          const stdDecks = generateUniquePlayerDecks(customLegendPct);
          pDeck = stdDecks.playerDeck;
          pDeckOpponent = stdDecks.aiDeck;
        }

        if (selectedSpecialPkgs && selectedSpecialPkgs.length > 0) {
          if (fetchedSpecials && fetchedSpecials.length > 0) {
            sDeck = generateSpecialDeckFromPool(fetchedSpecials);
          } else {
            sDeck = generateSpecialDeckFromPool(INITIAL_SPECIAL_CARDS as SpecialCard[]);
          }
        } else {
          sDeck = [];
        }
      } catch (err: any) {
        console.error("Error building packages decks:", err);
        const stdDecks = generateUniquePlayerDecks(customLegendPct);
        pDeck = stdDecks.playerDeck;
        pDeckOpponent = stdDecks.aiDeck;
        sDeck = generateSpecialDeck();
      } finally {
        setIsGameLoading(false);
      }

      const poDeck = generateBoosterDeck(customMaxBonus);

      // Choose random kickoff roles
      const randomStart = Math.random() < 0.5;
      const firstHalfRole = randomStart ? "player" : "ai";
      const secondHalfRole = randomStart ? "ai" : "player";
      setFirstHalfKickoffRole(firstHalfRole);
      setSecondHalfKickoffRole(secondHalfRole);

      const initialPlayerSlots = [
        { card: null, isRevealed: false },
        { card: null, isRevealed: false },
        { card: null, isRevealed: false },
        { card: null, isRevealed: false },
        { card: null, isRevealed: false }
      ];
      const initialAiSlots = [
        { card: null, isRevealed: false },
        { card: null, isRevealed: false },
        { card: null, isRevealed: false },
        { card: null, isRevealed: false },
        { card: null, isRevealed: false }
      ];
      const initialPlayerHand: Card[] = [];
      const initialAiHand: Card[] = [];
      const finalPlayerDeck = pDeck;
      const finalSpecialDeck = sDeck;

      setPlayerSlots(initialPlayerSlots);
      setAiSlots(initialAiSlots);
      setPlayerHand(initialPlayerHand);
      setAiHand(initialAiHand);
      setPlayerDeck(finalPlayerDeck);
      setSpecialDeck(finalSpecialDeck);
      setBoosterDeck(poDeck);

      setPlayerScore(0);
      setAiScore(0);
      setTurnCount(1);
      setCardsDrawnThisTurn(0);
      setPlayerMovesLeft(customMaxMoves);

      setPhase("warmup");
      
      const kickoffLogs = [
        {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `صافرة بداية مباراة الأونلاين! كود الغرفة المميز: ${room.id} ⚽`,
          type: "success" as const
        },
        {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `المضيف ${myName} ضد الضيف المبارز ${enemyName}! مرحلة تسخين تكتيكي صامتة لتعديل تمركز الأوراق.`,
          type: "info" as const
        }
      ];
      setLogs(kickoffLogs);

      // Save immediately to Supabase
      await syncToSupabaseInstance(
        "warmup",
        initialPlayerSlots,
        initialAiSlots,
        initialPlayerHand,
        initialAiHand,
        0,
        0,
        3,
        3,
        kickoffLogs,
        null,
        null,
        [],
        [],
        0,
        1,
        3,
        finalPlayerDeck,
        pDeckOpponent,
        finalSpecialDeck,
        poDeck,
        null, // overrideAttackerRole
        false, // overrideIsShotDeclared
        undefined, // overrideGameMode
        undefined, // overrideWinningGoals
        undefined, // overrideTotalRounds
        undefined, // overrideHalfTimeBreakDuration
        0, // overrideCompletedRounds
        firstHalfRole, // overrideFirstHalfKickoffRole
        secondHalfRole, // overrideSecondHalfKickoffRole
        1, // overrideMatchHalf
        false, // overrideIsHalfTimeBreak
        0, // overrideHalfTimeBreakLeft
        matchTime, // overrideMatchTime
        initialMatchTime // overrideInitialMatchTime
      );
    } else {
      // Opponent is waiting for host to sync
      setPhase("warmup");
      const customWarmupTimeLimit = rs.warmupTimeLimit !== undefined ? rs.warmupTimeLimit : 30;
      setWarmupTimeLimit(customWarmupTimeLimit);
      setWarmupTimeLeft(customWarmupTimeLimit);
      setLogs([
        {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `مرحباً بك كابتن ${myName}! تم الدخول للملعب أونلاين بكود: ${room.id} ⚽`,
          type: "success" as const
        },
        {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `مرحلة التسخين جارية لحين تأكيد الخطة وبدء اللقاء.`,
          type: "info" as const
        }
      ]);
    }
  };

  useEffect(() => {
    handleStartMultiplayerGame(config.room, config.role);
  }, [config]);

  const recordRound = (
    attacker: "player" | "ai",
    attackPower: number,
    defensePower: number,
    pontoValue: number,
    pontoText: string,
    isGoal: boolean,
    attackerName: string,
    defenders: string[],
    pScore: number,
    aScore: number
  ) => {
    setMatchRounds((prev) => {
      const nextRound = {
        roundNumber: prev.length + 1,
        attacker,
        attackPower,
        defensePower,
        pontoValue,
        pontoText,
        isGoal,
        attackerName,
        defenders,
        scoreAfter: { player: pScore, ai: aScore }
      };
      return [...prev, nextRound];
    });
  };

  // Add a standard log helper
  const addLog = (text: string, type: ActionLog["type"] = "neutral") => {
    const newLog: ActionLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: getFormattedTime(),
      text,
      type
    };
    if ((phaseRef.current === "attacking" || phaseRef.current === "ai_attacking") && type !== "warning" && type !== "danger") {
      setTempPhaseLogs((prev) => [...prev, newLog]);
    } else {
      setLogs((prev) => [...prev, newLog]);
    }
  };

  // KICK START GAME FROM MENU
  const handleStartGame = async (
    name: string,
    vibe: string,
    diff: "normal" | "tactical" | "legend",
    matchDuration: number = 180,
    customLegendPercentage: number = 30,
    maxDraws: number = 2,
    maxMoves: number = 3,
    initialCards: number = 5,
    selectedPlayerPkgs: string[] = [],
    selectedSpecialPkgs: string[] = [],
    defenseDraws: number = 3,
    legendBurn: number = 2,
    customMaxBonusValue: number = 10,
    customGameMode: "time" | "rounds" = "time",
    customWinningGoals: number = 5,
    customTotalRounds: number = 10,
    customHalfTimeBreakDuration: number = 30
  ) => {
    setCoachName(name);
    setTeamVibe(vibe);
    setDifficulty(diff);
    setMatchTime(matchDuration);
    setInitialMatchTime(matchDuration);
    setLegendPercentage(customLegendPercentage);
    setMaxDrawsPerTurn(maxDraws);
    setDefaultMaxDrawsPerTurn(maxDraws);
    setMaxMovesPerTurn(maxMoves);
    setDefenseDrawsLimit(defenseDraws);
    setLegendBurnLimit(legendBurn);
    setInitialCardsCount(initialCards);
    setMaxBonusValue(customMaxBonusValue);
    setGameMode(customGameMode);
    setWinningGoals(customWinningGoals);
    setTotalRounds(customTotalRounds);
    setHalfTimeBreakDuration(customHalfTimeBreakDuration);
    setCompletedRounds(0);
    setMatchHalf(1);
    setIsHalfTimeBreak(false);
    setHalfTimeBreakLeft(0);

    const randomStart = Math.random() < 0.5;
    const firstHalfRole = randomStart ? "player" : "ai";
    const secondHalfRole = randomStart ? "ai" : "player";
    setFirstHalfKickoffRole(firstHalfRole);
    setSecondHalfKickoffRole(secondHalfRole);

    setIsHandExpanded(false);
    setGameLoadError(null);
    setIsGameLoading(true);

    try {
      // Fetch dynamic database cards with robust mock fallbacks
      let loadedPlayerCards = await getCardsForGame(selectedPlayerPkgs);
      if (!loadedPlayerCards || loadedPlayerCards.length < 10) {
        loadedPlayerCards = getMockPlayerCards(selectedPlayerPkgs);
      }

      let loadedSpecialCards = await getSpecialCardsForGame(selectedSpecialPkgs);
      if (selectedSpecialPkgs.length > 0 && (!loadedSpecialCards || loadedSpecialCards.length === 0)) {
        loadedSpecialCards = getMockSpecialCards(selectedSpecialPkgs);
      }

      if (loadedPlayerCards.length === 0) {
        throw new Error(
          "لم يتم العثور على أي كروت لاعبين في الباقات المحددة."
        );
      }

      // Initial decks setup from pool (ensuring disjoint decks with no duplicate players)
      const { playerDeck: pDeck, aiDeck: aDeckInit } = generateUniqueDecks(loadedPlayerCards, customLegendPercentage);
      
      // If we loaded special cards from DB, use them; if they chose no special packages, use empty; otherwise use fallback
      let sDeck: SpecialCard[] = [];
      if (selectedSpecialPkgs.length > 0) {
        sDeck = generateSpecialDeckFromPool(
          loadedSpecialCards.length > 0 ? loadedSpecialCards : (INITIAL_SPECIAL_CARDS as SpecialCard[])
        );
      } else {
        sDeck = []; // Explicitly play without tactical cards
      }
      const poDeck = generateBoosterDeck(customMaxBonusValue);

      // 1. "يسحب كل مدرب كروت لاعبين ويضعهم أمامه في الملعب مقلوبين"
      // "إذا كان من ضمن هؤلاء كارت أسطورة، يجب أن يتم إرجاعه للمجموعة وسحب كارت بديل مكانه"
      const prepareInitialPitchSlots = (deck: PlayerCard[]) => {
        const slots: PlayerCard[] = [];
        let remDeck = [...deck];
        
        for (let i = 0; i < initialCards; i++) {
          // Draw first non-legend player
          const nonLegendIdx = remDeck.findIndex((c) => !c.isLegend);
          if (nonLegendIdx !== -1) {
            slots.push(remDeck[nonLegendIdx]);
            remDeck.splice(nonLegendIdx, 1);
          }
        }
        return { slots, remainingDeck: remDeck };
      };

      const aiPitchInit = prepareInitialPitchSlots(aDeckInit);

      // Player slots start empty, requiring manual drawing of covered cards
      const initialPlayerSlots = Array.from({ length: initialCards }, () => ({
        card: null,
        isRevealed: false
      }));
      setPlayerSlots(initialPlayerSlots);
      setAiSlots(aiPitchInit.slots.map((card) => ({ card, isRevealed: false })));

      setPlayerHand([]);
      setAiHand([]);

      setPlayerDeck(pDeck);
      setAiDeck(aiPitchInit.remainingDeck);
      setSpecialDeck(sDeck);
      setBoosterDeck(poDeck);
      setAiCardsDrawnThisTurn(0);

      // Statistics & Scores reset
      setPlayerScore(0);
      setAiScore(0);
      setTurnCount(1);
      setCardsDrawnThisTurn(0);
      setPlayerMovesLeft(maxMoves);
      setMatchRounds([]);

      // Switch to Warmup
      setPhase("warmup");
      setLogs([]);
      addLog(`صافرة البداية! دخل ${formatNameWithTitle(name, "المدرب")} بهوية ${vibe} لملاقاة خصمه ذو الصعوبة [${diff === "normal" ? "ناشئ" : diff === "tactical" ? "محترف" : "أسطوري"}].`, "success");
      addLog(`مرحلة التسخين نشطة! الملعب فارغ حالياً، قم بسحب ${initialCards} لاعبين لتوزيع مراكزهم بالضغط على زر 'سحب لاعب' (سيكون اللاعبون مقلوبين تكتيكياً)، ثم اضغط على زر 'بدء اللقاء' لتنطلق صافرة الحكم.`, "info");
      addLog("حقيبة الكروت بيدك فارغة حالياً. بمجرد تأكيد الخطة وبدء اللقاء، يمكنك سحب كروت تكتيكية جديدة في أدوارك ليدك لدعم مهارات وهجوم فريقك.", "neutral");

      // Request Fullscreen for immersive play
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn("Fullscreen request was blocked or failed:", err);
        });
      }

    } catch (err: any) {
      console.error("Failed to load cards for game:", err);
      setGameLoadError(err.message || "فشل تحميل باقة الكروت من الداتابيس. يرجى التحقق من اتصال الإنترنت.");
    } finally {
      setIsGameLoading(false);
    }
  };

  // REARRANGE / SWAP CARDS FREE IN WARMUP
  const performWarmupSwap = (handCardIdx: number, pitchSlotIdx: number) => {
    const handCard = playerHand[handCardIdx];
    if (handCard.type !== "player") return; // Only players can occupy the pitch

    const currentPitchItem = playerSlots[pitchSlotIdx];
    const newHand = [...playerHand];
    const newSlots = [...playerSlots];

    if (currentPitchItem.card) {
      // Swapping in warmup: return pitch card to hand, place new one face-down
      newHand[handCardIdx] = currentPitchItem.card;
      newSlots[pitchSlotIdx] = { card: handCard as PlayerCard, isRevealed: false };
    } else {
      // Slot empty
      newHand.splice(handCardIdx, 1);
      newSlots[pitchSlotIdx] = { card: handCard as PlayerCard, isRevealed: false };
    }

    setPlayerHand(newHand);
    setPlayerSlots(newSlots);
    setSelectedHandCardId(null);
    SoundEffects.playCardDraw();
    syncMultiplayerIfActive({
      playerHand: newHand,
      playerSlots: newSlots
    });
  };

  // CONFIRM WARMUP LINEUP DIRECT
  const confirmLineupWithData = (slotsToUse: typeof playerSlots, deckToUse: typeof playerDeck) => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    const emptySlots = slotsToUse.some((s) => s.card === null);
    if (emptySlots) {
      addLog(`تحذير تكتيكي: يجب عليك تعبئة المراكز الـ ${initialCardsCount} بالملعب أولاً لبدء المباراة!`, "danger");
      return;
    }

    if (isMultiplayer) {
      const isHost = multiplayerRole === "host";
      setMyConfirmed(true);

      const bothConfirmed = otherConfirmed;

      if (bothConfirmed) {
        const nextPhase = isHost ? "player_turn" : "ai_turn";
        setPlayerSlots((prev) => slotsToUse.map((s) => ({ ...s, isRevealed: false })));
        setPhase(nextPhase as any);
        setCardsDrawnThisTurn(0);
        setPlayerMovesLeft(isHost ? 3 : 0);
        setAiMovesLeft(isHost ? 0 : 3);
        
        const startLogs = [
          ...logs,
          {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: "تأكدت تكتيكات كلا الفريقين بالكامل! صافرة ركلة البداية! المباراة تنطلق الآن أونلاين ⚽",
            type: "success" as const
          }
        ];
        setLogs(startLogs);

        // Sync both confirmed and transition phase to player_turn
        setTimeout(() => {
          syncToSupabaseInstance(
            nextPhase as any,
            undefined, undefined, undefined, undefined,
            undefined, undefined,
            isHost ? 3 : 0,
            isHost ? 0 : 3,
            startLogs,
            null, null, [], [], 0, 1, 3,
            deckToUse,
            undefined,
            undefined,
            undefined,
            null,
            false
          );
          // Write directly to Supabase room table as well
          supabaseService.updateRoomState(currentRoomId!, {
            host_confirmed: true,
            opponent_confirmed: true,
            status: "playing"
          });
        }, 60);
      } else {
        addLog("تم تأكيد خطتك وتشكيلتك بنجاح! بانتظار الخصم لينهي تسخينه لتنطلق المباراة ⏳.", "neutral");
        
        // Sync my confirmation via game_state update and room table status
        syncToSupabaseInstance({
          playerSlots: slotsToUse,
          playerDeck: deckToUse
        });
        if (isHost) {
          supabaseService.updateRoomState(currentRoomId!, {
            host_confirmed: true
          });
        } else {
          supabaseService.updateRoomState(currentRoomId!, {
            opponent_confirmed: true
          });
        }
      }
    } else {
      setPlayerSlots((prev) => slotsToUse.map((s) => ({ ...s, isRevealed: false })));
      const isPlayerStarting = (firstHalfKickoffRole === "player");
      setIsPlayerAttacker(isPlayerStarting);
      setPhase(isPlayerStarting ? "player_turn" : "ai_turn");
      setCardsDrawnThisTurn(0);
      setAiCardsDrawnThisTurn(0);
      setMaxDrawsPerTurn(defaultMaxDrawsPerTurn);
      setPlayerMovesLeft(isPlayerStarting ? maxMovesPerTurn : 0);
      setAiMovesLeft(isPlayerStarting ? 0 : maxMovesPerTurn);
      setHasScoredThisTurn(false);
      setIsHandExpanded(isPlayerStarting);
      addLog(`صافرة ركلة البداية! تم إنهاء مرحلة التسخين واللوحة جاهزة. ركلة البداية مع ${isPlayerStarting ? "فريقك" : "الخصم"} عشوائياً.`, "success");
      addLog(getRandom(stadiumPhrases), "info");
      addLog(isPlayerStarting ? "يمكنك اللعب من يدك مباشرة أو سحب كروت لدعم مهاراتك بشكل مرن." : "انتظر ريثما يبدأ المدرب الخصم خططه الهجومية.", "info");
    }
  };

  const handleConfirmLineup = () => {
    confirmLineupWithData(playerSlots, playerDeck);
  };

  // DRAW CARDS ACTION IN PLAYER TURN
  const handleDrawCard = (deckType: "player" | "special") => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    if (phase === "ai_attacking") {
      addLog("لا يمكنك سحب كروت إضافية أثناء مرحلة الدفاع! يمكنك فقط اللعب بالكروت المتاحة معك في الملعب أو يدك.", "warning");
      return;
    }

    if (phase === "warmup") {
      if (deckType === "player") {
        // Find first empty slot
        const emptyIdx = playerSlots.findIndex((s) => s.card === null);
        if (emptyIdx === -1) {
          addLog(`مرحلة التسخين: لقد قمت بسحب وتجهيز ${initialCardsCount} كروت لاعبين بالفعل في الملعب! يمكنك الضغط على تأكيد الخطة والبدء باللعب.`, "warning");
          return;
        }

        if (playerDeck.length === 0) {
          addLog("باقة اللاعبين فارغة تماماً!", "warning");
          return;
        }

        // Find first non-legend card to avoid placing Legend directly in initial line-up (legal restriction)
        const nonLegendIdx = playerDeck.findIndex((c) => !c.isLegend);
        if (nonLegendIdx === -1) {
          addLog("لا يوجد لاعبين مناسبين للتسخين بالمجموعة!", "danger");
          return;
        }

        const nextCard = playerDeck[nonLegendIdx];
        const updatedDeck = [...playerDeck];
        updatedDeck.splice(nonLegendIdx, 1);

        const updatedSlots = [...playerSlots];
        updatedSlots[emptyIdx] = { card: nextCard, isRevealed: false };

        setPlayerSlots(updatedSlots);
        setPlayerDeck(updatedDeck);

        const drawnCount = updatedSlots.filter((s) => s.card !== null).length;
        addLog(`[التسخين] لقد سحبت اللاعب مقلوباً ووضعته بيدك بمركز الملعب [ ${emptyIdx + 1} ]. (سحبت ${drawnCount}/${initialCardsCount})`, "success");
        SoundEffects.playCardDraw();
        syncMultiplayerIfActive({
          playerSlots: updatedSlots,
          playerDeck: updatedDeck
        });
      } else {
        addLog(`مرحلة التسخين: اسحب كروت اللاعبين فقط (${initialCardsCount} كروت) لتشكيل خطتك مقلوبة بالمركز المناسب!`, "warning");
      }
      return;
    }

    const currentDrawLimit = phase === "ai_attacking" ? defenseDrawsLimit : maxDrawsPerTurn;
    if (cardsDrawnThisTurn >= currentDrawLimit) return;

    let nextHand = [...playerHand];
    let nextPlayerDeck = [...playerDeck];
    let nextSpecialDeck = [...specialDeck];

    if (deckType === "player") {
      if (playerDeck.length === 0) {
        addLog("باقة اللاعبين فارغة تماماً!", "warning");
        return;
      }
      const newCard = playerDeck[0];
      nextHand = [...playerHand, newCard];
      nextPlayerDeck = playerDeck.slice(1);
      setPlayerHand(nextHand);
      setPlayerDeck(nextPlayerDeck);
      addLog(`لقد سحبت كارت لاعب جديد إلى يدك.`, "info");
    } else {
      if (specialDeck.length === 0) {
        addLog("باقة الأوراق التكتيكية الخاصة فارغة تماماً!", "warning");
        return;
      }
      const newCard = specialDeck[0];
      nextHand = [...playerHand, newCard];
      nextSpecialDeck = specialDeck.slice(1);
      setPlayerHand(nextHand);
      setSpecialDeck(nextSpecialDeck);
      addLog(`لقد سحبت كارت تكتيك إضافي ليدك.`, "info");
    }

    const nextDrawnCount = cardsDrawnThisTurn + 1;
    setCardsDrawnThisTurn(nextDrawnCount);
    SoundEffects.playCardDraw();

    if (nextDrawnCount === currentDrawLimit) {
      addLog(`اكتمل سحب الكروت المتاحة (${currentDrawLimit} كروت)! لديك حركات جاهزة للتنفيذ.`, "success");
    }
    syncMultiplayerIfActive({
      playerHand: nextHand,
      playerDeck: nextPlayerDeck,
      specialDeck: nextSpecialDeck,
      cardsDrawn: nextDrawnCount
    });
  };



  const triggerCardInstantEffects = (card: Card, isPlayerOwned: boolean, trigger: CardAbilityTriggerType) => {
    if (!card || !card.ability) return;
    if (card.ability.trigger !== trigger) return;

    const opponentActiveSpecials = isPlayerOwned ? aiActiveSpecial : playerActiveSpecial;
    const opponentSlots = isPlayerOwned ? aiSlots : playerSlots;
    const isAbilityBlocked = opponentActiveSpecials.some(c => c.ability?.actions.some(a => a.type === "BlockAbility")) ||
                              opponentSlots.some(s => s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions.some(a => a.type === "BlockAbility"));

    const isSilenced = (card as any).silenced || (card as any).abilityBlocked || isAbilityBlocked;
    if (isSilenced) return;

    const maxUses = card.ability.maxUses || 1;
    const currentUses = (card as any).abilityUses || 0;
    if (currentUses >= maxUses) return;

    // Evaluate conditions
    let conditionsMet = true;
    if (card.ability.conditions) {
      card.ability.conditions.forEach((cond) => {
        if (cond.type === "IsLegend") {
          if (card!.type === "player" && !(card as PlayerCard).isLegend) {
            conditionsMet = false;
          }
        }
      });
    }
    if (!conditionsMet) return;

    // Execute instant actions
    let movesAdded = 0;
    let cardsDrawn = 0;

    card.ability.actions.forEach((act) => {
      const val = act.value || 0;

      // 1. Add / Remove Moves
      if (act.type === "AddMoves") {
        if (isPlayerOwned) {
          setPlayerMovesLeft((prev) => prev + val);
          movesAdded += val;
        } else {
          setAiMovesLeft((prev) => prev + val);
          movesAdded += val;
        }
      } else if (act.type === "ReduceMoves") {
        if (isPlayerOwned) {
          setAiMovesLeft((prev) => Math.max(0, prev - val));
        } else {
          setPlayerMovesLeft((prev) => Math.max(0, prev - val));
        }
        addLog(`📉 قدرة [ ${getSafeCardName(card, isPlayerOwned)} ]: تم تقليص حركات الخصم بـ -${val}!`, isPlayerOwned ? "success" : "danger");
      }

      // 2. Draw Cards
      else if (act.type === "DrawCard") {
        cardsDrawn += val;
      }

      // 3. Stat Modification Actions (Permanent/Instant)
      else if (act.type === "AddStat" || act.type === "RemoveStat" || act.type === "MultiplyStat") {
        if (act.stat === "attack" || act.stat === "defense") {
          if (act.duration === "Instant") {
            const modifyStats = (c: any, targetSide: boolean) => {
              if (!c) return c;
              const isTarget = (act.target === "Self" && c.id === card.id) ||
                               (act.target === "Allies" && isPlayerOwned === targetSide) ||
                               (act.target === "Enemies" && isPlayerOwned !== targetSide) ||
                               (act.target === "All");
              if (!isTarget) return c;

              const nextCard = { ...c };
              if (act.stat === "attack") {
                if (act.type === "AddStat") nextCard.attack += val;
                if (act.type === "RemoveStat") nextCard.attack = Math.max(0, nextCard.attack - val);
                if (act.type === "MultiplyStat") nextCard.attack *= val;
              } else {
                if (act.type === "AddStat") nextCard.defense += val;
                if (act.type === "RemoveStat") nextCard.defense = Math.max(0, nextCard.defense - val);
                if (act.type === "MultiplyStat") nextCard.defense *= val;
              }
              return nextCard;
            };

            setPlayerSlots((prev) => prev.map((s) => s.card ? { ...s, card: modifyStats(s.card, true) } : s));
            setAiSlots((prev) => prev.map((s) => s.card ? { ...s, card: modifyStats(s.card, false) } : s));
            addLog(`⚡ تعديل طاقات: تم تعديل طاقة [ ${act.stat === "attack" ? "الهجوم" : "الدفاع"} ] للكروت المستهدفة بشكل دائم بفعل [ ${getSafeCardName(card, isPlayerOwned)} ]!`, isPlayerOwned ? "success" : "danger");
          }
        } else if (act.stat === "moves") {
          const isTargetPlayer = (act.target === "Self" && isPlayerOwned) ||
                                 (act.target === "Allies" && isPlayerOwned) ||
                                 (act.target === "Enemies" && !isPlayerOwned) ||
                                 (act.target === "All");

          const isTargetAi = (act.target === "Self" && !isPlayerOwned) ||
                             (act.target === "Allies" && !isPlayerOwned) ||
                             (act.target === "Enemies" && isPlayerOwned) ||
                             (act.target === "All");

          if (act.type === "AddStat") {
            if (isTargetPlayer) setPlayerMovesLeft((prev) => prev + val);
            if (isTargetAi) setAiMovesLeft((prev) => prev + val);
          } else if (act.type === "RemoveStat") {
            if (isTargetPlayer) setPlayerMovesLeft((prev) => Math.max(0, prev - val));
            if (isTargetAi) setAiMovesLeft((prev) => Math.max(0, prev - val));
          }
        } else if (act.stat === "draw") {
          if (act.type === "AddStat") {
            cardsDrawn += val;
          }
        }
      }

      // 4. Steal Card
      else if (act.type === "StealCard") {
        if (isPlayerOwned) {
          setAiHand((prevAiHand) => {
            if (prevAiHand.length === 0) return prevAiHand;
            const randIdx = Math.floor(Math.random() * prevAiHand.length);
            const stolenCard = prevAiHand[randIdx];
            setPlayerHand((prevHand) => [...prevHand, stolenCard]);
            addLog(`💸 سرقة: قمت بسرقة كارت [ ${stolenCard.name} ] من يد الخصم!`, "success");
            return prevAiHand.filter((_, idx) => idx !== randIdx);
          });
        } else {
          setPlayerHand((prevPlayerHand) => {
            if (prevPlayerHand.length === 0) return prevPlayerHand;
            const randIdx = Math.floor(Math.random() * prevPlayerHand.length);
            const stolenCard = prevPlayerHand[randIdx];
            setAiHand((prevHand) => [...prevHand, stolenCard]);
            addLog(`💸 سرقة: الخصم سرق كارت [ ${stolenCard.name} ] من يدك!`, "danger");
            return prevPlayerHand.filter((_, idx) => idx !== randIdx);
          });
        }
      }

      // 5. Copy Card
      else if (act.type === "CopyCard") {
        let bestCard: PlayerCard | null = null;
        let maxStats = -1;
        const allSlots = [...playerSlots, ...aiSlots];
        allSlots.forEach((s) => {
          if (s.card && s.card.id !== card.id && (s.card.attack + s.card.defense) > maxStats) {
            maxStats = s.card.attack + s.card.defense;
            bestCard = s.card;
          }
        });
        if (bestCard) {
          const copyFrom = bestCard as PlayerCard;
          const copyStats = (c: any) => {
            if (c && c.id === card.id) {
              return {
                ...c,
                attack: copyFrom.attack,
                defense: copyFrom.defense,
                ability: copyFrom.ability
              };
            }
            return c;
          };
          if (isPlayerOwned) {
            setPlayerSlots((prev) => prev.map((s) => s.card ? { ...s, card: copyStats(s.card) } : s));
          } else {
            setAiSlots((prev) => prev.map((s) => s.card ? { ...s, card: copyStats(s.card) } : s));
          }
          const isBestCardPlayerOwned = playerSlots.some(s => s.card && s.card.id === bestCard.id);
          addLog(`👥 قدرة الكارت: نسخ الكارت [ ${getSafeCardName(card, isPlayerOwned)} ] طاقات وقدرات [ ${getSafeCardName(bestCard, isBestCardPlayerOwned)} ]!`, isPlayerOwned ? "success" : "danger");
        }
      }

      // 6. Swap Card (Random slot swap)
      else if (act.type === "SwapCard") {
        const slotsSetter = isPlayerOwned ? setPlayerSlots : setAiSlots;
        slotsSetter((prev) => {
          const next = [...prev];
          const occupiedIndices = next.map((s, i) => s.card ? i : -1).filter(i => i !== -1);
          if (occupiedIndices.length >= 2) {
            const i1 = occupiedIndices[0];
            const i2 = occupiedIndices[Math.floor(Math.random() * (occupiedIndices.length - 1)) + 1];
            const temp = next[i1].card;
            next[i1] = { ...next[i1], card: next[i2].card };
            next[i2] = { ...next[i2], card: temp };
          }
          return next;
        });
        addLog(`🔄 قدرة [ ${getSafeCardName(card, isPlayerOwned)} ]: تم تبديل مراكز اللاعبين بالملعب بشكل عشوائي!`, isPlayerOwned ? "success" : "danger");
      }

      // 7. Reveal / Hide Card
      else if (act.type === "RevealCard") {
        if (act.target === "Self") {
          if (isPlayerOwned) {
            setPlayerSlots((prev) => prev.map((s) => s.card?.id === card.id ? { ...s, isRevealed: true, revealedInTurn: turnCount, revealedByAbility: true } : s));
          } else {
            setAiSlots((prev) => prev.map((s) => s.card?.id === card.id ? { ...s, isRevealed: true, revealedInTurn: turnCount, revealedByAbility: true } : s));
          }
        } else if (act.target === "Allies") {
          if (isPlayerOwned) {
            setPlayerSlots((prev) => prev.map((s) => s.card ? { ...s, isRevealed: true, revealedInTurn: turnCount, revealedByAbility: true } : s));
          } else {
            setAiSlots((prev) => prev.map((s) => s.card ? { ...s, isRevealed: true, revealedInTurn: turnCount, revealedByAbility: true } : s));
          }
        } else if (act.target === "Enemies") {
          if (isPlayerOwned) {
            setAiSlots((prev) => prev.map((s) => s.card ? { ...s, isRevealed: true, revealedInTurn: turnCount, revealedByAbility: true } : s));
          } else {
            setPlayerSlots((prev) => prev.map((s) => s.card ? { ...s, isRevealed: true, revealedInTurn: turnCount, revealedByAbility: true } : s));
          }
        }
      } else if (act.type === "HideCard") {
        if (act.target === "Self") {
          if (isPlayerOwned) {
            setPlayerSlots((prev) => prev.map((s) => s.card?.id === card.id ? { ...s, isRevealed: false, revealedByAbility: false } : s));
          } else {
            setAiSlots((prev) => prev.map((s) => s.card?.id === card.id ? { ...s, isRevealed: false, revealedByAbility: false } : s));
          }
        } else if (act.target === "Allies") {
          if (isPlayerOwned) {
            setPlayerSlots((prev) => prev.map((s) => s.card ? { ...s, isRevealed: false, revealedByAbility: false } : s));
          } else {
            setAiSlots((prev) => prev.map((s) => s.card ? { ...s, isRevealed: false, revealedByAbility: false } : s));
          }
        } else if (act.target === "Enemies") {
          if (isPlayerOwned) {
            setAiSlots((prev) => prev.map((s) => s.card ? { ...s, isRevealed: false, revealedByAbility: false } : s));
          } else {
            setPlayerSlots((prev) => prev.map((s) => s.card ? { ...s, isRevealed: false, revealedByAbility: false } : s));
          }
        }
      }

      // 8. Freeze, Silence, Stun, Destroy Status Actions
      else if (act.type === "FreezeCard" || act.type === "SilenceCard" || act.type === "StunCard" || act.type === "DestroyCard") {
        const durationTurns = act.durationTurns || 2;
        const modifyStatus = (c: any, targetSide: boolean) => {
          if (!c) return c;
          const isTarget = (act.target === "Self" && c.id === card.id) ||
                           (act.target === "Allies" && isPlayerOwned === targetSide) ||
                           (act.target === "Enemies" && isPlayerOwned !== targetSide) ||
                           (act.target === "All");
          if (!isTarget) return c;

          const nextCard = { ...c };
          if (act.type === "FreezeCard") {
            nextCard.frozen = true;
            nextCard.frozenTurnsLeft = durationTurns;
          } else if (act.type === "SilenceCard") {
            nextCard.silenced = true;
            nextCard.silencedTurnsLeft = durationTurns;
          } else if (act.type === "StunCard") {
            nextCard.stunned = true;
            nextCard.stunnedTurnsLeft = durationTurns;
          } else if (act.type === "DestroyCard") {
            if (targetSide) recyclePlayerCard(nextCard);
            else recycleAiCard(nextCard);
            return null;
          }
          return nextCard;
        };

        setPlayerSlots((prev) => prev.map((s) => {
          const updatedCard = modifyStatus(s.card, true);
          return updatedCard === null ? { card: null, isRevealed: false } : { ...s, card: updatedCard };
        }));
        setAiSlots((prev) => prev.map((s) => {
          const updatedCard = modifyStatus(s.card, false);
          return updatedCard === null ? { card: null, isRevealed: false } : { ...s, card: updatedCard };
        }));

        addLog(`⚡ تطبيق تأثير [ ${act.type} ] على الكروت المستهدفة بالملعب!`, isPlayerOwned ? "success" : "danger");
      }
    });

    if (movesAdded > 0) {
      addLog(`⚡ قدرة الأسطورة [ ${getSafeCardName(card, isPlayerOwned)} ] (${isPlayerOwned ? "حليف" : "خصم"}): تم إضافة +${movesAdded} حركات تكتيكية!`, isPlayerOwned ? "success" : "danger");
    }

    if (cardsDrawn > 0) {
      if (isPlayerOwned) {
        setMaxDrawsPerTurn((prev) => prev + cardsDrawn);
        addLog(`⚡ قدرة الأسطورة [ ${getSafeCardName(card, isPlayerOwned)} ] (حليف): تم زيادة فرصة السحب المتاحة لك بمقدار +${cardsDrawn} كروت إضافية اختيارياً! يمكنك سحبها الآن من المجموعات بيدك.`, "success");
      } else {
        let currentAiDeck = [...aiDeck];
        let currentSpecialDeck = [...specialDeck];
        const added: Card[] = [];
        
        for (let i = 0; i < cardsDrawn; i++) {
          const drawType = i % 2 === 0 ? "player" : "special";
          if (drawType === "player" && currentAiDeck.length > 0) {
            added.push(currentAiDeck[0]);
            currentAiDeck = currentAiDeck.slice(1);
          } else if (currentSpecialDeck.length > 0) {
            added.push(currentSpecialDeck[0]);
            currentSpecialDeck = currentSpecialDeck.slice(1);
          } else if (currentAiDeck.length > 0) {
            added.push(currentAiDeck[0]);
            currentAiDeck = currentAiDeck.slice(1);
          }
        }
        
        if (added.length > 0) {
          setAiDeck(currentAiDeck);
          setSpecialDeck(currentSpecialDeck);
          setAiHand((prevHand) => [...prevHand, ...added]);
          if (!isPlayerOwned) {
            setAiCardsDrawnThisTurn((prev) => prev + added.length);
          }
          
          added.forEach((c) => {
            if (c.type === "player") {
              addLog(`الخصم يسحب كارت لاعب جديد ليده بفعل قدرة خاصة.`, "warning");
            } else {
              addLog(`الخصم يسحب كارت تكتيك إضافي ليده بفعل قدرة خاصة.`, "warning");
            }
          });
          SoundEffects.playCardDraw();
        }
      }
    }

    // Mark as used in playerSlots/aiSlots/playerHand/aiHand
    const incrementUses = (c: any) => {
      if (c && c.id === card.id) {
        return { ...c, abilityUses: ((c as any).abilityUses || 0) + 1 };
      }
      return c;
    };

    if (isPlayerOwned) {
      setPlayerSlots((prev) => prev.map((s) => s.card ? { ...s, card: incrementUses(s.card) } : s));
      setPlayerHand((prev) => prev.map((c) => incrementUses(c)));
    } else {
      setAiSlots((prev) => prev.map((s) => s.card ? { ...s, card: incrementUses(s.card) } : s));
      setAiHand((prev) => prev.map((c) => incrementUses(c)));
    }
  };

  const triggerAllGoalScoredAbilities = (scoringSide: "player" | "ai") => {
    playerSlots.forEach((slot) => {
      if (slot.card && slot.isRevealed) {
        if (slot.card.ability?.trigger === "GoalScored" && scoringSide === "player") {
          triggerCardInstantEffects(slot.card, true, "GoalScored");
        }
      }
    });

    aiSlots.forEach((slot) => {
      if (slot.card && slot.isRevealed) {
        if (slot.card.ability?.trigger === "GoalScored" && scoringSide === "ai") {
          triggerCardInstantEffects(slot.card, false, "GoalScored");
        }
      }
    });
  };

  // HANDLE CARD CLICK SELECTIONS
  const handleSelectHandCard = (id: string) => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    if (phase === "ai_turn" || phase === "resolution") return;

    const card = playerHand.find((c) => c.id === id);
    if (!card) return;

    // Reset previous burning selection if any
    if (selectedHandCardId !== id) {
      setBurningCardIds([]);
    }

    // Swappings or Legend management
    if (selectedHandCardId === id) {
      // Toggle off
      setSelectedHandCardId(null);
      setBurningCardIds([]);
    } else {
      setSelectedHandCardId(id);
    }
  };

  // MULTIPLE DESTINATIONS FOR BURNING CARD SELECTION (LEGEND EXCLUSIVES)
  const toggleBurningCard = (cardId: string) => {
    if (legendBurnLimit <= 0) return;
    if (burningCardIds.includes(cardId)) {
      setBurningCardIds((prev) => prev.filter((id) => id !== cardId));
    } else {
      if (burningCardIds.length >= legendBurnLimit) {
        setBurningCardIds((prev) => {
          const next = [...prev];
          if (next.length >= legendBurnLimit) {
            next.shift();
          }
          return [...next, cardId];
        });
      } else {
        setBurningCardIds((prev) => [...prev, cardId]);
      }
    }
    SoundEffects.playCardDraw();
  };

  // Dynamic Rules Engine evaluation
  const runRulesEngine = (
    isPlayerSide: boolean, // Side we are calculating for (true = Player, false = AI)
    isAttackingStage: boolean, // Is this an attack calculation? (true = Attack, false = Defense)
    attackerIdx: number | null,
    activeBooster: BoosterCard | null,
    playerActiveSpecials: SpecialCard[],
    aiActiveSpecials: SpecialCard[],
    playerSlotsOverride?: typeof playerSlots,
    aiSlotsOverride?: typeof aiSlots
  ) => {
    let score = 0;
    const slots = playerSlotsOverride && aiSlotsOverride 
      ? (isPlayerSide ? playerSlotsOverride : aiSlotsOverride)
      : (isPlayerSide ? playerSlots : aiSlots);
    
    if (isAttackingStage) {
      // Base attack score: sum of attack of all revealed player cards on the attacking side
      slots.forEach((slot) => {
        if (slot.card && slot.isRevealed && slot.revealedInAttack) {
          if (slot.card.frozen || slot.card.stunned) return;
          score += slot.card.attack;
        }
      });
      if (activeBooster && isPlayerSide === isPlayerAttacker) {
        score += activeBooster.value;
      }
    } else {
      // Base defense score: sum of defense of all revealed player cards on the defending side
      slots.forEach((slot) => {
        if (slot.card && slot.isRevealed && slot.revealedInAttack) {
          if (slot.card.frozen || slot.card.stunned) return;
          score += slot.card.defense;
        }
      });
    }

    const activeSources: { card: Card; isPlayerOwned: boolean }[] = [];
    const activePlayerSlots = playerSlotsOverride || playerSlots;
    const activeAiSlots = aiSlotsOverride || aiSlots;
    
    activePlayerSlots.forEach((slot) => {
      if (slot.card && slot.isRevealed) {
        activeSources.push({ card: slot.card, isPlayerOwned: true });
      }
    });
    activeAiSlots.forEach((slot) => {
      if (slot.card && slot.isRevealed) {
        activeSources.push({ card: slot.card, isPlayerOwned: false });
      }
    });
    playerActiveSpecials.forEach((spec) => {
      activeSources.push({ card: spec, isPlayerOwned: true });
    });
    aiActiveSpecials.forEach((spec) => {
      activeSources.push({ card: spec, isPlayerOwned: false });
    });

    let attackModifiers = 0;
    let defenseModifiers = 0;
    let attackMultiplier = 1;
    let defenseMultiplier = 1;
    let cancelStrongestAttacker = false;

    activeSources.forEach((src) => {
      const { card, isPlayerOwned } = src;

      // 1. Dynamic Ability execution
      if (card.ability) {
        const opponentActiveSpecials = isPlayerOwned ? aiActiveSpecials : playerActiveSpecials;
        const opponentSlots = isPlayerOwned ? (aiSlotsOverride || aiSlots) : (playerSlotsOverride || playerSlots);
        const isAbilityBlocked = opponentActiveSpecials.some(c => c.ability?.actions.some(a => a.type === "BlockAbility")) ||
                                  opponentSlots.some(s => s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions.some(a => a.type === "BlockAbility"));

        const isSilenced = (card as any).silenced || (card as any).abilityBlocked || isAbilityBlocked;
        if (isSilenced) return;

        const ability = card.ability;
        
        // Check triggers
        const triggerMatches = 
          ((ability.trigger === "CardRevealed" || ability.trigger === "CardPlayed") && card.type === "player") || // While active on field
          (ability.trigger === "CardPlayed" && card.type === "special") || // Specials active this turn
          (ability.trigger === "AttackStarted" && isAttackingStage) ||
          (ability.trigger === "DefenseStarted" && !isAttackingStage);

        if (triggerMatches) {
          // Evaluate conditions
          let conditionsMet = true;
          if (ability.conditions) {
            ability.conditions.forEach((cond) => {
              if (cond.type === "IsFaceUp") {
                // If it's on field it's face up
              }
              if (cond.type === "IsAttacker") {
                const isOwnerAttacking = isPlayerOwned === isPlayerAttacker;
                if (!isOwnerAttacking) conditionsMet = false;
              }
              if (cond.type === "IsDefender") {
                const isOwnerDefending = isPlayerOwned !== isPlayerAttacker;
                if (!isOwnerDefending) conditionsMet = false;
              }
              if (cond.type === "CardOwnerIsEnemy") {
                if (isPlayerOwned === isPlayerSide) conditionsMet = false;
              }
              if (cond.type === "IsLegend") {
                if (card.type === "player" && !(card as PlayerCard).isLegend) {
                  conditionsMet = false;
                }
              }
            });
          }

          if (conditionsMet && ability.actions) {
            ability.actions.forEach((act) => {
              const isTargetSide = (act.target === "Allies" && isPlayerOwned === isPlayerSide) ||
                                   (act.target === "Enemies" && isPlayerOwned !== isPlayerSide) ||
                                   (act.target === "CurrentAttack" && isAttackingStage) ||
                                   (act.target === "CurrentDefense" && !isAttackingStage) ||
                                   (act.target === "Self" && card === src.card && isPlayerOwned === isPlayerSide);

              if (isTargetSide) {
                if (act.type === "AddStat") {
                  if (act.stat === "attack" && isAttackingStage) {
                    attackModifiers += act.value ?? 0;
                  }
                  if (act.stat === "defense" && !isAttackingStage) {
                    defenseModifiers += act.value ?? 0;
                  }
                } else if (act.type === "RemoveStat") {
                  if (act.stat === "attack" && isAttackingStage) {
                    attackModifiers -= act.value ?? 0;
                  }
                  if (act.stat === "defense" && !isAttackingStage) {
                    defenseModifiers -= act.value ?? 0;
                  }
                } else if (act.type === "MultiplyStat") {
                  if (act.stat === "attack" && isAttackingStage) {
                    attackMultiplier *= act.value ?? 1;
                  }
                  if (act.stat === "defense" && !isAttackingStage) {
                    defenseMultiplier *= act.value ?? 1;
                  }
                } else if (act.type === "CancelAction" && isAttackingStage) {
                  cancelStrongestAttacker = true;
                }
              }
            });
          }
        }
      } else if (card.type === "special") {
        // 2. Fallback to hardcoded special card behaviors
        const spec = card as SpecialCard;
        if (isAttackingStage) {
          if (isPlayerOwned === isPlayerAttacker) {
            if (spec.effect === "counter_attack" && isPlayerSide === isPlayerAttacker) {
              attackModifiers += 4;
            }
            if (spec.effect === "fans" && isPlayerSide === isPlayerAttacker) {
              attackModifiers += 3;
            }
          } else {
            if (spec.effect === "wet_pitch" && isPlayerSide === isPlayerAttacker) {
              attackModifiers -= 4;
            }
            if (spec.effect === "offside" && isPlayerSide === isPlayerAttacker) {
              cancelStrongestAttacker = true;
            }
          }
        } else {
          if (isPlayerOwned !== isPlayerAttacker) {
            if (spec.effect === "park_the_bus" && isPlayerSide !== isPlayerAttacker) {
              defenseModifiers += 6;
            }
            if (spec.effect === "fans" && isPlayerSide !== isPlayerAttacker) {
              defenseModifiers += 3;
            }
          }
        }
      }
    });

    if (isAttackingStage) {
      let finalAttack = (score * attackMultiplier) + attackModifiers;
      if (cancelStrongestAttacker) {
        let maxAttStrength = 0;
        slots.forEach((s) => {
          if (s.card && s.isRevealed && s.revealedInAttack) {
            maxAttStrength = Math.max(maxAttStrength, s.card.attack);
          }
        });
        finalAttack -= maxAttStrength;
      }
      return Math.max(0, finalAttack);
    } else {
      return Math.max(0, (score * defenseMultiplier) + defenseModifiers);
    }
  };

  // COMPUTE OFFENSIVE POWER
  const calculateTotalAttack = (
    isPlayer: boolean,
    attackerIdx: number,
    activeBooster: BoosterCard | null,
    activeSpecials: SpecialCard[],
    playerSlotsOverride?: typeof playerSlots,
    aiSlotsOverride?: typeof aiSlots
  ) => {
    const playerSpecials = isPlayer ? activeSpecials : playerActiveSpecial;
    const aiSpecials = isPlayer ? aiActiveSpecial : activeSpecials;

    return runRulesEngine(
      isPlayer,
      true,
      attackerIdx,
      activeBooster,
      playerSpecials,
      aiSpecials,
      playerSlotsOverride,
      aiSlotsOverride
    );
  };

  // COMPUTE DEFENSIVE POWER
  const calculateTotalDefense = (
    isPlayer: boolean,
    activeSpecials: SpecialCard[],
    playerSlotsOverride?: typeof playerSlots,
    aiSlotsOverride?: typeof aiSlots
  ) => {
    const playerSpecials = isPlayer ? activeSpecials : playerActiveSpecial;
    const aiSpecials = isPlayer ? aiActiveSpecial : activeSpecials;

    return runRulesEngine(
      isPlayer,
      false,
      null,
      null,
      playerSpecials,
      aiSpecials,
      playerSlotsOverride,
      aiSlotsOverride
    );
  };

  // CANCEL CARD SELECTION
  const handleCancelSelection = () => {
    setSelectedHandCardId(null);
    setBurningCardIds([]);
    setActiveTargetingCard(null);
  };

  // PLAY TACTICAL SPECIAL CARD
  const handlePlaySpecialCard = (id: string) => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    if (phase === "warmup") {
      addLog("خطأ: لا يمكن تفعيل الكروت التكتيكية أثناء فترة الإحماء والتسخين!", "danger");
      return;
    }

    if (isSpecialCardsBlocked(true)) {
      const blockingLegendSlot = aiSlots.find(
        (s) =>
          s.card &&
          s.isRevealed &&
          !s.card.silenced &&
          s.card.ability?.actions.some((a) => a.type === "BlockSpecialCards")
      );
      const blockingSpecial = aiActiveSpecial.find(
        (c) => c.ability?.actions.some((a) => a.type === "BlockSpecialCards")
      );

      if (blockingLegendSlot?.card) {
        addLog(
          `🚫 خطأ تكتيكي: تم منع تفعيل كارت التكتيك الخاص بك بسبب وجود اللاعب الأسطورة (${blockingLegendSlot.card.name}) لدى الخصم في الملعب، والذي يمتلك قدرة نشطة تقوم بإبطال مفعول وحظر جميع الكروت التكتيكية!`,
          "danger"
        );
      } else if (blockingSpecial) {
        addLog(
          `🚫 خطأ تكتيكي: تم منع تفعيل كارت التكتيك الخاص بك بسبب تأثير الكارت التكتيكي النشط للخصم (${blockingSpecial.name}) الذي يبطل ويحظر تفعيل الكروت التكتيكية!`,
          "danger"
        );
      } else {
        addLog(
          "🚫 خطأ تكتيكي: تم منع تفعيل كارت التكتيك الخاص بك حالياً لأن الخصم لديه تأثير نشط (لاعب أسطورة أو كارت تكتيكي) يقوم بإبطال وحظر جميع الكروت التكتيكية!",
          "danger"
        );
      }
      return;
    }

    const isPlayerActivePhase = phase === "player_turn" || phase === "attacking" || phase === "ai_attacking";
    if (!isPlayerActivePhase) return;

    if (isMultiplayer) {
      if (phase === "ai_attacking" && !isShotDeclared) {
        return;
      }
      if (phase === "attacking" && isShotDeclared) {
        return;
      }
    }
    
    // Check moves left first
    if ((phase === "player_turn" || phase === "attacking") && playerMovesLeft < 1) {
      addLog("لا تمتلك حركات كافية لتفعيل التكتيك الخاص!", "danger");
      return;
    }
    if (phase === "ai_attacking" && defenseMovesLeft < 1) {
      addLog("تنبيه الدفاع: لا تمتلك حركات كافية لتفعيل التكتيك الخاص!", "danger");
      return;
    }

    // Enforce reveals/activations limit per round (only during active attack/defense) based on maxMovesPerTurn
    if (phase === "attacking" || phase === "ai_attacking") {
      const playerPitchRevealsCount = playerSlots.filter(s => s.card && s.revealedInAttack).length;
      const playerSpecialsCount = playerActiveSpecial.length;
      if (playerPitchRevealsCount + playerSpecialsCount >= maxMovesPerTurn) {
        addLog(`خطأ تكتيكي: لقد استهلكت الحد الأقصى المسموح به لكشف الورق وتفعيل التكتيكات (${maxMovesPerTurn} كروت كحد أقصى بالجولة)!`, "danger");
        return;
      }
    }

    const card = playerHand.find((c) => c.id === id) as SpecialCard;
    if (!card) return;

    // Toggle off if clicking the already active targeting card
    if (activeTargetingCard?.id === id) {
      handleCancelSelection();
      return;
    }

    // INTERCEPT TARGETING CARDS
    const requiresTargeting = card.ability?.actions?.some(act => act.target === 'SelectedEnemy' || act.target === 'SelectedCard') || card.effect === 'red_card';
    if (requiresTargeting) {
      setActiveTargetingCard(card);
      setSelectedHandCardId(card.id);
      return;
    }

    // Deduct move
    const movesBeforePlay = (phase === "player_turn" || phase === "attacking") ? playerMovesLeft : defenseMovesLeft;
    const nextMoves = Math.max(0, movesBeforePlay - 1);
    
    if (phase === "player_turn" || phase === "attacking") {
      setPlayerMovesLeft(nextMoves);
    } else if (phase === "ai_attacking") {
      setDefenseMovesLeft(nextMoves);
    }

    // Remove from hand
    const nextHand = playerHand.filter((c) => c.id !== id);
    setPlayerHand(nextHand);

    // Apply special actions
    let nextPlayerDeck = [...playerDeck];
    let nextSpecialDeck = [...specialDeck];
    let nextActiveSpecials = [...playerActiveSpecial];
    let finalHand = nextHand;

    if (card.effect === "world_cup") {
      // Draws 2 extra cards instantly
      addLog(`🏆 تم تفعيل ${card.name}! استهلكت حركة واحدة وسحبت ورقتين فوراً من الباقات.`, "success");
      // Pick first player and first special if available
      let added: Card[] = [];
      if (nextPlayerDeck.length > 0) {
        added.push(nextPlayerDeck[0]);
        nextPlayerDeck = nextPlayerDeck.slice(1);
      }
      if (nextSpecialDeck.length > 0) {
        added.push(nextSpecialDeck[0]);
        nextSpecialDeck = nextSpecialDeck.slice(1);
      }
      finalHand = [...nextHand, ...added];
      setPlayerHand(finalHand);
      setPlayerDeck(nextPlayerDeck);
      setSpecialDeck(nextSpecialDeck);
      SoundEffects.playGoalCelebration();
    } else {
      // Append to active specials list
      nextActiveSpecials = [...playerActiveSpecial, card];
      setPlayerActiveSpecial(nextActiveSpecials);
      
      let logMsg = "";
      if (phase === "player_turn") {
        logMsg = `✨ تكتيك عام: قمت بتفعيل كارت التكتيك [ ${card.name} ] (استهلكت حركة واحدة)`;
      } else if (phase === "attacking") {
        logMsg = `⚔️ تعزيز الهجوم: قمت بتفعيل كارت التكتيك [ ${card.name} ] لتعزيز الهجمة! (استهلكت حركة واحدة)`;
      } else if (phase === "ai_attacking") {
        logMsg = `🛡️ تعزيز الدفاع: قمت بتفعيل كارت التكتيك [ ${card.name} ] لصد الهجوم! (استهلكت حركة واحدة)`;
      }
      if (logMsg) addLog(logMsg, "success");
    }

    setSelectedHandCardId(null);
    SoundEffects.playCardDraw();

    setCinematicEvent({
      type: "tactical",
      title: "تفعيل تكتيك خاص! ⚡",
      subtitle: card.description || "",
      cardName: card.name,
      cardIcon: card.icon,
      isLegend: false
    });
    setTimeout(() => {
      setCinematicEvent(null);
    }, 1800);

    const isAttackerPlay = (phase === "player_turn" || phase === "attacking");
    syncMultiplayerIfActive({
      playerHand: finalHand,
      playerDeck: nextPlayerDeck,
      specialDeck: nextSpecialDeck,
      activeSpecialPlayer: nextActiveSpecials,
      playerMoves: isAttackerPlay ? nextMoves : playerMovesLeft,
      defenseMoves: isAttackerPlay ? defenseMovesLeft : nextMoves
    });
  };

  // HELPER TO VALIDATE IF SLOT IS VALID TARGET FOR ACTIVE SPECIAL CARD
  const isValidTargetForCard = (card: SpecialCard, idx: number, isAi: boolean): boolean => {
    const slot = isAi ? aiSlots[idx] : playerSlots[idx];
    if (!slot || !slot.card) return false;

    if (!card.ability?.actions) {
      if (card.effect === "red_card") {
        return isAi; // red card targets enemy player cards
      }
      return false;
    }

    const hasSelectedEnemy = card.ability.actions.some(act => act.target === "SelectedEnemy");
    const hasSelectedCard = card.ability.actions.some(act => act.target === "SelectedCard");

    if (hasSelectedEnemy) {
      return isAi;
    }
    if (hasSelectedCard) {
      return true; // targets any card on pitch (ally or enemy)
    }

    return false;
  };

  // CO-ORDINATE CLICK ON PITCH SLOT
  const handleSelectPitchSlot = (idx: number, isAi: boolean = false) => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    // 0. Handle active targeting card plays
    if (activeTargetingCard) {
      if (!isValidTargetForCard(activeTargetingCard, idx, isAi)) {
        addLog("خطأ تكتيكي: هذا الكارت المستهدف غير صالح لهذا التكتيك الخاص!", "danger");
        return;
      }

      const targetSlots = isAi ? aiSlots : playerSlots;
      const setTargetSlots = isAi ? setAiSlots : setPlayerSlots;
      const targetSlot = targetSlots[idx];
      if (!targetSlot.card) return;

      const targetCard = { ...targetSlot.card };
      const actions = activeTargetingCard.ability?.actions || [];
      const durationTurns = actions[0]?.durationTurns || 2;
      const actType = actions[0]?.type || (activeTargetingCard.effect === "red_card" ? "DestroyCard" : "DestroyCard");

      setTargetSlots((prev) => {
        const next = [...prev];
        if (actType === "DestroyCard") {
          next[idx] = { card: null, isRevealed: false };
          if (isAi) {
            recycleAiCard(targetCard);
          } else {
            recyclePlayerCard(targetCard);
          }
        } else if (actType === "ReturnToHand") {
          next[idx] = { card: null, isRevealed: false };
          if (isAi) {
            setAiHand((p) => [...p, targetCard]);
          } else {
            setPlayerHand((p) => [...p, targetCard]);
          }
        } else if (actType === "FreezeCard") {
          targetCard.frozen = true;
          targetCard.frozenTurnsLeft = durationTurns;
          next[idx] = { ...prev[idx], card: targetCard };
        } else if (actType === "SilenceCard") {
          targetCard.silenced = true;
          targetCard.silencedTurnsLeft = durationTurns;
          next[idx] = { ...prev[idx], card: targetCard };
        } else if (actType === "StunCard") {
          targetCard.stunned = true;
          targetCard.stunnedTurnsLeft = durationTurns;
          next[idx] = { ...prev[idx], card: targetCard };
        } else if (actType === "RevealCard") {
          next[idx] = { ...prev[idx], isRevealed: true, revealedInTurn: turnCount, revealedByAbility: true };
          setTimeout(() => {
            triggerCardInstantEffects(targetCard, !isAi, "CardRevealed");
            triggerCardInstantEffects(targetCard, !isAi, "CardPlayed");
          }, 50);
        } else if (actType === "HideCard") {
          next[idx] = { ...prev[idx], isRevealed: false };
        }
        return next;
      });

      // Deduct move
      if (phase === "player_turn" || phase === "attacking") {
        setPlayerMovesLeft((prev) => Math.max(0, prev - 1));
      } else if (phase === "ai_attacking") {
        setDefenseMovesLeft((prev) => Math.max(0, prev - 1));
      }

      // Remove from hand
      setPlayerHand((prev) => prev.filter((c) => c.id !== activeTargetingCard.id));

      // Logger
      let actMsg = "";
      const sideName = isAi ? "للخصم" : "الخاص بك";
      if (actType === "DestroyCard") {
        actMsg = `🟥 كارت أحمر: قمت بطرد واستبعاد اللاعب [ ${targetCard.name} ] ${sideName} خارج الملعب تماماً!`;
        triggerScreenShake();
        SoundEffects.playWhistle();
      } else if (actType === "FreezeCard") {
        actMsg = `❄️ تجميد: قمت بتجميد لاعب [ ${targetCard.name} ] ${sideName} لمدة ${durationTurns} أدوار!`;
        SoundEffects.playTackleBlock();
      } else if (actType === "SilenceCard") {
        actMsg = `🔇 كتم القدرة: قمت بإلغاء قدرة لاعب [ ${targetCard.name} ] ${sideName} لمدة ${durationTurns} أدوار!`;
        SoundEffects.playTackleBlock();
      } else if (actType === "StunCard") {
        actMsg = `💫 صدمة تكتيكية: قمت بصدم وتعطيل لاعب [ ${targetCard.name} ] ${sideName} لمدة ${durationTurns} أدوار!`;
        SoundEffects.playTackleBlock();
      } else if (actType === "ReturnToHand") {
        actMsg = `🔄 سحب لليد: قمت بإرجاع [ ${targetCard.name} ] ${sideName} إلى يد المدرب.`;
        SoundEffects.playCardDraw();
      } else if (actType === "RevealCard") {
        actMsg = `👁️ كشف: قمت بقلب لاعب [ ${targetCard.name} ] ${sideName} ليصبح مكشوفاً بالملعب.`;
        SoundEffects.playCardDraw();
      } else if (actType === "HideCard") {
        actMsg = `🎭 إخفاء: قمت بقلب لاعب [ ${targetCard.name} ] ${sideName} ليصبح مقلوباً ومخفياً.`;
        SoundEffects.playCardDraw();
      } else {
        actMsg = `⚡ تم تطبيق تأثير [ ${activeTargetingCard.name} ] على اللاعب [ ${targetCard.name} ] ${sideName}.`;
        SoundEffects.playCardDraw();
      }

      addLog(actMsg, "success");
      
      // Clear targeting state
      setActiveTargetingCard(null);
      setSelectedHandCardId(null);
      
      syncMultiplayerIfActive();
      return;
    }
    // 1. Handling WARMUP phase (zero cost swaps)
    if (phase === "warmup") {
      if (selectedHandCardId) {
        const handIdx = playerHand.findIndex((c) => c.id === selectedHandCardId);
        if (handIdx !== -1) {
          performWarmupSwap(handIdx, idx);
        }
      } else {
        // Pitch-to-pitch slot swap
        if (selectedPitchSlotIdx === null) {
          setSelectedPitchSlotIdx(idx);
          addLog(`[التسخين] تم تحديد اللاعب بالمركز ${idx + 1}. حدد مركزاً آخر للتبديل معه بالملعب.`, "neutral");
        } else {
          if (selectedPitchSlotIdx === idx) {
            setSelectedPitchSlotIdx(null);
            return;
          }
          const card1 = playerSlots[selectedPitchSlotIdx].card;
          const card2 = playerSlots[idx].card;
          const newSlots = [...playerSlots];
          newSlots[selectedPitchSlotIdx] = { ...newSlots[selectedPitchSlotIdx], card: card2 };
          newSlots[idx] = { ...newSlots[idx], card: card1 };
          setPlayerSlots(newSlots);
          setSelectedPitchSlotIdx(null);
          addLog(`[التسخين] تم تبديل مراكز اللاعبين بالملعب بين المركز ${selectedPitchSlotIdx + 1} والمركز ${idx + 1} بنجاح!`, "success");
          SoundEffects.playCardDraw();
          syncMultiplayerIfActive();
        }
      }
      return;
    }

    // 2. Handling main player turn swaps & attack setups
    if (phase === "player_turn") {
      if (playerMovesLeft < 1) {
        addLog("عذراً، استنفدت كامل حركاتك لهذا الدور. يمكنك فقط إنهاء الدور!", "warning");
        return;
      }

      // If a card is selected in hand, try to perform swapping
      if (selectedHandCardId) {
        const cardIdx = playerHand.findIndex((c) => c.id === selectedHandCardId);
        if (cardIdx === -1) return;
        const handCard = playerHand[cardIdx];

        if (handCard.type !== "player") {
          addLog("خطأ تكتيكي: كروت الحركة والخطط لا توضع في الملعب بصفة مباشرة!", "danger");
          return;
        }

        const playerCard = handCard as PlayerCard;

        // Check if Legend card
        if (playerCard.isLegend) {
          if (burningCardIds.length < legendBurnLimit) {
            addLog(`هذا اللاعب أسطورة أسطورية! يرجى تحديد ${legendBurnLimit} كروت من يدك لحرقها (النقر فوقها أولاً) لتتمكن من تنزيله.`, "warning");
            return;
          }

          // Execute Legend placement
          // 1. Remove and recycle the burnt cards (if any) and the played card itself
          if (legendBurnLimit > 0) {
            playerHand.forEach((c) => {
              if (burningCardIds.includes(c.id) && c.type === "player") {
                recyclePlayerCard(c as PlayerCard);
              }
            });
            setPlayerHand((prev) => prev.filter((c) => !burningCardIds.includes(c.id) && c.id !== selectedHandCardId));
          } else {
            setPlayerHand((prev) => prev.filter((c) => c.id !== selectedHandCardId));
          }

          // 2. Place Legend, resolving swap rules on replaced player
          const targetSlot = playerSlots[idx];
          const newSlots = [...playerSlots];
          newSlots[idx] = { card: playerCard, isRevealed: false };
          setPlayerSlots(newSlots);

          const burnLogText = legendBurnLimit > 0 ? `تم حرق ${legendBurnLimit} كروت و` : "تم ";
          if (targetSlot.card) {
            if (targetSlot.isRevealed) {
              addLog(`🔥 🔄 تم استبدال لاعب من الدكة بلاعب من الملعب بالمركز [ ${idx + 1} ] (تضحية فائقة - استهلكت حركة واحدة). ${burnLogText}عزل اللاعب المكشوف خارج الماتش ونزول لاعب جديد مقلوباً.`, "success");
            } else {
              // Face down, returns to hand
              setPlayerHand((prev) => [...prev, targetSlot.card!]);
              addLog(`🔥 🔄 تم استبدال لاعب من الدكة بلاعب من الملعب بالمركز [ ${idx + 1} ] (تضحية فائقة - استهلكت حركة واحدة). ${burnLogText}استرجاع اللاعب المقلوب ليدك ونزول لاعب جديد مقلوباً.`, "success");
            }
          } else {
            addLog(`🔥 🔄 تم استبدال لاعب من الدكة بلاعب من الملعب بالمركز الخالي [ ${idx + 1} ] (تنزيل لاعب - استهلكت حركة واحدة). ${burnLogText}نزول لاعب جديد مقلوباً.`, "success");
          }

          setPlayerMovesLeft((prev) => prev - 1);
          handleCancelSelection();
          SoundEffects.playWhistle();
          triggerCardInstantEffects(playerCard, true, "CardPlayed");
          syncMultiplayerIfActive();
          return;
        }

        // Regular player Swap logic:
        const currentPitchItem = playerSlots[idx];
        const newSlots = [...playerSlots];
        newSlots[idx] = { card: playerCard, isRevealed: false };
        setPlayerSlots(newSlots);

        // Remove card from hand
        setPlayerHand((prev) => prev.filter((c) => c.id !== selectedHandCardId));

        if (currentPitchItem.card) {
          if (currentPitchItem.isRevealed) {
            // "إذا تبدل لاعب مكشوف يخرج خارج اللعب تماماً" (disappears/burned)
            recyclePlayerCard(currentPitchItem.card);
            addLog(`🔄 تم استبدال لاعب من الدكة بلاعب من الملعب بالمركز [ ${idx + 1} ] (استبدال حاسم - استهلكت حركة واحدة). تم طرد اللاعب المكشوف خارج الملعب ونزول لاعب جديد مقلوباً.`, "warning");
          } else {
            // "ترجعه ليدك وتضع الجديد مقلوباً"
            setPlayerHand((prev) => [...prev, currentPitchItem.card!]);
            addLog(`🔄 تم استبدال لاعب من الدكة بلاعب من الملعب بالمركز [ ${idx + 1} ] (مبادلة جيدة - استهلكت حركة واحدة). تم استرجاع اللاعب المقلوب ليدك ونزول لاعب جديد مقلوباً.`, "success");
          }
        } else {
          addLog(`🔄 تم استبدال لاعب من الدكة بلاعب من الملعب بالمركز الخالي [ ${idx + 1} ] (تنزيل صامت - استهلكت حركة واحدة). وضع لاعب جديد مقلوباً.`, "info");
        }

        setPlayerMovesLeft((prev) => prev - 1);
        setSelectedHandCardId(null);
        SoundEffects.playCardDraw();
        triggerCardInstantEffects(playerCard, true, "CardPlayed");
        syncMultiplayerIfActive();
        return;
      }

      // No card selected in hand -> Clicking a slot is for selecting target striker to declare an attack!
      const clickedSlot = playerSlots[idx];
      if (clickedSlot.card && !clickedSlot.isRevealed) {
        // Candidate selection for attack
        setSelectedPitchSlotIdx(idx);
      }
    }

    // 3. Handling Defensive reveals during AI main Attacks (Player defends)
    if (phase === "ai_attacking") {
      if (isMultiplayer && !isShotDeclared) {
        return;
      }
      if (isDefenseBlockedFor(true)) {
        addLog("🚫 خطأ تكتيكي: التصدّي والمشاركة بالدفاع محظور حالياً بسبب تأثير هجومي للخصم!", "danger");
        return;
      }
      const clickedSlot = playerSlots[idx];
      if (!clickedSlot.card) return;

      if (clickedSlot.isRevealed) {
        // Flipping back a revealed defender card
        if (clickedSlot.revealedInAttack) {
          if (clickedSlot.confirmedInAttack) {
            addLog("🚫 خطأ تكتيكي: لا يمكنك إلغاء قلب هذا المدافع لأنه تم تأكيد مشاركته في الصد في خطوة سابقة!", "warning");
            return;
          }
          const newSlots = [...playerSlots];
          newSlots[idx] = { ...clickedSlot, isRevealed: false, revealedInAttack: false };
          setPlayerSlots(newSlots);
          setDefenseMovesLeft((prev) => Math.min(maxMovesPerTurn, prev + 1));
          
          // Remove the reveal log for this defender from tempPhaseLogs
          setTempPhaseLogs((prev) => prev.filter(l => !l.text.includes(`[ ${clickedSlot.card!.name} ]`)));

          SoundEffects.playCardDraw();
          syncMultiplayerIfActive();
        }
        return;
      }

      // Enforce reveals/activations limit per round based on match settings
      const playerPitchRevealsCount = playerSlots.filter(s => s.card && s.revealedInAttack).length;
      const playerSpecialsCount = playerActiveSpecial.length;
      if (playerPitchRevealsCount + playerSpecialsCount >= maxMovesPerTurn) {
        addLog(`خطأ تكتيكي: لا يمكنك كشف وتفعيل أكثر من ${maxMovesPerTurn} كروت إجمالاً بالجولة الواحدة!`, "danger");
        return;
      }

      if (defenseMovesLeft < 1) {
        addLog(`تنبيه الحارس: استهلكت حركات الدفاع الـ ${maxMovesPerTurn} بالكامل لحماية مرماك!`, "warning");
        return;
      }

      // Turn Face Up to help defense
      const newSlots = [...playerSlots];
      newSlots[idx] = { ...clickedSlot, isRevealed: true, revealedInTurn: turnCount, revealedInAttack: true };
      setPlayerSlots(newSlots);
      setDefenseMovesLeft((prev) => prev - 1);
      addLog(`🛡️ تم كشف المدافع [ ${clickedSlot.card.name} ] لصد الهجوم! (استهلكت حركة واحدة)`, "success");
      SoundEffects.playCardDraw();
      syncMultiplayerIfActive();

      if (clickedSlot.card.ability) {
        setCinematicEvent({
          type: "ability",
          title: "تفعيل قدرة أسطورية! 👑",
          subtitle: clickedSlot.card.description || "",
          cardName: clickedSlot.card.name,
          cardIcon: clickedSlot.card.avatar,
          isLegend: clickedSlot.card.isLegend
        });
        setTimeout(() => setCinematicEvent(null), 1800);
        setTimeout(() => {
          triggerCardInstantEffects(clickedSlot.card!, true, "CardRevealed");
          triggerCardInstantEffects(clickedSlot.card!, true, "CardPlayed");
        }, 50);
      }
    }

    // 4. Handling Extra revealing actions during active attacks (Player attacks)
    if (phase === "attacking") {
      if (isMultiplayer && isShotDeclared) {
        return;
      }
      const clickedSlot = playerSlots[idx];
      if (!clickedSlot.card) return;

      if (clickedSlot.isRevealed) {
        // Flipping back an already revealed card during active attack
        if (clickedSlot.revealedInAttack) {
          if (idx === currentAttackerIdx) {
            if (isAttackBlocked) {
              addLog("🚫 خطأ تكتيكي: لا يمكنك إلغاء الهجمة بعد بدء محاولة التسديد وإعلان الهجوم! يجب عليك إكمال الهجمة وتسديد الكرة.", "warning");
              return;
            }
            // Cancel whole attack declaration and all supporting reveals
            let refundedMoves = 0;
            const newSlots = playerSlots.map((s) => {
              if (s.revealedInAttack) {
                refundedMoves++;
                return { ...s, isRevealed: false, revealedInAttack: false };
              }
              return s;
            });
            setPlayerSlots(newSlots);

            const movesAfterCancel = Math.min(maxMovesPerTurn, playerMovesLeft + refundedMoves);
            setPlayerMovesLeft(movesAfterCancel);

            const finalBoosterDeck = currentBooster ? [currentBooster, ...boosterDeck] : boosterDeck;
            if (currentBooster) {
              setBoosterDeck(finalBoosterDeck);
              setCurrentBooster(null);
            }

            phaseRef.current = "player_turn";
            setPhase("player_turn");
            setCurrentAttackerIdx(null);
            setTempPhaseLogs([]); // Clear any deferred commentaries

            SoundEffects.playCardDraw();

            if (isMultiplayer) {
              syncToSupabaseInstance(
                "player_turn",
                newSlots,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                movesAfterCancel,
                undefined,
                logs,
                null,
                null,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                finalBoosterDeck,
                null
              );
            }
            return;
          } else {
            if (clickedSlot.confirmedInAttack) {
              addLog("🚫 خطأ تكتيكي: لا يمكنك إلغاء قلب هذا المهاجم لأنه تم استخدامه للتسديد في خطوة سابقة!", "warning");
              return;
            }
            // Cancel additional reveal
            const newSlots = [...playerSlots];
            newSlots[idx] = { ...clickedSlot, isRevealed: false, revealedInAttack: false };
            setPlayerSlots(newSlots);
            setPlayerMovesLeft((prev) => Math.min(maxMovesPerTurn, prev + 1));

            // Remove the reveal log for this striker from tempPhaseLogs
            setTempPhaseLogs((prev) => prev.filter(l => !l.text.includes(`[ ${clickedSlot.card!.name} ]`)));

            SoundEffects.playCardDraw();
            syncMultiplayerIfActive();
          }
        }
        return;
      }

      // Enforce reveals/activations limit per round based on match settings
      const playerPitchRevealsCount = playerSlots.filter(s => s.card && s.revealedInAttack).length;
      const playerSpecialsCount = playerActiveSpecial.length;
      if (playerPitchRevealsCount + playerSpecialsCount >= maxMovesPerTurn) {
        addLog(`خطأ تكتيكي: لا يمكنك كشف وتفعيل أكثر من ${maxMovesPerTurn} كروت إجمالاً بالجولة الواحدة!`, "danger");
        return;
      }

      if (playerMovesLeft < 1) {
        addLog("لا تمتلك حركات متبقية لإجراء كشوفات إضافية!", "warning");
        return;
      }

      // "إذا تبقت لك حركة إضافية كمهاجم، يمكنك كشف مهاجم آخر في ملعبك لزيادة قوتك"
      const newSlots = [...playerSlots];
      newSlots[idx] = { ...clickedSlot, isRevealed: true, revealedInTurn: turnCount, revealedInAttack: true };
      setPlayerSlots(newSlots);
      setPlayerMovesLeft((prev) => prev - 1);
      addLog(`⚔️ تم كشف المهاجم الداعم [ ${clickedSlot.card.name} ] لتعزيز الهجمة! (استهلكت حركة واحدة)`, "success");
      SoundEffects.playCardDraw();
      syncMultiplayerIfActive();

      if (clickedSlot.card.ability) {
        setCinematicEvent({
          type: "ability",
          title: "تفعيل قدرة أسطورية! 👑",
          subtitle: clickedSlot.card.description || "",
          cardName: clickedSlot.card.name,
          cardIcon: clickedSlot.card.avatar,
          isLegend: clickedSlot.card.isLegend
        });
        setTimeout(() => setCinematicEvent(null), 1800);
        setTimeout(() => {
          triggerCardInstantEffects(clickedSlot.card!, true, "CardRevealed");
          triggerCardInstantEffects(clickedSlot.card!, true, "CardPlayed");
        }, 50);
      }
    }
  };

  // CHECK PITCH SLOT SELECTABILITY STATE
  const isSlotSelectable = (idx: number, isAi: boolean): boolean => {
    if (activeTargetingCard) {
      return isValidTargetForCard(activeTargetingCard, idx, isAi);
    }

    if (phase === "warmup") {
      // In Warmup only player slots are swappable if card selected
      return !isAi && selectedHandCardId !== null;
    }

    if (phase === "player_turn") {
      if (isAi) return false;
      // Selectable if we have card in hand selected for swap, or if slot has player to attack with
      if (selectedHandCardId) return true;
      const slot = playerSlots[idx];
      return slot.card !== null && !slot.isRevealed;
    }

    if (phase === "ai_attacking") {
      // Player defends, can reveal their owned slots or flip back already revealed ones
      if (isAi) return false;
      const slot = playerSlots[idx];
      return slot.card !== null && (!slot.isRevealed && defenseMovesLeft > 0 || (slot.isRevealed && !!slot.revealedInAttack && !slot.confirmedInAttack));
    }

    if (phase === "attacking") {
      // Can reveal extra player cards on pitch if there's moves left, or click to flip back revealed ones
      if (isAi) return false;
      const slot = playerSlots[idx];
      return slot.card !== null && (!slot.isRevealed && playerMovesLeft > 0 || (slot.isRevealed && !!slot.revealedInAttack && !slot.confirmedInAttack));
    }

    return false;
  };

  // DECLARE PLAYER ATTACK
  const handleDeclareAttack = () => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    if (isAttackBlockedFor(true)) {
      const blockingLegendSlot = aiSlots.find(
        (s) =>
          s.card &&
          s.isRevealed &&
          !s.card.silenced &&
          s.card.ability?.actions.some((a) => a.type === "BlockAttack")
      );
      const blockingSpecial = aiActiveSpecial.find(
        (c) => c.ability?.actions.some((a) => a.type === "BlockAttack")
      );

      if (blockingLegendSlot?.card) {
        addLog(
          `🚫 خطأ تكتيكي: شن الهجوم محظور حالياً بسبب وجود اللاعب الأسطورة (${blockingLegendSlot.card.name}) لدى الخصم في الملعب، والذي يمتلك قدرة نشطة على حظر هجماتك!`,
          "danger"
        );
      } else if (blockingSpecial) {
        addLog(
          `🚫 خطأ تكتيكي: شن الهجوم محظور حالياً بسبب تأثير الكارت التكتيكي النشط للخصم (${blockingSpecial.name}) الذي يمنع الهجوم!`,
          "danger"
        );
      } else {
        addLog(
          "🚫 خطأ تكتيكي: شن الهجوم محظور حالياً بسبب تأثير دفاعي نشط للخصم يمنع الهجوم!",
          "danger"
        );
      }
      return;
    }

    if (hasScoredThisTurn) {
      addLog("ممنوع تكرار الهجوم: لقد أحرزت هدفاً بالفعل في هذه الجولة! لا يمكنك شن هجمات جديدة الآن، فقط مسموح لك بإعادة تنظيم صفوفك (تبديل أو تنزيل لاعبين) أو إنهاء دورك.", "warning");
      return;
    }

    if (playerMovesLeft < 1) {
      addLog("تحذير تكتيكي: لا تمتلك نقاط حركة كافية لشن هجوم!", "danger");
      return;
    }

    // We must have selected a valid Face Down player slot
    const targetIdx = selectedPitchSlotIdx !== null ? selectedPitchSlotIdx : playerSlots.findIndex((s) => s.card !== null && !s.isRevealed);
    if (targetIdx === -1 || !playerSlots[targetIdx].card) {
      addLog("خطأ: يرجى تحديد كرت لاعب مقفول بملعبك أولاً لقيادة غارتك الهجومية!", "danger");
      return;
    }

    const attacker = playerSlots[targetIdx].card!;
    setCurrentAttackerIdx(targetIdx);
    setIsPlayerAttacker(true);

    // 1. Flip attacker Face Up and reset slots' active attack reveal state
    const cleanPlayerSlots = playerSlots.map((s, idx) => ({
      ...s,
      revealedInAttack: idx === targetIdx
    }));
    cleanPlayerSlots[targetIdx] = {
      ...cleanPlayerSlots[targetIdx],
      isRevealed: true,
      revealedInTurn: turnCount,
      revealedInAttack: true
    };
    setPlayerSlots(cleanPlayerSlots);

    if (attacker.ability) {
      setCinematicEvent({
        type: "ability",
        title: "تفعيل قدرة أسطورية! 👑",
        subtitle: attacker.description || "",
        cardName: attacker.name,
        cardIcon: attacker.avatar,
        isLegend: attacker.isLegend
      });
      setTimeout(() => setCinematicEvent(null), 1800);
      setTimeout(() => {
        triggerCardInstantEffects(attacker, true, "CardRevealed");
        triggerCardInstantEffects(attacker, true, "CardPlayed");
        triggerAttackStartedAbilities("player");
      }, 50);
    } else {
      triggerAttackStartedAbilities("player");
    }

    // Reset AI slots revealedInAttack too
    setAiSlots((prev) => prev.map((s) => ({ ...s, revealedInAttack: false })));

    // 2. Draw Booster card
    if (boosterDeck.length === 0) {
      setBoosterDeck(generateBoosterDeck(maxBonusValue));
    }
    const drawnBooster = boosterDeck.length > 0 ? boosterDeck[0] : generateBoosterDeck(maxBonusValue)[0];
    setCurrentBooster(drawnBooster);
    setBoosterDeck((prev) => prev.slice(1));

    // Deduct 1 move
    const movesAfterDeclare = playerMovesLeft - 1;
    setPlayerMovesLeft(movesAfterDeclare);
    setPhase("attacking");
    setDefenseMovesLeft(maxMovesPerTurn);

    SoundEffects.playWhistle();

    if (isMultiplayer) {
      setAttackerRole(multiplayerRole);
      setTimeout(() => {
        syncToSupabaseInstance(
          "attacking",
          cleanPlayerSlots,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          movesAfterDeclare,
          undefined,
          logs, // Keep existing logs unchanged
          drawnBooster,
          targetIdx,
          undefined,
          undefined,
          undefined,
          undefined,
          3, // Provide 3 defense moves for the opponent to react!
          undefined,
          undefined,
          boosterDeck.slice(1),
          multiplayerRole
        );
      }, 50);
    } else {
      // Offline mode starting attack is silent. Logs will be written on click of "Resolve Attack".
    }
  };

  // AI ACTIONS LOGIC (NPC TURNS CALCULATOR)
  const triggerAIDefenseReaction = (
    playerAttackerIdx: number,
    drawnBooster: BoosterCard,
    onComplete?: (updatedSlots: typeof aiSlots, updatedSpecials: typeof aiActiveSpecial) => void
  ) => {
    addLog(`🤖 الخصم ${formatNameWithTitle(aiCoachName, "المدرب")} يحلل قوة تسديدتك ويتحلّى بالذكاء التكتيكي للصد والعرقلة...`, "neutral");

    setTimeout(() => {
      let aiMoves = defenseMovesLeft;
      const updatedAiSlots = [...aiSlots];
      let aiSpecialsPlayed: SpecialCard[] = [];

      // Determine players total attack score
      const playerAttackScore = calculateTotalAttack(true, playerAttackerIdx, drawnBooster, playerActiveSpecial);

      // Baseline AI defense before new reveals
      let currentDefenseScore = calculateTotalDefense(false, aiActiveSpecial);

      // 1. Evaluate playing critical defensive specials if helpful
      const defensiveSpecials = isSpecialCardsBlocked(false) ? [] : aiHand.filter((c) => {
        if (c.type !== "special") return false;
        if (c.effect === "park_the_bus" || c.effect === "offside" || c.effect === "wet_pitch" || c.effect === "fans") return true;
        // Dynamic checks
        if (c.ability && c.ability.trigger === "CardPlayed") {
          return c.ability.actions.some(act => 
            (act.type === "AddStat" && act.stat === "defense" && (act.target === "Allies" || act.target === "CurrentDefense")) ||
            (act.type === "AddStat" && act.stat === "attack" && act.value !== undefined && act.value < 0 && (act.target === "Enemies" || act.target === "CurrentAttack")) ||
            (act.type === "CancelAction" && act.target === "CurrentAttack") ||
            (["FreezeCard", "SilenceCard", "StunCard", "DestroyCard"].includes(act.type) && (act.target === "SelectedEnemy" || act.target === "SelectedCard"))
          );
        }
        return false;
      }) as SpecialCard[];

      let remainingDefSpecials = [...defensiveSpecials];
      while (playerAttackScore > currentDefenseScore && remainingDefSpecials.length > 0 && aiMoves > 0) {
        // Pick best defensive special
        const offsideSpecial = remainingDefSpecials.find((c) => c.effect === "offside" || c.ability?.actions.some(a => a.type === "CancelAction"));
        const targetSpecial = remainingDefSpecials.find((c) => c.ability?.actions.some(a => ["FreezeCard", "SilenceCard", "StunCard", "DestroyCard"].includes(a.type)));
        const parkSpecial = remainingDefSpecials.find((c) => c.effect === "park_the_bus" || c.ability?.actions.some(a => a.type === "AddStat" && a.stat === "defense" && a.value !== undefined && a.value >= 4));
        const wetSpecial = remainingDefSpecials.find((c) => c.effect === "wet_pitch" || c.ability?.actions.some(a => a.type === "AddStat" && a.stat === "attack" && a.value !== undefined && a.value <= -4));
        const fansSpecial = remainingDefSpecials.find((c) => c.effect === "fans" || c.ability?.actions.some(a => a.type === "AddStat" && a.value !== undefined && a.value >= 2));

        const chosenSpecial = offsideSpecial || targetSpecial || parkSpecial || wetSpecial || fansSpecial;
        if (!chosenSpecial) break;

        aiSpecialsPlayed.push(chosenSpecial);
        remainingDefSpecials = remainingDefSpecials.filter((c) => c.id !== chosenSpecial.id);
        aiMoves--;
        addLog(`🤖 الخصم يلعب كارت التكتيك [ ${chosenSpecial.name} ] لعرقلة الهجوم! (استهلك حركة واحدة)`, "danger");

        // Apply targeted effect to player's active attacker if chosenSpecial has a targeting action
        const action = chosenSpecial.ability?.actions[0];
        if (action && ["FreezeCard", "SilenceCard", "StunCard", "DestroyCard"].includes(action.type)) {
          if (playerAttackerIdx !== -1 && playerSlots[playerAttackerIdx]?.card) {
            const targetCard = { ...playerSlots[playerAttackerIdx].card! };
            const durationTurns = action.durationTurns || 2;
            setPlayerSlots((prev) => {
              const next = [...prev];
              if (action.type === "DestroyCard") {
                next[playerAttackerIdx] = { card: null, isRevealed: false };
              } else if (action.type === "FreezeCard") {
                targetCard.frozen = true;
                targetCard.frozenTurnsLeft = durationTurns;
                next[playerAttackerIdx] = { ...prev[playerAttackerIdx], card: targetCard };
              } else if (action.type === "SilenceCard") {
                targetCard.silenced = true;
                targetCard.silencedTurnsLeft = durationTurns;
                next[playerAttackerIdx] = { ...prev[playerAttackerIdx], card: targetCard };
              } else if (action.type === "StunCard") {
                targetCard.stunned = true;
                targetCard.stunnedTurnsLeft = durationTurns;
                next[playerAttackerIdx] = { ...prev[playerAttackerIdx], card: targetCard };
              }
              return next;
            });

            // Log success
            let targetMsg = "";
            if (action.type === "DestroyCard") {
              targetMsg = `🤖 الخصم طرد واستبعد مهاجمك [ ${targetCard.name} ] تماماً بالبطاقة الحمراء!`;
            } else if (action.type === "FreezeCard") {
              targetMsg = `🤖 الخصم جمّد مهاجمك [ ${targetCard.name} ] لمدة ${durationTurns} أدوار!`;
            } else if (action.type === "SilenceCard") {
              targetMsg = `🤖 الخصم كتم قدرة مهاجمك [ ${targetCard.name} ] لمدة ${durationTurns} أدوار!`;
            } else if (action.type === "StunCard") {
              targetMsg = `🤖 الخصم صدم مهاجمك [ ${targetCard.name} ] لمدة ${durationTurns} أدوار!`;
            }
            addLog(targetMsg, "danger");
          }
        }
        
        // Re-calculate defense with the new special
        currentDefenseScore = calculateTotalDefense(false, [...aiActiveSpecial, ...aiSpecialsPlayed]);
      }

      if (aiSpecialsPlayed.length > 0) {
        setAiHand((prev) => prev.filter((c) => !aiSpecialsPlayed.some((sp) => sp.id === c.id)));
      }

      // Remaining score defense gap to stop the goal
      const defenseGap = playerAttackScore - currentDefenseScore;

      // Smart decision engine: locate optimal card reveals to overcome the remaining gap
      // Allowed reveals is at most maxMovesPerTurn cards including special cards activated in this resolution
      const maxPitchReveals = Math.max(0, maxMovesPerTurn - aiSpecialsPlayed.length);
      const allowedReveals = isDefenseBlockedFor(false) ? 0 : Math.min(maxPitchReveals, aiMoves);
      const candidates = updatedAiSlots
        .map((s, idx) => ({ slot: s, idx }))
        .filter((item) => item.slot.card !== null && !item.slot.isRevealed && !item.slot.spent);

      if (defenseGap > 0 && candidates.length > 0 && allowedReveals > 0) {
        let bestCombination: { idx: number; defense: number }[] = [];
        let isSolved = false;

        // Try Single card: find the card with minimal defense that is >= defenseGap
        let singleWins = candidates
          .filter((c) => c.slot.card!.defense >= defenseGap)
          .sort((a, b) => a.slot.card!.defense - b.slot.card!.defense);

        if (singleWins.length > 0) {
          bestCombination = [{ idx: singleWins[0].idx, defense: singleWins[0].slot.card!.defense }];
          isSolved = true;
        }

        // Try Dual cards (if allowedReveals >= 2)
        if (!isSolved && allowedReveals >= 2 && candidates.length >= 2) {
          let pairs: { card1: any; card2: any; sum: number }[] = [];
          for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
              const sum = candidates[i].slot.card!.defense + candidates[j].slot.card!.defense;
              if (sum >= defenseGap) {
                pairs.push({ card1: candidates[i], card2: candidates[j], sum });
              }
            }
          }
          if (pairs.length > 0) {
            pairs.sort((a, b) => a.sum - b.sum);
            bestCombination = [
              { idx: pairs[0].card1.idx, defense: pairs[0].card1.slot.card!.defense },
              { idx: pairs[0].card2.idx, defense: pairs[0].card2.slot.card!.defense }
            ];
            isSolved = true;
          }
        }

        // Try Triple cards (if allowedReveals >= 3)
        if (!isSolved && allowedReveals >= 3 && candidates.length >= 3) {
          let triplets: { card1: any; card2: any; card3: any; sum: number }[] = [];
          for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
              for (let k = j + 1; k < candidates.length; k++) {
                const sum = candidates[i].slot.card!.defense + candidates[j].slot.card!.defense + candidates[k].slot.card!.defense;
                if (sum >= defenseGap) {
                  triplets.push({ card1: candidates[i], card2: candidates[j], card3: candidates[k], sum });
                }
              }
            }
          }
          if (triplets.length > 0) {
            triplets.sort((a, b) => a.sum - b.sum);
            bestCombination = [
              { idx: triplets[0].card1.idx, defense: triplets[0].card1.slot.card!.defense },
              { idx: triplets[0].card2.idx, defense: triplets[0].card2.slot.card!.defense },
              { idx: triplets[0].card3.idx, defense: triplets[0].card3.slot.card!.defense }
            ];
            isSolved = true;
          }
        }

        // Try Quadruple cards (if allowedReveals >= 4)
        if (!isSolved && allowedReveals >= 4 && candidates.length >= 4) {
          let quads: { card1: any; card2: any; card3: any; card4: any; sum: number }[] = [];
          for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
              for (let k = j + 1; k < candidates.length; k++) {
                for (let l = k + 1; l < candidates.length; l++) {
                  const sum = candidates[i].slot.card!.defense + candidates[j].slot.card!.defense + candidates[k].slot.card!.defense + candidates[l].slot.card!.defense;
                  if (sum >= defenseGap) {
                    quads.push({ card1: candidates[i], card2: candidates[j], card3: candidates[k], card4: candidates[l], sum });
                  }
                }
              }
            }
          }
          if (quads.length > 0) {
            quads.sort((a, b) => a.sum - b.sum);
            bestCombination = [
              { idx: quads[0].card1.idx, defense: quads[0].card1.slot.card!.defense },
              { idx: quads[0].card2.idx, defense: quads[0].card2.slot.card!.defense },
              { idx: quads[0].card3.idx, defense: quads[0].card3.slot.card!.defense },
              { idx: quads[0].card4.idx, defense: quads[0].card4.slot.card!.defense }
            ];
            isSolved = true;
          }
        }

        // If we cannot solve the defense even with all allowed reveals, let's play our best defenders to try and stop it (triggering any latent abilities!)
        if (!isSolved && allowedReveals > 0 && candidates.length > 0) {
          candidates.sort((a, b) => b.slot.card!.defense - a.slot.card!.defense);
          bestCombination = candidates.slice(0, allowedReveals).map(c => ({ idx: c.idx, defense: c.slot.card!.defense }));
          isSolved = bestCombination.length > 0;
        }

        if (!isSolved) {
          addLog(`🤖 الخصم حلل المسار الرياضي للتسديدة وأدرك استحالة الصد لعدم وجود مدافعين متاحين بالملعب، وفضل الحفاظ على أوراقه لتوفير هجمة مضادة لاحقاً!`, "danger");
        } else {
          // Reveal the optimized combination of cards
          bestCombination.forEach((item) => {
            updatedAiSlots[item.idx].isRevealed = true;
            updatedAiSlots[item.idx].revealedInTurn = turnCount;
            updatedAiSlots[item.idx].revealedInAttack = true;
            aiMoves--;
            addLog(`🛡️ الخصم تيقظ تكتيكياً وكشف صخرته الدفاعية [ ${updatedAiSlots[item.idx].card?.name} ] محرزاً +${item.defense} نقاط صد! (استهلك حركة واحدة)`, "info");
          });

          // Show AI ability reveal if any has it
          const aiAbilityCard = bestCombination.map(item => updatedAiSlots[item.idx].card).find(c => c && c.ability);
          if (aiAbilityCard) {
            setCinematicEvent({
              type: "ability",
              title: "تفعيل قدرة أسطورية للخصم! 🧠",
              subtitle: aiAbilityCard.description || "",
              cardName: aiAbilityCard.name,
              cardIcon: aiAbilityCard.avatar,
              isLegend: aiAbilityCard.isLegend
            });
            setTimeout(() => setCinematicEvent(null), 1800);
            setTimeout(() => {
              triggerCardInstantEffects(aiAbilityCard, false, "CardRevealed");
              triggerCardInstantEffects(aiAbilityCard, false, "CardPlayed");
            }, 100);
          }
        }
      } else if (defenseGap <= 0) {
        addLog(`🤖 الخصم مطمئن لخطوطه وسحره الحالي تماماً، وتجاوز الصد دون الحاجة لكشف المزيد من المدافعين.`, "neutral");
      }

      setAiSlots(updatedAiSlots);
      setDefenseMovesLeft(aiMoves);
      const withNewSpecials = [...aiActiveSpecial, ...aiSpecialsPlayed];
      setAiActiveSpecial((prev) => [...prev, ...aiSpecialsPlayed]);
      SoundEffects.playTackleBlock();

      if (onComplete) {
        onComplete(updatedAiSlots, withNewSpecials);
      }
    }, 1200);
  };

  // MAIN RESOLUTION OF ACTIVE PLAYER ATTACK
  const handleResolveAttack = () => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    if (isResolvingRef.current || phaseRef.current !== "attacking") return;
    isResolvingRef.current = true;

    if (currentAttackerIdx === null || !currentBooster) {
      isResolvingRef.current = false;
      return;
    }

    phaseRef.current = "resolution";

    // Gather all confirmed attack action details
    const attacker = playerSlots[currentAttackerIdx].card!;
    const confirmLogs: ActionLog[] = [];
    const addConfirmLog = (text: string, type: ActionLog["type"] = "neutral") => {
      confirmLogs.push({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: getFormattedTime(),
        text,
        type
      });
    };

    // 1. Initial declare log
    addConfirmLog(`⚔️ تم بدء الهجمة بقيادة المهاجم [ ${attacker.name} ] بقوة هجوم أساسية ${attacker.attack}، وسحبت معزز [ ${currentBooster.text} ] (+${currentBooster.value})! (استهلكت حركة واحدة)`, "info");
    
    // 2. Opponent study log
    addConfirmLog(`🛡️ الخصم يدرس التمريرات ويتمااسك دفاعياً بانتظار تسديدتك الحاسمة ليرى تشكيلتك كاملة...`, "neutral");

    // 3. Supporting strikers reveals (if any)
    playerSlots.forEach((slot, idx) => {
      if (idx !== currentAttackerIdx && slot.card && slot.isRevealed && slot.revealedInAttack) {
        addConfirmLog(`⚔️ تم كشف المهاجم الداعم [ ${slot.card.name} ] لتعزيز الهجمة! (استهلكت حركة واحدة)`, "success");
      }
    });

    // 4. Played specials logs from tempPhaseLogs
    tempPhaseLogs.forEach((l) => {
      confirmLogs.push(l);
    });

    // 5. Active specials summary
    playerActiveSpecial.forEach((spec) => {
      addConfirmLog(`✨ تم تعزيز الهجوم بكارت التكتيك [ ${spec.name} ]!`, "success");
    });

    // 6. Final shoot log
    addConfirmLog(`⚽ تسديدة حاسمة: قام المهاجم [ ${attacker.name} ] بالتسديد بقوة ${attacker.attack}!`, "info");

    const updatedLogs = [...logs, ...confirmLogs];

    if (isMultiplayer) {
      setIsShotDeclared(true);
      
      // Lock current striker card(s) so they cannot be flipped back
      const cleanPlayerSlots = playerSlots.map((s) => ({
        ...s,
        confirmedInAttack: s.revealedInAttack ? true : s.confirmedInAttack
      }));
      setPlayerSlots(cleanPlayerSlots);

      setLogs(updatedLogs);
      setTempPhaseLogs([]);

      setTimeout(() => {
        syncToSupabaseInstance(
          "attacking", // Keep phase as attacking
          cleanPlayerSlots,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          playerMovesLeft,
          undefined,
          updatedLogs,
          currentBooster,
          currentAttackerIdx,
          playerActiveSpecial,
          undefined,
          undefined,
          undefined,
          maxMovesPerTurn, // Reset opponent's defense moves to max (e.g. 3) to let them defend!
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true // overrideIsShotDeclared
        );
      }, 50);

      // Release lock so phase is kept attacking
      isResolvingRef.current = false;
      phaseRef.current = "attacking";
      setPhase("attacking");
    } else {
      // IN OFFLINE MODE (VS AI):
      setLogs(updatedLogs);
      setTempPhaseLogs([]);
      // The AI has not played defense yet. We trigger its AI defense reaction now,
      // and mathematically resolve the outcome inside the callback once it is completed.
      addLog(`🤖 الخصم يدرس تسديدتك الكلية وتكتيكاتك بالملعب ويقود خط الصد التكتيكي الفوري...`, "neutral");
      
      triggerAIDefenseReaction(currentAttackerIdx, currentBooster, (updatedSlots, updatedSpecials) => {
        // Calculate total attack and defense using our standard functions (with overrides)
        const computedAttack = calculateTotalAttack(true, currentAttackerIdx, currentBooster, playerActiveSpecial, playerSlots, updatedSlots);
        const computedDefense = calculateTotalDefense(false, updatedSpecials, playerSlots, updatedSlots);

        const isGoal = computedAttack > computedDefense;
        const defenders = updatedSlots.filter((s) => s.card && s.isRevealed && s.revealedInAttack).map((s) => s.card!.name);
        const attackerName = playerSlots[currentAttackerIdx]?.card?.name || "لاعبك";

        // Get detailed calculations
        const attackDetail = getDetailedCalculation(true, true, currentAttackerIdx, currentBooster, playerActiveSpecial, updatedSpecials, playerSlots, updatedSlots);
        const defDetail = getDetailedCalculation(false, false, null, null, playerActiveSpecial, updatedSpecials, playerSlots, updatedSlots);

        if (isGoal) {
          const newScore = playerScore + 1;
          setPlayerScore(newScore);
          triggerAllGoalScoredAbilities("player");
          setHasScoredThisTurn(true);
          setShowConfetti(true);
          triggerScreenShake();
          SoundEffects.playGoalCelebration();
          setCelebrationMessage({
            title: "جــوووووول! هجمة مرتدة قاتلة! ⚽🔥",
            subtitle: `إجمالي هجومك (${computedAttack}) تجاوز بنجاح تكتلات دفاع الخصم (${computedDefense}) لتسجل هدفاً تكتيكياً مميزاً!`,
            isGoal: true
          });
          addLog(formatGoalLog(true, computedAttack, computedDefense, attackDetail.breakdown, defDetail.breakdown, `${newScore} - ${aiScore}`), "success");
          recordRound("player", computedAttack, computedDefense, currentBooster.value, currentBooster.text, true, attackerName, defenders, newScore, aiScore);
          setIsAttackBlocked(false);
          setPhase("resolution");
        } else {
          // Attack is blocked!
          if (playerMovesLeft > 0) {
            // Player still has moves left to reinforce!
            setIsAttackBlocked(true);
            isResolvingRef.current = false;
            phaseRef.current = "attacking";
            SoundEffects.playTackleBlock();

            // Lock striker slots that participated in the attack
            const lockedPlayerSlots = playerSlots.map((s) =>
              s.revealedInAttack ? { ...s, confirmedInAttack: true } : s
            );
            setPlayerSlots(lockedPlayerSlots);

            // Also lock AI defender slots that participated in the defense
            const lockedAiSlots = updatedSlots.map((s) =>
              s.revealedInAttack ? { ...s, confirmedInAttack: true } : s
            );
            setAiSlots(lockedAiSlots);

            addLog(`🧤 تصدي تكتيكي للخصم! دفاع الخصم (${computedDefense}) > هجومك (${computedAttack})\n📊 تفاصيل الحسبة الفنية:\n[قوة الهجوم ⚔️]:\n${attackDetail.breakdown}\n[قوة الدفاع 🛡️]:\n${defDetail.breakdown}\n💡 بما أنه متبقي لك حركات تكتيكية، يمكنك مواصلة الهجوم بالنقر على لاعب مقلوب من التشكيلة لكشفه وضمه للهجوم، أو الضغط على زر "إنهاء الهجمة 🛑" للاستسلام بالتصدي.`, "warning");
          } else {
            // No moves left, auto end attack sequence
            setIsAttackBlocked(false);
            SoundEffects.playTackleBlock();
            setCelebrationMessage({
              title: "يا لها من فرصة ضائعة! التصدي للمحاولة 🧤🚫",
              subtitle: `تكتلات دفاع الخصم الحصين (${computedDefense}) تفوقت أو تساوت مع قواك الضاربة (${computedAttack}) ليفشل هجومك!`,
              isGoal: false
            });
            addLog(formatBlockLog(true, computedAttack, computedDefense, attackDetail.breakdown, defDetail.breakdown, `${playerScore} - ${aiScore}`), "danger");
            recordRound("player", computedAttack, computedDefense, currentBooster.value, currentBooster.text, false, attackerName, defenders, playerScore, aiScore);
            setPhase("resolution");
          }
        }
      });
    }
  };

  const handleForceEndAttack = () => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    if (isResolvingRef.current) return;
    isResolvingRef.current = true;
    phaseRef.current = "resolution";

    // Gather all confirmed attack action details
    const attacker = playerSlots[currentAttackerIdx!].card!;
    const confirmLogs: ActionLog[] = [];
    const addConfirmLog = (text: string, type: ActionLog["type"] = "neutral") => {
      confirmLogs.push({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: getFormattedTime(),
        text,
        type
      });
    };

    // 1. Initial declare log
    addConfirmLog(`⚔️ تم بدء الهجمة بقيادة المهاجم [ ${attacker.name} ] بقوة هجوم أساسية ${attacker.attack}، وسحبت معزز [ ${currentBooster?.text} ] (+${currentBooster?.value})! (استهلكت حركة واحدة)`, "info");
    
    // 2. Opponent study log
    addConfirmLog(`🛡️ الخصم يدرس التمريرات ويتمااسك دفاعياً بانتظار تسديدتك الحاسمة ليرى تشكيلتك كاملة...`, "neutral");

    // 3. Supporting strikers reveals (if any)
    playerSlots.forEach((slot, idx) => {
      if (idx !== currentAttackerIdx && slot.card && slot.isRevealed && slot.revealedInAttack) {
        addConfirmLog(`⚔️ تم كشف المهاجم الداعم [ ${slot.card.name} ] لتعزيز الهجمة! (استهلكت حركة واحدة)`, "success");
      }
    });

    // 4. Played specials logs from tempPhaseLogs
    tempPhaseLogs.forEach((l) => {
      confirmLogs.push(l);
    });

    // 5. Active specials summary
    playerActiveSpecial.forEach((spec) => {
      addConfirmLog(`✨ تم تعزيز الهجوم بكارت التكتيك [ ${spec.name} ]!`, "success");
    });

    // Accumulate scores for final consolation modal
    const attackDetail = getDetailedCalculation(true, true, currentAttackerIdx, currentBooster, playerActiveSpecial, aiActiveSpecial, playerSlots, aiSlots);
    const defDetail = getDetailedCalculation(false, false, null, null, playerActiveSpecial, aiActiveSpecial, playerSlots, aiSlots);
    const computedAttack = attackDetail.total;
    const computedDefense = defDetail.total;

    SoundEffects.playTackleBlock();
    setCelebrationMessage({
      title: "يا لها من فرصة ضائعة! التصدي للمحاولة 🧤🚫",
      subtitle: `تكتلات defense الخصم الحصين (${computedDefense}) تفوقت أو تساوت مع قواك الضاربة (${computedAttack}) ليفشل هجومك!`,
      isGoal: false
    });

    const defenders = aiSlots.filter((s) => s.card && s.isRevealed && s.revealedInAttack).map((s) => s.card!.name);
    
    const blockMsg = formatBlockLog(true, computedAttack, computedDefense, attackDetail.breakdown, defDetail.breakdown, `${playerScore} - ${aiScore}`);
    const updatedLogs = [...logs, ...confirmLogs, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: getFormattedTime(),
      text: blockMsg,
      type: "danger" as const
    }];

    setLogs(updatedLogs);
    setTempPhaseLogs([]);

    const attackerName = playerSlots[currentAttackerIdx!]?.card?.name || "لاعبك";
    recordRound("player", computedAttack, computedDefense, currentBooster?.value || 0, currentBooster?.text || "", false, attackerName, defenders, playerScore, aiScore);

    setIsAttackBlocked(false);
    setPhase("resolution");
  };

  // Click handler that triggers a ripple effect before acknowledging celebration
  const handleCelebrationClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setBtnRipples((prev) => [...prev, { id, x, y }]);
    
    // Precise brief delay so the user clearly registers the aesthetic ripple wave
    setTimeout(() => {
      handleAcknowledgeResolution();
      setBtnRipples([]);
    }, 400);
  };

  // CONFIRM ACTION OVER TO START NEXT ACTIONS
  const handleAcknowledgeResolution = () => {
    if (phaseRef.current !== "resolution" && phaseRef.current !== "game_over") return;
    isResolvingRef.current = false;

    // Capture who was the attacker for this round before resetting attackerRole
    const wasMeAttacker = attackerRole === multiplayerRole;

    setCelebrationMessage(null);
    setSelectedPitchSlotIdx(null);
    setCurrentAttackerIdx(null);
    setCurrentBooster(null);
    setShowConfetti(phaseRef.current === "game_over" ? showConfetti : false);
    setIsShotDeclared(false);
    setTempPhaseLogs([]);

    if (phaseRef.current === "game_over") {
      return;
    }

    // Helper to decrement slot durations
    const decrementSlotDurations = (slots: typeof playerSlots) => {
      return slots.map((s) => {
        if (!s.card) return s;
        const card = { ...s.card };
        let modified = false;
        
        if (card.frozen && card.frozenTurnsLeft !== undefined) {
          const nextLeft = card.frozenTurnsLeft - 1;
          card.frozenTurnsLeft = nextLeft;
          if (nextLeft <= 0) {
            card.frozen = false;
          }
          modified = true;
        }

        if (card.stunned && card.stunnedTurnsLeft !== undefined) {
          const nextLeft = card.stunnedTurnsLeft - 1;
          card.stunnedTurnsLeft = nextLeft;
          if (nextLeft <= 0) {
            card.stunned = false;
          }
          modified = true;
        }

        if (card.silenced && card.silencedTurnsLeft !== undefined) {
          const nextLeft = card.silencedTurnsLeft - 1;
          card.silencedTurnsLeft = nextLeft;
          if (nextLeft <= 0) {
            card.silenced = false;
          }
          modified = true;
        }

        return modified ? { ...s, card } : s;
      });
    };

    // Helper to process active specials durations
    const processSpecials = (specials: SpecialCard[]) => {
      return specials
        .map((spec) => {
          if (spec.durationTurnsLeft !== undefined) {
            return { ...spec, durationTurnsLeft: spec.durationTurnsLeft - 1 };
          }
          const action = spec.ability?.actions[0];
          if (action && action.duration && action.duration !== "Instant" && action.duration !== "CurrentPhase") {
            const initialDuration = action.durationTurns || (action.duration === "NextTurn" ? 1 : 2);
            return { ...spec, durationTurnsLeft: initialDuration - 1 };
          }
          return { ...spec, durationTurnsLeft: 0 };
        })
        .filter((spec) => (spec.durationTurnsLeft === undefined ? false : spec.durationTurnsLeft > 0));
    };

    // Mark participating cards on both sides as spent / spent!
    const nextPlayerSlots = decrementSlotDurations(
      playerSlots.map((s) => (s.revealedInAttack ? { ...s, isRevealed: true, spent: true, revealedInAttack: false, confirmedInAttack: false } : { ...s, confirmedInAttack: false }))
    );
    const nextAiSlots = decrementSlotDurations(
      aiSlots.map((s) => (s.revealedInAttack ? { ...s, isRevealed: true, spent: true, revealedInAttack: false, confirmedInAttack: false } : { ...s, confirmedInAttack: false }))
    );

    setPlayerSlots(nextPlayerSlots);
    setAiSlots(nextAiSlots);

    const nextPlayerSpecials = processSpecials(playerActiveSpecial);
    const nextAiSpecials = processSpecials(aiActiveSpecial);

    setPlayerActiveSpecial(nextPlayerSpecials);
    setAiActiveSpecial(nextAiSpecials);

    // Check if score limit is attained to win!
    if (playerScore >= winningGoals) {
      setPhase("game_over");
      addLog(`صافرة النهاية للماتش اللذيذ! ${formatNameWithTitle(coachName, "الكابتن")} يحرز اللقب القاري بـ ${winningGoals} أهداف كاملة! تهانينا ومبارك! 🏆🎉`, "success");
      setShowConfetti(true);
      return;
    }
    if (aiScore >= winningGoals) {
      setPhase("game_over");
      addLog(`عذراً يا كابتن! الخصم ${formatNameWithTitle(aiCoachName, "المدرب")} تفوق بالحسابات السريعة وأحرز اللقب بـ ${winningGoals} أهداف. حظاً أوفر المرة المقبلة.`, "danger");
      return;
    }

    if (gameMode === "rounds") {
      const nextRounds = completedRounds + 1;
      setCompletedRounds(nextRounds);

      if (nextRounds >= totalRounds) {
        setPhase("game_over");
        if (playerScore > aiScore) {
          addLog(`⏰ انتهى عدد الجولات المحدد (${totalRounds})! تكتيكات ${formatNameWithTitle(coachName, "الكابتن")} حسمت النصر التاريخي بنتيجة ${playerScore} - ${aiScore}! ⚽🏆`, "success");
          setShowConfetti(true);
        } else if (aiScore > playerScore) {
          addLog(`⏰ انتهى عدد الجولات المحدد (${totalRounds})! للأسف الخصم ${formatNameWithTitle(aiCoachName, "المدرب")} حقق الفوز تكتيكياً بنتيجة ${aiScore} - ${playerScore}.`, "danger");
        } else {
          addLog(`⏰ انتهى عدد الجولات المحدد (${totalRounds}) بالتعادل التكتيكي المثير ${playerScore} - ${aiScore}!`, "neutral");
        }
        if (isMultiplayer) {
          if (wasMeAttacker) {
            syncToSupabaseInstance("game_over");
          }
        }
        return;
      }

      setIsAttackBlocked(false);

      if (isMultiplayer) {
        const isHost = multiplayerRole === "host";
        const nextTurnRole = attackerRole === "host" ? "opponent" : "host";
        const standsAsMe = nextTurnRole === multiplayerRole;

        const nextPhaseState = standsAsMe ? "player_turn" : "ai_turn";
        setPhase(nextPhaseState as any);

        const nextMoves = standsAsMe ? maxMovesPerTurn : 0;
        const nextAiMoves = standsAsMe ? 0 : maxMovesPerTurn;
        const nextTurnCount = turnCount + (standsAsMe ? 1 : 0);

        const roundMsg = `⚽ انتهت جولة الهجوم رقم ${nextRounds}. الدور الآن مع ${standsAsMe ? "فريقك" : "الخصم"}!`;
        const nextLogs = [
          ...logs,
          {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: roundMsg,
            type: standsAsMe ? ("success" as const) : ("neutral" as const)
          }
        ];
        setLogs(nextLogs);
        setCardsDrawnThisTurn(0);
        setPlayerMovesLeft(nextMoves);
        setAiMovesLeft(nextAiMoves);
        setAttackerRole(nextTurnRole);

        if (wasMeAttacker) {
          setTimeout(() => {
            syncToSupabaseInstance(
              nextPhaseState as any,
              nextPlayerSlots,
              nextAiSlots,
              undefined,
              undefined,
              undefined,
              undefined,
              nextMoves,
              nextAiMoves,
              nextLogs,
              null,
              null,
              nextPlayerSpecials,
              nextAiSpecials,
              0,
              nextTurnCount,
              maxMovesPerTurn,
              undefined,
              undefined,
              undefined,
              undefined,
              nextTurnRole
            );
          }, 50);
        }
      } else {
        const wasPlayerAttacker = isPlayerAttacker;
        setIsPlayerAttacker(!wasPlayerAttacker);

        if (wasPlayerAttacker) {
          phaseRef.current = "ai_turn";
          setPhase("ai_turn");
          setAiMovesLeft(maxMovesPerTurn);
          setAiCardsDrawnThisTurn(0);
          addLog(`⚽ انتهت جولة هجومك (جولة رقم ${nextRounds}). دور الخصم الآن ليبدأ الهجوم!`, "neutral");
        } else {
          phaseRef.current = "player_turn";
          setPhase("player_turn");
          setPlayerSlots(playerSlots.map((s) => ({ ...s, confirmedInAttack: false })));
          setPlayerMovesLeft(maxMovesPerTurn);
          setCardsDrawnThisTurn(0);
          setHasScoredThisTurn(false);
          setIsHandExpanded(true);
          addLog(`⚽ انتهت جولة هجوم الخصم (جولة رقم ${nextRounds}). دورك الآن لتبدأ الهجوم!`, "success");
        }
      }
      return;
    }

    if (isMultiplayer) {
      const attackerMovesLeft = wasMeAttacker ? playerMovesLeft : aiMovesLeft;
      const attackerHasMovesLeft = attackerMovesLeft > 0;

      let nextTurnRole: "host" | "opponent";
      if (attackerHasMovesLeft) {
        nextTurnRole = attackerRole as "host" | "opponent";
      } else {
        nextTurnRole = attackerRole === "host" ? "opponent" : "host";
      }

      const standsAsMe = nextTurnRole === multiplayerRole;
      const nextPhaseState = standsAsMe ? "player_turn" : "ai_turn";
      setPhase(nextPhaseState as any);

      const nextDrawn = 0;
      let nextMoves: number;
      let nextAiMoves: number;
      
      if (attackerHasMovesLeft) {
        nextMoves = playerMovesLeft;
        nextAiMoves = aiMovesLeft;
      } else {
        nextMoves = standsAsMe ? maxMovesPerTurn : 0;
        nextAiMoves = standsAsMe ? 0 : maxMovesPerTurn;
      }
      
      const nextTurnCount = turnCount + (standsAsMe && !attackerHasMovesLeft ? 1 : 0);

      const logText = attackerHasMovesLeft
        ? (standsAsMe 
            ? `⚽ متابعة دور هجومك! متبقي لك عدد ${playerMovesLeft} حركات تكتيكية لإدارتها.`
            : `⏳ الخصم يتابع دور هجومه مع بقاء حركات لديه. يرجى الانتظار...`)
        : (standsAsMe 
            ? "⚽ انتقل الدور والتحكم الفني لك الآن! قم بسحب كارتين لتنظيم عمليتك الهجومية!"
            : "⏳ تكتيك الخصم بدأ، يرجى الانتظار ريثما يستنفد المدرب خصمك حركاته التكتيكية.");

      const nextLogs = [
        ...logs,
        {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: logText,
          type: standsAsMe ? ("success" as const) : ("neutral" as const)
        }
      ];

      setCardsDrawnThisTurn(nextDrawn);
      setPlayerMovesLeft(nextMoves);
      setAiMovesLeft(nextAiMoves);
      setLogs(nextLogs);
      setAttackerRole(nextTurnRole);

      if (wasMeAttacker) {
        setTimeout(() => {
          syncToSupabaseInstance(
            nextPhaseState as any,
            nextPlayerSlots,
            nextAiSlots,
            undefined,
            undefined,
            undefined,
            undefined,
            nextMoves,
            nextAiMoves,
            nextLogs,
            null, // Cleans currentPonto
            null, // Cleans currentAttackerIdx
            nextPlayerSpecials,
            nextAiSpecials,
            nextDrawn,
            nextTurnCount,
            maxMovesPerTurn, // Cleans defense_moves_left
            undefined,
            undefined,
            undefined,
            undefined,
            nextTurnRole
          );
        }, 50);
      }

      return;
    }

    // Switch turn
    if (phaseRef.current === "resolution") {
      setIsAttackBlocked(false);
      setDefenseMovesLeft(maxMovesPerTurn);
      if (isPlayerAttacker) {
        if (playerMovesLeft > 0) {
          phaseRef.current = "player_turn";
          setPhase("player_turn");
          addLog(`متابعة دور الماتش! متبقي لك عدد ${playerMovesLeft} حركات تكتيكية لإدارتها. يمكنك اللعب، سحب كروت أو النقر على "إنهاء الدور" يدوياً.`, "neutral");
        } else {
          phaseRef.current = "ai_turn";
          setPhase("ai_turn");
        }
      } else {
        phaseRef.current = "player_turn";
        setPhase("player_turn");
        setPlayerMovesLeft(maxMovesPerTurn);
        setHasScoredThisTurn(false);
        setCardsDrawnThisTurn(0);
        setAiCardsDrawnThisTurn(0);
        setMaxDrawsPerTurn(defaultMaxDrawsPerTurn);
        setIsHandExpanded(true);
        setTurnCount((prev) => prev + 1);
        addLog(`⚽ انتهى دور الخصم كاملاً بنجاح. عدنا لدورك التكتيكي الجديد! متبقي لك ${maxMovesPerTurn} حركات تكتيكية.`, "success");
      }
    }
  };

  // END YOUR TURN MANUALLY
  const handleEndPlayerTurn = () => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    if (phaseRef.current !== "player_turn") return;

    if (gameMode === "rounds") {
      const nextRounds = completedRounds + 1;
      setCompletedRounds(nextRounds);

      if (nextRounds >= totalRounds) {
        setPhase("game_over");
        if (playerScore > aiScore) {
          addLog(`⏰ انتهى عدد الجولات المحدد (${totalRounds})! تكتيكات ${formatNameWithTitle(coachName, "الكابتن")} حسمت النصر التاريخي بنتيجة ${playerScore} - ${aiScore}! ⚽🏆`, "success");
          setShowConfetti(true);
        } else if (aiScore > playerScore) {
          addLog(`⏰ انتهى عدد الجولات المحدد (${totalRounds})! للأسف الخصم ${formatNameWithTitle(aiCoachName, "المدرب")} حقق الفوز تكتيكياً بنتيجة ${aiScore} - ${playerScore}.`, "danger");
        } else {
          addLog(`⏰ انتهى عدد الجولات المحدد (${totalRounds}) بالتعادل التكتيكي المثير ${playerScore} - ${aiScore}!`, "neutral");
        }
        if (isMultiplayer) {
          syncToSupabaseInstance("game_over");
        }
        return;
      }

      setSelectedPitchSlotIdx(null);
      setSelectedHandCardId(null);
      setBurningCardIds([]);
      setIsPlayerAttacker(false);

      if (isMultiplayer) {
        const nextPhase = "ai_turn";
        const nextAttackerRole = multiplayerRole === "host" ? "opponent" : "host";
        setCardsDrawnThisTurn(0);
        setPlayerMovesLeft(0);
        setAiMovesLeft(maxMovesPerTurn);
        setAttackerRole(nextAttackerRole);

        const nextLogs = [
          ...logs,
          {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: `🏁 أنهيت جولة هجومك يدوياً بدون هجمات (جولة رقم ${nextRounds}). دور الخصم الآن!`,
            type: "info" as const
          }
        ];
        setLogs(nextLogs);

        setTimeout(() => {
          syncToSupabaseInstance(
            nextPhase as any,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            0,
            maxMovesPerTurn,
            nextLogs,
            null,
            null,
            [],
            [],
            0,
            turnCount + 1,
            maxMovesPerTurn,
            undefined,
            undefined,
            undefined,
            undefined,
            nextAttackerRole
          );
        }, 50);
      } else {
        phaseRef.current = "ai_turn";
        setPhase("ai_turn");
        addLog(`🏁 أنهيت جولة هجومك يدوياً بدون هجمات (جولة رقم ${nextRounds}). دور الخصم الآن!`, "info");
      }
      return;
    }

    phaseRef.current = "ai_turn";
    setPhase("ai_turn");

    setSelectedPitchSlotIdx(null);
    setSelectedHandCardId(null);
    setBurningCardIds([]);

    if (isMultiplayer) {
      const nextPhase = "ai_turn";
      const nextAttackerRole = multiplayerRole === "host" ? "opponent" : "host";
      setCardsDrawnThisTurn(0);
      setPlayerMovesLeft(0);
      setAiMovesLeft(maxMovesPerTurn);
      setAttackerRole(nextAttackerRole);

      const nextLogs = [
        ...logs,
        {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: "🏁 قمت بنقل دور اللعب والتوجيه يدوياً للمدرب الخصم.",
          type: "info" as const
        }
      ];
      setLogs(nextLogs);

      setTimeout(() => {
        syncToSupabaseInstance(
          nextPhase as any,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          0,
          3,
          nextLogs,
          null,
          null,
          [],
          [],
          0,
          turnCount + 1,
          3,
          undefined,
          undefined,
          undefined,
          undefined,
          nextAttackerRole
        );
      }, 50);
    } else {
      // AI turn starts via phase useEffect trigger
    }
  };

  // THE AI TURN STRATEGY ENGINE (PvE AI AUTOMATED RUNNER)
  const handleAIPlayTurn = () => {
    if (isAIExecutingRef.current) return;
    isAIExecutingRef.current = true;

    phaseRef.current = "ai_turn";
    setPhase("ai_turn");
    setAiMovesLeft(maxMovesPerTurn); // Reset AI moves count to the match setting!
    setAiCardsDrawnThisTurn(0); // Reset AI draws for this turn!
    addLog(`🏁 الآن ينتقل دور التوجيه واللعب للخصم: ${formatNameWithTitle(aiCoachName, "المدرب")}.`, "info");

    setTimeout(() => {
      // AI Draws 2 cards
      let updatedAiDeck = [...aiDeck];
      let updatedAiSpecial = [...specialDeck];
      let newAiHand = [...aiHand];
      let drawnCount = 0;

      if (updatedAiDeck.length > 0) {
        newAiHand.push(updatedAiDeck[0]);
        updatedAiDeck = updatedAiDeck.slice(1);
        drawnCount++;
      }
      if (updatedAiSpecial.length > 0) {
        newAiHand.push(updatedAiSpecial[0]);
        updatedAiSpecial = updatedAiSpecial.slice(1);
        drawnCount++;
      }

      setAiDeck(updatedAiDeck);
      setSpecialDeck(updatedAiSpecial);
      setAiHand(newAiHand);
      setAiCardsDrawnThisTurn(drawnCount);
      addLog(`🤖 الخصم ${formatNameWithTitle(aiCoachName, "المدرب")} يسحب كارتين مميزين ليده التكتيكية.`, "neutral");

      // AI Moves execution
      setTimeout(() => {
        let aiMoves = maxMovesPerTurn;
        const currentAiSlots = [...aiSlots];

        const triggerAiHandCardPlayed = (card: PlayerCard) => {
          if (!card.ability || card.ability.trigger !== "CardPlayed") return;
          const isSilenced = (card as any).silenced || (card as any).abilityBlocked;
          if (isSilenced) return;
          const maxUses = card.ability.maxUses || 1;
          const currentUses = (card as any).abilityUses || 0;
          if (currentUses >= maxUses) return;

          let conditionsMet = true;
          if (card.ability.conditions) {
            card.ability.conditions.forEach(cond => {
              if (cond.type === "IsLegend" && !card.isLegend) conditionsMet = false;
            });
          }
          if (!conditionsMet) return;

          card.abilityUses = currentUses + 1;

          card.ability.actions.forEach(act => {
            const val = act.value || 0;
            if (act.type === "AddMoves") {
              aiMoves += val;
              addLog(`⚡ قدرة الأسطورة [ ${getSafeCardName(card, false)} ] للخصم: تم إضافة +${val} حركات تكتيكية!`, "danger");
            } else if (act.type === "DrawCard") {
              let cardsToDraw = val;
              let added: Card[] = [];
              for (let i = 0; i < cardsToDraw; i++) {
                if (i % 2 === 0 && updatedAiDeck.length > 0) {
                  added.push(updatedAiDeck[0]);
                  updatedAiDeck = updatedAiDeck.slice(1);
                } else if (updatedAiSpecial.length > 0) {
                  added.push(updatedAiSpecial[0]);
                  updatedAiSpecial = updatedAiSpecial.slice(1);
                } else if (updatedAiDeck.length > 0) {
                  added.push(updatedAiDeck[0]);
                  updatedAiDeck = updatedAiDeck.slice(1);
                }
              }
              if (added.length > 0) {
                newAiHand = [...newAiHand, ...added];
                setAiDeck(updatedAiDeck);
                setSpecialDeck(updatedAiSpecial);
                addLog(`⚡ قدرة الأسطورة [ ${getSafeCardName(card, false)} ] للخصم: قامت بسحب ${added.length} كروت إضافية!`, "danger");
                SoundEffects.playCardDraw();
              }
            }
          });
        };

        // Phase 1: Support layout by placing/swapping cards from AI Bag/Hand (الحقيبة)
        let handPlayerCards = newAiHand.filter((c) => c.type === "player") as PlayerCard[];
        
        while (aiMoves > 0 && handPlayerCards.length > 0) {
          // Identify empty slots
          let emptySlotIdx = currentAiSlots.findIndex((s) => s.card === null);
          // Identify spent slots
          let spentSlotIdx = currentAiSlots.findIndex((s) => s.spent === true);

          if (emptySlotIdx !== -1) {
            // Find best available hand player card
            handPlayerCards.sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense));
            const bestPlayer = handPlayerCards[0];
            
            currentAiSlots[emptySlotIdx] = { card: bestPlayer, isRevealed: false, spent: false };
            newAiHand = newAiHand.filter((c) => c.id !== bestPlayer.id);
            handPlayerCards = handPlayerCards.filter((c) => c.id !== bestPlayer.id);
            
            aiMoves--;
            addLog(`🤖 🔄 تم استبدال لاعب من الدكة بلاعب من الملعب في المركز الفارغ [ ${emptySlotIdx + 1} ] (استهلك حركة واحدة).`, "success");
            triggerAiHandCardPlayed(bestPlayer);
          } else if (spentSlotIdx !== -1) {
            // Find best available hand player card to replace the spent card
            handPlayerCards.sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense));
            const bestPlayer = handPlayerCards[0];
            
            // Recycle the old spent card!
            const oldCard = currentAiSlots[spentSlotIdx].card!;
            if (oldCard) {
              recycleAiCard(oldCard);
            }
            
            currentAiSlots[spentSlotIdx] = { card: bestPlayer, isRevealed: false, spent: false };
            newAiHand = newAiHand.filter((c) => c.id !== bestPlayer.id);
            handPlayerCards = handPlayerCards.filter((c) => c.id !== bestPlayer.id);
            
            aiMoves--;
            addLog(`🤖 🔄 تم استبدال لاعب من الدكة بلاعب من الملعب في المركز [ ${spentSlotIdx + 1} ] (استهلك حركة واحدة). تم استبدال لاعب مستهلك بلاعب جديد مقلوباً.`, "success");
            triggerAiHandCardPlayed(bestPlayer);
          } else {
            // No empty or spent slots. Assess swapping any weak unrevealed card
            const weakSlotIdx = currentAiSlots.findIndex(
              (s) => s.card !== null && !s.card.isLegend && s.card.attack < 6 && s.card.defense < 6 && !s.isRevealed
            );
            
            if (weakSlotIdx !== -1) {
              const weakCard = currentAiSlots[weakSlotIdx].card!;
              handPlayerCards.sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense));
              const bestPlayer = handPlayerCards[0];

              if ((bestPlayer.attack + bestPlayer.defense) > (weakCard.attack + weakCard.defense) + 2) {
                currentAiSlots[weakSlotIdx] = { card: bestPlayer, isRevealed: false, spent: false };
                newAiHand = newAiHand.filter((c) => c.id !== bestPlayer.id);
                newAiHand.push(weakCard); // Reclaimed back to hand
                handPlayerCards = handPlayerCards.filter((c) => c.id !== bestPlayer.id);
                
                aiMoves--;
                addLog(`🤖 🔄 تم استبدال لاعب من الدكة بلاعب من الملعب في المركز [ ${weakSlotIdx + 1} ] (استهلك حركة واحدة). تم مبادلة لاعب مقلوب بلاعب آخر من الدكة.`, "info");
                triggerAiHandCardPlayed(bestPlayer);
              } else {
                break;
              }
            } else {
              break;
            }
          }
        }

        // Evaluate and play specials
        let specialHandCards = isSpecialCardsBlocked(false) ? [] : newAiHand.filter((c) => c.type === "special") as SpecialCard[];
        for (const spec of specialHandCards) {
          if (aiMoves <= 0) break;

          const action = spec.ability?.actions[0];
          const hasDestroy = spec.ability?.actions.some(a => a.type === "DestroyCard") || spec.effect === "red_card";
          const hasDraw = spec.ability?.actions.some(a => a.type === "DrawCard") || spec.effect === "world_cup";
          const hasTargetingAction = spec.ability?.actions.some(a => 
            ["FreezeCard", "SilenceCard", "StunCard", "DestroyCard", "ReturnToHand", "RevealCard"].includes(a.type) && 
            (a.target === "SelectedEnemy" || a.target === "SelectedCard")
          );

          if (hasTargetingAction || hasDestroy) {
            // Find revealed player cards on player's pitch
            const revealedPlayerSlots = playerSlots
              .map((s, idx) => ({ slot: s, idx }))
              .filter((item) => item.slot.card !== null && item.slot.isRevealed);

            // Filter out already frozen/silenced/stunned cards if we are applying that specific status
            let eligibleSlots = [...revealedPlayerSlots];
            const actType = hasDestroy ? "DestroyCard" : action?.type;
            if (actType === "FreezeCard") {
              eligibleSlots = eligibleSlots.filter(item => !item.slot.card!.frozen);
            } else if (actType === "SilenceCard") {
              eligibleSlots = eligibleSlots.filter(item => !item.slot.card!.silenced);
            } else if (actType === "StunCard") {
              eligibleSlots = eligibleSlots.filter(item => !item.slot.card!.stunned);
            }

            if (eligibleSlots.length > 0) {
              // Smart AI: Target the player's card with the highest stats!
              eligibleSlots.sort((a, b) => 
                (b.slot.card!.attack + b.slot.card!.defense) - (a.slot.card!.attack + a.slot.card!.defense)
              );
              const target = eligibleSlots[0];
              const targetCard = { ...target.slot.card! };
              const durationTurns = action?.durationTurns || 2;

              setPlayerSlots((prev) => {
                const next = [...prev];
                if (actType === "DestroyCard" || actType === "ReturnToHand") {
                  next[target.idx] = { card: null, isRevealed: false };
                  if (actType === "DestroyCard") {
                    recyclePlayerCard(targetCard);
                  }
                } else if (actType === "FreezeCard") {
                  targetCard.frozen = true;
                  targetCard.frozenTurnsLeft = durationTurns;
                  next[target.idx] = { ...target.slot, card: targetCard };
                } else if (actType === "SilenceCard") {
                  targetCard.silenced = true;
                  targetCard.silencedTurnsLeft = durationTurns;
                  next[target.idx] = { ...target.slot, card: targetCard };
                } else if (actType === "StunCard") {
                  targetCard.stunned = true;
                  targetCard.stunnedTurnsLeft = durationTurns;
                  next[target.idx] = { ...target.slot, card: targetCard };
                } else if (actType === "RevealCard") {
                  next[target.idx] = { ...target.slot, isRevealed: true, revealedInTurn: turnCount };
                  setTimeout(() => {
                    triggerCardInstantEffects(targetCard, true, "CardRevealed");
                    triggerCardInstantEffects(targetCard, true, "CardPlayed");
                  }, 50);
                }
                return next;
              });

              if (actType === "ReturnToHand") {
                setPlayerHand((prev) => [...prev, targetCard]);
              }

              // Remove card from AI hand
              newAiHand = newAiHand.filter(c => c.id !== spec.id);
              aiMoves--;

              // Log success
              let aiMsg = "";
              if (actType === "DestroyCard") {
                aiMsg = `🤖 الخصم يلعب [ ${spec.name} ] 🟥 ويطرد نجمك المكشوف [ ${targetCard.name} ] خارج الملعب تماماً! (استهلك حركة واحدة)`;
                SoundEffects.playWhistle();
              } else if (actType === "FreezeCard") {
                aiMsg = `🤖 الخصم يلعب [ ${spec.name} ] ❄️ ويجمد نجمك [ ${targetCard.name} ] لمدة ${durationTurns} أدوار! (استهلك حركة واحدة)`;
                SoundEffects.playTackleBlock();
              } else if (actType === "SilenceCard") {
                aiMsg = `🤖 الخصم يلعب [ ${spec.name} ] 🔇 ويكتم قدرة نجمك [ ${targetCard.name} ] لمدة ${durationTurns} أدوار! (استهلك حركة واحدة)`;
                SoundEffects.playTackleBlock();
              } else if (actType === "StunCard") {
                aiMsg = `🤖 الخصم يلعب [ ${spec.name} ] 💫 ويصدم نجمك [ ${targetCard.name} ] لمدة ${durationTurns} أدوار! (استهلك حركة واحدة)`;
                SoundEffects.playTackleBlock();
              } else if (actType === "ReturnToHand") {
                aiMsg = `🤖 الخصم يلعب [ ${spec.name} ] 🔄 ويعيد نجمك [ ${targetCard.name} ] إلى يدك! (استهلك حركة واحدة)`;
                SoundEffects.playCardDraw();
              } else if (actType === "RevealCard") {
                aiMsg = `🤖 الخصم يلعب [ ${spec.name} ] 👁️ ويكشف ورقتك [ ${targetCard.name} ]! (استهلك حركة واحدة)`;
                SoundEffects.playCardDraw();
              }
              addLog(aiMsg, "danger");
            }
          } else if (hasDraw) {
            // Draws extra cards
            let cardsToDraw = 0;
            if (spec.effect === "world_cup") {
              cardsToDraw = 2;
            } else if (spec.ability) {
              spec.ability.actions.forEach(a => {
                if (a.type === "DrawCard") cardsToDraw += a.value || 1;
              });
            }

            if (cardsToDraw > 0) {
              let added: Card[] = [];
              for (let i = 0; i < cardsToDraw; i++) {
                if (i % 2 === 0 && updatedAiDeck.length > 0) {
                  added.push(updatedAiDeck[0]);
                  updatedAiDeck.splice(0, 1);
                } else if (updatedAiSpecial.length > 0) {
                  added.push(updatedAiSpecial[0]);
                  updatedAiSpecial.splice(0, 1);
                } else if (updatedAiDeck.length > 0) {
                  added.push(updatedAiDeck[0]);
                  updatedAiDeck.splice(0, 1);
                }
              }
              newAiHand = [...newAiHand.filter(c => c.id !== spec.id), ...added];
              aiMoves--;
              addLog(`🤖 الخصم يلعب [ ${spec.name} ] 🏆 ويسحب ${cardsToDraw} كروت إضافية إلى يده! (استهلك حركة واحدة)`, "success");
              SoundEffects.playGoalCelebration();
            }
          }
        }

        // Phase 2: Declare Attack (if AI has moves left and selectable attackers)
        const attackCandidates = currentAiSlots
          .map((s, idx) => ({ slot: s, idx }))
          .filter((item) => item.slot.card !== null && !item.slot.isRevealed && !item.slot.spent && item.slot.card.attack > 1)
          .sort((a, b) => b.slot.card!.attack - a.slot.card!.attack); // Smartly pick candidate with highest attack!

        if (aiMoves >= 1 && attackCandidates.length > 0 && !isAttackBlockedFor(false)) {
          const chosen = attackCandidates[0];
          const aiAttackSlotIdx = chosen.idx;
          const aiAttacker = chosen.slot.card!;

          setCurrentAttackerIdx(aiAttackSlotIdx);
          setIsPlayerAttacker(false);

          // Reveal card and set participating attacker state
          currentAiSlots.forEach((s, idx) => {
            s.revealedInAttack = idx === aiAttackSlotIdx;
          });
          currentAiSlots[aiAttackSlotIdx].isRevealed = true;
          currentAiSlots[aiAttackSlotIdx].revealedInTurn = turnCount;
          currentAiSlots[aiAttackSlotIdx].revealedInAttack = true;
          setAiSlots(currentAiSlots);

          if (aiAttacker.ability) {
            setCinematicEvent({
              type: "ability",
              title: "تفعيل قدرة أسطورية للخصم! 🧠",
              subtitle: aiAttacker.description || "",
              cardName: aiAttacker.name,
              cardIcon: aiAttacker.avatar,
              isLegend: aiAttacker.isLegend
            });
            setTimeout(() => setCinematicEvent(null), 1800);
            setTimeout(() => {
              triggerCardInstantEffects(aiAttacker, false, "CardRevealed");
              triggerCardInstantEffects(aiAttacker, false, "CardPlayed");
              triggerAttackStartedAbilities("ai");
            }, 50);
          } else {
            triggerAttackStartedAbilities("ai");
          }

          // Reset Player slots' revealedInAttack
          setPlayerSlots((prev) => prev.map((s) => ({ ...s, revealedInAttack: false })));

          // Draw Booster card
          if (boosterDeck.length === 0) {
            setBoosterDeck(generateBoosterDeck(maxBonusValue));
          }
          const drawnBooster = boosterDeck.length > 0 ? boosterDeck[0] : generateBoosterDeck(maxBonusValue)[0];
          setCurrentBooster(drawnBooster);
          setBoosterDeck((prev) => prev.slice(1));

          aiMoves -= 1;
          setPhase("ai_attacking");
          setDefenseMovesLeft(maxMovesPerTurn); // Player gets 3 defense moves!

          addLog(`⚠️ هجوم عدواني باغت! الخصم يكشف مهاجمه الأساسي [ ${aiAttacker.name} ] بقوة هجوم: ${aiAttacker.attack}! (استهلك حركة واحدة)`, "danger");
          addLog(`⚠️ الخصم سحب كارت معزز المرتدة عشوائي [ ${drawnBooster.text} ] بقوة +${drawnBooster.value}!`, "warning");
          SoundEffects.playWhistle();

          setAiMovesLeft(aiMoves); // Synchronize remaining moves to React state!
          setAiHand(newAiHand);
          isAIExecutingRef.current = false; // RELEASE LOCK!
          // Wait for player defensive response block
          return;
        }

        // Phase 3: No attack can be made, or moves exhausted. Update and hand block back to player
        setAiSlots(currentAiSlots);
        setAiHand(newAiHand);
        setAiMovesLeft(aiMoves); // Synchronize remaining moves to React state!

        if (gameMode === "rounds") {
          const nextRounds = completedRounds + 1;
          setCompletedRounds(nextRounds);

          if (nextRounds >= totalRounds) {
            setPhase("game_over");
            if (playerScore > aiScore) {
              addLog(`⏰ انتهى عدد الجولات المحدد (${totalRounds})! تكتيكات ${formatNameWithTitle(coachName, "الكابتن")} حسمت النصر التاريخي بنتيجة ${playerScore} - ${aiScore}! ⚽🏆`, "success");
              setShowConfetti(true);
            } else if (aiScore > playerScore) {
              addLog(`⏰ انتهى عدد الجولات المحدد (${totalRounds})! للأسف الخصم ${formatNameWithTitle(aiCoachName, "المدرب")} حقق الفوز تكتيكياً بنتيجة ${aiScore} - ${playerScore}.`, "danger");
            } else {
              addLog(`⏰ انتهى عدد الجولات المحدد (${totalRounds}) بالتعادل التكتيكي المثير ${playerScore} - ${aiScore}!`, "neutral");
            }
            isAIExecutingRef.current = false; // RELEASE LOCK!
            return;
          }

          setPhase("player_turn");
          setPlayerMovesLeft(maxMovesPerTurn);
          setCardsDrawnThisTurn(0);
          setHasScoredThisTurn(false);
          setIsHandExpanded(true);
          setIsPlayerAttacker(true);
          addLog(`🤖 الخصم أنهى جولته دون هجمات (جولة رقم ${nextRounds}). دورك الآن لتبدأ الهجوم!`, "success");
          isAIExecutingRef.current = false; // RELEASE LOCK!
          return;
        }

        setPhase("player_turn");
        setCardsDrawnThisTurn(0);
        setMaxDrawsPerTurn(defaultMaxDrawsPerTurn);
        setPlayerMovesLeft(maxMovesPerTurn);
        setHasScoredThisTurn(false);
        setIsHandExpanded(true);
        setTurnCount((prev) => prev + 1);
        addLog(`⚽ انتهى دور الخصم بلا هجمات لخطوطه. عدنا لدورك! حظاً موفقاً في الدور ${turnCount + 1}`, "success");
        isAIExecutingRef.current = false; // RELEASE LOCK!
      }, 1200);

    }, 1200);
  };

  useEffect(() => {
    if (phase === "ai_turn" && !isMultiplayer) {
      handleAIPlayTurn();
    }
  }, [phase, isMultiplayer]);

  // PLAY CONFIRM DEFENSIVE ACTION RESULT
  const handleConfirmDefense = () => {
    if (celebrationMessage || cinematicEvent || inspectedCard || isTutorialOpen) return;
    if (phaseRef.current !== "ai_attacking") return;
    phaseRef.current = "resolution";
    setPhase("resolution");

    // Player finishes defensive phase, calculate outcome of AI's attack on Player!
    let currentAiHand = [...aiHand];
    let currentAiActiveSpecials = [...aiActiveSpecial];
    let currentAiMovesLeft = aiMovesLeft;

    // Compile and log player's confirmed defense details
    const confirmDefenseLogs: ActionLog[] = [];
    const addConfirmDefenseLog = (text: string, type: ActionLog["type"] = "neutral") => {
      confirmDefenseLogs.push({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: getFormattedTime(),
        text,
        type
      });
    };

    playerSlots.forEach((slot) => {
      if (slot.card && slot.isRevealed && slot.revealedInAttack) {
        addConfirmDefenseLog(`🧱 تم تأكيد الدفاع باللاعب [ ${slot.card.name} ] لصد الهجوم بقوة دفاع +${slot.card.defense}!`, "info");
      }
    });

    playerActiveSpecial.forEach((spec) => {
      addConfirmDefenseLog(`🛡️ تم تعزيز الدفاع بكارت التكتيك [ ${spec.name} ]!`, "success");
    });

    const newLogs = [...logs, ...tempPhaseLogs, ...confirmDefenseLogs];

    // AI Attacks, Player Defends
    let attackDetail = getDetailedCalculation(false, true, currentAttackerIdx, currentBooster, playerActiveSpecial, currentAiActiveSpecials, playerSlots, aiSlots);
    let defDetail = getDetailedCalculation(true, false, null, null, playerActiveSpecial, currentAiActiveSpecials, playerSlots, aiSlots);

    // Smart AI Offensive Specials Play:
    // If the AI is attacking and not scoring (finalAttack <= finalDefense), and has moves left,
    // let it play offensive special cards from its hand to boost the attack!
    if (!isSpecialCardsBlocked(false)) {
      const offensiveSpecials = currentAiHand.filter(c => {
        if (c.type !== "special") return false;
        return c.ability?.actions.some(act => act.type === "AddStat" && act.stat === "attack" && act.value && act.value > 0);
      }) as SpecialCard[];

      while (attackDetail.total <= defDetail.total && offensiveSpecials.length > 0 && currentAiMovesLeft > 0) {
        const chosenSpecial = offensiveSpecials.shift()!;
        currentAiHand = currentAiHand.filter(c => c.id !== chosenSpecial.id);
        currentAiActiveSpecials.push(chosenSpecial);
        currentAiMovesLeft--;
        
        newLogs.push({
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `🤖 الخصم يلعب كارت تكتيكي هجومي من يده: [ ${chosenSpecial.name} ] لتعزيز الهجوم! (استهلك حركة واحدة)`,
          type: "danger" as const
        });

        // Recalculate details
        attackDetail = getDetailedCalculation(false, true, currentAttackerIdx, currentBooster, playerActiveSpecial, currentAiActiveSpecials, playerSlots, aiSlots);
        defDetail = getDetailedCalculation(true, false, null, null, playerActiveSpecial, currentAiActiveSpecials, playerSlots, aiSlots);
      }
      
      // Update state if anything was played
      if (currentAiMovesLeft !== aiMovesLeft) {
        setAiHand(currentAiHand);
        setAiActiveSpecial(currentAiActiveSpecials);
        setAiMovesLeft(currentAiMovesLeft);
      }
    }

    const finalAttack = attackDetail.total;
    const finalDefense = defDetail.total;

    const isGoal = finalAttack > finalDefense;
    const nextAiScore = isGoal ? aiScore + 1 : aiScore;
    const nextPlayerScore = playerScore;

    const defenders = playerSlots.filter((s) => s.card && s.isRevealed && s.revealedInAttack).map((s) => s.card!.name);
    const attackerName = aiSlots[currentAttackerIdx]?.card?.name || "لاعب الخصم";

    if (isGoal) {
      setAiScore(nextAiScore);
      triggerAllGoalScoredAbilities("ai");
      SoundEffects.playWhistle();
      setCelebrationMessage({
        title: "جـوووول للخصم! ⚽🥅",
        subtitle: `إجمالي تسديدات الخصم (${finalAttack}) شق طريقه بهدوء متجاوزاً خطوط صد دفاعك البالغ (${finalDefense})!`,
        isGoal: true
      });
      newLogs.push({
        id: Math.random().toString(),
        timestamp: getFormattedTime(),
        text: formatGoalLog(false, finalAttack, finalDefense, attackDetail.breakdown, defDetail.breakdown, `${playerScore} - ${nextAiScore}`),
        type: "danger" as const
      });
      recordRound("ai", finalAttack, finalDefense, currentBooster.value, currentBooster.text, true, attackerName, defenders, playerScore, nextAiScore);
      setPhase("resolution");
    } else {
      const aiPitchReveals = aiSlots.filter(s => s.card && s.revealedInAttack).length;
      const aiSpecialsCount = currentAiActiveSpecials.length;
      const totalAiRoundActions = aiPitchReveals + aiSpecialsCount;
      const aiCanReinforce = !isMultiplayer && currentAiMovesLeft > 0 && totalAiRoundActions < maxMovesPerTurn && aiSlots.some((s) => s.card !== null && !s.isRevealed && !s.spent);

      if (aiCanReinforce) {
        // AI decides to reinforce its blocked attack!
        const candidates = aiSlots
          .map((s, idx) => ({ s, idx }))
          .filter((item) => item.s.card !== null && !item.s.isRevealed && !item.s.spent);
        
        // Pick nominee with highest attack
        candidates.sort((a, b) => b.s.card!.attack - a.s.card!.attack);
        const bestNominee = candidates[0];
        
        const updatedAiSlots = aiSlots.map((s, idx) => {
          if (idx === bestNominee.idx) {
            return { ...s, isRevealed: true, revealedInTurn: turnCount, revealedInAttack: true };
          }
          return s;
        });
        
        setAiSlots(updatedAiSlots);
        setAiMovesLeft(currentAiMovesLeft - 1);
        
        // Lock player's current defenders from being flipped back in next defense steps
        const lockedPlayerSlots = playerSlots.map((s) =>
          s.revealedInAttack ? { ...s, confirmedInAttack: true } : s
        );
        setPlayerSlots(lockedPlayerSlots);
        
        SoundEffects.playCardDraw();
        newLogs.push({
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `🚨 الخصم يدفع بنجم الهجوم [ ${bestNominee.s.card!.name} ] لمضاعفة الضغط بـ +${bestNominee.s.card!.attack}! (استهلك حركة واحدة)`,
          type: "warning" as const
        });
        addLog(`🛡️ الخصم يواصل ضغطه هجومياً! يمكنك البقاء وإضافة مدافعين جدد ثم النقر على "تأكيد الدفاع" مجدداً لصد التعزيز!`, "info");
        
        // REVERT PHASE BACK TO AI_ATTACKING SO THE PLAYER CAN DEFEND AND CONFIRM AGAIN!
        phaseRef.current = "ai_attacking";
        setPhase("ai_attacking");
      } else {
        // Safe! No reinforce available for AI.
        SoundEffects.playGoalCelebration();
        setCelebrationMessage({
          title: "إنقاذ بطولي من جدارك! 🧤🧱",
          subtitle: `نجحت تكتلاتك الدفاعية البسيطة والصلبة (${finalDefense}) بصورة مذهلة في تصفية خطورة غزو الخصم (${finalAttack})!`,
          isGoal: false
        });
        newLogs.push({
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: formatBlockLog(false, finalAttack, finalDefense, attackDetail.breakdown, defDetail.breakdown, `${playerScore} - ${aiScore}`),
          type: "success" as const
        });
        recordRound("ai", finalAttack, finalDefense, currentBooster.value, currentBooster.text, false, attackerName, defenders, playerScore, aiScore);
        setPhase("resolution");
      }
    }

    setLogs(newLogs);
    setTempPhaseLogs([]);

    if (isMultiplayer) {
      setTimeout(() => {
        syncToSupabaseInstance(
          "resolution",
          undefined,
          undefined,
          undefined,
          undefined,
          nextPlayerScore,
          nextAiScore,
          undefined,
          undefined,
          newLogs
        );
      }, 50);
    }
  };

  // RESET AND RETURN TO MAIN MENU
  const handleResetGame = () => {
    onReturnToMenu();
    
    // Reload settings of the logged-in user when returning to menu
    const freshUser = gameAuth.getCurrentUser();
    const freshSettings = freshUser?.default_match_settings;
    if (freshUser) {
      setCoachName(freshUser.name);
      setTeamVibe(freshUser.team_name);
      if (freshSettings) {
        setDifficulty(freshSettings.difficulty);
        setMatchTime(freshSettings.matchDuration);
        setInitialMatchTime(freshSettings.matchDuration);
        setLegendPercentage(freshSettings.legendPercentage);
        setMaxDrawsPerTurn(freshSettings.maxDrawsPerTurn);
        setDefaultMaxDrawsPerTurn(freshSettings.maxDrawsPerTurn);
        setMaxMovesPerTurn(freshSettings.maxMovesPerTurn);
        setLegendBurnLimit(freshSettings.legendBurnLimit);
        setInitialCardsCount(freshSettings.initialCardsCount);
        setMaxBonusValue(freshSettings.maxBonusValue);
      }
    } else {
      setCoachName("");
      setTeamVibe("");
    }

    setSelectedHandCardId(null);
    setBurningCardIds([]);
    setSelectedPitchSlotIdx(null);
    setActiveTargetingCard(null);
    setShowConfetti(false);
    setLogs([]);
    setTempPhaseLogs([]);
    setMatchRounds([]);
    setAiCardsDrawnThisTurn(0);
    setIsShotDeclared(false);
  };

  // FORFEIT/WITHDRAW FROM THE MATCH
  const handleForfeitMatch = async () => {
    const confirmForfeit = window.confirm(`هل أنت متأكد من الانسحاب من المباراة؟ سيتم اعتبار الفريق الآخر فائزاً بالعلامة الكاملة (${winningGoals} أهداف).`);
    if (!confirmForfeit) return;

    SoundEffects.playWhistle();

    const finalPlayerScore = playerScore;
    const finalAiScore = winningGoals;

    const opponentTeamName = isMultiplayer ? opponentName : aiTeam;
    const forfeitMsg = `🏳️ انسحاب! قام الكابتن ${formatNameWithTitle(coachName, "الكابتن")} بالانسحاب من المباراة. يعتبر الفريق المنافس [${opponentTeamName}] هو الفائز بالعلامة الكاملة ${winningGoals} - ${playerScore}!`;
    
    const updatedLogs: ActionLog[] = [
      { id: Date.now().toString(), timestamp: getFormattedTime(), text: forfeitMsg, type: "danger" },
      ...logs
    ];

    setLogs(updatedLogs);
    setAiScore(winningGoals);
    setPhase("game_over");

    if (isMultiplayer && currentRoomId) {
      await syncToSupabaseInstance(
        "game_over",
        undefined,
        undefined,
        undefined,
        undefined,
        finalPlayerScore,
        winningGoals,
        undefined,
        undefined,
        updatedLogs
      );

      try {
        await supabaseService.updateRoomState(currentRoomId, {
          status: "finished"
        });
      } catch (e) {
        console.error("Failed to sync forfeit room state:", e);
      }
    }
  };

  // Dynamic Scoreboard Offensive/Defensive Statistics - requested by user
  const isAttackDefActive = currentAttackerIdx !== null && (phase === "attacking" || phase === "ai_attacking" || phase === "resolution");
  const showPlayerAttack = isAttackDefActive && isPlayerAttacker;
  const showPlayerDefense = isAttackDefActive && !isPlayerAttacker;
  const showAiAttack = isAttackDefActive && !isPlayerAttacker;
  const showAiDefense = isAttackDefActive && isPlayerAttacker;

  const activeOffenseVal = isAttackDefActive ? calculateTotalAttack(isPlayerAttacker, currentAttackerIdx!, currentBooster, isPlayerAttacker ? playerActiveSpecial : aiActiveSpecial) : 0;
  const activeDefenseVal = isAttackDefActive ? calculateTotalDefense(!isPlayerAttacker, !isPlayerAttacker ? playerActiveSpecial : aiActiveSpecial) : 0;

  const mainDivClass = `bg-[#050605] text-[#e0e0e0] font-sans relative select-none ${
    isMobile && isPortrait && !isLockedLandscape
      ? "w-full h-full overflow-hidden"
      : phase === "menu"
        ? "w-full h-screen overflow-hidden"
        : "p-1.5 h-screen max-h-screen overflow-hidden md:p-2.5"
  }`;

  const rotatedStyle: React.CSSProperties = (isMobile && isPortrait && !isLockedLandscape) ? {
    position: "fixed",
    top: "50%",
    left: "50%",
    width: "100vh",
    height: "100vw",
    transform: "translate(-50%, -50%) rotate(90deg)",
    transformOrigin: "center",
    overflow: "hidden",
  } : {};

  return (
    <div style={rotatedStyle} className={mainDivClass}>
      {showConfetti && <Confetti />}
      {phase === "menu" && !isGameLoading && !gameLoadError ? (
        <div className="flex flex-col justify-center items-center flex-1 py-12 px-6 bg-[#0c0d0c]/85 border border-white/5 rounded-2xl backdrop-blur-md text-center max-w-md mx-auto my-12 space-y-4 shadow-2xl">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <h3 className="text-lg font-black text-emerald-400">جاري الاتصال بالغرفة...</h3>
        </div>
      ) : phase === "game_over" ? (
        <GameOverScreen
          playerScore={playerScore}
          aiScore={aiScore}
          coachName={coachName}
          aiCoachName={aiCoachName}
          difficulty={difficulty}
          turnCount={turnCount}
          logs={logs}
          matchRounds={matchRounds}
          onRestart={handleResetGame}
        />
      ) : (
        <>
          {/* Background glow effects */}
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
          {/* Main Container */}
          <div className={`max-w-7xl mx-auto h-full flex flex-col space-y-1.5 lg:space-y-2 justify-between ${screenShaken ? "animate-shake" : ""}`}>
            
            {/* TOP STATUS NAVIGATION BAR - Removed to maximize screen utilization */}

        {/* CONDITION-BASED ROUTING VIEWS */}
        {isGameLoading ? (
          <div className="flex flex-col justify-center items-center flex-1 py-12 px-6 bg-[#0c0d0c]/85 border border-white/5 rounded-2xl backdrop-blur-md text-center max-w-md mx-auto my-12 space-y-4 shadow-2xl select-none" id="game_loader_overlay">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-xl">⚽</div>
            </div>
            <h3 className="text-lg font-black text-emerald-400">جاري تحميل تشكيلة المباراة</h3>
            <p className="text-xs text-slate-400">نقوم بسحب الكروت التكتيكية وتشكيلة اللاعبين من الباقات المحددة بالداتابيس...</p>
          </div>
        ) : gameLoadError ? (
          <div className="flex flex-col justify-center items-center flex-1 py-8 px-6 bg-[#0f0a0a]/95 border border-red-500/20 rounded-2xl backdrop-blur-md text-center max-w-md mx-auto my-12 space-y-5 shadow-2xl select-none" id="game_error_overlay">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-2xl">
              ⚠️
            </div>
            <h3 className="text-lg font-black text-red-400">فشل في بدء المباراة</h3>
            <p className="text-xs text-slate-350 leading-relaxed max-w-sm">{gameLoadError}</p>
            <div className="flex items-center gap-3 w-full">
              <a
                href="#/admin"
                className="flex-1 px-4 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl font-bold text-xs cursor-pointer transition-colors block text-center"
              >
                لوحة التحكم ⚙️
              </a>
              <button
                onClick={() => setGameLoadError(null)}
                className="flex-1 px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl font-black text-xs shadow-md cursor-pointer transition-all border-none"
              >
                العودة 🔁
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-row gap-2 w-full h-full select-none text-right overflow-hidden">
            
            {/* LEFT SIDEBAR PANEL (Tactics block + Commentary log + Draw blocks) */}
            <div className="w-[28%] md:w-[26%] min-w-[210px] max-w-[270px] flex flex-col gap-1.5 h-full justify-between overflow-hidden shrink-0">
              
              {/* Match Tools (Rules, Commentary Toggle, Exit/Reset) */}
              <div className="grid grid-cols-3 gap-1 shrink-0">
                <button
                  onClick={() => {
                    SoundEffects.playCardDraw();
                    setIsTutorialOpen(true);
                  }}
                  id="rules_button_sidebar"
                  className="py-1 px-1 bg-[#0b100d] hover:bg-white/5 text-slate-350 hover:text-white border border-white/10 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="قوانين اللعبة بالتفصيل"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>القوانين</span>
                </button>
                
                <button
                  onClick={() => setShowCommentary(!showCommentary)}
                  className={`py-1 px-1 border rounded-lg text-[9px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    showCommentary 
                      ? "bg-amber-600/20 border-amber-500/30 text-amber-305"
                      : "bg-[#0b100d] border-white/10 text-slate-350 hover:bg-white/5"
                  }`}
                >
                  <span>التعليق 🎙️</span>
                </button>

                <button
                  onClick={handleForfeitMatch}
                  id="forfeit_match_sidebar_button"
                  className="py-1 px-1 bg-rose-950/20 hover:bg-rose-900/30 text-rose-350 hover:text-rose-200 border border-rose-500/20 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="الانسحاب من المباراة"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-rose-450" />
                  <span>انسحاب</span>
                </button>
              </div>

              {/* Box 1 (Tactics Panel) - ultra compact layout matching the image identically */}
              <div id="tactics_dashboard_sidebar" className="bg-[#0b100d] border border-white/5 rounded-xl p-1 flex flex-col gap-1 shadow-md select-none">
                <div className="flex flex-col gap-1">
                  {/* Player Tactic (Green highlight) */}
                  <div className={`flex items-center justify-center p-1 bg-black/44 border-r-2 border-emerald-500 rounded-md min-h-[22.5px] transition-all duration-300 ${playerActiveSpecial.length > 0 ? "bg-emerald-950/20" : "opacity-35"}`}>
                    {playerActiveSpecial.length > 0 ? (
                      <span className="text-[#00ff66] font-extrabold text-[9px] animate-pulse truncate flex items-center gap-1">
                        <span className="text-[9px]">⚡</span>
                        <span>{playerActiveSpecial[0].name}</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-600/40 text-[8px] leading-tight">
                        <span className="text-[7.5px] opacity-10">⚡</span>
                        <span>لا يوجد تكتيك فعال</span>
                      </div>
                    )}
                  </div>

                  {/* AI Tactic (Red highlight) */}
                  <div className={`flex items-center justify-center p-1 bg-black/44 border-r-2 border-rose-500 rounded-md min-h-[22.5px] transition-all duration-300 ${aiActiveSpecial.length > 0 ? "bg-rose-950/20" : "opacity-35"}`}>
                    {aiActiveSpecial.length > 0 ? (
                      <span className="text-rose-400 font-extrabold text-[9px] animate-pulse truncate flex items-center gap-1">
                        <span className="text-[9px]">🛡️</span>
                        <span>{aiActiveSpecial[0].name}</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 text-rose-900/30 text-[8px] leading-tight">
                        <span className="text-[7.5px] opacity-10">🛡️</span>
                        <span>لا يوجد تكتيك فعال</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2 (Actions Commentary Log) - Scrollable list strictly bounded with custom thin scrollbar */}
              <div 
                id="commentary_sidebar_panel"
                className="border border-[#125827]/45 bg-[#050a06] rounded-xl flex-1 flex flex-col overflow-hidden p-2 shadow-sm min-h-[90px]"
              >
                <div className="text-white/40 text-[8.5px] font-bold font-sans border-b border-white/5 pb-0.5 mb-1 text-right flex items-center justify-between shrink-0">
                  <span>⏱️ التعليق المباشر</span>
                  <span>سجل حركات اللعب</span>
                </div>
                <div 
                  ref={customLogContainerRef}
                  className="flex-1 overflow-y-auto space-y-1 pr-1 scroll-smooth text-right direction-rtl select-text scrollbar-thin scrollbar-thumb-emerald-800/50"
                >
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 text-[8.5px] p-1.5 leading-relaxed">
                      <span>جرى التحضير... ابدأ بتحريك خطوطك! 🏃‍♂️</span>
                    </div>
                  ) : (
                    groupLogsByTurns(logs).map((group, groupIdx) => {
                      let borderClass = "border-blue-500/15";
                      let bgClass = "bg-linear-to-b from-blue-950/10 to-[#050a06]";
                      let badgeColor = "bg-blue-500/5 text-blue-400 border-blue-500/15";
                      let badgeText = "مباراة";
                      let titleColor = "text-blue-400";
                      
                      if (group.type === "player") {
                        borderClass = "border-emerald-500/20";
                        bgClass = "bg-linear-to-b from-emerald-950/15 to-[#050a06]";
                        badgeColor = "bg-emerald-500/5 text-emerald-400 border-emerald-500/15";
                        badgeText = "دورك";
                        titleColor = "text-emerald-400";
                      } else if (group.type === "ai") {
                        borderClass = "border-rose-500/15";
                        bgClass = "bg-linear-to-b from-rose-950/10 to-[#050a06]";
                        badgeColor = "bg-rose-500/5 text-rose-400 border-rose-500/15";
                        badgeText = "الخصم";
                        titleColor = "text-rose-400";
                      }
                      
                      const groupTime = group.logs[0]?.timestamp || "";
                      
                      return (
                        <div 
                          key={`commentary-group-${groupIdx}`} 
                          className={`border ${borderClass} ${bgClass} rounded-lg p-1 px-1.5 flex flex-col gap-1 transition-all mb-1.5`}
                        >
                          {/* Group Header */}
                          <div className="flex items-center justify-between flex-row-reverse border-b border-white/5 pb-0.5 text-[8px] font-bold">
                            <span className={`${titleColor}`}>{group.title}</span>
                            <div className="flex items-center gap-1 flex-row">
                              {groupTime && (
                                <span className="text-slate-400 font-mono text-[7px] bg-white/5 px-1 py-0.2 rounded border border-white/5">
                                  ⏱ {groupTime}
                                </span>
                              )}
                              <span className={`px-1 py-0.2 rounded text-[7px] border font-sans font-black ${badgeColor}`}>
                                {badgeText}
                              </span>
                            </div>
                          </div>
                          
                          {/* Group Logs */}
                          <div className="flex flex-col gap-0.5">
                            {group.logs.map((log) => {
                              const isDetailed = log.text.includes("تفاصيل الحسبة الفنية:");
                              if (isDetailed) {
                                return renderDetailedLog(log);
                              }
                              
                              const isDanger = log.type === "danger";
                              const isSuccess = log.type === "success";
                              const isWarning = log.type === "warning";
                              let colorClass = "text-white/70";
                              if (isDanger) colorClass = "text-[#ff6b6b]";
                              else if (isSuccess) colorClass = "text-[#00ff88] font-semibold";
                              else if (isWarning) colorClass = "text-amber-400";
                              
                              return (
                                <div key={log.id} className="text-[8.5px] leading-snug border-b border-white/5 last:border-0 pb-0.5 last:pb-0 flex items-start gap-1 justify-end font-sans">
                                  <span className={`${colorClass} flex-1 text-right whitespace-pre-line`}>{log.text}</span>
                                  <span className="text-emerald-500/40 shrink-0 self-center text-[7px]">•</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Box 3 (Draw Decks & Substitutes controls) - Standard compact sizes exactly as requested */}
              <div id="decks_action_grid" className="grid grid-cols-2 gap-1.5 mt-auto pt-0.5 shrink-0">
                
                {/* DRAW PLAYER CARD BLOCK (Yellow background - runner emoji layout) */}
                <button
                  type="button"
                  onClick={() => {
                    const isDrawPhase = (phase === "player_turn" || phase === "warmup") && cardsDrawnThisTurn < maxDrawsPerTurn;
                    if (isDrawPhase) {
                      handleDrawCard("player");
                    } else {
                      addLog("تنبيه: يمكنك سحب كروت فقط في مرحلة السحب الخاصة بدورك!", "warning");
                    }
                  }}
                  className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-extrabold h-10 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-transform duration-100 active:scale-95 shadow-sm border border-white/5 shrink-0"
                  title="سحب كارت لاعب"
                >
                  <span className="text-sm">🏃‍♂️</span>
                  <span className="bg-black/10 text-[10px] px-2 py-0.5 rounded font-mono font-black leading-none">
                    {playerDeck.length}
                  </span>
                </button>

                {/* DRAW TACTIC CARD BLOCK (Purple background - wand/stars logo layout) */}
                <button
                  type="button"
                  onClick={() => {
                    const isDrawPhase = (phase === "player_turn" || phase === "warmup") && cardsDrawnThisTurn < maxDrawsPerTurn;
                    if (isDrawPhase) {
                      handleDrawCard("special");
                    } else {
                      addLog("تنبيه: يمكنك سحب كروت فقط في مرحلة السحب الخاصة بدورك!", "warning");
                    }
                  }}
                  className="bg-[#a855f7] hover:bg-[#9333ea] text-white font-extrabold h-10 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-transform duration-100 active:scale-95 shadow-sm border border-white/5 shrink-0"
                  title="سحب كارت تكتيك"
                >
                  <span className="text-sm">🪄</span>
                  <span className="bg-black/20 text-[10px] text-purple-200 px-2 py-0.5 rounded font-mono font-black leading-none">
                    {specialDeck.length}
                  </span>
                </button>

                {/* SUBSTITUTES BAG TRIGGER BUTTON (Double column) - Matches the layout: 👦 🔃 👦 */}
                <button
                  type="button"
                  onClick={() => setIsHandExpanded(!isHandExpanded)}
                  className="col-span-2 bg-[#84cc16] hover:bg-[#65a30d] text-black font-extrabold h-7 rounded-lg flex items-center justify-center gap-3 cursor-pointer shadow-sm transition-all active:scale-[0.98] border border-white/5 shrink-0"
                  title="البدلاء واستبدال الكروت"
                >
                  <span className="text-xs">👦</span>
                  <span className="text-xs font-black">🔃</span>
                  <span className="text-xs">👦</span>
                </button>

              </div>

            </div>


            {/* RIGHT FIELD MAIN PANEL (Opponent Slots, Scoreboard, Actions Bar, Player Slots) */}
            <div 
              className="flex-1 flex flex-col gap-0.5 md:gap-1.5 h-full justify-between overflow-hidden relative rounded-2xl p-1 md:py-2 md:px-4"
              style={{
                background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 0%, transparent 80%), linear-gradient(to bottom, #0d381e 0%, #14532d 50%, #0d381e 100%)',
              }}
            >
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
              
              {/* Row 1 (Opponent Football Pitch Slots - Compact Red Border) */}
              {/* Row 1 (Opponent Football Pitch Slots - Borderless Field Overlay) */}
              <div className="relative flex-1 min-h-[100px] w-full flex flex-col justify-start items-center z-10 pt-1 md:pt-2">

                
                {isHandExpanded && (
                  <div className="absolute inset-0 z-50 bg-[#080d09]/95 backdrop-blur-md rounded-xl p-1.5 flex flex-col justify-between shadow-2xl animate-scaleUp border border-[#10b981]/50">
                    <CoachHand
                      hand={playerHand}
                      selectedCardId={selectedHandCardId}
                      burningCardIds={burningCardIds}
                      movesLeft={playerMovesLeft}
                      phase={phase}
                      playerDeckCount={playerDeck.length}
                      specialDeckCount={specialDeck.length}
                      cardsDrawnThisTurn={cardsDrawnThisTurn}
                      maxDrawsPerTurn={maxDrawsPerTurn}
                      legendBurnLimit={legendBurnLimit}
                      initialCardsCount={initialCardsCount}
                      isPlayerTurn={phase === "player_turn" || phase === "warmup"}
                      isHandExpanded={isHandExpanded}
                      setIsHandExpanded={setIsHandExpanded}
                      playerSlots={playerSlots}
                      onInspectCard={setInspectedCard}
                      onSelectCard={(id) => {
                        const card = playerHand.find((c) => c.id === id);
                        if (!card) return;

                        // Handle special burning toggles if a legend is selected and this is another card
                        const currentSelectedCard = playerHand.find((c) => c.id === selectedHandCardId);
                        const isLegendSelected = currentSelectedCard?.type === "player" && (currentSelectedCard as PlayerCard).isLegend;
                        
                        if (isLegendSelected && id !== selectedHandCardId) {
                          toggleBurningCard(id);
                        } else {
                          handleSelectHandCard(id);
                        }
                      }}
                      onDrawCard={handleDrawCard}
                      onPlaySpecialCard={handlePlaySpecialCard}
                      onCancelSelection={handleCancelSelection}
                    />
                  </div>
                )}

                <div className="grid grid-cols-5 gap-1 md:gap-1.5 w-full flex-1 items-center">
                  {aiSlots.map((slot, idx) => {
                    const isSelectable = isSlotSelectable(idx, true);
                    const isChosenToAttack = currentAttackerIdx === idx && phase !== "player_turn";
                    const isSpent = slot.spent;
                    const isActiveInAttack = !!(slot.card && (slot.confirmedInAttack || ((phase === "resolution" || phase === "game_over") && slot.revealedInAttack)));
                    const isOpponentCardRevealed = !!(slot.confirmedInAttack || slot.spent || (slot as any).revealedByAbility || ((phase === "resolution" || phase === "game_over") && slot.revealedInAttack));
                    const hasImage = slot.card ? !!((slot.card as any).imageUrl || (slot.card as any).image_url || (slot.card as any).image) : false;

                    const isAttacker = phase === "ai_attacking";
                    const isDefender = phase === "attacking";
                    
                    const activeTransformClass = isActiveInAttack
                      ? isAttacker
                        ? "translate-y-5 scale-105 z-40"
                        : "translate-y-3 scale-102 z-30"
                      : "";


                    const activeCardColor = isAttacker ? "attack" : "defense";

                    return (
                      <div 
                        key={`ai-pitch-slot-${idx}`}
                        className={`relative aspect-[2/3] ${isRotated ? 'max-h-[30vw] max-w-[20vw]' : 'max-h-[28vh] md:max-h-[30vh] max-w-[18.6vh] md:max-w-[20vh]'} w-full mx-auto transition-all flex flex-col justify-between ${
                          slot.card && hasImage ? "" : "rounded-2xl overflow-hidden"
                        } ${
                          isSelectable 
                            ? slot.card
                              ? "cursor-pointer filter drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                              : "ring-2 ring-rose-400 ring-offset-1 ring-offset-black cursor-pointer hover:scale-103" 
                            : ""
                        } ${activeTransformClass}`}
                      >
                        {slot.card ? (
                          <div 
                            className="relative w-full h-full cursor-pointer"
                            onClick={() => isSelectable && handleSelectPitchSlot(idx, true)}
                          >
                            <GameCard
                              card={maskCardIfHidden(slot.card, isOpponentCardRevealed)}
                              isRevealed={isOpponentCardRevealed}
                              size="pitch"
                              isActive={isActiveInAttack}
                              activeColor={activeCardColor}
                              onInspect={isOpponentCardRevealed ? (() => setInspectedCard(slot.card)) : undefined}
                              className={`${isSpent ? "pointer-events-none" : ""}`}
                            />
                            
                            {/* Active attack/defense tactical badge */}
                            {isActiveInAttack && (
                              <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shadow-lg z-30 flex items-center gap-0.5 animate-bounce ${
                                isAttacker 
                                  ? "bg-red-650 text-white border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]" 
                                  : "bg-blue-650 text-white border border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]"
                              }`}>
                                <span>{isAttacker ? "🔥" : "🛡️"}</span>
                                <span>{isAttacker ? "هجوم" : "دفاع"}</span>
                              </div>
                            )}

                            {isSpent && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl pointer-events-none z-20">
                                <span className="text-[8px] text-yellow-500 font-extrabold uppercase bg-black/85 px-1 py-0.2 rounded border border-yellow-500/20">منتهي</span>
                              </div>
                            )}
                            {isOpponentCardRevealed && !isSpent && isActiveInAttack && (
                              <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center justify-center">
                                <span className="bg-linear-to-r from-rose-500 to-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full border border-rose-400 shadow-md animate-pulse whitespace-nowrap">
                                  ساري ⚡
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Dotted silhouette placeholder for empty opponent slot */
                          <div 
                            onClick={() => isSelectable && handleSelectPitchSlot(idx, true)}
                            className="w-full h-full aspect-[2/3] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-white/5"
                          >
                            <span className="text-xl opacity-10 select-none">👤</span>
                            <span className="text-[7px] font-bold text-white/15 tracking-wider">شاغر</span>
                          </div>
                        )}
                      </div>

                    );
                  })}
                </div>
              </div>


              {/* Row 2 (Beautiful Scoreboard and Clock Indicator - Floating Backdrop Blur Pitch-Center design) */}
              <div className={`backdrop-blur-md bg-black/25 rounded-full px-2 py-0 md:px-4 md:py-0.5 w-[92%] md:w-[75%] mx-auto border border-white/5 shadow-lg items-center justify-between gap-1 md:gap-3 h-[20px] md:h-[30px] shrink-0 select-none ${isHandExpanded ? "hidden" : "flex"}`}>
                
                {/* Scoreboard Left Team (User) */}
                <div className="flex items-center gap-1 md:gap-1.5 text-right flex-1 select-none">
                  <span className="text-[10px] md:text-base leading-none flex items-center shrink-0">
                    {getTeamFlagAndName(teamVibe).flag}
                  </span>
                  <div className="flex flex-col text-right">
                    <span className="text-[6.5px] md:text-[8px] font-black text-[#e0e0e0]/60 leading-none">
                      {getTeamFlagAndName(teamVibe).name}
                    </span>
                  </div>

                  {/* Dynamic player Attack/Defense badge - requested by user */}
                  {showPlayerAttack && (
                    <div className="mr-auto ml-1 bg-amber-50/10 text-yellow-300 px-0.5 py-0.2 md:px-1.5 md:py-0.5 rounded text-[7px] md:text-[9px] font-black flex items-center gap-0.5 animate-pulse">
                      <span>🔥</span>
                      <span>{activeOffenseVal}</span>
                    </div>
                  )}
                  {showPlayerDefense && (
                    <div className="mr-auto ml-1 bg-sky-500/10 text-sky-300 px-0.5 py-0.2 md:px-1.5 md:py-0.5 rounded text-[7px] md:text-[9px] font-black flex items-center gap-0.5 animate-pulse">
                      <span>🛡️</span>
                      <span>{activeDefenseVal}</span>
                    </div>
                  )}

                  <div className="text-[#00ff66] font-mono font-black text-[9.5px] md:text-base min-w-[12px] md:min-w-[16px] text-center ml-0.5 md:ml-1">
                    {playerScore}
                  </div>
                </div>

                {/* Clock Stopwatch / Rounds in the middle */}
                <div className="flex items-center justify-center gap-1.5 md:gap-3 text-emerald-400 font-mono font-black text-[8.5px] md:text-xs px-1.5 md:px-2.5 py-0.2 md:py-0.5 bg-black/30 md:bg-transparent rounded-full whitespace-nowrap shrink-0">
                  {phase === "warmup" ? (
                    <div className="flex items-center gap-1 text-amber-500 animate-pulse bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.2 md:px-2.5 md:py-0.5 rounded-full text-[7.5px] md:text-[10px]">
                      <span>🔥</span>
                      <span className="tracking-wider">
                        التسخين: {warmupTimeLeft}ث
                      </span>
                    </div>
                  ) : gameMode === "rounds" ? (
                    <div className="flex items-center gap-1">
                      <span>🔁</span>
                      <span className="tracking-wider">
                        الجولة {Math.min(completedRounds + 1, totalRounds)}/{totalRounds}
                      </span>
                    </div>
                  ) : isHalfTimeBreak ? (
                    <div className="flex items-center gap-1 text-amber-400 animate-pulse">
                      <span>⏸️</span>
                      <span className="tracking-wider">
                        استراحة ({halfTimeBreakLeft}ث)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span>⏱️</span>
                      <span className="tracking-wider md:tracking-widest">
                        {(() => {
                          const m = Math.floor(matchTime / 60).toString().padStart(2, "0");
                          const s = (matchTime % 60).toString().padStart(2, "0");
                          return `${m}:${s}`;
                        })()}
                      </span>
                      <span className="text-[7px] md:text-[9px] px-1 bg-emerald-950/60 border border-emerald-500/20 rounded font-black text-emerald-305">
                        {matchHalf === 1 ? "ش1" : "ش2"}
                      </span>
                    </div>
                  )}

                  {/* Turn Timer Badge */}
                  {turnTimeLimit > 0 && (phase === "player_turn" || phase === "ai_turn") && (
                    <div className={`text-[7px] md:text-[9px] px-1.5 py-0.2 rounded font-black border flex items-center gap-0.5 ${
                      phase === "player_turn"
                        ? "bg-emerald-950/60 border-emerald-500/35 text-emerald-350"
                        : "bg-rose-950/60 border-rose-500/35 text-rose-350 animate-pulse"
                    }`}>
                      <span>⏳</span>
                      <span>
                        {phase === "player_turn" ? "دورك" : "الخصم"}: {turnTimeLeft}ث
                      </span>
                    </div>
                  )}
                </div>

                {/* Scoreboard Right Team (Opponent) */}
                <div className="flex items-center gap-1 md:gap-1.5 text-left flex-1 justify-end select-none">
                  <div className="text-rose-450 font-mono font-black text-[9.5px] md:text-base min-w-[12px] md:min-w-[16px] text-center mr-0.5 md:mr-1">
                    {aiScore}
                  </div>

                  {/* Dynamic AI Attack/Defense badge - requested by user */}
                  {showAiDefense && (
                    <div className="ml-auto mr-1 bg-sky-500/10 text-sky-300 px-0.5 py-0.2 md:px-1.5 md:py-0.5 rounded text-[7px] md:text-[9px] font-black flex items-center gap-0.5 animate-pulse">
                      <span>🛡️</span>
                      <span>{activeDefenseVal}</span>
                    </div>
                  )}
                  {showAiAttack && (
                    <div className="ml-auto mr-1 bg-amber-500/10 text-yellow-300 px-0.5 py-0.2 md:px-1.5 md:py-0.5 rounded text-[7px] md:text-[9px] font-black flex items-center gap-0.5 animate-pulse">
                      <span>🔥</span>
                      <span>{activeOffenseVal}</span>
                    </div>
                  )}

                  <div className="flex flex-col text-right ml-0.5 md:ml-1">
                    <span className="text-[6.5px] md:text-[8px] font-black text-[#e0e0e0]/60 leading-none">
                      {isMultiplayer ? getTeamFlagAndName(opponentVibe).name : "كتائب الروبوت"}
                    </span>
                  </div>
                  <span className="text-[10px] md:text-sm flex items-center shrink-0">
                    {isMultiplayer ? getTeamFlagAndName(opponentVibe).flag : "🤖"}
                  </span>
                </div>

              </div>


              {/* Row 3 (Sleek Round Controller Toolbar - Floating Pill Backdrop Blur) */}
              <div className={`backdrop-blur-md bg-black/30 rounded-full px-1.5 py-0 md:px-4 md:py-0.5 w-[96%] md:w-[90%] mx-auto border border-white/5 shadow-md items-center justify-between gap-1 md:gap-3 h-[20px] md:h-[30px] shrink-0 select-none ${isHandExpanded ? "hidden" : "flex"}`}>

                
                {/* State Tag badge */}
                <div className="bg-linear-to-r from-emerald-600/15 to-teal-600/15 text-emerald-400 border border-emerald-500/25 px-1 py-0.5 rounded-md font-black text-[7px] md:text-[9px] shadow-sm whitespace-nowrap shrink-0 leading-none">
                  {phase === "warmup" && (
                    <>
                      <span className="hidden md:inline">مرحلة التسخين ⚽</span>
                      <span className="inline md:hidden">التسخين ⚽</span>
                    </>
                  )}
                  {phase === "player_turn" && (
                    <>
                      <span className="hidden md:inline">دورك التكتيكي 🧠</span>
                      <span className="inline md:hidden">دورك 🧠</span>
                    </>
                  )}
                  {phase === "ai_turn" && (
                    <>
                      <span className="hidden md:inline">دفاع الخصم مستعد 🤖</span>
                      <span className="inline md:hidden">الخصم 🤖</span>
                    </>
                  )}
                  {phase === "attacking" && (
                    <>
                      <span className="hidden md:inline">التسديد والهجوم ⚔️</span>
                      <span className="inline md:hidden">هجوم ⚔️</span>
                    </>
                  )}
                  {phase === "ai_attacking" && (
                    <>
                      <span className="hidden md:inline">صد دفاعي شرس 🛡️</span>
                      <span className="inline md:hidden">دفاع 🛡️</span>
                    </>
                  )}
                  {phase === "resolution" && (
                    <>
                      <span className="hidden md:inline">تحليل الهجمة 📊</span>
                      <span className="inline md:hidden">تحليل 📊</span>
                    </>
                  )}
                  {phase === "game_over" && (
                    <>
                      <span className="hidden md:inline">انتهت المقابلة 🏁</span>
                      <span className="inline md:hidden">انتهت 🏁</span>
                    </>
                  )}
                </div>

                {/* Status Counters pills */}
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0 scale-[0.82] md:scale-95 origin-center font-sans font-black text-[6.5px] md:text-[8px] leading-none">
                  {/* Opponent Pill (Rose Red Theme) */}
                  <div className="bg-rose-950/20 text-rose-400 border border-rose-500/25 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                    <span>حركات {(() => {
                      if (phase === "attacking") return maxMovesPerTurn - defenseMovesLeft;
                      if (phase === "resolution") {
                        return isPlayerAttacker ? (maxMovesPerTurn - defenseMovesLeft) : (maxMovesPerTurn - aiMovesLeft);
                      }
                      return maxMovesPerTurn - aiMovesLeft;
                    })()}/{maxMovesPerTurn}</span>
                    <span className="text-rose-550/30">|</span>
                    <span>سحب {aiCardsDrawnThisTurn}/{maxDrawsPerTurn}</span>
                  </div>

                  {/* Symmetrical Divider */}
                  <div className="border-l border-white/10 h-3" />

                  {/* Player Pill (Emerald Green Theme) */}
                  <div className="bg-emerald-950/20 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                    {phase === "warmup" ? (
                      <>
                        <span>حركات 0/{maxMovesPerTurn}</span>
                        <span className="text-emerald-550/30">|</span>
                        <span>سحب {playerSlots.filter(s => s.card !== null).length}/{initialCardsCount}</span>
                      </>
                    ) : (
                      <>
                        <span>حركات {(() => {
                          if (phase === "ai_attacking") return maxMovesPerTurn - defenseMovesLeft;
                          if (phase === "resolution") {
                            return isPlayerAttacker ? (maxMovesPerTurn - playerMovesLeft) : (maxMovesPerTurn - defenseMovesLeft);
                          }
                          return maxMovesPerTurn - playerMovesLeft;
                        })()}/{maxMovesPerTurn}</span>
                        <span className="text-emerald-550/30">|</span>
                        <span>سحب {cardsDrawnThisTurn}/{maxDrawsPerTurn}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actionable Buttons depending on phase */}
                <div className="flex items-center gap-1 md:gap-1.5 justify-end">
                  
                  {phase === "player_turn" && (
                    <>
                      <button
                        type="button"
                        onClick={handleDeclareAttack}
                        disabled={playerMovesLeft < 1 && selectedPitchSlotIdx === null}
                        className="bg-[#881337] hover:bg-[#9f1239] disabled:opacity-40 text-white font-extrabold py-0.5 px-1.5 md:px-2 rounded-md text-[7.5px] md:text-[9.5px] flex items-center gap-0.5 cursor-pointer transition-colors leading-none"
                      >
                        <span>هجوم</span>
                        <span>⚔️</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleEndPlayerTurn}
                        className="bg-[#2d3748] hover:bg-[#3d4a5f] text-slate-300 font-extrabold py-0.5 px-1 rounded-md text-[7.5px] md:text-[10px] border border-white/5 cursor-pointer transition-colors leading-none"
                      >
                        <span>إنهاء ⏳</span>
                      </button>
                    </>
                  )}

                  {phase === "warmup" && (
                    <button
                      type="button"
                      onClick={handleConfirmLineup}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-0.5 px-1.5 md:px-3 rounded-md text-[7.5px] md:text-[10px] cursor-pointer transition-colors leading-none"
                    >
                      <span className="hidden md:inline">تأكيد البدء 🏁</span>
                      <span className="inline md:hidden">تأكيد 🏁</span>
                    </button>
                  )}

                  {phase === "attacking" && (
                    <>
                      {isMultiplayer && isShotDeclared ? (
                        <span className="text-[7.5px] md:text-[9.5px] text-yellow-400 font-extrabold flex items-center gap-0.5">
                          <span>بانتظار دفاع الخصم... ⏳</span>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleResolveAttack}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-black py-0.5 px-1.5 md:px-3 rounded-md text-[7.5px] md:text-[10px] cursor-pointer transition-colors leading-none"
                          >
                            تسديدة ⚽
                          </button>
                          {isAttackBlocked && (
                            <button
                              type="button"
                              onClick={handleForceEndAttack}
                              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-0.5 px-0.8 md:px-2 rounded-md text-[7px] md:text-[9px] cursor-pointer leading-none"
                            >
                              إنهاء 🛑
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {phase === "ai_attacking" && (
                    <>
                      {isMultiplayer && !isShotDeclared ? (
                        <span className="text-[7.5px] md:text-[9.5px] text-rose-400 font-extrabold flex items-center gap-0.5 animate-pulse">
                          <span>بانتظار تسديدة الخصم... ⚽</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConfirmDefense}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-black py-0.5 px-1.5 md:px-3 rounded-md text-[7.5px] md:text-[10px] cursor-pointer transition-colors leading-none"
                        >
                          تأكيد 🛡️
                        </button>
                      )}
                    </>
                  )}

                  {phase === "game_over" && (
                    <button
                      type="button"
                      onClick={handleResetGame}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-0.5 px-1.5 md:px-3 rounded-md text-[7.5px] md:text-[10px] cursor-pointer leading-none"
                    >
                      جديدة 🔁
                    </button>
                  )}

                </div>

              </div>


              {/* Row 4 (Player Pitch Slots - Borderless Field Overlay) */}
              <div className="relative flex-1 min-h-[100px] w-full flex flex-col justify-end items-center z-10 pb-1 md:pb-2">


                <div className="grid grid-cols-5 gap-1 md:gap-1.5 w-full flex-1 items-center">
                  {playerSlots.map((slot, idx) => {
                    const isSelectable = isSlotSelectable(idx, false);
                    const isSelected = selectedPitchSlotIdx === idx;
                    const isSpent = slot.spent;
                    const isActiveInAttack = !!(slot.card && slot.revealedInAttack);
                    const hasImage = slot.card ? !!((slot.card as any).imageUrl || (slot.card as any).image_url || (slot.card as any).image) : false;

                    const isAttacker = phase === "attacking";
                    const isDefender = phase === "ai_attacking";
                    
                    const activeTransformClass = isActiveInAttack
                      ? isAttacker
                        ? "-translate-y-5 scale-105 z-40"
                        : "-translate-y-3 scale-102 z-30"
                      : "";



                    const activeCardColor = isAttacker ? "attack" : "defense";

                    return (
                      <div 
                        key={`player-pitch-slot-${idx}`}
                        className={`relative aspect-[2/3] ${isRotated ? 'max-h-[30vw] max-w-[20vw]' : 'max-h-[28vh] md:max-h-[30vh] max-w-[18.6vh] md:max-w-[20vh]'} w-full mx-auto transition-all flex flex-col justify-between ${
                          slot.card && hasImage ? "" : "rounded-2xl overflow-hidden"
                        } ${
                          isSelectable 
                            ? slot.card
                              ? "cursor-pointer filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                              : "ring-2 ring-emerald-400 ring-offset-1 ring-offset-black cursor-pointer hover:scale-103 animate-pulse" 
                            : ""
                        } ${
                          isSelected 
                            ? slot.card
                              ? "filter drop-shadow-[0_0_10px_rgba(245,158,11,0.85)] scale-[1.02]"
                              : "ring-2 ring-amber-400 ring-offset-1 ring-offset-black scale-102" 
                            : ""
                        } ${activeTransformClass}`}
                      >
                        {slot.card ? (
                          <div className="relative w-full h-full cursor-pointer" onClick={() => activeTargetingCard ? (isSelectable && handleSelectPitchSlot(idx, false)) : handleSelectPitchSlot(idx, false)}>
                            <GameCard
                              card={slot.card}
                              isRevealed={true}
                              size="pitch"
                              isSelected={isSelected}
                              isActive={isActiveInAttack}
                              activeColor={activeCardColor}
                              onInspect={() => setInspectedCard(slot.card)}
                              className={`${isSpent ? "pointer-events-none" : ""}`}
                            />
                            
                            {/* Active attack/defense tactical badge */}
                            {isActiveInAttack && (
                              <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shadow-lg z-30 flex items-center gap-0.5 animate-bounce ${
                                isAttacker 
                                  ? "bg-red-650 text-white border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]" 
                                  : "bg-blue-650 text-white border border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]"
                              }`}>
                                <span>{isAttacker ? "🔥" : "🛡️"}</span>
                                <span>{isAttacker ? "هجوم" : "دفاع"}</span>
                              </div>
                            )}

                            {isSpent && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl pointer-events-none z-20">
                                <span className="text-[8px] text-yellow-500 font-extrabold uppercase bg-black/85 px-1 py-0.2 rounded border border-yellow-500/20">منتهي</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Empty Player Slot with faint player silhouette directly on turf */
                          <div 
                            onClick={() => handleSelectPitchSlot(idx, false)}
                            className="w-full h-full aspect-[2/3] rounded-2xl border border-dashed border-emerald-400/20 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-emerald-500/10"
                          >
                            <span className="text-xl text-emerald-400 opacity-20 select-none">👤</span>
                            <span className="text-[7.5px] font-bold text-emerald-400/20 tracking-wider">تنزيل لاعب</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Player lineup and slots loaded dynamically */}

            </div>

          </div>
        )}

      </div>
    </>
  )}

      {/* RULES TUTORIAL POPUP OPENER */}
      <GameTutorialPanel
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* ABSOLUTE GOAL CELEBRATION OVERLAY CINEMATIC */}
      <AnimatePresence>
        {celebrationMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer"
            id="celebration_cinematic_dialog"
            onClick={handleAcknowledgeResolution}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full max-h-[90%] overflow-y-auto rounded-xl p-4 sm:p-6 text-center border border-white/10 shadow-2xl relative bg-[#0c0d0c] text-white flex flex-col items-center cursor-default"
            >
              {/* Close Button X */}
              <button 
                onClick={handleAcknowledgeResolution}
                className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-20 cursor-pointer border-none text-xs"
                title="إغلاق"
              >
                ✕
              </button>

              {/* Confetti or dust effect circles */}
              <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />

              {/* Animated Floating Emojis Burst */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                {Array.from({ length: 14 }).map((_, i) => {
                  const emojis = celebrationMessage.isGoal 
                    ? ["⚽", "🥳", "🎉", "🔥", "🥅", "⚡", "🏆", "🌟", "📣", "🤩"]
                    : ["🧤", "🛡️", "🚫", "💪", "👊", "💥", "⚡", "👑", "🎩", "🎯"];
                  const emoji = emojis[i % emojis.length];
                  
                  // Vary coordinates and timing for a genuine burst/fading upward float
                  const angle = (i / 14) * Math.PI * 2;
                  const distance = 90 + Math.random() * 110;
                  const targetX = Math.cos(angle) * distance;
                  const targetY = Math.sin(angle) * distance - 120; // Float upwards and outwards

                  return (
                    <motion.span
                      key={i}
                      className="absolute text-lg sm:text-2xl md:text-3xl select-none filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ 
                        opacity: [0, 1, 1, 0], 
                        scale: [0.1, 1.4, 1.1, 0.2], 
                        x: [0, targetX], 
                        y: [0, targetY],
                        rotate: [0, Math.random() * 720 - 360]
                      }}
                      transition={{ 
                        duration: 2.5, 
                        delay: i * 0.08, 
                        ease: "easeOut",
                        repeat: Infinity,
                        repeatDelay: 0.8
                      }}
                    >
                      {emoji}
                    </motion.span>
                  );
                })}
              </div>

              {/* Dynamic Scaling Hero Emoji with pulsate ripple */}
              <div className="relative inline-block mb-3 sm:mb-6 z-10">
                <motion.div
                  className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl filter"
                  animate={{
                    scale: [1, 1.8, 1],
                    opacity: [0.4, 0.8, 0.4]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                <motion.div
                  className="text-4xl sm:text-5xl md:text-6xl block relative select-none cursor-pointer"
                  animate={{
                    scale: [1, 1.25, 0.9, 1.15, 1],
                    rotate: [0, 15, -15, 8, -8, 0],
                    y: [0, -12, 0, -5, 0]
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                    ease: "easeInOut",
                  }}
                  whileHover={{ scale: 1.4, rotate: 360 }}
                >
                  {celebrationMessage.isGoal ? "⚽" : "🧤"}
                </motion.div>
              </div>

              <h3 className="text-xl sm:text-2xl md:text-3xl font-serif font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-yellow-300 via-amber-400 to-yellow-200">
                {celebrationMessage.title}
              </h3>

              <p className="mt-3 text-xs md:text-sm text-[#e0e0e0]/70 leading-relaxed max-w-sm mx-auto p-2.5 bg-black/40 rounded-xl border border-white/5">
                {celebrationMessage.subtitle}
              </p>

              <button
                onClick={handleCelebrationClick}
                id="acknowledge_celebration_button"
                className="relative overflow-hidden mt-4 sm:mt-6 px-10 py-2.5 bg-amber-600 hover:bg-amber-500 text-black font-extrabold rounded text-xs md:text-sm cursor-pointer transition-all duration-150 transform hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] border-none shadow-md"
              >
                {/* Visual ripple waves */}
                {btnRipples.map((ripple) => (
                  <motion.span
                    key={ripple.id}
                    initial={{ scale: 0, opacity: 0.65 }}
                    animate={{ scale: 6, opacity: 0 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="absolute bg-amber-200/50 rounded-full pointer-events-none"
                    style={{
                      left: ripple.x,
                      top: ripple.y,
                      width: 40,
                      height: 40,
                      x: "-50%",
                      y: "-50%",
                    }}
                  />
                ))}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <span>متابعة تكتيك اللقاء الكروي</span>
                  <span>➔</span>
                </span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic detailed specialty inspector overlay */}
      <CardInspectorModal
        card={inspectedCard}
        onClose={() => setInspectedCard(null)}
      />

      {/* Dynamic Cinematic Event Activation Overlay */}
      <AnimatePresence>
        {cinematicEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer"
            id="cinematic_ability_overlay"
            onClick={() => setCinematicEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -10, y: 100 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 0.6, rotate: 10, y: -100 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-w-sm w-full p-6 text-center rounded-3xl border shadow-2xl relative cursor-default ${
                cinematicEvent.type === "ability"
                  ? "bg-linear-to-b from-[#1c1402] via-[#0c0d0c] to-black border-amber-500/40 shadow-[0_0_50px_rgba(251,191,36,0.25)] text-amber-200"
                  : "bg-linear-to-b from-[#021c17] via-[#0c0d0c] to-black border-teal-500/40 shadow-[0_0_50px_rgba(45,212,191,0.25)] text-teal-200"
              }`}
            >
              {/* Confetti or sparklers */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
                <div className={`absolute top-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-20 ${
                  cinematicEvent.type === "ability" ? "bg-amber-400" : "bg-teal-400"
                }`} />
                <div className={`absolute bottom-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 ${
                  cinematicEvent.type === "ability" ? "bg-amber-400" : "bg-teal-400"
                }`} />
              </div>

              {/* Giant Symbol Indicator */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-6xl mb-4 drop-shadow-md select-none"
              >
                {cinematicEvent.cardIcon || (cinematicEvent.type === "ability" ? "👑" : "⚡")}
              </motion.div>

              <span className={`text-[10px] font-black uppercase tracking-wider ${
                cinematicEvent.type === "ability" ? "text-amber-400" : "text-teal-400"
              }`}>
                {cinematicEvent.title}
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 mb-2">
                {cinematicEvent.cardName}
              </h2>

              <div className="bg-black/45 p-3 rounded-xl border border-white/5 text-xs text-slate-350 leading-relaxed">
                {cinematicEvent.subtitle}
              </div>

              {/* Speed progress line */}
              <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.8, ease: "linear" }}
                  className={`h-full ${
                    cinematicEvent.type === "ability" ? "bg-amber-400" : "bg-teal-400"
                  }`}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
