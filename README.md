# EnSushi — Pedidos online

Web de pedidos para EnSushi. El cliente arma el carrito (incluido "Arma tu combo"), completa el checkout y el pedido se envía por WhatsApp al local. Todo corre en el navegador: no hay backend ni base de datos.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Zustand

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
```

Antes de commitear:

```bash
npx tsc --noEmit
npm run lint
```

Build de producción: `npm run build` y después `npm start`.

## Dónde se edita cada cosa

| Qué | Archivo |
| --- | --- |
| Productos, precios, sabores, menú del día | `src/data/menu.ts` |
| WhatsApp, dirección del local, etiquetas de pago y entrega | `src/config/business.ts` |
| Colores y tipografía (tokens del tema) | `src/app/globals.css` |
| Mensaje de WhatsApp | `src/services/whatsappService.ts` |
| Fotos de productos | `public/images/menu/` |

El alias y el CVU para transferencias **no** van en el código: el local los manda por WhatsApp al confirmar el pedido.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (ej. `https://ensushi.com.ar`), usada en los links de Open Graph. Opcional en Vercel. |

## Estado

Los pendientes antes del lanzamiento están en `CLAUDE.md` (sección "Pendientes antes de salir a producción").
