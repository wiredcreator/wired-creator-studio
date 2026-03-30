"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const [errorType, setErrorType] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorType("invalid");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-magic-link?token=${token}`);
        const data = await res.json();

        if (!data.success) {
          setStatus("error");
          setErrorType(data.error || "invalid");
          return;
        }

        const result = await signIn("credentials", {
          userId: data.userId,
          magicLinkVerified: "true",
          redirect: false,
        });

        if (result?.ok) {
          router.push(data.redirectTo);
        } else {
          setStatus("error");
          setErrorType("auth_failed");
        }
      } catch {
        setStatus("error");
        setErrorType("network");
      }
    })();
  }, [token, router]);

  if (status === "error") {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, backgroundColor: 'var(--color-bg-primary, #0a0b10)' }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary, #E4E4E7)', marginBottom: 12 }}>
            {errorType === 'expired' ? 'Link Expired' : 'Something Went Wrong'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted, #8B8D9E)', marginBottom: 24, lineHeight: 1.6 }}>
            {errorType === 'expired'
              ? 'This login link has expired. Please request a new one.'
              : 'We couldn\'t verify your login link. Please try again.'}
          </p>
          <a
            href="/login"
            style={{ display: 'inline-block', backgroundColor: '#E07850', color: 'white', padding: '12px 32px', borderRadius: 12, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  // Verifying state — show spinner
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, backgroundColor: 'var(--color-bg-primary, #0a0b10)' }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border, #2a2b35)', borderTopColor: '#E07850', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary, #E4E4E7)', marginBottom: 8 }}>
          Logging you in...
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted, #8B8D9E)' }}>
          Please wait a moment.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary, #0a0b10)' }}>
        <p style={{ color: 'var(--color-text-muted, #8B8D9E)' }}>Loading...</p>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
