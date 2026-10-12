'use server';

import { cookies } from 'next/headers';
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
  const { data: profile } = await supabase.rpc('current_user_profile');
  if (!profile || profile.daycare_id !== daycareId) {
    return { error: 'No tienes permisos para invitar a este niño', code: null };
  }
  if (!['staff', 'admin'].includes(profile.role)) {
    return { error: 'Solo el personal puede enviar invitaciones', code: null };
  }

  // Generar código único (reintentar si hay conflicto)
  let code = generateCode();
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

  // Enviar correo
  const { sendInvitationEmail } = await import('@/utils/email/invitation-email');
  const kidFirstName = fullName.split(' ')[0];
  const roomName = 'Sala'; // se podría obtener via query si se quiere

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

  return { error: null, code };
}