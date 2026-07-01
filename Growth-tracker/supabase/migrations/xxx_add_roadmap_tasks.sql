-- ============================================================
-- ROADMAP TASKS
-- Adds learning_stacks to profiles and task_completions table.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS learning_stacks TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.task_completions (
  id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id     TEXT        NOT NULL,
  task_date   DATE        NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT task_completions_pkey PRIMARY KEY (id),
  CONSTRAINT task_completions_user_task_key UNIQUE (user_id, task_id)
);

CREATE INDEX IF NOT EXISTS task_completions_user_id_idx ON public.task_completions(user_id);
CREATE INDEX IF NOT EXISTS task_completions_task_date_idx ON public.task_completions(task_date DESC);

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own task completions"
  ON public.task_completions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.task_completions TO authenticated;
