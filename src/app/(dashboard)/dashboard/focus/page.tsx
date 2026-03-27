"use client";

import { useRouter } from "next/navigation";
import FocusMode from "@/components/focus-mode/FocusMode";

export default function FocusPage() {
  const router = useRouter();

  return (
    <FocusMode onClose={() => router.push("/dashboard")} />
  );
}
