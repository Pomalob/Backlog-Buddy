import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { Project, KanbanData, ActivityItem, Task, MilestoneOut, RiskOut, ProjectStatus } from '../types';
import { healthState, HealthRing, Progress, KanbanCard, StatusDot } from './ui';
import { VelocitySparkline } from './Dashboard';
import { useT } from '../i18n';
import {
  IconList, IconCalendar, IconAlert, IconBox, IconChevronL,
  IconPlus, IconUser, IconTag, IconBolt, IconCheck,
  IconTrash, IconEdit, IconInfo, IconLink,
} from './icons';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_NOTES = `# Project notes

Use this space for decisions, ideas, and anything worth remembering.

## Goals
- What are you trying to achieve with this project?
- Who is this for?

## Decisions log
_Record important decisions with brief rationale. Date them._

## Ideas / backlog
_Loose thoughts that don't belong on the board yet._

## Links
- Repo:
- Design file:
- Docs: `;

// ─── Types ──────────────────────────────────────────────────────────

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  kanban: KanbanData;
  onKanbanChange: (data: KanbanData) => void;
  addActivity: (item: ActivityItem, projectId?: string) => void;
  onProjectUpdate?: (updates: Partial<Project>) => void;
}

// ─── Repo Modal ──────────────────────────────────────────────────────

function RepoModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const t = useT();
  const key = `bb_repo_${projectId}`;
  const [url, setUrl] = useState(localStorage.getItem(key) || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = () => {
    const trimmed = url.trim();
    if (trimmed) localStorage.setItem(key, trimmed);
    else localStorage.removeItem(key);
    onClose();
  };

  const handleOpen = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    localStorage.setItem(key, trimmed);
    window.open(trimmed, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleClear = () => {
    localStorage.removeItem(key);
    setUrl('');
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'hsl(var(--surface-0) / 0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 440, maxWidth: '92vw',
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border-strong))',
        borderRadius: 'var(--radius)',
        boxShadow: '0 24px 80px -8px rgba(0,0,0,.6)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t('repo_title')}</span>
          <button className="bb-btn" data-variant="ghost" data-size="icon-sm" onClick={onClose} style={{ fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{t('repo_hint')}</div>
          <div>
            <label style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
              {t('repo_label')}
            </label>
            <input
              ref={inputRef}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              placeholder={t('repo_placeholder')}
              style={{
                width: '100%', background: 'hsl(var(--surface-1))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'calc(var(--radius) - 2px)',
                color: 'hsl(var(--foreground))',
                fontSize: 13.5, padding: '8px 12px',
                fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--surface-1))', display: 'flex', gap: 8, alignItems: 'center' }}>
          {localStorage.getItem(key) && (
            <button className="bb-btn" data-variant="ghost" data-size="sm" onClick={handleClear} style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('repo_clear')}
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button className="bb-btn" data-variant="ghost" data-size="sm" onClick={onClose}>{t('repo_cancel')}</button>
          <button className="bb-btn" data-size="sm" onClick={handleOpen} style={{ opacity: url.trim() ? 1 : 0.4 }}>
            <IconLink size={12} /> {t('repo_open')}
          </button>
          <button className="bb-btn" data-variant="primary" data-size="sm" onClick={handleSave}>{t('repo_save')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Root component ─────────────────────────────────────────────────

export function ProjectDetail({ project, onBack, kanban, onKanbanChange, addActivity, onProjectUpdate }: ProjectDetailProps) {
  const t = useT();
  const [tab, setTab] = useState<'kanban' | 'timeline' | 'risks' | 'notes'>('kanban');
  const [repoModalOpen, setRepoModalOpen] = useState(false);

  const tabs = [
    { id: 'kanban'   as const, label: t('tab_kanban'),   Icon: IconList     },
    { id: 'timeline' as const, label: t('tab_timeline'), Icon: IconCalendar },
    { id: 'risks'    as const, label: t('tab_risks'),    Icon: IconAlert    },
    { id: 'notes'    as const, label: t('tab_notes'),    Icon: IconBox      },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* header */}
      <div style={{ padding: '20px 32px 0', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--surface-0))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 14 }}>
          <button className="bb-btn" data-variant="ghost" data-size="sm" onClick={onBack}>
            <IconChevronL size={12} /> {t('pd_projects')}
          </button>
          <span>/</span>
          <span>{project.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span className="font-mono" style={{
              width: 40, height: 40, borderRadius: 7,
              background: 'hsl(var(--surface-2))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.05em',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            }}>{project.emoji}</span>
            <div>
              <h1 className="t-h2" style={{ margin: 0, marginBottom: 2 }}>{project.name}</h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                <span className="bb-pill" data-tone="good"><StatusDot status={project.status} /> {t(`status_${project.status}`)}</span>
                <span>·</span>
                <span><IconCalendar size={11} style={{ verticalAlign: -1 }} /> {t('pd_due')} {project.due}</span>
                <span>·</span>
                <span>{t('pd_last_active')} {project.lastActive}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="bb-btn" onClick={() => setRepoModalOpen(true)}>
              <IconLink size={12} /> {t('pd_open_repo')}
            </button>
            <button className="bb-btn" data-variant="primary" onClick={() => setTab('kanban')}>
              <IconPlus size={13} /> {t('pd_add_task')}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, marginTop: 4 }}>
          {tabs.map((tab_item) => (
            <button key={tab_item.id} onClick={() => setTab(tab_item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 14px',
                background: 'transparent', border: 0,
                borderBottom: tab === tab_item.id ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                color: tab === tab_item.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                fontSize: 13.5, fontWeight: tab === tab_item.id ? 600 : 500,
                cursor: 'default', marginBottom: -1,
              }}
            >
              <tab_item.Icon size={13} /> {tab_item.label}
            </button>
          ))}
        </div>
      </div>

      {/* body */}
      <div key={project.id} style={{ display: 'grid', gridTemplateColumns: '1fr 280px', flex: 1, minHeight: 0 }}>
        <div style={{ overflow: 'auto', padding: 24 }}>
          {tab === 'kanban'   && (
            <KanbanBoard
              kanban={kanban}
              onChange={onKanbanChange}
              addActivity={addActivity}
              projectName={project.name}
              projectId={project.id}
            />
          )}
          {tab === 'timeline' && <Timeline projectId={project.id} />}
          {tab === 'risks'    && <RiskMatrix projectId={project.id} />}
          {tab === 'notes'    && <Notes projectId={project.id} />}
        </div>
        <ProjectSidebarPanel project={project} kanban={kanban} onUpdate={onProjectUpdate} />
      </div>

      {repoModalOpen && (
        <RepoModal projectId={project.id} onClose={() => setRepoModalOpen(false)} />
      )}
    </div>
  );
}

// ─── Sidebar panel ──────────────────────────────────────────────────

const ALL_STATUSES: ProjectStatus[] = ['idea', 'active', 'paused', 'done', 'archived'];

function ProjectSidebarPanel({
  project, kanban, onUpdate,
}: {
  project: Project;
  kanban: KanbanData;
  onUpdate?: (updates: Partial<Project>) => void;
}) {
  const t = useT();
  const totalTasks = Object.values(kanban).flat().length;
  const doneTasks = kanban['Done'].length;

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalVal, setGoalVal] = useState(project.goal);
  const goalRef = useRef<HTMLTextAreaElement>(null);

  const [newTag, setNewTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [editingDue, setEditingDue] = useState(false);
  const [dueVal, setDueVal] = useState(project.deadline_iso || '');
  const dueRef = useRef<HTMLInputElement>(null);

  const [showHealthTooltip, setShowHealthTooltip] = useState(false);

  useEffect(() => { if (editingGoal) goalRef.current?.focus(); }, [editingGoal]);
  useEffect(() => { if (addingTag) tagInputRef.current?.focus(); }, [addingTag]);
  useEffect(() => { if (editingDue) dueRef.current?.focus(); }, [editingDue]);
  useEffect(() => { setGoalVal(project.goal); }, [project.goal]);
  useEffect(() => { setDueVal(project.deadline_iso || ''); }, [project.deadline_iso]);

  const saveGoal = () => {
    const trimmed = goalVal.trim() || t('sb_no_goal');
    setEditingGoal(false);
    if (trimmed === project.goal) return;
    onUpdate?.({ goal: trimmed });
    api.projects.update(project.id, { goal: trimmed }).catch(console.error);
  };

  const removeTag = (tag: string) => {
    const tags = project.tags.filter(tg => tg !== tag);
    onUpdate?.({ tags });
    api.projects.update(project.id, { tags }).catch(console.error);
  };

  const addTag = () => {
    const tg = newTag.trim().toLowerCase();
    if (!tg || project.tags.includes(tg)) { setAddingTag(false); setNewTag(''); return; }
    const tags = [...project.tags, tg];
    onUpdate?.({ tags });
    api.projects.update(project.id, { tags }).catch(console.error);
    setNewTag(''); setAddingTag(false);
  };

  const saveDue = () => {
    setEditingDue(false);
    const iso = dueVal || null;
    if (iso === (project.deadline_iso || null)) return;
    onUpdate?.({ deadline_iso: iso, due: iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : '—' });
    api.projects.update(project.id, { deadline: iso }).catch(console.error);
  };

  const changeStatus = (status: ProjectStatus) => {
    if (status === project.status) return;
    onUpdate?.({ status });
    api.projects.update(project.id, { status }).catch(console.error);
  };

  return (
    <div style={{
      borderLeft: '1px solid hsl(var(--border))',
      background: 'hsl(var(--surface-0))',
      padding: '20px 20px 24px',
      display: 'flex', flexDirection: 'column', gap: 18,
      overflowY: 'auto',
    }}>
      {/* Status */}
      <div>
        <div className="t-caption" style={{ marginBottom: 8 }}>{t('sb_status')}</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {ALL_STATUSES.map(s => (
            <span key={s} className="bb-pill"
              data-tone={project.status === s ? 'primary' : undefined}
              onClick={() => changeStatus(s)}
              style={{ cursor: 'default' }}>
              <StatusDot status={s} /> {t(`status_${s}`)}
            </span>
          ))}
        </div>
      </div>

      {/* Goal */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="t-caption">{t('sb_goal')}</div>
          {!editingGoal && (
            <button className="bb-btn" data-variant="ghost" data-size="icon-sm" onClick={() => setEditingGoal(true)}>
              <IconEdit size={11} />
            </button>
          )}
        </div>
        {editingGoal ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              ref={goalRef}
              value={goalVal}
              onChange={e => setGoalVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setGoalVal(project.goal); setEditingGoal(false); } }}
              rows={3}
              style={{
                width: '100%', background: 'hsl(var(--surface-1))',
                border: '1px solid hsl(var(--border-strong))',
                borderRadius: 4, padding: '6px 8px',
                color: 'hsl(var(--foreground))', fontSize: 13,
                fontFamily: 'inherit', outline: 'none',
                resize: 'none', lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button className="bb-btn" data-variant="ghost" data-size="sm" onClick={() => { setGoalVal(project.goal); setEditingGoal(false); }}>{t('btn_cancel')}</button>
              <button className="bb-btn" data-variant="primary" data-size="sm" onClick={saveGoal}>{t('btn_save')}</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{project.goal || t('sb_no_goal')}</div>
        )}
      </div>

      {/* Health */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div className="t-caption">{t('sb_health')}</div>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              onMouseEnter={() => setShowHealthTooltip(true)}
              onMouseLeave={() => setShowHealthTooltip(false)}
              style={{ background: 'none', border: 0, padding: 0, cursor: 'default', display: 'flex', alignItems: 'center', color: 'hsl(var(--muted-foreground))' }}
            >
              <IconInfo size={12} />
            </button>
            {showHealthTooltip && (
              <div style={{
                position: 'absolute', left: 16, top: -4, zIndex: 10,
                background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
                borderRadius: 6, padding: '10px 12px', width: 200,
                fontSize: 11.5, lineHeight: 1.6,
                boxShadow: '0 8px 24px -4px rgba(0,0,0,.4)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{t('health_how')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: 'hsl(var(--muted-foreground))' }}>
                  <div><span style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>{t('health_activity')}</span> · 30%</div>
                  <div><span style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>{t('health_progress')}</span> · 40%</div>
                  <div><span style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>{t('health_risk')}</span> · 20%</div>
                  <div><span style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>{t('health_milestones')}</span> · 10%</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HealthRing score={project.health} size={48} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: `hsl(var(${healthState(project.health).varName}))` }}>
              {healthState(project.health).label}
            </div>
            <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))' }}>{t('sb_auto_calc')}</div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="t-caption">{t('sb_progress')}</span>
          <span className="tnum" style={{ fontSize: 12, fontWeight: 600 }}>{project.progress}%</span>
        </div>
        <Progress value={project.progress} height={4} />
        <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', marginTop: 6 }}>
          {doneTasks} of {totalTasks} {t('sb_tasks_done')}
        </div>
      </div>

      {/* Deadline */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="t-caption">{t('sb_deadline')}</div>
          {!editingDue && (
            <button className="bb-btn" data-variant="ghost" data-size="icon-sm" onClick={() => setEditingDue(true)}>
              <IconEdit size={11} />
            </button>
          )}
        </div>
        {editingDue ? (
          <input
            type="date"
            ref={dueRef}
            value={dueVal}
            onChange={e => setDueVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveDue(); if (e.key === 'Escape') { setDueVal(project.deadline_iso || ''); setEditingDue(false); } }}
            onBlur={saveDue}
            style={{
              width: '100%', background: 'hsl(var(--surface-1))',
              border: '1px solid hsl(var(--border-strong))',
              borderRadius: 4, padding: '5px 8px',
              color: 'hsl(var(--foreground))', fontSize: 13,
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
            <IconCalendar size={13} />
            <span style={{ fontWeight: 500 }}>{project.due}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <div className="t-caption" style={{ marginBottom: 8 }}>{t('sb_tags')}</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {project.tags.length > 0
            ? project.tags.map((tag) => (
                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} className="bb-pill">
                  {tag}
                  <button
                    onMouseDown={(e) => { e.preventDefault(); removeTag(tag); }}
                    style={{ background: 'none', border: 0, padding: 0, cursor: 'default', color: 'inherit', opacity: 0.5, display: 'flex', lineHeight: 1, fontSize: 11 }}
                  >✕</button>
                </span>
              ))
            : <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>{t('sb_no_tags')}</span>
          }
          {addingTag ? (
            <input
              ref={tagInputRef}
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') { setAddingTag(false); setNewTag(''); } }}
              onBlur={() => { if (newTag.trim()) addTag(); else { setAddingTag(false); setNewTag(''); } }}
              placeholder="tag"
              style={{
                width: 80, background: 'hsl(var(--surface-1))',
                border: '1px solid hsl(var(--border-strong))',
                borderRadius: 999, padding: '2px 8px',
                color: 'hsl(var(--foreground))', fontSize: 12,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          ) : (
            <span className="bb-pill" onClick={() => setAddingTag(true)}
              style={{ borderStyle: 'dashed', color: 'hsl(var(--muted-foreground))', cursor: 'default' }}>
              {t('sb_add_tag')}
            </span>
          )}
        </div>
      </div>

      {/* Velocity */}
      <div>
        <div className="t-caption" style={{ marginBottom: 8 }}>{t('sb_velocity')}</div>
        <VelocitySparkline data={project.velocity.length > 0 ? project.velocity : new Array(12).fill(0)} height={40} />
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid hsl(var(--border))', paddingTop: 12, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
        {t('sb_active')} {project.lastActive}
      </div>
    </div>
  );
}

// ─── KANBAN ─────────────────────────────────────────────────────────

const COLUMN_NAMES = ['Backlog', 'In Progress', 'Review', 'Done'] as const;
type ColumnName = typeof COLUMN_NAMES[number];

interface KanbanBoardProps {
  kanban: KanbanData;
  onChange: (data: KanbanData) => void;
  addActivity: (item: ActivityItem, projectId?: string) => void;
  projectName: string;
  projectId: string;
}

function KanbanBoard({ kanban, onChange, addActivity, projectName, projectId }: KanbanBoardProps) {
  const t = useT();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addingToCol, setAddingToCol] = useState<ColumnName | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const newTaskRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingToCol) newTaskRef.current?.focus();
  }, [addingToCol]);

  const handleDrop = (targetCol: ColumnName) => {
    if (!draggingId) return;
    const sourceCol = COLUMN_NAMES.find(c => kanban[c].some(task => task.id === draggingId));
    if (!sourceCol || sourceCol === targetCol) { setDraggingId(null); return; }
    const task = kanban[sourceCol].find(task => task.id === draggingId)!;
    onChange({
      ...kanban,
      [sourceCol]: kanban[sourceCol].filter(task => task.id !== draggingId),
      [targetCol]: [...kanban[targetCol], task],
    });
    addActivity({
      who: 'you', action: 'moved', what: task.title,
      to: targetCol, project: projectName, when: 'just now',
    }, projectId);
    setDraggingId(null);
  };

  const handleDeleteTask = (col: ColumnName, taskId: string) => {
    onChange({ ...kanban, [col]: kanban[col].filter(task => task.id !== taskId) });
  };

  const handleEditTask = (col: ColumnName, taskId: string, newTitle: string) => {
    onChange({
      ...kanban,
      [col]: kanban[col].map(task => task.id === taskId ? { ...task, title: newTitle } : task),
    });
  };

  const startAdding = (col: ColumnName) => { setAddingToCol(col); setNewTaskTitle(''); };

  const confirmAdd = () => {
    if (!addingToCol) return;
    if (newTaskTitle.trim()) {
      const task: Task = {
        id: genId(), title: newTaskTitle.trim(),
        priority: 'med', subtaskDone: 0, subtaskTotal: 0, comments: 0,
      };
      onChange({ ...kanban, [addingToCol]: [...kanban[addingToCol], task] });
      addActivity({
        who: 'you', action: 'created', what: task.title,
        project: projectName, when: 'just now',
      }, projectId);
    }
    setAddingToCol(null);
    setNewTaskTitle('');
  };

  const cancelAdd = () => { setAddingToCol(null); setNewTaskTitle(''); };
  const totalTasks = COLUMN_NAMES.reduce((s, c) => s + kanban[c].length, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
        <div className="t-h3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('tab_kanban')}
          <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', fontWeight: 400 }}>
            · {totalTasks} {totalTasks === 1 ? t('kanban_task') : t('kanban_tasks')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="bb-pill"><IconUser size={11} /> {t('kanban_just_me')}</span>
          <span className="bb-pill"><IconTag size={11} /> {t('kanban_all_tags')}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'flex-start' }}>
        {COLUMN_NAMES.map((col) => (
          <div key={col}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col)}
            style={{
              background: 'hsl(var(--surface-1) / 0.6)',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              padding: 10,
              display: 'flex', flexDirection: 'column', gap: 8,
              minHeight: 200,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: col === 'Done' || col === 'Review'
                    ? 'hsl(var(--foreground))'
                    : col === 'In Progress'
                    ? 'hsl(var(--muted-foreground))'
                    : 'hsl(var(--border-strong))',
                }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t(`col_${col.toLowerCase().replace(' ', '_')}`)}</span>
                <span className="tnum" style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))' }}>
                  {kanban[col].length}
                </span>
              </div>
              <button className="bb-btn" data-variant="ghost" data-size="icon-sm" onClick={() => startAdding(col)}>
                <IconPlus size={11} />
              </button>
            </div>

            {kanban[col].map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                dragging={draggingId === task.id}
                onDragStart={() => setDraggingId(task.id)}
                onDelete={() => handleDeleteTask(col, task.id)}
                onEdit={(newTitle) => handleEditTask(col, task.id, newTitle)}
              />
            ))}

            {addingToCol === col ? (
              <div style={{
                padding: '8px 10px',
                background: 'hsl(var(--surface-2))',
                border: '1px solid hsl(var(--border-strong))',
                borderRadius: 'calc(var(--radius) - 2px)',
              }}>
                <input
                  ref={newTaskRef}
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmAdd();
                    if (e.key === 'Escape') cancelAdd();
                  }}
                  onBlur={cancelAdd}
                  placeholder={t('kanban_new_task') + '…'}
                  style={{
                    width: '100%', border: 0, background: 'transparent',
                    color: 'hsl(var(--foreground))',
                    fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>
                  {t('kanban_confirm_hint')}
                </div>
              </div>
            ) : (
              <button
                onClick={() => startAdding(col)}
                style={{
                  padding: '10px 12px', textAlign: 'left',
                  background: 'transparent',
                  border: '1px dashed hsl(var(--border-strong))',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  color: 'hsl(var(--muted-foreground))',
                  fontSize: 12.5, cursor: 'default',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <IconPlus size={12} /> {t('kanban_new_task')}
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
        <IconBolt size={11} /> {t('kanban_drag_hint')}
      </div>
    </div>
  );
}

// ─── TIMELINE ───────────────────────────────────────────────────────

function Timeline({ projectId }: { projectId: string }) {
  const t = useT();
  const [milestones, setMilestones] = useState<MilestoneOut[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.milestones.list(projectId).then(setMilestones).catch(() => setMilestones([]));
  }, [projectId]);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const handleAdd = async () => {
    if (!newTitle.trim()) { setAdding(false); return; }
    try {
      const m = await api.milestones.create(projectId, { title: newTitle.trim(), due_date: newDate || null, done: false });
      setMilestones(prev => [...prev, m]);
    } catch (e) { console.error(e); }
    setNewTitle(''); setNewDate(''); setAdding(false);
  };

  const handleToggle = async (m: MilestoneOut) => {
    try {
      const updated = await api.milestones.update(projectId, m.id, { done: !m.done });
      setMilestones(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.milestones.delete(projectId, id);
      setMilestones(prev => prev.filter(m => m.id !== id));
    } catch (e) { console.error(e); }
  };

  const doneCount = milestones.filter(m => m.done).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div className="t-h3">{t('tl_title')}</div>
        <button className="bb-btn" data-variant="primary" data-size="sm" onClick={() => setAdding(true)}>
          <IconPlus size={12} /> {t('tl_add')}
        </button>
      </div>
      <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>
        {milestones.length > 0 ? `${doneCount} of ${milestones.length} ${t('tl_done_of')}` : t('tl_no_milestones')}
      </div>

      {milestones.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Progress value={(doneCount / milestones.length) * 100} height={4} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {milestones.length === 0 && !adding && (
          <div style={{
            padding: '32px 24px', textAlign: 'center',
            border: '1px dashed hsl(var(--border))', borderRadius: 'var(--radius)',
            color: 'hsl(var(--muted-foreground))', fontSize: 13,
          }}>
            {t('tl_empty')}
          </div>
        )}

        {milestones.map((m) => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
            borderRadius: 'calc(var(--radius) - 2px)',
          }}>
            <button
              onClick={() => handleToggle(m)}
              style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                border: '1.5px solid ' + (m.done ? 'hsl(var(--foreground))' : 'hsl(var(--border-strong))'),
                background: m.done ? 'hsl(var(--foreground))' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'default', padding: 0,
              }}
            >
              {m.done && <IconCheck size={11} style={{ color: 'hsl(var(--background))' }} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13.5, fontWeight: 500,
                textDecoration: m.done ? 'line-through' : 'none',
                color: m.done ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
              }}>{m.title}</div>
              {m.due_date && (
                <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconCalendar size={10} />
                  {new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
            <button
              onClick={() => handleDelete(m.id)}
              className="bb-btn" data-variant="ghost" data-size="icon-sm"
              style={{ opacity: 0.4, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.4'}
            >
              <IconTrash size={11} />
            </button>
          </div>
        ))}

        {adding && (
          <div style={{
            padding: '10px 14px',
            background: 'hsl(var(--surface-1))',
            border: '1px solid hsl(var(--border-strong))',
            borderRadius: 'calc(var(--radius) - 2px)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <input
              ref={inputRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewTitle(''); setNewDate(''); } }}
              placeholder={t('tl_placeholder')}
              style={{
                border: 0, background: 'transparent',
                color: 'hsl(var(--foreground))',
                fontSize: 13.5, outline: 'none', fontFamily: 'inherit',
                width: '100%', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                style={{
                  background: 'hsl(var(--surface-2))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 4, padding: '3px 8px',
                  color: 'hsl(var(--foreground))',
                  fontSize: 12, fontFamily: 'inherit', outline: 'none',
                  colorScheme: 'dark',
                }}
              />
              <span style={{ flex: 1 }} />
              <button className="bb-btn" data-variant="ghost" data-size="sm" onClick={() => { setAdding(false); setNewTitle(''); setNewDate(''); }}>{t('tl_cancel')}</button>
              <button className="bb-btn" data-variant="primary" data-size="sm" onClick={handleAdd} style={{ opacity: newTitle.trim() ? 1 : 0.5 }}>{t('tl_add_btn')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RISK MATRIX ────────────────────────────────────────────────────

const LEVEL_LABELS = ['Low', 'Med', 'High'] as const;
const toLevel = (v: number) => v <= 33 ? 0 : v <= 66 ? 1 : 2;
const FROM_LEVEL: Record<string, number> = { low: 16, med: 50, high: 83 };

function RiskMatrix({ projectId }: { projectId: string }) {
  const t = useT();
  const [risks, setRisks] = useState<RiskOut[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newProb, setNewProb] = useState<'low' | 'med' | 'high'>('med');
  const [newImpact, setNewImpact] = useState<'low' | 'med' | 'high'>('med');

  useEffect(() => {
    api.risks.list(projectId).then(setRisks).catch(() => setRisks([]));
  }, [projectId]);

  const handleAdd = async () => {
    if (!newTitle.trim()) { setAdding(false); return; }
    try {
      const r = await api.risks.create(projectId, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        probability: FROM_LEVEL[newProb],
        impact: FROM_LEVEL[newImpact],
      });
      setRisks(prev => [...prev, r]);
    } catch (e) { console.error(e); }
    setNewTitle(''); setNewDesc(''); setNewProb('med'); setNewImpact('med'); setAdding(false);
  };

  const handleToggleMitigated = async (r: RiskOut) => {
    try {
      const updated = await api.risks.update(projectId, r.id, { mitigated: !r.mitigated });
      setRisks(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.risks.delete(projectId, id);
      setRisks(prev => prev.filter(r => r.id !== id));
    } catch (e) { console.error(e); }
  };

  const cellTone = (p: number, i: number) => {
    const sev = p + i;
    if (sev >= 3) return 'hsl(var(--foreground) / 0.18)';
    if (sev === 2) return 'hsl(var(--foreground) / 0.1)';
    if (sev === 1) return 'hsl(var(--foreground) / 0.05)';
    return 'hsl(var(--surface-2))';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div className="t-h3">{t('rm_title')}</div>
        <button className="bb-btn" data-variant="primary" data-size="sm" onClick={() => setAdding(true)}>
          <IconPlus size={12} /> {t('rm_add')}
        </button>
      </div>
      <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>
        {risks.length} {risks.length === 1 ? 'risk' : 'risks'} · {risks.filter(r => r.mitigated).length} {t('rm_mitigated')}
      </div>

      {adding && (
        <div style={{ marginBottom: 20, padding: 16, background: 'hsl(var(--surface-1))', border: '1px solid hsl(var(--border-strong))', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle(''); setNewDesc(''); } }}
            placeholder={t('rm_placeholder')}
            style={{ border: '1px solid hsl(var(--border))', borderRadius: 4, padding: '8px 12px', background: 'hsl(var(--surface-2))', color: 'hsl(var(--foreground))', fontSize: 13.5, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder={t('rm_desc_placeholder')}
            style={{ border: '1px solid hsl(var(--border))', borderRadius: 4, padding: '8px 12px', background: 'hsl(var(--surface-2))', color: 'hsl(var(--foreground))', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{t('rm_probability')}</span>
              {(['low', 'med', 'high'] as const).map(v => (
                <span key={v} className="bb-pill" data-tone={newProb === v ? 'primary' : undefined} onClick={() => setNewProb(v)} style={{ cursor: 'default' }}>{v}</span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{t('rm_impact')}</span>
              {(['low', 'med', 'high'] as const).map(v => (
                <span key={v} className="bb-pill" data-tone={newImpact === v ? 'primary' : undefined} onClick={() => setNewImpact(v)} style={{ cursor: 'default' }}>{v}</span>
              ))}
            </div>
            <span style={{ flex: 1 }} />
            <button className="bb-btn" data-variant="ghost" data-size="sm" onClick={() => { setAdding(false); setNewTitle(''); setNewDesc(''); }}>{t('rm_cancel')}</button>
            <button className="bb-btn" data-variant="primary" data-size="sm" onClick={handleAdd} style={{ opacity: newTitle.trim() ? 1 : 0.5 }}>{t('rm_add_btn')}</button>
          </div>
        </div>
      )}

      {risks.length === 0 && !adding ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', border: '1px dashed hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
          {t('rm_empty')}
        </div>
      ) : risks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: 24 }}>
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 70 }} />
              <div style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Impact →
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11.5, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', padding: '12px 0' }}>
                ← Probability
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
                  <div />
                  {LEVEL_LABELS.map(l => (
                    <div key={l} style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', textAlign: 'center', fontWeight: 500 }}>{l}</div>
                  ))}
                </div>
                {[2, 1, 0].map(p => (
                  <div key={p} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, fontWeight: 500 }}>
                      {LEVEL_LABELS[p]}
                    </div>
                    {[0, 1, 2].map(i => {
                      const dots = risks.filter(r => toLevel(r.probability) === p && toLevel(r.impact) === i);
                      return (
                        <div key={i} style={{ background: cellTone(p, i), border: '1px solid hsl(var(--border))', borderRadius: 6, height: 80, padding: 8, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: 5 }}>
                          {dots.map((r) => (
                            <div key={r.id} title={r.title} style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: r.mitigated ? 'hsl(var(--surface-2))' : 'hsl(var(--card))',
                              border: `1.5px solid hsl(var(--foreground)${r.mitigated ? ' / 0.3' : ''})`,
                              color: r.mitigated ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 600, cursor: 'default',
                            }}>
                              {risks.indexOf(r) + 1}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {risks.map((r, idx) => (
              <div key={r.id} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 7, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid hsl(var(--foreground)${r.mitigated ? ' / 0.3' : ''})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600,
                    color: r.mitigated ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                  }}>{idx + 1}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 500, flex: 1,
                    textDecoration: r.mitigated ? 'line-through' : 'none',
                    color: r.mitigated ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                  }}>{r.title}</span>
                  <button onClick={() => handleToggleMitigated(r)} className="bb-pill" style={{ cursor: 'default', fontSize: 11 }} data-tone={r.mitigated ? 'primary' : undefined}>
                    {r.mitigated ? t('rm_done_btn') : t('rm_mitigate')}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="bb-btn" data-variant="ghost" data-size="icon-sm"
                    style={{ opacity: 0.4, flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.4'}
                  >
                    <IconTrash size={11} />
                  </button>
                </div>
                {r.description && (
                  <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', paddingLeft: 28 }}>→ {r.description}</div>
                )}
                <div style={{ paddingLeft: 28, display: 'flex', gap: 6 }}>
                  <span className="bb-pill" style={{ padding: '1px 7px', fontSize: 10.5 }}>P: {LEVEL_LABELS[toLevel(r.probability)]}</span>
                  <span className="bb-pill" style={{ padding: '1px 7px', fontSize: 10.5 }}>I: {LEVEL_LABELS[toLevel(r.impact)]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NOTES ──────────────────────────────────────────────────────────

function Notes({ projectId }: { projectId: string }) {
  const t = useT();
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.notes.get(projectId)
      .then(r => setContent(r?.content || DEFAULT_NOTES))
      .catch(() => setContent(DEFAULT_NOTES));
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.notes.update(projectId, val).then(() => setSaved(true)).catch(console.error);
    }, 1200);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
        <div className="t-h3">{t('notes_title')}</div>
        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
          {saved ? t('notes_saved') : t('notes_saving')}
        </span>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        spellCheck={false}
        style={{
          width: '100%', maxWidth: 720,
          minHeight: 420,
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          color: 'hsl(var(--foreground))',
          fontSize: 14,
          fontFamily: 'inherit',
          lineHeight: 1.65,
          padding: '20px 28px',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          display: 'block',
        }}
      />
    </div>
  );
}
