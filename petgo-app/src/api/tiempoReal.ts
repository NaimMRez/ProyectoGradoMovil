import { io, type Socket } from 'socket.io-client';
// Desde `config` y no desde `client`: importar `client` aquí cerraría un ciclo
// con el adaptador mock, que es quien emite estos eventos.
import { USAR_MOCK, URL_BASE } from './config';

/**
 * Tiempo real.
 *
 * Dos cosas de PetGo lo necesitan: el chat y las notificaciones. Todo lo demás
 * se resuelve invalidando la caché después de una mutación.
 *
 * Hay dos transportes detrás de la misma interfaz:
 *
 * - **`socket`** — Socket.io contra el backend. Es el de producción.
 * - **`local`** — un emisor en memoria que dispara el adaptador mock al mutar.
 *
 * Sobre el transporte local conviene ser claro, porque es una limitación real:
 * **no puede simular dos dispositivos.** Cuando Camila manda un mensaje desde
 * su teléfono, el emisor local sólo notifica a su propia app; el teléfono de
 * Diego no se entera de nada, porque no hay servidor entre medias. Sirve para
 * que la interfaz reaccione al instante a lo que hace su propio usuario, y para
 * que la app quede escrita contra la forma definitiva. La demostración de chat
 * entre dos teléfonos necesita el backend levantado.
 */

export type EventoTiempoReal =
  | { tipo: 'mensaje'; solicitudId: string }
  | { tipo: 'solicitud'; solicitudId: string }
  | { tipo: 'notificacion' };

type Escucha = (evento: EventoTiempoReal) => void;

type Transporte = {
  conectar: (usuarioId: string) => void;
  desconectar: () => void;
  suscribir: (escucha: Escucha) => () => void;
};

// ── Transporte local, para el adaptador mock ────────────────────────────────

const escuchasLocales = new Set<Escucha>();

/** La dispara el adaptador mock cuando muta algo. */
export function emitirLocal(evento: EventoTiempoReal): void {
  for (const escucha of escuchasLocales) escucha(evento);
}

const transporteLocal: Transporte = {
  conectar: () => {},
  desconectar: () => escuchasLocales.clear(),
  suscribir: (escucha) => {
    escuchasLocales.add(escucha);
    return () => escuchasLocales.delete(escucha);
  },
};

// ── Transporte Socket.io, para el backend real ──────────────────────────────

let socket: Socket | null = null;
const escuchasSocket = new Set<Escucha>();

const transporteSocket: Transporte = {
  conectar: (usuarioId) => {
    if (socket?.connected) return;

    // `URL_BASE` acaba en /api; el socket vive en la raíz del servidor.
    socket = io(URL_BASE.replace(/\/api\/?$/, ''), {
      transports: ['websocket'],
      auth: { usuarioId },
      // Sin esto, una app que vuelve del segundo plano tras perder cobertura se
      // queda muda para siempre y el usuario no ve mensajes nuevos hasta que la
      // reinicia.
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    const reenviar = (tipo: EventoTiempoReal['tipo']) => (datos: { solicitudId?: string }) => {
      const evento = { tipo, solicitudId: datos?.solicitudId ?? '' } as EventoTiempoReal;
      for (const escucha of escuchasSocket) escucha(evento);
    };

    socket.on('mensaje', reenviar('mensaje'));
    socket.on('solicitud', reenviar('solicitud'));
    socket.on('notificacion', reenviar('notificacion'));
  },

  desconectar: () => {
    socket?.disconnect();
    socket = null;
    escuchasSocket.clear();
  },

  suscribir: (escucha) => {
    escuchasSocket.add(escucha);
    return () => escuchasSocket.delete(escucha);
  },
};

export const tiempoReal: Transporte = USAR_MOCK ? transporteLocal : transporteSocket;

/**
 * ¿Hay tiempo real de verdad, entre dispositivos?
 *
 * Con el transporte local no lo hay, así que las consultas que dependen de él
 * mantienen un refresco periódico como red de seguridad. Con el socket ese
 * refresco sobra y se apaga: el servidor empuja.
 */
export const HAY_TIEMPO_REAL_REMOTO = !USAR_MOCK;
