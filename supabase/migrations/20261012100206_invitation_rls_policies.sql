-- 20261012100206_invitation_rls_policies.sql
-- Policies para invitations (wrappers (select ...) patrón SPEC 09)

-- invitations_select_daycare: staff/admin del daycare del niño pueden ver invitaciones
create policy "invitations_select_daycare" on public.invitations
for select to authenticated
using (
  (select p.daycare_id from public.current_user_profile() p) = (select r.daycare_id from public.rooms r join public.children c on c.room_id = r.id where c.id = public.invitations.child_id)
  and (select p.role from public.current_user_profile() p) in ('staff', 'admin')
);

-- invitations_insert_staff: staff/admin del daycare del niño pueden insertar (invited_by = auth.uid())
create policy "invitations_insert_staff" on public.invitations
for insert to authenticated
with check (
  (select p.daycare_id from public.current_user_profile() p) = (select r.daycare_id from public.rooms r join public.children c on c.room_id = r.id where c.id = child_id)
  and (select p.role from public.current_user_profile() p) in ('staff', 'admin')
  and invited_by = (select auth.uid())
);

-- parent_children_select_own: el padre ve solo sus vínculos
create policy "parent_children_select_own" on public.parent_children
for select to authenticated
using (parent_id = (select auth.uid()));

-- parent_children_select_staff: staff/admin del daycare del niño ven los vínculos
create policy "parent_children_select_staff" on public.parent_children
for select to authenticated
using (
  (select p.daycare_id from public.current_user_profile() p) = (select r.daycare_id from public.rooms r join public.children c on c.room_id = r.id where c.id = public.parent_children.child_id)
  and (select p.role from public.current_user_profile() p) in ('staff', 'admin')
);