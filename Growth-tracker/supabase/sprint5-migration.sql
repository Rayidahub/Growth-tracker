-- ============================================================
-- SPRINT 5 MIGRATION — AI Weekly Recap
-- Run in Supabase SQL Editor AFTER sprint4-migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.weekly_recaps (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Week identification (Monday of the week)
  week_start      DATE        NOT NULL,
  week_end        DATE        NOT NULL,

  -- Raw data snapshot used to generate this recap (for reproducibility)
  logs_snapshot   JSONB       NOT NULL DEFAULT '[]',
  prev_logs_snapshot JSONB    NOT NULL DEFAULT '[]',

  -- Claude's generated recap sections (structured JSON)
  recap_data      JSONB       NOT NULL DEFAULT '{}',

  -- The full markdown text (for display / copy)
  recap_text      TEXT        NOT NULL DEFAULT '',

  -- Metadata
  model_used      TEXT        NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  tokens_used     INTEGER     NOT NULL DEFAULT 0,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT weekly_recaps_pkey           PRIMARY KEY (id),
  CONSTRAINT weekly_recaps_user_week_key  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS weekly_recaps_user_id_idx   ON public.weekly_recaps(user_id);
CREATE INDEX IF NOT EXISTS weekly_recaps_week_start_idx ON public.weekly_recaps(week_start DESC);

ALTER TABLE public.weekly_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recaps"
  ON public.weekly_recaps FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.weekly_recaps TO authenticated;
