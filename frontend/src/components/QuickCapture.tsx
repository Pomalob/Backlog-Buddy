import { useState, useEffect, useRef } from 'react';
import type { Project, Task } from '../types';
import { useT } from '../i18n';
import { IconLightbulb } from './icons';

interface QuickCaptureProps {
  projects: Project[];
  activeProjectId: string;
  onCapture: (title: string, projectId: string, priority: Task['priority']) => void;
  onClose: () => void;
}

export function QuickCapture({ projects, activeProjectId, onCapture, onClose }: QuickCaptureProps) {
  const t = useT();
  const [val, setVal] = useState('');
  const [pri, setPri] = useState<Task['priority']>('med');
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
