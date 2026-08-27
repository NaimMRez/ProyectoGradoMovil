import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * Se lee del entorno directamente y no de `config.ts` a propósito.
 *
 * `config.ts` valida al importarse y termina el proceso si falta una variable.
 * Si este archivo dependiera de él, `domain/status.ts` — que sólo necesita las
 * clases de error — arrastraría esa validación, y las pruebas de las reglas de
 * negocio no podrían correr sin una base de datos configurada. Las reglas del
 * cliente tienen que poder probarse solas.
 */
const esProduccion = process.env['NODE_ENV'] === 'production';

/**
 * Claves de error que la app sabe pintar.
 *
 * Cada una corresponde a un preset de `ErrorState` del cliente. Mandar la clave
 * y no sólo el mensaje permite que la app elija el icono, el texto de ayuda y
 * la acción de salida sin tener que adivinar nada a partir del código HTTP.
 */
export type ClaveError =
  | 'red'
  | 'ubicacion'
  | 'yaTomada'
  | 'servidor'
  | 'noEncontrada'
  | 'validacion'
  | 'credenciales'
  | 'prohibido';

export class ErrorHttp extends Error {
  constructor(
    readonly estado: number,
    message: string,
    readonly clave: ClaveError = 'servidor',
    readonly detalles?: unknown,
  ) {
    super(message);
    this.name = 'ErrorHttp';
  }
}

/** 400 — la petición viene mal formada. */
export const errorValidacion = (mensaje: string, detalles?: unknown) =>
  new ErrorHttp(400, mensaje, 'validacion', detalles);

/** 401 — no hay sesión, o las credenciales no son correctas. */
export const errorNoAutenticado = (mensaje = 'Necesitas iniciar sesión') =>
  new ErrorHttp(401, mensaje, 'credenciales');

/** 403 — hay sesión, pero este usuario no puede hacer esto. */
export const errorProhibido = (mensaje: string) =>
  new ErrorHttp(403, mensaje, 'prohibido');

/** 404 — no existe, o no es visible para quien pregunta. */
export const errorNoEncontrado = (mensaje = 'No encontramos lo que buscas') =>
  new ErrorHttp(404, mensaje, 'noEncontrada');

/**
 * 409 — el estado del recurso no admite esta operación.
 *
 * Es el código de "esta solicitud ya tiene cuidador" y el de "el servicio ya
 * está finalizado". La app **no reintenta** un 409: reintentarlo no arregla
 * nada y sólo retrasa el mensaje que el usuario necesita leer.
 */
export const errorConflicto = (mensaje: string, clave: ClaveError = 'servidor') =>
  new ErrorHttp(409, mensaje, clave);

/** 422 — la petición es válida pero el contenido no pasa una regla de negocio. */
export const errorRegla = (mensaje: string) => new ErrorHttp(422, mensaje, 'validacion');

/**
 * Envoltorio para controladores asíncronos.
 *
 * Express 5 ya reenvía las promesas rechazadas al manejador de errores, pero
 * envolver explícitamente deja la intención escrita y protege de un cambio de
 * versión que la revierta.
 */
export function asincrono<T extends Request>(
  manejador: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction) => {
    void manejador(req, res, next).catch(next);
  };
}

/** 404 para cualquier ruta que no exista. */
export function rutaNoEncontrada(req: Request, _res: Response, next: NextFunction) {
  next(new ErrorHttp(404, `No existe la ruta ${req.method} ${req.path}`, 'noEncontrada'));
}

/**
 * Manejador de errores. Va el último de la cadena.
 *
 * Un error inesperado nunca devuelve su mensaje al cliente en producción: un
 * fallo de Postgres puede llevar dentro nombres de tabla, columnas o fragmentos
 * de una consulta. Se registra entero en el servidor y al cliente le llega algo
 * que pueda leer.
 */
export function manejadorDeErrores(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    res.status(400).json({
      mensaje: 'Revisa los datos que enviaste',
      clave: 'validacion' satisfies ClaveError,
      detalles: error.issues.map((p) => ({
        campo: p.path.join('.'),
        problema: p.message,
      })),
    });
    return;
  }

  if (error instanceof ErrorHttp) {
    res.status(error.estado).json({
      mensaje: error.message,
      clave: error.clave,
      ...(error.detalles ? { detalles: error.detalles } : {}),
    });
    return;
  }

  console.error('[petgo] error no controlado:', error);

  res.status(500).json({
    mensaje: 'Algo salió mal de nuestro lado. Vuelve a intentarlo en un momento.',
    clave: 'servidor' satisfies ClaveError,
    ...(esProduccion ? {} : { detalles: String(error) }),
  });
}
