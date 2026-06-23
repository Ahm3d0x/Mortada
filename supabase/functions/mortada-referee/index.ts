import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { runRefereeRulesEngine, getDetailedCalculation, executeCardInstantEffects, recycleCard } from "../../../src/utils/rulesEngine.ts"
import { goalTitles, goalDescriptions, defenseTitles, defenseDescriptions, stadiumPhrases } from "../../../src/utils/commentaryPhrases.ts"

const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const isCardStatModified = (dbCard: any, clientCard: any): boolean => {
  if (!dbCard || !clientCard) return true;
  
  if (dbCard.id !== clientCard.id) return true;
  if (dbCard.name !== clientCard.name) return true;
  if (dbCard.role !== clientCard.role) return true;
  if (!!dbCard.isLegend !== !!clientCard.isLegend) return true;
  if (dbCard.attack !== clientCard.attack) return true;
  if (dbCard.defense !== clientCard.defense) return true;
  
  const getBool = (v: any) => !!v;
  const getNum = (v: any) => v === undefined || v === null ? 0 : Number(v);
  
  if (getBool(dbCard.frozen) !== getBool(clientCard.frozen)) return true;
  if (getNum(dbCard.frozenTurnsLeft) !== getNum(clientCard.frozenTurnsLeft)) return true;
  
  if (getBool(dbCard.stunned) !== getBool(clientCard.stunned)) return true;
  if (getNum(dbCard.stunnedTurnsLeft) !== getNum(clientCard.stunnedTurnsLeft)) return true;
  
  if (getBool(dbCard.silenced) !== getBool(clientCard.silenced)) return true;
  if (getNum(dbCard.silencedTurnsLeft) !== getNum(clientCard.silencedTurnsLeft)) return true;
  
  if (getNum(dbCard.abilityUses) !== getNum(clientCard.abilityUses)) return true;
  if (getBool(dbCard.abilityBlocked) !== getBool(clientCard.abilityBlocked)) return true;
  
  return false;
};

const formatRefereeGoalLog = (
  attackerRole: 'host' | 'opponent',
  attackVal: number,
  defenseVal: number,
  attackBrk: string,
  defBrk: string,
  scoreText: string,
  hostName: string,
  opponentName: string
) => {
  const title = getRandom(goalTitles);
  const description = getRandom(goalDescriptions);
  const stadium = getRandom(stadiumPhrases);
  const attackerName = attackerRole === 'host' ? hostName : opponentName;
  const defenderName = attackerRole === 'host' ? opponentName : hostName;
  const status = `نجح هجوم ${attackerName} الشرس (${attackVal} ⚡) في اختراق دفاع ${defenderName} (${defenseVal} 🧱)`;
  
  return `${stadium}
${title}
${description}
👉 ${status}
----------------------------------
🔥 قوة الهجوم الإجمالية: ${attackVal} ⚡
🛡️ قوة الدفاع الإجمالية: ${defenseVal} 🧱

📊 تفاصيل الحسبة الفنية:
[قوة الهجوم ⚔️]:
${attackBrk}

[قوة الدفاع 🛡️]:
${defBrk || "   ● لا يوجد مدافعين نشطين (0)"}
----------------------------------
🏆 النتيجة الحالية: ${scoreText}`;
};

