import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/**
 * Valida cuerpo, query o parámetros con un esquema de Zod y **reemplaza** el
 * valor por el resultado, ya convertido.
 *
 * Reemplazar en vez de sólo comprobar es lo que hace útil el `transform` de los
 * esquemas: los chips de filtro llegan como `"5 km"` y el controlador recibe
 * `5000`, sin que nadie más tenga que acordarse de traducirlos.
 */
export function validar<T>(
  esquema: ZodType<T>,
  donde: 'body' | 'query' | 'params' = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const resultado = esquema.safeParse(req[donde]);

    if (!resultado.success) {
      next(resultado.error);
      return;
    }

    // `req.query` es sólo de lectura en Express 5, así que el valor convertido
    // se guarda aparte en vez de sobrescribirlo.
    if (donde === 'query') {
      req.consulta = resultado.data;
    } else {
      req[donde] = resultado.data as never;
    }

    next();
  };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Query ya validada y convertida por `validar(esquema, 'query')`. */
      consulta?: unknown;
    }
  }
}

/** La query validada, con el tipo que produjo su esquema. */
export function consultaDe<T>(req: Request): T {
  return req.consulta as T;
}

/**
 * Un parámetro de ruta, como cadena.
 *
 * Express 5 tipa `req.params[x]` como `string | string[]`, porque un patrón con
 * comodines puede producir varios valores. Los parámetros de PetGo nunca son
 * así, y todos pasan por un esquema de Zod que ya los validó como UUID; este
 * ayudante evita repetir el `!` y el reparo de tipo en cada controlador.
 */
export function paramDe(req: Request, nombre: string): string {
  const valor = req.params[nombre];
  return Array.isArray(valor) ? (valor[0] ?? '') : (valor ?? '');
}
