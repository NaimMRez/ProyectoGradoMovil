import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { borde, superficie } from '../theme/colors';
import { profundidad, radio } from '../theme/layout';
import PressableScale from './PressableScale';

/**
 * Jerarquía de tarjetas.
 *
 * - `flat` — se distingue del fondo sólo por el borde. Para tarjetas de apoyo
 *   dentro de una pantalla que ya tiene un protagonista.
 * - `raised` — la tarjeta por defecto de una lista.
 * - `elevated` — la tarjeta que manda. **Como mucho una por pantalla:** si dos
 *   cosas están elevadas, ninguna lo está.
 */
export type NivelTarjeta = 'flat' | 'raised' | 'elevated';

/** Superficies de tarjeta. `tinte` es el verde muy claro de los avisos. */
export type TonoTarjeta = 'blanco' | 'tinte' | 'destacado' | 'apagado';

export type CardProps = {
  nivel?: NivelTarjeta;
  tono?: TonoTarjeta;
  /** Si se pasa, la tarjeta entera es pulsable y se hunde al tocarla. */
  onPress?: () => void;
  /** Sin borde. Para tarjetas sobre fondo oscuro o dentro de otra tarjeta. */
  sinBorde?: boolean;
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

const BORDE: Record<TonoTarjeta, string> = {
  blanco: borde.tarjeta,
  tinte: borde.aviso,
  destacado: borde.destacada,
  apagado: borde.sutil,
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
  sinBorde = false,
  radioTarjeta = radio.tarjeta,
  style,
  children,
  accessibilityLabel,
}: CardProps) {
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: FONDO[tono],
      borderRadius: radioTarjeta,
      borderWidth: sinBorde ? 0 : 1,
      borderColor: BORDE[tono],
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
