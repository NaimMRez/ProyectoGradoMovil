import {
  cuidadorPuedeAvanzar,
  duenoPuedeConfirmar,
  esTerminal,
  marcaFinDePaseo,
  puedeCancelar,
  siguienteEstado,
} from '../estados';
import {
  ErrorApi,
  type Conversacion,
  type EstadoServicio,
  type Filtros,
  type Interesado,
  type Mascota,
  type Mensaje,
  type Notificacion,
  type Rol,
  type Sexo,
  type Solicitud,
  type Tamano,
  type Usuario,
} from '../tipos';
import {
  CREDENCIALES,
  INTERESES_CRUDOS,
  MASCOTAS,
  MENSAJES,
  NOTIFICACIONES,
  SOLICITUDES_CRUDAS,
  USUARIOS,
  serializarConversacion,
  serializarInteres,
  serializarSolicitud,
  type InteresCrudo,
  type SolicitudCruda,
} from './datos';
import { bolivianos, distancia, fechaHora, diaRelativo, hora, pagoMinimo, plural, radioEnMetros } from './formato';
import { distanciaEnMetros, origenDeBusqueda, type Punto } from '../../utiles/geo';
import { emitirLocal } from '../tiempoReal';

/**
 * Adaptador mock.
 *
 * Implementa el mismo contrato que el backend real contra un almacén en
 * memoria: mismos nombres de operación, mismas etiquetas ya formateadas,
 * mismas reglas de estado y los mismos errores. Cambiar `USAR_MOCK` en
 * `api/client.ts` apunta la app al servidor sin tocar ninguna pantalla.
 *
 * Existe por una razón práctica: las 18 pantallas quedan navegables y
 * defendibles desde el primer día, sin depender de que Postgres esté levantado
 * — y los estados vacíos y de error se pueden provocar a voluntad, que es
 * justo lo que no se puede hacer contra datos reales.
 */

// ── Almacén en memoria ──────────────────────────────────────────────────────

type Almacen = {
  mascotas: Mascota[];
  solicitudes: SolicitudCruda[];
  intereses: InteresCrudo[];
  notificaciones: Notificacion[];
  mensajes: Mensaje[];
};

// Copias, no las constantes: las mutaciones no deben tocar el seed.
const bd: Almacen = {
  mascotas: MASCOTAS.map((m) => ({ ...m })),
  solicitudes: SOLICITUDES_CRUDAS.map((s) => ({ ...s, horas: { ...s.horas } })),
  intereses: INTERESES_CRUDOS.map((i) => ({ ...i })),
  notificaciones: NOTIFICACIONES.map((n) => ({ ...n })),
  mensajes: MENSAJES.map((m) => ({ ...m })),
};

