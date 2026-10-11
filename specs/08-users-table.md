# SPEC 08 — Tabla `users` en Supabase (enums, FK → `auth.users`, trigger y seed staff)

> **Estado:** Implemented
> **Depende de:** SPEC 07
> **Fecha:** 2026-10-11
> **Objetivo:** Crear la tabla `public.users` (1 usuario ↔ 1 daycare; 1 daycare ↔ N usuarios) con sus enums, el trigger de autoalta desde `auth.users` y una fila de seed de usuario staff de prueba, aplicando las migraciones por MCP sobre el proyecto remoto.

## Alcance

**Incluye:**

- Enums `public.user_role` (`staff` / `parent` / `admin`) y `public.user_status` (`pending` / `active`), tal y como los define el diccionario (`../07-DB-Schema/opendaycare-database-schema.md`, sección "ENUMs usados").
- Tabla `public.users` con el DDL exacto del diccionario (sección 2): `id` uuid PK con FK → `auth.users(id)` `ON DELETE CASCADE`, `daycare_id` not null FK → `daycares`, `role`, `status` default `active`, `full_name`, `avatar_url` nullable, `notify_on_post` default `true`, `daily_summary_enabled` default `true`, `created_at` / `updated_at` default `now()`.
- `ENABLE ROW LEVEL SECURITY` en `users` sin policies (igual que `daycares` en SPEC 07).
- Trigger `AFTER INSERT ON auth.users` con función `SECURITY DEFINER` (`handle_new_user`) que crea la fila en `public.users` leyendo `raw_user_meta_data` (`daycare_id`, `role`, `full_name`).
- Seed de un usuario staff de prueba: fila en `auth.users` (email confirmado, bcrypt vía `crypt()`), fila en `auth.identities` (provider `email`, para que el login por email sea posible cuando llegue el spec de Auth) y — vía trigger — la fila resultante en `public.users`.
- Dos ficheros de migración en `supabase/migrations/` con nombre `<YYYYMMDDHHMMSS>_nombre.sql`, aplicados al remoto (`vbwacmmaqxgmwioipmvt`) con el MCP `apply_migration` (names `create_users` y `seed_staff_user`).
- Verificación con el MCP (`list_tables` verbose, `execute_sql`, `list_migrations`) y con `npx tsc --noEmit` + `pnpm lint`.

**Fuera de alcance (specs futuros):**

- Policies de RLS, flujos reales de Supabase Auth (signup, login, invitaciones, activación) y cliente `@supabase/supabase-js` en la app.
- Cualquier cambio en la app Next.js (sigue con mocks).
- Resto del diccionario: `rooms`, `children`, `parent_children`, `invitations`, `posts`, etc.
- Auto-update de `updated_at` (trigger `set_updated_at`).
- Stack local con Docker: `supabase start`, `db reset`, `db push`.

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_create_users.sql
create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  daycare_id uuid not null references public.daycares (id),
  role public.user_role not null,
  status public.user_status not null default 'active',
  full_name text not null,
  avatar_url text,
  notify_on_post boolean not null default true,
  daily_summary_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'daycare_id' is null then
    return new;
  end if;
  insert into public.users (id, daycare_id, role, full_name)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'daycare_id')::uuid,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'parent'),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

```sql
-- supabase/migrations/<timestamp>_seed_staff_user.sql
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'staff@solles.test',
  crypt('staff1234', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object(
    'daycare_id', (select id::text from public.daycares where name = 'Guardería Sala Soles'),
    'role', 'staff',
    'full_name', 'Staff Demo'
  ),
  now(),
  now();

insert into auth.identities (
  id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  'email',
  u.email,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(),
  now(),
  now()
from auth.users u
where u.email = 'staff@solles.test';
```

Notas del trigger (decisiones registradas más abajo):

- Si el `raw_user_meta_data` no trae `daycare_id`, el trigger **no crea** la fila en `public.users` y no bloquea el alta en `auth.users`.
- `role` cae a `'parent'` si el metadata no lo trae (los signups habituales son de padres; el staff se crea por seed/admin).
- `full_name` cae a la parte local del email si el metadata no lo trae.

