# Pedir sin registrarse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** que un invitado pueda pedir sin cuenta; los códigos de descuento quedan para registrados.

**Architecture:** el servidor acepta pedidos sin sesión (`orders.guest`), con trampa para robots; el checkout deja
de exigir la cuenta y abre `LoginSheet` solo para códigos o para "Ingresá"; la página de estado invita a
registrarse y asocia el pedido.

**Tech Stack:** Next 16, PostgreSQL/PGlite, React.

**Spec:** `docs/superpowers/specs/2026-11-17-pedir-sin-registro-design.md`

## Global Constraints
- Textos en español rioplatense. Sin la bandera `PEDIDOS_POR_APP` nada cambia.
- Migraciones: se agrega la 8 al final, nunca se edita una existente.
- `npx tsc --noEmit` y `npm run lint` pasan después de cada tarea.

## Review Focus
- Invitado con un código guardado en el borrador de antes: se quita solo al abrir el checkout (401 del servidor).
- Registrado que toca "Salir" con un código aplicado: el código se quita.
- Pedido manual (app) sigue siendo `manual` y no pita; el de invitado sí pita.
- Pedido de una cuenta no se ve sin su sesión aunque se tenga el link.
- Autocompletado del navegador no llena la trampa (`autoComplete="off"`, fuera de pantalla, `tabIndex=-1`).

---

### Task 1: Servidor
**Files:** `src/server/schema.ts`, `src/server/orders.ts`, `src/app/api/pedidos/route.ts`,
`src/app/api/pedidos/[id]/route.ts`, `src/app/api/pedidos/[id]/asociar/route.ts` (nuevo), `src/app/api/descuentos/route.ts`
- Migración 8: `ALTER TABLE orders ADD COLUMN guest boolean NOT NULL DEFAULT false;`
- `createOrderFromRequest(who: { customerId: string | null; email: string | null }, body)`; invitado:
  `body.website` no vacío → 400 "Pedido inválido."; `body.elapsedMs` número < 2000 → 429 "Esperá un momento y
  probá de nuevo."; código sin sesión → 401 "Los códigos de descuento son para clientes registrados. Quitalo
  para seguir."; pendientes: 3 por celular (`phone = $1 AND guest AND status = 'nuevo'`).
- `insertOrder(order, who & { guest?: boolean })`; `manual: customer_id === null && !guest`.
- `getOrderForViewer(customerId: string | null, orderId)`: `id = $1 AND (guest OR customer_id = $2)`.
- `linkGuestOrder(customerId, orderId): Promise<boolean>`: `UPDATE ... WHERE id AND guest AND customer_id IS NULL`.
- `POST /api/descuentos` sin sesión → 401 "Los códigos de descuento son para clientes registrados."
- Verificación: tsc, lint; probar con curl contra `npm run dev` (pedido invitado 201, trampa 400, rápido 429,
  código 401, estado por link 200, asociar).

### Task 2: Web
**Files:** `src/components/shop/Shop.tsx`, `src/components/checkout/{Checkout,AccountSection,LoginSheet,OrderStatus}.tsx`, `src/lib/pedidosApp.ts`
- `Shop`: "Continuar con el pedido" va directo a `/checkout`.
- `LoginSheet` prop `reason: 'cuenta' | 'codigo' | 'pedido'` (título e introducción; beneficios en la lista).
- `Checkout` maneja la cuenta (`getAccount`) y la `LoginSheet`; `AccountSection` solo muestra
  "¿Ya tenés cuenta? Ingresá" o "Pedís como … · Salir". `DiscountCodeField` sin cuenta abre la ventana y, al
  ingresar, se abre el campo. Trampa `website` + `elapsedMs` en `sendOrder`.
- `OrderStatus`: sin sesión, tarjeta "¿Querés códigos de descuento?" → `LoginSheet reason="pedido"` →
  `linkOrder(id)` → "Listo: el pedido quedó en tu cuenta."
- Verificación: capturas con Playwright del checkout de invitado, la ventana de código y la tarjeta.

### Task 3: Documentos, commit, push, deploy
- `CLAUDE.md`, `docs/app-pedidos.md`, Privacidad.
- Commit, push `app-pedidos`, deploy al VPS (migración 8 corre sola al arrancar).
