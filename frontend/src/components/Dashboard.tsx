import type { Project, ActivityItem, HealthVariant, ThisWeekTask } from '../types';
import { healthState, ProjectCard, Progress } from './ui';
import { useT, useLang } from '../i18n';
import {
  IconPlus, IconChevronR,
  IconCalendar, IconBolt, IconArchive, IconPause,
} from './icons';

function VelocitySparkline({ data, height = 64, color }: { data: number[]; height?: number; color?: string }) {
  const max = Math.max(...data, 1);
  const w = 280;
  const bw = w / data.length;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="velFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color || 'hsl(var(--primary))'} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color || 'hsl(var(--primary))'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={height - 1} x2={w} y2={height - 1} stroke="hsl(var(--border))" strokeWidth="1" />
      {data.map((v, i) => {
        const h = (v / max) * (height - 8);
        const x = i * bw + 1;
        const y = height - h;
        return (
          <rect key={i} x={x} y={y} width={bw - 2} height={Math.max(h, 1)}
            fill={color || 'hsl(var(--primary))'}
            opacity={0.55 + 0.45 * (i / data.length)}
            rx="1.5" />
        );
      })}
    </svg>
  );
}

function smoothCurve(pts: { x: number; y: number }[], maxY: number): string {
  if (pts.length < 2) return '';
  const clampY = (y: number) => Math.max(0, Math.min(maxY, y));
  const parts = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = (p1.x + (p2.x - p0.x) / 6).toFixed(2);
    const cp1y = clampY(p1.y + (p2.y - p0.y) / 6).toFixed(2);
    const cp2x = (p2.x - (p3.x - p1.x) / 6).toFixed(2);
    const cp2y = clampY(p2.y - (p3.y - p1.y) / 6).toFixed(2);
    parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return parts.join(' ');
}

