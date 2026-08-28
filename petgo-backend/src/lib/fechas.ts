/**
 * Fechas en hora de Bolivia.
 *
 * **Todo cálculo de fecha visible se hace en `America/La_Paz`, no en la zona
 * del servidor.** El motivo es práctico: el servidor puede acabar desplegado en
 * cualquier región, y si "Hoy · 17:30" se calculara en UTC, un paseo de las
 * 21:00 de Cochabamba aparecería como "Mañana" para todo el mundo.
 *
 * Bolivia usa UTC−4 **fijo**: no tiene horario de verano y no lo ha tenido
 * nunca. Por eso el desplazamiento se puede tratar como una constante en vez de
 * arrastrar una librería de zonas horarias entera.
 */

const DESPLAZAMIENTO_MIN = -4 * 60;
const MS_POR_MINUTO = 60_000;

/**
 * Traduce un instante a su "reloj de pared" boliviano.
 *
 * El `Date` que devuelve tiene los campos locales (`getHours`, `getDate`…)
 * puestos a la hora de Bolivia. **No es el mismo instante**: sirve para leer
 * partes, no para volver a guardarlo.
 */
export function enBolivia(fecha: Date): Date {
  return new Date(fecha.getTime() + DESPLAZAMIENTO_MIN * MS_POR_MINUTO);
}

/** El instante actual, en reloj de pared boliviano. */
export function ahoraEnBolivia(): Date {
  return enBolivia(new Date());
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

const dosDigitos = (n: number) => n.toString().padStart(2, '0');

/** "17:30". */
export function hora(fecha: Date): string {
  const b = enBolivia(fecha);
  return `${dosDigitos(b.getUTCHours())}:${dosDigitos(b.getUTCMinutes())}`;
}

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** "Hoy" · "Mañana" · "Ayer" · "Mar 14". */
export function diaRelativo(fecha: Date, ahora = new Date()): string {
  const f = enBolivia(fecha);
  const hoy = enBolivia(ahora);

  const manana = new Date(hoy);
  manana.setUTCDate(hoy.getUTCDate() + 1);

  const ayer = new Date(hoy);
  ayer.setUTCDate(hoy.getUTCDate() - 1);

  if (mismoDia(f, hoy)) return 'Hoy';
  if (mismoDia(f, manana)) return 'Mañana';
  if (mismoDia(f, ayer)) return 'Ayer';

  return `${DIAS[f.getUTCDay()]} ${f.getUTCDate()}`;
}

/** "Hoy · 17:30". Es la etiqueta de fecha principal de toda la app. */
export function fechaHora(fecha: Date, ahora = new Date()): string {
  return `${diaRelativo(fecha, ahora)} · ${hora(fecha)}`;
}

/**
 * Antigüedad en palabras: "Hace 5 min" · "Hace 2 h" · "Ayer · 19:04" ·
 * "Dom · 08:12". Es lo que lleva cada notificación.
 */
export function haceCuanto(fecha: Date, ahora = new Date()): string {
  const minutos = Math.floor((ahora.getTime() - fecha.getTime()) / MS_POR_MINUTO);

  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24 && diaRelativo(fecha, ahora) === 'Hoy') {
    return `Hace ${horas} h`;
  }

  return `${diaRelativo(fecha, ahora)} · ${hora(fecha)}`;
}

/**
 * "17:35" si fue hoy, "Ayer" o "Mar 14" si no.
 *
 * Es la etiqueta de hora de la lista de conversaciones: dentro del mismo día
 * interesa la hora, y a partir de ahí interesa el día — la hora exacta de un
 * mensaje de hace tres semanas no le dice nada a nadie.
 */
export function horaODia(fecha: Date, ahora = new Date()): string {
  const dia = diaRelativo(fecha, ahora);
  return dia === 'Hoy' ? hora(fecha) : dia;
}

/** Inicio del día boliviano que contiene `fecha`, como instante UTC real. */
export function inicioDelDia(fecha: Date): Date {
  const b = enBolivia(fecha);
  b.setUTCHours(0, 0, 0, 0);
  return new Date(b.getTime() - DESPLAZAMIENTO_MIN * MS_POR_MINUTO);
}

/** Fin del día boliviano que contiene `fecha`, como instante UTC real. */
export function finDelDia(fecha: Date): Date {
  const inicio = inicioDelDia(fecha);
  return new Date(inicio.getTime() + 24 * 60 * MS_POR_MINUTO - 1);
}

/**
 * Rango que representa el chip "Esta semana": desde ahora hasta el final del
 * séptimo día. No es la semana natural de lunes a domingo — es "los próximos
 * siete días", que es lo que un cuidador entiende al filtrar.
 */
export function proximosSieteDias(ahora = new Date()): { desde: Date; hasta: Date } {
  const hasta = new Date(ahora.getTime() + 7 * 24 * 60 * MS_POR_MINUTO);
  return { desde: ahora, hasta: finDelDia(hasta) };
}
