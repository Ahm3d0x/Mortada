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
  id: string; // 4-digit code e.g. "1234"
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
  async signUp(email: string, pass: string, username: string): Promise<{ user: any; error: string | null }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { username }
        }
      });
      if (error) return { user: null, error: error.message };
      return { user: data.user, error: null };
    } else {
      // Local fallbacks
      const mockUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: { username }
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
  async createRoom(hostId: string, hostName: string, hostVibe: string): Promise<MatchRoom> {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString(); // Easy 4 digit room code

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
      game_state: null,
      last_activity: Date.now()
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("rooms")
        .insert([newRoom]);
      if (error) {
        console.error("Error creating room in Supabase", error);
        // Fallback if table name doesn't exist, use localStorage gracefully
      }
    }

    // Always keep fallback updated
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
        return { room: null, error: "فشل الانضمام للغرفة. حاول مرة أخرى." };
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
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("rooms")
        .update({
          ...updates,
          last_activity: Date.now()
        })
        .eq("id", roomId);
    }

    // Local update
    const rooms = getFallbackRooms();
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx !== -1) {
      rooms[idx] = {
        ...rooms[idx],
        ...updates,
        last_activity: Date.now()
      };
      saveFallbackRooms(rooms);
    }

    if (localBroadcast) {
      localBroadcast.postMessage({ type: "state_updated", roomId, updates });
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
            callback(payload.new as MatchRoom);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
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
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("status", "waiting")
        .limit(10);
      return (data || []) as MatchRoom[];
    }
    return getFallbackRooms().filter((r) => r.status === "waiting");
  }
};
