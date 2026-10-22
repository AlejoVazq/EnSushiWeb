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