let contadorCodigo = 1048;
let contadorId = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${++contadorId}-${Date.now()}`;

/**
 * Latencia simulada. No es decoración: sin ella los skeletons no se ven nunca
 * en desarrollo y sus fallos sólo aparecen sobre la red real del tribunal.
 */
const LATENCIA_MS = 320;
const esperar = <T>(valor: T, ms = LATENCIA_MS): Promise<T> =>
  new Promise((resolver) => setTimeout(() => resolver(valor), ms));

function buscarSolicitud(id: string): SolicitudCruda {
  const s = bd.solicitudes.find((x) => x.id === id);
  if (!s) throw new ErrorApi('No encontramos esta solicitud', 'noEncontrada', 404);
  return s;
}

function usuario(id: string): Usuario {
  const u = USUARIOS.find((x) => x.id === id);
  if (!u) throw new ErrorApi('Usuario desconocido', 'noEncontrada', 404);
  return u;
}

function contarIntereses(solicitudId: string): number {
  return bd.intereses.filter((i) => i.solicitudId === solicitudId).length;
}

function marcarHora(cruda: SolicitudCruda, estado: EstadoServicio): void {
  cruda.horas = { ...cruda.horas, [estado]: fechaHora(new Date()) };
}

// ── Sesión ──────────────────────────────────────────────────────────────────

export async function iniciarSesion(correo: string, clave: string): Promise<Usuario> {
  const cuenta = CREDENCIALES[correo.trim().toLowerCase()];
  if (!cuenta || cuenta.clave !== clave) {
    throw new ErrorApi('Correo o contraseña incorrectos', 'servidor', 401);
  }
  return esperar(usuario(cuenta.usuarioId));
}

export async function registrar(datos: {
  nombre: string;
  correo: string;
  telefono: string;
  rol: Rol;
}): Promise<Usuario> {
  const primerNombre = datos.nombre.trim().split(/\s+/)[0] || datos.nombre;
  const nuevo: Usuario = {
    id: nuevoId('u'),
    nombre: datos.nombre.trim(),
    primerNombre,
    correo: datos.correo.trim().toLowerCase(),
    telefono: datos.telefono.trim(),
    rol: datos.rol,
    zona: 'Cercado, Cochabamba',
    fotoUrl: null,
    paseosCompletados: datos.rol === 'cuidador' ? 0 : null,
    metaEtiqueta: datos.rol === 'cuidador' ? 'Cuidador · 0 paseos' : 'Dueño de mascota',
    rolEtiqueta: datos.rol === 'cuidador' ? 'Cuidador / paseador' : 'Dueño de mascota',
  };
  USUARIOS.push(nuevo);
  return esperar(nuevo);
}

// ── Mascotas ────────────────────────────────────────────────────────────────

export async function listarMascotas(duenoId: string): Promise<Mascota[]> {
  return esperar(bd.mascotas.filter((m) => m.duenoId === duenoId));
}

export async function crearMascota(
  duenoId: string,
  datos: {
    nombre: string;
    raza: string;
    edad: string;
    sexo: Sexo;
    tamano: Tamano;
    peso: string;
    notas: string;
    fotoUrl?: string | null;
  },
): Promise<{ mascota: Mascota; toast: string }> {
  const nombre = datos.nombre.trim();
  if (!nombre) throw new ErrorApi('Ingresa el nombre de tu mascota', 'servidor', 422);

  // Los demás campos vacíos se guardan con estos respaldos, tal como fija el
  // handoff: sólo el nombre es obligatorio.
  const raza = datos.raza.trim() || 'Mestizo';
  const edad = datos.edad.trim() || '—';
  const peso = datos.peso.trim() || '—';

  const mascota: Mascota = {
    id: nuevoId('m'),
    duenoId,
    nombre,
    raza,
    edad,
    sexo: datos.sexo,
    tamano: datos.tamano,
    peso,
    notas: datos.notas.trim(),
    fotoUrl: datos.fotoUrl ?? null,
    resumenEtiqueta: `${raza} · ${edad}`,
  };

  bd.mascotas.push(mascota);
  return esperar({ mascota, toast: `«${nombre}» se agregó a tus mascotas` });
}

// ── Solicitudes ─────────────────────────────────────────────────────────────

const ESTADO_DE_CHIP: Record<string, EstadoServicio | null> = {
  Todas: null,
  Publicada: 'publicada',
  Aceptada: 'aceptada',
  'En proceso': 'proceso',
  Finalizada: 'finalizada',
};

/**
 * Las solicitudes del usuario: las suyas si es dueño, las que aceptó si es
 * cuidador. Es lo que alimenta "Mis solicitudes" y "Mis servicios".
 */
export async function listarSolicitudes(
  usuarioId: string,
  rol: Rol,
  chipEstado = 'Todas',
): Promise<Solicitud[]> {
  const estado = ESTADO_DE_CHIP[chipEstado] ?? null;

  const propias = bd.solicitudes.filter((s) =>
    rol === 'dueno' ? s.duenoId === usuarioId : s.cuidadorId === usuarioId,
  );

  const filtradas = estado ? propias.filter((s) => s.estado === estado) : propias;

  return esperar(
    filtradas
      .sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime())
      .map((s) =>
        serializarSolicitud(s, {
          conDistancia: rol === 'cuidador',
          interesados: contarIntereses(s.id),
        }),
      ),
  );
}

/** Sólo las activas, para el inicio del dueño. */
export async function solicitudesActivas(duenoId: string): Promise<Solicitud[]> {
  const activas: EstadoServicio[] = ['publicada', 'aceptada', 'programada', 'proceso'];
  const propias = bd.solicitudes.filter(
    (s) => s.duenoId === duenoId && activas.includes(s.estado),
  );
  return esperar(
    propias.map((s) => serializarSolicitud(s, { interesados: contarIntereses(s.id) })),
  );
}

/**
 * Solicitudes cerca del cuidador. **Es la consulta geoespacial.**
 *
 * Aquí es un filtro en memoria; en el backend es SQL crudo con
 * `ST_DWithin(ubicacion, $punto, $radio)` sobre `geography`, que mide en
 * metros y es lo que usa el índice GiST. Poner `ST_Distance(...) < radio` en
 * el `WHERE` degrada a escaneo secuencial.
 *
 * Los chips de filtro viajan al backend tal cual y se traducen allí:
 * `"5 km"` → 5000 metros, `"Bs 40+"` → 40, `"Esta semana"` → rango de fechas.
 */
export async function solicitudesCercanas(
  cuidadorId: string,
  filtros: Filtros,
  /** Posición del cuidador. Sin ella se busca desde el centro del Cercado. */
  punto: Punto | null = null,
): Promise<Solicitud[]> {
  const radio = radioEnMetros(filtros.distancia);
  const pagoMin = pagoMinimo(filtros.pago);
  const duracionExacta =
    filtros.duracion === 'Todas' ? null : Number.parseInt(filtros.duracion, 10);

  const ahora = new Date();
  const finDeSemana = new Date(ahora);
  finDeSemana.setDate(ahora.getDate() + 7);

  const { origen } = origenDeBusqueda(punto);

  const resultado = bd.solicitudes
    .filter((s) => s.estado === 'publicada' && !s.cuidadorId)
    .filter((s) => s.duenoId !== cuidadorId)
    // La distancia se mide de verdad contra la posición del cuidador, igual que
    // hará `ST_DWithin` en el servidor. Antes venía precocinada en el seed.
    .map((s) => ({
      solicitud: s,
      metros: distanciaEnMetros(origen, { lat: s.lat, lng: s.lng }),
    }))
    .filter(({ metros }) => metros <= radio)
    .filter(({ solicitud }) => (pagoMin == null ? true : solicitud.pagoBs >= pagoMin))
    .filter(({ solicitud }) =>
      duracionExacta == null ? true : solicitud.duracionMin === duracionExacta,
    )
    .filter(({ solicitud }) => {
      if (filtros.fecha === 'Hoy') return diaRelativo(solicitud.fechaHora) === 'Hoy';
      if (filtros.fecha === 'Esta semana') return solicitud.fechaHora <= finDeSemana;
      return true;
    })
    .filter(({ solicitud }) => {
      if (filtros.mascotas === '1') return solicitud.mascotaIds.length === 1;
      if (filtros.mascotas === '2 o más') return solicitud.mascotaIds.length >= 2;
      return true;
    })
    // El orden de la lista sale del `ORDER BY dist_km ASC` de la consulta.
    .sort((a, b) => a.metros - b.metros)
    .map(({ solicitud, metros }) =>
      serializarSolicitud(solicitud, { conDistancia: true, metros }),
    );

  return esperar(resultado);
}

export async function obtenerSolicitud(id: string, rol: Rol): Promise<Solicitud> {
  const cruda = buscarSolicitud(id);
  return esperar(
    serializarSolicitud(cruda, {
      conDistancia: rol === 'cuidador',
      interesados: contarIntereses(id),
    }),
  );
}

export async function crearSolicitud(
  duenoId: string,
  datos: {
    mascotaIds: string[];
    fechaHora: Date;
    duracionMin: number;
    pagoBs: number;
    direccion: string;
    zona: string;
    lat: number;
    lng: number;
    notas: string;
  },
): Promise<{ solicitud: Solicitud; toast: string }> {
  if (datos.mascotaIds.length === 0) {
    throw new ErrorApi('Selecciona al menos una mascota', 'servidor', 422);
  }
  if (!datos.pagoBs || datos.pagoBs <= 0) {
    throw new ErrorApi('Indica cuánto ofreces por el paseo', 'servidor', 422);
  }

  contadorCodigo += 1;
  const cruda: SolicitudCruda = {
    id: nuevoId('s'),
    codigo: `#${contadorCodigo}`,
    duenoId,
    cuidadorId: null,
    mascotaIds: datos.mascotaIds,
    fechaHora: datos.fechaHora,
    duracionMin: datos.duracionMin,
    pagoBs: datos.pagoBs,
    direccion: datos.direccion,
    zona: datos.zona,
    lat: datos.lat,
    lng: datos.lng,
    notas: datos.notas,
    estado: 'publicada',
    awaitingConfirmation: false,
    metros: 0,
    horas: { publicada: fechaHora(new Date()) },
  };

  bd.solicitudes.unshift(cruda);

  return esperar({
    solicitud: serializarSolicitud(cruda),
    toast: 'Solicitud publicada · los cuidadores cercanos ya la ven',
  });
}

