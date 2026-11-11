import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlProps = { id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

type FieldProps = {
  label: string;
  /** Rendered beside the label, e.g. a "Forgot password?" link or "Optional". */
  aside?: React.ReactNode;
  hint?: string;
  error?: string;
  className?: string;
  /** The control. It receives id, aria-invalid and aria-describedby. */
  children: React.ReactElement<ControlProps>;
};

/** Label + control + hint + error, wired together for screen readers. */
export function FormField({ label, aside, hint, error, className, children }: FieldProps) {
  const autoId = React.useId();
  const id = children.props.id ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {aside ? <span className="text-xs text-muted-foreground">{aside}</span> : null}
      </div>
      {React.cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [children.props["aria-describedby"], errorId, hintId].filter(Boolean).join(" ") || undefined,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
