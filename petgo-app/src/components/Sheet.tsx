import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { chrome, superficie } from '../theme/colors';
import { espacio, medida, profundidad, radio } from '../theme/layout';
import { curva, descarte, duracion, muelle } from '../theme/motion';
import { elastico, proyectar } from '../utiles/gestos';

export type SheetProps = {
  abierto: boolean;
  onCerrar: () => void;
  /** Sin capa oscura detrás. Para la vista previa dentro del mapa. */
  sinBackdrop?: boolean;
  /** Separación lateral. La vista previa del mapa flota; los demás van a ras. */
  flotante?: boolean;
  /**
   * Sin arrastre para descartar.
   *
   * Para un sheet cuyo contenido ya se arrastra. El gesto de cierre está en
   * todo el panel y se activa con 12 pt de movimiento vertical, así que dentro
   * de un mapa los dos gestos compiten: intentar mover el mapa hacia abajo
   * cerraría el sheet. Quien lo use tiene que dejar otra salida — el backdrop
   * sigue cerrando, y conviene un botón explícito.
   */
  sinArrastre?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bottom sheet arrastrable.
 *
 * Va a mano y no con `presentation: 'formSheet'` porque estos tres sheets
 * viven **dentro** de su pantalla, no son un destino de navegación: la vista
 * previa de un marcador tiene que aparecer sin sacar el mapa de debajo, y en
 * Android un form sheet no admite el chrome que llevan Filtros y Contacto.
 *
 * Los cuatro detalles que separan esto de un arrastre malo:
 * - `onStart` captura el valor actual, así que agarrarlo a media animación no
 *   lo teletransporta.
 * - Decide la **velocidad proyectada**, no la distancia: un golpe seco de dos
 *   dedos de recorrido cierra.
 * - La velocidad del dedo se le pasa al muelle, sin costura entre el gesto y
 *   la animación.
 * - `overshootClamping` al cerrar, o el sheet se pasa del borde inferior y
 *   asoma un hueco de fondo por debajo.
 */
export function Sheet({
  abierto,
  onCerrar,
  sinBackdrop = false,
  flotante = false,
  sinArrastre = false,
  children,
  style,
}: SheetProps) {
  const { height: altoPantalla } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducido = useReducedMotion();

  // Altura real del panel, medida al montarlo. Hasta tenerla se usa media
  // pantalla como estimación para que la entrada no salga de demasiado abajo.
  const [alto, setAlto] = useState(altoPantalla * 0.5);
  const [montado, setMontado] = useState(abierto);

  const y = useSharedValue(alto);
  const inicio = useSharedValue(0);

  const desmontar = useCallback(() => setMontado(false), []);

  useEffect(() => {
    if (abierto) {
      setMontado(true);
      y.set(
        reducido
          ? withTiming(0, { duration: duracion.micro, easing: curva.salida })
          : withSpring(0, muelle.sheet),
      );
    } else if (montado) {
      y.set(
        withTiming(alto, { duration: duracion.entrada, easing: curva.sheet }, (fin) => {
          'worklet';
          if (fin) scheduleOnRN(desmontar);
        }),
      );
    }
  }, [abierto, alto, desmontar, montado, reducido, y]);

  const arrastre = useMemo(
    () =>
      Gesture.Pan()
        // Exige intención vertical antes de activarse: si no, un scroll dentro
        // del sheet arrastra el sheet entero.
        .activeOffsetY([-12, 12])
        .onStart(() => {
          inicio.set(y.get());
        })
        .onUpdate((evento) => {
          const siguiente = inicio.get() + evento.translationY;
          // Hacia abajo sigue al dedo; hacia arriba se resiste.
          y.set(siguiente >= 0 ? siguiente : elastico(siguiente, alto, descarte.resistencia));
        })
        .onEnd((evento) => {
          const proyectado = y.get() + proyectar(evento.velocityY);
          const cierra =
            proyectado > alto * descarte.fraccion ||
            evento.velocityY > descarte.velocidad;

          if (cierra) {
            y.set(
              withSpring(
                alto,
                {
                  duration: 300,
                  dampingRatio: 1,
                  velocity: evento.velocityY,
                  overshootClamping: true,
                },
                (fin) => {
                  'worklet';
                  if (fin) scheduleOnRN(onCerrar);
                },
              ),
            );
          } else {
            y.set(withSpring(0, { ...muelle.sheet, velocity: evento.velocityY }));
            // Volvió a su sitio: un golpecito seco marca que encajó.
            scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
          }
        }),
    [alto, inicio, onCerrar, y],
  );

  const estiloPanel = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }],
  }));

  // El backdrop sale del mismo valor que el panel, así que nunca se desincronizan
  // y no cuesta un solo cálculo extra.
  const estiloBackdrop = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [0, alto], [1, 0], Extrapolation.CLAMP),
  }));

  if (!montado) return null;

  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
      {!sinBackdrop ? (
        <Animated.View style={[{ flex: 1, backgroundColor: chrome.backdrop }, estiloBackdrop]}>
          <Pressable
            style={{ flex: 1 }}
            onPress={onCerrar}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          />
        </Animated.View>
      ) : (
        // Sin backdrop, el hueco de arriba tiene que dejar pasar los toques al
        // mapa que hay debajo.
        <View style={{ flex: 1 }} pointerEvents="none" />
      )}

      <Envoltura gesto={arrastre} activa={!sinArrastre}>
        <Animated.View
          onLayout={(evento) => {
            const medido = evento.nativeEvent.layout.height;
            if (medido > 0 && Math.abs(medido - alto) > 1) setAlto(medido);
          }}
          style={[
            {
              backgroundColor: superficie.tarjeta,
              borderTopLeftRadius: radio.sheet,
              borderTopRightRadius: radio.sheet,
              paddingTop: espacio['3xl'],
              paddingHorizontal: espacio['4xl'],
              paddingBottom: espacio['6xl'] + insets.bottom,
            },
            flotante && {
              marginHorizontal: espacio.xl,
              marginBottom: espacio.xxl + insets.bottom,
              borderRadius: radio.xxl,
              paddingBottom: espacio['4xl'],
            },
            profundidad.sheet,
            estiloPanel,
            style,
          ]}
        >
          {/* El asa dice "esto se arrastra". Si no se arrastra, miente. */}
          {sinArrastre ? null : <Asa />}
          {children}
        </Animated.View>
      </Envoltura>
    </View>
  );
}

/**
 * Pone o quita el `GestureDetector` sin cambiar el árbol de vistas.
 *
 * Un `if` alrededor del panel lo desmontaría y volvería a montar al cambiar,
 * perdiendo la medida y el estado de sus hijos. Así el hijo es siempre el
 * mismo elemento y lo único que aparece o desaparece es el detector.
 */
function Envoltura({
  gesto,
  activa,
  children,
}: {
  gesto: ReturnType<typeof Gesture.Pan>;
  activa: boolean;
  children: ReactNode;
}) {
  if (!activa) return <>{children}</>;
  return <GestureDetector gesture={gesto}>{children}</GestureDetector>;
}

/** La barrita gris que dice "esto se arrastra". */
export function Asa() {
  return (
    <View
      style={{
        width: medida.asa.width,
        height: medida.asa.height,
        borderRadius: radio.pastilla,
        backgroundColor: chrome.asa,
        alignSelf: 'center',
        marginBottom: espacio['3xl'],
      }}
    />
  );
}

export default Sheet;
