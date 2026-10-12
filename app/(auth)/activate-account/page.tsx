import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import ActivateForm from "@/components/auth/activate-form";

interface InvitationData {
  id: string;
  child_id: string;
  invited_by: string;
  full_name: string;
  email: string;
  relationship: "father" | "mother" | "guardian";
  code: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  kid_first_name: string;
  kid_initial: string;
  room_name: string;
  daycare_id: string;
}

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (!code) {
    // Sin código: mostrar formulario vacío (o redirigir a login)
    return <ActivateForm code="" email="" kidFirstName="" roomName="" kidInitial="" avatarBg="#A9D9E8" avatarText="#1F7A93" />;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: invitation, error } = await supabase.rpc("get_invitation_by_code", {
    p_code: code.toUpperCase(),
  });

  if (error || !invitation || invitation.length === 0) {
    // Código no encontrado: mostrar formulario vacío con error
    return <ActivateForm code={code} email="" kidFirstName="" roomName="" kidInitial="" avatarBg="#A9D9E8" avatarText="#1F7A93" />;
  }

  const inv = invitation[0] as InvitationData;

  return (
    <ActivateForm
      code={inv.code}
      email={inv.email}
      kidFirstName={inv.kid_first_name}
      roomName={inv.room_name}
      kidInitial={inv.kid_initial || inv.kid_first_name[0].toUpperCase()}
      avatarBg="#A9D9E8"
      avatarText="#1F7A93"
    />
  );
}