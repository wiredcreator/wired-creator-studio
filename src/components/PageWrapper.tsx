interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function PageWrapper({ children, title, subtitle }: PageWrapperProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10 sm:py-12">
        {(title || subtitle) && (
          <div className="mb-10">
            {title && (
              <h1 className="text-3xl font-normal tracking-tight text-[var(--color-text-primary)]">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
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
