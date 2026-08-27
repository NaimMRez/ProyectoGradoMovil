import type { Server as ServidorHttp } from 'node:http';
import { Server, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { Sesion } from '../middleware/auth.js';

/**
 * Tiempo real.
 *
 * Dos cosas de PetGo lo necesitan: el chat y las notificaciones. Todo lo demás
 * se resuelve invalidando la caché tras una mutación.
 *
 * Cada usuario entra a una sala con su propio id. Emitir a `usuario:<id>` en vez
 * de difundir a todo el mundo es lo que evita que el teléfono de un cuidador
 * reciba los mensajes de conversaciones ajenas — que además de ser una fuga de
 * datos, gastaría la batería de todos.
 */

export type EventoTiempoReal =
  | { tipo: 'mensaje'; solicitudId: string }
  | { tipo: 'solicitud'; solicitudId: string }
  | { tipo: 'notificacion' };

let io: Server | null = null;

const salaDe = (usuarioId: string) => `usuario:${usuarioId}`;

export function montarSocket(servidor: ServidorHttp): Server {
  io = new Server(servidor, {
    cors: {
      // Expo Go no manda cabecera Origin; en web sí importa.
      origin: config.CORS_ORIGENES.length > 0 ? config.CORS_ORIGENES : true,
      credentials: true,
    },
    // Sin polling: los clientes son teléfonos con websocket de sobra, y el
    // fallback de long-polling multiplica las conexiones abiertas por nada.
    transports: ['websocket'],
  });

  // El socket se autentica con el mismo JWT que la API. Un socket sin token
  // válido no entra: si entrara, no habría forma de saber a qué sala meterlo.
  io.use((socket: Socket, siguiente) => {
    const token =
      (socket.handshake.auth?.['token'] as string | undefined) ??
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      siguiente(new Error('Falta el token'));
      return;
    }

    try {
      const sesion = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload & Sesion;
      socket.data.usuarioId = sesion.usuarioId;
      siguiente();
    } catch {
      siguiente(new Error('Token no válido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const usuarioId = socket.data.usuarioId as string;
    void socket.join(salaDe(usuarioId));
  });

  return io;
}

/**
 * Empuja un evento a uno o varios usuarios.
 *
 * Es deliberadamente tolerante: si el socket no está montado — en las pruebas,
 * por ejemplo — no hace nada en vez de reventar. Una notificación perdida no
 * debe tumbar la operación que la generó, porque el dato ya está guardado y la
 * app lo verá en el siguiente refresco.
 */
export function emitirA(usuarioIds: readonly (string | null | undefined)[], evento: EventoTiempoReal): void {
  if (!io) return;

  for (const id of usuarioIds) {
    if (!id) continue;
    io.to(salaDe(id)).emit(evento.tipo, evento);
  }
}

export function cerrarSocket(): void {
  io?.close();
  io = null;
}
