# SPEC 11 — Invitación real de padre (correo con Resend) y registro con código

> **Estado:** Implemented
> **Depende de:** SPEC 05, SPEC 08, SPEC 09
> **Fecha:** 2026-10-12
> **Objetivo:** Al enviar una invitación desde la modal "Vincular padre", persistirla en `invitations`, enviarle el código al padre por correo con Resend y registrar al padre con ese código, creando el vínculo `parent_children`.

## Alcance

**Incluye:**

- Tablas `invitations` y `parent_children` + enums `relationship_type` / `invitation_status` (diccionario §5–§6), con RLS y policies.
- Funciones `security definer`: `child_daycare_id()`, `get_invitation_by_code()` (pública) y `accept_invitation()` (solo autenticado).
- Server action `sendInvitation` (`utils/actions/invitations.ts`): inserta la invitación y envía el correo con el paquete `resend` desde Next.js.
- Correo HTML en español: código + botón a `${APP_URL}/activate-account?code=<código>` + "Vence en 7 días".
- Modal "Vincular padre" real: genera el código de **5 caracteres alfanuméricos aleatorios** (crypto), llama a la server action, error inline si falla; PADRES VINCULADOS se pinta de BD (`parent_children` + invitaciones `pending`).
- `/activate-account` real: leyenda del niño/sala reales, email readonly, contraseña; server action `activateAccount`: valida invitación → `signUp` con metadata → `accept_invitation` → redirect a `/`.
- Env vars nuevas: `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL` (enlace apunta al dominio de producción cuando cambies `APP_URL`).
- Borrado de `data/mock/auth.ts`; tipo `KidParent` se mueve a `types/kid.ts`.

**Fuera de alcance (specs futuros):**

- Reenviar o cancelar una invitación pendiente; listado de invitaciones para staff.
- Recuperación de contraseña; pantalla `/family-feed` (tras activar, el padre aterriza en `/`).
- Persistir el consentimiento de fotos del padre (sigue siendo solo UI).
- Plantillas con `@react-email`, dominio verificado en Resend, límite de intentos de código.
- Policies en tablas distintas de las nuevas; MFA/OAuth.

## Modelo de datos

```sql
-- migración 1: <ts>_create_invitation_tables.sql
create type public.relationship_type as enum ('father', 'mother', 'guardian');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  invited_by uuid not null references public.users (id),
  full_name text not null,
  email text not null,
  relationship public.relationship_type not null,
  code text not null unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_child_id_idx on public.invitations (child_id);

create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  relationship public.relationship_type not null,
  created_at timestamptz not null default now(),
  unique (parent_id, child_id)
);
create index parent_children_child_id_idx on public.parent_children (child_id);

alter table public.invitations enable row level security;
alter table public.parent_children enable row level security;
```

```sql
-- migración 2: <ts>_invitation_functions.sql (security definer, search_path = '')
-- child_daycare_id(uuid) → uuid          (children → rooms; grant a authenticated)
-- get_invitation_by_code(text) → table   (devuelve email, full_name, kid first name,
--                                          room, daycare_id, status, expires_at;
--                                          grant a anon + authenticated)
-- accept_invitation(text) → invitations  (valida status='pending', expires_at > now()
--                                          y email = auth.jwt() email; inserta
--                                          parent_children con auth.uid(); marca
--                                          accepted + accepted_at; grant a authenticated)
```

```sql
-- migración 3: <ts>_invitation_rls_policies.sql (wrappers (select …), patrón SPEC 09)
-- invitations_select_daycare:  select, staff/admin del daycare del niño
-- invitations_insert_staff:    insert, staff/admin del daycare + invited_by = auth.uid()
-- parent_children_select_own:  select, parent_id = auth.uid()
-- parent_children_select_staff:select, staff/admin del daycare del niño
-- sin policies de UPDATE/INSERT en parent_children (solo la función definer)
```

Relación UI ↔ enum: `Mamá→mother`, `Papá→father`, `Tutor/a→guardian`. Expiración **lazy**: se marca `expired` al intentar usar el código caducado (sin cron).

Env vars (`.env.local`, gitignored):