// ── Intereses ───────────────────────────────────────────────────────────────

export async function listarInteresados(solicitudId: string): Promise<Interesado[]> {
  return esperar(
    bd.intereses.filter((i) => i.solicitudId === solicitudId).map(serializarInteres),
  );
}

export async function manifestarInteres(
  solicitudId: string,
  cuidadorId: string,
  mensaje = 'Estoy disponible para este paseo.',
): Promise<{ toast: string }> {
  const cruda = buscarSolicitud(solicitudId);

  if (cruda.cuidadorId || cruda.estado !== 'publicada') {
    throw new ErrorApi('Esta solicitud ya tiene cuidador', 'yaTomada', 409);
  }
  if (bd.intereses.some((i) => i.solicitudId === solicitudId && i.cuidadorId === cuidadorId)) {
    return esperar({ toast: 'Ya enviaste tu interés en esta solicitud' });
  }

  bd.intereses.push({
    id: nuevoId('i'),
    solicitudId,
    cuidadorId,
    mensaje,
    metros: cruda.metros ?? 0,
  });

  const dueno = usuario(cruda.duenoId);
  const cuidador = usuario(cuidadorId);

  bd.notificaciones.unshift({
    id: nuevoId('n'),
    tipo: 'interes',
    titulo: `${cuidador.nombre} está interesado en tu solicitud`,
    cuerpo: `Solicitud ${cruda.codigo} · ${cruda.mascotaIds.length > 1 ? 'tus mascotas' : 'tu mascota'} · ${fechaHora(cruda.fechaHora)}.`,
    horaEtiqueta: 'Ahora',
    leida: false,
    solicitudId,
    accionEtiqueta: 'Ver interesados',
  });

  return esperar({ toast: `Enviaste tu interés a ${dueno.primerNombre}` });
}

