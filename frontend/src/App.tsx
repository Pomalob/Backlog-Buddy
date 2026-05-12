import { useState, useEffect, useRef } from 'react';
import type { Screen, HealthVariant, Theme, Density, Project, KanbanData, ActivityItem, Task, UserOut, DashboardData, ThisWeekTask } from './types';
import { api, getToken, getRefreshToken, clearAllTokens, setUnauthorizedHandler, downloadExport } from './api';
import { useT } from './i18n';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectsList, Settings } from './components/ProjectsList';
import { SystemScreen } from './components/SystemScreen';
import { TweaksPanel, useTweaks, TweakSection, TweakSlider, TweakRadio } from './components/TweaksPanel';
import { IconPlus, IconLightbulb } from './components/icons';

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

// ─── Quick Capture ───────────────────────────────────────────────────────────

function QuickCapture({ projects, activeProjectId, onCapture, onClose }: {
  projects: Project[];
  activeProjectId: string;
  onCapture: (title: string, projectId: string, priority: 'low' | 'med' | 'high') => void;
  onClose: () => void;
}) {
  const t = useT();
  const [val, setVal] = useState('');
  const [pri, setPri] = useState<'low' | 'med' | 'high'>('med');
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleCapture = () => {
    if (val.trim()) onCapture(val.trim(), selectedProjectId, pri);
    onClose();
  };

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'hsl(var(--surface-0) / 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'fadeIn 120ms ease',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '92vw',
          background: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border-strong))',
          borderRadius: 'var(--radius)',
          boxShadow: '0 24px 80px -8px rgba(0,0,0,.6)',
          overflow: 'hidden',
          animation: 'popIn 160ms cubic-bezier(.2,.7,.2,1)',
        }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconLightbulb size={15} style={{ color: 'hsl(var(--primary))' }} />
          <span style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))' }}>{t('qc_title')}</span>
          <span style={{ marginLeft: 'auto' }}>
            <span className="font-mono" style={{ background: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))', padding: '2px 7px', borderRadius: 4, fontSize: 11 }}>Esc</span>
          </span>
        </div>
        <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCapture(); }}
          placeholder={t('qc_placeholder')}
          style={{
            width: '100%', border: 0, background: 'transparent',
            color: 'hsl(var(--foreground))',
            fontSize: 17, padding: '20px 18px', outline: 'none',
            fontFamily: 'inherit', letterSpacing: '-0.01em',
            boxSizing: 'border-box',
          }} />
        <div style={{
          borderTop: '1px solid hsl(var(--border))',
          background: 'hsl(var(--surface-1))',
        }}>
          {/* project pills — scrollable row */}
          <div style={{
            padding: '10px 18px 0',
            display: 'flex', alignItems: 'center', gap: 6,
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>{t('qc_project')}</span>
            {projects.map((p) => (
              <span key={p.id} className="bb-pill"
                onClick={() => setSelectedProjectId(p.id)}
                data-tone={selectedProjectId === p.id ? 'primary' : undefined}
                style={{ cursor: 'default', flexShrink: 0 }}>
                <span className="font-mono" style={{ fontSize: 10.5 }}>{p.emoji}</span> {p.name}
              </span>
            ))}
          </div>
          {/* priority + submit row */}
          <div style={{ padding: '8px 18px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>{t('qc_priority')}</span>
            {(['low', 'med', 'high'] as const).map((p) => (
              <span key={p} className="bb-pill"
                onClick={() => setPri(p)}
                data-tone={pri === p ? 'primary' : undefined}
                style={{ cursor: 'default' }}>{p}</span>
            ))}
            <button className="bb-btn" data-variant="primary" data-size="sm" style={{ marginLeft: 'auto' }} onClick={handleCapture}>
              {t('qc_capture')} <span className="font-mono" style={{ fontSize: 10.5, opacity: 0.7 }}>↵</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Project Modal ───────────────────────────────────────────────────────

function NewProjectModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Project) => void }) {
  const t = useT();
  const [name, setName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [goal, setGoal] = useState('');
  const [due, setDue] = useState('');
  const [tags, setTags] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      emoji: abbr.trim().toUpperCase().slice(0, 2) || name.slice(0, 2).toUpperCase(),
      color: 'hsl(var(--surface-2))',
      goal: goal.trim() || 'No goal set yet.',
      status: 'idea' as const,
      deadline: due.trim() || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    api.projects.create(payload)
      .then(created => onAdd(created))
      .catch(console.error);
    onClose();
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', background: 'hsl(var(--surface-1))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'calc(var(--radius) - 2px)',
    color: 'hsl(var(--foreground))',
    fontSize: 13.5, padding: '9px 12px',
    fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'hsl(var(--muted-foreground))',
    letterSpacing: '0.04em', textTransform: 'uppercase',
    display: 'block', marginBottom: 5,
  };

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'hsl(var(--surface-0) / 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 120ms ease',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, maxWidth: '94vw',
          background: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border-strong))',
          borderRadius: 'var(--radius)',
          boxShadow: '0 24px 80px -8px rgba(0,0,0,.6)',
          overflow: 'hidden',
          animation: 'popIn 160ms cubic-bezier(.2,.7,.2,1)',
        }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t('np_title')}</span>
          <button className="bb-btn" data-variant="ghost" data-size="icon-sm" onClick={onClose}
            style={{ fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('np_name')}</label>
              <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder={t('np_placeholder_name')} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('np_abbr')}</label>
              <input value={abbr} onChange={e => setAbbr(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="AB" maxLength={2}
                style={{ ...fieldStyle, fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.1em' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('np_goal')}</label>
            <textarea value={goal} onChange={e => setGoal(e.target.value)}
              placeholder={t('np_placeholder_goal')}
              rows={2}
              style={{ ...fieldStyle, resize: 'none', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('np_due')}</label>
              <input type="date" value={due} onChange={e => setDue(e.target.value)}
                style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('np_tags')}</label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder={t('np_placeholder_tags')} style={fieldStyle} />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--surface-1))', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="bb-btn" data-variant="ghost" onClick={onClose}>{t('np_cancel')}</button>
          <button className="bb-btn" data-variant="primary" onClick={handleCreate}
            style={{ opacity: name.trim() ? 1 : 0.5 }}>
            <IconPlus size={13} /> {t('np_create')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

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

  // Register 401 handler
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setProjects([]);
      setActivity([]);
      setDashboardData(EMPTY_DASHBOARD);
    });
  }, []);

  // Apply theme tokens
  useEffect(() => {
    document.body.className = `theme-${tweaks.theme} density-${tweaks.density}`;
    document.documentElement.style.setProperty('--radius', `${tweaks.radius}px`);
  }, [tweaks.theme, tweaks.density, tweaks.radius]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setCaptureOpen(v => !v); }
      if (e.key === 'Escape') { setCaptureOpen(false); setTweaksOpen(false); setNewProjectOpen(false); }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); setTweaksOpen(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load data after login
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

  const handleCapture = (title: string, projectId: string, priority: 'low' | 'med' | 'high') => {
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
    // refresh dashboard counts
    api.dashboard.get().then(setDashboardData).catch(console.error);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) ?? projects[0];

  // Show auth screen when not logged in
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

      {captureOpen && (
        <QuickCapture
          projects={projects}
          activeProjectId={activeProjectId}
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
