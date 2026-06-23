import { supabase, isSupabaseConfigured } from "./supabase";

export interface MatchSettings {
  difficulty: "normal" | "tactical" | "legend";
  matchDuration: number;
  legendPercentage: number;
  maxDrawsPerTurn: number;
  maxMovesPerTurn: number;
  initialCardsCount: number;
  legendBurnLimit: number;
  maxBonusValue: number;
  gameMode?: "time" | "rounds";
  winningGoals?: number;
  totalRounds?: number;
  halfTimeBreakDuration?: number;
  turnTimeLimit?: number;
  defenseTimeLimit?: number;
  warmupTimeLimit?: number;
  selectedPlayerPkgs?: string[];
  selectedSpecialPkgs?: string[];
}

export interface GameUser {
  id: string;
  email: string;
  password?: string;
  name: string;
  team_name: string;
  team_abbreviation: string;
  team_logo: string;
  country: string;
  role: "player" | "admin";
  coins: number;
  default_match_settings: MatchSettings;
}

// Client-side SHA-256 Hashing helper
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const USER_SESSION_KEY = "mortada_user";
const OFFLINE_USERS_KEY = "mock_game_users";

// Session-based offline fallback flag (ONLY active when Supabase is not configured)
const useOfflineFallback = !isSupabaseConfigured;

function setOfflineFallback(val: boolean) {
  // No-op: we do not silently fall back to offline mode if Supabase is configured
}

