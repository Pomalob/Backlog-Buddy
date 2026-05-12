import type { Project, KanbanData, ActivityItem, DashboardData, UserOut, MilestoneOut, RiskOut } from './types';

const BASE = '/api/v1';
const TOKEN_KEY = 'bb_access_token';
const REFRESH_KEY = 'bb_refresh_token';

// ─── Token management ────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token);
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_KEY);
}

export function clearAllTokens() {
  clearToken();
  clearRefreshToken();
}

// ─── 401 handler ─────────────────────────────────────────────────────────────

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

// ─── Base fetch ──────────────────────────────────────────────────────────────

async function req<T>(url: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (res.status === 401 && !isRetry) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setToken(data.access_token);
          setRefreshToken(data.refresh_token);
          return req<T>(url, options, true);
        }
      } catch {
        // refresh failed
      }
    }
    clearAllTokens();
    onUnauthorized?.();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${url}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── API surface ─────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      req<{ access_token: string; refresh_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, display_name?: string) =>
      req<{ access_token: string; refresh_token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name }),
      }),
    logout: (refresh_token: string) =>
      req<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token }),
      }),
    me: () => req<UserOut>('/auth/me'),
  },

  dashboard: {
    get: () => req<DashboardData>('/dashboard'),
  },

  projects: {
    list: () => req<Project[]>('/projects'),
    create: (data: { name: string; emoji?: string; color?: string; goal?: string; status?: string; deadline?: string | null; tags?: string[] }) =>
      req<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, data: Partial<Omit<Project, 'id'>> & { deadline?: string | null }) =>
      req<Project>(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  milestones: {
    list: (projectId: string) =>
      req<MilestoneOut[]>(`/projects/${projectId}/milestones`),
    create: (projectId: string, data: { title: string; due_date?: string | null; done?: boolean }) =>
      req<MilestoneOut>(`/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, milestoneId: string, data: Partial<{ title: string; due_date: string | null; done: boolean }>) =>
      req<MilestoneOut>(`/projects/${projectId}/milestones/${milestoneId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (projectId: string, milestoneId: string) =>
      req<void>(`/projects/${projectId}/milestones/${milestoneId}`, { method: 'DELETE' }),
  },

  risks: {
    list: (projectId: string) =>
      req<RiskOut[]>(`/projects/${projectId}/risks`),
    create: (projectId: string, data: { title: string; description?: string; probability?: number; impact?: number }) =>
      req<RiskOut>(`/projects/${projectId}/risks`, { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, riskId: string, data: Partial<{ title: string; description: string; probability: number; impact: number; mitigated: boolean }>) =>
      req<RiskOut>(`/projects/${projectId}/risks/${riskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (projectId: string, riskId: string) =>
      req<void>(`/projects/${projectId}/risks/${riskId}`, { method: 'DELETE' }),
  },

  kanban: {
    get: (projectId: string) =>
      req<KanbanData>(`/projects/${projectId}/tasks/kanban`),
    update: (projectId: string, kanban: KanbanData) =>
      req<void>(`/projects/${projectId}/tasks/kanban`, {
        method: 'PUT',
        body: JSON.stringify(kanban),
      }),
  },

  notes: {
    get: (projectId: string) =>
      req<{ content: string }>(`/projects/${projectId}/notes`),
    update: (projectId: string, content: string) =>
      req<void>(`/projects/${projectId}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),
  },

  activity: {
    list: () => req<ActivityItem[]>('/activity'),
    create: (item: { action: string; what: string; to?: string; project: string; projectId?: string }) =>
      req<ActivityItem>('/activity', { method: 'POST', body: JSON.stringify(item) }),
  },
};

export async function downloadExport(): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE}/export/all`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backlog-buddy-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
