-- 20261012143500_invitation_delete_policy.sql
-- invitations_delete_staff: el creador (staff/admin del daycare del niño) puede
-- borrar su propia invitación. Hacía falta para que el cleanup de sendInvitation
-- cuando el correo falla (utils/actions/invitations.ts) funcione de verdad:
-- sin esta policy el delete es un no-op silencioso bajo RLS y las filas
-- "pending" quedan como basura visible en el perfil del niño.
create policy "invitations_delete_staff" on public.invitations
for delete to authenticated
using (
  (select p.daycare_id from public.current_user_profile() p) = (select r.daycare_id from public.rooms r join public.children c on c.room_id = r.id where c.id = public.invitations.child_id)
  and (select p.role from public.current_user_profile() p) in ('staff', 'admin')
  and invited_by = (select auth.uid())
);
