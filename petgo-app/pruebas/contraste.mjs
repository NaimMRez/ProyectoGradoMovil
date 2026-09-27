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
/** Mezcla `a` sobre `b`. `alfa` es cuánto pesa `a`. Para medir lo que se ve
 *  cuando algo se pinta con opacidad por debajo de 1. */
const mezclar = (a, b, alfa) => {
  const [A, B] = [parseInt(a.slice(1), 16), parseInt(b.slice(1), 16)];
  const canal = (d) => Math.round(((A >> d) & 255) * alfa + ((B >> d) & 255) * (1 - alfa));
  return '#' + [16, 8, 0].map((d) => canal(d).toString(16).padStart(2, '0')).join('');
};

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

// Las tres superficies sobre las que hay texto. Son distintas y hay que
// comprobarlas por separado: el fondo de la app es blanco, la tarjeta es gris
// y el panel de apoyo va dentro de la tarjeta.
const FONDO = val('superficie', 'app');
const TARJETA = val('superficie', 'tarjeta');
const GRIS = val('superficie', 'aviso');
const MENTA = val('verde', 'primario');
const LIMA = val('verde', 'lima');
const TEXTO_MIN = 4.5, SUP_MIN = 1.09;

console.log(`\nFondo ${FONDO} · tarjeta ${TARJETA} · panel ${GRIS} · menta ${MENTA} · lima ${LIMA}\n`);

console.log('── TEXTO SOBRE EL FONDO DE LA APP ──');
for (const k of ['principal', 'secundario', 'terciario', 'suave', 'tenue', 'atenuado', 'etiqueta'])
  ok(`texto.${k}`, val('texto', k), FONDO, TEXTO_MIN);

console.log('── TEXTO SOBRE LA TARJETA ──');
for (const k of ['principal', 'secundario', 'terciario', 'suave', 'tenue', 'atenuado', 'etiqueta'])
  ok(`texto.${k}`, val('texto', k), TARJETA, TEXTO_MIN);

console.log('── VERDES COMO TEXTO ──');
for (const [k, bg, n] of [['texto', FONDO, 'el fondo'], ['texto', TARJETA, 'la tarjeta'], ['enlace', FONDO, 'el fondo'], ['enlace', TARJETA, 'la tarjeta']])
  ok(`verde.${k} sobre ${n}`, val('verde', k), bg, TEXTO_MIN);

console.log('── TINTA OSCURA SOBRE LOS VERDES DE ACENTO ──');
ok('texto.sobreAccion sobre la menta', val('texto', 'sobreAccion'), MENTA, TEXTO_MIN);
ok('texto.sobreAccion sobre la lima', val('texto', 'sobreAccion'), LIMA, TEXTO_MIN);
ok('texto.sobreAccion sobre verde.hover', val('texto', 'sobreAccion'), val('verde', 'hover'), TEXTO_MIN);
ok('la menta se separa del fondo', MENTA, FONDO, SUP_MIN);
ok('la lima se separa de la tarjeta', LIMA, TARJETA, SUP_MIN);

console.log('── PORTADA: LAS CUATRO BANDAS ──');
// Cada banda lleva un círculo blanco con la foto del perro. Si el círculo no
// se separa de su banda, el recorte pierde su borde y la foto queda flotando.
for (const k of ['banda1', 'banda2', 'banda3', 'banda4'])
  ok(`círculo blanco sobre ${k}`, '#ffffff', val('portada', k), SUP_MIN);
// El nombre va debajo de la banda, sobre el degradado del fondo: tiene que
// leerse en sus dos extremos.
ok('nombre en el extremo beige', val('texto', 'fuerte'), FONDO, TEXTO_MIN);
ok('nombre en el extremo blanco', val('texto', 'fuerte'), TARJETA, TEXTO_MIN);

console.log('── BANDA DE LIMA DE LA TARJETA DE MASCOTA ──');
ok('nombre sobre la lima', val('texto', 'tarjeta'), LIMA, TEXTO_MIN);
ok('raza sobre la lima', val('texto', 'terciario'), LIMA, TEXTO_MIN);

console.log('── BARRA DE DURACIÓN DEL PASEO ──');
// La pista es arena y el relleno menta, así que el pulgar blanco tiene dos
// fondos debajo y los topes también. Los topes son del mismo color en los dos
// lados, por eso se miden contra ambos.
ok('la pista se separa de la tarjeta', val('superficie', 'hundida'), TARJETA, SUP_MIN);
ok('el relleno se separa de la pista', MENTA, val('superficie', 'hundida'), SUP_MIN);
ok('tope sobre la pista', val('texto', 'sobreAccion'), val('superficie', 'hundida'), TEXTO_MIN);
ok('tope sobre el relleno', val('texto', 'sobreAccion'), MENTA, TEXTO_MIN);
// El pulgar mide 28 y la pista 10, así que la mayor parte de su contorno no cae
// sobre la pista sino sobre la tarjeta — y es blanco sobre blanco. El aro de
// menta es lo único que lo dibuja ahí, y por eso no es decoración.
ok('el aro del pulgar sobre la tarjeta', MENTA, TARJETA, SUP_MIN);
ok('el aro del pulgar sobre la pista', MENTA, val('superficie', 'hundida'), SUP_MIN);
// Sobre el relleno el aro desaparece — es menta contra menta —, así que ahí lo
// que separa al pulgar es su cuerpo blanco.
ok('el cuerpo del pulgar sobre el relleno', TARJETA, MENTA, SUP_MIN);
ok('la cifra de la duración', val('verde', 'texto'), TARJETA, TEXTO_MIN);

