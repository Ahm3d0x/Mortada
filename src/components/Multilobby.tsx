/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, Key, RefreshCw, Sparkles, Trophy, PlusCircle, Gamepad2, 
  AlertCircle, PlayCircle, Copy, Link, Globe, Shield, Settings, 
  Check, ArrowLeft, ArrowRight, User, Eye, EyeOff, X
} from "lucide-react";
import { supabaseService, MatchRoom, isSupabaseConfigured } from "../lib/supabase";
import { SoundEffects } from "../utils/sounds";
import { gameAuth } from "../lib/gameAuth";

interface MultilobbyProps {
  onStartMultiplayerGame: (room: MatchRoom, role: "host" | "opponent") => void;
}

export default function Multilobby({ onStartMultiplayerGame }: MultilobbyProps) {
  const currentUser = gameAuth.getCurrentUser();

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

  // Active Hosted Room (waiting state)
  const [myHostedRoom, setMyHostedRoom] = useState<MatchRoom | null>(null);
  const [showRoomSettings, setShowRoomSettings] = useState(false);

  const TEAM_VIBES = ["الفراعنة", "أسود الأطلس", "نجوم السامبا", "راقصو التانغو", "كتائب الأخضر", "الملكي"];

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
      }
    }
  }, [currentUser?.id]);

  // URL query parameter detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setJoinCode(roomParam.toUpperCase());
    }
  }, []);

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
      // Filter out stale local rooms
      setActiveRooms(rooms.filter(r => Date.now() - r.last_activity < 15 * 60 * 1000));
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
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
        maxBonusValue
      };

      const room = await supabaseService.createRoom(
        currentUser.id,
        name,
        selectedVibe,
        roomName.trim() || `${name} - مباراة مبارزة`,
        isPrivate,
        settingsPayload
      );
      setMyHostedRoom(room);
      setShowConfig(false); // Close settings panel
    } catch (err: any) {
      setLobbyError(err.message || "فشل إنشاء غرفة اللعب");
    } finally {
      setIsCreating(false);
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
        setLobbyError(error);
      } else if (room) {
        SoundEffects.playWhistle();
        onStartMultiplayerGame(room, "opponent");
      }
    } catch (err: any) {
      setLobbyError(err.message || "فشل الانضمام لغرفة الخصم");
    } finally {
      setIsJoining(false);
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
        setLobbyError(error);
      } else if (joinedRoom) {
        SoundEffects.playWhistle();
        onStartMultiplayerGame(joinedRoom, "opponent");
      }
    } catch (err: any) {
      setLobbyError(err.message || "فشل الانضمام للغرفة");
    } finally {
      setIsJoining(false);
    }
  };

  const renderSettingsForm = (isWaitingScreen: boolean = false) => {
    const settingsSource = isWaitingScreen 
      ? (myHostedRoom?.game_state?.room_settings || {})
      : {
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
          maxBonusValue
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
    const currentMaxDraws = getValue("maxDrawsPerTurn", 2);
    const currentMaxMoves = getValue("maxMovesPerTurn", 3);
    const currentInitialCards = getValue("initialCardsCount", 5);
    const currentLegendBurn = getValue("legendBurnLimit", 2);
    const currentMaxBonus = getValue("maxBonusValue", 10);

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-right" dir="rtl">
        {/* Goals Target slider */}
        <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px]">
          <div className="flex items-center justify-between text-[9.5px] text-amber-450">
            <span className="font-extrabold">{currentGoals} أهداف</span>
            <span className="font-bold">أهداف الفوز:</span>
          </div>
          <input
            type="range" min={3} max={10} step={1}
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
                    isSelected ? "border-amber-500 text-amber-450 bg-amber-950/20" : "border-white/5 bg-black/45 text-slate-400 hover:text-white"
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
                  <option value={180}>3 د</option>
                  <option value={300}>5 د</option>
                  <option value={600}>10 د</option>
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
              </select>
            </div>
          )}
        </div>

        {/* Legend Pct & Booster Slider */}
        <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px] space-y-1">
          <div className="flex items-center justify-between text-[9px] text-amber-300">
            <span className="font-extrabold">{currentLegendPct}%</span>
            <span className="font-bold">نسبة الأساطير:</span>
          </div>
          <input
            type="range" min={0} max={100} step={10}
            value={currentLegendPct}
            onChange={(e) => updateValue("legendPercentage", Number(e.target.value), setLegendPercentage)}
            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex items-center justify-between text-[9px] text-emerald-400">
            <span className="font-extrabold">+{currentMaxBonus}</span>
            <span className="font-bold">حد المعزز:</span>
          </div>
          <input
            type="range" min={0} max={10} step={1}
            value={currentMaxBonus}
            onChange={(e) => updateValue("maxBonusValue", Number(e.target.value), setMaxBonusValue)}
            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Turn parameters (Draws / Moves) */}
        <div className="bg-black/45 border border-white/5 p-2 rounded-xl flex flex-col justify-between min-h-[58px] space-y-1">
          <div className="flex items-center justify-between text-[9px] text-emerald-400">
            <span className="font-extrabold">{currentMaxDraws} سحبات</span>
            <span className="font-bold">السحبات/الدور:</span>
          </div>
          <input
            type="range" min={1} max={5} step={1}
            value={currentMaxDraws}
            onChange={(e) => updateValue("maxDrawsPerTurn", Number(e.target.value), setMaxDrawsPerTurn)}
            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex items-center justify-between text-[9px] text-emerald-400">
            <span className="font-extrabold">{currentMaxMoves} حركات</span>
            <span className="font-bold">حركات الدور:</span>
          </div>
          <input
            type="range" min={1} max={5} step={1}
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
            type="range" min={0} max={4} step={1}
            value={currentLegendBurn}
            onChange={(e) => updateValue("legendBurnLimit", Number(e.target.value), setLegendBurnLimit)}
            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex items-center justify-between text-[9px] text-emerald-400">
            <span className="font-extrabold">{currentInitialCards} أوراق</span>
            <span className="font-bold">أوراق البداية:</span>
          </div>
          <input
            type="range" min={3} max={7} step={1}
            value={currentInitialCards}
            onChange={(e) => updateValue("initialCardsCount", Number(e.target.value), setInitialCardsCount)}
            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
          />
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
            className="fixed inset-0 z-50 bg-[#020503] flex flex-col justify-between overflow-y-auto"
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
                onClick={() => setShowConfig(false)}
                className="px-3.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9.5px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة للساحة</span>
              </button>
              <h2 className="text-xs font-black text-amber-400 flex items-center gap-1.5 justify-end">
                <span>تخصيص وإنشاء غرفة المباراة أونلاين 🏟️</span>
                <Settings className="w-3.5 h-3.5" />
              </h2>
            </header>

            {/* MAIN CONTENT SPLIT GRID */}
            <main className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 p-4 max-w-5xl mx-auto w-full items-start overflow-y-auto" dir="rtl">
              {/* Right Column: Room details & Actions (span 2) */}
              <div className="md:col-span-2 space-y-3 w-full bg-black/45 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                <h3 className="text-[11px] font-black text-white border-b border-white/5 pb-2 mb-1 text-right">تفاصيل الغرفة والخصوصية 🏟️</h3>
                
                {/* Room Name */}
                <div className="space-y-1">
                  <label className="block text-[9.5px] text-slate-400 font-bold text-right">اسم الغرفة / الملعب:</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="اسم الملعب..."
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white text-right text-xs focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                {/* Privacy Switcher */}
                <div className="flex items-center justify-between bg-black/45 p-2 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 rounded-lg text-[9.5px] font-bold cursor-pointer"
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

                {/* Informative text instead of vibes */}
                <div className="text-[9px] text-slate-400 bg-[#060806] border border-white/5 rounded-xl p-2.5 leading-relaxed text-right">
                  💡 <strong>معلومات مفيدة:</strong> كقائد ومستضيف للمباراة، يمكنك ضبط تفاصيل الغرفة وتأكيدها. سيتم تفعيل القواعد تلقائياً فور انضمام خصمك. بعد إنشاء الغرفة ستحصل على كود دعوة فريد لمشاركته مع أصدقائك.
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-2 mt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateRoom}
                    disabled={isCreating}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-450 disabled:opacity-50 text-black font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-lg"
                  >
                    {isCreating ? "جاري إنشاء الملعب..." : "تأكيد وبدء الغرفة 🏟️"}
                  </button>
                </div>
              </div>

              {/* Left Column: Match rules sliders (span 3) */}
              <div className="md:col-span-3 space-y-3 w-full">
                <h3 className="text-[11px] font-black text-amber-400 border-b border-white/5 pb-2 mb-1 text-right">ضبط وإعداد قوانين اللعب ⚙️</h3>
                {renderSettingsForm(false)}
              </div>
            </main>
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
                    onClick={() => {
                      const link = `${window.location.origin}${window.location.pathname}?room=${myHostedRoom.id}`;
                      navigator.clipboard.writeText(link);
                      SoundEffects.playWhistle();
                      alert("تم نسخ رابط الغرفة بنجاح! ارسله لمنافسك 🔗");
                    }}
                    className="flex-1 py-2 bg-amber-500 text-black rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-amber-450 transition-all cursor-pointer"
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>رابط الغرفة 🔗</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(myHostedRoom.id);
                      SoundEffects.playWhistle();
                      alert("تم نسخ رمز الغرفة بنجاح! 📋");
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
                      {renderSettingsForm(true)}
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

    </div>
  );
}
