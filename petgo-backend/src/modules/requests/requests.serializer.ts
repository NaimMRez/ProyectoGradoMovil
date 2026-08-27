import { EstadoServicio } from '../../generated/prisma/enums.js';
import { diaRelativo, fechaHora, hora } from '../../lib/fechas.js';
import {
  bolivianos,
  codigoSolicitud,
  distancia,
  distanciaLarga,
  duracion,
  etiquetaSexo,
  etiquetaTamano,
  plural,
  resumenMascota,
  unirNombres,
} from '../../lib/texto.js';

/**
 * Serializadores de solicitud.
 *
 * **Aquí es donde el backend cumple su parte del trato con la app: devolver las
 * etiquetas ya formateadas.** Todo lo que la app pinta como texto sale de este
 * archivo. Si hace falta una etiqueta nueva en una pantalla, se añade aquí y no
 * se construye en el cliente — así el formato vive en un solo sitio y arreglarlo
 * no obliga a publicar una versión nueva de la app.
 */

// ── Etiquetas de estado ─────────────────────────────────────────────────────

const ETIQUETA_ESTADO: Record<EstadoServicio, string> = {
  publicada: 'Publicada',
  aceptada: 'Aceptada',
  programada: 'Programada',
  proceso: 'En proceso',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

// ── Timeline ────────────────────────────────────────────────────────────────

/** Los cinco pasos del seguimiento, con el icono que usa la app. */
const PASOS = [
  { clave: EstadoServicio.publicada, etiqueta: 'Solicitud publicada', icono: 'campaign' },
  { clave: EstadoServicio.aceptada, etiqueta: 'Solicitud aceptada', icono: 'how_to_reg' },
  { clave: EstadoServicio.programada, etiqueta: 'Servicio programado', icono: 'event_available' },
  { clave: EstadoServicio.proceso, etiqueta: 'Servicio en proceso', icono: 'directions_walk' },
  { clave: EstadoServicio.finalizada, etiqueta: 'Servicio finalizado', icono: 'flag' },
] as const;

const ORDEN = PASOS.map((p) => p.clave) as readonly EstadoServicio[];

export type Hito = {
  clave: string;
  etiqueta: string;
  icono: string;
  fase: 'completado' | 'actual' | 'pendiente';
  detalle: string;
};

type EventoFila = { estado: EstadoServicio; creadoEn: Date };

function construirHitos(
  estado: EstadoServicio,
  awaitingConfirmation: boolean,
  eventos: readonly EventoFila[],
  ahora: Date,
): Hito[] {
  // El primer registro de cada estado: si alguien reabriera un paso, la hora que
  // interesa mostrar sigue siendo la de la primera vez.
  const horas = new Map<EstadoServicio, Date>();
  for (const evento of eventos) {
    if (!horas.has(evento.estado)) horas.set(evento.estado, evento.creadoEn);
  }

  const cancelada = estado === EstadoServicio.cancelada;
  const indiceActual = cancelada ? -1 : ORDEN.indexOf(estado);

  return PASOS.map((paso, i) => {
    const cuando = horas.get(paso.clave);

    let fase: Hito['fase'];
    if (cancelada) {
      // En un servicio cancelado no hay paso "actual": lo alcanzado quedó
      // alcanzado y lo demás ya no va a pasar.
      fase = cuando ? 'completado' : 'pendiente';
    } else if (i < indiceActual) {
      fase = 'completado';
    } else if (i === indiceActual) {
      fase = 'actual';
    } else {
      fase = 'pendiente';
    }

    // El paso final se queda esperando mientras la bandera esté activa: el
    // cuidador terminó, pero sólo el dueño cierra el servicio.
    const detalle =
      paso.clave === EstadoServicio.finalizada && awaitingConfirmation
        ? 'Esperando confirmación del dueño'
        : cuando
          ? fechaHora(cuando, ahora)
          : 'Pendiente';

    return {
      clave: paso.clave,
      etiqueta: paso.etiqueta,
      icono: paso.icono,
      fase,
      detalle,
    };
  });
}

// ── Mascota ─────────────────────────────────────────────────────────────────

type MascotaFila = {
  id: string;
  duenoId: string;
  nombre: string;
  raza: string;
  edad: string;
  sexo: string;
  tamano: string;
  peso: string;
  notas: string;
  fotoUrl: string | null;
};

export function serializarMascota(m: MascotaFila) {
  return {
    id: m.id,
    duenoId: m.duenoId,
    nombre: m.nombre,
    raza: m.raza,
    edad: m.edad,
    sexo: etiquetaSexo(m.sexo),
    tamano: etiquetaTamano(m.tamano),
    peso: m.peso,
    notas: m.notas,
    fotoUrl: m.fotoUrl,
    resumenEtiqueta: resumenMascota(m.raza, m.edad),
  };
}

// ── Solicitud ───────────────────────────────────────────────────────────────

export type SolicitudFila = {
  id: string;
  codigo: number;
  estado: EstadoServicio;
  awaitingConfirmation: boolean;
  duenoId: string;
  cuidadorId: string | null;
  fechaHora: Date;
  duracionMin: number;
  pagoBs: number;
  direccion: string;
  zona: string;
  lat: number;
  lng: number;
  notas: string;
  mascotas: { mascota: MascotaFila }[];
  eventos?: EventoFila[];
  _count?: { intereses: number };
};

export type OpcionesSolicitud = {
  /**
   * Distancia en metros desde el punto del cuidador. Viene de `ST_Distance` en
   * la misma consulta que filtra por radio — nunca se recalcula aquí.
   */
  metros?: number | null;
  ahora?: Date;
};

export function serializarSolicitud(fila: SolicitudFila, opciones: OpcionesSolicitud = {}) {
  const ahora = opciones.ahora ?? new Date();
  const mascotas = fila.mascotas.map((puente) => serializarMascota(puente.mascota));
  const interesados = fila._count?.intereses ?? 0;
  const metros = opciones.metros;

  return {
    id: fila.id,
    codigo: codigoSolicitud(fila.codigo),
    estado: fila.estado,
    estadoEtiqueta: ETIQUETA_ESTADO[fila.estado],
    awaitingConfirmation: fila.awaitingConfirmation,

    duenoId: fila.duenoId,
    cuidadorId: fila.cuidadorId,

    mascotas,
    mascotasEtiqueta: unirNombres(mascotas.map((m) => m.nombre)),
    mascotasConteoEtiqueta: plural(mascotas.length, 'mascota', 'mascotas'),

    direccion: fila.direccion,
    zona: fila.zona,
    lat: fila.lat,
    lng: fila.lng,

    fechaEtiqueta: fechaHora(fila.fechaHora, ahora),
    fechaCortaEtiqueta: diaRelativo(fila.fechaHora, ahora),
    duracionEtiqueta: duracion(fila.duracionMin),
    duracionMin: fila.duracionMin,
    pagoEtiqueta: bolivianos(fila.pagoBs),
    pagoBs: fila.pagoBs,

    notas: fila.notas,
    fotoUrl: mascotas[0]?.fotoUrl ?? null,

    // Con varias mascotas el recuento dice más que la raza de una sola de ellas.
    heroeMetaEtiqueta:
      mascotas.length > 1
        ? `${plural(mascotas.length, 'mascota', 'mascotas')} · ${fila.zona}`
        : `${mascotas[0]?.raza ?? 'Mascota'} · ${fila.zona}`,

    ...(metros != null
      ? {
          distanciaEtiqueta: distancia(metros),
          distanciaLargaEtiqueta: distanciaLarga(metros),
        }
      : {}),

    interesadosConteo: interesados,
    interesadosEtiqueta: plural(
      interesados,
      'cuidador interesado',
      'cuidadores interesados',
    ),

    hitos: construirHitos(
      fila.estado,
      fila.awaitingConfirmation,
      fila.eventos ?? [],
      ahora,
    ),
  };
}

export type SolicitudSerializada = ReturnType<typeof serializarSolicitud>;

/** La hora suelta, para los sitios donde la app sólo muestra "17:35". */
export { hora };
