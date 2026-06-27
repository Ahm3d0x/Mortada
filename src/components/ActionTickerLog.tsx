/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { MessageSquareOff, Trash2, Volume2 } from "lucide-react";
import { ActionLog } from "../types";

interface ActionTickerLogProps {
  logs: ActionLog[];
  onClear: () => void;
  multiplayerRole?: "host" | "opponent" | null;
  isOffline?: boolean;
  collapsed?: boolean;
}

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
  let attackVal = attackTotalLine.match(/\d+/)?. [0] || "";
  let defenseVal = defenseTotalLine.match(/\d+/)?. [0] || "";

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

export default function ActionTickerLog({ logs, onClear, multiplayerRole, isOffline, collapsed }: ActionTickerLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastLogsLengthRef = useRef(logs.length);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isNewLogAdded = logs.length > lastLogsLengthRef.current;
    lastLogsLengthRef.current = logs.length;

    // Always scroll to the bottom when a new log arrives so the user never
    // misses a message. The user is still free to scroll up manually at any
    // time between updates.
    if (isNewLogAdded) {
      // Use requestAnimationFrame so the DOM has finished painting the new
      // item before we measure scrollHeight.
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    }
  }, [logs]);

  // Log level and ownership color style map
  const getLogStyle = (log: ActionLog) => {
    // 1. Errors (Yellow / Amber)
    if (log.localOnly || log.type === "warning") {
      return "bg-amber-950/20 border-amber-500/10 text-amber-300";
    }

    // 2. System Logs (Blue / Teal)
    if (log.sender === "system") {
      return "bg-teal-950/10 border-teal-500/10 text-teal-300";
    }

    // 3. Online Mode Style Reciprocity
    if (!isOffline && multiplayerRole) {
      if (log.sender === multiplayerRole) {
        return "bg-emerald-950/20 border-emerald-500/10 text-emerald-300"; // Self (Green)
      }
      const opponentRole = multiplayerRole === "host" ? "opponent" : "host";
      if (log.sender === opponentRole) {
        return "bg-rose-950/25 border-rose-500/10 text-[#fca5a5]"; // Opponent (Red)
      }
    }

    // 4. Offline Mode Style
    if (isOffline) {
      if (log.sender === "player" || log.sender === "host") {
        return "bg-emerald-950/20 border-emerald-500/10 text-emerald-300"; // Player (Green)
      }
      if (log.sender === "ai" || log.sender === "opponent") {
        return "bg-rose-950/25 border-rose-500/10 text-[#fca5a5]"; // AI (Red)
      }
    }

    // Fallback: Log level color map
    switch (log.type as string) {
      case "success":
        return "bg-emerald-950/20 border-emerald-500/10 text-emerald-300";
      case "danger":
        return "bg-rose-950/25 border-rose-500/10 text-[#fca5a5]";
      case "warning":
        return "bg-amber-950/20 border-amber-500/10 text-amber-300";
      case "info":
        return "bg-teal-950/10 border-teal-500/10 text-teal-300";
      default:
        return "bg-black/30 border-white/5 text-[#e0e0e0]/60";
    }
  };

  const renderBreakdownLine = (line: string, idx: number) => {
    const cleanLine = line.replace(/^[●\s\-]+/, "").trim();
    if (!cleanLine) return null;

    // Detect English players names with value, e.g. "Mohamed Salah (15)" or "M. Abou Gabal (12)"
    const isPlayerLine = /^[a-zA-Z].*?\(\d+\)/.test(cleanLine);
    
    if (isPlayerLine) {
      const name = cleanLine.replace(/\(\d+\)/, "").trim();
      const score = cleanLine.match(/\(\d+\)/)?.[0].replace(/[()]/g, "") || "0";
      return (
        <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0" dir="ltr">
          <span className="text-slate-300 font-medium">{name}</span>
          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/45 px-1.5 py-0.2 rounded font-black border border-emerald-500/10">
            {score}
          </span>
        </div>
      );
    }

    // Special card/effect bonuses, e.g. "كارت المعزز: +7 [اختراق منفرد استثنائي لخطوط الدفاع]"
    const hasPlusVal = cleanLine.includes("+") || cleanLine.includes("-") || cleanLine.includes("×");
    
    if (hasPlusVal) {
      return (
        <div key={idx} className="text-right text-[11px] text-amber-300 py-1 leading-normal border-b border-white/5 last:border-0" dir="rtl">
          {cleanLine}
        </div>
      );
    }

    // Generic lines
    return (
      <div key={idx} className="text-right text-[11px] text-slate-300 py-1 leading-normal border-b border-white/5 last:border-0" dir="rtl">
        {cleanLine}
      </div>
    );
  };

  if (collapsed) {
    return (
      <div className="bg-[#121412] border border-white/10 rounded-xl p-1.5 flex items-center justify-between h-[36px] shadow-lg shadow-black/40 w-full select-none" dir="rtl">
        <div className="flex items-center gap-1 text-[#e0e0e0]/70 text-[10px] font-bold">
          <span>التعليق 🎙️ (مطوي)</span>
        </div>
        <div className="text-[9px] text-[#e0e0e0]/40 font-medium font-mono pl-1">
          {logs.length} أحداث
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#121412] border border-white/10 rounded-xl p-2.5 flex flex-col h-full w-full flex-1 min-h-0 shadow-lg shadow-black/40 overflow-hidden">
      {/* Ticker Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-1.5 shrink-0">
        <button
          onClick={onClear}
          id="clear_logs_button"
          disabled={logs.length === 0}
          className="p-1 px-2 rounded-lg text-[10px] font-bold text-[#e0e0e0]/40 hover:text-white bg-black/25 hover:bg-black/45 border border-white/5 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3 h-3" />
          <span>مسح السجل</span>
        </button>
        <div className="flex items-center gap-1 text-white">
          <span className="text-xs font-semibold">التعليق</span>
          <Volume2 className="w-3.5 h-3.5 text-[#e0e0e0]/60" />
        </div>
      </div>

      {/* Ticker Feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1 scroll-smooth"
        id="ticker_log_feed"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-1.5 text-center p-4">
            <MessageSquareOff className="w-8 h-8 text-slate-700" />
            <p className="text-xs font-light">لا توجد أحداث بعد. ابدأ اللقاء وهزّ الشباك!</p>
          </div>
        ) : (
          (() => {
            // Group logs by round/turn
            const groupedLogs: { [round: number]: ActionLog[] } = {};
            logs.forEach((log) => {
              const r = log.round || 1;
              if (!groupedLogs[r]) {
                groupedLogs[r] = [];
              }
              groupedLogs[r].push(log);
            });

            return Object.keys(groupedLogs)
              .map(Number)
              .sort((a, b) => a - b)
              .map((roundNum) => {
                const roundLogs = groupedLogs[roundNum];
                return (
                  <div key={roundNum} className="border border-white/5 bg-black/5 rounded-lg p-2 space-y-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1" dir="rtl">
                      <span className="text-[10px] font-black text-teal-400 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-500/10">
                        الجولة {roundNum} 🏟️
                      </span>
                    </div>
                    <div className="space-y-2">
                      {/* Logs are already in chronological insertion order — no sort needed */}
                      {roundLogs.map((log) => {
                        const isDetailed = log.text.includes("تفاصيل الحسبة الفنية:");
                        
                        if (isDetailed) {
                          const parsed = parseDetailedLog(log.text);
                          return (
                            <div
                              key={log.id}
                              className={`p-2 rounded-lg border text-right text-[11px] leading-relaxed transition-all duration-300 flex flex-col gap-2 ${getLogStyle(
                                log
                              )}`}
                            >
                              {/* Header: Stadium only (no time/clock) */}
                              {parsed.stadium && (
                                <div className="flex items-center justify-end gap-2 border-b border-white/10 pb-1">
                                  <span className="text-[9px] text-slate-300 font-semibold truncate max-w-[90%] text-right" dir="rtl">
                                    {parsed.stadium}
                                  </span>
                                </div>
                              )}

                              {/* Title & Atmosphere Description */}
                              <div className="flex flex-col gap-1 text-right" dir="rtl">
                                {parsed.title && (
                                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                    {parsed.title}
                                  </h4>
                                )}
                                {parsed.description && (
                                  <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">
                                    {parsed.description}
                                  </p>
                                )}
                              </div>

                              {/* Status Banner */}
                              {parsed.statusText && (
                                <div className="bg-black/30 border border-white/5 rounded-lg p-1.5 text-right text-xs font-semibold text-slate-200 leading-relaxed" dir="rtl">
                                  👉 {parsed.statusText}
                                </div>
                              )}

                              {/* Technical Comparison — Attack then Defense stacked vertically */}
                              <div className="flex flex-col gap-2">
                                {/* Attack Box */}
                                <div className="bg-red-950/15 border border-red-500/10 rounded-lg p-1.5 flex flex-col gap-1">
                                  <div className="flex items-center justify-between border-b border-red-500/10 pb-1">
                                    <span className="font-mono text-xs font-black text-red-400 bg-red-950/45 px-1.5 py-0.5 rounded">
                                      {parsed.attackVal} ⚡
                                    </span>
                                    <span className="text-[9px] font-bold text-red-300">الهجوم ⚔️</span>
                                  </div>
                                  <div className="flex flex-col">
                                    {parsed.attackBreakdown.length > 0 ? (
                                      parsed.attackBreakdown.map((line, i) => renderBreakdownLine(line, i))
                                    ) : (
                                      <span className="text-[9px] text-slate-500 italic text-center py-1">لا يوجد</span>
                                    )}
                                  </div>
                                </div>

                                {/* Defense Box */}
                                <div className="bg-blue-950/15 border border-blue-500/10 rounded-lg p-1.5 flex flex-col gap-1">
                                  <div className="flex items-center justify-between border-b border-blue-500/10 pb-1">
                                    <span className="font-mono text-xs font-black text-blue-400 bg-blue-950/45 px-1.5 py-0.5 rounded">
                                      {parsed.defenseVal} 🧱
                                    </span>
                                    <span className="text-[9px] font-bold text-blue-300">الدفاع 🛡️</span>
                                  </div>
                                  <div className="flex flex-col">
                                    {parsed.defenseBreakdown.length > 0 ? (
                                      parsed.defenseBreakdown.map((line, i) => renderBreakdownLine(line, i))
                                    ) : (
                                      <span className="text-[9px] text-slate-500 italic text-center py-1">لا يوجد</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Score / Current state banner */}
                              {parsed.scoreText && (
                                <div className="bg-amber-950/15 border border-amber-500/15 rounded-lg py-1 px-2 flex items-center justify-center gap-1.5 text-amber-300 text-xs font-black" dir="rtl">
                                  <span>🏆</span>
                                  <span>{parsed.scoreText}</span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Fallback for normal/simple logs
                        return (
                          <div
                            key={log.id}
                            className={`p-1.5 rounded-lg border text-right text-xs leading-relaxed transition-all duration-300 flex items-start justify-end gap-1.5 ${getLogStyle(
                              log
                            )}`}
                          >
                            <span className="font-medium flex-1 whitespace-pre-line text-right">{log.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
          })()
        )}
      </div>
    </div>
  );
}
