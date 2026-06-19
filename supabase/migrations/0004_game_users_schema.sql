-- =====================================================
-- Mortada Card Game - Custom Users Schema (v4)
-- =====================================================

-- ─── Game Users Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS game_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, -- Client-side SHA-256 hashed password
  name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  team_abbreviation TEXT NOT NULL CHECK (length(team_abbreviation) = 3),
  team_logo TEXT NOT NULL,
  country TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  coins INTEGER NOT NULL DEFAULT 1000 CHECK (coins >= 0),
  default_match_settings JSONB NOT NULL DEFAULT '{
    "difficulty": "normal",
    "matchDuration": 180,
    "legendPercentage": 30,
    "maxDrawsPerTurn": 2,
    "maxMovesPerTurn": 3,
    "initialCardsCount": 5,
    "legendBurnLimit": 2,
    "maxBonusValue": 10
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_game_users_email ON game_users(email);

-- ─── Auto-update updated_at ──────────────────────────
CREATE TRIGGER update_game_users_updated_at
  BEFORE UPDATE ON game_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security ──────────────────────────────
ALTER TABLE game_users ENABLE ROW LEVEL SECURITY;

-- Open policies for client-side authentication operations
CREATE POLICY "Anyone can perform operations on game_users" ON game_users FOR ALL USING (true) WITH CHECK (true);
