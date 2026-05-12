import { useState, useEffect, useRef } from 'react';
import type { Screen, HealthVariant, Theme, Density, Project, KanbanData, ActivityItem, Task, UserOut, DashboardData, ThisWeekTask } from './types';
import { api, getToken, getRefreshToken, clearAllTokens, setUnauthorizedHandler, downloadExport } from './api';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectsList, Settings } from './components/ProjectsList';
import { SystemScreen } from './components/SystemScreen';
import { TweaksPanel, useTweaks, TweakSection, TweakSlider, TweakRadio } from './components/TweaksPanel';
import { QuickCapture } from './components/QuickCapture';
import { NewProjectModal } from './components/NewProjectModal';
import { IconPlus } from './components/icons';

const TWEAK_DEFAULTS = {
  theme: 'dark' as Theme,
  density: 'comfortable' as Density,
  radius: 8,
  healthVariant: 'gauge' as HealthVariant,
};

const EMPTY_KANBAN: KanbanData = { Backlog: [], 'In Progress': [], Review: [], Done: [] };
const EMPTY_DASHBOARD: DashboardData = {
  total_projects: 0,
  active_projects: 0,
  total_tasks_done: 0,
  velocity: new Array(28).fill(0),
  tasks_this_week: [],
};

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(isLoggedIn);

  const [projects, setProjects] = useState<Project[]>([]);
  const [kanbans, setKanbans] = useState<Record<string, KanbanData>>({});
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DASHBOARD);

  const kanbanTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setProjects([]);
      setActivity([]);
      setDashboardData(EMPTY_DASHBOARD);
    });
  }, []);

  useEffect(() => {
    document.body.className = `theme-${tweaks.theme} density-${tweaks.density}`;
    document.documentElement.style.setProperty('--radius', `${tweaks.radius}px`);
  }, [tweaks.theme, tweaks.density, tweaks.radius]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') { setCaptureOpen(false); setTweaksOpen(false); setNewProjectOpen(false); }
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setCaptureOpen(v => !v); }
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setTweaksOpen(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    Promise.all([
      api.auth.me(),
      api.projects.list(),
      api.activity.list(),
      api.dashboard.get(),
    ])
      .then(([user, projs, acts, dash]) => {
        setCurrentUser(user);
        setProjects(projs);
        setActivity(acts);
        setDashboardData(dash);
        if (projs.length > 0) {
          const firstId = projs[0].id;
          setActiveProjectId(firstId);
          return api.kanban.get(firstId).then(k => {
            setKanbans({ [firstId]: k });
          });
        }
      })
      .catch(err => console.error('Init failed:', err))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleAuth = (user: UserOut) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      const rt = getRefreshToken() || '';
      if (rt) await api.auth.logout(rt);
    } catch {
      // ignore
    }
    clearAllTokens();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setProjects([]);
    setActivity([]);
    setKanbans({});
    setDashboardData(EMPTY_DASHBOARD);
    setScreen('dashboard');
  };

  const getKanban = (projectId: string): KanbanData =>
    kanbans[projectId] ?? EMPTY_KANBAN;

  const handleKanbanChange = (projectId: string, data: KanbanData) => {
    setKanbans(prev => ({ ...prev, [projectId]: data }));
    clearTimeout(kanbanTimers.current[projectId]);
    kanbanTimers.current[projectId] = setTimeout(() => {
      api.kanban.update(projectId, data).catch(console.error);
    }, 800);
  };

  const addActivity = (item: ActivityItem, projectId?: string) => {
    setActivity(prev => [item, ...prev.slice(0, 19)]);
    api.activity.create({
      action: item.action,
      what: item.what,
      to: item.to,
      project: item.project,
      projectId,
    }).catch(console.error);
  };

  const handleNav = (id: Screen, projectId?: string) => {
    if (id === 'project-detail' && projectId) {
      setActiveProjectId(projectId);
      setScreen('project-detail');
      if (!kanbans[projectId]) {
        api.kanban.get(projectId)
          .then(k => setKanbans(prev => ({ ...prev, [projectId]: k })))
          .catch(console.error);
      }
    } else {
      setScreen(id);
    }
  };

  const handleCapture = (title: string, projectId: string, priority: Task['priority']) => {
    const task: Task = {
      id: genId(),
      title,
      priority,
      subtaskDone: 0,
      subtaskTotal: 0,
      comments: 0,
    };
    const kanban = getKanban(projectId);
    handleKanbanChange(projectId, { ...kanban, Backlog: [task, ...kanban.Backlog] });
    const proj = projects.find(p => p.id === projectId);
    addActivity(
      { who: 'you', action: 'captured', what: title, project: proj?.name || '', when: 'just now' },
      projectId,
    );
  };

  const handleProjectUpdate = (projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
  };

  const handleAddProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
    addActivity(
      { who: 'you', action: 'created', what: project.name, project: project.name, when: 'just now' },
      project.id,
    );
    api.dashboard.get().then(setDashboardData).catch(console.error);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) ?? projects[0];

  if (!isLoggedIn) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'hsl(var(--surface-0))',
        color: 'hsl(var(--muted-foreground))', fontSize: 13,
        flexDirection: 'column', gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>BB</span>
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'hsl(var(--surface-0))' }}>
      <Sidebar
        active={screen}
        onNav={handleNav}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(v => !v)}
        projects={projects}
        onLogout={handleLogout}
        onNewProject={() => setNewProjectOpen(true)}
        userName={currentUser?.display_name || ''}
      />
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {screen === 'dashboard' && (
          <Dashboard
            projects={projects}
            activity={activity}
            onOpenProject={(id) => handleNav('project-detail', id)}
            onNewProject={() => setNewProjectOpen(true)}
            healthVariant={tweaks.healthVariant}
            setHealthVariant={(v) => setTweak('healthVariant', v)}
            velocity={dashboardData.velocity}
            totalTasksDone={dashboardData.total_tasks_done}
            tasksThisWeek={dashboardData.tasks_this_week as ThisWeekTask[]}
            userName={currentUser?.display_name || ''}
          />
        )}
        {screen === 'projects' && (
          <ProjectsList
            projects={projects}
            onOpenProject={(id) => handleNav('project-detail', id)}
            onNewProject={() => setNewProjectOpen(true)}
            healthVariant={tweaks.healthVariant}
          />
        )}
        {screen === 'project-detail' && activeProject && (
          <ProjectDetail
            project={activeProject}
            kanban={getKanban(activeProject.id)}
            onKanbanChange={(data) => handleKanbanChange(activeProject.id, data)}
            addActivity={addActivity}
            onBack={() => setScreen('projects')}
            onProjectUpdate={(updates) => handleProjectUpdate(activeProject.id, updates)}
          />
        )}
        {screen === 'system' && <SystemScreen />}
        {screen === 'settings' && (
          <Settings
            user={currentUser}
            onExport={() => downloadExport().catch(console.error)}
          />
        )}
      </main>

      <button
        onClick={() => setCaptureOpen(true)}
        title="Quick Capture (C)"
        style={{
          position: 'fixed', right: 24, bottom: 24,
          width: 48, height: 48, borderRadius: 999,
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          border: '1px solid hsl(var(--primary) / 0.5)',
          boxShadow: '0 12px 28px -8px hsl(var(--primary) / 0.5), 0 1px 0 rgba(255,255,255,.2) inset',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'default', zIndex: 50, transition: 'transform 160ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)'}
        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}
      >
        <IconPlus size={20} strokeWidth={2.4} />
      </button>

      <button
        onClick={() => setTweaksOpen(v => !v)}
        title="Tweaks (T)"
        style={{
          position: 'fixed', right: 82, bottom: 30, height: 28, padding: '0 10px',
          borderRadius: 999, background: 'hsl(var(--surface-2))',
          color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))',
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'default', zIndex: 50, fontSize: 11, fontWeight: 500,
          transition: 'background 80ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface-3))'}
        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface-2))'}
      >
        <span style={{ fontSize: 11 }}>Tweaks</span>
        <span className="font-mono" style={{ fontSize: 10, opacity: 0.6 }}>T</span>
      </button>

      {captureOpen && projects.length > 0 && (
        <QuickCapture
          projects={projects}
          activeProjectId={activeProjectId || projects[0].id}
          onCapture={handleCapture}
          onClose={() => setCaptureOpen(false)}
        />
      )}

      {newProjectOpen && (
        <NewProjectModal
          onClose={() => setNewProjectOpen(false)}
          onAdd={handleAddProject}
        />
      )}

      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)}>
        <TweakSection label="Theme" />
        <TweakRadio<Theme> label="Mode" value={tweaks.theme} options={['dark', 'light']} onChange={(v) => setTweak('theme', v)} />
        <TweakRadio<Density> label="Density" value={tweaks.density} options={['compact', 'comfortable']} onChange={(v) => setTweak('density', v)} />
        <TweakSlider label="Radius" value={tweaks.radius} min={0} max={16} step={1} unit="px" onChange={(v) => setTweak('radius', v)} />
        <TweakSection label="Components" />
        <TweakRadio<HealthVariant> label="Health Score" value={tweaks.healthVariant} options={['ring', 'gauge', 'bar']} onChange={(v) => setTweak('healthVariant', v)} />
      </TweaksPanel>
    </div>
  );
}