console.log('── SELECTOR DE FECHA Y HORA ──');
// La tira de días vive dentro del sheet, que es blanco. El día elegido se
// pinta de menta y los otros seis van sin relleno, así que hay dos fondos.
ok('número del día elegido', val('texto', 'sobreAccion'), MENTA, TEXTO_MIN);
ok('abreviatura del día elegido', val('texto', 'sobreAccion'), MENTA, TEXTO_MIN);
ok('número de un día sin elegir', val('texto', 'principal'), TARJETA, TEXTO_MIN);
ok('abreviatura de un día sin elegir', val('texto', 'terciario'), TARJETA, TEXTO_MIN);
// El aviso de hora pasada es lo único rojo del sheet.
ok('aviso de hora pasada', val('intencion', 'destructivoTexto'), TARJETA, TEXTO_MIN);

console.log('── BOTÓN PRIMARIO DESHABILITADO ──');
// `PressableScale` apaga al 45 % cualquier control deshabilitado, así que lo
// que se ve es la mezcla con lo que haya debajo. El primer sitio donde eso
// pesa es el pie del asistente de publicación: un botón primario a ancho
// completo sobre el fondo de la app, apagado hasta que se elige una mascota.
const APAGADO = 0.45;
const RELLENO_APAGADO = mezclar(MENTA, FONDO, APAGADO);
ok('el botón apagado se sigue viendo', RELLENO_APAGADO, FONDO, SUP_MIN);
excepcion(
  'la etiqueta del botón apagado',
  mezclar(val('texto', 'sobreAccion'), FONDO, APAGADO),
  RELLENO_APAGADO,
  TEXTO_MIN,
  'control inactivo, exento en la WCAG 1.4.3: un botón apagado tiene que leerse como apagado, y el aviso de arriba dice qué falta',
);

console.log('── DEGRADADO DEL BOTÓN DE PUBLICAR ──');
// La tinta es la misma en todo el botón, así que se mide en sus dos extremos,
// no sólo en el más favorable.
excepcion(
  'tinta blanca en el extremo izquierdo',
  '#ffffff', val('verde', 'publicarInicio'), TEXTO_MIN,
  'texto blanco sobre el degradado, pedido de forma expresa; texto.sobreAccion pasaría con holgura',
);
excepcion(
  'tinta blanca en el extremo derecho',
  '#ffffff', val('verde', 'publicarFin'), TEXTO_MIN,
  'texto blanco sobre el degradado, pedido de forma expresa; texto.sobreAccion pasaría con holgura',
);
ok('el degradado se aprecia', val('verde', 'publicarInicio'), val('verde', 'publicarFin'), 1.15);

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

console.log('── LA TARJETA SE DIBUJA SOLA ──');
// Las tarjetas no llevan borde: lo único que las separa del fondo es su
// relleno, así que esta comprobación pasa de ser cosmética a ser estructural.
// Si alguien acerca los dos tonos, las tarjetas desaparecen.
ok('tarjeta contra el fondo de la app', TARJETA, FONDO, SUP_MIN);

console.log('── SUPERFICIES QUE VIVEN DENTRO DE UNA TARJETA ──');
// Sólo éstas. `destacada` no entra: es el relleno de un tono de tarjeta, así
// que se apoya en el fondo de la app y nunca dentro de otra tarjeta.
for (const k of ['seleccion', 'pildora'])
  ok(`superficie.${k}`, val('superficie', k), TARJETA, SUP_MIN);
ok('ambar.fondo', val('ambar', 'fondo'), TARJETA, SUP_MIN);

console.log('── SUPERFICIES CONTRA EL FONDO DE LA APP ──');
for (const k of ['apagada', 'hundida', 'lienzo', 'seleccion', 'pildora', 'aviso', 'destacada', 'estadistica'])
  ok(`superficie.${k}`, val('superficie', k), FONDO, SUP_MIN);
ok('ambar.fondo', val('ambar', 'fondo'), FONDO, SUP_MIN);
ok('vacio.fondo', val('vacio', 'fondo'), FONDO, SUP_MIN);
ok('arena.superficie', val('arena', 'superficie'), FONDO, SUP_MIN);

console.log('── BORDES QUE SIGUEN EN USO (campos, divisores) ──');
for (const k of ['input', 'suave']) ok(`borde.${k}`, val('borde', k), TARJETA, 1.04);
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
