/**
 * Dos worklets que hacen falta en cualquier gesto de la app.
 *
 * Ambos llevan `'worklet'` en la primera línea: sin esa marca funcionan en el
 * depurador y revientan en el dispositivo, que es la peor combinación posible.
 */

/**
 * Dónde acabaría el dedo si soltara y siguiera desacelerando.
 *
 * Es la forma de decaimiento exponencial de Apple, no la `v²/2a` de física de
 * bachillerato. Sirve para que un golpe seco y corto cuente como intención de
 * descartar: sin esto hay que arrastrar el sheet media pantalla y se siente
 * pesado.
 */
export function proyectar(velocidad: number, deceleracion = 0.998): number {
  'worklet';
  return ((velocidad / 1000) * deceleracion) / (1 - deceleracion);
}

/**
 * Resistencia elástica en un borde. Cuanto más se pasa, menos sigue al dedo.
 *
 * Un tope duro comunica "esto está roto"; un tope elástico comunica "aquí se
 * acabó". Es la misma información y una se siente mucho mejor.
 */
export function elastico(exceso: number, dimension: number, constante = 0.55): number {
  'worklet';
  return (exceso * dimension * constante) / (dimension + constante * Math.abs(exceso));
}
