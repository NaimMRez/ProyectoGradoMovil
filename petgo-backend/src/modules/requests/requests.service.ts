import { EstadoServicio, Rol, TipoNotificacion } from '../../generated/prisma/enums.js';
import { prisma } from '../../lib/prisma.js';
import { errorNoEncontrado, errorProhibido, errorRegla } from '../../lib/errores.js';
import { codigoSolicitud, primerNombre, unirNombres } from '../../lib/texto.js';
import { fechaHora } from '../../lib/fechas.js';
import {
  exigirPuedeCancelar,
  exigirPuedeConfirmar,
  papelEn,
  resolverAccionCuidador,
} from '../../domain/status.js';
import { emitirA } from '../../realtime/socket.js';
import {
  INCLUIR_SOLICITUD,
  buscarCercanas,
  buscarParaReglas,
  buscarPorId,
  hidratarEnOrden,
} from './requests.repository.js';
import { serializarSolicitud, type SolicitudSerializada } from './requests.serializer.js';
import type { CrearSolicitud, FiltrosCercanas } from './requests.schemas.js';

/**
 * Lógica de solicitudes.
 *
 * Las transiciones de estado pasan **todas** por `domain/status.ts`, que es la
 * autoridad. Este archivo se ocupa de lo que va alrededor: guardar el cambio,
 * registrar el evento del timeline, crear la notificación que corresponda,
 * empujarla por el socket y devolver el texto del toast.
 */

/** Respuesta de una mutación: el dato nuevo y el aviso que la app va a mostrar. */
export type Resultado<T> = { datos: T; toast: string };

// ── Lecturas ────────────────────────────────────────────────────────────────

/**
 * "Mis solicitudes" (dueño) o "Mis servicios" (cuidador).
 *
 * El rol decide la fuente: el dueño ve todas las suyas, el cuidador **sólo las
 * que aceptó**. No es una preferencia de vista, es qué filas le corresponden.
 */
export async function listarDelUsuario(
  usuarioId: string,
  rol: Rol,
  estado: EstadoServicio | null,
): Promise<SolicitudSerializada[]> {
  const filas = await prisma.solicitud.findMany({
    where: {
      ...(rol === Rol.dueno ? { duenoId: usuarioId } : { cuidadorId: usuarioId }),
      ...(estado ? { estado } : {}),
    },
    include: INCLUIR_SOLICITUD,
    orderBy: { fechaHora: 'desc' },
  });

  return filas.map((f) => serializarSolicitud(f));
}

/** Las que siguen vivas, para el inicio del dueño. */
export async function activasDelDueno(duenoId: string): Promise<SolicitudSerializada[]> {
  const filas = await prisma.solicitud.findMany({
    where: {
      duenoId,
      estado: {
        in: [
          EstadoServicio.publicada,
          EstadoServicio.aceptada,
          EstadoServicio.programada,
          EstadoServicio.proceso,
        ],
      },
    },
    include: INCLUIR_SOLICITUD,
    orderBy: { fechaHora: 'asc' },
  });

  return filas.map((f) => serializarSolicitud(f));
}

/** Solicitudes cerca del cuidador. Es la consulta geoespacial. */
export async function cercanas(
  cuidadorId: string,
  filtros: FiltrosCercanas,
): Promise<SolicitudSerializada[]> {
  const cercanas = await buscarCercanas(filtros, cuidadorId);
  const filas = await hidratarEnOrden(cercanas.map((c) => c.id));

  const metrosPorId = new Map(cercanas.map((c) => [c.id, c.metros]));

  return filas.map((f) => serializarSolicitud(f, { metros: metrosPorId.get(f.id) ?? null }));
}

/**
 * Una solicitud concreta.
 *
 * Una solicitud publicada la puede ver cualquier cuidador — para eso está
 * publicada. En cuanto tiene cuidador asignado, sólo la ven las dos partes.
 */
export async function obtener(
  id: string,
  usuarioId: string,
): Promise<SolicitudSerializada> {
  const fila = await buscarPorId(id);
  if (!fila) throw errorNoEncontrado('No encontramos esta solicitud');

  const esParte = papelEn(fila, usuarioId) !== null;
  const esPublica = fila.estado === EstadoServicio.publicada && !fila.cuidadorId;

  if (!esParte && !esPublica) {
    throw errorProhibido('Esta solicitud ya no está disponible');
  }

  return serializarSolicitud(fila);
}

