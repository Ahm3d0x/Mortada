/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, Key, LogIn, UserPlus, LogOut, RefreshCw, Star, 
  Sparkles, Trophy, PlusCircle, Gamepad2, AlertCircle, PlayCircle,
  Copy, Link, Globe, Shield, Settings, Check
} from "lucide-react";
import { supabaseService, MatchRoom, isSupabaseConfigured } from "../lib/supabase";
import { SoundEffects } from "../utils/sounds";

interface MultilobbyProps {
  onStartMultiplayerGame: (room: MatchRoom, role: "host" | "opponent") => void;
}

export default function Multilobby({ onStartMultiplayerGame }: MultilobbyProps) {
  // Auth states
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Lobby states
  const [activeRooms, setActiveRooms] = useState<MatchRoom[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("الفراعنة");
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Custom Match Settings states
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

  // Pre-populate settings from user defaults
  useEffect(() => {
    if (user) {
      const usernameVal = user.user_metadata?.username || user.email.split("@")[0] || "مدرب تكتيكي";
      setRoomName(`غرفة الكابتن ${usernameVal}`);
      
      const defaults = user.default_match_settings || user.user_metadata?.default_match_settings;
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
  }, [user]);

  // URL query parameter detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setJoinCode(roomParam.toUpperCase());
    }
  }, []);

  // Active Hosted Room (waiting state)
  const [myHostedRoom, setMyHostedRoom] = useState<MatchRoom | null>(null);

  const TEAM_VIBES = ["الفراعنة", "أسود الأطلس", "نجوم السامبا", "راقصو التانغو", "كتائب الأخضر", "الملكي"];

  // Handle auth subscriber
  useEffect(() => {
    const unsubscribe = supabaseService.onAuthStateChange((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthError(null);
      }
    });

    refreshLobbies();

    return () => {
      unsubscribe();
    };
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === "register") {
        if (!username.trim()) {
          setAuthError("يرجى إدخال اسم كابتن مميز ⚠️");
          setAuthLoading(false);
          return;
        }
        if (!fullName.trim()) {
          setAuthError("يرجى إدخال الاسم الكامل بالكامل ⚠️");
          setAuthLoading(false);
          return;
        }
        if (!age || Number(age) < 8) {
          setAuthError("يرجى إدخال عمر صحيح (8 سنوات على الأقل) ⚠️");
          setAuthLoading(false);
          return;
        }
        if (!acceptTerms) {
          setAuthError("يجب الموافقة على شروط الاستخدام وسياسة الخصوصية بالموقع ⚠️");
          setAuthLoading(false);
          return;
        }
        const { user: newUser, error } = await supabaseService.signUp(
          email,
          password,
          username,
          fullName,
          Number(age),
          gender,
          acceptTerms
        );
        if (error) setAuthError(error);
        else setUser(newUser);
      } else {
        const { user: signedUser, error } = await supabaseService.signIn(email, password);
        if (error) setAuthError(error);
        else setUser(signedUser);
      }
    } catch (err: any) {
      setAuthError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    SoundEffects.playCardDraw();
    await supabaseService.signOut();
    setUser(null);
    setMyHostedRoom(null);
  };

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
    if (!user) {
      setLobbyError("يرجى إنشاء حساب أو تسجيل الدخول أولاً للمبارزة أونلاين 🔒");
      return;
    }
    setIsCreating(true);
    setLobbyError(null);
    SoundEffects.playWhistle();

    try {
      const name = user.user_metadata?.username || user.email.split("@")[0] || "مدرب تكتيكي";
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
        user.id,
        name,
        selectedVibe,
        roomName.trim() || `${name} - مباراة مبارزة`,
        isPrivate,
        settingsPayload
      );
      setMyHostedRoom(room);
      setShowConfig(false); // Close settings configuration form
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

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setLobbyError("يرجى تسجيل الدخول أولاً 🔒");
      return;
    }
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setLobbyError(null);

    try {
      const name = user.user_metadata?.username || user.email.split("@")[0] || "مبارز أونلاين";
      const { room, error } = await supabaseService.joinRoom(joinCode.trim(), user.id, name, selectedVibe);
      
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
    if (!user) {
      setLobbyError("يرجى تسجيل الدخول أولاً 🔒");
      return;
    }
    setIsJoining(true);
    setLobbyError(null);

    try {
      const name = user.user_metadata?.username || user.email.split("@")[0] || "مبارز أونلاين";
      const { room: joinedRoom, error } = await supabaseService.joinRoom(room.id, user.id, name, selectedVibe);
      
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
      <div className="space-y-3 text-right" dir="rtl">
        {/* Goals Target slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-amber-400">
            <span>{currentGoals} أهداف</span>
            <span className="font-bold">أهداف الفوز:</span>
          </div>
          <input
            type="range" min={3} max={10} step={1}
            value={currentGoals}
            onChange={(e) => updateValue("winningGoals", Number(e.target.value), setWinningGoals)}
            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Game Mode */}
        <div className="space-y-1">
          <label className="block text-[10px] text-[#e0e0e0]/60 font-bold mb-1">نظام تحديد وقت ومده المباراة:</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "time", label: "نظام زمني ⏱️" },
              { id: "rounds", label: "نظام جولات 🔁" }
            ].map((m) => {
              const isSelected = currentGameMode === m.id;
              return (
                <button
                  key={m.id} type="button"
                  onClick={() => updateValue("gameMode", m.id, setGameMode)}
                  className={`py-1 rounded text-center font-bold text-[9px] cursor-pointer transition-all ${
                    isSelected ? "border border-amber-500 text-amber-400 bg-amber-950/20" : "border border-white/5 bg-black/25 text-slate-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode Dependent Options */}
        {currentGameMode === "time" ? (
          <div className="grid grid-cols-2 gap-2 bg-black/25 p-1.5 border border-white/5 rounded">
            <div className="space-y-1">
              <label className="block text-[9px] text-slate-400">وقت المباراة:</label>
              <select
                value={currentDuration}
                onChange={(e) => updateValue("matchDuration", Number(e.target.value), setMatchDuration)}
                className="w-full bg-black border border-white/10 rounded p-0.5 text-[9px] text-[#e0e0e0] font-bold text-right cursor-pointer"
              >
                <option value={180}>3 دقائق</option>
                <option value={300}>5 دقائق</option>
                <option value={600}>10 دقائق</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] text-slate-400">استراحة الشوطين:</label>
              <select
                value={currentHalfTimeBreak}
                onChange={(e) => updateValue("halfTimeBreakDuration", Number(e.target.value), setHalfTimeBreakDuration)}
                className="w-full bg-black border border-white/10 rounded p-0.5 text-[9px] text-[#e0e0e0] font-bold text-right cursor-pointer"
              >
                <option value={30}>30 ثانية</option>
                <option value={45}>45 ثانية</option>
                <option value={60}>دقيقة</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-1 bg-black/25 p-1.5 border border-white/5 rounded">
            <label className="block text-[9px] text-slate-400">عدد الجولات:</label>
            <select
              value={currentRounds}
              onChange={(e) => updateValue("totalRounds", Number(e.target.value), setTotalRounds)}
              className="w-full bg-black border border-white/10 rounded p-0.5 text-[9px] text-[#e0e0e0] font-bold text-right cursor-pointer"
            >
              <option value={6}>6 جولات</option>
              <option value={8}>8 جولات</option>
              <option value={10}>10 جولات</option>
              <option value={12}>12 جولة</option>
              <option value={14}>14 جولة</option>
            </select>
          </div>
        )}

        {/* Legend Pct & Booster Slider */}
        <div className="grid grid-cols-2 gap-2 bg-black/25 p-1.5 border border-white/5 rounded">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-amber-300">
              <span>{currentLegendPct}%</span>
              <span className="font-bold">نسبة الأساطير:</span>
            </div>
            <input
              type="range" min={0} max={100} step={10}
              value={currentLegendPct}
              onChange={(e) => updateValue("legendPercentage", Number(e.target.value), setLegendPercentage)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-emerald-450">
              <span>+{currentMaxBonus}</span>
              <span className="font-bold">حد المعزز:</span>
            </div>
            <input
              type="range" min={0} max={10} step={1}
              value={currentMaxBonus}
              onChange={(e) => updateValue("maxBonusValue", Number(e.target.value), setMaxBonusValue)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Turn parameters (Draws / Moves) */}
        <div className="grid grid-cols-2 gap-2 bg-black/25 p-2 border border-white/5 rounded">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-emerald-450">
              <span>{currentMaxDraws} سحبات</span>
              <span className="font-bold">السحبات:</span>
            </div>
            <input
              type="range" min={1} max={5} step={1}
              value={currentMaxDraws}
              onChange={(e) => updateValue("maxDrawsPerTurn", Number(e.target.value), setMaxDrawsPerTurn)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-emerald-450">
              <span>{currentMaxMoves} حركات</span>
              <span className="font-bold">الحركات:</span>
            </div>
            <input
              type="range" min={1} max={5} step={1}
              value={currentMaxMoves}
              onChange={(e) => updateValue("maxMovesPerTurn", Number(e.target.value), setMaxMovesPerTurn)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Legend Burn Limit & Initial Cards */}
        <div className="grid grid-cols-2 gap-2 bg-black/25 p-1.5 border border-white/5 rounded">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-amber-400">
              <span>{currentLegendBurn} كروت</span>
              <span className="font-bold">حرق الأسطورة:</span>
            </div>
            <input
              type="range" min={0} max={4} step={1}
              value={currentLegendBurn}
              onChange={(e) => updateValue("legendBurnLimit", Number(e.target.value), setLegendBurnLimit)}
              className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-emerald-450">
              <span>{currentInitialCards} أوراق</span>
              <span className="font-bold">كروت البداية:</span>
            </div>
            <input
              type="range" min={3} max={7} step={1}
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
    <div className="space-y-6" id="multiplayer_lobby_wrapper">
      
      {/* SUPABASE DEPLOYMENT STATUS INFO INDICATOR */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-right text-xs text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">وضع المحاكاة المحلي نشّط ⚡:</span> يرجى العلم بأن مفاتيح Supabase غير مضافة لملف البيئة بعد. قمنا ببناء نظام محاكاة تكتيكي متكامل يسمح لك باختبار إنشاء الغرف، مشاركة الأكواد، وبدء اللعب أونلاين بين تابات (Tabs) المتصفح نفسه فوراً لمحاكاة اللعب الفعلي بدقة 100%!
          </div>
        </div>
      )}

      {/* 1. AUTH PANEL OR PROFILE VIEW */}
      <div className="bg-[#0c0d0c] border border-white/5 rounded-xl p-5 text-right relative overflow-hidden" id="lobby_auth_panel">
        
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="auth_anonymous"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] text-[#e0e0e0]/40 font-mono tracking-wider">SECURE REGISTER & AUTH 🔒</span>
                <span className="text-sm font-semibold flex items-center gap-1.5 text-white">
                  <span>لوحة حساب مدربين أونلاين</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </span>
              </div>

              {authError && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-2.5 text-xs text-red-400 font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {authMode === "register" && (
                    <>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-[#e0e0e0]/60 font-semibold text-right">الاسم الكامل:</label>
                        <input
                          type="text"
                          required
                          placeholder="الاسم الثلاثي أو الثنائي"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded bg-black/45 border border-white/5 text-white focus:outline-none focus:border-emerald-500 text-right"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-[#e0e0e0]/60 font-semibold text-right">اسم الكابتن المميز (اللقب):</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: AbouTrika_7"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded bg-black/45 border border-white/5 text-white focus:outline-none focus:border-emerald-500 text-right"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-[#e0e0e0]/60 font-semibold text-right">السن / العمر:</label>
                        <input
                          type="number"
                          required
                          min={8}
                          max={120}
                          placeholder="السن بالسنوات"
                          value={age}
                          onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs rounded bg-black/45 border border-white/5 text-white focus:outline-none focus:border-emerald-500 text-right"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-[#e0e0e0]/60 font-semibold text-right">الجنس:</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs rounded bg-black/45 border border-white/5 text-[#e0e0e0]/80 focus:outline-none focus:border-emerald-500 text-right"
                        >
                          <option value="male" className="bg-[#121412] text-white">ذكر ♂</option>
                          <option value="female" className="bg-[#121412] text-white">أنثى ♀</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div className="space-y-1">
                    <label className="block text-[11px] text-[#e0e0e0]/60 font-semibold text-right">البريد الإلكتروني:</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded bg-black/45 border border-white/5 text-white focus:outline-none focus:border-emerald-500 text-left"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] text-[#e0e0e0]/60 font-semibold text-right">كلمة السر:</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded bg-black/45 border border-white/5 text-white focus:outline-none focus:border-emerald-500 text-left"
                    />
                  </div>
                </div>

                {authMode === "register" && (
                  <div className="flex items-center justify-end gap-2 py-1.5 border-t border-white/5">
                    <label htmlFor="accept-terms-checkbox" className="text-[11px] text-[#e0e0e0]/70 cursor-pointer select-none text-right">
                      أوافق على <span className="text-emerald-400 font-bold hover:underline">شروط الاستخدام</span> و <span className="text-emerald-400 font-bold hover:underline">سياسة الخصوصية</span> الخاصة بلعبة مرتدة التكتيكية ⚽
                    </label>
                    <input
                      id="accept-terms-checkbox"
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === "register" ? "login" : "register")}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    {authMode === "register" ? "لديك حساب بالفعل؟ سجل دخولك" : "ليس لديك حساب؟ إنشاء حساب مدرب جديد"}
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="py-2 px-6 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors"
                  >
                    {authLoading ? "جاري التحقق..." : authMode === "register" ? "إنشاء الحساب وتفعيل المدرب" : "تسجيل الدخول للملعب"}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="auth_signed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs rounded font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل خروج</span>
                </button>
                <div className="text-right">
                  <div className="text-xs text-[#e0e0e0]/40 font-mono">المدرب النشط حالياً</div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1 justify-end">
                    <span>👑 {user.user_metadata?.username || user.email.split("@")[0]}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#e0e0e0]/70 text-xs">شخصية المدرب ومستواه:</span>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded">
                  المحترف الأسطوري 🌟
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 2. MATCHROOM CREATION & FINDER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="lobby_matchroom_actions">
        
        {/* HOST CABINET */}
        <div className="bg-[#121412] border border-white/10 rounded-xl p-5 text-right flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-end gap-1.5 text-amber-400 mb-2">
              <span className="text-sm font-bold font-serif">إنشاء غرفة تكتيك ومبارزة صديق</span>
              <PlusCircle className="w-4 h-4" />
            </div>
            {!showConfig && !myHostedRoom && (
              <p className="text-xs text-[#e0e0e0]/60 leading-relaxed mb-4">
                أنشئ تكتيك الغرفة الخاص بك واحصل على كود فريد مكون من 6 رموز. شارك الكود أو الرابط المباشر مع صديقك فوراً لينضم لملعب المباراة أونلاين ويقود فريقه لتحديك!
              </p>
            )}

            {/* Select Team Vibe for hosting (only visible when not waiting and not in config settings) */}
            {!showConfig && !myHostedRoom && (
              <div className="space-y-1.5 mb-4">
                <label className="block text-[11px] text-[#e0e0e0]/50">اختر أسلوب هويتكم للغرفة:</label>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {TEAM_VIBES.map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        SoundEffects.playCardDraw();
                        setSelectedVibe(v);
                      }}
                      className={`px-2.5 py-1 text-[11px] rounded transition-all cursor-pointer ${
                        selectedVibe === v
                          ? "bg-amber-500/25 border border-amber-500 text-amber-300 font-bold"
                          : "bg-[#0c0d0c] border border-white/5 text-[#e0e0e0]/40 hover:text-white"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/5">
            <AnimatePresence mode="wait">
              {showConfig ? (
                <motion.div
                  key="create_config"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 bg-black/40 p-4 rounded-lg border border-amber-500/20 text-right overflow-y-auto max-h-[380px] scrollbar-thin scrollbar-thumb-amber-800"
                >
                  <h4 className="text-xs font-black text-amber-400 pb-1.5 border-b border-white/5 flex items-center justify-end gap-1.5">
                    <span>تخصيص قوانين الغرفة</span>
                    <Settings className="w-3.5 h-3.5" />
                  </h4>
                  
                  {/* Room Name */}
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-400">اسم الغرفة:</label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="اسم الغرفة..."
                      className="w-full px-2.5 py-1 rounded bg-[#0c0d0c] border border-white/5 text-white text-right text-xs focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>

                  {/* Privacy Toggle */}
                  <div className="flex items-center justify-between bg-black/35 p-1.5 rounded border border-white/5">
                    <button
                      type="button"
                      onClick={() => setIsPrivate(!isPrivate)}
                      className="px-2.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 rounded text-[9px] font-bold cursor-pointer"
                    >
                      تغيير
                    </button>
                    <span className="text-[10px] text-[#e0e0e0]/70 flex items-center gap-1">
                      {isPrivate ? (
                        <>
                          <span>غرفة خاصة (بالرمز فقط) 🔒</span>
                          <Shield className="w-3.5 h-3.5 text-amber-500" />
                        </>
                      ) : (
                        <>
                          <span>غرفة عامة (في الساحة) 🌐</span>
                          <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        </>
                      )}
                    </span>
                  </div>

                  {/* Render Sliders Form */}
                  {renderSettingsForm(false)}

                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowConfig(false)}
                      className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-[11px] font-bold transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateRoom}
                      disabled={isCreating}
                      className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-black font-extrabold rounded text-[11px] transition-all cursor-pointer"
                    >
                      {isCreating ? "جاري حجز الغرفة..." : "تأكيد وإنشاء ⚽"}
                    </button>
                  </div>
                </motion.div>
              ) : myHostedRoom ? (
                <motion.div
                  key="my_hosted"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="space-y-3 bg-black/45 p-4 rounded-lg border border-amber-500/20 text-center"
                >
                  <div className="text-[10px] text-amber-400 font-mono tracking-widest uppercase flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>بانتظار انضمام الخصم...</span>
                  </div>
                  
                  <h3 className="text-2xl font-mono font-extrabold text-white tracking-widest flex items-center justify-center gap-2">
                    <span className="bg-amber-500/10 px-4 py-1.5 rounded border border-amber-500/20">{myHostedRoom.id}</span>
                  </h3>
                  
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}${window.location.pathname}?room=${myHostedRoom.id}`;
                        navigator.clipboard.writeText(link);
                        SoundEffects.playWhistle();
                        alert("تم نسخ رابط الغرفة بنجاح! شاركه مع منافسك للانضمام فوراً 🔗");
                      }}
                      className="px-3 py-1.5 bg-amber-500 text-black rounded font-bold text-xs flex items-center gap-1 hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ رابط الغرفة 🔗</span>
                    </button>
                  </div>

                  {/* Accordion to edit settings live */}
                  <div className="mt-4 border-t border-white/5 pt-2 text-right">
                    <details className="group">
                      <summary className="text-[11px] text-amber-400/80 hover:text-amber-400 cursor-pointer font-bold select-none list-none flex items-center justify-between">
                        <span className="text-[10px] opacity-65 transition-transform group-open:rotate-180">▼</span>
                        <span className="flex items-center gap-1">
                          <span>تعديل إشراف وقواعد الغرفة الحية ⚙️</span>
                        </span>
                      </summary>
                      <div className="mt-2.5 p-2 bg-black/20 rounded border border-white/5 max-h-[220px] overflow-y-auto scrollbar-thin">
                        {renderSettingsForm(true)}
                      </div>
                    </details>
                  </div>

                  <p className="text-[10px] text-[#e0e0e0]/40 leading-normal pt-2">
                    مباراتك: <strong className="text-white">{myHostedRoom.room_name}</strong> ({myHostedRoom.is_private ? "غرفة خاصة" : "غرفة عامة"})
                  </p>
                  
                  <button
                    onClick={() => { SoundEffects.playCardDraw(); setMyHostedRoom(null); }}
                    className="text-xs text-red-400 hover:underline cursor-pointer pt-1"
                  >
                    إلغاء حجز الغرفة والعودة
                  </button>
                </motion.div>
              ) : (
                <motion.div key="create_panel" className="flex flex-col items-stretch">
                  <button
                    onClick={() => { SoundEffects.playWhistle(); setShowConfig(true); }}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-black font-extrabold rounded text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <span>تخصيص وإنشاء غرفة لعب ⚽</span>
                    <Gamepad2 className="w-4 h-4" />
                  </button>
                  {lobbyError && (
                    <div className="mt-2 text-xs text-red-400 font-medium">{lobbyError}</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* JOIN CABINET */}
        <div className="bg-[#121412] border border-white/10 rounded-xl p-5 text-right flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-end gap-1.5 text-emerald-400 mb-2">
              <span className="text-sm font-bold font-serif">انضمام لغرفة صديق بالرمز</span>
              <Key className="w-4 h-4" />
            </div>
            <p className="text-xs text-[#e0e0e0]/60 leading-relaxed mb-4">
              صديقك شارك كوداً أو رابطاً معك؟ أدخل الكود المكون من 6 رموز بالأسفل لتنضم فوراً وتتحداه في معركة تكتيكية حية!
            </p>

            <form onSubmit={handleJoinByCode} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="مثال: A8X9F2"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                  className="w-full tracking-widest text-center px-4 py-2.5 rounded bg-[#0c0d0c] border border-white/5 focus:outline-none focus:border-emerald-500 text-lg font-mono font-bold text-white shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={isJoining || !joinCode}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{isJoining ? "جاري دخول الغرفة..." : "انضم للمباراة وواجه الخصم!"}</span>
                <PlayCircle className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="pt-2">
            {!user && (
              <span className="text-[10px] text-amber-400 font-medium block text-center">
                🔒 يرجى تسجيل الدخول أولاً لتفعيل اللعب والربط التلقائي.
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 3. OPEN PUBLIC LOBBIES FINDER LIST */}
      <div className="bg-[#0c0d0c] border border-white/5 rounded-xl p-5 text-right" id="lobby_active_rooms_finder">
        
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
          <button
            onClick={refreshLobbies}
            className="p-1 px-2.5 rounded bg-transparent hover:bg-white/5 border border-white/10 text-[#e0e0e0]/60 hover:text-white transition-all text-xs flex items-center gap-1.5 cursor-pointer"
            id="refresh_lobbies_btn"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>تحديث الغرف</span>
          </button>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">غرف متاحة حالياً بانتظار لاعب</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {activeRooms.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#e0e0e0]/40">
            {isRefreshing ? "جاري جلب القائمة الفنية..." : "لا توجد غرف انتظار نشطة أونلاين حالياً. كن السبّاق وأنشئ غرفتك بالضغط فوق! ⚽"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeRooms.map((room) => (
              <div
                key={room.id}
                className="p-3 bg-[#121412] border border-white/5 rounded-lg flex items-center justify-between gap-2 hover:border-white/10 transition-all"
              >
                <button
                  onClick={() => handleQuickJoin(room)}
                  disabled={isJoining}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  تحدي المدرب!
                </button>

                <div className="text-right">
                  <div className="text-xs font-bold text-white font-serif">{room.host_name}</div>
                  <div className="text-[10px] text-[#e0e0e0]/55 flex items-center justify-end gap-1 mt-0.5">
                    <span>{room.host_vibe}</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-white text-[9px]">G: {room.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 4. SUPABASE SQL SETUP GUIDE HELPER */}
      <div className="bg-[#121415] border border-amber-500/10 rounded-xl p-5 text-right space-y-3" id="supabase_sql_helper">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const guideEl = document.getElementById("sql_instructions_guide");
              if (guideEl) {
                if (guideEl.classList.contains("hidden")) {
                  guideEl.classList.remove("hidden");
                } else {
                  guideEl.classList.add("hidden");
                }
              }
            }}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-xs cursor-pointer font-bold transition-all"
          >
            عرض / إخفاء كود الـ SQL 📋
          </button>
          
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="text-xs font-bold font-serif">دليل إعداد قاعدة بيانات مبارزة التكتيكية (Supabase SQL)</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <p className="text-xs text-[#e0e0e0]/60 leading-relaxed">
          لتشغيل ميزة اللعب الفوري ومزامنة الغرف أونلاين، يجب عليك إنشاء جدول <code className="bg-black/40 text-rose-300 font-mono px-1 rounded">rooms</code> في مشروعك بـ Supabase وتفعيل ميزة الـ <code className="text-emerald-300">Realtime</code>.
        </p>

        <div id="sql_instructions_guide" className="hidden space-y-4 pt-2 border-t border-white/5">
          <div className="text-xs text-[#e0e0e0]/70 space-y-1.5 leading-relaxed">
            <div>1️⃣ اذهب إلى لوحة تحكم مشروعك في <strong className="text-white">Supabase</strong>.</div>
            <div>2️⃣ اضغط على خيار <strong className="text-emerald-400">SQL Editor</strong> من القائمة الجانبية اليسرى.</div>
            <div>3️⃣ أنشئ استعلاماً جديداً بالضغط على <strong className="text-white">New Query</strong>.</div>
            <div>4️⃣ الصق الكود البرمجي البرتقالي بالأسفل كاملاً، ثم اضغط على زر التشغيل <strong className="text-[#f59e0b]">Run</strong>.</div>
          </div>

          <div className="relative">
            <pre className="p-3.5 bg-black/80 text-amber-400 border border-white/5 rounded-lg text-[10px] font-mono select-all overflow-x-auto text-left leading-normal max-h-80" dir="ltr">
{`-- =======================================================================
-- 1. ENUMS & CUSTOM TYPES (أنواع البيانات المخصصة للعبة مرتدة)
-- =======================================================================

-- مراحل اللعبة المختلفة لتتبع تدفق الجيم
DO $$ BEGIN
    CREATE TYPE public.game_phase AS ENUM (
        'warm_up',          -- مرحلة التسخين (تبديل حر متاح)
        'turn_start',       -- بداية الدور (انتظار سحب كارتين)
        'player_actions',    -- مرحلة تنفيذ الـ 3 حركات كحد أقصى للمهاجم
        'opponent_defense',  -- مرحلة رد المدافع (3 حركات للرد على الهجوم)
        'resolution',        -- حسم النتيجة وحساب الهجمات المرتدة الناجحة
        'game_over'         -- انتهاء المباراة وفوز أحد اللاعبين
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- أنواع الكروت المتاحة في اللعبة
DO $$ BEGIN
    CREATE TYPE public.card_type AS ENUM (
        'player',   -- لاعب عادي
        'legend',   -- لاعب أسطورة (يتطلب حرق كارتين)
        'special',  -- كارت خاص
        'bonto'     -- كارت البونطو المستخدم لزيادة قوة الهجوم
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- أماكن تواجد الكروت أثناء المباراة
DO $$ BEGIN
    CREATE TYPE public.card_location AS ENUM (
        'deck',       -- داخل مجموعة السحب العمومية
        'hand',       -- في يد اللاعب
        'field',      -- في الملعب (الـ 5 كروت أمامه)
        'discarded'   -- محروق / خارج اللعب تماماً
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- أنواع شروط تشغيل القدرة الخاصة للكارت
DO $$ BEGIN
    CREATE TYPE public.ability_trigger AS ENUM (
        'on_reveal',   -- عند كشف الكارت في الملعب
        'on_attack',   -- عند البدء بالهجوم به
        'on_defense',  -- عند استخدامه لصد هجوم
        'instant'      -- كارت خاص يلعب من اليد مباشرة ويموت
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- تحديد جنس اللاعب عند التسجيل
DO $$ BEGIN
    CREATE TYPE public.user_gender AS ENUM ('male', 'female');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =======================================================================
-- 2. CREATE OR ALTER EXISTING ROOMS TABLE (تحديث وتطوير جدول الغرف الحالي)
-- =======================================================================

CREATE TABLE IF NOT EXISTS public.rooms (
    id text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    host_id text NOT NULL,
    host_name text NOT NULL,
    host_vibe text NOT NULL,
    opponent_id text,
    opponent_name text,
    opponent_vibe text,
    status text NOT NULL DEFAULT 'waiting',
    current_turn text NOT NULL DEFAULT 'host',
    game_state jsonb,
    last_activity bigint NOT NULL,
    host_confirmed boolean DEFAULT false,
    opponent_confirmed boolean DEFAULT false,
    room_name text DEFAULT 'غرفة مرتدة',
    is_private boolean DEFAULT false
);

-- إضافة الأعمدة الجديدة المطلوبة لإدارة الـ Game Logic دون تغيير الأعمدة القديمة
ALTER TABLE public.rooms 
    ADD COLUMN IF NOT EXISTS current_attacker text NULL, -- معرف المهاجم الحالي
    ADD COLUMN IF NOT EXISTS phase public.game_phase DEFAULT 'warm_up'::public.game_phase, -- مرحلة الجيم
    ADD COLUMN IF NOT EXISTS p1_counter_attacks INT DEFAULT 0 CHECK (p1_counter_attacks >= 0 AND p1_counter_attacks <= 5), -- أهداف المضيف
    ADD COLUMN IF NOT EXISTS p2_counter_attacks INT DEFAULT 0 CHECK (p2_counter_attacks >= 0 AND p2_counter_attacks <= 5), -- أهداف الضيف
    ADD COLUMN IF NOT EXISTS moves_left INT DEFAULT 3 CHECK (moves_left >= 0 AND moves_left <= 3), -- الـ 3 حركات
    ADD COLUMN IF NOT EXISTS current_attack_score INT DEFAULT 0, -- حساب قوة الهجوم لحظياً
    ADD COLUMN IF NOT EXISTS current_defense_score INT DEFAULT 0, -- حساب قوة الدفاع لحظياً
    ADD COLUMN IF NOT EXISTS winner_id text NULL, -- معرف الفائز النهائي
    ADD COLUMN IF NOT EXISTS room_name text DEFAULT 'غرفة مرتدة',
    ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default now();

-- =======================================================================
-- 3. CREATING NEW TABLES (إنشاء الجداول الجديدة المتوافقة)
-- =======================================================================

--- أ. جدول الملف الشخصي للاعبين (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age >= 8),
    gender public.user_gender NOT NULL,
    terms_accepted BOOLEAN NOT NULL DEFAULT true CHECK (terms_accepted = true),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

--- ب. جدول الكروت الثابتة (Static Cards Metadata)
CREATE TABLE IF NOT EXISTS public.cards_catalog (
    card_id VARCHAR(50) PRIMARY KEY, -- معرف فريد مثل 'c_messi'
    name VARCHAR(100) NOT NULL,
    type public.card_type NOT NULL,
    attack_power INT DEFAULT 0,
    defense_power INT DEFAULT 0,
    description TEXT,
    image_url TEXT,
    ability_trigger public.ability_trigger DEFAULT NULL, -- شرط تفعيل القدرة
    ability_value INT DEFAULT 0, -- القيمة الرقمية للتأثير الخاص
    max_uses_per_game INT DEFAULT 1
);

--- ج. جدول الكروت الحية للمباراة (Live Game Cards State)
-- تم ضبط الـ room_id ليكون TEXT ليتوافق تماماً مع الـ Primary Key لجدول الغرف القديم عندك
CREATE TABLE IF NOT EXISTS public.game_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    card_id VARCHAR(50) NOT NULL REFERENCES public.cards_catalog(card_id),
    owner_id text, -- تم ضبطه كـ text تماشياً مع الـ ID المستخدم في جدول الـ rooms القديم
    location public.card_location DEFAULT 'deck'::public.card_location,
    field_position INT CHECK (field_position >= 1 AND field_position <= 5),
    is_face_up BOOLEAN DEFAULT false,
    deck_order INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

--- د. جدول سجل الحركات (Game Logs)
CREATE TABLE IF NOT EXISTS public.game_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id text,
    action_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================================================================
-- 4. POLICIES & SECURITY (سياسات الأمان RLS)
-- =======================================================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

-- سياسات عامة لتسهيل اللعب والربط دون تعقيدات صلاحيات
DROP POLICY IF EXISTS "Allow public select" ON public.rooms;
DROP POLICY IF EXISTS "Allow public insert" ON public.rooms;
DROP POLICY IF EXISTS "Allow public update" ON public.rooms;
DROP POLICY IF EXISTS "Allow public delete" ON public.rooms;

CREATE POLICY "Allow public select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.rooms FOR DELETE USING (true);

-- سياسات Profiles
DROP POLICY IF EXISTS "Allow profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Allow profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow profiles update" ON public.profiles;
CREATE POLICY "Allow profiles select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow profiles update" ON public.profiles FOR UPDATE USING (true);

-- سياسات Catalog
DROP POLICY IF EXISTS "Allow catalog select" ON public.cards_catalog;
CREATE POLICY "Allow catalog select" ON public.cards_catalog FOR SELECT USING (true);

-- سياسات Game Cards
DROP POLICY IF EXISTS "Allow game_cards select" ON public.game_cards;
DROP POLICY IF EXISTS "Allow game_cards insert" ON public.game_cards;
DROP POLICY IF EXISTS "Allow game_cards update" ON public.game_cards;
DROP POLICY IF EXISTS "Allow game_cards delete" ON public.game_cards;
CREATE POLICY "Allow game_cards select" ON public.game_cards FOR SELECT USING (true);
CREATE POLICY "Allow game_cards insert" ON public.game_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow game_cards update" ON public.game_cards FOR UPDATE USING (true);
CREATE POLICY "Allow game_cards delete" ON public.game_cards FOR DELETE USING (true);

-- سياسات Game Logs
DROP POLICY IF EXISTS "Allow game_logs select" ON public.game_logs;
DROP POLICY IF EXISTS "Allow game_logs insert" ON public.game_logs;
CREATE POLICY "Allow game_logs select" ON public.game_logs FOR SELECT USING (true);
CREATE POLICY "Allow game_logs insert" ON public.game_logs FOR INSERT WITH CHECK (true);

-- =======================================================================
-- 5. TRIGGERS & REALTIME ENABLEMENT (التحديث التلقائي والبث اللحظي)
-- =======================================================================

-- فانكشن لتحديث عمود updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط التريجر بجدول الـ rooms
DROP TRIGGER IF EXISTS update_rooms_modtime ON public.rooms;
CREATE TRIGGER update_rooms_modtime
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- تفعيل ميزة الـ Realtime للبث اللحظي على الجداول الأساسية
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.game_cards REPLICA IDENTITY FULL;
ALTER TABLE public.game_logs REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- إضافة الجداول لبث السوبربيز اللحظي
BEGIN;
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms, public.game_cards, public.game_logs, public.profiles;
    ELSE
      CREATE PUBLICATION supabase_realtime FOR TABLE public.rooms, public.game_cards, public.game_logs, public.profiles;
    END IF;
  EXCEPTION WHEN others THEN
    -- Fallback safety edge-case
    NULL;
  END $$;
COMMIT;`}
            </pre>
            <div className="absolute top-2 right-2 bg-black/60 text-white/50 text-[9px] px-1.5 py-0.5 rounded pointer-events-none">
              SQL EDITOR CODE
            </div>
          </div>

          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-[11px] text-right">
            🎉 بمجرد تشغيل الاستعلام بنجاح وإعادة تحميل هذه اللوحة، ستعمل ميزة تسجيل الحسابات، وصالات اللاعبين، والمنافسات التكتيكية أونلاين بكفاءة البرق!
          </div>
        </div>
      </div>

    </div>
  );
}
