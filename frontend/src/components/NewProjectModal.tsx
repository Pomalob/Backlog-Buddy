import { useState, useEffect, useRef } from 'react';
import type { Project } from '../types';
import { api } from '../api';
import { useT } from '../i18n';
import { IconPlus } from './icons';

interface NewProjectModalProps {
  onClose: () => void;
  onAdd: (p: Project) => void;
}

export function NewProjectModal({ onClose, onAdd }: NewProjectModalProps) {
  const t = useT();
  const [name, setName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [goal, setGoal] = useState('');
  const [due, setDue] = useState('');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleCreate = () => {
    if (!name.trim() || creating) return;
    const payload = {
      name: name.trim(),
      emoji: abbr.trim().toUpperCase().slice(0, 2) || name.slice(0, 2).toUpperCase(),
      color: 'hsl(var(--surface-2))',
      goal: goal.trim() || 'No goal set yet.',
      status: 'idea' as const,
      deadline: due.trim() || null,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };
    setCreating(true);
    setError('');
    api.projects.create(payload)
      .then(created => {
        onAdd(created);
        onClose();
      })
      .catch(() => {
        setError(t('np_create_error'));
        setCreating(false);
      });
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
          {error && (
            <div style={{
              fontSize: 12.5,
              color: 'hsl(var(--destructive, 0 70% 55%))',
              background: 'hsl(var(--destructive, 0 70% 55%) / 0.1)',
              border: '1px solid hsl(var(--destructive, 0 70% 55%) / 0.3)',
              borderRadius: 6, padding: '8px 12px',
            }}>
              {error}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--surface-1))', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="bb-btn" data-variant="ghost" onClick={onClose} disabled={creating}>{t('np_cancel')}</button>
          <button className="bb-btn" data-variant="primary" onClick={handleCreate}
            style={{ opacity: name.trim() && !creating ? 1 : 0.5 }}>
            <IconPlus size={13} /> {creating ? '…' : t('np_create')}
          </button>
        </div>
      </div>
    </div>
  );
}
