interface XPStreakCardProps {
  lifetimeXP: number;
  currentStreak: number;
  bestStreak: number;
}

export default function XPStreakCard({ lifetimeXP, currentStreak, bestStreak }: XPStreakCardProps) {
  return (
    <div style={{
      borderRadius: 16,
      backgroundColor: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Lifetime XP */}
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lifetime XP</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {lifetimeXP.toLocaleString()}
          </p>
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--color-border)' }} />

        {/* Current Streak */}
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current streak</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {currentStreak} <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--color-text-muted)' }}>days</span>
          </p>
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--color-border)' }} />

        {/* Best Streak */}
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Best streak</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {bestStreak} <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--color-text-muted)' }}>days</span>
          </p>
        </div>
      </div>
    </div>
  );
}
