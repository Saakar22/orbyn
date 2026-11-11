// Cheap, dependency-free password strength estimate shared by the sign-up form and the server.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const COMMON = ["password", "12345678", "qwerty", "letmein", "iloveyou", "admin", "welcome", "orbyn"];

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; hint: string };

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;

export function passwordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN) {
    return { score: 0, label: LABELS[0], hint: `Use at least ${PASSWORD_MIN} characters.` };
  }
  const lower = password.toLowerCase();
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  const unique = new Set(password).size;
  let points = 0;
  if (password.length >= 10) points += 1;
  if (password.length >= 14) points += 1;
  if (classes >= 2) points += 1;
  if (classes >= 3) points += 1;
  if (unique < 5 || COMMON.some((word) => lower.includes(word))) points = 0;

  const score = Math.max(1, Math.min(4, points)) as 1 | 2 | 3 | 4;
  const hint =
    score >= 3
      ? "Looks good."
      : classes < 3
        ? "Mix upper and lower case, numbers or symbols."
        : "Make it longer or less predictable.";
  return { score, label: LABELS[score], hint };
}
