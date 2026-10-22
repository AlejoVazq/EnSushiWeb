---
target: carrito (CartDrawer)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:A:\\Cosas Alejo\\Proyectos\\EnSushiWeb\\sushi-app\\src\\components\\shop\\CartDrawer.tsx"
target_fingerprint: "sha256:0c9bf51108350de846b66c6060e052176945d9b6d75dd9f72c3b8548692d2619"
target_path: "A:\\Cosas Alejo\\Proyectos\\EnSushiWeb\\sushi-app\\src\\components\\shop\\CartDrawer.tsx"
timestamp: 2026-10-21T23-22-25Z
slug: src-components-shop-cartdrawer-tsx
closed: true
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador)

Run notes: A emuló el celular con un iframe de 390×720 (Chrome sigue sin achicarse) y revisó también a 1440px; B corrió a 1920px. Las dos compartieron el localStorage del sitio mientras corrían; se dejó el carrito vacío al final.

## Design Health Score

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | Total y subtotales en vivo; al borrar una línea no se anuncia nada (el `aria-live` se desmonta con la línea). |
| 2 | Lenguaje del mundo real | 3 | Las líneas coinciden con el mensaje de WhatsApp; "Total" no es el total si después elige envío. |
| 3 | Control y libertad | 2 | Sin deshacer después del tacho ni de "Sí, vaciar". |
| 4 | Consistencia | 3 | Sigue el sistema; el botón de cerrar usa el anillo de foco blanco del navegador; el aviso dice "combos armados" en vez de "Arma tu combo". |
| 5 | Prevención de errores | 2 | El tacho reemplaza al menos bajo el mismo pulgar; no avisa que el envío suma $3.000. |
| 6 | Reconocimiento | 2 | Sin fotos en las líneas, aunque el producto es el protagonista (PRODUCT.md). |
| 7 | Flexibilidad y eficiencia | 3 | Stepper en línea y CTA directo; no se puede volver de una línea al producto para cambiar tamaño u opción. |
| 8 | Estética y minimalismo | 3 | Tranquilo; la línea "c/u" en `subtle` suma ruido y no llega a AA. |
| 9 | Recuperación de errores | 2 | El foco cae a `<body>` al borrar; las líneas que desaparecen al rehidratar lo hacen en silencio. |
| 10 | Ayuda | 2 | No dice qué sigue: elegir día, entrega y pago, que no se paga ahora y que el local confirma por WhatsApp. |
| **Total** | | **25/40** | **Aceptable** |

## Design Specificity Verdict

**Evaluación LLM:** disciplinado con el sistema (tokens, título en serif, CTA salmón, precios tabulares) pero con composición anónima: sacando "Tu pedido", es el drawer de carrito de cualquier tienda. Lo más propio no se ve: el carrito ya escribe las líneas igual que el mensaje de WhatsApp, pero no se presenta como lo que es, un borrador del pedido que se va a mandar.

**Scan determinístico:** CLI limpio (exit 0, sin hallazgos en CartDrawer, ScheduleNotices, Sheet, QuantityStepper y Button). En el navegador, 5 hallazgos dentro del drawer: `low-contrast` ×4 en las líneas "c/u" (`#75716a` sobre `#141416`, 3.8:1; `CartDrawer.tsx:32`) y `straggler` en el aviso "…Podés dejar tu pedido encargado." ("encargado." sola en la última línea, medido en escritorio). Coincide con la revisión en el contraste de "c/u"; el straggler lo agregó el detector. Los otros 5 hallazgos son de la página detrás (ya informados en la crítica del menú).

**Overlays visuales:** las marcas quedaron en la pestaña **[Human] EnSushi carrito**, pero se dibujan detrás del drawer (el `<dialog>` está en la capa superior), así que sobre el carrito no se ven: los hallazgos del drawer están solo en la consola. El servidor de desarrollo ya se detuvo.

## Overall Impression

Correcto y prolijo, con una base técnica muy buena (diálogo nativo, nombres de línea idénticos al WhatsApp). Falla en dos lugares que importan justo antes de pasar al checkout: el número grande dice "Total" y después cambia, y borrar es instantáneo y sin vuelta atrás. La mayor oportunidad es que el carrito se lea como el borrador del pedido que se va a mandar.

## What's Working

1. **Paridad exacta con WhatsApp:** carrito y `whatsappService` comparten `getLineName` y `lineSubtotal` (`cartLine.ts:11`), así que "Combo Kanituna · 24 piezas" y "SushiBurger Salmón · Crudo" con subtotal por línea coinciden con la plantilla.
2. **Modal sólido:** `<dialog>` nativo con foco atrapado, Esc, cierre con el fondo y safe-area (`Sheet.tsx`); steppers con nombres accesibles en español que incluyen tamaño u opción.
3. **"Vaciar" con confirmación en línea** ("¿Vaciar todo el pedido? No / Sí, vaciar", `CartDrawer.tsx:93-109`), sin diálogo nativo; los precios se recalculan desde el menú al rehidratar.

