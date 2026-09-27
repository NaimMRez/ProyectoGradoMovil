/**
 * Cuándo se puede agendar un paseo.
 *
 * Vive aparte del selector porque es la regla, no su interfaz: el mismo
 * cálculo decide qué días enseña la tira y qué se le manda al servidor, y
 * siendo funciones puras se puede comprobar en `pruebas/reglas.mts` sin
 * arrastrar React Native.
 */

/**
 * Hasta cuántos días por delante se puede agendar un paseo.
 *
 * Tiene que coincidir con `DIAS_MAXIMOS` del backend, que es quien manda: el
 * selector evita que el usuario llegue a elegir una fecha inválida, pero la
 * que decide si una solicitud se guarda es la validación del servidor.
 */
export const DIAS_MAXIMOS = 7;

const DIA_MS = 24 * 60 * 60 * 1000;

/** La ventana que admite el servidor, en milisegundos. */
export const VENTANA_MS = DIAS_MAXIMOS * DIA_MS;

/**
 * Cuántos días muestra la tira: hoy y los seis siguientes.
 *
 * El backend admite cualquier instante dentro de las próximas 168 horas, que
 * es una ventana móvil, no un número de días de calendario. Si la tira llegara
 * hasta hoy+7, la última columna sería válida sólo para las horas anteriores a
 * la actual — a las 18:00 se podría elegir ese día a las 17:00 pero no a las
 * 20:00 —, y el usuario no tiene forma de adivinar esa frontera.
 *
 * Con hoy+6 el día entero entra siempre en la ventana, sea la hora que sea: el
 * desfase máximo es de 6 días y 23:59. El cliente ofrece así un subconjunto
 * estricto de lo que el servidor acepta, que es la dirección correcta para que
 * las dos validaciones no puedan contradecirse.
 */
export const DIAS_VISIBLES = DIAS_MAXIMOS;

/** Medianoche del día al que pertenece una fecha. */
export function inicioDeDia(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Si dos fechas caen en el mismo día del calendario. */
export function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Los días elegibles, de hoy en adelante, a medianoche. */
export function diasElegibles(ahora = new Date()): Date[] {
  const hoy = inicioDeDia(ahora);
  return Array.from({ length: DIAS_VISIBLES }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    return d;
  });
}

/**
 * La próxima media hora en punto.
 *
 * Es el valor de arranque cuando no hay nada elegido, y no es arbitrario: al
 * caer siempre por delante del momento actual, el selector nunca se abre ya en
 * estado inválido. A las 18:29 propone 18:30; a las 18:31, las 19:00.
 */
export function proximaMediaHora(ahora = new Date()): Date {
  const d = new Date(ahora);
  d.setSeconds(0, 0);
  d.setMinutes(Math.floor(d.getMinutes() / 30) * 30 + 30);
  return d;
}

/** Une el día de uno con la hora del otro. */
export function combinar(dia: Date, momento: Date): Date {
  const d = new Date(dia);
  d.setHours(momento.getHours(), momento.getMinutes(), 0, 0);
  return d;
}

// ── Duración del paseo ──────────────────────────────────────────────────────

/**
 * De media hora a tres, en tramos de quince minutos.
 *
 * Los mismos tres números están en `requests.schemas.ts` del backend, que es
 * quien decide si una solicitud se guarda. Aquí sirven para dibujar la barra:
 * la app no puede producir un valor fuera de la rejilla, pero el servidor
 * tampoco se fía.
 *
 * El paso de quince y no de treinta es lo que conserva los 45 minutos, que ya
 * estaban entre las opciones viejas y son una duración real de paseo.
 */
export const DURACION_MIN = 30;
export const DURACION_MAX = 180;
export const DURACION_PASO = 15;

/** Los topes de la barra, de menor a mayor. Son once. */
export function topesDuracion(): number[] {
  const cuantos = (DURACION_MAX - DURACION_MIN) / DURACION_PASO + 1;
  return Array.from({ length: cuantos }, (_, i) => DURACION_MIN + i * DURACION_PASO);
}

/**
 * Lleva cualquier minuto al tope más cercano, dentro del rango.
 *
 * Es lo que convierte la posición del dedo en un valor: la barra no tiene
 * estados intermedios, así que el redondeo pasa antes de que el número exista,
 * no al soltar.
 */
export function ajustarDuracion(minutos: number): number {
  const acotado = Math.min(DURACION_MAX, Math.max(DURACION_MIN, minutos));
  const paso = Math.round((acotado - DURACION_MIN) / DURACION_PASO);
  return DURACION_MIN + paso * DURACION_PASO;
}

/** Un tramo de duraciones. `maximo` nulo es "sin techo". */
export type TramoDuracion = { minimo: number; maximo: number | null };

/**
 * `"1 a 2 h"` → el tramo de duraciones que caen dentro. `"Todas"` → sin filtro.
 *
 * El chip del cuidador era una igualdad exacta contra 30, 60 o 90 minutos, y
 * eso dejó de servir en cuanto el dueño pudo pedir cualquier múltiplo de
 * quince: seis de los once valores posibles no aparecerían bajo ningún chip.
 *
 * Los tres tramos **parten la rejilla**: cada duración cae en uno y sólo uno.
 * Sus bordes salen de `DURACION_PASO` y no de números escritos a mano, para que
 * cambiar el paso no abra un hueco entre dos tramos.
 *
 * El servidor hace esta misma traducción en `requests.schemas.ts`, porque es él
 * quien filtra de verdad. Ésta es la copia que usa el adaptador simulado, y las
 * dos tienen una comprobación que fija la partición: si una se mueve sin la
 * otra, el mock y la API devuelven listas distintas para el mismo filtro.
 */
export function tramoDuracion(chip: string): TramoDuracion | null {
  if (chip === 'Hasta 1 h') return { minimo: DURACION_MIN, maximo: 60 };
  if (chip === '1 a 2 h') return { minimo: 60 + DURACION_PASO, maximo: 120 };
  if (chip === 'Más de 2 h') return { minimo: 120 + DURACION_PASO, maximo: null };
  return null;
}

/** Si una duración cae dentro de un tramo. */
export function dentroDelTramo(minutos: number, tramo: TramoDuracion): boolean {
  if (minutos < tramo.minimo) return false;
  return tramo.maximo == null || minutos <= tramo.maximo;
}

