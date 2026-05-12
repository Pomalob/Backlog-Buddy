import { useState } from 'react';
import type { Project, HealthVariant, UserOut } from '../types';
import { healthState, ProjectCard, Progress, StatusDot, Switch } from './ui';
import { useT, useLang } from '../i18n';
import {
  IconPlus, IconSearch, IconLayers, IconList, IconMoreH,
  IconMail, IconSend, IconBell,
} from './icons';

interface ProjectsListProps {
  projects: Project[];
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  healthVariant: HealthVariant;
}

export function ProjectsList({ projects, onOpenProject, onNewProject, healthVariant }: ProjectsListProps) {
  const t = useT();
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const allTags = Array.from(new Set(projects.flatMap(p => p.tags)));
  const statuses = ['all', 'active', 'idea', 'paused', 'done', 'archived'] as const;
  const counts = Object.fromEntries(
    statuses.map(s => [s, s === 'all' ? projects.length : projects.filter(p => p.status === s).length])
  );

  const q = search.trim().toLowerCase();
  const filtered = projects.filter(p =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (!tagFilter || p.tags.includes(tagFilter)) &&
    (!q || p.name.toLowerCase().includes(q) || p.goal.toLowerCase().includes(q) || p.tags.some(tag => tag.toLowerCase().includes(q)))
  );

  const statusLabels: Record<string, string> = {
    all: t('proj_status_all'),
    active: t('status_active'),
    idea: t('status_idea'),
    paused: t('status_paused'),
    done: t('status_done'),
    archived: t('status_archived'),
  };

  return (
    <div style={{ padding: '24px 32px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 18 }}>
        <div>
          <h1 className="t-h1" style={{ margin: 0 }}>{t('proj_title')}</h1>
          <p style={{ margin: '6px 0 0', color: 'hsl(var(--muted-foreground))', fontSize: 13.5 }}>
            {filtered.length} {t('proj_of')} {projects.length} · {t('proj_sorted')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {searchOpen ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <IconSearch size={13} style={{ position: 'absolute', left: 10, color: 'hsl(var(--muted-foreground))', pointerEvents: 'none' }} />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } }}
                onBlur={() => { if (!search) setSearchOpen(false); }}
                placeholder={t('proj_search')}
                style={{
                  paddingLeft: 32, paddingRight: 12, height: 32,
                  background: 'hsl(var(--surface-1))',
                  border: '1px solid hsl(var(--border-strong))',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  color: 'hsl(var(--foreground))',
                  fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
                  width: 220, boxSizing: 'border-box',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 8, background: 'none', border: 0, color: 'hsl(var(--muted-foreground))', cursor: 'default', fontSize: 13, lineHeight: 1, padding: 0 }}
                >✕</button>
              )}
            </div>
          ) : (
            <button className="bb-btn" data-variant="ghost" onClick={() => setSearchOpen(true)}>
              <IconSearch size={13} /> {t('proj_search').replace('…', '')}
            </button>
          )}
          <button className="bb-btn" data-variant="primary" onClick={onNewProject}><IconPlus size={13} /> {t('proj_new')}</button>
        </div>
      </div>

      {/* filters */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="bb-tabs">
          {statuses.map((s) => (
            <span key={s} className="bb-tab" data-active={statusFilter === s ? 'true' : undefined}
              onClick={() => setStatusFilter(s)} style={{ cursor: 'default' }}>
              {statusLabels[s]} <span className="tnum" style={{ opacity: 0.55, marginLeft: 4 }}>{counts[s]}</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {allTags.slice(0, 8).map((tag) => (
            <span key={tag} className="bb-pill"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              data-tone={tagFilter === tag ? 'primary' : undefined}
              style={{ cursor: 'default' }}>
              #{tag}
            </span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="bb-btn" data-variant={view === 'grid' ? undefined : 'ghost'} data-size="sm" onClick={() => setView('grid')}>
            <IconLayers size={12} /> {t('proj_grid')}
          </button>
          <button className="bb-btn" data-variant={view === 'list' ? undefined : 'ghost'} data-size="sm" onClick={() => setView('list')}>
            <IconList size={12} /> {t('proj_list')}
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'hsl(var(--muted-foreground))', fontSize: 13, border: '1px dashed hsl(var(--border))', borderRadius: 'var(--radius)' }}>
          {q ? `${t('proj_no_match')} "${search}"` : t('proj_no_category')}
        </div>
      )}

      {view === 'grid' && filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} healthVariant={healthVariant} onClick={() => onOpenProject(p.id)} />
          ))}
        </div>
      ) : view === 'list' && filtered.length > 0 ? (
        <div className="bb-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 110px 70px minmax(140px, 1.1fr) 90px 44px',
            columnGap: 24,
            padding: '10px 18px', borderBottom: '1px solid hsl(var(--border))',
            fontSize: 11, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span>Project</span><span>Status</span><span>Health</span><span>Progress</span><span>Due</span><span></span>
          </div>
          {filtered.map((p, i) => (
            <div key={p.id} onClick={() => onOpenProject(p.id)}
              style={{
                display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 110px 70px minmax(140px, 1.1fr) 90px 44px',
                columnGap: 24,
                padding: '12px 18px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                cursor: 'default',
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--surface-2))'}
              onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span className="font-mono" style={{ width: 22, height: 22, borderRadius: 5, background: 'hsl(var(--surface-2))',
                  border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
                  {p.emoji}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.goal}</div>
                </div>
              </div>
              <span className="bb-pill" style={{ width: 'fit-content' }}><StatusDot status={p.status} /> {t(`status_${p.status}`)}</span>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: `hsl(var(${healthState(p.health).varName}))` }}>{p.health}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, maxWidth: 160 }}><Progress value={p.progress} height={3} /></div>
                <span className="tnum" style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))' }}>{p.progress}%</span>
              </div>
              <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{p.due}</span>
              <span style={{ textAlign: 'right' }}>
                <button className="bb-btn" data-variant="ghost" data-size="icon-sm"><IconMoreH size={12} /></button>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── SETTINGS ───────────────────────────────────────────────────────

