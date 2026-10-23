---
name: EnSushi
description: Pedidos online de sushi de autor, en dark mode, para el celular y de noche.
colors:
  sumi: "#141210"
  sumi-1: "#1d1a17"
  sumi-2: "#262220"
  hairline: "#34302b"
  hairline-strong: "#4d463e"
  washi: "#f1ebe0"
  washi-muted: "#b9b0a2"
  shu: "#c8432b"
  shu-fg: "#fff6ee"
  field-edge: "#7a7268"
  error: "#e8768f"
  kin: "#e9b949"
typography:
  headline:
    fontFamily: "M PLUS Rounded 1c, ui-rounded, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "M PLUS Rounded 1c, ui-rounded, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  tab:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  price:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
    fontFeature: "tnum"
  seal:
    fontFamily: "M PLUS Rounded 1c, ui-rounded, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  md: "6px"
  lg: "8px"
  add: "10px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
components:
  status-band:
    backgroundColor: "{colors.washi}"
    textColor: "{colors.sumi}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
    height: "44px"
  tab-active:
    textColor: "{colors.washi}"
    typography: "{typography.tab}"
    padding: "0 8px"
    height: "48px"
  tab-inactive:
    textColor: "{colors.washi-muted}"
    typography: "{typography.tab}"
    padding: "0 8px"
    height: "48px"
  choice-chip:
    textColor: "{colors.washi-muted}"
    rounded: "{rounded.lg}"
    padding: "6px 8px"
    height: "44px"
  choice-chip-selected:
    backgroundColor: "{colors.sumi-2}"
    textColor: "{colors.washi}"
    rounded: "{rounded.lg}"
  add-button:
    textColor: "{colors.washi}"
    rounded: "{rounded.add}"
    size: "44px"
  add-button-hover:
    backgroundColor: "{colors.sumi-1}"
  step-button:
    textColor: "{colors.washi-muted}"
    rounded: "{rounded.full}"
    size: "44px"
  step-button-hover:
    backgroundColor: "{colors.sumi-2}"
    textColor: "{colors.washi}"
  seal:
    backgroundColor: "{colors.shu}"
    textColor: "{colors.shu-fg}"
    typography: "{typography.seal}"
    rounded: "{rounded.md}"
    size: "40px"
  sold-out-seal:
    textColor: "{colors.washi}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  tag:
    textColor: "{colors.washi-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  order-plate:
    backgroundColor: "{colors.washi}"
    textColor: "{colors.sumi}"
    rounded: "{rounded.2xl}"
    padding: "0 16px"
    height: "56px"
---

# Design System: EnSushi

## Overview

**Creative North Star: "Sello y sumi"**

El sistema sale del hanko, el sello de pasta bermellón, apoyado sobre papel y tinta sumi. La página es tinta: un negro cálido en tres capas apenas distintas, con texto crema del mismo tono que el logo. Sobre esa tinta hay una sola marca de color, el sello bermellón, y significa siempre lo mismo: esto está en tu pedido, y cuántos. Lo que elegís queda sellado.

Es una pantalla para usar, no una vidriera. El menú es una lista de filas comparables (foto cuadrada, nombre, descripción, tamaños con su precio a la vista y la acción a la derecha), no una grilla de tarjetas grandes. La jerarquía sale de la escala y el peso de dos familias redondeadas, parientes del lettering blando del logo; no hay ornamento, porque el sello es el único dibujo de la página. Los avisos de horario van en una banda crema y la acción principal en una placa crema invertida: el rojo nunca avisa ni manda, solo marca lo elegido.

El tema es solo oscuro (`color-scheme: dark`): se pide de noche, desde el celular, muchas veces con poca luz.

**Key Characteristics:**
- Tinta sumi en tres capas (sumi → sumi-1 → sumi-2) separadas por filetes de 1px.
- Un solo color saturado, el bermellón, con un solo trabajo: "en tu pedido".
- Crema invertida para lo que hay que leer o tocar primero: la banda de estado y la placa "Ver pedido".
- M PLUS Rounded 1c para nombres y títulos; Figtree para todo lo funcional.
- Filas en vez de tarjetas; precios siempre a la vista y en números tabulares.
- Lleno se tiene, hueco no: sello lleno con la cantidad, sello hueco "Agotado hoy".

## Colors

Una paleta de tinta y papel: negros cálidos con un dejo marrón, crema de papel washi y una sola pasta bermellón.

