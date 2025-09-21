BEGIN;

-- Add phone fields to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- Table to store phone verification challenges (short-lived)
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_e164 text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verif_user ON public.phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verif_expires ON public.phone_verifications(expires_at);

COMMIT;