Datos del staff de prueba: `full_name = 'Staff Demo'`, `email = 'staff@solles.test'`, contraseña `staff1234` (solo test), `role = staff`, `status = active` (default), `daycare_id` resuelto por subselect sobre `Guardería Sala Soles`.

Estructura de la carpeta resultante:

```
supabase/
├── config.toml
├── .gitignore
└── migrations/
    ├── 20261011082301_create_daycares.sql   # SPEC 07
    ├── 20261011082516_seed_daycares.sql     # SPEC 07
    ├── <timestamp>_create_users.sql
    └── <timestamp>_seed_staff_user.sql
```

## Plan de implementación

1. Crear `specs/08-users-table.md` (este fichero). Verificar: `git status` lo muestra como untracked.
2. Crear `supabase/migrations/<timestamp>_create_users.sql` con el DDL de arriba. Verificar: el SQL coincide con la sección "Modelo de datos".
3. Aplicar al remoto con el MCP (`apply_migration`, name `create_users`, mismo SQL). Verificar con `list_tables` (verbose) + `execute_sql`: columnas/tipos/PK/FK (`auth.users`, `daycares`), defaults, `relrowsecurity = true`, 0 policies; enums `user_role`/`user_status` existen; trigger `on_auth_user_created` registrado en `pg_trigger`.
4. Crear `supabase/migrations/<timestamp>_seed_staff_user.sql` y aplicarlo con el MCP (`apply_migration`, name `seed_staff_user`). Verificar con `execute_sql`: `select u.*, d.name from public.users u join daycares d on d.id = u.daycare_id` devuelve 1 fila (`Staff Demo`, `staff`, `active`, `Guardería Sala Soles`); existe la fila en `auth.users` con `email = 'staff@solles.test'` y `email_confirmed_at` no nulo; existe la fila en `auth.identities` con `provider = 'email'`; `crypt('staff1234', encrypted_password)` verifica.
5. `list_migrations` muestra `create_users` y `seed_staff_user`; `npx tsc --noEmit` y `pnpm lint` sin errores; `git status` sin temporales (`supabase/.temp` ignorado) y sin cambios en `app/`, `components/` ni `data/`.

## Criterios de aceptación

- [x] Existen los enums `public.user_role` y `public.user_status` con exactamente los valores del diccionario.
- [x] `public.users` tiene exactamente las 10 columnas del diccionario con sus tipos; sin columnas extra.
- [x] `users.id` es PK uuid con FK → `auth.users(id)` `ON DELETE CASCADE` (sin default `gen_random_uuid()`: el `id` siempre lo aporta `auth.users` — decisión registrada abajo).
- [x] `users.daycare_id` es NOT NULL con FK → `daycares(id)`.
- [x] `status` tiene default `'active'`; `notify_on_post` y `daily_summary_enabled` default `true`; `avatar_url` es el único nullable no primary; `created_at`/`updated_at` default `now()`.
- [x] RLS habilitada en `users` (`relrowsecurity = true`) y 0 policies registradas.
- [x] El trigger `on_auth_user_created` existe en `auth.users` y apunta a `public.handle_new_user()` (`security definer`, `search_path = ''`).
- [x] Tras el seed, `public.users` tiene exactamente 1 fila: `full_name = 'Staff Demo'`, `role = 'staff'`, `status = 'active'`, unida al daycare `Guardería Sala Soles`.
- [x] Tras el seed, `auth.users` tiene 1 fila con `email = 'staff@solles.test'`, `email_confirmed_at` no nulo y `encrypted_password` verificable contra `staff1234`; `auth.identities` tiene la fila `provider = 'email'` correspondiente.
- [x] Insertar un segundo usuario de prueba con metadata válida en `auth.users` crea su fila en `public.users` vía trigger (probado con insert+delete; además se verificó que sin `daycare_id` en metadata el trigger no crea fila y no bloquea el alta).
- [x] `list_migrations` registra `create_users` y `seed_staff_user` en el remoto.
- [x] `npx tsc --noEmit` sin errores; `pnpm lint` sin errores nuevos (los 2 errores de `references/pantallas/support.js` son preexistentes y ajenos a este spec); la app Next.js no importa nada de Supabase ni tiene env vars nuevas.
- [x] `git status` sin archivos temporales (`supabase/.temp` ignorado).

