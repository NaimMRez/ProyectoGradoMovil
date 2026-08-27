import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { config, esProduccion } from '../config.js';

/**
 * Cliente de Prisma.
 *
 * Prisma 7 ya no lleva motor nativo: la conexión pasa por un *driver adapter*,
 * que aquí es `pg`. El pool lo gestiona el driver, así que la configuración de
 * conexiones vive en el adaptador y no en la cadena de conexión.
 */
const adaptador = new PrismaPg({
  connectionString: config.DATABASE_URL,
  // Cochabamba no va a tener miles de peticiones por segundo, y un pool grande
  // contra un Postgres local sólo consume conexiones que nadie usa.
  max: 10,
  idleTimeoutMillis: 30_000,
});

export const prisma = new PrismaClient({
  adapter: adaptador,
  log: esProduccion ? ['warn', 'error'] : ['warn', 'error'],
});

/** Cierra el pool. Lo llama el apagado ordenado de `index.ts`. */
export async function desconectarPrisma(): Promise<void> {
  await prisma.$disconnect();
}
