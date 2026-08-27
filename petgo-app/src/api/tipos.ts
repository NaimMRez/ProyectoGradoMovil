import type { EstadoServicio, TipoNotificacion } from '../theme/colors';
import type { NombreIcono } from '../components/Icono';

export type { EstadoServicio, TipoNotificacion };

/**
 * Contrato con el backend.
 *
 * La regla que gobierna estos tipos: **el backend devuelve las etiquetas ya
 * formateadas**. `"Bs 45"`, `"Hoy · 17:30"`, `"Rocco y Luna"`, `"a 600 m del
 * punto de recogida"`. La app pinta, no formatea.
 *
 * No es purismo. Las fechas se calculan en zona horaria de Bolivia
 * (`America/La_Paz`, UTC-4 fijo), no en la del teléfono: si el cliente
 * construyera `"Hoy · 17:30"` a partir de un ISO, un usuario con el reloj mal
 * puesto o de viaje vería un día distinto al que el dueño escribió. Y la
 * pluralización en español ("1 mascota" / "2 mascotas", "1 solicitud" /
 * "3 solicitudes") acabaría duplicada en cada pantalla.
 *
 * Si hace falta una etiqueta nueva, se añade al serializador del backend, no
 * se construye aquí.
 */

export type Rol = 'dueno' | 'cuidador';

export type Usuario = {
  id: string;
  nombre: string;
  /** Primer nombre, para los toasts: "Aceptaste a Diego". */
  primerNombre: string;
  correo: string;
  telefono: string;
  rol: Rol;
  zona: string;
  fotoUrl: string | null;
  /** Sólo cuidadores. No hay calificaciones: sólo el contador de paseos. */
  paseosCompletados: number | null;
  /** "Cuidador · 34 paseos" · "Dueña de mascota". */
  metaEtiqueta: string;
  /** "Dueño de mascota" / "Cuidador / paseador", para el chip del perfil. */
  rolEtiqueta: string;
};

export type Sexo = 'Macho' | 'Hembra';
export type Tamano = 'Pequeño' | 'Mediano' | 'Grande';

export type Mascota = {
  id: string;
  duenoId: string;
  nombre: string;
  raza: string;
  edad: string;
  sexo: Sexo;
  tamano: Tamano;
  peso: string;
  notas: string;
  fotoUrl: string | null;
  /** "Border collie · 3 años". */
  resumenEtiqueta: string;
};

/** Una entrada del timeline de seguimiento. */
export type Hito = {
  clave: string;
  etiqueta: string;
  icono: NombreIcono;
  fase: 'completado' | 'actual' | 'pendiente';
  /** "17:32" · "Pendiente" · "Esperando confirmación del dueño". */
  detalle: string;
};

export type Solicitud = {
  id: string;
  /** "#1042". */
  codigo: string;
  estado: EstadoServicio;
  /** "En proceso". */
  estadoEtiqueta: string;
  /**
   * El cuidador marcó el fin del paseo y falta que el dueño cierre el
   * servicio. Mientras esté activa, el cuidador no puede avanzar más.
   */
  awaitingConfirmation: boolean;

  duenoId: string;
  cuidadorId: string | null;

  /** Una solicitud lleva varias mascotas: tabla puente `request_pets`. */
  mascotas: Mascota[];
  /** "Rocco y Luna" — unidos por " y ". */
  mascotasEtiqueta: string;
  /** "2 mascotas" / "1 mascota". */
  mascotasConteoEtiqueta: string;

  direccion: string;
  zona: string;
  lat: number;
  lng: number;

  /** "Hoy · 17:30". */
  fechaEtiqueta: string;
  /** "Hoy" — versión corta para tarjetas densas. */
  fechaCortaEtiqueta: string;
  /** "60 min". */
  duracionEtiqueta: string;
  duracionMin: number;
  /** "Bs 45". `pagoBs` sólo se usa para filtrar; no se pinta nunca. */
  pagoEtiqueta: string;
  pagoBs: number;

  notas: string;
  fotoUrl: string | null;

  /** "2 mascotas · Sarco" con varias, "Border collie · Sarco" con una. */
  heroeMetaEtiqueta: string;

  /** Sólo presentes en el feed del cuidador (consulta geoespacial). */
  distanciaEtiqueta?: string;
  /** "a 600 m del punto de recogida". */
  distanciaLargaEtiqueta?: string;

  interesadosConteo: number;
  /** "3 cuidadores interesados" / "1 cuidador interesado". */
  interesadosEtiqueta: string;

  hitos: Hito[];
};

