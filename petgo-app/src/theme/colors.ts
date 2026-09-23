/**
 * Paleta de PetGo — blanco, beige y verde.
 *
 * Regla: ningún componente escribe un hex suelto. Todo pasa por aquí. Por eso
 * repintar las 21 pantallas es editar este archivo y poco más.
 *
 * **Cuatro capas de superficie, no dos.** El fondo es blanco y las tarjetas
 * también: lo que las separa es el borde, no el relleno. Por debajo de ambos
 * hay dos niveles cálidos — un beige claro para campos y paneles de apoyo, y
 * el beige de marca para el panel que tiene que destacar. Esa cuarta capa es
 * la que permite que una ficha de datos se distinga de la tarjeta que la
 * contiene sin recurrir a otra sombra.
 *
 * El verde aparece en dos intensidades y no es decorativo en ninguna: el
 * saturado lleva las acciones, el claro tiñe píldoras y chips. Ningún elemento
 * usa uno donde toca el otro.
 *
 * Cada par de colores que se toca está verificado en `pruebas/contraste.mjs`.
 */

/** Verdes de marca. `primario` es el color de acción de toda la app. */
export const verde = {
  primario: '#2b8164',
  /** Fin de los degradados de héroe y del CTA de publicación. */
  profundo: '#14543f',
  /** Inicio del degradado de héroe (detalle, CTA). */
  heroe: '#226b53',
  /** Estado presionado / enlaces visitados. */
  hover: '#1f6149',
  /**
   * Texto sobre superficies claras cuando el primario es demasiado pesado.
   *
   * No sigue a `primario`: el primario sobre blanco da 4,7:1, que basta para un
   * botón y no para un párrafo. Estos dos se eligen por contraste, no por
   * armonía.
   */
  texto: '#14523f',
  enlace: '#1c6349',
  splashInicio: '#2b8164',
  splashFin: '#123f30',
} as const;

/** Arena — superficies de reposo: estados vacíos y pantallas de acceso. */
export const arena = {
  fondo: '#f8f3e6',
  superficie: '#f4e6c3',
  borde: '#e2d5b4',
  texto: '#6a6252',
} as const;

/** Superficies y fondos, de la más clara a la más profunda. */
export const superficie = {
  /** Fondo general. Blanco: el lienzo, no un tono. */
  app: '#ffffff',
  /** Tarjeta. También blanca — la separa el borde, no el relleno. */
  tarjeta: '#ffffff',
  /** Superficie de un elemento ya consumido (notificación leída). */
  apagada: '#f8f3e6',
  /** Fondo de inputs y de la barra de escritura. */
  hundida: '#f6f0e2',
  burbuja: '#f6f0e2',
  /** Beige de apoyo, para separar bloques dentro de una tarjeta. */
  lienzo: '#efe6d2',
  /** Tinte de selección: tarjeta de rol o de mascota elegida. */
  seleccion: '#dcefe1',
  /** Tinte de la píldora del tab activo y de chips informativos. */
  pildora: '#d3e9d9',
  /**
   * Beige de marca. Es el panel que tiene que destacar sobre la tarjeta que lo
   * contiene: resúmenes, fichas de datos, avisos sin urgencia.
   */
  aviso: '#f4e6c3',
  /** Tarjeta de interesados (dueño). */
  destacada: '#eaf4ec',
  /** Recuadro de estadística sobre fondo claro. */
  estadistica: '#f7f1e3',
} as const;

/**
 * Escala de texto, de más a menos contraste.
 *
 * Los tonos medios son más oscuros de lo que pedirían sobre blanco. El motivo
 * es el beige: los paneles de marca llevan texto encima, y sobre `#f4e6c3` los
 * grises claros de una escala pensada para blanco se caen por debajo del
 * mínimo legible. La escala se calibra contra la superficie más exigente en la
 * que aparece, no contra la más fácil.
 */
export const texto = {
  principal: '#17251b',
  tarjeta: '#1a251d',
  fuerte: '#18281e',
  medio: '#212c25',
  secundario: '#4d594f',
  terciario: '#55625a',
  suave: '#58655c',
  tenue: '#5c6a60',
  atenuado: '#5e6b62',
  etiqueta: '#454f47',
  inactivo: '#8a938c',
  sobrePrimario: '#ffffff',
  /** Texto secundario sobre degradado verde (héroe, CTA, splash). */
  sobreHeroe: '#c9e6d5',
} as const;

