import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { errorNoAutenticado } from '../lib/errores.js';
import type { Rol } from '../generated/prisma/enums.js';

/** Lo que va dentro del token. Nada más: el resto se lee de la base. */
export type Sesion = {
  usuarioId: string;
  rol: Rol;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sesion?: Sesion;
    }
  }
}

export function firmarToken(sesion: Sesion): string {
  return jwt.sign(sesion, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRA as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Exige una sesión válida.
 *
 * El token lleva el rol, pero **el rol del token no autoriza nada por sí
 * solo**: quién puede avanzar un servicio o cerrarlo depende de si este usuario
 * es el dueño o el cuidador *de esa solicitud concreta*, y eso lo resuelve
 * `domain/status.ts` contra la fila. El rol de aquí sirve para elegir qué lista
 * devolver, no para dar permisos.
 */
export function exigirSesion(req: Request, _res: Response, next: NextFunction) {
  const cabecera = req.headers.authorization;

  if (!cabecera?.startsWith('Bearer ')) {
    next(errorNoAutenticado());
    return;
  }

  const token = cabecera.slice('Bearer '.length).trim();

  try {
    const cargaUtil = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload & Sesion;
    req.sesion = { usuarioId: cargaUtil.usuarioId, rol: cargaUtil.rol };
    next();
  } catch {
    // Da igual si expiró o si venía manipulado: al cliente le llega lo mismo y
    // la salida es la misma — volver a entrar.
    next(errorNoAutenticado('Tu sesión expiró. Vuelve a iniciar sesión.'));
  }
}

/** La sesión, dando por hecho que `exigirSesion` ya corrió. */
export function sesionDe(req: Request): Sesion {
  if (!req.sesion) {
    // Esto no es un error del usuario: es una ruta mal montada.
    throw new Error('sesionDe() sin exigirSesion() delante en la cadena');
  }
  return req.sesion;
}
