# EnSushi — Plataforma de pedidos online (V1 / MVP)

## Stack
- Next.js (App Router) + React, TypeScript estricto (interfaces exactas, sin `any`).
- Tailwind CSS v4 (sin tailwind.config: tokens y tema en `src/app/globals.css` con `@theme`). Dark mode por defecto, estética premium y limpia (marca de sushi high-end). Mobile-first.
- Zustand para el estado global del carrito.
- Componentes modulares; lógica de negocio separada de la UI.
- Carga en celular con mala señal: fotos con `next/image` (AVIF/WebP y anchos en `images` de `next.config.ts`; el `width`/`height` de una imagen fija es su tamaño en pantalla, no el del archivo). `useWarmMenuPhotos` baja las fotos de las otras pestañas cuando la página queda libre (no con ahorro de datos ni en 2G). M PLUS Rounded va con `next/font/local` (`src/app/fonts/`), no con `next/font/google`.
- Estructura con `src/`: todo el código vive en `src/` y el alias `@/*` apunta a `src/*`.

## Reglas del proyecto
- En `main` todo es client-side: no hay backend ni base de datos (el pedido sale por WhatsApp). El servidor de pedidos vive solo en la rama `app-pedidos` (ver "Pedidos por app").
- `src/data/menu.ts` es la única fuente de verdad del catálogo. No hardcodear productos ni precios en componentes.
- `src/config/business.ts` tiene el número de WhatsApp, la dirección del local, el costo de envío (`delivery.fee`), el horario (`schedule`) y las etiquetas de pago y entrega. Leer siempre de ahí.
- Alias/CVU NO van en el código (todo lo de `src/` termina en el JS público): el local los manda por WhatsApp al confirmar el pedido.
- `src/types/index.ts` define `Product` (unión discriminada `standard` | `sized`), `BuildItem` / `BuildBox` (Arma tu combo), `CartItem` (unión por `kind`: `product` | `box` | `extra`), `OrderDetails`, etc. Reutilizar estos tipos; no duplicarlos.
- Precios en ARS como enteros. Formatear con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })` en un helper compartido.
- Textos de la UI en español rioplatense.
- Después de cada paso: correr `npx tsc --noEmit` y `npm run lint`, y que pasen antes de seguir.

## Flujo de negocio
1. **Catálogo** por categorías, en pestañas (se ve una categoría por vez): Arma tu combo, Sushiburgers, Acompañamientos, Combos, Salsas & complementos (en ese orden). Una categoría con `hidden: true` no tiene pestaña ni aparece en "¿Le sumás algo?" (`MENU_CATEGORIES` / `isCategoryShown` en `menu.ts`); hoy Acompañamientos está oculta hasta tener precios y los sabores de las gyosas.
   - Los combos son productos `sized`: una tarjeta con selector de 15/25/40 piezas, cada tamaño con su precio. En el carrito cada tamaño es una línea distinta. Cada tamaño dice qué incluye (`ProductVariant.includes`): 15 → 1 salsa y 1 palito, 25 → 2 y 2, 40 (una caja chica de 15 y una grande de 25) → 3 y 3. Las salsas incluidas las elige el local; la web solo lo informa.
   - Salsas & complementos: Teriyaki ($ 1.500), Buenos Aires ($ 1.500), Salsa de soja ($ 500), Wasabi ($ 500) y Palitos ($ 200 el par extra; combos y cajas ya traen los suyos). Un producto con precio 0 se mostraría "Sin cargo" (`formatItemPrice`); hoy no hay ninguno.
   - Cada producto tiene `orderType`: `express` (se cocina en el momento, dentro del horario de apertura) o `preorder`. Hoy todos los productos son `express`; el corte de `BUSINESS.schedule.preorderCutoff` (19:30) se aplica por ítem en Arma tu combo (ver abajo).
   - Una categoría con `itemSheet: true` (hoy Sushiburgers) lista sus productos sin descripción ni etiquetas: el nombre (con ›) o la foto abren `ProductSheet` con la foto grande, lo que trae, la opción y el mismo control para sumar; el "+" de la fila suma directo.
   - Un producto `standard` puede tener `option` (ej. SushiBurger Salmón: Crudo / Cocido): mismo precio, elección obligatoria, cada valor es una línea distinta en el carrito y puede tener su propia foto.
   - Un producto con `availableDays` solo se muestra esos días; usar siempre `getMenuByCategory` (menú: los agotados, `available: false`, se listan desteñidos con "Agotado hoy") o `getProductsByCategory` (solo lo que se puede pedir).
   - **Arma tu combo** (reemplaza a la vieja Selección de autor; no hay combos de autor predefinidos): el cliente elige una **caja** (`BUILD_BOX_SIZES` en `src/data/menu.ts`) y la llena con ítems de `BUILD_ITEMS` en una de las combinaciones que entran en esa caja. El total es la suma de los ítems, cada paso con su precio (la caja no tiene precio propio).
     - **Caja chica** (hasta 15): 15 piezas de rolls; 10 piezas + hasta 3 nigiris; 6 a 8 nigiris solos.
     - **Caja grande** (hasta 30): 30 o 25 piezas de rolls; 20 piezas + hasta 6 nigiris; 15 piezas + 1 a 9 nigiris.
     - Cualquier otra combinación no se puede (los nigiris ocupan más lugar que las piezas de roll, por eso la lista es explícita). La chica incluye 1 salsa y 1 palito, la grande 2 y 2; el armado no lo muestra (lo agrega el local).
     - Rolls de autor, de a 5 piezas, $ 9.000 cada 5: New York, Sake, Midori, Hikaru, Sakana Maki, TunaSpicy (la lista puede crecer).
     - Nigiris, por unidad: salmón $ 2.000, langostino $ 1.500; los dos cuentan igual en las combinaciones.
     - Ficha de cada roll y nigiri: en la lista muestran solo nombre, flechita › y precio (sin descripción); tocar el nombre abre `BuildItemSheet` con lo que trae y el mismo control para sumar (el "+" de la fila suma directo, sin abrirla). Mientras no haya foto, la ficha dibuja el ítem con cada ingrediente señalado (`ItemDrawing`: corte del roll o nigiri de costado; datos en `BuildItem.drawing` de `menu.ts`, como las fotos de referencia de `inspiracion/Fotos sushi/`). Cuando el ítem tenga `imageUrl`, la ficha muestra la foto en lugar del dibujo: los dibujos se van a reemplazar por fotos.
     - Debajo de la caja elegida se listan sus combinaciones (`describeCombinations`). El "+" de un roll o nigiri se apaga si con un paso más ya no se llega a ninguna combinación (`canReachFill`, `src/lib/boxRules.ts`); la caja a la que ya no se llega con lo cargado queda apagada ("Para la caja chica, sacá piezas").
     - El botón de agregar está deshabilitado hasta que la caja es una combinación válida y dice lo más simple que falta (`getMissing`: "Faltan 10 piezas", "Falta 1 nigiri"). Si lo cargado ya entra en la otra caja, la barra ofrece "Así como está, entra en la caja chica".
     - Acompañamientos: tienen su propia pestaña, después de Sushiburgers, y no aparecen en el armado. Son ítems de `BUILD_ITEMS` (grupo `acompanamientos`) que se piden solos, sin caja: gyosas en 3 sabores (todavía sin nombre: "Sabor 1/2/3") de a 3 unidades; langostinos empanados, pollo tandoori y geishas de a 5 unidades. No tienen corte: se pueden pedir también después de las 19:30. Como rolls y nigiris sí cortan a las 19:30, pasado el corte no se puede armar una caja.
     - Corte por ítem: pasadas las 19:30 (`isPastPreorderCutoff`) los rolls y nigiris quedan desteñidos con el sello hueco "Hasta las 19:30" (visible sin hover; `title` como tooltip en desktop), los tamaños de caja se apagan y se avisa que se pueden sumar acompañamientos. Una caja a medio armar cuando llega el corte deja de mostrar su barra. Una caja agregada antes del corte se puede mandar igual. En el carrito, la caja es una línea con su contenido y un botón "Editar" (oculto pasado el corte) que la carga en la pestaña; al guardar, reemplaza la línea.
     - Código: `BoxBuilder` (UI; el borrador vive en `Shop`), `BUILD_BOX_SIZES` / `isBoxItem` en `src/data/menu.ts`, reglas en `src/lib/boxRules.ts`, `addBox` / `replaceBox` / `addExtra` en el store (las cajas guardadas con el formato viejo de 10–30 piezas se descartan al cargar). Las líneas del carrito son una unión (`kind`: `product` | `box` | `extra`).
2. **Carrito**: agregar/quitar ítems, ver total. En celular y tablet es un panel que se abre (`CartDrawer layout="sheet"`); desde `lg` (1024px) queda fijo a la derecha del menú (`layout="panel"`, `useMediaQuery(DESKTOP_QUERY)`). Las grillas del menú usan container queries (`@2xl`, `@max-[22rem]`), no breakpoints de pantalla. Mientras se toman pedidos, abajo de las líneas aparece "¿Le sumás algo?" con acompañamientos y salsas para agregar con un toque (`CartSuggestions`): una fila que se desliza con el dedo y, con mouse, flechas ‹ › que se apagan en cada punta. Combos con distintos tamaños, opciones o contenido de caja son líneas distintas (`lineId` estable: dos cajas iguales se juntan).
3. **Checkout**: Nombre, Entrega (Retiro en el local o Envío a domicilio), Método de pago (Efectivo o Transferencia/Mercado Pago).
   - **Solo pedidos para hoy.** No hay selector de día: debajo de entrega y pago va la línea fija "Para hoy · el horario lo coordinamos por WhatsApp". Los encargos para otro día se arreglan por WhatsApp y la web no los menciona.
   - Horario (`src/lib/schedule.ts` + `useScheduleStatus`, en la zona horaria del local): en un día cerrado o después del cierre (23:30) se deshabilita el botón de mandar y se avisa cuándo abre el local. En un día de apertura antes de las 17:00 se puede mandar, con un aviso de la hora de apertura. El corte de las 19:30 no bloquea el pedido: solo impide sumar rolls y nigiris de Arma tu combo. Cuando el local no toma pedidos (día cerrado o después del cierre), la web queda solo para ver el menú: sin "+" en las filas, Arma tu combo sin controles y con el aviso "Ahora no tomamos pedidos…", y en el carrito solo se puede sacar (no sumar, editar cajas ni continuar). Se decide con `useCanOrder()` (`isTakingOrders`); antes de conocer la hora del visitante, todo se ve habilitado.
   - **Hora simulada (solo desarrollo):** `?ahora=AAAA-MM-DDTHH:MM` en la URL (hora del local, ej. `/?ahora=2026-10-23T21:30`) hace que todo el horario use ese momento en lugar del reloj: banda de estado, avisos del carrito, bloqueo del checkout y productos con `availableDays`. Queda fija (no avanza) y se guarda en `sessionStorage`, así que se mantiene al navegar y al recargar en esa pestaña; `?ahora=` sin valor la borra. La banda muestra "Hora simulada". Con `NODE_ENV === 'production'` el parámetro se ignora siempre. Todo lo que dependa de "ahora" tiene que usar `getNow()` de `src/lib/schedule.ts`, nunca `new Date()`.
   - Envío a domicilio suma `BUSINESS.delivery.fee` al total (se muestra Subtotal / Descuento / Envío / Total).
   - **Descuentos** (`src/config/discounts.ts` + `src/lib/discounts.ts`). Nunca se suman: el pedido lleva el que más ahorra (`getBestDiscount`), y nunca descuentan el envío.
     - **Días especiales** (`SPECIAL_DAYS`, fechas puntuales `AAAA-MM-DD` en la hora del local + `percent`): ese % en todos los productos de Combos, no en Arma tu combo. El menú muestra el sello dorado "−15% hoy", el precio de antes tachado y el de hoy en cada tamaño; la banda dice "Hoy −15% en todos los Combos"; el carrito y el checkout, la línea "Descuento (15% en Combos)".
     - **Códigos** (`DISCOUNT_CODES`): los da el local; cada uno es % (`percent`) o monto fijo en pesos (`amount`), con `validFrom` / `validUntil` opcionales, y aplica a todo el pedido. Solo se guarda su SHA-256 (todo `src/` es JS público): se crean con `npm run codigo -- VERANO10 10% [AAAA-MM-DD]` o `-- BIENVENIDA 2000`, que los guarda directo en `discounts.ts` (si ya existe, lo actualiza), y se borran con `npm run codigo -- --borrar VERANO10`. Para que lleguen a la web publicada hay que commitear y deployar. En el checkout, "¿Tenés un código de descuento?" abre el campo arriba del total; aplicado queda con "Quitar" y se guarda en el borrador. Sin backend no hay usos únicos: el local ve el código en el mensaje y decide.
     - Dorado `kin` (`--color-kin`) solo para descuentos (sello y montos descontados); el bermellón sigue siendo solo "en tu pedido".
   - La dirección se pide solo si elige Envío a domicilio. Si elige Retiro, mostrar la dirección del local (`BUSINESS.pickup.address`).
   - Si elige Transferencia: NO mostrar Alias/CVU. Avisar que no transfiera todavía: el local confirma el pedido por WhatsApp y recién ahí le pasa el alias y el total; después de transferir manda el comprobante por el mismo chat. (Así se evita cobrar pedidos que no se pueden tomar.)
4. **Acción**: generar URL `wa.me` con el pedido.

## Pedidos por app (rama `app-pedidos`)
En lugar de WhatsApp, el pedido va a nuestro servidor y lo recibe la app de escritorio del local (`desktop/`, Electron), que confirma con horario aproximado o rechaza, abre WhatsApp con el mensaje e imprime la comanda (Epson TM-T20 por su driver de Windows). Todo detrás de `PEDIDOS_POR_APP=1` (servidor) y `NEXT_PUBLIC_PEDIDOS_POR_APP=1` (checkout); sin eso la web sigue con WhatsApp. `main` sigue desplegado en Vercel solo con WhatsApp.
- Servidor: `src/server/` (PostgreSQL con `DATABASE_URL`; PGlite en `.data/` en desarrollo), rutas en `src/app/api/` (`cuenta/*` ingreso por código de correo, `pedidos` del cliente, `local/*` de la app con token). El servidor rearma el carrito desde el menú (`restoreItems` de `src/lib/cartItems.ts`) y recalcula todo.
- Tipos compartidos con la app: `src/types/pedidos.ts` (sin imports).
- Guía de puesta en marcha (servidor, correo, ticketera): `docs/app-pedidos.md`.
- Las líneas del carrito sin store viven en `src/lib/cartItems.ts`; `useCartStore` las reexporta.

**Decisiones (2026-10-23, no volver a proponer otra cosa sin que lo pida):**
- Hosting propio: un servidor (VPS alcanza) con la web Next.js + PostgreSQL. Nada de Supabase, Firebase ni otros BaaS; nada de APIs pagas ("nada de apis ni cosas extrañas"). Vercel queda solo para `main` mientras tanto.
- Antispam del cliente: cuenta con código por correo (sin captcha). Solo hace falta una cuenta SMTP (dominio, Zoho, Brevo…), no un servidor de correo propio.
- Mensaje al cliente: la app abre WhatsApp con el texto listo (un clic, `wa.me`) + página de estado en la web. Sin WhatsApp Business API.
- Electron, una sola PC con Windows, ticketera Epson TM-T20 USB impresa por su driver de Windows (no ESC/POS crudo, salvo que el driver no alcance).
- Horarios aproximados ("es una cocina"): sin cupos por franja. La hora de cada pedido la pone quien maneja la app (a mano o con +15/+30/+45/+60): arranca vacía y no se puede confirmar sin ella; la app nunca la elige sola. Stock/agotados: a futuro.
- Pedidos que nadie responde: sin decidir ("lo veremos en el momento").
- Versión base solo funcional, sin diseño; el diseño de la app se hace después (`/impeccable shape`).

**Detalles técnicos:**
- Next 16 con `cacheComponents`: toda ruta GET de la API llama `await connection()` antes de leer nada (si no, se prerenderiza). `params` es una Promise (`RouteContext<'/api/...'>`).
- `src/server/db.ts`: `getDb()` (singleton en `globalThis`) con `query`, `exec` (varias sentencias, sin parámetros: lo usan las migraciones) y `transaction`. Migraciones en `src/server/schema.ts` con tabla `schema_version`: nunca se edita una que ya corrió, se agrega otra al final.
- PGlite (desarrollo) lo abre un solo proceso: para `npm run local-usuario` hay que parar `npm run dev`. `next.config.ts` tiene `serverExternalPackages: ["@electric-sql/pglite"]`; `.data/` no se versiona.
- Cliente: código de 6 dígitos (se guarda solo el hash, vence a los 10 min, 5 intentos, reenvío cada 60 s); cookie httpOnly `ensushi_sesion` de 60 días con el token guardado como SHA-256. Local: contraseñas con scrypt (`scrypt$sal$hash`), token Bearer de 14 días. Usuarios del local: `npm run local-usuario -- NOMBRE` (pide la contraseña oculta o la lee de `CLAVE`; si existe, la cambia).
- Límites en memoria por IP / cliente / usuario (`src/server/rateLimit.ts`); máximo 3 pedidos sin responder por cliente. Celulares argentinos normalizados a `549XXXXXXXXXX` (`src/lib/phone.ts`).
- Pedidos: estados `nuevo` → `confirmado` (con hora `HH:MM`) o `rechazado` (con motivo); `printed_at` al imprimir. La app lista las últimas 18 h.
- En desarrollo el checkout manda la hora simulada (`?ahora=`) y el servidor la respeta; en producción se ignora.
- Checkout con la bandera: `AccountSection` (correo → código → "Pedís como…"), campo Celular (se recuerda en `localStorage` `ensushi-celular`), botón "Enviar pedido · $X" → `/pedido/[id]` (`OrderStatus`, consulta cada 10 s). Llamadas del cliente en `src/lib/pedidosApp.ts`.
- App (`desktop/`): esbuild + TypeScript 7 + Electron 45, React en el renderer. `contextIsolation` + `sandbox`; el renderer solo habla con el proceso principal por `window.ensushi` (preload), que hace los pedidos con `net.fetch` y solo permite rutas `/api/local/`. Token cifrado con `safeStorage` (async) en `userData/config.json` junto con los Ajustes (servidor, ticketera, ancho 58/80 mm, imprimir al confirmar, alias, dirección de retiro). Consulta cada 5 s y pita con pedidos nuevos. Textos de mensajes y comanda en `desktop/src/shared/textos.ts` (horas en 24 h; comanda en negro forzado). Una sola instancia. `ENSUSHI_SIN_WHATSAPP=1` (desarrollo) solo escribe el link en la consola.
- `tsconfig.json` y ESLint de la raíz excluyen `desktop/` (tiene su propio `npm run typecheck`).
- `.env.development.local` (no se sube) tiene las dos banderas y el usuario de prueba del local; la contraseña nunca va al chat ni a git.

**Probado:** API completa con errores (código malo, día cerrado, celular inválido, producto inexistente, total recalculado), checkout en navegador de celular de punta a punta con la página de estado, la app real (ingreso, pedido nuevo, confirmar +45 min, mensaje armado) y la comanda vista a 80 mm. `tsc`, lint y `next build` pasan.

**Falta (app de pedidos):**
- [ ] Contratar el servidor y ponerlo en marcha con `docs/app-pedidos.md` (PostgreSQL real nunca se probó: solo PGlite).
- [ ] Cuenta SMTP real y probar que los códigos lleguen (no a spam).
- [ ] Probar la impresión real en la TM-T20 con su driver.
- [ ] Probar que WhatsApp se abra en la PC del local.
- [ ] Instalador `.exe` con actualización automática.
- [ ] Decidir qué pasa con los pedidos que nadie responde.
- [ ] Diseño de la app y del checkout con cuenta.
- [ ] Backups diarios (`pg_dump`) en el servidor.
- [ ] Idea: crear y gestionar los códigos de descuento desde la app del local (hoy se crean con `npm run codigo` y viven como SHA-256 en `src/config/discounts.ts`; con la app pasarían a la base y los validaría el servidor).

## Plan de implementación (un paso por vez)
- [x] **Paso 1** — Tipos (`src/types/index.ts`), menú (`src/data/menu.ts`), config (`src/config/business.ts`).
- [x] **Paso 2** — `src/store/useCartStore.ts`: `addItem`, `removeItem`, `clearCart`, total derivado (`cartTotal`). Manejar `quantity` y `lineId` (para custom combos: id + flavorIds ordenados). Considerar `persist` de Zustand para no perder el carrito al recargar.
- [x] **Paso 3** — UI: `src/components/ui` (Button, Input) y `src/components/shop` (ProductCard, CartDrawer, selector de Arma tu combo).
- [x] **Paso 4** — Checkout + `src/services/whatsappService.ts`.
- [x] **Paso 5** — Limpieza pre-lanzamiento: se borraron los SVG de ejemplo de `public/`, README propio, metadata Open Graph/Twitter e imagen para compartir generada (`src/app/opengraph-image.tsx`).
- [x] **Paso 6** — Dinámica de cocina: `orderType` (`express` | `preorder`), `BUSINESS.schedule`, catálogo con los productos reales, helper de horario (`src/lib/schedule.ts` + `useScheduleStatus`), badge de reserva (hoy "Rolls y nigiris hasta las 19:30") y avisos/bloqueo en carrito y checkout.
- [x] **Paso 7** — Precios reales de Combos (tipo `sized`, 15/24/40 piezas), Sushiburgers y Salsas; costo de envío; corte de autor a las 19:00; menú por pestañas.
- [x] **Paso 8** — Horario real (viernes a domingo de 17:00 a 23:30, feriados en `extraOpenDates`/`closedDates`), fotos en `public/images/menu/`, logo en el header y en la imagen para compartir, favicon e íconos.
- [x] **Paso 9** — Corte de `preorder` a las 20:00 y Arma tu combo pasa a `preorder`. SushiBurger Salmón con opción Crudo / Cocido (`StandardProduct.option`).
- [x] **Paso 9b** — Menú: Arma tu combo, Sushiburgers, Combos, Salsas & complementos. Se borran los combos de autor de ejemplo. Datos del armado cargados en `BUILD_ITEMS` / `BUILD_ITEM_GROUPS` (tipo `BuildItem`), todavía sin UI.
- [x] **Paso 10** — Arma tu combo con `BUILD_ITEMS`: selector de caja (10/15/20/25/30 piezas), filas por `BUILD_ITEM_GROUPS`, barra con total en vivo y "Faltan N piezas", acompañamientos aparte, corte por ítem a las 20:00, líneas de carrito `box` / `extra` con `lineId` estable y persistencia, "Editar" en el carrito y línea del mensaje de WhatsApp. Se borraron `custom-combo`, `ROLL_FLAVORS`, `ComboBuilder`, `ProductCard` y el aviso provisorio de las 20:00 en carrito y checkout.
- [x] **Paso 11** — Pulido del checkout (probado y aprobado; no se toca salvo pedido explícito): un solo aviso de transferencia sin alias/CVU, tarjeta "Por Mercado Pago.", "Te confirmamos por WhatsApp" debajo del botón, títulos a 24px en el celular, errores de campos en rosa frío (`--color-error`). `DESIGN.md` y su sidecar `.impeccable/design.json` al día. Los critiques de `.impeccable/critique/` son de antes de "Sello y sumi" y ya no aplican. El binario de impeccable (`.claude/skills/impeccable/scripts/bin/`) no se versiona: se descarga solo.

## Pendientes antes de salir a producción
- [ ] **Acompañamientos** (pestaña oculta con `hidden: true`): precios reales (hoy `PRICE_TBD`, $1.000: gyosas, langostinos, pollo y geishas), nombres de los 3 sabores de gyosas y cuántas geishas trae cada porción (hoy 5). Con eso se saca el `hidden`.
- [ ] **Arma tu combo**: fotos de los rolls para la ficha (`imageUrl` en cada roll de `BUILD_ITEMS`; reemplazan al dibujo del corte); confirmar la lista completa de rolls.
- [ ] **Descuentos**: cargar los días especiales y los códigos reales en `src/config/discounts.ts` (hoy vacíos).
- [ ] **Sushiburgers**: fotos de la versión cruda y la cocida del SushiBurger Salmón (`imageUrl` en cada valor de `option`). SushiBurger Atún y ciboulette: confirmar la descripción (se armó con la foto: atún, queso philly y ciboulette).
- [ ] **Feriados**: se cargan sobre la marcha en `extraOpenDates` / `closedDates`.
- [ ] **Fotos**: Combo TunaSalm (`hasPhoto: false` en `menu.ts` hasta tenerla), Salsas, Acompañamientos e ítems de Arma tu combo sin foto propia; se van a rehacer antes del deploy. Originales en `fotos/`.
- [ ] **Prueba de punta a punta en el celular**: todas las combinaciones de entrega y pago, en un día de apertura antes de las 17:00, abierto, después de las 19:30 y cerrado, con una caja chica y una grande, en un día especial y con un código, y chequear que el mensaje de WhatsApp coincida con la plantilla.
- [ ] **Deploy** (al final): Vercel + dominio; definir `NEXT_PUBLIC_SITE_URL` con la URL final.

## Ideas post-V1
- Zona de envío (costo por zona) y pedido mínimo.
- Marcar productos como agotados sin tocar el código.
- App de escritorio para el local (versión base en la rama `app-pedidos`).
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
- Combos con tamaño: `- 1x Combo Kanituna · 25 piezas ($X)`.
- Productos con opción: `- 1x SushiBurger Salmón · Crudo ($X)`.
- Si hay descuento, va `Descuento (VERANO10): -$X` (o `Descuento (15% en Combos): -$X`) después de los ítems, y el total lo resta.
- Si es Envío a domicilio, va la línea `Envío: $X` justo antes de `Total:` (y el total la incluye).
- Productos sin cargo (precio 0): `- 2x Nombre (sin cargo)`.
- Sin recordatorios internos para el personal en el mensaje: quien toma el pedido decide cómo seguir.
- En cada línea, el precio es el subtotal de esa línea (precio × cantidad).
- La línea `Dirección:` va solo cuando la entrega es Envío a domicilio.
- Arma tu combo (caja): el contenido entre paréntesis, en unidades y en el orden del menú: `- 1x Arma tu combo · Caja grande (New York 10, Midori 10, Nigiri de salmón 6) ($X)`.
- Acompañamientos de Arma tu combo: línea propia con la cantidad en unidades reales, no en porciones: `- 6x Gyosas · Sabor 1 ($X)`.
- Codificar con `encodeURIComponent` → `https://wa.me/${BUSINESS.whatsappNumber}?text=...`.