/**
 * Bordes y divisores, del más visible al más sutil.
 *
 * Grises cálidos, no beiges saturados. Con tarjeta y fondo los dos blancos, el
 * borde es lo único que dibuja la tarjeta: tiene que verse sin teñirla.
 */
export const borde = {
  tarjeta: '#e6e0d2',
  input: '#ded7c6',
  suave: '#e0dacb',
  sutil: '#ebe6da',
  divisor: '#eee9df',
  divisorTenue: '#f2eee6',
  aviso: '#e2d3ab',
  destacada: '#cadfd0',
  discontinuo: '#b5ac95',
} as const;

/**
 * Acceso — los colores de la pantalla de elección de rol, a sangre.
 *
 * No es una paleta aparte: son los dos colores de la marca ocupando la
 * pantalla entera. La familia existe sólo para documentar qué tinta va sobre
 * cada uno cuando no hay tarjeta de por medio que rompa el color.
 */
export const acceso = {
  verde: verde.primario,
  crema: superficie.aviso,
  /** Texto y bordes sobre el verde. */
  sobreVerde: '#ffffff',
  sobreVerdeSuave: 'rgba(255,255,255,0.78)',
  /** Texto sobre el crema. */
  sobreCrema: verde.texto,
  sobreCremaSuave: texto.secundario,
} as const;

/** Colores de intención. */
export const intencion = {
  /** Único uso del verde de WhatsApp en toda la app: el sheet de contacto. */
  whatsapp: '#3a9742',
  destructivo: '#a45953',
  destructivoTexto: '#a34945',
  destructivoBorde: '#eecfc9',
  destructivoFondo: '#fbdfd9',
  noLeidas: '#bd4334',
  puntoNoLeida: '#00884b',
} as const;

/**
 * Aviso ámbar: "el cuidador terminó, falta que el dueño confirme".
 *
 * Va más saturado que el beige de marca a propósito. Los dos son cálidos y
 * pueden coincidir en pantalla; si el ámbar fuera igual de suave, el único
 * aviso que exige una acción se leería como un panel informativo más.
 */
export const ambar = {
  fondo: '#f9d996',
  borde: '#dda63f',
  icono: '#7a4100',
  titulo: '#4e3014',
  cuerpo: '#63482f',
  /** Paso actual del timeline de seguimiento. */
  actualFondo: '#f8d28c',
  actualBorde: '#c98b2c',
  actualIcono: '#7d4200',
} as const;

/** Toast: superficie oscura, el único elemento con inversión de contraste. */
export const toast = {
  fondo: '#17301f',
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

/**
 * Barra de tabs: oscura y flotante sobre el contenido.
 *
 * Es la única superficie oscura permanente de la app. Sobre un fondo blanco,
 * una barra clara pegada al borde inferior desaparece; oscura y separada del
 * borde, se lee como un objeto que flota, y el verde de la píldora activa
 * destaca sin necesitar más contraste del que ya tiene.
 */
export const tabs = {
  fondo: '#16261c',
  /** Icono y etiqueta sobre la píldora verde. */
  activo: '#ffffff',
  inactivo: '#9fada4',
  pildora: verde.primario,
  borde: 'transparent',
} as const;

/** Elementos que flotan sobre el mapa o dentro de sheets. */
export const chrome = {
  sobreMapa: 'rgba(255,255,255,0.96)',
  backdrop: 'rgba(24,26,18,0.44)',
  asa: borde.input,
  cerrar: '#f2eee6',
  /** Superficies translúcidas dentro del héroe verde. */
  sobreHeroe: 'rgba(255,255,255,0.14)',
  sobreHeroeFuerte: 'rgba(255,255,255,0.20)',
} as const;

/** Estados vacíos y placeholders de foto. */
export const vacio = {
  fondo: '#f8f3e6',
  borde: '#ece3cd',
  icono: '#8f8875',
  titulo: '#262b22',
  /** Fondo de un hueco de foto sin imagen todavía. */
  fotoFondo: '#f0e8d4',
  fotoBorde: '#e3d9bf',
  fotoTexto: '#5d5647',
} as const;

export const colores = {
  verde,
  acceso,
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
