import { Router } from 'express';
import { z } from 'zod';
import { TipoNotificacion } from '../../generated/prisma/enums.js';
import { prisma } from '../../lib/prisma.js';
import { asincrono, errorNoEncontrado } from '../../lib/errores.js';
import { haceCuanto } from '../../lib/fechas.js';
import { exigirSesion, sesionDe } from '../../middleware/auth.js';
import { paramDe, validar } from '../../middleware/validar.js';

/**
 * Bandeja de notificaciones.
 *
 * Es **el camino principal de la confirmación del dueño**: el botón "Confirmar"
 * de una notificación de tipo `confirmar` es lo que cierra el servicio. El
 * botón equivalente del seguimiento es el secundario. Por eso el serializador
 * manda `accionEtiqueta` — la app no decide qué botón pintar, lo recibe.
 */
export const rutasNotificaciones = Router();

rutasNotificaciones.use(exigirSesion);

/** Sólo dos tipos llevan acción; los demás son informativos. */
const ACCION: Partial<Record<TipoNotificacion, string>> = {
  interes: 'Ver interesados',
  confirmar: 'Confirmar',
};

type FilaNotificacion = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  solicitudId: string | null;
  leida: boolean;
  creadoEn: Date;
};

function serializar(n: FilaNotificacion, ahora: Date) {
  const accion = ACCION[n.tipo];
  return {
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    horaEtiqueta: haceCuanto(n.creadoEn, ahora),
    leida: n.leida,
    solicitudId: n.solicitudId,
    ...(accion ? { accionEtiqueta: accion } : {}),
  };
}

const idSchema = z.object({ id: z.uuid() });

rutasNotificaciones.get(
  '/',
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    const ahora = new Date();

    const filas = await prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { creadoEn: 'desc' },
      // Una bandeja sin tope crece hasta que la pantalla tarda en pintar. Cien
      // es más de lo que nadie va a leer.
      take: 100,
    });

    res.json(filas.map((n) => serializar(n, ahora)));
  }),
);

/** El número del badge rojo de la campana. */
rutasNotificaciones.get(
  '/unread-count',
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    res.json({
      cuenta: await prisma.notificacion.count({ where: { usuarioId, leida: false } }),
    });
  }),
);

rutasNotificaciones.post(
  '/:id/read',
  validar(idSchema, 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);

    const resultado = await prisma.notificacion.updateMany({
      where: { id: paramDe(req, 'id'), usuarioId },
      data: { leida: true },
    });

    if (resultado.count === 0) throw errorNoEncontrado('No encontramos esa notificación');

    res.json({ datos: null });
  }),
);

/** "Vaciar" de la cabecera. Borra, no marca como leídas. */
rutasNotificaciones.delete(
  '/',
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    await prisma.notificacion.deleteMany({ where: { usuarioId } });
    res.json({ datos: null });
  }),
);
