/**
 * Configuración del acceso a datos.
 *
 * Vive en su propio archivo, sin importar nada, a propósito: `client.ts` carga
 * el adaptador mock, el adaptador emite eventos a `tiempoReal.ts`, y
 * `tiempoReal.ts` necesita saber si estamos en modo mock. Si estas constantes
 * estuvieran en `client.ts`, ese triángulo sería un ciclo de módulos, y el
 * síntoma no sería un error de compilación sino un `ReferenceError` en el
 * arranque de la app — de los que sólo aparecen en el dispositivo.
 */

/** `false` apunta la app al backend real. Ninguna pantalla se entera. */
export const USAR_MOCK = true;

/**
 * En un dispositivo físico, `localhost` es el propio teléfono. Hay que poner
 * la IP de la máquina en la red local — la que imprime `npx expo start`.
 */
export const URL_BASE = 'http://localhost:4000/api';
