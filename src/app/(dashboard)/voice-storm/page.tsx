import PageWrapper from "@/components/PageWrapper";

export default function VoiceStormPage() {
  return (
    <PageWrapper title="Voice Storm" subtitle="Talk it out. We'll capture and organize your thoughts.">
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
          <svg className="h-7 w-7 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          Tap to start recording. Just talk naturally — no structure needed.
        </p>
      </div>
    </PageWrapper>
  );
}
