---
target: checkout
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:A:\\Cosas Alejo\\Proyectos\\EnSushiWeb\\sushi-app\\src\\app\\checkout"
timestamp: 2026-10-22T01-08-02Z
slug: src-app-checkout
---
# Critique: checkout (src/app/checkout → src/components/checkout)

Method: dual-agent (A: design review · B: detector + browser)
Brief: elegir entrega y pago (el horario lo define el local por WhatsApp), ver el total con envío y mandar el pedido por WhatsApp sin dudas.

## Design Health Score: 25/40 (Acceptable)

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Total en el botón (bien), pero en mobile el desglose Subtotal/Envío/Total queda debajo del CTA |
| 2 | Match System / Real World | 3 | "De 17:00 a 23:30" en cada día parece un turno reservable; "Te habilitaremos la transferencia" es formal |
| 3 | User Control and Freedom | 2 | "Editar" y "Volver al menú" pierden nombre, día, dirección y pago (estado en useState) |
| 4 | Consistency and Standards | 3 | Aviso de transferencia dicho dos veces (Checkout.tsx:44 y :118) |
| 5 | Error Prevention | 2 | Día, entrega y pago arrancan vacíos; window.open puede bloquearse en webviews |
| 6 | Recognition Rather Than Recall | 3 | En mobile el resumen no se ve mientras se completa el form |
| 7 | Flexibility and Efficiency | 2 | No recuerda nombre/dirección de clientes habituales de fin de semana |
| 8 | Aesthetic and Minimalist Design | 2 | El selector de día (~640px en 390px) domina la pantalla |
| 9 | Error Recovery | 3 | Foco al primer campo inválido y mensajes claros; el bloqueo de las 20:00 queda lejos del selector de día |
| 10 | Help and Documentation | 2 | No dice qué pasa después de enviar; "Se abre WhatsApp…" en text-subtle (4.1:1) |

## Design Specificity Verdict
LLM: tokens y voz de "La barra de noche" aplicados con criterio (salmón solo en selección/CTA, Cormorant en títulos, voseo), pero el esqueleto es un checkout genérico de e-commerce: pila de fieldsets + resumen lateral que en mobile cae debajo del botón. El momento de cierre (total, envío, pase a WhatsApp) es el menos diseñado.
Detector: CLI limpio (0 hallazgos en src/app/checkout y src/components/checkout). Overlay en navegador: 3 hallazgos (Retiro+Efectivo), 5 (Envío+Transferencia): 4 low-contrast que salen todos de --color-subtle #75716a (globals.css:12): placeholders 3.8:1 (advisory), "Se abre WhatsApp…" Checkout.tsx:315 4.1:1, hint de dirección Input.tsx:38 4.1:1; 1 overused-font (Geist) = falso positivo, es la dupla de marca de DESIGN.md. Coincide con la observación de A sobre text-subtle, que DESIGN.md ya prohíbe para info necesaria.

## Priority Issues
1. [P0] "¿Para cuándo?" contradice el brief y domina el checkout. 6 tarjetas a ancho completo (~640px) con "De 17:00 a 23:30" cada una (Checkout.tsx:53), obligatorio, y única fuente de bloqueo (Checkout.tsx:312). Fix: default al próximo día de apertura, colapsado a una línea "Para: Hoy · sáb 24/10 · Cambiar"; sacar el rango horario; agregar "El horario lo coordinamos por WhatsApp"; mostrar el bloqueo de las 20:00 solo cuando aplica y junto al día, con atajo "Elegir otro día". → /impeccable distill, /impeccable clarify
2. [P1] En mobile el desglose Subtotal/Envío/Total aparece debajo del botón. Fix: bloque compacto Subtotal/Envío/Total justo arriba del CTA en mobile, o "Incluye envío $3.000" bajo el botón. → /impeccable layout
3. [P1] Salir a editar pierde el formulario. Fix: persistir el form (sessionStorage o store con persist), recordar nombre y dirección en localStorage, o editar cantidades inline con QuantityStepper. → /impeccable harden
4. [P2] Copy de transferencia duplicado y fuera de tono, sin el "no transfieras todavía". Fix: un solo mensaje en el aviso: "No transfieras todavía: cuando confirmemos tu pedido por WhatsApp te pasamos el alias y el total. Después mandás el comprobante por el mismo chat." Tarjeta: "Por Mercado Pago." → /impeccable clarify
5. [P2] Pase a WhatsApp frágil y carrito que queda viejo. window.open (Checkout.tsx:202) se bloquea en webviews de Instagram/Facebook; SentScreen dice "de nuevo"; no dice qué sigue; el carrito solo se vacía con un toque explícito. Fix: <a href> o location.href; "Abrir WhatsApp"; línea "Te confirmamos por WhatsApp"; ofrecer vaciar al volver. Subir --color-subtle o usar muted para "Se abre WhatsApp…", "Retirás en" y hints. → /impeccable harden, /impeccable polish

## Persona Red Flags
- Casey: ~1.900px de página, 6 tarjetas de día antes de Entrega, CTA al fondo sin acción fija, errores de a uno.
- Riley: "aa" pasa como nombre, "aaaaa" como dirección; "Hoy" desaparece pasadas las 23:30 pero queda seleccionado hasta el submit; dos pestañas = pedido duplicado.
- Jordan: no sabe si "Sábado · De 17:00 a 23:30" reserva un turno; no sabe cuándo llega ni si está confirmado.
- Vecino de Arrecifes, sábado 21:30 con Arma tu combo: elige Hoy, botón gris deshabilitado, alerta ~1.000px abajo del selector de día, sin atajo; preferiría mandar y que el local le diga.

## Minor Observations
- text-subtle en "Retirás en" (:293), "Se abre WhatsApp…" (:315), hint de dirección (Input.tsx:38).
- Tarjeta de retiro sin horario ni link a mapa.
- h1 de 36px en mobile ocupa mucho; "← Volver al menú" de 14px es un blanco de toque chico.
- Error de dirección fuera de vista cuando el foco va a Nombre.

## Questions to Consider
- Si el horario lo define el local, ¿la web necesita saber el día, o alcanza "Hoy / Otro día (lo arreglamos por chat)"?
- ¿Debería la web deshabilitar alguna vez el botón de envío, o es mejor que el local responda "hoy no, ¿mañana?"?
- ¿Y si el checkout fuera una sola pantalla: resumen y total arriba, dos elecciones binarias, nombre/dirección y enviar?
