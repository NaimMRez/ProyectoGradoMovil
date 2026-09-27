/**
 * Formateadores del backend, simulados.
 *
 * En producción nada de esto vive en la app: las etiquetas llegan ya
 * redactadas del serializador. Están aquí porque el adaptador mock tiene que
 * producir exactamente la misma forma, y de paso sirven de referencia para
 * escribir `src/lib/fechas.ts` y los serializadores del backend.
 *
 * Todo el cálculo de fechas es en hora de Bolivia (`America/La_Paz`, UTC-4
 * fijo, sin horario de verano), no en la del dispositivo.
 */

const DESPLAZAMIENTO_BOLIVIA_MIN = -4 * 60;

/** Convierte una fecha a "reloj de pared" boliviano. */
export function enBolivia(fecha: Date): Date {
  const utc = fecha.getTime() + fecha.getTimezoneOffset() * 60_000;
  return new Date(utc + DESPLAZAMIENTO_BOLIVIA_MIN * 60_000);
}

/**
 * Nombres cortos de los días, de domingo a sábado — el orden de `getDay()`.
 *
 * Está exportado porque el selector de fecha rotula con ellos la tira de días,
 * y las dos etiquetas conviven en la misma pantalla: si cada sitio tuviera su
 * propia lista, un día podría leerse "Mié" en la tira y "Mie" en el resumen.
 */
export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

function dosDigitos(n: number): string {
  return n.toString().padStart(2, '0');
}

/** "17:30". */
export function hora(fecha: Date): string {
  const b = enBolivia(fecha);
  return `${dosDigitos(b.getHours())}:${dosDigitos(b.getMinutes())}`;
}

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Hoy" · "Mañana" · "Ayer" · "Mar 14". */
export function diaRelativo(fecha: Date, ahora = new Date()): string {
  const f = enBolivia(fecha);
  const hoy = enBolivia(ahora);
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);

  if (mismoDia(f, hoy)) return 'Hoy';
  if (mismoDia(f, manana)) return 'Mañana';
  if (mismoDia(f, ayer)) return 'Ayer';
  return `${DIAS_CORTOS[f.getDay()]} ${f.getDate()}`;
}

/** "Hoy · 17:30". */
export function fechaHora(fecha: Date, ahora = new Date()): string {
  return `${diaRelativo(fecha, ahora)} · ${hora(fecha)}`;
}

/**
 * Pluralización en español. Existe aquí y no en la app porque si no acaba
 * duplicada en cada pantalla que muestre un contador.
 */
export function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

/** "Rocco" · "Rocco y Luna" · "Rocco, Luna y Kira". */
export function unirNombres(nombres: readonly string[]): string {
  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** "Bs 45". */
export function bolivianos(monto: number): string {
  return `Bs ${monto}`;
}

/**
 * "600 m" bajo el kilómetro, "1,2 km" por encima. Coma decimal: es la
 * convención boliviana y el handoff la usa ("1,4 km").
 */
export function distancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros / 50) * 50} m`;
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

/** "a 600 m del punto de recogida". */
export function distanciaLarga(metros: number): string {
  return `a ${distancia(metros)} del punto de recogida`;
}

/**
 * "45 min" · "1 h" · "1 h 30 min" · "3 h".
 *
 * Decía siempre los minutos en crudo, que servía mientras el paseo más largo
 * era de hora y media. Con tres horas en la barra, "180 min" obliga al lector
 * a dividir.
 */
export function duracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

/** Traduce el chip de distancia a metros para la consulta geoespacial. */
export function radioEnMetros(chip: string): number {
  const km = Number.parseFloat(chip);
  return Number.isFinite(km) ? km * 1000 : 5000;
}

/** Traduce el chip de remuneración al mínimo en bolivianos, o `null`. */
export function pagoMinimo(chip: string): number | null {
  const n = Number.parseInt(chip.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
