-- Drop the old rooms table if it exists
DROP TABLE IF EXISTS public.rooms CASCADE;

-- Create the new rooms table for Mortada V2
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    room_code TEXT NOT NULL UNIQUE,
    host_id UUID NOT NULL,
    opponent_id UUID,
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