export type Interesado = {
  id: string;
  cuidador: Usuario;
  mensaje: string;
  /** "a 600 m del punto de recogida". */
  distanciaEtiqueta: string;
};

export type Notificacion = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  /** "Hace 5 min" · "Ayer · 19:04" · "Dom · 08:12". */
  horaEtiqueta: string;
  leida: boolean;
  solicitudId: string | null;
  /** "Ver interesados" · "Confirmar". Ausente si el tipo no lleva acción. */
  accionEtiqueta?: string;
};

export type Mensaje = {
  id: string;
  solicitudId: string;
  autorId: string;
  texto: string;
  /** "17:35" · "Ahora". */
  horaEtiqueta: string;
};

/**
 * Una conversación **es una solicitud con cuidador asignado más sus mensajes**.
 * No hay tabla `conversations`: el hilo se ancla a la solicitud, no a un par de
 * usuarios. Dos personas que coinciden en dos paseos tienen dos hilos, y la
 * cabecera del chat siempre muestra de qué solicitud se está hablando.
 */
export type Conversacion = {
  /** El id de la solicitud. */
  id: string;
  contraparte: Usuario;
  solicitud: Pick<
    Solicitud,
    'id' | 'codigo' | 'mascotasEtiqueta' | 'fechaEtiqueta' | 'duracionEtiqueta' | 'pagoEtiqueta' | 'fotoUrl'
  >;
  /** Último mensaje, truncado por la app con elipsis. */
  ultimoMensaje: string;
  /** "17:35" · "Ayer". */
  horaEtiqueta: string;
  noLeidos: number;
  /** "Solicitud #1042 · Rocco y Luna". */
  vinculoEtiqueta: string;
};

/** Filtros del cuidador. Viajan al backend; no se aplican en el cliente. */
export type Filtros = {
  /** "1 km" | "3 km" | "5 km" | "10 km" → metros en el backend. */
  distancia: string;
  /** "Cualquiera" | "Bs 30+" | "Bs 40+" | "Bs 60+". */
  pago: string;
  /** "Todas" | "30 min" | "60 min" | "90 min". */
  duracion: string;
  /** "Cualquiera" | "Hoy" | "Esta semana". */
  fecha: string;
  /** "Cualquiera" | "1" | "2 o más". */
  mascotas: string;
};

export const FILTROS_POR_DEFECTO: Filtros = {
  distancia: '5 km',
  pago: 'Cualquiera',
  duracion: 'Todas',
  fecha: 'Cualquiera',
  mascotas: 'Cualquiera',
};

export const OPCIONES_FILTRO = {
  distancia: ['1 km', '3 km', '5 km', '10 km'],
  pago: ['Cualquiera', 'Bs 30+', 'Bs 40+', 'Bs 60+'],
  duracion: ['Todas', '30 min', '60 min', '90 min'],
  fecha: ['Cualquiera', 'Hoy', 'Esta semana'],
  mascotas: ['Cualquiera', '1', '2 o más'],
} as const;

/** Chips de la lista de solicitudes. "Todas" no filtra. */
export const FILTROS_ESTADO = [
  'Todas',
  'Publicada',
  'Aceptada',
  'En proceso',
  'Finalizada',
] as const;

/** Respuesta de cualquier mutación que además deba mostrar un aviso. */
export type Resultado<T> = {
  datos: T;
  /** Texto del toast, ya redactado por el backend. */
  toast?: string;
};

/** Error de la API con la forma que la app sabe pintar. */
export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly clave: 'red' | 'ubicacion' | 'yaTomada' | 'servidor' | 'noEncontrada',
    readonly estado?: number,
  ) {
    super(message);
    this.name = 'ErrorApi';
  }
}