```
RESEND_API_KEY=...
RESEND_FROM=onboarding@resend.dev   # hasta tener dominio verificado
APP_URL=http://localhost:3000       # en producción: https://tudominio.com
```

## Plan de implementación

1. Crear `specs/11-parent-invitation-and-registration.md`. Verificar: `git status` lo muestra como untracked.
2. Context7 de `resend` + leer `node_modules/next/dist/docs/` (server actions, `searchParams`). Anotar aquí cualquier diferencia.
3. Migración 1 (tablas/enums/RLS on) aplicada por MCP. Verificar: `list_tables` con las 2 tablas y los 2 enums.
4. Migración 2 (funciones) + verificación por simulación de rol (`anon` puede leer `get_invitation_by_code`, `authenticated` puede llamar `accept_invitation`; `child_daycare_id` resuelve el daycare del niño).
5. Migración 3 (policies) + simulaciones: staff de Sala Soles inserta invitación OK y para un niño de otro daycare falla; un `parent` no puede insertar en `parent_children` y solo ve las suyas.
6. `pnpm add resend`; añadir las 3 env vars a `.env.local`. Verificar: arranque sin errores.
7. `utils/email/invitation-email.ts`: cliente Resend lazy + `sendInvitationEmail({ to, code, kidFirstName, roomName })` con HTML inline (brand: gradiente naranja, códigos monoespaciados). Verificar: el HTML contiene código y `${APP_URL}/activate-account?code=…`.
8. `utils/actions/invitations.ts`: `sendInvitation(prev, formData)` → `{ error, code }`; inserta con reintentos si hay conflicto UNIQUE de `code` (regenera y devuelve el definitivo: lo mostrado = lo enviado) y envía el correo. `npx tsc --noEmit`.
9. Modal real: `link-parent-modal.tsx` genera el código (`crypto.getRandomValues`), usa `useActionState` + estado pending + error inline; `kid-profile-content.tsx` recarga tras éxito los padres reales (`parent_children` + invitaciones `pending`). Verificar con Playwright + `staff@solles.test`.
10. Activación real: `app/(auth)/activate-account/page.tsx` lee `searchParams.code` y precarga; `components/auth/activate-form.tsx` usa `useActionState`; `utils/actions/activate.ts` (`activateAccount`): valida la invitación → `signUp` (metadata `daycare_id`/`role=parent`/`full_name`) → `accept_invitation` → `redirect("/")`. Errores en español (código inválido/caducado/usado, contraseña < 8, email ya registrado → link a `/login`). Verificar E2E con el enlace del correo.
11. Limpieza: borrar `data/mock/auth.ts`; mover `KidParent` a `types/kid.ts`; grep sin imports de `mock/auth`; `npx tsc --noEmit` y `pnpm lint`.
12. Verificación final: todos los criterios con Playwright (1280 y 390×844, 0 errores de consola), MCP de relectura de tablas/policies, `git status` sin temporales, temporales borrados, servidor dev apagado.

## Criterios de aceptación

**Base de datos**

- [x] Existen los enums `relationship_type` y `invitation_status` con exactamente los valores del diccionario.
- [x] `invitations` tiene `code` UNIQUE y `parent_children` tiene UNIQUE (`parent_id`, `child_id`).
- [x] Simulando `staff@solles.test`, el insert en `invitations` para un niño de Sala Soles funciona; para un niño de otra guardería afecta 0 filas.
- [x] Simulando un `parent`, `select * from parent_children` devuelve solo sus filas y el insert directo falla por RLS.
- [x] `accept_invitation` con un código válido crea el vínculo y pone la invitación en `accepted` con `accepted_at`; con un código caducado la marca `expired` y falla; con un email distinto al de la invitación falla.

**Envío de la invitación**

- [x] "Enviar invitación" en `/kids/<uuid>` crea la fila con `status = pending`, `expires_at = now() + 7 días` y el mismo código que muestra la card de la modal.
- [x] El correo sale desde la server action con `resend` (respuesta con `data.id`) y su HTML contiene el código y el enlace `${APP_URL}/activate-account?code=<código>`.
- [x] Si falta `RESEND_API_KEY` o Resend devuelve error, la modal muestra un mensaje de error y no se cierra.
- [x] Ningún componente contiene el literal `7K4P9` ni importa `data/mock/auth`.

