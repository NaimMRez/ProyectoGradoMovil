import type { ReactNode } from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { tipografia, type ClaveTipografia } from '../theme/typography';
import { texto as coloresTexto } from '../theme/colors';

export type TextoProps = Omit<TextProps, 'style'> & {
  /** Entrada de `theme/typography.ts`. Nunca se escribe un `fontSize` suelto. */
  variante?: ClaveTipografia;
  /** Color literal. Por defecto, el color de texto de tarjeta. */
  color?: string;
  /** Ajustes puntuales de layout (márgenes, alineación). No de tipografía. */
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
};

/**
 * Texto con una variante del sistema tipográfico.
 *
 * Existe para que ningún componente tenga que acordarse de que en React Native
 * `fontWeight` no funciona sobre una familia variable: cada peso es un archivo
 * distinto y el peso viaja dentro de `fontFamily`. Escribir
 * `{ fontFamily: 'DMSans_400Regular', fontWeight: '600' }` no da negrita, da
 * una regular y un bug que sólo se ve en Android.
 */
export function Texto({
  variante = 'cuerpo',
  color = coloresTexto.tarjeta,
  style,
  ...resto
}: TextoProps) {
  return <Text style={[tipografia[variante], { color }, style]} {...resto} />;
}

export default Texto;
