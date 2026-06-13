/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { Clock, MessageSquareOff, Trash2, Volume2 } from "lucide-react";
import { ActionLog } from "../types";

interface ActionTickerLogProps {
  logs: ActionLog[];
  onClear: () => void;
}

export default function ActionTickerLog({ logs, onClear }: ActionTickerLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // Log level color map
  const getColorClasses = (type: ActionLog["type"]) => {
    switch (type) {
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

  return (
    <div className="bg-[#121412] border border-white/10 rounded-2xl p-4 flex flex-col h-[280px] shadow-lg shadow-black/40">
      {/* Ticker Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
        <button
          onClick={onClear}
          id="clear_logs_button"
          disabled={logs.length === 0}
          className="p-1 px-2.5 rounded-lg text-[11px] font-bold text-[#e0e0e0]/40 hover:text-white bg-black/25 hover:bg-black/45 border border-white/5 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>مسح السجل</span>
        </button>
        <div className="flex items-center gap-1.5 text-white">
          <span className="text-xs md:text-sm font-semibold">شريط الأحداث وحركة المدربين</span>
          <Volume2 className="w-4 h-4 text-[#e0e0e0]/60" />
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
          logs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded-xl border text-right text-xs leading-relaxed transition-all duration-300 flex items-start justify-between gap-3 ${getColorClasses(
                log.type
              )}`}
            >
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono self-start mt-0.5 whitespace-nowrap bg-slate-950/30 px-1.5 py-0.5 rounded">
                <span>{log.timestamp}</span>
                <Clock className="w-2.5 h-2.5" />
              </div>
              <span className="font-medium flex-1">{log.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
