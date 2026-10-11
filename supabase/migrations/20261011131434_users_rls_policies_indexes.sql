create index users_daycare_id_idx on public.users (daycare_id);

drop policy "users_select_own" on public.users;
create policy "users_select_own" on public.users
for select to authenticated
using (id = (select auth.uid()));

drop policy "users_select_daycare" on public.users;
create policy "users_select_daycare" on public.users
for select to authenticated
using (
  (select p.daycare_id from public.current_user_profile() p) = public.users.daycare_id
  and (select p.role from public.current_user_profile() p) in ('staff', 'admin')
);

drop policy "users_update_own" on public.users;
create policy "users_update_own" on public.users
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
