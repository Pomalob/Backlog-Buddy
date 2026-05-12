import { HealthScore, KanbanCard, Progress, StatusDot, Switch } from './ui';
import { IconPlus, IconBolt, IconCheck, IconAlert } from './icons';

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ marginBottom: 14 }}>
        <h2 className="t-h2" style={{ margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'hsl(var(--muted-foreground))', maxWidth: 720 }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ width: 130, fontSize: 11, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function DensityDemo({ mode }: { mode: 'compact' | 'comfortable' }) {
  return (
    <div className={`density-${mode}`} style={{
      background: 'hsl(var(--surface-1))', border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--radius)', padding: 'var(--space-5)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{mode}</span>
        <span className="bb-pill">--row-h: var(--row-h)</span>
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{
          height: 'var(--row-h)',
          background: 'hsl(var(--surface-2))', borderRadius: 5,
          padding: '0 var(--space-3)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12.5,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(var(--primary))' }} />
          Sample row {i}
        </div>
      ))}
    </div>
  );
}

export function SystemScreen() {
  const swatches = [
    { token: 'background',  desc: 'App canvas' },
    { token: 'card',        desc: 'Surface 1' },
    { token: 'secondary',   desc: 'Subtle bg / chips' },
    { token: 'muted',       desc: 'Muted bg' },
    { token: 'primary',     desc: 'Highest-contrast surface' },
    { token: 'accent',      desc: 'Tinted brand bg' },
    { token: 'destructive', desc: 'Critical only' },
    { token: 'warning',     desc: 'At-risk states' },
    { token: 'success',     desc: 'Healthy / done' },
    { token: 'border',      desc: 'Hairlines' },
    { token: 'muted-foreground', desc: 'Caption text' },
    { token: 'foreground',  desc: 'Body text' },
  ];

  const typeRows = [
    { name: 'Heading 1', className: 't-h1', spec: 'Geist 28 / 1.2 / 600 / -0.02em' },
    { name: 'Heading 2', className: 't-h2', spec: 'Geist 20 / 1.3 / 600 / -0.015em' },
    { name: 'Heading 3', className: 't-h3', spec: 'Geist 15 / 1.4 / 600' },
    { name: 'Body',      className: 't-body', spec: 'Geist 14 / 1.5 / 400' },
    { name: 'Small',     className: 't-small', spec: 'Geist 13 / 1.45 / 400' },
    { name: 'Caption',   className: 't-caption', spec: 'Geist 11.5 / 1.4 / 400 muted' },
    { name: 'Mono',      className: 'font-mono t-mono', spec: 'JetBrains Mono 12.5 / 1.5' },
  ];

  return (
    <div style={{ padding: '24px 32px 80px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div className="t-caption" style={{ marginBottom: 4 }}>Internal · /system</div>
        <h1 className="t-h1" style={{ margin: 0, marginBottom: 6 }}>Backlog Buddy — design system</h1>
        <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: 14, maxWidth: 680 }}>
          Calm, dark-first, strictly monochrome. Built on shadcn/ui primitives (Radix) with HSL CSS variables so light/dark
          and density swap without re-skinning.
        </p>
      </div>

      {/* Mood board */}
      <Section title="Mood board" subtitle="Three references that shaped the visual choices.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { name: 'Linear',  hint: 'Information density without clutter. Hairline borders, sub-12 captions, tabular nums.', swatch: ['hsl(0 0% 96%)','hsl(0 0% 16%)','hsl(0 0% 56%)'] },
            { name: 'Height',  hint: 'Calm productivity vibe. Soft accents, generous whitespace, no red dots everywhere.',   swatch: ['hsl(0 0% 88%)','hsl(0 0% 8%)','hsl(0 0% 38%)'] },
            { name: 'Raycast', hint: 'Mono-friendly typography. Command-driven affordances. Subtle keyboard hints.',         swatch: ['hsl(0 0% 12%)','hsl(0 0% 75%)','hsl(0 0% 42%)'] },
          ].map((r) => (
            <div key={r.name} className="bb-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {r.swatch.map((c, i) => (
                  <span key={i} style={{ flex: 1, height: 28, borderRadius: 4, background: c, border: '1px solid hsl(var(--border))' }} />
                ))}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>{r.hint}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 12.5, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, maxWidth: 760 }}>
          <strong style={{ color: 'hsl(var(--foreground))' }}>Why monochrome:</strong> a backlog tool should subtract
          noise, not add it. Color carries meaning everywhere else in the user's day — here, intensity (96% → 38% gray),
          stroke weight, and dashed outlines do the work. Status reads instantly without the dopamine-hit palette of typical
          PM tools. The whole UI is encoded in 12 grays.
        </div>
      </Section>

      {/* Color tokens */}
      <Section title="Color tokens" subtitle="HSL CSS variables, shadcn-compatible. Toggle theme in Tweaks.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {swatches.map((s) => (
            <div key={s.token} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 56, borderRadius: 7, background: `hsl(var(--${s.token}))`, border: '1px solid hsl(var(--border))' }} />
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600 }} className="font-mono">--{s.token}</div>
                <div style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { name: 'Priority · low',  v: '--pri-low' },
            { name: 'Priority · med',  v: '--pri-med' },
            { name: 'Priority · high', v: '--pri-high' },
            { name: 'Health · good',   v: '--health-good' },
            { name: 'Health · warn',   v: '--health-warn' },
            { name: 'Health · bad',    v: '--health-bad' },
          ].map((p) => (
            <div key={p.v} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: `hsl(var(${p.v}))`, border: '1px solid hsl(var(--border))' }} />
              <span style={{ fontSize: 11.5 }} className="font-mono">{p.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography" subtitle="Geist for UI, JetBrains Mono for code & numerics.">
        <div className="bb-card" style={{ padding: 0, overflow: 'hidden' }}>
          {typeRows.map((r, i) => (
            <div key={r.name} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 280px',
              padding: '16px 20px', gap: 20, alignItems: 'baseline',
              borderBottom: i < typeRows.length - 1 ? '1px solid hsl(var(--border))' : 'none',
            }}>
              <span style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{r.name}</span>
              <span className={r.className}>The quick fox jumps{r.name === 'Mono' && <span> · const x = 42;</span>}</span>
              <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{r.spec}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Health Score variants */}
      <Section title="Health Score · 3 variants" subtitle="Same data, three densities. Use ring on cards, gauge on detail headers, bar in lists.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { variant: 'ring' as const,  label: 'Ring (default)',      desc: 'Compact. Score-in-center. Best in dense card grids.' },
            { variant: 'gauge' as const, label: 'Semi-circle gauge',   desc: 'More expressive. Use as the hero stat on detail pages.' },
            { variant: 'bar' as const,   label: 'Segmented bar',       desc: 'Linear & inline-friendly. Use in tables, list rows.' },
          ].map((v) => (
            <div key={v.variant} className="bb-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v.label}</div>
                <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{v.desc}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '16px 0', background: 'hsl(var(--surface-2))', borderRadius: 7, gap: 12 }}>
                <HealthScore score={84} variant={v.variant} size={v.variant === 'gauge' ? 100 : 56} showLabel />
                <HealthScore score={52} variant={v.variant} size={v.variant === 'gauge' ? 100 : 56} showLabel />
                <HealthScore score={28} variant={v.variant} size={v.variant === 'gauge' ? 100 : 56} showLabel />
              </div>
              <div style={{ display: 'flex', gap: 6, fontSize: 10.5, color: 'hsl(var(--muted-foreground))', justifyContent: 'space-around' }}>
                <span>Healthy ≥70</span><span>At risk 40–69</span><span>Critical &lt;40</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Kanban card states */}
      <Section title="Kanban card · states" subtitle="Priority on the left edge. Drag state lifts and rotates.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Default · low',     task: { id: 'x1', title: 'Sketch onboarding flow for first-time users', priority: 'low' as const, tags: ['onboarding'], subtaskTotal: 0, subtaskDone: 0, comments: 1 } },
            { label: 'Medium + due date', task: { id: 'x2', title: 'Wire up Kanban drag handle to dnd-kit sensors', priority: 'med' as const, due: 'May 06', tags: ['frontend'], subtaskDone: 1, subtaskTotal: 3, comments: 0 } },
            { label: 'High · overdue',    task: { id: 'x3', title: 'Health-score worker — finish edge cases', priority: 'high' as const, due: 'Apr 24', overdue: true, tags: ['backend'], subtaskDone: 2, subtaskTotal: 4, comments: 3, assignee: 'M' } },
            { label: 'Dragging',          task: { id: 'x4', title: 'Risk matrix data model + zod schema', priority: 'med' as const, tags: ['backend'], subtaskDone: 3, subtaskTotal: 3, comments: 2, assignee: 'M' }, dragging: true },
          ].map((c) => (
            <div key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{c.label}</div>
              <div style={{ background: 'hsl(var(--surface-1) / 0.6)', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: 14 }}>
                <KanbanCard task={c.task} dragging={c.dragging} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Primitives */}
      <Section title="Primitives" subtitle="Buttons, pills, tabs, progress, switches — all keyed to tokens.">
        <div className="bb-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Row label="Buttons">
            <button className="bb-btn" data-variant="primary"><IconPlus size={13} /> Primary</button>
            <button className="bb-btn">Secondary</button>
            <button className="bb-btn" data-variant="ghost">Ghost</button>
            <button className="bb-btn" data-size="sm">Small</button>
            <button className="bb-btn" data-size="icon"><IconBolt size={13} /></button>
          </Row>
          <Row label="Badges / pills">
            <span className="bb-pill"><StatusDot status="active" /> active</span>
            <span className="bb-pill" data-tone="primary"><StatusDot status="idea" /> idea</span>
            <span className="bb-pill"><StatusDot status="paused" /> paused</span>
            <span className="bb-pill" data-tone="good"><IconCheck size={11} /> healthy</span>
            <span className="bb-pill" data-tone="warn"><IconAlert size={11} /> at risk</span>
            <span className="bb-pill" data-tone="bad"><IconAlert size={11} /> critical</span>
            <span className="bb-pill">#frontend</span>
          </Row>
          <Row label="Tabs">
            <div className="bb-tabs">
              <span className="bb-tab" data-active="true">Kanban</span>
              <span className="bb-tab">Timeline</span>
              <span className="bb-tab">Risks</span>
              <span className="bb-tab">Notes</span>
            </div>
          </Row>
          <Row label="Progress">
            <div style={{ width: 220 }}><Progress value={32} height={4} /></div>
            <div style={{ width: 220 }}><Progress value={64} height={4} /></div>
            <div style={{ width: 220 }}><Progress value={92} height={4} /></div>
          </Row>
          <Row label="Switch">
            <Switch value={true} onChange={() => {}} />
            <Switch value={false} onChange={() => {}} />
          </Row>
          <Row label="Kbd hints">
            {['C', '⌘ K', 'Esc'].map((k) => (
              <span key={k} className="font-mono" style={{ background: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))', padding: '3px 8px', borderRadius: 5, fontSize: 12 }}>{k}</span>
            ))}
          </Row>
        </div>
      </Section>

      {/* Density modes */}
      <Section title="Density modes" subtitle="Comfortable by default. Compact for power users — toggle in Tweaks.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <DensityDemo mode="compact" />
          <DensityDemo mode="comfortable" />
        </div>
      </Section>

      {/* Breakpoints */}
      <Section title="Breakpoints" subtitle="Desktop primary (1280+). Tablet collapses sidebar. Mobile is read-only.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { name: 'Desktop', w: '≥1280', note: 'Sidebar 224 · 2-col dashboard · 4-col Kanban', h: 90 },
            { name: 'Tablet',  w: '768–1279', note: 'Sidebar collapses to 56 · 1-col dashboard · 2×2 Kanban', h: 70 },
            { name: 'Mobile',  w: '<768', note: 'Bottom-tab nav · single-col list · Kanban as sequential lists', h: 50 },
          ].map((b) => (
            <div key={b.name} className="bb-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{b.w}px</span>
              </div>
              <div style={{ width: '100%', height: b.h, borderRadius: 6, background: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6,
                  width: b.name === 'Desktop' ? 18 : b.name === 'Tablet' ? 8 : 0,
                  background: 'hsl(var(--primary) / 0.5)', borderRadius: 3 }} />
                <div style={{ position: 'absolute', right: 6, top: 6, bottom: 6, left: b.name === 'Mobile' ? 6 : 30,
                  background: 'hsl(var(--surface-3))', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>{b.note}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
