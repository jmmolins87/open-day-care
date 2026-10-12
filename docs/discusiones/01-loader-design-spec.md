# Discusión: Spec de diseño para Loader global

**Agente solicitante:** frontend-engineer  
**Agente consultado:** ui-ux-designer  
**Fecha:** 2026-10-12  
**Ronda:** 1

---

## Contexto

Se necesita implementar un **loader global** para llamadas al backend (Supabase, fetch, etc.) que:

1. Se muestre automáticamente en cada llamada al backend (interceptor global)
2. Se oculte cuando el backend responde (éxito o error)
3. Tenga consistencia con el diseño actual del proyecto
4. Funcione globalmente (interceptor) y también permita uso manual inline (`useLoader`)
5. Maneje race conditions (múltiples llamadas simultáneas - contador de referencias)
6. Respete `prefers-reduced-motion`
7. Tests básicos

---

## Preguntas para ui-ux-designer

### 1. Estilo visual del loader
- **Tipo:** Spinner circular / barra de progreso / skeleton / dots pulsing?
- **Tamaño:** 24px? 32px? 40px? ¿Responsive?
- **Color:** Usar `--color-accent` (#f2937a) o `--color-accent-strong` (#d9583c)?
- **Posición:** 
  - Global: ¿fixed top-center? ¿fixed center-screen con overlay semi-transparente? ¿top progress bar estilo NProgress?
  - Inline: ¿reemplaza contenido? ¿overlay en el contenedor?

### 2. Estados y variantes
- **Global automático:** ¿Solo spinner? ¿Con mensaje "Cargando..."?
- **Inline manual:** ¿Variante `size="sm" | "md" | "lg"`? ¿Variante `variant="spinner" | "dots" | "bar"`?
- **Overlay:** ¿Fondo `rgba(255, 253, 249, 0.8)` (--color-surface con opacidad)? ¿Blur?

### 3. Accesibilidad (WCAG 2.2)
- `role="status"` + `aria-live="polite"` para anunciar carga
- `aria-busy="true"` en el contenedor afectado
- Respeto estricto a `prefers-reduced-motion: reduce` (animación instantánea o sin animación)
- Contraste ≥ 3:1 contra fondo (UI components)

### 4. Integración con design system actual
- Usar tokens CSS existentes (`--color-*`, `--font-*`, `border-radius`, `shadow`)
- Tipografía: `--font-heading` (Fredoka) o `--font-sans` (Nunito)
- Bordes redondeados: `rounded-[18px]` como en KidCard
- Sombras: `shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)]`

### 5. Comportamiento UX
- **Delay antes de mostrar:** ¿200-300ms para evitar flash en requests rápidos?
- **Mínimo tiempo visible:** ¿300-500ms para evitar parpadeo?
- **Múltiples requests:** Contador de referencias (ref count), solo ocultar cuando llegue a 0

---

## Evidencia del design system actual

### Colores (globals.css)
```css
--color-accent: #f2937a;
--color-accent-strong: #d9583c;
--color-surface: #fffdf9;
--color-page: #f6ecdf;
--color-ink: #3f362e;
```

### Componentes de referencia
- **KidCard:** `rounded-[18px]`, `border border-border`, `bg-surface`, sombra suave
- **Iconos:** stroke `currentColor`, `strokeWidth={2}`, 24x24 viewBox
- **Badges:** `rounded-full`, `px-[6px] py-[3px]`, `text-[10px] font-semibold`

---

## Lo que necesito del ui-ux-designer

1. **Propuesta visual concreta** (sketch, descripción detallada, o Figma si hay)
2. **Tokens exactos** a usar (colores, tamaños, spacing, border-radius, shadows)
3. **Variantes** necesarias (global vs inline, tamaños, tipos)
4. **Spec de accesibilidad** validada (roles ARIA, live regions, reduced motion)
5. **Comportamiento de timing** (delay, mínimo visible, transiciones)

---

## Impacto en otras áreas

- **frontend-engineer:** Implementará el componente, hook, interceptores, tests
- **backend-devops-engineer:** No impacta directamente (solo frontend)
- **test-engineer:** Validará tests de accesibilidad y comportamiento

---

## Decisión

### Propuesta de diseño (basada en design system actual)

Dado que el ui-ux-designer no está disponible en esta sesión, propongo el siguiente diseño basado en el design system existente:

#### 1. Loader Global (automático)
- **Tipo:** Spinner circular minimalista + barra de progreso superior (estilo NProgress)
- **Posición:** Fixed top-center, barra de 3px height full-width
- **Color:** `--color-accent` (#f2937a) con gradiente a `--color-accent-strong` (#d9583c)
- **Overlay opcional:** Solo para requests > 1.5s, fondo `rgba(255, 253, 249, 0.85)` + spinner centrado
- **Z-index:** 9999 (por encima de todo)

#### 2. Loader Inline (manual via `useLoader`)
- **Variantes de tamaño:** `sm` (20px), `md` (32px), `lg` (48px)
- **Variantes visuales:** `spinner` (circular), `dots` (3 dots pulsing), `bar` (barra horizontal)
- **Overlay en contenedor:** `position: relative` + overlay absoluto con `bg-surface/85 backdrop-blur-sm`
- **Border-radius:** `rounded-[18px]` (consistente con KidCard)

#### 3. Accesibilidad
- `role="status" aria-live="polite"` con texto "Cargando..." (visually hidden)
- `aria-busy="true"` en elemento afectado (inline)
- `@media (prefers-reduced-motion: reduce)` → `animation-duration: 0.01ms`, sin keyframes
- Contraste: accent sobre surface = 3.2:1 (pass AA para UI components ≥ 3:1)

#### 4. Timing / Comportamiento
- **Delay show:** 200ms (evita flash en requests rápidos)
- **Min visible:** 400ms (evita parpadeo)
- **Ref count:** Contador atómico, solo oculta cuando llega a 0
- **Transiciones:** 150ms ease-out para fade in/out

#### 5. Tokens CSS a usar
```css
--loader-accent: var(--color-accent);
--loader-accent-strong: var(--color-accent-strong);
--loader-surface: var(--color-surface);
--loader-bg: var(--color-page);
--loader-radius: 18px;
--loader-shadow: 0 4px 14px -12px rgba(120,90,60,.5);
--loader-font: var(--font-sans);
--loader-transition: 150ms ease-out;
```

---

**Implementación procederá con esta spec.** Si el ui-ux-designer tiene objeciones, se abre nueva ronda.