### Primary
- **Bermellón de Sello** (`shu`): el sello. Contador del carrito en el header, sello con la cantidad en el stepper de cada fila, sello chico con la cantidad sobre cada chip de tamaño u opción que está en el pedido, y sello de la placa "Ver pedido". Nada más: ni botones, ni avisos, ni foco, ni texto suelto. Sobre la tinta llega a 3.8:1, así que nunca se usa para texto sobre `sumi`.
- **Papel sobre Sello** (`shu-fg`): la cifra dentro del sello (4.6:1 sobre `shu`).

### Secondary
- **Rosa Frío** (`error`): solo errores de campos: el borde del campo o de las opciones sin elegir y el mensaje debajo (6.6:1 sobre `sumi`). Es frío a propósito, para que nunca se confunda con el sello.

- **Oro Kin** (`kin`): solo descuentos. El sello lleno "−15% hoy" junto al nombre de cada Combo en un día especial (texto `sumi`, 9.6:1), el "−15%" dentro de la banda de estado y el monto descontado en el carrito y el checkout ("−$ 5.400", 10:1 sobre `sumi`). Nunca para cantidades ni para el pedido: eso es del bermellón.

### Neutral
- **Tinta Sumi** (`sumi`): fondo de la página, del header y de la barra de pestañas (estas dos al 90% con desenfoque) y del degradado detrás de la placa flotante.
- **Sumi Lavada** (`sumi-1`): hover del botón "+" y del botón del carrito; esqueletos de carga.
- **Sumi Cargada** (`sumi-2`): fondo del chip seleccionado, de la foto mientras carga y hover de los botones del stepper.
- **Filete** (`hairline`): borde de 1px de header, pestañas, divisores entre filas, chips en reposo y etiquetas.
- **Filete Marcado** (`hairline-strong`): borde del botón "+" en reposo, de los botones contorneados, de las opciones de Entrega y Pago, y hover de los chips.
- **Borde de Campo** (`field-edge`): borde de los campos de texto (3.95:1 sobre `sumi`, por encima del 3:1 que pide un control). Solo bordes, nunca texto.
- **Papel Washi** (`washi`): texto principal, nombres, precios, pestaña activa y su subrayado, borde del chip seleccionado, foco visible. Es también el fondo de la banda de estado y de la placa "Ver pedido".
- **Papel Gastado** (`washi-muted`): descripciones, pestañas inactivas, chips en reposo, etiquetas, botones del stepper y todo lo agotado. Pasa AA en las tres capas (8.7:1 sobre `sumi`, 7.4:1 sobre `sumi-2`).

### Named Rules
**La Regla del Sello.** El bermellón significa "en tu pedido" y solo eso. Si algo es rojo y no muestra una cantidad que está en el pedido, está mal. Los únicos otros colores saturados son el rosa frío de los errores de campos y el oro kin de los descuentos.

**La Regla de los Dos Papeles.** Hay dos niveles de texto, `washi` y `washi-muted`, y los dos pasan AA sobre todas las superficies. No existe un tercer gris para texto: los filetes son para bordes, nunca para letras.

**La Regla de la Placa.** Lo que hay que leer o tocar primero va en crema invertida (`washi` de fondo, `sumi` de texto): la banda de estado arriba y una sola placa de acción abajo. Una placa invertida por pantalla.

## Typography

**Display Font:** M PLUS Rounded 1c, peso 700 (con ui-rounded y system-ui de respaldo)
**Body Font:** Figtree, pesos 400, 500 y 700 (con ui-sans-serif y system-ui de respaldo)

**Character:** Una gótica redondeada y firme para los nombres, de la familia del lettering blando del logo, sobre una sans occidental neutra que se ocupa de precios, controles y textos sin competir. Las dos se cargan con `next/font/google`, solo latin.

### Hierarchy
- **Headline** (700, 30px y 36px desde `sm`, interlineado 1.25): título de categoría. El título del pie ("Sushi de autor, directo a tu casa.") usa el mismo estilo a 24px y 30px desde `sm`.
- **Title** (700, 18px y 20px desde `sm`, interlineado 1.375, `text-balance`): nombre del producto en la fila.
- **Body** (400, 16px, interlineado 1.5): descripción de la categoría y bajada del pie.
- **Body-sm** (400, 14px, interlineado 1.625, `text-pretty`): descripción del producto y texto de la banda de estado (la primera frase en 700, la segunda en 500).
- **Tab** (15px; 500 inactiva, 700 activa): pestañas de categoría.
- **Label** (500, 12px): cantidad de piezas dentro del chip de tamaño y etiquetas (Más pedido, Picante, Veggie).
- **Price** (700, 16px; 14px dentro del chip; tabular): todos los importes.
- **Seal** (M PLUS Rounded 700, tabular): 18px en el stepper, 14px en la placa, 12px en el header y 11px sobre los chips.

