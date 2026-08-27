/**
 * "Buenos días" / "Buenas tardes" / "Buenas noches".
 *
 * Es la única etiqueta que la app compone en vez de recibirla del backend, y
 * la excepción se justifica sola: depende del momento exacto en que se pinta
 * la pantalla, no de ningún dato del servidor. Una respuesta cacheada a las
 * 11:58 diría "Buenos días" a las 12:30.
 *
 * El corte se hace sobre la hora del dispositivo a propósito: el saludo habla
 * de dónde está el usuario ahora, no de la zona horaria del servicio.
 */
export function saludo(fecha = new Date()): string {
  const hora = fecha.getHours();
  if (hora < 12) return 'Buenos días,';
  if (hora < 19) return 'Buenas tardes,';
  return 'Buenas noches,';
}
