import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api } from './client';
import { useSesion, useUsuario } from '../estado/sesion';
import { useToast } from '../estado/toast';
import { ErrorApi, type Filtros, type Rol, type Sexo, type Tamano } from './tipos';
import type { Punto } from '../utiles/geo';
import { HAY_TIEMPO_REAL_REMOTO, tiempoReal } from './tiempoReal';

/**
 * Acceso a datos del servidor.
 *
 * Cada mutación que el backend acompaña de un texto de toast lo lanza aquí
 * mismo: así ninguna pantalla tiene que acordarse de hacerlo, y el texto sale
 * siempre del servidor en vez de duplicarse en el cliente.
 */

export const claves = {
  mascotas: (duenoId: string) => ['mascotas', duenoId] as const,
  solicitudes: (usuarioId: string, rol: Rol, chip: string) =>
    ['solicitudes', usuarioId, rol, chip] as const,
  activas: (duenoId: string) => ['solicitudes', 'activas', duenoId] as const,
  cercanas: (cuidadorId: string, filtros: Filtros) =>
    ['solicitudes', 'cercanas', cuidadorId, filtros] as const,
  solicitud: (id: string) => ['solicitud', id] as const,
  interesados: (solicitudId: string) => ['interesados', solicitudId] as const,
  notificaciones: () => ['notificaciones'] as const,
  noLeidas: () => ['notificaciones', 'noLeidas'] as const,
  conversaciones: (usuarioId: string) => ['conversaciones', usuarioId] as const,
  conversacion: (solicitudId: string) => ['conversacion', solicitudId] as const,
  mensajes: (solicitudId: string) => ['mensajes', solicitudId] as const,
};

/**
 * Invalida todo lo que puede haber cambiado tras tocar una solicitud. Es
 * deliberadamente amplio: una transición de estado mueve la lista, el detalle,
 * la bandeja de notificaciones y el contador de la campana a la vez, y afinar
 * más sólo produce pantallas que se quedan atrás.
 */
function useInvalidarSolicitud() {
  const cliente = useQueryClient();
  return (solicitudId?: string) => {
    void cliente.invalidateQueries({ queryKey: ['solicitudes'] });
    void cliente.invalidateQueries({ queryKey: ['notificaciones'] });
    if (solicitudId) {
      void cliente.invalidateQueries({ queryKey: claves.solicitud(solicitudId) });
      void cliente.invalidateQueries({ queryKey: claves.interesados(solicitudId) });
    }
  };
}

// ── Mascotas ────────────────────────────────────────────────────────────────

export function useMascotas() {
  const usuario = useUsuario();
  return useQuery({
    queryKey: claves.mascotas(usuario.id),
    queryFn: () => api.listarMascotas(usuario.id),
  });
}

export function useCrearMascota() {
  const usuario = useUsuario();
  const cliente = useQueryClient();
  const { mostrar } = useToast();

  return useMutation({
    mutationFn: (datos: {
      nombre: string;
      raza: string;
      edad: string;
      sexo: Sexo;
      tamano: Tamano;
      peso: string;
      notas: string;
      fotoUrl?: string | null;
    }) => api.crearMascota(usuario.id, datos),
    onSuccess: ({ toast }) => {
      void cliente.invalidateQueries({ queryKey: claves.mascotas(usuario.id) });
      mostrar(toast);
    },
    onError: (error) => {
      mostrar(error instanceof ErrorApi ? error.message : 'No pudimos guardar la mascota', {
        tono: 'aviso',
      });
    },
  });
}

// ── Solicitudes ─────────────────────────────────────────────────────────────

export function useSolicitudes(chipEstado: string) {
  const usuario = useUsuario();
  return useQuery({
    queryKey: claves.solicitudes(usuario.id, usuario.rol, chipEstado),
    queryFn: () => api.listarSolicitudes(usuario.id, usuario.rol, chipEstado),
  });
}

export function useSolicitudesActivas() {
  const usuario = useUsuario();
  return useQuery({
    queryKey: claves.activas(usuario.id),
    queryFn: () => api.solicitudesActivas(usuario.id),
  });
}

