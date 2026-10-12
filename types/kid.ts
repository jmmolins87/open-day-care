export interface Room {
  id: string;
  name: "sol" | "estrella" | "arcoiris";
}

// Supabase child row shape (from public.children table)
export interface SupabaseChild {
  id: string;
  room_id: string;
  full_name: string;
  birth_date: string | null;
  enrolled_at: string | null;
  medical_notes: string | null;
  allergy_tags: string[];
  photo_consent: boolean;
  status: string | null;
  created_at: string;
  updated_at: string;
  rooms?: {
    id: string;
    name: "sol" | "estrella" | "arcoiris";
  };
}

// Type used by components that render kid cards and profiles
// id can be string (from Supabase) or number (from mock data)
// This interface maps Supabase data + room name for UI consumption
export interface KidParent {
  id: string | number;
  name: string;
  relation: "father" | "mother" | "guardian" | string;
  initial: string;
  avatarColor: string;
  avatarText?: string;
  status: "active" | "pending";
  email?: string;
}

export interface Kid {
  id: string | number;
  name: string;
  initial: string;
  avatarColor: string;
  avatarText: string;
  age: string;
  birthDate: string;
  room: string;
  joined: string;
  alerts: string[];
  notes?: string;
  parents: KidParent[];
}

// Individual child data returned from Supabase queries (with room)
export interface SupabaseChildWithRoom {
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
}