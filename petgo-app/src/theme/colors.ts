/**
 * Paleta de PetGo — menta, lima y gris.
 *
 * Regla: ningún componente escribe un hex suelto. Todo pasa por aquí.
 *
 * **Los tres colores de acento son rellenos claros, y eso decide la tinta.**
 * La menta admite 2,1:1 con texto blanco y 7,5:1 con texto oscuro; la lima,
 * 1,2:1 y 13,5:1. No es una preferencia estética: sobre estos verdes el texto
 * va oscuro o no se lee. De ahí sale `texto.sobreAccion`, que es lo que
 * llevan encima la menta y la lima, mientras `texto.sobrePrimario` (blanco) se
 * reserva para los verdes profundos de los degradados.
 *
 * El gris y el blanco hacen el trabajo estructural — fondo, tarjetas, paneles
 * — y los dos verdes sólo aparecen donde hay una acción. Un color de acento
 * que se usa como superficie deja de señalar nada.
 *
 * Cada par que se toca está verificado en `pruebas/contraste.mjs`.
 */

/** Verdes de marca. `primario` es el color de acción de toda la app. */
export const verde = {
  /** Relleno de acción. Lleva `texto.sobreAccion` encima, nunca blanco. */
  primario: '#4fc6a0',
  /**
   * Extremo oscuro del degradado de acción. El claro es `primario`.
   *
   * No puede ir más oscuro. El degradado lleva tinta oscura encima — la menta
   * no admite blanco — y a partir de aquí esa tinta baja de 4,5:1 contra el
   * extremo derecho. Con este valor da 4,57:1, y la diferencia entre los dos
   * extremos es de 1,51: un degradado se percibe desde 1,15, así que se aprecia
   * de sobra sin gastarse el margen de legibilidad.
   */
  primarioOscuro: '#40a082',
  /** Lima: la segunda acción — botones sutiles y tarjetas de oportunidad. */
  lima: '#d7f7ad',
  /** Presionado del relleno de acción. */
  hover: '#3cb48d',
  /** Inicio del degradado de héroe. Ya es oscuro: aquí el texto va blanco. */
  heroe: '#286350',
  /** Fin de los degradados de héroe y del CTA de publicación. */
  profundo: '#1b4336',
  /**
   * Verde como texto sobre superficies claras.
   *
   * No sigue a `primario`: la menta sobre blanco da 2,1:1 y es invisible como
   * texto. Estos dos se eligen por contraste, no por familia.
   */
  texto: '#15604b',
  enlace: '#1a6f57',
  splashInicio: '#286350',
  splashFin: '#0f2b23',
} as const;

/** Arena — superficies de reposo: estados vacíos y pantallas de acceso. */
export const arena = {
  fondo: '#f3f4f3',
  superficie: '#f4f5f4',
  borde: '#e2e5e2',
  texto: '#5f665f',
} as const;

/** Superficies y fondos, de la más clara a la más profunda. */
export const superficie = {
  /** Fondo general. Blanco: el lienzo, no un tono. */
  app: '#ffffff',
  /** Tarjeta. También blanca — la separa el borde, no el relleno. */
  tarjeta: '#F4F5F4',
  /** Superficie de un elemento ya consumido (notificación leída). */
  apagada: '#f3f4f3',
  /** Gris de apoyo: campos, barra de escritura y burbujas ajenas. */
  hundida: '#f4f5f4',
  burbuja: '#f4f5f4',
  /** Más profundo que el gris: separadores de bloque. */
  lienzo: '#eaecea',
  /** Tinte de selección: tarjeta de rol o de mascota elegida. */
  seleccion: '#d9ece3',
  /** Tinte de chips informativos. */
  pildora: '#d4eee3',
  /** El panel gris que destaca dentro de una tarjeta: resúmenes y fichas. */
  aviso: '#f4f5f4',
  /** Tarjeta de interesados (dueño): la lima, diluida. */
  destacada: '#ebf9d7',
  /** Recuadro de estadística sobre fondo claro. */
  estadistica: '#f4f5f4',
} as const;

/**
 * Escala de texto, de más a menos contraste.
 *
 * Calibrada contra el gris `#f4f5f4`, que es la superficie más exigente en la
 * que aparece texto — no contra el blanco, que es la más fácil.
 */
