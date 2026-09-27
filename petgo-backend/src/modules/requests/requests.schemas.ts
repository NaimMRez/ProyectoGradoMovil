import { z } from 'zod';
import { EstadoServicio } from '../../generated/prisma/enums.js';
import { finDelDia, inicioDelDia, proximosSieteDias } from '../../lib/fechas.js';

/**
 * Esquemas de la API de solicitudes.
 *
 * **Aquí vive la traducción de los chips de filtro.** La app manda el texto que
 * el usuario ve — `"5 km"`, `"Bs 40+"`, `"Esta semana"` — y este archivo lo
 * convierte en parámetros de consulta. Que la traducción viva en el servidor y
 * no en el cliente tiene una consecuencia concreta: cambiar el radio de "5 km"
 * a 6000 metros, o añadir un chip nuevo, no obliga a publicar una versión nueva
 * de la app en la tienda.
 */

/**
 * Duración de un paseo, en minutos: de media hora a tres, en tramos de quince.
 *
 * El dueño la elige con una barra deslizante de topes fijos, así que la app no
 * puede mandar otra cosa; la validación de abajo está porque el servidor no da
 * por bueno nada que venga del cliente. Los mismos tres números viven en
 * `src/utiles/agenda.ts` de la app, que es quien dibuja la barra.
 */
export const DURACION_MIN = 30;
export const DURACION_MAX = 180;
export const DURACION_PASO = 15;

// ── Filtros del cuidador ────────────────────────────────────────────────────

const CHIP_DISTANCIA = ['1 km', '3 km', '5 km', '10 km'] as const;
const CHIP_PAGO = ['Cualquiera', 'Bs 30+', 'Bs 40+', 'Bs 60+'] as const;
export const CHIP_DURACION = ['Todas', 'Hasta 1 h', '1 a 2 h', 'Más de 2 h'] as const;
const CHIP_FECHA = ['Cualquiera', 'Hoy', 'Esta semana'] as const;
const CHIP_MASCOTAS = ['Cualquiera', '1', '2 o más'] as const;

/** `"5 km"` → 5000 metros. Es el radio del `ST_DWithin`, que mide en metros. */
const aMetros = (chip: (typeof CHIP_DISTANCIA)[number]): number =>
  Number.parseFloat(chip) * 1000;

/** `"Bs 40+"` → 40. `"Cualquiera"` → sin mínimo. */
const aPagoMinimo = (chip: (typeof CHIP_PAGO)[number]): number | null => {
  if (chip === 'Cualquiera') return null;
  return Number.parseInt(chip.replace(/\D/g, ''), 10);
};

/**
 * `"1 a 2 h"` → el tramo de duraciones que caen dentro. `"Todas"` → sin filtro.
 *
 * Era una igualdad exacta contra 30, 60 o 90 minutos, y eso dejó de servir en
 * cuanto el dueño pudo pedir cualquier múltiplo de quince entre media hora y
 * tres: un paseo de 45 minutos no aparecía bajo ningún chip, y con la barra
 * nueva seis de los once valores posibles quedarían invisibles. Los tres tramos
 * cubren toda la rejilla, no se solapan y sus bordes salen del paso, no de
 * números escritos a mano.
 */
export const tramoDuracion = (
  chip: (typeof CHIP_DURACION)[number],
): { minimo: number; maximo: number | null } | null => {
  if (chip === 'Todas') return null;
  if (chip === 'Hasta 1 h') return { minimo: DURACION_MIN, maximo: 60 };
  if (chip === '1 a 2 h') return { minimo: 60 + DURACION_PASO, maximo: 120 };
  return { minimo: 120 + DURACION_PASO, maximo: null };
};

/** `"Hoy"` y `"Esta semana"` → rango de fechas, en hora de Bolivia. */
const aRangoFechas = (
  chip: (typeof CHIP_FECHA)[number],
  ahora: Date,
): { desde: Date; hasta: Date } | null => {
  if (chip === 'Cualquiera') return null;
  if (chip === 'Hoy') return { desde: inicioDelDia(ahora), hasta: finDelDia(ahora) };
  return proximosSieteDias(ahora);
};

/** `"2 o más"` → mínimo 2. `"1"` → exactamente 1. */
const aRangoMascotas = (
  chip: (typeof CHIP_MASCOTAS)[number],
): { minimo: number; maximo: number | null } | null => {
  if (chip === 'Cualquiera') return null;
  if (chip === '1') return { minimo: 1, maximo: 1 };
  return { minimo: 2, maximo: null };
};

