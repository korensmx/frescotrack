# ❄️ FrescoTrack — Bitácora Digital y Cobranza Preventiva para Climas (Micro-SaaS B2B)

**FrescoTrack** es una solución Micro-SaaS B2B diseñada específicamente para técnicos de refrigeración y empresas de climatización en zonas de calor extremo (como Tampico, Ciudad Madero y Altamira, Tamaulipas).

Resuelve la pérdida de ingresos recurrentes automatizando el seguimiento de los ciclos de mantenimiento preventivo (cada 6 meses, o 4 meses en zona de salitre/playa y 3 meses en comercios) y conectándolo directamente con **etiquetas QR físicas** y **cobranza por WhatsApp en 1 solo clic**.

---

## 🚀 Características Principales

### 1. Centro de Mando del Técnico (Dashboard)
- **KPIs Superiores en Tiempo Real:**
  - 🚨 **Cobranza Preventiva Hoy:** Identifica equipos vencidos o por vencer esta semana con cálculo exacto de ingresos potenciales en MXN (ej. *"3 equipos = $2,950 MXN potenciales"*).
  - 📦 **Parque de Equipos:** Minisplits totales registrados y monitoreados.
  - 💵 **Servicios Este Mes:** Servicios concluidos e ingresos cobrados en el mes en curso.
- **Lista de Alertas de Hoy:**
  - Filtros instantáneos: *Vencidos y Urgentes*, *Por Vencer (7 días)*, *Al Día* y *Todos*.
  - Búsqueda en tiempo real por nombre de cliente, colonia (ej. Petrolera, Lomas de Rosales), marca o folio.
  - Semáforo de estado con días vencidos o días de vigencia restante.
  - **⭐ Botonazo de WhatsApp:** Abre `https://wa.me/52[TELEFONO]?text=...` con el mensaje dinámico oficial personalizado según cliente, equipo, ubicación y fecha.
  - Control de estado de cobranza: `Pendiente`, `Contactado`, `Agendado`.
  - Acción rápida *"Hice servicio hoy"*: renueva el ciclo en 1 clic y registra la ganancia.

### 2. Formulario Ultrarrápido de Registro (<45 segundos)
- Folio QR autogenerable (`FT-0042`) o manual.
- Datos del cliente con validación telefónica de 10 dígitos y chips rápidos de colonias de Tampico/Madero.
- Selectores rápidos de marca (Mirage, Carrier, York, Trane, LG, Midea, etc.), tonelaje (1, 1.5, 2, 3 Ton), tecnología (Inverter / Convencional) y ubicación.
- Selector de ciclo: 6 meses (Residencial normal), 4 meses (Playa Miramar / Salitre), 3 meses (Comercial / Restaurante).
- Animación de celebración con confeti y pantalla de éxito con vista previa del sticker y mensaje de bienvenida.

### 3. Vista Pública del Carnet de Salud Digital (`/equipo/[id_qr]`)
- Lo que ve el cliente final al escanear el sticker con la cámara de su celular sin instalar ninguna app:
  - Semáforo de salud del clima (Al día vs Requiere mantenimiento).
  - Ficha técnica completa del equipo.
  - Historial y bitácora de mantenimientos realizados con garantía vigente.
  - Tarjeta de presentación del técnico con foto, sello de certificación y teléfono.
  - **Botón Gigante Verde:** *"¿Falla, gotea o no enfría? Pedir Revisión por WhatsApp"* con todos los datos precargados para el técnico.

### 4. Generador de Plantilla de Stickers QR para Impresión
- Diseñado para hojas adheribles tamaño Carta (lotes de 6, 12 o 18 etiquetas).
- Códigos QR nítidos y escaneables generados en SVG.
- Encabezado oficial *"Escanea para garantía y soporte de tu clima"*, nombre del técnico y teléfono de soporte.
- Compatible con `window.print()` y reglas `@media print` para imprimir directo a vinil o papel adhesivo.

### 5. Ajustes y Personalización del Técnico
- Configuración de Nombre, Negocio (ej. *Climas del Golfo Tampico*), Teléfono de WhatsApp y Tarifas base (Residencial, Salitre y Comercial).
- Vista previa en tiempo real de la plantilla de WhatsApp.
- Botón para restaurar los datos semilla de Tampico en cualquier momento.

---

## 📍 Casos Semilla Precargados (Tampico, Madero y Altamira)

1. **Ing. Roberto Garza** | Col. Lomas de Rosales, Tampico | Mirage Inverter 1.5 Ton (Recámara Principal) | Vencido hace 6 meses y 4 días | $750 MXN.
2. **Dra. Patricia Gómez** | Consultorio Médica Salve / Playa Miramar | Carrier 2 Ton (Recepción) | Ciclo de 4 meses por salitre marino | $900 MXN.
3. **Restaurante "El Marisco Feliz"** | Zona Centro, Tampico | York 3 Ton (Comedor) | Ciclo comercial de 3 meses, por vencer | $1,200 MXN.
4. **Lic. Mariana Torres** | Fracc. Lagunas de Miralta, Altamira | LG Dual Inverter 1 Ton (Estudio) | Servicio reciente hace 20 días | $750 MXN.
5. **Arq. Fernando Villarreal** | Col. Petrolera, Tampico | Trane 2 Ton (Sala/Comedor) | Vencido hace 12 días | $850 MXN.
6. **CP. Karla Benavides** | Col. Unidad Nacional, Cd. Madero | Midea Inverter 1.5 Ton (Recámara 2) | Próximo en 5 días | $750 MXN.

---

## 🛠️ Tecnologías Utilizadas

- **React 19** + **TypeScript**
- **Vite 8**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **Lucide React** (Iconografía técnica y móvil)
- **qrcode.react** (Generación de códigos QR vectoriales de alta resolución)
- **canvas-confetti** (Microinteracciones de celebración)
- **LocalStorage API** (Persistencia local sin backend obligatorio para el MVP)

---

## 💻 Instrucciones para Ejecutar Localmente

```bash
# 1. Instalar dependencias (ya instaladas)
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción
npm run build
```

El servidor estará disponible en `http://localhost:5173/`.
