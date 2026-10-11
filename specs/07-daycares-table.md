# SPEC 07 — Primera tabla `daycares` en Supabase (migraciones versionadas vía MCP)

> **Estado:** Approved
> **Depende de:** —
> **Fecha:** 2026-10-11
> **Objetivo:** Crear la tabla `public.daycares` con su fila de seed "Guardería Sala Soles" en el proyecto Supabase remoto, con las migraciones versionadas dentro de la carpeta `supabase/` y aplicadas mediante el MCP de Supabase.

## Alcance

**Incluye:**

- Corregir en `opencode.json` la referencia `db-schema` para que apunte a `../07-DB-Schema/opendaycare-database-schema.md` (la carpeta es hermana del repo, no está dentro de él).
- Todo lo relacionado con Supabase vive en la carpeta `supabase/` del proyecto: `supabase/config.toml`, `supabase/.gitignore` y `supabase/migrations/*.sql`. Ningún archivo de Supabase en otra ruta.
- Dos ficheros de migración en `supabase/migrations/`, con nombre generado por timestamp (`<YYYYMMDDHHMMSS>_create_daycares.sql` y `<YYYYMMDDHHMMSS>_seed_daycares.sql`).
- Aplicación al proyecto remoto (`vbwacmmaqxgmwioipmvt`) con el MCP: `apply_migration` (name `create_daycares`) y `apply_migration` (name `seed_daycares`).
- DDL exacto del diccionario: `id uuid PK default gen_random_uuid()`, `name text not null`, `created_at timestamptz not null default now()`, más `ENABLE ROW LEVEL SECURITY` sin policies.
- Seed: una fila `name = 'Guardería Sala Soles'`.
- Verificación con el MCP (`list_tables` verbose, `execute_sql`, `list_migrations`) y con `npx tsc --noEmit` + `pnpm lint`.

**Fuera de alcance (specs futuros):**

- Stack local con Docker: `supabase start`, `supabase db reset`, `supabase db push`.
- Cliente `@supabase/supabase-js`, env vars o cualquier cambio en la app Next.js (sigue con mocks).
- Policies de RLS y cualquier uso de Supabase Auth.
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

```sql
-- supabase/migrations/<timestamp>_seed_daycares.sql
insert into public.daycares (name)
values ('Guardería Sala Soles');
```

Convención: identificadores en inglés (diccionario + `AGENTS.md`); las etiquetas visibles al usuario (español) se resuelven en la capa de UI, nunca en DB.

Estructura de la carpeta resultante:

```
supabase/
├── config.toml                              # supabase init (ya en repo)
├── .gitignore                               # ignora .temp, .branches
└── migrations/
    ├── <timestamp>_create_daycares.sql
    └── <timestamp>_seed_daycares.sql
```

## Plan de implementación

1. Corregir `opencode.json` (referencia `db-schema` → `../07-DB-Schema`). Verificar: `git diff` solo muestra ese cambio y la ruta existe.
2. Asegurar `supabase/config.toml` y `supabase/.gitignore` presentes en el repo. Verificar: `git status` sin borrados en `supabase/`.
3. Crear `supabase/migrations/<timestamp>_create_daycares.sql` con el DDL de arriba. Verificar: el SQL coincide carácter a carácter con la sección 1 del diccionario.
4. Aplicar la migración al remoto con el MCP (`apply_migration`, name `create_daycares`, mismo SQL). Verificar con `list_tables` (verbose) + `execute_sql`: columnas/tipos/PK/defaults, `relrowsecurity = true`, 0 filas en `pg_policy`.
5. Crear `supabase/migrations/<timestamp>_seed_daycares.sql` y aplicarlo con el MCP (`apply_migration`, name `seed_daycares`). Verificar con `execute_sql`: `select * from public.daycares` devuelve 1 fila "Guardería Sala Soles"; `insert ... returning *` + `delete` de prueba funcionan.
6. `npx tsc --noEmit` y `pnpm lint` sin errores; `git status` sin temporales (`supabase/.temp` ya ignorado); `list_migrations` muestra `create_daycares` y `seed_daycares` en el remoto.

## Criterios de aceptación

