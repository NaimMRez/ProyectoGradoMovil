import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL_BASE } from './config';
import {
  ErrorApi,
  type Conversacion,
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
} from './tipos';
import type { Punto } from '../utiles/geo';

/**
 * Cliente HTTP contra el backend real.
 *
 * Implementa exactamente la misma superficie que `mock/adaptador.ts`, así que
 * `client.ts` puede intercambiar uno por otro sin que ninguna pantalla se
 * entere.
 *
 * Las etiquetas ya vienen formateadas del servidor, de modo que este archivo no
 * transforma nada: sólo mueve JSON y traduce errores a la forma que la interfaz
 * sabe pintar.
 */

const CLAVE_TOKEN = 'petgo:token';

let token: string | null = null;

/** Recupera el token guardado. Lo llama el proveedor de sesión al arrancar. */
export async function cargarToken(): Promise<string | null> {
  if (token) return token;
  token = await AsyncStorage.getItem(CLAVE_TOKEN);
  return token;
}

async function guardarToken(nuevo: string): Promise<void> {
  token = nuevo;
  await AsyncStorage.setItem(CLAVE_TOKEN, nuevo);
}

export async function olvidarToken(): Promise<void> {
  token = null;
  await AsyncStorage.removeItem(CLAVE_TOKEN);
}

type RespuestaError = { mensaje?: string; clave?: ErrorApi['clave'] };

/**
 * Una petición a la API.
 *
 * Todo error se convierte en `ErrorApi` con una `clave` que la app ya sabe
 * pintar: así ninguna pantalla tiene que interpretar códigos HTTP para decidir
 * qué mensaje mostrar.
 */
async function pedir<T>(
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  ruta: string,
  cuerpo?: unknown,
): Promise<T> {
  const autenticacion = await cargarToken();

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(autenticacion ? { Authorization: `Bearer ${autenticacion}` } : {}),
      },
      ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
    });
  } catch {
    // `fetch` sólo rechaza cuando la petición no llegó a salir: sin datos, wifi
    // caído, servidor inalcanzable. Un 500 no pasa por aquí.
    throw new ErrorApi('No pudimos comunicarnos con PetGo', 'red');
  }

  const texto = await respuesta.text();
  const datos = texto ? (JSON.parse(texto) as unknown) : null;

  if (!respuesta.ok) {
    const error = (datos ?? {}) as RespuestaError;
    throw new ErrorApi(
      error.mensaje ?? 'Algo salió mal',
      error.clave ?? 'servidor',
      respuesta.status,
    );
  }

  return datos as T;
}

/** Las mutaciones devuelven el dato y el texto del toast, ya redactado. */
type Sobre<T> = { datos: T; toast: string };

// ── Sesión ──────────────────────────────────────────────────────────────────

export async function iniciarSesion(correo: string, clave: string): Promise<Usuario> {
  const { usuario, token: nuevo } = await pedir<{ usuario: Usuario; token: string }>(
    'POST',
    '/auth/login',
    { correo, clave },
  );
  await guardarToken(nuevo);
  return usuario;
}

export async function registrar(datos: {
  nombre: string;
  correo: string;
  telefono: string;
  rol: Rol;
  clave?: string;
}): Promise<Usuario> {
  const { usuario, token: nuevo } = await pedir<{ usuario: Usuario; token: string }>(
    'POST',
    '/auth/register',
    datos,
  );
  await guardarToken(nuevo);
  return usuario;
}

// ── Mascotas ────────────────────────────────────────────────────────────────

export function listarMascotas(_duenoId: string): Promise<Mascota[]> {
  // El servidor saca el dueño del token; el id que pasa la app se ignora, pero
  // se conserva en la firma para que ésta y la del mock sean intercambiables.
  return pedir<Mascota[]>('GET', '/pets');
}

export function crearMascota(
  _duenoId: string,
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
  return pedir<Sobre<Mascota>>('POST', '/pets', datos).then((r) => ({
    mascota: r.datos,
    toast: r.toast,
  }));
}

// ── Solicitudes ─────────────────────────────────────────────────────────────

export function listarSolicitudes(
  _usuarioId: string,
  _rol: Rol,
  chipEstado = 'Todas',
): Promise<Solicitud[]> {
  return pedir<Solicitud[]>('GET', `/requests?estado=${encodeURIComponent(chipEstado)}`);
}

export function solicitudesActivas(_duenoId: string): Promise<Solicitud[]> {
  return pedir<Solicitud[]>('GET', '/requests/activas');
}

/**
 * La consulta geoespacial.
 *
 * **Los chips viajan tal cual.** `"5 km"`, `"Bs 40+"` y `"Esta semana"` se
 * mandan como los ve el usuario y los traduce el servidor: cambiar lo que
 * significa un chip no obliga a publicar una versión nueva de la app.
 */