/** El dueño elige entre los interesados. La solicitud pasa a `aceptada`. */
export async function aceptarInteresado(
  solicitudId: string,
  interesId: string,
): Promise<{ solicitud: Solicitud; toast: string }> {
  const cruda = buscarSolicitud(solicitudId);
  const interes = bd.intereses.find((i) => i.id === interesId);
  if (!interes) throw new ErrorApi('Ese cuidador ya no está disponible', 'noEncontrada', 404);

  cruda.cuidadorId = interes.cuidadorId;
  cruda.estado = 'aceptada';
  cruda.metros = interes.metros;
  marcarHora(cruda, 'aceptada');

  const cuidador = usuario(interes.cuidadorId);

  return esperar({
    solicitud: serializarSolicitud(cruda, { interesados: contarIntereses(solicitudId) }),
    toast: `Aceptaste a ${cuidador.primerNombre}`,
  });
}

// ── Transiciones de estado ──────────────────────────────────────────────────

/**
 * El cuidador avanza el estado. En `proceso` la acción no avanza nada: marca
 * el fin del paseo y activa `awaitingConfirmation`.
 */
export async function avanzarEstado(
  solicitudId: string,
): Promise<{ solicitud: Solicitud; toast: string }> {
  const cruda = buscarSolicitud(solicitudId);
  const vista = serializarSolicitud(cruda);

  if (cruda.estado === 'finalizada') {
    throw new ErrorApi('El servicio ya está finalizado', 'servidor', 409);
  }
  if (!cuidadorPuedeAvanzar(vista)) {
    throw new ErrorApi('No puedes avanzar este servicio ahora', 'servidor', 409);
  }

  if (marcaFinDePaseo(vista)) {
    // El paseo terminó, el servicio no. Sólo el dueño lo cierra.
    cruda.awaitingConfirmation = true;

    bd.notificaciones.unshift({
      id: nuevoId('n'),
      tipo: 'confirmar',
      titulo: 'Confirma que el paseo terminó',
      cuerpo: `${usuario(cruda.cuidadorId!).primerNombre} marcó como finalizado el paseo. Confirma para cerrar el servicio.`,
      horaEtiqueta: 'Ahora',
      leida: false,
      solicitudId,
      accionEtiqueta: 'Confirmar',
    });

    return esperar({
      solicitud: serializarSolicitud(cruda, { interesados: contarIntereses(solicitudId) }),
      toast: 'Marcado como terminado · esperando confirmación del dueño',
    });
  }

  const siguiente = siguienteEstado(cruda.estado);
  if (!siguiente || siguiente === 'finalizada') {
    throw new ErrorApi('No puedes avanzar este servicio ahora', 'servidor', 409);
  }

  cruda.estado = siguiente;
  marcarHora(cruda, siguiente);

  const vistaNueva = serializarSolicitud(cruda, {
    interesados: contarIntereses(solicitudId),
  });

  return esperar({
    solicitud: vistaNueva,
    toast: `Estado actualizado a ${vistaNueva.estadoEtiqueta.toLocaleLowerCase('es-BO')}`,
  });
}

