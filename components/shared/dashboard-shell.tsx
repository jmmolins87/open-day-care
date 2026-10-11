"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/data/mock/nav";
import MobileHeader from "./mobile-header";
import Sidebar, { type SidebarProfile } from "./sidebar";

interface DashboardShellProps {
  profile: SidebarProfile;
  children: ReactNode;
}

export default function DashboardShell({ profile, children }: DashboardShellProps) {
  const pathname = usePathname();
  const active: NavItem["href"] = pathname.startsWith("/kids")
    ? "/kids"
    : "/";

  return (
    <div className="min-h-screen bg-page lg:flex">
      <MobileHeader active={active} profile={profile} />
      <Sidebar active={active} profile={profile} className="hidden lg:flex" />

      <main className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
