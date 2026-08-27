import { Router } from 'express';
import { z } from 'zod';
import { EstadoServicio, TipoNotificacion } from '../../generated/prisma/enums.js';
import { prisma } from '../../lib/prisma.js';
import { asincrono, errorNoEncontrado } from '../../lib/errores.js';
import {
  codigoSolicitud,
  distanciaLarga,
  primerNombre,
  unirNombres,
} from '../../lib/texto.js';
import { fechaHora } from '../../lib/fechas.js';
import {
  exigirPuedeAceptarInteresado,
  exigirPuedeManifestarInteres,
} from '../../domain/status.js';
import { exigirSesion, sesionDe } from '../../middleware/auth.js';
import { paramDe, validar } from '../../middleware/validar.js';
import { emitirA } from '../../realtime/socket.js';
import { serializarUsuario } from '../auth/auth.routes.js';
import {
  INCLUIR_SOLICITUD,
  buscarParaReglas,
} from '../requests/requests.repository.js';
import { serializarSolicitud } from '../requests/requests.serializer.js';

/**
 * Intereses.
 *
 * Cuando varios cuidadores se ofrecen, **el dueño elige** — decisión cerrada
 * del cliente. Aceptar a uno pone la solicitud en `aceptada` y la saca de la
 * lista pública, con lo que los demás interesados dejan de verla.
 */
export const rutasIntereses = Router();

rutasIntereses.use(exigirSesion);

const idSchema = z.object({ id: z.uuid() });

const interesSchema = z.object({
  mensaje: z
    .string()
    .trim()
    .max(300)
    .default('Estoy disponible para este paseo.'),
  /** Posición del cuidador, para calcular la distancia al punto de recogida. */
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

/**
 * Distancia en metros entre dos puntos, por haversine.
 *
 * Se guarda en el interés y no se recalcula al mostrarlo: la distancia que le
 * importa al dueño es la que había cuando el cuidador se ofreció, no dónde esté
 * ese cuidador tres horas después.
 */
function metrosEntre(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_008.8;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(rad(a.lat)) * Math.cos(rad(b.lat));
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Los cuidadores que se ofrecieron. Sólo los ve el dueño de la solicitud. */
rutasIntereses.get(
  '/:id/interests',
  validar(idSchema, 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    const solicitudId = paramDe(req, 'id');

    const solicitud = await prisma.solicitud.findUnique({
      where: { id: solicitudId },
      select: { duenoId: true },
    });

    if (!solicitud) throw errorNoEncontrado('No encontramos esta solicitud');
    if (solicitud.duenoId !== usuarioId) {
      throw errorNoEncontrado('No encontramos esta solicitud');
    }

    const intereses = await prisma.interes.findMany({
      where: { solicitudId },
      include: { cuidador: true },
      orderBy: { creadoEn: 'asc' },
    });

    res.json(
      intereses.map((i) => ({
        id: i.id,
        cuidador: serializarUsuario(i.cuidador),
        mensaje: i.mensaje,
        distanciaEtiqueta: distanciaLarga(i.metros),
      })),
    );
  }),
);

/** El cuidador se ofrece. Sólo a una solicitud publicada, libre y ajena. */
rutasIntereses.post(
  '/:id/interest',
  validar(idSchema, 'params'),
  validar(interesSchema),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    const solicitudId = paramDe(req, 'id');
    const datos = req.body as z.infer<typeof interesSchema>;

    const solicitud = await prisma.solicitud.findUnique({
      where: { id: solicitudId },
      include: INCLUIR_SOLICITUD,
    });

    if (!solicitud) throw errorNoEncontrado('No encontramos esta solicitud');

    exigirPuedeManifestarInteres(solicitud, usuarioId);

    const metros =
      datos.lat != null && datos.lng != null
        ? metrosEntre({ lat: datos.lat, lng: datos.lng }, solicitud)
        : 0;

    const [dueno, cuidador] = await Promise.all([
      prisma.usuario.findUniqueOrThrow({
        where: { id: solicitud.duenoId },
        select: { nombre: true },
      }),
      prisma.usuario.findUniqueOrThrow({
        where: { id: usuarioId },
        select: { nombre: true },
      }),
    ]);

    const nombres = unirNombres(solicitud.mascotas.map((p) => p.mascota.nombre));

    await prisma.$transaction(async (tx) => {
      // `upsert` y no `create`: si el cuidador vuelve a pulsar, se actualiza su
      // mensaje en vez de reventar contra el índice único.
      await tx.interes.upsert({
        where: { solicitudId_cuidadorId: { solicitudId, cuidadorId: usuarioId } },
        create: { solicitudId, cuidadorId: usuarioId, mensaje: datos.mensaje, metros },
        update: { mensaje: datos.mensaje, metros },
      });

      await tx.notificacion.create({
        data: {
          usuarioId: solicitud.duenoId,
          tipo: TipoNotificacion.interes,
          titulo: `${cuidador.nombre} está interesado en tu solicitud`,
          cuerpo: `Solicitud ${codigoSolicitud(solicitud.codigo)} · ${nombres} · ${fechaHora(solicitud.fechaHora)}.`,
          solicitudId,
        },
      });
    });

    emitirA([solicitud.duenoId], { tipo: 'notificacion' });
    emitirA([solicitud.duenoId], { tipo: 'solicitud', solicitudId });

    res.status(201).json({
      datos: null,
      toast: `Enviaste tu interés a ${primerNombre(dueno.nombre)}`,
    });
  }),
);