export const filtrosCercanasSchema = z
  .object({
    // La app siempre manda su posición; si falta, el servidor no inventa una.
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),

    distancia: z.enum(CHIP_DISTANCIA).default('5 km'),
    pago: z.enum(CHIP_PAGO).default('Cualquiera'),
    duracion: z.enum(CHIP_DURACION).default('Todas'),
    fecha: z.enum(CHIP_FECHA).default('Cualquiera'),
    mascotas: z.enum(CHIP_MASCOTAS).default('Cualquiera'),
  })
  .transform((entrada) => {
    const ahora = new Date();
    return {
      lat: entrada.lat,
      lng: entrada.lng,
      radioMetros: aMetros(entrada.distancia),
      pagoMinimo: aPagoMinimo(entrada.pago),
      rangoDuracion: tramoDuracion(entrada.duracion),
      rangoFechas: aRangoFechas(entrada.fecha, ahora),
      rangoMascotas: aRangoMascotas(entrada.mascotas),
    };
  });

export type FiltrosCercanas = z.infer<typeof filtrosCercanasSchema>;

// ── Lista de "Mis solicitudes" / "Mis servicios" ────────────────────────────

const CHIP_ESTADO = ['Todas', 'Publicada', 'Aceptada', 'En proceso', 'Finalizada'] as const;

const ESTADO_DE_CHIP: Record<(typeof CHIP_ESTADO)[number], EstadoServicio | null> = {
  Todas: null,
  Publicada: EstadoServicio.publicada,
  Aceptada: EstadoServicio.aceptada,
  'En proceso': EstadoServicio.proceso,
  Finalizada: EstadoServicio.finalizada,
};

export const listaSolicitudesSchema = z
  .object({ estado: z.enum(CHIP_ESTADO).default('Todas') })
  .transform((entrada) => ({ estado: ESTADO_DE_CHIP[entrada.estado] }));

export type FiltroLista = z.infer<typeof listaSolicitudesSchema>;

// ── Crear solicitud ─────────────────────────────────────────────────────────

/**
 * Hasta cuántos días por delante se puede agendar un paseo.
 *
 * Existe para que la lista del cuidador no se llene de solicitudes lejanas que
 * nadie va a atender hoy. Una semana cubre la planificación real de una
 * jornada laboral o académica, que es el caso que la app resuelve.
 */
export const DIAS_MAXIMOS = 7;

/**
 * Cuánto se tolera que la fecha quede por detrás del reloj.
 *
 * La app no deja elegir una hora pasada, pero entre elegirla y terminar el
 * formulario — la ubicación y el resumen — pasan minutos. Sin esta holgura, un
 * paseo agendado "ahora mismo" sería rechazado por tardar en publicarlo.
 */
const TOLERANCIA_MS = 30 * 60 * 1000;

const DIA_MS = 24 * 60 * 60 * 1000;

export const crearSolicitudSchema = z.object({
  /** Una solicitud puede llevar varias mascotas; al menos una. */
  mascotaIds: z
    .array(z.uuid())
    .min(1, 'Selecciona al menos una mascota')
    .max(5, 'Como máximo cinco mascotas por paseo'),

  /**
   * La comprobación vive aquí y no sólo en el selector de la app: el servidor
   * no puede fiarse de que quien llama sea la app.
   */
  fechaHora: z.coerce
    .date()
    .refine(
      (d) => d.getTime() >= Date.now() - TOLERANCIA_MS,
      'La fecha del paseo ya pasó',
    )
    .refine(
      (d) => d.getTime() <= Date.now() + DIAS_MAXIMOS * DIA_MS,
      `Sólo se pueden agendar paseos con ${DIAS_MAXIMOS} días de antelación como máximo`,
    ),

  duracionMin: z
    .number()
    .int()
    .min(DURACION_MIN, `El paseo más corto dura ${DURACION_MIN} minutos`)
    .max(DURACION_MAX, `El paseo más largo dura ${DURACION_MAX / 60} horas`)
    .refine(
      (v) => v % DURACION_PASO === 0,
      `La duración va en tramos de ${DURACION_PASO} minutos`,
    ),

  pagoBs: z
    .number()
    .int()
    .positive('Indica cuánto ofreces por el paseo')
    .max(10_000, 'Ese monto no parece correcto'),

  direccion: z.string().trim().min(1, 'Indica el punto de recogida').max(200),
  zona: z.string().trim().min(1).max(80),

  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),

  notas: z.string().trim().max(600).default(''),
});

export type CrearSolicitud = z.infer<typeof crearSolicitudSchema>;

export const idSolicitudSchema = z.object({ id: z.uuid() });
