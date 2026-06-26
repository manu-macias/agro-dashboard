#!/usr/bin/env node
/**
 * update-data.mjs — actualizador de precios diarios para Agro Dashboard.
 *
 * Genera/actualiza ../data/precios.json con dos series diarias:
 *   - dolar : Dólar MEP ($/USD)        — fuente: ArgentinaDatos (historia diaria completa)
 *   - soja  : Pizarra Rosario ($/tn)   — fuente: indicadores.ar (valor diario actual)
 *
 * Es 100% autónomo (Node 18+, sin dependencias) y portable: lo puede correr
 * un GitHub Action, un cron en cualquier servidor, o vos a mano:
 *     node scripts/update-data.mjs
 *
 * Estrategia:
 *   - El dólar tiene historia diaria gratis, así que se rebaja a los últimos
 *     DAYS días y se reescribe completo en cada corrida (fuente autoritativa).
 *   - La soja NO tiene una API gratis con historia diaria, así que se conserva
 *     lo que ya haya en el archivo (semilla mensual + lo acumulado) y se agrega
 *     el valor de hoy scrapeado. La serie se va volviendo diaria con el tiempo.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "..", "data", "precios.json");
const DAYS = 400; // ~13 meses de ventana

// Semilla histórica de soja (pizarra Rosario $/tn, mensual) para que el gráfico
// no arranque vacío. Se usa solo si el archivo todavía no tiene esos puntos.
const SOJA_SEED = [
  ["2025-03-15", 329000], ["2025-04-15", 314000], ["2025-05-15", 310000],
  ["2025-06-15", 322000], ["2025-07-15", 335000], ["2025-08-15", 389000],
  ["2025-09-15", 436000], ["2025-10-15", 482000], ["2025-11-15", 485000],
  ["2025-12-15", 495000], ["2026-01-15", 480000], ["2026-02-15", 466000],
  ["2026-03-15", 484000], ["2026-04-15", 431000], ["2026-05-15", 455000],
  ["2026-06-15", 465000],
];

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

async function fetchJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": "agro-dashboard/1.0" } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 agro-dashboard" } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
}

/** Dólar MEP diario desde ArgentinaDatos (casa "bolsa"). Devuelve [{fecha, valor}]. */
async function getDolar() {
  const raw = await fetchJson("https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa");
  const cutoff = daysAgo(DAYS);
  return raw
    .filter((d) => d.fecha >= cutoff && d.venta)
    .map((d) => ({ fecha: d.fecha, valor: Math.round(d.venta) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Soja pizarra Rosario ($/tn) — valor diario actual scrapeado de indicadores.ar. */
async function getSojaHoy() {
  const html = await fetchText("https://indicadores.ar/indicadores-economicos/soja-rosario");
  // Busca "Soja Rosario: $480.000/ton" (formato argentino con puntos de miles).
  const m = html.match(/Soja Rosario:\s*\$?\s*([\d.]+)\s*\/?\s*ton/i);
  if (!m) throw new Error("No se pudo extraer el precio de soja de indicadores.ar");
  const valor = Number(m[1].replace(/\./g, ""));
  if (!Number.isFinite(valor) || valor < 50000) throw new Error(`Valor de soja sospechoso: ${m[1]}`);
  return { fecha: today(), valor };
}

/** Mergea puntos nuevos en una serie [{fecha,valor}], dedup por fecha (el nuevo pisa). */
function mergeSeries(prev = [], next = []) {
  const map = new Map(prev.map((p) => [p.fecha, p.valor]));
  for (const p of next) map.set(p.fecha, p.valor);
  return [...map.entries()]
    .map(([fecha, valor]) => ({ fecha, valor }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch {
    return { dolar: [], soja: [] };
  }
}

async function main() {
  const prev = await loadExisting();

  // Dólar: serie autoritativa, se reescribe.
  let dolar = prev.dolar || [];
  try {
    dolar = await getDolar();
    console.log(`✓ dólar: ${dolar.length} puntos diarios (${dolar.at(0)?.fecha} → ${dolar.at(-1)?.fecha})`);
  } catch (e) {
    console.error(`✗ dólar: ${e.message} — conservo lo previo (${dolar.length} puntos)`);
  }

  // Soja: semilla mensual + acumulado + valor de hoy.
  const seed = SOJA_SEED.map(([fecha, valor]) => ({ fecha, valor }));
  let soja = mergeSeries(seed, prev.soja || []);
  try {
    const hoy = await getSojaHoy();
    soja = mergeSeries(soja, [hoy]);
    console.log(`✓ soja: hoy $${hoy.valor.toLocaleString("es-AR")}/tn · ${soja.length} puntos en total`);
  } catch (e) {
    console.error(`✗ soja: ${e.message} — conservo lo previo (${soja.length} puntos)`);
  }

  // Recorta ambas series a la ventana.
  const cutoff = daysAgo(DAYS);
  dolar = dolar.filter((p) => p.fecha >= cutoff);
  soja = soja.filter((p) => p.fecha >= cutoff);

  const out = {
    updated: new Date().toISOString(),
    fuentes: {
      dolar: "ArgentinaDatos — Dólar MEP (https://argentinadatos.com)",
      soja: "indicadores.ar — Pizarra Rosario (https://indicadores.ar)",
    },
    dolar,
    soja,
  };

  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(out, null, 2) + "\n");
  console.log(`→ escrito ${DATA_FILE}`);
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});
