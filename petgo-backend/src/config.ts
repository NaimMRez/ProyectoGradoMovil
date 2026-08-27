import 'dotenv/config';
import { z } from 'zod';

/**
 * Configuración del servidor, validada al arrancar.
 *
 * Se valida aquí y no al usar cada variable a propósito: si falta el
 * `JWT_SECRET`, el servidor tiene que negarse a arrancar con un mensaje claro,
 * no firmar tokens con `undefined` y descubrirlo tres semanas después.
 */
const esquema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'Falta DATABASE_URL. Copia .env.example a .env y ajústala.'),

  JWT_SECRET: z
    .string()
    .min(
      24,
      'JWT_SECRET es demasiado corto. Genera uno con:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    ),

  JWT_EXPIRA: z.string().default('30d'),

  PORT: z.coerce.number().int().positive().default(4000),

  CORS_ORIGENES: z
    .string()
    .default('')
    .transform((valor) =>
      valor
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  const problemas = resultado.error.issues
    .map((p) => `  · ${p.path.join('.')}: ${p.message}`)
    .join('\n');

  console.error(`\nLa configuración del servidor no es válida:\n\n${problemas}\n`);
  process.exit(1);
}

export const config = resultado.data;

export const esProduccion = config.NODE_ENV === 'production';
