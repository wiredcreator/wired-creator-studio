"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import TaskCard, { TaskData } from "@/components/tasks/TaskCard";
import ToneOfVoiceEditor from "@/components/brand-brain/ToneOfVoiceEditor";
import CoachNotes from "@/components/admin/CoachNotes";
import EquipmentChecklist from "@/components/admin/EquipmentChecklist";
import BodyDoubleAssignment from "@/components/admin/BodyDoubleAssignment";
import type { ToneOfVoiceParameter } from "@/types/ai";

interface StudentInfo {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  background?: string;
  neurodivergentProfile?: string;
  contentGoals?: string;
  riskFlags?: string[];
  city?: string;
  state?: string;
  timezone?: string;
  onboardingCompleted?: boolean;
  bodyDoubleId?: string;
  bodyDoubleName?: string;
  currentWeekNumber?: number;
}

type TovStatus = "draft" | "review" | "active";

interface ToneOfVoiceGuideData {
  _id: string;
  parameters: ToneOfVoiceParameter[];
  status: TovStatus;
  version: number;
}

interface BrandBrainData {
  _id: string;
  toneOfVoiceGuide?: ToneOfVoiceGuideData | null;
  contentPillars?: Array<{
    title: string;
    description: string;
    keywords?: string[];
  }>;
  industryData?: {
    field?: string;
    keywords?: string[];
    competitors?: string[];
  };
  equipmentProfile?: {
    camera?: string;
    location?: string;
    constraints?: string;
  };
  equipmentChecklist?: Array<{
    label: string;
    checked: boolean;
  }>;
}

// --- Tab data interfaces ---
interface IdeaItem {
  _id: string;
  title: string;
  description: string;
  status: string;
  contentPillar: string;
  source: string;
  tags: string[];
  createdAt: string;
}

interface ScriptItem {
  _id: string;
  title: string;
  status: string;
  fullScript: string;
  bulletPoints: string[];
  ideaId?: { _id: string; title: string; status: string; contentPillar: string } | null;
  createdAt: string;
}

interface BrainDumpItem {
  _id: string;
  source: string;
  callType: string;
  extractedIdeas: Array<{ title: string; description: string }>;
  extractedStories: Array<{ summary: string; fullText: string }>;
  extractedThemes: string[];
  priority: string;
  tags: string[];
  createdAt: string;
}

interface VoiceStormItem {
  _id: string;
  title?: string;
  sessionType: string;
  extractedInsights: Array<{ type: string; content: string; contentPillar: string }>;
  duration: number;
  createdAt: string;
}

type TabKey = "tasks" | "ideas" | "scripts" | "brainDumps" | "voiceStorming" | "brandBrain" | "aiDocuments";

const TABS: { key: TabKey; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "ideas", label: "Ideas" },
  { key: "scripts", label: "Scripts" },
  { key: "brainDumps", label: "Brain Dumps" },
  { key: "voiceStorming", label: "Voice Storming" },
  { key: "brandBrain", label: "Brand Brain" },
  { key: "aiDocuments", label: "AI Documents" },
];

