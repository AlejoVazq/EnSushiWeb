# EnSushi — Plataforma de pedidos online (V1 / MVP)

## Stack
- Next.js (App Router) + React, TypeScript estricto (interfaces exactas, sin `any`).
- Tailwind CSS v4 (sin tailwind.config: tokens y tema en `src/app/globals.css` con `@theme`). Dark mode por defecto, estética premium y limpia (marca de sushi high-end). Mobile-first.
- Zustand para el estado global del carrito.
- Componentes modulares; lógica de negocio separada de la UI.
- Estructura con `src/`: todo el código vive en `src/` y el alias `@/*` apunta a `src/*`.

## Reglas del proyecto
- Todo es client-side. No hay backend ni base de datos en V1.
- `src/data/menu.ts` es la única fuente de verdad del catálogo. No hardcodear productos ni precios en componentes.
- `src/config/business.ts` tiene el número de WhatsApp, la dirección del local, el costo de envío (`delivery.fee`), el horario (`schedule`) y las etiquetas de pago y entrega. Leer siempre de ahí.
- Alias/CVU NO van en el código (todo lo de `src/` termina en el JS público): el local los manda por WhatsApp al confirmar el pedido.
- `src/types/index.ts` define `Product` (unión discriminada `standard` | `sized` | `custom-combo`), `CartItem`, `OrderDetails`, etc. Reutilizar estos tipos; no duplicarlos.
- Precios en ARS como enteros. Formatear con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })` en un helper compartido.
- Textos de la UI en español rioplatense.
- Después de cada paso: correr `npx tsc --noEmit` y `npm run lint`, y que pasen antes de seguir.

## Flujo de negocio
1. **Catálogo** por categorías, en pestañas (se ve una categoría por vez): Combos, Selección de autor, Sushiburgers, Arma tu combo, Salsas.
   - Los combos son productos `sized`: una tarjeta con selector de 15/24/40 piezas, cada tamaño con su precio. En el carrito cada tamaño es una línea distinta.
   - Cada producto tiene `orderType`: `express` (se cocina en el momento, dentro del horario de apertura) o `preorder` (Selección de autor: combos premium que se encargan antes de `BUSINESS.schedule.preorderCutoff`).
   - Un producto con `availableDays` solo se muestra esos días; usar siempre `getProductsByCategory`.
   - "Arma tu combo": el usuario elige tamaño (producto `custom-combo`) y de 1 a `maxFlavors` sabores de `ROLL_FLAVORS`. Precio fijo por tamaño.
2. **Carrito**: agregar/quitar ítems, ver total. Combos con distintos tamaños o sabores son líneas distintas (`lineId`).
3. **Checkout**: Nombre, Entrega (Retiro en el local o Envío a domicilio), Método de pago (Efectivo o Transferencia/Mercado Pago).
   - Horario (`src/lib/schedule.ts`, en la zona horaria del local): si hay ítems `preorder` y ya pasó el corte, se bloquea el checkout. Si hay ítems `express` y el local está cerrado, solo se avisa la hora de apertura.
   - Envío a domicilio suma `BUSINESS.delivery.fee` al total (se muestra Subtotal / Envío / Total).
   - La dirección se pide solo si elige Envío a domicilio. Si elige Retiro, mostrar la dirección del local (`BUSINESS.pickup.address`).
   - Si elige Transferencia: NO mostrar Alias/CVU. Avisar que no transfiera todavía: el local confirma el pedido por WhatsApp y recién ahí le pasa el alias y el total; después de transferir manda el comprobante por el mismo chat. (Así se evita cobrar pedidos que no se pueden tomar.)
4. **Acción**: generar URL `wa.me` con el pedido.

## Plan de implementación (un paso por vez)
- [x] **Paso 1** — Tipos (`src/types/index.ts`), menú (`src/data/menu.ts`), config (`src/config/business.ts`).
- [x] **Paso 2** — `src/store/useCartStore.ts`: `addItem`, `removeItem`, `clearCart`, total derivado (`cartTotal`). Manejar `quantity` y `lineId` (para custom combos: id + flavorIds ordenados). Considerar `persist` de Zustand para no perder el carrito al recargar.
- [x] **Paso 3** — UI: `src/components/ui` (Button, Input) y `src/components/shop` (ProductCard, CartDrawer, selector de Arma tu combo).
- [x] **Paso 4** — Checkout + `src/services/whatsappService.ts`.
- [x] **Paso 5** — Limpieza pre-lanzamiento: se borraron los SVG de ejemplo de `public/`, README propio, metadata Open Graph/Twitter e imagen para compartir generada (`src/app/opengraph-image.tsx`).
- [x] **Paso 6** — Dinámica de cocina: `orderType` (`express` | `preorder`), `BUSINESS.schedule`, catálogo con los productos reales, helper de horario (`src/lib/schedule.ts` + `useScheduleStatus`), badge "Solo con reserva anticipada" y avisos/bloqueo en carrito y checkout.
- [x] **Paso 7** — Precios reales de Combos (tipo `sized`, 15/24/40 piezas), Sushiburgers y Salsas; costo de envío; corte de autor a las 19:00; menú por pestañas.

## Pendientes antes de salir a producción
- [ ] **Selección de autor**: "Nigiris Premium" y "Geishas de Salmón" son ejemplos (nombres y precios); definir los combos premium reales.
- [ ] **Arma tu combo**: precios, tamaños (hoy 15/30 piezas; ¿pasan a 15/24/40 como los combos?) y sabores de `ROLL_FLAVORS` siguen siendo de ejemplo.
- [ ] **Descripciones**: Sushiburgers y Salsas no tienen descripción (es opcional, pero conviene cargarla).
- [ ] **Horario**: confirmar 20:00–00:00 (el corte de autor ya está en 19:00). Hoy aplica todos los días: si el local cierra algún día, falta agregar los días de apertura a `BUSINESS.schedule`.
- [ ] **Fotos de productos**: `menu.ts` apunta a `/images/menu/*.jpg`, pero `public/images/menu/` no existe todavía (por ahora se ve el placeholder de `ProductImage`).
- [ ] **Ícono / logo**: `src/app/favicon.ico` sigue siendo el de Next. Cuando esté el logo: reemplazar el favicon (o agregar `src/app/icon.png` + `apple-icon.png`) y sumarlo a `opengraph-image.tsx`.
- [ ] **Datos del local**: confirmar el WhatsApp y la dirección de `src/config/business.ts` (¿agregar localidad?).
- [ ] **Prueba de punta a punta en el celular**: todas las combinaciones de entrega y pago, con un combo personalizado, y chequear que el mensaje de WhatsApp coincida con la plantilla.
- [ ] **Deploy**: Vercel + dominio; definir `NEXT_PUBLIC_SITE_URL` con la URL final.

## Ideas post-V1
- Zona de envío (costo por zona) y pedido mínimo.
- Marcar productos como agotados sin tocar el código.

## Plantilla del mensaje de WhatsApp (exacta)
```
¡Hola! Quiero hacer un pedido:
- 1x Sushibur de salmón ($X)
- 2x Combo 15 piezas ($X)
Total: $X
Nombre: [Nombre]
Entrega: [Retiro en el local / Envío a domicilio]
Dirección: [Dirección]
Pago: [Efectivo / Transferencia]
```
- Combos con tamaño: `- 1x Combo Kanituna · 24 piezas ($X)`.
- Si es Envío a domicilio, va la línea `Envío: $X` justo antes de `Total:` (y el total la incluye).
- Sin recordatorios internos para el personal en el mensaje: quien toma el pedido decide cómo seguir.
- En cada línea, el precio es el subtotal de esa línea (precio × cantidad).
- La línea `Dirección:` va solo cuando la entrega es Envío a domicilio.
- Para custom combos, agregar los sabores elegidos en la línea, ej: `- 1x Arma tu combo · 15 piezas (Philadelphia, Tempura) ($X)`.
- Codificar con `encodeURIComponent` → `https://wa.me/${BUSINESS.whatsappNumber}?text=...`.
