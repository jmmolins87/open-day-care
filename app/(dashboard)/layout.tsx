import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import DashboardShell from "@/components/shared/dashboard-shell";
import type { SidebarProfile } from "@/components/shared/sidebar";
import { getCurrentProfile } from "@/utils/auth";

export const instant = false;

const ROLE_LABELS: Record<string, string> = {
  staff: "Personal",
  admin: "Admin",
  parent: "Familia",
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await connection();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const name = profile.row?.full_name || profile.user.email.split("@")[0];
  const sidebarProfile: SidebarProfile = {
    name,
    initial: name.charAt(0).toUpperCase(),
    roleLabel: profile.row ? (ROLE_LABELS[profile.row.role] ?? null) : null,
  };

  return <DashboardShell profile={sidebarProfile}>{children}</DashboardShell>;
}
