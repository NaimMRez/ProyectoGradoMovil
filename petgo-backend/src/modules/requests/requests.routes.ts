import { Router } from 'express';
import { asincrono } from '../../lib/errores.js';
import { exigirSesion, sesionDe } from '../../middleware/auth.js';
import { consultaDe, paramDe, validar } from '../../middleware/validar.js';
import {
  crearSolicitudSchema,
  filtrosCercanasSchema,
  idSolicitudSchema,
  listaSolicitudesSchema,
  type CrearSolicitud,
  type FiltroLista,
  type FiltrosCercanas,
} from './requests.schemas.js';
import * as servicio from './requests.service.js';

/**
 * Rutas de solicitudes.
 *
 * Todas exigen sesión. La autorización fina — quién puede avanzar, quién puede
 * cerrar — no está aquí: la resuelve `domain/status.ts` contra la fila, porque
 * depende de si el usuario es el dueño o el cuidador *de esa solicitud*, no de
 * su rol en abstracto.
 */
export const rutasSolicitudes = Router();

rutasSolicitudes.use(exigirSesion);

/** Mis solicitudes (dueño) o mis servicios (cuidador), filtrables por estado. */
rutasSolicitudes.get(
  '/',
  validar(listaSolicitudesSchema, 'query'),
  asincrono(async (req, res) => {
    const { usuarioId, rol } = sesionDe(req);
    const { estado } = consultaDe<FiltroLista>(req);
    res.json(await servicio.listarDelUsuario(usuarioId, rol, estado));
  }),
);

/** Las que siguen vivas, para el inicio del dueño. */
rutasSolicitudes.get(
  '/activas',
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    res.json(await servicio.activasDelDueno(usuarioId));
  }),
);

/**
 * Solicitudes cerca del cuidador. La consulta geoespacial.
 *
 * Va antes que `/:id` a propósito: si estuviera después, Express tomaría
 * "cercanas" como un id y devolvería un 400 de validación.
 */
rutasSolicitudes.get(
  '/cercanas',
  validar(filtrosCercanasSchema, 'query'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    const filtros = consultaDe<FiltrosCercanas>(req);
    res.json(await servicio.cercanas(usuarioId, filtros));
  }),
);

rutasSolicitudes.post(
  '/',
  validar(crearSolicitudSchema),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    const resultado = await servicio.crear(usuarioId, req.body as CrearSolicitud);
    res.status(201).json(resultado);
  }),
);

rutasSolicitudes.get(
  '/:id',
  validar(idSolicitudSchema, 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    res.json(await servicio.obtener(paramDe(req, 'id'), usuarioId));
  }),
);

/** El cuidador avanza el estado, o marca el fin del paseo si está en `proceso`. */
rutasSolicitudes.post(
  '/:id/advance',
  validar(idSolicitudSchema, 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    res.json(await servicio.avanzarEstado(paramDe(req, 'id'), usuarioId));
  }),
);

/** El único camino a `finalizada`, y sólo el dueño puede recorrerlo. */
rutasSolicitudes.post(
  '/:id/confirm',
  validar(idSolicitudSchema, 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    res.json(await servicio.confirmarFinalizacion(paramDe(req, 'id'), usuarioId));
  }),
);

rutasSolicitudes.post(
  '/:id/cancel',
  validar(idSolicitudSchema, 'params'),
  asincrono(async (req, res) => {
    const { usuarioId } = sesionDe(req);
    res.json(await servicio.cancelar(paramDe(req, 'id'), usuarioId));
  }),
);