- [ ] La referencia `db-schema` de `opencode.json` apunta a `../07-DB-Schema` y su lectura resuelve.
- [ ] `supabase/config.toml`, `supabase/.gitignore` y los 2 ficheros de `supabase/migrations/` están versionados; ningún archivo de Supabase vive fuera de `supabase/`.
- [ ] El nombre de cada fichero de migración lleva el timestamp real (formato `<YYYYMMDDHHMMSS>_nombre.sql`).
- [ ] En el remoto, `public.daycares` tiene exactamente `id` (uuid PK, default `gen_random_uuid()`), `name` (text NOT NULL) y `created_at` (timestamptz NOT NULL default `now()`); sin columnas extra.
- [ ] RLS habilitada en `daycares` (`relrowsecurity = true`) y 0 policies registradas.
- [ ] `list_tables` (verbose) muestra la tabla con sus constraints.
- [ ] `select * from public.daycares` devuelve exactamente 1 fila con `name = 'Guardería Sala Soles'`.
- [ ] Un `insert ... returning *` y el `delete` correspondientes funcionan vía `execute_sql` (dejan la tabla con la fila del seed).
- [ ] `list_migrations` registra `create_daycares` y `seed_daycares` en el remoto.
- [ ] `npx tsc --noEmit` y `pnpm lint` sin errores nuevos (la app no cambió).
- [ ] La app Next.js no importa nada de Supabase ni tiene env vars nuevas.
- [ ] `git status` sin archivos temporales (`supabase/.temp` ignorado).

## Decisiones

- **Sí:** aplicar con el MCP (`apply_migration`) en lugar de la CLI con stack local — decisión del usuario; se valida directamente contra el remoto y no requiere Docker.
- **Sí:** fichero de migración versionado en `supabase/migrations/` aunque la aplicación sea por MCP — el repo es la fuente de verdad del DDL; un futuro `db push` parte de lo mismo.
- **Sí:** dos migraciones separadas (schema y seed) — permite re-aplicar el seed sin repetir el DDL y separa estructura de datos.
- **Sí:** seed "Guardería Sala Soles" — decisión del usuario; da una fila que consultar en la verificación.
- **Sí:** RLS habilitada desde la primera tabla y sin policies — seguridad por defecto; las policies entran con Auth.
- **Sí:** columnas exactas del diccionario (sin `updated_at`) — el doc es la fuente de verdad; añadirlo sería una migración futura.
- **Sí:** `name NOT NULL` y defaults en `id`/`created_at` — convención del propio diccionario.
- **Sí:** todo archivo de Supabase dentro de la carpeta `supabase/` — petición explícita del usuario.
- **Sí:** corregir la referencia `db-schema` en `opencode.json` — estaba rota (`./07-DB-Schema` no existe dentro del repo).
- **No:** stack local Docker (`supabase start` / `db reset` / `db push`) — el usuario descartó el workflow local por ahora.
- **No:** idempotencia (`create table if not exists`, `on conflict do nothing`) — las migraciones corren una sola vez; solo añade ruido.
- **No:** cliente Supabase en Next.js — separa este spec de cualquier integración.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Una futura `supabase db push` de la CLI re-aplicaría estas migraciones | Nombres idénticos fichero ↔ remoto (`create_daycares`, `seed_daycares`); mientras no haya stack local, el MCP es la única vía de aplicación, documentado aquí |
| El seed corre dos veces si alguien lo re-aplica a mano | Falla por duplicado y es recuperable con `delete where name = 'Guardería Sala Soles'`; comportamiento esperado de una migración |
| El MCP escribe como dueño (`postgres`) ⇒ no valida permisos reales | La verificación de permisos queda para el spec de Auth/policies; aquí solo se comprueba estructura y RLS activa |
| SQL con error llegando al remoto | `apply_migration` es transaccional: si falla, no deja estado a medias; se relee el fichero del repo como fuente de verdad |

## Qué NO está en este spec

- Stack local con Docker y comandos `supabase start` / `db reset` / `db push`.
- Cliente JS, env vars y cualquier cambio en la app Next.js (sigue con mocks).
- Policies de RLS y cualquier uso de Auth.
- Resto de tablas del diccionario (`users`, `rooms`, `children`, enums).
