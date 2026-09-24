import type { ReactNode } from 'react';
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borde, superficie, texto, verde } from '../theme/colors';
import { espacio, medida, pantalla as rellenoPantalla, radio } from '../theme/layout';
import { BotonIcono } from './Button';
import PressableScale from './PressableScale';
import Texto from './Texto';

export type PantallaProps = {
  children: ReactNode;
  /** `lista` para pantallas con tabs, `detalle` con botón atrás, `acceso` para login. */
  relleno?: keyof typeof rellenoPantalla | 'ninguno';
  /**
   * Reserva el sitio de la barra de tabs al final del contenido.
   *
   * **Suma la altura completa de la barra**, porque la barra flota encima del
   * contenido y no ocupa lugar en la disposición: sin esta reserva, el último
   * elemento de una lista queda tapado por ella. Añade además el área segura
   * inferior y un poco de aire, para que el último elemento no llegue a rozar
   * la barra.
   */
  conTabs?: boolean;
  /** Sin scroll: la pantalla es una columna fija (chat, mapa, asistente). */
  fija?: boolean;
  fondo?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
} & Pick<ScrollViewProps, 'refreshControl' | 'onScroll' | 'scrollEventThrottle' | 'keyboardShouldPersistTaps'>;

/** Contenedor de pantalla: área segura, fondo y padding del tipo indicado. */
export function Pantalla({
  children,
  relleno = 'lista',
  conTabs = false,
  fija = false,
  fondo = superficie.app,
  style,
  contentContainerStyle,
  ...restoScroll
}: PantallaProps) {
  const insets = useSafeAreaInsets();

  const base =
    relleno === 'ninguno'
      ? { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }
      : rellenoPantalla[relleno];

  const relleneado: StyleProp<ViewStyle> = [
    base,
    conTabs && {
      paddingBottom:
        base.paddingBottom + medida.alturaTabs + insets.bottom + espacio['4xl'],
    },
    contentContainerStyle,
  ];

  if (fija) {
    return (
      <View style={[{ flex: 1, backgroundColor: fondo }, relleneado, style]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: fondo }, style]}
      contentContainerStyle={relleneado}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...restoScroll}
    >
      {children}
    </ScrollView>
  );
}

/**
 * Cabecera de pantalla de detalle: botón atrás, título y, opcionalmente,
 * subtítulo. El botón atrás es el mismo patrón en toda la app.
 */
export function CabeceraDetalle({
  titulo,
  subtitulo,
  onAtras,
  /** `close` en el primer paso de un asistente, `arrow_back` en el resto. */
  iconoAtras = 'arrow_back',
  derecha,
  style,
}: {
  titulo: string;
  subtitulo?: string;
  onAtras?: () => void;
  iconoAtras?: 'arrow_back' | 'close';
  derecha?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: espacio.xl },
        style,
      ]}
    >
      <BotonIcono
        icono={iconoAtras}
        lado={medida.botonAtras}
        radioBoton={radio.md}
        tamanoIcono={20}
        color={texto.medio}
        colorBorde={borde.suave}
        onPress={onAtras ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        accessibilityLabel={iconoAtras === 'close' ? 'Cerrar' : 'Volver'}
      />

      <View style={{ flex: 1 }}>
        <Texto variante="tituloDetalle" color={texto.principal} numberOfLines={1}>
          {titulo}
        </Texto>
        {subtitulo ? (
          <Texto variante="caption" color={texto.suave} numberOfLines={1}>
            {subtitulo}
          </Texto>
        ) : null}
      </View>

      {derecha}
    </View>
  );
}

/** Título de sección con enlace opcional a la derecha. */
export function EncabezadoSeccion({
  titulo,
  enlace,
  onEnlace,
  style,
}: {
  titulo: string;
  enlace?: string;
  onEnlace?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: espacio.xl,
        },
        style,
      ]}
    >
      <Texto variante="seccion" color={texto.fuerte}>
        {titulo}
      </Texto>
      {enlace ? (
        <PressableScale onPress={onEnlace} fuerza="fuerte" hitSlop={10}>
          <Texto variante="enlace" color={verde.enlace}>
            {enlace}
          </Texto>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Separador de 1 px con el color de divisor interno de tarjeta. */
export function Divisor({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: borde.divisor }, style]} />;
}

export default Pantalla;
