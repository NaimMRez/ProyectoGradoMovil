import {
  cubicBezier,
  Easing,
  ReduceMotion,
  type WithSpringConfig,
} from 'react-native-reanimated';

/**
 * Movimiento de PetGo.
 *
 * No se inventan valores: todo movimiento de la app sale de esta tabla.
 *
 * Tres decisiones que conviene tener escritas, porque son las que se olvidan:
 *
 * 1. **Los tabs no se deslizan.** Cambiar de tab pasa decenas de veces por
 *    sesión y los tabs son pares, no una jerarquía: deslizar insinúa una
 *    profundidad que no existe y el usuario la paga cada vez. `animation:
 *    'none'` en el navegador; lo único que se mueve es la píldora del icono,
 *    y sólo con un cambio de color por debajo del umbral de percepción.
 * 2. **Si hubo un dedo, muelle.** Un muelle arrastra la velocidad a través de
 *    una interrupción; una curva de tiempo reinicia desde cero y se nota.
 * 3. **Nunca `ease-in` en interfaz.** Empieza lento justo en el instante que
 *    el usuario está mirando.
 */

/** Curvas. Las de fábrica de Reanimated son tan flojas como las del CSS. */
export const curva = {
  /** Entradas y salidas. La curva por defecto de la app. */
  salida: Easing.bezier(0.23, 1, 0.32, 1),
  /** Algo que se mueve de un punto a otro en pantalla sin aparecer ni irse. */
  entradaSalida: Easing.bezier(0.77, 0, 0.175, 1),
  /** Sheets. La curva de iOS. */
  sheet: Easing.bezier(0.32, 0.72, 0, 1),
  /** Movimiento constante: barras de progreso indeterminadas. */
  lineal: Easing.linear,
} as const;

/**
 * Las mismas curvas en la forma que aceptan las transiciones y animaciones CSS
 * de Reanimated. `Easing.bezier()` sirve para `withTiming`; `cubicBezier()`
 * para `transitionTimingFunction` y `animationTimingFunction`. No son
 * intercambiables y el error sólo se ve en tiempo de ejecución.
 */
export const curvaCSS = {
  salida: cubicBezier(0.23, 1, 0.32, 1),
  entradaSalida: cubicBezier(0.77, 0, 0.175, 1),
  sheet: cubicBezier(0.32, 0.72, 0, 1),
} as const;

/** Duraciones, en ms. Por encima de 300 ms la interfaz se siente lenta. */
export const duracion = {
  /** Realimentación de presión. Se siente, no se ve. */
  presion: 120,
  /** Chip, toggle, cambio de color pequeño. */
  micro: 180,
  /** Entrada o salida de un elemento. */
  entrada: 240,
  /** Barra de progreso del asistente entre pasos. */
  progreso: 260,
  /** Latido de un skeleton. Lento a propósito: no debe llamar la atención. */
  latido: 900,
} as const;

/**
 * Muelles. Se usa la forma de dos parámetros de Apple (`duration` +
 * `dampingRatio`), no masa/rigidez/amortiguación: es la que se puede razonar.
 */
export const muelle = {
  /** Asentamiento por defecto, sin rebote. */
  reposo: {
    duration: 400,
    dampingRatio: 1,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,

  /** Vuelta a su sitio tras un arrastre. Pásale la `velocity` del gesto. */
  snap: {
    duration: 400,
    dampingRatio: 0.8,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,

  /** Bottom sheet y toast. */
  sheet: {
    duration: 300,
    dampingRatio: 0.82,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,

  /** Cuando no puede pasarse del borde: el asa de un sheet cerrado. */
  tope: {
    duration: 300,
    dampingRatio: 0.9,
    overshootClamping: true,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,
} as const;

/**
 * Escala de presión. `scale` arrastra el texto y los iconos con el fondo, y eso
 * es lo que hace que se lea como algo físico y no como un cambio de color.
 *
 * Cuanto más grande la superficie, menos escala: un 0.97 en una tarjeta de
 * ancho completo es un salto visible; en un botón de 40 px no se percibe.
 */
export const presion = {
  /** Botones, chips, filas. */
  normal: 0.97,
  /** Tarjetas grandes y CTAs de ancho completo. */
  suave: 0.985,
  /** Iconos y botones cuadrados pequeños. */
  fuerte: 0.94,
} as const;

/** Cuánto tiempo vive un toast antes de irse solo. Lo fija el handoff. */
export const TOAST_MS = 2600;

/**
 * Umbral de descarte de un sheet arrastrable. Se cierra por **distancia o
 * velocidad**: un golpe seco corto tiene que bastar, si no el gesto se siente
 * pegajoso.
 */
export const descarte = {
  /** Fracción de la altura del sheet a partir de la cual se cierra. */
  fraccion: 0.4,
  /** Velocidad en px/s que cierra por sí sola, sin importar la distancia. */
  velocidad: 900,
  /** Resistencia elástica al arrastrar hacia arriba, contra el tope. */
  resistencia: 0.25,
} as const;

export default { curva, curvaCSS, duracion, muelle, presion, TOAST_MS, descarte };
