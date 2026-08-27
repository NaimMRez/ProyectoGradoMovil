import { EstadoServicio, Rol } from '../generated/prisma/enums.js';
import { errorConflicto, errorProhibido } from '../lib/errores.js';

/**
 * Reglas de estado del servicio. **Ésta es la autoridad.**
 *
 * La app tiene un espejo de estas reglas en `src/api/estados.ts`, pero sólo
 * para decidir qué botones pinta. Quien autoriza una transición es este
 * archivo, y todo lo que pase por él tiene que pasar por aquí — incluida
 * cualquier herramienta interna que se añada después.
 *
 * Las reglas salen del cliente y no se negocian:
 *
 * 1. `publicada → aceptada → programada → proceso → finalizada`.
 *    `cancelada` es terminal y alcanzable desde cualquier punto.
 * 2. El **cuidador** avanza el estado hasta `proceso`. Desde ahí marca el fin
 *    del paseo, lo que **no** finaliza el servicio: activa
 *    `awaitingConfirmation` y deja el estado en `proceso`.
 * 3. **Sólo el dueño** cierra el servicio como `finalizada`, vía
 *    `POST /api/requests/:id/confirm`.
 * 4. **Ambas partes** pueden cancelar en cualquier momento antes de un estado
 *    terminal.
 * 5. Mientras `awaitingConfirmation` esté activo, el cuidador no avanza más.
 *
 * La bandera existe precisamente para separar "el cuidador terminó" de "el
 * dueño cerró". Sin ella la regla 2 no se puede expresar: `finalizada` querría
 * decir dos cosas distintas según quién la hubiera puesto.
 */

export const SECUENCIA = [
  EstadoServicio.publicada,
  EstadoServicio.aceptada,
  EstadoServicio.programada,
  EstadoServicio.proceso,
  EstadoServicio.finalizada,
] as const;

export const TERMINALES = [
  EstadoServicio.finalizada,
  EstadoServicio.cancelada,
] as const;

/** Lo mínimo que hace falta saber de una solicitud para decidir. */
export type SolicitudParaReglas = {
  estado: EstadoServicio;
  awaitingConfirmation: boolean;
  duenoId: string;
  cuidadorId: string | null;
};

export function esTerminal(estado: EstadoServicio): boolean {
  return (TERMINALES as readonly EstadoServicio[]).includes(estado);
}

/** El siguiente de la secuencia, o `null` si no lo hay. */
export function siguienteEstado(estado: EstadoServicio): EstadoServicio | null {
  const i = (SECUENCIA as readonly EstadoServicio[]).indexOf(estado);
  if (i < 0 || i >= SECUENCIA.length - 1) return null;
  return SECUENCIA[i + 1]!;
}

/** El papel de este usuario en esta solicitud, o `null` si es un tercero. */
export function papelEn(
  solicitud: SolicitudParaReglas,
  usuarioId: string,
): Rol | null {
  if (solicitud.duenoId === usuarioId) return Rol.dueno;
  if (solicitud.cuidadorId === usuarioId) return Rol.cuidador;
  return null;
}

/** Qué va a pasar si el cuidador pulsa su botón de avanzar. */
export type AccionCuidador =
  | { tipo: 'avanzar'; siguiente: EstadoServicio }
  | { tipo: 'terminarPaseo' };

/**
 * Resuelve la acción del cuidador, o lanza el error que corresponda.
 *
 * Lanza en vez de devolver `null` porque cada motivo de rechazo tiene su propio
 * mensaje, y el cliente los muestra tal cual: "El servicio ya está finalizado"
 * no es lo mismo que "Estás esperando la confirmación del dueño".
 */
