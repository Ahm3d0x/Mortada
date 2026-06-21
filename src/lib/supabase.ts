/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generateUniquePlayerDecks, generateSpecialDeck, generateBoosterDeck } from "../cardsData";
import { runRefereeRulesEngine } from "../utils/rulesEngine";

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
const localChannelName = "tactical_football_ponto_broadcast";
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

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: currentRoom } = await supabase
          .from("rooms")
          .select("game_state")
          .eq("id", roomId)
          .single();

        if (currentRoom && currentRoom.game_state && updates.game_state) {
          const currentGS = currentRoom.game_state;
          const newGS = updates.game_state;
          const updater = newGS.last_updated_by;
          const mergedGS = { ...newGS };

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
          }
          finalUpdates.game_state = mergedGS;
        }
      } catch (err) {
        console.error("Error merging game state in updateRoomState:", err);
      }

      await supabase
        .from("rooms")
        .update({
          ...finalUpdates,
          last_activity: Date.now()
        })
        .eq("id", roomId);
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
        }
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
    action: "init_match" | "confirm_lineup" | "resolve_combat" | "end_turn";
    roomId: string;
    role?: "host" | "opponent";
    settings?: any;
    actionType?: "resolve_attack" | "confirm_defense";
    details?: any;
    slots?: any[];
    deck?: any[];
  }): Promise<{ success: boolean; game_state?: any; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke("mortada-referee", {
          body
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
    action: "init_match" | "confirm_lineup" | "resolve_combat" | "end_turn";
    roomId: string;
    role?: "host" | "opponent";
    settings?: any;
    actionType?: "resolve_attack" | "confirm_defense";
    details?: any;
    slots?: any[];
    deck?: any[];
  }): Promise<{ success: boolean; game_state?: any; error?: string }> {
    const rooms = getFallbackRooms();
    const idx = rooms.findIndex((r) => r.id === body.roomId);
    if (idx === -1) {
      return { success: false, error: "Room not found" };
    }

    const room = rooms[idx];
    let gameState = room.game_state || {};
    let updates: any = {};

    const getFormattedTime = () => {
      return new Date().toLocaleTimeString("en-US", { hour12: false });
    };

    if (body.action === "init_match") {
      const rs = body.settings || {};
      const legendRatio = rs.legendPercentage ?? 30;
      const maxBonusValue = rs.maxBonusValue ?? 10;

      const { playerDeck: hostDeck, aiDeck: oppDeck } = generateUniquePlayerDecks(legendRatio);
      
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

      gameState = {
        room_settings: rs,
        phase: "warmup",
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
        gameState.host_player_deck = deck;
      } else {
        updates.opponent_confirmed = true;
        gameState.opponent_slots = slots.map((s: any) => ({ ...s, isRevealed: false }));
        gameState.opponent_player_deck = deck;
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
      } 
      else if (actionType === "confirm_defense") {
        const defenderRole = body.role;
        const attackerRole = defenderRole === "host" ? "opponent" : "host";

        const hostSlots = defenderRole === "host" ? details.defenders : gameState.host_slots;
        const opponentSlots = defenderRole === "opponent" ? details.defenders : gameState.opponent_slots;

        const hostSpecials = defenderRole === "host" ? details.specials : (gameState.active_specials_host || []);
        const opponentSpecials = defenderRole === "opponent" ? details.specials : (gameState.active_specials_opponent || []);

        const isHostAttacker = gameState.attacker_role === "host";

        const attackPower = runRefereeRulesEngine(
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

        const defensePower = runRefereeRulesEngine(
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

        const isGoal = attackPower > defensePower;
        const attackerName = isHostAttacker ? room.host_name : (room.opponent_name || "الخصم");
        const defenderName = isHostAttacker ? (room.opponent_name || "الخصم") : room.host_name;

        const attackerMoves = isHostAttacker ? gameState.host_moves : gameState.opponent_moves;
        const attackerSlots = isHostAttacker ? hostSlots : opponentSlots;
        const hasUnrevealedCards = attackerSlots.some((s: any) => s && s.card && !s.isRevealed);
        const canReinforce = attackerMoves > 0 && hasUnrevealedCards;

        if (isGoal) {
          if (isHostAttacker) {
            gameState.host_score += 1;
          } else {
            gameState.opponent_score += 1;
          }
          gameState.logs.push({
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            text: `⚽ جـوووول! تسديدة ${attackerName} المتقنة (${attackPower}) تتغلب على الدفاع المستميت لـ ${defenderName} (${defensePower})!`,
            type: "success",
          });

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
          } else {
            gameState.logs.push({
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              text: `🧤 إنقاذ بطولي نهائي! جدار صد دفاع ${defenderName} (${defensePower}) يقطع تماماً محاولة تسديد ${attackerName} (${attackPower})!`,
              type: "neutral",
            });

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
          }
        }

        const filterSpecials = (specials: any[]) => specials.filter((s: any) => {
          const mainAction = s.ability?.actions?.[0];
          return mainAction && mainAction.duration !== "Instant" && mainAction.duration !== "CurrentPhase";
        });
        gameState.active_specials_host = filterSpecials(hostSpecials);
        gameState.active_specials_opponent = filterSpecials(opponentSpecials);
      }

      gameState.last_updated_by = "referee";
      updates.game_state = gameState;
    } 
    else if (body.action === "end_turn") {
      const isHost = body.role === "host";
      const nextTurn = isHost ? "opponent" : "host";
      const maxMoves = gameState.room_settings?.maxMovesPerTurn ?? 3;

      gameState.phase = "player_turn";
      gameState.current_turn = nextTurn;
      gameState.attacker_role = nextTurn;

      if (nextTurn === "host") {
        gameState.host_moves = maxMoves;
        gameState.opponent_moves = 0;
      } else {
        gameState.host_moves = 0;
        gameState.opponent_moves = maxMoves;
      }

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
