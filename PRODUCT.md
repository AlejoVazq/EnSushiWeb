# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Clientes de EnSushi en Arrecifes (Buenos Aires) y alrededores que piden desde el celular, de viernes a domingo a la noche (el local abre de 17:00 a 23:30). Quieren ver el menú, elegir rápido y mandar el pedido sin errores. La web solo toma pedidos para hoy; los encargos para otro día se arreglan por WhatsApp.

Del otro lado, el personal del local recibe el pedido por WhatsApp, lo confirma y decide cómo sigue (incluido pasar alias/CVU si el cliente paga por transferencia).

## Product Purpose

Web de pedidos online de EnSushi: el cliente arma el pedido para hoy (combos, Arma tu combo, sushiburgers, salsas), elige entrega y pago, y la web genera el mensaje de WhatsApp listo para mandar al local. No hay pago online, cuentas de usuario ni backend.

Éxito: el cliente llega del menú al WhatsApp enviado en pocos toques y sin errores, y el local recibe un pedido completo, con el formato de siempre, que puede tomar sin repreguntar.

## Positioning

- **Arma tu combo**: el cliente elige una caja de 10, 15, 20, 25 o 30 piezas y la llena exactamente con rolls de autor de a 5 piezas y nigiris (cada nigiri cuenta como 1 pieza); los acompañamientos van aparte y se pueden pedir solos. El total es la suma de los ítems.
- **Rolls de autor propios**: recetas de la casa (New York, Sake, Midori, Hikaru, Sakana Maki, TunaSpicy; la lista puede crecer).
- **Sushiburgers**: producto poco común en la zona (ej. SushiBurger Salmón, crudo o cocido).
- **Pedido sin fricción**: elegir desde el celu y en un toque queda listo en WhatsApp, sin registrarse ni pagar online.

## Operating Context

- Uso nocturno, en el celular, muchas veces con poca luz y apuro por la hora de la cena.
- El catálogo va por pestañas (una categoría por vez): Arma tu combo, Sushiburgers, Combos, Salsas & complementos.
- Momentos clave: elegir combo y tamaño (15 / 24 / 40 piezas); armar su propio combo (rolls y nigiris hasta las 20:00; los acompañamientos no tienen corte); revisar el carrito; completar el checkout (entrega y pago; el horario lo coordina el local por WhatsApp).
- Horario en la zona horaria del local: solo pedidos para hoy. En un día cerrado o después del cierre se bloquea el envío y se avisa cuándo abre; antes de la apertura se puede mandar, con un aviso. El corte de las 20:00 es por ítem (rolls y nigiris de Arma tu combo), no por pedido. En el carrito nunca se bloquea, solo se avisa.
- El pedido termina en el WhatsApp del local; la confirmación, el cobro por transferencia y el comprobante pasan por ese chat.

## Capabilities and Constraints

- Todo client-side. `src/data/menu.ts` es la única fuente de nombres, productos y precios; `src/config/business.ts` tiene WhatsApp, dirección, envío, horario y etiquetas. El diseño no los modifica.
- Precios en ARS, enteros, sin decimales.
- Envío a domicilio suma un costo fijo (hoy) y se muestra Subtotal / Envío / Total. Retiro muestra la dirección del local.
- Transferencia: nunca mostrar alias ni CVU. Se avisa que no transfiera todavía: el local confirma por WhatsApp y recién ahí pasa el alias y el total.
- El mensaje de WhatsApp sigue la plantilla exacta de `CLAUDE.md`.
- Terminología fija: "Arma tu combo", "Combos", "Sushiburgers", "Salsas & complementos", "piezas", "Retiro en el local", "Envío a domicilio", "Efectivo", "Transferencia / Mercado Pago", "Para hoy".
- Futuras versiones (el diseño tiene que dejarles lugar): app de escritorio para el local, productos marcados como agotados sin tocar el código e interconexión entre la app del local y la web. También: costo de envío por zona (el reparto llega a Arrecifes y alrededores) y pedido mínimo.
- Abierto: precios, descripciones y lista completa de rolls de Arma tu combo.

## Brand Commitments

- Nombre: EnSushi. Logo en `public/logo.png`; no se modifica.
- Voz: español rioplatense (voseo), directo y cálido.
- Mobile-first, dark mode por defecto, estética premium de sushi high-end.

## Evidence on Hand

- Fotos propias de productos en `public/images/menu/` (combos, sushiburgers). Faltan algunas (Combo TunaSalm, salsas, ítems de Arma tu combo) y se rehacen antes del deploy; originales en `fotos/`.
- Logo en `public/logo.png`.
- No hay reseñas, testimonios, cifras ni prensa: no inventarlos.

## Product Principles

1. El pedido correcto vale más que el pedido lindo: precios, tamaños, opciones y horarios siempre claros y sin ambigüedad.
2. Del menú al WhatsApp en la menor cantidad de toques posible, con una mano y en el celular.
3. Avisar antes que bloquear: solo se frena el checkout cuando el local de verdad no puede tomar el pedido.
4. Los datos sensibles de cobro nunca viven en la web; el chat con el local es parte del producto.
5. El producto es el protagonista: las fotos reales y la carta mandan.

## Accessibility & Inclusion

WCAG 2.1 AA como base: contraste legible en dark mode y de noche en el celular, áreas de toque cómodas, foco visible y controles nombrados en español.
