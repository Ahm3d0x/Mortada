/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Sparkles, Trophy, Users, Zap, Bot, ArrowRight, ArrowLeft, BookOpen, Settings, PlayCircle, Layers, Volume2, VolumeX, ChevronUp, ChevronDown, Lock, User, Image, Coins, LogOut, Globe } from "lucide-react";
import { SoundEffects } from "../utils/sounds";
import { getPackages } from "../admin/adminStore";
import { isSupabaseConfigured, MatchRoom } from "../lib/supabase";
import { gameAuth } from "../lib/gameAuth";
import Multilobby from "./Multilobby";
import PVAPng from "../images/PVA.png";
import PVPPng from "../images/PVP.png";


const COUNTRIES = [
  { code: "EG", name: "مصر", flag: "🇪🇬" },
  { code: "SA", name: "السعودية", flag: "🇸🇦" },
  { code: "MA", name: "المغرب", flag: "🇲🇦" },
  { code: "DZ", name: "الجزائر", flag: "🇩🇿" },
  { code: "TN", name: "تونس", flag: "🇹🇳" },
  { code: "AE", name: "الإمارات", flag: "🇦🇪" },
  { code: "QA", name: "قطر", flag: "🇶🇦" },
  { code: "KW", name: "الكويت", flag: "🇰🇼" },
  { code: "BH", name: "البحرين", flag: "🇧🇭" },
  { code: "OM", name: "عمان", flag: "🇴🇲" },
  { code: "JO", name: "الأردن", flag: "🇯🇴" },
  { code: "PS", name: "فلسطين", flag: "🇵🇸" },
  { code: "IQ", name: "العراق", flag: "🇮🇶" },
  { code: "SY", name: "سوريا", flag: "🇸🇾" },
  { code: "LB", name: "لبنان", flag: "🇱🇧" },
  { code: "YE", name: "اليمن", flag: "🇾🇪" },
  { code: "LY", name: "ليبيا", flag: "🇱🇾" },
  { code: "SD", name: "السودان", flag: "🇸🇩" },
  { code: "LEGEND", name: "أساطير", flag: "👑" },
];

const COUNTRIES_MAP: Record<string, string> = {
  EG: "🇪🇬", SA: "🇸🇦", MA: "🇲🇦", DZ: "🇩🇿", TN: "🇹🇳",
  AE: "🇦🇪", QA: "🇶🇦", KW: "🇰🇼", BH: "🇧🇭", OM: "🇴🇲",
  JO: "🇯🇴", PS: "🇵🇸", IQ: "🇮🇶", SY: "🇸🇾", LB: "🇱🇧",
  YE: "🇾🇪", LY: "🇱🇾", SD: "🇸🇩", LEGEND: "👑"
};
const getFlagByCountryCode = (code: string, sizeClass: string = "w-4.5 h-3 inline-block object-cover rounded-xs shadow-xs align-middle") => {
  const upper = code.toUpperCase();
  if (upper === "LEGEND") {
    return <span className="text-xs">👑</span>;
  }
  if (COUNTRIES_MAP[upper]) {
    return (
      <img 
        src={`https://flagcdn.com/w40/${upper.toLowerCase()}.png`} 
        alt={upper} 
        className={sizeClass}
      />
    );
  }
  return "⚽";
};

interface WelcomeMenuProps {
  onStartGame: (
    coachName: string,
    teamVibe: string,
    difficulty: "normal" | "tactical" | "legend",
    matchDuration: number,
    legendPercentage: number,
    maxDrawsPerTurn: number,
    maxMovesPerTurn: number,
    initialCardsCount: number,
    selectedPlayerPkgs: string[],
    selectedSpecialPkgs: string[],
    defenseDrawsLimit?: number,
    legendBurnLimit?: number,
    maxBonusValue?: number,
    gameMode?: "time" | "rounds",
    winningGoals?: number,
    totalRounds?: number,
    halfTimeBreakDuration?: number
  ) => void;
  onStartMultiplayerGame: (room: MatchRoom, role: "host" | "opponent") => void;
  isMobileLandscape?: boolean;
}

const TEAM_VIBES = [
  { name: "الفراعنة", color: "from-red-600 to-amber-500", desc: "أداء تكتيكي صلب", emoji: <img src="https://flagcdn.com/w40/eg.png" className="w-4.5 h-3 inline-block object-cover rounded-xs shadow-xs align-middle" alt="EG" /> },
  { name: "أسود الأطلس", color: "from-emerald-700 to-red-600", desc: "دفاع فولاذي صلب", emoji: <img src="https://flagcdn.com/w40/ma.png" className="w-4.5 h-3 inline-block object-cover rounded-xs shadow-xs align-middle" alt="MA" /> },
  { name: "نجوم السامبا", color: "from-yellow-400 to-green-600", desc: "مهارات ممتعة", emoji: <img src="https://flagcdn.com/w40/br.png" className="w-4.5 h-3 inline-block object-cover rounded-xs shadow-xs align-middle" alt="BR" /> },
  { name: "راقصو التانغو", color: "from-sky-400 to-slate-200 text-slate-800", desc: "تكتيك وذكاء لافت", emoji: <img src="https://flagcdn.com/w40/ar.png" className="w-4.5 h-3 inline-block object-cover rounded-xs shadow-xs align-middle" alt="AR" /> },
  { name: "كتائب الأخضر", color: "from-green-600 to-emerald-800", desc: "انسجام وسرعة مميزة", emoji: <img src="https://flagcdn.com/w40/sa.png" className="w-4.5 h-3 inline-block object-cover rounded-xs shadow-xs align-middle" alt="SA" /> },
  { name: "الملكي", color: "from-indigo-600 to-violet-850", desc: "شخصية البطل العريقة", emoji: "👑" }
];

const MOCK_PACKAGES = [
  { id: "pkg_egypt", name: "باقة نجوم أفريقيا 🇪🇬", description: "باقة تشتمل على كروت لاعبي الدوري المصري والمحترفين", image: "🦁", type: "player" },
  { id: "pkg_europe", name: "باقة عمالقة أوروبا 🇪🇺", description: "باقة تشتمل على لاعبي الأندية الكبرى والدوري الإنجليزي", image: "🏆", type: "player" },
  { id: "pkg_legends", name: "باقة كلاسيكيات كرة القدم 👑", description: "باقة تشتمل على نجوم الزمن الجميل والأساطير التاريخية", image: "👑", type: "player" },
  { id: "pkg_tactics_classic", name: "التكتيكات الكلاسيكية 🚌", description: "باقة الكروت التكتيكية الكلاسيكية الأساسية للعب", image: "🚌", type: "special" },
  { id: "pkg_tactics_modern", name: "التكتيكات الهجومية الحديثة 🔥", description: "باقة الكروت التكتيكية الحديثة لأسلوب الضغط العالي", image: "🔥", type: "special" }
];

