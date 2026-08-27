import { useState } from 'react';
import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { borde, intencion, superficie, texto, verde } from '../theme/colors';
import { espacio, radio } from '../theme/layout';
import { curvaCSS, duracion } from '../theme/motion';
import { tipografia } from '../theme/typography';
import Texto from './Texto';

const AnimatedView = Animated.createAnimatedComponent(View);

export type CampoProps = Omit<TextInputProps, 'style'> & {
  /** Etiqueta encima del campo. Sin ella, el `placeholder` hace de etiqueta. */
  etiqueta?: string;
  /** Mensaje de validación. Tiñe el borde y aparece debajo. */
  error?: string;
  /** Nota de ayuda debajo del campo, cuando no hay error. */
  ayuda?: string;
  /** `textarea` de N filas. */
  filas?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Campo de formulario. El patrón se repite en login, registro, alta de mascota
 * y el asistente de publicación.
 *
 * El foco cambia el color del borde con una transición de 180 ms. Es un cambio
 * de estado sin gesto de por medio, así que va como transición CSS de
 * Reanimated: se declara en el estilo y corre en el hilo de UI. En móvil no hay
 * hover, y el foco es la única señal de "estás escribiendo aquí" que queda.
 */
export function Campo({
  etiqueta,
  error,
  ayuda,
  filas,
  style,
  onFocus,
  onBlur,
  ...resto
}: CampoProps) {
  const [enfocado, setEnfocado] = useState(false);

  const colorBorde = error
    ? intencion.destructivoTexto
    : enfocado
      ? verde.primario
      : borde.input;

  return (
    <View style={style}>
      {etiqueta ? (
        <Texto
          variante="etiqueta"
          color={texto.etiqueta}
          style={{ marginBottom: espacio.sm + 1 }}
        >
          {etiqueta}
        </Texto>
      ) : null}

      <AnimatedView
        style={[
          {
            backgroundColor: superficie.tarjeta,
            borderRadius: radio.lg,
            borderWidth: 1,
            borderColor: colorBorde,
          },
          {
            transitionProperty: 'borderColor',
            transitionDuration: duracion.micro,
            transitionTimingFunction: curvaCSS.salida,
          },
        ]}
      >
        <TextInput
          {...resto}
          multiline={filas ? true : resto.multiline}
          numberOfLines={filas}
          onFocus={(evento) => {
            setEnfocado(true);
            onFocus?.(evento);
          }}
          onBlur={(evento) => {
            setEnfocado(false);
            onBlur?.(evento);
          }}
          placeholderTextColor={texto.atenuado}
          selectionColor={verde.primario}
          style={[
            tipografia.cuerpo,
            {
              color: texto.principal,
              paddingHorizontal: espacio['3xl'],
              paddingVertical: 15,
              // `textAlignVertical` es lo único que evita que en Android el
              // texto de un multilínea empiece pegado al centro vertical.
              textAlignVertical: filas ? 'top' : 'center',
              minHeight: filas ? 22 * filas + 30 : undefined,
              lineHeight: filas ? 22 : undefined,
            },
          ]}
        />
      </AnimatedView>

      {error ? (
        <Texto
          variante="caption"
          color={intencion.destructivoTexto}
          style={{ marginTop: espacio.sm }}
        >
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="caption" color={texto.terciario} style={{ marginTop: espacio.sm }}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

export default Campo;