export function solicitudesCercanas(
  _cuidadorId: string,
  filtros: Filtros,
  punto: Punto | null = null,
): Promise<Solicitud[]> {
  if (!punto) {
    // El servidor no inventa una posición, y con razón: un cuidador de La Paz
    // no debe ver paseos de Cochabamba.
    throw new ErrorApi('Necesitamos tu ubicación para buscar paseos cerca', 'ubicacion');
  }

  const parametros = new URLSearchParams({
    lat: String(punto.lat),
    lng: String(punto.lng),
    distancia: filtros.distancia,
    pago: filtros.pago,
    duracion: filtros.duracion,
    fecha: filtros.fecha,
    mascotas: filtros.mascotas,
  });

  return pedir<Solicitud[]>('GET', `/requests/cercanas?${parametros.toString()}`);
}

export function obtenerSolicitud(id: string, _rol: Rol): Promise<Solicitud> {
  return pedir<Solicitud>('GET', `/requests/${id}`);
}

export function crearSolicitud(
  _duenoId: string,
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
  return pedir<Sobre<Solicitud>>('POST', '/requests', {
    ...datos,
    fechaHora: datos.fechaHora.toISOString(),
  }).then((r) => ({ solicitud: r.datos, toast: r.toast }));
}

// ── Intereses ───────────────────────────────────────────────────────────────

export function listarInteresados(solicitudId: string): Promise<Interesado[]> {
  return pedir<Interesado[]>('GET', `/requests/${solicitudId}/interests`);
}

export function manifestarInteres(
  solicitudId: string,
  _cuidadorId: string,
  mensaje = 'Estoy disponible para este paseo.',
  punto: Punto | null = null,
): Promise<{ toast: string }> {
  return pedir<Sobre<null>>('POST', `/requests/${solicitudId}/interest`, {
    mensaje,
    ...(punto ? { lat: punto.lat, lng: punto.lng } : {}),
  }).then((r) => ({ toast: r.toast }));
}

export function aceptarInteresado(
  solicitudId: string,
  interesId: string,
): Promise<{ solicitud: Solicitud; toast: string }> {
  return pedir<Sobre<Solicitud>>(
    'POST',
    `/requests/${solicitudId}/interests/${interesId}/accept`,
  ).then((r) => ({ solicitud: r.datos, toast: r.toast }));
}

// ── Transiciones de estado ──────────────────────────────────────────────────

export function avanzarEstado(
  solicitudId: string,
): Promise<{ solicitud: Solicitud; toast: string }> {
  return pedir<Sobre<Solicitud>>('POST', `/requests/${solicitudId}/advance`).then((r) => ({
    solicitud: r.datos,
    toast: r.toast,
  }));
}

/** El único camino a `finalizada`, y sólo el dueño puede recorrerlo. */
export function confirmarFinalizacion(
  solicitudId: string,
): Promise<{ solicitud: Solicitud; toast: string }> {
  return pedir<Sobre<Solicitud>>('POST', `/requests/${solicitudId}/confirm`).then((r) => ({
    solicitud: r.datos,
    toast: r.toast,
  }));
}

export function cancelarSolicitud(
  solicitudId: string,
): Promise<{ solicitud: Solicitud; toast: string }> {
  return pedir<Sobre<Solicitud>>('POST', `/requests/${solicitudId}/cancel`).then((r) => ({
    solicitud: r.datos,
    toast: r.toast,
  }));
}

// ── Notificaciones ──────────────────────────────────────────────────────────

export function listarNotificaciones(): Promise<Notificacion[]> {
  return pedir<Notificacion[]>('GET', '/notifications');
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  await pedir<Sobre<null>>('POST', `/notifications/${id}/read`);
}

export async function vaciarNotificaciones(): Promise<void> {
  await pedir<Sobre<null>>('DELETE', '/notifications');
}

export function contarNoLeidas(): Promise<number> {
  return pedir<{ cuenta: number }>('GET', '/notifications/unread-count').then(
    (r) => r.cuenta,
  );
}

// ── Chat ────────────────────────────────────────────────────────────────────

export function listarConversaciones(
  _usuarioId: string,
  _rol: Rol,
): Promise<Conversacion[]> {
  return pedir<Conversacion[]>('GET', '/conversations');
}

export function obtenerConversacion(
  solicitudId: string,
  _usuarioId: string,
  _rol: Rol,
): Promise<Conversacion> {
  return pedir<Conversacion>('GET', `/conversations/${solicitudId}`);
}

export function obtenerMensajes(solicitudId: string): Promise<Mensaje[]> {
  return pedir<Mensaje[]>('GET', `/conversations/${solicitudId}/messages`);
}

export function enviarMensaje(
  solicitudId: string,
  _autorId: string,
  texto: string,
): Promise<Mensaje> {
  return pedir<Mensaje>('POST', `/conversations/${solicitudId}/messages`, { texto });
}

// ── Utilidades ──────────────────────────────────────────────────────────────

/** "Filtros aplicados · 4 solicitudes". */
export function toastFiltros(cuantas: number): string {
  const palabra = cuantas === 1 ? 'solicitud' : 'solicitudes';
  return `Filtros aplicados · ${cuantas} ${palabra}`;
}
