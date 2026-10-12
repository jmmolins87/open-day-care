'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

type SendInvitationState = {
  error: string | null;
  code: string | null;
};

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, sin I,O,1,0

function generateCode(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join('');
}

async function getDaycareIdFromChild(supabase: ReturnType<typeof createClient>, childId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('child_daycare_id', { p_child_id: childId });
  if (error || !data) return null;
  return data;
}

async function resolveKidEmailContext(
  supabase: ReturnType<typeof createClient>,
  childId: string
): Promise<{ kidFirstName: string; roomName: string }> {
  const fallback = { kidFirstName: 'tu hijo/a', roomName: 'Soles' };
  const { data, error } = await supabase
    .from('children')
    .select('full_name, rooms!children_room_id_fk ( name )')
    .eq('id', childId)
    .single();
  if (error || !data) return fallback;
  const fullName = typeof data.full_name === 'string' ? data.full_name : '';
  const kidFirstName = fullName.split(' ')[0] || fallback.kidFirstName;
  const rooms = data.rooms as { name?: string } | { name?: string }[] | null;
  const roomName = Array.isArray(rooms) ? rooms[0]?.name : rooms?.name;
  return { kidFirstName, roomName: roomName || fallback.roomName };
}

export async function sendInvitation(
  _prevState: SendInvitationState,
  formData: FormData
): Promise<SendInvitationState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'No autenticado', code: null };
  }

  const childId = String(formData.get('child_id') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const relationship = String(formData.get('relationship') ?? '').trim();

  if (!childId || !fullName || !email || !relationship) {
    return { error: 'Faltan campos obligatorios', code: null };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email no válido', code: null };
  }
  if (!['father', 'mother', 'guardian'].includes(relationship)) {
    return { error: 'Parentesco no válido', code: null };
  }

  const daycareId = await getDaycareIdFromChild(supabase, childId);
  if (!daycareId) {
    return { error: 'Niño no encontrado', code: null };
  }

  // Verificar que el staff pertenece al mismo daycare
  const { data: profileData, error: profileError } = await supabase.rpc('current_user_profile');
  if (profileError) {
    // Fallo del RPC (red, rate limit…): no es lo mismo que no tener permisos
    console.error('[sendInvitation] current_user_profile RPC failed', profileError);
    return { error: 'No se pudo verificar tu permiso, inténtalo de nuevo', code: null };
  }
  // current_user_profile() devuelve una fila de public.users; PostgREST puede
  // devolver objeto o array de 1 elemento según versión. Normalizar aquí evita
  // el falso "No tienes permisos" por leer .daycare_id de un array.
  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  if (!profile) {
    console.error('[sendInvitation] authenticated user has no public.users profile', { authUserId: user.id, childId });
    return { error: 'No tienes permisos para invitar al padre/madre de este niño', code: null };
  }
  if (profile.daycare_id !== daycareId) {
    console.error('[sendInvitation] daycare mismatch', { authUserId: user.id, profileDaycare: profile.daycare_id, childDaycare: daycareId, childId });
    return { error: 'No tienes permisos para invitar al padre/madre de este niño', code: null };
  }
  if (!['staff', 'admin'].includes(profile.role)) {
    return { error: 'Solo el personal puede enviar invitaciones', code: null };
  }

  // Generar código único en servidor (reintentar si hay conflicto).
  // Se acepta `code` del form por compatibilidad si tiene formato válido,
  // pero la modal ya no lo pre-genera: lo normal es generarlo aquí.
  const requestedCode = String(formData.get('code') ?? '').trim().toUpperCase();
  let code = /^[A-Z2-9]{5}$/.test(requestedCode) ? requestedCode : generateCode();
  let attempt = 0;
  const maxAttempts = 5;

  while (attempt < maxAttempts) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('invitations')
      .insert({
        child_id: childId,
        invited_by: user.id,
        full_name: fullName,
        email: email,
        relationship: relationship as 'father' | 'mother' | 'guardian',
        code,
        expires_at: expiresAt,
      });

    if (!error) break;

    if (error.code === '23505' && error.message.includes('invitations_code_key')) {
      // Conflicto UNIQUE en code: regenerar y reintentar
      code = generateCode();
      attempt++;
      continue;
    }

    return { error: error.message, code: null };
  }

  if (attempt >= maxAttempts) {
    return { error: 'No se pudo generar un código único, inténtalo de nuevo', code: null };
  }

  // Enviar correo al email introducido por el usuario (formData.email ya validado).
  // En dev con FROM=onboarding@resend.dev solo entrega al email de la cuenta
  // Resend (jmmolins87@gmail.com): probar escribiendo ese email en la modal.
  const { sendInvitationEmail } = await import('@/utils/email/invitation-email');
  const { kidFirstName, roomName } = await resolveKidEmailContext(supabase, childId);

  const { error: emailError } = await sendInvitationEmail({
    to: email,
    code,
    kidFirstName,
    roomName,
    parentName: fullName,
  });

  if (emailError) {
    // Si falla el correo, borramos la invitación creada para no dejar basura
    await supabase.from('invitations').delete().eq('code', code);
    return { error: `Error enviando el correo: ${emailError.message}`, code: null };
  }

  revalidatePath(`/kids/${childId}`);
  revalidatePath('/kids');

  return { error: null, code };
}