## Decisiones

- **Sí:** DDL completo con FK → `auth.users` + trigger `AFTER INSERT` — recomendación aceptada por el usuario; es lo que pide el diccionario y permite un staff de prueba realista.
- **Sí:** seed staff con `full_name = 'Staff Demo'`, `email = 'staff@solles.test'`, contraseña `staff1234` — recomendación aceptada; datos de prueba, no producción.
- **Sí:** `updated_at` solo como columna `default now()`, sin trigger de auto-update — recomendación aceptada; el trigger entra con Auth/policies.
- **Sí:** solo base de datos, sin tocar la app Next.js — recomendación aceptada (mismo patrón que SPEC 07).
- **Sí:** fila también en `auth.identities` (provider `email`) — sin ella GoTrue no resolvería el login por email cuando el spec de Auth lo active; el coste es una fila más en el seed.
- **Sí:** trigger con guard de `daycare_id` y fallbacks (`role → 'parent'`, `full_name → local part del email`) — evita que un signup sin metadata rompa el alta en Auth; el diccionario no define comportamiento ante metadata ausente.
- **Sí:** `daycare_id NOT NULL` — el diccionario marca "Nullable" explícitamente en otros campos y no lo hace aquí; además "un usuario puede tener un daycare" modela la parte 1 del 1:N.
- **Sí:** columnas de seguridad (`notify_on_post`, `daily_summary_enabled`) NOT NULL con default `true` — defaults del diccionario.
- **Sí:** dos migraciones separadas (schema y seed), aplicadas por MCP — continuidad con SPEC 07.
- **Sí:** `provider_id = email` en la fila de `auth.identities` — la columna es NOT NULL en el esquema real del proyecto (fuerza el remoto, no contemplado en el DDL original de la spec); `provider_id` con el email es el valor estándar de GoTrue para provider `email`.
- **Sí:** `users.id` sin default `gen_random_uuid()` — el DDL aprobado no lo incluye y el `id` siempre lo aporta `auth.users` vía trigger; el criterio de aceptación se ajustó a la implementación acordada.
- **No:** idempotencia (`if not exists`, `on conflict`) — mismo criterio que SPEC 07; solo añade ruido.
- **No:** policies de RLS — llegan con el spec de Auth; aquí solo se activa RLS por defecto.
- **No:** stack local Docker — workflow descartado por el usuario en SPEC 07 y vigente.
- **No:** auto-create de rooms/children en el seed — fuera de alcance; el staff solo necesita el vínculo con el daycare.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Insert directo en `auth.users` bypasea hooks de GoTrue (confirmación, emails) | Solo sirve como seed de test; los signups reales irán por el spec de Auth con metadata correcta |
| Re-aplicar el seed falla por email duplicado | Comportamiento esperado de una migración; recuperable borrando las filas de `auth.identities`, `auth.users` y `public.users` del email de prueba |
| Un signup sin `daycare_id` en metadata no genera fila en `public.users` | Diseñado: no bloquea el alta en Auth; el perfil se completa en el flujo de activación/invitación (spec futuro) |
| El trigger se ejecuta como `security definer` | Función con `search_path = ''` y cualificadores `public.`/`auth.` en todo el cuerpo; propiedad del rol `postgres` vía MCP |
| Una futura `supabase db push` re-aplicaría estas migraciones | Nombres idénticos fichero ↔ remoto (`create_users`, `seed_staff_user`); documentado como en SPEC 07 |

## Qué NO está en este spec

- Policies de RLS y cualquier flujo real de Supabase Auth (signup, login, invitaciones, activación).
- Cambios en la app Next.js, cliente Supabase o env vars (sigue con mocks).
- Resto de tablas del diccionario (`rooms`, `children`, `parent_children`, `invitations`, `posts`, …).
- Trigger de auto-update de `updated_at`.
- Stack local con Docker (`supabase start` / `db reset` / `db push`).
