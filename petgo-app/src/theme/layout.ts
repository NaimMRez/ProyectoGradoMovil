import { Platform, type ViewStyle } from 'react-native';

/**
 * Espaciado, radios y profundidad.
 *
 * El handoff usaba prácticamente todos los enteros entre 2 y 34 para el
 * espaciado y entre 7 y 34 para los radios — otra vez, ruido de prototipo
 * HTML. Aquí quedan dos rampas de verdad. Nada se ve distinto de un vistazo,
 * pero el ritmo vertical deja de ser accidental.
 */

/** Rampa de espaciado en base 4, con medios pasos donde hacen falta. */
export const espacio = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  '3xl': 16,
  '4xl': 20,
  '5xl': 24,
  '6xl': 28,
  '7xl': 32,
  '8xl': 40,
} as const;

/**
 * Radios. El handoff es tajante en una cosa y tiene razón: **0 no se usa en
 * ningún sitio**. Todo en PetGo tiene la esquina rota.
 */
export const radio = {
  /** Badges de estado, chips informativos. */
  xs: 8,
  /** Chips de filtro y de selección, botones pequeños. */
  sm: 10,
  /** Miniaturas, cuadros de icono. */
  md: 12,
  /** Inputs y botones. */
  lg: 14,
  /** Tarjetas internas, botones grandes. */
  xl: 16,
  /** Tarjeta estándar. */
  tarjeta: 20,
  /** Tarjeta destacada, bloque de resumen. */
  xxl: 24,
  /** Borde inferior del héroe y superior de los sheets. */
  sheet: 28,
  /** Logo del splash. */
  logo: 34,
  /** Píldoras, asas, avatares. */
  pastilla: 999,
} as const;

/** Padding de pantalla por tipo. */
export const pantalla = {
  /** Lista con título propio y barra de tabs abajo. */
  lista: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 26 },
  /** Pantalla de detalle, con botón atrás arriba. */
  detalle: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 26 },
  /** Login, registro, onboarding. */
  acceso: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 },
} as const;

/**
 * Profundidad en cuatro niveles.
 *
 * El handoff da una sola sombra a casi todo (`0 1px 2px rgba(20,40,30,.04)`),
 * así que en pantalla todo flota exactamente igual y nada destaca. Aquí hay
 * una jerarquía real, y la regla que la sostiene es: **como mucho un `nivel2`
 * por pantalla**. Si dos cosas están elevadas, ninguna lo está.
 *
 * React Native no tiene `spread`, así que las sombras de halo contenido del
 * handoff (`-14px`, `-18px` de desenfoque negativo) no se pueden reproducir
 * literalmente. Se aproximan bajando la opacidad y subiendo el radio. En
 * Android sólo existe `elevation`, que además dibuja la sombra en los cuatro
 * lados: por eso los valores de Android son deliberadamente más bajos que su
 * equivalente iOS.
 */
const sombra = (
  y: number,
  radioSombra: number,
  opacidad: number,
  elevation: number,
  color = '#2a2418',
): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacidad,
      shadowRadius: radioSombra,
    },
    android: { elevation, shadowColor: color },
    default: {},
  })!;

export const profundidad = {
  /** Sin sombra. Se distingue del fondo sólo por el borde. */
  nivel0: {} as ViewStyle,
  /** Tarjeta en reposo dentro de una lista. */
  nivel1: sombra(1, 3, 0.05, 1),
  /** La tarjeta que manda en la pantalla. Una por pantalla. */
  nivel2: sombra(8, 18, 0.08, 4),
  /** Chrome que flota sobre el mapa. */
  nivel3: sombra(6, 16, 0.16, 8),
  /** Bottom sheet. La sombra sube, no baja. */
  sheet: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#2a2418',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.18,
      shadowRadius: 32,
    },
    android: { elevation: 24, shadowColor: '#2a2418' },
    default: {},
  })!,
  /** Banda de lista que se solapa sobre el mapa en el inicio del cuidador. */
  banda: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#2a2418',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
    },
    android: { elevation: 16, shadowColor: '#2a2418' },
    default: {},
  })!,
  /** Toast. Superficie oscura, así que la sombra tiene que ser más densa. */
  toast: sombra(12, 26, 0.34, 16, '#000000'),
  /** Marcador de precio sobre el mapa. */
  marcador: sombra(3, 8, 0.3, 6, '#000000'),
  /** Botón principal: la sombra es verde, no gris. */
  botonPrimario: sombra(8, 16, 0.3, 6, '#2f8168'),
  /** Botón de WhatsApp en el sheet de contacto. */
  botonWhatsapp: sombra(8, 16, 0.3, 6, '#2f7f38'),
  /** CTA de publicación y héroe del detalle. */
  heroe: sombra(12, 26, 0.26, 8, '#1b4336'),
  /** Logo del splash sobre el degradado oscuro. */
  logo: sombra(14, 32, 0.4, 12, '#000000'),
} as const;

/** Alturas de golpeo mínimas (44 pt iOS / 48 dp Android). */
export const golpeo = { minWidth: 44, minHeight: 44 } as const;

/** Chrome de tamaño fijo que se repite en toda la app. */
export const medida = {
  /** Botón atrás de las pantallas de detalle. */
  botonAtras: 40,
  /** Botones de cabecera (forum, notifications). */
  botonCabecera: 42,
  /** Botones flotantes sobre el mapa. */
  botonMapa: 44,
  /** Asa de un bottom sheet. */
  asa: { width: 38, height: 4 },
  /**
   * Lo que ocupa la barra de tabs flotante, sin el área segura inferior.
   *
   * Es la suma de lo que mide: el lado de un tab (44) más el relleno de la
   * barra (8 arriba y 8 abajo) más su separación del borde inferior (10). Lo
   * usa `Pantalla` con `conTabs` para reservar el hueco, porque la barra flota
   * y no lo ocupa por sí misma.
   */
  alturaTabs: 70,
  /** Lado del círculo de un tab inactivo, y alto de la píldora activa. */
  tabLado: 44,
} as const;

export default { espacio, radio, pantalla, profundidad, golpeo, medida };
