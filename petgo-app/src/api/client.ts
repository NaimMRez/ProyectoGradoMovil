import * as mock from './mock/adaptador';

/**
 * Cliente de la API.
 *
 * Un único punto de conmutación entre el adaptador mock y el backend real.
 * Ninguna pantalla importa `mock/` directamente: todas pasan por aquí, así que
 * cambiar `USAR_MOCK` en `config.ts` y apuntar `URL_BASE` al servidor no toca
 * ni una línea de interfaz.
 */

export const api = mock;

export type Api = typeof mock;

export { USAR_MOCK, URL_BASE } from './config';
export { ErrorApi } from './tipos';
