export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] flex-col justify-between bg-[var(--color-bg-sidebar)] p-12 relative overflow-hidden">
        {/* Decorative gradient orb */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[var(--color-accent)] opacity-[0.06] blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[var(--color-accent)] opacity-[0.04] blur-[80px]" />

        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]">
              <svg className="h-4.5 w-4.5 text-[var(--color-bg-dark)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              Wired Studio
            </span>
          </div>

          <h2 className="text-4xl leading-[1.15] text-[var(--color-text-primary)]">
            Your content,<br />amplified by AI.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--color-text-secondary)] max-w-sm">
            A creative workspace built for the way your brain actually works. No shame. No pressure. Just great content.
          </p>
        </div>

        <p className="text-[12px] text-[var(--color-text-muted)]">
          Wired Creator Studio
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]">
              <svg className="h-4 w-4 text-[var(--color-bg-dark)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              Wired Studio
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
