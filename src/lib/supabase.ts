/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generateUniquePlayerDecks, generateSpecialDeck, generateBoosterDeck } from "../cardsData";
import { runRefereeRulesEngine, getDetailedCalculation, executeCardInstantEffects, recycleCard } from "../utils/rulesEngine";
import { goalTitles, goalDescriptions, defenseTitles, defenseDescriptions, stadiumPhrases } from "../utils/commentaryPhrases";

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

// Retrieve potential environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}

export const supabase = supabaseInstance;

// Type definition for game room in Supabase
export interface MatchRoom {
  id: string; // 6-character code e.g. "A8X9F2"
  created_at: string;
  host_id: string;
  host_name: string;
  host_vibe: string;
  opponent_id: string | null;
  opponent_name: string | null;
  opponent_vibe: string | null;
  status: "waiting" | "playing" | "finished";
  current_turn: "host" | "opponent";
  current_turn_auth_id?: string | null;
  game_state: any; // Entire serialized Tactical Card State
  last_activity: number;
  host_confirmed?: boolean;
  opponent_confirmed?: boolean;
  room_name?: string;
  is_private?: boolean;
}

// Generate easy-to-read, 6-character unique uppercase room code
export function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 characters, excluding confusing ones like O, 0, I, 1
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// User Profile interface
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

// Global broadcast channel for simulating real-time if Supabase isn't configured
const localChannelName = "tactical_football_booster_broadcast";
let localBroadcast: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined") {
    localBroadcast = new BroadcastChannel(localChannelName);
  }
} catch (e) {
  console.warn("BroadcastChannel is not supported in this frame context.", e);
}

