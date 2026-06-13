/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Swords, Shield, RefreshCw, Sparkles, HelpCircle, Volume2, Gamepad2, Timer, AlertCircle } from "lucide-react";

import { 
  Card, PlayerCard, SpecialCard, PontoCard, GamePhase, ActionLog, Coach, GameState 
} from "./types";
import { 
  generatePlayerDeck, generateSpecialDeck, generatePontoDeck, INITIAL_PONTO_CARDS 
} from "./cardsData";
import { SoundEffects } from "./utils/sounds";

import WelcomeMenu from "./components/WelcomeMenu";
import Multilobby from "./components/Multilobby";
import { supabaseService, MatchRoom } from "./lib/supabase";
import GameTutorialPanel from "./components/GameTutorialPanel";
import TacticalPitch from "./components/TacticalPitch";
import CoachHand from "./components/CoachHand";
import ActionTickerLog from "./components/ActionTickerLog";
import ActionDashboard from "./components/ActionDashboard";
import DrawDecksDashboard from "./components/DrawDecksDashboard";
import TopScoreHeader from "./components/TopScoreHeader";
import CardInspectorModal from "./components/CardInspectorModal";

// Helper to format timestamps 
const getFormattedTime = () => {
  const now = new Date();
  return now.toTimeString().split(" ")[0];
};

