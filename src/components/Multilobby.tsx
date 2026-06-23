/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, Key, RefreshCw, Sparkles, Trophy, PlusCircle, Gamepad2, 
  AlertCircle, PlayCircle, Copy, Link, Globe, Shield, Settings, 
  Check, ArrowLeft, ArrowRight, User, Eye, EyeOff, X, ChevronUp, ChevronDown
} from "lucide-react";
import { supabaseService, MatchRoom, isSupabaseConfigured } from "../lib/supabase";
import { SoundEffects } from "../utils/sounds";
import { gameAuth } from "../lib/gameAuth";
import { getPackages } from "../admin/adminStore";
import { AdminPackage } from "../admin/adminTypes";
import { GameToast } from "./GameDialog";

const MOCK_PACKAGES: AdminPackage[] = [
  { id: "pkg_egypt", name: "باقة الفراعنة 🇪🇬", description: "منتخب مصر والمحليين", image: "🇪🇬", type: "player", legend_percentage: 30, created_at: "", updated_at: "" },
  { id: "pkg_legends", name: "باقة الأساطير 👑", description: "أساطير كرة القدم العالمية", image: "👑", type: "player", legend_percentage: 50, created_at: "", updated_at: "" },
  { id: "pkg_europe", name: "باقة الدوريات الأوروبية 🇪🇺", description: "نجوم الملاعب الأوروبية", image: "🇪🇺", type: "player", legend_percentage: 30, created_at: "", updated_at: "" },
  { id: "pkg_tactics_classic", name: "التكتيكات الكلاسيكية 📋", description: "تكتيكات اللعب الأساسية", image: "📋", type: "special", legend_percentage: 0, created_at: "", updated_at: "" },
  { id: "pkg_tactics_modern", name: "التكتيكات الحديثة ⚡", description: "تكتيكات اللعب المتقدمة والمفاجئة", image: "⚡", type: "special", legend_percentage: 0, created_at: "", updated_at: "" },
];

// Bulletproof copy helper for mobile browsers & WebViews
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn("navigator.clipboard failed, using fallback copy:", e);
    }
  }

  // Fallback temporary textarea method
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    document.body.removeChild(textArea);
    return false;
  }
}

interface MultilobbyProps {
  onStartMultiplayerGame: (room: MatchRoom, role: "host" | "opponent") => void;
}