### Named Rules
**La Regla del Nombre.** M PLUS Rounded es para nombres: platos, categorías, el título del pie y la cifra del sello. Nunca para precios, botones, avisos ni descripciones.

**La Regla del Precio Alineado.** Todo número que el cliente compara (precios, piezas, cantidades, totales) va con `tabular-nums`.

## Layout

Mobile-first, una columna con márgenes laterales de 16px (24px desde `sm`) dentro de un contenedor de hasta 1152px (`max-w-6xl`).

El menú arranca sin hero: header pegajoso de 56px; banda de estado con 16px arriba y 8px abajo; barra de pestañas pegajosa de 48px debajo del header; una sola categoría visible. El texto de portada vive al pie de la página, después de los productos, con 48px arriba y 128px abajo en el celular (lugar para la placa flotante; 56px desde `sm`).

Las filas forman una lista con un filete arriba de la primera y uno debajo de cada fila. Cada fila tiene 20px de padding vertical y una columna de foto de 88px (104px desde `sm`) con 16px de separación; sin foto, el texto ocupa todo el ancho. Dentro del texto: 4px entre nombre y descripción, 12px entre bloques (texto, chips, acción). Los chips van en 2 o 3 columnas iguales con 8px de separación. Desde `lg` (1024px) las filas pasan a dos columnas con 48px de separación. La sección hace scroll con un margen de 112px para no quedar bajo las barras pegajosas.

En el celular las pestañas hacen scroll horizontal sin barra visible y se desvanecen en los últimos 32px para avisar que hay más.

## Elevation & Depth

Plano y en capas de tinta: la profundidad se lee por el paso de `sumi` a `sumi-1` y `sumi-2` y por filetes de 1px. Nada en reposo tiene sombra. El header y la barra de pestañas usan `sumi` al 90% con `backdrop-blur-md` para que el menú pase por debajo sin perder legibilidad.

### Shadow Vocabulary
- **Placa flotante** (`box-shadow` de `shadow-lg` en negro al 50%): la placa "Ver pedido" del celular, sobre un degradado que sale de `sumi`. Es la única sombra del menú.

### Named Rules
**La Regla de lo que Flota.** Solo lleva sombra lo que flota sobre la página. Filas, chips y bandas se separan con tono y filete.

## Shapes

Formas firmes con las esquinas apenas redondeadas, como un sello o una tablilla, no pastillas. 6px para el sello, las etiquetas y el sello hueco de agotado; 8px para los chips de tamaño u opción; 10px para el botón "+"; 12px para la foto y la banda de estado; 16px para la placa flotante. Solo los botones del stepper y el botón del carrito son círculos.

El sello se apoya inclinado (-6° el lleno, -3° el hueco), como estampado a mano. Es la única forma girada del sistema. Las fotos van cuadradas y recortadas (`object-cover`). Los bordes son siempre de 1px, salvo el sello hueco (1.5px).

## Components

### Buttons
Directos y del tamaño del pulgar; ninguno es rojo.
- **Agregar ("+")**: cuadrado de 44px, 10px de radio, borde `hairline-strong` y signo `washi`. En hover, borde `washi` y fondo `sumi-1`.
- **Stepper**: menos, sello con la cantidad y más, cada uno de 44px. Los botones son círculos con el signo en `washi-muted`; en hover toman fondo `sumi-2` y signo `washi`. En el menú el menos se deshabilita en 1 (35% de opacidad): borrar una línea es trabajo del carrito.
- **Carrito (header)**: círculo de 44px con borde `hairline`, ícono de bolsa y el sello contador arriba a la derecha.
- **Foco**: contorno de 2px en `washi`, separado 2px. Nunca bermellón.

### Seal (componente propio)
El gesto que define el sistema. Un cuadrado de pasta bermellón (`shu`) con la cantidad en M PLUS Rounded tabular, 6px de radio, girado -6°. Cada vez que cambia la cantidad se vuelve a estampar: entra desde 1.3× de escala, -14° y 40% de opacidad, y se asienta en 220ms con `cubic-bezier(0.22, 1, 0.36, 1)`. Viene en cuatro escalas: 40px en el stepper, 32px en la placa, 24px en el header y 20px sobre los chips. Siempre va con texto para lectores de pantalla ("2 en tu pedido").
- **Sello hueco "Agotado hoy"**: 36px de alto, borde de 1.5px en `washi-muted`, texto `washi` en 700, girado -3°. Reemplaza la acción de un producto agotado.

