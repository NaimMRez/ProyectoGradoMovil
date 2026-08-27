import type { TextStyle } from 'react-native';

/**
 * Tipografía de PetGo.
 *
 * Dos familias: Familjen Grotesk para títulos, nombres y cifras; DM Sans para
 * toda la interfaz. React Native **no** deriva pesos de una familia variable:
 * cada peso es un archivo distinto, así que `fontFamily` ya lleva el peso
 * dentro y nunca se escribe `fontWeight` junto a estas entradas.
 *
 * El handoff traía una escala de prototipo HTML: 10.5, 11.5, 12.5, 13.5, 14.5,
 * 15.5, 19, 25… medios píxeles nacidos de empujar el navegador hasta que se
 * viera bien. Aquí está consolidada en una rampa real. Se conserva la jerarquía
 * (qué es más grande que qué) y se pierde el ruido. Los tamaños de metadatos
 * suben de 11.5–12.5 a 12–13: en un Android de 412 px de ancho, 11.5 px de
 * DM Sans a 400 es más pequeño de lo que ningún diseño necesita.
 *
 * Cada entrada es un `TextStyle` completo y listo para expandir en un `style`.
 */

export const familia = {
  tituloMedio: 'FamiljenGrotesk_500Medium',
  titulo: 'FamiljenGrotesk_600SemiBold',
  tituloFuerte: 'FamiljenGrotesk_700Bold',
  cuerpo: 'DMSans_400Regular',
  cuerpoMedio: 'DMSans_500Medium',
  cuerpoFuerte: 'DMSans_600SemiBold',
  cuerpoNegrita: 'DMSans_700Bold',
} as const;

const T = familia;

export const tipografia = {
  // ── Familjen Grotesk ──────────────────────────────────────────────────────
  /** "PetGo" en el splash. */
  marca: {
    fontFamily: T.tituloFuerte,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1.2,
  } as TextStyle,

  /** Título de onboarding y de login. */
  tituloXL: {
    fontFamily: T.titulo,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.6,
  } as TextStyle,

  /** Título de registro. */
  tituloL: {
    fontFamily: T.titulo,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.56,
  } as TextStyle,

  /** Título de pantalla con tabs: "Mis mascotas", "Notificaciones". */
  tituloM: {
    fontFamily: T.titulo,
    fontSize: 24,
    lineHeight: 27,
    letterSpacing: -0.48,
  } as TextStyle,

  /** Nombres de mascota en el héroe del detalle. */
  tituloS: {
    fontFamily: T.titulo,
    fontSize: 22,
    lineHeight: 25,
    letterSpacing: -0.44,
  } as TextStyle,

  /** Cabecera de un bottom sheet. */
  tituloSheet: {
    fontFamily: T.titulo,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  } as TextStyle,

  /** Título de pantalla de detalle (con botón atrás) y nombre de perfil. */
  tituloDetalle: {
    fontFamily: T.titulo,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.27,
  } as TextStyle,

  /** Nombre de mascota en tarjeta, título de CTA, valor de estadística. */
  tituloTarjeta: {
    fontFamily: T.titulo,
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.2,
  } as TextStyle,

  /** Encabezado de sección: "Mis mascotas", "Solicitudes activas". */
  seccion: {
    fontFamily: T.titulo,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  } as TextStyle,

  /**
   * Cifra en tipografía de display. Para el cuidador el pago es el dato de
   * decisión, así que no va en cuerpo.
   */
  cifra: {
    fontFamily: T.titulo,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  } as TextStyle,

  /** Input de remuneración en el asistente. */
  cifraGrande: {
    fontFamily: T.titulo,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.3,
  } as TextStyle,

  // ── DM Sans ───────────────────────────────────────────────────────────────
  /** Cuerpo del onboarding. */
  cuerpoL: {
    fontFamily: T.cuerpo,
    fontSize: 15,
    lineHeight: 24,
  } as TextStyle,

  /** Cuerpo por defecto, inputs y burbujas de chat. */
  cuerpo: {
    fontFamily: T.cuerpo,
    fontSize: 14,
    lineHeight: 21,
  } as TextStyle,

  /** Cuerpo dentro de tarjetas densas. */
  cuerpoS: {
    fontFamily: T.cuerpo,
    fontSize: 13,
    lineHeight: 20,
  } as TextStyle,

  /** Metadatos: dirección, fecha, duración, distancia. */
  meta: {
    fontFamily: T.cuerpo,
    fontSize: 12,
    lineHeight: 17,
  } as TextStyle,

  /** Hora de un mensaje, nota al pie, contador de sección. */
  caption: {
    fontFamily: T.cuerpo,
    fontSize: 11,
    lineHeight: 16,
  } as TextStyle,

  /** Nombre de persona o mascota dentro de una tarjeta. */
  nombre: {
    fontFamily: T.cuerpoFuerte,
    fontSize: 15,
    lineHeight: 20,
  } as TextStyle,

  /** Nombre en una fila densa (conversación, contraparte). */
  nombreS: {
    fontFamily: T.cuerpoFuerte,
    fontSize: 14,
    lineHeight: 19,
  } as TextStyle,

  /** Título de una tarjeta compacta: notificación, aviso, resumen. */
  tituloDenso: {
    fontFamily: T.cuerpoFuerte,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  /** Botón principal a ancho completo. */
  botonL: {
    fontFamily: T.cuerpoFuerte,
    fontSize: 15,
    lineHeight: 20,
  } as TextStyle,

  /** Botón estándar. */
  boton: {
    fontFamily: T.cuerpoFuerte,
    fontSize: 14,
    lineHeight: 19,
  } as TextStyle,

  /** Botón dentro de una tarjeta. */
  botonS: {
    fontFamily: T.cuerpoFuerte,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  /** Etiqueta de campo de formulario. */
  etiqueta: {
    fontFamily: T.cuerpoMedio,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  /** Enlace de texto: "Ver todas", "Saltar", "Limpiar". */
  enlace: {
    fontFamily: T.cuerpoMedio,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  /** Chip de selección o de filtro. */
  chip: {
    fontFamily: T.cuerpoMedio,
    fontSize: 13,
    lineHeight: 17,
  } as TextStyle,

  /** Chip informativo dentro de una tarjeta de mascota. */
  chipS: {
    fontFamily: T.cuerpoMedio,
    fontSize: 11,
    lineHeight: 15,
  } as TextStyle,

  /** Badge de estado del servicio. */
  badge: {
    fontFamily: T.cuerpoFuerte,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Etiqueta sobre una cifra de estadística. */
  etiquetaStat: {
    fontFamily: T.cuerpoMedio,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Número dentro del badge rojo de no leídas. */
  contador: {
    fontFamily: T.cuerpoFuerte,
    fontSize: 10,
    lineHeight: 12,
  } as TextStyle,

  /** Etiqueta de la barra de tabs. */
  tab: {
    fontFamily: T.cuerpo,
    fontSize: 11,
    lineHeight: 14,
  } as TextStyle,

  tabActivo: {
    fontFamily: T.cuerpoFuerte,
    fontSize: 11,
    lineHeight: 14,
  } as TextStyle,
} as const;

export type ClaveTipografia = keyof typeof tipografia;

export default tipografia;
