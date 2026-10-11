"use client";

import Link from "next/link";
import { navItems, type NavItem } from "@/data/mock/nav";
import { signOut } from "@/utils/actions/auth";
import { LogOutIcon, navIcons, PlusIcon, SunIcon, type NavIconName } from "./icons";

export interface SidebarProfile {
  name: string;
  initial: string;
  roleLabel: string | null;
}

interface SidebarProps {
  active: NavItem["href"];
  className?: string;
  profile: SidebarProfile;
}

const newPostClassName =
  "mb-[18px] flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-b from-btn-start to-btn-end px-3 py-3 text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.75)]";

function NavItemLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = navIcons[item.icon as NavIconName];

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-3 py-[11px] text-[14.5px] ${
        isActive
          ? "bg-accent-active-bg font-extrabold text-accent-strong"
          : "font-semibold text-nav-inactive"
      }`}
    >
      <Icon className="h-[19px] w-[19px] flex-none" />
      {item.label}
    </Link>
  );
}

export default function Sidebar({ active, className = "", profile }: SidebarProps) {
  return (
    <aside
      className={`sticky top-0 flex h-screen w-[248px] flex-none flex-col border-r border-border bg-surface p-6 px-4 ${className}`}
    >
      <Link
        href="/"
        className="flex items-center gap-[11px] px-2 pt-1 pb-[22px]"
      >
        <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[12px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)]">
          <SunIcon className="h-[21px] w-[21px] text-white" strokeWidth={2.2} />
        </span>
        <span className="block">
          <span className="block font-heading text-[17px] font-semibold leading-none text-ink">
            OpenDayCare
          </span>
          <span className="mt-[2px] block text-[11.5px] text-ink-muted">
            Sala Soles
          </span>
        </span>
      </Link>

      <Link href="/?create=1" className={newPostClassName}>
        <PlusIcon className="h-[17px] w-[17px]" strokeWidth={2.4} />
        Nueva publicación
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            isActive={item.href === active}
          />
        ))}
      </nav>

      <div className="mt-[10px] border-t border-border pt-[14px]">
        <div className="flex items-center gap-[11px] px-2 py-1.5">
          <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-accent font-heading text-[16px] font-semibold text-white">
            {profile.initial}
          </span>
          <span className="block min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-ink">
              {profile.name}
            </span>
            {profile.roleLabel && (
              <span className="block text-xs text-ink-muted">
                {profile.roleLabel}
              </span>
            )}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-[10px] bg-page text-ink-soft"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
