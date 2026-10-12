'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

type ActivateState = {
  error: string | null;
};

export async function activateAccount(
  _prevState: ActivateState,
  formData: FormData
): Promise<ActivateState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  // consent se recibe pero no se persiste en este spec (solo UI)
  formData.get('consent');

  if (!code) {
    return { error: 'Código de invitación requerido' };
  }
  if (!email) {
    return { error: 'Email requerido' };
  }
  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' };
  }

  // 1. Buscar invitación por código (usa función pública que permite anon)
  const { data: invitation, error: invError } = await supabase.rpc('get_invitation_by_code', {
    p_code: code,
  });

  if (invError || !invitation || invitation.length === 0) {
    return { error: 'Código de invitación no válido' };
  }

  const inv = invitation[0];

  if (inv.status !== 'pending') {
    return { error: 'Esta invitación ya no es válida' };
  }

  if (inv.expires_at && new Date(inv.expires_at) <= new Date()) {
    return { error: 'El código de invitación ha caducado' };
  }

  if (inv.email.toLowerCase() !== email) {
    return { error: 'El email no coincide con la invitación' };
  }

  // 2. SignUp con metadata (daycare_id, role=parent, full_name)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        daycare_id: inv.daycare_id,
        role: 'parent',
        full_name: inv.full_name,
      },
      emailRedirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/`,
    },
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
      return { error: 'Este email ya está registrado. <a href="/login" class="underline">Inicia sesión</a>' };
    }
    return { error: signUpError.message };
  }

  if (!signUpData.user) {
    return { error: 'No se pudo crear el usuario' };
  }

  // 3. Aceptar invitación (crea parent_children + marca accepted)
  const { error: acceptError } = await supabase.rpc('accept_invitation', {
    p_code: code,
  });

  if (acceptError) {
    // Si falla la aceptación, el usuario ya se creó pero no se vinculó
    // Devolvemos error para que el usuario lo intente de nuevo o contacte soporte
    return { error: `Error vinculando al niño: ${acceptError.message}` };
  }

  // 4. SignIn automático para establecer la sesión
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: 'Cuenta creada pero error al iniciar sesión. Ve a /login' };
  }

  redirect('/');
}