import { UserMenu } from "@/components/shell/user-menu";
import { requireWorkspace } from "@/server/session";

/** Server side of the account menu: reads who is signed in and hands only display fields to the client. */
export async function UserBlock() {
  const { user, workspace } = await requireWorkspace({ allowOnboarding: true });
  return <UserMenu name={user.name} business={workspace.name} email={user.email} isGuest={user.isGuest} />;
}
