import type { NombreIcono } from '../../components/Icono';
import type {
  Conversacion,
  EstadoServicio,
  Hito,
  Interesado,
  Mascota,
  Mensaje,
  Notificacion,
  Solicitud,
  Usuario,
} from '../tipos';
import {
  bolivianos,
  distancia,
  distanciaLarga,
  duracion as fmtDuracion,
  fechaHora,
  diaRelativo,
  plural,
  unirNombres,
} from './formato';

/**
 * Datos del seed.
 *
 * Son los mismos que sembrará `npm run db:seed` en el backend, con las mismas
 * cuentas y los mismos códigos de solicitud. La contraseña de todas es
 * `petgo1234`.
 *
 * La solicitud **#1042** queda en `proceso` con `awaitingConfirmation` activo:
 * es el caso que demuestra la regla de confirmación del cliente — el cuidador
 * ya marcó el fin del paseo y el servicio sigue abierto hasta que la dueña lo
 * cierre.
 */

// ── Usuarios ────────────────────────────────────────────────────────────────

export const CAMILA: Usuario = {
  id: 'u-camila',
  nombre: 'Camila Vargas',
  primerNombre: 'Camila',
  correo: 'camila.v@gmail.com',
  telefono: '+591 712 44 903',
  rol: 'dueno',
  zona: 'Sarco, Cercado',
  fotoUrl: null,
  paseosCompletados: null,
  metaEtiqueta: 'Dueña de mascota',
  rolEtiqueta: 'Dueño de mascota',
};

export const DIEGO: Usuario = {
  id: 'u-diego',
  nombre: 'Diego Rojas',
  primerNombre: 'Diego',
  correo: 'diego.r@gmail.com',
  telefono: '+591 707 21 884',
  rol: 'cuidador',
  zona: 'Sarco, Cercado',
  fotoUrl: null,
  paseosCompletados: 34,
  metaEtiqueta: 'Cuidador · 34 paseos',
  rolEtiqueta: 'Cuidador / paseador',
};

export const ANA: Usuario = {
  id: 'u-ana',
  nombre: 'Ana Peredo',
  primerNombre: 'Ana',
  correo: 'ana.p@gmail.com',
  telefono: '+591 764 90 112',
  rol: 'cuidador',
  zona: 'Queru Queru, Cercado',
  fotoUrl: null,
  paseosCompletados: 12,
  metaEtiqueta: 'Cuidadora · 12 paseos',
  rolEtiqueta: 'Cuidador / paseador',
};

export const LUIS: Usuario = {
  id: 'u-luis',
  nombre: 'Luis Ovando',
  primerNombre: 'Luis',
  correo: 'luis.o@gmail.com',
  telefono: '+591 719 33 507',
  rol: 'cuidador',
  zona: 'Cala Cala, Cercado',
  fotoUrl: null,
  paseosCompletados: 21,
  metaEtiqueta: 'Cuidador · 21 paseos',
  rolEtiqueta: 'Cuidador / paseador',
};

/** Dueños de las solicitudes que el cuidador ve en el mapa. */
export const MARIANA: Usuario = {
  id: 'u-mariana',
  nombre: 'Mariana Claros',
  primerNombre: 'Mariana',
  correo: 'mariana.c@gmail.com',
  telefono: '+591 700 55 218',
  rol: 'dueno',
  zona: 'Queru Queru, Cercado',
  fotoUrl: null,
  paseosCompletados: null,
  metaEtiqueta: 'Dueña de mascota',
  rolEtiqueta: 'Dueño de mascota',
};

export const JAVIER: Usuario = {
  id: 'u-javier',
  nombre: 'Javier Terceros',
  primerNombre: 'Javier',
  correo: 'javier.t@gmail.com',
  telefono: '+591 776 12 340',
  rol: 'dueno',
  zona: 'Cala Cala, Cercado',
  fotoUrl: null,
  paseosCompletados: null,
  metaEtiqueta: 'Dueño de mascota',
  rolEtiqueta: 'Dueño de mascota',
};

export const USUARIOS: Usuario[] = [CAMILA, DIEGO, ANA, LUIS, MARIANA, JAVIER];