export const texto = {
  principal: '#15221a',
  tarjeta: '#18231b',
  fuerte: '#17251c',
  medio: '#202a24',
  secundario: '#525e56',
  terciario: '#5c6861',
  suave: '#5f6b64',
  tenue: '#636f68',
  atenuado: '#67736c',
  etiqueta: '#495349',
  inactivo: '#8f9891',
  /** Blanco. Sólo sobre los verdes profundos y los degradados. */
  sobrePrimario: '#ffffff',
  /**
   * Tinta sobre la menta y la lima.
   *
   * Existe porque esos dos verdes no admiten blanco. Es el token que evita
   * que un relleno de acción termine con texto ilegible encima.
   */
  sobreAccion: '#0e2e25',
  /** Texto secundario sobre degradado verde (héroe, CTA, splash). */
  sobreHeroe: '#9fe0cb',
} as const;

/**
 * Bordes y divisores, del más visible al más sutil.
 *
 * Grises neutros: con tarjeta y fondo los dos blancos, el borde es lo único
 * que dibuja la tarjeta.
 */
export const borde = {
  tarjeta: '#e4e7e4',
  input: '#dce0dc',
  suave: '#e0e4e0',
  sutil: '#eaedea',
  divisor: '#edf0ed',
  divisorTenue: '#f1f3f1',
  aviso: '#e4e7e4',
  destacada: '#cfe6ad',
  discontinuo: '#aeb5ae',
} as const;

/**
 * Acceso — los colores de la pantalla de elección de rol, a sangre.
 *
 * Los dos verdes de acento ocupando media pantalla cada uno. La tinta va
 * oscura en ambos lados, por la misma razón que en los botones.
 */
export const acceso = {
  verde: verde.primario,
  crema: verde.lima,
  /** Texto y bordes sobre la menta. */
  sobreVerde: texto.sobreAccion,
  sobreVerdeSuave: 'rgba(14,46,37,0.66)',
  /** Texto sobre la lima. */
  sobreCrema: texto.sobreAccion,
  sobreCremaSuave: 'rgba(14,46,37,0.62)',
} as const;

/** Colores de intención. */
export const intencion = {
  /** Único uso del verde de WhatsApp en toda la app: el sheet de contacto. */
  whatsapp: '#2f7f38',
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
 * Es el único cálido de una paleta fría, y ése es justamente su trabajo: el
 * aviso que exige una acción no puede parecerse a nada más de la pantalla.
 */
export const ambar = {
  fondo: '#ffe6ae',
  borde: '#e0a63f',
  icono: '#7a4100',
  titulo: '#4e3014',
  cuerpo: '#63482f',
  /** Paso actual del timeline de seguimiento. */
  actualFondo: '#fbd894',
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
 * una barra clara pegada al borde inferior desaparece.
 *
 * El tab activo se expande en una píldora de menta con icono y etiqueta; los
 * inactivos quedan en círculos blancos con sólo el icono. Los círculos son de
 * ancho fijo y la píldora se queda con lo que sobra, así que el reparto del
 * ancho es determinista: no hay dos estados en los que la barra mida distinto.
 */
export const tabs = {
  fondo: '#16261c',
  /**
   * Tinta sobre la píldora de menta.
   *
   * **Blanco es una excepción consciente al mínimo de contraste** (2,1:1 sobre
   * `#4fc6a0`, frente al 4,5:1 exigido). Es una decisión de diseño tomada a
   * sabiendas y queda anotada como excepción en `pruebas/contraste.mjs`, no
   * escondida. `texto.sobreAccion` daría 6,9:1 si algún día se revierte.
   */
  activo: '#ffffff',
  /** Icono del tab inactivo: va sobre el círculo blanco, así que es oscuro. */
  inactivo: '#16261c',
  /** Círculo de los tabs inactivos. */
  inactivoFondo: '#ffffff',
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
  fondo: '#f3f4f3',
  borde: '#e6e9e6',
  icono: '#8a938c',
  titulo: '#232b26',
  /** Fondo de un hueco de foto sin imagen todavía. */
  fotoFondo: '#e6f4ec',
  fotoBorde: '#dde3de',
  fotoTexto: '#55605a',
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
