import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Rol } from '../../generated/prisma/enums.js';
import { prisma } from '../../lib/prisma.js';
import { asincrono, errorConflicto, errorNoAutenticado } from '../../lib/errores.js';
import { metaUsuario, primerNombre, rolEtiqueta } from '../../lib/texto.js';
import { exigirSesion, firmarToken, sesionDe } from '../../middleware/auth.js';
import { validar } from '../../middleware/validar.js';

/**
 * Autenticación.
 *
 * **El rol se elige en el registro y no cambia.** Determina toda la navegación
 * posterior de la app, así que no hay endpoint para cambiarlo: si alguien
 * necesita el otro rol, crea otra cuenta. Es una decisión del cliente y
 * simplifica todo lo demás — un usuario no puede ser dueño y cuidador de la
 * misma solicitud.
 */
export const rutasAuth = Router();

/** Coste de bcrypt. 12 es lento a propósito: es lo que hace caro el ataque. */
const RONDAS = 12;

type UsuarioFila = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  rol: Rol;
  zona: string;
  fotoUrl: string | null;
  paseosCompletados: number | null;
};

/** El usuario tal como lo consume la app, con sus etiquetas ya redactadas. */
function serializarUsuario(u: UsuarioFila) {
  return {
    id: u.id,
    nombre: u.nombre,
    primerNombre: primerNombre(u.nombre),
    correo: u.correo,
    telefono: u.telefono,
    rol: u.rol,
    zona: u.zona,
    fotoUrl: u.fotoUrl,
    paseosCompletados: u.paseosCompletados,
    metaEtiqueta: metaUsuario(u.nombre, u.rol, u.paseosCompletados),
    rolEtiqueta: rolEtiqueta(u.rol),
  };
}

const CAMPOS_PUBLICOS = {
  id: true,
  nombre: true,
  correo: true,
  telefono: true,
  rol: true,
  zona: true,
  fotoUrl: true,
  paseosCompletados: true,
} as const;

const registroSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa tu nombre completo').max(80),
  correo: z.email('Ingresa un correo electrónico válido').toLowerCase().trim(),
  telefono: z.string().trim().min(6, 'Ingresa tu número telefónico').max(24),
  clave: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
  rol: z.enum(Rol),
});

const loginSchema = z.object({
  correo: z.email().toLowerCase().trim(),
  clave: z.string().min(1),
});

rutasAuth.post(
  '/register',
  validar(registroSchema),
  asincrono(async (req, res) => {
    const datos = req.body as z.infer<typeof registroSchema>;

    const yaExiste = await prisma.usuario.findUnique({
      where: { correo: datos.correo },
      select: { id: true },
    });

    if (yaExiste) {
      throw errorConflicto('Ya hay una cuenta con ese correo');
    }

    const usuario = await prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
        claveHash: await bcrypt.hash(datos.clave, RONDAS),
        rol: datos.rol,
        // Un cuidador nuevo arranca en cero paseos; un dueño no tiene contador.
        paseosCompletados: datos.rol === Rol.cuidador ? 0 : null,
      },
      select: CAMPOS_PUBLICOS,
    });

    res.status(201).json({
      usuario: serializarUsuario(usuario),
      token: firmarToken({ usuarioId: usuario.id, rol: usuario.rol }),
    });
  }),
);

rutasAuth.post(
  '/login',
  validar(loginSchema),
  asincrono(async (req, res) => {
    const datos = req.body as z.infer<typeof loginSchema>;

    const usuario = await prisma.usuario.findUnique({
      where: { correo: datos.correo },
      select: { ...CAMPOS_PUBLICOS, claveHash: true },
    });

    // Mismo mensaje para "no existe ese correo" y "la contraseña no es esa": si
    // se distinguieran, cualquiera podría averiguar qué correos tienen cuenta.
    if (!usuario || !(await bcrypt.compare(datos.clave, usuario.claveHash))) {
      throw errorNoAutenticado('Correo o contraseña incorrectos');
    }

    const { claveHash: _, ...publico } = usuario;

    res.json({
      usuario: serializarUsuario(publico),
      token: firmarToken({ usuarioId: usuario.id, rol: usuario.rol }),
    });
  }),
);

/** El perfil de la sesión actual. La app lo refresca al abrir. */
rutasAuth.get(
  '/me',
  exigirSesion,
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: CAMPOS_PUBLICOS,
    });

    if (!usuario) throw errorNoAutenticado('Tu cuenta ya no existe');

    res.json(serializarUsuario(usuario));
  }),
);

export { serializarUsuario, CAMPOS_PUBLICOS };
