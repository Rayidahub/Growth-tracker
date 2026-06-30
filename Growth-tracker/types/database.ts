// types/database.ts  — Sprint 4 update (adds GitHub types)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles:        { Row: Profile;        Insert: ProfileInsert;        Update: ProfileUpdate        }
      daily_logs:      { Row: DailyLog;       Insert: DailyLogInsert;       Update: DailyLogUpdate       }
      github_tokens:   { Row: GitHubToken;    Insert: GitHubTokenInsert;    Update: GitHubTokenUpdate    }
      github_activity: { Row: GitHubActivity; Insert: GitHubActivityInsert; Update: GitHubActivityUpdate }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export interface Profile {
  id: string; email: string; full_name: string; start_date: string
  current_phase: string; github_username: string | null
  portfolio_url: string | null; linkedin_url: string | null
  avatar_url: string | null
  github_connected: boolean
  github_last_synced: string | null
  github_user_id: number | null
  created_at: string; updated_at: string
}
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>

export interface DailyLog {
  id: string; user_id: string; log_date: string; deep_work_hours: number
  learn2earn_tasks_completed: string[]; frontend_topics: string[]
  product_design_practice: string[]; github_commits: number
  portfolio_project_name: string | null; portfolio_progress_percent: number
  ai_tools_used: string[]; biggest_learning: string; biggest_challenge: string
  bug_solved: string; public_documentation_done: boolean
  coding_score: number; product_score: number; docs_score: number
  brand_score: number; portfolio_score: number; discipline_score: number
  health_score: number; total_score: number; created_at: string; updated_at: string
}
export type DailyLogInsert = Omit<DailyLog, 'id' | 'total_score' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
export type DailyLogUpdate = Partial<Omit<DailyLog, 'id' | 'user_id' | 'total_score' | 'created_at'>>

export interface GitHubToken {
  id: string; user_id: string; access_token: string
  token_type: string; scope: string; created_at: string; updated_at: string
}
export type GitHubTokenInsert = Omit<GitHubToken, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
export type GitHubTokenUpdate = Partial<Pick<GitHubToken, 'access_token' | 'scope'>>

export interface RepoBreakdown { repo: string; full_name: string; commits: number; language: string | null; url: string; additions: number; deletions: number }
export interface PRDetail { number: number; title: string; repo: string; state: 'open' | 'closed' | 'merged'; url: string; created_at: string; merged_at: string | null }

export interface GitHubActivity {
  id: string; user_id: string; activity_date: string; total_commits: number
  repos_committed: string[]; repo_breakdown: RepoBreakdown[]
  languages: Record<string, number>; prs_opened: number; prs_merged: number
  prs_reviewed: number; pr_details: PRDetail[]; issues_opened: number
  issues_closed: number; commit_messages: string[]; stars_received: number
  synced_at: string; created_at: string; updated_at: string
}
export type GitHubActivityInsert = Omit<GitHubActivity, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
export type GitHubActivityUpdate = Partial<Omit<GitHubActivity, 'id' | 'user_id' | 'created_at'>>

export interface ScoreBreakdown { coding: number; product: number; docs: number; brand: number; portfolio: number; discipline: number; health: number; total: number }
export const SCORE_MAXES: ScoreBreakdown = { coding: 25, product: 15, docs: 15, brand: 10, portfolio: 15, discipline: 10, health: 10, total: 100 }