function VelocityChart({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 480;
  const h = 120;
  const stepX = w / (data.length - 1);
  const pts = data.map((v, i) => ({ x: i * stepX, y: h - (v / max) * (h - 16) - 6 }));
  const linePath = smoothCurve(pts, h);
  const areaPath = linePath + ` L ${w} ${h} L 0 ${h} Z`;
  const r = 3.5;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="vfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
        <clipPath id="vel-chart-clip">
          <rect x="0" y="0" width={w} height={h} />
        </clipPath>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1="0" y1={h * t} x2={w} y2={h * t}
          stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.6" />
      ))}
      <g clipPath="url(#vel-chart-clip)">
        <path d={areaPath} fill="url(#vfill)" />
        <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
        {pts.map(({ x, y }, i) => {
          if (i % 7 !== 6) return null;
          return (
            <polygon key={i}
              points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`}
              fill="hsl(var(--surface-1))" stroke="hsl(var(--primary))" strokeWidth="1.5"
            />
          );
        })}
      </g>
    </svg>
  );
}

function velocityXLabels(days: number, dateLocale: string, todayLabel: string): string[] {
  const labels: string[] = [];
  const now = new Date();
  const weekCount = Math.ceil(days / 7);
  for (let w = weekCount - 1; w >= 0; w--) {
    const d = new Date(now);
    d.setDate(d.getDate() - w * 7);
    labels.push(d.toLocaleDateString(dateLocale, { month: 'short', day: '2-digit' }).toUpperCase());
  }
  labels.push(todayLabel);
  return labels;
}

interface DashboardProps {
  projects: Project[];
  activity: ActivityItem[];
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  healthVariant: HealthVariant;
  setHealthVariant: (v: HealthVariant) => void;
  velocity: number[];
  totalTasksDone: number;
  tasksThisWeek: ThisWeekTask[];
  userName: string;
}

export function Dashboard({
  projects, activity, onOpenProject, onNewProject,
  healthVariant, setHealthVariant,
  velocity, totalTasksDone, tasksThisWeek, userName,
}: DashboardProps) {
  const t = useT();
  const [lang] = useLang();
  const velocityTotal = velocity.reduce((s, v) => s + v, 0);
  const zombies = projects.filter(p => p.zombie);
  const activeCount = projects.filter(p => p.status === 'active').length;
  const attentionCount = projects.filter(p => p.zombie || p.health < 40).length;
  const xLabels = velocityXLabels(velocity.length, dateLocale, t('dash_today'));
  const topByHealth = [...projects].sort((a, b) => b.health - a.health).slice(0, 4);
  const userInitials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t('dash_morning') : hour < 17 ? t('dash_afternoon') : t('dash_evening');
  const dateLocale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const dateStr = now.toLocaleDateString(dateLocale, { weekday: 'long', month: 'long', day: 'numeric' });
  const displayName = userName ? userName.split(' ')[0] : 'there';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 32px 80px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            {dateStr}
          </div>
          <h1 className="t-h1" style={{ margin: 0 }}>{greeting}, {displayName}.</h1>
          <p style={{ margin: '6px 0 0', color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>
            {activeCount} {activeCount === 1 ? t('dash_active_project') : t('dash_active_projects')}
            {attentionCount > 0 && ` · ${attentionCount} ${t('dash_attention')}`}
          </p>
        </div>
        <button className="bb-btn" data-variant="primary" onClick={onNewProject}>
          <IconPlus size={14} /> {t('dash_new_project')}
        </button>
      </div>

      {/* velocity + health snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="bb-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="t-caption">{t('dash_velocity')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                <span className="tnum" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{velocityTotal}</span>
                <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{t('dash_tasks_closed')}</span>
                {velocityTotal === 0 && (
                  <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                    {t('dash_complete_tasks')}
                  </span>
                )}
              </div>
            </div>
          </div>
          {velocity.length > 0 ? (
            <VelocityChart data={velocity} />
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
              {t('dash_no_data')}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em' }}>
            {xLabels.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        </div>

        <div className="bb-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="t-caption">{t('dash_health_snapshot')}</div>
            <div className="bb-tabs" style={{ height: 26 }}>
              {(['ring', 'gauge', 'bar'] as HealthVariant[]).map((v) => (
                <span key={v} className="bb-tab" data-active={healthVariant === v ? 'true' : undefined}
                  onClick={() => setHealthVariant(v)} style={{ cursor: 'default' }}>
                  {v}
                </span>
              ))}
            </div>
          </div>
          {projects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topByHealth.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="font-mono" style={{
                    width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                    background: 'hsl(var(--surface-2))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                    color: 'hsl(var(--muted-foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}>{p.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span className="tnum" style={{ fontSize: 12, color: `hsl(var(${healthState(p.health).varName}))`, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>
                    {p.health}
                  </span>
                  <div style={{ width: 90 }}>
                    <Progress value={p.health} height={3} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13, fontStyle: 'italic', minHeight: 80 }}>
              {t('dash_no_projects')}
            </div>
          )}
        </div>
      </div>

      {/* active projects grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="t-h2" style={{ margin: 0 }}>{t('dash_active_projects_h')}</h2>
          <span style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))' }}>
            {projects.filter(p => p.status === 'active' || p.status === 'idea').length} {t('dash_of')} {projects.length}
          </span>
        </div>
        {projects.filter(p => p.status === 'active' || p.status === 'idea').length === 0 ? (
          <div style={{
            border: '1px dashed hsl(var(--border))',
            borderRadius: 'var(--radius)',
            padding: '32px 24px',
            textAlign: 'center',
            color: 'hsl(var(--muted-foreground))',
          }}>
            <div style={{ fontSize: 13, marginBottom: 10 }}>{t('dash_no_projects')}</div>
            <button className="bb-btn" data-variant="primary" data-size="sm" onClick={onNewProject}>
              <IconPlus size={13} /> {t('dash_create_first')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {projects.filter(p => p.status === 'active' || p.status === 'idea').map((p) => (
              <ProjectCard key={p.id} project={p} healthVariant={healthVariant} onClick={() => onOpenProject(p.id)} />
            ))}
          </div>
        )}
      </div>

      {/* zombie row */}
      {zombies.length > 0 && (
        <div style={{
          background: 'hsl(var(--surface-1))',
          border: '1px dashed hsl(var(--border-strong))',
          borderRadius: 'var(--radius)', padding: 18,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'transparent', color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border-strong))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconPause size={14} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t('dash_zombie_title')}</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{t('dash_zombie_desc')}</div>
            </div>
            <button className="bb-btn" data-size="sm">{t('dash_review_all')}</button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {zombies.map((p) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'hsl(var(--surface-1))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 7, padding: '8px 12px',
                minWidth: 220, flex: 1,
              }}>
                <span className="font-mono" style={{
                  width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                  background: 'hsl(var(--surface-2))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                  color: 'hsl(var(--muted-foreground))',
                  border: '1px solid hsl(var(--border))',
                }}>{p.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))' }}>{p.lastActive}</div>
                </div>
                <button className="bb-btn" data-variant="ghost" data-size="icon-sm" title="Resume"><IconBolt size={12} /></button>
                <button className="bb-btn" data-variant="ghost" data-size="icon-sm" title="Archive"><IconArchive size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* activity + this week */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="bb-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="t-h3">{t('dash_activity')}</div>
            <button className="bb-btn" data-variant="ghost" data-size="sm">{t('dash_view_all')} <IconChevronR size={11} /></button>
          </div>
          {activity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activity.slice(0, 5).map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0', borderBottom: i < Math.min(activity.length, 5) - 1 ? '1px solid hsl(var(--border))' : 'none',
                  fontSize: 12.5,
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'hsl(var(--primary) / 0.16)',
                    color: 'hsl(var(--primary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600,
                  }}>{userInitials}</span>
                  <span style={{ flex: 1, color: 'hsl(var(--muted-foreground))' }}>
                    <span style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>{t('dash_you')}</span> {a.action} <span style={{ color: 'hsl(var(--foreground))' }}>{a.what}</span>
                    {a.to && <> → <span style={{ color: 'hsl(var(--primary))' }}>{a.to}</span></>}
                    <span style={{ marginLeft: 6, fontSize: 11 }}>· {a.project}</span>
                  </span>
                  <span className="tnum" style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11.5 }}>{a.when}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, fontStyle: 'italic', padding: '16px 0' }}>
              {t('dash_no_activity')}
            </div>
          )}
        </div>

        <div className="bb-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="t-h3" style={{ flex: 1 }}>{t('dash_this_week')}</div>
            <IconCalendar size={13} style={{ color: 'hsl(var(--muted-foreground))' }} />
          </div>
          {tasksThisWeek.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasksThisWeek.slice(0, 5).map((task, i) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(tasksThisWeek.length, 5) - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid hsl(var(--border-strong))', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{task.project}</div>
                  </div>
                  <span style={{
                    fontSize: 11.5, fontWeight: 500,
                    color: task.overdue ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    textDecoration: task.overdue ? 'underline' : 'none',
                    textUnderlineOffset: 3,
                  }}>{task.due}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13, fontStyle: 'italic', minHeight: 80 }}>
              {t('dash_no_tasks_week')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { VelocitySparkline };