/**
 * Solicitudes cerca del cuidador. **Es la consulta geoespacial.**
 *
 * El punto entra en la clave de caché redondeado a tres decimales — unos 100 m.
 * Sin redondear, cada micro-deriva del GPS produce una clave nueva y la
 * consulta se relanza sola cada pocos segundos aunque el cuidador esté quieto.
 */
export function useSolicitudesCercanas(filtros: Filtros, punto: Punto | null) {
  const usuario = useUsuario();
  const puntoRedondeado = punto
    ? { lat: Number(punto.lat.toFixed(3)), lng: Number(punto.lng.toFixed(3)) }
    : null;

  return useQuery({
    queryKey: [...claves.cercanas(usuario.id, filtros), puntoRedondeado],
    queryFn: () => api.solicitudesCercanas(usuario.id, filtros, punto),
    // Los filtros cambian de golpe al aplicar el sheet: conservar el resultado
    // anterior mientras llega el nuevo evita que la lista parpadee a vacío.
    placeholderData: (anterior) => anterior,
  });
}

export function useSolicitud(id: string | undefined, opciones?: { enabled?: boolean }) {
  const usuario = useUsuario();
  return useQuery({
    queryKey: claves.solicitud(id ?? ''),
    queryFn: () => api.obtenerSolicitud(id!, usuario.rol),
    enabled: Boolean(id) && (opciones?.enabled ?? true),
  });
}

export function useCrearSolicitud() {
  const usuario = useUsuario();
  const invalidar = useInvalidarSolicitud();
  const { mostrar } = useToast();

  return useMutation({
    mutationFn: (datos: Parameters<typeof api.crearSolicitud>[1]) =>
      api.crearSolicitud(usuario.id, datos),
    onSuccess: ({ toast }) => {
      invalidar();
      mostrar(toast);
    },
    onError: (error) => {
      mostrar(error instanceof ErrorApi ? error.message : 'No pudimos publicar la solicitud', {
        tono: 'aviso',
      });
    },
  });
}

// ── Intereses ───────────────────────────────────────────────────────────────

export function useInteresados(solicitudId: string | undefined) {
  return useQuery({
    queryKey: claves.interesados(solicitudId ?? ''),
    queryFn: () => api.listarInteresados(solicitudId!),
    enabled: Boolean(solicitudId),
  });
}

export function useManifestarInteres() {
  const usuario = useUsuario();
  const invalidar = useInvalidarSolicitud();
  const { mostrar } = useToast();

  return useMutation({
    mutationFn: (solicitudId: string) => api.manifestarInteres(solicitudId, usuario.id),
    onSuccess: ({ toast }, solicitudId) => {
      invalidar(solicitudId);
      mostrar(toast);
    },
    onError: (error) => {
      mostrar(
        error instanceof ErrorApi ? error.message : 'No pudimos enviar tu interés',
        { tono: error instanceof ErrorApi && error.clave === 'yaTomada' ? 'error' : 'aviso' },
      );
    },
  });
}

export function useAceptarInteresado() {
  const invalidar = useInvalidarSolicitud();
  const { mostrar } = useToast();

  return useMutation({
    mutationFn: ({ solicitudId, interesId }: { solicitudId: string; interesId: string }) =>
      api.aceptarInteresado(solicitudId, interesId),
    onSuccess: ({ toast }, { solicitudId }) => {
      invalidar(solicitudId);
      mostrar(toast);
    },
    onError: (error) => {
      mostrar(error instanceof ErrorApi ? error.message : 'No pudimos aceptar al cuidador', {
        tono: 'error',
      });
    },
  });
}

// ── Transiciones de estado ──────────────────────────────────────────────────

export function useAvanzarEstado() {
  const invalidar = useInvalidarSolicitud();
  const { mostrar } = useToast();

  return useMutation({
    mutationFn: (solicitudId: string) => api.avanzarEstado(solicitudId),
    onSuccess: ({ toast }, solicitudId) => {
      invalidar(solicitudId);
      mostrar(toast);
    },
    onError: (error) => {
      mostrar(error instanceof ErrorApi ? error.message : 'No pudimos actualizar el estado', {
        tono: 'aviso',
      });
    },
  });
}