### Chips
- **De tamaño u opción**: radios nativos ocultos dentro de un label. 44px de alto como mínimo y 8px de radio. Los de tamaño llevan "15 piezas" en label y el precio en 700 debajo. En reposo: borde `hairline` y texto `washi-muted`. Seleccionado: borde `washi`, fondo `sumi-2` y texto `washi`. Si esa línea está en el pedido, el sello chico va en la esquina superior derecha. Foco: contorno `washi` sobre el label.
- **Etiquetas**: 6px de radio, borde `hairline`, texto `washi-muted` de 12px.

### Product Row
La unidad del menú. Foto cuadrada de 88/104px con 12px de radio a la izquierda (o nada si no hay foto o falla la carga), nombre, descripción, etiquetas, chips y una línea de acción de 44px: precio a la izquierda (vacío en los combos, que llevan el precio en cada chip) y acción a la derecha. **Agotado:** foto en gris al 40%, nombre y precio en `washi-muted`, chips deshabilitados al 40% y el sello hueco en lugar de la acción.

### Status Band
Banda crema de 44px como mínimo, 12px de radio, texto `sumi` de 14px. La primera frase va en 700 y el detalle en 500, a los costados (o apilados si no entran). Lee el horario del local y usa las mismas frases que los avisos del carrito y el checkout ("Hoy no abrimos. / Abrimos mañana a las 17:00.", "Abierto hoy hasta las 23:30 / Rolls y nigiris hasta las 19:30"). Mientras no se sabe la hora del visitante, reserva el lugar vacío. `role="status"`.

### Navigation
- **Header:** pegajoso, 56px, logo de 28px de alto a la izquierda y botón del carrito a la derecha; filete abajo.
- **Pestañas:** botones de texto de 48px de alto, 15px, con 12px entre sí. La inactiva va en `washi-muted` (en hover, `washi`); la activa en `washi` 700 con un subrayado interno de 2px del mismo color. Patrón de pestañas WAI-ARIA con flechas.
- **Placa "Ver pedido" (celular):** placa `washi` de 56px a todo el ancho, 16px de radio, con el sello y "Ver pedido" a la izquierda y el total a la derecha, en `sumi` 700. Desaparece desde `sm`.

### Sugerencias del carrito
"¿Le sumás algo?" debajo de las líneas del carrito, solo mientras se toman pedidos: una fila que se desliza con tarjetas de 176px (filete `hairline`, 12px de radio) para acompañamientos y salsas. Cada tarjeta tiene nombre, porción y precio, y el mismo "+" / stepper con sello del menú, así lo que se suma queda sellado ahí mismo y aparece como línea.

### Box Builder (Arma tu combo)
El armado de la caja, dentro de la pestaña. Arriba, el selector de caja: dos chips de 64px de alto, "Caja chica" y "Caja grande" en M PLUS Rounded con "hasta 15 / 30 piezas" debajo, con el mismo estado de selección que los chips de tamaño. Debajo de la caja elegida, la lista de lo que entra en ella en `washi-muted` ("· 10 piezas + hasta 3 nigiris"). Debajo, un grupo por sección (Rolls de autor, Nigiris) con su título y una nota a la derecha ("De a 5 piezas · hasta las 19:30"), y filas de texto de 76px: nombre, unidad de venta y precio, y el control.
- **Dentro de la caja, sin sello:** lo que está en la caja todavía no está en el pedido, así que la cantidad va en número `washi` (M PLUS Rounded, tabular) entre el menos y el más. Los acompañamientos tienen su propia pestaña, con las mismas filas y el stepper con sello del resto del menú.
- **Antes de elegir caja:** el "+" de un roll o nigiri no se deshabilita; lleva al selector, lo enmarca con un contorno `washi` y cambia la ayuda a "Elegí el tamaño de la caja".
- **Barra del armado:** es la placa crema de esta pantalla y reemplaza a "Ver pedido" mientras hay una caja en curso. Va pegada al pie (en escritorio, hasta 576px y a la derecha) y muestra la caja y lo cargado ("Caja grande · 15 piezas + 3 nigiris") y el total, sin barrita de progreso (no hay un número fijo que completar). Si lo cargado ya entra en la otra caja, abajo va el link "Así como está, entra en la caja chica". Su botón es `sumi` lleno cuando hay una acción ("Agregar · $ X", "Guardar · $ X", "Ver pedido") y contorneado con texto `sumi` a contraste completo cuando informa ("Faltan 5 piezas", "Hasta las 19:30"): deshabilitado no quiere decir ilegible.
- **Pasado el corte:** rolls y nigiris desteñidos con el sello hueco "Hasta las 19:30", chips de caja apagados y un aviso con filete `hairline-strong` arriba del selector.

