interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  wide?: boolean;
}

export default function PageWrapper({ children, title, subtitle, wide }: PageWrapperProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className={`mx-auto px-6 py-10 sm:px-10 sm:py-12 ${wide ? 'max-w-7xl' : 'max-w-4xl'}`}>
        {(title || subtitle) && (
          <div className="mb-10">
            {title && (
              <h1 className="text-3xl tracking-tight" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
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
