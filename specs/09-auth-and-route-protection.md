# SPEC 09 — Autenticación real (email+password) y protección de rutas

> **Estado:** Approved
> **Depende de:** SPEC 03, SPEC 08
> **Fecha:** 2026-10-11
> **Objetivo:** Login y logout reales contra Supabase Auth con sesión por cookies, protección de todas las rutas no públicas y perfil real del usuario en el sidebar.

## Alcance

**Incluye:**

- Server actions en `utils/actions/auth.ts`: `signIn` (email+password vía `signInWithPassword`) y `signOut`.
- `components/auth/login-form.tsx` real: form con `useActionState`, error inline en español, botón "Ingresando…" y retorno a la ruta de origen vía `?next=`.
- Gate de rutas en `utils/supabase/proxy.ts` (lo invoca `proxy.ts` de la raíz): allowlist pública `/login` y `/activate-account`; sin sesión → `/login?next=<ruta>`; autenticado en `/login` → `/`.
- Verificación redundante en `app/(dashboard)/layout.tsx` (`getUser()` + redirect).
- Route group `app/(dashboard)/` con `page.tsx`, `kids/page.tsx` y `kids/[id]/page.tsx` movidos (URLs intactas) y chrome (Sidebar/MobileHeader) centralizado en `components/shared/dashboard-shell.tsx`.
- Perfil real en el sidebar: nombre, inicial y rol traducido (`staff` → "Personal"), logout con `signOut` real.
- Feed con saludo y autor de publicaciones reales; "Nueva publicación" abre el modal vía `?create=1`.
- Policies RLS en `public.users` (SELECT propio + SELECT del mismo daycare para `staff`/`admin` + UPDATE propio) con función `security definer` anti-recursión.
- Seed de prueba: `admin@solles.test`/`admin1234`, `staff@otra.test`/`staff1234` y el daycare `Otra Guardería`.
- Borrado de `data/mock/user.ts` y de la prop `onNewPost` (quedan sin usos).

**Fuera de alcance (specs futuros):**

- Signup, activación real e invitaciones: `/activate-account` sigue con mock y su botón sigue apuntando a `/family-feed`.
- Selector de rol (botones Personal/Familia) en `/login`: ya eliminado en SPEC 03; el login real no lo reintroduce (el rol viene de `public.users`).
- Recuperación de contraseña.
- Policies de RLS en tablas distintas de `users`.
- Datos reales del resto del feed (posts, niños, sala); la tabla `rooms` no existe.
- `avatar_url` en la UI (siempre se muestra la inicial).
- MFA, OAuth/social, refresh manual con `getClaims`.
- Pantallas o permisos por rol.

## Modelo de datos

### Policies e índice (`supabase/migrations/`)

Estado final (dos ficheros: `<ts>_users_rls_policies.sql` crea la función y las policies; `<ts>_users_rls_policies_indexes.sql` añade el índice y reescribe las 3 policies con los wrappers `(select …)`).

```sql
create function public.current_user_profile()
returns public.users
language sql security definer set search_path = ''
as $$
  select u.* from public.users u where u.id = auth.uid()
$$;

revoke execute on function public.current_user_profile() from public, anon;
grant execute on function public.current_user_profile() to authenticated;

create index users_daycare_id_idx on public.users (daycare_id);

create policy "users_select_own" on public.users
for select to authenticated
using (id = (select auth.uid()));

create policy "users_select_daycare" on public.users
for select to authenticated
using (
  (select p.daycare_id from public.current_user_profile() p) = public.users.daycare_id
  and (select p.role from public.current_user_profile() p) in ('staff', 'admin')
);

create policy "users_update_own" on public.users
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
```

Sin policy de INSERT/DELETE → el rol `authenticated` no puede crear ni borrar usuarios. Los wrappers `(select …)` evalúan `auth.uid()` y la función una sola vez por query en vez de por fila; el índice cubre `daycare_id`, la columna FK que filtra la policy de daycare (PK ya indexada por `users_pkey`).