### Día especial
En Combos: el sello kin "−15% hoy" junto al nombre (rotado −3°, como el sello hueco; nombre y sello cortan como dos piezas), y en cada chip de tamaño el precio de antes tachado en 12px y el de hoy en 700. Debajo de los chips, a la izquierda del "+", "Incluye 2 salsas y 2 palitos" del tamaño elegido (también los días comunes).

### Checkout
Una sola columna en el celular y dos desde `lg` (formulario a la izquierda, resumen pegado a la derecha). Los títulos de página van en el estilo Headline a 24px en el celular (36px desde `sm`), para que el formulario arranque en la primera pantalla. "← Volver al menú" tiene 44px de alto. El orden es: Tus datos, "¿Cómo lo recibís?", "¿Cómo pagás?", la línea "Para hoy", y al final el total y la placa "Enviar pedido por WhatsApp".
- **Opciones de Entrega y Pago:** dos opciones grandes del mismo tamaño, lado a lado también en el celular (128px de alto como mínimo, 12px de radio): ícono de línea, nombre en 700 y una ayuda en `washi-muted`. Seleccionada: borde `washi`, fondo `sumi-2` y un tilde arriba a la derecha (la selección no es solo color). Con error, borde rosa frío.
- **Total arriba del botón (celular):** un bloque con filete que muestra Subtotal / Envío / Total cuando hay envío, solo Total con retiro, y "Si elegís envío a domicilio, se suman $ X." si todavía no eligió.
- **Retiro:** la dirección del local en un bloque con filete. **Transferencia:** el aviso de no transferir todavía, con filete `hairline-strong` y texto `washi`.

- **Código de descuento:** arriba del total, plegado en el link "¿Tenés un código de descuento?". Abierto: campo de texto (mayúsculas) y "Aplicar" contorneado al lado; Enter aplica, no manda el pedido. Con error, el mensaje en rosa frío debajo. Aplicado: placa `sumi-2` con borde `washi`, "VERANO10 · 10% en tu pedido" y "Quitar"; si el día especial ahorra más, una línea `washi-muted` lo explica. El resumen suma la fila "Descuento (…)" con el monto en kin.

### Inputs / Fields
- **Style:** 48px de alto, fondo `sumi-1`, borde `field-edge`, 12px de radio y texto de 16px (para que iOS no haga zoom). El label va arriba en 14px/700 y la ayuda abajo en `washi-muted`.
- **Focus:** borde `washi` y contorno de 2px en `washi`, separado 2px.
- **Error:** borde y mensaje en `error`, con `aria-invalid` y el mensaje vinculado por `aria-describedby`.

## Do's and Don'ts

### Do:
- **Do** leer los colores de los tokens de `src/app/globals.css` (`sumi`, `sumi-1`, `sumi-2`, `hairline`, `washi`, `washi-muted`, `shu`…); nunca escribir un hex en un componente.
- **Do** usar el sello bermellón solo para mostrar una cantidad que está en el pedido (La Regla del Sello).
- **Do** marcar la selección con borde `washi` y fondo `sumi-2`.
- **Do** dar a todo control 44px de alto como mínimo y foco visible de 2px en `washi`.
- **Do** poner `tabular-nums` en todo precio, cantidad, pieza y total.
- **Do** dejar un producto agotado en su lugar, desteñido y con el sello hueco "Agotado hoy".
- **Do** mostrar una fila sin foto como texto, sin placeholder.
- **Do** respetar `prefers-reduced-motion`: el sistema baja animaciones y transiciones a 1ms, incluido el estampado del sello.

### Don't:
- **Don't** usar el bermellón para botones, avisos, errores, foco o decoración.
- **Don't** escribir texto en `hairline` o `hairline-strong`, ni volver a un tercer gris de texto que no llegue a AA (La Regla de los Dos Papeles).
- **Don't** usar M PLUS Rounded en precios, botones, avisos o descripciones (La Regla del Nombre).
- **Don't** poner más de una placa crema invertida de acción por pantalla.
- **Don't** usar sombras en filas, chips o bandas (La Regla de lo que Flota).
- **Don't** usar blanco puro para texto ni fondos; el texto es `washi`.
- **Don't** agregar una variante clara del tema.
- **Don't** usar el rosa frío fuera de los errores de campos, ni el bermellón para errores.
