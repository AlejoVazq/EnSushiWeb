---
name: EnSushi
description: Pedidos online de sushi de autor, en dark mode, para el celular y de noche.
colors:
  canvas: "#0b0b0c"
  surface: "#141416"
  surface-2: "#1c1c1f"
  line: "#29292d"
  line-strong: "#3b3b41"
  fg: "#f4efe6"
  muted: "#a8a39a"
  subtle: "#75716a"
  accent: "#f0805a"
  accent-strong: "#f6966f"
  accent-fg: "#1c0f0a"
  danger: "#f26d6d"
typography:
  display:
    fontFamily: "Cormorant Garamond, ui-serif, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 500
    lineHeight: 1.05
  headline:
    fontFamily: "Cormorant Garamond, ui-serif, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1.1
  title:
    fontFamily: "Cormorant Garamond, ui-serif, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  price:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
    fontFeature: "tnum"
rounded:
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "48px"
  card-product:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.3xl}"
    padding: "20px"
  tab-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "36px"
  tab-inactive:
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "36px"
  choice-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  quantity-stepper:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.full}"
    height: "36px"
---

# Design System: EnSushi

## Overview

**Creative North Star: "La barra de noche"**

El sistema está pensado como sentarse en la barra de un sushi bar de noche: el ambiente es casi negro y una sola luz cálida, el Salmón de Barra, marca lo que se puede tocar y lo que ya elegiste. Todo lo demás se queda en penumbra para que mande el producto: las fotos reales de los platos y sus nombres, escritos en una serif de carta de restaurante.

La densidad es de app de pedidos, no de revista. Una categoría por vez, tarjetas grandes con la foto arriba, precios en números tabulares y controles del tamaño del pulgar. Los componentes son táctiles y cálidos: pastillas redondeadas, superficies en capas apenas distintas entre sí y estados que se notan al tocarlos (el borde se enciende en salmón y el fondo toma un velo del mismo color). El tema es oscuro y no tiene variante clara (`color-scheme: dark`).

La profundidad viene del tono y de bordes finos, no de sombras. La luz cálida también vive en los neutros: el texto es crema (no blanco puro) y los grises secundarios tiran a piedra, lo que evita el frío de un dark mode genérico.

**Key Characteristics:**
- Fondo casi negro en tres capas tonales (canvas → surface → surface-2) separadas por bordes de 1px.
- Un único color de acento, el Salmón de Barra, para acciones, selección y avisos.
- Serif Cormorant Garamond para nombres de platos y títulos; Geist para todo lo funcional.
- Formas muy redondeadas: pastillas para acciones, tarjetas de 24px.
- Precios siempre en números tabulares y en semibold.

## Colors

Una paleta de penumbra cálida: neutros casi negros con un dejo violeta, texto crema y un solo acento salmón.

### Primary
- **Salmón de Barra** (`accent`): la única luz de la barra. Fondo del botón primario, pestaña activa del menú, barra flotante "Ver pedido" y contador del carrito; borde y velo (10% de opacidad) de toda opción seleccionada; texto de los avisos de reserva ("Rolls y nigiris hasta las 20:00") y del "en tu pedido". También es el color del foco visible.
- **Salmón Encendido** (`accent-strong`): solo el hover del botón primario.
- **Tinta sobre Salmón** (`accent-fg`): texto e íconos sobre el acento. Nunca blanco sobre salmón.

