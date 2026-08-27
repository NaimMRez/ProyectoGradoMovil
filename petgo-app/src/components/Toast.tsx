import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { intencion, toast as coloresToast } from '../theme/colors';
import { espacio, profundidad, radio } from '../theme/layout';
import { curva, duracion, muelle } from '../theme/motion';
import Icono, { type NombreIcono } from './Icono';
import Texto from './Texto';

export type TonoToast = 'exito' | 'aviso' | 'error';

const ICONO: Record<TonoToast, NombreIcono> = {
  exito: 'check_circle',
  aviso: 'error_outline',
  error: 'cancel',
};

const ACENTO: Record<TonoToast, string> = {
  exito: coloresToast.icono,
  // El handoff pone `check_circle` verde en todos los toasts, incluidos los de
  // validación ("Selecciona al menos una mascota"). Un tick verde encima de un
  // fallo dice lo contrario de lo que pasó. Se conserva la superficie oscura y
  // el texto verbatim; sólo cambian el icono y su color.
  aviso: '#f2c879',
  error: '#f0a79b',
};

export type ToastProps = {
  mensaje: string;
  tono?: TonoToast;
  /** Se levanta por encima de la barra de tabs cuando la pantalla la tiene. */
  sobreTabs?: boolean;
};

/**
 * Aviso efímero.
 *
 * Entra con muelle desde abajo y sale con un fundido corto: la salida no
 * necesita física porque el usuario ya no la está mirando. Vive 2600 ms y un
 * toast nuevo cancela el temporizador del anterior — de eso se encarga el
 * proveedor en `estado/toast.tsx`.
 */
export function Toast({ mensaje, tono = 'exito', sobreTabs = true }: ToastProps) {
  const insets = useSafeAreaInsets();
  const reducido = useReducedMotion();
  const progreso = useSharedValue(reducido ? 1 : 0);

  useEffect(() => {
    progreso.set(
      reducido
        ? withTiming(1, { duration: duracion.micro, easing: curva.salida })
        : withSpring(1, muelle.sheet),
    );
  }, [progreso, reducido]);

  const estilo = useAnimatedStyle(() => {
    const p = progreso.get();
    return {
      opacity: p,
      // Con movimiento reducido no se desplaza: sólo aparece.
      transform: [{ translateY: reducido ? 0 : (1 - p) * 28 }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        {
          position: 'absolute',
          left: espacio['4xl'],
          right: espacio['4xl'],
          bottom: (sobreTabs ? 78 : 24) + insets.bottom,
          zIndex: 40,
        },
        estilo,
      ]}
    >
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.xl,
            backgroundColor: coloresToast.fondo,
            borderRadius: radio.xl,
            paddingVertical: espacio.xxl,
            paddingHorizontal: espacio['3xl'],
          },
          profundidad.toast,
        ]}
      >
        <Icono nombre={ICONO[tono]} tamano={19} color={ACENTO[tono]} />
        <Texto
          variante="tituloDenso"
          color={coloresToast.texto}
          style={{ flex: 1, lineHeight: 19 }}
        >
          {mensaje}
        </Texto>
      </View>
    </Animated.View>
  );
}

export default Toast;
