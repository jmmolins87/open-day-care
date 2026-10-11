"use client";

import { useState } from "react";
import type { KidParent } from "@/data/mock/kids";
import type { Kid } from "@/types/kid";
import { invite } from "@/data/mock/auth";
import KidProfile from "./kid-profile";
import LinkParentModal, { type LinkParentFormValues } from "./link-parent-modal";

const parentPalette = ["#C9B6E8", "#A9C7E8", "#F4B8CC", "#F4DC8E", "#B9DEC4"];

export default function KidProfileContent({ kid }: { kid: Kid }) {
  const [parents, setParents] = useState<KidParent[]>(kid.parents);
  const [open, setOpen] = useState(false);

  function handleSend(values: LinkParentFormValues) {
    const newParent: KidParent = {
      id: Math.max(...parents.map((parent) => parent.id), 0) + 1,
      name: values.name,
      relation: values.relation,
      initial: values.name[0].toUpperCase(),
      avatarColor: parentPalette[parents.length % parentPalette.length],
      status: "pending",
      email: values.email,
    };
    setParents((prev) => [...prev, newParent]);
    Object.assign(invite, {
      email: values.email,
      kidName: kid.name.split(" ")[0],
      kidInitial: kid.initial,
      room: kid.room,
      avatarBg: kid.avatarColor,
      avatarText: kid.avatarText,
    });
    setOpen(false);
  }

  return (
    <div>
      <KidProfile
        kid={kid}
        parents={parents}
        onLinkParent={() => setOpen(true)}
      />
      {open && (
        <LinkParentModal
          kid={kid}
          onClose={() => setOpen(false)}
          onSend={handleSend}
        />
      )}
    </div>
  );
}
