ممتاز. نرمي كل التفكير القديم مؤقتًا ونبني **الـ Core Architecture النهائي** للعبة "مرتدة" كأننا بنبني لعبة هتكمل سنين مش مشروع جامعة هيعيش أسبوعين ثم يختفي في مقبرة GitHub بجوار آلاف المشاريع المنسية.

# المستوى الأول: الكيانات الرئيسية (Core Domain)

عندنا 8 كيانات فقط.

```text
Player
Season
Package
Card
Ability
Effect
Match
MatchState
```

---

# 1. Player

اللاعب الحقيقي.

مش الكارت.

مش الإحصائيات.

مش القدرة.

مجرد اللاعب نفسه.

---

## مثال

```text
Cristiano Ronaldo
Lionel Messi
Mohamed Salah
```

---

## يحتوي على

```text
id
name
image
country
position
birth_date
```

---

## لا يحتوي على

```text
attack
defense
abilities
```

لأن دي خصائص الكارت وليس اللاعب.

---

# 2. Season

نسخة اللعبة.

---

## أمثلة

```text
Season 1

Launch Edition
```

```text
Season 2

World Cup
```

```text
Season 3

Legends
```

---

الفائدة:

تقدر تنزل نفس اللاعب عشر مرات.

---

مثال

```text
Messi S1
Messi S2
Messi Prime
Messi Legend
```

---

بدون تدمير النسخ القديمة.

---

# 3. Package

الحزم.

---

أمثلة

```text
Real Madrid
Barcelona
World Cup
Legends
Premier League
```

---

كل Package عبارة عن Deck مستقل.

---

يحتوي على

```text
id
name
description
image
season_id
```

---

# 4. Card

ده أهم كيان في المشروع.

---

الكارت عبارة عن:

```text
Player + Package + Stats + Abilities
```

---

مثال

```text
Cristiano
Real Madrid
Attack 9
Defense 5
```

---

ومثال آخر

```text
Cristiano
World Cup
Attack 8
Defense 6
```

---

نفس اللاعب.

كارتين مختلفين.

---

## يحتوي على

```text
id

player_id

package_id

name

image

rarity

attack

defense

tags
```

---

tags

مثلاً

```json
["legend", "attacker"]
```

---

أو

```json
["goalkeeper"]
```

---

# 5. Ability

القدرة.

---

ممنوع تخزينها كنص.

---

غلط:

```text
Messi Ability
```

---

صح:

```text
Ability Definition
```

---

كل Ability تحتوي:

```text
id

name

trigger

target

operation

value

duration
```

---

## مثال

```text
name

Captain Aura
```

---

```text
trigger

while_revealed
```

---

```text
target

all_allies
```

---

```text
operation

add_attack
```

---

```text
value

2
```

---

```text
duration

while_active
```

---

# 6. Effect

ده ناتج تشغيل Ability أثناء المباراة.

---

فرق مهم جدًا.

---

Ability

تعريف.

---

Effect

نسخة شغالة.

---

مثال

كريستيانو نزل الملعب.

---

Ability:

```text
+2 attack
```

---

المحرك ينشئ:

```text
Effect
```

---

ويضيفه للمباراة.

---

يحتوي على

```text
id

match_id

source_card_id

target_card_id

operation

value

active
```

---

# 7. Match

المباراة نفسها.

---

تحتوي على

```text
id

player1

player2

package1

package2

winner

status

season
```

---

بس.

---

# 8. MatchState

أهم جزء بعد Card.

---

دي لقطة Snapshot للحالة الحالية.

---

تحتوي على:

```text
turn

phase

moves_left

attack_score

defense_score

current_attacker

current_defender
```

---

وكمان:

```text
cards_in_field

cards_in_hand

cards_in_deck

cards_in_discard
```

---

# المستوى الثاني

# Game Engine

المحرك لا يعرف:

```text
Messi
Cristiano
Red Card
Offside
```

---

المحرك يفهم فقط:

```text
Trigger

Target

Operation

Duration
```

---

مثال

كارت أحمر

---

```text
Trigger

instant
```

---

```text
Target

selected_enemy
```

---

```text
Operation

destroy
```

---

المحرك ينفذ.

انتهى.

---

# المستوى الثالث

# Admin Dashboard

يتكون من 6 أقسام.

---

## Players

إدارة اللاعبين.

---

## Seasons

إدارة المواسم.

---

## Packages

إدارة الحزم.

---

## Cards

إنشاء الكروت.

---

## Abilities

إنشاء القدرات.

---

## Analytics

إحصائيات اللعبة.

---

# طريقة إنشاء كارت جديد

المسؤول يختار:

```text
Player
```

↓

```text
Season
```

↓

```text
Package
```

↓

```text
Stats
```

↓

```text
Abilities
```

↓

```text
Save
```

---

# نقطة مهمة جدًا

أنا أنصح بإضافة كيان تاسع من الآن.

---

# Ability Templates

بدل ما كل مرة تعمل قدرة من الصفر.

---

مثلاً

```text
Aura +2 Attack
```

Template

---

```text
Destroy Enemy
```

Template

---

```text
Cancel Attack
```

Template

---

وبالتالي إنشاء كارت جديد هيبقى:

```text
اختر اللاعب

اختر الصورة

اختر القوة

اختر Ability Template

حفظ
```