## Priority Issues

**[P1] "Total" no es el total.**
- **Por qué importa:** `CartDrawer.tsx:66` dice Total y en el checkout se suman $3.000 de envío. Rompe la confianza justo antes de mandar el pedido (principio 1: el pedido correcto).
- **Fix:** "Subtotal" y debajo, en `muted`: "Si elegís envío a domicilio, se suman $ 3.000", leído de `BUSINESS.delivery.fee`.
- **Comando sugerido:** /impeccable clarify

**[P1] Borrar es instantáneo, sin deshacer, y se pierde el foco.**
- **Por qué importa:** el tacho (`QuantityStepper.tsx:29`) y "Sí, vaciar" (`CartDrawer.tsx:103`) no se pueden deshacer; el foco cae a `<body>` y nada se anuncia.
- **Fix:** dejar la línea borrada unos segundos como fila colapsada ("Sacaste SushiBurger Salmón · Crudo · Deshacer"); mover el foco a la línea siguiente o al título; una región `aria-live` fija dentro del drawer.
- **Comando sugerido:** /impeccable harden

**[P2] El tacho reemplaza al menos bajo el mismo pulgar.**
- **Por qué importa:** bajar de 2 a 0 con dos toques rápidos borra la línea; botones de 36px.
- **Fix:** en 1, menos deshabilitado y un tacho aparte en la línea (o mantener el cambio pero con el Deshacer de arriba); botones de 44px.
- **Comando sugerido:** /impeccable harden

**[P2] En el celular el pie se come la lista y no hay nada visual.**
- **Por qué importa:** total, aviso y CTA de 52px ocupan ~35% de la altura: con 6 líneas se ven ~3,5. Sin fotos, hay que recordar qué es cada combo.
- **Fix:** miniatura de 48–56px por línea con `ProductImage` (ya existe la foto por opción Crudo/Cocido); mover los avisos arriba de la lista y dejar el pie en total + CTA.
- **Comando sugerido:** /impeccable layout

**[P3] Contraste y foco.**
- **Por qué importa:** "c/u" en `subtle` a 3.8:1 (confirmado por el detector), contra el propio Don't de DESIGN.md; el botón de cerrar muestra el anillo blanco por defecto (`Sheet.tsx:63`).
- **Fix:** "c/u" en `muted` o mostrarlo solo con cantidad > 1; `focus-visible:outline-2 outline-accent outline-offset-2` en cerrar.
- **Comando sugerido:** /impeccable polish

## Persona Red Flags

**Casey (una mano):** la X está arriba a la derecha, fuera del pulgar, y a 390px el drawer ocupa todo el ancho, así que no hay fondo para tocar; botones del stepper de 36px; "No" y "Sí, vaciar" son pastillas de 36px pegadas.

**Riley (estresa el flujo):** 12 × Combo 40 piezas ($540.000) pasa sin ningún aviso; "SushiBurger Salmón · Cocido" corta y deja "Cocido" sola; el header dice "(20 productos)" porque suma cantidades; las líneas que se caen al rehidratar (`useCartStore.ts:136`) desaparecen sin explicación.

**Jordan (primera vez):** "Continuar con el pedido" no dice qué viene; nada aclara que no se paga ahora ni que el pedido se manda por WhatsApp.

**Comensal de Arrecifes, de noche:** el aviso salmón "Abrimos el viernes a las 17:00. Podés dejar tu pedido encargado." pegado al CTA se lee como bloqueo y no dice cómo (elegir el viernes al finalizar); "combos armados" (`schedule.ts:140`, `:165`) no es "Arma tu combo"; el gris de "c/u" es lo más difícil de leer con poca luz.

## Minor Observations

- La barra flotante se desmonta mientras el carrito está abierto (`Shop.tsx:68`): en el celular, el `<dialog>` no tiene a dónde devolver el foco al cerrar.
- La cantidad es el número más débil de la línea; "2×" antes del nombre, como en el WhatsApp, la haría escaneable.
- Con el carrito vacío quedan dos bordes superiores seguidos en la zona de "Vaciar pedido".
- Al abrir en escritorio, la X recibe foco automático y muestra el anillo blanco.
- Straggler "encargado." en el aviso (`text-pretty` lo resuelve).

## Questions to Consider

- ¿Y si el carrito fuera la vista previa del mensaje de WhatsApp (mismas líneas, "Para:", envío), en vez de una lista genérica?
- ¿Un tacho dentro del control de cantidad tiene sentido en un local cuyo primer principio es "el pedido correcto", si un toque de más borra una línea sin aviso?
- ¿Las fotos van en el carrito, o un listado de texto es la "carta" honesta de La barra de noche?