/** Cuentas del seed, para la pantalla de acceso. Todas usan `petgo1234`. */
export const CREDENCIALES: Record<string, { clave: string; usuarioId: string }> = {
  'camila.v@gmail.com': { clave: 'petgo1234', usuarioId: CAMILA.id },
  'diego.r@gmail.com': { clave: 'petgo1234', usuarioId: DIEGO.id },
  'ana.p@gmail.com': { clave: 'petgo1234', usuarioId: ANA.id },
};

// ── Mascotas ────────────────────────────────────────────────────────────────

function mascota(
  id: string,
  duenoId: string,
  nombre: string,
  raza: string,
  edad: string,
  sexo: Mascota['sexo'],
  tamano: Mascota['tamano'],
  peso: string,
  notas: string,
): Mascota {
  return {
    id,
    duenoId,
    nombre,
    raza,
    edad,
    sexo,
    tamano,
    peso,
    notas,
    fotoUrl: null,
    resumenEtiqueta: `${raza} · ${edad}`,
  };
}

export const MASCOTAS: Mascota[] = [
  mascota('m-rocco', CAMILA.id, 'Rocco', 'Border collie', '3 años', 'Macho', 'Mediano', '18 kg',
    'Jala al inicio del paseo, mejor con arnés. Timbre 2B.'),
  mascota('m-luna', CAMILA.id, 'Luna', 'Mestiza', '5 años', 'Hembra', 'Pequeño', '9 kg',
    'Tranquila. No tolera otros perros grandes.'),
  mascota('m-momo', CAMILA.id, 'Momo', 'Schnauzer', '2 años', 'Macho', 'Pequeño', '7 kg',
    'Muy activo, necesita ruta larga.'),
  mascota('m-kira', MARIANA.id, 'Kira', 'Labrador', '4 años', 'Hembra', 'Grande', '27 kg', ''),
  mascota('m-toby', JAVIER.id, 'Toby', 'Golden retriever', '6 años', 'Macho', 'Grande', '31 kg', ''),
  mascota('m-nala', JAVIER.id, 'Nala', 'Golden retriever', '6 años', 'Hembra', 'Grande', '28 kg', ''),
  mascota('m-bruno', MARIANA.id, 'Bruno', 'Bóxer', '3 años', 'Macho', 'Grande', '29 kg', ''),
];

export function mascotasPorId(ids: readonly string[]): Mascota[] {
  return ids
    .map((id) => MASCOTAS.find((m) => m.id === id))
    .filter((m): m is Mascota => Boolean(m));
}

// ── Solicitudes ─────────────────────────────────────────────────────────────

/** Registro crudo, tal como estaría en la tabla `requests`. */
export type SolicitudCruda = {
  id: string;
  codigo: string;
  duenoId: string;
  cuidadorId: string | null;
  mascotaIds: string[];
  fechaHora: Date;
  duracionMin: number;
  pagoBs: number;
  direccion: string;
  zona: string;
  lat: number;
  lng: number;
  notas: string;
  estado: EstadoServicio;
  awaitingConfirmation: boolean;
  /** Metros hasta el cuidador. Lo calcula PostGIS; aquí viene precocinado. */
  metros?: number;
  /** Horas registradas de cada transición, para el timeline. */
  horas?: Partial<Record<EstadoServicio, string>>;
};

