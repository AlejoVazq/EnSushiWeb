# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Clientes de EnSushi en Arrecifes (Buenos Aires) y alrededores que piden desde el celular, de viernes a domingo a la noche (el local abre de 17:00 a 23:30). Quieren ver el menú, elegir rápido y mandar el pedido sin errores. La web solo toma pedidos para hoy; los encargos para otro día se arreglan por WhatsApp.

Del otro lado, el personal del local recibe el pedido en la app de escritorio (una PC con Windows y la ticketera Epson TM-T20), le pone una hora aproximada o lo rechaza, imprime la comanda y le escribe al cliente por WhatsApp con un clic (incluido pasar alias/CVU si paga por transferencia). Desde la misma app marca agotados del día, pausa pedidos, maneja códigos de descuento, carga pedidos que llegan por WhatsApp y ve las ventas.

## Product Purpose

Web de pedidos online de EnSushi (ensushi.ar, rama `app-pedidos` en un servidor propio): el cliente arma el pedido para hoy (combos, Arma tu combo, sushiburgers, salsas), elige entrega y pago, y lo manda al servidor del local. Antes del primer pedido ingresa con un código por correo (antispam; la sesión dura 60 días y se renueva sola), y después sigue el pedido en una página de estado hasta que el local lo confirma con la hora o lo rechaza. No hay pago online. La rama `main` conserva la versión vieja que arma el mensaje de WhatsApp, pero no se publica.

Éxito: el cliente llega del menú al pedido enviado en pocos toques y sin errores, y el local recibe un pedido completo, que puede confirmar e imprimir sin repreguntar.

## Positioning

- **Arma tu combo**: el cliente elige una caja chica (hasta 15) o grande (hasta 30) y la llena con rolls de autor de a 5 piezas y nigiris, en una de las combinaciones que entran en esa caja; los acompañamientos tienen su propia pestaña y se piden solos. El total es la suma de los ítems.
- **Descuentos**: días especiales con un % en todos los Combos (no en Arma tu combo) y códigos que reparte el local (% o monto fijo, para todo el pedido). No se suman: se aplica el que más conviene.
- **Rolls de autor propios**: recetas de la casa (New York, Sake, Midori, Hikaru, Sakana Maki, TunaSpicy; la lista puede crecer).
- **Sushiburgers**: producto poco común en la zona (ej. SushiBurger Salmón, crudo o cocido).
- **Pedido sin fricción**: elegir desde el celu, ingresar una sola vez con el correo y mandar; la segunda vez el checkout ya trae nombre, celular y dirección. Sin pagar online.

## Operating Context

- Uso nocturno, en el celular, muchas veces con poca luz y apuro por la hora de la cena.
- El catálogo va por pestañas (una categoría por vez): Arma tu combo, Sushiburgers, Acompañamientos, Combos, Salsas & complementos. Al abrir el carrito se sugieren acompañamientos y salsas.
- Momentos clave: elegir combo y tamaño (15 / 25 / 40 piezas); armar su propio combo (rolls y nigiris hasta las 19:30; los acompañamientos no tienen corte); revisar el carrito; ingresar con el correo la primera vez; completar el checkout (entrega, pago y observaciones; la hora la pone el local); esperar la confirmación en la página del pedido.
- Horario en la zona horaria del local: solo pedidos para hoy. En un día cerrado o después del cierre se bloquea el envío y se avisa cuándo abre; antes de la apertura se puede mandar, con un aviso. El corte de las 19:30 es por ítem (rolls y nigiris de Arma tu combo), no por pedido. Cuando el local no toma pedidos, la web queda solo para ver el menú: no se puede agregar nada.
- El local también puede pausar los pedidos del día o marcar productos agotados desde su app; la web lo muestra en la banda, el menú y el carrito.
- La confirmación llega por WhatsApp (el local lo abre con el mensaje listo) y en la página del pedido; el cobro por transferencia y el comprobante pasan por ese chat.
- Al pie de cada página van el contacto (WhatsApp, Instagram, correo, dirección y horario) y las páginas legales: Privacidad, Términos y condiciones, Cookies y Botón de arrepentimiento, más el link a Defensa del consumidor.

## Capabilities and Constraints

- Servidor propio (Next.js + PostgreSQL en un VPS, detrás de Cloudflare; correo por SMTP). Nada de BaaS ni APIs pagas. El servidor rearma el pedido desde el menú y recalcula todo. `src/data/menu.ts` es la única fuente de nombres, productos y precios; `src/config/business.ts` tiene WhatsApp, contacto, dirección, envío, horario y etiquetas. El diseño no los modifica.
- Precios en ARS, enteros, sin decimales.
- Envío a domicilio suma un costo fijo (hoy) y se muestra Subtotal / Envío / Total. Retiro muestra la dirección del local.
- Transferencia: nunca mostrar alias ni CVU. Se avisa que no transfiera todavía: el local confirma por WhatsApp y recién ahí pasa el alias y el total.
- Los textos de los mensajes al cliente y de la comanda viven en la app del local (`desktop/`); la plantilla de WhatsApp de `CLAUDE.md` es la de la versión de `main`.
- La web no muestra el nombre ni el CUIT del titular (decisión del dueño); el responsable figura como EnSushi, con correo y dirección.
- Terminología fija: "Arma tu combo", "Combos", "Sushiburgers", "Acompañamientos", "Salsas & complementos", "piezas", "Retiro en el local", "Envío a domicilio", "Efectivo", "Transferencia / Mercado Pago", "Para hoy".
- Futuras versiones (el diseño tiene que dejarles lugar): costo de envío por zona (el reparto llega a Arrecifes y alrededores), pedido mínimo, animación de entrada al abrir la página y el diseño de la app del local.
- Abierto: precios, descripciones y lista completa de rolls de Arma tu combo.

## Brand Commitments

- Nombre: EnSushi. Logo en `public/logo.png`; no se modifica.
- Voz: español rioplatense (voseo), directo y cálido.
- Mobile-first, tema claro (desde 2026-11-12: fondo gris perla, grafito para letras y botones, bermellón solo para "en tu pedido"), estética premium de sushi high-end. Micro-interacciones sobrias en botones y pestañas.

## Evidence on Hand

- Fotos propias de productos en `public/images/menu/` (combos, sushiburgers). Faltan algunas (Combo TunaSalm, salsas, ítems de Arma tu combo) y se rehacen antes del deploy; originales en `fotos/`.
- Logo en `public/logo.png` (blanco; con el tema claro se tiñe de grafito hasta tener una versión oscura).
- Instagram: https://www.instagram.com/ensushi.ar/
- No hay reseñas, testimonios, cifras ni prensa: no inventarlos.

## Product Principles

1. El pedido correcto vale más que el pedido lindo: precios, tamaños, opciones y horarios siempre claros y sin ambigüedad.
2. Del menú al pedido enviado en la menor cantidad de toques posible, con una mano y en el celular.
3. Avisar antes que bloquear: solo se frena el checkout cuando el local de verdad no puede tomar el pedido.
4. Los datos sensibles de cobro nunca viven en la web; el chat con el local es parte del producto.
5. El producto es el protagonista: las fotos reales y la carta mandan.

## Accessibility & Inclusion

WCAG 2.1 AA como base: contraste legible sobre el gris perla también de noche en el celular, áreas de toque cómodas, foco visible y controles nombrados en español.
