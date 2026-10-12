-- 20261012095913_invitation_functions.sql
-- child_daycare_id(uuid) -> uuid
-- Helper para evitar recursión en policies: obtiene daycare_id del niño via rooms
create or replace function public.child_daycare_id(p_child_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_daycare_id uuid;
begin
  select r.daycare_id into v_daycare_id
  from public.children c
  join public.rooms r on r.id = c.room_id
  where c.id = p_child_id;
  return v_daycare_id;
end;
$$;

grant execute on function public.child_daycare_id(uuid) to authenticated;

-- get_invitation_by_code(text) -> table
-- Devuelve la invitación por código (para anon + authenticated)
-- Expone solo los campos necesarios para la página /activate-account
create or replace function public.get_invitation_by_code(p_code text)
returns table (
  id uuid,
  child_id uuid,
  invited_by uuid,
  full_name text,
  email text,
  relationship public.relationship_type,
  code text,
  status public.invitation_status,
  expires_at timestamptz,
  kid_first_name text,
  room_name text,
  daycare_id uuid
)
language plpgsql security definer set search_path = ''
as $$
begin
  return query
  select
    i.id,
    i.child_id,
    i.invited_by,
    i.full_name,
    i.email,
    i.relationship,
    i.code,
    i.status,
    i.expires_at,
    split_part(c.full_name, ' ', 1) as kid_first_name,
    r.name as room_name,
    r.daycare_id
  from public.invitations i
  join public.children c on c.id = i.child_id
  join public.rooms r on r.id = c.room_id
  where i.code = upper(p_code);
end;
$$;

grant execute on function public.get_invitation_by_code(text) to anon, authenticated;

-- accept_invitation(text) -> invitations
-- Valida la invitación y crea el vínculo parent_children + marca accepted
create or replace function public.accept_invitation(p_code text)
returns public.invitations
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv public.invitations;
  v_user_email text;
begin
  -- Obtener email del usuario autenticado desde el JWT
  v_user_email := lower((auth.jwt() ->> 'email')::text);

  -- Bloquear la fila para evitar race conditions
  select * into v_inv
  from public.invitations
  where code = upper(p_code)
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'Invitation not usable';
  end if;

  if v_inv.expires_at <= now() then
    update public.invitations set status = 'expired' where id = v_inv.id;
    raise exception 'Invitation expired';
  end if;

  if lower(v_inv.email) <> v_user_email then
    raise exception 'Email mismatch';
  end if;

  -- Crear el vínculo (idempotente por unique constraint)
  insert into public.parent_children (parent_id, child_id, relationship)
  values (auth.uid(), v_inv.child_id, v_inv.relationship)
  on conflict (parent_id, child_id) do nothing;

  -- Marcar invitación como aceptada
  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = v_inv.id
  returning * into v_inv;

  return v_inv;
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;