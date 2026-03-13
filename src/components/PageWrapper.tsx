interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function PageWrapper({ children, title, subtitle }: PageWrapperProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8 sm:px-8 sm:py-10">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
