import Link from "next/link";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
}

export default function StatCard({ label, value, href }: StatCardProps) {
  const subtitle = `${value} ${label.toLowerCase()}`;

  const content = (
    <div className="relative overflow-hidden" style={{ borderRadius: 16, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', padding: '16px 18px', minHeight: 140 }}>
      {/* Header with label and arrow */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
        <svg style={{ width: 14, height: 14, color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
      {/* Subtitle */}
      <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)', lineHeight: 1 }}>
        {subtitle}
      </p>
      {/* Sky-blue gradient bottom — taller, softer */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: '60%',
          background: 'linear-gradient(180deg, rgba(184,222,240,0) 0%, rgba(184,222,240,0.25) 25%, rgba(108,199,229,0.45) 55%, rgba(38,131,235,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );

  if (href) {
    return <Link href={href} className="block transition-transform hover:scale-[1.02]">{content}</Link>;
  }
  return content;
}
