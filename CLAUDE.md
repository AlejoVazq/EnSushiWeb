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
1. **Catálogo** por categorías, en pestañas (se ve una categoría por vez): Arma tu combo, Sushiburgers, Combos, Salsas & complementos (en ese orden).
   - Los combos son productos `sized`: una tarjeta con selector de 15/24/40 piezas, cada tamaño con su precio. En el carrito cada tamaño es una línea distinta.
   - Cada producto tiene `orderType`: `express` (se cocina en el momento, dentro del horario de apertura) o `preorder` (Arma tu combo: para el mismo día se piden hasta `BUSINESS.schedule.preorderCutoff`, 20:00; después solo se pueden pedir los combos predefinidos o encargar para otro día).
   - Un producto `standard` puede tener `option` (ej. SushiBurger Salmón: Crudo / Cocido): mismo precio, elección obligatoria, cada valor es una línea distinta en el carrito y puede tener su propia foto.
   - Un producto con `availableDays` solo se muestra esos días; usar siempre `getProductsByCategory`.
   - **Arma tu combo** (reemplaza a la vieja Selección de autor; no hay combos de autor predefinidos): el cliente arma su combo desde 0, sin mínimo ni máximo, sumando ítems de `BUILD_ITEMS` (`src/data/menu.ts`) en pasos fijos, cada paso con su precio; el total es la suma.
     - Rolls de autor, de a 5 piezas: New York, Sake, Midori, Hikaru, Sakana Maki, TunaSpicy (la lista puede crecer).
     - Nigiris (salmón): por unidad.
     - Acompañamientos: empanaditas de a 3 unidades; langostinos empanados y pollo tandoori de a 5 palitos.
     - Hoy, provisorio hasta el Paso 10: la pestaña muestra el viejo selector (producto `custom-combo`: tamaño + sabores de `ROLL_FLAVORS`, precio fijo). En el Paso 10 se reemplaza por el armado con `BUILD_ITEMS` y se borran `custom-combo`, `ROLL_FLAVORS` y `ComboBuilder` si ya no hacen falta.
2. **Carrito**: agregar/quitar ítems, ver total. Combos con distintos tamaños o sabores son líneas distintas (`lineId`).
3. **Checkout**: Nombre, Entrega (Retiro en el local o Envío a domicilio), Método de pago (Efectivo o Transferencia/Mercado Pago).
   - **¿Para cuándo?**: el cliente elige uno de los próximos días de apertura (14 días; hoy aparece hasta la hora de cierre). Se puede encargar con anticipación cualquier producto.
   - Horario (`src/lib/schedule.ts`, en la zona horaria del local): si el pedido es para hoy, tiene ítems `preorder` y ya pasó el corte, se bloquea el checkout. Si es para hoy y el local todavía no abrió, solo se avisa la hora de apertura. En el carrito no se bloquea nada, solo se avisa.
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
- [x] **Paso 8** — Horario real (viernes a domingo de 17:00 a 23:30, feriados en `extraOpenDates`/`closedDates`), pedidos con anticipación ("¿Para cuándo?" en el checkout y `Para:` en el mensaje), fotos en `public/images/menu/`, logo en el header y en la imagen para compartir, favicon e íconos.
- [x] **Paso 9** — Corte de `preorder` a las 20:00 y Arma tu combo pasa a `preorder`. SushiBurger Salmón con opción Crudo / Cocido (`StandardProduct.option`).
- [x] **Paso 9b** — Menú: Arma tu combo, Sushiburgers, Combos, Salsas & complementos. Se borran los combos de autor de ejemplo. Datos del armado cargados en `BUILD_ITEMS` / `BUILD_ITEM_GROUPS` (tipo `BuildItem`), todavía sin UI.
- [ ] **Paso 10** — UI del armado de combos con `BUILD_ITEMS` (stepper por ítem, agrupado por `BUILD_ITEM_GROUPS`, total en vivo), carrito/`lineId`, persistencia y mensaje de WhatsApp. Se hace con una skill; hay imágenes de referencia de otro sitio. Es `preorder` (corte 20:00).

## Pendientes antes de salir a producción
- [ ] **Arma tu combo**: precios reales de cada ítem (hoy todos usan `PRICE_TBD`), descripciones y fotos de los rolls; confirmar la lista completa de rolls. Definir cómo va en el mensaje de WhatsApp.
- [ ] **Sushiburgers**: fotos de la versión cruda y la cocida del SushiBurger Salmón (`imageUrl` en cada valor de `option`). Agregar el SushiBurger de Atún y ciboulette (falta precio y descripción). Falta la descripción de la Salsa Agridulce.
- [ ] **Feriados**: se cargan sobre la marcha en `extraOpenDates` / `closedDates`.
- [ ] **Fotos**: Combo TunaSalm, Salsas e ítems de Arma tu combo sin foto propia; se van a rehacer antes del deploy. Originales en `fotos/`.
- [ ] **Prueba de punta a punta en el celular**: todas las combinaciones de entrega y pago, para hoy y para otro día, con un combo armado, y chequear que el mensaje de WhatsApp coincida con la plantilla.
- [ ] **Deploy** (al final): Vercel + dominio; definir `NEXT_PUBLIC_SITE_URL` con la URL final.

## Ideas post-V1
- Zona de envío (costo por zona) y pedido mínimo.
- Marcar productos como agotados sin tocar el código.

## Plantilla del mensaje de WhatsApp (exacta)
```
¡Hola! Quiero hacer un pedido:
- 1x Sushibur de salmón ($X)
- 2x Combo 15 piezas ($X)
Total: $X
Para: [Sábado 24/10]
Nombre: [Nombre]
Entrega: [Retiro en el local / Envío a domicilio]
Dirección: [Dirección]
Pago: [Efectivo / Transferencia]
```
- Combos con tamaño: `- 1x Combo Kanituna · 24 piezas ($X)`.
- Productos con opción: `- 1x SushiBurger Salmón · Crudo ($X)`.
- Si es Envío a domicilio, va la línea `Envío: $X` justo antes de `Total:` (y el total la incluye).
- Sin recordatorios internos para el personal en el mensaje: quien toma el pedido decide cómo seguir.
- En cada línea, el precio es el subtotal de esa línea (precio × cantidad).
- La línea `Dirección:` va solo cuando la entrega es Envío a domicilio.
- Para custom combos, agregar los sabores elegidos en la línea, ej: `- 1x Arma tu combo · 15 piezas (Philadelphia, Tempura) ($X)` (provisorio hasta el Paso 10).
- Codificar con `encodeURIComponent` → `https://wa.me/${BUSINESS.whatsappNumber}?text=...`.
