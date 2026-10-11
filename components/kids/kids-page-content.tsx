"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/shared/icons";
import type { Kid } from "@/types/kid";
import KidsDirectory from "./kids-directory";
import AddKidModal, { type AddKidFormValues } from "./add-kid-modal";

function createKid(values: AddKidFormValues, id: number): Kid {
  return {
    id,
    name: values.name,
    initial: values.name[0].toUpperCase(),
    avatarColor: "#A9D9E8",
    avatarText: "#1F7A93",
    age: "",
    birthDate: values.birthDate,
    room: values.room,
    joined: "",
    alerts: [],
    notes: values.notes || undefined,
    parents: [],
  };
}

export interface KidsPageContentProps {
  kids: Kid[];
}

export default function KidsPageContent({ kids: initialKids }: KidsPageContentProps) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Kid[]>(initialKids);

  function handleSave(values: AddKidFormValues) {
    const maxId = Math.max(
      ...list.map((kid) => Number(kid.id))
    );
    const id = maxId + 1;
    setList((prev) => [...prev, createKid(values, id)]);
    setOpen(false);
  }

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-accent-strong">
            GESTIÓN
          </div>
          <h1 className="m-0 font-heading text-[30px] font-semibold text-ink">
            Niños
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-[14px] bg-gradient-to-b from-btn-start to-btn-end px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.7)]"
        >
          <PlusIcon className="h-[17px] w-[17px]" strokeWidth={2.4} />
          Agregar niño
        </button>
      </div>

      <KidsDirectory kids={list} />

      {open && <AddKidModal onClose={() => setOpen(false)} onSave={handleSave} />}
    </div>
  );
}