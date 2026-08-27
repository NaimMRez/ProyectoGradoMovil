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

// ── Filtros del cuidador ────────────────────────────────────────────────────

const CHIP_DISTANCIA = ['1 km', '3 km', '5 km', '10 km'] as const;
const CHIP_PAGO = ['Cualquiera', 'Bs 30+', 'Bs 40+', 'Bs 60+'] as const;
const CHIP_DURACION = ['Todas', '30 min', '60 min', '90 min'] as const;
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

/** `"60 min"` → 60. `"Todas"` → sin filtro. */
const aDuracion = (chip: (typeof CHIP_DURACION)[number]): number | null => {
  if (chip === 'Todas') return null;
  return Number.parseInt(chip, 10);
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
      duracionMin: aDuracion(entrada.duracion),
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

export const crearSolicitudSchema = z.object({
  /** Una solicitud puede llevar varias mascotas; al menos una. */
  mascotaIds: z
    .array(z.uuid())
    .min(1, 'Selecciona al menos una mascota')
    .max(5, 'Como máximo cinco mascotas por paseo'),

  fechaHora: z.coerce.date(),

  duracionMin: z
    .number()
    .int()
    .refine((v) => [30, 45, 60, 90].includes(v), 'Duración no válida'),

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