export function resolverAccionCuidador(
  solicitud: SolicitudParaReglas,
  usuarioId: string,
): AccionCuidador {
  if (papelEn(solicitud, usuarioId) !== Rol.cuidador) {
    throw errorProhibido('Sólo el cuidador asignado puede actualizar el estado');
  }

  if (solicitud.estado === EstadoServicio.finalizada) {
    throw errorConflicto('El servicio ya está finalizado');
  }

  if (solicitud.estado === EstadoServicio.cancelada) {
    throw errorConflicto('El servicio está cancelado');
  }

  // Regla 5: la bandera bloquea al cuidador hasta que el dueño cierre.
  if (solicitud.awaitingConfirmation) {
    throw errorConflicto(
      'Ya marcaste el paseo como terminado. Falta que el dueño lo confirme.',
    );
  }

  // Regla 2: en `proceso` la acción no avanza el estado, marca el fin del paseo.
  if (solicitud.estado === EstadoServicio.proceso) {
    return { tipo: 'terminarPaseo' };
  }

  const siguiente = siguienteEstado(solicitud.estado);

  // Regla 3: el cuidador nunca llega a `finalizada`. Si la secuencia lo llevara
  // ahí, es que algo se coló antes.
  if (!siguiente || siguiente === EstadoServicio.finalizada) {
    throw errorConflicto('No puedes avanzar este servicio ahora');
  }

  return { tipo: 'avanzar', siguiente };
}

/**
 * Regla 3: comprueba que este usuario puede cerrar el servicio.
 *
 * `POST /api/requests/:id/confirm` es **el único camino a `finalizada`** y sólo
 * el dueño puede recorrerlo.
 */
export function exigirPuedeConfirmar(
  solicitud: SolicitudParaReglas,
  usuarioId: string,
): void {
  if (papelEn(solicitud, usuarioId) !== Rol.dueno) {
    throw errorProhibido('Sólo el dueño puede confirmar la finalización');
  }

  if (solicitud.estado === EstadoServicio.finalizada) {
    throw errorConflicto('El servicio ya está finalizado');
  }

  if (solicitud.estado === EstadoServicio.cancelada) {
    throw errorConflicto('El servicio está cancelado');
  }

  if (!solicitud.awaitingConfirmation) {
    throw errorConflicto('El cuidador todavía no marcó el fin del paseo');
  }
}

/** Regla 4: ambas partes cancelan, hasta que el estado sea terminal. */
export function exigirPuedeCancelar(
  solicitud: SolicitudParaReglas,
  usuarioId: string,
): void {
  if (papelEn(solicitud, usuarioId) === null) {
    throw errorProhibido('No participas en este servicio');
  }

  if (solicitud.estado === EstadoServicio.finalizada) {
    throw errorConflicto('El servicio ya está finalizado');
  }

  if (solicitud.estado === EstadoServicio.cancelada) {
    throw errorConflicto('El servicio ya estaba cancelado');
  }
}

/** Un cuidador se ofrece sólo a una solicitud publicada, libre y ajena. */
export function exigirPuedeManifestarInteres(
  solicitud: SolicitudParaReglas,
  usuarioId: string,
): void {
  if (solicitud.duenoId === usuarioId) {
    throw errorProhibido('No puedes ofrecerte a tu propia solicitud');
  }

  if (solicitud.estado !== EstadoServicio.publicada || solicitud.cuidadorId) {
    throw errorConflicto('Esta solicitud ya tiene cuidador', 'yaTomada');
  }
}

/** El dueño elige entre los interesados sólo mientras siga publicada. */
export function exigirPuedeAceptarInteresado(
  solicitud: SolicitudParaReglas,
  usuarioId: string,
): void {
  if (papelEn(solicitud, usuarioId) !== Rol.dueno) {
    throw errorProhibido('Sólo el dueño puede elegir al cuidador');
  }

  if (solicitud.estado !== EstadoServicio.publicada || solicitud.cuidadorId) {
    throw errorConflicto('Esta solicitud ya tiene cuidador', 'yaTomada');
  }
}

/**
 * Hay hilo de chat en cuanto hay cuidador asignado: la conversación se ancla a
 * la solicitud, no a un par de usuarios.
 */
export function tieneConversacion(solicitud: SolicitudParaReglas): boolean {
  return solicitud.cuidadorId !== null;
}

/** Sólo las dos partes de un servicio leen y escriben en su hilo. */
export function exigirParticipante(
  solicitud: SolicitudParaReglas,
  usuarioId: string,
): Rol {
  const papel = papelEn(solicitud, usuarioId);
  if (papel === null) throw errorProhibido('No participas en esta conversación');
  return papel;
}