### Neutral
- **Noche de Barra** (`canvas`): fondo de la página, del header y de la barra de categorías (estas dos al 85% con desenfoque). También es el `theme-color` del navegador.
- **Mesada** (`surface`): tarjetas de producto, sheets, campos de texto y resumen del pedido.
- **Mesada Alta** (`surface-2`): una capa por encima de la mesada. Fondo del placeholder de foto, del botón secundario, del stepper y del hover de los botones fantasma.
- **Filo** (`line`): bordes de 1px de tarjetas, campos, pestañas inactivas y divisores. Al 60% en el header y en la barra de categorías.
- **Filo Marcado** (`line-strong`): borde en hover de tarjetas, pestañas y opciones, y trazo del ícono del placeholder.
- **Crema de Arroz** (`fg`): texto principal.
- **Piedra** (`muted`): descripciones, texto secundario, pestañas inactivas y botones fantasma.
- **Piedra Oscura** (`subtle`): placeholders, hints de campos, "c/u" y pie de página. Contraste aproximado de 4:1 sobre `canvas` y de 3.8:1 sobre `surface`, por debajo de AA para texto chico.
- **Alerta** (`danger`): bordes y texto de error en campos, y avisos que bloquean el checkout (borde al 40% y velo al 10%).

### Named Rules
**La Regla de la Única Luz.** El salmón es el único color con saturación en la interfaz. Si algo lo usa, se toca, está elegido o es un aviso de horario. No hay un segundo acento.

**La Regla del Velo.** Lo seleccionado o lo destacado en tono informativo lleva el borde en `accent` (o `accent/40` en los avisos) y el fondo en `accent/10`. No se usa un fondo salmón sólido para seleccionar, salvo en la pestaña activa.

## Typography

**Display Font:** Cormorant Garamond, pesos 500 y 600 (con ui-serif y Georgia como respaldo)
**Body Font:** Geist (con ui-sans-serif y system-ui como respaldo)

**Character:** La serif con contraste fino le da a cada plato el peso de una carta impresa. La sans neutra se ocupa de precios, controles y formularios sin competir con ella.

### Hierarchy
- **Display** (500, 48px / 60px desde `sm`, interlineado 1.05): solo el titular de la portada. Se usa una sola vez; es dudoso como escala general.
- **Headline** (500, 36px; 48px en `sm` para "Finalizar pedido"): títulos de página del checkout y de estados vacíos. Los títulos de categoría usan 30px y pasan a 36px desde `sm`.
- **Title** (500, 24px): nombre del producto en la tarjeta, título del sheet, leyendas de los grupos del checkout y título del resumen.
- **Body** (400, 16px): párrafos de portada (18px en el bajador del hero), campos de texto (16px para que iOS no haga zoom).
- **Body-sm** (400 a 500, 14px, interlineado relajado): el tamaño de trabajo de la interfaz. Descripciones, botones, pestañas, avisos y labels de campos.
- **Label** (500, 12px): chips de etiquetas sobre la foto, badge de reserva y "en tu pedido".
- **Price** (600, 18px en tarjeta y 24px en el total, números tabulares): todos los importes.

Valores dudosos (aparecen una sola vez): el eyebrow "Pedidos online" en mayúsculas con espaciado de 0.2em y el contador del carrito a 11px.

### Named Rules
**La Regla de la Carta.** La serif es para nombres: platos, secciones, títulos de pantalla. Nunca para precios, botones, labels ni texto de ayuda.

**La Regla del Precio Alineado.** Todo número que el cliente compara (precios, cantidades, totales, piezas) va con `tabular-nums`.

## Layout

Mobile-first, una sola columna con márgenes laterales de 16px (24px desde `sm`) dentro de un contenedor de hasta 1152px (`max-w-6xl`). El checkout usa un contenedor de 1024px (`max-w-5xl`).

La portada es un hero corto (48px de padding vertical; 80px desde `sm`), seguido de la barra de categorías pegajosa (debajo del header de 64px) y de una sola categoría visible. Los productos van en una grilla de 1 columna, 2 desde `sm` (640px) y 3 desde `lg` (1024px), con 20px de separación.

El ritmo interno sale de la escala de 4px de Tailwind: 12–16px entre elementos relacionados, 16–20px de padding en tarjetas, 24–40px entre bloques. En mobile, el contenido deja 128px abajo para la barra flotante del carrito, que desaparece desde `sm`. Los sheets respetan `safe-area-inset-bottom`.

