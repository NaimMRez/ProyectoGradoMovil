import Constants from 'expo-constants';

/**
 * Configuración del acceso a datos.
 *
 * Vive en su propio archivo, sin importar nada del resto de la app, a
 * propósito: `client.ts` carga el adaptador mock, el adaptador emite eventos a
 * `tiempoReal.ts`, y `tiempoReal.ts` necesita saber si estamos en modo mock. Si
 * estas constantes estuvieran en `client.ts`, ese triángulo sería un ciclo de
 * módulos, y el síntoma no sería un error de compilación sino un
 * `ReferenceError` en el arranque de la app.
 */

/**
 * `false` apunta la app al backend real. Ninguna pantalla se entera.
 *
 * Con `true` la app corre entera contra el adaptador en memoria: sin Postgres,
 * sin servidor y sin red, y **sin guardar nada** — lo que se publica vive
 * hasta la siguiente recarga del bundle.
 *
 * En `false` hacen falta tres cosas encendidas: Postgres, `npm run dev` en el
 * backend, y el teléfono en la misma red wifi que el Mac. Si alguna falla, la
 * app no se rompe: las pantallas caen a su estado de error con reintento.
 */
export const USAR_MOCK = false;

/** Puerto en el que escucha el backend. Tiene que coincidir con su `.env`. */
const PUERTO_API = 4000;

/**
 * Deduce la IP del Mac a partir de la del servidor de Expo.
 *
 * En un teléfono, `localhost` es el propio teléfono: apuntar ahí no llega a
 * ninguna parte. Hace falta la IP del Mac en la red local, y esa IP cambia
 * — al reiniciar el router, al pasar de wifi a cable, al cambiar de red.
 *
 * Escribirla a mano significa recordar actualizarla cada vez, y descubrir que
 * no lo hiciste cuando la app se queda cargando sin decir por qué. Metro ya
 * conoce la IP correcta, porque el teléfono acaba de conectarse a ella para
 * bajar el bundle: `hostUri` la trae con la forma `"192.168.0.106:8081"`.
 */
function deducirUrlBase(): string {
  const anfitrion = Constants.expoConfig?.hostUri?.split(':')[0];

  // Sin `hostUri` — una build de producción, por ejemplo — no hay nada que
  // deducir y toca la dirección del servidor de verdad.
  if (!anfitrion) return `http://localhost:${PUERTO_API}/api`;

  return `http://${anfitrion}:${PUERTO_API}/api`;
}

/**
 * URL del backend.
 *
 * En desarrollo se deduce sola. Para un servidor desplegado, se sustituye por
 * la dirección fija: `export const URL_BASE = 'https://api.petgo.bo/api';`
 */
export const URL_BASE = deducirUrlBase();
