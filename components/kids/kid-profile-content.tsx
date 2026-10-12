"use client";

import { useEffect, useState, useCallback } from "react";
import type { Kid } from "@/types/kid";
import KidProfile from "./kid-profile";
import LinkParentModal from "./link-parent-modal";
import { fetchParentsForChild } from "@/utils/supabase/queries";

export default function KidProfileContent({ kid }: { kid: Kid }) {
  const [parents, setParents] = useState<Array<{
    id: string;
    name: string;
    relation: "father" | "mother" | "guardian";
    initial: string;
    avatarColor: string;
    avatarText: string;
    status: "active" | "pending";
    email?: string;
  }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadParents = useCallback(async () => {
    setLoading(true);
    const { parents: fetched } = await fetchParentsForChild(String(kid.id));
    setParents(fetched);
    setLoading(false);
  }, [kid.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadParents();
  }, [loadParents]);

  function handleSuccess() {
    setOpen(false);
    loadParents();
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
        <p className="text-center text-ink-muted">Cargando padres…</p>
      </div>
    );
  }

  return (
    <div>
      <KidProfile
        kid={kid}
        parents={parents}
        onLinkParent={() => setOpen(true)}
      />
      {open && (
        <LinkParentModal kid={kid} onClose={() => setOpen(false)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}