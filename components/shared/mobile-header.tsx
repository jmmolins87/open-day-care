"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavItem } from "@/data/mock/nav";
import { CloseIcon, MenuIcon, SunIcon } from "./icons";
import Sidebar, { type SidebarProfile } from "./sidebar";

interface MobileHeaderProps {
  active: NavItem["href"];
  profile: SidebarProfile;
}

export default function MobileHeader({ active, profile }: MobileHeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)]">
            <SunIcon
              className="h-[18px] w-[18px] text-white"
              strokeWidth={2.2}
            />
          </span>
          <span className="font-heading text-[15px] font-semibold text-ink">
            OpenDayCare
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setIsDrawerOpen((open) => !open)}
          aria-expanded={isDrawerOpen}
          aria-label={isDrawerOpen ? "Cerrar menú" : "Abrir menú"}
          className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-page text-ink-soft"
        >
          {isDrawerOpen ? (
            <CloseIcon className="h-5 w-5" />
          ) : (
            <MenuIcon className="h-5 w-5" />
          )}
        </button>
      </header>

      {isDrawerOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={closeDrawer}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <div className="fixed inset-y-0 left-0 z-50">
            <Sidebar active={active} profile={profile} />
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Cerrar menú"
              className="absolute right-2 top-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-page text-ink-soft"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
