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
const excepciones = [];
/**
 * Par que incumple el mínimo por una decisión de diseño tomada a sabiendas.
 *
 * No se cuenta como fallo — si no, la prueba estaría siempre roja y dejaría de
 * avisar de las regresiones de verdad — pero se informa con su cifra al final.
 * El objetivo es que el dato quede a la vista, no que desaparezca.
 */
const excepcion = (etiqueta, fg, bg, min, motivo) => {
  const r = R(fg, bg);
  excepciones.push({ etiqueta, r, min, motivo });
  console.log(`  ! ${etiqueta.padEnd(46)} ${r.toFixed(2).padStart(5)} (mín ${min}) — excepción`);
};
const ok = (etiqueta, fg, bg, min) => {
  total += 1;
  const r = R(fg, bg);
  if (r < min) fallos += 1;
  console.log(`  ${r >= min ? '✓' : '✗'} ${etiqueta.padEnd(46)} ${r.toFixed(2).padStart(5)} (mín ${min})`);
};

const BLANCO = val('superficie', 'tarjeta');
const GRIS = val('superficie', 'aviso');
const MENTA = val('verde', 'primario');
const LIMA = val('verde', 'lima');
const TEXTO_MIN = 4.5, SUP_MIN = 1.09;

console.log(`\nFondo ${val('superficie','app')} · gris ${GRIS} · menta ${MENTA} · lima ${LIMA}\n`);

console.log('── TEXTO SOBRE BLANCO ──');
for (const k of ['principal', 'secundario', 'terciario', 'suave', 'tenue', 'atenuado', 'etiqueta'])
  ok(`texto.${k}`, val('texto', k), BLANCO, TEXTO_MIN);

console.log('── TEXTO SOBRE EL PANEL GRIS ──');
for (const k of ['principal', 'secundario', 'terciario', 'suave', 'tenue', 'atenuado', 'etiqueta'])
  ok(`texto.${k}`, val('texto', k), GRIS, TEXTO_MIN);

console.log('── VERDES COMO TEXTO ──');
for (const [k, bg, n] of [['texto', BLANCO, 'blanco'], ['texto', GRIS, 'gris'], ['enlace', BLANCO, 'blanco'], ['enlace', GRIS, 'gris']])
  ok(`verde.${k} sobre ${n}`, val('verde', k), bg, TEXTO_MIN);

console.log('── TINTA OSCURA SOBRE LOS VERDES DE ACENTO ──');
ok('texto.sobreAccion sobre la menta', val('texto', 'sobreAccion'), MENTA, TEXTO_MIN);
ok('texto.sobreAccion sobre la lima', val('texto', 'sobreAccion'), LIMA, TEXTO_MIN);
ok('texto.sobreAccion sobre verde.hover', val('texto', 'sobreAccion'), val('verde', 'hover'), TEXTO_MIN);
ok('menta se separa del blanco', MENTA, BLANCO, SUP_MIN);
ok('lima se separa del blanco', LIMA, BLANCO, SUP_MIN);

console.log('── BLANCO SOBRE LOS VERDES PROFUNDOS ──');
for (const k of ['heroe', 'profundo', 'splashInicio', 'splashFin'])
  ok(`blanco sobre verde.${k}`, '#ffffff', val('verde', k), TEXTO_MIN);
ok('blanco sobre intencion.whatsapp', '#ffffff', val('intencion', 'whatsapp'), TEXTO_MIN);
ok('texto.sobreHeroe sobre verde.heroe', val('texto', 'sobreHeroe'), val('verde', 'heroe'), TEXTO_MIN);

console.log('── BARRA DE TABS OSCURA ──');
excepcion(
  'tabs.activo sobre la píldora de menta',
  val('tabs', 'activo'), val('tabs', 'pildora'), TEXTO_MIN,
  'blanco sobre la menta, pedido de forma expresa para la barra inferior',
);
ok('tabs.inactivo sobre su círculo', val('tabs', 'inactivo'), val('tabs', 'inactivoFondo'), TEXTO_MIN);
ok('círculo inactivo sobre tabs.fondo', val('tabs', 'inactivoFondo'), val('tabs', 'fondo'), SUP_MIN);
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
ok('ambar.fondo se separa del gris', val('ambar', 'fondo'), GRIS, 1.05);

console.log('── SUPERFICIES CONTRA EL BLANCO ──');
for (const k of ['apagada', 'hundida', 'lienzo', 'seleccion', 'pildora', 'aviso', 'destacada', 'estadistica'])
  ok(`superficie.${k}`, val('superficie', k), BLANCO, SUP_MIN);
ok('ambar.fondo', val('ambar', 'fondo'), BLANCO, SUP_MIN);
ok('vacio.fondo', val('vacio', 'fondo'), BLANCO, SUP_MIN);
ok('arena.superficie', val('arena', 'superficie'), BLANCO, SUP_MIN);

console.log('── BORDES: DIBUJAN LA TARJETA SOBRE EL FONDO BLANCO ──');
for (const k of ['tarjeta', 'input', 'suave']) ok(`borde.${k}`, val('borde', k), BLANCO, 1.10);
ok('borde.aviso sobre el panel gris', val('borde', 'aviso'), GRIS, 1.04);
ok('ambar.borde sobre ambar.fondo', val('ambar', 'borde'), val('ambar', 'fondo'), 1.10);

console.log(fallos === 0 ? `\n✓ LAS ${total} COMPROBACIONES PASAN` : `\n✗ ${fallos} DE ${total} FALLAN`);
if (excepciones.length > 0) {
  console.log(`\n${excepciones.length} excepción(es) aceptada(s), por decisión de diseño:`);
  for (const e of excepciones) {
    console.log(`  · ${e.etiqueta}: ${e.r.toFixed(2)} frente a ${e.min} exigido`);
    console.log(`    ${e.motivo}`);
  }
}
console.log('');
process.exit(fallos === 0 ? 0 : 1);
