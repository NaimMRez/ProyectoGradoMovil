import { Router } from 'express';
import { z } from 'zod';
import { Sexo, Tamano } from '../../generated/prisma/enums.js';
import { prisma } from '../../lib/prisma.js';
import { asincrono, errorNoEncontrado } from '../../lib/errores.js';
import { exigirSesion, sesionDe } from '../../middleware/auth.js';
import { paramDe, validar } from '../../middleware/validar.js';
import { serializarMascota } from '../requests/requests.serializer.js';

/** Mascotas del dueño. */
export const rutasMascotas = Router();

rutasMascotas.use(exigirSesion);

/**
 * Sólo el nombre es obligatorio.
 *
 * Los demás campos se guardan con respaldo — raza "Mestizo", edad y peso "—" —
 * porque el handoff lo fija así, y con razón: obligar a rellenar siete campos
 * antes de poder publicar el primer paseo es la forma más rápida de perder a un
 * usuario nuevo.
 */
const mascotaSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresa el nombre de tu mascota').max(40),
  raza: z
    .string()
    .trim()
    .max(60)
    .transform((v) => v || 'Mestizo'),
  edad: z
    .string()
    .trim()
    .max(30)
    .transform((v) => v || '—'),
  sexo: z.enum(Sexo).default(Sexo.macho),
  tamano: z.enum(Tamano).default(Tamano.mediano),
  peso: z
    .string()
    .trim()
    .max(20)
    .transform((v) => v || '—'),
  notas: z.string().trim().max(500).default(''),
  fotoUrl: z.url().max(500).nullish(),
});

const idSchema = z.object({ id: z.uuid() });

rutasMascotas.get(
  '/',
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);

    const mascotas = await prisma.mascota.findMany({
      where: { duenoId: usuarioId },
      orderBy: { creadoEn: 'asc' },
    });

    res.json(mascotas.map(serializarMascota));
  }),
);

rutasMascotas.post(
  '/',
  validar(mascotaSchema),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    const datos = req.body as z.infer<typeof mascotaSchema>;

    const mascota = await prisma.mascota.create({
      data: { ...datos, fotoUrl: datos.fotoUrl ?? null, duenoId: usuarioId },
    });

    res.status(201).json({
      datos: serializarMascota(mascota),
      toast: `«${mascota.nombre}» se agregó a tus mascotas`,
    });
  }),
);

rutasMascotas.patch(
  '/:id',
  validar(idSchema, 'params'),
  validar(mascotaSchema.partial()),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);

    // `updateMany` con el dueño en el `where` evita la comprobación en dos
    // pasos: si la mascota no es suya, no actualiza nada y no hace falta
    // decirle si existe o no.
    const resultado = await prisma.mascota.updateMany({
      where: { id: paramDe(req, 'id'), duenoId: usuarioId },
      data: req.body as Partial<z.infer<typeof mascotaSchema>>,
    });

    if (resultado.count === 0) throw errorNoEncontrado('No encontramos esa mascota');

    const mascota = await prisma.mascota.findUniqueOrThrow({
      where: { id: paramDe(req, 'id') },
    });

    res.json({ datos: serializarMascota(mascota), toast: 'Mascota actualizada' });
  }),
);

rutasMascotas.delete(
  '/:id',
  validar(idSchema, 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);

    const resultado = await prisma.mascota.deleteMany({
      where: { id: paramDe(req, 'id'), duenoId: usuarioId },
    });

    if (resultado.count === 0) throw errorNoEncontrado('No encontramos esa mascota');

    res.json({ datos: null, toast: 'Mascota eliminada' });
  }),
);
