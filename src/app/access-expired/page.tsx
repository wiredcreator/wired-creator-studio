export default function AccessExpiredPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--color-accent-light)' }}
        >
          <svg
            className="h-8 w-8"
            style={{ color: 'var(--color-accent)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        <h1
          className="mb-3 text-2xl font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          Access Paused
        </h1>

        <p
          className="mb-6 text-base leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Your access to Wired Creator is currently inactive. If you think this
          is a mistake, or you&apos;d like to reactivate your account, reach out
          and we&apos;ll get you sorted.
        </p>

        <a
          href="mailto:support@wiredcreator.com"
          className="inline-block rounded-lg px-6 py-3 text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
          }}
        >
          Contact Support
        </a>

        <div className="mt-6">
          <a
            href="/login"
            className="text-sm transition-colors hover:underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
