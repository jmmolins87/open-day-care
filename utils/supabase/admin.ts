import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase admin client (service_role).
 * Solo para Server Actions / Route Handlers. Nunca importar en client components
 * ni exponer con NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en .env');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
