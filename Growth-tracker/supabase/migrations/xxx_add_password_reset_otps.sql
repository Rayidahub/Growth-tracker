-- ============================================================
-- PASSWORD RESET OTP TABLE
-- ============================================================
-- Stores short-lived OTP codes for custom email-based password reset.
-- OTPs are hashed before storage and expire after 10 minutes.

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by user and expiry cleanup
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id
  ON public.password_reset_otps(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at
  ON public.password_reset_otps(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON public.password_reset_otps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
