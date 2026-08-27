import { createServer } from 'node:http';
import { config } from './config.js';
import { crearApp } from './app.js';
import { desconectarPrisma, prisma } from './lib/prisma.js';
import { cerrarSocket, montarSocket } from './realtime/socket.js';

const servidor = createServer(crearApp());
montarSocket(servidor);

/**
 * El nombre de la base, sacado de `DATABASE_URL`.
 *
 * Sirve para que los mensajes de arranque digan la base a la que se está
 * apuntando de verdad y no una escrita a mano en el código: casi todo el tiempo
 * que se pierde con estos errores se va en descubrir que uno miraba la base
 * equivocada.
 */
function nombreDeLaBase(): string {
  try {
    return new URL(config.DATABASE_URL).pathname.replace(/^\//, '') || 'la base';
  } catch {
    return 'la base';
  }
}

/**
 * Comprueba la conexión antes de escuchar.
 *
 * Arrancar y aceptar peticiones con la base caída sólo consigue que el primer
 * usuario reciba un 500 en vez de que el error salga en la consola de quien
 * levantó el servidor.
 */
async function arrancar() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error(
      '\nNo pudimos conectar con PostgreSQL.\n' +
        '  · ¿Está corriendo?  pg_isready\n' +
        '  · ¿DATABASE_URL apunta a la base correcta en .env?\n' +
        '  · ¿Corriste las migraciones?  npm run db:migrate\n',
    );
    console.error(error);
    process.exit(1);
  }

  // PostGIS es un requisito duro del lado cuidador. Mejor decirlo aquí que
  // dejar que falle la primera consulta de solicitudes cercanas.
  const [postgis] = await prisma.$queryRaw<{ instalada: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'postgis'
    ) AS instalada
  `;

  if (!postgis?.instalada) {
    console.error(
      `\nPostGIS no está instalado en la base "${nombreDeLaBase()}".\n` +
        '\n  brew install postgis\n' +
        `  psql -d ${nombreDeLaBase()} -c 'CREATE EXTENSION IF NOT EXISTS postgis;'\n` +
        '\nSin PostGIS, la consulta de solicitudes cercanas no puede funcionar:\n' +
        'es el único sitio de PetGo que no tiene alternativa razonable.\n',
    );
    process.exit(1);
  }

  servidor.listen(config.PORT, () => {
    console.log(`\n  PetGo API · http://localhost:${config.PORT}`);
    console.log(`  Entorno: ${config.NODE_ENV}\n`);
  });
}

/**
 * Apagado ordenado.
 *
 * Sin esto, un reinicio en caliente deja conexiones de Postgres colgando hasta
 * que el pool las recicla, y en desarrollo se agotan tras unos cuantos
 * reinicios seguidos.
 */
async function apagar(senal: string) {
  console.log(`\n${senal} recibido, cerrando…`);

  servidor.close();
  cerrarSocket();
  await desconectarPrisma();

  process.exit(0);
}

process.on('SIGINT', () => void apagar('SIGINT'));
process.on('SIGTERM', () => void apagar('SIGTERM'));

void arrancar();
