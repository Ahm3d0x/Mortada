/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookOpen, X, ChevronRight, Play, Swords, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";
import { SoundEffects } from "../utils/sounds";

interface GameTutorialPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameTutorialPanel({ isOpen, onClose }: GameTutorialPanelProps) {
  const [activeTab, setActiveTab] = useState<"basics" | "actions" | "attacking" | "specials">("basics");

  if (!isOpen) return null;

  const tabs = [
    { id: "basics", label: "الأساسيات والتجهيز", icon: Play },
    { id: "actions", label: "أعمال الدور والحركات", icon: BookOpen },
    { id: "attacking", label: "الهجوم والتحكيم", icon: Swords },
    { id: "specials", label: "كروت خاصة تكتيكية", icon: Sparkles }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div
        className="w-full max-w-3xl bg-slate-900 border-2 border-emerald-500 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90%]"
        id="tutorial_dialog"
      >
        {/* Header */}
        <div className="bg-emerald-950/40 p-5 border-b border-emerald-500/20 flex items-center justify-between">
          <button
            onClick={() => {
              SoundEffects.playCardDraw();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white text-right">كتاب قوانين لعبة مرتدة التكتيكية</h2>
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  SoundEffects.playCardDraw();
                  setActiveTab(tab.id as any);
                }}
                className={`flex-1 min-w-[120px] py-3.5 px-4 text-xs md:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-emerald-400 text-emerald-400 bg-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto text-slate-300 text-right space-y-4">
          {activeTab === "basics" && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-bold text-emerald-400 mb-2">الهدف الأساسي ومرحلة التسخين (البداية)</h3>
              <p className="text-sm leading-relaxed">
                اللعبة هي معركة عقل وتكتيك 1 ضد 1 بين مدربين. أول مدرب ينجح في إحراز{" "}
                <strong className="text-white bg-emerald-500/20 px-1.5 py-0.5 rounded">5 بونت (نقاط أهداف)</strong> أولاً، هو الفائز الأعلى جدارة بالمباراة.
              </p>
              <div className="space-y-3 mt-4 border-r-2 border-emerald-500/30 pr-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">1. تحضير الملعب:</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    يسحب كل مدرب فني في أول اللقاء <span className="text-amber-400 font-semibold">5 كروت لاعبين</span> ويضعهم أمامه في المربعات المخصصة بالملعب مقلوبين تماماً (لا يراهم أحد).
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">2. فلترة الأساطير:</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    إذا ظهر كارت <span className="text-yellow-400 font-semibold">أسطورة</span> ضمن الخمسة كروت الأولى بالملعب، يتم إرجاعه للحقيبة فوراً وسحب كارت عادي بديل. لا يبدأ الأسطورة بالملعب!
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">3. سحب كروت اليد وتجهيز الخطة:</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    يسحب كل مدرب <span className="text-blue-400 font-semibold">كارتين لاعبين</span> و<span className="text-teal-400 font-semibold">3 كروت تكتيك خاصة</span> ليضعهم في يده سراً. ويبدأ بتنظيم التعديلات.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">4. التبديل التحضيري المجاني:</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    في هذه المرحلة الأولى فقط، يحق لك تبديل أي عدد من اللاعبين الموجودين في يدك مع اللاعبين الموجودين في ملعبك لتجهيز خطتك الفائزة قبل ركلة البداية!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-emerald-400 mb-2">بداية دورك وكيف تلعب بالحركات</h3>
              <p className="text-sm leading-relaxed">
                في بداية كل دور لك، يقوم مدربنا الرائد في الحقل بـ <span className="text-white font-bold">سحب كارتين</span> من أي باقة (مثال: كارتين لاعبين، أو كارت لاعب وكارت خاص، إلخ).
              </p>
              <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-xs">
                في كل دور تالي، تمتلك <strong className="text-emerald-300">3 حركات كحد أقصى</strong> كمدرب. ليس شرطاً استخدامها كاملة ولكن يحظر تجاوزها.
              </div>

              <h4 className="font-bold text-white text-sm mt-4">أنواع الحركات وتكاليفها:</h4>
              <div className="space-y-2 mt-2 text-xs">
                <div className="flex justify-between items-start bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-emerald-400 font-mono font-bold">1 حركة</span>
                  <div className="text-right">
                    <span className="font-bold text-white">التبديل مع كارت مكشوف بملعبك:</span>
                    <p className="text-slate-400 mt-1">تخرج اللاعب المكشوف خارج الماتش تماماً، وتنزل اللاعب الجديد من يدك مكانه ويكون مقلوباً.</p>
                  </div>
                </div>
                <div className="flex justify-between items-start bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-emerald-400 font-mono font-bold">1 حركة</span>
                  <div className="text-right">
                    <span className="font-bold text-white">التبديل مع كارت مقلوب بملعبك:</span>
                    <p className="text-slate-400 mt-1">ترجع اللاعب المكفي ليدك مجاناً، وتنزل مكانه كارت لاعب جديد من يدك مقلوباً.</p>
                  </div>
                </div>
                <div className="flex justify-between items-start bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-emerald-400 font-mono font-bold">1 حركة + حرق كارتين</span>
                  <div className="text-right">
                    <span className="font-bold text-white">نزول لاعب أسطورة:</span>
                    <p className="text-slate-400 mt-1">لتلعب كارت الأسطورة الذهبي، احرق أولاً كارتين من يدك خارج اللعب، ثم بدله بأي لاعب بملعبك كالمعتاد.</p>
                  </div>
                </div>
                <div className="flex justify-between items-start bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-emerald-400 font-mono font-bold">حركتين (2)</span>
                  <div className="text-right">
                    <span className="font-bold text-white">إعلان الهجوم على الخصم:</span>
                    <p className="text-slate-400 mt-1">شن غارة هجومية لتسجيل الأهداف (يتطلب حركتين متوفرتين ولاعب بالملعب مقلوب لديه هجوم).</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "attacking" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-emerald-400 mb-2">غارات الهجوم وصد الخصوم والتسجيل</h3>
              <p className="text-sm leading-relaxed">
                الهجوم هو طريقك الوحيد لكسب البونتات والتسجيل. إليك التفصيل المثالي للهجوم والدفاع:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-3">
                <div className="p-3 bg-red-950/20 rounded-xl border border-red-500/20 space-y-1">
                  <span className="text-red-400 font-bold block">1. المهاجم (دورك للهجوم):</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>أعلن هجوماً (يكلف 2 حركة) وحدد لاعب مقلوب لتكشفه.</li>
                    <li>تسحب كارت <strong className="text-white">معزز المرتدة</strong> عشوائي (+1 إلى +10) يضاف لنسبة هذا الهجوم لزيادة فرصة تسجيل هدف!</li>
                    <li>إذا تبقت لك حركة أخيرة دورية، يمكنك استخدامها لكشف مهاجم إضافي أو لعب ورقة تكتيكية.</li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-950/20 rounded-xl border border-blue-500/20 space-y-1">
                  <span className="text-blue-400 font-bold block">2. المدافع (دور خصمك):</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>خلال هجمتك، يحق للمدافع استخدام <strong className="text-white">3 حركات حرة</strong> فورية للدفاع عن مرماه!</li>
                    <li>كشف الحراس المرمى أو المدافعين من الملعب لتجميع نقاط الصد.</li>
                    <li>لعب أوراق تكتيكية تعيق وتدمر هجوم الخصم.</li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <h4 className="font-bold text-white text-sm mb-1.5">كيفية حسم نتيجة الدربـي التكتيكي:</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  يجمع إجمالي هجومك (المهاجمين المكشوفين + كارت معزز المرتدة المسحوب) ونقارنه بإجمالي نقاط دفاع خصمك.
                  <br />
                  🟢 <strong className="text-emerald-400">نجاح الهجمة (هدف!):</strong> إذا كانت نقاط الهجوم أكبر من الدفاع، تسجل هجمة مرتدة ناجحة (هدف).
                  <br />
                  🔴 <strong className="text-rose-400">فشل الهجمة (تصدي رائع!):</strong> إذا كان الدفاع أكبر من أو مساوياً للهجوم، يتصدى الخصم بنجاح ولا تكتسب شيئاً.
                </p>
              </div>
            </div>
          )}

          {activeTab === "specials" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-emerald-400 mb-2">استخدام الكروت الخاصة لقلب الطاولة</h3>
              <p className="text-sm leading-relaxed">
                الكروت الخاصة تمثل الدعم الخططي والخدع الحربية في عالم التكتيكات الساحرة للعبة مرتدة. يمكنك استخدامها في دورك أو مداورة بالردود الدفاعية السريعة:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 bg-slate-950 object-cover rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <span className="text-2xl mt-0.5">🚩</span>
                  <div>
                    <span className="font-bold text-white">تسلل مباغت</span>
                    <p className="text-slate-400 mt-1 leading-relaxed">يلغي تماماً ومطلقاً نقاط أقوى مهاجم للخصم في هذه الهجمة.</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-950 object-cover rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <span className="text-2xl mt-0.5">🌧️</span>
                  <div>
                    <span className="font-bold text-white">أمطار عشب مبلل</span>
                    <p className="text-slate-400 mt-1 leading-relaxed">يقلل بشكل مباشر دفاع أو هجوم الخصم بمقدار 4 نقاط.</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-950 object-cover rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <span className="text-2xl mt-0.5">↗️</span>
                  <div>
                    <span className="font-bold text-white">هجمة مرتدة</span>
                    <p className="text-slate-400 mt-1 leading-relaxed">استراتيجية هجومية تعطي المهاجم المختار +4 نقاط هجوم حاسمة.</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-950 object-cover rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <span className="text-2xl mt-0.5">🥁</span>
                  <div>
                    <span className="font-bold text-white">الجمهور الحماسي</span>
                    <p className="text-slate-400 mt-1 leading-relaxed">يمنح أي لاعب مكشوف بملعبك زيادة فورية هجومية أو دفاعية +3 نقاط.</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-950 object-cover rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <span className="text-2xl mt-0.5">🚌</span>
                  <div>
                    <span className="font-bold text-white">ركن الباص</span>
                    <p className="text-slate-400 mt-1 leading-relaxed">دفاع حصين يضيف +6 نقاط كاملة وحاسمة للدفاع الإجمالي.</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-950 object-cover rounded-xl border border-slate-800 flex items-start gap-2.5">
                  <span className="text-2xl mt-0.5">🟥</span>
                  <div>
                    <span className="font-bold text-white">الكارت الأحمر</span>
                    <p className="text-slate-400 mt-1 leading-relaxed">اطرد أي لاعب مكشوف في ملعب خصمك وتخلص منه نهائياً.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-center">
          <button
            onClick={() => {
              SoundEffects.playCardDraw();
              onClose();
            }}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
          >
            فهمت القوانين تماماً! هيا لنلعب
          </button>
        </div>
      </div>
    </div>
  );
}