### Seeds de prueba (`supabase/migrations/<ts>_seed_auth_test_users.sql`)

Patrón de SPEC 08: fila en `auth.users` (email confirmado, `crypt()`) + fila en `auth.identities` + perfil derivado por el trigger `on_auth_user_created`.

| email | contraseña | full_name | role | daycare |
| --- | --- | --- | --- | --- |
| `admin@solles.test` | `admin1234` | Admin Demo | `admin` | Guardería Sala Soles |
| `staff@otra.test` | `staff1234` | Staff Otra | `staff` | Otra Guardería (fila nueva) |

Resultado: `public.users` = 3 filas (con la de SPEC 08), `public.daycares` = 2.

Los tokens de `auth.users` (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`) se insertan como `''` y no NULL: GoTrue los escanea como `string` no anulable en `/token`, y un NULL produce un 500 `Database error querying schema` al hacer login. La migración correctiva `fix_auth_seed_tokens` aplica lo mismo a los usuarios ya sembrados en SPEC 08.

### Perfil en la app

```ts
// utils/auth.ts — getCurrentProfile() envuelto en cache() de React
// (dedupe entre layout y page en el mismo render)
// → null | { user: { id, email }, row: { full_name, role } | null }

interface SidebarProfile {
  name: string;              // full_name o parte local del email si no hay fila
  initial: string;           // primera letra de name
  roleLabel: string | null;  // staff→"Personal", admin→"Admin", parent→"Familia"
}
```

## Plan de implementación

1. Crear `specs/09-auth-and-route-protection.md` (este fichero). Verificar: `git status` lo muestra como untracked.
2. Leer en `node_modules/next/dist/docs/`: `01-getting-started/16-proxy.md`, `02-guides/server-actions.md`, `03-api-reference/03-file-conventions/layout.md` y `03-api-reference/04-functions/use-search-params.md`. Verificar: anotar aquí si `searchParams` o las cookies en server actions difieren de lo asumido.
3. Crear `supabase/migrations/<ts>_users_rls_policies.sql` y aplicarlo con el MCP (`apply_migration`, name `users_rls_policies`). Verificar: `pg_policy` con las 3 policies; simulación con `set local role authenticated` + `request.jwt.claims` → `staff@solles.test` ve 2 filas (Staff Demo, Admin Demo) y no la de Staff Otra; `staff@otra.test` ve solo la suya; update propio OK y update ajeno afecta 0 filas; `rollback` al final. Después, crear `supabase/migrations/<ts>_users_rls_policies_indexes.sql` y aplicarlo (`apply_migration`, name `users_rls_policies_indexes`): índice `users_daycare_id_idx` + las 3 policies reescritas con `auth.uid()`/la función envueltos en `(select …)` (evaluación única por query). Re-verificar `pg_policy` (wrappers), `pg_indexes` y las simulaciones.
4. Crear `supabase/migrations/<ts>_seed_auth_test_users.sql` y aplicarlo (`apply_migration`, name `seed_auth_test_users`). Verificar: 2 filas nuevas en `auth.users` (confirmadas, `crypt()` que verifica) y 2 en `auth.identities`; `public.users` = 3; `public.daycares` = 2; perfiles creados por el trigger.
5. Crear `utils/actions/auth.ts` (`"use server"`): `signIn(prev, formData)` → `{ error: string | null }` con traducción de `Invalid login credentials` → "Credenciales inválidas" (otros errores, texto literal) y `redirect(safeNext(next))` (`next` debe empezar por `/`, no por `//` y sin `\` ni whitespace, si no `/`); `signOut()` → `supabase.auth.signOut()` + `redirect("/login")`. Verificar: `npx tsc --noEmit`.
6. Conectar el login: `app/(auth)/login/page.tsx` lee `searchParams.next` y lo pasa a `components/auth/login-form.tsx`; el form usa `useActionState(signIn, { error: null })`, inputs `required`, mensaje de error bajo la contraseña y `<button type="submit">` con "Ingresando…" mientras `pending`. Verificar con Playwright: `staff@solles.test`/`staff1234` → navega a `/` con cookies de sesión; credenciales malas → "Credenciales inválidas" sin navegar.
7. Gate en `utils/supabase/proxy.ts` (antes `middleware.ts`, renombrado tras revisión con Context7): tras `getUser()`, sin usuario y pathname fuera de la allowlist → redirect a `/login?next=<pathname+search>`; con usuario en `/login` → redirect a `/`. En ambos redirects se copian las cookies de `supabaseResponse` a la respuesta de redirect. El `setAll(cookiesToSet, headers)` del `@supabase/ssr` también propaga los headers anti-cache (`Cache-Control: private, no-cache…`, `Expires: 0`, `Pragma: no-cache`) que el paquete entrega solo con la primera escritura de cookies. Verificar con Playwright: anónimo en `/` → `/login?next=%2F`; anónimo en `/kids` → `/login?next=%2Fkids`; la allowlist carga sin sesión; con sesión, `/login` → `/`; favicon/estáticos sin redirect.
8. Crear `app/(dashboard)/layout.tsx` (server: `getCurrentProfile()`, sin usuario → `redirect("/login")`) y mover `app/page.tsx` → `app/(dashboard)/page.tsx` y `app/kids/` → `app/(dashboard)/kids/`. Verificar: mismas URLs y contenido; con la sesión borrada redirigen a `/login`.
9. Crear `components/shared/dashboard-shell.tsx` (client: `usePathname` → `active`, con `/kids*` → `/kids`; renderiza `min-h-screen bg-page lg:flex` + `MobileHeader` + `Sidebar` + `<main>`) y renderizarlo desde el layout con `{children}`. Quitar el chrome de `app/(dashboard)/page.tsx`, `kids/page.tsx` y `kids/[id]/page.tsx` (cada página deja solo su contenedor `max-w-*`). `feed-content.tsx` deja de renderizar Sidebar/MobileHeader y abre el modal con `openCreate` (la page lee `searchParams.create === "1"` y tras abrir hace `router.replace("/")`). Verificar: visualmente igual en `/` y `/kids` (1280 y 390×844); "Nueva publicación" abre el modal.
10. Sidebar real + logout: el layout calcula `SidebarProfile` → shell → `Sidebar` lo recibe por props (borra el import de `data/mock/user.ts`) y el botón de logout pasa a `<form action={signOut}>`. Se borran las props `onNewPost` de `Sidebar` y `MobileHeader` (quedan muertas). Verificar con Playwright: sidebar "Staff Demo / Personal"; logout → `/login` y `/` vuelve a redirigir.
11. Feed real: `app/(dashboard)/page.tsx` pasa `profile` a `feed-content.tsx` (saludo "Buenas, Staff", autor e inicial de publicaciones nuevas reales; la línea `GUARDERÍA · SALA SOLES` queda como texto de marca). Borrar `data/mock/user.ts` (sin usos). Verificar: grep sin referencias a `mock/user` ni `onNewPost`; saludo y autor reales en la UI.
12. Limpieza y verificación final: borrar la carpeta vacía `app/login/` si existe; `npx tsc --noEmit` y `pnpm lint` sin errores nuevos; Playwright E2E con todos los criterios (1280 y 390×844, 0 errores de consola); re-consulta de policies y seed por MCP; `git status` sin temporales; bajar el servidor dev.

## Criterios de aceptación

**Base de datos**

- [x] `public.users` tiene exactamente 3 policies (`users_select_own`, `users_select_daycare`, `users_update_own`) del rol `authenticated`; ninguna de INSERT/DELETE.
- [x] Existe el índice `users_daycare_id_idx` y las policies usan wrappers `(select …)` (no `auth.uid()` a pelo en el `using`).
- [x] Simulando `authenticated` con `sub` de `staff@solles.test`, `select * from public.users` devuelve 2 filas (Staff Demo y Admin Demo) y no la de Staff Otra.
- [x] Simulando `sub` de `staff@otra.test`, el mismo `select` devuelve solo su fila.
- [x] Simulando `sub` de `staff@solles.test`, un `update` de su propia fila funciona y un `update` de la fila de Admin Demo afecta 0 filas.
- [x] Existen `admin@solles.test` y `staff@otra.test` en `auth.users` (confirmados, contraseña verificable) y en `auth.identities`; `public.users` tiene 3 filas; `public.daycares` tiene 2.

**Login**

- [x] Con `staff@solles.test` / `staff1234` el formulario navega a `/` y quedan cookies de sesión.
- [x] Llegando de `/login?next=%2Fkids`, un login válido navega a `/kids`.
- [x] Un `next` externo (`https://…`, `//…` o con `\`) se ignora y el login navega a `/`.
- [x] Con credenciales incorrectas aparece "Credenciales inválidas" bajo la contraseña y no se navega.
- [x] Durante el envío el botón muestra "Ingresando…" y está deshabilitado.
- [x] `/login` no muestra ningún botón ni selector de rol ("Personal" / "Familia"): solo email, contraseña y los links existentes.

**Protección de rutas**

- [x] Sin sesión, `/`, `/kids` y `/kids/1` redirigen a `/login?next=…` con la ruta de origen.
- [x] Sin sesión, `/login` y `/activate-account` cargan normalmente.
- [x] Con sesión, `/login` redirige a `/`.
- [x] La respuesta de redirect conserva las cookies de sesión refrescadas (no se pierde la sesión).
- [x] Favicon, imágenes y `_next/static` no disparan redirect (matcher intacto).

**UI con datos reales**

- [ ] Logueado con el staff seed, el sidebar muestra "Staff Demo" y "Personal" (sin sala).
- [ ] El feed muestra "Buenas, Staff" y las publicaciones nuevas salen con autor "Staff".
- [ ] Logout borra la sesión y lleva a `/login`; a partir de ahí `/` redirige a `/login`.
- [ ] "Nueva publicación" abre el modal y la URL vuelve a `/`.
- [ ] `/kids` y `/kids/1` conservan sidebar, header móvil y contenido igual que hoy.
- [ ] Usuario autenticado sin fila en `public.users`: el sidebar muestra la parte local de su email, sin rol, y no hay bucle de redirects.
- [ ] 0 errores de consola en Playwright (1280 y 390×844) y sin desbordes en móvil.

**Calidad**

- [ ] `npx tsc --noEmit` y `pnpm lint` sin errores nuevos.
- [ ] `data/mock/user.ts` no existe y ningún fichero importa `mock/user` ni usa `onNewPost`.
- [ ] `git status` sin temporales; servidor dev apagado al terminar.

## Decisiones

- **Sí:** server actions en `utils/actions/auth.ts` — las cookies de sesión las escribe el servidor; patrón oficial de Context7/Supabase.
- **Sí:** gate en el proxy + check redundante en el layout — defensa en profundidad si el matcher se toca.
- **Sí:** helper en `utils/supabase/proxy.ts` (renombrado desde `middleware.ts`) y propagación de los headers anti-cache de `setAll` — revisión con Context7: la doc de Supabase ya usa el nombre `proxy.ts` para el helper y `@supabase/ssr` entrega `Cache-Control: private, no-cache…` solo con la primera escritura de cookies (si no se copia, un CDN podría cachear tokens de sesión).
- **Sí:** allowlist pública (`/login`, `/activate-account`) — cualquier ruta futura queda protegida por defecto.
- **Sí:** `?next=` para volver al origen, validado (`/` inicial, sin `//`, sin `\` ni whitespace) — evita open redirect; `redirect()` de Next no valida la URL (docs de `redirect.mdx` + guía draft mode), y los navegadores normalizan `\`→`/` o stripan tab/newline, así que `safeNext` los rechaza.
- **Sí:** autenticado en `/login` → `/` (sin honor de `next` en el proxy) — evita bucles de redirect; `/activate-account` sigue siendo accesible con sesión.
- **Sí:** función `public.current_user_profile()` (`security definer`, `search_path = ''`) — una policy que consulta su propia tabla daría "infinite recursion" en Postgres.
- **Sí:** SELECT propio + SELECT mismo daycare (`staff`/`admin`) + UPDATE propio; sin INSERT/DELETE — mínimo necesario; las escrituras quedan para service role/admin.
- **Sí:** `auth.uid()` y `current_user_profile()` envueltos en `(select …)` en los `using` — recomendación de la skill `supabase-postgres-best-practices` (evaluación una sola vez por query en vez de por fila); conducta idéntica.
- **Sí:** índice `users_daycare_id_idx` — la policy de daycare filtra por la FK `daycare_id`, que Postgres no indexa automáticamente (la PK `id` ya está indexada). En dos migraciones (`users_rls_policies` + `users_rls_policies_indexes`) para que el replay desde cero sea fiel al historial remoto.
- **Sí:** 2 usuarios extra + daycare `Otra Guardería` — sin ellos no se puede verificar la policy de daycare (hoy solo hay 1 usuario).
- **Sí:** tokens de `auth.users` en `''` dentro de los seeds + migración `fix_auth_seed_tokens` — descubierto en la verificación del paso 6: GoTrue lanza "Database error querying schema" con tokens NULL (scan de `confirmation_token` como string no anulable en `/token`).
- **Sí:** route group `(dashboard)` con el chrome en el layout — elimina la repetición en 3 páginas y centraliza el gate; las URLs no cambian.
- **Sí:** `active` del sidebar derivado de `usePathname` (`/kids*` → `/kids`).
- **Sí:** "Nueva publicación" vía `?create=1` + `searchParams` de server — la prop `onNewPost` queda muerta y se borra.
- **Sí:** saludo y autor del feed con perfil real; `GUARDERÍA · SALA SOLES` como texto de marca hardcodeado (igual que el logo del sidebar), porque la tabla `rooms` no existe todavía.
- **Sí:** errores de GoTrue traducidos al español solo para los conocidos; el resto, texto literal.
- **Sí:** borrar `data/mock/user.ts` al quedar sin usos (regla del repo: sin código muerto).
- **No:** selector de rol Personal/Familia en `/login` — eliminado en SPEC 03; `signInWithPassword` no distingue rol y el login navega siempre a `/`.
- **No:** signup, activación e invitaciones — requieren tablas que aún no existen.
- **No:** recuperación de contraseña — el template no define destino.
- **No:** policies en tablas distintas de `users` ni `avatar_url` en la UI.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Policy que consulta su misma tabla → infinite recursion en Postgres | Función `security definer` + verificación por simulación de rol autenticado (paso 3) |
| Cookies de sesión perdidas al redirigir desde el proxy | Copiar las cookies de `supabaseResponse` a la respuesta de redirect (patrón de la doc de Supabase) |
| Bucle layout ↔ `/login` si el usuario autenticado no tiene perfil en `public.users` | Fallback al email local part, sin redirect |
| `next` con open redirect | `safeNext`: solo paths que empiezan por `/`, no por `//` y sin `\` ni whitespace |
| Ruptura del flujo del modal al borrar `onNewPost` | Criterio explícito de "?create=1" verificado con Playwright |
| `searchParams` exige render dinámico o Suspense | Se lee en server component (page); si el build exige Suspense, se envuelve |
| Usuario sin fila en `public.users` (signup sin `daycare_id`, comportamiento diseñado en SPEC 08) | Fallback de nombre en el sidebar |
| Servidor dev olvidado tras las pruebas con Playwright | Regla de AGENTS.md: bajarlo en el paso 12 |

## Qué NO está en este spec

- Signup, activación real, invitaciones y `/family-feed`.
- Selector de rol (Personal/Familia) en el login.
- Recuperación de contraseña.
- Policies de RLS en tablas distintas de `users`.
- Datos reales de posts, niños y sala (siguen mocks); `avatar_url`.
- MFA, OAuth, `getClaims`, permisos o pantallas por rol.
