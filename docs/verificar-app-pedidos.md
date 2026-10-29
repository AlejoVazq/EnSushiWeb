# Qué verificar a mano (app de pedidos)

Para probar en local:
- **Web:** `npm run dev` → http://localhost:3000 (en el celu o en otra PC de la misma red: `http://<IP de la PC>:3000`).
- **App del local:** `cd desktop && npm start` (o el instalador de `npm run dist`, con el servidor `http://<IP de la PC>:3000` en Ajustes). Usuario y contraseña: los de `DEV_LOCAL_USUARIO` / `DEV_LOCAL_CLAVE` en `.env.development.local`.
- **Si hoy el local está cerrado,** agregá la fecha de hoy a `extraOpenDates` en `src/config/business.ts` para probar con la hora real, sin commitearlo. **Hay que sacarla al terminar.**
- El **código de 6 dígitos** de la cuenta no llega por correo (no hay SMTP): sale en la consola del servidor (`[dev] Código para …`). Pedímelo o mirá la consola si levantás `npm run dev` vos.
- Pasadas las 19:30 los rolls y nigiris están cortados (es lo esperado). Para armar una caja, abrí la web con `?ahora=2026-10-30T18:00`. Ojo: con `?ahora` la web mira **otro día**, así que no ve los agotados/pausa que marques desde la app (la app siempre usa el día real). Para probar agotados y pausa, usá la web **sin** `?ahora`.

## 1. Agotados del día (app → web)
- [ ] En la app, botón **Menú**: se ve "Menú de hoy (DD/MM)" con todas las pestañas.
- [ ] Marcá un combo y una sushiburger como agotados. En la web (recargá o esperá ≤ 1 min) se ven desteñidos con "Agotado hoy" y sin "+".
- [ ] Antes de marcarlo, poné ese producto en el carrito; después de marcarlo, la línea dice "Se agotó hoy: sacalo para seguir" y "Continuar" queda apagado. Al sacarlo, vuelve a andar.
- [ ] Con algo agotado ya en el checkout: aparece el aviso arriba y el botón de enviar se apaga.
- [ ] "Volvió a haber" en la app lo devuelve a la web.
- [ ] ¿Te sirve marcar el producto entero (todos los tamaños)? ¿O hace falta por tamaño (ej. solo el de 40)?

## 2. Pausar pedidos
- [ ] En **Menú**, "Pausar pedidos" pide confirmación. Después aparece la barra roja arriba de la lista con "Reanudar".
- [ ] En la web: la banda, el carrito y el checkout dicen "Por hoy no tomamos más pedidos. Abrimos el viernes…" y no se puede mandar.
- [ ] "Reanudar" lo vuelve a la normalidad.

## 3. Pedido de punta a punta
- [ ] En la web (celular si podés): carrito → checkout → cuenta con correo y código → celular → "Enviar pedido". Queda en la página de estado.
- [ ] La app pita, el pedido aparece con "(recién)" y después "(hace N min)".
- [ ] **No lo respondas 3 minutos:** tiene que volver a pitar, y de nuevo cada 2 min. ¿El volumen y la frecuencia te parecen bien?
- [ ] Confirmá con +15/+30/+45: se abre WhatsApp con el mensaje (no lo mandes a un cliente real). La página de estado de la web cambia sola en ≤ 10 s.
- [ ] Arriba de la lista: "Hoy: N confirmados · $X" suma bien.
- [ ] Otro pedido, rechazalo con motivo: la web lo muestra.
- [ ] Imprimir: sin la TM-T20, probá con "Microsoft Print to PDF" en Ajustes y mirá que la comanda se lea.

## 4. Códigos de descuento (app → checkout)
- [ ] En **Códigos**, creá uno (%, y otro de monto fijo). Usalo en el checkout: el total baja igual en la web y en el pedido que llega a la app.
- [ ] Pausalo y probá usarlo: el checkout lo rechaza.

## 5. Que `main` no cambió
- [ ] Nada de esto aparece sin las banderas. (Lo verifico yo antes de cualquier push si querés: `main` sigue siendo la versión con WhatsApp.)

## 6. Lo que solo podés hacer vos
- [ ] Decidir qué pasa con los pedidos que nadie responde (hoy solo vuelve a pitar).
- [ ] Servidor real, cuenta SMTP, TM-T20 con su driver y WhatsApp en la PC del local (ver `docs/app-pedidos.md`).
- [ ] Diseño de la app y del checkout con cuenta (`/impeccable shape`).

## Al terminar
- [ ] Sacar la fecha de prueba de `extraOpenDates`, si la agregaste.