/** El único camino a `finalizada`, y sólo el dueño puede recorrerlo. */
export function useConfirmarFinalizacion() {
  const invalidar = useInvalidarSolicitud();
  const { mostrar } = useToast();

  return useMutation({
    mutationFn: (solicitudId: string) => api.confirmarFinalizacion(solicitudId),
    onSuccess: ({ toast }, solicitudId) => {
      invalidar(solicitudId);
      mostrar(toast);
    },
    onError: (error) => {
      mostrar(error instanceof ErrorApi ? error.message : 'No pudimos cerrar el servicio', {
        tono: 'aviso',
      });
    },
  });
}

export function useCancelarSolicitud() {
  const invalidar = useInvalidarSolicitud();
  const { mostrar } = useToast();

  return useMutation({
    mutationFn: (solicitudId: string) => api.cancelarSolicitud(solicitudId),
    onSuccess: ({ toast }, solicitudId) => {
      invalidar(solicitudId);
      mostrar(toast);
    },
    onError: (error) => {
      mostrar(error instanceof ErrorApi ? error.message : 'No pudimos cancelar el servicio', {
        tono: 'aviso',
      });
    },
  });
}

// ── Notificaciones ──────────────────────────────────────────────────────────

export function useNotificaciones() {
  return useQuery({
    queryKey: claves.notificaciones(),
    queryFn: () => api.listarNotificaciones(),
  });
}

export function useNoLeidas() {
  const { usuario } = useSesion();
  return useQuery({
    queryKey: claves.noLeidas(),
    queryFn: () => api.contarNoLeidas(),
    enabled: Boolean(usuario),
  });
}

export function useVaciarNotificaciones() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: () => api.vaciarNotificaciones(),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}

// ── Chat ────────────────────────────────────────────────────────────────────

export function useConversaciones() {
  const usuario = useUsuario();
  return useQuery({
    queryKey: claves.conversaciones(usuario.id),
    queryFn: () => api.listarConversaciones(usuario.id, usuario.rol),
  });
}

export function useConversacion(solicitudId: string | undefined) {
  const usuario = useUsuario();
  return useQuery({
    queryKey: claves.conversacion(solicitudId ?? ''),
    queryFn: () => api.obtenerConversacion(solicitudId!, usuario.id, usuario.rol),
    enabled: Boolean(solicitudId),
  });
}

export function useMensajes(solicitudId: string | undefined) {
  useSuscripcionTiempoReal(solicitudId);

  return useQuery({
    queryKey: claves.mensajes(solicitudId ?? ''),
    queryFn: () => api.obtenerMensajes(solicitudId!),
    enabled: Boolean(solicitudId),
    // Con el socket conectado, el servidor empuja y no hace falta sondear. Sin
    // él, el transporte local sólo ve lo que hace este mismo dispositivo, así
    // que se deja un refresco lento de red de seguridad.
    refetchInterval: HAY_TIEMPO_REAL_REMOTO ? false : 8000,
  });
}

/**
 * Invalida lo que corresponda cuando llega un evento de tiempo real.
 *
 * Se suscribe una vez por pantalla de chat y filtra por solicitud: sin el
 * filtro, un mensaje de otra conversación recargaría ésta sin motivo.
 */
function useSuscripcionTiempoReal(solicitudId: string | undefined) {
  const cliente = useQueryClient();

  useEffect(() => {
    if (!solicitudId) return;

    return tiempoReal.suscribir((evento) => {
      if (evento.tipo === 'mensaje' && evento.solicitudId === solicitudId) {
        void cliente.invalidateQueries({ queryKey: claves.mensajes(solicitudId) });
        void cliente.invalidateQueries({ queryKey: ['conversaciones'] });
      }
      if (evento.tipo === 'notificacion') {
        void cliente.invalidateQueries({ queryKey: ['notificaciones'] });
      }
      if (evento.tipo === 'solicitud') {
        void cliente.invalidateQueries({ queryKey: ['solicitudes'] });
        void cliente.invalidateQueries({ queryKey: claves.solicitud(evento.solicitudId) });
      }
    });
  }, [cliente, solicitudId]);
}

export function useEnviarMensaje(solicitudId: string) {
  const usuario = useUsuario();
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (texto: string) => api.enviarMensaje(solicitudId, usuario.id, texto),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: claves.mensajes(solicitudId) });
      void cliente.invalidateQueries({ queryKey: ['conversaciones'] });
    },
  });
}

export type { UseQueryOptions };
