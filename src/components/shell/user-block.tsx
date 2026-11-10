import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/server/session";

export async function UserBlock() {
  const user = await requireUser();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
      <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[13px] font-medium text-sidebar-accent-foreground">{user.name}</div>
        <div className="truncate text-[11px] text-sidebar-foreground/70">{user.businessName ?? user.email}</div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Sign out"
          className="rounded p-1 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-3.5" />
        </button>
      </form>
    </div>
  );
}