export default function App() {
  // Static AI properties
  const aiCoachName = "المدرب الغريم (تكتيك روبوت)";
  const aiTeam = "كتائب الروبوت الذكية 🤖";

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
  const [coachName, setCoachName] = useState("");
  const [teamVibe, setTeamVibe] = useState("");
  const [difficulty, setDifficulty] = useState<"normal" | "tactical" | "legend">("normal");

  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  // Decks
  const [playerDeck, setPlayerDeck] = useState<PlayerCard[]>([]);
  const [specialDeck, setSpecialDeck] = useState<SpecialCard[]>([]);
  const [pontoDeck, setPontoDeck] = useState<PontoCard[]>([]);

  // Coaches pitch slots (exactly 5 slots)
  const [playerSlots, setPlayerSlots] = useState<{ card: PlayerCard | null; isRevealed: boolean }[]>(
    Array(5).fill(null).map(() => ({ card: null, isRevealed: false }))
  );
  const [aiSlots, setAiSlots] = useState<{ card: PlayerCard | null; isRevealed: boolean }[]>(
    Array(5).fill(null).map(() => ({ card: null, isRevealed: false }))
  );

  // Hands
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);

  // Turn tracking
  const [playerMovesLeft, setPlayerMovesLeft] = useState(3);
  const [aiMovesLeft, setAiMovesLeft] = useState(3);
  const [cardsDrawnThisTurn, setCardsDrawnThisTurn] = useState(0);
  const [turnCount, setTurnCount] = useState(1);

  // Selection states
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [burningCardIds, setBurningCardIds] = useState<string[]>([]);
  const [selectedPitchSlotIdx, setSelectedPitchSlotIdx] = useState<number | null>(null);

  // Active Attack States
  const [currentAttackerIdx, setCurrentAttackerIdx] = useState<number | null>(null);
  const [currentPonto, setCurrentPonto] = useState<PontoCard | null>(null);
  // Special tactical buffs applied specifically to current action
  const [playerActiveSpecial, setPlayerActiveSpecial] = useState<SpecialCard[]>([]);
  const [aiActiveSpecial, setAiActiveSpecial] = useState<SpecialCard[]>([]);

  // Defense moves left counter (for resolving of other turns)
  const [defenseMovesLeft, setDefenseMovesLeft] = useState(3);

  // Lists of logs
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Goal explosion cinematic state
  const [celebrationMessage, setCelebrationMessage] = useState<{ title: string; subtitle: string; isGoal: boolean } | null>(null);
  
  // Match countdown timer
  const [matchTime, setMatchTime] = useState<number>(180);
  const [initialMatchTime, setInitialMatchTime] = useState<number>(180);

  // Lifted state to control hand bag openness
  const [isHandExpanded, setIsHandExpanded] = useState<boolean>(false);

  // Zooms and inspects selected card detailed stats
  const [inspectedCard, setInspectedCard] = useState<Card | null>(null);
  
  // Ripple waves for action click triggers
  const [btnRipples, setBtnRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const isReceivingUpdate = React.useRef(false);

  // Sync current local state to Supabase
  const syncToSupabaseInstance = async (
    overridePhase?: GamePhase,
    overridePlayerSlots?: { card: PlayerCard | null; isRevealed: boolean }[],
    overrideAiSlots?: { card: PlayerCard | null; isRevealed: boolean }[],
    overridePlayerHand?: Card[],
    overrideAiHand?: Card[],
    overridePlayerScore?: number,
    overrideAiScore?: number,
    overridePlayerMoves?: number,
    overrideAiMoves?: number,
    overrideLogs?: ActionLog[],
    overrideCurrentPonto?: PontoCard | null,
    overrideCurrentAttackIdx?: number | null,
    overrideActiveSpecialPlayer?: SpecialCard[],
    overrideActiveSpecialAi?: SpecialCard[],
    overrideCardsDrawn?: number,
    overrideTurnCount?: number,
    overrideDefenseMoves?: number,
    overridePlayerDeck?: PlayerCard[],
    overrideSpecialDeck?: SpecialCard[],
    overridePontoDeck?: PontoCard[],
    overrideAttackerRole?: "host" | "opponent" | null
  ) => {
    if (!isMultiplayer && !overridePhase) return;
    const resolvedRoomId = currentRoomId;
    const resolvedRole = multiplayerRole;
    if (!resolvedRoomId || !resolvedRole) return;
    if (isReceivingUpdate.current) return;

    const resolvedPhase = overridePhase !== undefined ? overridePhase : phase;
    const resolvedPlayerSlots = overridePlayerSlots !== undefined ? overridePlayerSlots : playerSlots;
    const resolvedAiSlots = overrideAiSlots !== undefined ? overrideAiSlots : aiSlots;
    const resolvedPlayerHand = overridePlayerHand !== undefined ? overridePlayerHand : playerHand;
    const resolvedAiHand = overrideAiHand !== undefined ? overrideAiHand : aiHand;
    const resolvedPlayerScore = overridePlayerScore !== undefined ? overridePlayerScore : playerScore;
    const resolvedAiScore = overrideAiScore !== undefined ? overrideAiScore : aiScore;
    const resolvedPlayerMoves = overridePlayerMoves !== undefined ? overridePlayerMoves : playerMovesLeft;
    const resolvedAiMoves = overrideAiMoves !== undefined ? overrideAiMoves : aiMovesLeft;
    const resolvedLogs = overrideLogs !== undefined ? overrideLogs : logs;
    const resolvedPonto = overrideCurrentPonto !== undefined ? overrideCurrentPonto : currentPonto;
    const resolvedAttackerIdx = overrideCurrentAttackIdx !== undefined ? overrideCurrentAttackIdx : currentAttackerIdx;
    const resolvedSpecialP = overrideActiveSpecialPlayer !== undefined ? overrideActiveSpecialPlayer : playerActiveSpecial;
    const resolvedSpecialA = overrideActiveSpecialAi !== undefined ? overrideActiveSpecialAi : aiActiveSpecial;
    const resolvedDrawn = overrideCardsDrawn !== undefined ? overrideCardsDrawn : cardsDrawnThisTurn;
    const resolvedTurnCount = overrideTurnCount !== undefined ? overrideTurnCount : turnCount;
    const resolvedDefenseMoves = overrideDefenseMoves !== undefined ? overrideDefenseMoves : defenseMovesLeft;
    const resolvedPlayerDeck = overridePlayerDeck !== undefined ? overridePlayerDeck : playerDeck;
    const resolvedSpecialDeck = overrideSpecialDeck !== undefined ? overrideSpecialDeck : specialDeck;
    const resolvedPontoDeck = overridePontoDeck !== undefined ? overridePontoDeck : pontoDeck;
    const resolvedAttackerRole = overrideAttackerRole !== undefined ? overrideAttackerRole : attackerRole;

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

    // Invert phase if Opponent is uploading
    let canonicalPhase = resolvedPhase;
    if (resolvedRole === "opponent") {
      if (resolvedPhase === "player_turn") canonicalPhase = "ai_turn";
      else if (resolvedPhase === "ai_turn") canonicalPhase = "player_turn";
      else if (resolvedPhase === "attacking") canonicalPhase = "ai_attacking";
      else if (resolvedPhase === "ai_attacking") canonicalPhase = "attacking";
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
      current_ponto: resolvedPonto,
      current_attacker_idx: resolvedAttackerIdx,
      active_specials_host: host_special,
      active_specials_opponent: opponent_special,
      cards_drawn: resolvedDrawn,
      turn_count: resolvedTurnCount,
      defense_moves_left: resolvedDefenseMoves,
      player_deck: resolvedPlayerDeck,
      special_deck: resolvedSpecialDeck,
      ponto_deck: resolvedPontoDeck,
      attacker_role: resolvedAttackerRole,
      last_updated_by: resolvedRole
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
  const syncMultiplayerIfActive = () => {
    if (isMultiplayer) {
      setTimeout(() => {
        syncToSupabaseInstance();
      }, 50);
    }
  };

  // Countdown Timer ticking
  useEffect(() => {
    if (phase === "menu" || phase === "game_over") return;

    const timer = setInterval(() => {
      setMatchTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          SoundEffects.playWhistle();
          setPhase("game_over");
          
          // Determine the winner based on goals
          if (playerScore > aiScore) {
            const victoryMsg = `⏰ انتهى وقت المباراة الرسمي! تكتيكات الكابتن ${coachName} حسمت النصر التاريخي بالنتيجة ${playerScore} - ${aiScore}! ⚽🏆`;
            setLogs(prevLogs => [
              { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), text: victoryMsg, type: "success" },
              ...prevLogs
            ]);
          } else if (aiScore > playerScore) {
            const lossMsg = `⏰ انتهى وقت المباراة الرسمي! للأسف المدرب المنافس ${aiCoachName} حقق الفوز تكتيكياً بنتيجة ${aiScore} - ${playerScore}.`;
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
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, playerScore, aiScore, coachName, aiCoachName]);

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

      if (hostConfirm && oppConfirm && phase === "warmup") {
        const nextPhase = isMeHost ? "player_turn" : "ai_turn";
        setPhase(nextPhase);
        setCardsDrawnThisTurn(0);
        setPlayerMovesLeft(isMeHost ? 3 : 0);
        setAiMovesLeft(isMeHost ? 0 : 3);
      }

      const gs = updatedRoom.game_state;
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
      setPlayerSlots(my_slots || []);
      setAiSlots(enemy_slots || []);
      setPlayerHand(my_hand || []);
      setAiHand(enemy_hand || []);
      setPlayerScore(my_score !== undefined ? my_score : 0);
      setAiScore(enemy_score !== undefined ? enemy_score : 0);
      setPlayerMovesLeft(my_moves !== undefined ? my_moves : 3);
      setAiMovesLeft(enemy_moves !== undefined ? enemy_moves : 3);
      setLogs(gs.logs || []);
      setCurrentPonto(gs.current_ponto);
      setCurrentAttackerIdx(gs.current_attacker_idx);
      setPlayerActiveSpecial(my_special || []);
      setAiActiveSpecial(enemy_special || []);
      setCardsDrawnThisTurn(gs.cards_drawn !== undefined ? gs.cards_drawn : 0);
      setTurnCount(gs.turn_count !== undefined ? gs.turn_count : 1);
      setDefenseMovesLeft(gs.defense_moves_left !== undefined ? gs.defense_moves_left : 3);
      setPlayerDeck(gs.player_deck || []);
      setSpecialDeck(gs.special_deck || []);
      setPontoDeck(gs.ponto_deck || []);
      setAttackerRole(gs.attacker_role || null);

      setTimeout(() => {
        isReceivingUpdate.current = false;
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [isMultiplayer, currentRoomId, multiplayerRole, phase]);

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

    if (isHost) {
      // Host generates and seeds the unified map decks
      const pDeck = generatePlayerDeck();
      const sDeck = generateSpecialDeck();
      const poDeck = generatePontoDeck();

      const prepareInitialPitchSlots = (deck: PlayerCard[]) => {
        const slots: PlayerCard[] = [];
        let remDeck = [...deck];
        for (let i = 0; i < 5; i++) {
          const nonLegendIdx = remDeck.findIndex((c) => !c.isLegend);
          if (nonLegendIdx !== -1) {
            slots.push(remDeck[nonLegendIdx]);
            remDeck.splice(nonLegendIdx, 1);
          }
        }
        return { slots, remainingDeck: remDeck };
      };

      const playerPitchInit = prepareInitialPitchSlots(pDeck);
      const aiPitchInit = prepareInitialPitchSlots(playerPitchInit.remainingDeck);

      let activeDeck = aiPitchInit.remainingDeck;

      const drawHand = (pDeckRef: PlayerCard[], sDeckRef: SpecialCard[]) => {
        const pHand = pDeckRef.slice(0, 2);
        const sHand = sDeckRef.slice(0, 3);
        return {
          hand: [...pHand, ...sHand],
          remP: pDeckRef.slice(2),
          remS: sDeckRef.slice(3)
        };
      };

      const playerHandData = drawHand(activeDeck, sDeck);
      const aiHandData = drawHand(playerHandData.remP, playerHandData.remS);

      const initialPlayerSlots = playerPitchInit.slots.map((card) => ({ card, isRevealed: false }));
      const initialAiSlots = aiPitchInit.slots.map((card) => ({ card, isRevealed: false }));
      const initialPlayerHand = playerHandData.hand;
      const initialAiHand = aiHandData.hand;
      const finalPlayerDeck = aiHandData.remP;
      const finalSpecialDeck = aiHandData.remS;

      setPlayerSlots(initialPlayerSlots);
      setAiSlots(initialAiSlots);
      setPlayerHand(initialPlayerHand);
      setAiHand(initialAiHand);
      setPlayerDeck(finalPlayerDeck);
      setSpecialDeck(finalSpecialDeck);
      setPontoDeck(poDeck);

      setPlayerScore(0);
      setAiScore(0);
      setTurnCount(1);
      setCardsDrawnThisTurn(0);
      setPlayerMovesLeft(3);

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
        finalSpecialDeck,
        poDeck
      );
    } else {
      // Opponent is waiting for host to sync
      setPhase("warmup");
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

  // Add a standard log helper
  const addLog = (text: string, type: ActionLog["type"] = "neutral") => {
    const newLog: ActionLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: getFormattedTime(),
      text,
      type
    };
    setLogs((prev) => [...prev, newLog]);
  };

  // KICK START GAME FROM MENU
  const handleStartGame = (name: string, vibe: string, diff: "normal" | "tactical" | "legend", matchDuration: number = 180) => {
    setCoachName(name);
    setTeamVibe(vibe);
    setDifficulty(diff);
    setMatchTime(matchDuration);
    setInitialMatchTime(matchDuration);
    setIsHandExpanded(false);

    // Initial decks setup
    const pDeck = generatePlayerDeck();
    const sDeck = generateSpecialDeck();
    const poDeck = generatePontoDeck();

    // 1. "يسحب كل مدرب 5 كروت لاعبين ويضعهم أمامه في الملعب مقلوبين"
    // "إذا كان من ضمن هؤلاء الخمسة كارت أسطورة، يجب أن يتم إرجاعه للمجموعة وسحب كارت بديل مكانه"
    const prepareInitialPitchSlots = (deck: PlayerCard[]) => {
      const slots: PlayerCard[] = [];
      let remDeck = [...deck];
      
      for (let i = 0; i < 5; i++) {
        // Draw first non-legend player
        const nonLegendIdx = remDeck.findIndex((c) => !c.isLegend);
        if (nonLegendIdx !== -1) {
          slots.push(remDeck[nonLegendIdx]);
          remDeck.splice(nonLegendIdx, 1);
        }
      }
      return { slots, remainingDeck: remDeck };
    };

    const aiPitchInit = prepareInitialPitchSlots(pDeck);

    let activeDeck = aiPitchInit.remainingDeck;

    // 2. "بعد ذلك، يسحب كل مدرب كارتين من نوع لاعبين و3 كروت خاصة ويضعهم في يده"
    const drawHand = (pDeckRef: PlayerCard[], sDeckRef: SpecialCard[]) => {
      const pHand = pDeckRef.slice(0, 2);
      const sHand = sDeckRef.slice(0, 3);
      const hand: Card[] = [...pHand, ...sHand];
      return {
        hand,
        remP: pDeckRef.slice(2),
        remS: sDeckRef.slice(3)
      };
    };

    const playerHandData = drawHand(activeDeck, sDeck);
    const aiHandData = drawHand(playerHandData.remP, playerHandData.remS);

    // Empty slots initially so the player draws manually (Requirement 6)
    setPlayerSlots(Array(5).fill(null).map(() => ({ card: null, isRevealed: false })));
    setAiSlots(aiPitchInit.slots.map((card) => ({ card, isRevealed: false })));

    setPlayerHand(playerHandData.hand);
    setAiHand(aiHandData.hand);

    setPlayerDeck(aiHandData.remP);
    setSpecialDeck(aiHandData.remS);
    setPontoDeck(poDeck);

    // Statistics & Scores reset
    setPlayerScore(0);
    setAiScore(0);
    setTurnCount(1);
    setCardsDrawnThisTurn(0);
    setPlayerMovesLeft(3);

    // Switch to Warmup
    setPhase("warmup");
    setLogs([]);
    addLog(`صافرة البداية! دخل المدرب ${name} بهوية ${vibe} لملاقاة خصمه ذو الصعوبة [${diff === "normal" ? "ناشئ" : diff === "tactical" ? "محترف" : "أسطوري"}].`, "success");
    addLog("مرحلة التسخين: اسحب 5 لاعبين لترتيب خطة الملعب الخمسة أولاً! انقر على باقة اللاعبين المضيئة وسط الملعب لسحب الكروت.", "info");
    addLog("يمكنك بعد سحب اللاعبين تبديل المراكز وإجراء مبادلة مجانية مع يدك لتجهيز خطتك التكتيكية الضاربة.", "neutral");
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
      addLog(`[التسخين] تم استدعاء ${currentPitchItem.card.name} إلى اليد، ودفع ${handCard.name} للملعب مقلوباً.`, "neutral");
    } else {
      // Slot empty
      newHand.splice(handCardIdx, 1);
      newSlots[pitchSlotIdx] = { card: handCard as PlayerCard, isRevealed: false };
      addLog(`[التسخين] تم تنزيل ${handCard.name} في المركز الخالي مقلوباً.`, "neutral");
    }

    setPlayerHand(newHand);
    setPlayerSlots(newSlots);
    setSelectedHandCardId(null);
    SoundEffects.playCardDraw();
    syncMultiplayerIfActive();
  };

  // CONFIRM WARMUP LINEUP
  const handleConfirmLineup = () => {
    // Audit check: must have all 5 pitch slots filled to begin the match!
    const emptySlots = playerSlots.some((s) => s.card === null);
    if (emptySlots) {
      addLog("تحذير تكتيكي: يجب عليك تعبئة المراكز الخمسة بالملعب أولاً لبدء المباراة!", "danger");
      return;
    }

    if (isMultiplayer) {
      const isHost = multiplayerRole === "host";
      setMyConfirmed(true);

      const bothConfirmed = otherConfirmed;

      if (bothConfirmed) {
        const nextPhase = isHost ? "player_turn" : "ai_turn";
        setPhase(nextPhase as any);
        setCardsDrawnThisTurn(0);
        setPlayerMovesLeft(isHost ? 3 : 0);
        setAiMovesLeft(isHost ? 0 : 3);
        
        const startLogs = [
          ...logs,
          {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: "تأكت تكتيكات كلا الفريقين بالكامل! صافرة ركلة البداية! المباراة تنطلق الآن أونلاين ⚽",
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
            null, null, [], [], 0, 1, 3
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
        
        // Sync my confirmation
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
      setPhase("player_turn");
      setCardsDrawnThisTurn(0);
      setPlayerMovesLeft(3);
      setIsHandExpanded(true);
      addLog("صافرة ركلة البداية! تم إنهاء مرحلة التسخين واللوحة جاهزة. دورك الآن كمدرب مهاجم.", "success");
      addLog("يمكنك اللعب من يدك مباشرة أو سحب كروت لدعم مهاراتك بشكل مرن.", "info");
    }
  };

  // DRAW CARDS ACTION IN PLAYER TURN
  const handleDrawCard = (deckType: "player" | "special") => {
    if (phase === "warmup") {
      if (deckType === "player") {
        // Find first empty slot
        const emptyIdx = playerSlots.findIndex((s) => s.card === null);
        if (emptyIdx === -1) {
          addLog("مرحلة التسخين: لقد قمت بسحب وتجهيز 5 كروت لاعبين بالفعل في الملعب! يمكنك الضغط على تأكيد الخطة والبدء بالعب.", "warning");
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
        addLog(`[التسخين] لقد سحبت اللاعب مقلوباً ووضعته بيدك بمركز الملعب [ ${emptyIdx + 1} ]. (سحبت ${drawnCount}/5)`, "success");
        SoundEffects.playCardDraw();
        syncMultiplayerIfActive();
      } else {
        addLog("مرحلة التسخين: اسحب كروت اللاعبين فقط (5 كروت) لتشكيل خطتك مقلوبة بالمركز المناسب!", "warning");
      }
      return;
    }

    if (cardsDrawnThisTurn >= 2) return;

    if (deckType === "player") {
      if (playerDeck.length === 0) {
        addLog("باقة اللاعبين فارغة تماماً!", "warning");
        return;
      }
      const newCard = playerDeck[0];
      setPlayerHand((prev) => [...prev, newCard]);
      setPlayerDeck((prev) => prev.slice(1));
      addLog(`لقد سحبت كارت اللاعب الجديد [ ${newCard.name} ] إلى يدك.`, "info");
    } else {
      if (specialDeck.length === 0) {
        addLog("باقة الأوراق التكتيكية الخاصة فارغة تماماً!", "warning");
        return;
      }
      const newCard = specialDeck[0];
      setPlayerHand((prev) => [...prev, newCard]);
      setSpecialDeck((prev) => prev.slice(1));
      addLog(`لقد سحبت كارت تكتيك إضافي [ ${newCard.name} ] ليدك.`, "info");
    }

    const nextDrawnCount = cardsDrawnThisTurn + 1;
    setCardsDrawnThisTurn(nextDrawnCount);
    SoundEffects.playCardDraw();

    if (nextDrawnCount === 2) {
      addLog("اكتمل سحب كارتي البداية! لديك الآن 3 حركات جاهزة للتنفيذ في هذا الدور.", "success");
    }
    syncMultiplayerIfActive();
  };

  // HANDLE CARD CLICK SELECTIONS
  const handleSelectHandCard = (id: string) => {
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
      
      // If playing Special Card defensively during AI attack
      if (phase === "ai_attacking" && card.type === "special") {
        // Let it select easily
        addLog(`تم سحب ${card.name}، اضغط تفعيل في لوحة التعليمات لتشغيله في الدفاع!`, "info");
      }
    }
  };

  // MULTIPLE DESTINATIONS FOR BURNING CARD SELECTION (LEGEND EXCLUSIVES)
  const toggleBurningCard = (cardId: string) => {
    if (burningCardIds.includes(cardId)) {
      setBurningCardIds((prev) => prev.filter((id) => id !== cardId));
    } else {
      if (burningCardIds.length >= 2) {
        // Shift oldest
        setBurningCardIds((prev) => [prev[1], cardId]);
      } else {
        setBurningCardIds((prev) => [...prev, cardId]);
      }
    }
    SoundEffects.playCardDraw();
  };

  // COMPUTE OFFENSIVE POWER
  const calculateTotalAttack = (isPlayer: boolean, attackerIdx: number, activePonto: PontoCard | null, activeSpecials: SpecialCard[]) => {
    const slots = isPlayer ? playerSlots : aiSlots;
    const attacker = slots[attackerIdx]?.card;
    if (!attacker) return 0;

    let base = attacker.attack;
    
    // Add ponto points
    if (activePonto) {
      base += activePonto.value;
    }

    // Add any potential extra revealed attackers on the pitch 
    slots.forEach((slot, idx) => {
      if (idx !== attackerIdx && slot.card && slot.isRevealed && slot.card.role === "attacker") {
        base += slot.card.attack;
      }
    });

    // Add Specials
    activeSpecials.forEach((spec) => {
      if (spec.effect === "counter_attack") {
        base += 4;
      }
      if (spec.effect === "fans") {
        base += 3;
      }
      if (spec.effect === "wet_pitch") {
        // Reduces general attack if defender targets this, but we apply it on total.
        // Let's specify that wet_pitch reduces attacker score by 4 if played by defender
      }
    });

    // Check if defender played wet pitch or offside
    const defenseSpecials = isPlayer ? aiActiveSpecial : playerActiveSpecial;
    defenseSpecials.forEach((spec) => {
      if (spec.effect === "wet_pitch") {
        base -= 4;
      }
      if (spec.effect === "offside") {
        // "يلغي نقاط أقوى مهاجم للخصم تماماً" -> We deduct the core attacker's power!
        base -= attacker.attack;
      }
    });

    return Math.max(0, base);
  };

  // COMPUTE DEFENSIVE POWER
  const calculateTotalDefense = (isPlayer: boolean, activeSpecials: SpecialCard[]) => {
    // If Player is defending, sum revealed player defense values
    const slots = isPlayer ? playerSlots : aiSlots;
    let base = 0;

    slots.forEach((s) => {
      if (s.card && s.isRevealed) {
        // Goalkeepers & defenders provide defense
        if (s.card.role === "goalkeeper" || s.card.role === "defender" || s.card.role === "midfielder") {
          base += s.card.defense;
        }
      }
    });

    // Add Special defense strategies
    activeSpecials.forEach((spec) => {
      if (spec.effect === "park_the_bus") {
        base += 6;
      }
      if (spec.effect === "fans") {
        base += 3;
      }
    });

    return base;
  };

  // CANCEL CARD SELECTION
  const handleCancelSelection = () => {
    setSelectedHandCardId(null);
    setBurningCardIds([]);
  };

  // PLAY TACTICAL SPECIAL CARD
  const handlePlaySpecialCard = (id: string) => {
    const isPlayerActivePhase = phase === "player_turn" || phase === "warmup" || phase === "attacking" || phase === "ai_attacking";
    if (!isPlayerActivePhase) return;
    
    // If not under defense, and moves left is zero, check
    if (phase === "player_turn" && playerMovesLeft < 1) {
      addLog("لا تمتلك حركات كافية لتفعيل التكتيك الخاص!", "danger");
      return;
    }

    const card = playerHand.find((c) => c.id === id) as SpecialCard;
    if (!card) return;

    // Remove from hand
    setPlayerHand((prev) => prev.filter((c) => c.id !== id));

    // Apply special actions
    if (card.effect === "world_cup") {
      // Draws 2 extra cards instantly! Doesn't cost extra move
      addLog(`🏆 تم تفعيل ${card.name}! تسحب ورقتين فوراً من الباقات.`, "success");
      // Pick first player and first special if available
      let added: Card[] = [];
      let remP = [...playerDeck];
      let remS = [...specialDeck];
      if (remP.length > 0) {
        added.push(remP[0]);
        remP.splice(0, 1);
      }
      if (remS.length > 0) {
        added.push(remS[0]);
        remS.splice(0, 1);
      }
      setPlayerHand((prev) => [...prev, ...added]);
      setPlayerDeck(remP);
      setSpecialDeck(remS);
      SoundEffects.playGoalCelebration();
    } else {
      // Append to active specials list
      if (phase === "ai_attacking") {
        setPlayerActiveSpecial((prev) => [...prev, card]);
        addLog(`🛡️ تكتيك دفاعي: قمت بلعب [ ${card.name} ] لعرقلة هجمة الخصم!`, "success");
      } else {
        setPlayerActiveSpecial((prev) => [...prev, card]);
        setPlayerMovesLeft((prev) => prev - 1);
        addLog(`⚔️ تكتيك هجومي: قمت بلعب [ ${card.name} ] لغزو مرمى المنافس!`, "success");
      }
    }

    setSelectedHandCardId(null);
    SoundEffects.playCardDraw();
    syncMultiplayerIfActive();
  };

  // CO-ORDINATE CLICK ON PITCH SLOT
  const handleSelectPitchSlot = (idx: number) => {
    // 1. Handling WARMUP phase (zero cost swaps)
    if (phase === "warmup") {
      if (selectedHandCardId) {
        const handIdx = playerHand.findIndex((c) => c.id === selectedHandCardId);
        if (handIdx !== -1) {
          performWarmupSwap(handIdx, idx);
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
          if (burningCardIds.length < 2) {
            addLog("هذا اللاعب أسطورة أسطورية! يرجى تحديد كارتين من يدك لحرقهما (النقر فوقهما أولاً) لتتمكن من تنزيله.", "warning");
            return;
          }

          // Execute Legend placement
          // 1. Remove the 2 burnt cards
          setPlayerHand((prev) => prev.filter((c) => !burningCardIds.includes(c.id) && c.id !== selectedHandCardId));

          // 2. Place Legend, resolving swap rules on replaced player
          const targetSlot = playerSlots[idx];
          const newSlots = [...playerSlots];
          newSlots[idx] = { card: playerCard, isRevealed: false };
          setPlayerSlots(newSlots);

          if (targetSlot.card) {
            if (targetSlot.isRevealed) {
              addLog(`🔥 التضحية الفائقة: تم حرق ورقتين وعزل الأسطورة المكشوف ${targetSlot.card.name} خارج الماتش، ليدخل مكانه الأسطورة الجديد [ ${playerCard.name} ] مقلوباً.`, "success");
            } else {
              // Face down, returns to hand
              setPlayerHand((prev) => [...prev, targetSlot.card!]);
              addLog(`🔥 التضحية الفائقة: تم حرق ورقتين واحتفاظ بـ ${targetSlot.card.name} في يدك، ليدخل مكانه الأسطورة الجديد [ ${playerCard.name} ] مقلوباً.`, "success");
            }
          } else {
            addLog(`🔥 تم إنزال الأسطورة الذهبي [ ${playerCard.name} ] في هذا المركز مقلوباً بنجاح!`, "success");
          }

          setPlayerMovesLeft((prev) => prev - 1);
          handleCancelSelection();
          SoundEffects.playWhistle();
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
            addLog(`استبدال حاسم: تم طرد اللاعب المكشوف [ ${currentPitchItem.card.name} ] خارج اللعب بالكامل، ودخل مكانه [ ${playerCard.name} ] مقلوباً.`, "warning");
          } else {
            // "ترجعه ليدك وتضع الجديد مقلوباً"
            setPlayerHand((prev) => [...prev, currentPitchItem.card!]);
            addLog(`مبادلة جيدة: استرجعت اللاعب المقلوب [ ${currentPitchItem.card.name} ] إلى يدك، ونزلت مكانة [ ${playerCard.name} ] مقلوباً.`, "success");
          }
        } else {
          addLog(`تنزيل صامت: قمت بوضع اللاعب [ ${playerCard.name} ] في المركز الخالي لتعزيز كتيبتك.`, "info");
        }

        setPlayerMovesLeft((prev) => prev - 1);
        setSelectedHandCardId(null);
        SoundEffects.playCardDraw();
        syncMultiplayerIfActive();
        return;
      }

      // No card selected in hand -> Clicking a slot is for selecting target striker to declare an attack!
      const clickedSlot = playerSlots[idx];
      if (clickedSlot.card && !clickedSlot.isRevealed) {
        // Candidate selection for attack
        setSelectedPitchSlotIdx(idx);
        addLog(`لقد وقع اختيارك على المهاجم المخفي في هذا المركز. اضغط الآن على زر "إعلان هجوم تكتيكي" في لوحة الأوامر لضرب الخصم.`, "info");
      }
    }

    // 3. Handling Defensive reveals during AI main Attacks (Player defends)
    if (phase === "ai_attacking") {
      if (defenseMovesLeft < 1) {
        addLog("تنبيه الحارس: استهلكت حركات الدفاع الثلاث بالكامل لحماية مرماك!", "warning");
        return;
      }

      const clickedSlot = playerSlots[idx];
      if (clickedSlot.card && !clickedSlot.isRevealed) {
        // Turn Face Up to help defense
        const newSlots = [...playerSlots];
        newSlots[idx] = { ...clickedSlot, isRevealed: true };
        setPlayerSlots(newSlots);
        setDefenseMovesLeft((prev) => prev - 1);
        addLog(`🛡️ رد دفاعي: قمت بكشف [ ${clickedSlot.card.name} ] لعرقلة الهجوم! دفاع محلي: +${clickedSlot.card.defense} نقاط.`, "success");
        SoundEffects.playCardDraw();
      }
    }

    // 4. Handling Extra revealing actions during active attacks (Player attacks)
    if (phase === "attacking") {
      if (playerMovesLeft < 1) {
        addLog("لا تمتلك حركات متبقية لإجراء كشوفات إضافية!", "warning");
        return;
      }

      const clickedSlot = playerSlots[idx];
      if (clickedSlot.card && !clickedSlot.isRevealed) {
        // "إذا تبقت لك حركة إضافية كمهاجم، يمكنك كشف مهاجم آخر في ملعبك لزيادة قوتك"
        const newSlots = [...playerSlots];
        newSlots[idx] = { ...clickedSlot, isRevealed: true };
        setPlayerSlots(newSlots);
        setPlayerMovesLeft((prev) => prev - 1);
        addLog(`⚔️ كشف هجومي إضافي: كشفت [ ${clickedSlot.card.name} ] ليدعم الهجمة بـ +${clickedSlot.card.attack} نقاط!`, "success");
        SoundEffects.playCardDraw();
      }
    }
  };

  // CHECK PITCH SLOT SELECTABILITY STATE
  const isSlotSelectable = (idx: number, isAi: boolean): boolean => {
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
      // Player defends, can reveal their owned slots
      if (isAi) return false;
      const slot = playerSlots[idx];
      return slot.card !== null && !slot.isRevealed && defenseMovesLeft > 0;
    }

    if (phase === "attacking") {
      // Can reveal extra player cards on pitch if there's moves left
      if (isAi) return false;
      const slot = playerSlots[idx];
      return slot.card !== null && !slot.isRevealed && playerMovesLeft > 0;
    }

    return false;
  };

  // DECLARE PLAYER ATTACK
  const handleDeclareAttack = () => {
    if (playerMovesLeft < 2) {
      addLog("تحذير تكتيكي: يحتاج إطلاق الهجوم إلى حركتين (2) شاغرتين للدعم والتحكيم!", "danger");
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

    // 1. Flip attacker Face Up
    const newSlots = [...playerSlots];
    newSlots[targetIdx] = { ...newSlots[targetIdx], isRevealed: true };
    setPlayerSlots(newSlots);

    // 2. Draw Ponto card
    if (pontoDeck.length === 0) {
      setPontoDeck(generatePontoDeck());
    }
    const drawnPonto = pontoDeck[0];
    setCurrentPonto(drawnPonto);
    setPontoDeck((prev) => prev.slice(1));

    // Deduct 2 moves
    setPlayerMovesLeft((prev) => prev - 2);
    setPhase("attacking");

    addLog(`📢 صافرة الهجوم! كشفت رأس الحربة [ ${attacker.name} ] هجومه: ${attacker.attack}.`, "warning");
    addLog(`🔥 قمت بسحب كارت معزز المرتدة عشوائي [ ${drawnPonto.text} ] ليمنحك +${drawnPonto.value} نقاط هجوم ممتازة!`, "success");
    SoundEffects.playWhistle();

    if (isMultiplayer) {
      setAttackerRole(multiplayerRole);
      // Let's build updated logs representation
      const updatedLogs = [
        ...logs,
        {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `📢 صافرة الهجوم! كشفت رأس الحربة [ ${attacker.name} ] هجومه: ${attacker.attack}.`,
          type: "warning" as const
        },
        {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `🔥 قمت بسحب كارت معزز المرتدة عشوائي [ ${drawnPonto.text} ] ليمنحك +${drawnPonto.value} نقاط هجوم ممتازة!`,
          type: "success" as const
        }
      ];
      setLogs(updatedLogs);

      setTimeout(() => {
        syncToSupabaseInstance(
          "attacking",
          newSlots,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          playerMovesLeft - 2,
          undefined,
          updatedLogs,
          drawnPonto,
          targetIdx,
          undefined,
          undefined,
          undefined,
          undefined,
          3, // Provide 3 defense moves for the opponent to react!
          undefined,
          undefined,
          pontoDeck.slice(1),
          multiplayerRole
        );
      }, 50);
    } else {
      // Trigger AI Defense reaction instantly
      triggerAIDefenseReaction(targetIdx, drawnPonto);
    }
  };

  // AI ACTIONS LOGIC (NPC TURNS CALCULATOR)
  const triggerAIDefenseReaction = (playerAttackerIdx: number, drawnPonto: PontoCard) => {
    // Calculates AI Defense responses (AI gets 3 moves as defender)
    addLog(`🤖 الخصم المدرب ${aiCoachName} يخطط لمواجهة تسديدتك ويحظى بـ 3 حركات صد دفاعية...`, "neutral");

    setTimeout(() => {
      let aiMoves = 3;
      const updatedAiSlots = [...aiSlots];
      let aiSpecialsPlayed: SpecialCard[] = [];

      // Determine if AI has useful defensive special cards in hand
      const defensiveSpecials = aiHand.filter(
        c => c.type === "special" && (c.effect === "park_the_bus" || c.effect === "offside" || c.effect === "wet_pitch" || c.effect === "fans")
      ) as SpecialCard[];

      if (defensiveSpecials.length > 0 && Math.random() > 0.4) {
        const spec = defensiveSpecials[0];
        // Play it!
        aiSpecialsPlayed.push(spec);
        setAiHand((prev) => prev.filter(c => c.id !== spec.id));
        aiMoves--;
        addLog(`🤖 الخصم يرمي ورقة تكتيكية خاصة: [ ${spec.name} ] للوقوف بوجه هجومك!`, "danger");
      }

      // Flip AI cards with high defense values to secure the score (Goalie and defenders preferred)
      const unrevealedSlotsIndices = aiSlots
        .map((s, idx) => ({ slot: s, idx }))
        .filter(item => item.slot.card !== null && !item.slot.isRevealed)
        .sort((a,b) => (b.slot.card?.defense || 0) - (a.slot.card?.defense || 0));

      while (aiMoves > 0 && unrevealedSlotsIndices.length > 0) {
        const target = unrevealedSlotsIndices.shift()!;
        updatedAiSlots[target.idx].isRevealed = true;
        aiMoves--;
        addLog(`🤖 الخصم تيقظ وكشف مدافعه الصامت [ ${target.slot.card?.name} ] ليدعم خط الظهر بـ +${target.slot.card?.defense} نقاط دفاع!`, "info");
      }

      setAiSlots(updatedAiSlots);
      setAiActiveSpecial(aiSpecialsPlayed);
      SoundEffects.playTackleBlock();
    }, 1200);
  };

  // MAIN RESOLUTION OF ACTIVE PLAYER ATTACK
  const handleResolveAttack = () => {
    if (currentAttackerIdx === null || !currentPonto) return;

    // Calculate total scores
    const finalAttack = calculateTotalAttack(true, currentAttackerIdx, currentPonto, playerActiveSpecial);
    const finalDefense = calculateTotalDefense(false, aiActiveSpecial);

    const isGoal = finalAttack > finalDefense;
    
    if (isGoal) {
      const newScore = playerScore + 1;
      setPlayerScore(newScore);
      SoundEffects.playGoalCelebration();
      setCelebrationMessage({
        title: "جــوووووول! هجمة مرتدة قاتلة! ⚽🔥",
        subtitle: `إجمالي هجومك (${finalAttack}) تجاوز بنجاح تكتلات دفاع الخصم (${finalDefense}) لتسجل هدفاً تكتيكياً مميزاً!`,
        isGoal: true
      });
      addLog(`⚽ جــوووووول خيالي! أحرز المهاجم هدفاً ثمنياً (مرتدة) لصالحك! النتيجة الآن: ${newScore} - ${aiScore}`, "success");
    } else {
      SoundEffects.playTackleBlock();
      setCelebrationMessage({
        title: "يا لها من فرصة ضائعة! التصدي للمحاولة 🧤🚫",
        subtitle: `تكتلات دفاع الخصم الحصين (${finalDefense}) تفوقت أو تساوت مع قواك الضاربة (${finalAttack}) ليفشل هجومك!`,
        isGoal: false
      });
      addLog(`🚫 تصدي أسطوري! نجح حامي مرماهم بقطع هجمتك الشرسة. النتيجة ما زالت: ${playerScore} - ${aiScore}`, "danger");
    }

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
    setCelebrationMessage(null);
    setSelectedPitchSlotIdx(null);
    setCurrentAttackerIdx(null);
    setCurrentPonto(null);
    setPlayerActiveSpecial([]);
    setAiActiveSpecial([]);

    // Check if score limit of 5 is attained to win!
    if (playerScore >= 5) {
      setPhase("game_over");
      addLog(`صافرة النهاية للماتش اللذيذ! الكابتن ${coachName} يحرز اللقب القاري بخمسة أهداف كاملة! تهانينا ومبارك! 🏆🎉`, "success");
      return;
    }
    if (aiScore >= 5) {
      setPhase("game_over");
      addLog(`عذراً يا كابتن! الخصم المدرب ${aiCoachName} تفوق بالحسابات السريعة وأحرز اللقب. حظاً أوفر المرة المقبلة.`, "danger");
      return;
    }

    if (isMultiplayer) {
      const isHost = multiplayerRole === "host";
      const nextTurnRole = attackerRole === "host" ? "opponent" : "host";
      const standsAsMe = nextTurnRole === multiplayerRole;

      const nextPhaseState = standsAsMe ? "player_turn" : "ai_turn";
      setPhase(nextPhaseState as any);

      const nextDrawn = 0;
      const nextMoves = standsAsMe ? 3 : 0;
      const nextAiMoves = standsAsMe ? 0 : 3;
      const nextTurnCount = turnCount + (standsAsMe ? 1 : 0);

      const nextLogs = [
        ...logs,
        {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: standsAsMe 
            ? "⚽ انتقل الدور والتحكم الفني لك الآن! قم بسحب كارتين لتنظيم عمليتك الهجومية!"
            : "⏳ تكتيك الخصم بدأ، يرجى الانتظار ريثما يستنفد المدرب خصمك حركاته التكتيكية.",
          type: standsAsMe ? ("success" as const) : ("neutral" as const)
        }
      ];

      setCardsDrawnThisTurn(nextDrawn);
      setPlayerMovesLeft(nextMoves);
      setAiMovesLeft(nextAiMoves);
      setLogs(nextLogs);
      setAttackerRole(null);

      setTimeout(() => {
        syncToSupabaseInstance(
          nextPhaseState as any,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          nextMoves,
          nextAiMoves,
          nextLogs,
          null, // Cleans currentPonto
          null, // Cleans currentAttackerIdx
          [], // Cleans playerActiveSpecial
          [], // Cleans aiActiveSpecial
          nextDrawn,
          nextTurnCount,
          3, // Cleans defense_moves_left
          undefined,
          undefined,
          undefined,
          null // Cleans attackerRole
        );
      }, 50);

      return;
    }

    // Switch turn
    if (phase === "resolution") {
      // If we just ended player actions/attack execution, immediately trigger AI Turn sequence
      handleAIPlayTurn();
    }
  };

  // END YOUR TURN MANUALLY
  const handleEndPlayerTurn = () => {
    setSelectedPitchSlotIdx(null);
    setSelectedHandCardId(null);
    setBurningCardIds([]);

    if (isMultiplayer) {
      const nextPhase = "ai_turn";
      setPhase(nextPhase as any);
      setCardsDrawnThisTurn(0);
      setPlayerMovesLeft(0);
      setAiMovesLeft(3);

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
          3
        );
      }, 50);
    } else {
      handleAIPlayTurn();
    }
  };

  // THE AI TURN STRATEGY ENGINE (PvE AI AUTOMATED RUNNER)
  const handleAIPlayTurn = () => {
    setPhase("ai_turn");
    addLog(`🏁 الآن ينتقل دور التوجيه واللعب للمدرب الخصم ${aiCoachName}.`, "info");

    setTimeout(() => {
      // AI Draws 2 cards
      let updatedAiDeck = [...playerDeck];
      let updatedAiSpecial = [...specialDeck];
      let newAiHand = [...aiHand];

      if (updatedAiDeck.length > 0) {
        newAiHand.push(updatedAiDeck[0]);
        updatedAiDeck = updatedAiDeck.slice(1);
      }
      if (updatedAiSpecial.length > 0) {
        newAiHand.push(updatedAiSpecial[0]);
        updatedAiSpecial = updatedAiSpecial.slice(1);
      }

      setPlayerDeck(updatedAiDeck);
      setSpecialDeck(updatedAiSpecial);
      setAiHand(newAiHand);
      addLog(`🤖 الخصم المدرب ${aiCoachName} يسحب كارتين مميزين ليده التكتيكية.`, "neutral");

      // AI Moves execution (has 3 moves)
      setTimeout(() => {
        let aiMoves = 3;
        const currentAiSlots = [...aiSlots];
        const newPlayerSlots = [...playerSlots];

        // 1. Check if AI can declare a fatal attack?
        // Requires 2 moves and any Face-Down player on AI's pitch with positive attack value
        const aiAttackSlotIdx = currentAiSlots.findIndex(s => s.card !== null && !s.isRevealed && s.card.attack > 1);

        if (aiMoves >= 2 && aiAttackSlotIdx !== -1) {
          const aiAttacker = currentAiSlots[aiAttackSlotIdx].card!;
          setCurrentAttackerIdx(aiAttackSlotIdx);

          // Reveal card
          currentAiSlots[aiAttackSlotIdx].isRevealed = true;
          setAiSlots(currentAiSlots);

          // Draw Ponto card
          if (pontoDeck.length === 0) {
            setPontoDeck(generatePontoDeck());
          }
          const drawnPonto = pontoDeck[0];
          setCurrentPonto(drawnPonto);
          setPontoDeck((prev) => prev.slice(1));

          aiMoves -= 2;
          setPhase("ai_attacking");
          setDefenseMovesLeft(3); // Player gets 3 defense moves!

          addLog(`⚠️ هجوم عدواني باغت! الخصم يكشف مهاجمه [ ${aiAttacker.name} ] هجوم: ${aiAttacker.attack}.`, "danger");
          addLog(`⚠️ الخصم سحب كارت معزز المرتدة عشوائي [ ${drawnPonto.text} ] بقوة +${drawnPonto.value}!`, "warning");
          SoundEffects.playWhistle();

          // Player has 3 defense moves, we pause here so the player can take defensive reactions
          return;
        }

        // 2. If it did not attack, AI will use its moves to swap weaker cards!
        // Swap low stats with strong cards from hand
        while (aiMoves > 0) {
          const lowSlotIdx = currentAiSlots.findIndex((s) => s.card === null || (s.card && s.card.attack < 6 && s.card.defense < 6));
          const strongHandIdx = newAiHand.findIndex((c) => c.type === "player" && (c as PlayerCard).attack >= 6);

          if (lowSlotIdx !== -1 && strongHandIdx !== -1) {
            const lowCard = currentAiSlots[lowSlotIdx].card;
            const strongCard = newAiHand[strongHandIdx] as PlayerCard;

            // Perform swap
            currentAiSlots[lowSlotIdx] = { card: strongCard, isRevealed: false };
            newAiHand.splice(strongHandIdx, 1);
            if (lowCard) {
              newAiHand.push(lowCard);
            }
            aiMoves--;
            addLog(`🤖 الخصم يقوم بمقاومة الضغط ويبدل لاعب خط الوسط لصالحه مقلوباً لتمويه خطتك.`, "neutral");
          } else {
            // End moves
            aiMoves = 0;
          }
        }

        setAiSlots(currentAiSlots);
        setAiHand(newAiHand);

        // Switch to player turn
        setPhase("player_turn");
        setCardsDrawnThisTurn(0);
        setPlayerMovesLeft(3);
        setIsHandExpanded(true);
        setTurnCount((prev) => prev + 1);
        addLog(`⚽ انتهى دور الخصم بلا إصابات لخطوطك. عدنا لدورك! حظا موفقا في الدور ${turnCount + 1}`, "success");
      }, 1200);

    }, 1200);
  };

  // PLAY CONFIRM DEFENSIVE ACTION RESULT
  const handleConfirmDefense = () => {
    // Player finishes defensive phase, calculate outcome of AI's attack on Player!
    if (currentAttackerIdx === null || !currentPonto) return;

    // AI Attacks, Player Defends
    const finalAttack = calculateTotalAttack(false, currentAttackerIdx, currentPonto, aiActiveSpecial);
    const finalDefense = calculateTotalDefense(true, playerActiveSpecial);

    const isGoal = finalAttack > finalDefense;
    const nextAiScore = isGoal ? aiScore + 1 : aiScore;
    const nextPlayerScore = playerScore;

    const newLogs = [...logs];

    if (isGoal) {
      setAiScore(nextAiScore);
      SoundEffects.playWhistle();
      setCelebrationMessage({
        title: "جـوووول للخصم! ⚽🥅",
        subtitle: `إجمالي تسديدات الخصم (${finalAttack}) شق طريقه بهدوء متجاوزاً خطوط صد دفاعك البالغ (${finalDefense})!`,
        isGoal: true
      });
      newLogs.push({
        id: Math.random().toString(),
        timestamp: getFormattedTime(),
        text: `⚽ هدف للخصم! المهاجم يخترق حرس مرمانا بنجاح. النتيجة الآن: ${playerScore} - ${nextAiScore}`,
        type: "danger" as const
      });
    } else {
      SoundEffects.playGoalCelebration();
      setCelebrationMessage({
        title: "إنقاذ بطولي من جدارك! 🧤🧱",
        subtitle: `نجحت تكتلاتك الدفاعية البسيطة والصلبة (${finalDefense}) بصورة مذهلة في تصفية خطورة غزو الخصم (${finalAttack})!`,
        isGoal: false
      });
      newLogs.push({
        id: Math.random().toString(),
        timestamp: getFormattedTime(),
        text: `🧱 تصدي رائع! خط دفاع اللوحة أحبط تسديدة الخصم وقواهم. النتيجة ما زالت: ${playerScore} - ${aiScore}`,
        type: "success" as const
      });
    }

    setLogs(newLogs);
    setPhase("resolution");

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
    setPhase("menu");
    setCoachName("");
    setTeamVibe("");
    setSelectedHandCardId(null);
    setBurningCardIds([]);
    setSelectedPitchSlotIdx(null);
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-[#050605] text-[#e0e0e0] font-sans p-4 relative overflow-x-hidden md:p-6 select-none">
      
      {/* Background glow effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP STATUS NAVIGATION BAR - Hidden during matches on small viewports to match scribbled layouts */}
        <header className={`${phase === "menu" ? "flex" : "hidden lg:flex"} flex-col sm:flex-row items-center justify-between bg-[#0c0d0c] p-3 px-4 rounded-xl border border-white/5 backdrop-blur-md gap-3 select-none`}>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setIsTutorialOpen(true);
                }}
                id="rules_button_header"
                className="px-3 py-1.5 bg-transparent hover:bg-white/5 text-white border border-white/10 rounded font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xs:inline">القوانين بالتفصيل</span>
                <span className="inline xs:hidden">🏆 القوانين</span>
              </button>
              <button
                onClick={handleResetGame}
                id="reset_game_header_button"
                className="p-1.5 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white rounded border border-white/10 transition-colors cursor-pointer flex items-center justify-center w-8 h-8"
                title="العودة لشاشة البداية"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              
              {/* Turn-based logging display toggle - Requirement 3 */}
              {phase !== "menu" && (
                <button
                  onClick={() => setShowCommentary(!showCommentary)}
                  className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                    showCommentary 
                      ? "bg-amber-600/20 border-amber-500/30 text-amber-305"
                      : "bg-transparent border-white/10 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span>التعليق 🎙️</span>
                  <span className="text-[9px] uppercase font-mono px-1 bg-black/30 rounded">
                    {showCommentary ? "ظاهر" : "مخفي"}
                  </span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 sm:hidden text-right">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xs font-black text-emerald-400 leading-none">
                مرتدة ©
              </h1>
            </div>
          </div>

          {/* New Interactive Mid Scoreboard - Requirement 4 */}
          {phase !== "menu" && (
            <div className="flex items-center justify-center gap-3 bg-black/40 border border-white/5 px-4 py-1.5 rounded-full shadow-inner w-full sm:w-auto">
              <div className="flex items-center gap-1 text-right">
                <span className="text-[10px] text-slate-400 font-bold hidden xs:inline max-w-[60px] truncate">
                  {coachName || "المدرب"}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                  {playerScore}
                </span>
              </div>
              
              <div className="text-[10px] text-slate-500 font-black font-sans">
                -
              </div>

              <div className="flex items-center gap-1 text-left">
                <span className="text-[10px] text-rose-450 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                  {aiScore}
                </span>
                <span className="text-[10px] text-slate-400 font-bold hidden xs:inline max-w-[60px] truncate">
                  الخصم
                </span>
              </div>

              <div className="border-r border-white/10 h-3 mx-1" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-amber-400 font-bold">
                  الدور {turnCount}
                </span>
                <span className="text-[9px] text-slate-300 bg-white/5 px-2 py-0.5 rounded">
                  حركاتك: {playerMovesLeft}
                </span>
              </div>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
              مرتدة © تكتيك كرة القدم
            </h1>
          </div>
        </header>

        {/* CONDITION-BASED ROUTING VIEWS */}
        {phase === "menu" ? (
          <div className="space-y-6">
            {/* Mode selection tabs */}
            <div className="flex justify-center" id="game_mode_tabs_container">
              <div className="bg-[#0c0d0c] border border-white/5 p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl max-w-lg w-full">
                
                {/* 1. Solo Mode Tab */}
                <button
                  onClick={() => {
                    SoundEffects.playCardDraw();
                    setMenuTab("solo");
                    setIsMultiplayer(false);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs md:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    menuTab === "solo"
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.15)] scale-[1.01]"
                      : "bg-transparent text-slate-400 border border-transparent hover:text-white"
                  }`}
                  id="tab_solo_mode"
                >
                  <span className="text-base">🤖</span>
                  <span>اللعب الفردي (سولو)</span>
                  <span className="text-[9px] font-normal opacity-65 md:block hidden">ضد ذكاء صناعة التكتيك</span>
                </button>

                {/* 2. Multiplayer Mode Tab */}
                <button
                  onClick={() => {
                    SoundEffects.playCardDraw();
                    setMenuTab("multi");
                    setIsMultiplayer(true);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs md:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    menuTab === "multi"
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.15)] scale-[1.01]"
                      : "bg-transparent text-slate-400 border border-transparent hover:text-white"
                  }`}
                  id="tab_multi_mode"
                >
                  <span className="text-base">🌐</span>
                  <span>تحدي أونلاين بمزامنة Supabase</span>
                  <span className="text-[9px] font-normal opacity-65 md:block hidden animate-pulse">مبارزة لاعب حقيقي مباشر</span>
                </button>

              </div>
            </div>

            {menuTab === "solo" ? (
              <WelcomeMenu onStartGame={handleStartGame} />
            ) : (
              <Multilobby onStartMultiplayerGame={handleStartMultiplayerGame} />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
            
            {/* LEFT / TOP COLUMN (Tactical Live Pitch & Commentary) */}
            <div className="lg:col-span-3 space-y-5">

              {/* Broadcasting-style Scoreboard and Live Match Clock Timer */}
              <TopScoreHeader
                playerCoachName={coachName}
                playerTeam={teamVibe}
                playerScore={playerScore}
                aiCoachName={aiCoachName}
                aiTeam={aiTeam}
                aiScore={aiScore}
                matchTime={matchTime}
                initialMatchTime={initialMatchTime}
                phase={phase}
                difficulty={difficulty}
              />

              {/* Tactical football pitch representation */}
              <TacticalPitch
                playerCoachName={coachName}
                playerTeam={teamVibe}
                playerScore={playerScore}
                playerSlots={playerSlots}
                aiCoachName={aiCoachName}
                aiTeam={aiTeam}
                aiScore={aiScore}
                aiSlots={aiSlots}
                selectedSlotIdx={selectedPitchSlotIdx}
                currentAttackerIdx={currentAttackerIdx}
                phase={phase}
                playerMovesLeft={playerMovesLeft}
                onSelectSlot={handleSelectPitchSlot}
                isSelectable={isSlotSelectable}
                playerDeckCount={playerDeck.length}
                specialDeckCount={specialDeck.length}
                cardsDrawnThisTurn={cardsDrawnThisTurn}
                onDrawCard={handleDrawCard}
                isHandExpanded={isHandExpanded}
                setIsHandExpanded={setIsHandExpanded}
                aiHandCount={aiHand.length}
                onInspectCard={setInspectedCard}
              />

               {/* Actions & Turns controller bar */}
              <ActionDashboard
                phase={phase}
                movesLeft={playerMovesLeft}
                playerCoachName={coachName}
                aiCoachName={aiCoachName}
                cardsDrawnThisTurn={cardsDrawnThisTurn}
                currentPonto={currentPonto}
                playerScore={playerScore}
                aiScore={aiScore}
                activeAttackerName={
                  currentAttackerIdx !== null
                    ? (phase === "attacking" 
                        ? playerSlots[currentAttackerIdx]?.card?.name 
                        : aiSlots[currentAttackerIdx]?.card?.name) || null
                    : null
                }
                attackPower={
                  phase === "attacking" 
                    ? calculateTotalAttack(true, currentAttackerIdx || 0, currentPonto, playerActiveSpecial)
                    : calculateTotalAttack(false, currentAttackerIdx || 0, currentPonto, aiActiveSpecial)
                }
                defensePower={
                  phase === "attacking"
                    ? calculateTotalDefense(false, aiActiveSpecial)
                    : calculateTotalDefense(true, playerActiveSpecial)
                }
                onConfirmLineup={handleConfirmLineup}
                onDeclareAttack={handleDeclareAttack}
                onEndTurn={handleEndPlayerTurn}
                onResolveAttack={handleResolveAttack}
                onConfirmDefense={handleConfirmDefense}
                onResetGame={handleResetGame}
              />

              {/* Hand cards display */}
              <CoachHand
                hand={playerHand}
                selectedCardId={selectedHandCardId}
                burningCardIds={burningCardIds}
                movesLeft={playerMovesLeft}
                phase={phase}
                playerDeckCount={playerDeck.length}
                specialDeckCount={specialDeck.length}
                cardsDrawnThisTurn={cardsDrawnThisTurn}
                isPlayerTurn={phase === "player_turn" || phase === "warmup"}
                isHandExpanded={isHandExpanded}
                setIsHandExpanded={setIsHandExpanded}
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

            {/* RIGHT COLUMN (Live commentary ticker, strategy logs) - Hidden on mobile screens to maintain zero vertical scroll */}
            <div className="hidden lg:block lg:col-span-1 space-y-6">
              
              {/* Toggleable Quick Tips sidebar (Requirement 2) */}
              <div className="bg-[#121412] border border-white/5 rounded-xl p-3 text-right">
                <button
                  onClick={() => setShowTips(!showTips)}
                  className="w-full text-right px-3 py-1.5 rounded bg-black/30 text-[10px] uppercase font-mono tracking-wider text-[#e0e0e0]/50 hover:text-white flex items-center justify-between transition-colors outline-none cursor-pointer"
                >
                  <span className="text-emerald-400 font-bold">{showTips ? "إغلاق الدليل ❌" : "عرض دليل اللعب السريع 💡"}</span>
                  <span>طريقة اللعب السريعة ⚡</span>
                </button>
                {showTips && (
                  <p className="text-xs text-[#e0e0e0]/70 mt-2 leading-relaxed border-t border-white/5 pt-2 animate-fadeIn">
                    1. اسحب كارتين بالبداية.
                    <br />
                    2. انقر على لاعب بيدك، ثم اضغط على موضع بملعبك لتنزيله.
                    <br />
                    3. الأسطورة يتطلب كارتين حرق باليد.
                    <br />
                    4. للهجوم، انقر لاعبك مقفل بالملعب ثم أعلن الهجوم !
                  </p>
                )}
              </div>

              {/* Conditional Commentary Ticker (Requirement 3) */}
              {showCommentary ? (
                <ActionTickerLog
                  logs={logs}
                  onClear={() => setLogs([])}
                />
              ) : (
                <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-center text-xs text-slate-500">
                  <p>التعليق المباشر للمباراة مخفي حالياً 🎙️</p>
                  <button
                    onClick={() => setShowCommentary(true)}
                    className="mt-2 text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    تفعيل وعرض البث الصوتي المباشر والتعليق
                  </button>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

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
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            id="celebration_cinematic_dialog"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 15 }}
              className="max-w-md w-full rounded-xl p-6 text-center border border-white/10 shadow-2xl relative overflow-hidden bg-[#0c0d0c] text-white"
            >
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
              <div className="relative inline-block mb-6 z-10">
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
                  className="text-5xl sm:text-6xl md:text-7xl block relative select-none cursor-pointer"
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

              <h3 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200">
                {celebrationMessage.title}
              </h3>

              <p className="mt-4 text-xs md:text-sm text-[#e0e0e0]/70 leading-relaxed max-w-sm mx-auto p-3 bg-black/40 rounded-xl border border-white/5">
                {celebrationMessage.subtitle}
              </p>

              <button
                onClick={handleCelebrationClick}
                id="acknowledge_celebration_button"
                className="relative overflow-hidden mt-6 px-10 py-3 bg-amber-600 hover:bg-amber-500 text-black font-extrabold rounded text-xs md:text-sm cursor-pointer transition-all duration-150 transform hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] border-none shadow-md"
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

    </div>
  );
}
