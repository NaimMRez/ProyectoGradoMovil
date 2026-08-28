import { Router } from 'express';
import { z } from 'zod';
import { Rol } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { asincrono, errorNoEncontrado } from '../../lib/errores.js';
import { fechaHora, hora, horaODia } from '../../lib/fechas.js';
import { bolivianos, codigoSolicitud, duracion, unirNombres } from '../../lib/texto.js';
import { exigirParticipante, tieneConversacion } from '../../domain/status.js';
import { exigirSesion, sesionDe } from '../../middleware/auth.js';
import { paramDe, validar } from '../../middleware/validar.js';
import { emitirA } from '../../realtime/socket.js';
import { serializarUsuario, CAMPOS_PUBLICOS } from '../auth/auth.routes.js';

/**
 * Chat.
 *
 * **Una conversación es una solicitud con cuidador asignado más sus mensajes.**
 * No hay tabla `conversations` y no hace falta: el hilo se ancla a la
 * solicitud, no a un par de usuarios, así que dos personas que coinciden en dos
 * paseos tienen dos hilos separados. Es lo que pidió el cliente y lo que hace
 * que la cabecera del chat pueda mostrar siempre de qué paseo se está hablando.
 */
export const rutasMensajes = Router();

rutasMensajes.use(exigirSesion);

const idSchema = z.object({ id: z.uuid() });

const mensajeSchema = z.object({
  texto: z.string().trim().min(1, 'El mensaje está vacío').max(2000),
});

// `satisfies` y no `as const`: con `as const` el objeto queda de sólo lectura y
// Prisma deja de poder inferir la forma del resultado.
const INCLUIR_CONVERSACION = {
  mascotas: { include: { mascota: true } },
  dueno: { select: CAMPOS_PUBLICOS },
  cuidador: { select: CAMPOS_PUBLICOS },
} satisfies Prisma.SolicitudInclude;

type FilaConversacion = {
  id: string;
  codigo: number;
  duenoId: string;
  cuidadorId: string | null;
  fechaHora: Date;
  duracionMin: number;
  pagoBs: number;
  mascotas: { mascota: { nombre: string; fotoUrl: string | null } }[];
  dueno: Parameters<typeof serializarUsuario>[0];
  cuidador: Parameters<typeof serializarUsuario>[0] | null;
};

function serializarConversacion(
  fila: FilaConversacion,
  papel: Rol,
  ultimo: { texto: string; creadoEn: Date } | null,
  noLeidos: number,
) {
  const contraparte = papel === Rol.dueno ? fila.cuidador! : fila.dueno;
  const nombres = unirNombres(fila.mascotas.map((p) => p.mascota.nombre));
  const codigo = codigoSolicitud(fila.codigo);

  return {
    // El id de la conversación **es** el de la solicitud. No hay otra entidad.
    id: fila.id,
    contraparte: serializarUsuario(contraparte),
    solicitud: {
      id: fila.id,
      codigo,
      mascotasEtiqueta: nombres,
      fechaEtiqueta: fechaHora(fila.fechaHora),
      duracionEtiqueta: duracion(fila.duracionMin),
      pagoEtiqueta: bolivianos(fila.pagoBs),
      fotoUrl: fila.mascotas[0]?.mascota.fotoUrl ?? null,
    },
    ultimoMensaje: ultimo?.texto ?? '',
    horaEtiqueta: ultimo ? horaODia(ultimo.creadoEn) : '',
    noLeidos,
    vinculoEtiqueta: `Solicitud ${codigo} · ${nombres}`,
  };
}