El sheet de abajo pasa a ser un diálogo centrado desde `sm`; el drawer del carrito entra desde la derecha con un ancho máximo de 448px.

## Elevation & Depth

El sistema es plano y en capas tonales: la profundidad se lee por el paso de `canvas` a `surface` y a `surface-2`, y por bordes de 1px. Las superficies en reposo no tienen sombra. Las barras pegajosas (header y categorías) usan `canvas` al 85% con `backdrop-blur-md` para que el menú pase por debajo sin perder legibilidad. Los modales oscurecen todo con un fondo negro al 70% y un desenfoque leve.

### Shadow Vocabulary
- **Flotante** (`box-shadow` de `shadow-lg` en negro al 40%): la barra "Ver pedido" en mobile. Se usa una sola vez; dudoso.
- **Modal** (`box-shadow` de `shadow-2xl` en negro al 60%): el panel del sheet. Se usa una sola vez; dudoso.

### Named Rules
**La Regla de lo que Flota.** Solo lleva sombra lo que flota por encima de la página (barra flotante, sheets). Las tarjetas y los campos se separan con tono y borde, nunca con sombra.

## Shapes

La forma es blanda y redonda. Las pastillas (`rounded-full`) son para todo lo que se toca y es chico: botones, pestañas, stepper, chips, botón del carrito y contador. Las tarjetas grandes y los sheets usan 24px (`rounded-3xl`). Las opciones seleccionables grandes del checkout y del armado de combo usan 16px (`rounded-2xl`). Los campos, avisos y el selector de tamaño dentro de la tarjeta usan 12px (`rounded-xl`).

Los bordes son siempre de 1px. El único borde punteado es el estado vacío de una categoría (una sola vez; dudoso). Las fotos se recortan dentro de la tarjeta con proporción 4:3.

## Components

### Buttons
Pastillas cálidas y firmes al pulgar.
- **Shape:** pastilla completa (9999px).
- **Primary:** fondo Salmón de Barra con Tinta sobre Salmón, peso 500. Tamaños: 36px de alto (`sm`), 44px (`md`, por defecto) y 52px (`lg`, el de enviar el pedido), con 16–24px de padding lateral.
- **Hover / Focus:** el hover pasa a Salmón Encendido con `transition-colors`; el foco es un contorno de 2px en `accent`, separado 2px. Deshabilitado baja al 40% de opacidad y no recibe clics.
- **Secondary:** fondo `surface-2`, borde `line` que pasa a `line-strong` en hover y texto crema.
- **Ghost:** texto Piedra sin fondo; en hover toma `surface-2` y texto crema.
- **Icon:** círculo de 40px; los botones de cerrar usan el mismo patrón.

### Chips
- **Etiquetas sobre la foto:** pastilla negra al 60% con desenfoque y texto crema de 12px, arriba a la izquierda de la imagen.
- **Badge de reserva:** pastilla con borde `accent/40`, fondo `accent/10` y texto salmón de 12px ("Rolls y nigiris hasta las 20:00").

