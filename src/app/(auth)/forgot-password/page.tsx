import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth/forms";
import { AuthHeading } from "@/components/auth/parts";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Reset your password">Enter the email you signed up with and we&rsquo;ll send a link to set a new one.</AuthHeading>
      <ForgotForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