// Helper to get local mock users database
function getOfflineUsers(): GameUser[] {
  try {
    const raw = localStorage.getItem(OFFLINE_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Helper to save local mock users database
function saveOfflineUsers(users: any[]) {
  try {
    localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error("Failed to save offline users:", err);
  }
}

// Helper to check if string is a valid UUID
function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Helper to dispatch global auth event
function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mortada_auth_change"));
  }
}

export const gameAuth = {
  // Get Current User details synchronously from localStorage session
  getCurrentUser(): GameUser | null {
    try {
      const raw = localStorage.getItem(USER_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // Refresh current user session from DB (if online) or sync state
  async refreshUser(): Promise<GameUser | null> {
    const current = this.getCurrentUser();
    if (!current) return null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("game_users")
          .select("*")
          .eq("id", current.id)
          .single();

        if (error) {
          console.error("Supabase returned error on refreshUser:", error);
          // If the user doesn't exist in Supabase (e.g. database reset/deleted or they were an offline user),
          // clear the session so they are forced to log in or register online.
          this.signOut();
          return null;
        } else if (data) {
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(data));
          notifyAuthChange();
          return data as GameUser;
        }
      } catch (err) {
        console.error("Failed to refresh user online:", err);
        return null;
      }
    } else {
      // Offline fallback (ONLY if not configured)
      const offlineUsers = getOfflineUsers();
      const updated = offlineUsers.find((u) => u.id === current.id);
      if (updated) {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated));
        notifyAuthChange();
        return updated;
      }
      return current;
    }
  },

  // Sign In Operation
  async signIn(email: string, pass: string): Promise<{ user: GameUser | null; error: string | null }> {
    try {
      const hashedPassword = await sha256(pass);
      const normalizedEmail = email.trim().toLowerCase();

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from("game_users")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("password", hashedPassword)
            .maybeSingle();

          if (error) {
            console.error("Supabase signIn error:", error);
            return { user: null, error: `خطأ في الاتصال بقاعدة البيانات: ${error.message}` };
          }
          
          if (!data) {
            return { user: null, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة ❌" };
          }

          // Save session
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(data));
          notifyAuthChange();
          return { user: data as GameUser, error: null };
        } catch (err: any) {
          console.error("Supabase signin exception:", err);
          return { user: null, error: `فشل تسجيل الدخول: ${err.message}` };
        }
      }

      // Offline fallback (ONLY if not configured)
      const users = getOfflineUsers();
      const found = users.find((u) => u.email === normalizedEmail && u.password === hashedPassword);
      if (!found) {
        return { user: null, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة ❌" };
      }

      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(found));
      notifyAuthChange();
      return { user: found, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || "حدث خطأ غير متوقع أثناء تسجيل الدخول." };
    }
  },

  // Sign Up Operation
  async signUp(
    email: string,
    pass: string,
    name: string,
    teamName: string,
    teamAbbreviation: string,
    teamLogo: string,
    country: string,
    role: "player" | "admin" = "player"
  ): Promise<{ user: GameUser | null; error: string | null }> {
    try {
      const hashedPassword = await sha256(pass);
      const normalizedEmail = email.trim().toLowerCase();
      const cleanTeamName = teamName.trim();
      const cleanTeamAbbr = teamAbbreviation.trim().toUpperCase();
      const cleanLogo = teamLogo.trim();

      if (cleanTeamAbbr.length !== 3) {
        return { user: null, error: "يجب أن يتكون اختصار الفريق من 3 حروف بالضبط ⚠️" };
      }

      const defaultSettings: MatchSettings = {
        difficulty: "normal",
        matchDuration: 180,
        legendPercentage: 30,
        maxDrawsPerTurn: 2,
        maxMovesPerTurn: 3,
        initialCardsCount: 5,
        legendBurnLimit: 2,
        maxBonusValue: 10,
        gameMode: "time",
        winningGoals: 5,
        totalRounds: 10,
        halfTimeBreakDuration: 30,
      };

      if (isSupabaseConfigured && supabase) {
        try {
          // Check if email already exists
          const { data: existing, error: checkError } = await supabase
            .from("game_users")
            .select("id")
            .eq("email", normalizedEmail)
            .maybeSingle();

          if (checkError) {
            console.error("Supabase signUp email check error:", checkError);
            return { user: null, error: `فشل التحقق من البريد الإلكتروني: ${checkError.message}` };
          }

          if (existing) {
            return { user: null, error: "هذا البريد الإلكتروني مسجل بالفعل بالنظام ⚠️" };
          }

          const newUserPayload = {
            email: normalizedEmail,
            password: hashedPassword,
            name: name.trim(),
            team_name: cleanTeamName,
            team_abbreviation: cleanTeamAbbr,
            team_logo: cleanLogo || "⚽",
            country,
            role,
            coins: 1000,
            default_match_settings: defaultSettings,
          };

          const { data, error } = await supabase
            .from("game_users")
            .insert([newUserPayload])
            .select()
            .single();

          if (error || !data) {
            console.error("Supabase insert user error:", error);
            return { user: null, error: `فشل في تسجيل الحساب: ${error?.message || "بيانات فارغة"}` };
          }

          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(data));
          notifyAuthChange();
          return { user: data as GameUser, error: null };
        } catch (err: any) {
          console.error("Supabase signup exception:", err);
          return { user: null, error: `فشل تسجيل الحساب: ${err.message}` };
        }
      }

      // Offline fallback (ONLY if not configured)
      const users = getOfflineUsers();
      const existing = users.find((u) => u.email === normalizedEmail);
      if (existing) {
        return { user: null, error: "هذا البريد الإلكتروني مسجل بالفعل بالنظام ⚠️" };
      }

      const newOfflineUser: GameUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        team_name: cleanTeamName,
        team_abbreviation: cleanTeamAbbr,
        team_logo: cleanLogo || "⚽",
        country,
        role,
        coins: 1000,
        default_match_settings: defaultSettings,
      };

      users.push(newOfflineUser);
      saveOfflineUsers(users);

      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newOfflineUser));
      notifyAuthChange();
      return { user: newOfflineUser, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || "حدث خطأ غير متوقع أثناء التسجيل." };
    }
  },

  // Update User Profile Details
  async updateProfile(
    name: string,
    teamName: string,
    teamAbbreviation: string,
    teamLogo: string,
    country: string
  ): Promise<{ user: GameUser | null; error: string | null }> {
    const current = this.getCurrentUser();
    if (!current) return { user: null, error: "لا توجد جلسة مستخدم نشطة ❌" };

    const cleanTeamAbbr = teamAbbreviation.trim().toUpperCase();
    if (cleanTeamAbbr.length !== 3) {
      return { user: null, error: "يجب أن يتكون اختصار الفريق من 3 حروف بالضبط ⚠️" };
    }

    const updates = {
      name: name.trim(),
      team_name: teamName.trim(),
      team_abbreviation: cleanTeamAbbr,
      team_logo: teamLogo.trim(),
      country,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("game_users")
          .update(updates)
          .eq("id", current.id)
          .select()
          .single();

        if (error) {
          console.error("Supabase updateProfile error:", error);
          return { user: null, error: `فشل تحديث الملف الشخصي سحابياً: ${error.message}` };
        } else if (data) {
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(data));
          notifyAuthChange();
          return { user: data as GameUser, error: null };
        }
      } catch (err: any) {
        console.error("Supabase profile update exception:", err);
        return { user: null, error: err.message || "حدث خطأ أثناء تحديث الملف الشخصي." };
      }
    } else {
      // Offline fallback (ONLY if not configured)
      const users = getOfflineUsers();
      const idx = users.findIndex((u) => u.id === current.id);
      if (idx === -1) {
        return { user: null, error: "المستخدم غير موجود بالنظام المحلي." };
      }

      const updatedUser = {
        ...users[idx],
        ...updates,
      };

      users[idx] = updatedUser;
      saveOfflineUsers(users);

      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
      notifyAuthChange();
      return { user: updatedUser, error: null };
    }
    return { user: null, error: "فشل غير معروف في التحديث." };
  },

  // Update Match Settings
  async updateDefaultSettings(settings: MatchSettings): Promise<{ user: GameUser | null; error: string | null }> {
    const current = this.getCurrentUser();
    if (!current) return { user: null, error: "لا توجد جلسة مستخدم نشطة ❌" };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("game_users")
          .update({ default_match_settings: settings })
          .eq("id", current.id)
          .select()
          .single();

        if (error) {
          console.error("Supabase updateDefaultSettings error:", error);
          return { user: null, error: `فشل تحديث الإعدادات سحابياً: ${error.message}` };
        } else if (data) {
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(data));
          notifyAuthChange();
          return { user: data as GameUser, error: null };
        }
      } catch (err: any) {
        console.error("Supabase settings update exception:", err);
        return { user: null, error: err.message || "حدث خطأ أثناء تحديث الإعدادات الافتراضية." };
      }
    } else {
      // Offline fallback
      const users = getOfflineUsers();
      const idx = users.findIndex((u) => u.id === current.id);
      if (idx === -1) {
        return { user: null, error: "المستخدم غير موجود بالنظام المحلي." };
      }

      const updatedUser = {
        ...users[idx],
        default_match_settings: settings,
      };

      users[idx] = updatedUser;
      saveOfflineUsers(users);

      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
      notifyAuthChange();
      return { user: updatedUser, error: null };
    }
    return { user: null, error: "فشل غير معروف في التحديث." };
  },

  // Change Password with old/new matching check
  async changePassword(oldPass: string, newPass: string): Promise<{ success: boolean; error: string | null }> {
    const current = this.getCurrentUser();
    if (!current) return { success: false, error: "لا توجد جلسة مستخدم نشطة ❌" };

    try {
      const hashedOld = await sha256(oldPass);
      const hashedNew = await sha256(newPass);

      if (isSupabaseConfigured && supabase) {
        try {
          // Verify old password first
          const { data: userRecord, error: fetchErr } = await supabase
            .from("game_users")
            .select("password")
            .eq("id", current.id)
            .single();

          if (fetchErr || !userRecord) {
            console.error("Supabase changePassword verification error:", fetchErr);
            return { success: false, error: `فشل التحقق من كلمة المرور: ${fetchErr?.message || "المستخدم غير موجود"}` };
          }

          if (userRecord.password !== hashedOld) {
            return { success: false, error: "كلمة المرور القديمة التي أدخلتها غير صحيحة ❌" };
          }

          // Update to new password
          const { error: updateErr } = await supabase
            .from("game_users")
            .update({ password: hashedNew })
            .eq("id", current.id);

          if (updateErr) {
            console.error("Supabase changePassword update error:", updateErr);
            return { success: false, error: `فشل تحديث كلمة المرور: ${updateErr.message}` };
          }

          return { success: true, error: null };
        } catch (err: any) {
          console.error("Supabase password change exception:", err);
          return { success: false, error: err.message || "حدث خطأ أثناء تغيير كلمة المرور." };
        }
      } else {
        // Offline fallback
        const users = getOfflineUsers();
        const idx = users.findIndex((u) => u.id === current.id);
        if (idx === -1) {
          return { success: false, error: "المستخدم غير موجود بالنظام المحلي." };
        }

        if (users[idx].password !== hashedOld) {
          return { success: false, error: "كلمة المرور القديمة التي أدخلتها غير صحيحة ❌" };
        }

        users[idx].password = hashedNew;
        saveOfflineUsers(users);

        // Update active session memory too
        const updatedUser = {
          ...current,
          password: hashedNew,
        };
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));

        return { success: true, error: null };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "حدث خطأ غير متوقع أثناء تغيير كلمة المرور." };
    }
  },

  // Add Coins
  async addCoins(amount: number): Promise<number> {
    const current = this.getCurrentUser();
    if (!current) return 0;

    const newBalance = current.coins + amount;
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("game_users")
          .update({ coins: newBalance })
          .eq("id", current.id);

        if (error) {
          console.error("Supabase addCoins error:", error);
          return current.coins;
        }

        const updatedUser = { ...current, coins: newBalance };
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
        notifyAuthChange();
        return newBalance;
      } else {
        const offlineUsers = getOfflineUsers();
        const idx = offlineUsers.findIndex((u) => u.id === current.id);
        if (idx !== -1) {
          offlineUsers[idx].coins = newBalance;
          saveOfflineUsers(offlineUsers);
        }

        const updatedUser = { ...current, coins: newBalance };
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
        notifyAuthChange();
        return newBalance;
      }
    } catch {
      return current.coins;
    }
  },

  // Sign Out Operation
  signOut() {
    localStorage.removeItem(USER_SESSION_KEY);
    notifyAuthChange();
  },
};
