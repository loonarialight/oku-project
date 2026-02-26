// src/types/api.ts
// ⚠️ Place this file at: src/types/api.ts  (create the types/ folder)

export interface LoginResponse { token: string }

export interface UserStats {
  id: number;
  name: string;
  xp: number;
  level: number;
  streak: number;
  xpToNextLevel: number;
  xpForCurrentLevel: number;
  tasksCompleted: number;
  topicsCompleted: number;
}

export interface StreakResponse { streak: number }

export interface DailyRow {
  date: string;
  total_minutes: string;
}

export interface HourRow {
  hour: number;
  sessions_count: number;
  total_minutes: number;
}

export interface SubjectAnalyticsRow {
  name: string;
  sessions_count: number;
  total_minutes: number;
}

export interface Subject { id: number; name: string }

export interface SessionRow {
  id: number;
  user_id: number;
  subject_id: number;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
}

export interface TopicListItem {
  id: number;
  title: string;
  description: string;
  xp_reward: number;
  tasks_total: number;
}

export interface TopicDetail {
  id: number;
  title: string;
  subject: string;
  grade: number;
  theory: string;
  xp_reward: number;
  tasks_total: number;
}

export interface Task {
  id: number;
  question: string;
  type: "text" | "choice";
  options?: string[];
  hint?: string;
}

export type TopicStatus = "not_started" | "in_progress" | "completed";

export interface TopicProgress {
  topic_id: number;
  status: TopicStatus;
  progress: number;
  tasks_done: number;
}

export interface SubmitResponse {
  correct: boolean;
  xp_earned: number;
  correct_answer?: string;
  explanation?: string;
  topic_completed?: boolean;
  new_xp?: number;
  new_level?: number;
}