بدل بناء قدرة جديدة كل مرة.
أيوة، وهنا بقى بنوصل لأهم نقطة في المشروع كله.

أنت دلوقتي بتفكر بطريقة صح جدًا:

> "إحنا لسه مش عارفين كل الكروت اللي هتتعمل بعد سنة أو سنتين."

فلو بنيت المحرك على أساس:

```text
لو الكارت = ميسي
اعمل كذا

لو الكارت = كريستيانو
اعمل كذا
```

المشروع انتهى قبل ما يبدأ.

---

# الفكرة الصح

المحرك ميعرفش أي كارت.

المحرك يعرف "لغة".

زي ما JavaScript مش عارف تطبيقك هيعمل إيه.

هو بس بيفهم:

```text
if
for
while
```

بس.

---

# مرتدة محتاجة لغة خاصة بيها

نسميها مثلاً:

```text
Mortada Rules Engine
```

---

المحرك لا يعرف:

```text
ميسي
رونالدو
كارت أحمر
تسلل
جمهور
```

---

المحرك يعرف فقط:

```text
Event
Condition
Action
Target
```

---

# Event

حاجة حصلت.

مثال:

```text
CardPlayed
CardRevealed
AttackStarted
DefenseStarted
GoalScored
TurnStarted
TurnEnded
CardDestroyed
```

---

# Condition

شرط.

مثال:

```text
IsLegend
IsFaceUp
IsAttacker
IsDefender
HasTag
HasAbility
```

---

# Action

إيه اللي يتعمل.

مثال:

```text
AddAttack
AddDefense
DestroyCard
DrawCard
DiscardCard
CancelAttack
BlockEffect
RevealCard
HideCard
SwapCard
```

---

# Target

على مين؟

مثال:

```text
Self
Allies
Enemies
SelectedCard
SelectedEnemy
CurrentAttack
CurrentDefense
```

---

# القدرة تبقى عبارة عن Rule

مثال كريستيانو:

```json
{
  "event": "CardRevealed",

  "conditions": [
    {
      "type": "IsFaceUp"
    }
  ],

  "actions": [
    {
      "type": "AddAttack",
      "target": "Allies",
      "value": 2
    }
  ]
}
```

---

# ميسي

```json
{
  "event": "SpecialCardPlayed",

  "conditions": [
    {
      "type": "IsFaceUp"
    }
  ],

  "actions": [
    {
      "type": "CancelCard"
    }
  ]
}
```

---

# كارت أحمر

```json
{
  "event": "CardPlayed",

  "actions": [
    {
      "type": "DestroyCard",
      "target": "SelectedEnemy"
    }
  ]
}
```

---

# المشكلة اللي لسه موجودة

دلوقتي أنت بتفترض إن كل Action معروفة.

لكن بعد 6 شهور هيجيلك كارت مجنون زي:

> لو الخصم كشف 3 لاعبين دفاع في نفس الدور اسحب كارتين ثم احذف لاعب عشوائي.

هنا المحرك القديم هيعيط.

---

# الحل الاحترافي الحقيقي

نعمل Layers

---

## Layer 1

Events

```text
CardPlayed
AttackStarted
...
```

---

## Layer 2

Conditions

```text
IsFaceUp
HasTag
HasStat
...
```

---

## Layer 3

Primitive Actions

دي أهم حاجة.

المحرك يعرف 20 أو 30 عملية فقط.

مثلاً:

```text
AddStat
RemoveStat
DestroyCard
DrawCard
RevealCard
HideCard
MoveCard
BlockEffect
CancelAction
CreateEffect
```

---

كل كارت في اللعبة يتبني من العمليات دي.

---

# مثال

كارت جمهور

---

بدل:

```text
CrowdBoost
```

لا.

---

يبقى:

```json
{
  "actions": [
    {
      "type": "AddStat",
      "stat": "attack",
      "value": 3,
      "target": "Allies"
    }
  ]
}
```

---

# مثال أصعب

ميسي

---

```json
{
  "event": "SpecialCardPlayed",

  "conditions": [
    {
      "type": "CardOwnerIsEnemy"
    }
  ],

  "actions": [
    {
      "type": "CancelAction"
    }
  ]
}
```

---

# حاجة أهم بكتير

أنا أنصح من أول يوم تعمل:

## Sandbox Ability Tester

داخل لوحة الإدارة.

---

المسؤول يعمل قدرة.

---

المحرك يقرأها.

---

ويقول:

```text
✓ Valid

Trigger:
CardPlayed

Action:
DestroyCard

Target:
SelectedEnemy
```

---

أو:

```text
✗ Invalid

Unknown Action:
DestroyEverythingInUniverse
```

البشر عندهم ميل لطيف لكتابة بيانات خاطئة ثم اتهام قاعدة البيانات بالخيانة.

---

# الخلاصة

أنا لا أريدك تبني:

```text
Card Engine
```

أنا أريدك تبني:

```text
Rules Engine
```

الفرق ضخم جدًا.

لأن Card Engine يفهم الكروت الحالية.

أما Rules Engine فيفهم أي كارت هيتم اختراعه بعد سنة.

والهدف النهائي يكون:

```text
Card
    ↓
Abilities
    ↓
Rules
    ↓
Engine
```
