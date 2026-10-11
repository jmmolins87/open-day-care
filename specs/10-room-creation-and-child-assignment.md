# SPEC 10 — Room creation and child room assignment (OpenDayCare)

> **Estado:** Implemented
> **Depende de:** —
> **Fecha:** 2026-10-11
> **Objetivo:** Crear rooms por defecto (sol, estrella, arcoiris) en la tabla `rooms` y asignar room_id no nulo a todos los niños inscritos en la tabla `children`.

## Alcance

**Incluye:**

- Crear 3 rooms en la tabla `rooms`: sol, estrella, arcoiris, con su `id` uuid y `daycare_id` FK al daycare existente.
- Asignar room_id a todos los niños existentes (por defecto al room "sol").
- Alterar la columna `children.room_id` de NULL a NOT NULL.
- Verificar que no haya children con room_id NULL después de la migración.

**Fuera de alcance (specs futuros):**

- Crear funcionalidad de UI para asignar rooms a children.
- Mantenimiento continuo de rooms (añadir/eliminar rooms en el futuro).
- Modificar políticas RLS existentes.
- Crear nuevo daycare si no existe.

## Modelo de datos

**Cambios a `rooms` table:**

```sql
-- Migración: insertar 3 rooms por defecto
INSERT INTO public.rooms (id, name, daycare_id, created_at)
VALUES 
  (gen_random_uuid(), 'sol', <daycare_id>, now()),
  (gen_random_uuid(), 'estrella', <daycare_id>, now()),
  (gen_random_uuid(), 'arcoiris', <daycare_id>, now());
```

**Cambios a `children` table:**

- `room_id`: uuid FK → `rooms`, cambiar de NULLable a NOT NULL.
- Todos los children deben tener un room_id asignado (por defecto "sol").

Estructura resultante después de la migración:

```
supabase/migrations/
  ├── <timestamp>_create_rooms.sql
  └── <timestamp>_assign_rooms_to_children.sql
```

## Plan de implementación

1. **Insertar 3 rooms por defecto** en `public.rooms` con names "sol", "estrella", "arcoiris" y su `daycare_id` FK.
2. **Asignar room_id a niños existentes:** `UPDATE public.children SET room_id = <id_room_sol> WHERE room_id IS NULL;`
3. **Alter column `children.room_id`**: `ALTER TABLE public.children ALTER COLUMN room_id SET NOT NULL;`
4. **Verificar:** `SELECT count(*) FROM public.children WHERE room_id IS NULL;` debe devolver 0.

## Criterios de aceptación

- [x] 3 rooms existen en la BD: sol, estrella, arcoiris.
- [x] Todos los children tienen un `room_id` no nulo asignado.
- [x] La columna `children.room_id` tiene restricción NOT NULL.
- [x] No hay children con `room_id` NULL en la base de datos.

## Decisiones

- **Sí:** crear 3 rooms con default `daycare_id` al daycare existente.
- **Sí:** asignación por defecto usa room "sol" para todos los children sin room_id — simplicidad sobre distribución desigual.
- **Sí:** migración en 3 pasos (insert → assign → alter column) para evitar fallos si la column tiene NULLs.
- **No:** distribución equitativa de children en rooms — fuera de alcance para el baseline.
- **No:** creación de nuevo daycare — se asume que ya existe uno.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La alter column falla si algún child tiene room_id NULL | Paso 2 asegura asignar room_id antes de alter column; si falla, rollback a estado anterior. |
| El daycare_id no coincide con el existente | Verificar `list_tables` o `execute_sql` antes de insertar rooms. |
| La migración se ejecuta dos veces | Las migraciones son versionadas; correr dos veces el assign es seguro (UPDATE SET a mismo valor). |

## Qué NO está en este spec

- Stack local con Docker y `supabase start` / `db reset`.
- Cliente JS (`@supabase/supabase-js`) o env vars en la app Next.js.
- Lógica de UI para selección de room por parte del usuario.
- Creación de políticas RLS nuevas.
- Resto de tablas del diccionario (`users`, `children`, `posts`, enums).