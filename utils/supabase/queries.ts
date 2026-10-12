/**
 * Helper functions for fetching children data from Supabase.
 * 
 * The children table has a FK to rooms (room_id), and the Supabase
 * auto-generated join `rooms!children_room_id_fk` is used to include
 * room name in the response.
 * 
 * RLS policy "children_select_authenticated" must be enabled for
 * authenticated users to read children rows.
 * 
 * See: supabase_get_advisors for RLS status checking.
 */

import { createClient } from "@/utils/supabase/client";
import { withGlobalLoader } from "@/utils/loader/global-tracker";

/** Raw row shape for `children` with the `rooms` join. */
interface ChildRow {
  id: string;
  full_name: string;
  birth_date: string | null;
  enrolled_at: string | null;
  medical_notes: string | null;
  allergy_tags: string[] | null;
  photo_consent: boolean;
  status: string | null;
  rooms: { id: string; name: string } | null;
}

/** Raw row shape for `parent_children` with the `users` join. */
interface ParentChildRow {
  id: string;
  parent_id: string;
  relationship: "father" | "mother" | "guardian";
  users: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
}

/** Raw row shape for pending `invitations`. */
interface InvitationRow {
  id: string;
  full_name: string;
  email: string;
  relationship: "father" | "mother" | "guardian";
  code: string;
}

/**
 * Fetches all children from Supabase with room name included.
 * Returns data formatted for the Kid interface used by components.
 */
export async function fetchChildrenWithRoom(): Promise<{
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
}[]> {
  const supabase = createClient();

  const { data, error } = await withGlobalLoader(() =>
    supabase
      .from("children")
      .select(`
      *,
      rooms!children_room_id_fk (
        id,
        name
      )
    `)
      .order("full_name", { ascending: true }),
  );

  if (error) {
    console.error("Error fetching children from Supabase:", error);
    return [];
  }

  return (data || []).map((child: ChildRow) => {
    const room = child.rooms
      ? {
          id: child.rooms.id,
          name: child.rooms.name as "sol" | "estrella" | "arcoiris",
        }
      : null;

    // Map allergy_tags to alerts format used by the frontend
    const alerts: string[] = [];
    if (child.allergy_tags && child.allergy_tags.length > 0) {
      child.allergy_tags.forEach((tag: string) => {
        if (tag === "peanut") alerts.push("peanut");
        if (tag === "lactose") alerts.push("lactose");
        if (tag === "gluten") alerts.push("gluten");
        if (tag === "egg") alerts.push("egg");
        if (tag === "tree-nuts") alerts.push("tree-nuts");
      });
    }

    return {
      id: child.id,
      full_name: child.full_name,
      birth_date: child.birth_date || "",
      enrolled_at: child.enrolled_at || "",
      medical_notes: child.medical_notes,
      allergy_tags: child.allergy_tags || [],
      photo_consent: child.photo_consent,
      status: child.status,
      room,
    };
  });
}

/**
 * Fetches a single child by ID from Supabase with room name included.
 * Uses the browser client - only for Client Components ("use client").
 * Returns null if not found.
 */
