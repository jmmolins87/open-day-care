import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export type CurrentProfile = {
  user: { id: string; email: string };
  row: { full_name: string; role: "staff" | "parent" | "admin" } | null;
};

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user: { id: user.id, email: user.email ?? "" },
    row: row ? { full_name: row.full_name, role: row.role } : null,
  };
});