/** Hoy a una hora concreta, en el reloj local del dispositivo. */
function hoyA(hh: number, mm: number, diasDespues = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + diasDespues);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export const SOLICITUDES_CRUDAS: SolicitudCruda[] = [
  {
    id: 's-1042',
    codigo: '#1042',
    duenoId: CAMILA.id,
    cuidadorId: DIEGO.id,
    mascotaIds: ['m-rocco', 'm-luna'],
    fechaHora: hoyA(17, 30),
    duracionMin: 60,
    pagoBs: 45,
    direccion: 'Av. América #1204',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    notas: 'Rocco jala al inicio; llevar bolsas. Timbre 2B.',
    // El caso que demuestra la regla: Diego ya marcó el fin del paseo y el
    // servicio sigue en `proceso` hasta que Camila lo cierre.
    estado: 'proceso',
    awaitingConfirmation: true,
    metros: 600,
    horas: {
      publicada: 'Hoy · 09:14',
      aceptada: 'Hoy · 11:02',
      programada: 'Hoy · 16:40',
      proceso: 'Hoy · 17:32',
    },
  },
  {
    id: 's-1041',
    codigo: '#1041',
    duenoId: CAMILA.id,
    cuidadorId: ANA.id,
    mascotaIds: ['m-momo'],
    fechaHora: hoyA(8, 0, 1),
    duracionMin: 45,
    pagoBs: 35,
    direccion: 'Calle Bolívar #340',
    zona: 'Centro',
    lat: -17.3935,
    lng: -66.157,
    notas: 'Momo necesita ruta larga; sale por la puerta principal.',
    estado: 'aceptada',
    awaitingConfirmation: false,
    metros: 1400,
    horas: { publicada: 'Ayer · 18:20', aceptada: 'Ayer · 19:04' },
  },
  {
    id: 's-1040',
    codigo: '#1040',
    duenoId: CAMILA.id,
    cuidadorId: null,
    mascotaIds: ['m-rocco'],
    fechaHora: hoyA(18, 0, 2),
    duracionMin: 60,
    pagoBs: 40,
    direccion: 'Av. América #1204',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    notas: 'Paseo del lunes. Arnés propio, por favor.',
    estado: 'publicada',
    awaitingConfirmation: false,
    metros: 600,
    horas: { publicada: 'Hace 5 min' },
  },
  {
    id: 's-1039',
    codigo: '#1039',
    duenoId: CAMILA.id,
    cuidadorId: DIEGO.id,
    mascotaIds: ['m-luna'],
    fechaHora: hoyA(10, 0, -3),
    duracionMin: 30,
    pagoBs: 25,
    direccion: 'Av. América #1204',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    notas: '',
    estado: 'finalizada',
    awaitingConfirmation: false,
    metros: 600,
    horas: {
      publicada: 'Jue · 08:10',
      aceptada: 'Jue · 08:44',
      programada: 'Jue · 09:30',
      proceso: 'Jue · 10:02',
      finalizada: 'Jue · 10:36',
    },
  },
  {
    id: 's-1038',
    codigo: '#1038',
    duenoId: CAMILA.id,
    cuidadorId: null,
    mascotaIds: ['m-luna'],
    fechaHora: hoyA(9, 0, -6),
    duracionMin: 45,
    pagoBs: 30,
    direccion: 'Av. América #1204',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    notas: '',
    estado: 'cancelada',
    awaitingConfirmation: false,
    metros: 600,
    horas: { publicada: 'Dom · 07:40', cancelada: 'Dom · 08:12' },
  },

  // ── Solicitudes publicadas que ve el cuidador en el mapa ──────────────────
  {
    id: 's-1044',
    codigo: '#1044',
    duenoId: CAMILA.id,
    cuidadorId: null,
    mascotaIds: ['m-rocco', 'm-luna'],
    fechaHora: hoyA(16, 0, 1),
    duracionMin: 60,
    pagoBs: 45,
    direccion: 'Av. América #1204',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    notas: 'Los dos juntos. Rocco jala al inicio.',
    estado: 'publicada',
    awaitingConfirmation: false,
    metros: 1200,
    horas: { publicada: 'Hace 20 min' },
  },
  {
    id: 's-1045',
    codigo: '#1045',
    duenoId: MARIANA.id,
    cuidadorId: null,
    mascotaIds: ['m-kira'],
    fechaHora: hoyA(7, 30, 1),
    duracionMin: 30,
    pagoBs: 25,
    direccion: 'Calle Ladislao Cabrera #78',
    zona: 'Queru Queru',
    lat: -17.376,
    lng: -66.149,
    notas: 'Kira es fuerte pero obediente.',
    estado: 'publicada',
    awaitingConfirmation: false,
    metros: 800,
    horas: { publicada: 'Hace 1 h' },
  },
  {
    id: 's-1046',
    codigo: '#1046',
    duenoId: CAMILA.id,
    cuidadorId: null,
    mascotaIds: ['m-momo'],
    fechaHora: hoyA(19, 0),
    duracionMin: 45,
    pagoBs: 30,
    direccion: 'Calle Bolívar #340',
    zona: 'Centro',
    lat: -17.3935,
    lng: -66.157,
    notas: '',
    estado: 'publicada',
    awaitingConfirmation: false,
    metros: 2400,
    horas: { publicada: 'Hace 2 h' },
  },
  {
    id: 's-1047',
    codigo: '#1047',
    duenoId: JAVIER.id,
    cuidadorId: null,
    mascotaIds: ['m-toby', 'm-nala'],
    fechaHora: hoyA(17, 0, 1),
    duracionMin: 90,
    pagoBs: 70,
    direccion: 'Av. América Este #2210',
    zona: 'Cala Cala',
    lat: -17.369,
    lng: -66.16,
    notas: 'Los dos son grandes; se llevan bien entre ellos.',
    estado: 'publicada',
    awaitingConfirmation: false,
    metros: 3100,
    horas: { publicada: 'Hace 3 h' },
  },
  {
    id: 's-1048',
    codigo: '#1048',
    duenoId: MARIANA.id,
    cuidadorId: null,
    mascotaIds: ['m-bruno'],
    fechaHora: hoyA(9, 0, 2),
    duracionMin: 60,
    pagoBs: 40,
    direccion: 'Calle Muyurina #145',
    zona: 'Muyurina',
    lat: -17.382,
    lng: -66.14,
    notas: '',
    estado: 'publicada',
    awaitingConfirmation: false,
    metros: 1900,
    horas: { publicada: 'Ayer · 21:15' },
  },
];