// ── Crear ───────────────────────────────────────────────────────────────────

export async function crear(
  duenoId: string,
  datos: CrearSolicitud,
): Promise<Resultado<SolicitudSerializada>> {
  // Las mascotas tienen que ser suyas. Sin esta comprobación, cualquiera podría
  // publicar un paseo con el perro de otra persona.
  const propias = await prisma.mascota.count({
    where: { id: { in: datos.mascotaIds }, duenoId },
  });

  if (propias !== datos.mascotaIds.length) {
    throw errorRegla('Alguna de esas mascotas no es tuya');
  }

  const creada = await prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitud.create({
      data: {
        duenoId,
        fechaHora: datos.fechaHora,
        duracionMin: datos.duracionMin,
        pagoBs: datos.pagoBs,
        direccion: datos.direccion,
        zona: datos.zona,
        lat: datos.lat,
        lng: datos.lng,
        notas: datos.notas,
        // `ubicacion` no se escribe nunca desde Prisma: el trigger la deriva de
        // lat/lng en el mismo INSERT.
        mascotas: {
          create: datos.mascotaIds.map((mascotaId) => ({ mascotaId })),
        },
        eventos: { create: { estado: EstadoServicio.publicada } },
      },
      include: INCLUIR_SOLICITUD,
    });

    return solicitud;
  });

  return {
    datos: serializarSolicitud(creada),
    toast: 'Solicitud publicada · los cuidadores cercanos ya la ven',
  };
}

// ── Transiciones ────────────────────────────────────────────────────────────

const ETIQUETA_MINUSCULA: Record<EstadoServicio, string> = {
  publicada: 'publicada',
  aceptada: 'aceptada',
  programada: 'programada',
  proceso: 'en proceso',
  finalizada: 'finalizada',
  cancelada: 'cancelada',
};

/**
 * El cuidador avanza el estado — o marca el fin del paseo, que **no** es lo
 * mismo. En `proceso` la acción activa `awaitingConfirmation` y deja el estado
 * donde estaba: el servicio no se cierra hasta que el dueño lo confirme.
 */
export async function avanzarEstado(
  id: string,
  usuarioId: string,
): Promise<Resultado<SolicitudSerializada>> {
  const previa = await buscarParaReglas(id);
  if (!previa) throw errorNoEncontrado('No encontramos esta solicitud');

  const accion = resolverAccionCuidador(previa, usuarioId);

  if (accion.tipo === 'terminarPaseo') {
    const actualizada = await prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitud.update({
        where: { id },
        data: { awaitingConfirmation: true },
        include: INCLUIR_SOLICITUD,
      });

      const nombres = unirNombres(solicitud.mascotas.map((p) => p.mascota.nombre));
      const cuidador = await tx.usuario.findUniqueOrThrow({
        where: { id: usuarioId },
        select: { nombre: true },
      });

      await tx.notificacion.create({
        data: {
          usuarioId: solicitud.duenoId,
          tipo: TipoNotificacion.confirmar,
          titulo: 'Confirma que el paseo terminó',
          cuerpo: `${primerNombre(cuidador.nombre)} marcó como finalizado el paseo de ${nombres}. Confirma para cerrar el servicio.`,
          solicitudId: id,
        },
      });

      return solicitud;
    });

    emitirA([actualizada.duenoId], { tipo: 'notificacion' });
    emitirA([actualizada.duenoId, actualizada.cuidadorId], {
      tipo: 'solicitud',
      solicitudId: id,
    });

    return {
      datos: serializarSolicitud(actualizada),
      toast: 'Marcado como terminado · esperando confirmación del dueño',
    };
  }

  const actualizada = await prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitud.update({
      where: { id },
      data: {
        estado: accion.siguiente,
        eventos: { create: { estado: accion.siguiente } },
      },
      include: INCLUIR_SOLICITUD,
    });

    if (accion.siguiente === EstadoServicio.proceso) {
      const nombres = unirNombres(solicitud.mascotas.map((p) => p.mascota.nombre));
      const cuidador = await tx.usuario.findUniqueOrThrow({
        where: { id: usuarioId },
        select: { nombre: true },
      });

      await tx.notificacion.create({
        data: {
          usuarioId: solicitud.duenoId,
          tipo: TipoNotificacion.iniciado,
          titulo: `${primerNombre(cuidador.nombre)} marcó el paseo como iniciado`,
          cuerpo: `Solicitud ${codigoSolicitud(solicitud.codigo)} · ${nombres} salieron a las ${fechaHora(new Date()).split('· ')[1]}.`,
          solicitudId: id,
        },
      });
    }

    return solicitud;
  });

  emitirA([actualizada.duenoId, actualizada.cuidadorId], {
    tipo: 'solicitud',
    solicitudId: id,
  });
  emitirA([actualizada.duenoId], { tipo: 'notificacion' });

  return {
    datos: serializarSolicitud(actualizada),
    toast: `Estado actualizado a ${ETIQUETA_MINUSCULA[accion.siguiente]}`,
  };
}