export default function WelcomeMenu({ onStartGame, onStartMultiplayerGame, isMobileLandscape = false }: WelcomeMenuProps) {
  const currentUser = gameAuth.getCurrentUser();
  const defaultSettings = currentUser?.default_match_settings;

  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<"home" | "play" | "decks" | "rules" | "settings">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("room") ? "play" : "home";
  });

  // Game Setup States (Wizard under "Play" Tab)
  const [playStep, setPlayStep] = useState<"mode_selection" | "coach" | "packages" | "match" | "online_lobby">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("room") ? "online_lobby" : "mode_selection";
  });
  const [coachName, setCoachName] = useState(currentUser?.name || "");
  const [selectedVibe, setSelectedVibe] = useState(() => {
    const userTeam = currentUser?.team_name || "";
    const matched = TEAM_VIBES.find((v) => v.name === userTeam);
    if (matched) return matched;
    return {
      name: currentUser?.team_name || "الفراعنة",
      color: "from-emerald-600 to-teal-500",
      desc: currentUser?.team_abbreviation || "MTR",
      emoji: getFlagByCountryCode(currentUser?.country || "EG")
    };
  });
  const [difficulty, setDifficulty] = useState<"normal" | "tactical" | "legend">(defaultSettings?.difficulty || "normal");
  const [matchDuration, setMatchDuration] = useState<number>(defaultSettings?.matchDuration || 180);
  const [legendPercentage, setLegendPercentage] = useState<number>(defaultSettings?.legendPercentage || 30);
  const [maxDrawsPerTurn, setMaxDrawsPerTurn] = useState<number>(defaultSettings?.maxDrawsPerTurn || 2);
  const [maxMovesPerTurn, setMaxMovesPerTurn] = useState<number>(defaultSettings?.maxMovesPerTurn || 3);
  const [initialCardsCount, setInitialCardsCount] = useState<number>(defaultSettings?.initialCardsCount || 5);
  const [defenseDrawsLimit, setDefenseDrawsLimit] = useState<number>(defaultSettings?.maxDrawsPerTurn ? defaultSettings.maxDrawsPerTurn + 1 : 3);
  const [legendBurnLimit, setLegendBurnLimit] = useState<number>(defaultSettings?.legendBurnLimit || 2);
  const [maxBonusValue, setMaxBonusValue] = useState<number>(defaultSettings?.maxBonusValue || 10);
  const [gameMode, setGameMode] = useState<"time" | "rounds">(defaultSettings?.gameMode || "time");
  const [winningGoals, setWinningGoals] = useState<number>(defaultSettings?.winningGoals || 5);
  const [totalRounds, setTotalRounds] = useState<number>(defaultSettings?.totalRounds || 10);
  const [halfTimeBreakDuration, setHalfTimeBreakDuration] = useState<number>(defaultSettings?.halfTimeBreakDuration || 30);

  // Settings Sub-tab Controls
  const [settingsSubTab, setSettingsSubTab] = useState<"profile" | "match" | "password">("profile");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Profile fields
  const [editName, setEditName] = useState(currentUser?.name || "");
  const [editTeamName, setEditTeamName] = useState(currentUser?.team_name || "");
  const [editTeamAbbr, setEditTeamAbbr] = useState(currentUser?.team_abbreviation || "");
  const [editTeamLogo, setEditTeamLogo] = useState(currentUser?.team_logo || "");
  const [editCountry, setEditCountry] = useState(currentUser?.country || "EG");

  // Defaults match sliders fields
  const [defDiff, setDefDiff] = useState<"normal" | "tactical" | "legend">(defaultSettings?.difficulty || "normal");
  const [defDuration, setDefDuration] = useState<number>(defaultSettings?.matchDuration || 180);
  const [defLegendPct, setDefLegendPct] = useState<number>(defaultSettings?.legendPercentage || 30);
  const [defMaxDraws, setDefMaxDraws] = useState<number>(defaultSettings?.maxDrawsPerTurn || 2);
  const [defMaxMoves, setDefMaxMoves] = useState<number>(defaultSettings?.maxMovesPerTurn || 3);
  const [defInitCards, setDefInitCards] = useState<number>(defaultSettings?.initialCardsCount || 5);
  const [defLegendBurn, setDefLegendBurn] = useState<number>(defaultSettings?.legendBurnLimit || 2);
  const [defMaxBonus, setDefMaxBonus] = useState<number>(defaultSettings?.maxBonusValue || 10);
  const [defGameMode, setDefGameMode] = useState<"time" | "rounds">(defaultSettings?.gameMode || "time");
  const [defWinningGoals, setDefWinningGoals] = useState<number>(defaultSettings?.winningGoals || 5);
  const [defTotalRounds, setDefTotalRounds] = useState<number>(defaultSettings?.totalRounds || 10);
  const [defHalfTimeBreakDuration, setDefHalfTimeBreakDuration] = useState<number>(defaultSettings?.halfTimeBreakDuration || 30);

  // Password change fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Sync edits on user session changes
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditTeamName(currentUser.team_name);
      setEditTeamAbbr(currentUser.team_abbreviation);
      setEditTeamLogo(currentUser.team_logo);
      setEditCountry(currentUser.country);
      
      const settings = currentUser.default_match_settings;
      if (settings) {
        setDefDiff(settings.difficulty);
        setDefDuration(settings.matchDuration);
        setDefLegendPct(settings.legendPercentage);
        setDefMaxDraws(settings.maxDrawsPerTurn);
        setDefMaxMoves(settings.maxMovesPerTurn);
        setDefInitCards(settings.initialCardsCount);
        setDefLegendBurn(settings.legendBurnLimit);
        setDefMaxBonus(settings.maxBonusValue);
        setDefGameMode(settings.gameMode || "time");
        setDefWinningGoals(settings.winningGoals || 5);
        setDefTotalRounds(settings.totalRounds || 10);
        setDefHalfTimeBreakDuration(settings.halfTimeBreakDuration || 30);
      }
    }
  }, [activeTab, currentUser?.id]);

  // Load defaults into wizard states when switching to the play tab or when user session loads
  useEffect(() => {
    if (activeTab === "play" && currentUser) {
      const settings = currentUser.default_match_settings;
      if (settings) {
        setDifficulty(settings.difficulty);
        setMatchDuration(settings.matchDuration);
        setLegendPercentage(settings.legendPercentage);
        setMaxDrawsPerTurn(settings.maxDrawsPerTurn);
        setMaxMovesPerTurn(settings.maxMovesPerTurn);
        setInitialCardsCount(settings.initialCardsCount);
        setLegendBurnLimit(settings.legendBurnLimit);
        setMaxBonusValue(settings.maxBonusValue);
        setGameMode(settings.gameMode || "time");
        setWinningGoals(settings.winningGoals || 5);
        setTotalRounds(settings.totalRounds || 10);
        setHalfTimeBreakDuration(settings.halfTimeBreakDuration || 30);
      }
    }
  }, [activeTab, currentUser?.id]);

  const [showLogoTip, setShowLogoTip] = useState(true);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);
    
    if (editTeamAbbr.length !== 3) {
      setSettingsError("يجب أن يتكون اختصار الفريق من 3 حروف بالضبط ⚠️");
      return;
    }

    SoundEffects.playWhistle();
    const res = await gameAuth.updateProfile(
      editName,
      editTeamName,
      editTeamAbbr,
      editTeamLogo,
      editCountry
    );

    if (res.error) {
      setSettingsError(res.error);
    } else {
      setSettingsSuccess("تم تحديث بيانات الملف الشخصي بنجاح! 🏆");
      setCoachName(editName);
      const matched = TEAM_VIBES.find((v) => v.name === editTeamName);
      if (matched) {
        setSelectedVibe(matched);
      } else {
        setSelectedVibe({
          name: editTeamName,
          color: "from-emerald-600 to-teal-500",
          desc: editTeamAbbr,
          emoji: getFlagByCountryCode(editCountry)
        });
      }
    }
  };

  const handleSaveMatchDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    SoundEffects.playWhistle();
    const settings = {
      difficulty: defDiff,
      matchDuration: defDuration,
      legendPercentage: defLegendPct,
      maxDrawsPerTurn: defMaxDraws,
      maxMovesPerTurn: defMaxMoves,
      initialCardsCount: defInitCards,
      legendBurnLimit: defLegendBurn,
      maxBonusValue: defMaxBonus,
      gameMode: defGameMode,
      winningGoals: defWinningGoals,
      totalRounds: defTotalRounds,
      halfTimeBreakDuration: defHalfTimeBreakDuration,
    };

    const res = await gameAuth.updateDefaultSettings(settings);

    if (res.error) {
      setSettingsError(res.error);
    } else {
      setSettingsSuccess("تم حفظ الإعدادات الافتراضية بنجاح! ⚙️");
      // Prefill Wizard options immediately
      setDifficulty(defDiff);
      setMatchDuration(defDuration);
      setLegendPercentage(defLegendPct);
      setMaxDrawsPerTurn(defMaxDraws);
      setMaxMovesPerTurn(defMaxMoves);
      setInitialCardsCount(defInitCards);
      setLegendBurnLimit(defLegendBurn);
      setMaxBonusValue(defMaxBonus);
      setGameMode(defGameMode);
      setWinningGoals(defWinningGoals);
      setTotalRounds(defTotalRounds);
      setHalfTimeBreakDuration(defHalfTimeBreakDuration);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setSettingsError("تأكيد كلمة المرور الجديدة لا يطابق كلمة المرور الجديدة ⚠️");
      return;
    }

    if (newPassword.length < 6) {
      setSettingsError("يجب أن تكون كلمة المرور الجديدة 6 أحرف أو أكثر ⚠️");
      return;
    }

    SoundEffects.playWhistle();
    const res = await gameAuth.changePassword(oldPassword, newPassword);

    if (res.error) {
      setSettingsError(res.error);
    } else {
      setSettingsSuccess("تم تغيير كلمة المرور بنجاح! 🔐");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  const handleLogout = () => {
    SoundEffects.playWhistle();
    gameAuth.signOut();
  };

  // Mute State
  const [isMuted, setIsMuted] = useState(SoundEffects.isMuted);

  // Rules Sub-Tab State
  const [rulesCategory, setRulesCategory] = useState<"basics" | "actions" | "attacking" | "specials">("basics");

  // Packages loading
  const [dbPackages, setDbPackages] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [selectedPlayerPkgs, setSelectedPlayerPkgs] = useState<string[]>([]);
  const [selectedSpecialPkgs, setSelectedSpecialPkgs] = useState<string[]>([]);
  const [multiPackEnabled, setMultiPackEnabled] = useState(false);
  // Focused item state for PES selector
  const [focusedSpecialId, setFocusedSpecialId] = useState<string | null>(null);
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null);
  // Scroll refs
  const tacticalScrollRef = useRef<HTMLDivElement>(null);
  const playerScrollRef = useRef<HTMLDivElement>(null);
  const lastFocusedPlayerId = useRef("");
  const lastFocusedSpecialId = useRef("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [specialSearch, setSpecialSearch] = useState("");

  useEffect(() => {
    const selectDefaults = (pkgs: any[]) => {
      const firstPlayer = pkgs.find(p => p.type === "player" || !p.type);
      const firstSpecial = pkgs.find(p => p.type === "special" || p.type === "tactical");
      if (firstPlayer) setSelectedPlayerPkgs([firstPlayer.id]);
      if (firstSpecial) setSelectedSpecialPkgs([firstSpecial.id]);
    };

    if (isSupabaseConfigured) {
      setDbLoading(true);
      getPackages()
        .then((pkgs) => {
          const finalPkgs = pkgs.length > 0 ? pkgs : MOCK_PACKAGES;
          setDbPackages(finalPkgs);
          selectDefaults(finalPkgs);
          setDbLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load packages in WelcomeMenu:", err);
          setDbPackages(MOCK_PACKAGES);
          selectDefaults(MOCK_PACKAGES);
          setDbLoading(false);
        });
    } else {
      setDbPackages(MOCK_PACKAGES);
      selectDefaults(MOCK_PACKAGES);
    }
  }, []);

  // Set initial focused items when packages load
  useEffect(() => {
    if (dbPackages.length) {
      const focusedSpecial = dbPackages.find(p => p.id === focusedSpecialId);
      const focusedPlayer = dbPackages.find(p => p.id === focusedPlayerId);
      const firstSpecial = dbPackages.find(p => p.type === "special" || p.type === "tactical");
      const firstPlayer = dbPackages.find(p => p.type === "player" || !p.type);
      if (firstSpecial) setFocusedSpecialId(firstSpecial.id);
      if (firstPlayer) setFocusedPlayerId(firstPlayer.id);
    }
  }, [dbPackages]);

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
      ? dbPackages.filter(p => p.type === "player" || !p.type)
      : [
          { id: "none", name: "بدون كروت تكتيكية", type: "special", image: "🚫" },
          ...dbPackages.filter(p => p.type === "special" || p.type === "tactical")
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

  // Autoscroll to active items on view mount or toggle
  useEffect(() => {
    if (playStep === "packages" && dbPackages.length) {
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
  }, [playStep, dbPackages]);

  useEffect(() => {
    if (!multiPackEnabled && playStep === "packages") {
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

  const toggleMute = () => {
    SoundEffects.isMuted = !SoundEffects.isMuted;
    setIsMuted(SoundEffects.isMuted);
    if (!SoundEffects.isMuted) {
      SoundEffects.playCardDraw();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = coachName.trim() || "الكابتن البطل";
    SoundEffects.playWhistle();
    onStartGame(
      finalName,
      selectedVibe.name,
      difficulty,
      matchDuration,
      legendPercentage,
      maxDrawsPerTurn,
      maxMovesPerTurn,
      initialCardsCount,
      selectedPlayerPkgs,
      selectedSpecialPkgs,
      defenseDrawsLimit,
      legendBurnLimit,
      maxBonusValue,
      gameMode,
      winningGoals,
      totalRounds,
      halfTimeBreakDuration
    );
  };

  const triggerFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
        .then(() => {
          const screenOrientation = window.screen && (window.screen.orientation as any);
          if (screenOrientation && screenOrientation.lock) {
            screenOrientation.lock("landscape").catch(() => {});
          }
        })
        .catch((err) => {
          console.warn("Fullscreen toggle failed:", err);
        });
    }
  };

  const focusedSpecial = dbPackages.find(p => p.id === focusedSpecialId);
  const focusedPlayer = dbPackages.find(p => p.id === focusedPlayerId);

  return (
    <div className={`w-full h-full flex flex-col justify-between select-none relative overflow-hidden bg-[#020503] text-[#e0e0e0] font-sans ${activeTab === "play" ? "" : "pb-14"}`}>
      
      {/* Background soccer pitch line art */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.025)_50%)] bg-size-[10%_100%]" />
        <div className="absolute inset-4 border border-white/20 rounded-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border border-white/25" />
        <div className="absolute top-1/2 left-4 right-4 h-px bg-white/25" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-64 h-24 border border-white/25 border-t-0 rounded-b" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 h-24 border border-white/25 border-b-0 rounded-t" />
      </div>

      {/* Radial glows */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-10 left-1/4 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* TOP GLOWING HEADER */}
      {activeTab !== "play" && (
        <header className={`relative z-10 w-full flex items-center justify-between px-6 ${isMobileLandscape ? 'py-1.5' : 'py-2.5'} bg-black/40 border-b border-white/5 backdrop-blur-md shrink-0`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-base font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-emerald-400 via-teal-300 to-green-400">
              مـرتـدة
            </h1>
          </div>
          
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
            title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </header>
      )}

      {/* MIDDLE CONTENT WINDOW */}
      <main className="flex-1 relative z-10 w-full overflow-y-auto px-4 py-2 flex flex-col items-center justify-center max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: HOME */}
          {activeTab === "home" && (
            <motion.div
              key="tab_home"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`w-full flex flex-col items-center justify-center text-center ${isMobileLandscape ? 'space-y-2' : 'space-y-4'}`}
            >
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-1">
                  تحدي كروت التكتيك الكروي الذكي 🏆
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  لعبة التخطيط التكتيكي
                </h2>
              </div>

              {/* Massive Soccer Ball CTA FAB */}
              <div className={`relative flex items-center justify-center ${isMobileLandscape ? 'my-1' : 'my-3'}`}>
                <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                <button
                  type="button"
                  onClick={() => {
                    SoundEffects.playWhistle();
                    triggerFullscreen();
                    setActiveTab("play");
                  }}
                  className={`${isMobileLandscape ? 'w-20 h-20' : 'w-28 h-28'} bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-350 hover:to-teal-400 text-slate-950 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer z-10 border-4 border-slate-900 group`}
                >
                  <span className={`${isMobileLandscape ? 'text-2xl' : 'text-4xl'} group-hover:rotate-45 transition-transform duration-300`}>⚽</span>
                  <span className="text-[9px] font-black tracking-wider uppercase">ابدأ اللعب</span>
                </button>
              </div>

              {/* Quick stats / Vibe Card */}
              <div className={`w-full bg-black/45 border border-white/10 rounded-2xl ${isMobileLandscape ? 'p-1.5' : 'p-3'} backdrop-blur-md flex items-center justify-around gap-2 max-w-sm`}>
                <div className="text-right">
                  <span className="text-[8px] text-slate-500 block">الهوية الافتراضية</span>
                  <span className="text-xs font-black text-[#e0e0e0]">{selectedVibe.emoji} {selectedVibe.name}</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-center">
                  <span className="text-[8px] text-slate-500 block">مستوى المدرب</span>
                  <span className="text-xs font-black text-amber-400">المحترف الأسطوري 🌟</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-left">
                  <span className="text-[8px] text-slate-500 block">الصعوبة الحالية</span>
                  <span className="text-xs font-black text-rose-400">
                    {difficulty === "normal" ? "ناشئ" : difficulty === "tactical" ? "محترف" : "ذكاء أسطوري"}
                  </span>
                </div>
              </div>

              <p className={`text-[9.5px] text-slate-400 max-w-xs leading-normal ${isMobileLandscape ? 'hidden' : 'block'}`}>
                اضغط على الكرة لمشاهدة باقات اللعب وتعديل خطتك، ثم قيادة هجوم كتيبتك الكروية لصد ضربات الخصوم!
              </p>
            </motion.div>
          )}

          {/* TAB 2: PLAY (WIZARD SETUP) */}
          {activeTab === "play" && (
            <motion.div
              key="tab_play"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full"
            >
              {playStep === "mode_selection" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3.5 text-center max-w-lg mx-auto"
                >
                  <div className="text-right border-b border-white/5 pb-2">
                    <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">الخطوة الأولى: اختيار نمط اللعب</span>
                    <h3 className="text-xs font-black text-white">اختر نمط التحدي التكتيكي ⚽</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 mt-1.5">
                    {/* Offline Card */}
                    <button
                      type="button"
                      onClick={() => {
                        SoundEffects.playWhistle();
                        setPlayStep("packages"); // Proceed with AI game wizard
                      }}
                      className="group relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-emerald-500/20 bg-black/60 p-1.5 cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                    >
                      <div className="w-full aspect-4/3 rounded-xl overflow-hidden bg-emerald-950/20 relative">
                        <img 
                          src={PVAPng} 
                          alt="مباراة ودية" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="absolute bottom-2 right-2 text-right">
                          <span className="text-[10px] font-black text-white block">مباراة ودية 🤖</span>
                          <span className="text-[8px] text-emerald-400 font-bold block">ضد الكمبيوتر</span>
                        </div>
                      </div>
                    </button>

                    {/* Online Card */}
                    <button
                      type="button"
                      onClick={() => {
                        SoundEffects.playWhistle();
                        setPlayStep("online_lobby"); // Go to online lobby!
                      }}
                      className="group relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-amber-500/20 bg-black/60 p-1.5 cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                    >
                      <div className="w-full aspect-4/3 rounded-xl overflow-hidden bg-amber-950/20 relative">
                        <img 
                          src={PVPPng} 
                          alt="مباراة أونلاين" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="absolute bottom-2 right-2 text-right">
                          <span className="text-[10px] font-black text-white block">مبارزة حية 🌐</span>
                          <span className="text-[8px] text-amber-400 font-bold block">أونلاين 1 ضد 1</span>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="flex justify-start pt-2 border-t border-white/5 mt-3">
                    <button
                      type="button"
                      onClick={() => { SoundEffects.playCardDraw(); setActiveTab("home"); }}
                      className="px-3.5 py-1 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer border border-white/5"
                    >
                      العودة للرئيسية
                    </button>
                  </div>
                </motion.div>
              )}

              {playStep === "online_lobby" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full text-right"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        SoundEffects.playCardDraw();
                        setPlayStep("mode_selection");
                      }}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span>تغيير نمط اللعب</span>
                    </button>
                    <h3 className="text-xs font-black text-[#e0e0e0] flex items-center gap-1.5 justify-end">
                      <span>ساحة المبارزة أونلاين</span>
                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                    </h3>
                  </div>

                  <Multilobby onStartMultiplayerGame={onStartMultiplayerGame} />
                </motion.div>
              )}

              {playStep !== "mode_selection" && playStep !== "online_lobby" && (
                <form onSubmit={handleSubmit} className="w-full flex flex-col justify-between">
                
                {/* Play Wizard Step 1: Coach Info */}
                {playStep === "coach" && (
                  <motion.div
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    <div className="text-right border-b border-white/5 pb-1.5 mb-2">
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">مرحلة 1 من 3: الهوية وقائد الفريق</span>
                      <h3 className="text-sm font-black text-white">من هو قائد كتيبتك الكروية؟</h3>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[#e0e0e0]/60 font-black text-right text-[9px]">اسم المدرب القائد:</label>
                      <input
                        type="text"
                        placeholder="مثال: الكابتن جوارديولا..."
                        maxLength={20}
                        value={coachName}
                        onChange={(e) => setCoachName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[#e0e0e0]/60 font-black text-right text-[9px]">اختر هوية وتكتيك الفريق:</label>
                      <div className="grid grid-cols-3 gap-1">
                        {TEAM_VIBES.map((vibe) => (
                          <button
                            key={vibe.name}
                            type="button"
                            onClick={() => {
                              SoundEffects.playCardDraw();
                              setSelectedVibe(vibe);
                            }}
                            className={`flex items-center gap-1 p-1 px-2 rounded-lg border transition-all cursor-pointer text-right min-h-[28px] ${
                              selectedVibe.name === vibe.name
                                ? "border-emerald-500 bg-emerald-950/20 text-white"
                                : "border-white/5 bg-black/25 text-slate-400 hover:border-white/10"
                            }`}
                          >
                            <span className="text-xs">{vibe.emoji}</span>
                            <span className="font-extrabold text-[8.5px] truncate">{vibe.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-3">
                      <button
                        type="button"
                        onClick={() => { SoundEffects.playCardDraw(); setActiveTab("home"); }}
                        className="px-4 py-1 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => { SoundEffects.playCardDraw(); setPlayStep("packages"); }}
                        className="px-5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>التالي: باقات الكروت</span>
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Play Wizard Step 2: Select Packages */}
                {playStep === "packages" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3 w-full"
                  >
                    {/* Header with Compact Switch */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">مرحلة 2 من 3: باقات اللعب</span>
                        <h3 className="text-[11px] font-black text-white/95">اختر باقات اللعيبة والتاكتيكس</h3>
                      </div>
                      
                      {/* Compact Multi-Pack Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !multiPackEnabled;
                          setMultiPackEnabled(next);
                          SoundEffects.playCardDraw();
                          if (!next) {
                            setSelectedPlayerPkgs(prev => prev.slice(0, 1));
                            setSelectedSpecialPkgs(prev => prev.slice(0, 1));
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all cursor-pointer ${
                          multiPackEnabled
                            ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                            : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                        }`}
                      >
                        <span className="text-[9px] font-bold">باقات متعددة 🔀</span>
                        <div className={`w-6 h-3.5 rounded-full bg-slate-800 p-0.5 flex transition-colors relative ${multiPackEnabled ? "bg-emerald-600 justify-end" : "justify-start"}`}>
                          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                        </div>
                      </button>
                    </div>

                    {/* Packs Selection Grid (PES Style: Player on Right, Tactical on Left) */}
                    <div className="grid grid-cols-2 gap-3.5">
                      
                      {/* Player Packs (Right in RTL / First in DOM) */}
                      <div className="flex flex-col">
                        <h3 className="text-[10px] font-black text-slate-400 mb-1.5 text-right">باقات اللاعبين والفرق ⚽</h3>
                        <div className="relative h-[140px] sm:h-[180px] bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-inner">
                          {/* Up Navigation Button */}
                          <button
                            type="button"
                            onClick={() => handleNavigate("up", true)}
                            className="absolute top-1 left-1/2 -translate-x-1/2 z-30 bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/10 rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Selector focus line (Middle Overlay) */}
                          <div className="absolute top-[45px] sm:top-[65px] left-2 right-2 h-[50px] border-y border-emerald-500/40 bg-emerald-500/5 pointer-events-none z-20 rounded-md shadow-[0_0_15px_rgba(16,185,129,0.03)]" />
                          
                          {/* List Container */}
                          <div
                            ref={playerScrollRef}
                            onScroll={handlePlayerScroll}
                            className="h-full overflow-y-auto snap-y snap-mandatory py-[45px] sm:py-[65px] scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
                          >
                            {dbPackages
                              .filter(p => p.type === "player" || !p.type)
                              .map((pkg) => {
                                const isSelected = selectedPlayerPkgs.includes(pkg.id);
                                const isFocused = focusedPlayerId === pkg.id;
                                return (
                                  <div
                                    key={pkg.id}
                                    data-pkg-id={pkg.id}
                                    onClick={(e) => handleSelectPlayerPkg(pkg.id, e.currentTarget)}
                                    className={`snap-center h-[50px] flex items-center justify-between px-3 cursor-pointer transition-all duration-300 ${
                                      isFocused
                                        ? "scale-105 font-black text-white bg-white/5"
                                        : "scale-95 font-medium text-slate-500 opacity-60 hover:opacity-80"
                                    }`}
                                    style={isFocused ? { textShadow: "0 0 10px rgba(16,185,129,0.4)" } : undefined}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-base">{pkg.image || "⚽"}</span>
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

                          {/* Down Navigation Button */}
                          <button
                            type="button"
                            onClick={() => handleNavigate("down", true)}
                            className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/10 rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tactical Packs (Left in RTL / Second in DOM) */}
                      <div className="flex flex-col">
                        <h3 className="text-[10px] font-black text-slate-400 mb-1.5 text-right">باقات الكروت التكتيكية 🃏</h3>
                        <div className="relative h-[140px] sm:h-[180px] bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-inner">
                          {/* Up Navigation Button */}
                          <button
                            type="button"
                            onClick={() => handleNavigate("up", false)}
                            className="absolute top-1 left-1/2 -translate-x-1/2 z-30 bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/10 rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Selector focus line (Middle Overlay) */}
                          <div className="absolute top-[45px] sm:top-[65px] left-2 right-2 h-[50px] border-y border-amber-500/40 bg-amber-500/5 pointer-events-none z-20 rounded-md shadow-[0_0_15px_rgba(245,158,11,0.03)]" />
                          
                          {/* List Container */}
                          <div
                            ref={tacticalScrollRef}
                            onScroll={handleTacticalScroll}
                            className="h-full overflow-y-auto snap-y snap-mandatory py-[45px] sm:py-[65px] scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
                          >
                            {[
                              { id: "none", name: "بدون كروت تكتيكية", type: "special", image: "🚫" },
                              ...dbPackages.filter(p => p.type === "special" || p.type === "tactical")
                            ].map((pkg) => {
                              const isSelected = selectedSpecialPkgs.includes(pkg.id);
                              const isFocused = focusedSpecialId === pkg.id;
                              return (
                                  <div
                                    key={pkg.id}
                                    data-pkg-id={pkg.id}
                                    onClick={(e) => handleSelectSpecialPkg(pkg.id, e.currentTarget)}
                                    className={`snap-center h-[50px] flex items-center justify-between px-3 cursor-pointer transition-all duration-300 ${
                                      isFocused
                                        ? "scale-105 font-black text-white bg-white/5"
                                        : "scale-95 font-medium text-slate-500 opacity-60 hover:opacity-80"
                                    }`}
                                    style={isFocused ? { textShadow: "0 0 10px rgba(245,158,11,0.4)" } : undefined}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-base">{pkg.image || "🃏"}</span>
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

                          {/* Down Navigation Button */}
                          <button
                            type="button"
                            onClick={() => handleNavigate("down", false)}
                            className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/10 rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Previews Side-by-Side (PES detail boxes) */}
                    <div className="grid grid-cols-2 gap-3.5 mt-2">
                      
                      {/* Player Preview (Right) */}
                      <div>
                        {focusedPlayer ? (
                          <div className="p-2 border border-white/10 bg-black/40 rounded-xl min-h-[64px] flex flex-col justify-center text-right shadow-md">
                            <div className="flex items-center gap-1.5 mb-0.5 justify-end">
                              <span className="text-[10px] font-black text-white">{focusedPlayer.name}</span>
                              <span className="text-base">{focusedPlayer.image || "⚽"}</span>
                            </div>
                            <p className="text-[8.5px] text-slate-400 leading-tight block truncate max-w-[170px]">
                              {focusedPlayer.description || "باقة لاعبين وفرق كاملة للمباراة."}
                            </p>
                          </div>
                        ) : (
                          <div className="p-2 border border-white/5 bg-black/20 rounded-xl min-h-[64px] flex items-center justify-center text-[9px] text-slate-500 text-center">
                            يرجى تحديد باقة
                          </div>
                        )}
                      </div>

                      {/* Tactical Preview (Left) */}
                      <div>
                        {focusedSpecialId === "none" ? (
                          <div className="p-2 border border-white/10 bg-black/40 rounded-xl min-h-[64px] flex flex-col justify-center text-center shadow-md">
                            <span className="text-base">🚫</span>
                            <span className="text-[9.5px] font-black text-amber-400">بدون كروت تكتيكية</span>
                            <span className="text-[8px] text-slate-400 leading-tight mt-0.5">لعب مباراة نظيفة بدون تكتيكات</span>
                          </div>
                        ) : focusedSpecial ? (
                          <div className="p-2 border border-white/10 bg-black/40 rounded-xl min-h-[64px] flex flex-col justify-center text-right shadow-md">
                            <div className="flex items-center gap-1.5 mb-0.5 justify-end">
                              <span className="text-[10px] font-black text-white">{focusedSpecial.name}</span>
                              <span className="text-base">{focusedSpecial.image || "🃏"}</span>
                            </div>
                            <p className="text-[8.5px] text-slate-400 leading-tight block truncate max-w-[170px]">
                              {focusedSpecial.description || "مجموعة كروت التكتيكات الخاصة."}
                            </p>
                          </div>
                        ) : (
                          <div className="p-2 border border-white/5 bg-black/20 rounded-xl min-h-[64px] flex items-center justify-center text-[9px] text-slate-500 text-center">
                            لم يتم تحديد باقة تكتيكات
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-3">
                      <button
                        type="button"
                        onClick={() => { SoundEffects.playCardDraw(); setPlayStep("mode_selection"); }}
                        className="px-4 py-1 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer"
                      >
                        السابق
                      </button>
                      <button
                        type="button"
                        disabled={selectedPlayerPkgs.length === 0}
                        onClick={() => { SoundEffects.playCardDraw(); setPlayStep("match"); }}
                        className={`px-5 py-1 bg-emerald-500 text-black font-black text-[9px] rounded-lg flex items-center gap-1 transition-all ${
                          selectedPlayerPkgs.length === 0 
                            ? "opacity-50 cursor-not-allowed" 
                            : "hover:bg-emerald-400 cursor-pointer"
                        }`}
                      >
                        <span>التالي: صعوبة المباراة</span>
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Play Wizard Step 3: Match Details & Start */}
                {playStep === "match" && (
                  <motion.div
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2.5"
                  >
                    <div className="text-right border-b border-white/5 pb-1.5 mb-2">
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">مرحلة 3 من 3: صعوبة وضوابط المباراة</span>
                      <h3 className="text-sm font-black text-white">اختر صعوبة مدرب الخصم وإعدادات زمن المباراة</h3>
                    </div>

                    {/* Difficulty Row */}
                    <div className="flex flex-row gap-1.5 w-full bg-black/20 p-1.5 border border-white/5 rounded-xl">
                      {[
                        { id: "normal", label: "مدرب ناشئ", color: "border-emerald-500 text-emerald-400 bg-emerald-950/15" },
                        { id: "tactical", label: "مدرب محترف", color: "border-amber-500 text-amber-400 bg-amber-950/15" },
                        { id: "legend", label: "جوارديولا (ذكي)", color: "border-rose-500 text-rose-450 bg-rose-950/15" }
                      ].map((lvl) => {
                        const isSelected = difficulty === lvl.id;
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => { SoundEffects.playCardDraw(); setDifficulty(lvl.id as any); }}
                            className={`flex-1 py-1 rounded-lg border text-center font-extrabold text-[9.5px] cursor-pointer transition-all ${
                              isSelected ? lvl.color : "border-white/5 bg-transparent text-slate-500 hover:text-white"
                            }`}
                          >
                            {lvl.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Game Mode Choice */}
                    <div className="space-y-1 text-right bg-black/20 p-1.5 border border-white/5 rounded-xl">
                      <label className="block text-[#e0e0e0]/60 font-black text-[9px] mb-1">نظام تحديد وقت ومده المباراة:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "time", label: "نظام زمني ⏱️" },
                          { id: "rounds", label: "نظام جولات 🔁" }
                        ].map((m) => {
                          const isSelected = gameMode === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { SoundEffects.playCardDraw(); setGameMode(m.id as any); }}
                              className={`py-1 rounded-lg border text-center font-extrabold text-[9px] cursor-pointer transition-all ${
                                isSelected 
                                  ? "border-emerald-500 text-emerald-450 bg-emerald-950/20" 
                                  : "border-white/5 bg-black/25 text-slate-400 hover:text-white"
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-black/20 p-2 border border-white/5 rounded-xl">
                      {/* Winning Goals (Target score) */}
                      <div className="space-y-1 text-right col-span-2">
                        <div className="flex items-center justify-between text-[8px] text-emerald-400">
                          <span>{winningGoals} أهداف</span>
                          <span className="font-bold">عدد أهداف الفوز:</span>
                        </div>
                        <input
                          type="range"
                          min={3}
                          max={10}
                          step={1}
                          value={winningGoals}
                          onChange={(e) => setWinningGoals(Number(e.target.value))}
                          className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      {/* Left: game duration option depending on gameMode */}
                      {gameMode === "time" ? (
                        <div className="space-y-1 text-right">
                          <div className="flex items-center justify-between text-[8px] text-emerald-400">
                            <span>{matchDuration === 0 ? "بدون وقت" : `${Math.floor(matchDuration / 60)} د`}</span>
                            <span className="font-bold">وقت المباراة:</span>
                          </div>
                          <select
                            value={matchDuration}
                            onChange={(e) => setMatchDuration(Number(e.target.value))}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-1 text-[9px] text-[#e0e0e0] font-bold text-right cursor-pointer"
                          >
                            <option value={180}>3 دقائق</option>
                            <option value={300}>5 دقائق</option>
                            <option value={600}>10 دقائق</option>
                            <option value={900}>15 دقيقة</option>
                            <option value={1200}>20 دقيقة</option>
                            <option value={1800}>30 دقيقة</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1 text-right">
                          <div className="flex items-center justify-between text-[8px] text-emerald-400">
                            <span>{totalRounds} جولة ({totalRounds / 2} لكل لاعب)</span>
                            <span className="font-bold">عدد الجولات (زوجي):</span>
                          </div>
                          <select
                            value={totalRounds}
                            onChange={(e) => setTotalRounds(Number(e.target.value))}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-1 text-[9px] text-[#e0e0e0] font-bold text-right cursor-pointer"
                          >
                            <option value={6}>6 جولات</option>
                            <option value={8}>8 جولات</option>
                            <option value={10}>10 جولات</option>
                            <option value={12}>12 جولة</option>
                            <option value={14}>14 جولة</option>
                            <option value={16}>16 جولة</option>
                            <option value={18}>18 جولة</option>
                            <option value={20}>20 جولة</option>
                          </select>
                        </div>
                      )}

                      {/* Right: break duration (only for time mode) or legends pct (for both) */}
                      {gameMode === "time" ? (
                        <div className="space-y-1 text-right">
                          <div className="flex items-center justify-between text-[8px] text-emerald-400">
                            <span>{halfTimeBreakDuration} ثانية</span>
                            <span className="font-bold">استراحة الشوطين:</span>
                          </div>
                          <select
                            value={halfTimeBreakDuration}
                            onChange={(e) => setHalfTimeBreakDuration(Number(e.target.value))}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-1 text-[9px] text-[#e0e0e0] font-bold text-right cursor-pointer"
                          >
                            <option value={30}>30 ثانية</option>
                            <option value={45}>45 ثانية</option>
                            <option value={60}>دقيقة واحدة</option>
                            <option value={90}>دقيقة ونصف</option>
                            <option value={120}>دقيقتين</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1 text-right">
                          <div className="flex items-center justify-between text-[8px] text-amber-400">
                            <span>{legendPercentage}%</span>
                            <span className="font-bold">نسبة الأساطير:</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={legendPercentage}
                            onChange={(e) => setLegendPercentage(Number(e.target.value))}
                            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500 mt-2"
                          />
                        </div>
                      )}

                      {/* Add legends pct in second row if time mode */}
                      {gameMode === "time" && (
                        <div className="space-y-1 text-right col-span-2">
                          <div className="flex items-center justify-between text-[8px] text-amber-400">
                            <span>{legendPercentage}%</span>
                            <span className="font-bold">نسبة الأساطير:</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={legendPercentage}
                            onChange={(e) => setLegendPercentage(Number(e.target.value))}
                            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500 mt-2"
                          />
                        </div>
                      )}
                    </div>

                    {/* Advanced Match Customization Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-black/20 p-2 border border-white/5 rounded-xl text-right text-[8px] animate-fadeIn">
                      {/* Right: Draws & Moves configuration */}
                      <div className="space-y-1.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[#e0e0e0]/70 text-[8px]">
                            <span className="font-extrabold text-emerald-400">{maxDrawsPerTurn} سحبات</span>
                            <span className="font-black">السحبات لكل دورة:</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={maxDrawsPerTurn}
                            onChange={(e) => setMaxDrawsPerTurn(Number(e.target.value))}
                            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[#e0e0e0]/70 text-[8px]">
                            <span className="font-extrabold text-emerald-400">{maxMovesPerTurn} حركات</span>
                            <span className="font-black">الحركات لكل دورة:</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={maxMovesPerTurn}
                            onChange={(e) => setMaxMovesPerTurn(Number(e.target.value))}
                            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[#e0e0e0]/70 text-[8px]">
                            <span className="font-extrabold text-emerald-400">{initialCardsCount} لاعبين</span>
                            <span className="font-black">كروت مرحلة التسخين:</span>
                          </div>
                          <input
                            type="range"
                            min={3}
                            max={7}
                            step={1}
                            value={initialCardsCount}
                            onChange={(e) => setInitialCardsCount(Number(e.target.value))}
                            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Left: Legend burn limit & Max Booster Value */}
                      <div className="space-y-1.5 flex flex-col justify-center">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-amber-400 text-[8px]">
                            <span className="font-extrabold text-amber-400">
                              {legendBurnLimit === 0 ? "مجاناً (0)" : `${legendBurnLimit} كروت`}
                            </span>
                            <span className="font-black">حرق كروت للأسطورة:</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={4}
                            step={1}
                            value={legendBurnLimit}
                            onChange={(e) => setLegendBurnLimit(Number(e.target.value))}
                            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-emerald-400 text-[8px]">
                            <span className="font-extrabold text-emerald-400">{maxBonusValue === 0 ? "بدون معزز (0)" : maxBonusValue}</span>
                            <span className="font-black">أقصى قيمة للمعزز:</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={maxBonusValue}
                            onChange={(e) => setMaxBonusValue(Number(e.target.value))}
                            className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { SoundEffects.playCardDraw(); setPlayStep("packages"); }}
                        className="px-4 py-1 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer"
                      >
                        السابق
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-1.5 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-black font-black text-[10px] rounded-xl flex items-center gap-1 shadow-lg cursor-pointer border-none"
                      >
                        <span>انطلاق المباراة! 🏁⚽</span>
                      </button>
                    </div>
                  </motion.div>
                )}

              </form>
              )}
            </motion.div>
          )}

          {/* TAB 3: DECKS GALLERY */}
          {activeTab === "decks" && (
            <motion.div
              key="tab_decks"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full space-y-3"
            >
              <div className="text-right border-b border-white/5 pb-1.5">
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">🎴 مستودع الباقات والتشكيلات</span>
                <h3 className="text-sm font-black text-white">قائمة باقات اللعب المتوفرة بالنظام</h3>
              </div>

              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-right scrollbar-thin scrollbar-thumb-emerald-500/20">
                {dbPackages.length === 0 ? (
                  <div className="p-3 bg-black/35 rounded-xl border border-white/5 text-[9px] text-slate-500 text-center leading-normal">
                    لا يوجد باقات مخصصة حالياً بجدول Supabase. تعمل اللعبة بالباقات والتشكيلات المدمجة محلياً (30 لاعب أسطورة وعادي مع 6 كروت تكتيكية).
                  </div>
                ) : (
                  dbPackages.map((pkg) => (
                    <div key={pkg.id} className="p-2 bg-black/45 border border-white/5 rounded-lg flex items-center justify-between gap-2">
                      <span className="text-[8px] text-slate-500">
                        {pkg.type === "special" ? "باقة تكتيكية خاصة" : "باقة لاعبين"}
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-[10px] block text-emerald-400">{pkg.name} {pkg.image}</span>
                        <span className="text-[8px] text-slate-500 block truncate max-w-[180px]">{pkg.description || "لا يوجد وصف لهذه الباقة"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: RULES BOOK */}
          {activeTab === "rules" && (
            <motion.div
              key="tab_rules"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full space-y-2.5"
            >
              {/* Sub tabs inside rules */}
              <div className="flex border-b border-white/5 bg-black/25 rounded-t-lg overflow-x-auto">
                {[
                  { id: "basics", label: "الأساسيات" },
                  { id: "actions", label: "الحركات" },
                  { id: "attacking", label: "الهجوم" },
                  { id: "specials", label: "التكتيكات" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { SoundEffects.playCardDraw(); setRulesCategory(t.id as any); }}
                    className={`flex-1 py-1.5 text-[9px] font-black text-center border-b-2 cursor-pointer transition-all ${
                      rulesCategory === t.id
                        ? "border-emerald-400 text-emerald-400 bg-white/5"
                        : "border-transparent text-slate-500 hover:text-slate-350"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Scrollable rules text */}
              <div className="max-h-[120px] overflow-y-auto text-right text-[9px] text-slate-300 leading-normal space-y-2 pr-1 scrollbar-thin scrollbar-thumb-emerald-500/20">
                {rulesCategory === "basics" && (
                  <>
                    <h4 className="font-bold text-[10px] text-emerald-400">الهدف والبداية (التسخين):</h4>
                    <p>اللعبة تحدي 1 ضد 1. أول مدرب يسجل <strong className="text-white">5 أهداف</strong> هو الفائز.</p>
                    <p>في البداية، يسحب كل مدرب 5 لاعبين ويضعهم أمامه مقلوبين بالملعب. يمنع بدء أي لاعب أسطورة على الملعب في التسخين (يتم إرجاعه للحقيبة في حال ظهوره وسحب كارت بديل).</p>
                  </>
                )}
                {rulesCategory === "actions" && (
                  <>
                    <h4 className="font-bold text-[10px] text-emerald-400">حركات اللعب والدور:</h4>
                    <p>تسحب كارتين في بداية دورك. وتمتلك <strong className="text-white">3 حركات كحد أقصى</strong> في كل دور.</p>
                    <p>الحركات تشمل: تبديل لاعب مكشوف (1 حركة)، تبديل لاعب مقلوب (1 حركة)، إنزال أسطورة (1 حركة + حرق كارتين من يدك)، أو شن هجوم (1 حركة).</p>
                  </>
                )}
                {rulesCategory === "attacking" && (
                  <>
                    <h4 className="font-bold text-[10px] text-emerald-400">قواعد الهجوم والحسم:</h4>
                    <p>يكلف الهجوم حركة واحدة. تختار مهاجماً مقلوباً وتكشف قوته، ثم تسحب كارت معزز الهجمة من +1 إلى القيمة القصوى عشوائياً لدعم الهجمة.</p>
                    <p>يمتلك الخصم 3 حركات فورية لصد الهجوم بكشف المدافعين أو لعب كروت تكتيكية. نقارن إجمالي قوة الهجوم بالدفاع، وإذا تفوق الهجوم يتم إحراز هدف.</p>
                  </>
                )}
                {rulesCategory === "specials" && (
                  <>
                    <h4 className="font-bold text-[10px] text-emerald-450">الكروت التكتيكية الخاصة:</h4>
                    <p>🚌 ركن الباص: تمنح صد دفاعي قوي بمقدار +6 دفاع.</p>
                    <p>🌧️ عشب مبلل: تقلل قوة هجوم أو دفاع الخصم بـ -4 نقاط.</p>
                    <p>🚩 تسلل مباغت: يلغي نقاط أقوى مهاجم للخصم في الهجمة تماماً.</p>
                    <p>🟥 كارت أحمر: يطرد أي لاعب مكشوف لخصمك نهائياً خارج الملعب.</p>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === "settings" && (
            <motion.div
              key="tab_settings"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-3"
            >
              {/* Profile Card and Coins Display (Header) */}
              <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md backdrop-blur-md text-right">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full border border-emerald-500/30 bg-black/40 flex items-center justify-center overflow-hidden">
                    {currentUser?.team_logo && currentUser.team_logo.startsWith("http") ? (
                      <img 
                        src={currentUser.team_logo} 
                        alt="Logo" 
                        className="w-full h-full object-contain p-0.5"
                        onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                      />
                    ) : (
                      <span className="text-xl">🛡️</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-white">{currentUser?.name}</span>
                      <span className="text-xs">{getFlagByCountryCode(currentUser?.country || "EG")}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 block">{currentUser?.team_name} ({currentUser?.team_abbreviation})</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl shadow-xs">
                  <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-xs font-black text-amber-400">{currentUser?.coins ?? 1000}</span>
                </div>
              </div>

              {/* Sub-tabs Navigation */}
              <div className="flex bg-black/40 border border-white/5 rounded-xl p-1 gap-1 shrink-0">
                {[
                  { id: "profile", label: "الملف الشخصي 👤" },
                  { id: "match", label: "افتراضيات اللعب ⚙️" },
                  { id: "password", label: "الحماية 🔐" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      SoundEffects.playCardDraw();
                      setSettingsSubTab(tab.id as any);
                      setSettingsError(null);
                      setSettingsSuccess(null);
                    }}
                    className={`flex-1 py-1 rounded-lg text-[9.5px] font-black text-center cursor-pointer transition-all ${
                      settingsSubTab === tab.id
                        ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notification banners */}
              {settingsError && (
                <div className="bg-rose-950/20 border border-rose-500/30 text-rose-400 p-2 rounded-xl text-[9px] font-black text-right animate-pulse">
                  ⚠️ {settingsError}
                </div>
              )}
              {settingsSuccess && (
                <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-450 p-2 rounded-xl text-[9px] font-black text-right">
                  ✓ {settingsSuccess}
                </div>
              )}

              {/* SUB-TAB CONTENTS (Scrollable area) */}
              <div className="max-h-[160px] overflow-y-auto pr-1 text-right scrollbar-thin scrollbar-thumb-emerald-500/20 space-y-3">
                
                {/* 1. Profile sub-tab */}
                {settingsSubTab === "profile" && (
                  <form onSubmit={handleSaveProfile} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[#e0e0e0]/60 font-black text-[9px]">اسم المدرب:</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[#e0e0e0]/60 font-black text-[9px]">اسم الفريق:</label>
                        <input
                          type="text"
                          required
                          value={editTeamName}
                          onChange={(e) => setEditTeamName(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1 col-span-2">
                        <div className="flex justify-between items-center">
                          <button
                            type="button"
                            onClick={() => setShowLogoTip(!showLogoTip)}
                            className="text-[7.5px] font-bold text-emerald-400 flex items-center gap-0.5 hover:underline cursor-pointer border-none bg-transparent"
                          >
                            <span>رابط الشعار؟ 🔗</span>
                          </button>
                          <label className="block text-[#e0e0e0]/60 font-black text-[9px]">رابط صورة الشعار:</label>
                        </div>
                        <input
                          type="url"
                          value={editTeamLogo}
                          onChange={(e) => setEditTeamLogo(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold font-mono"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[#e0e0e0]/60 font-black text-[9px]">اختصار (3 حروف):</label>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          value={editTeamAbbr}
                          onChange={(e) => setEditTeamAbbr(e.target.value.toUpperCase())}
                          className="w-full px-2 py-1 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-center text-xs font-black uppercase font-mono"
                        />
                      </div>
                    </div>

                    {showLogoTip && (
                      <div className="bg-black/80 border border-emerald-500/20 rounded-xl p-2 text-right text-[8px] text-slate-355 leading-normal space-y-1">
                        <span className="font-black text-emerald-400 block">💡 احصل على رابط شعارك:</span>
                        ارفع شعارك على موقع مثل <a href="https://uploadimgur.com/" target="_blank" rel="noreferrer" className="text-white hover:underline">uploadimgur.com</a> ثم انسخ <strong>"الرابط المباشر" (Direct Link)</strong> الذي ينتهي بـ `.png` أو `.jpg` وضعه بالحقل.
                      </div>
                    )}

                    {/* Country grid selection */}
                    <div className="space-y-1">
                      <label className="block text-[#e0e0e0]/60 font-black text-[9px]">علم الدولة للفريق:</label>
                      <div className="grid grid-cols-6 gap-1 bg-black/40 p-1 border border-white/5 rounded-xl">
                        {COUNTRIES.map((c) => {
                          const isSelected = editCountry === c.code;
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => { SoundEffects.playCardDraw(); setEditCountry(c.code); }}
                              className={`flex flex-col items-center justify-center p-0.5 rounded-md border cursor-pointer transition-all ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-950/20 text-white"
                                  : "border-transparent bg-transparent text-slate-500 hover:border-white/10"
                              }`}
                              title={c.name}
                            >
                              {c.code === "LEGEND" ? (
                                <span className="text-sm leading-none">👑</span>
                              ) : (
                                <img 
                                  src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                                  alt={c.name} 
                                  className="w-5 h-3.5 object-cover rounded-xs shadow-xs" 
                                />
                              )}
                              <span className="text-[6px] font-bold mt-0.5 truncate max-w-[24px]">{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-lg transition-all cursor-pointer border-none"
                    >
                      حفظ التغييرات بالملف الشخصي 💾
                    </button>
                  </form>
                )}

                {/* 2. Match defaults sub-tab */}
                {settingsSubTab === "match" && (
                  <form onSubmit={handleSaveMatchDefaults} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-right">
                      {/* Difficulty Selection */}
                      <div className="space-y-1 col-span-2">
                        <label className="block text-[#e0e0e0]/60 font-black text-[9px]">صعوبة المباراة الافتراضية:</label>
                        <div className="grid grid-cols-3 gap-1 bg-black/45 p-0.5 border border-white/5 rounded-lg">
                          {[
                            { id: "normal", label: "ناشئ 🟢" },
                            { id: "tactical", label: "محترف 🟡" },
                            { id: "legend", label: "أسطوري 🔴" }
                          ].map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => { SoundEffects.playCardDraw(); setDefDiff(d.id as any); }}
                              className={`py-1 rounded-md text-[8.5px] font-black text-center cursor-pointer transition-all ${
                                defDiff === d.id
                                  ? "bg-white/10 text-white border border-white/20"
                                  : "text-slate-500 hover:text-slate-350 border border-transparent"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Game Duration System Default */}
                      <div className="space-y-1 col-span-2">
                        <label className="block text-[#e0e0e0]/60 font-black text-[9px]">نظام تحديد وقت المباراة الافتراضي:</label>
                        <div className="grid grid-cols-2 gap-1.5 bg-black/45 p-0.5 border border-white/5 rounded-lg">
                          {[
                            { id: "time", label: "نظام زمني ⏱️" },
                            { id: "rounds", label: "نظام جولات 🔁" }
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { SoundEffects.playCardDraw(); setDefGameMode(m.id as any); }}
                              className={`py-1 rounded-md text-[8.5px] font-black text-center cursor-pointer transition-all ${
                                defGameMode === m.id
                                  ? "bg-white/10 text-white border border-white/20"
                                  : "text-slate-500 hover:text-slate-350 border border-transparent"
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Winning goals default */}
                      <div className="space-y-1 col-span-2">
                        <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                          <span className="font-extrabold">{defWinningGoals} أهداف</span>
                          <span className="font-black text-[#e0e0e0]/60">أهداف الفوز الافتراضية:</span>
                        </div>
                        <input
                          type="range"
                          min={3}
                          max={10}
                          step={1}
                          value={defWinningGoals}
                          onChange={(e) => setDefWinningGoals(Number(e.target.value))}
                          className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      {/* Duration/Rounds dependent default */}
                      {defGameMode === "time" ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                            <span className="font-extrabold">
                              {defDuration >= 60 
                                ? `${Math.floor(defDuration / 60)} دقيقة`
                                : `${defDuration} ثانية`}
                            </span>
                            <span className="font-black text-[#e0e0e0]/60">وقت المباراة:</span>
                          </div>
                          <select
                            value={defDuration}
                            onChange={(e) => setDefDuration(Number(e.target.value))}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-1 text-[9px] text-[#e0e0e0] font-bold text-right cursor-pointer"
                          >
                            <option value={180}>3 دقائق</option>
                            <option value={300}>5 دقائق</option>
                            <option value={600}>10 دقائق</option>
                            <option value={900}>15 دقيقة</option>
                            <option value={1200}>20 دقيقة</option>
                            <option value={1800}>30 دقيقة</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                            <span className="font-extrabold">{defTotalRounds} جولة</span>
                            <span className="font-black text-[#e0e0e0]/60">عدد الجولات:</span>
                          </div>
                          <select
                            value={defTotalRounds}
                            onChange={(e) => setDefTotalRounds(Number(e.target.value))}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-1 text-[9px] text-[#e0e0e0] font-bold text-right cursor-pointer"
                          >
                            <option value={6}>6 جولات</option>
                            <option value={8}>8 جولات</option>
                            <option value={10}>10 جولات</option>
                            <option value={12}>12 جولة</option>
                            <option value={14}>14 جولة</option>
                            <option value={16}>16 جولة</option>
                            <option value={18}>18 جولة</option>
                            <option value={20}>20 جولة</option>
                          </select>
                        </div>
                      )}

                      {/* Halftime break default (visible only in time mode) */}
                      {defGameMode === "time" ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                            <span className="font-extrabold">{defHalfTimeBreakDuration} ثانية</span>
                            <span className="font-black text-[#e0e0e0]/60">استراحة الشوطين:</span>
                          </div>
                          <select
                            value={defHalfTimeBreakDuration}
                            onChange={(e) => setDefHalfTimeBreakDuration(Number(e.target.value))}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-1 text-[9px] text-[#e0e0e0] font-bold text-right cursor-pointer"
                          >
                            <option value={30}>30 ثانية</option>
                            <option value={45}>45 ثانية</option>
                            <option value={60}>دقيقة واحدة</option>
                            <option value={90}>دقيقة ونصف</option>
                            <option value={120}>دقيقتين</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {/* Placeholder to keep layout symmetrical when in rounds mode */}
                          <div className="h-full w-full opacity-0" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                          <span className="font-extrabold">{defLegendPct}%</span>
                          <span className="font-black text-[#e0e0e0]/60">نسبة كروت الأساطير:</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={defLegendPct}
                          onChange={(e) => setDefLegendPct(Number(e.target.value))}
                          className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                          <span className="font-extrabold">{defMaxDraws} سحبات</span>
                          <span className="font-black text-[#e0e0e0]/60">حد السحب بالدور:</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={defMaxDraws}
                          onChange={(e) => setDefMaxDraws(Number(e.target.value))}
                          className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                          <span className="font-extrabold">{defMaxMoves} حركات</span>
                          <span className="font-black text-[#e0e0e0]/60">حركات اللعب بالدور:</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={defMaxMoves}
                          onChange={(e) => setDefMaxMoves(Number(e.target.value))}
                          className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                          <span className="font-extrabold">{defInitCards} كروت</span>
                          <span className="font-black text-[#e0e0e0]/60">كروت البداية:</span>
                        </div>
                        <input
                          type="range"
                          min={3}
                          max={8}
                          step={1}
                          value={defInitCards}
                          onChange={(e) => setDefInitCards(Number(e.target.value))}
                          className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                          <span className="font-extrabold">
                            {defLegendBurn === 0 ? "مجاناً (0)" : `${defLegendBurn} كروت`}
                          </span>
                          <span className="font-black text-[#e0e0e0]/60">حرق لإنزال الأسطورة:</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={4}
                          step={1}
                          value={defLegendBurn}
                          onChange={(e) => setDefLegendBurn(Number(e.target.value))}
                          className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-1 col-span-2">
                        <div className="flex items-center justify-between text-emerald-400 text-[8.5px]">
                          <span className="font-extrabold">{defMaxBonus === 0 ? "بدون معزز (0)" : defMaxBonus}</span>
                          <span className="font-black text-[#e0e0e0]/60">أقصى قيمة لمعزز الهجمات:</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={defMaxBonus}
                          onChange={(e) => setDefMaxBonus(Number(e.target.value))}
                          className="w-full h-1 bg-black/50 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-lg transition-all cursor-pointer border-none"
                    >
                      حفظ إعدادات الماتش الافتراضية 💾
                    </button>
                  </form>
                )}

                {/* 3. Password change sub-tab */}
                {settingsSubTab === "password" && (
                  <form onSubmit={handleChangePassword} className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="block text-[#e0e0e0]/60 font-black text-[9px]">كلمة المرور القديمة:</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[#e0e0e0]/60 font-black text-[9px]">كلمة المرور الجديدة:</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold font-mono"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[#e0e0e0]/60 font-black text-[9px]">تأكيد الجديدة:</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold font-mono"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-lg transition-all cursor-pointer border-none"
                    >
                      تغيير كلمة المرور بشكل آمن 🔐
                    </button>
                  </form>
                )}

              </div>

              {/* BOTTOM CONTROLS & UTILITIES */}
              <div className="border-t border-white/10 pt-2.5 mt-2 space-y-2">
                {/* Sound control toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`w-full py-1.5 rounded-xl text-[9px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 border border-white/5 ${
                    isMuted 
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/25" 
                      : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  }`}
                >
                  <span>{isMuted ? "الصوت مكتوم 🔇" : "الصوت مفعل 🔊"}</span>
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] text-white font-black text-[10px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 transform hover:scale-[1.01] active:scale-[0.99] border-none"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج من الحساب 🚪</span>
                </button>

                {/* Footer Game info */}
                <div className="text-center text-[7.5px] text-slate-600 space-y-0.5 pt-0.5">
                  <div>مرتدة © تحدي التخطيط الكروي الذكي</div>
                  <div>إصدار نظام الحسابات والتحديث التكتيكي v3.0</div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      {activeTab !== "play" && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#060807]/95 border-t border-white/5 h-14 w-full px-2 shrink-0 z-30 backdrop-blur-md flex justify-around items-center">
          {[
            { id: "home", label: "الرئيسية", icon: "🏠" },
            { id: "play", label: "اللعب", icon: "⚔️" },
            { id: "decks", label: "الباقات", icon: "🎴" },
            { id: "rules", label: "القوانين", icon: "📜" },
            { id: "settings", label: "الإعدادات", icon: "⚙️" }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setActiveTab(tab.id as any);
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-0.5 cursor-pointer relative transition-all ${
                  isActive 
                    ? "text-emerald-400 font-black scale-105" 
                    : "text-slate-500 hover:text-slate-400"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-[8.5px] tracking-tight leading-none">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 w-8 h-[2.5px] bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
}
