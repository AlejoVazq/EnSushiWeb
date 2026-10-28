# Pedidos por la app del local

En lugar de abrir WhatsApp, el cliente manda el pedido a nuestro servidor. La app de escritorio del local
(`desktop/`) lo recibe, el local elige el horario aproximado o lo rechaza, y la app abre WhatsApp con el mensaje
para el cliente. El cliente también ve el estado en la web (`/pedido/[id]`).

```
Celular (web) ──POST /api/pedidos──▶ Servidor (Next.js + PostgreSQL) ◀──cada 5 s── App del local (Electron)
      ▲                                                                                │
      └──── /pedido/[id] (cada 10 s) ◀── confirmado 21:15 / rechazado ─────────────────┘
                                                              WhatsApp al cliente ◀────┘
```

Todo está detrás de `PEDIDOS_POR_APP=1`. Sin esa variable la web funciona como siempre (pedido por WhatsApp) y
la API responde 404.

## Cómo funciona

- **Cliente:** en el checkout ingresa con su correo (le llega un código de 6 números, una sola vez por celular:
  la sesión dura 60 días) y deja su celular. "Enviar pedido" lo manda al servidor y lo lleva a la página del
  pedido, que se actualiza sola.
- **Servidor:** rearma el carrito desde `src/data/menu.ts` y recalcula precios, descuento y total (nunca usa los
  precios que manda el celular). Rechaza pedidos fuera de horario, celulares inválidos y más de 3 pedidos
  esperando respuesta por cliente. Limita códigos e intentos por IP.
- **Local:** la app muestra los pedidos de las últimas 18 horas, suena con cada pedido nuevo, deja elegir la
  hora aproximada (+15/+30/+45/+60 min o a mano) y editar el mensaje antes de abrir WhatsApp. El alias para
  transferencias se carga en Ajustes de la app y va solo en ese mensaje: nunca está en la web.
- **Códigos de descuento:** el botón "Códigos" de la app crea, edita, pausa y borra códigos (porcentaje o monto
  fijo, fechas opcionales, cantidad de usos en total y "una vez por cliente"). Funcionan en la web apenas se
  guardan, sin deployar. Los pedidos rechazados no cuentan como uso. Los de `npm run codigo` siguen andando.

## Servidor

Requisitos: Linux (Ubuntu 24.04 o similar), Node.js 24, PostgreSQL 16+, y un proxy con HTTPS (Caddy es lo más
simple: saca y renueva el certificado solo).

Variables de entorno (en `.env.production.local` del servidor, nunca en git):

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | `postgres://usuario:clave@localhost:5432/ensushi` |
| `PEDIDOS_POR_APP=1` | Activa la API de pedidos |
| `NEXT_PUBLIC_PEDIDOS_POR_APP=1` | Activa el checkout nuevo (se lee al hacer el build) |
| `SMTP_URL` | Cuenta de correo para mandar los códigos: `smtps://usuario:clave@smtp.proveedor.com:465` |
| `MAIL_FROM` | Remitente, ej. `EnSushi <pedidos@ensushi.com.ar>` |
| `NEXT_PUBLIC_SITE_URL` | La URL final, ej. `https://ensushi.com.ar` |

Pasos:

1. `npm ci && npm run build`
2. `npm run local-usuario -- cocina` (pide la contraseña; crea las tablas si no existen)
3. `npm run start` detrás del proxy (con un servicio de systemd o pm2 para que arranque solo).
4. Backups: ver "Backups" más abajo.
5. Carpeta para las actualizaciones de la app (ver "Instalador y actualizaciones").

Las tablas se crean y actualizan solas al arrancar (`src/server/schema.ts`; nunca se edita una migración que ya
corrió: se agrega una nueva al final).

**Correo:** los códigos necesitan una cuenta SMTP que entregue bien (si no, caen en spam). Sirve la del dominio
(ej. Zoho, Google Workspace) o un servicio de envío con SMTP (Brevo, Resend, Amazon SES). Montar un servidor de
correo propio no conviene: los correos no llegan.

## Desarrollo

