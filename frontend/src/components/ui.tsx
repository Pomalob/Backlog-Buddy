import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Project, Task, HealthVariant } from '../types';
import {
  IconClock, IconCheck, IconMessage, IconGripV, IconCalendar, IconEdit, IconTrash,
} from './icons';

// ─── HEALTH SCORE ───────────────────────────────────────────────────

export function healthState(score: number) {
  if (score >= 70) return { key: 'healthy', label: 'Healthy', varName: '--health-good' };
  if (score >= 40) return { key: 'at-risk', label: 'At risk', varName: '--health-warn' };
  return { key: 'critical', label: 'Critical', varName: '--health-bad' };
}

interface HealthRingProps { score?: number; size?: number; strokeWidth?: number; showLabel?: boolean; }
export function HealthRing({ score = 70, size = 56, strokeWidth = 5, showLabel = false }: HealthRingProps) {
  const s = healthState(score);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="hsl(var(--secondary))" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={`hsl(var(${s.varName}))`} strokeWidth={strokeWidth}
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 320ms cubic-bezier(.2,.7,.2,1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.32, fontWeight: 600, letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {score}
        </div>
      </div>
      {showLabel && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: `hsl(var(${s.varName}))` }}>{s.label}</span>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Health Score</span>
        </div>
      )}
    </div>
  );
}

interface HealthGaugeProps { score?: number; width?: number; showLabel?: boolean; }
export function HealthGauge({ score = 70, width = 120, showLabel = false }: HealthGaugeProps) {
  const s = healthState(score);
  const cx = width / 2;
  const r = width / 2 - 8;
  const cy = r + 8;
  const stroke = 8;
  const angle = Math.PI * (score / 100);
  const endX = cx - r * Math.cos(angle);
  const endY = cy - r * Math.sin(angle);
  const largeArc = angle > Math.PI ? 1 : 0;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width, height: cy + 4 }}>
        <svg width={width} height={cy + 4} viewBox={`0 0 ${width} ${cy + 4}`}>
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} strokeLinecap="round" />
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
            fill="none" stroke={`hsl(var(${s.varName}))`} strokeWidth={stroke} strokeLinecap="round"
            style={{ transition: 'all 320ms cubic-bezier(.2,.7,.2,1)' }} />
          {[0.25, 0.5, 0.75].map((t) => {
            const a = Math.PI * (1 - t);
            const x1 = cx + (r - stroke) * Math.cos(a);
            const y1 = cy - (r - stroke) * Math.sin(a);
            const x2 = cx + (r + stroke / 2) * Math.cos(a);
            const y2 = cy - (r + stroke / 2) * Math.sin(a);
            return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--border))" strokeWidth="1" />;
          })}
        </svg>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center',
          fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
        }}>
          {score}<span style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--muted-foreground))', marginLeft: 2 }}>/100</span>
        </div>
      </div>
      {showLabel && (
        <span style={{ fontSize: 11.5, fontWeight: 500, color: `hsl(var(${s.varName}))`, letterSpacing: '0.005em' }}>
          {s.label}
        </span>
      )}
    </div>
  );
}

interface HealthBarProps { score?: number; segments?: number; showLabel?: boolean; }
export function HealthBar({ score = 70, segments = 10, showLabel = false }: HealthBarProps) {
  const s = healthState(score);
  const filled = Math.round((score / 100) * segments);
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))' }}>Health</span>
        <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: `hsl(var(${s.varName}))` }}>
          {score}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 6, borderRadius: 2,
            background: i < filled ? `hsl(var(${s.varName}))` : 'hsl(var(--secondary))',
            opacity: i < filled ? 1 : 0.85,
            transition: 'background 160ms ease',
          }} />
        ))}
      </div>
      {showLabel && (
        <span style={{ fontSize: 11, color: `hsl(var(${s.varName}))`, fontWeight: 500 }}>
          {s.label}
        </span>
      )}
    </div>
  );
}

