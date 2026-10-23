# FrescoTrack

Bitácora de minisplits para técnicos de aire acondicionado. Se pega un sticker QR en cada equipo, se registra en 3 pasos y la app avisa por WhatsApp cuándo le toca su mantenimiento (cada 6, 4 o 3 meses).

FrescoTrack is powered by **KORENS**.

## Qué hace

- **Radar**: a quién le toca servicio hoy, cuánto dinero está esperando y cuánto se rescató este mes.
- **Escanear**: lee el sticker con la cámara. Si el equipo es nuevo, se registra en 3 pasos; si ya existe, abre su historial.
- **WhatsApp**: cola de recordatorios. Con la Evolution API conectada salen solos desde el número del técnico; si no, se abre WhatsApp con el mensaje ya escrito.
- **Clientes**, **historial de cada equipo** y **ajustes** del negocio (precio, mensaje, contraseña).
- **Stickers QR** para imprimir. Cada código es único y queda apartado a nombre del técnico que lo imprimió.
- **Página pública** (`/e/FT-XXXXXXXX`): lo que ve el cliente al escanear el sticker, con botón para pedir revisión.
- **Suscripción Pro** de $299 MXN/mes con Mercado Pago (14 días de prueba gratis).
- Se instala en el celular como app (PWA) y abre aunque no haya señal.

## Cómo está armado

```
client/   La app que ve el técnico (React + Vite + Tailwind)
server/   El servidor y la base de datos (Node.js + Express + SQLite)
Dockerfile, docker-compose.yml   Para desplegar en Dokploy
```

Es un solo contenedor: el servidor guarda los datos en un archivo SQLite (en el volumen `frescotrack-data`) y también entrega la app.

## Probarlo en tu computadora

Necesitas Node.js 22 o más nuevo.

```bash
# Terminal 1: el servidor
cd server && npm install && npm run dev

# Terminal 2: la app
cd client && npm install && npm run dev
```

Abre http://localhost:5173. Para correr las pruebas del servidor: `cd server && npm test`.

## Desplegar en Dokploy

1. En Dokploy crea un servicio **Docker Compose** apuntando a este repositorio (rama `main`).
2. En **Environment** copia las variables de `.env.example` y llénalas. La única obligatoria es `JWT_SECRET`.
3. En **Domains** agrega `frescotrack.korensmx.com`, servicio `app`, puerto `3000`, con HTTPS.
4. Presiona **Deploy**.

### WhatsApp (Evolution API)

Pon `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` de tu Evolution API. Cada técnico conecta su WhatsApp Business desde la pestaña WhatsApp escaneando un QR (se crea una instancia `ft-<id>` para cada uno). La llave nunca sale del servidor.

### Mercado Pago

1. Crea una aplicación en https://www.mercadopago.com.mx/developers y copia el **Access Token** de producción en `MP_ACCESS_TOKEN`.
2. En la aplicación, ve a **Webhooks**, pon la URL `https://frescotrack.korensmx.com/api/billing/webhook`, marca el evento **Suscripciones (subscription_preapproval)** y copia la **clave secreta** en `MP_WEBHOOK_SECRET`.

Cuando el técnico paga, Mercado Pago avisa al servidor y su cuenta pasa a Pro sola. Si se acaba la prueba y no ha pagado, puede ver sus datos pero no agregar ni cambiar nada.

## Respaldo

La base de datos vive en el volumen `frescotrack-data` (`/app/data/frescotrack.db`). Haz copias de ese volumen desde Dokploy (Volume Backups) para no perder datos.
