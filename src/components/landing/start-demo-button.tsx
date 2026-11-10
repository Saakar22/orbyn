"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StartDemoButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="h-10 gap-2 px-5">
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "Preparing your workspace…" : "Try the live demo"}
      {pending ? null : <ArrowRight className="size-4" />}
    </Button>
  );
}
