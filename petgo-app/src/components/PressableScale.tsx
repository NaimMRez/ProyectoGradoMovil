import { forwardRef, useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { curva, duracion, presion } from '../theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Cuánto se hunde la superficie al presionarla. */
export type FuerzaPresion = keyof typeof presion;

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /**
   * Cuánto baja la escala. Cuanto más grande la superficie, más suave:
   * un 0.97 en una tarjeta de ancho completo es un salto visible.
   * @default 'normal'
   */
  fuerza?: FuerzaPresion;
  /**
   * Vibración al soltar. Sólo para acciones que confirman algo — aceptar,
   * publicar, enviar. **Nunca** en navegación ni en una fila de lista: una
   * vibración por cada toque deja de ser información y se vuelve ruido.
   * @default false
   */
  haptico?: false | 'ligero' | 'medio' | 'exito' | 'error';
  /** Desactiva la escala y deja sólo el `Pressable`. */
  sinEscala?: boolean;
};

const VIBRACION = {
  ligero: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medio: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  exito: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
} as const;

/**
 * La superficie pulsable de PetGo. **Todo lo que se toca pasa por aquí.**
 *
 * En móvil no hay hover: todo lo que la web pone en el estado hover tiene que
 * vivir en la presión, en la posición o en ningún sitio. Ésta es la parte de
 * la presión.
 *
 * La escala se anima con un valor compartido, no con estado de React, así que
 * presionar no provoca ni un solo render. Se hunde al **entrar** el dedo, no
 * al completarse el toque: esperar al `onPress` para mostrar algo es
 * exactamente la latencia que el usuario percibe como "esta app va lenta".
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(
  function PressableScale(
    {
      style,
      fuerza = 'normal',
      haptico = false,
      sinEscala = false,
      onPressIn,
      onPressOut,
      onPress,
      hitSlop,
      disabled,
      ...resto
    },
    ref,
  ) {
    const reducido = useReducedMotion();
    const escala = useSharedValue(1);
    const inerte = sinEscala || reducido;

    const estiloAnimado = useAnimatedStyle(() => ({
      transform: [{ scale: escala.get() }],
    }));

    const entrar = useCallback<NonNullable<PressableProps['onPressIn']>>(
      (evento) => {
        if (!inerte) {
          escala.set(
            withTiming(presion[fuerza], {
              duration: duracion.presion,
              easing: curva.salida,
            }),
          );
        }
        onPressIn?.(evento);
      },
      [escala, fuerza, inerte, onPressIn],
    );

    const salir = useCallback<NonNullable<PressableProps['onPressOut']>>(
      (evento) => {
        if (!inerte) {
          escala.set(
            withTiming(1, { duration: duracion.presion, easing: curva.salida }),
          );
        }
        onPressOut?.(evento);
      },
      [escala, inerte, onPressOut],
    );

    const soltar = useCallback<NonNullable<PressableProps['onPress']>>(
      (evento) => {
        // La vibración va en el mismo instante que la acción, no cuando termina
        // la animación: un háptico que llega tarde se lee como un fallo.
        if (haptico) void VIBRACION[haptico]();
        onPress?.(evento);
      },
      [haptico, onPress],
    );

    return (
      <AnimatedPressable
        ref={ref}
        style={[style, estiloAnimado, disabled && { opacity: 0.45 }]}
        onPressIn={entrar}
        onPressOut={salir}
        onPress={soltar}
        disabled={disabled}
        // Un dedo que se desliza unos píxeles no debería cancelar un toque
        // que el usuario sí quería hacer.
        pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
        hitSlop={hitSlop ?? 6}
        {...resto}
      />
    );
  },
);

export default PressableScale;
