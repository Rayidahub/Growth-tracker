-- ============================================================
-- PRODUCTIVITY TRACKER — SUPABASE SCHEMA
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  full_name       TEXT        NOT NULL DEFAULT '',
  start_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  current_phase   TEXT        NOT NULL DEFAULT 'Phase 1',
  github_username TEXT,
  portfolio_url   TEXT,
  linkedin_url    TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_email_key UNIQUE (email)
);

-- ============================================================
-- TABLE: daily_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id                          UUID        NOT NULL DEFAULT uuid_generate_v4(),
  user_id                     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date                    DATE        NOT NULL DEFAULT CURRENT_DATE,

  -- Activity tracking
  deep_work_hours             DECIMAL(4,2) NOT NULL DEFAULT 0,
  learn2earn_tasks_completed  TEXT[]      NOT NULL DEFAULT '{}',
  frontend_topics             TEXT[]      NOT NULL DEFAULT '{}',
  product_design_practice     TEXT[]      NOT NULL DEFAULT '{}',
  github_commits              INTEGER     NOT NULL DEFAULT 0,
  portfolio_project_name      TEXT,
  portfolio_progress_percent  INTEGER     NOT NULL DEFAULT 0,
  ai_tools_used               TEXT[]      NOT NULL DEFAULT '{}',

  -- Reflections
  biggest_learning            TEXT        NOT NULL DEFAULT '',
  biggest_challenge           TEXT        NOT NULL DEFAULT '',
  bug_solved                  TEXT        NOT NULL DEFAULT '',
  public_documentation_done   BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Scoring (individual pillars)
  coding_score    INTEGER     NOT NULL DEFAULT 0,
  product_score   INTEGER     NOT NULL DEFAULT 0,
  docs_score      INTEGER     NOT NULL DEFAULT 0,
  brand_score     INTEGER     NOT NULL DEFAULT 0,
  portfolio_score INTEGER     NOT NULL DEFAULT 0,
  discipline_score INTEGER    NOT NULL DEFAULT 0,
  health_score    INTEGER     NOT NULL DEFAULT 0,

  -- Generated total
  total_score     INTEGER     GENERATED ALWAYS AS (
    coding_score + product_score + docs_score + brand_score +
    portfolio_score + discipline_score + health_score
  ) STORED,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT daily_logs_pkey           PRIMARY KEY (id),
  CONSTRAINT daily_logs_user_date_key  UNIQUE (user_id, log_date),
  CONSTRAINT coding_score_range        CHECK (coding_score    BETWEEN 0 AND 25),
  CONSTRAINT product_score_range       CHECK (product_score   BETWEEN 0 AND 15),
  CONSTRAINT docs_score_range          CHECK (docs_score      BETWEEN 0 AND 15),
  CONSTRAINT brand_score_range         CHECK (brand_score     BETWEEN 0 AND 10),
  CONSTRAINT portfolio_score_range     CHECK (portfolio_score BETWEEN 0 AND 15),
  CONSTRAINT discipline_score_range    CHECK (discipline_score BETWEEN 0 AND 10),
  CONSTRAINT health_score_range        CHECK (health_score    BETWEEN 0 AND 10),
  CONSTRAINT portfolio_progress_range  CHECK (portfolio_progress_percent BETWEEN 0 AND 100),
  CONSTRAINT deep_work_hours_positive  CHECK (deep_work_hours >= 0),
  CONSTRAINT github_commits_positive   CHECK (github_commits  >= 0)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS daily_logs_user_id_idx  ON public.daily_logs(user_id);
CREATE INDEX IF NOT EXISTS daily_logs_log_date_idx ON public.daily_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS profiles_email_idx       ON public.profiles(email);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER daily_logs_updated_at
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- profiles: users can only read/write their own row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- daily_logs: users can only CRUD their own logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own logs"   ON public.daily_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can delete own logs" ON public.daily_logs;

CREATE POLICY "Users can view own logs"
  ON public.daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON public.daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON public.daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles   TO authenticated;
GRANT ALL ON public.daily_logs TO authenticated;
GRANT SELECT ON public.profiles   TO anon;