const formatRefereeBlockLog = (
  attackerRole: 'host' | 'opponent',
  attackVal: number,
  defenseVal: number,
  attackBrk: string,
  defBrk: string,
  scoreText: string,
  hostName: string,
  opponentName: string
) => {
  const title = getRandom(defenseTitles);
  const description = getRandom(defenseDescriptions);
  const stadium = getRandom(stadiumPhrases);
  const attackerName = attackerRole === 'host' ? hostName : opponentName;
  const defenderName = attackerRole === 'host' ? opponentName : hostName;
  const status = `نجح جدار ${defenderName} الدفاعي (${defenseVal} 🧱) في إحباط غزو ${attackerName} (${attackVal} ⚡)`;

  return `${stadium}
${title}
${description}
👉 ${status}
----------------------------------
🛡️ قوة الدفاع الإجمالية: ${defenseVal} 🧱
🔥 قوة الهجوم الإجمالية: ${attackVal} ⚡

📊 تفاصيل الحسبة الفنية:
[قوة الدفاع 🛡️]:
${defBrk || "   ● لا يوجد مدافعين نشطين (0)"}

[قوة الهجوم ⚔️]:
${attackBrk}
----------------------------------
🚫 النتيجة مستمرة: ${scoreText}`;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const recordRoundHistory = (
  gs: any,
  activeRole: 'host' | 'opponent',
  hostName: string,
  opponentName: string
) => {
  if (!gs.round_history) {
    gs.round_history = []
  }

  const maxMoves = gs.room_settings?.maxMovesPerTurn ?? 3
  const activeMoves = activeRole === 'host' ? gs.host_moves : gs.opponent_moves
  const movesPlayed = Math.max(0, maxMoves - activeMoves)

  const hostPitch = (gs.host_slots || []).map((s: any) => {
    if (s && s.card) {
      return {
        name: s.card.name,
        attack: s.card.attack,
        defense: s.card.defense,
        role: s.card.role,
        isRevealed: !!s.isRevealed,
        spent: !!s.spent
      }
    }
    return null
  })

  const opponentPitch = (gs.opponent_slots || []).map((s: any) => {
    if (s && s.card) {
      return {
        name: s.card.name,
        attack: s.card.attack,
        defense: s.card.defense,
        role: s.card.role,
        isRevealed: !!s.isRevealed,
        spent: !!s.spent
      }
    }
    return null
  })

  const hostHand = (gs.host_hand || []).map((c: any) => c ? c.name : null)
  const opponentHand = (gs.opponent_hand || []).map((c: any) => c ? c.name : null)

  const combat = gs.current_combat_detail || null

  const entry = {
    roundNumber: (gs.completed_rounds || 0) + 1,
    attacker: combat ? combat.attacker : activeRole,
    attackerName: combat ? combat.attackerName : (activeRole === 'host' ? hostName : opponentName),
    attackPower: combat ? combat.attackPower : 0,
    defensePower: combat ? combat.defensePower : 0,
    boosterValue: combat ? combat.boosterValue : 0,
    boosterText: combat ? combat.boosterText : "",
    isGoal: combat ? combat.isGoal : false,
    defenders: combat ? combat.defenders : [],
    scoreAfter: {
      host: gs.host_score || 0,
      opponent: gs.opponent_score || 0
    },
    activePlayer: activeRole,
    movesPlayed: movesPlayed,
    cardsDrawn: gs.cards_drawn || 0,
    pitchSnapshot: {
      host: hostPitch,
      opponent: opponentPitch
    },
    handSnapshot: {
      host: hostHand,
      opponent: opponentHand
    },
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
  }

  gs.round_history.push(entry)
  gs.current_combat_detail = null
}

const isSpecialCardsBlocked = (role: 'host' | 'opponent', gs: any) => {
  const isHost = role === 'host';
  const opponentActiveSpecials = isHost ? (gs.active_specials_opponent || []) : (gs.active_specials_host || []);
  const opponentSlots = isHost ? (gs.opponent_slots || []) : (gs.host_slots || []);

  const hasBlockedBySpecial = opponentActiveSpecials.some((c: any) =>
    c.ability?.actions?.some((a: any) => a.type === "BlockSpecialCards")
  );
  const hasBlockedBySlot = opponentSlots.some((s: any) =>
    s && s.card && s.isRevealed && !s.card.silenced &&
    s.card.ability?.actions?.some((a: any) => a.type === "BlockSpecialCards")
  );
  return hasBlockedBySpecial || hasBlockedBySlot;
};

const isValidTargetForCard = (role: 'host' | 'opponent', card: any, targetSlotIdx: number, isEnemySide: boolean, gs: any) => {
  const slots = isEnemySide
    ? (role === 'host' ? (gs.opponent_slots || []) : (gs.host_slots || []))
    : (role === 'host' ? (gs.host_slots || []) : (gs.opponent_slots || []));
  const slot = slots[targetSlotIdx];
  if (!slot || !slot.card) return false;

  if (!card.ability?.actions) {
    if (card.effect === "red_card") {
      return isEnemySide;
    }
    return false;
  }

  const hasSelectedEnemy = card.ability.actions.some((act: any) => act.target === "SelectedEnemy");
  const hasSelectedCard = card.ability.actions.some((act: any) => act.target === "SelectedCard");

  if (hasSelectedEnemy) {
    return isEnemySide;
  }
  if (hasSelectedCard) {
    return true;
  }
  return false;
};

const decrementSlotDurations = (slots: any[]) => {
  if (!slots) return [];
  return slots.map((s) => {
    if (!s || !s.card) return s;
    const card = { ...s.card };
    let modified = false;
    
    if (card.frozen && card.frozenTurnsLeft !== undefined) {
      const nextLeft = card.frozenTurnsLeft - 1;
      card.frozenTurnsLeft = nextLeft;
      if (nextLeft <= 0) {
        card.frozen = false;
      }
      modified = true;
    }

    if (card.stunned && card.stunnedTurnsLeft !== undefined) {
      const nextLeft = card.stunnedTurnsLeft - 1;
      card.stunnedTurnsLeft = nextLeft;
      if (nextLeft <= 0) {
        card.stunned = false;
      }
      modified = true;
    }

    if (card.silenced && card.silencedTurnsLeft !== undefined) {
      const nextLeft = card.silencedTurnsLeft - 1;
      card.silencedTurnsLeft = nextLeft;
      if (nextLeft <= 0) {
        card.silenced = false;
      }
      modified = true;
    }

    return modified ? { ...s, card } : s;
  });
};

const processSpecials = (specials: any[]) => {
  if (!specials) return [];
  return specials
    .map((spec) => {
      if (!spec) return spec;
      if (spec.durationTurnsLeft !== undefined) {
        return { ...spec, durationTurnsLeft: spec.durationTurnsLeft - 1 };
      }
      const action = spec.ability?.actions?.[0];
      if (action && action.duration && action.duration !== "Instant" && action.duration !== "CurrentPhase") {
        const initialDuration = action.durationTurns || (action.duration === "NextTurn" ? 1 : 2);
        return { ...spec, durationTurnsLeft: initialDuration - 1 };
      }
      return { ...spec, durationTurnsLeft: 0 };
    })
    .filter((spec) => spec && (spec.durationTurnsLeft === undefined ? false : spec.durationTurnsLeft > 0));
};


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const body = await req.json()
    const { action, roomId, role, settings, actionType, details } = body

    if (!roomId) {
      return new Response(JSON.stringify({ error: 'Room ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const maxAttempts = 5
    let attempts = 0
    let success = false
    let responseToReturn = null

    while (attempts < maxAttempts && !success) {
      attempts++

      // Fetch current room state
      const { data: room, error: fetchError } = await supabaseClient
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        return new Response(JSON.stringify({ error: 'Room not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let gameState = room.game_state || {}
      const originalVersion = gameState.version || 0

    // Turn Validation: check that the user playing the turn is actually authorized to do so
    if (action === 'resolve_combat') {
      if (actionType === 'resolve_attack') {
        const activeAttackerRole = gameState.attacker_role || room.current_turn
        if (role !== activeAttackerRole) {
          return new Response(JSON.stringify({ error: 'Forbidden: It is not your turn to attack.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else if (actionType === 'confirm_defense') {
        const activeAttackerRole = gameState.attacker_role || room.current_turn
        const expectedDefenderRole = activeAttackerRole === 'host' ? 'opponent' : 'host'
        if (role !== expectedDefenderRole) {
          return new Response(JSON.stringify({ error: 'Forbidden: You are not the defender in this combat.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    if (action === 'end_turn') {
      const currentTurnRole = room.current_turn || gameState.current_turn
      if (role !== currentTurnRole) {
        return new Response(JSON.stringify({ error: 'Forbidden: It is not your turn to end.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // State Anti-Tampering Check: Compare incoming client slots/stats with the database ones
    if (action === 'resolve_combat') {
      if (actionType === 'resolve_attack' && details.playerSlots) {
        const dbSlots = role === 'host' ? gameState.host_slots : gameState.opponent_slots
        if (dbSlots) {
          if (details.playerSlots.length !== dbSlots.length) {
            return new Response(JSON.stringify({ error: 'Tampering detected: slots count mismatch.' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
          for (let i = 0; i < dbSlots.length; i++) {
            const dbSlot = dbSlots[i]
            const clientSlot = details.playerSlots[i]
            if (dbSlot.card && !clientSlot.card) {
              return new Response(JSON.stringify({ error: 'Tampering detected: card removed from slot.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              })
            }
            if (!dbSlot.card && clientSlot.card) {
              return new Response(JSON.stringify({ error: 'Tampering detected: card added to empty slot.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              })
            }
            if (dbSlot.card && clientSlot.card) {
              if (isCardStatModified(dbSlot.card, clientSlot.card)) {
                return new Response(JSON.stringify({ error: 'Tampering detected: card stats/status modified.' }), {
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
              }
            }
          }
        }
      } else if (actionType === 'confirm_defense' && details.defenders) {
        const defenderRole = role
        const dbSlots = defenderRole === 'host' ? gameState.host_slots : gameState.opponent_slots
        if (dbSlots) {
          if (details.defenders.length !== dbSlots.length) {
            return new Response(JSON.stringify({ error: 'Tampering detected: slots count mismatch.' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
          for (let i = 0; i < dbSlots.length; i++) {
            const dbSlot = dbSlots[i]
            const clientSlot = details.defenders[i]
            if (dbSlot.card && !clientSlot.card) {
              return new Response(JSON.stringify({ error: 'Tampering detected: card removed from slot.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              })
            }
            if (!dbSlot.card && clientSlot.card) {
              return new Response(JSON.stringify({ error: 'Tampering detected: card added to empty slot.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              })
            }
            if (dbSlot.card && clientSlot.card) {
              if (isCardStatModified(dbSlot.card, clientSlot.card)) {
                return new Response(JSON.stringify({ error: 'Tampering detected: card stats/status modified.' }), {
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
              }
            }
          }
        }
      }
    }

    let updates: any = {}

    // ==========================================
    // ACTION: init_match
    // ==========================================
    if (action === 'init_match') {
      const rs = settings || {}
      const legendRatio = rs.legendPercentage ?? 30
      const maxBonusValue = rs.maxBonusValue ?? 10
      const selectedPlayerPkgs = rs.selectedPlayerPkgs || []
      const selectedSpecialPkgs = rs.selectedSpecialPkgs || []

      // 1. Fetch player cards
      let fetchedPlayers: any[] = []
      if (selectedPlayerPkgs.length > 0) {
        const { data } = await supabaseClient
          .from('package_cards')
          .select('cards (*)')
          .in('package_id', selectedPlayerPkgs)
        fetchedPlayers = (data || []).map((row: any) => {
          if (!row.cards) return null
          if (Array.isArray(row.cards)) {
            return row.cards[0]
          }
          return row.cards
        }).filter(Boolean)
      }
      if (fetchedPlayers.length < 10) {
        // Fallback to fetch all active cards if package is small or empty
        const { data } = await supabaseClient.from('cards').select('*').limit(100)
        fetchedPlayers = data || []
      }

      // 2. Fetch special cards
      let fetchedSpecials: any[] = []
      if (selectedSpecialPkgs.length > 0) {
        const { data } = await supabaseClient
          .from('package_special_cards')
          .select('special_cards (*)')
          .in('package_id', selectedSpecialPkgs)
        fetchedSpecials = (data || []).map((row: any) => {
          if (!row.special_cards) return null
          if (Array.isArray(row.special_cards)) {
            return row.special_cards[0]
          }
          return row.special_cards
        }).filter(Boolean)
      }
      if (fetchedSpecials.length === 0) {
        const { data } = await supabaseClient.from('special_cards').select('*').limit(50)
        fetchedSpecials = data || []
      }
      if (fetchedSpecials.length === 0) {
        // Fallback standard cards if database is empty/unseeded
        fetchedSpecials = [
          { id: 1, name: 'تسلل مباغت', effect: 'offside', effect_arabic: 'تسلل', description: 'يقع كارت هجوم الخصم بمصيدة التسلل ويلغي نقاط المهاجم الأقوى لديه تماماً لهذه الهجمة.', icon: '🚩', ability: '{"trigger":"CardPlayed","conditions":[{"type":"CardOwnerIsEnemy"}],"actions":[{"type":"CancelAction","target":"CurrentAttack","duration":"Instant"}]}' },
          { id: 2, name: 'أمطار وغرق العشب', effect: 'wet_pitch', effect_arabic: 'عشب مبلل', description: 'تبلل أرضية الملعب لتحد من سرعة هجمات أو متانة دفاعات خصمك بمقدار 4 نقاط.', icon: '🌧️', ability: '{"trigger":"CardPlayed","conditions":[{"type":"CardOwnerIsEnemy"}],"actions":[{"type":"RemoveStat","stat":"attack","value":4,"target":"CurrentAttack","duration":"Instant"}]}' },
          { id: 3, name: 'مرتدة قاتلة', effect: 'counter_attack', effect_arabic: 'هجمة مرتدة', description: 'استغل الاندفاع الهجومي للخصم لخلق هجمة معاكسة حاسمة تزيد هجوم المهاجم بـ +4 نقاط.', icon: '↗️', ability: '{"trigger":"CardPlayed","conditions":[{"type":"IsAttacker"}],"actions":[{"type":"AddStat","stat":"attack","value":4,"target":"CurrentAttack","duration":"Instant"}]}' },
          { id: 4, name: 'الجمهور الحماسي', effect: 'fans', effect_arabic: 'دعم الجماهير', description: 'الهتاف المزلزل بالمدرج يمنح أي لاعب مكشوف بملعبك طاقة هجومية ودفاعية إضافية +3 نقاط.', icon: '🥁', ability: '{"trigger":"CardPlayed","conditions":[],"actions":[{"type":"AddStat","stat":"attack","value":3,"target":"Allies","duration":"Instant"},{"type":"AddStat","stat":"defense","value":3,"target":"Allies","duration":"Instant"}]}' },
          { id: 5, name: 'تكتيك ركن الباص', effect: 'park_the_bus', effect_arabic: 'ركن الباص', description: 'تنظيم دفاعي معقد خلف الكرة يغلق المنافذ بالكامل ليعطي المدافعين المعنيين زيادة دفاعية +6 نقاط.', icon: '🚌', ability: '{"trigger":"CardPlayed","conditions":[{"type":"IsDefender"}],"actions":[{"type":"AddStat","stat":"defense","value":6,"target":"CurrentDefense","duration":"Instant"}]}' },
          { id: 6, name: 'طرد مباشر (حمراء)', effect: 'red_card', effect_arabic: 'كارت أحمر', description: 'حكم المباراة يتدخل! قم باستبعاد أي كارت لاعب لخصمك (مكشوف أو مقلوب) خارج الملعب تماماً حتى نهاية المباراة.', icon: '🟥', ability: '{"trigger":"CardPlayed","conditions":[],"actions":[{"type":"DestroyCard","target":"SelectedEnemy","duration":"Instant"}]}' },
          { id: 7, name: 'طاقة كأس العالم', effect: 'world_cup', effect_arabic: 'روح المونديال', description: 'شحن معنويات الفريق يتيح لك فوراً سحب كارتين إضافيين (من أي مجموعة تناسب تكتيكاتك).', icon: '🏆', ability: '{"trigger":"CardPlayed","conditions":[],"actions":[{"type":"DrawCard","value":2,"target":"Self","duration":"Instant"}]}' }
        ];
      }

      // Format cards into game-ready schemas with ability parsing
      const parsePlayerCard = (c: any) => {
        let ability = undefined
        // Support direct ability or ability_type columns if present
        const rawAbility = c.ability || c.ability_type || c.abilityType
        if (rawAbility) {
          if (typeof rawAbility === 'string') {
            try {
              ability = JSON.parse(rawAbility)
            } catch {
              ability = rawAbility
            }
          } else {
            ability = rawAbility
          }
        }

        let description = c.description || ''
        try {
          if (c.description && c.description.trim().startsWith('{')) {
            const parsed = JSON.parse(c.description)
            description = parsed.text || ''
            if (parsed.ability) {
              ability = parsed.ability
            }
          }
        } catch { /* ignored */ }
        return {
          ...c,
          id: `db_${c.id}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'player',
          isLegend: !!c.is_legend,
          roleArabic: c.role_arabic || '',
          imageUrl: c.image_url || '',
          description,
          ability
        }
      }

      const parseSpecialCard = (c: any) => {
        let ability = undefined
        // Support direct ability or ability_type columns if present
        const rawAbility = c.ability || c.ability_type || c.abilityType
        if (rawAbility) {
          if (typeof rawAbility === 'string') {
            try {
              ability = JSON.parse(rawAbility)
            } catch {
              ability = rawAbility
            }
          } else {
            ability = rawAbility
          }
        }

        let description = c.description || ''
        try {
          if (c.description && c.description.trim().startsWith('{')) {
            const parsed = JSON.parse(c.description)
            description = parsed.text || ''
            if (parsed.ability) {
              ability = parsed.ability
            }
          }
        } catch { /* ignored */ }

        // Fallback ability mapping based on effect if missing
        if (!ability) {
          switch (c.effect) {
            case 'offside':
              ability = { trigger: 'CardPlayed', conditions: [{ type: 'CardOwnerIsEnemy' }], actions: [{ type: 'CancelAction', target: 'CurrentAttack', duration: 'Instant' }] };
              break;
            case 'wet_pitch':
              ability = { trigger: 'CardPlayed', conditions: [{ type: 'CardOwnerIsEnemy' }], actions: [{ type: 'RemoveStat', stat: 'attack', value: 4, target: 'CurrentAttack', duration: 'Instant' }] };
              break;
            case 'counter_attack':
              ability = { trigger: 'CardPlayed', conditions: [{ type: 'IsAttacker' }], actions: [{ type: 'AddStat', stat: 'attack', value: 4, target: 'CurrentAttack', duration: 'Instant' }] };
              break;
            case 'fans':
              ability = { trigger: 'CardPlayed', conditions: [], actions: [{ type: 'AddStat', stat: 'attack', value: 3, target: 'Allies', duration: 'Instant' }, { type: 'AddStat', stat: 'defense', value: 3, target: 'Allies', duration: 'Instant' }] };
              break;
            case 'park_the_bus':
              ability = { trigger: 'CardPlayed', conditions: [{ type: 'IsDefender' }], actions: [{ type: 'AddStat', stat: 'defense', value: 6, target: 'CurrentDefense', duration: 'Instant' }] };
              break;
            case 'red_card':
              ability = { trigger: 'CardPlayed', conditions: [], actions: [{ type: 'DestroyCard', target: 'SelectedEnemy', duration: 'Instant' }] };
              break;
            case 'world_cup':
              ability = { trigger: 'CardPlayed', conditions: [], actions: [{ type: 'DrawCard', value: 2, target: 'Self', duration: 'Instant' }] };
              break;
          }
        }

        return {
          ...c,
          id: `db_spec_${c.id}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'special',
          effectArabic: c.effect_arabic || '',
          imageUrl: c.image_url || '',
          description,
          ability
        }
      }


      // Automatically draw initial cards for warmup (auto-warmup slots)
      const initialCardsCount = rs.initialCardsCount ?? 5
      const prepareInitialSlots = (deck: any[], count: number = initialCardsCount) => {
        const slots = []
        const remDeck = [...deck]
        let c = 0
        for (let i = 0; i < remDeck.length; i++) {
          const card = remDeck[i]
          if (card && !card.isLegend && !card.is_legend && card.rarity !== 'legendary') {
            slots.push({ card, isRevealed: false })
            remDeck.splice(i, 1)
            i--
            c++
            if (c === count) break
          }
        }
        // If not enough non-legend cards, fill remaining slots
        while (slots.length < count && remDeck.length > 0) {
          slots.push({ card: remDeck.shift(), isRevealed: false })
        }
        return { slots, remainingDeck: remDeck }
      }

      const playerPool = fetchedPlayers.map(parsePlayerCard)
      const specialPool = fetchedSpecials.map(parseSpecialCard)

      // 3. Create a single shared deck (not two separate decks)
      // Deduplicate and shuffle the entire player pool once
      const seenNames = new Set<string>()
      const allCards: any[] = []
      playerPool.forEach((card: any) => {
        if (card && card.name) {
          const n = card.name.trim().toLowerCase()
          if (!seenNames.has(n)) { seenNames.add(n); allCards.push(card) }
        }
      })
      const shuffledSharedPool = allCards.sort(() => Math.random() - 0.5)

      // Extract warmup for host (5 non-legends first), then opponent from remaining
      const hostWarmupResult = prepareInitialSlots(shuffledSharedPool, initialCardsCount)
      const opponentWarmupResult = prepareInitialSlots(hostWarmupResult.remainingDeck, initialCardsCount)
      const sharedPlayerDeck = opponentWarmupResult.remainingDeck

      const hostInit = { slots: hostWarmupResult.slots }
      const opponentInit = { slots: opponentWarmupResult.slots }

      // Specials deck duplication
      const specialDeckPool: any[] = []
      const reps = specialPool.length > 5 ? 2 : 3
      for (let i = 0; i < reps; i++) {
        specialDeckPool.push(...specialPool)
      }
      const specialDeck = specialDeckPool
        .sort(() => Math.random() - 0.5)
        .map((card, idx) => ({ ...card, id: `spec_${idx}_${Math.random().toString(36).substr(2, 6)}` }))

      // Booster deck
      const boosterDeck: any[] = []
      const boosterEffects = [
        { text: 'تسديدة مقوسة مذهلة', value: 2 },
        { text: 'هجمة مرتدة سريعة', value: 3 },
        { text: 'تمريرة طولية متقنة', value: 4 },
        { text: 'اختراق مهارات الفردي', value: 5 },
        { text: 'عرضية بالمقاس لخط الستة', value: 6 },
        { text: 'ركلة حرة مباشرة على الزاوية', value: 7 },
        { text: 'ركلة جزاء مستحقة للعرقلة', value: 8 },
        { text: 'كرة ساقطة خلف الحارس المتقدم', value: 9 },
        { text: 'تسديدة صاروخية عابرة للقارات', value: 10 },
      ]
      const finalMaxBonus = Math.min(10, Math.max(2, maxBonusValue))
      const allowedBoosters = boosterEffects.filter(b => b.value <= finalMaxBonus)
      for (let i = 0; i < 4; i++) {
        boosterDeck.push(...allowedBoosters)
      }
      const finalBoosterDeck = boosterDeck
        .sort(() => Math.random() - 0.5)
        .map((b, idx) => ({ ...b, id: `booster_${idx}_${Math.random().toString(36).substr(2, 6)}` }))

      // Kickoff roles
      const hostStarts = Math.random() < 0.5
      const firstHalfRole = hostStarts ? 'player' : 'ai' // Host starts if 'player'
      const secondHalfRole = hostStarts ? 'ai' : 'player'

      gameState = {
        room_settings: rs,
        phase: 'warmup',
        host_slots: hostInit.slots,
        opponent_slots: opponentInit.slots,
        host_hand: [],
        opponent_hand: [],
        host_score: 0,
        opponent_score: 0,
        host_moves: rs.maxMovesPerTurn ?? 3,
        opponent_moves: rs.maxMovesPerTurn ?? 3,
        defense_moves_left: rs.maxMovesPerTurn ?? 3,
        extra_draws_limit: 0,
        shared_player_deck: sharedPlayerDeck,
        special_deck: specialDeck,
        booster_deck: finalBoosterDeck,
        turn_count: 1,
        match_half: 1,
        is_half_time_break: false,
        half_time_break_left: 0,
        completed_rounds: 0,
        first_half_kickoff_role: firstHalfRole,
        second_half_kickoff_role: secondHalfRole,
        attacker_role: hostStarts ? 'host' : 'opponent',
        is_shot_declared: false,
        logs: [
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text: `صافرة بداية مباراة الأونلاين! كود الغرفة: ${roomId} ⚽`,
            type: 'success',
          },
        ],
        version: 1,
        last_updated_by: 'referee',
      }

      updates = {
        game_state: gameState,
        status: 'playing',
        host_confirmed: false,
        opponent_confirmed: false,
      }
    }

    // ==========================================
    // ACTION: confirm_lineup
    // ==========================================
    else if (action === 'confirm_lineup') {
      const isHost = role === 'host'
      const { slots, deck } = body

      if (isHost) {
        updates.host_confirmed = true
        gameState.host_slots = slots.map((s: any) => ({ ...s, isRevealed: false }))
      } else {
        updates.opponent_confirmed = true
        gameState.opponent_slots = slots.map((s: any) => ({ ...s, isRevealed: false }))
      }

      // Check if both confirmed
      const bothConfirmed = (isHost ? room.opponent_confirmed : room.host_confirmed) || false
      if (bothConfirmed || updates.host_confirmed && updates.opponent_confirmed) {
        const hostStarts = gameState.first_half_kickoff_role === 'player'
        const startRole = hostStarts ? 'host' : 'opponent'
        
        gameState.phase = 'player_turn' // In multiplayer context, both sides see themselves relative to turn
        gameState.attacker_role = startRole
        gameState.current_turn = startRole
        gameState.cards_drawn = 0
        gameState.start_time = Date.now() // Master game timer timestamp

        gameState.host_moves = hostStarts ? (gameState.room_settings.maxMovesPerTurn ?? 3) : 0
        gameState.opponent_moves = hostStarts ? 0 : (gameState.room_settings.maxMovesPerTurn ?? 3)
        gameState.defense_moves_left = gameState.room_settings.maxMovesPerTurn ?? 3

        const kickoffAuthId = startRole === 'host' ? room.host_id : room.opponent_id
        gameState.current_turn_auth_id = kickoffAuthId
        updates.current_turn_auth_id = kickoffAuthId

        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          text: `🏁 صافرة البداية — المباراة بين ${room.host_name} و ${room.opponent_name || 'الخصم'}!`,
          type: 'info',
        })
        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          text: `تم تأكيد خطة الفريقين! ركلة البداية مع ${hostStarts ? room.host_name : (room.opponent_name || 'الخصم')}! ⚽🏁`,
          type: 'success',
        })

        updates.status = 'playing'
        updates.current_turn = startRole
      }

      gameState.last_updated_by = 'referee'
      updates.game_state = gameState
    }

    // ==========================================
    // ACTION: resolve_combat
    // ==========================================
    else if (action === 'resolve_combat') {
      const { actionType, details } = body
      
      if (actionType === 'resolve_attack') {
        // Attacker declares shot
        gameState.is_shot_declared = true
        if (details.playerSlots) {
          if (role === 'host') {
            gameState.host_slots = details.playerSlots
          } else {
            gameState.opponent_slots = details.playerSlots
          }
        }
        gameState.current_booster = details.currentBooster
        gameState.current_attacker_idx = details.currentAttackerIdx
        gameState.logs = details.logs

        // Trigger AttackStarted & DefenseStarted BEFORE combat calculations
        const hostName = room.host_name;
        const opponentName = room.opponent_name || 'الخصم';
        
        const attackerRole = role;
        const defenderRole = role === 'host' ? 'opponent' : 'host';
        
        const attackerSlots = attackerRole === 'host' ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
        const defenderSlots = defenderRole === 'host' ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
        
        attackerSlots.forEach((slot: any) => {
          if (slot && slot.card && slot.isRevealed) {
            executeCardInstantEffects(gameState, slot.card, attackerRole, "AttackStarted", hostName, opponentName);
          }
        });
        
        defenderSlots.forEach((slot: any) => {
          if (slot && slot.card && slot.isRevealed) {
            executeCardInstantEffects(gameState, slot.card, defenderRole, "DefenseStarted", hostName, opponentName);
          }
        });

        // Check if defender has no moves left
        const defenseMoves = gameState.defense_moves_left ?? 0
        if (defenseMoves <= 0) {
          // Resolve combat immediately!
          const attackerRole = role
          const defenderRole = attackerRole === 'host' ? 'opponent' : 'host'
          
          const hostSlots = gameState.host_slots
          const opponentSlots = gameState.opponent_slots
          
          const hostSpecials = gameState.active_specials_host || []
          const opponentSpecials = gameState.active_specials_opponent || []

          const isHostAttacker = gameState.attacker_role === 'host'
          
          const attackDetail = getDetailedCalculation(
            isHostAttacker,
            true,
            gameState.current_attacker_idx,
            gameState.current_booster,
            hostSpecials,
            opponentSpecials,
            hostSlots,
            opponentSlots,
            isHostAttacker
          )
          const attackPower = attackDetail.total

          const defDetail = getDetailedCalculation(
            !isHostAttacker,
            false,
            null,
            null,
            hostSpecials,
            opponentSpecials,
            hostSlots,
            opponentSlots,
            isHostAttacker
          )
          const defensePower = defDetail.total

          const isGoal = attackPower > defensePower
          let attackerName = isHostAttacker ? room.host_name : (room.opponent_name || 'الخصم')
          let defenderName = isHostAttacker ? (room.opponent_name || 'الخصم') : room.host_name
          
          const attackerMoves = isHostAttacker ? gameState.host_moves : gameState.opponent_moves
          const attackerSlots = isHostAttacker ? hostSlots : opponentSlots
          const hasUnrevealedCards = attackerSlots.some((s: any) => s && s.card && !s.isRevealed)
          const canReinforce = attackerMoves > 0 && hasUnrevealedCards

          const filterSpecials = (specials: any[]) => specials.filter((s: any) => {
            const mainAction = s.ability?.actions?.[0]
            return mainAction && mainAction.duration !== 'Instant' && mainAction.duration !== 'CurrentPhase'
          })

          if (isGoal) {
            if (isHostAttacker) {
              gameState.host_score += 1
            } else {
              gameState.opponent_score += 1
            }
            const scoringRole = isHostAttacker ? 'host' : 'opponent';
            const scoringSlots = scoringRole === 'host' ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
            scoringSlots.forEach((slot: any) => {
              if (slot && slot.card && slot.isRevealed) {
                executeCardInstantEffects(gameState, slot.card, scoringRole, "GoalScored", room.host_name, room.opponent_name || 'الخصم');
              }
            });
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: formatRefereeGoalLog(
                isHostAttacker ? 'host' : 'opponent',
                attackPower,
                defensePower,
                attackDetail.breakdown,
                defDetail.breakdown,
                `${gameState.host_score} - ${gameState.opponent_score}`,
                room.host_name,
                room.opponent_name || 'الخصم'
              ),
              type: 'success',
            })

            const attackerCardName = isHostAttacker
              ? (gameState.host_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")
              : (gameState.opponent_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")

            const activeDefenders = (defenderRole === 'host' ? hostSlots : opponentSlots)
              .filter((s: any) => s && s.card && (s.revealedInAttack || s.confirmedInAttack || s.isRevealed))
              .map((s: any) => s.card.name)

            gameState.current_combat_detail = {
              attacker: isHostAttacker ? 'host' : 'opponent',
              attackerName: attackerName,
              attackerCard: attackerCardName,
              attackPower: attackPower,
              defensePower: defensePower,
              isGoal: true,
              defenders: activeDefenders,
              boosterValue: gameState.current_booster ? gameState.current_booster.value : 0,
              boosterText: gameState.current_booster ? gameState.current_booster.text : ""
            }

            const applySpent = (slots: any[]) => slots.map((s: any) => {
              if (s && (s.revealedInAttack || s.confirmedInAttack)) {
                return { ...s, spent: true, revealedInAttack: false, confirmedInAttack: false }
              }
              return s
            })

            gameState.host_slots = decrementSlotDurations(applySpent(hostSlots))
            gameState.opponent_slots = decrementSlotDurations(applySpent(opponentSlots))
            gameState.is_shot_declared = false
            gameState.phase = 'resolution'

            gameState.active_specials_host = processSpecials(filterSpecials(hostSpecials))
            gameState.active_specials_opponent = processSpecials(filterSpecials(opponentSpecials))
          } else {
            if (canReinforce) {
              gameState.logs.push({
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                text: `🧤 إنقاذ! صد دفاع ${defenderName} (${defensePower}) محاولة تسديد ${attackerName} (${attackPower})! وبما أنه متبقي لدى المهاجم حركات وكروت مقلوبة، يستمر النزاع!`,
                type: 'neutral',
              })

              const lockSlots = (slots: any[]) => slots.map((s: any) => {
                if (s && s.revealedInAttack) {
                  return { ...s, confirmedInAttack: true, revealedInAttack: false }
                }
                return s
              })

              gameState.host_slots = lockSlots(hostSlots)
              gameState.opponent_slots = lockSlots(opponentSlots)
              gameState.is_shot_declared = false
              gameState.phase = isHostAttacker ? 'attacking' : 'ai_attacking'

              gameState.active_specials_host = hostSpecials
              gameState.active_specials_opponent = opponentSpecials
            } else {
              gameState.logs.push({
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                text: formatRefereeBlockLog(
                  isHostAttacker ? 'host' : 'opponent',
                  attackPower,
                  defensePower,
                  attackDetail.breakdown,
                  defDetail.breakdown,
                  `${gameState.host_score} - ${gameState.opponent_score}`,
                  room.host_name,
                  room.opponent_name || 'الخصم'
                ),
                type: 'neutral',
              })

              const attackerCardName = isHostAttacker
                ? (gameState.host_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")
                : (gameState.opponent_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")

              const activeDefenders = (defenderRole === 'host' ? hostSlots : opponentSlots)
                .filter((s: any) => s && s.card && (s.revealedInAttack || s.confirmedInAttack || s.isRevealed))
                .map((s: any) => s.card.name)

              gameState.current_combat_detail = {
                attacker: isHostAttacker ? 'host' : 'opponent',
                attackerName: attackerName,
                attackerCard: attackerCardName,
                attackPower: attackPower,
                defensePower: defensePower,
                isGoal: false,
                defenders: activeDefenders,
                boosterValue: gameState.current_booster ? gameState.current_booster.value : 0,
                boosterText: gameState.current_booster ? gameState.current_booster.text : ""
              }

              const applySpent = (slots: any[]) => slots.map((s: any) => {
                if (s && (s.revealedInAttack || s.confirmedInAttack)) {
                  return { ...s, spent: true, revealedInAttack: false, confirmedInAttack: false }
                }
                return s
              })

              gameState.host_slots = decrementSlotDurations(applySpent(hostSlots))
              gameState.opponent_slots = decrementSlotDurations(applySpent(opponentSlots))
              gameState.is_shot_declared = false
              gameState.phase = 'resolution'

              gameState.active_specials_host = processSpecials(filterSpecials(hostSpecials))
              gameState.active_specials_opponent = processSpecials(filterSpecials(opponentSpecials))
            }
          }
        }
      } 
      else if (actionType === 'confirm_defense') {
        // Defender confirms defence, calculate combat resolution
        const defenderRole = role
        const attackerRole = defenderRole === 'host' ? 'opponent' : 'host'
        
        const defenderSlots = details.defenders || []
        const hostSlots = defenderRole === 'host' ? defenderSlots : gameState.host_slots
        const opponentSlots = defenderRole === 'opponent' ? defenderSlots : gameState.opponent_slots
        
        const hostSpecials = defenderRole === 'host' ? details.specials : (gameState.active_specials_host || [])
        const opponentSpecials = defenderRole === 'opponent' ? details.specials : (gameState.active_specials_opponent || [])

        // Log each defender's confirmation individually
        defenderSlots.forEach((slot: any) => {
          if (slot && slot.card && slot.isRevealed && slot.revealedInAttack) {
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `🧱 تم تأكيد الدفاع باللاعب [ ${slot.card.name} ] لصد الهجوم بقوة دفاع +${slot.card.defense}!`,
              type: 'info',
            })
          }
        })
        ;(details.specials || []).forEach((spec: any) => {
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text: `🛡️ تم تعزيز الدفاع بكارت التكتيك [ ${spec.name} ]!`,
            type: 'success',
          })
        })

        // Run Rules Engine
        const isHostAttacker = gameState.attacker_role === 'host'
        
        const attackDetail = getDetailedCalculation(
          isHostAttacker,
          true,
          gameState.current_attacker_idx,
          gameState.current_booster,
          hostSpecials,
          opponentSpecials,
          hostSlots,
          opponentSlots,
          isHostAttacker
        )
        const attackPower = attackDetail.total

        const defDetail = getDetailedCalculation(
          !isHostAttacker,
          false,
          null,
          null,
          hostSpecials,
          opponentSpecials,
          hostSlots,
          opponentSlots,
          isHostAttacker
        )
        const defensePower = defDetail.total

        const isGoal = attackPower > defensePower
        let attackerName = isHostAttacker ? room.host_name : (room.opponent_name || 'الخصم')
        let defenderName = isHostAttacker ? (room.opponent_name || 'الخصم') : room.host_name
        
        const attackerMoves = isHostAttacker ? gameState.host_moves : gameState.opponent_moves
        const attackerSlots = isHostAttacker ? hostSlots : opponentSlots
        const hasUnrevealedCards = attackerSlots.some((s: any) => s && s.card && !s.isRevealed)
        const canReinforce = attackerMoves > 0 && hasUnrevealedCards

        const filterSpecials = (specials: any[]) => specials.filter((s: any) => {
          const mainAction = s.ability?.actions?.[0]
          return mainAction && mainAction.duration !== 'Instant' && mainAction.duration !== 'CurrentPhase'
        })

        if (isGoal) {
          if (isHostAttacker) {
            gameState.host_score += 1
          } else {
            gameState.opponent_score += 1
          }
          const scoringRole = isHostAttacker ? 'host' : 'opponent';
          const scoringSlots = scoringRole === 'host' ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
          scoringSlots.forEach((slot: any) => {
            if (slot && slot.card && slot.isRevealed) {
              executeCardInstantEffects(gameState, slot.card, scoringRole, "GoalScored", room.host_name, room.opponent_name || 'الخصم');
            }
          });
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text: formatRefereeGoalLog(
              isHostAttacker ? 'host' : 'opponent',
              attackPower,
              defensePower,
              attackDetail.breakdown,
              defDetail.breakdown,
              `${gameState.host_score} - ${gameState.opponent_score}`,
              room.host_name,
              room.opponent_name || 'الخصم'
            ),
            type: 'success',
          })

          const attackerCardName = isHostAttacker
            ? (gameState.host_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")
            : (gameState.opponent_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")

          const activeDefenders = (defenderRole === 'host' ? hostSlots : opponentSlots)
            .filter((s: any) => s && s.card && (s.revealedInAttack || s.confirmedInAttack || s.isRevealed))
            .map((s: any) => s.card.name)

          gameState.current_combat_detail = {
            attacker: isHostAttacker ? 'host' : 'opponent',
            attackerName: attackerName,
            attackerCard: attackerCardName,
            attackPower: attackPower,
            defensePower: defensePower,
            isGoal: true,
            defenders: activeDefenders,
            boosterValue: gameState.current_booster ? gameState.current_booster.value : 0,
            boosterText: gameState.current_booster ? gameState.current_booster.text : ""
          }

          const applySpent = (slots: any[]) => slots.map((s: any) => {
            if (s && (s.revealedInAttack || s.confirmedInAttack)) {
              return { ...s, spent: true, revealedInAttack: false, confirmedInAttack: false }
            }
            return s
          })

          gameState.host_slots = decrementSlotDurations(applySpent(hostSlots))
          gameState.opponent_slots = decrementSlotDurations(applySpent(opponentSlots))
          gameState.is_shot_declared = false
          gameState.phase = 'resolution'

          gameState.active_specials_host = processSpecials(filterSpecials(hostSpecials))
          gameState.active_specials_opponent = processSpecials(filterSpecials(opponentSpecials))
        } else {
          if (canReinforce) {
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `🧤 إنقاذ! صد دفاع ${defenderName} (${defensePower}) محاولة تسديد ${attackerName} (${attackPower})! وبما أنه متبقي لدى المهاجم حركات وكروت مقلوبة، يستمر النزاع!`,
              type: 'neutral',
            })

            const lockSlots = (slots: any[]) => slots.map((s: any) => {
              if (s && s.revealedInAttack) {
                return { ...s, confirmedInAttack: true, revealedInAttack: false }
              }
              return s
            })

            gameState.host_slots = lockSlots(hostSlots)
            gameState.opponent_slots = lockSlots(opponentSlots)
            gameState.is_shot_declared = false
            gameState.phase = isHostAttacker ? 'attacking' : 'ai_attacking'

            gameState.active_specials_host = hostSpecials
            gameState.active_specials_opponent = opponentSpecials
          } else {
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: formatRefereeBlockLog(
                isHostAttacker ? 'host' : 'opponent',
                attackPower,
                defensePower,
                attackDetail.breakdown,
                defDetail.breakdown,
                `${gameState.host_score} - ${gameState.opponent_score}`,
                room.host_name,
                room.opponent_name || 'الخصم'
              ),
              type: 'neutral',
            })

            const attackerCardName = isHostAttacker
              ? (gameState.host_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")
              : (gameState.opponent_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")

            const activeDefenders = (defenderRole === 'host' ? hostSlots : opponentSlots)
              .filter((s: any) => s && s.card && (s.revealedInAttack || s.confirmedInAttack || s.isRevealed))
              .map((s: any) => s.card.name)

            gameState.current_combat_detail = {
              attacker: isHostAttacker ? 'host' : 'opponent',
              attackerName: attackerName,
              attackerCard: attackerCardName,
              attackPower: attackPower,
              defensePower: defensePower,
              isGoal: false,
              defenders: activeDefenders,
              boosterValue: gameState.current_booster ? gameState.current_booster.value : 0,
              boosterText: gameState.current_booster ? gameState.current_booster.text : ""
            }

            const applySpent = (slots: any[]) => slots.map((s: any) => {
              if (s && (s.revealedInAttack || s.confirmedInAttack)) {
                return { ...s, spent: true, revealedInAttack: false, confirmedInAttack: false }
              }
              return s
            })

            gameState.host_slots = decrementSlotDurations(applySpent(hostSlots))
            gameState.opponent_slots = decrementSlotDurations(applySpent(opponentSlots))
            gameState.is_shot_declared = false
            gameState.phase = 'resolution'

            gameState.active_specials_host = processSpecials(filterSpecials(hostSpecials))
            gameState.active_specials_opponent = processSpecials(filterSpecials(opponentSpecials))
          }
        }
      }

      gameState.last_updated_by = 'referee'
      updates.game_state = gameState
    }

    // ==========================================
    // ACTION: end_turn
    // ==========================================
    else if (action === 'end_turn') {
      const isHost = role === 'host'
      const nextTurn = isHost ? 'opponent' : 'host'
      const maxMoves = gameState.room_settings.maxMovesPerTurn ?? 3

      // Trigger TurnEnded for the ending player
      const hostName = room.host_name;
      const opponentName = room.opponent_name || 'الخصم';
      const endingRole = role;
      const endingSlots = endingRole === 'host' ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
      endingSlots.forEach((slot: any) => {
        if (slot && slot.card && slot.isRevealed) {
          executeCardInstantEffects(gameState, slot.card, endingRole, "TurnEnded", hostName, opponentName);
        }
      });

      // Decrement slot durations and specials on end_turn
      gameState.host_slots = decrementSlotDurations(gameState.host_slots)
      gameState.opponent_slots = decrementSlotDurations(gameState.opponent_slots)
      gameState.active_specials_host = processSpecials(gameState.active_specials_host)
      gameState.active_specials_opponent = processSpecials(gameState.active_specials_opponent)

      recordRoundHistory(gameState, isHost ? 'host' : 'opponent', room.host_name, room.opponent_name || 'الخصم')
      gameState.completed_rounds = (gameState.completed_rounds || 0) + 1

      gameState.phase = 'player_turn'
      gameState.current_turn = nextTurn
      gameState.attacker_role = nextTurn
      gameState.cards_drawn = 0
      gameState.extra_draws_limit = 0

      if (nextTurn === 'host') {
        gameState.host_moves = maxMoves
        gameState.opponent_moves = 0
      } else {
        gameState.host_moves = 0
        gameState.opponent_moves = maxMoves
      }

      gameState.defense_moves_left = maxMoves

      // Trigger TurnStarted for the starting player
      const startingSlots = nextTurn === 'host' ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
      startingSlots.forEach((slot: any) => {
        if (slot && slot.card && slot.isRevealed) {
          executeCardInstantEffects(gameState, slot.card, nextTurn, "TurnStarted", hostName, opponentName);
        }
      });

      gameState.logs.push({
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        text: `🏁 جولة جديدة — بداية دور ${nextTurn === 'host' ? room.host_name : (room.opponent_name || 'الخصم')}!`,
        type: 'info',
      })
      gameState.logs.push({
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        text: `⏳ انتهى دور ${isHost ? room.host_name : (room.opponent_name || 'الخصم')}! الدور الآن للطرف الآخر لشن الخطط!`,
        type: 'info',
      })

      const nextTurnAuthId = nextTurn === 'host' ? room.host_id : room.opponent_id
      gameState.current_turn_auth_id = nextTurnAuthId
      updates.current_turn_auth_id = nextTurnAuthId
      updates.current_turn = nextTurn
      gameState.last_updated_by = 'referee'
      updates.game_state = gameState
    }

    // ==========================================
    // ACTION: draw_card
    // ==========================================
    else if (action === 'draw_card') {
      const isHost = role === 'host';
      const deckType = body.deckType; // 'player' or 'special'

      const isPlayTurn = gameState.phase === 'player_turn' || gameState.phase === 'attacking' || gameState.phase === 'ai_attacking';
      const isWarmup = gameState.phase === 'warmup';

      if (!isWarmup && !isPlayTurn) {
        return new Response(JSON.stringify({ error: 'Cannot draw cards in the current phase.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (isPlayTurn) {
        const isMyTurn = (room.current_turn || gameState.current_turn) === role;
        const isDefending = (gameState.phase === 'attacking' || gameState.phase === 'ai_attacking') && role !== gameState.attacker_role;

        if (!isMyTurn && !isDefending) {
          return new Response(JSON.stringify({ error: 'It is not your turn to draw.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const limit = isDefending
          ? (gameState.room_settings?.defenseDrawsLimit ?? 3)
          : (gameState.room_settings?.maxDrawsPerTurn ?? 2);

        const totalLimit = limit + (gameState.extra_draws_limit || 0);

        if ((gameState.cards_drawn || 0) >= totalLimit) {
          return new Response(JSON.stringify({ error: 'Draw limit exceeded for this turn.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const hand = isHost ? (gameState.host_hand || []) : (gameState.opponent_hand || []);
      let drawnCard = null;

      if (deckType === 'player') {
        const deck = gameState.shared_player_deck || [];
        if (deck.length === 0) {
          return new Response(JSON.stringify({ error: 'Player deck is empty.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        drawnCard = deck.shift();
        gameState.shared_player_deck = deck;
      } else if (deckType === 'special') {
        const deck = gameState.special_deck || [];
        if (deck.length === 0) {
          return new Response(JSON.stringify({ error: 'Special deck is empty.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        drawnCard = deck.shift();
        gameState.special_deck = deck;
      } else {
        return new Response(JSON.stringify({ error: 'Invalid deck type.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (isWarmup) {
        const slots = isHost ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
        const emptyIdx = slots.findIndex((s: any) => s && s.card === null);
        if (emptyIdx === -1) {
          return new Response(JSON.stringify({ error: 'Warmup slots are already full.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        slots[emptyIdx] = { card: drawnCard, isRevealed: false };
        if (isHost) {
          gameState.host_slots = slots;
        } else {
          gameState.opponent_slots = slots;
        }

        const drawnCount = slots.filter((s: any) => s && s.card !== null).length;
        const playerName = isHost ? room.host_name : (room.opponent_name || 'الخصم');
        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          text: `[التسخين] قام ${playerName} بسحب اللاعب مقلوباً بمركز الملعب [ ${emptyIdx + 1} ]. (سحب ${drawnCount}/${gameState.room_settings?.initialCardsCount ?? 5})`,
          type: 'success',
        });
      } else {
        hand.push(drawnCard);
        if (isHost) {
          gameState.host_hand = hand;
        } else {
          gameState.opponent_hand = hand;
        }

        gameState.cards_drawn = (gameState.cards_drawn || 0) + 1;
        const playerName = isHost ? room.host_name : (room.opponent_name || 'الخصم');
        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          text: `لقد سحب ${playerName} كارت ${deckType === 'player' ? 'لاعب جديد' : 'تكتيك إضافي'} ليده.`,
          type: 'info',
        });
      }

      gameState.last_updated_by = 'referee';
      updates.game_state = gameState;
    }

    // ==========================================
    // ACTION: play_card
    // ==========================================
    else if (action === 'play_card') {
      const isHost = role === 'host';
      const { cardId, targetSlotIdx, burntCardIds } = body;

      const isPlayTurn = gameState.phase === 'player_turn' || gameState.phase === 'attacking' || gameState.phase === 'ai_attacking';
      if (!isPlayTurn) {
        return new Response(JSON.stringify({ error: 'Cannot play cards in the current phase.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isMyTurn = (room.current_turn || gameState.current_turn) === role;
      const isDefending = (gameState.phase === 'attacking' || gameState.phase === 'ai_attacking') && role !== gameState.attacker_role;

      if (!isMyTurn && !isDefending) {
        return new Response(JSON.stringify({ error: 'It is not your turn to play.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check moves left
      const movesLeft = isDefending
        ? (gameState.defense_moves_left || 0)
        : (isHost ? (gameState.host_moves || 0) : (gameState.opponent_moves || 0));

      if (movesLeft < 1) {
        return new Response(JSON.stringify({ error: 'No moves left to perform this action.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const hand = isHost ? (gameState.host_hand || []) : (gameState.opponent_hand || []);
      const cardIdx = hand.findIndex((c: any) => c && c.id === cardId);
      if (cardIdx === -1) {
        return new Response(JSON.stringify({ error: 'Card not found in hand.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const card = hand[cardIdx];
      const hostName = room.host_name;
      const opponentName = room.opponent_name || 'الخصم';
      const playerName = isHost ? hostName : opponentName;

      if (card.type === 'player') {
        if (isDefending) {
          return new Response(JSON.stringify({ error: 'Cannot play player cards while defending.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (targetSlotIdx === undefined || targetSlotIdx < 0 || targetSlotIdx >= (gameState.room_settings?.initialCardsCount ?? 5)) {
          return new Response(JSON.stringify({ error: 'Invalid target slot index.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const legendBurnLimit = gameState.room_settings?.legendBurnLimit ?? 2;
        if (card.isLegend) {
          if (!burntCardIds || burntCardIds.length !== legendBurnLimit) {
            return new Response(JSON.stringify({ error: `Legendary cards require burning exactly ${legendBurnLimit} cards.` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Verify burnt cards exist in hand
          const validBurntIds = burntCardIds.every((id: string) => id !== cardId && hand.some((c: any) => c && c.id === id));
          if (!validBurntIds) {
            return new Response(JSON.stringify({ error: 'Invalid burnt cards specified.' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Recycle burnt cards
          burntCardIds.forEach((id: string) => {
            const burntCard = hand.find((c: any) => c && c.id === id);
            recycleCard(gameState, burntCard, isHost);
          });

          // Filter hand
          const nextHand = hand.filter((c: any) => c && c.id !== cardId && !burntCardIds.includes(c.id));
          if (isHost) {
            gameState.host_hand = nextHand;
          } else {
            gameState.opponent_hand = nextHand;
          }
        } else {
          // Normal card
          const nextHand = hand.filter((c: any) => c && c.id !== cardId);
          if (isHost) {
            gameState.host_hand = nextHand;
          } else {
            gameState.opponent_hand = nextHand;
          }
        }

        const slots = isHost ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
        const targetSlot = slots[targetSlotIdx];

        if (targetSlot && targetSlot.card) {
          if (targetSlot.isRevealed) {
            // Replaced revealed card gets recycled
            recycleCard(gameState, targetSlot.card, isHost);
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `🔄 تم استبدال لاعب بالمركز [ ${targetSlotIdx + 1} ]. تم استبعاد اللاعب المكشوف ونزول لاعب جديد مقلوباً.`,
              type: 'warning',
            });
          } else {
            // Replaced unrevealed card returns to hand
            const currentHand = isHost ? gameState.host_hand : gameState.opponent_hand;
            currentHand.push(targetSlot.card);
            if (isHost) {
              gameState.host_hand = currentHand;
            } else {
              gameState.opponent_hand = currentHand;
            }
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `🔄 تم استبدال لاعب بالمركز [ ${targetSlotIdx + 1} ]. تم استرجاع اللاعب المقلوب ونزول لاعب جديد مقلوباً.`,
              type: 'success',
            });
          }
        } else {
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text: `🔄 تم تنزيل لاعب بالمركز الخالي [ ${targetSlotIdx + 1} ]. وضع لاعب جديد مقلوباً.`,
            type: 'info',
          });
        }

        slots[targetSlotIdx] = { card: card, isRevealed: false };
        if (isHost) {
          gameState.host_slots = slots;
          gameState.host_moves = Math.max(0, (gameState.host_moves || 0) - 1);
        } else {
          gameState.opponent_slots = slots;
          gameState.opponent_moves = Math.max(0, (gameState.opponent_moves || 0) - 1);
        }

        // Trigger ability
        executeCardInstantEffects(gameState, card, role, "CardPlayed", hostName, opponentName);
      } 
      else if (card.type === 'special') {
        if (isSpecialCardsBlocked(role, gameState)) {
          return new Response(JSON.stringify({ error: 'Tactical cards are currently blocked.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const requiresTargeting = card.ability?.actions?.some((act: any) => act.target === 'SelectedEnemy' || act.target === 'SelectedCard') || card.effect === 'red_card';
        if (requiresTargeting) {
          if (targetSlotIdx === undefined || targetSlotIdx < 0 || targetSlotIdx >= (gameState.room_settings?.initialCardsCount ?? 5)) {
            return new Response(JSON.stringify({ error: 'This special card requires specifying a valid target slot.' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const isEnemySideTarget = card.effect === 'red_card' || card.ability?.actions?.some((act: any) => act.target === 'SelectedEnemy');
          const isValid = isValidTargetForCard(role, card, targetSlotIdx, isEnemySideTarget, gameState);
          if (!isValid) {
            return new Response(JSON.stringify({ error: 'Invalid target slot for this tactical card.' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const targetSlots = isEnemySideTarget
            ? (isHost ? gameState.opponent_slots : gameState.host_slots)
            : (isHost ? gameState.host_slots : gameState.opponent_slots);
          const targetSlot = targetSlots[targetSlotIdx];
          const targetCard = targetSlot.card;

          // Apply instant target actions
          const actions = card.ability?.actions || [];
          const actType = actions[0]?.type || (card.effect === "red_card" ? "DestroyCard" : "DestroyCard");
          const durationTurns = actions[0]?.durationTurns || 2;

          if (actType === "DestroyCard") {
            targetSlots[targetSlotIdx] = { card: null, isRevealed: false };
            recycleCard(gameState, targetCard, !isEnemySideTarget);
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `🟥 كارت أحمر: قام ${playerName} بطرد واستبعاد اللاعب [ ${targetCard.name} ] خارج الملعب تماماً!`,
              type: 'danger',
            });
          } else if (actType === "ReturnToHand") {
            targetSlots[targetSlotIdx] = { card: null, isRevealed: false };
            const sideHand = isEnemySideTarget
              ? (isHost ? gameState.opponent_hand : gameState.host_hand)
              : (isHost ? gameState.host_hand : gameState.opponent_hand);
            sideHand.push(targetCard);
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `🔄 سحب لليد: قام ${playerName} بإرجاع اللاعب [ ${targetCard.name} ] ليد المدرب.`,
              type: 'success',
            });
          } else if (actType === "FreezeCard") {
            targetCard.frozen = true;
            targetCard.frozenTurnsLeft = durationTurns;
            targetSlots[targetSlotIdx] = { ...targetSlot, card: targetCard };
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `❄️ تجميد: قام ${playerName} بتجميد لاعب [ ${targetCard.name} ] لمدة ${durationTurns} أدوار!`,
              type: 'neutral',
            });
          } else if (actType === "SilenceCard") {
            targetCard.silenced = true;
            targetCard.silencedTurnsLeft = durationTurns;
            targetSlots[targetSlotIdx] = { ...targetSlot, card: targetCard };
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `🔇 كتم القدرة: قام ${playerName} بإلغاء قدرة لاعب [ ${targetCard.name} ] لمدة ${durationTurns} أدوار!`,
              type: 'neutral',
            });
          } else if (actType === "StunCard") {
            targetCard.stunned = true;
            targetCard.stunnedTurnsLeft = durationTurns;
            targetSlots[targetSlotIdx] = { ...targetSlot, card: targetCard };
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `💫 صدمة تكتيكية: قام ${playerName} بتعطيل لاعب [ ${targetCard.name} ] لمدة ${durationTurns} أدوار!`,
              type: 'neutral',
            });
          } else if (actType === "RevealCard") {
            targetSlot.isRevealed = true;
            targetSlot.revealedInTurn = gameState.turn_count || 1;
            targetSlot.revealedByAbility = true;
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `👁️ كشف: قام ${playerName} بقلب لاعب [ ${targetCard.name} ] ليصبح مكشوفاً.`,
              type: 'success',
            });
            executeCardInstantEffects(gameState, targetCard, !isEnemySideTarget ? role : (isHost ? 'opponent' : 'host'), "CardRevealed", hostName, opponentName);
            executeCardInstantEffects(gameState, targetCard, !isEnemySideTarget ? role : (isHost ? 'opponent' : 'host'), "CardPlayed", hostName, opponentName);
          } else if (actType === "HideCard") {
            targetSlot.isRevealed = false;
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `🎭 إخفاء: قام ${playerName} بقلب لاعب [ ${targetCard.name} ] ليصبح مقلوباً.`,
              type: 'success',
            });
          }

          if (isEnemySideTarget) {
            if (isHost) {
              gameState.opponent_slots = targetSlots;
            } else {
              gameState.host_slots = targetSlots;
            }
          } else {
            if (isHost) {
              gameState.host_slots = targetSlots;
            } else {
              gameState.opponent_slots = targetSlots;
            }
          }
        } 
        else {
          if (card.effect === 'world_cup') {
            let nextPlayerDeck = gameState.shared_player_deck || [];
            let nextSpecialDeck = gameState.special_deck || [];
            const added: any[] = [];
            
            if (nextPlayerDeck.length > 0) {
              added.push(nextPlayerDeck.shift());
            }
            if (nextSpecialDeck.length > 0) {
              added.push(nextSpecialDeck.shift());
            }

            gameState.shared_player_deck = nextPlayerDeck;
            gameState.special_deck = nextSpecialDeck;

            const nextHand = hand.filter((c: any) => c && c.id !== cardId).concat(added);
            if (isHost) {
              gameState.host_hand = nextHand;
            } else {
              gameState.opponent_hand = nextHand;
            }
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `🏆 تم تفعيل ${card.name}! استهلكت حركة واحدة وسحبت ورقتين فوراً من الباقات.`,
              type: 'success',
            });
          } else {
            const activeSpecials = isHost ? (gameState.active_specials_host || []) : (gameState.active_specials_opponent || []);
            activeSpecials.push(card);

            if (isHost) {
              gameState.active_specials_host = activeSpecials;
            } else {
              gameState.active_specials_opponent = activeSpecials;
            }

            const nextHand = hand.filter((c: any) => c && c.id !== cardId);
            if (isHost) {
              gameState.host_hand = nextHand;
            } else {
              gameState.opponent_hand = nextHand;
            }

            let phaseName = "";
            if (gameState.phase === "player_turn") {
              phaseName = "تكتيك عام";
            } else if (gameState.phase === "attacking" || gameState.phase === "ai_attacking") {
              phaseName = isMyTurn ? "تعزيز الهجوم" : "تعزيز الدفاع";
            }
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              text: `✨ ${phaseName}: قام ${playerName} بتفعيل كارت التكتيك [ ${card.name} ]!`,
              type: 'success',
            });
          }
        }

        // Deduct move
        if (isDefending) {
          gameState.defense_moves_left = Math.max(0, (gameState.defense_moves_left || 0) - 1);
        } else {
          if (isHost) {
            gameState.host_moves = Math.max(0, (gameState.host_moves || 0) - 1);
          } else {
            gameState.opponent_moves = Math.max(0, (gameState.opponent_moves || 0) - 1);
          }
        }
      }

      gameState.last_updated_by = 'referee';
      updates.game_state = gameState;
    }

    // ==========================================
    // ACTION: reveal_slot
    // ==========================================
    else if (action === 'reveal_slot') {
      const isHost = role === 'host';
      const { slotIdx, hide } = body;

      const isPlayTurn = gameState.phase === 'player_turn' || gameState.phase === 'attacking' || gameState.phase === 'ai_attacking';
      if (!isPlayTurn) {
        return new Response(JSON.stringify({ error: 'Cannot interact with slots in the current phase.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const slots = isHost ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
      if (slotIdx < 0 || slotIdx >= slots.length) {
        return new Response(JSON.stringify({ error: 'Invalid slot index.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const slot = slots[slotIdx];
      if (!slot || !slot.card) {
        return new Response(JSON.stringify({ error: 'Slot is empty.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const hostName = room.host_name;
      const opponentName = room.opponent_name || 'الخصم';
      const playerName = isHost ? hostName : opponentName;

      const isMyTurn = (room.current_turn || gameState.current_turn) === role;
      const isDefending = (gameState.phase === 'attacking' || gameState.phase === 'ai_attacking') && role !== gameState.attacker_role;

      if (hide) {
        if (!slot.revealedInAttack || slot.confirmedInAttack) {
          return new Response(JSON.stringify({ error: 'Cannot hide this slot.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        slot.isRevealed = false;
        slot.revealedInAttack = false;

        // Refund move
        if (isDefending) {
          gameState.defense_moves_left = Math.min(gameState.room_settings?.maxMovesPerTurn ?? 3, (gameState.defense_moves_left || 0) + 1);
        } else {
          if (isHost) {
            gameState.host_moves = Math.min(gameState.room_settings?.maxMovesPerTurn ?? 3, (gameState.host_moves || 0) + 1);
          } else {
            gameState.opponent_moves = Math.min(gameState.room_settings?.maxMovesPerTurn ?? 3, (gameState.opponent_moves || 0) + 1);
          }
        }
        
        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          text: `🎭 إلغاء كشف: قام ${playerName} بإعادة قلب كارت اللاعب [ ${slot.card.name} ] ليكون مقلوباً ومخفياً.`,
          type: 'neutral',
        });
      } 
      else {
        if (slot.isRevealed) {
          return new Response(JSON.stringify({ error: 'Slot is already revealed.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (isDefending) {
          const enemySpecials = isHost ? (gameState.active_specials_opponent || []) : (gameState.active_specials_host || []);
          const enemySlots = isHost ? (gameState.opponent_slots || []) : (gameState.host_slots || []);
          const isDefenseBlocked = enemySpecials.some((c: any) => c.ability?.actions?.some((a: any) => a.type === "BlockDefense")) ||
                                   enemySlots.some((s: any) => s && s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions?.some((a: any) => a.type === "BlockDefense"));
          if (isDefenseBlocked) {
            return new Response(JSON.stringify({ error: 'Defense is blocked.' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        const activeSpecialsCount = isHost ? (gameState.active_specials_host || []).length : (gameState.active_specials_opponent || []).length;
        const revealedCount = slots.filter((s: any) => s && s.card && s.revealedInAttack).length;
        const maxMoves = gameState.room_settings?.maxMovesPerTurn ?? 3;

        if (revealedCount + activeSpecialsCount >= maxMoves) {
          return new Response(JSON.stringify({ error: `Cannot reveal more than ${maxMoves} cards this round.` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const movesLeft = isDefending
          ? (gameState.defense_moves_left || 0)
          : (isHost ? (gameState.host_moves || 0) : (gameState.opponent_moves || 0));

        if (movesLeft < 1) {
          return new Response(JSON.stringify({ error: 'No moves left to perform this action.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        slot.isRevealed = true;
        slot.revealedInAttack = true;
        slot.revealedInTurn = gameState.turn_count || 1;

        if (isDefending) {
          gameState.defense_moves_left = Math.max(0, (gameState.defense_moves_left || 0) - 1);
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text: `🛡️ تم كشف المدافع [ ${slot.card.name} ] لصد الهجوم! (استهلكت حركة واحدة)`,
            type: 'success',
          });
        } else {
          if (isHost) {
            gameState.host_moves = Math.max(0, (gameState.host_moves || 0) - 1);
          } else {
            gameState.opponent_moves = Math.max(0, (gameState.opponent_moves || 0) - 1);
          }
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text: `⚔️ تم كشف المهاجم الداعم [ ${slot.card.name} ] لتعزيز الهجمة! (استهلكت حركة واحدة)`,
            type: 'success',
          });
        }

        executeCardInstantEffects(gameState, slot.card, role, "CardRevealed", hostName, opponentName);
        executeCardInstantEffects(gameState, slot.card, role, "CardPlayed", hostName, opponentName);
      }

      if (isHost) {
        gameState.host_slots = slots;
      } else {
        gameState.opponent_slots = slots;
      }

      gameState.last_updated_by = 'referee';
      updates.game_state = gameState;
    }

      // Save state back to DB with optimistic lock check
      gameState.version = originalVersion + 1
      updates.game_state = gameState

      let query = supabaseClient
        .from('rooms')
        .update({
          ...updates,
          last_activity: Date.now()
        })
        .eq('id', roomId)

      if (originalVersion > 0) {
        query = query.eq('game_state->version', originalVersion)
      } else {
        query = query.or('game_state->version.is.null,game_state->version.eq.0')
      }

      const { data: updatedData, error: saveError } = await query.select()

      if (saveError) {
        return new Response(JSON.stringify({ error: saveError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (updatedData && updatedData.length > 0) {
        success = true
        responseToReturn = new Response(JSON.stringify({ success: true, game_state: gameState }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        console.warn(`Optimistic lock failure in referee for room ${roomId}, attempt ${attempts}. Retrying...`)
        // Delay slightly before retrying
        await new Promise(resolve => setTimeout(resolve, 50 * attempts))
      }
    }

    if (!success) {
      return new Response(JSON.stringify({ error: 'Conflict: Match state was updated by another player. Please retry.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return responseToReturn

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Fisher-Yates Shuffling and Deck Split helper
function generateUniqueDecks(pool: any[], legendRatio: number) {
  if (!pool || !Array.isArray(pool) || pool.length === 0) {
    return { playerDeck: [], aiDeck: [] }
  }

  // Deduplicate pool by name to prevent player duplicates across the game
  const seenNames = new Set<string>()
  const allCards: any[] = []
  pool.forEach((card) => {
    if (card && card.name) {
      const normalizedName = card.name.trim().toLowerCase()
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName)
        allCards.push(card)
      }
    }
  })

  // 1. Filter warmup pool (non-legendary player cards)
  let warmupPool = []
  try {
    warmupPool = allCards.filter(card => card && card.rarity !== 'legendary' && !card.isLegend && !card.is_legend && card.type === 'player')
  } catch (e) {
    console.error("Warmup pool filtering failed in referee:", e)
  }

  if (!warmupPool || warmupPool.length === 0) {
    warmupPool = allCards.filter(card => card && card.type === 'player')
  }
  if (!warmupPool || warmupPool.length === 0) {
    warmupPool = allCards.filter(Boolean)
  }

  // Shuffle warmup pool
  const shuffledWarmup = [...warmupPool].sort(() => Math.random() - 0.5)

  // Extract warmup cards safely
  const hostWarmup: any[] = []
  const oppWarmup: any[] = []
  
  const targetWarmupCount = Math.min(5, Math.floor(shuffledWarmup.length / 2))
  for (let i = 0; i < targetWarmupCount; i++) {
    if (shuffledWarmup.length > 0) {
      const c = shuffledWarmup.pop()
      if (c) hostWarmup.push(c)
    }
    if (shuffledWarmup.length > 0) {
      const c = shuffledWarmup.pop()
      if (c) oppWarmup.push(c)
    }
  }

  // Remaining pool of cards
  const selectedWarmupIds = new Set<string>()
  hostWarmup.forEach(c => { if (c) selectedWarmupIds.add(c.id) })
  oppWarmup.forEach(c => { if (c) selectedWarmupIds.add(c.id) })

  const mainPool = allCards.filter(card => card && !selectedWarmupIds.has(card.id))

  // Split the main pool using the legend ratio
  const legendCards = mainPool.filter(c => c.isLegend || c.is_legend || c.rarity === 'legendary').sort(() => Math.random() - 0.5)
  const normalCards = mainPool.filter(c => !c.isLegend && !c.is_legend && c.rarity !== 'legendary').sort(() => Math.random() - 0.5)

  const targetSizePerDeck = Math.max(15, Math.floor(mainPool.length / 2))
  const numLegendsPerDeck = Math.min(
    Math.floor(legendCards.length / 2),
    Math.max(0, Math.round((legendRatio / 100) * targetSizePerDeck))
  )
  const numNormalsPerDeck = Math.max(0, targetSizePerDeck - numLegendsPerDeck)

  const hostMain: any[] = []
  const oppMain: any[] = []

  // Assign legends alternately
  const legendPool = [...legendCards]
  for (let i = 0; i < legendPool.length; i++) {
    const card = legendPool[i]
    if (hostMain.filter(c => c.isLegend || c.is_legend || c.rarity === 'legendary').length < numLegendsPerDeck) {
      hostMain.push(card)
    } else if (oppMain.filter(c => c.isLegend || c.is_legend || c.rarity === 'legendary').length < numLegendsPerDeck) {
      oppMain.push(card)
    }
  }

  // Fill remaining legend slots
  let legendRemainder = legendPool.slice(numLegendsPerDeck * 2)
  legendRemainder.forEach((card, i) => {
    if (i % 2 === 0 && hostMain.filter(c => c.isLegend || c.is_legend || c.rarity === 'legendary').length < numLegendsPerDeck + 2) {
      hostMain.push(card)
    } else if (oppMain.filter(c => c.isLegend || c.is_legend || c.rarity === 'legendary').length < numLegendsPerDeck + 2) {
      oppMain.push(card)
    }
  })

  // Assign normals
  const normalPool = [...normalCards]
  const halfNormals = Math.floor(normalPool.length / 2)
  for (let i = 0; i < normalPool.length; i++) {
    const card = normalPool[i]
    if (i < halfNormals && hostMain.filter(c => !c.isLegend && !c.is_legend && c.rarity !== 'legendary').length < numNormalsPerDeck) {
      hostMain.push(card)
    } else if (i >= halfNormals && oppMain.filter(c => !c.isLegend && !c.is_legend && c.rarity !== 'legendary').length < numNormalsPerDeck) {
      oppMain.push(card)
    } else {
      if (hostMain.filter(c => !c.isLegend && !c.is_legend && c.rarity !== 'legendary').length <= oppMain.filter(c => !c.isLegend && !c.is_legend && c.rarity !== 'legendary').length) {
        hostMain.push(card)
      } else {
        oppMain.push(card)
      }
    }
  }

  const hostShuffledMain = hostMain.filter(Boolean).sort(() => Math.random() - 0.5)
  const oppShuffledMain = oppMain.filter(Boolean).sort(() => Math.random() - 0.5)

  const finalHostDeck = [...hostWarmup.filter(Boolean), ...hostShuffledMain]
  const finalOppDeck = [...oppWarmup.filter(Boolean), ...oppShuffledMain]

  return {
    playerDeck: finalHostDeck.map((c, idx) => ({ ...c, id: `p_c_${idx}_${Math.random().toString(36).substr(2, 6)}` })),
    aiDeck: finalOppDeck.map((c, idx) => ({ ...c, id: `o_c_${idx}_${Math.random().toString(36).substr(2, 6)}` }))
  }
}
