# نظرة شاملة على منطق اللعبة والـ Computer‑AI

_(المصادر الرئيسة: [GameOnline.tsx](file:///g:/work/Mortada-1/src/components/GameOnline.tsx) و [GameOffline.tsx](file:///g:/work/Mortada-1/src/components/GameOffline.tsx))_

---

## 1️⃣ بنية المكوّن الرئيسي

| مكوّن           | دوره الرئيسي                                                              | أهم المتغيّرات                                                                              |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **GameOnline**  | يدير مباراة **متعدد اللاعبين عبر Supabase** (غرفة، دور المستضيف / الخصم). | `phase`, `playerSlots`, `aiSlots`, `playerDeck`, `aiDeck`, `logs`, `matchTime`, `gameMode`… |
| **GameOffline** | نسخة **وحدية** (بدون شبكة) مع نفس منطق اللعبة، لكن جميع البيانات محلية.   | نفس المتغيّرات مع عدد أقل من مكررات الـ state (لا توجد `matchRoom` أو `supabase`).          |

كلا المكوّنين يستخدمان **React hooks** لتخزين وإدارة الحالة، و‑**motion/react** لِـ **الأنيميشن**.

---

## 2️⃣ مراحل اللعبة (GamePhase)

| قيمة                     | ما يحدث                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `"menu"`                 | شاشة الترحيب/الإعدادات.                                        |
| `"warmup"`               | عدّاد الإحماء أو ‟صافرة ركلة البداية”.                         |
| `"tactics"`              | اختيار بطاقات **Pitch** (الـ slots).                           |
| `"attack"` / `"defense"` | تنفيذ هجوم / دفاع (تطبيق القواعد).                             |
| `"resolution"`           | معالجة نتائج الهجوم (إزالة/إعادة تدوير البطاقات، حساب النقاط). |
| `"halfTime"`             | استراحة نصف الوقت مع عدّاد خاص.                                |
| `"gameOver"`             | إظهار شاشة النتيجة النهاية.                                    |

التحول بين المراحل يتم عبر **`setPhase`**، وغالبًا ما يُستدعى من داخل **`useEffect`** أو ردود أفعال المستخدم (مثال: الضغط على زر “تأكيد”).

---

## 3️⃣ تدفق الدور (Turn Flow)

1. **بدء الدور** – تُحدد ما إذا كان الدور لك أو للـ AI عبر المتغيّر `isPlayerAttacker`.
2. **تجميع اليد** – تُنزل بطاقات من الـ deck إلى الـ hand (`drawDecks`, `setPlayerHand`).
3. **اختيار بطاقات Pitch** – يتم ملء **5 slots** (`playerSlots` / `aiSlots`)؛ كل slot يحتوي على `card` و`isRevealed`.
4. **القوة blocked?** – الدوال `isAttackBlockedFor` و`isDefenseBlockedFor` تتحقق إذا كان هناك **Special Card** أو قدرة تمنع الهجوم/الدفاع.
5. **بدء الهجوم** – `triggerAttackStartedAbilities` تُنفّذ كل **Instant Effects** للبطاقات المكشوفة (مثال: “IncreaseAttack”).
6. **حساب النتيجة** – يُستدعى **rules engine** (`runRefereeRulesEngine`) لتوليد النص التفصيلي للنتيجة (`formatGoalLog` أو `formatBlockLog`).
7. **تحديث السجل** – يتم إضافة كائن `ActionLog` إلى `logs`, ثم يُستَخدم `renderDetailedLog` لعرضه بصيغة عربية/إنجليزية مع أيقونات.
8. **إنهاء الدور** – تُحدّث النقاط (`playerScore` / `aiScore`), تُعيد تدوير البطاقات المستعملة (`recycleCard`, `recycleAiCard`), وتنتقل إلى الدور التالي (`setTurnCount`).

---

## 4️⃣ بطاقات اللعبة وأنواعها

| نوع البطاقة           | خصائص رئيسية                                                                      | أمثلة الاستخدام                            |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| **PlayerCard**        | `id`, `name`, `isLegend`, `ability?`                                              | بطاقات اللاعبين التي تُوضع على الـ Pitch.  |
| **SpecialCard**       | `ability` تشمل **BlockAttack**, **BlockDefense**, **BlockSpecialCards** وغيرها.   | تُغيّر سلوك اللعبة (مثلاً منع الهجوم).     |
| **BoosterCard**       | تضيف **Bonus** مؤقت إلى القوة أو الدفاع.                                          | تُستَخدم في لحظات حاسمة لتقوية الـ Attack. |
| **Card** (واجهة عامة) | `type` (`player`, `special`, `booster`), `rarity`, `frozen`/`stunned`/`silenced`. | تُستَخدم في اليد أو الساحة.                |

كل بطاقة تُخزن في **deck** (`playerDeck`, `aiDeck`, `specialDeck`, `boosterDeck`) وتُولد من ملفات **cardsData.ts** عبر الدوال `generatePlayerDeck`, `generateSpecialDeck`, إلخ.

---

## 5️⃣ محرك القواعد (Rules Engine)

- **ملف المصدر:** `../utils/rulesEngine.ts` (ليس معروضاً بالكامل，但被 `import` 在两组件中).
- **وظيفة رئيسية:** `runRefereeRulesEngine` يأخذ الحالة الحالية (الـ slots، البطاقات النشطة، القواعد الخاصة) ويعيد:
  - **`attackVal` / `defenseVal`** – القيم الرقمية المجمّعة.
  - **`attackBreakdown` / `defenseBreakdown`** – سلاسل نصية توضح تفاصيل كل بطاقة (مثلاً “⚔️ لاعب 1 (+3)”).
  - **`scoreText`** – النص النهائي للنتيجة (مثال: “🏆 2‑1”).

النص الناتج يمرّ عبر **`formatGoalLog`** أو **`formatBlockLog`** لإضافة عناوين عشوائية، أوصاف استاد، وتعليقات عربية مع أيقونات.

---

## 6️⃣ القدرة الفورية (Instant Effects)

البطاقات التي لها `ability?.trigger` مثل **`CardDestroyed`** أو **`AttackStarted`** تُستدعى عبر:

```ts
triggerCardInstantEffects(card, isPlayer, "AttackStarted");
```

الدالة تُطبّق **الإجراءات** المعرفة في `CardAbilityTriggerType` (مثل تعديل نقاط أو إعاقة خصم).  
هذا يُمكّن **الـ AI** من امتلاك سلوكيات معقّدة (مثلاً إبطال بطاقة خصم عندما تُدمّر بطاقته).

---

## 7️⃣ إدارة الوقت والعدّادات

- **Match timer:** `matchTime` يُحدّث كل ثانية عبر `setInterval` داخل `useEffect`.
- **Turn timer:** `turnTimeLimit` / `turnTimeLeft` تُعطى من إعدادات المستخدم (الـ difficulty).
- **Half‑time break:** `halfTimeBreakDuration` يُعدّ من الإعدادات ويُظهر عدّاد خاص عند `isHalfTimeBreak`.  
  كل عدّاد يُعطل بعض الأزرار لمنع اتخاذ إجراءات أثناء الانتظار.

---

## 8️⃣ **Multiplayer sync** (فقط في `GameOnline`)

| ميزة               | كيف تُنفّذ                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **قناة Broadcast** | `new BroadcastChannel("tactical_football_booster_broadcast")` تُرسل/تستقبل أحداث الحالة بين المتصفحين.                   |
| **Supabase DB**    | تُخزن الحالة (phase, scores, deck, slots, logs) في جدول **match_rooms**. كل عميل يحدّث `db*Ref` لتقليل القراءة المتعددة. |
| **تزامن الوقت**    | كل عميل يقرأ `match_time` من قاعدة Supabase ويتأكد من توافق العدّادات (مع `debouncedDbWriteTimeoutId`).                  |
| **تأكيد الانضمام** | المتغيّرين `myConfirmed` / `otherConfirmed` يضمنان أن كل لاعب جاهز قبل بدء المباراة.                                     |

---

## 9️⃣ الواجهة (UI) والأنيميشن

- **Motion** من `motion/react` يُستَخدم في **card flip**, **slide**, **fade**.
- **Confetti** و**screen shake** تُستدعى عند تسجيل هدف (`celebrationMessage`, `triggerScreenShake`).
- **الخطوط العربية** تُظهر النص من اليمين لليسار (`dir="rtl"`).
- **الألوان**: الهجوم باللون الأحمر، الدفاع باللون الأزرق، النتيجة بألوان كهرمانية (amber/emerald).

---

## 🔟 خلاصة لتطوير اللعبة

| ما يمكن تحسينه         | أين؟                                                                                  | كيف؟                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **تحسين AI**           | الدوال `isAttackBlockedFor` / `isDefenseBlockedFor` و`triggerAttackStartedAbilities`. | إضافة **weighting** للقرارات، أو دمج **Mini‑Max** لتقييم أفضل حركة.               |
| **إضافة بطاقات جديدة** | ملفات `cardsData.ts` و`../utils/rulesEngine.ts`.                                      | تعريف `ability` جديدة ثم تعديل `runRefereeRulesEngine` لتفسيرها.                  |
| **توسيع وضعيات اللعب** | `phase` وإجراءات `setPhase`.                                                          | إضافة مرحلة جديدة (مثلاً “penalty shoot‑out”) مع مكوّن UI منفصل.                  |
| **تحسين الأداء**       | `useEffect` متعدد للـ timers و`BroadcastChannel`.                                     | تجميع تحديثات الحالة في دفعات (`batch`), أو استخدام **React‑Query** للـ Supabase. |
| **دعم لغات إضافية**    | النصوص في `formatGoalLog`/`formatBlockLog`.                                           | استخراج النصوص إلى ملف ترجمة (i18n) واستخدام `t()` عند الإنشاء.                   |

---

### 📚 المصادر داخل الشيفرة لمراجعة مفصّلة

- **تحليل السجلات** – `parseDetailedLog` (≈ سطر 49 في كل ملف).
- **تجميع السجلات حسب الدور** – `groupLogsByTurns` (≈ سطر 262).
- **تحكم البطاقات المخفية** – `maskCardIfHidden` (سطر 422).
- **تحديث الـ Refs** عند تغيّر `phase` – `useEffect` في سطر 689.
- **توليد النصوص الفنية** – `formatGoalLog` / `formatBlockLog` (سطر 322‑389).

---

## كيف تستفيد من هذا الشرح؟

1. **تتبع تدفق البيانات**: ابدأ من `phase` → `useEffect` → `triggerAttackStartedAbilities` → `runRefereeRulesEngine`.
2. **أضف قدرة جديدة**: عدل `CardAbilityTriggerType` في `types.ts`, نفّذ المنطق داخل `triggerCardInstantEffects`, ثم أضف نصًا في `formatGoalLog`.
3. **غيّر سلوك الـ AI**: استبدل `isAttackBlockedFor` منطقًا ثابتًا بخوارزمية تقييم احتمالية الهجوم.
4. **تحسين UI**: عدل مكوّن `ActionLog` في `renderDetailedLog` لإضافة مؤثرات صوتية باستخدام `SoundEffects`.

بهذا الفهم الشامل يمكنك الآن تعديل، توسيع أو تحسين منطق اللعبة بثقة. إذا احتجت خطوات تنفيذية معينة أو مثالًا عمليًا، أخبرني وسأساعدك بالتفصيل.
