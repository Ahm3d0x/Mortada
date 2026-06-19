import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Trophy, Swords, Zap, HelpCircle, Mail, Lock, User, Image, Compass, Award, Coins } from "lucide-react";
import { gameAuth } from "../lib/gameAuth";
import { SoundEffects } from "../utils/sounds";

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

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamAbbreviation, setTeamAbbreviation] = useState("");
  const [teamLogo, setTeamLogo] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [role, setRole] = useState<"player" | "admin">("player");

  // Guidelines helper open/close
  const [showLogoTip, setShowLogoTip] = useState(false);

  const toggleMode = () => {
    SoundEffects.playCardDraw();
    setIsLogin(!isLogin);
    setError(null);
  };

  const handleCountrySelect = (code: string) => {
    SoundEffects.playCardDraw();
    setCountry(code);
  };

  const handleRoleSelect = (selectedRole: "player" | "admin") => {
    SoundEffects.playCardDraw();
    setRole(selectedRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isLogin) {
      const res = await gameAuth.signIn(email, password);
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        SoundEffects.playWhistle();
      }
    } else {
      if (password !== confirmPassword) {
        setError("تأكيد كلمة المرور لا يطابق كلمة المرور ⚠️");
        setLoading(false);
        return;
      }
      if (teamAbbreviation.length !== 3) {
        setError("يجب أن يتكون اختصار الفريق من 3 حروف بالضبط ⚠️");
        setLoading(false);
        return;
      }

      const res = await gameAuth.signUp(
        email,
        password,
        name,
        teamName,
        teamAbbreviation,
        teamLogo,
        country,
        role
      );
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        SoundEffects.playWhistle();
      }
    }
  };

  const selectedCountryObj = COUNTRIES.find((c) => c.code === country) || COUNTRIES[0];

  return (
    <div className="w-full min-h-screen bg-[#020503] text-[#e0e0e0] font-sans flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      
      {/* Background soccer pitch line art */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.025)_50%)] bg-size-[10%_100%]" />
        <div className="absolute inset-6 border border-white/20 rounded-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-white/25" />
      </div>

      {/* Floating glowing orbs */}
      <div className="absolute -top-20 -right-20 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Animated Floating Soccer Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {[
          { icon: "⚽", x: "12%", y: "15%", delay: 0 },
          { icon: "🏆", x: "85%", y: "20%", delay: 1.5 },
          { icon: "🎮", x: "8%", y: "75%", delay: 2 },
          { icon: "🃏", x: "88%", y: "68%", delay: 0.5 },
          { icon: "🌟", x: "50%", y: "8%", delay: 3 }
        ].map((item, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl opacity-20 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
            style={{ left: item.x, top: item.y }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, 360],
              opacity: [0.15, 0.35, 0.15]
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              delay: item.delay,
              ease: "easeInOut"
            }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>

      {/* Title Header */}
      <header className="relative z-10 text-center mb-6 max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-emerald-400 via-teal-350 to-emerald-500 filter drop-shadow-md">
            مـرتـدة
          </h1>
        </div>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest bg-black/40 border border-white/5 rounded-full px-4 py-1 inline-block">
          تحدي كروت التخطيط الكروي التكتيكي ⚽️🏆
        </p>
      </header>

      {/* Main Container Grid */}
      <div className="relative z-10 w-full max-w-3xl grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Ultimate Team Live Card Preview */}
        <div className="md:col-span-5 flex flex-col justify-center items-center bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative min-h-[350px]">
          <div className="absolute top-3 right-4 text-[9px] font-bold text-emerald-400/70">بطاقة فريقك الرسمية 🎴</div>
          
          <motion.div 
            className="w-full max-w-[200px] aspect-2/3 bg-linear-to-b from-[#091a0f] via-[#0d3119] to-[#040805] rounded-3xl border-2 border-emerald-500/30 p-3 flex flex-col justify-between items-center shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden group"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            {/* Card Gold Trim lines */}
            <div className="absolute inset-1.5 border border-emerald-500/10 rounded-[22px] pointer-events-none" />
            
            {/* Top Row: Country and Coins */}
            <div className="w-full flex justify-between items-center z-10">
              <div className="flex flex-col items-center gap-0.5">
                {selectedCountryObj.code === "LEGEND" ? (
                  <span className="text-lg leading-none">👑</span>
                ) : (
                  <img 
                    src={`https://flagcdn.com/w40/${selectedCountryObj.code.toLowerCase()}.png`} 
                    alt={selectedCountryObj.name} 
                    className="w-6 h-4 object-cover rounded-xs shadow-xs" 
                  />
                )}
                <span className="text-[7px] text-slate-400 font-bold uppercase">{selectedCountryObj.code}</span>
              </div>
              <div className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded-full border border-emerald-500/10">
                <span className="text-[8px] font-black text-amber-400">1000</span>
                <Coins className="w-2.5 h-2.5 text-amber-400" />
              </div>
            </div>

            {/* Middle Logo Shield */}
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-500/20 bg-black/40 flex items-center justify-center relative overflow-hidden z-10">
              {teamLogo && teamLogo.startsWith("http") ? (
                <img 
                  src={teamLogo} 
                  alt="Team Logo" 
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                  }}
                />
              ) : (
                <span className="text-4xl animate-pulse">🛡️</span>
              )}
            </div>

            {/* Bottom Section: Team details */}
            <div className="w-full text-center z-10">
              {/* Team Abbr badge */}
              <div className="inline-block bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md text-[9px] font-black text-emerald-400 mb-1">
                {teamAbbreviation || "MTR"}
              </div>
              
              {/* Team Name */}
              <h3 className="text-xs font-black text-white truncate max-w-[170px]" dir="rtl">
                {teamName || "اسم فريقك"}
              </h3>
              
              {/* Coach Name */}
              <p className="text-[8.5px] text-slate-400 font-medium mt-0.5 truncate max-w-[170px]">
                المدرب: {name || "اسم القائد"}
              </p>

              {/* Account role tag */}
              <div className="mt-1.5 inline-block text-[7.5px] font-black uppercase px-2 py-0.2 rounded-full border bg-teal-500/10 text-teal-400 border-teal-500/20">
                لاعب مرتدة 🏃‍♂️
              </div>
            </div>

            {/* Radial soccer ball highlight background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5 pointer-events-none opacity-20" />
          </motion.div>

          <p className="text-[8.5px] text-slate-400 text-center leading-normal max-w-xs mt-4">
            بطاقة فريقك تتحدث لحظة بلحظة! املأ الحقول الجانبية لتخصيص شعارك واختصار فريقك واختيار علم دولتك.
          </p>
        </div>

        {/* RIGHT COLUMN: Auth Forms Form Card */}
        <div className="md:col-span-7 bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-2xl flex flex-col justify-between">
          
          {/* Header Switch tabs */}
          <div className="flex border-b border-white/5 pb-3 justify-between items-center shrink-0">
            <h2 className="text-base font-black text-white">
              {isLogin ? "سجل دخول لبدء التخطيط الكروي ⚔️" : "أنشئ حساب مدرب جديد 🚀"}
            </h2>
            <button
              onClick={toggleMode}
              className="text-[9.5px] font-black text-emerald-400 hover:text-emerald-350 cursor-pointer bg-white/5 border border-white/10 hover:border-emerald-500/30 px-3 py-1 rounded-full transition-all"
            >
              {isLogin ? "إنشاء حساب جديد 👤" : "لديك حساب بالفعل؟"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 mt-4 flex flex-col gap-3 justify-start">
            
            {error && (
              <div className="bg-rose-950/30 border border-rose-500/30 text-rose-450 p-2 rounded-xl text-[9px] font-extrabold text-right">
                ⚠️ {error}
              </div>
            )}

            {/* Name - Register only */}
            {!isLogin && (
              <div className="space-y-1">
                <label className="block text-[#e0e0e0]/60 font-black text-right text-[8.5px]">اسمك كمدرب/قائد:</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="مثال: الكابتن جوارديولا..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold"
                  />
                  <User className="absolute right-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            )}

            {/* Email - Both */}
            <div className="space-y-1">
              <label className="block text-[#e0e0e0]/60 font-black text-right text-[8.5px]">البريد الإلكتروني:</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold font-mono"
                  dir="ltr"
                />
                <Mail className="absolute right-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>

            {/* Password Grid */}
            <div className={`grid ${isLogin ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[#e0e0e0]/60 font-black text-right text-[8.5px]">كلمة المرور:</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold font-mono"
                    dir="ltr"
                  />
                  <Lock className="absolute right-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>

              {/* Confirm Password - Register only */}
              {!isLogin && (
                <div className="space-y-1">
                  <label className="block text-[#e0e0e0]/60 font-black text-right text-[8.5px]">تأكيد كلمة المرور:</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold font-mono"
                      dir="ltr"
                    />
                    <Lock className="absolute right-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Team details Grid - Register only */}
            {!isLogin && (
              <div className="grid grid-cols-3 gap-3">
                
                {/* Team Name */}
                <div className="col-span-2 space-y-1">
                  <label className="block text-[#e0e0e0]/60 font-black text-right text-[8.5px]">اسم الفريق الكروي:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أسود الأطلس"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold"
                  />
                </div>

                {/* Team Abbr */}
                <div className="space-y-1">
                  <label className="block text-[#e0e0e0]/60 font-black text-right text-[8.5px]">اختصار (3 حروف):</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    placeholder="EGY"
                    value={teamAbbreviation}
                    onChange={(e) => setTeamAbbreviation(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-center text-xs font-black uppercase font-mono"
                  />
                </div>

              </div>
            )}

            {/* Team Logo Link - Register only */}
            {!isLogin && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowLogoTip(!showLogoTip)}
                    className="text-[7.5px] font-bold text-emerald-400 flex items-center gap-0.5 hover:underline cursor-pointer border-none bg-transparent"
                  >
                    <HelpCircle className="w-2.5 h-2.5" />
                    <span>كيف أحصل على رابط؟</span>
                  </button>
                  <label className="block text-[#e0e0e0]/60 font-black text-right text-[8.5px]">رابط صورة الشعار (Link):</label>
                </div>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={teamLogo}
                    onChange={(e) => setTeamLogo(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-black/55 border border-white/10 focus:outline-none focus:border-emerald-500 text-white text-right text-xs font-bold font-mono"
                    dir="ltr"
                  />
                  <Image className="absolute right-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                </div>

                {/* Logo Link Guide Explanation - Animated */}
                <AnimatePresence>
                  {showLogoTip && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-black/80 border border-emerald-500/20 rounded-xl p-2.5 text-right text-[8px] text-slate-300 leading-normal space-y-1 mt-1"
                    >
                      <h4 className="font-black text-emerald-400">💡 خطوات بسيطة للحصول على رابط مباشر لشعارك:</h4>
                      <ol className="list-decimal list-inside pr-1 space-y-0.5">
                        <li>اذهب إلى أحد مواقع رفع الصور المجانية مثل <a href="https://imgbb.com" target="_blank" rel="noreferrer" className="text-white hover:underline">imgbb.com</a> أو <a href="https://postimages.org" target="_blank" rel="noreferrer" className="text-white hover:underline">postimages.org</a>.</li>
                        <li>ارفع صورة شعار فريقك المفضلة من جهازك.</li>
                        <li>بعد الرفع، انسخ خيار <strong>"رابط مباشر" (Direct Link)</strong>.</li>
                        <li>يجب أن ينتهي الرابط بنوع الصورة مثل (`.png`, `.jpg`, `.jpeg`). الصقه في الحقل أعلاه لتشاهد شعارك فوراً بالبطاقة!</li>
                      </ol>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Country Selector - Register only */}
            {!isLogin && (
              <div className="space-y-1">
                <label className="block text-[#e0e0e0]/60 font-black text-right text-[8.5px]">اختر الدولة التابع لها فريقك:</label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 bg-black/30 p-1.5 border border-white/5 rounded-xl max-h-[85px] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20">
                  {COUNTRIES.map((c) => {
                    const isSelected = country === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleCountrySelect(c.code)}
                        className={`flex flex-col items-center justify-center p-1 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-950/20 text-white"
                            : "border-transparent bg-transparent text-slate-500 hover:border-white/10"
                        }`}
                        title={c.name}
                      >
                        {c.code === "LEGEND" ? (
                          <span className="text-base leading-none">👑</span>
                        ) : (
                          <img 
                            src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                            alt={c.name} 
                            className="w-6 h-4 object-cover rounded-xs shadow-xs" 
                          />
                        )}
                        <span className="text-[6.5px] font-bold mt-0.5 truncate max-w-[32px]">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}


            {/* Submit Button */}
            <div className="mt-4 shrink-0">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg cursor-pointer border-none disabled:opacity-50 transition-all active:scale-[0.98] h-10"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{isLogin ? "دخول المستطيل الأخضر 🏟️" : "تسجيل المدرب الجديد وانطلاق اللعب 🏁"}</span>
                    <Swords className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
