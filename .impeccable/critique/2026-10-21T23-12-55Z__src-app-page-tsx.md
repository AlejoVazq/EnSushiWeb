---
target: página del menú (pestañas y tarjetas de producto)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:A:\\Cosas Alejo\\Proyectos\\EnSushiWeb\\sushi-app\\src\\app\\page.tsx"
target_fingerprint: "sha256:8d7d5f69a81bf35131cac77a3e565224e7aa52dea583ea15133a5e02c9ff9a74"
target_path: "A:\\Cosas Alejo\\Proyectos\\EnSushiWeb\\sushi-app\\src\\app\\page.tsx"
timestamp: 2026-10-21T23-12-55Z
slug: src-app-page-tsx
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador)

Run notes: ninguna de las dos evaluaciones pudo achicar la ventana de Chrome (está maximizada): se revisó en escritorio (~1568–1920px). El layout de celular y la barra flotante se juzgaron desde el código.

## Design Health Score

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | El menú no dice si el local está abierto, cerrado o pasado el corte de las 20:00; al agregar, solo cambia el botón por el stepper. |
| 2 | Lenguaje del mundo real | 3 | Piezas y precios claros; la descripción de Arma tu combo (rolls, nigiris, acompañamientos) no coincide con el selector provisorio de sabores. |
| 3 | Control y libertad | 2 | El tacho borra al instante sin deshacer; el tamaño elegido se pierde al cambiar de pestaña. |
| 4 | Consistencia | 3 | Sistema de acento muy prolijo; "Arma tu combo" vs "Armá tu combo", "(1 productos)". |
| 5 | Prevención de errores | 2 | El tacho cae donde estaba "Agregar": un doble toque agrega y borra. La pestaña por defecto es la de reserva, también después de las 20:00. |
| 6 | Reconocimiento | 2 | "1 en tu pedido" aparece bajo el tamaño seleccionado aunque el del carrito sea otro. |
| 7 | Flexibilidad y eficiencia | 2 | Combos es la tercera pestaña, debajo del hero; para comparar tamaños hay que tocar cada uno. |
| 8 | Estética y minimalismo | 3 | Sereno y contenido; placeholders y fotos repetidas restan. |
| 9 | Recuperación de errores | 1 | Sin deshacer; "¡Volvé mañana!" es falso cuando mañana el local está cerrado. |
| 10 | Ayuda | 2 | Horario, zona de envío y cómo funciona el pedido por WhatsApp aparecen recién en el checkout. |
| **Total** | | **22/40** | **Aceptable** |

## Design Specificity Verdict

**Evaluación LLM:** el sistema está pensado para EnSushi en la superficie (casi negro cálido, un solo salmón, nombres en Cormorant, fotos reales de las cajas, badge "hasta las 20:00"), pero la estructura es de plantilla de delivery: eyebrow + H1 serif + pestañas en pastilla + grilla de tarjetas con foto + "Agregar". Cambiando logo y titular, sirve para cualquier local. No aparece nada propio del negocio que ayude a pedir: horario de viernes a domingo, si hoy está abierto, retiro en el local (el titular dice "directo a tu casa" y deja afuera el retiro), ni qué significa 15/24/40 piezas.

**Scan determinístico:** CLI limpio (exit 0) con 1 aviso: `design-system-font-size`, contador de 11px en `src/components/shop/SiteHeader.tsx:30` (ya marcado como dudoso en DESIGN.md). En el navegador, 4 hallazgos: `unbalanced-heading` en el H1 del hero (`Shop.tsx:49`, medido en escritorio, sin `text-balance`), `hero-eyebrow-chip` en "Pedidos online", `low-contrast` 4.1:1 del pie de página en `subtle` (`Shop.tsx:64`) y `overused-font` Geist. Falso positivo: Geist (la dupla Cormorant + Geist es una decisión documentada). El detector coincide con la revisión en el contraste de `subtle`; agregó el titular desbalanceado y el eyebrow, que la revisión no había marcado. Fuera del detector, Next avisa que la foto LCP debería cargarse con prioridad.

**Overlays visuales:** quedaron visibles en la pestaña **[Human] EnSushi menú** de Chrome, a ancho de escritorio. Como el servidor de desarrollo ya se detuvo, la pestaña no se va a actualizar.

## Overall Impression

Es una base tranquila y bien construida (tokens disciplinados, pestañas accesibles, tamaño elegido en la misma tarjeta), pero no está armada alrededor del momento real: alguien con hambre, de noche, en el celular. La mayor oportunidad no es estética sino de estado: decir si hoy se puede pedir y llevar al cliente a Combos sin pasar por algo que a esa hora no puede pedir.

## What's Working

1. **El tamaño se elige dentro de la tarjeta** (`ProductCard.tsx:69-98`): radio segmentado y precio que cambia en el lugar. Elegir y agregar son dos toques, sin modal.
2. **La Única Luz funciona de noche:** lo que se toca es salmón y nada más compite. fg, muted y accent pasan AA sobre las superficies.
3. **Base accesible sólida:** pestañas WAI-ARIA con flechas (`CategoryNav.tsx:21-30`), nombres accesibles que incluyen el tamaño, `prefers-reduced-motion` y safe-area en la barra flotante.