// In-memory or localStorage fallback storage
const getFallbackRooms = (): MatchRoom[] => {
  try {
    const raw = localStorage.getItem("tactical_football_rooms");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveFallbackRooms = (rooms: MatchRoom[]) => {
  try {
    localStorage.setItem("tactical_football_rooms", JSON.stringify(rooms));
  } catch {}
};

const isSpecialCardsBlocked = (role: "host" | "opponent", gs: any) => {
  const isHost = role === "host";
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

const isValidTargetForCard = (role: "host" | "opponent", card: any, targetSlotIdx: number, isEnemySide: boolean, gs: any) => {
  const slots = isEnemySide
    ? (role === "host" ? (gs.opponent_slots || []) : (gs.host_slots || []))
    : (role === "host" ? (gs.host_slots || []) : (gs.opponent_slots || []));
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



// MULTIPLAYER ROOM OPERATIONS
export const supabaseService = {
  // Authentication Mock & Real wrappers
  async signUp(
    email: string, 
    pass: string, 
    username: string,
    fullName?: string,
    age?: number,
    gender?: "male" | "female",
    termsAccepted?: boolean
  ): Promise<{ user: any; error: string | null }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { 
            username,
            full_name: fullName,
            age,
            gender,
            terms_accepted: termsAccepted
          }
        }
      });
      if (error) return { user: null, error: error.message };

      if (data.user) {
        try {
          // Attempt to insert profile in profiles table
          await supabase.from("profiles").insert([
            {
              id: data.user.id,
              full_name: fullName || username,
              age: age || 18,
              gender: gender || "male",
              terms_accepted: !!termsAccepted
            }
          ]);
        } catch (err) {
          console.error("Failed to insert profiles record, schema may need SQL setting up", err);
        }
      }

      return { user: data.user, error: null };
    } else {
      // Local fallbacks
      const mockUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: { 
          username,
          full_name: fullName,
          age,
          gender,
          terms_accepted: termsAccepted
        }
      };
      localStorage.setItem("mock_supabase_user", JSON.stringify(mockUser));
      return { user: mockUser, error: null };
    }
  },

  async signIn(email: string, pass: string): Promise<{ user: any; error: string | null }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });
      if (error) return { user: null, error: error.message };
      return { user: data.user, error: null };
    } else {
      // Local mock login lookup
      const stored = localStorage.getItem("mock_supabase_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email === email) {
          return { user: parsed, error: null };
        }
      }
      // Create user on the fly to keep testing seamless
      const newUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: { username: email.split("@")[0] }
      };
      localStorage.setItem("mock_supabase_user", JSON.stringify(newUser));
      return { user: newUser, error: null };
    }
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem("mock_supabase_user");
    }
  },

  async getCurrentUser(): Promise<any> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } else {
      const stored = localStorage.getItem("mock_supabase_user");
      return stored ? JSON.parse(stored) : null;
    }
  },

  onAuthStateChange(callback: (user: any) => void) {
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user || null);
      });
      return () => subscription.unsubscribe();
    } else {
      // Periodic check or event listener
      const handler = () => {
        const stored = localStorage.getItem("mock_supabase_user");
        callback(stored ? JSON.parse(stored) : null);
      };
      window.addEventListener("storage", handler);
      // Call once initially
      handler();
      return () => window.removeEventListener("storage", handler);
    }
  },

  // DATABASE & MATCHROOMS LOGIC
  async createRoom(
    hostId: string, 
    hostName: string, 
    hostVibe: string, 
    roomName: string = "غرفة مرتدة", 
    isPrivate: boolean = false, 
    settings: any = null
  ): Promise<MatchRoom> {
    let roomId = generateRoomId();

    if (isSupabaseConfigured && supabase) {
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 5) {
        try {
          const { data } = await supabase
            .from("rooms")
            .select("id")
            .eq("id", roomId)
            .maybeSingle();
          if (!data) {
            isUnique = true;
          } else {
            roomId = generateRoomId();
            attempts++;
          }
        } catch {
          // If query fails, proceed anyway
          isUnique = true;
        }
      }

      const newRoom: MatchRoom = {
        id: roomId,
        created_at: new Date().toISOString(),
        host_id: hostId,
        host_name: hostName,
        host_vibe: hostVibe,
        opponent_id: null,
        opponent_name: null,
        opponent_vibe: null,
        status: "waiting",
        current_turn: "host",
        game_state: settings ? { room_settings: settings } : null,
        last_activity: Date.now(),
        room_name: roomName,
        is_private: isPrivate
      };

      const { error } = await supabase
        .from("rooms")
        .insert([newRoom]);

      if (error) {
        console.error("Error creating room in Supabase:", error);
        throw new Error(`فشل إنشاء الغرفة سحابياً: ${error.message}`);
      }

      return newRoom;
    }

    // Offline fallback (ONLY if not configured)
    const newRoom: MatchRoom = {
      id: roomId,
      created_at: new Date().toISOString(),
      host_id: hostId,
      host_name: hostName,
      host_vibe: hostVibe,
      opponent_id: null,
      opponent_name: null,
      opponent_vibe: null,
      status: "waiting",
      current_turn: "host",
      game_state: settings ? { room_settings: settings } : null,
      last_activity: Date.now(),
      room_name: roomName,
      is_private: isPrivate
    };

    const rooms = getFallbackRooms();
    rooms.push(newRoom);
    saveFallbackRooms(rooms);

    // Notify local fallback channels if any
    if (localBroadcast) {
      localBroadcast.postMessage({ type: "room_created", room: newRoom });
    }

    return newRoom;
  },

  async joinRoom(roomId: string, opponentId: string, opponentName: string, opponentVibe: string): Promise<{ room: MatchRoom | null; error: string | null }> {
    if (isSupabaseConfigured && supabase) {
      // First, get the room state
      const { data: room, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error || !room) {
        return { room: null, error: "الغرفة غير موجودة. يرجى مراجعة الرمز المحمول 🔍" };
      }

      if (room.status !== "waiting" || room.opponent_id) {
        return { room: null, error: "هذه الغرفة ممتلئة بالفعل أو بدأت المباراة ⚔️" };
      }

      const updatedRoom: Partial<MatchRoom> = {
        opponent_id: opponentId,
        opponent_name: opponentName,
        opponent_vibe: opponentVibe,
        status: "playing",
        last_activity: Date.now()
      };

      const { data: joinedRoom, error: updateError } = await supabase
        .from("rooms")
        .update(updatedRoom)
        .eq("id", roomId)
        .select()
        .single();

      if (updateError || !joinedRoom) {
        return { room: null, error: `فشل الانضمام للغرفة: ${updateError?.message || "خطأ غير معروف"}` };
      }

      return { room: joinedRoom as MatchRoom, error: null };
    } else {
      // Mock lookup
      const rooms = getFallbackRooms();
      const idx = rooms.findIndex((r) => r.id === roomId);
      if (idx === -1) {
        return { room: null, error: "الغرفة غير موجودة تفقد الكود الخاص بك!" };
      }
      if (rooms[idx].status !== "waiting") {
        return { room: null, error: "هذه غرفة نشطة بالفعل ولا غرف انتظار!" };
      }

      rooms[idx].opponent_id = opponentId;
      rooms[idx].opponent_name = opponentName;
      rooms[idx].opponent_vibe = opponentVibe;
      rooms[idx].status = "playing";
      rooms[idx].last_activity = Date.now();

      saveFallbackRooms(rooms);

      if (localBroadcast) {
        localBroadcast.postMessage({ type: "room_joined", room: rooms[idx] });
      }

      return { room: rooms[idx], error: null };
    }
  },

  async updateRoomState(roomId: string, updates: Partial<MatchRoom>): Promise<void> {
    let finalUpdates = { ...updates };

    const mergeLogs = (currentLogs: any[], newLogs: any[]) => {
      const combined = [...(currentLogs || []), ...(newLogs || [])];
      const unique: any[] = [];
      const seen = new Set();
      for (const log of combined) {
        if (log && log.id && !seen.has(log.id)) {
          seen.add(log.id);
          unique.push(log);
        }
      }
      return unique;
    };

    if (isSupabaseConfigured && supabase) {
      if (!updates.game_state) {
        // Direct update for non-game_state updates
        await supabase
          .from("rooms")
          .update({
            ...finalUpdates,
            last_activity: Date.now()
          })
          .eq("id", roomId);
      } else {
        const maxAttempts = 5;
        let attempts = 0;
        let success = false;

        while (attempts < maxAttempts && !success) {
          attempts++;
          try {
            const { data: currentRoom, error: fetchError } = await supabase
              .from("rooms")
              .select("game_state")
              .eq("id", roomId)
              .single();

            if (fetchError || !currentRoom) {
              console.error("Error fetching room in updateRoomState:", fetchError);
              break;
            }

            const currentGS = currentRoom.game_state || {};
            const newGS = updates.game_state;
            const updater = newGS.last_updated_by;
            const mergedGS = { ...newGS };
            const originalVersion = currentGS.version || 0;

            // Preserve room settings if they exist in DB game_state but aren't being updated
            if (currentGS.room_settings !== undefined && mergedGS.room_settings === undefined) {
              mergedGS.room_settings = currentGS.room_settings;
            }

            if (updater === "host") {
              if (currentGS.opponent_slots !== undefined) mergedGS.opponent_slots = currentGS.opponent_slots;
              if (currentGS.opponent_hand !== undefined) mergedGS.opponent_hand = currentGS.opponent_hand;
              if (currentGS.active_specials_opponent !== undefined) mergedGS.active_specials_opponent = currentGS.active_specials_opponent;
              if (currentGS.opponent_player_deck !== undefined) mergedGS.opponent_player_deck = currentGS.opponent_player_deck;
              if (currentGS.opponent_moves !== undefined) mergedGS.opponent_moves = currentGS.opponent_moves;
              if (currentGS.phase === "attacking" && currentGS.defense_moves_left !== undefined) {
                mergedGS.defense_moves_left = currentGS.defense_moves_left;
              }
            } else if (updater === "opponent") {
              if (currentGS.host_slots !== undefined) mergedGS.host_slots = currentGS.host_slots;
              if (currentGS.host_hand !== undefined) mergedGS.host_hand = currentGS.host_hand;
              if (currentGS.active_specials_host !== undefined) mergedGS.active_specials_host = currentGS.active_specials_host;
              if (currentGS.host_player_deck !== undefined) mergedGS.host_player_deck = currentGS.host_player_deck;
              if (currentGS.host_moves !== undefined) mergedGS.host_moves = currentGS.host_moves;
              if (currentGS.phase === "ai_attacking" && currentGS.defense_moves_left !== undefined) {
                mergedGS.defense_moves_left = currentGS.defense_moves_left;
              }
              // Preserve host authoritative timer variables
              if (currentGS.match_time !== undefined) mergedGS.match_time = currentGS.match_time;
              if (currentGS.initial_match_time !== undefined) mergedGS.initial_match_time = currentGS.initial_match_time;
              if (currentGS.is_half_time_break !== undefined) mergedGS.is_half_time_break = currentGS.is_half_time_break;
              if (currentGS.half_time_break_left !== undefined) mergedGS.half_time_break_left = currentGS.half_time_break_left;
              if (currentGS.match_half !== undefined) mergedGS.match_half = currentGS.match_half;
            }

            // Intelligent merging of logs and decks
            mergedGS.logs = mergeLogs(currentGS.logs || [], newGS.logs || []);

            if (currentGS.shared_player_deck && newGS.shared_player_deck) {
              if (currentGS.shared_player_deck.length < newGS.shared_player_deck.length) {
                mergedGS.shared_player_deck = currentGS.shared_player_deck;
              }
            }
            if (currentGS.special_deck && newGS.special_deck) {
              if (currentGS.special_deck.length < newGS.special_deck.length) {
                mergedGS.special_deck = currentGS.special_deck;
              }
            }
            if (currentGS.booster_deck && newGS.booster_deck) {
              if (currentGS.booster_deck.length < newGS.booster_deck.length) {
                mergedGS.booster_deck = currentGS.booster_deck;
              }
            }

            mergedGS.version = originalVersion + 1;
            finalUpdates.game_state = mergedGS;

            let query = supabase
              .from("rooms")
              .update({
                ...finalUpdates,
                last_activity: Date.now()
              })
              .eq("id", roomId);

            if (originalVersion > 0) {
              query = query.eq("game_state->version", originalVersion);
            } else {
              query = query.or("game_state->version.is.null,game_state->version.eq.0");
            }

            const { data: updatedData, error: updateError } = await query.select();

            if (updateError) {
              console.error("Error writing room state in updateRoomState:", updateError);
              break;
            }

            if (updatedData && updatedData.length > 0) {
              success = true;
            } else {
              console.warn(`Optimistic lock failure in client updateRoomState for room ${roomId}, attempt ${attempts}. Retrying...`);
              await new Promise((resolve) => setTimeout(resolve, 50 * attempts));
            }
          } catch (err) {
            console.error("Error in updateRoomState retry loop:", err);
            break;
          }
        }
      }
    }

    // Local update
    const rooms = getFallbackRooms();
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx !== -1) {
      let mergedGameState = updates.game_state;
      if (updates.game_state && rooms[idx].game_state) {
        const currentGS = rooms[idx].game_state;
        const newGS = updates.game_state;
        const updater = newGS.last_updated_by;
        mergedGameState = { ...newGS };

        if (currentGS.room_settings !== undefined && mergedGameState.room_settings === undefined) {
          mergedGameState.room_settings = currentGS.room_settings;
        }

        if (updater === "host") {
          if (currentGS.opponent_slots !== undefined) mergedGameState.opponent_slots = currentGS.opponent_slots;
          if (currentGS.opponent_hand !== undefined) mergedGameState.opponent_hand = currentGS.opponent_hand;
          if (currentGS.active_specials_opponent !== undefined) mergedGameState.active_specials_opponent = currentGS.active_specials_opponent;
          if (currentGS.opponent_player_deck !== undefined) mergedGameState.opponent_player_deck = currentGS.opponent_player_deck;
          if (currentGS.opponent_moves !== undefined) mergedGameState.opponent_moves = currentGS.opponent_moves;
          if (currentGS.phase === "attacking" && currentGS.defense_moves_left !== undefined) {
            mergedGameState.defense_moves_left = currentGS.defense_moves_left;
          }
        } else if (updater === "opponent") {
          if (currentGS.host_slots !== undefined) mergedGameState.host_slots = currentGS.host_slots;
          if (currentGS.host_hand !== undefined) mergedGameState.host_hand = currentGS.host_hand;
          if (currentGS.active_specials_host !== undefined) mergedGameState.active_specials_host = currentGS.active_specials_host;
          if (currentGS.host_player_deck !== undefined) mergedGameState.host_player_deck = currentGS.host_player_deck;
          if (currentGS.host_moves !== undefined) mergedGameState.host_moves = currentGS.host_moves;
          if (currentGS.phase === "ai_attacking" && currentGS.defense_moves_left !== undefined) {
            mergedGameState.defense_moves_left = currentGS.defense_moves_left;
          }
          // Preserve host authoritative timer variables
          if (currentGS.match_time !== undefined) mergedGameState.match_time = currentGS.match_time;
          if (currentGS.initial_match_time !== undefined) mergedGameState.initial_match_time = currentGS.initial_match_time;
          if (currentGS.is_half_time_break !== undefined) mergedGameState.is_half_time_break = currentGS.is_half_time_break;
          if (currentGS.half_time_break_left !== undefined) mergedGameState.half_time_break_left = currentGS.half_time_break_left;
          if (currentGS.match_half !== undefined) mergedGameState.match_half = currentGS.match_half;
        }

        // Intelligent merging of logs and decks
        mergedGameState.logs = mergeLogs(currentGS.logs || [], newGS.logs || []);

        if (currentGS.shared_player_deck && newGS.shared_player_deck) {
          if (currentGS.shared_player_deck.length < newGS.shared_player_deck.length) {
            mergedGameState.shared_player_deck = currentGS.shared_player_deck;
          }
        }
        if (currentGS.special_deck && newGS.special_deck) {
          if (currentGS.special_deck.length < newGS.special_deck.length) {
            mergedGameState.special_deck = currentGS.special_deck;
          }
        }
        if (currentGS.booster_deck && newGS.booster_deck) {
          if (currentGS.booster_deck.length < newGS.booster_deck.length) {
            mergedGameState.booster_deck = currentGS.booster_deck;
          }
        }

        const originalVersion = currentGS.version || 0;
        mergedGameState.version = originalVersion + 1;
      }

      rooms[idx] = {
        ...rooms[idx],
        ...updates,
        game_state: mergedGameState,
        last_activity: Date.now()
      };
      saveFallbackRooms(rooms);
    }

    if (localBroadcast) {
      localBroadcast.postMessage({ type: "state_updated", roomId, updates: finalUpdates });
    }
  },

  async updateRoomSettings(roomId: string, settings: any): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: room } = await supabase
          .from("rooms")
          .select("game_state")
          .eq("id", roomId)
          .single();
        
        const currentGS = room?.game_state || {};
        const updatedGS = {
          ...currentGS,
          room_settings: settings
        };

        await supabase
          .from("rooms")
          .update({
            game_state: updatedGS,
            last_activity: Date.now()
          })
          .eq("id", roomId);
      } catch (err) {
        console.error("Error updating room settings in Supabase", err);
      }
    }

    // Fallback update
    const rooms = getFallbackRooms();
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx !== -1) {
      const currentGS = rooms[idx].game_state || {};
      rooms[idx].game_state = {
        ...currentGS,
        room_settings: settings
      };
      rooms[idx].last_activity = Date.now();
      saveFallbackRooms(rooms);
    }

    if (localBroadcast) {
      localBroadcast.postMessage({ type: "state_updated", roomId, updates: { last_activity: Date.now() } });
    }
  },

  // SUBSCRIBE TO REAL-TIME CHANGES IN A ROOM
  subscribeToRoom(roomId: string, callback: (room: MatchRoom) => void): () => void {
    if (isSupabaseConfigured && supabase) {
      // REALTIME SUBSCRIPTION setup
      const channel = supabase
        .channel(`room-changes-${roomId}`)
        .on(
            "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${roomId}`
          },
          (payload) => {
            if (payload.new) {
              callback(payload.new as MatchRoom);
            }
          }
        )
        .subscribe();

      // Polling fallback to guarantee updates sync even if Realtime replication is disabled
      const intervalId = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .single();
          if (data && !error) {
            callback(data as MatchRoom);
          }
        } catch (e) {
          console.warn("Polling room update failed:", e);
        }
      }, 2000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(intervalId);
      };
    } else {
      // Local storage sync and BroadcastChannel listener fallback for same browser testing (two tabs)
      const broadcastListener = (event: MessageEvent) => {
        const { data } = event;
        if (data && data.roomId === roomId && data.type === "state_updated") {
          const rooms = getFallbackRooms();
          const r = rooms.find((x) => x.id === roomId);
          if (r) callback(r);
        } else if (data && data.room && data.room.id === roomId && data.type === "room_joined") {
          callback(data.room);
        }
      };

      if (localBroadcast) {
        localBroadcast.addEventListener("message", broadcastListener);
      }

      // Interval fallback to inspect storage in case window is not active or cross-origin
      const intervalId = setInterval(() => {
        const rooms = getFallbackRooms();
        const r = rooms.find((x) => x.id === roomId);
        if (r) {
          callback(r);
        }
      }, 900);

      return () => {
        if (localBroadcast) {
          localBroadcast.removeEventListener("message", broadcastListener);
        }
        clearInterval(intervalId);
      };
    }
  },

  async queryActiveRooms(): Promise<MatchRoom[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("status", "waiting")
        .or("is_private.eq.false,is_private.is.null")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        console.error("Error querying active rooms from Supabase:", error);
      }
      return (data || []) as MatchRoom[];
    }
    return getFallbackRooms().filter((r) => r.status === "waiting" && (r.is_private === false || r.is_private === undefined));
  },

  async updateRoomHeartbeat(roomId: string, key: "host_last_active" | "opponent_last_active", timestamp: number): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: room } = await supabase
          .from("rooms")
          .select("game_state")
          .eq("id", roomId)
          .single();
        const currentGS = room?.game_state || {};
        const updatedGS = {
          ...currentGS,
          [key]: timestamp
        };
        await supabase
          .from("rooms")
          .update({
            game_state: updatedGS,
            last_activity: Date.now()
          })
          .eq("id", roomId);
      } catch (err) {
        console.error("Error updating heartbeat in Supabase:", err);
      }
    } else {
      const rooms = getFallbackRooms();
      const idx = rooms.findIndex((r) => r.id === roomId);
      if (idx !== -1) {
        const currentGS = rooms[idx].game_state || {};
        rooms[idx].game_state = {
          ...currentGS,
          [key]: timestamp
        };
        rooms[idx].last_activity = Date.now();
        saveFallbackRooms(rooms);
      }
      if (localBroadcast) {
        localBroadcast.postMessage({ type: "state_updated", roomId, updates: { last_activity: Date.now() } });
      }
    }
  },

  async invokeReferee(body: {
    action: "init_match" | "confirm_lineup" | "resolve_combat" | "end_turn" | "draw_card" | "play_card" | "reveal_slot";
    roomId: string;
    role?: "host" | "opponent";
    settings?: any;
    actionType?: "resolve_attack" | "confirm_defense";
    details?: any;
    slots?: any[];
    deck?: any[];
    deckType?: "player" | "special";
    cardId?: string;
    targetSlotIdx?: number;
    burntCardIds?: string[];
    slotIdx?: number;
    hide?: boolean;
  }): Promise<{ success: boolean; game_state?: any; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke("mortada-referee", {
          body,
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`
          }
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, game_state: data.game_state };
      } catch (err: any) {
        return { success: false, error: err.message || "Unknown error calling referee" };
      }
    } else {
      return this.runLocalRefereeMock(body);
    }
  },

  async runLocalRefereeMock(body: {
    action: "init_match" | "confirm_lineup" | "resolve_combat" | "end_turn" | "draw_card" | "play_card" | "reveal_slot";
    roomId: string;
    role?: "host" | "opponent";
    settings?: any;
    actionType?: "resolve_attack" | "confirm_defense";
    details?: any;
    slots?: any[];
    deck?: any[];
    deckType?: "player" | "special";
    cardId?: string;
    targetSlotIdx?: number;
    burntCardIds?: string[];
    slotIdx?: number;
    hide?: boolean;
  }): Promise<{ success: boolean; game_state?: any; error?: string }> {
    const rooms = getFallbackRooms();
    const idx = rooms.findIndex((r) => r.id === body.roomId);
    if (idx === -1) {
      return { success: false, error: "Room not found" };
    }

    const room = rooms[idx];
    let gameState = room.game_state || {};

    // Turn Validation
    if (body.action === "resolve_combat") {
      const { actionType, role } = body;
      if (actionType === "resolve_attack") {
        const activeAttackerRole = gameState.attacker_role || room.current_turn;
        if (role !== activeAttackerRole) {
          return { success: false, error: "Forbidden: It is not your turn to attack." };
        }
      } else if (actionType === "confirm_defense") {
        const activeAttackerRole = gameState.attacker_role || room.current_turn;
        const expectedDefenderRole = activeAttackerRole === "host" ? "opponent" : "host";
        if (role !== expectedDefenderRole) {
          return { success: false, error: "Forbidden: You are not the defender in this combat." };
        }
      }
    }

    if (body.action === "end_turn") {
      const currentTurnRole = room.current_turn || gameState.current_turn;
      if (body.role !== currentTurnRole) {
        return { success: false, error: "Forbidden: It is not your turn to end." };
      }
    }

    // State Anti-Tampering Check
    if (body.action === "resolve_combat" && body.details) {
      const { actionType, details, role } = body;
      if (actionType === "resolve_attack" && details.playerSlots) {
        const dbSlots = role === "host" ? gameState.host_slots : gameState.opponent_slots;
        if (dbSlots) {
          if (details.playerSlots.length !== dbSlots.length) {
            return { success: false, error: "Tampering detected: slots count mismatch." };
          }
          for (let i = 0; i < dbSlots.length; i++) {
            const dbSlot = dbSlots[i];
            const clientSlot = details.playerSlots[i];
            if (dbSlot.card && !clientSlot.card) {
              return { success: false, error: "Tampering detected: card removed from slot." };
            }
            if (!dbSlot.card && clientSlot.card) {
              return { success: false, error: "Tampering detected: card added to empty slot." };
            }
            if (dbSlot.card && clientSlot.card) {
              if (isCardStatModified(dbSlot.card, clientSlot.card)) {
                return { success: false, error: "Tampering detected: card stats/status modified." };
              }
            }
          }
        }
      } else if (actionType === "confirm_defense" && details.defenders) {
        const defenderRole = role;
        const dbSlots = defenderRole === "host" ? gameState.host_slots : gameState.opponent_slots;
        if (dbSlots) {
          if (details.defenders.length !== dbSlots.length) {
            return { success: false, error: "Tampering detected: slots count mismatch." };
          }
          for (let i = 0; i < dbSlots.length; i++) {
            const dbSlot = dbSlots[i];
            const clientSlot = details.defenders[i];
            if (dbSlot.card && !clientSlot.card) {
              return { success: false, error: "Tampering detected: card removed from slot." };
            }
            if (!dbSlot.card && clientSlot.card) {
              return { success: false, error: "Tampering detected: card added to empty slot." };
            }
            if (dbSlot.card && clientSlot.card) {
              if (isCardStatModified(dbSlot.card, clientSlot.card)) {
                return { success: false, error: "Tampering detected: card stats/status modified." };
              }
            }
          }
        }
      }
    }

    let updates: any = {};

    const getFormattedTime = () => {
      return new Date().toLocaleTimeString("en-US", { hour12: false });
    };

    const recordRoundHistory = (
      gs: any,
      activeRole: "host" | "opponent",
      hostName: string,
      opponentName: string
    ) => {
      if (!gs.round_history) {
        gs.round_history = [];
      }

      const maxMoves = gs.room_settings?.maxMovesPerTurn ?? 3;
      const activeMoves = activeRole === "host" ? gs.host_moves : gs.opponent_moves;
      const movesPlayed = Math.max(0, maxMoves - activeMoves);

      const hostPitch = (gs.host_slots || []).map((s: any) => {
        if (s && s.card) {
          return {
            name: s.card.name,
            attack: s.card.attack,
            defense: s.card.defense,
            role: s.card.role,
            isRevealed: !!s.isRevealed,
            spent: !!s.spent
          };
        }
        return null;
      });

      const opponentPitch = (gs.opponent_slots || []).map((s: any) => {
        if (s && s.card) {
          return {
            name: s.card.name,
            attack: s.card.attack,
            defense: s.card.defense,
            role: s.card.role,
            isRevealed: !!s.isRevealed,
            spent: !!s.spent
          };
        }
        return null;
      });

      const hostHand = (gs.host_hand || []).map((c: any) => c ? c.name : null);
      const opponentHand = (gs.opponent_hand || []).map((c: any) => c ? c.name : null);

      const combat = gs.current_combat_detail || null;

      const entry = {
        roundNumber: (gs.completed_rounds || 0) + 1,
        attacker: combat ? combat.attacker : activeRole,
        attackerName: combat ? combat.attackerName : (activeRole === "host" ? hostName : opponentName),
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
        timestamp: getFormattedTime()
      };

      gs.round_history.push(entry);
      gs.current_combat_detail = null;
    };

    if (body.action === "init_match") {
      const rs = body.settings || {};
      const legendRatio = rs.legendPercentage ?? 30;
      const maxBonusValue = rs.maxBonusValue ?? 10;

      // Create a single shared player deck (not two separate decks)
      // Deduplicate the entire player pool once, then split into warmup + shared
      const { playerDeck: hostDeck, aiDeck: oppDeck } = generateUniquePlayerDecks(legendRatio);
      const seenNames = new Set<string>();
      const allCards: any[] = [];
      [...hostDeck, ...oppDeck].forEach((card: any) => {
        if (card && card.name) {
          const n = card.name.trim().toLowerCase()
          if (!seenNames.has(n)) { seenNames.add(n); allCards.push(card) }
        }
      })
      const shuffledSharedPool = allCards.sort(() => Math.random() - 0.5)
      
      const specialPool = generateSpecialDeck();
      const specialDeckPool: any[] = [];
      const reps = specialPool.length > 5 ? 2 : 3;
      for (let i = 0; i < reps; i++) {
        specialDeckPool.push(...specialPool);
      }
      const specialDeck = specialDeckPool
        .sort(() => Math.random() - 0.5)
        .map((card, idx) => ({ ...card, id: `spec_${idx}_${Math.random().toString(36).substr(2, 6)}` }));

      const boosterPool = generateBoosterDeck(maxBonusValue);
      const boosterDeckPool: any[] = [];
      for (let i = 0; i < 4; i++) {
        boosterDeckPool.push(...boosterPool);
      }
      const boosterDeck = boosterDeckPool
        .sort(() => Math.random() - 0.5)
        .map((b, idx) => ({ ...b, id: `booster_${idx}_${Math.random().toString(36).substr(2, 6)}` }));

      const hostStarts = Math.random() < 0.5;
      const firstHalfRole = hostStarts ? "player" : "ai";
      const secondHalfRole = hostStarts ? "ai" : "player";

      // Automatically draw initial cards for warmup (auto-warmup slots)
      const initialCardsCount = rs.initialCardsCount ?? 5;
      const prepareInitialSlots = (deck: any[], count: number = initialCardsCount) => {
        const slots = [];
        const remDeck = [...deck];
        let c = 0;
        for (let i = 0; i < remDeck.length; i++) {
          const card = remDeck[i];
          if (card && !card.isLegend && card.rarity !== 'legendary') {
            slots.push({ card, isRevealed: false });
            remDeck.splice(i, 1);
            i--;
            c++;
            if (c === count) break;
          }
        }
        // If not enough non-legend cards, fill remaining slots
        while (slots.length < count && remDeck.length > 0) {
          slots.push({ card: remDeck.shift(), isRevealed: false });
        }
        return { slots, remainingDeck: remDeck };
      };

      // Host draws 5 warmup from shared pool, opponent draws 5 from remaining
      const hostWarmupResult = prepareInitialSlots(shuffledSharedPool, initialCardsCount);
      const opponentWarmupResult = prepareInitialSlots(hostWarmupResult.remainingDeck, initialCardsCount);
      const sharedPlayerDeck = opponentWarmupResult.remainingDeck;

      gameState = {
        room_settings: rs,
        phase: "warmup",
        host_slots: hostWarmupResult.slots,
        opponent_slots: opponentWarmupResult.slots,
        host_hand: [],
        opponent_hand: [],
        host_score: 0,
        opponent_score: 0,
        host_moves: rs.maxMovesPerTurn ?? 3,
        opponent_moves: rs.maxMovesPerTurn ?? 3,
        extra_draws_limit: 0,
        shared_player_deck: sharedPlayerDeck,
        special_deck: specialDeck,
        booster_deck: boosterDeck,
        turn_count: 1,
        match_half: 1,
        is_half_time_break: false,
        half_time_break_left: 0,
        completed_rounds: 0,
        first_half_kickoff_role: firstHalfRole,
        second_half_kickoff_role: secondHalfRole,
        attacker_role: hostStarts ? "host" : "opponent",
        is_shot_declared: false,
        logs: [
          {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: `صافرة بداية مباراة الأونلاين! كود الغرفة: ${body.roomId} ⚽`,
            type: "success",
          },
        ],
        version: 1,
        last_updated_by: "referee",
      };

      updates = {
        game_state: gameState,
        status: "playing",
        host_confirmed: false,
        opponent_confirmed: false,
      };
    } 
    else if (body.action === "confirm_lineup") {
      const isHost = body.role === "host";
      const slots = body.slots || [];
      const deck = body.deck || [];

      if (isHost) {
        updates.host_confirmed = true;
        gameState.host_slots = slots.map((s: any) => ({ ...s, isRevealed: false }));
      } else {
        updates.opponent_confirmed = true;
        gameState.opponent_slots = slots.map((s: any) => ({ ...s, isRevealed: false }));
      }

      const bothConfirmed = (isHost ? room.opponent_confirmed : room.host_confirmed) || false;
      if (bothConfirmed || (updates.host_confirmed && updates.opponent_confirmed)) {
        const hostStarts = gameState.first_half_kickoff_role === "player";
        const startRole = hostStarts ? "host" : "opponent";

        gameState.phase = "player_turn";
        gameState.attacker_role = startRole;
        gameState.current_turn = startRole;
        gameState.start_time = Date.now();

        gameState.host_moves = hostStarts ? (gameState.room_settings.maxMovesPerTurn ?? 3) : 0;
        gameState.opponent_moves = hostStarts ? 0 : (gameState.room_settings.maxMovesPerTurn ?? 3);

        const kickoffAuthId = startRole === "host" ? room.host_id : room.opponent_id;
        gameState.current_turn_auth_id = kickoffAuthId;
        updates.current_turn_auth_id = kickoffAuthId;

        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `🏁 صافرة البداية — المباراة بين ${room.host_name} و ${room.opponent_name || "الخصم"}!`,
          type: "info",
        });
        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `تم تأكيد خطة الفريقين! ركلة البداية مع ${hostStarts ? room.host_name : (room.opponent_name || "الخصم")}! ⚽🏁`,
          type: "success",
        });

        updates.status = "playing";
        updates.current_turn = startRole;
      }

      gameState.last_updated_by = "referee";
      updates.game_state = gameState;
    } 
    else if (body.action === "resolve_combat") {
      const actionType = body.actionType;
      const details = body.details || {};

      if (actionType === "resolve_attack") {
        gameState.is_shot_declared = true;
        if (details.playerSlots) {
          if (body.role === "host") {
            gameState.host_slots = details.playerSlots;
          } else {
            gameState.opponent_slots = details.playerSlots;
          }
        }
        gameState.current_booster = details.currentBooster;
        gameState.current_attacker_idx = details.currentAttackerIdx;
        gameState.logs = details.logs || gameState.logs;

        // Trigger AttackStarted & DefenseStarted BEFORE combat calculations
        const role = body.role;
        const hostName = room.host_name;
        const opponentName = room.opponent_name || "الخصم";
        
        const attackerRole = role;
        const defenderRole = role === "host" ? "opponent" : "host";
        
        const attackerSlots = attackerRole === "host" ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
        const defenderSlots = defenderRole === "host" ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
        
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
        const defenseMoves = gameState.defense_moves_left ?? 0;
        if (defenseMoves <= 0) {
          // Resolve combat immediately!
          const attackerRole = body.role;
          const defenderRole = attackerRole === "host" ? "opponent" : "host";
          
          const hostSlots = gameState.host_slots;
          const opponentSlots = gameState.opponent_slots;
          
          const hostSpecials = gameState.active_specials_host || [];
          const opponentSpecials = gameState.active_specials_opponent || [];

          const isHostAttacker = gameState.attacker_role === "host";
          
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
          );
          const attackPower = attackDetail.total;

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
          );
          const defensePower = defDetail.total;

          const isGoal = attackPower > defensePower;
          let attackerName = isHostAttacker ? room.host_name : (room.opponent_name || "الخصم");
          let defenderName = isHostAttacker ? (room.opponent_name || "الخصم") : room.host_name;
          
          const attackerMoves = isHostAttacker ? gameState.host_moves : gameState.opponent_moves;
          const attackerSlots = isHostAttacker ? hostSlots : opponentSlots;
          const hasUnrevealedCards = attackerSlots.some((s: any) => s && s.card && !s.isRevealed);
          const canReinforce = attackerMoves > 0 && hasUnrevealedCards;

          const filterSpecials = (specials: any[]) => specials.filter((s: any) => {
            const mainAction = s.ability?.actions?.[0];
            return mainAction && mainAction.duration !== "Instant" && mainAction.duration !== "CurrentPhase";
          });

          if (isGoal) {
            if (isHostAttacker) {
              gameState.host_score += 1;
            } else {
              gameState.opponent_score += 1;
            }
            const scoringRole = isHostAttacker ? "host" : "opponent";
            const scoringSlots = scoringRole === "host" ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
            scoringSlots.forEach((slot: any) => {
              if (slot && slot.card && slot.isRevealed) {
                executeCardInstantEffects(gameState, slot.card, scoringRole, "GoalScored", room.host_name, room.opponent_name || "الخصم");
              }
            });
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
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
              type: "success",
            });

            const attackerCardName = isHostAttacker
              ? (gameState.host_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")
              : (gameState.opponent_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم");

            const activeDefenders = (defenderRole === "host" ? hostSlots : opponentSlots)
              .filter((s: any) => s && s.card && (s.revealedInAttack || s.confirmedInAttack || s.isRevealed))
              .map((s: any) => s.card.name);

            gameState.current_combat_detail = {
              attacker: isHostAttacker ? "host" : "opponent",
              attackerName: attackerName,
              attackerCard: attackerCardName,
              attackPower: attackPower,
              defensePower: defensePower,
              isGoal: true,
              defenders: activeDefenders,
              boosterValue: gameState.current_booster ? gameState.current_booster.value : 0,
              boosterText: gameState.current_booster ? gameState.current_booster.text : ""
            };

            const applySpent = (slots: any[]) => slots.map((s: any) => {
              if (s && (s.revealedInAttack || s.confirmedInAttack)) {
                return { ...s, spent: true, revealedInAttack: false, confirmedInAttack: false };
              }
              return s;
            });

            gameState.host_slots = applySpent(hostSlots);
            gameState.opponent_slots = applySpent(opponentSlots);
            gameState.is_shot_declared = false;
            gameState.phase = "resolution";

            gameState.active_specials_host = filterSpecials(hostSpecials);
            gameState.active_specials_opponent = filterSpecials(opponentSpecials);
          } else {
            if (canReinforce) {
              gameState.logs.push({
                id: Math.random().toString(),
                timestamp: getFormattedTime(),
                text: `🧤 إنقاذ! صد دفاع ${defenderName} (${defensePower}) محاولة تسديد ${attackerName} (${attackPower})! وبما أنه متبقي لدى المهاجم حركات وكروت مقلوبة، يستمر النزاع!`,
                type: "neutral",
              });

              const lockSlots = (slots: any[]) => slots.map((s: any) => {
                if (s && s.revealedInAttack) {
                  return { ...s, confirmedInAttack: true, revealedInAttack: false };
                }
                return s;
              });

              gameState.host_slots = lockSlots(hostSlots);
              gameState.opponent_slots = lockSlots(opponentSlots);
              gameState.is_shot_declared = false;
              gameState.phase = isHostAttacker ? "attacking" : "ai_attacking";

              gameState.active_specials_host = hostSpecials;
              gameState.active_specials_opponent = opponentSpecials;
            } else {
              gameState.logs.push({
                id: Math.random().toString(),
                timestamp: getFormattedTime(),
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
                type: "neutral",
              });

              const attackerCardName = isHostAttacker
                ? (gameState.host_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")
                : (gameState.opponent_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم");

              const activeDefenders = (defenderRole === "host" ? hostSlots : opponentSlots)
                .filter((s: any) => s && s.card && (s.revealedInAttack || s.confirmedInAttack || s.isRevealed))
                .map((s: any) => s.card.name);

              gameState.current_combat_detail = {
                attacker: isHostAttacker ? "host" : "opponent",
                attackerName: attackerName,
                attackerCard: attackerCardName,
                attackPower: attackPower,
                defensePower: defensePower,
                isGoal: false,
                defenders: activeDefenders,
                boosterValue: gameState.current_booster ? gameState.current_booster.value : 0,
                boosterText: gameState.current_booster ? gameState.current_booster.text : ""
              };

              const applySpent = (slots: any[]) => slots.map((s: any) => {
                if (s && (s.revealedInAttack || s.confirmedInAttack)) {
                  return { ...s, spent: true, revealedInAttack: false, confirmedInAttack: false };
                }
                return s;
              });

              gameState.host_slots = applySpent(hostSlots);
              gameState.opponent_slots = applySpent(opponentSlots);
              gameState.is_shot_declared = false;
              gameState.phase = "resolution";

              gameState.active_specials_host = filterSpecials(hostSpecials);
              gameState.active_specials_opponent = filterSpecials(opponentSpecials);
            }
          }
        }
      } 
      else if (actionType === "confirm_defense") {
        const defenderRole = body.role;
        const attackerRole = defenderRole === "host" ? "opponent" : "host";

        const defenderSlots = details.defenders || [];
        const hostSlots = defenderRole === "host" ? defenderSlots : gameState.host_slots;
        const opponentSlots = defenderRole === "opponent" ? defenderSlots : gameState.opponent_slots;

        const hostSpecials = defenderRole === "host" ? details.specials : (gameState.active_specials_host || []);
        const opponentSpecials = defenderRole === "opponent" ? details.specials : (gameState.active_specials_opponent || []);

        const isHostAttacker = gameState.attacker_role === "host";

        // Log each defender's confirmation individually
        defenderSlots.forEach((slot: any) => {
          if (slot && slot.card && slot.isRevealed && slot.revealedInAttack) {
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `🧱 تم تأكيد الدفاع باللاعب [ ${slot.card.name} ] لصد الهجوم بقوة دفاع +${slot.card.defense}!`,
              type: "info",
            });
          }
        });
        (details.specials || []).forEach((spec: any) => {
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: `🛡️ تم تعزيز الدفاع بكارت التكتيك [ ${spec.name} ]!`,
            type: "success",
          });
        });

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
        );
        const attackPower = attackDetail.total;

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
        );
        const defensePower = defDetail.total;

        const isGoal = attackPower > defensePower;
        const attackerName = isHostAttacker ? room.host_name : (room.opponent_name || "الخصم");
        const defenderName = isHostAttacker ? (room.opponent_name || "الخصم") : room.host_name;

        const attackerMoves = isHostAttacker ? gameState.host_moves : gameState.opponent_moves;
        const attackerSlots = isHostAttacker ? hostSlots : opponentSlots;
        const hasUnrevealedCards = attackerSlots.some((s: any) => s && s.card && !s.isRevealed);
        const canReinforce = attackerMoves > 0 && hasUnrevealedCards;

        const filterSpecials = (specials: any[]) => specials.filter((s: any) => {
          const mainAction = s.ability?.actions?.[0];
          return mainAction && mainAction.duration !== "Instant" && mainAction.duration !== "CurrentPhase";
        });

        if (isGoal) {
          if (isHostAttacker) {
            gameState.host_score += 1;
          } else {
            gameState.opponent_score += 1;
          }
          const scoringRole = isHostAttacker ? "host" : "opponent";
          const scoringSlots = scoringRole === "host" ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
          scoringSlots.forEach((slot: any) => {
            if (slot && slot.card && slot.isRevealed) {
              executeCardInstantEffects(gameState, slot.card, scoringRole, "GoalScored", room.host_name, room.opponent_name || "الخصم");
            }
          });
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
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
            type: "success",
          });

          const attackerCardName = isHostAttacker
            ? (gameState.host_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")
            : (gameState.opponent_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم");

          const activeDefenders = (defenderRole === "host" ? hostSlots : opponentSlots)
            .filter((s: any) => s && s.card && (s.revealedInAttack || s.confirmedInAttack || s.isRevealed))
            .map((s: any) => s.card.name);

          gameState.current_combat_detail = {
            attacker: isHostAttacker ? "host" : "opponent",
            attackerName: attackerName,
            attackerCard: attackerCardName,
            attackPower: attackPower,
            defensePower: defensePower,
            isGoal: true,
            defenders: activeDefenders,
            boosterValue: gameState.current_booster ? gameState.current_booster.value : 0,
            boosterText: gameState.current_booster ? gameState.current_booster.text : ""
          };

          const applySpent = (slots: any[]) => slots.map((s: any) => {
            if (s && (s.revealedInAttack || s.confirmedInAttack)) {
              return { ...s, spent: true, revealedInAttack: false, confirmedInAttack: false };
            }
            return s;
          });

          gameState.host_slots = applySpent(hostSlots);
          gameState.opponent_slots = applySpent(opponentSlots);
          gameState.is_shot_declared = false;
          gameState.phase = "resolution";

          gameState.active_specials_host = filterSpecials(hostSpecials);
          gameState.active_specials_opponent = filterSpecials(opponentSpecials);
        } else {
          if (canReinforce) {
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `🧤 إنقاذ! صد دفاع ${defenderName} (${defensePower}) محاولة تسديد ${attackerName} (${attackPower})! وبما أنه متبقي لدى المهاجم حركات وكروت مقلوبة، يستمر النزاع!`,
              type: "neutral",
            });

            const lockSlots = (slots: any[]) => slots.map((s: any) => {
              if (s && s.revealedInAttack) {
                return { ...s, confirmedInAttack: true, revealedInAttack: false };
              }
              return s;
            });

            gameState.host_slots = lockSlots(hostSlots);
            gameState.opponent_slots = lockSlots(opponentSlots);
            gameState.is_shot_declared = false;
            gameState.phase = isHostAttacker ? "attacking" : "ai_attacking";

            gameState.active_specials_host = hostSpecials;
            gameState.active_specials_opponent = opponentSpecials;
          } else {
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
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
              type: "neutral",
            });

            const attackerCardName = isHostAttacker
              ? (gameState.host_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم")
              : (gameState.opponent_slots[gameState.current_attacker_idx]?.card?.name || "مهاجم");

            const activeDefenders = (defenderRole === "host" ? hostSlots : opponentSlots)
              .filter((s: any) => s && s.card && (s.revealedInAttack || s.confirmedInAttack || s.isRevealed))
              .map((s: any) => s.card.name);

            gameState.current_combat_detail = {
              attacker: isHostAttacker ? "host" : "opponent",
              attackerName: attackerName,
              attackerCard: attackerCardName,
              attackPower: attackPower,
              defensePower: defensePower,
              isGoal: false,
              defenders: activeDefenders,
              boosterValue: gameState.current_booster ? gameState.current_booster.value : 0,
              boosterText: gameState.current_booster ? gameState.current_booster.text : ""
            };

            const applySpent = (slots: any[]) => slots.map((s: any) => {
              if (s && (s.revealedInAttack || s.confirmedInAttack)) {
                return { ...s, spent: true, revealedInAttack: false, confirmedInAttack: false };
              }
              return s;
            });

            gameState.host_slots = applySpent(hostSlots);
            gameState.opponent_slots = applySpent(opponentSlots);
            gameState.is_shot_declared = false;
            gameState.phase = "resolution";

            gameState.active_specials_host = filterSpecials(hostSpecials);
            gameState.active_specials_opponent = filterSpecials(opponentSpecials);
          }
        }
      }

      gameState.last_updated_by = "referee";
      updates.game_state = gameState;
    } 
    else if (body.action === "end_turn") {
      const isHost = body.role === "host";
      const nextTurn = isHost ? "opponent" : "host";
      const maxMoves = gameState.room_settings?.maxMovesPerTurn ?? 3;

      // Trigger TurnEnded for the ending player
      const hostName = room.host_name;
      const opponentName = room.opponent_name || "الخصم";
      const endingRole = body.role;
      const endingSlots = endingRole === "host" ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
      endingSlots.forEach((slot: any) => {
        if (slot && slot.card && slot.isRevealed) {
          executeCardInstantEffects(gameState, slot.card, endingRole, "TurnEnded", hostName, opponentName);
        }
      });

      recordRoundHistory(gameState, isHost ? "host" : "opponent", room.host_name, room.opponent_name || "الخصم");
      gameState.completed_rounds = (gameState.completed_rounds || 0) + 1;

      gameState.phase = "player_turn";
      gameState.current_turn = nextTurn;
      gameState.attacker_role = nextTurn;
      gameState.extra_draws_limit = 0;

      if (nextTurn === "host") {
        gameState.host_moves = maxMoves;
        gameState.opponent_moves = 0;
      } else {
        gameState.host_moves = 0;
        gameState.opponent_moves = maxMoves;
      }

      gameState.defense_moves_left = maxMoves;

      // Trigger TurnStarted for the starting player
      const startingSlots = nextTurn === "host" ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
      startingSlots.forEach((slot: any) => {
        if (slot && slot.card && slot.isRevealed) {
          executeCardInstantEffects(gameState, slot.card, nextTurn, "TurnStarted", hostName, opponentName);
        }
      });

      gameState.logs.push({
        id: Math.random().toString(),
        timestamp: getFormattedTime(),
        text: `🏁 جولة جديدة — بداية دور ${nextTurn === "host" ? room.host_name : (room.opponent_name || "الخصم")}!`,
        type: "info",
      });
      gameState.logs.push({
        id: Math.random().toString(),
        timestamp: getFormattedTime(),
        text: `🏁 جولة جديدة — بداية دور ${nextTurn === "host" ? room.host_name : (room.opponent_name || "الخصم")}!`,
        type: "info",
      });
      gameState.logs.push({
        id: Math.random().toString(),
        timestamp: getFormattedTime(),
        text: `⏳ انتهى دور ${isHost ? room.host_name : (room.opponent_name || "الخصم")}! الدور الآن للطرف الآخر لشن الخطط!`,
        type: "info",
      });

      const nextTurnAuthId = nextTurn === "host" ? room.host_id : room.opponent_id;
      gameState.current_turn_auth_id = nextTurnAuthId;
      updates.current_turn_auth_id = nextTurnAuthId;
      updates.current_turn = nextTurn;
      gameState.last_updated_by = "referee";
      updates.game_state = gameState;
    }
    else if (body.action === "draw_card") {
      const isHost = body.role === "host";
      const deckType = body.deckType;

      const isPlayTurn = gameState.phase === "player_turn" || gameState.phase === "attacking" || gameState.phase === "ai_attacking";
      const isWarmup = gameState.phase === "warmup";

      if (!isWarmup && !isPlayTurn) {
        return { success: false, error: "Cannot draw cards in the current phase." };
      }

      if (isPlayTurn) {
        const isMyTurn = gameState.current_turn === body.role;
        const isHostDefending = gameState.phase === "ai_attacking" && body.role === "host";
        const isOpponentDefending = gameState.phase === "attacking" && body.role === "opponent";
        const isDefending = isHostDefending || isOpponentDefending;

        if (!isMyTurn && !isDefending) {
          return { success: false, error: "It is not your turn to draw." };
        }

        const limit = isDefending
          ? (gameState.room_settings?.defenseDrawsLimit ?? 3)
          : (gameState.room_settings?.maxDrawsPerTurn ?? 2);

        const totalLimit = limit + (gameState.extra_draws_limit || 0);

        if ((gameState.cards_drawn || 0) >= totalLimit) {
          return { success: false, error: "Draw limit exceeded for this turn." };
        }
      }

      const hand = isHost ? (gameState.host_hand || []) : (gameState.opponent_hand || []);
      let drawnCard = null;

      if (deckType === "player") {
        const deck = gameState.shared_player_deck || [];
        if (deck.length === 0) {
          return { success: false, error: "Player deck is empty." };
        }
        drawnCard = deck.shift();
        gameState.shared_player_deck = deck;
      } else if (deckType === "special") {
        const deck = gameState.special_deck || [];
        if (deck.length === 0) {
          return { success: false, error: "Special deck is empty." };
        }
        drawnCard = deck.shift();
        gameState.special_deck = deck;
      } else {
        return { success: false, error: "Invalid deck type." };
      }

      if (isWarmup) {
        const slots = isHost ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
        const emptyIdx = slots.findIndex((s: any) => s && s.card === null);
        if (emptyIdx === -1) {
          return { success: false, error: "Warmup slots are already full." };
        }
        slots[emptyIdx] = { card: drawnCard, isRevealed: false };
        if (isHost) {
          gameState.host_slots = slots;
        } else {
          gameState.opponent_slots = slots;
        }

        const drawnCount = slots.filter((s: any) => s && s.card !== null).length;
        const playerName = isHost ? room.host_name : (room.opponent_name || "الخصم");
        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `[التسخين] قام ${playerName} بسحب اللاعب مقلوباً بمركز الملعب [ ${emptyIdx + 1} ]. (سحب ${drawnCount}/${gameState.room_settings?.initialCardsCount ?? 5})`,
          type: "success",
        });
      } else {
        hand.push(drawnCard);
        if (isHost) {
          gameState.host_hand = hand;
        } else {
          gameState.opponent_hand = hand;
        }

        gameState.cards_drawn = (gameState.cards_drawn || 0) + 1;
        const playerName = isHost ? room.host_name : (room.opponent_name || "الخصم");
        gameState.logs.push({
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          text: `لقد سحب ${playerName} كارت ${deckType === "player" ? "لاعب جديد" : "تكتيك إضافي"} ليده.`,
          type: "info",
        });
      }

      gameState.last_updated_by = "referee";
      updates.game_state = gameState;
    }
    else if (body.action === "play_card") {
      const isHost = body.role === "host";
      const { cardId, targetSlotIdx, burntCardIds } = body;

      const isPlayTurn = gameState.phase === "player_turn" || gameState.phase === "attacking" || gameState.phase === "ai_attacking";
      if (!isPlayTurn) {
        return { success: false, error: "Cannot play cards in the current phase." };
      }

      const isMyTurn = gameState.current_turn === body.role;
      const isHostDefending = gameState.phase === "ai_attacking" && body.role === "host";
      const isOpponentDefending = gameState.phase === "attacking" && body.role === "opponent";
      const isDefending = isHostDefending || isOpponentDefending;

      if (!isMyTurn && !isDefending) {
        return { success: false, error: "It is not your turn to play." };
      }

      const movesLeft = isDefending
        ? (gameState.defense_moves_left || 0)
        : (isHost ? (gameState.host_moves || 0) : (gameState.opponent_moves || 0));

      if (movesLeft < 1) {
        return { success: false, error: "No moves left to perform this action." };
      }

      const hand = isHost ? (gameState.host_hand || []) : (gameState.opponent_hand || []);
      const cardIdx = hand.findIndex((c: any) => c && c.id === cardId);
      if (cardIdx === -1) {
        return { success: false, error: "Card not found in hand." };
      }

      const card = hand[cardIdx];
      const hostName = room.host_name;
      const opponentName = room.opponent_name || "الخصم";
      const playerName = isHost ? hostName : opponentName;

      if (card.type === "player") {
        if (isDefending) {
          return { success: false, error: "Cannot play player cards while defending." };
        }
        if (targetSlotIdx === undefined || targetSlotIdx < 0 || targetSlotIdx >= (gameState.room_settings?.initialCardsCount ?? 5)) {
          return { success: false, error: "Invalid target slot index." };
        }

        const legendBurnLimit = gameState.room_settings?.legendBurnLimit ?? 2;
        if (card.isLegend) {
          if (!burntCardIds || burntCardIds.length !== legendBurnLimit) {
            return { success: false, error: `Legendary cards require burning exactly ${legendBurnLimit} cards.` };
          }

          const validBurntIds = burntCardIds.every((id: string) => id !== cardId && hand.some((c: any) => c && c.id === id));
          if (!validBurntIds) {
            return { success: false, error: "Invalid burnt cards specified." };
          }

          burntCardIds.forEach((id: string) => {
            const burntCard = hand.find((c: any) => c && c.id === id);
            recycleCard(gameState, burntCard, isHost);
          });

          const nextHand = hand.filter((c: any) => c && c.id !== cardId && !burntCardIds.includes(c.id));
          if (isHost) {
            gameState.host_hand = nextHand;
          } else {
            gameState.opponent_hand = nextHand;
          }
        } else {
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
            recycleCard(gameState, targetSlot.card, isHost);
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `🔄 تم استبدال لاعب بالمركز [ ${targetSlotIdx + 1} ]. تم استبعاد اللاعب المكشوف ونزول لاعب جديد مقلوباً.`,
              type: "warning",
            });
          } else {
            const currentHand = isHost ? gameState.host_hand : gameState.opponent_hand;
            currentHand.push(targetSlot.card);
            if (isHost) {
              gameState.host_hand = currentHand;
            } else {
              gameState.opponent_hand = currentHand;
            }
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `🔄 تم استبدال لاعب بالمركز [ ${targetSlotIdx + 1} ]. تم استرجاع اللاعب المقلوب ونزول لاعب جديد مقلوباً.`,
              type: "success",
            });
          }
        } else {
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: `🔄 تم تنزيل لاعب بالمركز الخالي [ ${targetSlotIdx + 1} ]. وضع لاعب جديد مقلوباً.`,
            type: "info",
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

        executeCardInstantEffects(gameState, card, body.role as any, "CardPlayed", hostName, opponentName);
      } 
      else if (card.type === "special") {
        if (isSpecialCardsBlocked(body.role as any, gameState)) {
          return { success: false, error: "Tactical cards are currently blocked." };
        }

        const requiresTargeting = card.ability?.actions?.some((act: any) => act.target === "SelectedEnemy" || act.target === "SelectedCard") || card.effect === "red_card";
        if (requiresTargeting) {
          if (targetSlotIdx === undefined || targetSlotIdx < 0 || targetSlotIdx >= (gameState.room_settings?.initialCardsCount ?? 5)) {
            return { success: false, error: "This special card requires specifying a valid target slot." };
          }

          const isEnemySideTarget = card.effect === "red_card" || card.ability?.actions?.some((act: any) => act.target === "SelectedEnemy");
          const isValid = isValidTargetForCard(body.role as any, card, targetSlotIdx, isEnemySideTarget, gameState);
          if (!isValid) {
            return { success: false, error: "Invalid target slot for this tactical card." };
          }

          const targetSlots = isEnemySideTarget
            ? (isHost ? gameState.opponent_slots : gameState.host_slots)
            : (isHost ? gameState.host_slots : gameState.opponent_slots);
          const targetSlot = targetSlots[targetSlotIdx];
          const targetCard = targetSlot.card;

          const actions = card.ability?.actions || [];
          const actType = actions[0]?.type || (card.effect === "red_card" ? "DestroyCard" : "DestroyCard");
          const durationTurns = actions[0]?.durationTurns || 2;

          if (actType === "DestroyCard") {
            targetSlots[targetSlotIdx] = { card: null, isRevealed: false };
            recycleCard(gameState, targetCard, !isEnemySideTarget);
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `🟥 كارت أحمر: قام ${playerName} بطرد واستبعاد اللاعب [ ${targetCard.name} ] خارج الملعب تماماً!`,
              type: "danger",
            });
          } else if (actType === "ReturnToHand") {
            targetSlots[targetSlotIdx] = { card: null, isRevealed: false };
            const sideHand = isEnemySideTarget
              ? (isHost ? gameState.opponent_hand : gameState.host_hand)
              : (isHost ? gameState.host_hand : gameState.opponent_hand);
            sideHand.push(targetCard);
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `🔄 سحب لليد: قام ${playerName} بإرجاع اللاعب [ ${targetCard.name} ] ليد المدرب.`,
              type: "success",
            });
          } else if (actType === "FreezeCard") {
            targetCard.frozen = true;
            targetCard.frozenTurnsLeft = durationTurns;
            targetSlots[targetSlotIdx] = { ...targetSlot, card: targetCard };
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `❄️ تجميد: قام ${playerName} بتجميد لاعب [ ${targetCard.name} ] لمدة ${durationTurns} أدوار!`,
              type: "neutral",
            });
          } else if (actType === "SilenceCard") {
            targetCard.silenced = true;
            targetCard.silencedTurnsLeft = durationTurns;
            targetSlots[targetSlotIdx] = { ...targetSlot, card: targetCard };
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `🔇 كتم القدرة: قام ${playerName} بإلغاء قدرة لاعب [ ${targetCard.name} ] لمدة ${durationTurns} أدوار!`,
              type: "neutral",
            });
          } else if (actType === "StunCard") {
            targetCard.stunned = true;
            targetCard.stunnedTurnsLeft = durationTurns;
            targetSlots[targetSlotIdx] = { ...targetSlot, card: targetCard };
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `💫 صدمة تكتيكية: قام ${playerName} بتعطيل لاعب [ ${targetCard.name} ] لمدة ${durationTurns} أدوار!`,
              type: "neutral",
            });
          } else if (actType === "RevealCard") {
            targetSlot.isRevealed = true;
            targetSlot.revealedInTurn = gameState.turn_count || 1;
            targetSlot.revealedByAbility = true;
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `👁️ كشف: قام ${playerName} بقلب لاعب [ ${targetCard.name} ] ليصبح مكشوفاً.`,
              type: "success",
            });
            executeCardInstantEffects(gameState, targetCard, !isEnemySideTarget ? (body.role as any) : (isHost ? "opponent" : "host"), "CardRevealed", hostName, opponentName);
            executeCardInstantEffects(gameState, targetCard, !isEnemySideTarget ? (body.role as any) : (isHost ? "opponent" : "host"), "CardPlayed", hostName, opponentName);
          } else if (actType === "HideCard") {
            targetSlot.isRevealed = false;
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `🎭 إخفاء: قام ${playerName} بقلب لاعب [ ${targetCard.name} ] ليصبح مقلوباً.`,
              type: "success",
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
          if (card.effect === "world_cup") {
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
              timestamp: getFormattedTime(),
              text: `🏆 تم تفعيل ${card.name}! استهلكت حركة واحدة وسحبت ورقتين فوراً من الباقات.`,
              type: "success",
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
              timestamp: getFormattedTime(),
              text: `✨ ${phaseName}: قام ${playerName} بتفعيل كارت التكتيك [ ${card.name} ]!`,
              type: "success",
            });
          }
        }

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

      gameState.last_updated_by = "referee";
      updates.game_state = gameState;
    }
    else if (body.action === "reveal_slot") {
      const isHost = body.role === "host";
      const { slotIdx, hide } = body;

      const isPlayTurn = gameState.phase === "player_turn" || gameState.phase === "attacking" || gameState.phase === "ai_attacking";
      if (!isPlayTurn) {
        return { success: false, error: "Cannot interact with slots in the current phase." };
      }

      const slots = isHost ? (gameState.host_slots || []) : (gameState.opponent_slots || []);
      if (slotIdx === undefined || slotIdx < 0 || slotIdx >= slots.length) {
        return { success: false, error: "Invalid slot index." };
      }

      const slot = slots[slotIdx];
      if (!slot || !slot.card) {
        return { success: false, error: "Slot is empty." };
      }

      const hostName = room.host_name;
      const opponentName = room.opponent_name || "الخصم";
      const playerName = isHost ? hostName : opponentName;

      const isMyTurn = gameState.current_turn === body.role;
      const isHostDefending = gameState.phase === "ai_attacking" && body.role === "host";
      const isOpponentDefending = gameState.phase === "attacking" && body.role === "opponent";
      const isDefending = isHostDefending || isOpponentDefending;

      if (hide) {
        if (!slot.revealedInAttack || slot.confirmedInAttack) {
          return { success: false, error: "Cannot hide this slot." };
        }

        slot.isRevealed = false;
        slot.revealedInAttack = false;

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
          timestamp: getFormattedTime(),
          text: `🎭 إلغاء كشف: قام ${playerName} بإعادة قلب كارت اللاعب [ ${slot.card.name} ] ليكون مقلوباً ومخفياً.`,
          type: "neutral",
        });
      } 
      else {
        if (slot.isRevealed) {
          return { success: false, error: "Slot is already revealed." };
        }

        if (isDefending) {
          const enemySpecials = isHost ? (gameState.active_specials_opponent || []) : (gameState.active_specials_host || []);
          const enemySlots = isHost ? (gameState.opponent_slots || []) : (gameState.host_slots || []);
          const isDefenseBlocked = enemySpecials.some((c: any) => c.ability?.actions?.some((a: any) => a.type === "BlockDefense")) ||
                                   enemySlots.some((s: any) => s && s.card && s.isRevealed && !s.card.silenced && s.card.ability?.actions?.some((a: any) => a.type === "BlockDefense"));
          if (isDefenseBlocked) {
            return { success: false, error: "Defense is blocked." };
          }
        }

        const activeSpecialsCount = isHost ? (gameState.active_specials_host || []).length : (gameState.active_specials_opponent || []).length;
        const revealedCount = slots.filter((s: any) => s && s.card && s.revealedInAttack).length;
        const maxMoves = gameState.room_settings?.maxMovesPerTurn ?? 3;

        if (revealedCount + activeSpecialsCount >= maxMoves) {
          return { success: false, error: `Cannot reveal more than ${maxMoves} cards this round.` };
        }

        const movesLeft = isDefending
          ? (gameState.defense_moves_left || 0)
          : (isHost ? (gameState.host_moves || 0) : (gameState.opponent_moves || 0));

        if (movesLeft < 1) {
          return { success: false, error: "No moves left to perform this action." };
        }

        slot.isRevealed = true;
        slot.revealedInAttack = true;
        slot.revealedInTurn = gameState.turn_count || 1;

        if (isDefending) {
          gameState.defense_moves_left = Math.max(0, (gameState.defense_moves_left || 0) - 1);
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: `🛡️ تم كشف المدافع [ ${slot.card.name} ] لصد الهجوم! (استهلكت حركة واحدة)`,
            type: "success",
          });
        } else {
          if (isHost) {
            gameState.host_moves = Math.max(0, (gameState.host_moves || 0) - 1);
          } else {
            gameState.opponent_moves = Math.max(0, (gameState.opponent_moves || 0) - 1);
          }
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: `⚔️ تم كشف المهاجم الداعم [ ${slot.card.name} ] لتعزيز الهجمة! (استهلكت حركة واحدة)`,
            type: "success",
          });
        }

        executeCardInstantEffects(gameState, slot.card, body.role as any, "CardRevealed", hostName, opponentName);
        executeCardInstantEffects(gameState, slot.card, body.role as any, "CardPlayed", hostName, opponentName);
      }

      if (isHost) {
        gameState.host_slots = slots;
      } else {
        gameState.opponent_slots = slots;
      }

      gameState.last_updated_by = "referee";
      updates.game_state = gameState;
    }

    if (updates.game_state) {
      if (body.action === "init_match") {
        updates.game_state.version = 1;
      } else {
        const originalVersion = room.game_state?.version || 0;
        updates.game_state.version = originalVersion + 1;
      }
    }

    rooms[idx] = {
      ...room,
      ...updates,
      last_activity: Date.now(),
    };
    saveFallbackRooms(rooms);

    if (localBroadcast) {
      localBroadcast.postMessage({
        type: "state_updated",
        roomId: body.roomId,
        updates: { last_activity: Date.now() },
      });
    }

    return { success: true, game_state: gameState };
  }
};