### Cards / Containers
- **Corner Style:** 24px.
- **Background:** `surface`; la zona de la foto tiene `surface-2` de fondo mientras carga.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 1px `line`, que pasa a `line-strong` en hover. En hover la foto se agranda un 3% en 500ms (una sola vez; dudoso).
- **Internal Padding:** 20px (24px en el resumen del checkout desde `sm`).
- **Placeholder de foto:** dos degradados radiales marrón oscuro sobre `surface-2` y un ícono de rollo de sushi (tres círculos concéntricos, el centro en `accent/40`). Los colores del degradado (#2b2320 y #201b1a) están escritos a mano fuera de los tokens.

### Inputs / Fields
- **Style:** 48px de alto, fondo `surface`, borde 1px `line`, 12px de radio y texto de 16px. El label va arriba en 14px/500 y el hint abajo en `subtle`.
- **Focus:** el borde pasa a `accent`, sin contorno extra.
- **Error / Disabled:** borde y mensaje en `danger`, con `aria-invalid` y el mensaje vinculado por `aria-describedby`.

### Navigation
- **Header:** pegajoso, 64px, logo a la izquierda (32px de alto) y botón circular del carrito (44px) con contador salmón.
- **Pestañas de categoría:** fila de pastillas de 36px con scroll horizontal y sin barra visible. La activa va con fondo salmón sólido; las inactivas, con borde `line` y texto Piedra (en hover, `line-strong` y crema). Se navegan con las flechas (patrón de pestañas WAI-ARIA).
- **Mobile:** barra flotante de 56px a todo el ancho con la cantidad, "Ver pedido" y el total, sobre un degradado que sale de `canvas`.

### Opciones seleccionables (componente propio)
Es el patrón que más se repite y el que define el tacto del sistema. Se trata de radios nativos ocultos dentro de un label-tarjeta. En reposo: borde `line` (sobre `surface` en el checkout) y texto Piedra. Seleccionado: borde `accent` y velo `accent/10`. Foco: contorno de 2px en `accent` sobre el label (`has-focus-visible`). Viene en dos escalas: el segmentado chico dentro de la tarjeta (12px de radio, 2–3 columnas, para tamaños de 15/24/40 piezas o Crudo/Cocido) y la tarjeta grande de opción (16px de radio y 16px de padding, para entrega, pago y armado de combo).

### Stepper de cantidad
Pastilla `surface-2` con borde `line`, dos botones circulares de 36px y la cantidad en el centro (14px semibold tabular, `aria-live`). Con cantidad 1, el menos se convierte en tacho de basura. En la tarjeta reemplaza al botón "Agregar" una vez que esa línea está en el carrito.

### Sheet
Panel modal sobre `<dialog>` nativo. Fondo `surface`, borde `line` y título en serif de 24px con un divisor abajo. Viene en dos variantes: drawer derecho (entra en 300ms) y bottom sheet en mobile, que pasa a diálogo centrado desde `sm` (300ms al subir, 200ms al escalar). Todas las entradas usan la curva `cubic-bezier(0.22, 1, 0.36, 1)`.

### Avisos de horario
Bloques de 12px de radio con texto de 14px e interlineado relajado. Los informativos usan borde `accent/40` y fondo `accent/10`; los que bloquean usan `danger/40` y `danger/10` con `role="alert"`.

## Do's and Don'ts

### Do:
- **Do** leer los colores de los tokens semánticos (`canvas`, `surface`, `line`, `fg`, `muted`, `accent`…) de `src/app/globals.css`; nunca escribir un hex en un componente.
- **Do** marcar la selección con borde `accent` y velo `accent/10` (La Regla del Velo).
- **Do** usar pastillas para controles chicos y 24px para tarjetas y paneles.
- **Do** poner `tabular-nums` en todo precio, cantidad y total.
- **Do** dar foco visible en `accent` con 2px de contorno a todo control interactivo.
- **Do** usar Cormorant Garamond 500 para nombres de platos y títulos, y Geist para lo demás.
- **Do** respetar `prefers-reduced-motion`: el sistema ya baja animaciones y transiciones a 1ms.

### Don't:
- **Don't** agregar un segundo color de acento ni usar el salmón como decoración (La Regla de la Única Luz).
- **Don't** usar sombras en tarjetas, campos o superficies en reposo (La Regla de lo que Flota).
- **Don't** usar blanco puro para texto ni para fondos; el texto es Crema de Arroz.
- **Don't** usar la serif en precios, botones, labels o texto de ayuda (La Regla de la Carta).
- **Don't** usar `subtle` para información que el cliente necesita para completar el pedido: no llega a AA para texto chico.
- **Don't** agregar una variante clara del tema; el sistema es solo oscuro.
