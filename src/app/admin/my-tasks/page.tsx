import PageWrapper from "@/components/PageWrapper";

export default function MyTasksPage() {
  return (
    <PageWrapper
      title="My Tasks"
      subtitle="Your personal task list and action items."
    >
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Coming soon
        </p>
      </div>
    </PageWrapper>
  );
}
