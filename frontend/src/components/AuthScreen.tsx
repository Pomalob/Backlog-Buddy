import { useState } from 'react';
import { api, setToken, setRefreshToken } from '../api';
import { useT } from '../i18n';
import type { UserOut } from '../types';

interface AuthScreenProps {
  onAuth: (user: UserOut) => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const t = useT();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: 'hsl(var(--surface-1))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'calc(var(--radius) - 2px)',
    color: 'hsl(var(--foreground))',
    fontSize: 14,
    padding: '10px 12px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 120ms ease',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'hsl(var(--muted-foreground))',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 6,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const tokens = mode === 'login'
        ? await api.auth.login(email, password)
        : await api.auth.register(email, password, displayName.trim() || undefined);
      setToken(tokens.access_token);
      setRefreshToken(tokens.refresh_token);
      const user = await api.auth.me();
      onAuth(user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('401') || msg.includes('Invalid credentials')) {
        setError(t('auth_err_invalid'));
      } else if (msg.includes('400') || msg.includes('already registered')) {
        setError(t('auth_err_taken'));
      } else {
        setError(t('auth_err_connect'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'hsl(var(--surface-0))',
    }}>
      <div style={{
        width: 400,
        maxWidth: '92vw',
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border-strong))',
        borderRadius: 'var(--radius)',
        boxShadow: '0 24px 80px -8px rgba(0,0,0,.5)',
        overflow: 'hidden',
      }}>
        {/* header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid hsl(var(--border))',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
            BB
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {mode === 'login' ? t('auth_welcome_back') : t('auth_create_account')}
          </div>
          <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginTop: 3 }}>
            {mode === 'login' ? t('auth_signin_desc') : t('auth_register_desc')}
          </div>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label style={labelStyle}>{t('auth_display_name')}</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={t('auth_your_name')}
                style={fieldStyle}
              />
            </div>
          )}
          <div>
            <label style={labelStyle}>{t('auth_email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t('auth_password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? t('auth_min_chars') : '••••••••'}
              required
              style={fieldStyle}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12.5,
              color: 'hsl(var(--destructive, 0 70% 55%))',
              background: 'hsl(var(--destructive, 0 70% 55%) / 0.1)',
              border: '1px solid hsl(var(--destructive, 0 70% 55%) / 0.3)',
              borderRadius: 6,
              padding: '8px 12px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="bb-btn"
            data-variant="primary"
            style={{ marginTop: 4, width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t('auth_wait') : mode === 'login' ? t('auth_sign_in') : t('auth_create_account')}
          </button>
        </form>

        {/* footer */}
        <div style={{
          padding: '14px 28px 20px',
          borderTop: '1px solid hsl(var(--border))',
          fontSize: 13,
          color: 'hsl(var(--muted-foreground))',
          textAlign: 'center',
        }}>
          {mode === 'login' ? (
            <>
              {t('auth_no_account')}{' '}
              <button
                onClick={() => { setMode('register'); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'default', fontSize: 13, fontFamily: 'inherit', padding: 0 }}
              >
                {t('auth_register')}
              </button>
            </>
          ) : (
            <>
              {t('auth_have_account')}{' '}
              <button
                onClick={() => { setMode('login'); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'default', fontSize: 13, fontFamily: 'inherit', padding: 0 }}
              >
                {t('auth_sign_in')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
