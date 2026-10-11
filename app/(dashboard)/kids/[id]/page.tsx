"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { type Kid } from "@/types/kid";
import KidProfileContent from "@/components/kids/kid-profile-content";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function fetchChildById(id: string) {
  const supabase = createBrowserClient(supabaseUrl!, supabaseKey!);

  const { data, error } = await supabase
    .from("children")
    .select(`
      *,
      rooms!children_room_id_fk (
        id,
        name
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  const room = data.rooms
    ? {
        id: data.rooms.id,
        name: data.rooms.name as "sol" | "estrella" | "arcoiris",
      }
    : null;

  const alerts: string[] = [];
  if (data.allergy_tags && data.allergy_tags.length > 0) {
    data.allergy_tags.forEach((tag: string) => {
      if (tag === "peanut") alerts.push("peanut");
      if (tag === "lactose") alerts.push("lactose");
      if (tag === "gluten") alerts.push("gluten");
      if (tag === "egg") alerts.push("egg");
      if (tag === "tree-nuts") alerts.push("tree-nuts");
    });
  }

  return {
    id: data.id,
    full_name: data.full_name,
    birth_date: data.birth_date || "",
    enrolled_at: data.enrolled_at || "",
    medical_notes: data.medical_notes,
    allergy_tags: data.allergy_tags || [],
    photo_consent: data.photo_consent,
    status: data.status,
    room,
  };
}

export default function KidProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [kid, setKid] = useState<Kid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKid = async () => {
      const { id } = await params;
      const supabaseKid = await fetchChildById(id);

      if (!supabaseKid) {
        notFound();
        return;
      }

      // Map allergy_tags to string alerts (Kid interface uses string[])
      const alerts: string[] = [];
      if (supabaseKid.allergy_tags && supabaseKid.allergy_tags.length > 0) {
        supabaseKid.allergy_tags.forEach((tag: string) => {
          if (tag === "peanut") alerts.push("peanut");
          if (tag === "lactose") alerts.push("lactose");
          if (tag === "gluten") alerts.push("gluten");
          if (tag === "egg") alerts.push("egg");
          if (tag === "tree-nuts") alerts.push("tree-nuts");
        });
      }

      // Map Supabase child data to Kid interface format for KidProfile
      const kid: Kid = {
        id: supabaseKid.id,
        name: supabaseKid.full_name,
        initial:
          supabaseKid.full_name && supabaseKid.full_name.length > 0
            ? supabaseKid.full_name[0].toUpperCase()
            : "?",
        avatarColor: "#A9D9E8",
        avatarText: "#1F7A93",
        age: "",
        birthDate: supabaseKid.birth_date || "",
        room: supabaseKid.room?.name || "Soles",
        joined: supabaseKid.enrolled_at || "feb 2025",
        alerts,
        notes: supabaseKid.medical_notes || undefined,
        parents: [],
      };

      setKid(kid);
      setLoading(false);
    };

    fetchKid().catch((err) => {
      console.error(err);
      setError("Error al cargar el niño");
      setLoading(false);
    });
  }, [params]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
        <p className="text-center text-ink-muted">Cargando niño...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
        <p className="text-center text-accent-strong">Error: {error}</p>
      </div>
    );
  }

  if (!kid) {
    return null; // notFound() was called in fetch
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
      <KidProfileContent kid={kid} />
    </div>
  );
}