## Priority Issues

**[P1] La pestaña por defecto es la de reserva anticipada.**
- **Por qué importa:** `Shop.tsx:28` abre en `CATEGORIES[0]` (Arma tu combo). Después de las 20:00, el pico de la noche, lo primero que se ve no se puede pedir para hoy, y Combos queda tercera, medio fuera de pantalla a 390px.
- **Fix:** elegir la pestaña inicial según el horario (Combos después del corte o con el local cerrado para hoy), sin cambiar el orden fijado en CLAUDE.md. O abrir siempre en Combos, si lo decidís.
- **Comando sugerido:** /impeccable harden

**[P1] Agregar → stepper invita a errores, y el contador habla del tamaño equivocado.**
- **Por qué importa:** `LineAction` (`ProductCard.tsx:30-51`) reemplaza el botón de 44px por un stepper de botones de 36px, y el tacho cae donde estaba "Agregar": un doble toque agrega y borra, sin deshacer. "N en tu pedido" (`:209-211`) suma todos los tamaños y se muestra bajo el que está seleccionado.
- **Fix:** mostrar la cantidad en el carrito sobre el chip de cada tamaño; que el menos del stepper en la tarjeta no borre (borrar es del carrito) o sumar un "Deshacer"; botones del stepper de 44px.
- **Comando sugerido:** /impeccable harden

**[P1] El menú no dice si hoy se puede pedir.**
- **Por qué importa:** hoy (miércoles) el local está cerrado y el menú no lo dice; el cliente se entera en el carrito. Choca con el principio "Avisar antes que bloquear".
- **Fix:** una línea de estado bajo el header o las pestañas, con `useScheduleStatus`: "Hoy cerrado · abrimos el viernes a las 17:00, podés encargar para ese día" / "Abierto hasta las 23:30" / "Arma tu combo para hoy: hasta las 20:00".
- **Comando sugerido:** /impeccable clarify

**[P2] Para comparar tamaños hay que tocar cada uno.**
- **Por qué importa:** 6 combos × 3 tamaños = 18 precios, y solo se ve uno por tarjeta; en el celular cada tarjeta mide ~470px.
- **Fix:** precio dentro de cada chip ("24 · $X") o una línea con los tres; chips de 44px de alto (hoy ~36px).
- **Comando sugerido:** /impeccable layout

**[P2] Al agregar se pierde el foco y el lector de pantalla no anuncia nada.**
- **Por qué importa:** el botón enfocado se desmonta (el foco cae a `<body>`) y el `aria-live` del stepper se monta ya con el contenido, así que no se anuncia.
- **Fix:** mover el foco al "+" del stepper y tener una región `aria-live` persistente a nivel página ("Agregaste Combo Kanituna · 24 piezas"), que también sirve de confirmación visual.
- **Comando sugerido:** /impeccable harden

## Persona Red Flags

**Casey (una mano, apurado):** el tacho aparece bajo el pulgar donde estaba "Agregar"; botones de 36px; las pestañas están arriba, lejos del pulgar; el tamaño elegido se pierde al volver de otra pestaña.

**Jordan (primera vez):** no sabe cuánto es 15/24/40 piezas ni que el pedido termina en WhatsApp (se dice una vez, en gris); ve dos tarjetas de Arma tu combo con la misma foto y una descripción que no coincide.

**Riley (estresa el flujo):** agrega 24, cambia a 15 y ve "1 en tu pedido" + "Agregar": ¿el de 15 está en el carrito?; "(1 productos)" en el botón del carrito; "¡Volvé mañana!" (`CategorySection.tsx:49`) cuando mañana está cerrado.

**Comensal de Arrecifes, sábado 22:00, con poca luz:** entra a una pestaña cuyo corte ya pasó; no ve "abierto hasta las 23:30"; nada le confirma que el envío llega a su zona; el placeholder del Combo TunaSalm parece una imagen rota en la oscuridad.

## Minor Observations

- Bordes de pestañas y chips inactivos (`line` sobre `canvas`) a ~1.4:1: de noche apenas se leen como controles.
- Las cifras de estilo antiguo de Cormorant hacen que "15 piezas" en títulos se vea en minúscula.
- En el celular el hero ocupa casi todo el primer viewport; "Salsas & complementos" queda cortada sin indicio de scroll horizontal.
- El degradado del placeholder usa hex escritos a mano (`ProductImage.tsx:13`), contra DESIGN.md.
- El logo está dentro de un `<p>`; no hay enlace visible a la dirección ni al WhatsApp del local.
- `selectCategory` solo hace scroll si el panel quedó arriba del viewport: desde el tope de la página, el contenido nuevo puede quedar bajo el pliegue en el celular.
- Next sugiere priorizar la carga de la foto LCP.

## Questions to Consider

- Si de noche lo que más se pide son combos predefinidos, ¿por qué lo primero que ve alguien con hambre es algo que después de las 20:00 no puede pedir?
- ¿El hero se gana sus ~400px en un celular a las 22:00, o la página debería abrir directo en "Abierto hasta las 23:30" y los combos?
- ¿Y si cada combo dijera para cuántas personas rinde cada tamaño, en vez de dejar la cuenta de piezas al cliente? (Requiere que el local confirme las porciones.)
