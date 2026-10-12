/**
 * Server-only Supabase queries - only import in Server Components or Server Actions.
 * Uses next/headers which is only available in Server Components.
 */

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

/**
 * Fetches a single child by ID from Supabase with room name included.
 * Uses the server client - for Server Components (no "use client").
 * Returns null if not found.
 */
export async function fetchChildByIdServer(id: string): Promise<{
  id: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[];
  photo_consent: boolean;
  status: string | null;
  room: {
    id: string;
    name: "sol" | "estrella" | "arcoiris";
  } | null;
} | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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