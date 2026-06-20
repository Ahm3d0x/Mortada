/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import WelcomeMenu from "./components/WelcomeMenu";
import GameOffline from "./components/GameOffline";
import GameOnline from "./components/GameOnline";
import { MatchRoom } from "./lib/supabase";

export default function App() {
  const [mode, setMode] = useState<"menu" | "offline" | "online">("menu");
  const [offlineConfig, setOfflineConfig] = useState<any>(null);
  const [onlineConfig, setOnlineConfig] = useState<any>(null);

  // Mobile & Orientation state for WelcomeMenu layout
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

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

  const handleStartGame = (
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
    setOfflineConfig({
      name,
      vibe,
      diff,
      matchDuration,
      customLegendPercentage,
      maxDraws,
      maxMoves,
      initialCards,
      selectedPlayerPkgs,
      selectedSpecialPkgs,
      defenseDraws,
      legendBurn,
      customMaxBonusValue,
      customGameMode,
      customWinningGoals,
      customTotalRounds,
      customHalfTimeBreakDuration
    });
    setMode("offline");
  };

  const handleStartMultiplayerGame = (room: MatchRoom, role: "host" | "opponent") => {
    setOnlineConfig({ room, role });
    setMode("online");
  };

  const handleReturnToMenu = () => {
    setMode("menu");
    setOfflineConfig(null);
    setOnlineConfig(null);
  };

  if (mode === "offline" && offlineConfig) {
    return <GameOffline config={offlineConfig} onReturnToMenu={handleReturnToMenu} />;
  }

  if (mode === "online" && onlineConfig) {
    return <GameOnline config={onlineConfig} onReturnToMenu={handleReturnToMenu} />;
  }

  return (
    <div className="bg-[#050605] text-[#e0e0e0] font-sans relative select-none w-full h-screen overflow-hidden">
      <WelcomeMenu 
        onStartGame={handleStartGame} 
        onStartMultiplayerGame={handleStartMultiplayerGame} 
        isMobileLandscape={isMobileLandscape} 
      />
    </div>
  );
}
