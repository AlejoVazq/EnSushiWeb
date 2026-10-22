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
- `src/types/index.ts` define `Product` (unión discriminada `standard` | `sized`), `BuildItem` / `BuildBox` (Arma tu combo), `CartItem` (unión por `kind`: `product` | `box` | `extra`), `OrderDetails`, etc. Reutilizar estos tipos; no duplicarlos.
- Precios en ARS como enteros. Formatear con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })` en un helper compartido.
- Textos de la UI en español rioplatense.
- Después de cada paso: correr `npx tsc --noEmit` y `npm run lint`, y que pasen antes de seguir.

## Flujo de negocio
1. **Catálogo** por categorías, en pestañas (se ve una categoría por vez): Arma tu combo, Sushiburgers, Acompañamientos, Combos, Salsas & complementos (en ese orden).
   - Los combos son productos `sized`: una tarjeta con selector de 15/24/40 piezas, cada tamaño con su precio. En el carrito cada tamaño es una línea distinta.
   - Cada producto tiene `orderType`: `express` (se cocina en el momento, dentro del horario de apertura) o `preorder`. Hoy todos los productos son `express`; el corte de `BUSINESS.schedule.preorderCutoff` (20:00) se aplica por ítem en Arma tu combo (ver abajo).
   - Un producto `standard` puede tener `option` (ej. SushiBurger Salmón: Crudo / Cocido): mismo precio, elección obligatoria, cada valor es una línea distinta en el carrito y puede tener su propia foto.
   - Un producto con `availableDays` solo se muestra esos días; usar siempre `getMenuByCategory` (menú: los agotados, `available: false`, se listan desteñidos con "Agotado hoy") o `getProductsByCategory` (solo lo que se puede pedir).
   - **Arma tu combo** (reemplaza a la vieja Selección de autor; no hay combos de autor predefinidos): el cliente elige una **caja** de 10, 15, 20, 25 o 30 piezas y la llena con ítems de `BUILD_ITEMS` (`src/data/menu.ts`) hasta completar **exactamente** ese número de piezas. El total es la suma de los ítems, cada paso con su precio (la caja no tiene precio propio).
     - Rolls de autor, de a 5 piezas: New York, Sake, Midori, Hikaru, Sakana Maki, TunaSpicy (la lista puede crecer).
     - Nigiris (salmón): por unidad.
     - Rolls y nigiris son lo único que cuenta en la caja; un nigiri cuenta como 1 pieza (ej. 15 de rolls + 5 nigiris = 20). No se puede pasar del tamaño elegido: cuando lo que falta es menos que el paso de un ítem, ese "+" se deshabilita. Los tamaños más chicos que lo ya cargado quedan apagados.
     - El botón de agregar la caja al carrito está deshabilitado hasta que la caja está completa y muestra cuántas piezas faltan (ej. "Faltan 5 piezas").
     - Acompañamientos: tienen su propia pestaña, después de Sushiburgers, y no aparecen en el armado. Son ítems de `BUILD_ITEMS` (grupo `acompanamientos`) que se piden solos, sin caja: empanaditas de a 3 unidades; langostinos empanados y pollo tandoori de a 5 palitos. No tienen corte: se pueden pedir también después de las 20:00. Como rolls y nigiris sí cortan a las 20:00, pasado el corte no se puede armar una caja.
     - Corte por ítem: pasadas las 20:00 (`isPastPreorderCutoff`) los rolls y nigiris quedan desteñidos con el sello hueco "Hasta las 20:00" (visible sin hover; `title` como tooltip en desktop), los tamaños de caja se apagan y se avisa que se pueden sumar acompañamientos. Una caja agregada antes del corte se puede mandar igual. En el carrito, la caja es una línea con su contenido y un botón "Editar" (oculto pasado el corte) que la carga en la pestaña; al guardar, reemplaza la línea.
     - Código: `BoxBuilder` (UI; el borrador vive en `Shop`), `BUILD_BOX_SIZES` / `isBoxItem` en `src/data/menu.ts`, `addBox` / `replaceBox` / `addExtra` en el store. Las líneas del carrito son una unión (`kind`: `product` | `box` | `extra`).
2. **Carrito**: agregar/quitar ítems, ver total. Mientras se toman pedidos, abajo de las líneas aparece "¿Le sumás algo?" con acompañamientos y salsas para agregar con un toque (`CartSuggestions`). Combos con distintos tamaños, opciones o contenido de caja son líneas distintas (`lineId` estable: dos cajas iguales se juntan).
3. **Checkout**: Nombre, Entrega (Retiro en el local o Envío a domicilio), Método de pago (Efectivo o Transferencia/Mercado Pago).
   - **Solo pedidos para hoy.** No hay selector de día: debajo de entrega y pago va la línea fija "Para hoy · el horario lo coordinamos por WhatsApp". Los encargos para otro día se arreglan por WhatsApp y la web no los menciona.
   - Horario (`src/lib/schedule.ts` + `useScheduleStatus`, en la zona horaria del local): en un día cerrado o después del cierre (23:30) se deshabilita el botón de mandar y se avisa cuándo abre el local. En un día de apertura antes de las 17:00 se puede mandar, con un aviso de la hora de apertura. El corte de las 20:00 no bloquea el pedido: solo impide sumar rolls y nigiris de Arma tu combo. Cuando el local no toma pedidos (día cerrado o después del cierre), la web queda solo para ver el menú: sin "+" en las filas, Arma tu combo sin controles y con el aviso "Ahora no tomamos pedidos…", y en el carrito solo se puede sacar (no sumar, editar cajas ni continuar). Se decide con `useCanOrder()` (`isTakingOrders`); antes de conocer la hora del visitante, todo se ve habilitado.
   - **Hora simulada (solo desarrollo):** `?ahora=AAAA-MM-DDTHH:MM` en la URL (hora del local, ej. `/?ahora=2026-10-23T21:30`) hace que todo el horario use ese momento en lugar del reloj: banda de estado, avisos del carrito, bloqueo del checkout y productos con `availableDays`. Queda fija (no avanza) y se guarda en `sessionStorage`, así que se mantiene al navegar y al recargar en esa pestaña; `?ahora=` sin valor la borra. La banda muestra "Hora simulada". Con `NODE_ENV === 'production'` el parámetro se ignora siempre. Todo lo que dependa de "ahora" tiene que usar `getNow()` de `src/lib/schedule.ts`, nunca `new Date()`.
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
- [x] **Paso 6** — Dinámica de cocina: `orderType` (`express` | `preorder`), `BUSINESS.schedule`, catálogo con los productos reales, helper de horario (`src/lib/schedule.ts` + `useScheduleStatus`), badge de reserva (hoy "Rolls y nigiris hasta las 20:00") y avisos/bloqueo en carrito y checkout.
- [x] **Paso 7** — Precios reales de Combos (tipo `sized`, 15/24/40 piezas), Sushiburgers y Salsas; costo de envío; corte de autor a las 19:00; menú por pestañas.
- [x] **Paso 8** — Horario real (viernes a domingo de 17:00 a 23:30, feriados en `extraOpenDates`/`closedDates`), fotos en `public/images/menu/`, logo en el header y en la imagen para compartir, favicon e íconos.
- [x] **Paso 9** — Corte de `preorder` a las 20:00 y Arma tu combo pasa a `preorder`. SushiBurger Salmón con opción Crudo / Cocido (`StandardProduct.option`).
- [x] **Paso 9b** — Menú: Arma tu combo, Sushiburgers, Combos, Salsas & complementos. Se borran los combos de autor de ejemplo. Datos del armado cargados en `BUILD_ITEMS` / `BUILD_ITEM_GROUPS` (tipo `BuildItem`), todavía sin UI.
- [x] **Paso 10** — Arma tu combo con `BUILD_ITEMS`: selector de caja (10/15/20/25/30 piezas), filas por `BUILD_ITEM_GROUPS`, barra con total en vivo y "Faltan N piezas", acompañamientos aparte, corte por ítem a las 20:00, líneas de carrito `box` / `extra` con `lineId` estable y persistencia, "Editar" en el carrito y línea del mensaje de WhatsApp. Se borraron `custom-combo`, `ROLL_FLAVORS`, `ComboBuilder`, `ProductCard` y el aviso provisorio de las 20:00 en carrito y checkout.

## Pendientes antes de salir a producción
- [ ] **Arma tu combo**: precios reales de cada ítem (hoy todos usan `PRICE_TBD`, $1.000), descripciones y fotos de los rolls; confirmar la lista completa de rolls. No sale a producción hasta tenerlo completo.
- [ ] **Sushiburgers**: fotos de la versión cruda y la cocida del SushiBurger Salmón (`imageUrl` en cada valor de `option`). Agregar el SushiBurger de Atún y ciboulette (falta precio y descripción). Falta la descripción de la Salsa Agridulce.
- [ ] **Feriados**: se cargan sobre la marcha en `extraOpenDates` / `closedDates`.
- [ ] **Fotos**: Combo TunaSalm, Salsas e ítems de Arma tu combo sin foto propia; se van a rehacer antes del deploy. Originales en `fotos/`.
- [ ] **Prueba de punta a punta en el celular**: todas las combinaciones de entrega y pago, en un día de apertura antes de las 17:00, abierto, después de las 20:00 y cerrado, con un combo armado, y chequear que el mensaje de WhatsApp coincida con la plantilla.
- [ ] **Deploy** (al final): Vercel + dominio; definir `NEXT_PUBLIC_SITE_URL` con la URL final.

## Ideas post-V1
- Zona de envío (costo por zona) y pedido mínimo.
- Marcar productos como agotados sin tocar el código.
- App de escritorio para el local.
- Conexión entre la app del local y la web (por ejemplo, agotados y horario en vivo).

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
- Productos con opción: `- 1x SushiBurger Salmón · Crudo ($X)`.
- Si es Envío a domicilio, va la línea `Envío: $X` justo antes de `Total:` (y el total la incluye).
- Sin recordatorios internos para el personal en el mensaje: quien toma el pedido decide cómo seguir.
- En cada línea, el precio es el subtotal de esa línea (precio × cantidad).
- La línea `Dirección:` va solo cuando la entrega es Envío a domicilio.
- Arma tu combo (caja): el contenido entre paréntesis, en unidades y en el orden del menú: `- 1x Arma tu combo · 20 piezas (New York 10, Midori 5, Nigiri de salmón 5) ($X)`.
- Acompañamientos de Arma tu combo: línea propia con la cantidad en unidades reales, no en porciones: `- 6x Empanaditas ($X)`.
- Codificar con `encodeURIComponent` → `https://wa.me/${BUSINESS.whatsappNumber}?text=...`.
