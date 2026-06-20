-- =====================================================
-- Mortada Card Game - Multiplayer Rooms Schema (v5)
-- =====================================================

-- ─── Rooms Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    host_id TEXT NOT NULL,
    host_name TEXT NOT NULL,
    host_vibe TEXT NOT NULL,
    opponent_id TEXT,
    opponent_name TEXT,
    opponent_vibe TEXT,
    status TEXT NOT NULL DEFAULT 'waiting',
    current_turn TEXT NOT NULL DEFAULT 'host',
    game_state JSONB,
    last_activity BIGINT NOT NULL,
    host_confirmed BOOLEAN DEFAULT false,
    opponent_confirmed BOOLEAN DEFAULT false
);

-- ─── Add room_name and is_private if missing ───────
ALTER TABLE public.rooms 
    ADD COLUMN IF NOT EXISTS room_name TEXT DEFAULT 'غرفة مرتدة',
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- ─── Enable RLS ───────────────────────────────────────
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- ─── Policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public select" ON public.rooms;
DROP POLICY IF EXISTS "Allow public insert" ON public.rooms;
DROP POLICY IF EXISTS "Allow public update" ON public.rooms;
DROP POLICY IF EXISTS "Allow public delete" ON public.rooms;

CREATE POLICY "Allow public select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.rooms FOR DELETE USING (true);

-- ─── Grant Privileges ─────────────────────────────────
GRANT ALL ON TABLE public.rooms TO anon, authenticated, service_role;