interface SettingsProps {
  user?: UserOut | null;
  onExport?: () => void;
}

export function Settings({ user, onExport }: SettingsProps) {
  const t = useT();
  const [lang, setLang] = useLang();
  const [emailDigest, setEmailDigest] = useState(user?.notify_email ?? false);
  const [tg, setTg] = useState(user?.notify_telegram ?? false);
  const [zombie, setZombie] = useState(true);

  const displayName = user?.display_name || 'Your account';
  const email = user?.email || '—';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const notifRows = [
    { id: 'email', title: t('notif_digest'), subtitle: t('notif_digest_desc'), val: emailDigest, set: setEmailDigest, Icon: IconMail, channel: email },
    { id: 'tg',   title: t('notif_tg'),     subtitle: t('notif_tg_desc'),     val: tg,          set: setTg,          Icon: IconSend, channel: t('notif_not_linked') },
    { id: 'zombie', title: t('notif_zombie'), subtitle: t('notif_zombie_desc'), val: zombie, set: setZombie, Icon: IconBell, channel: t('notif_in_app') },
  ];

  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 720 }}>
      <h1 className="t-h1" style={{ margin: 0, marginBottom: 6 }}>{t('settings_title')}</h1>
      <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: 14, marginBottom: 28 }}>
        {t('settings_desc')}
      </p>

      {/* Language */}
      <div className="t-caption" style={{ marginBottom: 10 }}>{t('settings_language')}</div>
      <div className="bb-card" style={{ padding: 18, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{t('settings_language')}</div>
        <div className="bb-tabs">
          {(['en', 'ru'] as const).map(l => (
            <span key={l} className="bb-tab" data-active={lang === l ? 'true' : undefined}
              onClick={() => setLang(l)} style={{ cursor: 'default' }}>
              {l === 'en' ? '🇬🇧 English' : '🇷🇺 Русский'}
            </span>
          ))}
        </div>
      </div>

      <div className="t-caption" style={{ marginBottom: 10 }}>{t('settings_profile')}</div>
      <div className="bb-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%',
          background: 'hsl(var(--primary) / 0.18)', color: 'hsl(var(--primary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 600, border: '1px solid hsl(var(--primary) / 0.3)' }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{displayName}</div>
          <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{email}</div>
        </div>
        <button className="bb-btn" data-size="sm">{t('settings_edit')}</button>
      </div>

      <div className="t-caption" style={{ marginBottom: 10 }}>{t('settings_notifications')}</div>
      <div className="bb-card" style={{ padding: 0, marginBottom: 28 }}>
        {notifRows.map((s, i) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px',
            borderBottom: i < notifRows.length - 1 ? '1px solid hsl(var(--border))' : 'none',
          }}>
            <span style={{ width: 30, height: 30, borderRadius: 7,
              background: 'hsl(var(--surface-2))', color: 'hsl(var(--muted-foreground))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.Icon size={14} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{s.subtitle}</div>
            </div>
            <span className="bb-pill font-mono" style={{ fontSize: 10.5 }}>{s.channel}</span>
            <Switch value={s.val} onChange={s.set} />
          </div>
        ))}
      </div>

      <div className="t-caption" style={{ marginBottom: 10 }}>{t('settings_capture')}</div>
      <div className="bb-card" style={{ padding: 18, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t('settings_hotkey')}</div>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{t('settings_hotkey_desc')}</div>
          </div>
          <span className="font-mono" style={{ background: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))', padding: '3px 8px', borderRadius: 5, fontSize: 12 }}>C</span>
          <button className="bb-btn" data-size="sm">{t('settings_change')}</button>
        </div>
      </div>

      <div className="t-caption" style={{ marginBottom: 10 }}>{t('settings_danger')}</div>
      <div className="bb-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t('settings_export')}</div>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{t('settings_export_desc')}</div>
        </div>
        <button className="bb-btn" data-size="sm" onClick={onExport}>{t('settings_export_btn')}</button>
      </div>
    </div>
  );
}
