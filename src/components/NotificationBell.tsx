"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTimezone } from "@/hooks/useTimezone";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  read: boolean;
  retrieved: boolean;
  createdAt: string;
}

const LAST_CHECKED_KEY = "wired_notifications_last_checked";

function formatLastChecked(date: Date | null, formatDateFn: (d: Date) => string): string {
  if (!date) return "never";
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return formatDateFn(date);
}

function relativeTime(dateStr: string, formatDateFn: (d: string | Date) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDateFn(dateStr);
}

function getTypeIcon(type: string): React.ReactElement {
  const iconStyle: React.CSSProperties = { width: 16, height: 16, flexShrink: 0 };

  switch (type) {
    case "task_assigned":
      return (
        <svg style={iconStyle} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--color-accent)">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "comment_reply":
      return (
        <svg style={iconStyle} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--color-accent)">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      );
    case "quest_available":
      return (
        <svg style={iconStyle} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--color-accent)">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      );
    case "xp_earned":
      return (
        <svg style={iconStyle} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--color-accent)">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      );
    default:
      return (
        <svg style={iconStyle} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--color-accent)">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      );
  }
}

function getRelatedHref(relatedId?: string, relatedType?: string): string | null {
  if (!relatedId || !relatedType) return null;
  switch (relatedType) {
    case "task":
      return "/dashboard/today";
    case "script":
      return `/dashboard/scripts/${relatedId}`;
    case "idea":
      return `/dashboard/ideas`;
    default:
      return null;
  }
}

export default function NotificationBell() {
  const { formatDate } = useTimezone();
  const [open, setOpen] = useState(false);
  const [unretrievedCount, setUnretrievedCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [newlyRetrieved, setNewlyRetrieved] = useState<NotificationItem[]>([]);
  const [retrieving, setRetrieving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Load lastChecked from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LAST_CHECKED_KEY);
    if (stored) setLastChecked(new Date(stored));
  }, []);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch unretrieved count
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) {
        const data = await res.json();
        setUnretrievedCount(data.unretrieved);
      }
    } catch {
      // silent fail
    }
  }, []);

  // Fetch retrieved notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?retrieved=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch {
      // silent fail
    }
  }, []);

  // Poll unretrieved count every 60s
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Load retrieved notifications when panel opens
  useEffect(() => {
    if (open && !loaded) {
      fetchNotifications();
      setLoaded(true);
    }
  }, [open, loaded, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Retrieve Now action
  const handleRetrieve = async () => {
    setRetrieving(true);
    try {
      const res = await fetch("/api/notifications/retrieve", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setNewlyRetrieved(data.notifications);
        setUnretrievedCount(0);
        const now = new Date();
        setLastChecked(now);
        localStorage.setItem(LAST_CHECKED_KEY, now.toISOString());
        // Refresh the retrieved list
        fetchNotifications();
      }
    } catch {
      // silent fail
    }
    setRetrieving(false);
  };

  // Mark single notification as read
  const handleMarkRead = async (id: string) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setNewlyRetrieved((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch {
      // silent fail
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const allUnread = [...notifications, ...newlyRetrieved].filter((n) => !n.read);
    if (allUnread.length === 0) return;
    const ids = allUnread.map((n) => n._id);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setNewlyRetrieved((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silent fail
    }
  };

  // Handle notification click
  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.read) handleMarkRead(n._id);
    const href = getRelatedHref(n.relatedId, n.relatedType);
    if (href) {
      window.location.href = href;
      setOpen(false);
    }
  };

  const allNotifications = [...newlyRetrieved, ...notifications].filter(
    (n, i, arr) => arr.findIndex((x) => x._id === n._id) === i
  );
  const hasUnread = allNotifications.some((n) => !n.read);

  return (
    <div style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          setOpen(!open);
          if (!open) setNewlyRetrieved([]);
        }}
        style={{
          position: "relative",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg-card)",
          padding: "10px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          outline: "none",
          boxShadow: "none",
        }}
        aria-label="Notifications"
      >
        <svg
          style={{ width: 18, height: 18, color: "var(--color-text-primary)" }}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {/* Dot indicator */}
        {unretrievedCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 10,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "var(--color-accent)",
              border: "2px solid var(--color-bg-card)",
            }}
          />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 480,
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              Notifications
            </span>
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: 12,
                  color: "var(--color-accent)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  outline: "none",
                  boxShadow: "none",
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Last checked timestamp */}
          <div
            style={{
              padding: "4px 16px 6px",
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            Last checked: {formatLastChecked(lastChecked, formatDate)}
          </div>

          {/* Retrieve banner */}
          {unretrievedCount > 0 && (
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--color-border-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--color-bg-tertiary)",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                }}
              >
                You have new updates
              </span>
              <button
                onClick={handleRetrieve}
                disabled={retrieving}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  backgroundColor: "var(--color-accent)",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 14px",
                  cursor: retrieving ? "default" : "pointer",
                  opacity: retrieving ? 0.7 : 1,
                  outline: "none",
                  boxShadow: "none",
                }}
              >
                {retrieving ? "Retrieving..." : "Retrieve Now"}
              </button>
            </div>
          )}

          {/* Notification list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "4px 0",
            }}
          >
            {allNotifications.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                }}
              >
                No notifications yet
              </div>
            ) : (
              allNotifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 16px",
                    background: "none",
                    border: "none",
                    borderLeft: n.read
                      ? "3px solid transparent"
                      : "3px solid var(--color-accent)",
                    cursor: n.relatedId ? "pointer" : "default",
                    textAlign: "left",
                    outline: "none",
                    boxShadow: "none",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ marginTop: 2 }}>{getTypeIcon(n.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: n.read ? 400 : 600,
                        color: "var(--color-text-primary)",
                        lineHeight: 1.4,
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.4,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n.message}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                        marginTop: 4,
                      }}
                    >
                      {relativeTime(n.createdAt, formatDate)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
