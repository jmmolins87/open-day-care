create function public.current_user_profile()
returns public.users
language sql security definer set search_path = ''
as $$
  select u.* from public.users u where u.id = auth.uid()
$$;

revoke execute on function public.current_user_profile() from public, anon;
grant execute on function public.current_user_profile() to authenticated;

create policy "users_select_own" on public.users
for select to authenticated
using (id = auth.uid());

create policy "users_select_daycare" on public.users
for select to authenticated
using (exists (
  select 1 from public.current_user_profile() p
  where p.role in ('staff', 'admin')
    and p.daycare_id = public.users.daycare_id
));

create policy "users_update_own" on public.users
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());
