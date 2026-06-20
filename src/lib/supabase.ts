/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
  }
};
