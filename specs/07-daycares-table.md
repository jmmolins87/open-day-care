# SPEC 07 — Primera tabla `daycares` en Supabase (migraciones con CLI)

> **Estado:** Approved
> **Depende de:** —
> **Fecha:** 2026-10-11
> **Objetivo:** Crear la tabla `public.daycares` en Supabase siguiendo el diccionario `07-DB-Schema/opendaycare-database-schema.md`, mediante el workflow de migraciones de la Supabase CLI (stack local con Docker primero y push al proyecto remoto después).

## Alcance

**Incluye:**

- `supabase init` en la raíz del repo → todo lo relacionado con Supabase vive dentro de la carpeta `supabase/`.
- `supabase link --project-ref vbwacmmaqxgmwioipmvt` (proyecto OpenDayCare-Dev, CLI ya autenticada).
- Stack local: arrancar Docker Desktop y `supabase start`.
- Migración imperativa `supabase migration new create_daycares` → `supabase/migrations/<timestamp>_create_daycares.sql`.
- DDL exacto del diccionario: `id uuid PK default gen_random_uuid()`, `name text not null`, `created_at timestamptz not null default now()`, más `ENABLE ROW LEVEL SECURITY` sin policies.
- Verificación en local (`supabase db reset` + `supabase db psql`) y en el remoto (`supabase db push` + MCP `execute_sql` / `list_tables`).
- Sync comprobado con `supabase migration list` (local ↔ remoto).

**Fuera de alcance (specs futuros):**

- Seed / fila de ejemplo de guardería.
- Cliente `@supabase/supabase-js`, env vars o cualquier cambio en la app Next.js (sigue con mocks).
- Policies de RLS (van junto con Auth).
- Resto del diccionario: `users`, `rooms`, `children`, enums, etc.

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_create_daycares.sql
create table public.daycares (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.daycares enable row level security;
```

Convención: identificadores en inglés (diccionario + AGENTS.md); las etiquetas visibles al usuario (español) se resuelven en la capa de UI, nunca en DB.

Estructura de la carpeta resultante:

```
supabase/
├── config.toml                      # supabase init
├── migrations/
│   └── <timestamp>_create_daycares.sql
└── .temp/                           # temporal de la CLI → ignorado en .gitignore
```

## Plan de implementación

1. `supabase init` en la raíz del repo. Verificar: existe `supabase/config.toml`.
2. `supabase link --project-ref vbwacmmaqxgmwioipmvt`. Verificar: `supabase status` sin errores de auth ni de proyecto.
3. Arrancar Docker Desktop y ejecutar `supabase start`. Verificar: servicios locales UP.
4. `supabase migration new create_daycares` y escribir el DDL de arriba en el archivo generado. Verificar: `npx tsc --noEmit` y `pnpm lint` intactos (no se toca `app/`).
5. `supabase db reset` y comprobar en local con `supabase db psql`: columnas/tipos/PK/defaults, `relrowsecurity = true`, `pg_policies` sin filas para `daycares`, e `insert`/`select` de prueba.
6. `supabase db push` al remoto y verificar con el MCP (`execute_sql`: estructura + RLS + 0 policies; `list_tables`).
7. `supabase migration list` en sync local ↔ remoto; añadir `supabase/.temp/` a `.gitignore` si la CLI lo crea; confirmar que `git status` no muestra archivos temporales.

## Criterios de aceptación

- [ ] `supabase/config.toml` y `supabase/migrations/<ts>_create_daycares.sql` versionados en el repo, dentro de la carpeta `supabase/`.
- [ ] El nombre del archivo de migración lo generó la CLI (`supabase migration new`).
- [ ] En local, `public.daycares` tiene exactamente `id` (uuid PK, default `gen_random_uuid()`), `name` (text NOT NULL) y `created_at` (timestamptz NOT NULL default `now()`); sin columnas extra.
- [ ] RLS habilitada en `daycares` (`relrowsecurity = true`) y 0 policies registradas.
- [ ] `supabase db reset` aplica la migración en local sin errores.
- [ ] `supabase db push` la aplica en el proyecto remoto sin errores.
- [ ] En el remoto (MCP `execute_sql`) la estructura y la RLS coinciden con local; un `insert ... returning *` + `select` funcionan.
- [ ] `supabase migration list` muestra la migración aplicada en local y remoto, sin diff.
- [ ] `npx tsc --noEmit` y `pnpm lint` sin errores nuevos (la app no cambió).
- [ ] `git status` sin archivos temporales (`supabase/.temp` ignorado).

## Decisiones

- **Sí:** workflow de Supabase CLI imperativo (`migration new` → `db reset` local → `db push`) — decisión del usuario sobre aplicar solo con MCP o solo con un SQL en repo.
- **Sí:** stack local con Docker primero, push al remoto después — decisión del usuario; validar antes de tocar el proyecto remoto.
- **Sí:** RLS habilitada desde la primera tabla y sin policies — seguridad por defecto; las policies entran con Auth (hoy solo el rol `postgres`, dueño de la tabla, puede leer, y el MCP consulta como dueño).
- **Sí:** columnas exactas del diccionario (sin `updated_at`) — el doc es la fuente de verdad; añadir `updated_at` sería una migración futura.
- **Sí:** `name NOT NULL` y defaults en `id`/`created_at` — convención del propio diccionario ("PK `id` tipo `uuid` default `gen_random_uuid()`, `created_at`/`updated_at` tipo `timestamptz`").
- **Sí:** todo archivo relacionado con Supabase dentro de la carpeta `supabase/` — petición explícita del usuario.
- **No:** seed de "Guardería Sala Soles" — el alcance decidido es solo schema.
- **No:** cliente Supabase en Next.js — separa este spec de cualquier integración.
- **No:** idempotencia (`create table if not exists`) — las migraciones corren una sola vez; solo añade ruido.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Docker apagado ⇒ `supabase start` falla | Paso 3 explícito: abrir Docker Desktop antes de ejecutar |
| Primera ejecución descarga imágenes (varios minutos) | `supabase start` con timeout amplio; no hay dependencia de pasos posteriores |
| SQL con error llegando al remoto | Se valida primero en local con `db reset` (motivo de elegir el stack local) |
| CLI 2.118 vs 2.120 disponible | Funciona; actualizar es opcional y fuera de este spec |

## Qué NO está en este spec

- Seed de datos.
- Cliente JS / env vars / cambios en la app.
- Policies de RLS y cualquier uso de Auth.
- Cualquier otra tabla o enum del diccionario.