export default function Multilobby({ onStartMultiplayerGame }: MultilobbyProps) {
  const currentUser = gameAuth.getCurrentUser();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);

  // Lobby states
  const [activeRooms, setActiveRooms] = useState<MatchRoom[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [selectedVibe, setSelectedVibe] = useState(currentUser?.team_name || "الفراعنة");
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Custom Match Settings states (Config Panel)
  const [showConfig, setShowConfig] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [matchDuration, setMatchDuration] = useState<number>(180);
  const [gameMode, setGameMode] = useState<"time" | "rounds">("time");
  const [winningGoals, setWinningGoals] = useState<number>(5);
  const [totalRounds, setTotalRounds] = useState<number>(10);
  const [halfTimeBreakDuration, setHalfTimeBreakDuration] = useState<number>(30);
  const [legendPercentage, setLegendPercentage] = useState<number>(30);
  const [maxDrawsPerTurn, setMaxDrawsPerTurn] = useState<number>(2);
  const [maxMovesPerTurn, setMaxMovesPerTurn] = useState<number>(3);
  const [initialCardsCount, setInitialCardsCount] = useState<number>(5);
  const [legendBurnLimit, setLegendBurnLimit] = useState<number>(2);
  const [maxBonusValue, setMaxBonusValue] = useState<number>(10);

  const [availablePackages, setAvailablePackages] = useState<AdminPackage[]>(MOCK_PACKAGES);
  const [selectedPlayerPkgs, setSelectedPlayerPkgs] = useState<string[]>(["pkg_egypt"]);
  const [selectedSpecialPkgs, setSelectedSpecialPkgs] = useState<string[]>([]);
  const [turnTimeLimit, setTurnTimeLimit] = useState<number>(60); // default 60s
  const [defenseTimeLimit, setDefenseTimeLimit] = useState<number>(30); // default 30s
  const [warmupTimeLimit, setWarmupTimeLimit] = useState<number>(30); // default 30s

  // Wizard lobby setup variables
  const [configStep, setConfigStep] = useState<"details" | "packages" | "rules">("details");
  const [focusedPlayerId, setFocusedPlayerId] = useState<string>("");
  const [focusedSpecialId, setFocusedSpecialId] = useState<string>("none");
  const [multiPackEnabled, setMultiPackEnabled] = useState(false);

  // Snapping refs and scroll trackers
  const playerScrollRef = useRef<HTMLDivElement>(null);
  const tacticalScrollRef = useRef<HTMLDivElement>(null);
  const lastFocusedPlayerId = useRef("");
  const lastFocusedSpecialId = useRef("");
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Snapping logic functions
  const scrollElementToCenter = (container: HTMLDivElement, element: HTMLElement) => {
    const targetScrollTop = element.offsetTop - container.clientHeight / 2 + element.clientHeight / 2;
    container.scrollTo({
      top: targetScrollTop,
      behavior: "smooth"
    });
  };

  const handleSelectPlayerPkg = (pkgId: string, element?: HTMLElement) => {
    SoundEffects.playCardDraw();
    setFocusedPlayerId(pkgId);
    
    if (element && playerScrollRef.current) {
      scrollElementToCenter(playerScrollRef.current, element);
    }
    
    if (multiPackEnabled) {
      setSelectedPlayerPkgs(prev => {
        const exists = prev.includes(pkgId);
        if (exists) {
          if (prev.length === 1) return prev;
          return prev.filter(id => id !== pkgId);
        }
        return [...prev, pkgId];
      });
    } else {
      setSelectedPlayerPkgs([pkgId]);
    }
  };

  const handleSelectSpecialPkg = (pkgId: string, element?: HTMLElement) => {
    SoundEffects.playCardDraw();
    setFocusedSpecialId(pkgId);
    
    if (element && tacticalScrollRef.current) {
      scrollElementToCenter(tacticalScrollRef.current, element);
    }
    
    if (multiPackEnabled) {
      if (pkgId === "none") {
        setSelectedSpecialPkgs([]);
      } else {
        setSelectedSpecialPkgs(prev => {
          const exists = prev.includes(pkgId);
          const next = exists ? prev.filter(id => id !== pkgId) : [...prev, pkgId];
          return next.filter(id => id !== "none");
        });
      }
    } else {
      if (pkgId === "none") {
        setSelectedSpecialPkgs([]);
      } else {
        setSelectedSpecialPkgs([pkgId]);
      }
    }
  };

  const handleTacticalScroll = () => {
    if (!tacticalScrollRef.current) return;
    const container = tacticalScrollRef.current;
    const containerCenter = container.scrollTop + container.clientHeight / 2;
    
    const children = container.querySelectorAll("[data-pkg-id]");
    let closestId = "";
    let minDiff = Infinity;
    
    children.forEach((child) => {
      const htmlEl = child as HTMLElement;
      const childCenter = htmlEl.offsetTop + htmlEl.offsetHeight / 2;
      const diff = Math.abs(containerCenter - childCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestId = htmlEl.dataset.pkgId || "";
      }
    });
    
    if (closestId && closestId !== lastFocusedSpecialId.current) {
      lastFocusedSpecialId.current = closestId;
      setFocusedSpecialId(closestId);
      if (!multiPackEnabled) {
        if (closestId === "none") {
          setSelectedSpecialPkgs([]);
        } else {
          setSelectedSpecialPkgs([closestId]);
        }
      }
    }
  };

  const handlePlayerScroll = () => {
    if (!playerScrollRef.current) return;
    const container = playerScrollRef.current;
    const containerCenter = container.scrollTop + container.clientHeight / 2;
    
    const children = container.querySelectorAll("[data-pkg-id]");
    let closestId = "";
    let minDiff = Infinity;
    
    children.forEach((child) => {
      const htmlEl = child as HTMLElement;
      const childCenter = htmlEl.offsetTop + htmlEl.offsetHeight / 2;
      const diff = Math.abs(containerCenter - childCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestId = htmlEl.dataset.pkgId || "";
      }
    });
    
    if (closestId && closestId !== lastFocusedPlayerId.current) {
      lastFocusedPlayerId.current = closestId;
      setFocusedPlayerId(closestId);
      if (!multiPackEnabled) {
        setSelectedPlayerPkgs([closestId]);
      }
    }
  };

  const handleNavigate = (direction: "up" | "down", isPlayer: boolean) => {
    const container = isPlayer ? playerScrollRef.current : tacticalScrollRef.current;
    if (!container) return;
    
    const items = isPlayer 
      ? availablePackages.filter(p => p.type === "player" || !p.type)
      : [
          { id: "none", name: "بدون كروت تكتيكية", type: "special", image: "🚫" },
          ...availablePackages.filter(p => p.type === "special" || p.type === "tactical")
        ];
        
    const focusedId = isPlayer ? focusedPlayerId : focusedSpecialId;
    const currentIndex = items.findIndex(item => item.id === (focusedId || "none"));
    
    if (currentIndex === -1) return;
    
    let targetIndex = currentIndex;
    if (direction === "up") {
      targetIndex = Math.max(0, currentIndex - 1);
    } else {
      targetIndex = Math.min(items.length - 1, currentIndex + 1);
    }
    
    const targetItem = items[targetIndex];
    if (targetItem) {
      const targetEl = container.querySelector(`[data-pkg-id="${targetItem.id}"]`);
      if (targetEl) {
        scrollElementToCenter(container, targetEl as HTMLElement);
        SoundEffects.playCardDraw();
      }
    }
  };

  // Autoscroll to active items on view step change or toggle
  useEffect(() => {
    if (configStep === "details" && availablePackages.length) {
      setTimeout(() => {
        if (selectedPlayerPkgs[0] && playerScrollRef.current) {
          const activeEl = playerScrollRef.current.querySelector(`[data-pkg-id="${selectedPlayerPkgs[0]}"]`);
          if (activeEl) {
            scrollElementToCenter(playerScrollRef.current, activeEl as HTMLElement);
          }
        }
        const specId = selectedSpecialPkgs[0] || "none";
        if (tacticalScrollRef.current) {
          const activeEl = tacticalScrollRef.current.querySelector(`[data-pkg-id="${specId}"]`);
          if (activeEl) {
            scrollElementToCenter(tacticalScrollRef.current, activeEl as HTMLElement);
          }
        }
      }, 150);
    }
  }, [configStep, availablePackages]);

  useEffect(() => {
    if (!multiPackEnabled && configStep === "details") {
      if (selectedPlayerPkgs[0] && playerScrollRef.current) {
        const activeEl = playerScrollRef.current.querySelector(`[data-pkg-id="${selectedPlayerPkgs[0]}"]`);
        if (activeEl) {
          scrollElementToCenter(playerScrollRef.current, activeEl as HTMLElement);
        }
      }
      const specId = selectedSpecialPkgs[0] || "none";
      if (tacticalScrollRef.current) {
        const activeEl = tacticalScrollRef.current.querySelector(`[data-pkg-id="${specId}"]`);
        if (activeEl) {
          scrollElementToCenter(tacticalScrollRef.current, activeEl as HTMLElement);
        }
      }
    }
  }, [multiPackEnabled]);

  // Set initial focused items when packages load
  useEffect(() => {
    if (availablePackages.length) {
      const firstSpecial = availablePackages.find(p => p.type === "special" || p.type === "tactical");
      const firstPlayer = availablePackages.find(p => p.type === "player" || !p.type);
      if (firstSpecial) setFocusedSpecialId(firstSpecial.id);
      if (firstPlayer) setFocusedPlayerId(firstPlayer.id);
    }
  }, [availablePackages]);

  // Active Hosted Room (waiting state)
  const [myHostedRoom, setMyHostedRoom] = useState<MatchRoom | null>(null);
  const [showRoomSettings, setShowRoomSettings] = useState(false);

  const TEAM_VIBES = ["الفراعنة", "أسود الأطلس", "نجوم السامبا", "راقصو التانغو", "كتائب الأخضر", "الملكي"];

  // Fetch packages on mount
  useEffect(() => {
    const fetchAvailablePackages = async () => {
      try {
        const pkgs = await getPackages();
        if (pkgs && pkgs.length > 0) {
          setAvailablePackages(pkgs);
          const playerPkgs = pkgs.filter(p => p.type === "player").map(p => p.id);
          setSelectedPlayerPkgs(prev => prev.length > 0 ? prev : playerPkgs);
          const specialPkgs = pkgs.filter(p => p.type === "special").map(p => p.id);
          setSelectedSpecialPkgs(prev => prev.length > 0 ? prev : specialPkgs);
        } else {
          setAvailablePackages(MOCK_PACKAGES);
          setSelectedPlayerPkgs(prev => prev.length > 0 ? prev : MOCK_PACKAGES.filter(p => p.type === "player").map(p => p.id));
          setSelectedSpecialPkgs(prev => prev.length > 0 ? prev : MOCK_PACKAGES.filter(p => p.type === "special").map(p => p.id));
        }
      } catch (e) {
        console.error("Failed to load packages in Multilobby:", e);
        setAvailablePackages(MOCK_PACKAGES);
        setSelectedPlayerPkgs(prev => prev.length > 0 ? prev : MOCK_PACKAGES.filter(p => p.type === "player").map(p => p.id));
        setSelectedSpecialPkgs(prev => prev.length > 0 ? prev : MOCK_PACKAGES.filter(p => p.type === "special").map(p => p.id));
      }
    };
    fetchAvailablePackages();
  }, []);

  // Pre-populate settings from user defaults
  useEffect(() => {
    if (currentUser) {
      const usernameVal = currentUser.name || "مدرب تكتيكي";
      setRoomName(`ملعب الكابتن ${usernameVal}`);
      
      const defaults = currentUser.default_match_settings;
      if (defaults) {
        if (defaults.matchDuration !== undefined) setMatchDuration(defaults.matchDuration);
        if (defaults.gameMode !== undefined) setGameMode(defaults.gameMode);
        if (defaults.winningGoals !== undefined) setWinningGoals(defaults.winningGoals);
        if (defaults.totalRounds !== undefined) setTotalRounds(defaults.totalRounds);
        if (defaults.halfTimeBreakDuration !== undefined) setHalfTimeBreakDuration(defaults.halfTimeBreakDuration);
        if (defaults.legendPercentage !== undefined) setLegendPercentage(defaults.legendPercentage);
        if (defaults.maxDrawsPerTurn !== undefined) setMaxDrawsPerTurn(defaults.maxDrawsPerTurn);
        if (defaults.maxMovesPerTurn !== undefined) setMaxMovesPerTurn(defaults.maxMovesPerTurn);
        if (defaults.initialCardsCount !== undefined) setInitialCardsCount(defaults.initialCardsCount);
        if (defaults.legendBurnLimit !== undefined) setLegendBurnLimit(defaults.legendBurnLimit);
        if (defaults.maxBonusValue !== undefined) setMaxBonusValue(defaults.maxBonusValue);
        if (defaults.turnTimeLimit !== undefined) setTurnTimeLimit(defaults.turnTimeLimit);
        if (defaults.defenseTimeLimit !== undefined) setDefenseTimeLimit(defaults.defenseTimeLimit);
        if (defaults.selectedPlayerPkgs !== undefined && defaults.selectedPlayerPkgs.length > 0) {
          setSelectedPlayerPkgs(defaults.selectedPlayerPkgs);
        }
        if (defaults.selectedSpecialPkgs !== undefined && defaults.selectedSpecialPkgs.length > 0) {
          setSelectedSpecialPkgs(defaults.selectedSpecialPkgs);
        }
      }
    }
  }, [currentUser?.id]);

  // URL query parameter detection & Auto Join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      const code = roomParam.toUpperCase();
      setJoinCode(code);
      
      if (currentUser) {
        const performAutoJoin = async () => {
          setIsJoining(true);
          setLobbyError(null);
          try {
            const name = currentUser.name || "مبارز أونلاين";
            const vibe = currentUser.team_name || "الفراعنة";
            console.log(`Auto-joining room ${code} as player:`, name);
            const { room, error } = await supabaseService.joinRoom(code, currentUser.id, name, vibe);
            if (error) {
              if (isMounted.current) setLobbyError(error);
            } else if (room) {
              SoundEffects.playWhistle();
              onStartMultiplayerGame(room, "opponent");
            }
          } catch (err: any) {
            if (isMounted.current) setLobbyError(err.message || "فشل الانضمام التلقائي للغرفة");
          } finally {
            if (isMounted.current) setIsJoining(false);
          }
        };
        // Delay slightly to ensure layout and other subscriptions settle
        const timer = setTimeout(performAutoJoin, 550);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser?.id]);

  // Poll room check if hosting and waiting for opponent
  useEffect(() => {
    if (!myHostedRoom) return;

    const unsubscribe = supabaseService.subscribeToRoom(myHostedRoom.id, (updatedRoom) => {
      setMyHostedRoom(updatedRoom);
      
      // If someone joined, start the game immediately!
      if (updatedRoom.status === "playing" && updatedRoom.opponent_id) {
        SoundEffects.playWhistle();
        onStartMultiplayerGame(updatedRoom, "host");
        setMyHostedRoom(null); // Clear lobby tracking
      }
    });

    return () => {
      unsubscribe();
    };
  }, [myHostedRoom]);

  // Initial fetch of active rooms
  useEffect(() => {
    refreshLobbies();
  }, []);

  const refreshLobbies = async () => {
    setIsRefreshing(true);
    try {
      const rooms = await supabaseService.queryActiveRooms();
      console.log("Rooms fetched from database:", rooms);
      // Filter out stale local rooms (Safely converting BIGINT string/number to Number)
      const filtered = rooms.filter(r => {
        const lastAct = Number(r.last_activity) || 0;
        const diff = Date.now() - lastAct;
        return diff < 15 * 60 * 1000;
      });
      console.log("Filtered rooms:", filtered);
      if (isMounted.current) setActiveRooms(filtered);
    } catch (e) {
      console.error("Error refreshing lobbies:", e);
    } finally {
      if (isMounted.current) setIsRefreshing(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!currentUser) return;
    setIsCreating(true);
    setLobbyError(null);
    SoundEffects.playWhistle();

    try {
      const name = currentUser.name || "مدرب تكتيكي";
      const settingsPayload = {
        matchDuration,
        gameMode,
        winningGoals,
        totalRounds,
        halfTimeBreakDuration,
        legendPercentage,
        maxDrawsPerTurn,
        maxMovesPerTurn,
        initialCardsCount,
        legendBurnLimit,
        maxBonusValue,
        turnTimeLimit,
        defenseTimeLimit,
        warmupTimeLimit,
        selectedPlayerPkgs,
        selectedSpecialPkgs
      };

      const room = await supabaseService.createRoom(
        currentUser.id,
        name,
        selectedVibe,
        roomName.trim() || `${name} - مباراة مبارزة`,
        isPrivate,
        settingsPayload
      );
      if (isMounted.current) {
        setMyHostedRoom(room);
        setShowConfig(false); // Close settings panel
      }
    } catch (err: any) {
      if (isMounted.current) setLobbyError(err.message || "فشل إنشاء غرفة اللعب");
    } finally {
      if (isMounted.current) setIsCreating(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    if (!myHostedRoom) return;
    const currentSettings = myHostedRoom.game_state?.room_settings || {};
    const updatedSettings = {
      ...currentSettings,
      [key]: value
    };

    setMyHostedRoom(prev => prev ? {
      ...prev,
      game_state: {
        ...prev.game_state,
        room_settings: updatedSettings
      }
    } : null);

    try {
      await supabaseService.updateRoomSettings(myHostedRoom.id, updatedSettings);
    } catch (e) {
      console.error("Failed to update room settings in database:", e);
    }
  };

  const handleJoinByCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setLobbyError(null);

    try {
      const name = currentUser.name || "مبارز أونلاين";
      const vibe = currentUser.team_name || "الفراعنة";
      const { room, error } = await supabaseService.joinRoom(joinCode.trim(), currentUser.id, name, vibe);
      
      if (error) {
        if (isMounted.current) setLobbyError(error);
      } else if (room) {
        SoundEffects.playWhistle();
        onStartMultiplayerGame(room, "opponent");
      }
    } catch (err: any) {
      if (isMounted.current) setLobbyError(err.message || "فشل الانضمام لغرفة الخصم");
    } finally {
      if (isMounted.current) setIsJoining(false);
    }
  };

  const handleQuickJoin = async (room: MatchRoom) => {
    if (!currentUser) return;
    setIsJoining(true);
    setLobbyError(null);

    try {
      const name = currentUser.name || "مبارز أونلاين";
      const vibe = currentUser.team_name || "الفراعنة";
      const { room: joinedRoom, error } = await supabaseService.joinRoom(room.id, currentUser.id, name, vibe);
      
      if (error) {
        if (isMounted.current) setLobbyError(error);
      } else if (joinedRoom) {
        SoundEffects.playWhistle();
        onStartMultiplayerGame(joinedRoom, "opponent");
      }
    } catch (err: any) {
      if (isMounted.current) setLobbyError(err.message || "فشل الانضمام للغرفة");
    } finally {
      if (isMounted.current) setIsJoining(false);
    }
  };

  const renderTimingSettingsForm = (isWaitingScreen: boolean = false) => {
    const settingsSource = isWaitingScreen 
      ? (myHostedRoom?.game_state?.room_settings || {})
      : {
          matchDuration,
          gameMode,
          winningGoals,
          totalRounds,
          halfTimeBreakDuration,
          legendPercentage,
          maxBonusValue,
          turnTimeLimit,
          warmupTimeLimit
        };

    const getValue = (key: string, fallback: any) => {
      return settingsSource[key] !== undefined ? settingsSource[key] : fallback;
    };

    const updateValue = (key: string, value: any, setter: (v: any) => void) => {
      if (isWaitingScreen) {
        handleUpdateSetting(key, value);
      } else {
        setter(value);
      }
    };

    const currentDuration = getValue("matchDuration", 180);
    const currentGameMode = getValue("gameMode", "time");
    const currentGoals = getValue("winningGoals", 5);
    const currentRounds = getValue("totalRounds", 10);
    const currentHalfTimeBreak = getValue("halfTimeBreakDuration", 30);
    const currentLegendPct = getValue("legendPercentage", 30);
    const currentMaxBonus = getValue("maxBonusValue", 10);
    const currentTurnTimeLimit = getValue("turnTimeLimit", 60);
    const currentWarmupTimeLimit = getValue("warmupTimeLimit", 30);
    const currentDefenseTimeLimit = getValue("defenseTimeLimit", 30);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-right" dir="rtl">
          {/* Goals Target slider */}
          <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px]">
            <div className="flex items-center justify-between text-[9.5px] text-amber-450">
              <span className="font-extrabold">{currentGoals} أهداف</span>
              <span className="font-bold">أهداف الفوز:</span>
            </div>
            <input
              type="range" min={3} max={10} step={1} dir="ltr"
              value={currentGoals}
              onChange={(e) => updateValue("winningGoals", Number(e.target.value), setWinningGoals)}
              className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-1"
            />
          </div>

          {/* Game Mode */}
          <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px]">
            <label className="block text-[9.5px] text-slate-400 font-bold mb-1">نظام وقت المباراة:</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "time", label: "زمني ⏱️" },
                { id: "rounds", label: "جولات 🔁" }
              ].map((m) => {
                const isSelected = currentGameMode === m.id;
                return (
                  <button
                    key={m.id} type="button"
                    onClick={() => updateValue("gameMode", m.id, setGameMode)}
                    className={`py-0.5 rounded text-center font-extrabold text-[9px] cursor-pointer transition-all border ${
                      isSelected ? "border-amber-500 text-amber-455 bg-amber-950/20" : "border-white/5 bg-black/45 text-slate-400 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Dependent Options */}
          <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px]">
            {currentGameMode === "time" ? (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <label className="block text-[8px] text-slate-500 font-bold">الشوط:</label>
                  <select
                    value={currentDuration}
                    onChange={(e) => updateValue("matchDuration", Number(e.target.value), setMatchDuration)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded p-0.5 text-[8.5px] text-[#e0e0e0] font-bold text-right cursor-pointer"
                  >
                    <option value={90}>1.5 د</option>
                    <option value={180}>3 د</option>
                    <option value={240}>4 د</option>
                    <option value={300}>5 د</option>
                    <option value={420}>7 د</option>
                    <option value={600}>10 د</option>
                    <option value={900}>15 د</option>
                  </select>
                </div>
                <div className="space-y-0.5">
                  <label className="block text-[8px] text-slate-500 font-bold">الاستراحة:</label>
                  <select
                    value={currentHalfTimeBreak}
                    onChange={(e) => updateValue("halfTimeBreakDuration", Number(e.target.value), setHalfTimeBreakDuration)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded p-0.5 text-[8.5px] text-[#e0e0e0] font-bold text-right cursor-pointer"
                  >
                    <option value={30}>30 ث</option>
                    <option value={45}>45 ث</option>
                    <option value={60}>60 ث</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                <label className="block text-[8px] text-slate-500 font-bold">إجمالي عدد الجولات:</label>
                <select
                  value={currentRounds}
                  onChange={(e) => updateValue("totalRounds", Number(e.target.value), setTotalRounds)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded p-0.5 text-[8.5px] text-[#e0e0e0] font-bold text-right cursor-pointer"
                >
                  <option value={6}>6 جولات</option>
                  <option value={8}>8 جولات</option>
                  <option value={10}>10 جولات</option>
                  <option value={12}>12 جولة</option>
                  <option value={14}>14 جولة</option>
                  <option value={16}>16 جولة</option>
                  <option value={18}>18 جولة</option>
                  <option value={20}>20 جولة</option>
                  <option value={24}>24 جولة</option>
                  <option value={30}>30 جولة</option>
                </select>
              </div>
            )}
          </div>

          {/* Turn Time Limit Selector */}
          <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px]">
            <label className="block text-[9.5px] text-slate-400 font-bold mb-1">زمن الجولة الواحدة:</label>
            <select
              value={currentTurnTimeLimit}
              onChange={(e) => updateValue("turnTimeLimit", Number(e.target.value), setTurnTimeLimit)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded p-0.5 text-[8.5px] text-[#e0e0e0] font-bold text-right cursor-pointer"
            >
              <option value={0}>بدون حد زمني ♾️</option>
              <option value={45}>45 ثانية ⏱️</option>
              <option value={60}>60 ثانية ⏱️</option>
              <option value={90}>90 ثانية (1.5 د) ⏱️</option>
              <option value={120}>120 ثانية (2 د) ⏱️</option>
              <option value={180}>180 ثانية (3 د) ⏱️</option>
            </select>
          </div>

          {/* Warmup Time Limit Selector */}
          <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px]">
            <label className="block text-[9.5px] text-slate-400 font-bold mb-1">زمن التقسيم (التسخين):</label>
            <select
              value={currentWarmupTimeLimit}
              onChange={(e) => updateValue("warmupTimeLimit", Number(e.target.value), setWarmupTimeLimit)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded p-0.5 text-[8.5px] text-[#e0e0e0] font-bold text-right cursor-pointer"
            >
              <option value={15}>15 ثانية ⏱️</option>
              <option value={20}>20 ثانية ⏱️</option>
              <option value={30}>30 ثانية ⏱️</option>
              <option value={40}>40 ثانية ⏱️</option>
            </select>
          </div>

          {/* Defense Time Limit Selector */}
          <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px]">
            <label className="block text-[9.5px] text-slate-400 font-bold mb-1">زمن الدفاع:</label>
            <select
              value={currentDefenseTimeLimit}
              onChange={(e) => updateValue("defenseTimeLimit", Number(e.target.value), setDefenseTimeLimit)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded p-0.5 text-[8.5px] text-[#e0e0e0] font-bold text-right cursor-pointer"
            >
              <option value={0}>بدون حد زمني ♾️</option>
              <option value={15}>15 ثانية ⏱️</option>
              <option value={20}>20 ثانية ⏱️</option>
              <option value={30}>30 ثانية ⏱️</option>
              <option value={45}>45 ثانية ⏱️</option>
              <option value={60}>60 ثانية ⏱️</option>
            </select>
          </div>

          {/* Legend Pct & Booster Slider */}
          <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px] space-y-1">
            <div className="flex items-center justify-between text-[9px] text-amber-300">
              <span className="font-extrabold">{currentLegendPct}%</span>
              <span className="font-bold">نسبة الأساطير:</span>
            </div>
            <input
              type="range" min={0} max={100} step={5} dir="ltr"
              value={currentLegendPct}
              onChange={(e) => updateValue("legendPercentage", Number(e.target.value), setLegendPercentage)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center justify-between text-[9px] text-emerald-400">
              <span className="font-extrabold">+{currentMaxBonus}</span>
              <span className="font-bold">حد المعزز:</span>
            </div>
            <input
              type="range" min={0} max={10} step={1} dir="ltr"
              value={currentMaxBonus}
              onChange={(e) => updateValue("maxBonusValue", Number(e.target.value), setMaxBonusValue)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderRulesSettingsForm = (isWaitingScreen: boolean = false) => {
    const settingsSource = isWaitingScreen 
      ? (myHostedRoom?.game_state?.room_settings || {})
      : {
          maxDrawsPerTurn,
          maxMovesPerTurn,
          initialCardsCount,
          legendBurnLimit
        };

    const getValue = (key: string, fallback: any) => {
      return settingsSource[key] !== undefined ? settingsSource[key] : fallback;
    };

    const updateValue = (key: string, value: any, setter: (v: any) => void) => {
      if (isWaitingScreen) {
        handleUpdateSetting(key, value);
      } else {
        setter(value);
      }
    };

    const currentMaxDraws = getValue("maxDrawsPerTurn", 2);
    const currentMaxMoves = getValue("maxMovesPerTurn", 3);
    const currentInitialCards = getValue("initialCardsCount", 5);
    const currentLegendBurn = getValue("legendBurnLimit", 2);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-right" dir="rtl">
          {/* Turn parameters (Draws / Moves) */}
          <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px] space-y-1">
            <div className="flex items-center justify-between text-[9px] text-emerald-400">
              <span className="font-extrabold">{currentMaxDraws} سحبات</span>
              <span className="font-bold">السحبات/الدور:</span>
            </div>
            <input
              type="range" min={1} max={5} step={1} dir="ltr"
              value={currentMaxDraws}
              onChange={(e) => updateValue("maxDrawsPerTurn", Number(e.target.value), setMaxDrawsPerTurn)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex items-center justify-between text-[9px] text-emerald-400">
              <span className="font-extrabold">{currentMaxMoves} حركات</span>
              <span className="font-bold">حركات الدور:</span>
            </div>
            <input
              type="range" min={1} max={5} step={1} dir="ltr"
              value={currentMaxMoves}
              onChange={(e) => updateValue("maxMovesPerTurn", Number(e.target.value), setMaxMovesPerTurn)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Legend Burn & Initial cards count */}
          <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px] space-y-1">
            <div className="flex items-center justify-between text-[9px] text-amber-400">
              <span className="font-extrabold">{currentLegendBurn} كروت</span>
              <span className="font-bold">حرق الأسطورة:</span>
            </div>
            <input
              type="range" min={0} max={4} step={1} dir="ltr"
              value={currentLegendBurn}
              onChange={(e) => updateValue("legendBurnLimit", Number(e.target.value), setLegendBurnLimit)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center justify-between text-[9px] text-emerald-400">
              <span className="font-extrabold">{currentInitialCards} أوراق</span>
              <span className="font-bold">أوراق البداية:</span>
            </div>
            <input
              type="range" min={3} max={7} step={1} dir="ltr"
              value={currentInitialCards}
              onChange={(e) => updateValue("initialCardsCount", Number(e.target.value), setInitialCardsCount)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 relative" id="multiplayer_lobby_container">
      
      {/* 1. ANONYMOUS SIMULATION ADVISORY (If not online supabase) */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-right text-[11px] text-amber-300 flex items-start gap-2.5 relative overflow-hidden backdrop-blur-md">
          <AlertCircle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-black text-amber-400 block mb-0.5">وضع التجربة المحلي نشّط ⚡</span>
            لم تقم بربط Supabase بعد. لقد دمجنا محاكي ذكي يتيح لك فتح نافذة متصفح أخرى وتجربة إنشاء الغرف واللعب الكامل مع صديق وهمي مباشرة!
          </div>
        </div>
      )}

      {/* 2. DOCK ACTIONS: CREATE ROOM vs JOIN CODE */}
      <div className="flex flex-row items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-1.5 w-full">
        {/* CREATE ROOM BUTTON (SMALL) */}
        <button
          onClick={() => { SoundEffects.playWhistle(); setShowConfig(true); }}
          className="px-3 py-1.5 bg-linear-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-extrabold rounded-lg text-[10px] cursor-pointer flex items-center gap-1 transition-all shadow-md shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">إنشاء ملعب</span>
          <span className="sm:hidden">إنشاء</span>
        </button>

        {/* JOIN BY CODE FORM (LARGER INPUT FIELD) */}
        <form onSubmit={handleJoinByCode} className="flex-1 flex gap-1.5 items-center justify-end" dir="rtl">
          <input
            type="text"
            maxLength={6}
            placeholder="أدخل كود الغرفة المكون من 6 رموز..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
            className="flex-1 text-right px-3 py-1.5 rounded-lg bg-black/50 border border-white/5 focus:outline-none focus:border-emerald-500 text-[10px] font-bold text-white shadow-inner"
          />
          <button
            type="submit"
            disabled={isJoining || !joinCode}
            className="px-4 py-1.5 bg-emerald-650 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-black text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-md shrink-0"
          >
            <span>انضمام ⚔️</span>
          </button>
        </form>
      </div>
      {lobbyError && (
        <div className="text-[9px] text-red-400 font-extrabold text-right -mt-4 pr-2">⚠️ {lobbyError}</div>
      )}

      {/* 3. ACTIVE PUBLIC ROOMS PITCH LIST */}
      <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 px-3 text-right" id="lobby_active_pitches">
        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-2">
          <button
            onClick={refreshLobbies}
            disabled={isRefreshing}
            className="py-0.5 px-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all text-[9px] flex items-center gap-1 cursor-pointer font-bold"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>تحديث الساحة</span>
          </button>
          
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-white">الساحة العامة للمباريات الحية 🌐</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {activeRooms.length === 0 ? (
          <div className="py-4 text-center text-[9px] text-slate-500">
            {isRefreshing ? "جاري كشّف الغرف..." : "لا توجد ملاعب نشطة حالياً. أنشئ ملعبك الآن! ⚽"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[100px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-800/40">
            {activeRooms.map((room) => (
              <div
                key={room.id}
                className="p-1.5 px-2 bg-[#060806] border border-white/5 rounded-lg flex items-center justify-between hover:border-emerald-500/20 transition-all shadow-sm group"
              >
                <button
                  onClick={() => handleQuickJoin(room)}
                  disabled={isJoining}
                  className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/20 hover:border-emerald-500/50 text-emerald-350 text-[9px] font-black rounded cursor-pointer transition-colors"
                >
                  تحدي ⚔️
                </button>

                <div className="text-right truncate flex-1 pl-2">
                  <div className="text-[9.5px] font-bold text-white truncate">{room.room_name || room.host_name}</div>
                  <div className="text-[8px] text-slate-400 font-medium flex items-center justify-end gap-1 mt-0.5">
                    <span>{room.host_vibe}</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="font-mono bg-white/5 px-1 py-0.2 rounded text-white text-[7.5px] font-bold">#{room.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. LIVE CONFIGURATION FULL PAGE DRAWER */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020503] flex flex-col justify-between overflow-hidden"
          >
            {/* Background art */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-10">
              <div className="absolute inset-4 border border-white/20 rounded-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-white/25" />
              <div className="absolute top-1/2 left-4 right-4 h-px bg-white/25" />
            </div>

            {/* HEADER */}
            <header className="relative z-10 w-full flex items-center justify-between px-6 py-2 bg-black/60 border-b border-white/10 backdrop-blur-md shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (configStep === "details") {
                    setShowConfig(false);
                  } else if (configStep === "packages") {
                    setConfigStep("details");
                  } else {
                    setConfigStep("packages");
                  }
                }}
                className="px-3.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9.5px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>
              <h2 className="text-xs font-black text-amber-400 flex items-center gap-1.5 justify-end">
                <span>تخصيص وإنشاء غرفة المباراة أونلاين 🏟️</span>
                <Settings className="w-3.5 h-3.5" />
              </h2>
            </header>

            {/* STEP PROGRESS INDICATOR */}
            <div className="w-full max-w-xl mx-auto px-6 pt-3.5 relative z-10" dir="rtl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-emerald-400 font-extrabold">
                  {configStep === "details" && "مرحلة 1 من 3: تفاصيل الغرفة وتحديد الباقات 🏟️"}
                  {configStep === "packages" && "مرحلة 2 من 3: زمن المباراة والجولات ⏱️"}
                  {configStep === "rules" && "مرحلة 3 من 3: الحركات والسحبات وقوانين الملعب ⚙️"}
                </span>
                <span className="text-[9px] text-slate-500 font-bold">إنشاء الملعب</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-1">
                <div className={`h-full flex-1 rounded-full transition-all duration-300 ${configStep === "details" || configStep === "packages" || configStep === "rules" ? "bg-amber-500" : "bg-white/5"}`} />
                <div className={`h-full flex-1 rounded-full transition-all duration-300 ${configStep === "packages" || configStep === "rules" ? "bg-amber-500" : "bg-white/5"}`} />
                <div className={`h-full flex-1 rounded-full transition-all duration-300 ${configStep === "rules" ? "bg-amber-500" : "bg-white/5"}`} />
              </div>
            </div>

            {/* MAIN CONTENT STEP SWITCHER */}
            <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full p-4 overflow-y-auto" dir="rtl">
              {configStep === "details" && (
                <div className="max-w-xl mx-auto w-full space-y-3.5 py-1" dir="rtl">
                  {/* Room Name & Privacy Switcher */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Room Name */}
                    <div className="space-y-1 text-right">
                      <label className="block text-[10px] text-slate-400 font-bold">اسم الغرفة / الملعب:</label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="اسم الملعب..."
                        className="w-full px-3 py-2 rounded-xl bg-black/65 border border-white/10 text-white text-right text-xs focus:outline-none focus:border-amber-500 font-bold shadow-inner"
                      />
                    </div>

                    {/* Privacy Switcher */}
                    <div className="flex items-center justify-between bg-black/45 px-3 py-1.5 rounded-xl border border-white/5 text-right self-end">
                      <button
                        type="button"
                        onClick={() => setIsPrivate(!isPrivate)}
                        className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 rounded-lg text-[9.5px] font-bold cursor-pointer transition-all"
                      >
                        تغيير الخصوصية
                      </button>
                      <span className="text-[10px] text-[#e0e0e0]/70 flex items-center gap-1.5">
                        {isPrivate ? (
                          <>
                            <span>غرفة خاصة (بالدعوة فقط) 🔒</span>
                            <Shield className="w-3.5 h-3.5 text-amber-500" />
                          </>
                        ) : (
                          <>
                            <span>غرفة عامة (تظهر بالساحة) 🌐</span>
                            <Globe className="w-3.5 h-3.5 text-emerald-400" />
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Switch multi-packages */}
                  <div className="flex items-center justify-between mb-1 px-1 pt-1.5 border-t border-white/5">
                    <span className="text-[8px] text-slate-500 font-bold leading-normal">
                      قم بتفعيل الباقات المتعددة لدمج واختيار أكثر من باقة للمباراة
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        SoundEffects.playCardDraw();
                        const nextVal = !multiPackEnabled;
                        setMultiPackEnabled(nextVal);
                        if (!nextVal) {
                          if (focusedPlayerId) setSelectedPlayerPkgs([focusedPlayerId]);
                          const specId = focusedSpecialId === "none" ? "none" : focusedSpecialId;
                          setSelectedSpecialPkgs(specId === "none" ? [] : [specId]);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                        multiPackEnabled
                          ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                          : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <span className="text-[8.5px] font-bold">باقات متعددة 🔀</span>
                      <div className={`w-5 h-3 rounded-full bg-slate-800 p-0.5 flex transition-colors relative ${multiPackEnabled ? "bg-emerald-600 justify-end" : "justify-start"}`}>
                        <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
                      </div>
                    </button>
                  </div>

                  {/* Snap wheel columns */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Player Packages (Right side) */}
                    <div className="flex flex-col">
                      <h3 className="text-[9.5px] font-black text-slate-400 mb-1 text-right">باقات اللاعبين والفرق ⚽</h3>
                      <div className="relative h-[115px] sm:h-[130px] bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleNavigate("up", true)}
                          className="absolute top-0.5 left-1/2 -translate-x-1/2 z-30 bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/10 rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-90"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>

                        <div className="absolute top-[32px] sm:top-[40px] left-1.5 right-1.5 h-[40px] border-y border-emerald-500/40 bg-emerald-500/5 pointer-events-none z-20 rounded-md" />
                        
                        <div
                          ref={playerScrollRef}
                          onScroll={handlePlayerScroll}
                          className="h-full overflow-y-auto snap-y snap-mandatory py-[32px] sm:py-[40px] scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
                        >
                          {(availablePackages.length > 0 ? availablePackages.filter(p => p.type === "player" || !p.type) : MOCK_PACKAGES.filter(p => p.type === "player")).map((pkg) => {
                            const isSelected = selectedPlayerPkgs.includes(pkg.id);
                            const isFocused = focusedPlayerId === pkg.id;
                            return (
                              <div
                                key={pkg.id}
                                data-pkg-id={pkg.id}
                                onClick={(e) => handleSelectPlayerPkg(pkg.id, e.currentTarget)}
                                className={`snap-center h-[40px] flex items-center justify-between px-3 cursor-pointer transition-all duration-300 ${
                                  isFocused
                                    ? "scale-105 font-black text-white bg-white/5"
                                    : "scale-95 font-medium text-slate-500 opacity-60 hover:opacity-80"
                                }`}
                                style={isFocused ? { textShadow: "0 0 10px rgba(16,185,129,0.4)" } : undefined}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{pkg.image || "⚽"}</span>
                                  <span className="text-[10px] truncate max-w-[85px] text-right">{pkg.name}</span>
                                </div>
                                
                                {multiPackEnabled ? (
                                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                                      : "border-white/20 bg-black/40"
                                  }`}>
                                    {isSelected && <span className="text-[9px] font-black">✓</span>}
                                  </div>
                                ) : (
                                  isFocused && (
                                    <span className="text-[10px] text-emerald-400">●</span>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleNavigate("down", true)}
                          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 z-30 bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/10 rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-90"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Tactical Packages (Left side) */}
                    <div className="flex flex-col">
                      <h3 className="text-[9.5px] font-black text-slate-400 mb-1 text-right">باقات الكروت التكتيكية 🃏</h3>
                      <div className="relative h-[115px] sm:h-[130px] bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleNavigate("up", false)}
                          className="absolute top-0.5 left-1/2 -translate-x-1/2 z-30 bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/10 rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-90"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>

                        <div className="absolute top-[32px] sm:top-[40px] left-1.5 right-1.5 h-[40px] border-y border-amber-500/40 bg-amber-500/5 pointer-events-none z-20 rounded-md" />
                        
                        <div
                          ref={tacticalScrollRef}
                          onScroll={handleTacticalScroll}
                          className="h-full overflow-y-auto snap-y snap-mandatory py-[32px] sm:py-[40px] scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
                        >
                          {[
                            { id: "none", name: "بدون كروت تكتيكية", type: "special", image: "🚫", description: "لعب مباراة نظيفة بدون تكتيكات" },
                            ...(availablePackages.length > 0 ? availablePackages.filter(p => p.type === "special" || p.type === "tactical") : MOCK_PACKAGES.filter(p => p.type === "special"))
                          ].map((pkg) => {
                            const isSelected = selectedSpecialPkgs.includes(pkg.id);
                            const isFocused = focusedSpecialId === pkg.id;
                            return (
                              <div
                                key={pkg.id}
                                data-pkg-id={pkg.id}
                                onClick={(e) => handleSelectSpecialPkg(pkg.id, e.currentTarget)}
                                className={`snap-center h-[40px] flex items-center justify-between px-3 cursor-pointer transition-all duration-300 ${
                                  isFocused
                                    ? "scale-105 font-black text-white bg-white/5"
                                    : "scale-95 font-medium text-slate-500 opacity-60 hover:opacity-80"
                                }`}
                                style={isFocused ? { textShadow: "0 0 10px rgba(245,158,11,0.4)" } : undefined}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{pkg.image || "🃏"}</span>
                                  <span className="text-[10px] truncate max-w-[85px] text-right">{pkg.name}</span>
                                </div>
                                
                                {multiPackEnabled ? (
                                  pkg.id !== "none" && (
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                      isSelected
                                        ? "border-amber-500 bg-amber-500/20 text-amber-400"
                                        : "border-white/20 bg-black/40"
                                    }`}>
                                      {isSelected && <span className="text-[9px] font-black">✓</span>}
                                    </div>
                                  )
                                ) : (
                                  isFocused && (
                                    <span className="text-[10px] text-amber-400">●</span>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleNavigate("down", false)}
                          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 z-30 bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/10 rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-90"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Previews */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {/* Player Preview */}
                    <div>
                      {(() => {
                        const list = availablePackages.length > 0 ? availablePackages.filter(p => p.type === "player" || !p.type) : MOCK_PACKAGES.filter(p => p.type === "player");
                        const focusedPlayer = list.find(p => p.id === focusedPlayerId);
                        return focusedPlayer ? (
                          <div className="p-2 border border-white/10 bg-black/45 rounded-xl min-h-[50px] flex flex-col justify-center text-right shadow-md">
                            <div className="flex items-center gap-1.5 mb-0.5 justify-end">
                              <span className="text-[10px] font-black text-white">{focusedPlayer.name}</span>
                              <span className="text-sm">{focusedPlayer.image || "⚽"}</span>
                            </div>
                            <p className="text-[8px] text-slate-400 leading-tight block truncate max-w-[220px]">
                              {focusedPlayer.description || "باقة لاعبين وفرق كاملة للمباراة."}
                            </p>
                          </div>
                        ) : (
                          <div className="p-2 border border-white/5 bg-black/20 rounded-xl min-h-[50px] flex items-center justify-center text-[9px] text-slate-500 text-center">
                            يرجى تحديد باقة
                          </div>
                        );
                      })()}
                    </div>

                    {/* Tactical Preview */}
                    <div>
                      {(() => {
                        const list = [
                          { id: "none", name: "بدون كروت تكتيكية", type: "special", image: "🚫", description: "لعب مباراة نظيفة بدون تكتيكات" },
                          ...(availablePackages.length > 0 ? availablePackages.filter(p => p.type === "special" || p.type === "tactical") : MOCK_PACKAGES.filter(p => p.type === "special"))
                        ];
                        const focusedSpecial = list.find(p => p.id === focusedSpecialId);
                        return focusedSpecialId === "none" ? (
                          <div className="p-2 border border-white/10 bg-black/45 rounded-xl min-h-[50px] flex flex-col justify-center text-center shadow-md">
                            <span className="text-sm">🚫</span>
                            <span className="text-[9.5px] font-black text-amber-400">بدون كروت تكتيكية</span>
                            <span className="text-[8px] text-slate-400 leading-tight mt-0.5">لعب مباراة نظيفة بدون تكتيكات</span>
                          </div>
                        ) : focusedSpecial ? (
                          <div className="p-2 border border-white/10 bg-black/45 rounded-xl min-h-[50px] flex flex-col justify-center text-right shadow-md">
                            <div className="flex items-center gap-1.5 mb-0.5 justify-end">
                              <span className="text-[10px] font-black text-white">{focusedSpecial.name}</span>
                              <span className="text-sm">{focusedSpecial.image || "🃏"}</span>
                            </div>
                            <p className="text-[8px] text-slate-400 leading-tight block truncate max-w-[220px]">
                              {focusedSpecial.description || "مجموعة كروت التكتيكات الخاصة."}
                            </p>
                          </div>
                        ) : (
                          <div className="p-2 border border-white/5 bg-black/20 rounded-xl min-h-[50px] flex items-center justify-center text-[9px] text-slate-500 text-center">
                            لم يتم تحديد باقة تكتيكات
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {configStep === "packages" && (
                <div className="max-w-2xl mx-auto w-full space-y-3 py-1" dir="rtl">
                  {renderTimingSettingsForm(false)}
                </div>
              )}

              {configStep === "rules" && (
                <div className="max-w-2xl mx-auto w-full space-y-3 py-1" dir="rtl">
                  {renderRulesSettingsForm(false)}
                </div>
              )}
            </main>

            {/* FOOTER ACTIONS */}
            <footer className="relative z-10 w-full p-4 bg-black/60 border-t border-white/10 backdrop-blur-md shrink-0 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  if (configStep === "details") {
                    setShowConfig(false);
                  } else if (configStep === "packages") {
                    setConfigStep("details");
                  } else {
                    setConfigStep("packages");
                  }
                }}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
              >
                السابق
              </button>

              <button
                type="button"
                disabled={configStep === "details" && selectedPlayerPkgs.length === 0}
                onClick={() => {
                  SoundEffects.playCardDraw();
                  if (configStep === "details") {
                    setConfigStep("packages");
                  } else if (configStep === "packages") {
                    setConfigStep("rules");
                  } else {
                    handleCreateRoom();
                  }
                }}
                className={`px-7 py-2 text-black font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-lg ${
                  configStep === "details" && selectedPlayerPkgs.length === 0
                    ? "bg-slate-700 opacity-40 cursor-not-allowed text-slate-400"
                    : configStep === "rules"
                      ? "bg-amber-500 hover:bg-amber-450"
                      : "bg-emerald-500 hover:bg-emerald-450"
                }`}
              >
                {isCreating
                  ? "جاري إنشاء الملعب..."
                  : configStep === "rules"
                    ? "تأكيد وبدء الغرفة 🏟️"
                    : "التالي"}
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. DEDICATED ROOM WAITING PANEL (Host Screen) */}
      <AnimatePresence>
        {myHostedRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#020503] flex flex-col justify-between overflow-y-auto"
            id="multiplayer_dedicated_room_overlay"
          >
            {/* Background art */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-10">
              <div className="absolute inset-4 border border-white/20 rounded-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-white/25" />
              <div className="absolute top-1/2 left-4 right-4 h-px bg-white/25" />
            </div>

            {/* HEADER */}
            <header className="relative z-10 w-full flex items-center justify-between px-6 py-3 bg-black/60 border-b border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[10px] font-black tracking-widest text-amber-400">WAITING LOBBY...</span>
              </div>
              <h2 className="text-sm font-black text-white truncate max-w-[200px]">
                {myHostedRoom.room_name}
              </h2>
            </header>

            {/* MIDDLE: THE PVP MATCHUP */}
            <main className="relative z-10 flex-1 flex flex-col justify-center px-4 max-w-lg mx-auto w-full py-4 gap-6">
              
              {/* VS matchup box */}
              <div className="grid grid-cols-7 gap-1 items-center">
                {/* Left Card: Host (Me) */}
                <div className="col-span-3 flex flex-col items-center bg-[#0a0d0a] border-2 border-emerald-500/20 p-4 rounded-3xl text-center shadow-lg min-h-[140px] justify-between">
                  <div className="text-4xl">👑</div>
                  <div>
                    <h4 className="text-xs font-black text-white">{myHostedRoom.host_name}</h4>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">{myHostedRoom.host_vibe}</p>
                  </div>
                  <div className="mt-1 inline-block text-[8px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                    مستضيف الملعب
                  </div>
                </div>

                {/* VS Middle Circle */}
                <div className="col-span-1 flex flex-col items-center justify-center">
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-linear-to-tr from-amber-500 to-yellow-400 flex items-center justify-center font-black text-sm text-black shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-black z-10"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  >
                    VS
                  </motion.div>
                </div>

                {/* Right Card: Opponent */}
                <div className="col-span-3 flex flex-col items-center bg-[#0d0a0d] border-2 border-dashed border-slate-700/30 p-4 rounded-3xl text-center min-h-[140px] justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent pointer-events-none opacity-50" />
                  
                  {myHostedRoom.opponent_id ? (
                    <>
                      <div className="text-4xl animate-bounce">⚔️</div>
                      <div>
                        <h4 className="text-xs font-black text-white">{myHostedRoom.opponent_name}</h4>
                        <p className="text-[8px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">{myHostedRoom.opponent_vibe}</p>
                      </div>
                      <div className="mt-1 inline-block text-[8px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                        الخصم المنافس
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                      <div>
                        <span className="text-[10px] font-black text-amber-400/80 animate-pulse">جاري البحث عن منافس...</span>
                        <p className="text-[7.5px] text-slate-500 leading-normal mt-1 pr-1 pl-1">
                          شارك الكود أو الرابط لدخول صديقك فوراً
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    </>
                  )}
                </div>
              </div>

              {/* Share Code panel */}
              <div className="bg-black/55 border border-white/10 rounded-2xl p-4 text-center space-y-3.5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">رمز غرفة المباراة ⚽</span>
                  <div className="text-3xl font-mono font-black text-white tracking-widest bg-[#060807] py-2.5 rounded-xl border border-white/5 inline-block px-8 relative shadow-inner">
                    {myHostedRoom.id}
                  </div>
                </div>

                <div className="flex gap-2 max-w-xs mx-auto">
                  <button
                    onClick={async () => {
                      const link = `${window.location.origin}${window.location.pathname}?room=${myHostedRoom.id}`;
                      const success = await copyToClipboard(link);
                      SoundEffects.playWhistle();
                      if (success) {
                        setToast({ message: "تم نسخ رابط الغرفة بنجاح! ارسله لمنافسك 🔗", type: "success" });
                      } else {
                        setToast({ message: `فشل النسخ التلقائي. الرابط: ${link}`, type: "error" });
                      }
                    }}
                    className="flex-1 py-2 bg-amber-500 text-black rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-amber-450 transition-all cursor-pointer"
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>رابط الغرفة 🔗</span>
                  </button>
                  <button
                    onClick={async () => {
                      const success = await copyToClipboard(myHostedRoom.id);
                      SoundEffects.playWhistle();
                      if (success) {
                        setToast({ message: "تم نسخ رمز الغرفة بنجاح! 📋", type: "success" });
                      } else {
                        setToast({ message: `فشل النسخ التلقائي. الرمز: ${myHostedRoom.id}`, type: "error" });
                      }
                    }}
                    className="flex-1 py-2 bg-white/5 text-white border border-white/10 rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الرمز 📋</span>
                  </button>
                </div>
              </div>

              {/* COLLAPSIBLE LIVE SETTINGS */}
              <div className="border border-white/10 rounded-2xl bg-black/40 overflow-hidden shadow-lg">
                <button
                  type="button"
                  onClick={() => setShowRoomSettings(!showRoomSettings)}
                  className="w-full p-3 px-4 flex items-center justify-between text-xs font-black text-amber-400 bg-black/60 border-b border-white/5 select-none"
                >
                  <span className="text-[10px] transition-transform text-slate-500" style={{ transform: showRoomSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  <div className="flex items-center gap-1.5">
                    <span>قوانين وإشراف المباراة النشط</span>
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                </button>

                <AnimatePresence>
                  {showRoomSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 overflow-y-auto max-h-[220px] scrollbar-thin scrollbar-thumb-amber-800/40 bg-black/30"
                    >
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-black text-amber-400 mb-2 border-b border-white/5 pb-1 text-right">⏱️ إعدادات زمن المباراة والجولات</h4>
                          {renderTimingSettingsForm(true)}
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-emerald-400 mb-2 border-b border-white/5 pb-1 text-right">⚙️ الحركات والسحبات وقوانين الملعب</h4>
                          {renderRulesSettingsForm(true)}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </main>

            {/* FOOTER: CANCEL BUTTON */}
            <footer className="relative z-10 p-4 border-t border-white/10 bg-black/40 text-center shrink-0">
              <button
                onClick={() => { SoundEffects.playCardDraw(); setMyHostedRoom(null); }}
                className="py-2.5 px-8 bg-red-650 hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <span>إلغاء ومغادرة الملعب ❌</span>
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <GameToast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
