import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { superficie } from '../theme/colors';
import { profundidad, radio } from '../theme/layout';
import PressableScale from './PressableScale';

/**
 * Jerarquía de tarjetas.
 *
 * - `flat` — sin sombra. Se distingue del fondo sólo por su relleno, así que
 *   depende por completo de que tarjeta y fondo sean tonos distintos. Para
 *   tarjetas de apoyo dentro de una pantalla que ya tiene un protagonista.
 * - `raised` — la tarjeta por defecto de una lista.
 * - `elevated` — la tarjeta que manda. **Como mucho una por pantalla:** si dos
 *   cosas están elevadas, ninguna lo está.
 *
 * **Las tarjetas no llevan borde.** Lo que las separa del fondo es su propio
 * relleno, y la jerarquía la marca la sombra. Con un fondo blanco y tarjetas
 * grises el borde era una tercera señal para lo mismo, y de las tres es la que
 * más ensucia: un contorno alrededor de cada bloque convierte una pantalla en
 * una rejilla.
 */
export type NivelTarjeta = 'flat' | 'raised' | 'elevated';

/** Superficies de tarjeta. `tinte` es el verde muy claro de los avisos. */
export type TonoTarjeta = 'blanco' | 'tinte' | 'destacado' | 'apagado';

export type CardProps = {
  nivel?: NivelTarjeta;
  tono?: TonoTarjeta;
  /** Si se pasa, la tarjeta entera es pulsable y se hunde al tocarla. */
  onPress?: () => void;
  radioTarjeta?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  accessibilityLabel?: string;
};

const FONDO: Record<TonoTarjeta, string> = {
  blanco: superficie.tarjeta,
  tinte: superficie.aviso,
  destacado: superficie.destacada,
  apagado: superficie.apagada,
};

const SOMBRA = {
  flat: profundidad.nivel0,
  raised: profundidad.nivel1,
  elevated: profundidad.nivel2,
} as const;

export function Card({
  nivel = 'raised',
  tono = 'blanco',
  onPress,
  radioTarjeta = radio.tarjeta,
  style,
  children,
  accessibilityLabel,
}: CardProps) {
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: FONDO[tono],
      borderRadius: radioTarjeta,
    },
    SOMBRA[nivel],
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <PressableScale
      style={base}
      // Una tarjeta ancha necesita menos escala que un botón: el mismo 0.97
      // recorre muchos más píxeles y se lee como un salto.
      fuerza="suave"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </PressableScale>
  );
}

export default Card;