/** Los hilos del usuario. Sólo hay hilo donde hay cuidador asignado. */
rutasMensajes.get(
  '/',
  asincrono(async (req, res) => {
    const { usuarioId, rol } = sesionDe(req);

    const solicitudes = await prisma.solicitud.findMany({
      where: {
        ...(rol === Rol.dueno ? { duenoId: usuarioId } : { cuidadorId: usuarioId }),
        cuidadorId: { not: null },
        // Un hilo sin un solo mensaje no es una conversación todavía.
        mensajes: { some: {} },
      },
      include: {
        ...INCLUIR_CONVERSACION,
        mensajes: { orderBy: { creadoEn: 'desc' }, take: 1 },
        _count: {
          select: {
            mensajes: { where: { autorId: { not: usuarioId }, leidoEn: null } },
          },
        },
      },
      orderBy: { actualizadoEn: 'desc' },
    });

    res.json(
      solicitudes.map((s) =>
        serializarConversacion(s, rol, s.mensajes[0] ?? null, s._count.mensajes),
      ),
    );
  }),
);

/** La cabecera de un chat: contraparte y solicitud vinculada. */
rutasMensajes.get(
  '/:id',
  validar(idSchema, 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);

    const solicitud = await prisma.solicitud.findUnique({
      where: { id: paramDe(req, 'id') },
      include: {
        ...INCLUIR_CONVERSACION,
        mensajes: { orderBy: { creadoEn: 'desc' }, take: 1 },
      },
    });

    if (!solicitud) throw errorNoEncontrado('No encontramos esta conversación');
    if (!tieneConversacion(solicitud)) {
      throw errorNoEncontrado('Esta solicitud todavía no tiene cuidador');
    }

    const papel = exigirParticipante(solicitud, usuarioId);

    res.json(serializarConversacion(solicitud, papel, solicitud.mensajes[0] ?? null, 0));
  }),
);

/** El historial. Marca como leídos los mensajes de la contraparte al abrirlo. */
rutasMensajes.get(
  '/:id/messages',
  validar(idSchema, 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    const solicitudId = paramDe(req, 'id');

    const solicitud = await prisma.solicitud.findUnique({
      where: { id: solicitudId },
      select: { duenoId: true, cuidadorId: true, estado: true, awaitingConfirmation: true },
    });

    if (!solicitud) throw errorNoEncontrado('No encontramos esta conversación');
    exigirParticipante(solicitud, usuarioId);

    const mensajes = await prisma.mensaje.findMany({
      where: { solicitudId },
      orderBy: { creadoEn: 'asc' },
    });

    // Abrir el chat es haberlos leído. Se hace después de la lectura para no
    // retrasar la respuesta con una escritura que al cliente no le importa.
    void prisma.mensaje
      .updateMany({
        where: { solicitudId, autorId: { not: usuarioId }, leidoEn: null },
        data: { leidoEn: new Date() },
      })
      .catch(() => {
        // Que falle marcar como leído no debe romper la lectura del chat.
      });

    res.json(
      mensajes.map((m) => ({
        id: m.id,
        solicitudId: m.solicitudId,
        autorId: m.autorId,
        texto: m.texto,
        horaEtiqueta: hora(m.creadoEn),
      })),
    );
  }),
);

rutasMensajes.post(
  '/:id/messages',
  validar(idSchema, 'params'),
  validar(mensajeSchema),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    const solicitudId = paramDe(req, 'id');
    const { texto } = req.body as z.infer<typeof mensajeSchema>;

    const solicitud = await prisma.solicitud.findUnique({
      where: { id: solicitudId },
      select: { duenoId: true, cuidadorId: true, estado: true, awaitingConfirmation: true },
    });

    if (!solicitud) throw errorNoEncontrado('No encontramos esta conversación');
    if (!tieneConversacion(solicitud)) {
      throw errorNoEncontrado('Esta solicitud todavía no tiene cuidador');
    }

    exigirParticipante(solicitud, usuarioId);

    const mensaje = await prisma.mensaje.create({
      data: { solicitudId, autorId: usuarioId, texto },
    });

    // A los dos: el que escribe también, para que sus otras sesiones abiertas
    // vean el mensaje sin recargar.
    emitirA([solicitud.duenoId, solicitud.cuidadorId], { tipo: 'mensaje', solicitudId });

    res.status(201).json({
      id: mensaje.id,
      solicitudId,
      autorId: usuarioId,
      texto: mensaje.texto,
      horaEtiqueta: hora(mensaje.creadoEn),
    });
  }),
);