/**
 * `POST /api/requests/:id/confirm` — **el único camino a `finalizada`**.
 *
 * Sólo el dueño puede recorrerlo, y sólo cuando el cuidador ya marcó el fin del
 * paseo. Es la regla que sostiene todo el flujo del cliente.
 */
export async function confirmarFinalizacion(
  id: string,
  usuarioId: string,
): Promise<Resultado<SolicitudSerializada>> {
  const previa = await buscarParaReglas(id);
  if (!previa) throw errorNoEncontrado('No encontramos esta solicitud');

  exigirPuedeConfirmar(previa, usuarioId);

  const actualizada = await prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitud.update({
      where: { id },
      data: {
        estado: EstadoServicio.finalizada,
        awaitingConfirmation: false,
        eventos: { create: { estado: EstadoServicio.finalizada } },
      },
      include: INCLUIR_SOLICITUD,
    });

    // La notificación de confirmación desaparece: ya se actuó sobre ella y
    // dejarla sería invitar al dueño a confirmar dos veces.
    await tx.notificacion.deleteMany({
      where: { solicitudId: id, tipo: TipoNotificacion.confirmar },
    });

    // El contador de paseos del cuidador sube sólo aquí. Es su única
    // reputación en la app, así que no puede incrementarse en `proceso`: un
    // paseo empezado no es un paseo completado.
    if (solicitud.cuidadorId) {
      await tx.usuario.update({
        where: { id: solicitud.cuidadorId },
        data: { paseosCompletados: { increment: 1 } },
      });
    }

    return solicitud;
  });

  emitirA([actualizada.duenoId, actualizada.cuidadorId], {
    tipo: 'solicitud',
    solicitudId: id,
  });
  emitirA([actualizada.cuidadorId], { tipo: 'notificacion' });

  const nombres = unirNombres(actualizada.mascotas.map((p) => p.mascota.nombre));

  return {
    datos: serializarSolicitud(actualizada),
    toast: `Servicio de ${nombres} finalizado`,
  };
}

/** Ambas partes pueden cancelar antes de un estado terminal. */
export async function cancelar(
  id: string,
  usuarioId: string,
): Promise<Resultado<SolicitudSerializada>> {
  const previa = await buscarParaReglas(id);
  if (!previa) throw errorNoEncontrado('No encontramos esta solicitud');

  exigirPuedeCancelar(previa, usuarioId);

  const quienCancela = papelEn(previa, usuarioId);
  const laOtraParte =
    quienCancela === Rol.dueno ? previa.cuidadorId : previa.duenoId;

  const actualizada = await prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitud.update({
      where: { id },
      data: {
        estado: EstadoServicio.cancelada,
        awaitingConfirmation: false,
        eventos: { create: { estado: EstadoServicio.cancelada } },
      },
      include: INCLUIR_SOLICITUD,
    });

    await tx.notificacion.deleteMany({
      where: { solicitudId: id, tipo: TipoNotificacion.confirmar },
    });

    // A quien cancela no se le notifica lo que acaba de hacer.
    if (laOtraParte) {
      const nombres = unirNombres(solicitud.mascotas.map((p) => p.mascota.nombre));
      await tx.notificacion.create({
        data: {
          usuarioId: laOtraParte,
          tipo: TipoNotificacion.cancelada,
          titulo: `Solicitud ${codigoSolicitud(solicitud.codigo)} cancelada`,
          cuerpo: `Se canceló el paseo de ${nombres}.`,
          solicitudId: id,
        },
      });
    }

    return solicitud;
  });

  emitirA([actualizada.duenoId, actualizada.cuidadorId], {
    tipo: 'solicitud',
    solicitudId: id,
  });
  emitirA([laOtraParte], { tipo: 'notificacion' });

  return { datos: serializarSolicitud(actualizada), toast: 'Servicio cancelado' };
}
