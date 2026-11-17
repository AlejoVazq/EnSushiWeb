# Pedir sin registrarse (2026-11-17)

## Por qué
Quienes probaron la web dijeron que pedir el correo como primera interacción ahuyenta a la gente común. El
registro deja de ser obligatorio y pasa a ser un beneficio: los códigos de descuento son para registrados.

## Objetivos
- Cualquiera pide sin cuenta: carrito → checkout → enviar, sin correo.
- Registrarse da: códigos de descuento, datos guardados para el próximo pedido.
- Defensa contra robots, invisible para las personas.

## No objetivos / descartado
- Combos exclusivos para registrados: idea para más adelante, no se hace ahora.
- Señales contra pedidos falsos de personas (característica 2478, historial del celular, 1 por IP): el dueño
  considera que nadie va a inventar pedidos; solo robots.
- Captcha (Turnstile u otro): sigue descartado.

## Enfoque elegido
Invitación al registro en dos lugares (B + C), sin traba antes del checkout (A descartada: es la molestia que se
quiere sacar).
- **B — Página de estado del pedido** (`/pedido/[id]`), para invitados: tarjeta "¿Querés códigos de descuento?
  Registrate con tu correo" → abre `LoginSheet`. Al registrarse, ese pedido queda asociado a la cuenta (así el
  próximo checkout ya trae nombre, celular y dirección).
- **C — Checkout, "¿Tenés un código de descuento?"** sin sesión: abre `LoginSheet` con el texto "Los códigos de
  descuento son para clientes registrados"; al terminar, se abre el campo del código.

## Diseño
**Carrito:** "Continuar con el pedido" va directo al checkout (se saca la `LoginSheet` de `Shop`).

**Checkout:** `AccountSection` sin sesión ya no abre la ventana ni pide verificar: muestra una línea discreta
"¿Ya tenés cuenta? Ingresá" (abre `LoginSheet`). Con sesión, igual que hoy ("Pedís como… · Salir"). El invitado
completa nombre, celular, entrega y pago como cualquiera.

**`LoginSheet`:** el texto de la primera pantalla cambia según desde dónde se abre (código / estado del pedido /
"ya tengo cuenta"); el paso del código de 6 dígitos queda igual.

**Servidor:**
- `POST /api/pedidos` acepta sin sesión. Migración 8: `orders.guest boolean NOT NULL DEFAULT false`;
  `StaffOrder.manual` pasa a ser `customer_id IS NULL AND NOT guest`, así los pedidos de invitados pitan y se
  ven como cualquier pedido web en la app (la app de escritorio no cambia).
- Límite de pendientes: registrados, 3 por cuenta (como hoy); invitados, 3 por celular. Se mantiene el límite
  por IP (20 por hora).
- Códigos de descuento: sin sesión, `POST /api/descuentos` y `POST /api/pedidos` rechazan cualquier código
  ("Los códigos son para clientes registrados."). Los días especiales (−15% en Combos) siguen para todos.
- `GET /api/pedidos/[id]`: un pedido de invitado se ve con el link (el id es un UUID imposible de adivinar); el
  de una cuenta, solo con esa sesión (como hoy).
- `POST /api/pedidos/[id]/asociar` (con sesión): un pedido de invitado pasa a la cuenta.

**Robots:** en el checkout, un campo oculto que una persona no ve ni completa (si llega con algo, se rechaza) y
el tiempo desde que se abrió el checkout (menos de 3 s, se rechaza con "Esperá un momento y probá de nuevo").

**Sin la bandera `PEDIDOS_POR_APP`** (WhatsApp) nada cambia: no hay cuentas y los códigos siguen como hoy.

## Queda a criterio de quien construye
Textos exactos de la tarjeta y de la ventana (español rioplatense, cortos), ubicación visual de la tarjeta en la
página de estado. Se muestran capturas reales antes de publicar.

## Documentación
Actualizar `CLAUDE.md` (decisión del antispam por correo, flujo de ingreso, códigos solo para registrados),
`docs/app-pedidos.md`, Privacidad (el invitado deja nombre y celular sin cuenta).
