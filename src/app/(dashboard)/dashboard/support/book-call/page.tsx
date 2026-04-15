"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";

export default function BookCallPage() {
  const [loaded, setLoaded] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(1200);

  useEffect(() => {
    const timeout = setTimeout(() => setLoaded(true), 4000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.origin.includes("wiredcreator.com")) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      const candidates = [data.height, data?.data?.height, data?.payload?.height];
      for (const candidate of candidates) {
        const value = typeof candidate === "string" ? parseInt(candidate, 10) : candidate;
        if (typeof value === "number" && !Number.isNaN(value) && value > 200) {
          setIframeHeight(value);
          return;
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <PageWrapper>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 40px" }}>
        <Link
          href="/dashboard/support"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            color: "var(--color-text-secondary)",
            marginBottom: 16,
            textDecoration: "none",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Back
        </Link>

        <div style={{ position: "relative", minHeight: iframeHeight }}>
          <iframe
            src="https://app.wiredcreator.com/widget/booking/vExaPKNRMixWIydqeGwh"
            onLoad={() => setLoaded(true)}
            style={{
              width: "100%",
              height: iframeHeight,
              border: "none",
              display: "block",
              backgroundColor: "transparent",
            }}
            scrolling="no"
            id="vExaPKNRMixWIydqeGwh_1776263088042"
          />
          {!loaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                color: "var(--color-text-secondary)",
                fontSize: 14,
                pointerEvents: "none",
                backgroundColor: "var(--color-bg)",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid var(--color-border)",
                  borderTopColor: "#22C55E",
                  borderRadius: "50%",
                  animation: "book-call-spin 0.8s linear infinite",
                }}
              />
              <span>Loading calendar…</span>
            </div>
          )}
        </div>
        <style jsx>{`
          @keyframes book-call-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
      <Script
        src="https://app.wiredcreator.com/js/form_embed.js"
        strategy="afterInteractive"
      />
    </PageWrapper>
  );
}
