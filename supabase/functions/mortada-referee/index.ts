import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
        fetchedPlayers = (data || []).map((row: any) => row.cards).filter(Boolean)
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
        fetchedSpecials = (data || []).map((row: any) => row.special_cards).filter(Boolean)
      }
      if (fetchedSpecials.length === 0) {
        const { data } = await supabaseClient.from('special_cards').select('*').limit(50)
        fetchedSpecials = data || []
      }

      // Format cards into game-ready schemas with ability parsing
      const parseAbility = (c: any) => {
        let ability = undefined
        let description = c.description || ''
        try {
          if (c.description && c.description.trim().startsWith('{')) {
            const parsed = JSON.parse(c.description)
            description = parsed.text || ''
            ability = parsed.ability || undefined
          }
        } catch { /* ignored */ }
        return { ...c, description, ability }
      }

      const playerPool = fetchedPlayers.map(parseAbility)
      const specialPool = fetchedSpecials.map(parseAbility)

      // 3. Shuffling and deck splitting
      const { playerDeck: hostDeck, aiDeck: oppDeck } = generateUniqueDecks(playerPool, legendRatio)
      
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
        host_slots: Array(5).fill(null).map(() => ({ card: null, isRevealed: false })),
        opponent_slots: Array(5).fill(null).map(() => ({ card: null, isRevealed: false })),
        host_hand: [],
        opponent_hand: [],
        host_score: 0,
        opponent_score: 0,
        host_moves: rs.maxMovesPerTurn ?? 3,
        opponent_moves: rs.maxMovesPerTurn ?? 3,
        host_player_deck: hostDeck,
        opponent_player_deck: oppDeck,
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
        last_updated_by: 'host',
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
        gameState.host_player_deck = deck
      } else {
        updates.opponent_confirmed = true
        gameState.opponent_slots = slots.map((s: any) => ({ ...s, isRevealed: false }))
        gameState.opponent_player_deck = deck
      }

      // Check if both confirmed
      const bothConfirmed = (isHost ? room.opponent_confirmed : room.host_confirmed) || false
      if (bothConfirmed || updates.host_confirmed && updates.opponent_confirmed) {
        const hostStarts = gameState.first_half_kickoff_role === 'player'
        const startRole = hostStarts ? 'host' : 'opponent'
        
        gameState.phase = 'player_turn' // In multiplayer context, both sides see themselves relative to turn
        gameState.attacker_role = startRole
        gameState.current_turn = startRole
        gameState.start_time = Date.now() // Master game timer timestamp

        gameState.host_moves = hostStarts ? (gameState.room_settings.maxMovesPerTurn ?? 3) : 0
        gameState.opponent_moves = hostStarts ? 0 : (gameState.room_settings.maxMovesPerTurn ?? 3)

        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          text: `تم تأكيد خطة الفريقين! ركلة البداية مع ${hostStarts ? room.host_name : (room.opponent_name || 'الخصم')}! ⚽🏁`,
          type: 'success',
        })

        updates.status = 'playing'
        updates.current_turn = startRole
      }

      gameState.last_updated_by = role
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
      } 
      else if (actionType === 'confirm_defense') {
        // Defender confirms defence, calculate combat resolution
        const defenderRole = role
        const attackerRole = defenderRole === 'host' ? 'opponent' : 'host'
        
        const hostSlots = defenderRole === 'host' ? details.defenders : gameState.host_slots
        const opponentSlots = defenderRole === 'opponent' ? details.defenders : gameState.opponent_slots
        
        const hostSpecials = defenderRole === 'host' ? details.specials : (gameState.active_specials_host || [])
        const opponentSpecials = defenderRole === 'opponent' ? details.specials : (gameState.active_specials_opponent || [])

        // Run Rules Engine
        const isHostAttacker = gameState.attacker_role === 'host'
        
        const attackPower = runRefereeRulesEngine(
          isHostAttacker, // isPlayerSide = true if we calculate for host
          true, // isAttackingStage = true
          gameState.current_attacker_idx,
          gameState.current_booster,
          hostSpecials,
          opponentSpecials,
          hostSlots,
          opponentSlots,
          isHostAttacker // isPlayerAttacker = true if host is attacker
        )

        const defensePower = runRefereeRulesEngine(
          !isHostAttacker, // isPlayerSide = true if we calculate defense for host (which is opposite of attacker)
          false, // isAttackingStage = false
          null,
          null,
          hostSpecials,
          opponentSpecials,
          hostSlots,
          opponentSlots,
          isHostAttacker
        )

        const isGoal = attackPower > defensePower
        let attackerName = isHostAttacker ? room.host_name : (room.opponent_name || 'الخصم')
        let defenderName = isHostAttacker ? (room.opponent_name || 'الخصم') : room.host_name
        
        if (isGoal) {
          if (isHostAttacker) {
            gameState.host_score += 1
          } else {
            gameState.opponent_score += 1
          }
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text: `⚽ جـوووول! تسديدة ${attackerName} المتقنة (${attackPower}) تتغلب على الدفاع المستميت لـ ${defenderName} (${defensePower})!`,
            type: 'success',
          })
        } else {
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text: `🧤 إنقاذ بطولي! جدار صد دفاع ${defenderName} (${defensePower}) يقطع محاولة تسديد ${attackerName} (${attackPower})!`,
            type: 'neutral',
          })
        }

        // Apply spent statuses
        const applySpent = (slots: any[]) => slots.map((s: any) => {
          if (s && s.revealedInAttack) {
            return { ...s, spent: true, revealedInAttack: false, confirmedInAttack: false }
          }
          return s
        })

        gameState.host_slots = applySpent(hostSlots)
        gameState.opponent_slots = applySpent(opponentSlots)
        gameState.is_shot_declared = false
        gameState.phase = 'resolution'
        
        // Remove temporary active specials that expire
        const filterSpecials = (specials: any[]) => specials.filter((s: any) => {
          const mainAction = s.ability?.actions?.[0]
          return mainAction && mainAction.duration !== 'Instant' && mainAction.duration !== 'CurrentPhase'
        })
        gameState.active_specials_host = filterSpecials(hostSpecials)
        gameState.active_specials_opponent = filterSpecials(opponentSpecials)
      }

      gameState.last_updated_by = role
      updates.game_state = gameState
    }

    // ==========================================
    // ACTION: end_turn
    // ==========================================
    else if (action === 'end_turn') {
      const isHost = role === 'host'
      const nextTurn = isHost ? 'opponent' : 'host'
      const maxMoves = gameState.room_settings.maxMovesPerTurn ?? 3

      gameState.phase = 'player_turn'
      gameState.current_turn = nextTurn
      gameState.attacker_role = nextTurn

      if (nextTurn === 'host') {
        gameState.host_moves = maxMoves
        gameState.opponent_moves = 0
      } else {
        gameState.host_moves = 0
        gameState.opponent_moves = maxMoves
      }

      gameState.logs.push({
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        text: `⏳ انتهى دور ${isHost ? room.host_name : (room.opponent_name || 'الخصم')}! الدور الآن للطرف الآخر لشن الخطط!`,
        type: 'info',
      })

      updates.current_turn = nextTurn
      gameState.last_updated_by = role
      updates.game_state = gameState
    }

    // Save state back to DB
    const { error: saveError } = await supabaseClient
      .from('rooms')
      .update({
        ...updates,
        last_activity: Date.now()
      })
      .eq('id', roomId)

    if (saveError) {
      return new Response(JSON.stringify({ error: saveError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, game_state: gameState }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Fisher-Yates Shuffling and Deck Split helper
function generateUniqueDecks(pool: any[], legendRatio: number) {
  const seenNames = new Set<string>()
  const uniquePool: any[] = []
  pool.forEach((card) => {
    if (card && card.name) {
      const normalizedName = card.name.trim().toLowerCase()
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName)
        uniquePool.push(card)
      }
    }
  })

  const legendCards = uniquePool.filter(c => c.is_legend).sort(() => Math.random() - 0.5)
  const normalCards = uniquePool.filter(c => !c.is_legend).sort(() => Math.random() - 0.5)

  const targetSizePerDeck = Math.max(15, Math.floor(uniquePool.length / 2))
  const numLegendsPerDeck = Math.round((legendRatio / 100) * targetSizePerDeck)

  const playerSelected: any[] = []
  const aiSelected: any[] = []

  // Assign legends
  for (let i = 0; i < numLegendsPerDeck; i++) {
    if (legendCards.length > 0) playerSelected.push(legendCards.pop())
    if (legendCards.length > 0) aiSelected.push(legendCards.pop())
  }

  // Assign normals
  const remainingTarget = targetSizePerDeck - playerSelected.length
  for (let i = 0; i < remainingTarget; i++) {
    if (normalCards.length > 0) playerSelected.push(normalCards.pop())
    if (normalCards.length > 0) aiSelected.push(normalCards.pop())
  }

  const remainder = [...legendCards, ...normalCards].sort(() => Math.random() - 0.5)
  for (let i = 0; i < remainder.length; i++) {
    const card = remainder[i]
    if (playerSelected.length <= aiSelected.length) {
      playerSelected.push(card)
    } else {
      aiSelected.push(card)
    }
  }

  return {
    playerDeck: playerSelected.map((c, idx) => ({ ...c, id: `p_c_${idx}_${Math.random().toString(36).substr(2, 6)}` })),
    aiDeck: aiSelected.map((c, idx) => ({ ...c, id: `o_c_${idx}_${Math.random().toString(36).substr(2, 6)}` }))
  }
}

// Rules Engine inside the Edge Function
function runRefereeRulesEngine(
  isPlayerSide: boolean,
  isAttackingStage: boolean,
  attackerIdx: number | null,
  activeBooster: any | null,
  playerActiveSpecials: any[],
  aiActiveSpecials: any[],
  playerSlots: any[],
  aiSlots: any[],
  isPlayerAttacker: boolean
): number {
  let score = 0
  const slots = isPlayerSide ? playerSlots : aiSlots

  if (isAttackingStage) {
    slots.forEach((slot) => {
      if (slot && slot.card && slot.isRevealed && slot.revealedInAttack) {
        if (slot.card.frozen || slot.card.stunned || slot.card.silenced) return
        score += slot.card.attack ?? 0
      }
    })
    if (activeBooster && isPlayerSide === isPlayerAttacker) {
      score += activeBooster.value ?? 0
    }
  } else {
    slots.forEach((slot) => {
      if (slot && slot.card && slot.isRevealed && slot.revealedInAttack) {
        if (slot.card.frozen || slot.card.stunned || slot.card.silenced) return
        score += slot.card.defense ?? 0
      }
    })
  }

  const activeSources: { card: any; isPlayerOwned: boolean }[] = []
  playerSlots.forEach((slot) => {
    if (slot && slot.card && slot.isRevealed) {
      activeSources.push({ card: slot.card, isPlayerOwned: true })
    }
  })
  aiSlots.forEach((slot) => {
    if (slot && slot.card && slot.isRevealed) {
      activeSources.push({ card: slot.card, isPlayerOwned: false })
    }
  })
  playerActiveSpecials.forEach((spec) => {
    if (spec) activeSources.push({ card: spec, isPlayerOwned: true })
  })
  aiActiveSpecials.forEach((spec) => {
    if (spec) activeSources.push({ card: spec, isPlayerOwned: false })
  })

  let attackModifiers = 0
  let defenseModifiers = 0
  let attackMultiplier = 1
  let defenseMultiplier = 1
  let cancelStrongestAttacker = false

  activeSources.forEach((src) => {
    const { card, isPlayerOwned } = src
    if (!card) return

    if (card.ability) {
      const opponentActiveSpecials = isPlayerOwned ? aiActiveSpecials : playerActiveSpecials
      const opponentSlots = isPlayerOwned ? aiSlots : playerSlots
      
      const isAbilityBlocked = opponentActiveSpecials.some(c => c && c.ability?.actions?.some((a: any) => a.type === 'BlockAbility')) ||
                                opponentSlots.some(s => s && s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions?.some((a: any) => a.type === 'BlockAbility'))

      const isSilenced = card.silenced || card.abilityBlocked || isAbilityBlocked
      if (isSilenced) return

      const ability = card.ability
      const triggerMatches = 
        ((ability.trigger === 'CardRevealed' || ability.trigger === 'CardPlayed') && card.type === 'player') ||
        (ability.trigger === 'CardPlayed' && card.type === 'special') ||
        (ability.trigger === 'AttackStarted' && isAttackingStage) ||
        (ability.trigger === 'DefenseStarted' && !isAttackingStage)

      if (triggerMatches) {
        let conditionsMet = true
        if (ability.conditions) {
          ability.conditions.forEach((cond: any) => {
            if (cond.type === 'IsAttacker') {
              const isOwnerAttacking = isPlayerOwned === isPlayerAttacker
              if (!isOwnerAttacking) conditionsMet = false
            }
            if (cond.type === 'IsDefender') {
              const isOwnerDefending = isPlayerOwned !== isPlayerAttacker
              if (!isOwnerDefending) conditionsMet = false
            }
            if (cond.type === 'CardOwnerIsEnemy') {
              if (isPlayerOwned === isPlayerSide) conditionsMet = false
            }
            if (cond.type === 'IsLegend') {
              if (card.type === 'player' && !card.isLegend) conditionsMet = false
            }
          })
        }

        if (conditionsMet && ability.actions) {
          ability.actions.forEach((act: any) => {
            const isTargetSide = (act.target === 'Allies' && isPlayerOwned === isPlayerSide) ||
                                 (act.target === 'Enemies' && isPlayerOwned !== isPlayerSide) ||
                                 (act.target === 'CurrentAttack' && isAttackingStage) ||
                                 (act.target === 'CurrentDefense' && !isAttackingStage) ||
                                 (act.target === 'Self' && card === src.card && isPlayerOwned === isPlayerSide)

            if (isTargetSide) {
              if (act.type === 'AddStat') {
                if (act.stat === 'attack' && isAttackingStage) attackModifiers += act.value ?? 0
                if (act.stat === 'defense' && !isAttackingStage) defenseModifiers += act.value ?? 0
              } else if (act.type === 'RemoveStat') {
                if (act.stat === 'attack' && isAttackingStage) attackModifiers -= act.value ?? 0
                if (act.stat === 'defense' && !isAttackingStage) defenseModifiers -= act.value ?? 0
              } else if (act.type === 'MultiplyStat') {
                if (act.stat === 'attack' && isAttackingStage) attackMultiplier *= act.value ?? 1
                if (act.stat === 'defense' && !isAttackingStage) defenseMultiplier *= act.value ?? 1
              } else if (act.type === 'CancelAction' && isAttackingStage) {
                cancelStrongestAttacker = true
              }
            }
          })
        }
      }
    } else if (card.type === 'special') {
      const spec = card
      if (isAttackingStage) {
        if (isPlayerOwned === isPlayerAttacker) {
          if (spec.effect === 'counter_attack' && isPlayerSide === isPlayerAttacker) attackModifiers += 4
          if (spec.effect === 'fans' && isPlayerSide === isPlayerAttacker) attackModifiers += 3
        } else {
          if (spec.effect === 'wet_pitch' && isPlayerSide === isPlayerAttacker) attackModifiers -= 4
          if (spec.effect === 'offside' && isPlayerSide === isPlayerAttacker) cancelStrongestAttacker = true
        }
      } else {
        if (isPlayerOwned !== isPlayerAttacker) {
          if (spec.effect === 'park_the_bus' && isPlayerSide !== isPlayerAttacker) defenseModifiers += 6
          if (spec.effect === 'fans' && isPlayerSide !== isPlayerAttacker) defenseModifiers += 3
        }
      }
    }
  })

  if (isAttackingStage) {
    let finalAttack = (score * attackMultiplier) + attackModifiers
    if (cancelStrongestAttacker) {
      let maxAttStrength = 0
      slots.forEach((s) => {
        if (s && s.card && s.isRevealed && s.revealedInAttack) {
          maxAttStrength = Math.max(maxAttStrength, s.card.attack ?? 0)
        }
      })
      finalAttack -= maxAttStrength
    }
    return Math.max(0, finalAttack)
  } else {
    return Math.max(0, (score * defenseMultiplier) + defenseModifiers)
  }
}
