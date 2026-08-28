import { USAR_MOCK } from './config';
import * as mock from './mock/adaptador';
import * as http from './http';

/**
 * Cliente de la API.
 *
 * Un único punto de conmutación entre el adaptador mock y el backend real.
 * Ninguna pantalla importa `mock/` ni `http` directamente: todas pasan por
 * aquí, así que cambiar `USAR_MOCK` en `config.ts` no toca ni una línea de
 * interfaz.
 *
 * Las dos implementaciones exponen la misma superficie a propósito. TypeScript
 * lo comprueba: si una se desvía de la otra, la asignación de abajo deja de
 * compilar, que es exactamente cuando conviene enterarse — y no en el
 * dispositivo, con la app ya apuntando al servidor.
 */

/** Lo que cualquier implementación tiene que ofrecer. */
export type Api = typeof mock;

const implementacion: Api = USAR_MOCK ? mock : (http satisfies Api);

export const api = implementacion;

export { USAR_MOCK, URL_BASE } from './config';
export { ErrorApi } from './tipos';
export { olvidarToken } from './http';
