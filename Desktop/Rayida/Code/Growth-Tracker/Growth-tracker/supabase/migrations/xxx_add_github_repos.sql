-- supabase/migrations/xxx_add_github_repos.sql
CREATE TABLE IF NOT EXISTS github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_id BIGINT NOT NULL,
  repo_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  repo_url TEXT,
  commit_count INTEGER DEFAULT 0,
  last_synced TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, repo_id)
);

-- Add columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS github_repos_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS github_total_commits INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_github_repos_user_id ON github_repos(user_id);