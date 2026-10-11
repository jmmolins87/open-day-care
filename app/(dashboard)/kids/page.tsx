"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Kid } from "@/types/kid";
import KidsPageContent from "@/components/kids/kids-page-content";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function fetchChildrenFromSupabase() {
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
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching children from Supabase:", error);
    return [];
  }

  // Map allergy_tags to alerts format used by the frontend
  const alertsMap: Record<string, string> = {
    peanut: "peanut",
    lactose: "lactose",
    gluten: "gluten",
    egg: "egg",
    "tree-nuts": "tree-nuts",
  };

  return (data || []).map((child: any) => {
    const room = child.rooms
      ? {
          id: child.rooms.id,
          name: child.rooms.name as "sol" | "estrella" | "arcoiris",
        }
      : null;

    const alerts: string[] = [];
    if (child.allergy_tags && child.allergy_tags.length > 0) {
      child.allergy_tags.forEach((tag: string) => {
        if (alertsMap[tag]) {
          alerts.push(alertsMap[tag]);
        }
      });
    }

    return {
      id: child.id,
      name: child.full_name,
      initial: child.full_name[0].toUpperCase(),
      avatarColor: "#A9D9E8", // default; could be determined by hash
      avatarText: "#1F7A93", // default
      age: "", // will be populated if needed
      birthDate: child.birth_date || "",
      room: room?.name || "",
      joined: child.enrolled_at ? new Date(child.enrolled_at).toLocaleDateString("es-ES") : "",
      alerts,
      notes: child.medical_notes,
      parents: [], // not fetched here; can be added later
    };
  });
}

export default function KidsPage() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChildrenFromSupabase().then((children) => {
      setKids(children);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setError("Error al cargar niños de Supabase");
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[880px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
        <p className="text-center text-ink-muted">Cargando niños...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[880px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
        <p className="text-center text-accent-strong">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[880px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
      <KidsPageContent kids={kids} />
    </div>
  );
}