// ── Serialización ───────────────────────────────────────────────────────────

const ETIQUETA_ESTADO: Record<EstadoServicio, string> = {
  publicada: 'Publicada',
  aceptada: 'Aceptada',
  programada: 'Programada',
  proceso: 'En proceso',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

/** Secuencia de estados. `cancelada` es terminal y sale de esta línea. */
export const ORDEN_ESTADOS: EstadoServicio[] = [
  'publicada',
  'aceptada',
  'programada',
  'proceso',
  'finalizada',
];

const PASOS: { clave: EstadoServicio; etiqueta: string; icono: NombreIcono }[] = [
  { clave: 'publicada', etiqueta: 'Solicitud publicada', icono: 'campaign' },
  { clave: 'aceptada', etiqueta: 'Solicitud aceptada', icono: 'how_to_reg' },
  { clave: 'programada', etiqueta: 'Servicio programado', icono: 'event_available' },
  { clave: 'proceso', etiqueta: 'Servicio en proceso', icono: 'directions_walk' },
  { clave: 'finalizada', etiqueta: 'Servicio finalizado', icono: 'flag' },
];

function construirHitos(cruda: SolicitudCruda): Hito[] {
  const cancelada = cruda.estado === 'cancelada';
  const indiceActual = cancelada ? -1 : ORDEN_ESTADOS.indexOf(cruda.estado);

  return PASOS.map((paso, i) => {
    const hora = cruda.horas?.[paso.clave];

    let fase: Hito['fase'];
    if (cancelada) fase = hora ? 'completado' : 'pendiente';
    else if (i < indiceActual) fase = 'completado';
    else if (i === indiceActual) fase = 'actual';
    else fase = 'pendiente';

    // El paso final se queda esperando mientras la bandera esté activa: el
    // cuidador terminó, pero sólo el dueño cierra el servicio.
    const detalle =
      paso.clave === 'finalizada' && cruda.awaitingConfirmation
        ? 'Esperando confirmación del dueño'
        : (hora ?? 'Pendiente');

    return { clave: paso.clave, etiqueta: paso.etiqueta, icono: paso.icono, fase, detalle };
  });
}

export function serializarSolicitud(
  cruda: SolicitudCruda,
  opciones: {
    conDistancia?: boolean;
    interesados?: number;
    /**
     * Distancia real calculada desde la posición del cuidador. Reemplaza el
     * valor precocinado del seed. En el backend la produce `ST_Distance` en la
     * misma consulta que filtra por radio.
     */
    metros?: number;
  } = {},
): Solicitud {
  const mascotas = mascotasPorId(cruda.mascotaIds);
  const nombres = mascotas.map((m) => m.nombre);
  const mascotasEtiqueta = unirNombres(nombres);
  const interesadosConteo = opciones.interesados ?? 0;
  const metros = opciones.metros ?? cruda.metros;

  return {
    id: cruda.id,
    codigo: cruda.codigo,
    estado: cruda.estado,
    estadoEtiqueta: ETIQUETA_ESTADO[cruda.estado],
    awaitingConfirmation: cruda.awaitingConfirmation,
    duenoId: cruda.duenoId,
    cuidadorId: cruda.cuidadorId,
    mascotas,
    mascotasEtiqueta,
    mascotasConteoEtiqueta: plural(mascotas.length, 'mascota', 'mascotas'),
    direccion: cruda.direccion,
    zona: cruda.zona,
    lat: cruda.lat,
    lng: cruda.lng,
    fechaEtiqueta: fechaHora(cruda.fechaHora),
    fechaCortaEtiqueta: diaRelativo(cruda.fechaHora),
    duracionEtiqueta: fmtDuracion(cruda.duracionMin),
    duracionMin: cruda.duracionMin,
    pagoEtiqueta: bolivianos(cruda.pagoBs),
    pagoBs: cruda.pagoBs,
    notas: cruda.notas,
    fotoUrl: mascotas[0]?.fotoUrl ?? null,
    heroeMetaEtiqueta:
      mascotas.length > 1
        ? `${plural(mascotas.length, 'mascota', 'mascotas')} · ${cruda.zona}`
        : `${mascotas[0]?.raza ?? 'Mascota'} · ${cruda.zona}`,
    distanciaEtiqueta:
      opciones.conDistancia && metros != null ? distancia(metros) : undefined,
    distanciaLargaEtiqueta:
      opciones.conDistancia && metros != null ? distanciaLarga(metros) : undefined,
    interesadosConteo,
    interesadosEtiqueta: plural(interesadosConteo, 'cuidador interesado', 'cuidadores interesados'),
    hitos: construirHitos(cruda),
  };
}

// ── Intereses ───────────────────────────────────────────────────────────────

export type InteresCrudo = {
  id: string;
  solicitudId: string;
  cuidadorId: string;
  mensaje: string;
  metros: number;
};

export const INTERESES_CRUDOS: InteresCrudo[] = [
  {
    id: 'i-1',
    solicitudId: 's-1040',
    cuidadorId: DIEGO.id,
    mensaje:
      'Puedo pasar 10 minutos antes. Tengo experiencia con pastores alemanes y arnés propio.',
    metros: 600,
  },
  {
    id: 'i-2',
    solicitudId: 's-1040',
    cuidadorId: ANA.id,
    mensaje: 'Estoy libre esa tarde y hago la ruta del parque Mariscal.',
    metros: 1400,
  },
  {
    id: 'i-3',
    solicitudId: 's-1040',
    cuidadorId: LUIS.id,
    mensaje: 'Disponible toda la semana. Puedo llevar a las dos mascotas juntas.',
    metros: 2100,
  },
];

export function serializarInteres(crudo: InteresCrudo): Interesado {
  const cuidador = USUARIOS.find((u) => u.id === crudo.cuidadorId)!;
  return {
    id: crudo.id,
    cuidador,
    mensaje: crudo.mensaje,
    distanciaEtiqueta: distanciaLarga(crudo.metros),
  };
}

// ── Notificaciones ──────────────────────────────────────────────────────────

export const NOTIFICACIONES: Notificacion[] = [
  {
    id: 'n-1',
    tipo: 'interes',
    titulo: 'Diego Rojas está interesado en tu solicitud',
    cuerpo: 'Solicitud #1040 · Rocco · paseo del lunes a las 18:00.',
    horaEtiqueta: 'Hace 5 min',
    leida: false,
    solicitudId: 's-1040',
    accionEtiqueta: 'Ver interesados',
  },
  {
    id: 'n-2',
    tipo: 'confirmar',
    titulo: 'Confirma que el paseo terminó',
    cuerpo:
      'Diego marcó como finalizado el paseo de Rocco y Luna. Confirma para cerrar el servicio.',
    horaEtiqueta: 'Hace 12 min',
    leida: false,
    solicitudId: 's-1042',
    accionEtiqueta: 'Confirmar',
  },
  {
    id: 'n-3',
    tipo: 'iniciado',
    titulo: 'Diego marcó el paseo como iniciado',
    cuerpo: 'Solicitud #1042 · Rocco y Luna salieron a las 17:32.',
    horaEtiqueta: 'Hace 40 min',
    leida: false,
    solicitudId: 's-1042',
  },
  {
    id: 'n-4',
    tipo: 'aceptado',
    titulo: 'Ana Peredo aceptó el paseo de Momo',
    cuerpo: 'Solicitud #1041 · mañana a las 08:00 en Calle Bolívar #340.',
    horaEtiqueta: 'Ayer · 19:04',
    leida: true,
    solicitudId: 's-1041',
  },
  {
    id: 'n-5',
    tipo: 'cancelada',
    titulo: 'Solicitud #1038 cancelada',
    cuerpo: 'Cancelaste el paseo de Luna del domingo por la mañana.',
    horaEtiqueta: 'Dom · 08:12',
    leida: true,
    solicitudId: 's-1038',
  },
];

// ── Mensajes ────────────────────────────────────────────────────────────────

export const MENSAJES: Mensaje[] = [
  {
    id: 'msg-1',
    solicitudId: 's-1042',
    autorId: DIEGO.id,
    texto: 'Hola Camila, confirmo el paseo de hoy a las 17:30.',
    horaEtiqueta: '16:58',
  },
  {
    id: 'msg-2',
    solicitudId: 's-1042',
    autorId: CAMILA.id,
    texto: 'Gracias Diego. Rocco jala al inicio, mejor con arnés.',
    horaEtiqueta: '17:02',
  },
  {
    id: 'msg-3',
    solicitudId: 's-1042',
    autorId: DIEGO.id,
    texto: 'Entendido, llevo arnés de repuesto por si acaso.',
    horaEtiqueta: '17:04',
  },
  {
    id: 'msg-4',
    solicitudId: 's-1042',
    autorId: CAMILA.id,
    texto: 'Perfecto. El timbre es el 2B.',
    horaEtiqueta: '17:10',
  },
  {
    id: 'msg-5',
    solicitudId: 's-1042',
    autorId: DIEGO.id,
    texto: 'Ya salimos, todo tranquilo por la avenida.',
    horaEtiqueta: '17:35',
  },
  {
    id: 'msg-6',
    solicitudId: 's-1041',
    autorId: ANA.id,
    texto: 'Perfecto, mañana 08:00 en la puerta.',
    horaEtiqueta: 'Ayer',
  },
];

export function serializarConversacion(
  solicitud: Solicitud,
  contraparte: Usuario,
  mensajes: Mensaje[],
): Conversacion {
  const ultimo = mensajes[mensajes.length - 1];
  return {
    id: solicitud.id,
    contraparte,
    solicitud: {
      id: solicitud.id,
      codigo: solicitud.codigo,
      mascotasEtiqueta: solicitud.mascotasEtiqueta,
      fechaEtiqueta: solicitud.fechaEtiqueta,
      duracionEtiqueta: solicitud.duracionEtiqueta,
      pagoEtiqueta: solicitud.pagoEtiqueta,
      fotoUrl: solicitud.fotoUrl,
    },
    ultimoMensaje: ultimo?.texto ?? '',
    horaEtiqueta: ultimo?.horaEtiqueta ?? '',
    noLeidos: 0,
    vinculoEtiqueta: `Solicitud ${solicitud.codigo} · ${solicitud.mascotasEtiqueta}`,
  };
}

/** Centro del Cercado de Cochabamba. Todos los mapas arrancan aquí. */
export const CENTRO_CERCADO = { latitude: -17.386, longitude: -66.158 } as const;
