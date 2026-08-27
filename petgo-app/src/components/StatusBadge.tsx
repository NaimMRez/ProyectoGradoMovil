import { View, type StyleProp, type ViewStyle } from 'react-native';
import { estado as coloresEstado, texto as coloresTexto, type EstadoServicio } from '../theme/colors';
import { espacio, radio } from '../theme/layout';
import Texto from './Texto';

export type StatusBadgeProps = {
  estado: EstadoServicio;
  /** Etiqueta ya formateada por el backend ("En proceso"). */
  etiqueta: string;
  /**
   * Variante para el héroe verde del detalle: fondo translúcido blanco en vez
   * del color del estado, porque los tintes claros del badge desaparecen sobre
   * el degradado.
   */
  sobreHeroe?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StatusBadge({
  estado,
  etiqueta,
  sobreHeroe = false,
  style,
}: StatusBadgeProps) {
  const piel = coloresEstado[estado];

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          flexShrink: 0,
          paddingVertical: 5,
          paddingHorizontal: espacio.lg,
          borderRadius: radio.xs,
          backgroundColor: sobreHeroe ? 'rgba(255,255,255,0.20)' : piel.fondo,
        },
        style,
      ]}
    >
      <Texto
        variante="badge"
        color={sobreHeroe ? coloresTexto.sobrePrimario : piel.texto}
      >
        {etiqueta}
      </Texto>
    </View>
  );
}

export default StatusBadge;
