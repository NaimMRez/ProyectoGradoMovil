/**
 * Verificación de contraste de la paleta.
 *
 * Lee los valores del propio `colors.ts` — no una copia — y comprueba cada par
 * que se toca en pantalla contra los mínimos de la WCAG. Es la evidencia del
 * RNF-11 y la red que impide que un retoque de color rompa la legibilidad sin
 * que nadie se entere.
 *
 * Texto: 4,5:1. Separación entre superficies contiguas: 1,09:1 — por debajo de
 * ahí dos superficies se leen como una.
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/theme/colors.ts', import.meta.url), 'utf8');
const val = (bloque, clave) => {
  const cuerpo = src.split(`export const ${bloque} =`)[1].split('} as const')[0];
  const m = cuerpo.match(new RegExp(`\\b${clave}:\\s*'(#[0-9a-f]{6})'`, 'i'));
  if (m) return m[1];
  // Los alias (`pildora: verde.primario`) se resuelven al token al que apuntan.
  const alias = cuerpo.match(new RegExp(`\\b${clave}:\\s*(\\w+)\\.(\\w+)`));
  if (alias) return val(alias[1], alias[2]);
  throw new Error(`no encuentro ${bloque}.${clave}`);
};

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
const R = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

let fallos = 0, total = 0;
const ok = (etiqueta, fg, bg, min) => {
  total += 1;
  const r = R(fg, bg);
  if (r < min) fallos += 1;
  console.log(`  ${r >= min ? '✓' : '✗'} ${etiqueta.padEnd(46)} ${r.toFixed(2).padStart(5)} (mín ${min})`);
};

const BLANCO = val('superficie', 'tarjeta');
const BEIGE = val('superficie', 'aviso');
const TEXTO_MIN = 4.5, SUP_MIN = 1.09;

console.log(`\nFondo ${val('superficie','app')} · beige ${BEIGE} · verde ${val('verde','primario')}\n`);

console.log('── TEXTO SOBRE BLANCO ──');
for (const k of ['principal', 'secundario', 'terciario', 'suave', 'tenue', 'atenuado', 'etiqueta'])
  ok(`texto.${k}`, val('texto', k), BLANCO, TEXTO_MIN);

console.log('── TEXTO SOBRE EL PANEL BEIGE ──');
for (const k of ['principal', 'secundario', 'terciario', 'suave', 'tenue', 'atenuado', 'etiqueta'])
  ok(`texto.${k}`, val('texto', k), BEIGE, TEXTO_MIN);

console.log('── VERDES COMO TEXTO ──');
for (const [k, bg, n] of [['texto', BLANCO, 'blanco'], ['texto', BEIGE, 'beige'], ['enlace', BLANCO, 'blanco'], ['enlace', BEIGE, 'beige']])
  ok(`verde.${k} sobre ${n}`, val('verde', k), bg, TEXTO_MIN);

console.log('── BLANCO SOBRE VERDES ──');
for (const k of ['primario', 'heroe', 'hover', 'profundo', 'splashInicio', 'splashFin'])
  ok(`blanco sobre verde.${k}`, '#ffffff', val('verde', k), TEXTO_MIN);
ok('texto.sobreHeroe sobre verde.heroe', val('texto', 'sobreHeroe'), val('verde', 'heroe'), TEXTO_MIN);

console.log('── BARRA DE TABS OSCURA ──');
ok('tabs.inactivo sobre tabs.fondo', val('tabs', 'inactivo'), val('tabs', 'fondo'), TEXTO_MIN);
ok('tabs.activo sobre la píldora', val('tabs', 'activo'), val('tabs', 'pildora'), TEXTO_MIN);
ok('píldora sobre tabs.fondo', val('tabs', 'pildora'), val('tabs', 'fondo'), SUP_MIN);

console.log('── INSIGNIAS DE ESTADO ──');
for (const m of src.split('estado: Record')[1].split('};')[0].matchAll(/(\w+):\s*\{ fondo: '(#\w{6})', texto: '(#\w{6})'/g))
  ok(`estado.${m[1]}`, m[3], m[2], TEXTO_MIN);

console.log('── NOTIFICACIONES ──');
for (const m of src.split('export const notificacion')[1].split('};')[0].matchAll(/(\w+):\s*\{ fondo: '(#\w{6})', icono: '(#\w{6})'/g))
  ok(`notificacion.${m[1]}`, m[3], m[2], TEXTO_MIN);

console.log('── AVISO ÁMBAR ──');
for (const k of ['titulo', 'cuerpo', 'icono']) ok(`ambar.${k}`, val('ambar', k), val('ambar', 'fondo'), TEXTO_MIN);
ok('ambar.actualIcono sobre actualFondo', val('ambar', 'actualIcono'), val('ambar', 'actualFondo'), TEXTO_MIN);
ok('ambar.fondo se separa del beige', val('ambar', 'fondo'), BEIGE, 1.05);

console.log('── SUPERFICIES CONTRA EL BLANCO ──');
for (const k of ['apagada', 'hundida', 'lienzo', 'seleccion', 'pildora', 'aviso', 'destacada', 'estadistica'])
  ok(`superficie.${k}`, val('superficie', k), BLANCO, SUP_MIN);
ok('ambar.fondo', val('ambar', 'fondo'), BLANCO, SUP_MIN);
ok('vacio.fondo', val('vacio', 'fondo'), BLANCO, SUP_MIN);
ok('arena.superficie', val('arena', 'superficie'), BLANCO, SUP_MIN);

console.log('── BORDES: DIBUJAN LA TARJETA SOBRE EL FONDO BLANCO ──');
for (const k of ['tarjeta', 'input', 'suave']) ok(`borde.${k}`, val('borde', k), BLANCO, 1.10);
ok('borde.aviso sobre el panel beige', val('borde', 'aviso'), BEIGE, 1.08);
ok('ambar.borde sobre ambar.fondo', val('ambar', 'borde'), val('ambar', 'fondo'), 1.10);

console.log(fallos === 0 ? `\n✓ LAS ${total} COMPROBACIONES PASAN\n` : `\n✗ ${fallos} DE ${total} FALLAN\n`);
process.exit(fallos === 0 ? 0 : 1);
