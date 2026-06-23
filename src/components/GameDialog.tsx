/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Info, CheckCircle2, X, AlertCircle } from "lucide-react";

interface GameConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "danger" | "warning" | "info" | "success";
}

export function GameConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  onConfirm,
  onCancel,
  type = "warning",
}: GameConfirmModalProps) {
  if (!isOpen) return null;

  const colorStyles = {
    danger: {
      border: "border-rose-500/30",
      glow: "shadow-[0_0_30px_rgba(239,68,68,0.2)]",
      iconColor: "text-rose-500",
      btnBg: "bg-linear-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]",
    },
    warning: {
      border: "border-amber-500/30",
      glow: "shadow-[0_0_30px_rgba(245,158,11,0.2)]",
      iconColor: "text-amber-500",
      btnBg: "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-450 hover:to-orange-450 text-black shadow-[0_4px_12px_rgba(245,158,11,0.3)]",
    },
    success: {
      border: "border-emerald-500/30",
      glow: "shadow-[0_0_30px_rgba(16,185,129,0.2)]",
      iconColor: "text-emerald-500",
      btnBg: "bg-linear-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black shadow-[0_4px_12px_rgba(16,185,129,0.3)]",
    },
    info: {
      border: "border-blue-500/30",
      glow: "shadow-[0_0_30px_rgba(59,130,246,0.2)]",
      iconColor: "text-blue-500",
      btnBg: "bg-linear-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]",
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`relative w-full max-w-md bg-linear-to-b from-[#090d0b] to-[#040605] border ${colorStyles.border} ${colorStyles.glow} rounded-2xl p-6 text-right select-none z-10`}
        dir="rtl"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon Badge */}
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            {type === "danger" || type === "warning" ? (
              <AlertTriangle className={`w-6 h-6 ${colorStyles.iconColor}`} />
            ) : type === "success" ? (
              <CheckCircle2 className={`w-6 h-6 ${colorStyles.iconColor}`} />
            ) : (
              <Info className={`w-6 h-6 ${colorStyles.iconColor}`} />
            )}
          </div>

          {/* Title & Message */}
          <div className="space-y-2 w-full">
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-medium">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full pt-2">
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 rounded-xl font-black text-xs transition-all cursor-pointer transform active:scale-95 ${colorStyles.btnBg}`}
            >
              {confirmLabel}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl font-black text-xs transition-all cursor-pointer transform active:scale-95"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface GameAlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
  type?: "danger" | "warning" | "info" | "success";
}

export function GameAlertModal({
  isOpen,
  title,
  message,
  buttonLabel = "حسناً",
  onClose,
  type = "info",
}: GameAlertModalProps) {
  if (!isOpen) return null;

  const colorStyles = {
    danger: {
      border: "border-rose-500/30",
      glow: "shadow-[0_0_30px_rgba(239,68,68,0.2)]",
      iconColor: "text-rose-500",
      btnBg: "bg-linear-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]",
    },
    warning: {
      border: "border-amber-500/30",
      glow: "shadow-[0_0_30px_rgba(245,158,11,0.2)]",
      iconColor: "text-amber-500",
      btnBg: "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-450 hover:to-orange-450 text-black shadow-[0_4px_12px_rgba(245,158,11,0.3)]",
    },
    success: {
      border: "border-emerald-500/30",
      glow: "shadow-[0_0_30px_rgba(16,185,129,0.2)]",
      iconColor: "text-emerald-500",
      btnBg: "bg-linear-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black shadow-[0_4px_12px_rgba(16,185,129,0.3)]",
    },
    info: {
      border: "border-blue-500/30",
      glow: "shadow-[0_0_30px_rgba(59,130,246,0.2)]",
      iconColor: "text-blue-500",
      btnBg: "bg-linear-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]",
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`relative w-full max-w-sm bg-linear-to-b from-[#090d0b] to-[#040605] border ${colorStyles.border} ${colorStyles.glow} rounded-2xl p-6 text-right select-none z-10`}
        dir="rtl"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon Badge */}
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            {type === "danger" ? (
              <AlertCircle className={`w-6 h-6 ${colorStyles.iconColor}`} />
            ) : type === "warning" ? (
              <AlertTriangle className={`w-6 h-6 ${colorStyles.iconColor}`} />
            ) : type === "success" ? (
              <CheckCircle2 className={`w-6 h-6 ${colorStyles.iconColor}`} />
            ) : (
              <Info className={`w-6 h-6 ${colorStyles.iconColor}`} />
            )}
          </div>

          {/* Title & Message */}
          <div className="space-y-2 w-full">
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-medium">{message}</p>
          </div>

          {/* Action */}
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-black text-xs transition-all cursor-pointer transform active:scale-95 ${colorStyles.btnBg}`}
          >
            {buttonLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface GameToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  onClose: () => void;
  duration?: number;
}

export function GameToast({
  message,
  type = "success",
  onClose,
  duration = 3000,
}: GameToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    success: {
      bg: "bg-emerald-950/80 border-emerald-500/30 text-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    },
    error: {
      bg: "bg-rose-950/80 border-rose-500/30 text-rose-300 shadow-[0_4px_20px_rgba(239,68,68,0.15)]",
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    },
    warning: {
      bg: "bg-amber-950/80 border-amber-500/30 text-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.15)]",
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    },
    info: {
      bg: "bg-blue-950/80 border-blue-500/30 text-blue-300 shadow-[0_4px_20px_rgba(59,130,246,0.15)]",
      icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
    },
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md ${typeStyles.bg} text-[11px] sm:text-xs font-bold leading-none select-none`}
      dir="rtl"
    >
      {typeStyles.icon}
      <span className="flex-1 whitespace-nowrap">{message}</span>
      <button
        onClick={onClose}
        className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white transition-all ml-1 cursor-pointer"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