const TASK_TYPES = [
  { value: "watch_module", label: "Watch Module" },
  { value: "voice_storm", label: "Voice Storm" },
  { value: "submit_content", label: "Submit Content" },
  { value: "film_video", label: "Film Video" },
  { value: "side_quest", label: "Side Quest" },
  { value: "review_script", label: "Review Script" },
  { value: "custom", label: "Custom" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- Status badge helpers ---
function ideaStatusColor(status: string): string {
  switch (status) {
    case "approved": return "bg-emerald-600 text-white";
    case "saved": return "bg-sky-600 text-white";
    case "scripted": return "bg-violet-600 text-white";
    case "filmed": return "bg-amber-600 text-white";
    case "published": return "bg-emerald-700 text-white";
    case "rejected": return "bg-red-600 text-white";
    case "suggested":
    default: return "bg-[var(--color-bg-tertiary)] text-white";
  }
}

function scriptStatusColor(status: string): string {
  switch (status) {
    case "draft": return "bg-[var(--color-bg-tertiary)] text-white";
    case "review": return "bg-sky-600 text-white";
    case "approved": return "bg-emerald-600 text-white";
    case "filming": return "bg-amber-600 text-white";
    case "completed": return "bg-violet-600 text-white";
    case "published": return "bg-emerald-700 text-white";
    default: return "bg-[var(--color-bg-tertiary)] text-white";
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case "high": return "bg-red-600 text-white";
    case "medium": return "bg-amber-600 text-white";
    case "low":
    default: return "bg-[var(--color-bg-tertiary)] text-white";
  }
}

function sessionTypeLabel(type: string): string {
  switch (type) {
    case "freeform": return "Freeform";
    case "guided": return "Guided";
    case "idea_specific": return "Idea Specific";
    default: return type;
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// --- Skeleton loader ---
function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
      <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // --- Active tab ---
  const [activeTab, setActiveTab] = useState<TabKey>("tasks");

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [coachId, setCoachId] = useState("");

  // Content options for linking tasks to ideas/scripts
  const [contentOptions, setContentOptions] = useState<
    Array<{ _id: string; title: string; type: 'idea' | 'script' }>
  >([]);
  const [contentOptionsLoaded, setContentOptionsLoaded] = useState(false);

  // Generate ideas state
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [generateIdeasError, setGenerateIdeasError] = useState("");

  // Advance week state
  const [advancingWeek, setAdvancingWeek] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    type: "custom",
    dueDate: "",
    weekNumber: 1,
    dayOfWeek: 1,
    embeddedVideoUrl: "",
    order: 0,
    linkedContentId: "",
    linkedContentType: "" as "" | "idea" | "script",
    linkedContentTitle: "",
  });

  // Tone of Voice review state
  const [tovGuide, setTovGuide] = useState<ToneOfVoiceGuideData | null>(null);
  const [showTovEditor, setShowTovEditor] = useState(false);
  const [tovUpdating, setTovUpdating] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    type: "custom",
    dueDate: "",
    weekNumber: 1,
    dayOfWeek: 1,
    embeddedVideoUrl: "",
    linkedContentId: "",
    linkedContentType: "" as "" | "idea" | "script",
    linkedContentTitle: "",
  });

  // --- Tab data states ---
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasLoaded, setIdeasLoaded] = useState(false);

  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const [brainDumps, setBrainDumps] = useState<BrainDumpItem[]>([]);
  const [brainDumpsLoading, setBrainDumpsLoading] = useState(false);
  const [brainDumpsLoaded, setBrainDumpsLoaded] = useState(false);

  const [voiceStorms, setVoiceStorms] = useState<VoiceStormItem[]>([]);
  const [voiceStormsLoading, setVoiceStormsLoading] = useState(false);
  const [voiceStormsLoaded, setVoiceStormsLoaded] = useState(false);

  const [brandBrain, setBrandBrain] = useState<BrandBrainData | null>(null);
  const [brandBrainLoading, setBrandBrainLoading] = useState(false);
  const [brandBrainLoaded, setBrandBrainLoaded] = useState(false);

  const [aiDocuments, setAiDocuments] = useState<any[]>([]);
  const [aiDocsLoading, setAiDocsLoading] = useState(false);
  const [aiDocsLoaded, setAiDocsLoaded] = useState(false);
  const [globalAiDocs, setGlobalAiDocs] = useState<any[]>([]);
  const [aiDocForm, setAiDocForm] = useState<{ title: string; category: string; content: string } | null>(null);
  const [aiDocEditingId, setAiDocEditingId] = useState<string | null>(null);
  const [aiDocSaving, setAiDocSaving] = useState(false);

  // Transcript ingest form state
  const [ingestTranscript, setIngestTranscript] = useState("");
  const [ingestCallType, setIngestCallType] = useState<"1on1" | "group">("1on1");
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestFeedback, setIngestFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch coach session
  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.id) {
          setCoachId(session.user.id);
        }
      } catch {
        // Session fetch failed
      }
    }
    getSession();
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tasks?userId=${id}&weekNumber=${selectedWeek}`
      );
      if (res.ok) {
        const data = await res.json();
        setTasks(data.data || data);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  }, [id, selectedWeek]);

  const fetchContentOptions = useCallback(async () => {
    if (contentOptionsLoaded) return;
    try {
      const [ideasRes, scriptsRes] = await Promise.all([
        fetch(`/api/ideas?userId=${id}&limit=100`),
        fetch(`/api/scripts?userId=${id}&limit=100`),
      ]);
      const options: Array<{ _id: string; title: string; type: 'idea' | 'script' }> = [];
      if (ideasRes.ok) {
        const ideasData = await ideasRes.json();
        const ideasList = ideasData.data || ideasData;
        if (Array.isArray(ideasList)) {
          for (const idea of ideasList) {
            options.push({ _id: idea._id, title: idea.title, type: 'idea' });
          }
        }
      }
      if (scriptsRes.ok) {
        const scriptsData = await scriptsRes.json();
        const scriptsList = scriptsData.data || scriptsData;
        if (Array.isArray(scriptsList)) {
          for (const script of scriptsList) {
            options.push({ _id: script._id, title: script.title, type: 'script' });
          }
        }
      }
      setContentOptions(options);
      setContentOptionsLoaded(true);
    } catch (err) {
      console.error("Error fetching content options:", err);
    }
  }, [id, contentOptionsLoaded]);

  // Fetch student info
  useEffect(() => {
    async function fetchStudent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/users?userId=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.user) setStudent(data.user);
          else if (data) setStudent(data);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }

    fetchStudent();
  }, [id]);

  // Fetch Brand Brain for TOV review (always needed for the alert card)
  useEffect(() => {
    async function fetchBrandBrainForTov() {
      try {
        const res = await fetch(`/api/brand-brain?userId=${id}`);
        if (res.ok) {
          const data: BrandBrainData = await res.json();
          if (data.toneOfVoiceGuide) {
            setTovGuide(data.toneOfVoiceGuide);
          }
        }
      } catch {
        // Brand Brain may not exist yet
      }
    }
    fetchBrandBrainForTov();
  }, [id]);

  // Lazy load tab data
  useEffect(() => {
    if (activeTab === "ideas" && !ideasLoaded) {
      setIdeasLoading(true);
      fetch(`/api/ideas?userId=${id}&limit=100`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.data) setIdeas(data.data);
          else if (Array.isArray(data)) setIdeas(data);
          setIdeasLoaded(true);
        })
        .catch(() => {})
        .finally(() => setIdeasLoading(false));
    }
  }, [activeTab, id, ideasLoaded]);

  useEffect(() => {
    if (activeTab === "scripts" && !scriptsLoaded) {
      setScriptsLoading(true);
      fetch(`/api/scripts?userId=${id}&limit=100`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.data) setScripts(data.data);
          else if (Array.isArray(data)) setScripts(data);
          setScriptsLoaded(true);
        })
        .catch(() => {})
        .finally(() => setScriptsLoading(false));
    }
  }, [activeTab, id, scriptsLoaded]);

  useEffect(() => {
    if (activeTab === "brainDumps" && !brainDumpsLoaded) {
      setBrainDumpsLoading(true);
      fetch(`/api/brain-dump?userId=${id}&limit=100`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.data) setBrainDumps(data.data);
          else if (Array.isArray(data)) setBrainDumps(data);
          setBrainDumpsLoaded(true);
        })
        .catch(() => {})
        .finally(() => setBrainDumpsLoading(false));
    }
  }, [activeTab, id, brainDumpsLoaded]);

  useEffect(() => {
    if (activeTab === "voiceStorming" && !voiceStormsLoaded) {
      setVoiceStormsLoading(true);
      fetch(`/api/voice-storming?userId=${id}&limit=100`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.data) setVoiceStorms(data.data);
          else if (Array.isArray(data)) setVoiceStorms(data);
          setVoiceStormsLoaded(true);
        })
        .catch(() => {})
        .finally(() => setVoiceStormsLoading(false));
    }
  }, [activeTab, id, voiceStormsLoaded]);

  useEffect(() => {
    if (activeTab === "brandBrain" && !brandBrainLoaded) {
      setBrandBrainLoading(true);
      fetch(`/api/brand-brain?userId=${id}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setBrandBrain(data);
          setBrandBrainLoaded(true);
        })
        .catch(() => {})
        .finally(() => setBrandBrainLoading(false));
    }
  }, [activeTab, id, brandBrainLoaded]);

  useEffect(() => {
    if (activeTab === "aiDocuments" && !aiDocsLoaded) {
      setAiDocsLoading(true);
      Promise.all([
        fetch(`/api/admin/ai-documents?scope=user&userId=${id}`).then((res) => res.ok ? res.json() : []),
        fetch(`/api/admin/ai-documents?scope=global`).then((res) => res.ok ? res.json() : []),
      ])
        .then(([userData, globalData]) => {
          setAiDocuments(Array.isArray(userData) ? userData : []);
          setGlobalAiDocs(Array.isArray(globalData) ? globalData : []);
          setAiDocsLoaded(true);
        })
        .catch(() => {})
        .finally(() => setAiDocsLoading(false));
    }
  }, [activeTab, id, aiDocsLoaded]);

  // Tone of Voice review actions
  const handleTovStatusChange = async (newStatus: TovStatus) => {
    if (!tovGuide) return;
    setTovUpdating(true);
    try {
      const res = await fetch(`/api/tone-of-voice/${tovGuide._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTovGuide(updated);
      }
    } catch {
      console.error("Error updating Tone of Voice status");
    } finally {
      setTovUpdating(false);
    }
  };

  const handleTovSave = async (
    params: ToneOfVoiceParameter[],
    _summary: string
  ) => {
    if (!tovGuide) return;
    setTovUpdating(true);
    try {
      const res = await fetch(`/api/tone-of-voice/${tovGuide._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: params }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTovGuide(updated);
      }
    } catch {
      console.error("Error saving Tone of Voice parameters");
    } finally {
      setTovUpdating(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? {
              ...t,
              status: newStatus,
              completedAt:
                newStatus === "completed"
                  ? new Date().toISOString()
                  : undefined,
            }
          : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
    } catch {
      fetchTasks();
    }
  };

  const handleAddComment = async (taskId: string, text: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: coachId, text }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
      }
    } catch {
      console.error("Error adding comment");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.dueDate) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: id,
          title: newTask.title,
          description: newTask.description,
          type: newTask.type,
          dueDate: newTask.dueDate,
          assignedBy: coachId,
          weekNumber: newTask.weekNumber,
          dayOfWeek: newTask.dayOfWeek,
          embeddedVideoUrl: newTask.embeddedVideoUrl,
          order: newTask.order,
          linkedContentId: newTask.linkedContentId || undefined,
          linkedContentType: newTask.linkedContentType || undefined,
          linkedContentTitle: newTask.linkedContentTitle || undefined,
        }),
      });

      if (res.ok) {
        setNewTask({
          title: "",
          description: "",
          type: "custom",
          dueDate: "",
          weekNumber: selectedWeek,
          dayOfWeek: 1,
          embeddedVideoUrl: "",
          order: 0,
          linkedContentId: "",
          linkedContentType: "",
          linkedContentTitle: "",
        });
        setShowAddForm(false);
        fetchTasks();
      }
    } catch (err) {
      console.error("Error creating task:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      }
    } catch {
      console.error("Error deleting task");
    }
  };

  const handleStartEdit = (task: TaskData) => {
    setEditingTask(task._id);
    fetchContentOptions();
    setEditForm({
      title: task.title,
      description: task.description || "",
      type: task.type,
      dueDate: task.dueDate.split("T")[0],
      weekNumber: task.weekNumber,
      dayOfWeek: task.dayOfWeek,
      embeddedVideoUrl: task.embeddedVideoUrl || "",
      linkedContentId: task.linkedContentId || "",
      linkedContentType: (task.linkedContentType || "") as "" | "idea" | "script",
      linkedContentTitle: task.linkedContentTitle || "",
    });
  };

  const handleSaveEdit = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          type: editForm.type,
          dueDate: editForm.dueDate,
          weekNumber: editForm.weekNumber,
          dayOfWeek: editForm.dayOfWeek,
          embeddedVideoUrl: editForm.embeddedVideoUrl,
          linkedContentId: editForm.linkedContentId || undefined,
          linkedContentType: editForm.linkedContentType || undefined,
          linkedContentTitle: editForm.linkedContentTitle || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
        setEditingTask(null);
      }
    } catch {
      console.error("Error updating task");
    }
  };

  // Group tasks by day
  const tasksByDay: Record<number, TaskData[]> = {};
  for (const task of tasks) {
    const day = task.dayOfWeek;
    if (!tasksByDay[day]) tasksByDay[day] = [];
    tasksByDay[day].push(task);
  }

  // Progress stats
  const completedThisWeek = tasks.filter(
    (t) => t.status === "completed"
  ).length;
  const totalThisWeek = tasks.length;

  // Suppress unused warning for handleAddComment — used by TaskCard internally
  void handleAddComment;

  return (
    <PageWrapper
      title={student?.name || "Student Profile"}
      subtitle={student?.email || `Student ID: ${id}`}
    >
      <div className="space-y-6">
        {/* Student info card */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-lg font-semibold text-[var(--color-accent)]">
                {(student?.name || "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {student?.name || "Loading..."}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {student?.createdAt
                    ? `Enrolled since ${new Date(student.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                    : "Enrolled since --"}
                </p>
              </div>
            </div>

            {/* Week progress summary */}
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-muted)]">
                Week {selectedWeek} Progress
              </p>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                {completedThisWeek}/{totalThisWeek}
              </p>
            </div>
          </div>
        </div>

        {/* Tone of Voice Review Card */}
        {tovGuide && (
          <div
            className={`rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-sm)] ${
              tovGuide.status === "draft"
                ? "border-[var(--color-warning)] bg-[var(--color-warning-light)]"
                : tovGuide.status === "review"
                  ? "border-blue-300 bg-blue-50"
                  : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    tovGuide.status === "draft"
                      ? "bg-[var(--color-warning-light)] text-[var(--color-warning)]"
                      : tovGuide.status === "review"
                        ? "bg-blue-200 text-blue-700"
                        : "bg-emerald-200 text-emerald-700"
                  }`}
                >
                  {tovGuide.status === "active" ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  )}
                </div>

                <div>
                  <p
                    className={`text-sm font-medium ${
                      tovGuide.status === "draft"
                        ? "text-[var(--color-warning)]"
                        : tovGuide.status === "review"
                          ? "text-blue-800"
                          : "text-emerald-800"
                    }`}
                  >
                    {tovGuide.status === "draft" &&
                      "This student's Tone of Voice Guide needs review"}
                    {tovGuide.status === "review" &&
                      "Tone of Voice Guide is under review"}
                    {tovGuide.status === "active" &&
                      "Tone of Voice Guide is active"}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      tovGuide.status === "draft"
                        ? "text-[var(--color-warning)]"
                        : tovGuide.status === "review"
                          ? "text-blue-600"
                          : "text-emerald-600"
                    }`}
                  >
                    Version {tovGuide.version} &middot;{" "}
                    {tovGuide.parameters.length} parameters
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Action buttons based on status */}
                {tovGuide.status !== "active" && (
                  <button
                    onClick={() => handleTovStatusChange("active")}
                    disabled={tovUpdating}
                    className="rounded-[var(--radius-md)] bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {tovUpdating ? "Updating..." : "Approve & Activate"}
                  </button>
                )}

                {tovGuide.status === "draft" && (
                  <button
                    onClick={() => handleTovStatusChange("review")}
                    disabled={tovUpdating}
                    className="rounded-[var(--radius-md)] bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark as Reviewing
                  </button>
                )}

                {tovGuide.status === "active" && (
                  <button
                    onClick={() => handleTovStatusChange("review")}
                    disabled={tovUpdating}
                    className="rounded-[var(--radius-md)] bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    Send Back for Review
                  </button>
                )}

                {tovGuide.status === "review" && (
                  <button
                    onClick={() => handleTovStatusChange("draft")}
                    disabled={tovUpdating}
                    className="rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning-light)] disabled:opacity-50"
                  >
                    Send Back to Draft
                  </button>
                )}

                <button
                  onClick={() => setShowTovEditor(!showTovEditor)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  {showTovEditor ? "Hide Editor" : "Review Tone of Voice"}
                </button>
              </div>
            </div>

            {/* Inline Tone of Voice Editor */}
            {showTovEditor && (
              <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
                <ToneOfVoiceEditor
                  initialParameters={tovGuide.parameters}
                  initialSummary=""
                  status={tovGuide.status}
                  onSave={handleTovSave}
                  onStatusChange={handleTovStatusChange}
                />
              </div>
            )}
          </div>
        )}

        {/* Student Profile Cards */}
        {student && (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Student Profile Card */}
            <div className="lg:col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
              <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
                Student Profile
              </h3>
              <div className="space-y-4">
                {/* Background */}
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Background</p>
                  {student.background ? (
                    <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">{student.background}</p>
                  ) : (
                    <p className="text-sm italic text-[var(--color-text-muted)]">Not yet generated</p>
                  )}
                </div>

                {/* Neurodivergent Profile */}
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Neurodivergent Profile</p>
                  {student.neurodivergentProfile ? (
                    <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">{student.neurodivergentProfile}</p>
                  ) : (
                    <p className="text-sm italic text-[var(--color-text-muted)]">Not yet generated</p>
                  )}
                </div>

                {/* Content Goals */}
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Content Goals</p>
                  {student.contentGoals ? (
                    <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">{student.contentGoals}</p>
                  ) : (
                    <p className="text-sm italic text-[var(--color-text-muted)]">Not yet generated</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right column: Risk Flags + Details */}
            <div className="space-y-4">
              {/* Risk Flags Card */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
                <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
                  Risk Flags
                </h3>
                {student.riskFlags && student.riskFlags.length > 0 ? (
                  <ul className="space-y-1">
                    {student.riskFlags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-[3px] shrink-0 text-amber-600">•</span>
                        <span
                          className="text-[11px] leading-snug text-amber-900 dark:text-amber-200"
                        >
                          {flag}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm italic text-[var(--color-text-muted)]">No risk flags</p>
                )}
              </div>

              {/* Body Double Assignment */}
              <BodyDoubleAssignment studentId={student._id} />

              {/* Details Card */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
                <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
                  Details
                </h3>
                <div className="space-y-2">
                  {/* Location */}
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">Location</p>
                    {student.city || student.state ? (
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {[student.city, student.state].filter(Boolean).join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm italic text-[var(--color-text-muted)]">Not provided</p>
                    )}
                  </div>

                  {/* Timezone */}
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">Timezone</p>
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {student.timezone || "Not set"}
                    </p>
                  </div>

                  {/* Join Date */}
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">Joined</p>
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {student.createdAt
                        ? new Date(student.createdAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Unknown"}
                    </p>
                  </div>

                  {/* Onboarding Status */}
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">Onboarding</p>
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {student.onboardingCompleted ? (
                        <span className="text-emerald-500">Completed</span>
                      ) : (
                        <span className="text-amber-500">In Progress</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coach Notes */}
        {student && <CoachNotes studentId={student._id} />}

        {/* Tab Switcher */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
          <div className="flex flex-wrap gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========== TASKS TAB ========== */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            {/* Week selector */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
                16-Week Plan
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 16 }, (_, i) => i + 1).map((week) => (
                  <button
                    key={week}
                    onClick={() => setSelectedWeek(week)}
                    className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedWeek === week
                        ? "bg-[var(--color-accent)] text-[var(--color-bg-dark)]"
                        : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
                    }`}
                  >
                    W{week}
                  </button>
                ))}
              </div>
            </div>

            {/* Advance week */}
            {student?.currentWeekNumber && student.currentWeekNumber < 16 && (
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Current program week: <span className="font-semibold text-[var(--color-text-primary)]">{student.currentWeekNumber}</span>
                </p>
                <button
                  onClick={async () => {
                    const next = (student.currentWeekNumber || 1) + 1;
                    if (!confirm(`Advance ${student.name} to Week ${next}? This will auto-assign any configured task templates.`)) return;
                    setAdvancingWeek(true);
                    try {
                      const res = await fetch("/api/admin/advance-week", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ studentId: id }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setStudent((prev) => prev ? { ...prev, currentWeekNumber: data.newWeekNumber } : prev);
                        setSelectedWeek(data.newWeekNumber);
                        // Refetch tasks for new week
                        const tasksRes = await fetch(`/api/tasks?userId=${id}&weekNumber=${data.newWeekNumber}`);
                        if (tasksRes.ok) {
                          const tasksData = await tasksRes.json();
                          setTasks(tasksData.data || tasksData);
                        }
                      }
                    } catch {}
                    setAdvancingWeek(false);
                  }}
                  disabled={advancingWeek}
                  className="flex items-center gap-1.5 rounded-md bg-[var(--color-bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] outline-none ring-0 transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  {advancingWeek ? "Advancing..." : `Advance to Week ${(student.currentWeekNumber || 1) + 1}`}
                </button>
              </div>
            )}

            {/* Add task button */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Week {selectedWeek} Tasks
              </h3>
              <button
                onClick={() => {
                  setNewTask((prev) => ({ ...prev, weekNumber: selectedWeek }));
                  if (!showAddForm) fetchContentOptions();
                  setShowAddForm(!showAddForm);
                }}
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)]"
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
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Assign Task
              </button>
            </div>

            {/* Add task form */}
            {showAddForm && (
              <form
                onSubmit={handleCreateTask}
                className="animate-fadeIn rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] p-5 shadow-[var(--shadow-sm)]"
              >
                <h4 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
                  New Task for Week {newTask.weekNumber}
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTask.title}
                      onChange={(e) =>
                        setNewTask((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="e.g., Watch Module 3: Scripting Basics"
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Description
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Optional details..."
                      rows={2}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Task Type
                    </label>
                    <select
                      value={newTask.type}
                      onChange={(e) =>
                        setNewTask((prev) => ({ ...prev, type: e.target.value }))
                      }
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                    >
                      {TASK_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                  </div>

                  {/* Day of Week */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Day of Week
                    </label>
                    <select
                      value={newTask.dayOfWeek}
                      onChange={(e) =>
                        setNewTask((prev) => ({
                          ...prev,
                          dayOfWeek: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                    >
                      {DAY_NAMES.map((name, i) => (
                        <option key={i} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Order */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newTask.order}
                      onChange={(e) =>
                        setNewTask((prev) => ({
                          ...prev,
                          order: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                  </div>

                  {/* Video URL */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Video URL (optional)
                    </label>
                    <input
                      type="url"
                      value={newTask.embeddedVideoUrl}
                      onChange={(e) =>
                        setNewTask((prev) => ({
                          ...prev,
                          embeddedVideoUrl: e.target.value,
                        }))
                      }
                      placeholder="https://www.youtube.com/embed/..."
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                  </div>

                  {/* Link to Content */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Link to Content (optional)
                    </label>
                    <select
                      value={newTask.linkedContentId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) {
                          setNewTask((prev) => ({
                            ...prev,
                            linkedContentId: "",
                            linkedContentType: "",
                            linkedContentTitle: "",
                          }));
                        } else {
                          const option = contentOptions.find((o) => o._id === selectedId);
                          if (option) {
                            setNewTask((prev) => ({
                              ...prev,
                              linkedContentId: option._id,
                              linkedContentType: option.type,
                              linkedContentTitle: option.title,
                            }));
                          }
                        }
                      }}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                    >
                      <option value="">None</option>
                      {contentOptions.filter((o) => o.type === 'idea').length > 0 && (
                        <optgroup label="Ideas">
                          {contentOptions
                            .filter((o) => o.type === 'idea')
                            .map((o) => (
                              <option key={o._id} value={o._id}>
                                {o.title}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      {contentOptions.filter((o) => o.type === 'script').length > 0 && (
                        <optgroup label="Scripts">
                          {contentOptions
                            .filter((o) => o.type === 'script')
                            .map((o) => (
                              <option key={o._id} value={o._id}>
                                {o.title}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>

                {/* Form actions */}
                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                  >
                    {submitting ? "Creating..." : "Create Task"}
                  </button>
                </div>
              </form>
            )}

            {/* Tasks by day */}
            {loading && <LoadingSkeleton />}

            {!loading && tasks.length === 0 && (
              <EmptyState message={`No tasks assigned for Week ${selectedWeek} yet. Use the button above to assign tasks.`} />
            )}

            {!loading &&
              DAY_NAMES.map((dayName, dayIndex) => {
                const dayTasks = tasksByDay[dayIndex];
                if (!dayTasks || dayTasks.length === 0) return null;

                return (
                  <div key={dayIndex}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      {dayName}
                    </h4>
                    <div className="space-y-3">
                      {dayTasks.map((task) => {
                        if (editingTask === task._id) {
                          return (
                            <div
                              key={task._id}
                              className="animate-fadeIn rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] p-4"
                            >
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                  <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        title: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <textarea
                                    value={editForm.description}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                      }))
                                    }
                                    rows={2}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
                                  />
                                </div>
                                <select
                                  value={editForm.type}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      type: e.target.value,
                                    }))
                                  }
                                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                                >
                                  {TASK_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="date"
                                  value={editForm.dueDate}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      dueDate: e.target.value,
                                    }))
                                  }
                                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                                />
                                <select
                                  value={editForm.dayOfWeek}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      dayOfWeek: parseInt(e.target.value, 10),
                                    }))
                                  }
                                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                                >
                                  {DAY_NAMES.map((name, i) => (
                                    <option key={i} value={i}>
                                      {name}
                                    </option>
                                  ))}
                                </select>
                                <div className="sm:col-span-2">
                                  <input
                                    type="url"
                                    value={editForm.embeddedVideoUrl}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        embeddedVideoUrl: e.target.value,
                                      }))
                                    }
                                    placeholder="Video URL (optional)"
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                                  />
                                </div>
                                {/* Link to Content */}
                                <div className="sm:col-span-2">
                                  <select
                                    value={editForm.linkedContentId}
                                    onChange={(e) => {
                                      const selectedId = e.target.value;
                                      if (!selectedId) {
                                        setEditForm((prev) => ({
                                          ...prev,
                                          linkedContentId: "",
                                          linkedContentType: "",
                                          linkedContentTitle: "",
                                        }));
                                      } else {
                                        const option = contentOptions.find((o) => o._id === selectedId);
                                        if (option) {
                                          setEditForm((prev) => ({
                                            ...prev,
                                            linkedContentId: option._id,
                                            linkedContentType: option.type,
                                            linkedContentTitle: option.title,
                                          }));
                                        }
                                      }
                                    }}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                                  >
                                    <option value="">No linked content</option>
                                    {contentOptions.filter((o) => o.type === 'idea').length > 0 && (
                                      <optgroup label="Ideas">
                                        {contentOptions
                                          .filter((o) => o.type === 'idea')
                                          .map((o) => (
                                            <option key={o._id} value={o._id}>
                                              {o.title}
                                            </option>
                                          ))}
                                      </optgroup>
                                    )}
                                    {contentOptions.filter((o) => o.type === 'script').length > 0 && (
                                      <optgroup label="Scripts">
                                        {contentOptions
                                          .filter((o) => o.type === 'script')
                                          .map((o) => (
                                            <option key={o._id} value={o._id}>
                                              {o.title}
                                            </option>
                                          ))}
                                      </optgroup>
                                    )}
                                  </select>
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingTask(null)}
                                  className="rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(task._id)}
                                  className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-bg-dark)] hover:bg-[var(--color-accent-hover)]"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={task._id} className="group relative">
                            <TaskCard
                              task={task}
                              onStatusChange={handleStatusChange}
                              onClick={() => {}}
                            />
                            {/* Admin action buttons */}
                            <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() => handleStartEdit(task)}
                                className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
                                title="Edit task"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task._id)}
                                className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-error)]"
                                title="Delete task"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ========== IDEAS TAB ========== */}
        {activeTab === "ideas" && (
          <div className="space-y-4">
            {/* Ideas header with generate button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {ideas.length} idea{ideas.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={async () => {
                  setGeneratingIdeas(true);
                  setGenerateIdeasError("");
                  try {
                    const res = await fetch("/api/ideas/generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ studentId: id }),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data.error || "Failed to generate ideas");
                    }
                    // Refetch ideas
                    const ideasRes = await fetch(`/api/ideas?userId=${id}&limit=100`);
                    if (ideasRes.ok) {
                      const data = await ideasRes.json();
                      setIdeas(data.data || data);
                    }
                  } catch (err) {
                    setGenerateIdeasError(err instanceof Error ? err.message : "Failed to generate ideas");
                  } finally {
                    setGeneratingIdeas(false);
                  }
                }}
                disabled={generatingIdeas}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white outline-none ring-0 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {generatingIdeas ? (
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                  </svg>
                )}
                {generatingIdeas ? "Generating..." : "Generate Ideas"}
              </button>
            </div>
            {generateIdeasError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {generateIdeasError}
              </div>
            )}
            {ideasLoading && <LoadingSkeleton />}
            {!ideasLoading && ideas.length === 0 && (
              <EmptyState message="This student has no content ideas yet." />
            )}
            {!ideasLoading && ideas.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {ideas.map((idea) => (
                  <div
                    key={idea._id}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2">
                        {idea.title}
                      </h4>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ideaStatusColor(idea.status)}`}
                      >
                        {idea.status}
                      </span>
                    </div>
                    {idea.description && (
                      <p className="mt-2 text-xs text-[var(--color-text-muted)] line-clamp-2">
                        {idea.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {idea.contentPillar && (
                        <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white">
                          {idea.contentPillar}
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {new Date(idea.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== SCRIPTS TAB ========== */}
        {activeTab === "scripts" && (
          <div className="space-y-4">
            {scriptsLoading && <LoadingSkeleton />}
            {!scriptsLoading && scripts.length === 0 && (
              <EmptyState message="This student has no scripts yet." />
            )}
            {!scriptsLoading && scripts.length > 0 && (
              <div className="space-y-3">
                {scripts.map((script) => {
                  const wordCount = script.fullScript
                    ? script.fullScript.split(/\s+/).filter(Boolean).length
                    : 0;
                  const bulletCount = script.bulletPoints?.length || 0;

                  return (
                    <div
                      key={script._id}
                      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-sm)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1">
                            {script.title}
                          </h4>
                          {script.ideaId && (
                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                              Idea: {script.ideaId.title}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${scriptStatusColor(script.status)}`}
                        >
                          {script.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
                        {wordCount > 0 && <span>{wordCount.toLocaleString()} words</span>}
                        {bulletCount > 0 && <span>{bulletCount} bullet points</span>}
                        <span>
                          {new Date(script.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== BRAIN DUMPS TAB ========== */}
        {activeTab === "brainDumps" && (
          <div className="space-y-4">
            {brainDumpsLoading && <LoadingSkeleton />}
            {!brainDumpsLoading && brainDumps.length === 0 && (
              <EmptyState message="This student has no brain dump sessions yet." />
            )}
            {!brainDumpsLoading && brainDumps.length > 0 && (
              <div className="space-y-3">
                {brainDumps.map((dump) => (
                  <div
                    key={dump._id}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white">
                            {dump.source === "manual" ? "Manual Paste" : dump.source === "fathom" ? "Fathom" : dump.source}
                          </span>
                          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white">
                            {dump.callType.replace(/_/g, " ")}
                          </span>
                          {dump.priority && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(dump.priority)}`}>
                              {dump.priority}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                        {new Date(dump.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      {dump.extractedIdeas?.length > 0 && (
                        <span>{dump.extractedIdeas.length} idea{dump.extractedIdeas.length !== 1 ? "s" : ""}</span>
                      )}
                      {dump.extractedStories?.length > 0 && (
                        <span>{dump.extractedStories.length} stor{dump.extractedStories.length !== 1 ? "ies" : "y"}</span>
                      )}
                      {dump.extractedThemes?.length > 0 && (
                        <span>{dump.extractedThemes.length} theme{dump.extractedThemes.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {dump.tags && dump.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {dump.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== VOICE STORMING TAB ========== */}
        {activeTab === "voiceStorming" && (
          <div className="space-y-4">
            {voiceStormsLoading && <LoadingSkeleton />}
            {!voiceStormsLoading && voiceStorms.length === 0 && (
              <EmptyState message="This student has no voice storming sessions yet." />
            )}
            {!voiceStormsLoading && voiceStorms.length > 0 && (
              <div className="space-y-3">
                {voiceStorms.map((session) => {
                  const insightCount = session.extractedInsights?.length || 0;
                  return (
                    <div
                      key={session._id}
                      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-sm)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1">
                            {session.title || "Untitled Session"}
                          </h4>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white">
                              {sessionTypeLabel(session.sessionType)}
                            </span>
                            {session.duration > 0 && (
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {formatDuration(session.duration)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                          {new Date(session.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {insightCount > 0 && (
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                          {insightCount} extracted insight{insightCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== BRAND BRAIN TAB ========== */}
        {activeTab === "brandBrain" && (
          <div className="space-y-6">
            {brandBrainLoading && <LoadingSkeleton />}
            {!brandBrainLoading && !brandBrain && (
              <EmptyState message="This student has not set up their Brand Brain yet." />
            )}
            {!brandBrainLoading && brandBrain && (
              <>
                {/* Content Pillars */}
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
                  <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
                    Content Pillars
                  </h3>
                  {brandBrain.contentPillars && brandBrain.contentPillars.length > 0 ? (
                    <div className="space-y-3">
                      {brandBrain.contentPillars.map((pillar, i) => (
                        <div
                          key={i}
                          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
                        >
                          <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
                            {pillar.title}
                          </h4>
                          {pillar.description && (
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                              {pillar.description}
                            </p>
                          )}
                          {pillar.keywords && pillar.keywords.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {pillar.keywords.map((kw, j) => (
                                <span
                                  key={j}
                                  className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">No content pillars defined yet.</p>
                  )}
                </div>

                {/* Industry Data */}
                {brandBrain.industryData && (brandBrain.industryData.field || (brandBrain.industryData.keywords && brandBrain.industryData.keywords.length > 0)) && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
                    <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
                      Industry Data
                    </h3>
                    <div className="space-y-2">
                      {brandBrain.industryData.field && (
                        <div>
                          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Field: </span>
                          <span className="text-sm text-[var(--color-text-primary)]">{brandBrain.industryData.field}</span>
                        </div>
                      )}
                      {brandBrain.industryData.keywords && brandBrain.industryData.keywords.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Keywords: </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {brandBrain.industryData.keywords.map((kw, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {brandBrain.industryData.competitors && brandBrain.industryData.competitors.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Competitors: </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {brandBrain.industryData.competitors.map((c, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Equipment Profile */}
                {brandBrain.equipmentProfile && (brandBrain.equipmentProfile.camera || brandBrain.equipmentProfile.location || brandBrain.equipmentProfile.constraints) && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
                    <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
                      Equipment Profile
                    </h3>
                    <div className="space-y-2">
                      {brandBrain.equipmentProfile.camera && (
                        <div>
                          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Camera: </span>
                          <span className="text-sm text-[var(--color-text-primary)]">{brandBrain.equipmentProfile.camera}</span>
                        </div>
                      )}
                      {brandBrain.equipmentProfile.location && (
                        <div>
                          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Location: </span>
                          <span className="text-sm text-[var(--color-text-primary)]">{brandBrain.equipmentProfile.location}</span>
                        </div>
                      )}
                      {brandBrain.equipmentProfile.constraints && (
                        <div>
                          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Constraints: </span>
                          <span className="text-sm text-[var(--color-text-primary)]">{brandBrain.equipmentProfile.constraints}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Equipment Checklist */}
                {brandBrain._id && (
                  <EquipmentChecklist
                    brandBrainId={brandBrain._id}
                    items={brandBrain.equipmentChecklist || []}
                  />
                )}

                {/* Ingest Call Transcript */}
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
                  <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
                    Ingest Call Transcript
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                        Title (optional)
                      </label>
                      <input
                        type="text"
                        value={ingestTitle}
                        onChange={(e) => setIngestTitle(e.target.value)}
                        placeholder="e.g. Week 3 coaching call"
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                        Call Type
                      </label>
                      <select
                        value={ingestCallType}
                        onChange={(e) => setIngestCallType(e.target.value as "1on1" | "group")}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0"
                      >
                        <option value="1on1">1-on-1 Coaching</option>
                        <option value="group">Group Call</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                        Transcript
                      </label>
                      <textarea
                        value={ingestTranscript}
                        onChange={(e) => setIngestTranscript(e.target.value)}
                        placeholder="Paste the call transcript here..."
                        rows={6}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0 resize-y"
                      />
                    </div>
                    {ingestFeedback && (
                      <div
                        className={`rounded-[var(--radius-md)] px-3 py-2 text-sm ${
                          ingestFeedback.type === "success"
                            ? "bg-emerald-900/40 text-emerald-400"
                            : "bg-red-900/40 text-red-400"
                        }`}
                      >
                        {ingestFeedback.message}
                      </div>
                    )}
                    <button
                      disabled={ingestLoading || !ingestTranscript.trim()}
                      onClick={async () => {
                        setIngestLoading(true);
                        setIngestFeedback(null);
                        try {
                          const res = await fetch("/api/admin/ingest-transcript", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              studentId: id,
                              transcript: ingestTranscript,
                              callType: ingestCallType,
                              title: ingestTitle || undefined,
                            }),
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || "Failed to ingest transcript");
                          }
                          setIngestFeedback({ type: "success", message: "Transcript ingested and linked to Brand Brain." });
                          setIngestTranscript("");
                          setIngestTitle("");
                          setIngestCallType("1on1");
                        } catch (err: unknown) {
                          const message = err instanceof Error ? err.message : "Something went wrong";
                          setIngestFeedback({ type: "error", message });
                        } finally {
                          setIngestLoading(false);
                        }
                      }}
                      className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {ingestLoading ? "Ingesting..." : "Ingest Transcript"}
                    </button>
                  </div>
                </div>

                {/* Tone of Voice link */}
                {tovGuide && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
                    <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
                      Tone of Voice Guide
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Status:{" "}
                      <span
                        className={`font-medium ${
                          tovGuide.status === "active"
                            ? "text-emerald-500"
                            : tovGuide.status === "review"
                              ? "text-blue-500"
                              : "text-[var(--color-warning)]"
                        }`}
                      >
                        {tovGuide.status}
                      </span>{" "}
                      &middot; Version {tovGuide.version} &middot;{" "}
                      {tovGuide.parameters.length} parameters
                    </p>
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      Use the review card above to edit or change the Tone of Voice status.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "aiDocuments" && (
          <div className="space-y-8">
            {aiDocsLoading && <LoadingSkeleton />}
            {!aiDocsLoading && (
              <>
                {/* Student Documents */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Student Documents</h3>
                    <button
                      onClick={() => {
                        setAiDocEditingId(null);
                        setAiDocForm({ title: "", category: "idea_generation", content: "" });
                      }}
                      className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Add/Edit form */}
                  {aiDocForm && (
                    <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
                      <h4 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
                        {aiDocEditingId ? "Edit Document" : "New Document"}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Title</label>
                          <input
                            type="text"
                            value={aiDocForm.title}
                            onChange={(e) => setAiDocForm({ ...aiDocForm, title: e.target.value })}
                            placeholder="Document title"
                            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Category</label>
                          <select
                            value={aiDocForm.category}
                            onChange={(e) => setAiDocForm({ ...aiDocForm, category: e.target.value })}
                            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0"
                          >
                            <option value="idea_generation">Idea Generation</option>
                            <option value="script_generation">Script Generation</option>
                            <option value="brain_dump_processing">Brain Dump Processing</option>
                            <option value="tone_of_voice">Tone of Voice</option>
                            <option value="side_quest_generation">Side Quest Generation</option>
                            <option value="content_pillar_generation">Content Pillar Generation</option>
                            <option value="personal_baseline_processing">Personal Baseline Processing</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Content</label>
                          <textarea
                            value={aiDocForm.content}
                            onChange={(e) => setAiDocForm({ ...aiDocForm, content: e.target.value })}
                            placeholder="Document content..."
                            rows={6}
                            className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={aiDocSaving || !aiDocForm.title.trim() || !aiDocForm.content.trim()}
                            onClick={async () => {
                              setAiDocSaving(true);
                              try {
                                const isEdit = !!aiDocEditingId;
                                const url = isEdit
                                  ? `/api/admin/ai-documents/${aiDocEditingId}`
                                  : "/api/admin/ai-documents";
                                const method = isEdit ? "PUT" : "POST";
                                const body = isEdit
                                  ? { title: aiDocForm.title, category: aiDocForm.category, content: aiDocForm.content }
                                  : { title: aiDocForm.title, category: aiDocForm.category, content: aiDocForm.content, scope: "user", userId: id };
                                const res = await fetch(url, {
                                  method,
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(body),
                                });
                                if (res.ok) {
                                  const saved = await res.json();
                                  if (isEdit) {
                                    setAiDocuments((prev) => prev.map((d) => d._id === aiDocEditingId ? saved : d));
                                  } else {
                                    setAiDocuments((prev) => [saved, ...prev]);
                                  }
                                  setAiDocForm(null);
                                  setAiDocEditingId(null);
                                }
                              } catch (err) {
                                console.error("Failed to save AI document:", err);
                              } finally {
                                setAiDocSaving(false);
                              }
                            }}
                            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {aiDocSaving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => { setAiDocForm(null); setAiDocEditingId(null); }}
                            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {aiDocuments.length === 0 && !aiDocForm ? (
                    <EmptyState message="No student-specific AI documents yet." />
                  ) : (
                    <div className="space-y-3">
                      {aiDocuments.map((doc) => {
                        const CATEGORY_LABELS: Record<string, string> = {
                          idea_generation: "Idea Generation",
                          script_generation: "Script Generation",
                          brain_dump_processing: "Brain Dump Processing",
                          tone_of_voice: "Tone of Voice",
                          side_quest_generation: "Side Quest Generation",
                          content_pillar_generation: "Content Pillar Generation",
                          personal_baseline_processing: "Personal Baseline Processing",
                          title_generation: "Title Generation",
                        };
                        return (
                          <div
                            key={doc._id}
                            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-sm)]"
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-[var(--color-text-primary)]">{doc.title}</span>
                                <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white">
                                  {CATEGORY_LABELS[doc.category] ?? doc.category}
                                </span>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  onClick={() => {
                                    setAiDocEditingId(doc._id);
                                    setAiDocForm({ title: doc.title, category: doc.category, content: doc.content });
                                  }}
                                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm("Delete this document?")) return;
                                    try {
                                      const res = await fetch(`/api/admin/ai-documents/${doc._id}`, { method: "DELETE" });
                                      if (res.ok) {
                                        setAiDocuments((prev) => prev.filter((d) => d._id !== doc._id));
                                      }
                                    } catch (err) {
                                      console.error("Failed to delete AI document:", err);
                                    }
                                  }}
                                  className="rounded-[var(--radius-sm)] border border-red-800 bg-red-900/30 px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/50"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <p className="line-clamp-3 text-xs text-[var(--color-text-muted)]">{doc.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Global Documents (read-only) */}
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Global Documents</h3>
                    <span className="text-xs text-[var(--color-text-muted)]">(read-only, applies to all students)</span>
                  </div>
                  {globalAiDocs.length === 0 ? (
                    <EmptyState message="No global AI documents configured." />
                  ) : (
                    <div className="space-y-3">
                      {globalAiDocs.map((doc) => {
                        const CATEGORY_LABELS: Record<string, string> = {
                          idea_generation: "Idea Generation",
                          script_generation: "Script Generation",
                          brain_dump_processing: "Brain Dump Processing",
                          tone_of_voice: "Tone of Voice",
                          side_quest_generation: "Side Quest Generation",
                          content_pillar_generation: "Content Pillar Generation",
                          personal_baseline_processing: "Personal Baseline Processing",
                          title_generation: "Title Generation",
                        };
                        return (
                          <div
                            key={doc._id}
                            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-sm)]"
                          >
                            <div className="mb-2 flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-[var(--color-text-primary)]">{doc.title}</span>
                              <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white">
                                {CATEGORY_LABELS[doc.category] ?? doc.category}
                              </span>
                            </div>
                            <p className="line-clamp-3 text-xs text-[var(--color-text-muted)]">{doc.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
