"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type SignInState = { error: string | null };

const safeNext = (next: FormDataEntryValue | null): string => {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  if (/[\s\\]/.test(next)) return "/";
  return next;
};

export async function signIn(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Credenciales inválidas"
          : error.message,
    };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/login");
}
