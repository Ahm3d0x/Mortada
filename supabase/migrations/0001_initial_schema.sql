-- =====================================================
-- Mortada Card Game - Supabase Schema (v1 - Old 1-to-Many Layout)
-- =====================================================

-- ─── Packages Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '⚽',
  legend_percentage INTEGER DEFAULT 30 CHECK (legend_percentage >= 0 AND legend_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Cards Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  attack INTEGER DEFAULT 5 CHECK (attack >= 0 AND attack <= 15),
  defense INTEGER DEFAULT 5 CHECK (defense >= 0 AND defense <= 15),
  role TEXT DEFAULT 'midfielder' CHECK (role IN ('attacker', 'midfielder', 'defender', 'goalkeeper')),
  role_arabic TEXT DEFAULT 'خط وسط',
  is_legend BOOLEAN DEFAULT false,
  description TEXT DEFAULT '',
  team TEXT DEFAULT '',
  avatar TEXT DEFAULT '⚽',
  image_url TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cards_package_id ON cards(package_id);
CREATE INDEX IF NOT EXISTS idx_cards_is_legend ON cards(is_legend);

-- ─── Auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security ──────────────────────────────
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Everyone can READ (game needs to fetch cards from any device)
CREATE POLICY "Anyone can read packages" ON packages FOR SELECT USING (true);
CREATE POLICY "Anyone can read cards" ON cards FOR SELECT USING (true);

-- Write access open for now (until admin auth is added)
CREATE POLICY "Anyone can insert packages" ON packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update packages" ON packages FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete packages" ON packages FOR DELETE USING (true);

CREATE POLICY "Anyone can insert cards" ON cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cards" ON cards FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cards" ON cards FOR DELETE USING (true);
