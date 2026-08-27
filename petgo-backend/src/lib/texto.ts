/**
 * Etiquetas.
 *
 * **El backend devuelve los textos ya formateados** — `"Bs 45"`,
 * `"Rocco y Luna"`, `"a 600 m del punto de recogida"` — y la app sólo los
 * pinta. Todo lo que produce una cadena visible pasa por aquí.
 *
 * No es purismo arquitectónico. La pluralización en español y la coma decimal
 * boliviana aparecen en una docena de pantallas: si cada una las resolviera por
 * su cuenta, acabarían divergiendo, y arreglar "1 mascotas" obligaría a tocar
 * doce archivos del cliente y a publicar una versión nueva de la app.
 */

/** "1 mascota" · "3 mascotas". */
export function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

/**
 * "Rocco" · "Rocco y Luna" · "Rocco, Luna y Kira".
 *
 * Una solicitud puede llevar varias mascotas, y el cliente pidió expresamente
 * que los nombres se muestren unidos por " y ".
 */
export function unirNombres(nombres: readonly string[]): string {
  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0]!;
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}

/** "Bs 45". */
export function bolivianos(monto: number): string {
  return `Bs ${monto}`;
}

/** "60 min". */
export function duracion(minutos: number): string {
  return `${minutos} min`;
}

/**
 * "600 m" por debajo del kilómetro, "1,2 km" por encima.
 *
 * Coma decimal, que es la convención boliviana. Por debajo del kilómetro se
 * redondea a 50 m: dar "612 m" sugiere una precisión que ni el GPS del teléfono
 * ni el punto de recogida tienen.
 */
export function distancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros / 50) * 50} m`;
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

/** "a 600 m del punto de recogida". */
export function distanciaLarga(metros: number): string {
  return `a ${distancia(metros)} del punto de recogida`;
}

/** "#1042". */
export function codigoSolicitud(codigo: number): string {
  return `#${codigo}`;
}

/** El primer nombre, que es lo que usan los toasts: "Aceptaste a Diego". */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/**
 * "Cuidador · 34 paseos" · "Cuidadora · 12 paseos" · "Dueña de mascota".
 *
 * El género sale del nombre y no del perfil porque PetGo no pregunta por él:
 * pedir un dato sólo para redactar una etiqueta sería pedirlo de más. La
 * heurística falla con nombres que no acaban en «a», y por eso sólo se aplica a
 * esta etiqueta y nunca a nada con consecuencias.
 */
export function metaUsuario(
  nombre: string,
  rol: 'dueno' | 'cuidador',
  paseosCompletados: number | null,
): string {
  const femenino = primerNombre(nombre).toLocaleLowerCase('es-BO').endsWith('a');

  if (rol === 'dueno') return femenino ? 'Dueña de mascota' : 'Dueño de mascota';

  const titulo = femenino ? 'Cuidadora' : 'Cuidador';
  return `${titulo} · ${plural(paseosCompletados ?? 0, 'paseo', 'paseos')}`;
}

/** Chip de rol del perfil. Éste no varía con el género: es el rol del sistema. */
export function rolEtiqueta(rol: 'dueno' | 'cuidador'): string {
  return rol === 'dueno' ? 'Dueño de mascota' : 'Cuidador / paseador';
}

/** "Border collie · 3 años". */
export function resumenMascota(raza: string, edad: string): string {
  return `${raza} · ${edad}`;
}

const SEXO: Record<string, string> = { macho: 'Macho', hembra: 'Hembra' };
const TAMANO: Record<string, string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande: 'Grande',
};

/** Los enums viajan en minúscula sin tildes; la app los pinta como vienen. */
export const etiquetaSexo = (sexo: string): string => SEXO[sexo] ?? sexo;
export const etiquetaTamano = (tamano: string): string => TAMANO[tamano] ?? tamano;
