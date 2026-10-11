<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Reglas básicas
- Responder siempre en español.
- Una vez te de permiso para seguir con la siguiente fase harás commit descriptivo de los cambios realizados en la fase anterior.
- Una vez revisadas los archivos temp y las capturas de playwright se borraran y nunca se comitearán al igual que los archivos de la carpeta /.playwright-mcp.
- Al terminar las prubas con playwright debes bajar siempre el servidor o utilizar otro puerto que esté libre

## Reglas de código
- Usar código limpio, nombres, funciones, variables, etc en inglés.
- Si un mock (o cualquier código) deja de utilizarse, se borra; no se dejan archivos ni imports muertos.

## Supabase
- MCP `supabase` configurado en `~/.config/opencode/opencode.jsonc` (remoto, `project_ref=vbwacmmaqxgmwioipmvt`) con OAuth ya autenticado. Usarlo para consultar/esquema, logs, docs y edge functions.

### Paquetes de la app (interacción con la BD)
- `@supabase/supabase-js` y `@supabase/ssr` instalados en `package.json`. No instalar clientes alternativos.
- Config en `.env.local` (gitignored, nunca commitear):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Helpers en `utils/supabase/`:
  - `server.ts` → `createClient(cookieStore)` para Server Components / Server Actions (`await cookies()`).
  - `client.ts` → `createClient()` para Client Components.
  - `middleware.ts` → `updateSession(request)` refresca la sesión con `await supabase.auth.getUser()` antes de devolver la respuesta.
- `proxy.ts` en la raíz llama a `updateSession`. **Next.js 16**: el file convention `middleware.ts` está deprecado y renombrado a `proxy.ts` (export `proxy`), no crear `middleware.ts`.
- Reglas de uso:
  - Nunca usar `createClient` de `@supabase/supabase-js` a pelo: pasar siempre por los helpers para que las cookies de sesión se manejen bien.
  - No meter lógica entre la creación del client y `getUser()`/`getSession()` en el flujo de sesión.
  - Consultas de datos con RLS en mente: inspecciona políticas antes de asumir que una query falla por código.
- Skills de Supabase instaladas en el repo:
  - `.agents/skills/supabase/SKILL.md` — carga la skill `supabase` al trabajar con Supabase (DB, Auth, RLS, Storage, Edge Functions, Realtime, debugging).
  - `.agents/skills/supabase-postgres-best-practices/SKILL.md` — carga la skill `supabase-postgres-best-practices` antes de tocar cualquier cosa viva en Postgres (tablas, columnas, migraciones, índices, RLS, funciones, rendimiento).
- Antes de cambios de schema: inspecciona las tablas existentes primero y aplica migraciones con cuidado.

## Agentes
- `spec-verifier` (definido en `.opencode/agents/spec-verifier.md`, versionado en el repo): agente verificador de los "Acceptance criteria" de un spec.
  - Localiza el spec (`specs/`, `docs/`, `*.spec.md`…), revisa cada criterio, verifica en el código y en UI (Playwright) y en la doc actual (Context7) si se cumple.
  - Corrige lo que haga falta y solo marca `- [x]` los criterios realmente verificados; los no verificados quedan en `- [ ]` con el motivo.
  - Termina con un resumen: cumplidos, pendientes y correcciones realizadas.
  - Responde en español y usa nombres en inglés en el código.
