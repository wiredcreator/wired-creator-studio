"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import VoiceInputWrapper from "@/components/VoiceInputWrapper";

const issueTypes = [
  "UI / Display issue",
  "Feature not working",
  "Performance / loading",
  "Data / content missing",
  "Other",
];

const pageOptions = [
  "Dashboard",
  "Ideas",
  "Scripts",
  "Tasks",
  "Brain Dump",
  "Side Quests",
  "Support",
  "Other",
];

type Severity = "minor" | "annoying" | "blocking";

export default function BugReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [issueType, setIssueType] = useState("");
  const [page, setPage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid = issueType && page && title.trim() && description.trim();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType,
          page,
          title: title.trim(),
          description: description.trim(),
          steps: steps.trim() || null,
          severity: severity || null,
          screenshot,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <PageWrapper>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-bg-tertiary)" }}
          >
            <svg
              className="h-8 w-8"
              style={{ color: "#22c55e" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h2
            className="text-2xl font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Bug report submitted
          </h2>
          <p
            className="text-[15px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Thanks for letting us know. We will look into it as soon as
            possible.
          </p>
          <button
            onClick={() => router.push("/dashboard/support")}
            className="mt-2 px-6 py-2.5 rounded-[var(--radius-md)] text-white text-[15px] font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            Close
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1 text-[14px] mb-8 transition-colors hover:opacity-80"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back
        </Link>

        {/* Header */}
        <div className="flex flex-col mb-10">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] mb-4"
            style={{ backgroundColor: "#fef2f2" }}
          >
            <svg
              className="h-7 w-7"
              style={{ color: "#ef4444" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152-6.135c-.117-1.994-1.783-3.555-3.805-3.555h-6.5c-2.022 0-3.688 1.561-3.805 3.555a23.91 23.91 0 0 1-1.152 6.135A24.082 24.082 0 0 1 12 12.75ZM2.695 18.91a23.707 23.707 0 0 0 2.55-5.636A24.319 24.319 0 0 0 5.5 10.5c0-1.68.345-3.278.968-4.733a1.045 1.045 0 0 0-.393-1.248A2.233 2.233 0 0 0 4.93 4.13a2.25 2.25 0 0 0-1.834 3.59 23.538 23.538 0 0 1-.276 11.19Zm18.61 0a23.538 23.538 0 0 0-.276-11.19 2.25 2.25 0 0 0-1.834-3.59 2.233 2.233 0 0 0-1.145.39 1.045 1.045 0 0 0-.393 1.247A11.943 11.943 0 0 1 18.5 10.5c0 .974-.058 1.935-.17 2.878a23.707 23.707 0 0 0 2.55 5.636l.425.895Z"
              />
            </svg>
          </div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Report a bug
          </h1>
          <p
            className="mt-2 text-[14px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            Help us fix it - the more detail, the faster we can resolve it.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-7">
          {/* Issue type */}
          <fieldset>
            <legend
              className="text-[14px] font-medium mb-3"
              style={{ color: "var(--color-text-primary)" }}
            >
              What type of issue is it?{" "}
              <span style={{ color: "#ef4444" }}>*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {issueTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIssueType(type)}
                  className="px-4 py-2 rounded-full text-[13px] font-medium transition-colors border"
                  style={
                    issueType === type
                      ? {
                          backgroundColor: "var(--color-accent)",
                          borderColor: "var(--color-accent)",
                          color: "#ffffff",
                        }
                      : {
                          backgroundColor: "var(--color-bg-secondary)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text-secondary)",
                        }
                  }
                >
                  {type}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Page select */}
          <div>
            <label
              htmlFor="page-select"
              className="block text-[14px] font-medium mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Where did it happen?{" "}
              <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              id="page-select"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border text-[14px] outline-none ring-0 appearance-none"
              style={{
                borderColor: "var(--color-border)",
                color: page
                  ? "var(--color-text-primary)"
                  : "var(--color-text-muted)",
              }}
            >
              <option value="" disabled>
                Select a page or section...
              </option>
              {pageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="bug-title"
              className="block text-[14px] font-medium mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Short title <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              id="bug-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Script editor doesn't save after typing"
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border text-[14px] outline-none ring-0"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="bug-description"
              className="block text-[14px] font-medium mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              What happened? <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <p
              className="text-[13px] mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Describe exactly what you saw. The more specific, the better.
            </p>
            <VoiceInputWrapper onTranscript={(text) => setDescription((prev) => prev ? prev + '\n' + text : text)}>
            <textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. I clicked Save on my script..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border text-[14px] outline-none ring-0 resize-vertical"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            </VoiceInputWrapper>
          </div>

          {/* Steps to reproduce */}
          <div>
            <label
              htmlFor="bug-steps"
              className="block text-[14px] font-medium mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              Steps to reproduce
            </label>
            <p
              className="text-[13px] mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Optional - but very helpful.
            </p>
            <VoiceInputWrapper onTranscript={(text) => setSteps((prev) => prev ? prev + '\n' + text : text)}>
            <textarea
              id="bug-steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={"1. Go to Scripts\n2. Open any script"}
              rows={3}
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border text-[14px] outline-none ring-0 resize-vertical"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            </VoiceInputWrapper>
          </div>

          {/* Severity */}
          <fieldset>
            <legend
              className="text-[14px] font-medium mb-3"
              style={{ color: "var(--color-text-primary)" }}
            >
              How bad is it blocking you?
            </legend>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { value: "minor", label: "Minor", dotColor: "#22c55e" },
                  { value: "annoying", label: "Annoying", dotColor: "#eab308" },
                  { value: "blocking", label: "Blocking", dotColor: "#ef4444" },
                ] as const
              ).map(({ value, label, dotColor }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSeverity(value)}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-[var(--radius-md)] border text-[14px] font-medium transition-colors"
                  style={
                    severity === value
                      ? {
                          borderColor: "var(--color-accent)",
                          backgroundColor: "var(--color-bg-secondary)",
                          color: "var(--color-text-primary)",
                          borderWidth: "2px",
                        }
                      : {
                          borderColor: "var(--color-border)",
                          backgroundColor: "var(--color-bg-secondary)",
                          color: "var(--color-text-secondary)",
                        }
                  }
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Screenshot upload */}
          <div>
            <label
              className="block text-[14px] font-medium mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              Attach a screenshot
            </label>
            <p
              className="text-[13px] mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Optional - PNG, JPG, GIF or MP4
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,video/mp4"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-6 rounded-[var(--radius-md)] border-2 border-dashed text-[14px] transition-colors"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg-secondary)",
                color: "var(--color-text-muted)",
              }}
            >
              {fileName ? (
                <span style={{ color: "var(--color-text-primary)" }}>
                  {fileName}
                </span>
              ) : (
                <span className="flex flex-col items-center gap-1">
                  <svg
                    className="h-5 w-5 mb-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  Click to attach a file
                </span>
              )}
            </button>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-md)] text-white text-[15px] font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
            {submitting ? "Submitting..." : "Submit Bug Report"}
          </button>
        </form>
      </div>
    </PageWrapper>
  );
}
