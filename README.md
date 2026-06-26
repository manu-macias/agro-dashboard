# 🌾 Agro Dashboard — Soja vs Dólar

**[→ Ver demo en vivo](https://manu-macias.github.io/agro-dashboard/)**

Herramienta de decisión para productores agropecuarios argentinos. Ayuda a determinar cuándo conviene vender soja vs. dólares en base a precios actuales, promedios históricos y contexto personal.

---

## Stack

- **Frontend:** React 18 (sin bundler — `React.createElement` puro, sin JSX/Babel para compatibilidad con GitHub Pages CSP)
- **Gráfico:** Chart.js (líneas, doble eje soja/dólar)
- **Datos de precios:** `prices.json` con serie diaria, regenerado por un GitHub Action (ver abajo)
- **Datos de ventas (producción):** Google Sheets privado → Google Apps Script Web App (API REST) → fetch desde el cliente
- **Deploy:** GitHub Pages (sitio estático, cero infraestructura)
- **Auth en producción:** pantalla de login con hash SHA-256 via Web Crypto API + sessionStorage

## Funcionalidades

### 📊 Decisión
- Precio de soja (BCR Rosario) y dólar oficial autocompletados con el dato del día
- Algoritmo de scoring que pondera precio relativo al promedio, stock disponible, urgencia y expectativas
- Veredicto visual con explicación de cada factor
- Gauge de presión soja vs. dólares

### ⚙️ Mi situación
- Sliders de stock de dólares/soja, urgencia de pesos y expectativa de precio
- Calculadora de equivalencia en pesos (cuánto genera vender X tn de soja vs. X USD)

### 📅 Historial
- **Ventas campaña:** tabla por socio con toneladas vendidas mes a mes, stock inicial y resto
- **Precios:** gráfico de evolución **diaria** de dólar oficial y pizarra de soja, más tabla mensual
- **Registros manuales:** log de decisiones tomadas guardado en localStorage

## Datos de precios (diarios)

El gráfico y los precios "de hoy" salen de [`prices.json`](prices.json), que regenera a diario [`scripts/update_prices.py`](scripts/update_prices.py) vía GitHub Action ([`update-prices.yml`](.github/workflows/update-prices.yml)).

| Serie | Fuente | Detalle |
|-------|--------|---------|
| Dólar Oficial $/USD | [dolarapi.com](https://dolarapi.com) (valor del día) · [ArgentinaDatos](https://argentinadatos.com) (backfill histórico) | Serie **diaria completa** |
| Soja pizarra Rosario $/tn | [Cámara Arbitral BCR](https://www.cac.bcr.com.ar/es/precios-de-pizarra) | Valor diario del día; ver nota abajo |

`prices.json` guarda `"history": [{ fecha, soja, dolar }, ...]` además de los campos snapshot (`soja`, `dolar`, `fecha`) por compatibilidad.

**Sobre la resolución de la soja:** no existe una fuente gratis con la pizarra Rosario diaria histórica en pesos, así que la serie arranca con anclas mensuales reales y **se densifica un punto real por día** a medida que corre el Action (no se interpolan ni estiman valores). El dólar, en cambio, es diario desde el inicio gracias al backfill.

El Action corre de lunes a viernes a las **18:30 ART** (`30 21 * * 1-5` UTC), después de que la CAC publica la pizarra del día, para que cada punto sea el del mismo día.

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

*Precios (soja y dólar) reales y actualizados a diario. Las ventas por socio son datos de demostración; la versión en producción las conecta en tiempo real con Google Sheets.*
