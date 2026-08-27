import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { css, useReducedMotion } from 'react-native-reanimated';
import { borde, superficie, vacio } from '../theme/colors';
import { espacio, radio } from '../theme/layout';
import { duracion } from '../theme/motion';

/**
 * Latido de carga.
 *
 * Es una animación en bucle, así que va como animación CSS de Reanimated: se
 * declara una vez y corre entera en el hilo de UI, sin que React se entere.
 *
 * Late en **opacidad**, no con un brillo que barre de izquierda a derecha. El
 * barrido es movimiento direccional en algo que no va a ninguna parte, y a
 * 900 ms de ciclo pide más atención que el contenido que está sustituyendo.
 */
const latido = css.keyframes({
  '0%': { opacity: 0.55 },
  '100%': { opacity: 1 },
});

export type SkeletonProps = {
  ancho?: number | `${number}%`;
  alto?: number;
  radioForma?: number;
  /** Círculo del tamaño de `alto`. Para avatares. */
  circulo?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Un bloque. Se compone con otros para imitar la forma del contenido real. */
export function Skeleton({
  ancho = '100%',
  alto = 14,
  radioForma = radio.xs,
  circulo = false,
  style,
}: SkeletonProps) {
  const reducido = useReducedMotion();

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: circulo ? alto : ancho,
          height: alto,
          borderRadius: circulo ? radio.pastilla : radioForma,
          backgroundColor: vacio.fotoFondo,
        },
        !reducido && {
          animationName: latido,
          animationDuration: duracion.latido,
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
          animationTimingFunction: 'ease-in-out',
        },
        style,
      ]}
    />
  );
}

/** Envoltorio con la forma de una tarjeta, para que el hueco no salte. */
function Marco({ children, alto }: { children: React.ReactNode; alto?: number }) {
  return (
    <View
      style={{
        height: alto,
        backgroundColor: superficie.tarjeta,
        borderRadius: radio.tarjeta,
        borderWidth: 1,
        borderColor: borde.tarjeta,
        padding: espacio['3xl'],
        gap: espacio.xl,
      }}
    >
      {children}
    </View>
  );
}

/**
 * Los skeletons imitan la forma de la tarjeta que van a sustituir: misma
 * altura, mismo radio, mismos bloques en los mismos sitios. Si el hueco tiene
 * otra altura que el contenido, la lista da un salto al cargar y el skeleton
 * habrá empeorado justo lo que venía a arreglar.
 */
export function SkeletonSolicitud() {
  return (
    <Marco>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xl }}>
        <Skeleton ancho={42} alto={42} radioForma={radio.md} />
        <View style={{ flex: 1, gap: espacio.md }}>
          <Skeleton ancho="62%" alto={15} />
          <Skeleton ancho="44%" alto={12} />
        </View>
        <Skeleton ancho={64} alto={22} radioForma={radio.xs} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espacio['3xl'],
          borderTopWidth: 1,
          borderTopColor: borde.divisor,
          paddingTop: espacio.xl,
        }}
      >
        <Skeleton ancho={74} alto={12} />
        <Skeleton ancho={56} alto={12} />
        <Skeleton ancho={48} alto={13} style={{ marginLeft: 'auto' }} />
      </View>
    </Marco>
  );
}

export function SkeletonMascota() {
  return (
    <Marco>
      <View style={{ flexDirection: 'row', gap: espacio.xxl }}>
        <Skeleton ancho={92} alto={92} radioForma={radio.xl} />
        <View style={{ flex: 1, gap: espacio.lg, paddingTop: espacio.xs }}>
          <Skeleton ancho="55%" alto={17} />
          <Skeleton ancho="72%" alto={12} />
          <View style={{ flexDirection: 'row', gap: espacio.sm, marginTop: espacio.xs }}>
            <Skeleton ancho={54} alto={22} radioForma={radio.xs} />
            <Skeleton ancho={62} alto={22} radioForma={radio.xs} />
            <Skeleton ancho={48} alto={22} radioForma={radio.xs} />
          </View>
        </View>
      </View>
    </Marco>
  );
}

export function SkeletonConversacion() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.xl + 1,
        backgroundColor: superficie.tarjeta,
        borderRadius: radio.tarjeta,
        borderWidth: 1,
        borderColor: borde.tarjeta,
        padding: 15,
      }}
    >
      <Skeleton alto={52} circulo />
      <View style={{ flex: 1, gap: espacio.md }}>
        <Skeleton ancho="48%" alto={14} />
        <Skeleton ancho="80%" alto={12} />
        <Skeleton ancho={128} alto={18} radioForma={radio.xs} />
      </View>
    </View>
  );
}

export function SkeletonNotificacion() {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: espacio.xl,
        backgroundColor: superficie.tarjeta,
        borderRadius: radio.tarjeta,
        borderWidth: 1,
        borderColor: borde.tarjeta,
        padding: espacio['3xl'],
      }}
    >
      <Skeleton ancho={38} alto={38} radioForma={radio.md} />
      <View style={{ flex: 1, gap: espacio.md }}>
        <Skeleton ancho="88%" alto={13} />
        <Skeleton ancho="66%" alto={12} />
        <Skeleton ancho={54} alto={11} />
      </View>
    </View>
  );
}

/** Repite un skeleton N veces con el mismo `gap` que la lista real. */
export function ListaSkeleton({
  cuantos = 3,
  separacion = espacio.xl + 1,
  children,
}: {
  cuantos?: number;
  separacion?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: separacion }}>
      {Array.from({ length: cuantos }, (_, i) => (
        <View key={i}>{children}</View>
      ))}
    </View>
  );
}

export default Skeleton;
