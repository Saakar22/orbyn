"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { passwordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

const BAR = ["bg-border", "bg-danger", "bg-warning", "bg-[oklch(0.62_0.13_130)]", "bg-success"];

type Props = Omit<React.ComponentProps<"input">, "type"> & {
  /** Show the strength meter under the field. Use on sign-up and change-password, not on login. */
  meter?: boolean;
};

export function PasswordInput({ className, meter = false, onChange, id, ...props }: Props) {
  const [visible, setVisible] = React.useState(false);
  const [value, setValue] = React.useState(String(props.defaultValue ?? ""));
  const generatedId = React.useId();
  const meterId = `${id ?? generatedId}-strength`;
  const strength = passwordStrength(value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
          aria-describedby={[props["aria-describedby"], meter ? meterId : null].filter(Boolean).join(" ") || undefined}
          onChange={(event) => {
            setValue(event.target.value);
            onChange?.(event);
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {meter ? (
        <div id={meterId} aria-live="polite" className="space-y-1.5">
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-200",
                  value && step <= strength.score ? BAR[strength.score] : "bg-border",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {value ? (
              <>
                <span className="font-medium text-foreground">{strength.label}.</span> {strength.hint}
              </>
            ) : (
              "At least 8 characters, with a letter and a number."
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
