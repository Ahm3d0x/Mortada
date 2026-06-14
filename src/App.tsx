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
import GameCard from "./components/GameCard";
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
  const [aiDeck, setAiDeck] = useState<PlayerCard[]>([]);
  const [specialDeck, setSpecialDeck] = useState<SpecialCard[]>([]);
  const [pontoDeck, setPontoDeck] = useState<PontoCard[]>([]);
  const [legendPercentage, setLegendPercentage] = useState<number>(30);

  // Coaches pitch slots (exactly 5 slots)
  const [playerSlots, setPlayerSlots] = useState<{ card: PlayerCard | null; isRevealed: boolean; spent?: boolean; revealedInAttack?: boolean }[]>(
    Array(5).fill(null).map(() => ({ card: null, isRevealed: false }))
  );
  const [aiSlots, setAiSlots] = useState<{ card: PlayerCard | null; isRevealed: boolean; spent?: boolean; revealedInAttack?: boolean }[]>(
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
  const [isPlayerAttacker, setIsPlayerAttacker] = useState<boolean>(true);
  const [isAttackBlocked, setIsAttackBlocked] = useState<boolean>(false);
  const [hasScoredThisTurn, setHasScoredThisTurn] = useState<boolean>(false);

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
  const customLogContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customLogContainerRef.current) {
      customLogContainerRef.current.scrollTop = customLogContainerRef.current.scrollHeight;
    }
  }, [logs]);

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
    overrideAiDeck?: PlayerCard[],
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
    const resolvedAiDeck = overrideAiDeck !== undefined ? overrideAiDeck : aiDeck;
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
    const host_deck = resolvedRole === "host" ? resolvedPlayerDeck : resolvedAiDeck;
    const opponent_deck = resolvedRole === "host" ? resolvedAiDeck : resolvedPlayerDeck;

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
      host_player_deck: host_deck,
      opponent_player_deck: opponent_deck,
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

  // Automatic transfer turn on completion of draws and moves - Requirement 3
  useEffect(() => {
    if (phase !== "player_turn") return;

    // Both drawing quota (2 cards) or empty deck(s) AND move quota (0 moves left) must be completed
    const cannotDrawMore = cardsDrawnThisTurn >= 2 || (playerDeck.length === 0 && specialDeck.length === 0);
    const hasNoMoves = playerMovesLeft <= 0;

    if (hasNoMoves && cannotDrawMore) {
      const timer = setTimeout(() => {
        // Double check phase is still player_turn before auto-ending
        setPhase((currPhase) => {
          if (currPhase === "player_turn") {
            addLog("⚙️ انتقال تكتيكي تلقائي: انتهت حركاتك وسحباتك لهذا الدور، ينتقل التحكم للخصم!", "neutral");
            handleEndPlayerTurn();
          }
          return currPhase;
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [phase, playerMovesLeft, cardsDrawnThisTurn, playerDeck.length, specialDeck.length]);

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
      const my_deck = multiplayerRole === "host" ? (gs.host_player_deck || gs.player_deck) : gs.opponent_player_deck;
      const enemy_deck = multiplayerRole === "host" ? gs.opponent_player_deck : (gs.host_player_deck || gs.player_deck);

      setPlayerDeck(my_deck || []);
      setAiDeck(enemy_deck || []);
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
      const pDeck = generatePlayerDeck(legendPercentage);
      const pDeckOpponent = pDeck.map((c, idx) => ({ ...c, id: c.id + "_opponent" }));
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
        pDeckOpponent,
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
  const handleStartGame = (
    name: string,
    vibe: string,
    diff: "normal" | "tactical" | "legend",
    matchDuration: number = 180,
    customLegendPercentage: number = 30
  ) => {
    setCoachName(name);
    setTeamVibe(vibe);
    setDifficulty(diff);
    setMatchTime(matchDuration);
    setInitialMatchTime(matchDuration);
    setLegendPercentage(customLegendPercentage);
    setIsHandExpanded(false);

    // Initial decks setup
    const pDeck = generatePlayerDeck(customLegendPercentage);
    const aDeckInit = generatePlayerDeck(customLegendPercentage);
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

    const aiPitchInit = prepareInitialPitchSlots(aDeckInit);

    // Player slots start empty, requiring manual drawing of 5 covered cards
    setPlayerSlots([
      { card: null, isRevealed: false },
      { card: null, isRevealed: false },
      { card: null, isRevealed: false },
      { card: null, isRevealed: false },
      { card: null, isRevealed: false }
    ]);
    setAiSlots(aiPitchInit.slots.map((card) => ({ card, isRevealed: false })));

    setPlayerHand([]);
    setAiHand([]);

    setPlayerDeck(pDeck);
    setAiDeck(aiPitchInit.remainingDeck);
    setSpecialDeck(sDeck);
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
    addLog("مرحلة التسخين نشطة! الملعب فارغ حالياً، قم بسحب 5 لاعبين لتوزيع مراكزهم بالضغط على زر 'سحب لاعب' (سيكون للاعبون مقلوبون تكتيكياً)، ثم اضغط على زر 'بدء اللقاء' لتنطلق صافرة الحكم.", "info");
    addLog("حقيبة الكروت بيدك فارغة حالياً. بمجرد تأكيد الخطة وبدء اللقاء، يمكنك سحب كروت تكتيكية جديدة في أدوارك ليدك لدعم مهارات وهجوم فريقك.", "neutral");
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
        setPlayerSlots((prev) => prev.map((s) => ({ ...s, isRevealed: false })));
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
      setPlayerSlots((prev) => prev.map((s) => ({ ...s, isRevealed: false })));
      setPhase("player_turn");
      setCardsDrawnThisTurn(0);
      setPlayerMovesLeft(3);
      setHasScoredThisTurn(false);
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
    const attackerSlot = slots[attackerIdx];
    const attacker = attackerSlot?.card;
    if (!attacker) return 0;

    let base = 0;
    
    // Sum up all cards on the attacking side that were revealed during this specific attack
    slots.forEach((slot) => {
      if (slot.card && slot.isRevealed && slot.revealedInAttack) {
        base += slot.card.attack;
      }
    });
    
    // Add Ponto points
    if (activePonto) {
      base += activePonto.value;
    }

    // Add Specials
    activeSpecials.forEach((spec) => {
      if (spec.effect === "counter_attack") {
        base += 4;
      }
      if (spec.effect === "fans") {
        base += 3;
      }
    });

    // Check if defender played wet pitch or offside
    const defenseSpecials = isPlayer ? aiActiveSpecial : playerActiveSpecial;
    defenseSpecials.forEach((spec) => {
      if (spec.effect === "wet_pitch") {
        base -= 4;
      }
      if (spec.effect === "offside") {
        // "يلغي نقاط أقوى مهاجم للخصم تماماً" -> We deduct the largest single attack power revealed in this attack
        let maxAttStrength = 0;
        slots.forEach((s) => {
          if (s.card && s.isRevealed && s.revealedInAttack) {
            maxAttStrength = Math.max(maxAttStrength, s.card.attack);
          }
        });
        base -= maxAttStrength;
      }
    });

    return Math.max(0, base);
  };

  // COMPUTE DEFENSIVE POWER
  const calculateTotalDefense = (isPlayer: boolean, activeSpecials: SpecialCard[]) => {
    const slots = isPlayer ? playerSlots : aiSlots;
    let base = 0;

    // Sum up all defensive cards revealed during this specific attack sequence
    slots.forEach((s) => {
      if (s.card && s.isRevealed && s.revealedInAttack) {
        base += s.card.defense;
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
    if (phase === "warmup") {
      addLog("خطأ: لا يمكن تفعيل الكروت التكتيكية أثناء فترة الإحماء والتسخين!", "danger");
      return;
    }

    const isPlayerActivePhase = phase === "player_turn" || phase === "attacking" || phase === "ai_attacking";
    if (!isPlayerActivePhase) return;
    
    // Check moves left first
    if ((phase === "player_turn" || phase === "attacking") && playerMovesLeft < 1) {
      addLog("لا تمتلك حركات كافية لتفعيل التكتيك الخاص!", "danger");
      return;
    }
    if (phase === "ai_attacking" && defenseMovesLeft < 1) {
      addLog("تنبيه الدفاع: لا تمتلك حركات كافية لتفعيل التكتيك الخاص!", "danger");
      return;
    }

    // Enforce 3 reveals/activations limit per round (only during active attack/defense)
    if (phase === "attacking" || phase === "ai_attacking") {
      const playerPitchRevealsCount = playerSlots.filter(s => s.card && s.revealedInAttack).length;
      const playerSpecialsCount = playerActiveSpecial.length;
      if (playerPitchRevealsCount + playerSpecialsCount >= 3) {
        addLog("خطأ تكتيكي: لقد استهلكت الحد الأقصى المسموح به لكشف الورق وتفعيل التكتيكات (3 كروت كحد أقصى بالجولة)!", "danger");
        return;
      }
    }

    const card = playerHand.find((c) => c.id === id) as SpecialCard;
    if (!card) return;

    // Deduct move
    if (phase === "player_turn" || phase === "attacking") {
      setPlayerMovesLeft((prev) => prev - 1);
    } else if (phase === "ai_attacking") {
      setDefenseMovesLeft((prev) => prev - 1);
    }

    // Remove from hand
    setPlayerHand((prev) => prev.filter((c) => c.id !== id));

    // Apply special actions
    if (card.effect === "world_cup") {
      // Draws 2 extra cards instantly
      addLog(`🏆 تم تفعيل ${card.name}! استهلكت حركة واحدة وسحبت ورقتين فوراً من الباقات.`, "success");
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
        addLog(`🛡️ تكتيك دفاعي: قمت بلعب [ ${card.name} ] لعرقلة هجمة الخصم! (استهلكت حركة واحدة)`, "success");
      } else {
        setPlayerActiveSpecial((prev) => [...prev, card]);
        addLog(`⚔️ تكتيك هجومي: قمت بلعب [ ${card.name} ] لغزو مرمى المنافس! (استهلكت حركة واحدة)`, "success");
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
      const clickedSlot = playerSlots[idx];
      if (!clickedSlot.card) return;

      if (clickedSlot.isRevealed) {
        // Flipping back a revealed defender card
        if (clickedSlot.revealedInAttack) {
          const newSlots = [...playerSlots];
          newSlots[idx] = { ...clickedSlot, isRevealed: false, revealedInAttack: false };
          setPlayerSlots(newSlots);
          setDefenseMovesLeft((prev) => Math.min(3, prev + 1));
          addLog(`🔄 تراجع دفاعي: قمت بإعادة قلب اللاعب [ ${clickedSlot.card.name} ] مقلوباً واستعدت حركة دفاعية واحدة.`, "neutral");
          SoundEffects.playCardDraw();
        }
        return;
      }

      // Enforce 3 reveals/activations limit per round
      const playerPitchRevealsCount = playerSlots.filter(s => s.card && s.revealedInAttack).length;
      const playerSpecialsCount = playerActiveSpecial.length;
      if (playerPitchRevealsCount + playerSpecialsCount >= 3) {
        addLog("خطأ تكتيكي: لا يمكنك كشف وتفعيل أكثر من 3 كروت إجمالاً بالجولة الواحدة!", "danger");
        return;
      }

      if (defenseMovesLeft < 1) {
        addLog("تنبيه الحارس: استهلكت حركات الدفاع الثلاث بالكامل لحماية مرماك!", "warning");
        return;
      }

      // Turn Face Up to help defense
      const newSlots = [...playerSlots];
      newSlots[idx] = { ...clickedSlot, isRevealed: true, revealedInTurn: turnCount, revealedInAttack: true };
      setPlayerSlots(newSlots);
      setDefenseMovesLeft((prev) => prev - 1);
      addLog(`🛡️ رد دفاعي: قمت بكشف [ ${clickedSlot.card.name} ] لعرقلة الهجوم! دفاع محلي: +${clickedSlot.card.defense} نقاط.`, "success");
      SoundEffects.playCardDraw();
    }

    // 4. Handling Extra revealing actions during active attacks (Player attacks)
    if (phase === "attacking") {
      const clickedSlot = playerSlots[idx];
      if (!clickedSlot.card) return;

      if (clickedSlot.isRevealed) {
        // Flipping back an already revealed card during active attack
        if (clickedSlot.revealedInAttack) {
          if (idx === currentAttackerIdx) {
            // Cancel whole attack!
            const originalDeckPonto = currentPonto ? [currentPonto, ...pontoDeck] : pontoDeck;
            setPontoDeck(originalDeckPonto);
            setCurrentPonto(null);
            setCurrentAttackerIdx(null);
            setSelectedPitchSlotIdx(null);
            setPhase("player_turn");

            let refundMoves = 1; // 1 for primary attack declaration
            const revertedSlots = playerSlots.map((s, sIdx) => {
              if (s.revealedInAttack) {
                if (sIdx !== idx) {
                  refundMoves += 1; // +1 for additional reveals
                }
                return { ...s, isRevealed: false, revealedInAttack: false };
              }
              return s;
            });
            setPlayerSlots(revertedSlots);

            // Revert all reactively revealed AI slots
            const revertedAiSlots = aiSlots.map((s) => {
              if (s.revealedInAttack) {
                return { ...s, isRevealed: false, revealedInAttack: false };
              }
              return s;
            });
            setAiSlots(revertedAiSlots);

            setPlayerMovesLeft((prev) => Math.min(3, prev + refundMoves));
            addLog(`🔄 إلغاء الهجوم: قمت بإلغاء المحاولة الهجومية وإعادة قلب اللاعبين مقلوبين مع استعادة حركاتك التكتيكية.`, "info");
            SoundEffects.playCardDraw();
          } else {
            // Cancel additional reveal
            const newSlots = [...playerSlots];
            newSlots[idx] = { ...clickedSlot, isRevealed: false, revealedInAttack: false };
            setPlayerSlots(newSlots);
            setPlayerMovesLeft((prev) => Math.min(3, prev + 1));

            // Revert one reactive AI slot that was revealed during this attack
            const aiToRevertIdx = aiSlots.findIndex((s) => s.isRevealed && s.revealedInAttack);
            if (aiToRevertIdx !== -1) {
              const updatedAi = [...aiSlots];
              updatedAi[aiToRevertIdx] = { ...updatedAi[aiToRevertIdx], isRevealed: false, revealedInAttack: false };
              setAiSlots(updatedAi);
              addLog(`🔄 إلغاء كشف إضافي: قمت بإعادة قلب [ ${clickedSlot.card.name} ]، واستعدت حركة تكتيكية واحدة، وتراجع الخصم دفاعياً بالمثل.`, "neutral");
            } else {
              addLog(`🔄 إلغاء كشف إضافي: قمت بإعادة قلب [ ${clickedSlot.card.name} ] واستعدت حركة تكتيكية واحدة.`, "neutral");
            }
            SoundEffects.playCardDraw();
          }
        }
        return;
      }

      // Enforce 3 reveals/activations limit per round
      const playerPitchRevealsCount = playerSlots.filter(s => s.card && s.revealedInAttack).length;
      const playerSpecialsCount = playerActiveSpecial.length;
      if (playerPitchRevealsCount + playerSpecialsCount >= 3) {
        addLog("خطأ تكتيكي: لا يمكنك كشف وتفعيل أكثر من 3 كروت إجمالاً بالجولة الواحدة!", "danger");
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
      addLog(`⚔️ كشف هجومي إضافي: كشفت [ ${clickedSlot.card.name} ] ليدعم الهجمة بـ +${clickedSlot.card.attack} نقاط!`, "success");
      SoundEffects.playCardDraw();
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
      // Player defends, can reveal their owned slots or flip back already revealed ones
      if (isAi) return false;
      const slot = playerSlots[idx];
      return slot.card !== null && (!slot.isRevealed && defenseMovesLeft > 0 || (slot.isRevealed && !!slot.revealedInAttack));
    }

    if (phase === "attacking") {
      // Can reveal extra player cards on pitch if there's moves left, or click to flip back revealed ones
      if (isAi) return false;
      const slot = playerSlots[idx];
      return slot.card !== null && (!slot.isRevealed && playerMovesLeft > 0 || (slot.isRevealed && !!slot.revealedInAttack));
    }

    return false;
  };

  // DECLARE PLAYER ATTACK
  const handleDeclareAttack = () => {
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

    // Reset AI slots revealedInAttack too
    setAiSlots((prev) => prev.map((s) => ({ ...s, revealedInAttack: false })));

    // 2. Draw Ponto card
    if (pontoDeck.length === 0) {
      setPontoDeck(generatePontoDeck());
    }
    const drawnPonto = pontoDeck[0];
    setCurrentPonto(drawnPonto);
    setPontoDeck((prev) => prev.slice(1));

    // Deduct 1 move
    const movesAfterDeclare = playerMovesLeft - 1;
    setPlayerMovesLeft(movesAfterDeclare);
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
          cleanPlayerSlots,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          movesAfterDeclare,
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
      // We DO NOT trigger the AI defense reaction instantly.
      // This is a strategic enhancement: the AI will now only declare its defense reaction AFTER the player finalized their attack and clicked "تسديدة حاسمة ⚽"!
      addLog(`🛡️ الخصم يدرس التمريرات ويتماسك دفاعياً بانتظار تسديدتك الحاسمة ليرى تشكيلتك كاملة...`, "neutral");
    }
  };

  // AI ACTIONS LOGIC (NPC TURNS CALCULATOR)
  const triggerAIDefenseReaction = (
    playerAttackerIdx: number,
    drawnPonto: PontoCard,
    onComplete?: (updatedSlots: typeof aiSlots, updatedSpecials: typeof aiActiveSpecial) => void
  ) => {
    addLog(`🤖 الخصم المدرب ${aiCoachName} يحلل قوة تسديدتك ويتحلّى بالذكاء التكتيكي للصد والعرقلة...`, "neutral");

    setTimeout(() => {
      let aiMoves = defenseMovesLeft;
      const updatedAiSlots = [...aiSlots];
      let aiSpecialsPlayed: SpecialCard[] = [];

      // Determine players total attack score
      const playerAttackScore = calculateTotalAttack(true, playerAttackerIdx, drawnPonto, playerActiveSpecial);

      // Baseline AI defense before new reveals
      let currentDefenseScore = calculateTotalDefense(false, aiActiveSpecial);

      // 1. Evaluate playing critical defensive specials if helpful
      const defensiveSpecials = aiHand.filter(
        (c) => c.type === "special" && (c.effect === "park_the_bus" || c.effect === "offside" || c.effect === "wet_pitch" || c.effect === "fans")
      ) as SpecialCard[];

      if (playerAttackScore > currentDefenseScore && defensiveSpecials.length > 0) {
        // Pick best defensive special
        const offsideSpecial = defensiveSpecials.find((c) => c.effect === "offside");
        const parkSpecial = defensiveSpecials.find((c) => c.effect === "park_the_bus");
        const wetSpecial = defensiveSpecials.find((c) => c.effect === "wet_pitch");
        const fansSpecial = defensiveSpecials.find((c) => c.effect === "fans");

        const chosenSpecial = offsideSpecial || parkSpecial || wetSpecial || fansSpecial;
        if (chosenSpecial) {
          aiSpecialsPlayed.push(chosenSpecial);
          setAiHand((prev) => prev.filter((c) => c.id !== chosenSpecial.id));
          aiMoves--;
          addLog(`🤖 الخصم يرمي ورقة تكتيكية من حقيبته: [ ${chosenSpecial.name} ] لعرقلة الهجوم!`, "danger");
          
          // Re-calculate defense with the new special
          currentDefenseScore = calculateTotalDefense(false, [...aiActiveSpecial, chosenSpecial]);
        }
      }

      // Remaining score defense gap to stop the goal
      const defenseGap = playerAttackScore - currentDefenseScore;

      // Smart decision engine: locate optimal card reveals to overcome the remaining gap
      // Allowed reveals is at most 3 cards including special cards activated in this resolution
      const maxPitchReveals = Math.max(0, 3 - aiSpecialsPlayed.length);
      const allowedReveals = Math.min(maxPitchReveals, aiMoves);
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

        // Tactical Evaluation: If we cannot solve the defense even with all allowed reveals,
        // it is smarter to reveal ZERO cards and save them for our turn rather than wasting resources!
        if (!isSolved) {
          addLog(`🤖 الخصم حلل المسار الرياضي للتسديدة وأدرك استحالة الصد، وفضل الحفاظ على مدافعيه دون كشف أوراق غير مجدية لتوفير هجمة مضادة لاحقاً!`, "danger");
        } else {
          // Reveal the optimized combination of cards (limited to max 3)
          bestCombination.forEach((item) => {
            updatedAiSlots[item.idx].isRevealed = true;
            updatedAiSlots[item.idx].revealedInTurn = turnCount;
            updatedAiSlots[item.idx].revealedInAttack = true;
            aiMoves--;
            addLog(`🛡️ الخصم تيقظ تكتيكياً وكشف صخرته الدفاعية [ ${updatedAiSlots[item.idx].card?.name} ] محرزاً +${item.defense} نقاط صد!`, "info");
          });
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
    if (currentAttackerIdx === null || !currentPonto) return;

    if (isMultiplayer) {
      // Calculate total scores immediately for multiplayer
      const finalAttack = calculateTotalAttack(true, currentAttackerIdx, currentPonto, playerActiveSpecial);
      const finalDefense = calculateTotalDefense(false, aiActiveSpecial);

      const isGoal = finalAttack > finalDefense;
      
      if (isGoal) {
        const newScore = playerScore + 1;
        setPlayerScore(newScore);
        setHasScoredThisTurn(true);
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
    } else {
      // IN OFFLINE MODE (VS AI):
      // The AI has not played defense yet. We trigger its AI defense reaction now,
      // and mathematically resolve the outcome inside the callback once it is completed.
      addLog(`🤖 الخصم المدرب ${aiCoachName} يدرس تسديدتك الكلية وتكتيكاتك بالملعب ويقود خط الصد التكتيكي الفوري...`, "neutral");
      
      triggerAIDefenseReaction(currentAttackerIdx, currentPonto, (updatedSlots, updatedSpecials) => {
        // Compute final defense based on updated AI slots & specials
        let finalDefense = 0;
        updatedSlots.forEach((s) => {
          if (s.card && s.isRevealed && s.revealedInAttack) {
            finalDefense += s.card.defense;
          }
        });
        
        // Add active AI specials defense impact
        updatedSpecials.forEach((spec) => {
          if (spec.effect === "park_the_bus") {
            finalDefense += 4;
          }
          if (spec.effect === "fans") {
            finalDefense += 3;
          }
        });
        
        // Calculate total attack using player active specials and newly played AI defense specials (e.g. offside/wet_pitch)
        let baseAttackPwr = 0;
        playerSlots.forEach((slot) => {
          if (slot.card && slot.isRevealed && slot.revealedInAttack) {
            baseAttackPwr += slot.card.attack;
          }
        });
        if (currentPonto) {
          baseAttackPwr += currentPonto.value;
        }
        playerActiveSpecial.forEach((spec) => {
          if (spec.effect === "counter_attack") baseAttackPwr += 4;
          if (spec.effect === "fans") baseAttackPwr += 3;
        });
        
        // Subtract AI defensive special effects on attack power
        updatedSpecials.forEach((spec) => {
          if (spec.effect === "wet_pitch") {
            baseAttackPwr -= 4;
          }
          if (spec.effect === "offside") {
            let maxAttStrength = 0;
            playerSlots.forEach((s) => {
              if (s.card && s.isRevealed && s.revealedInAttack) {
                maxAttStrength = Math.max(maxAttStrength, s.card.attack);
              }
            });
            baseAttackPwr -= maxAttStrength;
          }
        });
        
        const computedAttack = Math.max(0, baseAttackPwr);
        const computedDefense = Math.max(0, finalDefense);
        
        const isGoal = computedAttack > computedDefense;
        
        if (isGoal) {
          const newScore = playerScore + 1;
          setPlayerScore(newScore);
          setHasScoredThisTurn(true);
          SoundEffects.playGoalCelebration();
          setCelebrationMessage({
            title: "جــوووووول! هجمة مرتدة قاتلة! ⚽🔥",
            subtitle: `إجمالي هجومك (${computedAttack}) تجاوز بنجاح تكتلات دفاع الخصم (${computedDefense}) لتسجل هدفاً تكتيكياً مميزاً!`,
            isGoal: true
          });
          addLog(`⚽ جــوووووول خيالي! أحرز فريقك هدفاً ثميناً (مرتدة) لصالحك! النتيجة الآن: ${newScore} - ${aiScore}`, "success");
          setIsAttackBlocked(false);
          setPhase("resolution");
        } else {
          // Attack is blocked!
          if (playerMovesLeft > 0) {
            // Player still has moves left to reinforce!
            setIsAttackBlocked(true);
            SoundEffects.playTackleBlock();
            addLog(`🧤 تصدي تكتيكي للخصم: تفوق خط صد الخصم البالغ (${computedDefense}) على تسديدتك (${computedAttack}).`, "warning");
            addLog(`💡 بما أنه متبقي لك حركات تكتيكية، يمكنك مواصلة الهجوم بالنقر على لاعب مقلوب من التشكيلة لكشفه وضمه للهجوم، أو الضغط على زر "إنهاء الهجمة 🛑" للاستسلام بالتصدي.`, "info");
          } else {
            // No moves left, auto end attack sequence
            setIsAttackBlocked(false);
            SoundEffects.playTackleBlock();
            setCelebrationMessage({
              title: "يا لها من فرصة ضائعة! التصدي للمحاولة 🧤🚫",
              subtitle: `تكتلات دفاع الخصم الحصين (${computedDefense}) تفوقت أو تساوت مع قواك الضاربة (${computedAttack}) ليفشل هجومك!`,
              isGoal: false
            });
            addLog(`🚫 تصدي أسطوري! نجح حامي مرماهم بقطع هجمتك الشرسة. النتيجة ما زالت: ${playerScore} - ${aiScore}`, "danger");
            setPhase("resolution");
          }
        }
      });
    }
  };

  const handleForceEndAttack = () => {
    // Accumulate scores for final consolation modal
    let finalDefense = 0;
    aiSlots.forEach((s) => {
      if (s.card && s.isRevealed && s.revealedInAttack) {
        finalDefense += s.card.defense;
      }
    });
    aiActiveSpecial.forEach((spec) => {
      if (spec.effect === "park_the_bus") finalDefense += 4;
      if (spec.effect === "fans") finalDefense += 3;
    });

    let baseAttackPwr = 0;
    playerSlots.forEach((slot) => {
      if (slot.card && slot.isRevealed && slot.revealedInAttack) {
        baseAttackPwr += slot.card.attack;
      }
    });
    if (currentPonto) {
      baseAttackPwr += currentPonto.value;
    }
    playerActiveSpecial.forEach((spec) => {
      if (spec.effect === "counter_attack") baseAttackPwr += 4;
      if (spec.effect === "fans") baseAttackPwr += 3;
    });

    aiActiveSpecial.forEach((spec) => {
      if (spec.effect === "wet_pitch") baseAttackPwr -= 4;
      if (spec.effect === "offside") {
        let maxAtt = 0;
        playerSlots.forEach((s) => {
          if (s.card && s.isRevealed && s.revealedInAttack) {
            maxAtt = Math.max(maxAtt, s.card.attack);
          }
        });
        baseAttackPwr -= maxAtt;
      }
    });

    const computedAttack = Math.max(0, baseAttackPwr);
    const computedDefense = Math.max(0, finalDefense);

    SoundEffects.playTackleBlock();
    setCelebrationMessage({
      title: "يا لها من فرصة ضائعة! التصدي للمحاولة 🧤🚫",
      subtitle: `تكتلات دفاع الخصم الحصين (${computedDefense}) تفوقت أو تساوت مع قواك الضاربة (${computedAttack}) ليفشل هجومك!`,
      isGoal: false
    });
    addLog(`🚫 تصدي أسطوري! انتهت الهجمة المستمرة بالتصدي بعد أن قررت عدم تعزيزها. النتيجة ما زالت: ${playerScore} - ${aiScore}`, "danger");

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
    setCelebrationMessage(null);
    setSelectedPitchSlotIdx(null);
    setCurrentAttackerIdx(null);
    setCurrentPonto(null);
    setPlayerActiveSpecial([]);
    setAiActiveSpecial([]);

    // Mark participating cards on both sides as spent / spent!
    setPlayerSlots((prev) =>
      prev.map((s) => (s.revealedInAttack ? { ...s, isRevealed: true, spent: true, revealedInAttack: false } : s))
    );
    setAiSlots((prev) =>
      prev.map((s) => (s.revealedInAttack ? { ...s, isRevealed: true, spent: true, revealedInAttack: false } : s))
    );

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
      setIsAttackBlocked(false);
      setDefenseMovesLeft(3);
      if (isPlayerAttacker) {
        if (playerMovesLeft > 0) {
          setPhase("player_turn");
          addLog(`متابعة دور الماتش! متبقي لك عدد ${playerMovesLeft} حركات تكتيكية لإدارتها. يمكنك اللعب، سحب كروت أو النقر على "إنهاء الدور" يدوياً.`, "neutral");
        } else {
          handleAIPlayTurn();
        }
      } else {
        setPhase("player_turn");
        setPlayerMovesLeft(3);
        setHasScoredThisTurn(false);
        setCardsDrawnThisTurn(0);
        setIsHandExpanded(true);
        setTurnCount((prev) => prev + 1);
        addLog(`⚽ انتهى دور الخصم كاملاً بنجاح. عدنا لدورك التكتيكي الجديد! متبقي لك 3 حركات تكتيكية.`, "success");
      }
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
      let updatedAiDeck = [...aiDeck];
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

      setAiDeck(updatedAiDeck);
      setSpecialDeck(updatedAiSpecial);
      setAiHand(newAiHand);
      addLog(`🤖 الخصم المدرب ${aiCoachName} يسحب كارتين مميزين ليده التكتيكية.`, "neutral");

      // AI Moves execution (has 3 moves)
      setTimeout(() => {
        let aiMoves = 3;
        const currentAiSlots = [...aiSlots];

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
            
            currentAiSlots[emptySlotIdx] = { card: bestPlayer, isRevealed: false };
            newAiHand = newAiHand.filter((c) => c.id !== bestPlayer.id);
            handPlayerCards = handPlayerCards.filter((c) => c.id !== bestPlayer.id);
            
            aiMoves--;
            addLog(`🤖 الخصم يدعم صفوفه وينزل لاعباً جديداً من الحقيبة [ ${bestPlayer.name} ] إلى الملعب في مركز خالي.`, "success");
          } else if (spentSlotIdx !== -1) {
            // Find best available hand player card to replace the spent card
            handPlayerCards.sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense));
            const bestPlayer = handPlayerCards[0];
            
            currentAiSlots[spentSlotIdx] = { card: bestPlayer, isRevealed: false, spent: false };
            newAiHand = newAiHand.filter((c) => c.id !== bestPlayer.id);
            handPlayerCards = handPlayerCards.filter((c) => c.id !== bestPlayer.id);
            
            aiMoves--;
            addLog(`🤖 الخصم يستبدل لاعباً مستهلكاً بنجم جديد [ ${bestPlayer.name} ] من الحقيبة تعزيزاً لخطوطه المخفية.`, "success");
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
                currentAiSlots[weakSlotIdx] = { card: bestPlayer, isRevealed: false };
                newAiHand = newAiHand.filter((c) => c.id !== bestPlayer.id);
                newAiHand.push(weakCard); // Reclaimed back to hand
                handPlayerCards = handPlayerCards.filter((c) => c.id !== bestPlayer.id);
                
                aiMoves--;
                addLog(`🤖 الخصم يعيد ترتيب خطته ويسحب لاعباً مقلوباً لحقيبته وينزل مكانه [ ${bestPlayer.name} ] مقلوباً لتمويه هجماته.`, "info");
              } else {
                break;
              }
            } else {
              break;
            }
          }
        }

        // Phase 2: Declare Attack (if AI has moves left and selectable attackers)
        const attackCandidates = currentAiSlots
          .map((s, idx) => ({ slot: s, idx }))
          .filter((item) => item.slot.card !== null && !item.slot.isRevealed && !item.slot.spent && item.slot.card.attack > 1)
          .sort((a, b) => b.slot.card!.attack - a.slot.card!.attack); // Smartly pick candidate with highest attack!

        if (aiMoves >= 1 && attackCandidates.length > 0) {
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

          // Reset Player slots' revealedInAttack
          setPlayerSlots((prev) => prev.map((s) => ({ ...s, revealedInAttack: false })));

          // Draw Ponto card
          if (pontoDeck.length === 0) {
            setPontoDeck(generatePontoDeck());
          }
          const drawnPonto = pontoDeck[0];
          setCurrentPonto(drawnPonto);
          setPontoDeck((prev) => prev.slice(1));

          aiMoves -= 1;
          setPhase("ai_attacking");
          setDefenseMovesLeft(3); // Player gets 3 defense moves!

          addLog(`⚠️ هجوم عدواني باغت! الخصم يكشف مهاجمه الأساسي [ ${aiAttacker.name} ] بقوة هجوم: ${aiAttacker.attack}.`, "danger");
          addLog(`⚠️ الخصم سحب كارت معزز المرتدة عشوائي [ ${drawnPonto.text} ] بقوة +${drawnPonto.value}!`, "warning");
          SoundEffects.playWhistle();

          setAiHand(newAiHand);
          // Wait for player defensive response block
          return;
        }

        // Phase 3: No attack can be made, or moves exhausted. Update and hand block back to player
        setAiSlots(currentAiSlots);
        setAiHand(newAiHand);

        setPhase("player_turn");
        setCardsDrawnThisTurn(0);
        setPlayerMovesLeft(3);
        setHasScoredThisTurn(false);
        setIsHandExpanded(true);
        setTurnCount((prev) => prev + 1);
        addLog(`⚽ انتهى دور الخصم بلا هجمات لخطوطه. عدنا لدورك! حظاً موفقاً في الدور ${turnCount + 1}`, "success");
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
      setPhase("resolution");
    } else {
      const aiPitchReveals = aiSlots.filter(s => s.card && s.revealedInAttack).length;
      const aiSpecialsCount = aiActiveSpecial.length;
      const totalAiRoundActions = aiPitchReveals + aiSpecialsCount;
      const aiCanReinforce = !isMultiplayer && aiMovesLeft > 0 && totalAiRoundActions < 3 && aiSlots.some((s) => s.card !== null && !s.isRevealed && !s.spent);

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
        setAiMovesLeft((prev) => prev - 1);
        
        SoundEffects.playCardDraw();
        newLogs.push({
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `🚨 الخصم يرفض الاستسلام لمقاومتك! دفع بنجم الهجوم [ ${bestNominee.s.card!.name} ] لمضاعفة الضغط بـ +${bestNominee.s.card!.attack}!`,
          type: "warning" as const
        });
        addLog(`🛡️ الخصم يواصل ضغطه هجومياً! يمكنك البقاء وإضافة مدافعين جدد ثم النقر على "تأكيد الدفاع" مجدداً لصد التعزيز!`, "info");
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
          text: `🧱 تصدي رائع! خط دفاع اللوحة أحبط تسديدة الخصم وقواهم. النتيجة ما زالت: ${playerScore} - ${aiScore}`,
          type: "success" as const
        });
        setPhase("resolution");
      }
    }

    setLogs(newLogs);

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

  // Dynamic Scoreboard Offensive/Defensive Statistics - requested by user
  const isAttackDefActive = currentAttackerIdx !== null && (phase === "attacking" || phase === "ai_attacking" || phase === "resolution");
  const showPlayerAttack = isAttackDefActive && isPlayerAttacker;
  const showPlayerDefense = isAttackDefActive && !isPlayerAttacker;
  const showAiAttack = isAttackDefActive && !isPlayerAttacker;
  const showAiDefense = isAttackDefActive && isPlayerAttacker;

  const activeOffenseVal = isAttackDefActive ? calculateTotalAttack(isPlayerAttacker, currentAttackerIdx!, currentPonto, isPlayerAttacker ? playerActiveSpecial : aiActiveSpecial) : 0;
  const activeDefenseVal = isAttackDefActive ? calculateTotalDefense(!isPlayerAttacker, !isPlayerAttacker ? playerActiveSpecial : aiActiveSpecial) : 0;

  return (
    <div className={`min-h-screen bg-[#050605] text-[#e0e0e0] font-sans relative ${phase === "menu" ? "p-4 md:p-6 overflow-y-auto" : "p-1.5 h-screen max-h-screen overflow-hidden md:p-2.5"} select-none`}>
      
      {/* Background glow effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className={`max-w-7xl mx-auto h-full flex flex-col ${phase === "menu" ? "space-y-6" : "space-y-1.5 lg:space-y-2 justify-between"}`}>
        
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
                  الحركات: {3 - playerMovesLeft}/3
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
          <div className="flex flex-row gap-2 w-full h-full select-none text-right overflow-hidden">
            
            {/* LEFT SIDEBAR PANEL (Tactics block + Commentary log + Draw blocks) */}
            <div className="w-[28%] md:w-[26%] min-w-[210px] max-w-[270px] flex flex-col gap-1.5 h-full justify-between overflow-hidden shrink-0">
              
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
                    logs.map((log) => {
                      const isDanger = log.type === "danger";
                      const isSuccess = log.type === "success";
                      const isWarning = log.type === "warning";
                      let colorClass = "text-white/70";
                      if (isDanger) colorClass = "text-[#ff4c4c]";
                      else if (isSuccess) colorClass = "text-[#00ff77] font-semibold";
                      else if (isWarning) colorClass = "text-amber-400";
                      
                      return (
                        <div key={log.id} className="text-[9px] leading-snug border-b border-white/5 pb-0.5 flex items-start gap-1 justify-end font-sans">
                          <span className={`${colorClass} flex-1 text-right`}>{log.text}</span>
                          <span className="text-emerald-500/60 font-black shrink-0">-</span>
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
                    const isDrawPhase = (phase === "player_turn" || phase === "warmup") && cardsDrawnThisTurn < 2;
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
                    const isDrawPhase = (phase === "player_turn" || phase === "warmup") && cardsDrawnThisTurn < 2;
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
            <div className="flex-1 flex flex-col gap-1.5 h-full justify-between overflow-hidden">
              
              {/* Row 1 (Opponent Football Pitch Slots - Compact Red Border) */}
              <div className="border border-rose-500/60 shadow-[0_0_6px_rgba(244,63,94,0.25)] bg-[#040804]/90 rounded-xl p-1.5 flex flex-col gap-1 relative flex-1 min-h-[100px] justify-between">
                
                {isHandExpanded && (
                  <div className="absolute inset-0 z-40 bg-[#080d09]/fa backdrop-blur-md rounded-xl p-1.5 flex flex-col justify-between shadow-2xl animate-scaleUp border border-[#10b981]/50">
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

                <div className="grid grid-cols-5 gap-1.5 w-full flex-1 items-center">
                  {aiSlots.map((slot, idx) => {
                    const isSelectable = isSlotSelectable(idx, true);
                    const isChosenToAttack = currentAttackerIdx === idx && phase !== "player_turn";
                    
                    return (
                      <div 
                        key={`ai-pitch-slot-${idx}`}
                        className={`relative rounded-lg overflow-hidden aspect-[2/3] max-h-[22.5vh] md:max-h-[24vh] w-full mx-auto transition-all flex flex-col justify-between ${
                          isSelectable 
                            ? "ring-2 ring-rose-400 ring-offset-1 ring-offset-black cursor-pointer hover:scale-103" 
                            : ""
                        }`}
                      >
                        {slot.card ? (
                          slot.isRevealed || slot.revealedInAttack ? (
                            <GameCard
                              card={slot.card}
                              isRevealed={true}
                              size="pitch"
                              onInspect={() => setInspectedCard(slot.card)}
                            />
                          ) : (
                            /* Covered card back representing mockup style exactly */
                            <div 
                              onClick={() => isSelectable && handleSelectPitchSlot(idx)}
                              className="w-full h-full rounded-lg border border-red-500/80 bg-gradient-to-b from-[#141514] to-black p-1 flex flex-col justify-between shadow-[0_0_4px_rgba(239,68,68,0.45)] cursor-pointer hover:scale-102 transition-transform select-none"
                            >
                              <div className="w-full flex justify-between items-center opacity-30 text-[6.5px] text-white/50 leading-none">
                                <span>MORTADA</span>
                                <span>مرتدة</span>
                              </div>

                              <div className="flex flex-col items-center gap-0.5">
                                <div className="w-5 h-5 rounded-full bg-[#121412] border border-white/5 flex items-center justify-center shadow-md">
                                  <span className="text-[9px]">⚽</span>
                                </div>
                              </div>

                              <div className="w-full flex justify-center text-center">
                                <span className="text-[7.5px] text-emerald-400 font-extrabold pb-0.5 uppercase tracking-wider">
                                  تكتيك
                                </span>
                              </div>
                            </div>
                          )
                        ) : (
                          /* Empty Opponent Slot placeholder */
                          <div 
                            onClick={() => isSelectable && handleSelectPitchSlot(idx)}
                            className="w-full h-full rounded-lg border border-dashed border-rose-950/30 bg-black/40 flex items-center justify-center p-0.5 cursor-pointer"
                          >
                            <span className="text-rose-900/50 font-sans text-[8.5px] font-bold">شاغر 🕳️</span>
                          </div>
                        )}

                        {/* Chosen Attacker Marker glow */}
                        {isChosenToAttack && (
                          <div className="absolute inset-0 bg-rose-900/25 border-2 border-rose-500 animate-ping pointer-events-none rounded-lg" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* Row 2 (Beautiful Scoreboard and Clock Indicator - Cyan Neon Glow - Sleek) */}
              <div className="border border-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.35)] bg-[#030604]/95 rounded-xl px-3 py-1 flex items-center justify-between gap-3 w-full h-[40px] shrink-0 select-none">
                
                {/* Scoreboard Left Team (User) */}
                <div className="flex items-center gap-1.5 text-right flex-1 select-none">
                  <span className="text-base leading-none">🇦🇷</span>
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] font-black text-[#e0e0e0]/60 leading-none">راقصو التانغو</span>
                  </div>

                  {/* Dynamic player Attack/Defense badge - requested by user */}
                  {showPlayerAttack && (
                    <div className="mr-auto ml-1.5 bg-amber-500/10 border border-amber-500/30 text-yellow-300 px-1.5 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                      <span>🔥⚽</span>
                      <span>{activeOffenseVal}</span>
                    </div>
                  )}
                  {showPlayerDefense && (
                    <div className="mr-auto ml-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-300 px-1.5 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.2)]">
                      <span>🛡️</span>
                      <span>{activeDefenseVal}</span>
                    </div>
                  )}

                  <div className="bg-[#052311] border border-[#00ff66]/45 text-[#00ff66] px-2 py-0.5 rounded-full font-mono font-black text-xs shadow-[inset_0_0_4px_rgba(0,255,102,0.15)] min-w-[28px] text-center ml-1">
                    {playerScore}
                  </div>
                </div>

                {/* Clock Stopwatch in the middle */}
                <div className="flex items-center justify-center gap-1 text-emerald-400 font-mono font-black text-[10px] bg-black/60 px-2 py-0.5 rounded-lg shadow-inner border border-white/5 whitespace-nowrap shrink-0">
                  <span>⏱️</span>
                  <span className="tracking-widest">
                    {(() => {
                      const m = Math.floor(matchTime / 60).toString().padStart(2, "0");
                      const s = (matchTime % 60).toString().padStart(2, "0");
                      return `${m}:${s}`;
                    })()}
                  </span>
                </div>

                {/* Scoreboard Right Team (Opponent) */}
                <div className="flex items-center gap-1.5 text-left flex-1 justify-end select-none">
                  <div className="bg-[#24060b] border border-rose-500/45 text-rose-400 px-2 py-0.5 rounded-full font-mono font-black text-xs shadow-[inset_0_0_4px_rgba(244,63,94,0.15)] min-w-[28px] text-center mr-1">
                    {aiScore}
                  </div>

                  {/* Dynamic AI Attack/Defense badge - requested by user */}
                  {showAiDefense && (
                    <div className="ml-auto mr-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-300 px-1.5 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.25)]">
                      <span>🛡️</span>
                      <span>{activeDefenseVal}</span>
                    </div>
                  )}
                  {showAiAttack && (
                    <div className="ml-auto mr-1.5 bg-amber-500/10 border border-amber-500/30 text-yellow-300 px-1.5 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                      <span>🔥⚽</span>
                      <span>{activeOffenseVal}</span>
                    </div>
                  )}

                  <div className="flex flex-col text-right ml-1">
                    <span className="text-[8px] font-black text-[#e0e0e0]/60 leading-none">كتائب الروبوت</span>
                  </div>
                  <span className="text-sm">🤖</span>
                </div>

              </div>


              {/* Row 3 (Golden Dashboard controller toolbar - Amber Neon Glow - Compact) */}
              <div className="border border-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.3)] bg-[#030604]/95 rounded-xl px-3 py-1 flex items-center justify-between gap-3 w-full h-[40px] shrink-0 select-none">
                
                {/* State Tag badge */}
                <div className="bg-gradient-to-r from-emerald-600/15 to-teal-600/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-lg font-black text-[9px] shadow-sm whitespace-nowrap shrink-0 leading-none">
                  {phase === "warmup" && "مرحلة التسخين ⚽"}
                  {phase === "player_turn" && "دورك التكتيكي 🧠"}
                  {phase === "ai_turn" && "دفاع الخصم مستعد 🤖"}
                  {phase === "attacking" && "التسديد والهجوم ⚔️"}
                  {phase === "ai_attacking" && "صد دفاعي شرس 🛡️"}
                  {phase === "resolution" && "تحليل الهجمة 📊"}
                  {phase === "game_over" && "انتهت المقابلة 🏁"}
                </div>

                {/* Status Counters pills */}
                <div className="flex items-center gap-1 shrink-0 scale-95">
                  <div className="bg-amber-500/10 text-amber-300 border border-amber-500/25 px-1.5 py-0.5 rounded text-[8px] font-black font-sans leading-none">
                    حركة {playerMovesLeft} / 3
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded text-[8px] font-black font-sans leading-none">
                    سحب {cardsDrawnThisTurn} / 2
                  </div>
                </div>

                {/* Actionable Buttons depending on phase */}
                <div className="flex items-center gap-1.5 justify-end">
                  
                  {phase === "player_turn" && (
                    <>
                      <button
                        type="button"
                        onClick={handleDeclareAttack}
                        disabled={playerMovesLeft < 2 && selectedPitchSlotIdx === null}
                        className="bg-[#881337] hover:bg-[#9f1239] disabled:opacity-40 text-white font-extrabold py-0.5 px-2 rounded-md text-[9.5px] flex items-center gap-0.5 cursor-pointer transition-colors leading-normal"
                      >
                        <span>هجوم مباشر</span>
                        <span>⚔️</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleEndPlayerTurn}
                        className="bg-[#2d3748] hover:bg-[#3d4a5f] text-slate-305 font-extrabold py-0.5 px-2 rounded-md text-[10px] border border-white/5 cursor-pointer transition-colors leading-normal"
                      >
                        <span>إنهاء الدور ⏳</span>
                      </button>
                    </>
                  )}

                  {phase === "warmup" && (
                    <button
                      type="button"
                      onClick={handleConfirmLineup}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-0.5 px-3 rounded-md text-[10px] cursor-pointer transition-colors leading-normal"
                    >
                      🏁
                    </button>
                  )}

                  {phase === "attacking" && (
                    <>
                      <button
                        type="button"
                        onClick={handleResolveAttack}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-black py-0.5 px-3 rounded-md text-[10px] cursor-pointer transition-colors leading-normal"
                      >
                        تسديدة حاسمة ⚽
                      </button>
                      {isAttackBlocked && (
                        <button
                          type="button"
                          onClick={handleForceEndAttack}
                          className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-0.5 px-2 rounded-md text-[9px] cursor-pointer"
                        >
                          إنهاء 🛑
                        </button>
                      )}
                    </>
                  )}

                  {phase === "ai_attacking" && (
                    <button
                      type="button"
                      onClick={handleConfirmDefense}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black py-0.5 px-3 rounded-md text-[10px] cursor-pointer transition-colors leading-normal"
                    >
                      تأكيد الدفاع 🛡️
                    </button>
                  )}

                  {phase === "game_over" && (
                    <button
                      type="button"
                      onClick={handleResetGame}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-0.5 px-3 rounded-md text-[10px] cursor-pointer"
                    >
                      مباراة جديدة 🔁
                    </button>
                  )}

                </div>

              </div>


              {/* Row 4 (Player Pitch Slots - Compact Green Border) */}
              <div className="border border-emerald-500/60 shadow-[0_0_6px_rgba(34,197,94,0.25)] bg-[#040804]/90 rounded-xl p-1.5 flex flex-col gap-1 relative flex-1 min-h-[100px] justify-between">

                <div className="grid grid-cols-5 gap-1.5 w-full flex-1 items-center">
                  {playerSlots.map((slot, idx) => {
                    const isSelectable = isSlotSelectable(idx, false);
                    const isSelected = selectedPitchSlotIdx === idx;
                    const isSpent = slot.spent;
                    
                    return (
                      <div 
                        key={`player-pitch-slot-${idx}`}
                        className={`relative rounded-lg overflow-hidden aspect-[2/3] max-h-[22.5vh] md:max-h-[24vh] w-full mx-auto transition-all flex flex-col justify-between ${
                          isSelectable 
                            ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-black cursor-pointer hover:scale-103 animate-pulse" 
                            : ""
                        } ${isSelected ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-black scale-102" : ""}`}
                      >
                        {slot.card ? (
                          <div className="relative w-full h-full" onClick={() => handleSelectPitchSlot(idx)}>
                            <GameCard
                              card={slot.card}
                              isRevealed={true}
                              size="pitch"
                              onInspect={() => setInspectedCard(slot.card)}
                            />
                            {isSpent && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg pointer-events-none">
                                <span className="text-[8px] text-yellow-500 font-extrabold uppercase bg-black/85 px-1 py-0.2 rounded border border-yellow-500/20">منتهي</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Empty Player Slot matching mockup exactly */
                          <div 
                            onClick={() => handleSelectPitchSlot(idx)}
                            className="w-full h-full rounded-lg border border-dashed border-emerald-500/30 bg-black/60 flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-950/20 transition-all p-1"
                          >
                            <span className="text-emerald-400 font-extrabold text-sm leading-none">+</span>
                            <span className="text-emerald-500/50 font-sans text-[8px] font-bold">تنزيل لاعب</span>
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
