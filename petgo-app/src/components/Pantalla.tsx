import type { ReactNode } from 'react';
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
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
   * Aire extra al final de una pantalla con barra de tabs.
   *
   * **No** suma la altura de la barra: tanto el navegador de tabs como la
   * barra suelta que se pinta en Notificaciones y Mensajes son hermanos del
   * contenido, no una capa encima, así que su altura ya está descontada. Lo
   * único que hace falta es que el último elemento no quede pegado al borde.
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
  const base =
    relleno === 'ninguno'
      ? { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }
      : rellenoPantalla[relleno];

  const relleneado: StyleProp<ViewStyle> = [
    base,
    conTabs && { paddingBottom: base.paddingBottom + espacio['4xl'] },
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
