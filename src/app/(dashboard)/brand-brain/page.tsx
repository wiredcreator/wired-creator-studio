import PageWrapper from "@/components/PageWrapper";

export default function BrandBrainPage() {
  return (
    <PageWrapper title="Brand Brain" subtitle="Your AI context layer. Everything that makes your content uniquely yours.">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Tone of Voice", description: "Your writing style, vocabulary, and personality markers." },
          { title: "Content Pillars", description: "The core topics you create around." },
          { title: "Target Audience", description: "Who you're speaking to and what they care about." },
          { title: "Voice Transcripts", description: "Raw voice storm recordings and transcriptions." },
        ].map((section) => (
          <div
            key={section.title}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-sm)]"
          >
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{section.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{section.description}</p>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
