---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/shop/Shop.tsx"]
---

## Scope
Tienda (menú, Arma tu combo, carrito, checkout). Modo: Operate. Fase actual: menú (header, banda de estado, pestañas, filas, pie). Arma tu combo se rehace en el Paso 10; carrito y checkout en la Fase 7.

## Decisiones confirmadas
- Texto de portada al pie: "Sushi de autor, directo a tu casa." + "Armá tu propio combo, o elegí de nuestros combos, y mandanos el pedido por WhatsApp."
- Carrito sigue diciendo "Total".
- En la fila del menú el menos no baja de 1; borrar solo en el carrito.
- Error de campos en rosa frío propio, nunca bermellón.
- Tipografías: M PLUS Rounded 1c (nombres y títulos) + Figtree (todo lo demás).

## Direction contract
THESIS: Lo que elegís queda sellado. El menú es una lista de filas comparables, no una vidriera de tarjetas; rechaza el hero grande + grilla de tarjetas con "Agregar".
OWN-WORLD: Tinta sumi cálida en capas, texto crema del logo, filetes de 1px. Un solo bermellón (pasta de sello) con un solo trabajo: "en tu pedido". Avisos de horario en banda crema; acción principal en placa crema invertida. Góticas redondeadas, sin ornamento: el sello es el único dibujo.
STORY: El cliente ve si hoy se puede pedir, compara los tres tamaños con su precio de un vistazo, toca "+" y el producto queda sellado con su cantidad; sigue al pedido.
FIRST VIEWPORT: Header (logo, carrito con sello-contador), banda crema de estado, pestañas de texto subrayadas pegajosas, título de categoría y filas: foto cuadrada, nombre, descripción, chips de tamaño con precio y sello de cantidad por tamaño, stepper con sello a la derecha.
FORM: Sello y sumi, candidato 7 de la lista propia. seed:61327a714208721a
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Arma tu combo (Paso 10), brief confirmado
- Selector de caja arriba (chips 10/15/20/25/30, nada preelegido). Filas agrupadas en Rolls de autor, Nigiris y Acompañamientos con unidad de venta y precio ("5 piezas · $ X") y stepper. Barra crema abajo: "Caja de 20 · 15 de 20", total en vivo, barrita de progreso y botón "Faltan N piezas" (deshabilitado) → "Agregar · $ X".
- Nigiri = 1 pieza; la caja se completa exacto, máximo 30. El "+" que no entra se apaga.
- Tocar "+" de roll o nigiri sin caja elegida lleva al selector y lo resalta ("Elegí el tamaño de la caja"); no es un botón deshabilitado.
- Tamaños más chicos que lo cargado quedan apagados con "Para una caja más chica, sacá piezas".
- Dentro de la caja la cantidad va en número crema, no en sello: el bermellón es solo "en tu pedido". Los acompañamientos se agregan directo al pedido y llevan sello.
- En esta pestaña, con una caja en curso, la barra del armado reemplaza a la placa "Ver pedido".
- Después de las 20:00: rolls y nigiris desteñidos con sello hueco "Hasta las 20:00" visible sin hover (tooltip opcional en desktop); chips de caja apagados; aviso "Los rolls y nigiris se piden hasta las 20:00. Ahora podés sumar acompañamientos a tu pedido."; acompañamientos normales.
- Al agregar: la caja se vacía y la barra confirma "Agregaste tu caja · Ver pedido"; región aria-live con "15 de 20 piezas".
- WhatsApp: `- 1x Arma tu combo · 20 piezas (New York 10, Midori 5, Nigiri de salmón 5) ($ X)`; acompañamientos en línea propia con unidades reales: `- 6x Empanaditas ($ X)`.
- Precios provisorios (PRICE_TBD) se muestran como precios normales: Arma tu combo no sale hasta estar terminado.
- Carrito: la caja es una línea con su contenido; "Editar" lleva a la pestaña con la caja cargada ("Guardar cambios" / "Cancelar") y reemplaza la línea; stepper de cantidad y tacho. Cajas idénticas se juntan.
- Una caja agregada antes de las 20:00 se puede mandar después (el corte no bloquea pedidos enteros).
- Desktop: filas en dos columnas; barra pegada al pie de la columna de contenido.
- Toca lógica por diseño del paso: tipos (línea caja), store (agregar/reemplazar caja), whatsappService, borrar el aviso provisorio de schedule.ts, y borrar custom-combo, ROLL_FLAVORS y ComboBuilder. Carrito y checkout siguen con el estilo viejo (Fase 7), salvo "Editar" y el contenido de la caja en la línea.
