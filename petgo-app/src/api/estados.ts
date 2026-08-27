import type { EstadoServicio, Rol, Solicitud } from './tipos';

/**
 * Reglas de estado del servicio.
 *
 * Son del cliente y no se negocian. La autoridad es el backend
 * (`petgo-backend/src/domain/status.ts`): esto es un espejo, y existe sólo
 * para decidir **qué botones se pintan**. La app nunca debe permitir una
 * transición que el backend vaya a rechazar, pero tampoco es la que la
 * autoriza — si los dos discrepan, manda el servidor.
 *
 * 1. `publicada → aceptada → programada → proceso → finalizada`.
 *    `cancelada` es terminal y alcanzable desde cualquier punto.
 * 2. El **cuidador** avanza hasta `proceso`. Desde ahí marca el fin del paseo,
 *    lo que **no** finaliza el servicio: activa `awaitingConfirmation` y deja
 *    el estado en `proceso`.
 * 3. **Sólo el dueño** cierra el servicio como `finalizada`.
 * 4. **Ambas partes** pueden cancelar antes de un estado terminal.
 * 5. Mientras `awaitingConfirmation` esté activo, el cuidador no avanza más.
 *
 * La bandera existe precisamente para separar "el cuidador terminó" de "el
 * dueño cerró". Sin ella la regla 2 no se puede expresar.
 */

export const SECUENCIA: readonly EstadoServicio[] = [
  'publicada',
  'aceptada',
  'programada',
  'proceso',
  'finalizada',
];

export const ESTADOS_TERMINALES: readonly EstadoServicio[] = ['finalizada', 'cancelada'];

export function esTerminal(estado: EstadoServicio): boolean {
  return ESTADOS_TERMINALES.includes(estado);
}

/** El siguiente estado de la secuencia, o `null` si no lo hay. */
export function siguienteEstado(estado: EstadoServicio): EstadoServicio | null {
  const i = SECUENCIA.indexOf(estado);
  if (i < 0 || i >= SECUENCIA.length - 1) return null;
  return SECUENCIA[i + 1];
}

/**
 * ¿Puede el cuidador avanzar el estado?
 *
 * Sólo hasta `proceso`, y sólo si no está esperando la confirmación del dueño.
 * En `proceso` el botón existe pero no avanza el estado: marca el fin del
 * paseo (ver `marcaFinDePaseo`).
 */
export function cuidadorPuedeAvanzar(solicitud: Solicitud): boolean {
  if (esTerminal(solicitud.estado)) return false;
  if (solicitud.awaitingConfirmation) return false;
  if (!solicitud.cuidadorId) return false;
  return SECUENCIA.indexOf(solicitud.estado) < SECUENCIA.indexOf('proceso') ||
    solicitud.estado === 'proceso';
}

/** En `proceso`, la acción del cuidador es terminar, no avanzar. */
export function marcaFinDePaseo(solicitud: Solicitud): boolean {
  return solicitud.estado === 'proceso' && !solicitud.awaitingConfirmation;
}

/** Texto del botón secundario del seguimiento, para el cuidador. */
export function etiquetaAccionCuidador(solicitud: Solicitud): string {
  return marcaFinDePaseo(solicitud) ? 'Marcar como terminado' : 'Actualizar estado';
}

/** Sólo el dueño cierra, y sólo cuando el cuidador ya marcó el fin. */
export function duenoPuedeConfirmar(solicitud: Solicitud): boolean {
  return solicitud.awaitingConfirmation && !esTerminal(solicitud.estado);
}

/** Ambas partes, en cualquier momento antes de un estado terminal. */
export function puedeCancelar(solicitud: Solicitud): boolean {
  return !esTerminal(solicitud.estado);
}

/** El cuidador se ofrece sólo a lo que sigue publicado y no es suyo. */
export function puedeManifestarInteres(solicitud: Solicitud, usuarioId: string): boolean {
  return (
    solicitud.estado === 'publicada' &&
    !solicitud.cuidadorId &&
    solicitud.duenoId !== usuarioId
  );
}

/** El dueño elige entre los interesados sólo mientras siga publicada. */
export function puedeElegirCuidador(solicitud: Solicitud, rol: Rol): boolean {
  return rol === 'dueno' && solicitud.estado === 'publicada';
}

/**
 * Hay hilo de chat en cuanto hay cuidador asignado: la conversación se ancla a
 * la solicitud, no a un par de usuarios.
 */
export function tieneConversacion(solicitud: Solicitud): boolean {
  return Boolean(solicitud.cuidadorId);
}