/** El dueño elige. La solicitud pasa a `aceptada` y deja de estar publicada. */
rutasIntereses.post(
  '/:id/interests/:interesId/accept',
  validar(z.object({ id: z.uuid(), interesId: z.uuid() }), 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    const solicitudId = paramDe(req, 'id');
    const interesId = paramDe(req, 'interesId');

    const previa = await buscarParaReglas(solicitudId);
    if (!previa) throw errorNoEncontrado('No encontramos esta solicitud');

    exigirPuedeAceptarInteresado(previa, usuarioId);

    const interes = await prisma.interes.findUnique({
      where: { id: interesId },
      include: { cuidador: { select: { id: true, nombre: true } } },
    });

    if (!interes || interes.solicitudId !== solicitudId) {
      throw errorNoEncontrado('Ese cuidador ya no está disponible');
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitud.update({
        where: { id: solicitudId },
        data: {
          cuidadorId: interes.cuidadorId,
          estado: EstadoServicio.aceptada,
          eventos: { create: { estado: EstadoServicio.aceptada } },
        },
        include: INCLUIR_SOLICITUD,
      });

      const nombres = unirNombres(solicitud.mascotas.map((p) => p.mascota.nombre));

      await tx.notificacion.create({
        data: {
          usuarioId: interes.cuidadorId,
          tipo: TipoNotificacion.aceptado,
          titulo: `Te asignaron el paseo de ${nombres}`,
          cuerpo: `Solicitud ${codigoSolicitud(solicitud.codigo)} · ${fechaHora(solicitud.fechaHora)} en ${solicitud.direccion}.`,
          solicitudId,
        },
      });

      // La notificación de interés ya no sirve de nada: el dueño acaba de
      // actuar sobre ella.
      await tx.notificacion.deleteMany({
        where: { solicitudId, tipo: TipoNotificacion.interes },
      });

      return solicitud;
    });

    emitirA([interes.cuidadorId], { tipo: 'notificacion' });
    emitirA([usuarioId, interes.cuidadorId], { tipo: 'solicitud', solicitudId });

    res.json({
      datos: serializarSolicitud(actualizada),
      toast: `Aceptaste a ${primerNombre(interes.cuidador.nombre)}`,
    });
  }),
);
