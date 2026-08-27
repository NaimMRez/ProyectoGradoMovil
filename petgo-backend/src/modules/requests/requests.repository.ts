import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type { FiltrosCercanas } from './requests.schemas.js';

/**
 * Acceso a datos de solicitudes.
 *
 * La consulta de solicitudes cercanas va en SQL crudo porque Prisma no puede
 * expresarla: no tiene tipo `geography` ni conoce `ST_DWithin`. El resto del
 * módulo sí usa el cliente normal.
 */

/** Lo que la app necesita para pintar una solicitud, con sus relaciones. */
export const INCLUIR_SOLICITUD = {
  mascotas: { include: { mascota: true } },
  eventos: { orderBy: { creadoEn: 'asc' } },
  _count: { select: { intereses: true } },
} satisfies Prisma.SolicitudInclude;

/**
 * Solicitudes publicadas dentro del radio, ordenadas por cercanía.
 *
 * Tres detalles de PostGIS que hay que respetar, y que fallan en silencio si se
 * ignoran:
 *
 * 1. **`ST_DWithin` sobre `geography` mide en metros** y es lo que puede usar
 *    el índice GiST. Escribir `ST_Distance(...) < radio` en el `WHERE` da el
 *    mismo resultado y degrada a escaneo secuencial de la tabla entera, porque
 *    el planificador ya no puede aprovechar el índice.
 * 2. **`ST_MakePoint` recibe (longitud, latitud)**, en ese orden, al revés de
 *    como se dicen las coordenadas. Invertirlos no da error: coloca el punto en
 *    otro continente y la lista sale vacía.
 * 3. `ST_Distance` se calcula en el `SELECT`, no en el `WHERE`. Así el filtro
 *    lo hace el índice y la distancia se calcula sólo para las filas que
 *    sobrevivieron.
 *
 * Devuelve id y metros; las relaciones las hidrata Prisma después. Separarlo
 * mantiene la consulta geoespacial pequeña y deja los `join` a quien sabe
 * hacerlos.
 */
export async function buscarCercanas(
  filtros: FiltrosCercanas,
  excluirDuenoId: string,
  limite = 60,
): Promise<{ id: string; metros: number }[]> {
  const { lat, lng, radioMetros, pagoMinimo, duracionMin, rangoFechas, rangoMascotas } =
    filtros;

  const desde = rangoFechas?.desde ?? null;
  const hasta = rangoFechas?.hasta ?? null;
  const minMascotas = rangoMascotas?.minimo ?? null;
  const maxMascotas = rangoMascotas?.maximo ?? null;

  return prisma.$queryRaw<{ id: string; metros: number }[]>`
    SELECT
      r.id,
      ST_Distance(
        r.ubicacion,
        ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
      ) AS metros
    FROM "requests" r
    WHERE r.estado = 'publicada'
      AND r.carer_id IS NULL
      AND r.owner_id <> ${excluirDuenoId}
      AND r.ubicacion IS NOT NULL
      AND ST_DWithin(
        r.ubicacion,
        ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
        ${radioMetros}::float8
      )
      AND (${pagoMinimo}::int IS NULL OR r.pago_bs >= ${pagoMinimo}::int)
      AND (${duracionMin}::int IS NULL OR r.duracion_min = ${duracionMin}::int)
      AND (${desde}::timestamp IS NULL OR r.fecha_hora >= ${desde}::timestamp)
      AND (${hasta}::timestamp IS NULL OR r.fecha_hora <= ${hasta}::timestamp)
      AND (
        ${minMascotas}::int IS NULL
        OR (
          SELECT COUNT(*) FROM "request_pets" rp WHERE rp.request_id = r.id
        ) >= ${minMascotas}::int
      )
      AND (
        ${maxMascotas}::int IS NULL
        OR (
          SELECT COUNT(*) FROM "request_pets" rp WHERE rp.request_id = r.id
        ) <= ${maxMascotas}::int
      )
    ORDER BY metros ASC
    LIMIT ${limite}
  `;
}

/**
 * Hidrata las solicitudes de una lista de ids **conservando el orden recibido**.
 *
 * Prisma devuelve las filas en el orden que quiera el planificador, y aquí el
 * orden es el resultado: es el `ORDER BY metros` de la consulta geoespacial, y
 * es lo que produce la lista del inicio del cuidador.
 */
export async function hidratarEnOrden(ids: readonly string[]) {
  if (ids.length === 0) return [];

  const filas = await prisma.solicitud.findMany({
    where: { id: { in: [...ids] } },
    include: INCLUIR_SOLICITUD,
  });

  const porId = new Map(filas.map((f) => [f.id, f]));
  return ids.map((id) => porId.get(id)).filter((f) => f !== undefined);
}

/** Una solicitud con todo lo que la app necesita, o `null`. */
export function buscarPorId(id: string) {
  return prisma.solicitud.findUnique({ where: { id }, include: INCLUIR_SOLICITUD });
}

/** Sólo los campos que hacen falta para decidir una transición de estado. */
export function buscarParaReglas(id: string) {
  return prisma.solicitud.findUnique({
    where: { id },
    select: {
      id: true,
      estado: true,
      awaitingConfirmation: true,
      duenoId: true,
      cuidadorId: true,
      codigo: true,
    },
  });
}
