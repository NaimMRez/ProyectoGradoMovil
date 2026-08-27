import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { borde, superficie, texto, verde } from '../theme/colors';
import { espacio, radio } from '../theme/layout';
import Icono, { type NombreIcono } from './Icono';
import PressableScale from './PressableScale';
import Texto from './Texto';

export type ChipProps = {
  etiqueta: string;
  activo?: boolean;
  onPress?: () => void;
  icono?: NombreIcono;
  /**
   * `reparto` estira el chip para repartir el ancho a partes iguales con sus
   * hermanos (grupos de selección de un formulario). `natural` lo deja del
   * ancho de su texto (fila de filtros con scroll).
   */
  ancho?: 'reparto' | 'natural';
  /** Chip informativo, no pulsable: sexo, tamaño y peso de una mascota. */
  informativo?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  etiqueta,
  activo = false,
  onPress,
  icono,
  ancho = 'natural',
  informativo = false,
  style,
}: ChipProps) {
  if (informativo) {
    return (
      <View
        style={[
          {
            backgroundColor: superficie.pildora,
            borderRadius: radio.xs,
            paddingVertical: espacio.xs,
            paddingHorizontal: espacio.md,
          },
          style,
        ]}
      >
        <Texto variante="chipS" color={verde.texto}>
          {etiqueta}
        </Texto>
      </View>
    );
  }

  const colorTexto = activo ? texto.sobrePrimario : texto.medio;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={etiqueta}
      style={[
        {
          flex: ancho === 'reparto' ? 1 : undefined,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: espacio.sm,
          paddingVertical: 11,
          paddingHorizontal: ancho === 'reparto' ? espacio.md : espacio.lg + 4,
          borderRadius: radio.sm,
          borderWidth: 1,
          backgroundColor: activo ? verde.primario : superficie.tarjeta,
          borderColor: activo ? verde.primario : borde.input,
        },
        style,
      ]}
    >
      {icono ? <Icono nombre={icono} tamano={15} color={colorTexto} /> : null}
      <Texto variante="chip" color={colorTexto}>
        {etiqueta}
      </Texto>
    </PressableScale>
  );
}

/** Fila de chips que reparten el ancho por igual. */
export function GrupoChips({
  opciones,
  valor,
  onCambio,
  style,
}: {
  opciones: readonly string[];
  valor: string;
  onCambio: (opcion: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', gap: espacio.md }, style]}>
      {opciones.map((opcion) => (
        <Chip
          key={opcion}
          etiqueta={opcion}
          ancho="reparto"
          activo={valor === opcion}
          onPress={() => onCambio(opcion)}
        />
      ))}
    </View>
  );
}

/**
 * Fila de chips con scroll horizontal. El `contentContainerStyle` lleva el
 * padding lateral de pantalla para que el primer y el último chip puedan
 * llegar hasta el borde al desplazarse, en vez de quedar recortados.
 */
export function FilaChips({
  opciones,
  valor,
  onCambio,
  paddingLateral = 20,
}: {
  opciones: readonly string[];
  valor: string;
  onCambio: (opcion: string) => void;
  paddingLateral?: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -paddingLateral }}
      contentContainerStyle={{
        paddingHorizontal: paddingLateral,
        gap: espacio.md,
      }}
    >
      {opciones.map((opcion) => (
        <Chip
          key={opcion}
          etiqueta={opcion}
          activo={valor === opcion}
          onPress={() => onCambio(opcion)}
        />
      ))}
    </ScrollView>
  );
}

export default Chip;