**Activación y registro**

- [x] `/activate-account?code=<código>` muestra "Te invitaron a seguir a" con el nombre real del niño y su sala.
- [x] Contraseña de menos de 8 caracteres, código inexistente, caducado o ya usado → mensaje de error en español y no se navega.
- [x] Activar crea el usuario en `auth.users` (email confirmado), su fila en `public.users` con `role = parent` y el `daycare_id` del niño, la fila en `parent_children` y la invitación en `accepted`.
- [x] Tras activar hay sesión y `/` carga (sin redirect a `/login`); el sidebar muestra el nombre del padre y el rol "Familia".
- [x] Recargando `/kids/<id>`, el padre aparece en PADRES VINCULADOS con badge ACTIVA.

**Calidad**

- [x] `npx tsc --noEmit` y `pnpm lint` sin errores nuevos (errores preexistentes en código no relacionado con este spec).
- [ ] Sin desbordes ni errores de consola en Playwright (1280 y 390×844); temporales borrados y servidor dev apagado.

## Decisiones

- **Sí:** diccionario tal cual (`invitations`, `parent_children`, sus enums) — es el modelo aprobado y no inventa nada nuevo.
- **Sí:** código de 5 alfanuméricos generado en cliente; ante conflicto UNIQUE la server action regenera y devuelve el definitivo — así lo mostrado en la card es siempre lo que llega por correo.
- **Sí:** correo enviado desde Next.js con server action + paquete `resend` (decisión explícita del usuario).
- **Sí:** enlace construido con `APP_URL` (env) — hoy `http://localhost:3000`, en producción basta cambiar la env var.
- **Sí:** `get_invitation_by_code` y `accept_invitation` como `security definer` con `search_path = ''` — patrón de SPEC 09; el padre no tiene sesión al abrir la página pública.
- **Sí:** desactivar "Confirm email" en Supabase (prerrequisito manual) — el `signUp` devuelve sesión directa y evita el segundo correo de GoTrue.
- **Sí:** el email del formulario debe coincidir con el de la invitación (readonly) — es la prueba de propiedad del correo.
- **Sí:** expiración lazy (se marca `expired` al usarlo), sin `pg_cron`.
- **Sí:** redirect a `/` tras activar — decisión 2a; el feed familiar queda para otro spec.
- **Sí:** borrar `data/mock/auth.ts` y mover `KidParent` a `types/kid.ts` (regla del repo: sin código muerto; `data/mock/kids.ts` se queda por `kids`/`rooms` que aún usa el feed).
- **No:** reenviar/cancelar invitación, recuperación de contraseña, `/family-feed`, `@react-email`, límite de intentos de código.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| "Confirm email" sigue ON → `signUp` no devuelve sesión y `accept_invitation` falla | Prerrequisito manual + paso de verificación explícito al probar la activación |
| RPC pública con código de 5 caracteres (36⁵) expone el nombre del niño | El código es el token de la invitación; además exige coincidir el email; rate limiting queda fuera de alcance y documentado |
| Resend en dev solo envía al propio email de la cuenta | `RESEND_FROM=onboarding@resend.dev` hasta verificar dominio; el criterio de "correo recibido" se valida manualmente |
| Conflictos UNIQUE en `code` | Reintentos server-side con regeneración del código |
| Joins anidados en policies (invitations → children → rooms) | Helper `child_daycare_id()` `security definer` (mismo patrón que `current_user_profile`) |
| Next 16 (Cache Components, breaking changes) | Leer `node_modules/next/dist/docs/` antes de tocar pages/actions (paso 2) |

## Qué NO está en este spec

- Reenvío/cancelación de invitaciones y su listado.
- Recuperación de contraseña y pantalla `/family-feed` para familias.
- Persistencia del consentimiento de fotos.
- Dominio verificado en Resend, plantillas `@react-email`, protección por rate limiting.