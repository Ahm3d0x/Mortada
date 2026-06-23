-- Migration: Add ability JSONB column to cards and special_cards tables, and migrate existing abilities.

-- 1. Add ability column to public.cards
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS ability jsonb DEFAULT NULL;

-- 2. Add ability column to public.special_cards
ALTER TABLE public.special_cards ADD COLUMN IF NOT EXISTS ability jsonb DEFAULT NULL;

-- 3. Migrate existing cards abilities from description to the dedicated ability column
-- If description starts with '{' (i.e. is a JSON string), extract 'ability' and set it,
-- then restore 'description' to the 'text' property.
UPDATE public.cards
SET
  ability = (description::jsonb->>'ability')::jsonb,
  description = COALESCE(description::jsonb->>'text', description)
WHERE description IS NOT NULL AND description LIKE '{%';

-- 4. Migrate existing special_cards if any have abilities nested in description
UPDATE public.special_cards
SET
  ability = (description::jsonb->>'ability')::jsonb,
  description = COALESCE(description::jsonb->>'text', description)
WHERE description IS NOT NULL AND description LIKE '{%';