/**
 * `POST /api/requests/:id/confirm` — **el único camino a `finalizada`**, y sólo
 * el dueño puede recorrerlo.
 */
export async function confirmarFinalizacion(
  solicitudId: string,
): Promise<{ solicitud: Solicitud; toast: string }> {
  const cruda = buscarSolicitud(solicitudId);
  const vista = serializarSolicitud(cruda);

  if (cruda.estado === 'finalizada') {
    throw new ErrorApi('El servicio ya está finalizado', 'servidor', 409);
  }
  if (!duenoPuedeConfirmar(vista)) {
    throw new ErrorApi('El cuidador todavía no marcó el fin del paseo', 'servidor', 409);
  }

  cruda.estado = 'finalizada';
  cruda.awaitingConfirmation = false;
  marcarHora(cruda, 'finalizada');

  // La notificación de confirmación desaparece: ya se actuó sobre ella.
  bd.notificaciones = bd.notificaciones.filter(
    (n) => !(n.tipo === 'confirmar' && n.solicitudId === solicitudId),
  );

  const nombres = serializarSolicitud(cruda).mascotasEtiqueta;

  return esperar({
    solicitud: serializarSolicitud(cruda, { interesados: contarIntereses(solicitudId) }),
    toast: `Servicio de ${nombres} finalizado`,
  });
}

