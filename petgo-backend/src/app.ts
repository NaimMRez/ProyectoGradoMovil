import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, esProduccion } from './config.js';
import { manejadorDeErrores, rutaNoEncontrada } from './lib/errores.js';
import { rutasAuth } from './modules/auth/auth.routes.js';
import { rutasMascotas } from './modules/pets/pets.routes.js';
import { rutasSolicitudes } from './modules/requests/requests.routes.js';
import { rutasIntereses } from './modules/interests/interests.routes.js';
import { rutasMensajes } from './modules/messages/messages.routes.js';
import { rutasNotificaciones } from './modules/notifications/notifications.routes.js';

export function crearApp() {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      // Expo Go no manda cabecera `Origin`, así que en desarrollo esto casi no
      // interviene. Importa cuando la app corra en web o detrás de un dominio.
      origin: config.CORS_ORIGENES.length > 0 ? config.CORS_ORIGENES : true,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(esProduccion ? 'combined' : 'dev'));

  /** Para saber si el servidor está vivo sin autenticarse. */
  app.get('/health', (_req, res) => {
    res.json({ ok: true, servicio: 'petgo-api' });
  });

  app.use('/api/auth', rutasAuth);
  app.use('/api/pets', rutasMascotas);

  // Los intereses cuelgan de una solicitud, así que comparten prefijo. Van
  // montados antes que `rutasSolicitudes` porque sus rutas son más específicas
  // (`/:id/interests`) y Express resuelve por orden de registro.
  app.use('/api/requests', rutasIntereses);
  app.use('/api/requests', rutasSolicitudes);

  app.use('/api/conversations', rutasMensajes);
  app.use('/api/notifications', rutasNotificaciones);

  app.use(rutaNoEncontrada);
  app.use(manejadorDeErrores);

  return app;
}
