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
