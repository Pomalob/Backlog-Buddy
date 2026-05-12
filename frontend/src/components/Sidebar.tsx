import type { Project, Screen } from '../types';
import { useT } from '../i18n';
import {
  IconHome, IconLayers, IconSparkle, IconSettings,
  IconPlus, IconPanelLeft, IconChevronL,
} from './icons';

interface SidebarProps {
  active: Screen;
  onNav: (id: Screen, projectId?: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  projects: Project[];
  onLogout?: () => void;
  onNewProject?: () => void;
  userName?: string;
}

export function Sidebar({ active, onNav, collapsed, onToggleCollapse, projects, onLogout, onNewProject, userName }: SidebarProps) {
  const t = useT();
  const w = collapsed ? 56 : 224;
  const navItems = [
    { id: 'dashboard' as Screen, label: t('nav_dashboard'), Icon: IconHome },
    { id: 'projects'  as Screen, label: t('nav_projects'),  Icon: IconLayers },
    { id: 'system'    as Screen, label: t('nav_system'),    Icon: IconSparkle },
    { id: 'settings'  as Screen, label: t('nav_settings'),  Icon: IconSettings },
  ];

  return (
    <aside style={{
      width: w, flexShrink: 0,
      background: 'hsl(var(--surface-0))',
      borderRight: '1px solid hsl(var(--border))',
      display: 'flex', flexDirection: 'column',
      transition: 'width 200ms cubic-bezier(.2,.7,.2,1)',
      overflow: 'hidden',
    }}>
      {/* logo */}
      <div style={{
        height: 56, padding: collapsed ? '0' : '0 14px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: 'hsl(var(--foreground))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'hsl(var(--background))',
            boxShadow: '0 1px 2px rgba(0,0,0,.4)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 4 4 8l4 4"/><path d="M4 8h11a5 5 0 0 1 0 10h-3"/>
            </svg>
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>Backlog Buddy</div>
              <div style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.02em' }}>v0.4 · solo</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="bb-btn" data-variant="ghost" data-size="icon-sm" onClick={onToggleCollapse} title="Collapse sidebar">
            <IconPanelLeft size={13} />
          </button>
        )}
      </div>

      {/* expand handle when collapsed */}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 4px' }}>
          <button
            className="bb-btn" data-variant="ghost" data-size="icon-sm"
            onClick={onToggleCollapse} title="Expand sidebar"
            style={{ width: 28, height: 28 }}
          >
            <IconPanelLeft size={13} style={{ transform: 'scaleX(-1)' }} />
          </button>
        </div>
      )}

      {/* nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '4px 8px' }}>
        {navItems.map((it) => {
          const isActive = active === it.id || (it.id === 'projects' && active === 'project-detail');
          return (
            <button key={it.id} onClick={() => onNav(it.id)} title={collapsed ? it.label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '0' : '0 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                height: 32, borderRadius: 6,
                border: 0, background: isActive ? 'hsl(var(--secondary))' : 'transparent',
                color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                fontSize: 13, fontWeight: isActive ? 500 : 400,
                cursor: 'default', transition: 'background 100ms ease, color 100ms ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--secondary) / 0.6)'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--foreground))'; } }}
              onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--muted-foreground))'; } }}
            >
              <it.Icon size={15} />
              {!collapsed && <span>{it.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* active projects list */}
      {!collapsed && (
        <div style={{ padding: '12px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {t('nav_active')}
          </span>
          <button className="bb-btn" data-variant="ghost" data-size="icon-sm" title="New project" onClick={onNewProject}>
            <IconPlus size={12} />
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 8px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {projects.filter(p => p.status === 'active' || p.status === 'idea').map((p) => (
          <button key={p.id} onClick={() => onNav('project-detail', p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '0' : '0 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              height: 30, borderRadius: 6,
              border: 0, background: 'transparent',
              color: 'hsl(var(--muted-foreground))',
              fontSize: 12.5, cursor: 'default',
              transition: 'background 100ms ease, color 100ms ease',
            }}
            title={collapsed ? p.name : undefined}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--secondary) / 0.6)'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--foreground))'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--muted-foreground))'; }}
          >
            <span className="font-mono" style={{
              width: 16, height: 16, borderRadius: 3, flexShrink: 0,
              background: 'hsl(var(--surface-2))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 600, letterSpacing: '0.04em',
              color: 'hsl(var(--muted-foreground))',
              border: '1px solid hsl(var(--border))',
            }}>{p.emoji}</span>
            {!collapsed && (
              <>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {p.zombie && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'hsl(var(--muted-foreground))' }} />}
              </>
            )}
          </button>
        ))}
      </div>

      {/* user */}
      <div style={{
        borderTop: '1px solid hsl(var(--border))',
        padding: collapsed ? '10px 0' : '10px 12px',
        display: 'flex', alignItems: 'center', gap: 9,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'hsl(var(--primary) / 0.18)',
          color: 'hsl(var(--primary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11.5, fontWeight: 600,
          border: '1px solid hsl(var(--primary) / 0.3)',
          flexShrink: 0,
        }}>{userName ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'}</div>
        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || 'Account'}</div>
          </div>
        )}
        {!collapsed && onLogout && (
          <button
            className="bb-btn" data-variant="ghost" data-size="sm"
            onClick={onLogout}
            title={t('nav_sign_out')}
            style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
          >
            {t('nav_sign_out')}
          </button>
        )}
        {!collapsed && !onLogout && (
          <button className="bb-btn" data-variant="ghost" data-size="icon-sm" onClick={onToggleCollapse} title="Collapse">
            <IconChevronL size={12} />
          </button>
        )}
      </div>
    </aside>
  );
}
