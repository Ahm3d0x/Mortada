import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smartphone, Download, Share2, PlusSquare, X } from "lucide-react";

interface InstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isInstallSupported: boolean;
}

export default function InstallPromptModal({
  isOpen,
  onClose,
  onInstall,
  isInstallSupported
}: InstallPromptModalProps) {
  // Detect if current system is likely iOS to display iOS-specific instructions first
  const isIOS = typeof window !== "undefined" && 
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          {/* Backdrop Tap to Close */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            className="relative max-w-md w-full bg-[#0b0e0c] border border-emerald-500/30 rounded-3xl p-5 md:p-6 shadow-[0_20px_50px_rgba(16,185,129,0.15)] text-right relative z-10 select-none overflow-hidden"
          >
            {/* Emerald glow circles */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header / Dismiss Trigger */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors border-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon & Title */}
            <div className="flex flex-col items-center justify-center text-center mt-2 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-2.5">
                <Smartphone className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-extrabold text-white">تثبيت مرتدة كبرنامج للموبايل</h2>
              <p className="text-[11px] text-slate-400/80 mt-1 max-w-xs leading-relaxed">
                استمتع بأسلوب لعب كامل بدون أشرطة تبويب المتصفح، وسرعة استجابة مذهلة في وضع الفرجة الكاملة!
              </p>
            </div>

            {/* Core Instruction Body */}
            <div className="space-y-4 my-2.5">
              {isInstallSupported ? (
                <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-2xl p-4 text-center">
                  <p className="text-xs text-emerald-400 font-extrabold mb-3">
                    جهازك يدعم التثبيت الفوري بنقرة واحدة!
                  </p>
                  <button
                    onClick={() => {
                      onInstall();
                      onClose();
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>تثبيت البرنامج الآن 📱</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="bg-amber-950/15 border border-amber-500/15 rounded-xl p-3 text-[10.5px] text-amber-300 font-bold leading-normal text-center">
                    لتثبيت اللعبة على جهازك، يرجى اتباع الخطوات البسيطة أدناه طبقاً لمتصفحك الحالي:
                  </div>

                  {/* Android Chrome Steps */}
                  <div className="space-y-2 border-r-2 border-emerald-500/40 pr-3 text-right">
                    <span className="text-xs font-black text-white block">🌐 لمتصفحي Chrome / Edge / Samsung:</span>
                    <ol className="list-decimal list-inside text-[11px] text-slate-350 space-y-1.5 font-medium leading-relaxed pr-1">
                      <li>اضغط على زر الخيارات <span className="bg-white/10 px-1 py-0.2 rounded font-black">⋮</span> في أعلى أو أسفل المتصفح.</li>
                      <li>اختر التبويب <span className="text-emerald-400 font-bold">"تثبيت التطبيق" (Install App)</span> أو <span className="text-emerald-400 font-bold">"الإضافة إلى الشاشة الرئيسية"</span>.</li>
                      <li>وافق على طلب التثبيت لتبدأ المتعة فورياً!</li>
                    </ol>
                  </div>

                  {/* iOS Safari Steps */}
                  <div className="space-y-2 border-r-2 border-[#a855f7]/40 pr-3 text-right">
                    <span className="text-xs font-black text-white block">🍎 لمتصفح Safari على أجهزة iPhone / iPad:</span>
                    <ol className="list-decimal list-inside text-[11px] text-slate-350 space-y-1.5 font-medium leading-relaxed pr-1">
                      <li className="flex items-center gap-1 flex-row-reverse justify-end">
                        <span>اضغط على أيقونة **المشاركة** </span>
                        <Share2 className="w-3.5 h-3.5 text-blue-400" />
                        <span> بأسفل الشاشة.</span>
                      </li>
                      <li className="flex items-center gap-1 flex-row-reverse justify-end">
                        <span>مرر لأسفل واختر **"إضافة للشاشة الرئيسية"** </span>
                        <PlusSquare className="w-3.5 h-3.5 text-slate-300" />
                        <span>.</span>
                      </li>
                      <li>اضغط على **"إضافة" (Add)** بأعلى اليمين لتتحول اللعبة لتطبيق أسطوري!</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button at bottom */}
            <div className="mt-5 pt-3.5 border-t border-white/5">
              <button
                onClick={onClose}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-black rounded-xl transition-all cursor-pointer text-center"
              >
                فهمت، شكراً ✕
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