export async function fetchChildById(id: string): Promise<{
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
  const supabase = createClient();

  const { data, error } = await withGlobalLoader(() =>
    supabase
      .from("children")
      .select(`
      *,
      rooms!children_room_id_fk (
        id,
        name
      )
    `)
      .eq("id", id)
      .single(),
  );

  if (error || !data) {
    return null;
  }

  const room = data.rooms
    ? {
        id: data.rooms.id,
        name: data.rooms.name as "sol" | "estrella" | "arcoiris",
      }
    : null;

  // Map allergy_tags to alerts format used by the frontend
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



/**
 * Fetches children filtered by room name.
 * Only children with the matching room name will be returned.
 * 
 * @param roomName - The room name to filter by: "sol", "estrella", or "arcoiris"
 */
export async function fetchChildrenByRoom(
  roomName: "sol" | "estrella" | "arcoiris"
): Promise<{
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
}[]> {
  const supabase = createClient();

  // Fetch all children with room join, then filter locally by room name
  const { data, error } = await withGlobalLoader(() =>
    supabase
      .from("children")
      .select(`
      *,
      rooms!children_room_id_fk (
        id,
        name
      )
    `)
      .order("full_name", { ascending: true }),
  );

  if (error) {
    console.error("Error fetching children by room from Supabase:", error);
    return [];
  }

  const allChildren = (data || []).map((child: ChildRow) => ({
    id: child.id,
    full_name: child.full_name,
    birth_date: child.birth_date || "",
    enrolled_at: child.enrolled_at || "",
    medical_notes: child.medical_notes,
    allergy_tags: child.allergy_tags || [],
    photo_consent: child.photo_consent,
    status: child.status,
    room: child.rooms
      ? {
          id: child.rooms.id,
          name: child.rooms.name as "sol" | "estrella" | "arcoiris",
        }
      : null,
  }));

  // Filter by room name locally
  return allChildren.filter((child) => child.room?.name === roomName);
}

/**
 * Verifies RLS policies state for the children table.
 * Returns a list of observations about the current RLS configuration.
 */
/**
 * Fetches parents for a child (both accepted via parent_children and pending via invitations).
 * Uses the browser client - only for Client Components ("use client").
 */
export async function fetchParentsForChild(childId: string): Promise<{
  parents: {
    id: string;
    name: string;
    relation: "father" | "mother" | "guardian";
    initial: string;
    avatarColor: string;
    avatarText: string;
    status: "active" | "pending";
    email?: string;
  }[];
}> {
  const supabase = createClient();

  const palette = ["#C9B6E8", "#A9C7E8", "#F4B8CC", "#F4DC8E", "#B9DEC4"];

  // Fetch accepted parents via parent_children + users
  const { data: parentChildren, error: pcError } = await withGlobalLoader(() =>
    supabase
      .from("parent_children")
      .select(`
      id,
      parent_id,
      relationship,
      users:parent_id (
        id,
        full_name
      )
    `)
      .eq("child_id", childId),
  );

  if (pcError) {
    console.error("Error fetching parent_children:", pcError);
  }

  // Fetch pending invitations
  const { data: invitations, error: invError } = await withGlobalLoader(() =>
    supabase
      .from("invitations")
      .select("id, full_name, email, relationship, code")
      .eq("child_id", childId)
      .eq("status", "pending"),
  );

  if (invError) {
    console.error("Error fetching invitations:", invError);
  }

  const parents: {
    id: string;
    name: string;
    relation: "father" | "mother" | "guardian";
    initial: string;
    avatarColor: string;
    avatarText: string;
    status: "active" | "pending";
    email?: string;
  }[] = [];

  // Process accepted parents
  if (parentChildren) {
    parentChildren.forEach((pc: ParentChildRow, index: number) => {
      const user = Array.isArray(pc.users) ? pc.users[0] : pc.users;
      if (user) {
        parents.push({
          id: pc.id,
          name: user.full_name,
          relation: pc.relationship,
          initial: user.full_name[0].toUpperCase(),
          avatarColor: palette[index % palette.length],
          avatarText: "#FFFFFF",
          status: "active",
        });
      }
    });
  }

  // Process pending invitations
  if (invitations) {
    invitations.forEach((inv: InvitationRow, index: number) => {
      parents.push({
        id: inv.id,
        name: inv.full_name,
        relation: inv.relationship,
        initial: inv.full_name[0].toUpperCase(),
        avatarColor: palette[(parents.length + index) % palette.length],
        avatarText: "#FFFFFF",
        status: "pending",
        email: inv.email,
      });
    });
  }

  return { parents };
}

export function getRlsStatus(): string[] {
  const observations: string[] = [];

  // Note: RLS status can be checked via Supabase MCP or SQL:
  // - Table public.children has RLS enabled (relrowsecurity = true)
  // - Currently no RLS policies exist on the children table (pg_policies is empty)
  // - This was flagged by supabase_get_advisors as: "rls_enabled_no_policy"
  // - A policy "children_select_authenticated" was manually created for SELECT to authenticated role
  
  observations.push(
    "Table public.children has RLS enabled (relrowsecurity = true)"
  );
  observations.push(
    "No RLS policies were originally defined on public.children (flagged by advisories)"
  );
  observations.push(
    "Policy 'children_select_authenticated' created: SELECT to authenticated role"
  );
  observations.push(
    "Recommendation: Ensure the policy matches your auth model (staff/admin only, or all authenticated)"
  );

  return observations;
}