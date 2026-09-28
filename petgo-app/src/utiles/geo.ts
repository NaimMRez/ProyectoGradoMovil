/** Un punto en coordenadas geográficas. */
export type Punto = { lat: number; lng: number };

/** Centro del Cercado de Cochabamba. */
export const CENTRO_CERCADO: Punto = { lat: -17.386, lng: -66.158 };

const RADIO_TIERRA_M = 6_371_008.8;
const aRadianes = (grados: number) => (grados * Math.PI) / 180;

/**
 * Distancia en metros entre dos puntos, por la fórmula del haversine.
 *
 * Sólo existe para que el adaptador mock pueda ordenar la lista igual que lo
 * hará el servidor. **En producción esto no se usa:** la distancia la calcula
 * PostGIS con `ST_Distance` sobre `geography`, que trabaja sobre el elipsoide
 * en vez de sobre una esfera y además viene ya resuelta en la misma consulta
 * que filtra por radio.
 */
export function distanciaEnMetros(a: Punto, b: Punto): number {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const lat1 = aRadianes(a.lat);
  const lat2 = aRadianes(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/**
 * Radio, en metros, dentro del cual un punto se da por del Cercado.
 *
 * Un círculo es una aproximación burda de un municipio, pero para avisar
 * llega. Diez kilómetros desde la plaza principal dejan fuera Quillacollo y
 * Sacaba — los dos a 12,9 km — y dentro todo lo que es ciudad, incluido el
 * aeropuerto a 4,4 km. Tiquipaya (8,1) y Colcapirhua (6,9) caen dentro aunque
 * sean otros municipios: son continuos con la mancha urbana y avisar allí
 * sería un falso positivo. Lo riguroso sería el polígono del municipio.
 */
const RADIO_CERCADO_M = 10_000;

/**
 * Radio del área metropolitana. Es otra pregunta y por eso es otro número:
 * no "¿este punto es del Cercado?" sino "¿esta persona está en Cochabamba?".
 */
const RADIO_METROPOLITANO_M = 40_000;

export function estaEnElCercado(punto: Punto): boolean {
  return distanciaEnMetros(punto, CENTRO_CERCADO) <= RADIO_CERCADO_M;
}

/** Si el punto cae en Cochabamba y su área, no necesariamente en el Cercado. */
export function estaEnCochabamba(punto: Punto): boolean {
  return distanciaEnMetros(punto, CENTRO_CERCADO) <= RADIO_METROPOLITANO_M;
}

/**
 * Desde qué punto se lanza la consulta de solicitudes cercanas.
 *
 * Si estás en el Cercado, tu posición real. Si no, el centro del Cercado.
 *
 * El motivo es concreto: los datos del seed están clavados en Cochabamba. Sin
 * este respaldo, abrir la app desde cualquier otra ciudad — o desde un
 * emulador, que por defecto se sitúa en California — devuelve cero solicitudes
 * y la pantalla del cuidador queda vacía sin que nada esté roto.
 *
 * **Es un apoyo de demostración y vive sólo en el adaptador mock.** El backend
 * real usa siempre la posición que le manda el dispositivo, sin excepciones:
 * un cuidador de La Paz no debe ver paseos de Cochabamba.
 */
export function origenDeBusqueda(punto: Punto | null): {
  origen: Punto;
  esReal: boolean;
} {
  // Aquí la pregunta es si la posición sirve para buscar, no si el punto es
  // del Cercado: a un cuidador de Quillacollo hay que buscarle desde donde
  // está, no desde el centro de una ciudad que tiene al lado.
  if (punto && estaEnCochabamba(punto)) return { origen: punto, esReal: true };
  return { origen: CENTRO_CERCADO, esReal: false };
}
