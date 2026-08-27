/**
 * Paleta de PetGo — verde bosque + arena.
 *
 * Todos los valores salen de una conversión exacta OKLCH → sRGB de los tokens
 * del handoff. La tabla de hex del handoff original está desviada (sus hex son
 * bastante más apagados que el OKLCH que dice representar) y no se usa.
 *
 * Regla: ningún componente escribe un hex suelto. Todo pasa por aquí.
 */

/** Verdes de marca. `primario` es el color de acción de toda la app. */
export const verde = {
  primario: '#1b683e',
  /** Fin de los degradados de héroe y del CTA de publicación. */
  profundo: '#004127',
  /** Inicio del degradado de héroe (detalle, CTA). */
  heroe: '#136239',
  /** Estado presionado / enlaces visitados. */
  hover: '#07502c',
  /** Texto sobre superficies claras cuando el primario es demasiado pesado. */
  texto: '#115531',
  enlace: '#236e44',
  splashInicio: '#185b37',
  splashFin: '#033d26',
} as const;

/**
 * Arena — el neutro cálido que el handoff prometió en la paleta ("verde bosque
 * + arena") pero nunca llegó a usar. Aparece solo en superficies de reposo:
 * estados vacíos, skeletons y el fondo de las pantallas de acceso. Sin él la
 * app entera es una sola gama de verde-gris y las zonas sin contenido se leen
 * como error de carga en vez de como calma.
 */
export const arena = {
  fondo: '#faf8f4',
  superficie: '#f5f1e9',
  borde: '#e8e1d4',
  texto: '#6b6355',
} as const;

/** Superficies y fondos. */
export const superficie = {
  app: '#f7fbf8',
  lienzo: '#edf2ed',
  tarjeta: '#ffffff',
  /** Superficie de un elemento ya consumido (notificación leída). */
  apagada: '#f5f9f6',
  /** Fondo de inputs y burbujas de chat ajenas. */
  hundida: '#f2f6f3',
  burbuja: '#f1f7f2',
  /** Tinte de selección: tarjeta de rol o de mascota elegida. */
  seleccion: '#e7f7e9',
  /** Tinte de la píldora del tab activo y de chips informativos. */
  pildora: '#dcf2df',
  /** Tinte de avisos y tarjetas de resumen. */
  aviso: '#edf6ee',
  /** Tarjeta de interesados (dueño). */
  destacada: '#ebf8ec',
  /** Recuadro de estadística sobre fondo claro. */
  estadistica: '#f0f8f1',
} as const;

/** Escala de texto, de más a menos contraste. */
export const texto = {
  principal: '#132419',
  tarjeta: '#1a251d',
  fuerte: '#18281e',
  medio: '#212c25',
  secundario: '#5b675e',
  terciario: '#69756c',
  suave: '#6c786f',
  tenue: '#717e75',
  atenuado: '#7f8982',
  etiqueta: '#4d5950',
  inactivo: '#a0a6a2',
  sobrePrimario: '#ffffff',
  /** Texto secundario sobre degradado verde (héroe, CTA, splash). */
  sobreHeroe: '#c6e2ce',
} as const;

/** Bordes y divisores, del más visible al más sutil. */
export const borde = {
  tarjeta: '#e1e6e2',
  input: '#d9e0db',
  suave: '#dbe4de',
  sutil: '#e7ede9',
  divisor: '#ebf0ed',
  divisorTenue: '#eff3f0',
  aviso: '#e1ebe3',
  destacada: '#d1e4d4',
  discontinuo: '#afc4b5',
} as const;

/** Colores de intención. */
export const intencion = {
  /** Único uso del verde de WhatsApp en toda la app: el sheet de contacto. */
  whatsapp: '#3a9742',
  destructivo: '#a45953',
  destructivoTexto: '#a34945',
  destructivoBorde: '#f2d7d4',
  destructivoFondo: '#ffe7e4',
  noLeidas: '#bd4334',
  puntoNoLeida: '#00884b',
} as const;

/** Aviso ámbar: "el cuidador terminó, falta que el dueño confirme". */
export const ambar = {
  fondo: '#fff3d8',
  borde: '#f8d9aa',
  icono: '#9c5400',
  titulo: '#4e3014',
  cuerpo: '#674c35',
  /** Paso actual del timeline de seguimiento. */
  actualFondo: '#ffeac2',
  actualBorde: '#d8953d',
  actualIcono: '#8c4a00',
} as const;

/** Toast: superficie oscura, el único elemento con inversión de contraste. */
export const toast = {
  fondo: '#182f20',
  texto: '#ffffff',
  icono: '#95d7a2',
} as const;

/** Estados del servicio. Las claves son los valores del enum del backend. */
export type EstadoServicio =
  | 'publicada'
  | 'aceptada'
  | 'programada'
  | 'proceso'
  | 'finalizada'
  | 'cancelada';

export const estado: Record<EstadoServicio, { fondo: string; texto: string }> = {
  publicada: { fondo: '#d6f0ff', texto: '#16558c' },
  aceptada: { fondo: '#d2f6dd', texto: '#00572e' },
  programada: { fondo: '#eae7ff', texto: '#554589' },
  proceso: { fondo: '#ffeac2', texto: '#8c4a00' },
  finalizada: { fondo: '#eaeeeb', texto: '#535a55' },
  cancelada: { fondo: '#ffe2de', texto: '#a03f3c' },
};

/** Tipos de notificación: cuadro de icono de 38×38 en la bandeja. */
export type TipoNotificacion =
  | 'interes'
  | 'confirmar'
  | 'iniciado'
  | 'aceptado'
  | 'cancelada';

export const notificacion: Record<
  TipoNotificacion,
  { fondo: string; icono: string }
> = {
  interes: { fondo: '#d6f0ff', icono: '#16558c' },
  confirmar: { fondo: '#ffeac2', icono: '#8c4a00' },
  iniciado: { fondo: '#d2f6dd', icono: '#005129' },
  aceptado: { fondo: '#d2f6dd', icono: '#005129' },
  cancelada: { fondo: '#ffe7e4', icono: '#a03f3c' },
};

/** Barra de tabs. */
export const tabs = {
  activo: '#07502c',
  inactivo: '#747d76',
  pildora: superficie.pildora,
  fondo: superficie.tarjeta,
  borde: borde.divisor,
} as const;

/** Elementos que flotan sobre el mapa o dentro de sheets. */
export const chrome = {
  sobreMapa: 'rgba(255,255,255,0.96)',
  backdrop: 'rgba(18,32,26,0.42)',
  asa: '#d9e0db',
  cerrar: '#eff3f0',
  /** Superficies translúcidas dentro del héroe verde. */
  sobreHeroe: 'rgba(255,255,255,0.14)',
  sobreHeroeFuerte: 'rgba(255,255,255,0.20)',
} as const;

/** Estados vacíos y placeholders de foto. */
export const vacio = {
  fondo: '#ecf4ee',
  borde: '#e3eae4',
  icono: '#84988a',
  titulo: '#263129',
  /** Fondo de un hueco de foto sin imagen todavía. */
  fotoFondo: '#dcede1',
  fotoBorde: '#dae4dd',
  fotoTexto: '#5b675e',
} as const;

export const colores = {
  verde,
  arena,
  superficie,
  texto,
  borde,
  intencion,
  ambar,
  toast,
  estado,
  notificacion,
  tabs,
  chrome,
  vacio,
} as const;

export default colores;