interface HealthScoreProps { score: number; variant?: HealthVariant; size?: number; showLabel?: boolean; }
export function HealthScore({ score, variant = 'ring', size, showLabel }: HealthScoreProps) {
  if (variant === 'gauge') return <HealthGauge score={score} width={size} showLabel={showLabel} />;
  if (variant === 'bar')   return <HealthBar score={score} showLabel={showLabel} />;
  return <HealthRing score={score} size={size} showLabel={showLabel} />;
}

// ─── PROGRESS ───────────────────────────────────────────────────────

interface ProgressProps { value?: number; height?: number; }
export function Progress({ value = 0, height = 4 }: ProgressProps) {
  return (
    <div className="bb-progress" style={{ height }}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

// ─── KANBAN CARD ────────────────────────────────────────────────────

interface KanbanCardProps {
  task: Task;
  dragging?: boolean;
  onDragStart?: () => void;
  onDelete?: () => void;
  onEdit?: (newTitle: string) => void;
}
export function KanbanCard({ task, dragging = false, onDragStart, onDelete, onEdit }: KanbanCardProps) {
  const priVar = task.priority === 'high' ? '--pri-high' : task.priority === 'med' ? '--pri-med' : '--pri-low';
  const dueOverdue = task.overdue;
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditVal(task.title);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, task.title]);

  const confirmEdit = () => {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== task.title) onEdit?.(trimmed);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditVal(task.title);
    setEditing(false);
  };

  return (
    <div
      draggable={!editing}
      onDragStart={editing ? undefined : onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 'calc(var(--radius) - 2px)',
        padding: '10px 12px 10px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
        cursor: dragging ? 'grabbing' : editing ? 'text' : 'grab',
        boxShadow: dragging
          ? '0 12px 32px -8px rgba(0,0,0,.5), 0 0 0 1px hsl(var(--primary) / 0.4)'
          : '0 1px 0 rgba(255,255,255,.02) inset',
        opacity: dragging ? 0.92 : 1,
        transform: dragging ? 'rotate(-1.5deg) scale(1.02)' : 'rotate(0) scale(1)',
        transition: 'box-shadow 160ms ease, transform 160ms ease, border-color 120ms ease',
      }}
    >
      <span style={{
        position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
        borderRadius: '0 2px 2px 0',
        background: `hsl(var(${priVar}))`,
      }} />

      {/* centered hover overlay with Edit + Delete */}
      {hovered && !editing && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'hsl(var(--card) / 0.9)',
          backdropFilter: 'blur(2px)',
          borderRadius: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, zIndex: 2,
        }}>
          {onEdit && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setEditing(true); }}
              className="bb-btn" data-size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <IconEdit size={12} /> Edit
            </button>
          )}
          {onDelete && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
              className="bb-btn" data-size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid hsl(var(--border-strong))' }}
            >
              <IconTrash size={12} /> Delete
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); confirmEdit(); }
              if (e.key === 'Escape') cancelEdit();
            }}
            onBlur={confirmEdit}
            style={{
              flex: 1, border: 0,
              background: 'hsl(var(--surface-2))',
              color: 'hsl(var(--foreground))',
              fontSize: 13.5, fontWeight: 500, lineHeight: 1.4,
              fontFamily: 'inherit', outline: '1px solid hsl(var(--ring))',
              borderRadius: 3, padding: '2px 4px',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <span
            onClick={() => { if (onEdit) setEditing(true); }}
            style={{
              fontSize: 13.5, fontWeight: 500, color: 'hsl(var(--foreground))',
              lineHeight: 1.4, flex: 1,
              cursor: onEdit ? 'text' : 'default',
              borderRadius: 3,
            }}
          >
            {task.title}
          </span>
        )}
        {!editing && (
          <span style={{ color: 'hsl(var(--muted-foreground))', display: 'flex', paddingTop: 1, flexShrink: 0 }}>
            <IconGripV size={12} />
          </span>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {task.tags.map((tag) => (
            <span key={tag} className="bb-pill" style={{ padding: '1px 7px', fontSize: 11, fontWeight: 500 }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
        {task.due && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: dueOverdue ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
            textDecoration: dueOverdue ? 'underline' : 'none',
            textUnderlineOffset: 3,
            fontWeight: dueOverdue ? 600 : 400,
          }}>
            <IconClock size={11} /> {task.due}
          </span>
        )}
        {task.subtaskTotal > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
            <IconCheck size={11} /> {task.subtaskDone}/{task.subtaskTotal}
          </span>
        )}
        {task.comments > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
            <IconMessage size={11} /> {task.comments}
          </span>
        )}
        {task.assignee && (
          <span style={{
            marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%',
            background: 'hsl(var(--primary) / 0.18)',
            color: 'hsl(var(--primary))',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600,
            border: '1px solid hsl(var(--primary) / 0.3)',
          }}>
            {task.assignee}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── PROJECT CARD ───────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  healthVariant?: HealthVariant;
  onClick?: () => void;
}
export function ProjectCard({ project, healthVariant = 'ring', onClick }: ProjectCardProps) {
  const statusTone: Record<string, string | undefined> = {
    active: 'good', idea: 'primary', paused: undefined, done: 'good', archived: undefined,
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 'var(--radius)',
        padding: 16,
        display: 'flex', flexDirection: 'column', gap: 14,
        cursor: 'default',
        transition: 'border-color 120ms ease, background 120ms ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(var(--border-strong))';
        (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--surface-2))';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(var(--border))';
        (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--card))';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="font-mono" style={{
              width: 24, height: 24, borderRadius: 5,
              background: 'hsl(var(--surface-2))',
              border: '1px solid hsl(var(--border))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em',
              color: 'hsl(var(--muted-foreground))',
            }}>{project.emoji || project.name.slice(0, 2).toUpperCase()}</span>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as CSSProperties}>
            {project.goal}
          </div>
        </div>
        <HealthScore score={project.health} variant={healthVariant} size={healthVariant === 'gauge' ? 100 : 44} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'hsl(var(--muted-foreground))' }}>
          <span>Progress</span>
          <span className="tnum" style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>{project.progress}%</span>
        </div>
        <Progress value={project.progress} height={3} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="bb-pill" data-tone={statusTone[project.status] as string | undefined}>
          <StatusDot status={project.status} />
          {project.status}
        </span>
        {project.tags?.slice(0, 2).map((t) => (
          <span key={t} className="bb-pill" style={{ padding: '1px 7px', fontSize: 10.5 }}>{t}</span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'hsl(var(--muted-foreground))', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <IconCalendar size={11} /> {project.due}
        </span>
      </div>
    </div>
  );
}

// ─── STATUS DOT ─────────────────────────────────────────────────────

export function StatusDot({ status }: { status: string }) {
  const c = status === 'active' ? 'hsl(var(--success))'
          : status === 'idea'   ? 'hsl(var(--primary))'
          : status === 'paused' ? 'hsl(var(--muted-foreground))'
          : status === 'done'   ? 'hsl(var(--success))'
          :                       'hsl(var(--muted-foreground))';
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />;
}

// ─── SWITCH ─────────────────────────────────────────────────────────

export function Switch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{
        width: 32, height: 18, borderRadius: 999,
        background: value ? 'hsl(var(--primary))' : 'hsl(var(--surface-3))',
        border: '1px solid ' + (value ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))'),
        position: 'relative', cursor: 'default', transition: 'background 120ms ease',
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 1, left: value ? 15 : 1,
        width: 14, height: 14, borderRadius: '50%',
        background: value ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
        transition: 'left 160ms cubic-bezier(.2,.7,.2,1)',
      }} />
    </button>
  );
}
