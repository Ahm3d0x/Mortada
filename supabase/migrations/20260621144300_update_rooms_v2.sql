-- Drop the old rooms table if it exists
DROP TABLE IF EXISTS public.rooms CASCADE;

-- Create a compatible rooms table supporting both V1 and V2 schemas
CREATE TABLE public.rooms (
    -- V1 uses TEXT for room ID (6-char room code). V2 can use it as well or map to room_code.
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- V1 columns (with defaults to prevent constraint errors if V2 inserts)
    host_id TEXT NOT NULL,
    host_name TEXT NOT NULL DEFAULT 'مدرب تكتيكي',
    host_vibe TEXT NOT NULL DEFAULT 'الفراعنة',
    opponent_id TEXT,
    opponent_name TEXT,
    opponent_vibe TEXT,
    status TEXT NOT NULL DEFAULT 'waiting',
    current_turn TEXT NOT NULL DEFAULT 'host',
    current_turn_auth_id TEXT,
    game_state JSONB DEFAULT '{}'::jsonb,
    last_activity BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    host_confirmed BOOLEAN DEFAULT false,
    opponent_confirmed BOOLEAN DEFAULT false,
    room_name TEXT DEFAULT 'غرفة مرتدة',
    is_private BOOLEAN DEFAULT false,

    -- V2 columns (with defaults to remain compatible with V1 inserts)
    room_code TEXT UNIQUE,
    phase TEXT NOT NULL DEFAULT 'lobby',
    state JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies to allow public operations
CREATE POLICY "Allow public select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.rooms FOR DELETE USING (true);

-- Grant privileges
GRANT ALL ON TABLE public.rooms TO anon, authenticated, service_role;
