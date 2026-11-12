"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  "signed-out": "You're signed out.",
  "account-deleted": "Your account and its data were deleted.",
};

/** Confirms a sign-out after the redirect to the landing page, then tidies the address bar. */
export function SignedOutToast() {
  const notice = useSearchParams().get("notice");

  useEffect(() => {
    const message = notice ? MESSAGES[notice] : undefined;
    if (!message) return;
    // Deferred so the toaster has mounted, and so a remount in development doesn't show it twice.
    const timer = window.setTimeout(() => {
      toast.success(message, { id: `notice-${notice}` });
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return null;
}
