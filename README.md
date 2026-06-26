# 🌾 Agro Dashboard — Soja vs Dólar

**[→ Ver demo en vivo](https://manu-macias.github.io/agro-dashboard/)**

Herramienta de decisión para productores agropecuarios argentinos. Ayuda a determinar cuándo conviene vender soja vs. dólares en base a precios actuales, promedios históricos y contexto personal.

---

## Stack

- **Frontend:** React 18 (sin bundler — `React.createElement` puro, sin JSX/Babel para compatibilidad con GitHub Pages CSP)
- **Datos de precios:** archivo estático `data/precios.json` regenerado a diario por un script Node portable (ver abajo)
- **Datos de ventas (producción):** Google Sheets privado → Google Apps Script Web App (API REST) → fetch desde el cliente
- **Deploy:** GitHub Pages (sitio estático, cero infraestructura)
- **Auth en producción:** pantalla de login con hash SHA-256 via Web Crypto API + sessionStorage

## Funcionalidades

### 📊 Decisión mensual
- Ingreso de precio actual de soja (BCR Rosario) y dólar MEP/CCL
- Algoritmo de scoring que pondera precio relativo al promedio, stock disponible, urgencia y expectativas
- Veredicto visual con explicación de cada factor
- Gauge de presión soja vs. dólares

### ⚙️ Mi situación
- Sliders de stock de dólares/soja, urgencia de pesos y expectativa de precio
- Calculadora de equivalencia en pesos (cuánto genera vender X tn de soja vs. X USD)

### 📅 Historial
- **Ventas campaña:** tabla por socio con toneladas vendidas mes a mes, stock inicial y resto
- **Precios:** gráfico de evolución **diaria** (SVG, sin dependencias) de dólar MEP y pizarra de soja, más tabla mensual derivada
- **Registros manuales:** log de decisiones tomadas guardado en localStorage

## Datos de precios (diarios)

El gráfico y los precios "de hoy" salen de [`data/precios.json`](data/precios.json), un archivo estático que regenera [`scripts/update-data.mjs`](scripts/update-data.mjs):

| Serie | Fuente | Detalle |
|-------|--------|---------|
| Dólar MEP $/USD | [ArgentinaDatos](https://argentinadatos.com) (`/cotizaciones/dolares/bolsa`) | Historia diaria completa, CORS libre |
| Soja pizarra Rosario $/tn | [indicadores.ar](https://indicadores.ar) | Valor diario actual; la serie se densifica día a día |

El script es **autónomo y portable** (Node 18+, sin dependencias). Lo corre un GitHub Action diario ([`.github/workflows/update-data.yml`](.github/workflows/update-data.yml)), pero también podés agendarlo con un cron en cualquier servidor:

```bash
node scripts/update-data.mjs   # actualiza data/precios.json
```

La página lo lee con ruta **relativa** (`fetch("./data/precios.json")`), así que funciona igual en GitHub Pages, Netlify, un VPS o abierta como archivo. Si el JSON no está disponible, cae a datos de demostración embebidos.

## Arquitectura de datos (producción)

```
Google Sheet (privada)
        ↕
Google Apps Script doGet()   ← corre con cuenta del owner, lee la hoja
        ↕  ?token=secreto
fetch() desde el cliente      ← al cargar la app, después del login
        ↕
Estado React (useState)
```

El sheet nunca se expone públicamente. El Apps Script actúa de proxy autenticado; el token en la URL previene acceso no autorizado al endpoint.

## Cómo correrlo localmente

```bash
# Sin dependencias — abrí el archivo directamente
open index.html
```

O con cualquier servidor estático:

```bash
npx serve .
python3 -m http.server 8080
```

---

*Demo con datos ficticios. La versión en producción conecta en tiempo real con Google Sheets.*
