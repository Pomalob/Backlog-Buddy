export type ProjectStatus = 'idea' | 'active' | 'paused' | 'done' | 'archived';
export type TaskPriority = 'low' | 'med' | 'high';
export type HealthVariant = 'ring' | 'gauge' | 'bar';
export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'comfortable';

export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: string;
  goal: string;
  status: ProjectStatus;
  health: number;
  progress: number;
  due: string;
  deadline_iso?: string | null;
  tags: string[];
  velocity: number[];
  lastActive: string;
  zombie?: boolean;
}

export interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  due?: string;
  overdue?: boolean;
  tags?: string[];
  subtaskDone: number;
  subtaskTotal: number;
  comments: number;
  assignee?: string;
}

export interface KanbanData {
  Backlog: Task[];
  'In Progress': Task[];
  Review: Task[];
  Done: Task[];
}

export interface ActivityItem {
  who: string;
  action: string;
  what: string;
  to?: string;
  project: string;
  when: string;
}

export interface Milestone {
  id: string;
  label: string;
  date: string;
  state: 'done' | 'active' | 'todo';
  offset: number;
}

export interface Risk {
  id: string;
  title: string;
  probability: number;
  impact: number;
  mitigation?: string;
}

export interface TweakValues {
  theme: Theme;
  density: Density;
  radius: number;
  healthVariant: HealthVariant;
}

export type Screen = 'dashboard' | 'projects' | 'project-detail' | 'system' | 'settings';

export interface UserOut {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string;
  notify_telegram: boolean;
  notify_email: boolean;
}

export interface ThisWeekTask {
  id: string;
  title: string;
  project: string;
  due: string;
  overdue: boolean;
  priority: string;
}

export interface DashboardData {
  total_projects: number;
  active_projects: number;
  total_tasks_done: number;
  velocity: number[];
  tasks_this_week: ThisWeekTask[];
}

export interface MilestoneOut {
  id: string;
  project_id: string;
  title: string;
  due_date: string | null;
  done: boolean;
  created_at: string;
}

export interface RiskOut {
  id: string;
  project_id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high';
  probability: number;
  impact: number;
  mitigated: boolean;
}