/** Ambas partes, en cualquier momento antes de un estado terminal. */
export async function cancelarSolicitud(
  solicitudId: string,
): Promise<{ solicitud: Solicitud; toast: string }> {
  const cruda = buscarSolicitud(solicitudId);

  if (cruda.estado === 'finalizada') {
    throw new ErrorApi('El servicio ya está finalizado', 'servidor', 409);
  }
  if (!puedeCancelar(serializarSolicitud(cruda))) {
    throw new ErrorApi('Este servicio ya no se puede cancelar', 'servidor', 409);
  }

  cruda.estado = 'cancelada';
  cruda.awaitingConfirmation = false;
  marcarHora(cruda, 'cancelada');

  bd.notificaciones = bd.notificaciones.filter(
    (n) => !(n.tipo === 'confirmar' && n.solicitudId === solicitudId),
  );

  return esperar({
    solicitud: serializarSolicitud(cruda, { interesados: contarIntereses(solicitudId) }),
    toast: 'Servicio cancelado',
  });
}

// ── Notificaciones ──────────────────────────────────────────────────────────

export async function listarNotificaciones(): Promise<Notificacion[]> {
  return esperar(bd.notificaciones);
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  const n = bd.notificaciones.find((x) => x.id === id);
  if (n) n.leida = true;
  return esperar(undefined, 0);
}

export async function vaciarNotificaciones(): Promise<void> {
  bd.notificaciones = [];
  return esperar(undefined, 120);
}

export async function contarNoLeidas(): Promise<number> {
  return esperar(bd.notificaciones.filter((n) => !n.leida).length, 0);
}

// ── Chat ────────────────────────────────────────────────────────────────────

export async function listarConversaciones(
  usuarioId: string,
  rol: Rol,
): Promise<Conversacion[]> {
  const propias = bd.solicitudes.filter((s) =>
    rol === 'dueno' ? s.duenoId === usuarioId : s.cuidadorId === usuarioId,
  );

  const conversaciones = propias
    // Una conversación es una solicitud con cuidador asignado más sus mensajes.
    // Sin cuidador no hay con quién hablar, así que no hay hilo.
    .filter((s) => Boolean(s.cuidadorId))
    .map((s) => {
      const contraparteId = rol === 'dueno' ? s.cuidadorId! : s.duenoId;
      const mensajes = bd.mensajes.filter((m) => m.solicitudId === s.id);
      return serializarConversacion(
        serializarSolicitud(s),
        usuario(contraparteId),
        mensajes,
      );
    })
    .filter((c) => c.ultimoMensaje.length > 0);

  return esperar(conversaciones);
}

export async function obtenerConversacion(
  solicitudId: string,
  usuarioId: string,
  rol: Rol,
): Promise<Conversacion> {
  const cruda = buscarSolicitud(solicitudId);
  if (!cruda.cuidadorId) {
    throw new ErrorApi('Esta solicitud todavía no tiene cuidador', 'noEncontrada', 404);
  }
  const contraparteId = rol === 'dueno' ? cruda.cuidadorId : cruda.duenoId;
  const mensajes = bd.mensajes.filter((m) => m.solicitudId === solicitudId);
  return esperar(
    serializarConversacion(serializarSolicitud(cruda), usuario(contraparteId), mensajes),
    120,
  );
}

export async function obtenerMensajes(solicitudId: string): Promise<Mensaje[]> {
  return esperar(
    bd.mensajes.filter((m) => m.solicitudId === solicitudId),
    120,
  );
}

export async function enviarMensaje(
  solicitudId: string,
  autorId: string,
  texto: string,
): Promise<Mensaje> {
  const limpio = texto.trim();
  if (!limpio) throw new ErrorApi('El mensaje está vacío', 'servidor', 422);

  const mensaje: Mensaje = {
    id: nuevoId('msg'),
    solicitudId,
    autorId,
    texto: limpio,
    horaEtiqueta: hora(new Date()),
  };

  bd.mensajes.push(mensaje);
  emitirLocal({ tipo: 'mensaje', solicitudId });
  return esperar(mensaje, 90);
}

// ── Utilidades para la interfaz ─────────────────────────────────────────────

/** "Filtros aplicados · 4 solicitudes". */
export function toastFiltros(cuantas: number): string {
  return `Filtros aplicados · ${plural(cuantas, 'solicitud', 'solicitudes')}`;
}

export { bolivianos, distancia };
