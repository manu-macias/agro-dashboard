# 🌾 Agro Dashboard — Soja vs Dólar

**[→ Ver demo en vivo](https://manu-macias.github.io/agro-dashboard/)**

Herramienta de decisión para productores agropecuarios argentinos. Ayuda a determinar cuándo conviene vender soja vs. dólares en base a precios actuales, promedios históricos y contexto personal.

---

## Stack

- **Frontend:** React 18 (sin bundler — `React.createElement` puro, sin JSX/Babel para compatibilidad con GitHub Pages CSP)
- **Datos en producción:** Google Sheets privado → Google Apps Script Web App (API REST) → fetch desde el cliente
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
- **Precios históricos:** dólar blue + precio soja MAR 2025 → presente
- **Registros manuales:** log de decisiones tomadas guardado en localStorage

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