- Sin `DATABASE_URL`, el servidor usa PGlite (PostgreSQL dentro de Node) en `.data/pglite`: no hay que instalar nada.
- Sin `SMTP_URL`, el código de ingreso aparece en la consola de `npm run dev`.
- `.env.development.local` (no se sube) activa todo con `PEDIDOS_POR_APP=1` y `NEXT_PUBLIC_PEDIDOS_POR_APP=1`.
- `npm run local-usuario -- prueba` crea un usuario de la app (con PGlite, pará `npm run dev` antes: solo un
  proceso puede abrir la base a la vez).
- La hora simulada (`?ahora=`) también vale para el servidor en desarrollo: el checkout la manda con el pedido.

## App de escritorio (`desktop/`)

```
cd desktop
npm install
npm start          # compila y abre la app
npm run typecheck
```

- Primera vez: Ajustes → dirección del servidor (`http://localhost:3000` en desarrollo), ticketera, alias.
- Ingreso con el usuario creado con `npm run local-usuario`. El token queda cifrado con la cuenta de Windows.
- **Ticketera Epson TM-T20 (USB):** instalar el driver de Windows de Epson ("EPSON Advanced Printer Driver" para
  TM-T20) para que aparezca como impresora. En Ajustes se elige, se marca el ancho (80 mm) y "Imprimir prueba".
  El corte de papel se configura en las preferencias del driver.
- `ENSUSHI_SIN_WHATSAPP=1 npm start` (solo desarrollo) escribe el link de WhatsApp en la consola en vez de abrirlo.

### Instalador y actualizaciones

```
cd desktop
npm run dist       # arma release/EnSushi-Local-Setup-<versión>.exe y release/latest.yml
```

- **Instalar en la PC del local:** copiar el `.exe` y abrirlo. Se instala solo (sin preguntas) con acceso
  directo en el escritorio. Como no está firmado, Windows muestra "Windows protegió su PC": tocar
  "Más información" → "Ejecutar de todos modos" (una sola vez). Firmarlo cuesta un certificado pago; no hace falta.
- **Actualizaciones:** la app busca versiones nuevas al abrir y cada 6 horas en `<servidor>/app-local/` (la misma
  dirección de Ajustes). La baja sola; se instala al cerrar la app o con "Actualizar ahora" en la barra de la
  izquierda. Nunca se reinicia sola en medio de un pedido.
- **Publicar una versión:** subir `version` en `desktop/package.json` (0.1.0 → 0.1.1), `npm run dist` y copiar
  al servidor los tres archivos de `release/`: `latest.yml`, `EnSushi-Local-Setup-<versión>.exe` y su `.blockmap`.
- **En el servidor**, Caddy sirve esa carpeta además de la web:

  ```
  ensushi.com.ar {
      handle_path /app-local/* {
          root * /srv/ensushi/app-local
          file_server
      }
      reverse_proxy localhost:3000
  }
  ```

## Backups

`scripts/backup-db.sh` hace un `pg_dump` comprimido por día en `/var/backups/ensushi` (o `BACKUP_DIR`), guarda
los últimos 14 (`BACKUP_DIAS`) y una copia del día 1 de cada mes durante un año. Con `BACKUP_REMOTO`
(`usuario@otra-maquina:/carpeta`) además copia cada backup a otra máquina con `rsync`: un backup que vive solo en
el mismo servidor no sirve si se pierde el servidor.

Para que corra todos los días a las 5:00 (el local ya cerró), con systemd:

```
sudo cp deploy/ensushi-backup.service deploy/ensushi-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ensushi-backup.timer
sudo systemctl start ensushi-backup.service   # probarlo ahora
ls -lh /var/backups/ensushi
```

El servicio lee `DATABASE_URL` (y las variables de arriba) de `/etc/ensushi/backup.env`, que se crea una vez con
`sudo install -m 600 /dev/null /etc/ensushi/backup.env` y se completa con `DATABASE_URL=postgres://…`. Supone la
web en `/srv/ensushi/web`; si está en otra carpeta, cambiar `ExecStart` en el `.service`. Para volver a un backup:
`pg_restore --clean --no-owner --dbname="$DATABASE_URL" /var/backups/ensushi/ensushi-AAAA-MM-DD.dump`.
