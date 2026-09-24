import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { tabs as coloresTabs } from '../theme/colors';
import { espacio, medida, profundidad, radio } from '../theme/layout';
import { curva, duracion } from '../theme/motion';
import Icono, { type NombreIcono } from './Icono';
import PressableScale from './PressableScale';
import Texto from './Texto';

export type DefinicionTab = {
  clave: string;
  etiqueta: string;
  icono: NombreIcono;
};

/** Tabs del dueño. El rol se fija en el registro y no cambia dentro de la app. */
export const TABS_DUENO: readonly DefinicionTab[] = [
  { clave: 'inicio', etiqueta: 'Inicio', icono: 'home' },
  { clave: 'solicitudes', etiqueta: 'Solicitudes', icono: 'assignment' },
  { clave: 'mascotas', etiqueta: 'Mascotas', icono: 'pets' },
  { clave: 'perfil', etiqueta: 'Perfil', icono: 'person' },
];

export const TABS_CUIDADOR: readonly DefinicionTab[] = [
  { clave: 'inicio', etiqueta: 'Inicio', icono: 'home' },
  { clave: 'mapa', etiqueta: 'Mapa', icono: 'map' },
  { clave: 'servicios', etiqueta: 'Servicios', icono: 'assignment' },
  { clave: 'perfil', etiqueta: 'Perfil', icono: 'person' },
];

export type TabBarProps = {
  items: readonly DefinicionTab[];
  activo: string;
  onSeleccionar: (clave: string) => void;
};

/**
 * Tamaño de la etiqueta del tab activo.
 *
 * Sale de una cuenta, no del gusto. En una pantalla de 390 pt la píldora
 * dispone de 178 pt una vez descontados los tres círculos, sus separaciones y
 * el relleno de la barra; en una de 360 pt — común en Android — bajan a 148.
 * Con la etiqueta más larga del proyecto, "Solicitudes", el contenido mide
 * unos 145 pt a este tamaño y todavía entra en las dos. A 22 pt pediría 183 y
 * desbordaría incluso en la pantalla grande.
 */
const TAM_ETIQUETA = 16;

/**
 * Ancho de la píldora activa. **El mismo para los cuatro tabs.**
 *
 * Está calculado sobre la etiqueta más larga del proyecto, "Solicitudes":
 * icono (21) + separación (8) + texto (~100 a 16 pt) + relleno (2 × 16). Con
 * "Mapa" sobra espacio y el contenido se centra, y eso es deliberado — si cada
 * tab tuviera el ancho de su propia etiqueta, los tres círculos cambiarían de
 * sitio en cada toque.
 *
 * Fijarlo también arregla el reparto: con la píldora a un ancho conocido, los
 * inactivos se llevan exactamente lo que queda y ninguno puede comprimir al
 * otro. Antes competían por el espacio y la etiqueta acababa recortada.
 */
const ANCHO_PILDORA = 164;

/** La etiqueta entra cuando la píldora ya tiene sitio para ella. */
const ETIQUETA = FadeIn.duration(duracion.micro).delay(90);

/**
 * Un tab.
 *
 * Su ancho es un valor animado explícito, no una animación de disposición.
 * `LinearTransition` anima el marco de cada elemento por su cuenta y no
 * garantiza que la suma siga cabiendo en la barra: a mitad de camino los
 * cuatro anchos no sumaban el ancho disponible y el contenido se salía.
 *
 * Con anchos explícitos la invariante se cumple por construcción. Como la
 * píldora mide siempre lo mismo, cambiar de tab es un intercambio exacto entre
 * dos elementos — uno crece de `anchoInactivo` a `anchoActivo` y el otro hace
 * el camino inverso — mientras los otros dos no se mueven. La suma es la misma
 * en todos los fotogramas, así que no hay ningún instante en el que algo pueda
 * desbordar.
 */
function Tab({
  item,
  esActivo,
  anchoActivo,
  anchoInactivo,
  reducido,
  onPress,
}: {
  item: DefinicionTab;
  esActivo: boolean;
  anchoActivo: number;
  anchoInactivo: number;
  reducido: boolean;
  onPress: () => void;
}) {
  const objetivo = esActivo ? anchoActivo : anchoInactivo;
  const ancho = useSharedValue(objetivo);

  useEffect(() => {
    ancho.value = reducido
      ? objetivo
      : withTiming(objetivo, { duration: duracion.entrada, easing: curva.salida });
  }, [ancho, objetivo, reducido]);

  const estiloAncho = useAnimatedStyle(() => ({ width: ancho.value }));

  return (
    <Animated.View style={[{ height: medida.tabLado }, estiloAncho]}>
      <PressableScale
        fuerza="fuerte"
        accessibilityRole="tab"
        accessibilityState={{ selected: esActivo }}
        accessibilityLabel={item.etiqueta}
        onPress={onPress}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        {esActivo ? (
          <View
            style={{
              // Mientras la píldora crece, la etiqueta no debe asomar fuera.
              overflow: 'hidden',
              width: '100%',
              height: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: espacio.md,
              paddingHorizontal: espacio.xl,
              borderRadius: radio.pastilla,
              backgroundColor: coloresTabs.pildora,
            }}
          >
            <Icono nombre={item.icono} tamano={21} color={coloresTabs.activo} />

            {/* Entra con un poco de retraso: primero la píldora se abre, luego
                aparece la etiqueta. Al revés, el texto se vería comprimido
                contra el icono mientras el marco todavía crece. */}
            <Animated.View entering={reducido ? undefined : ETIQUETA}>
              <Texto
                variante="tab"
                color={coloresTabs.activo}
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: TAM_ETIQUETA,
                  lineHeight: TAM_ETIQUETA + 4,
                }}
                numberOfLines={1}
              >
                {item.etiqueta}
              </Texto>
            </Animated.View>
          </View>
        ) : (
          // El círculo es de tamaño fijo y va centrado: lo que se estira al
          // repartir el ancho sobrante es el área de toque, no el círculo.
          <View
            style={{
              width: medida.tabLado,
              height: medida.tabLado,
              borderRadius: radio.pastilla,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: coloresTabs.inactivoFondo,
            }}
          >
            <Icono nombre={item.icono} tamano={21} color={coloresTabs.inactivo} />
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

/**
 * Barra de tabs propia.
 *
 * Va a mano y no con los tabs nativos por dos razones: en Expo Go los tabs
 * nativos son terreno resbaladizo, y el diseño pide una píldora de fondo
 * detrás del icono activo que la barra del sistema no da.
 *
 * **Las pantallas no se deslizan.** Cambiar de tab pasa más de cien veces al
 * día y los cuatro destinos son pares, no una jerarquía: deslizar entre ellos
 * insinúa una profundidad que no existe y el usuario la paga en cada toque. Lo
 * único que se mueve es la barra.
 *
 * **La barra es oscura y flota, separada de los bordes.** Sobre un fondo
 * blanco, una barra clara pegada al borde inferior no se distingue del
 * contenido.
 *
 * **Sólo el tab activo muestra su etiqueta**, en una píldora de ancho fijo —
 * el mismo para los cuatro. El ancho restante lo reparten los tres inactivos a
 * partes iguales, y lo que se estira es su **área de toque**, no el círculo:
 * los tres siguen siendo redondos y del mismo tamaño, quedan repartidos por la
 * barra, y no sobra hueco muerto al final.
 *
 * Que la píldora sea de ancho fijo y no de ancho de contenido es lo que hace
 * predecible el reparto. Cuando cada tab medía lo que medía su etiqueta, los
 * tres inactivos competían con ella por el espacio: crecían de más y la
 * etiqueta acababa recortada — "Mascotas" se leía "M..". Con un ancho conocido
 * no hay competencia, y de paso los círculos dejan de cambiar de sitio en cada
 * toque.
 *
 * El cambio de ancho lo anima cada `Tab` por su cuenta, con un valor
 * explícito. El porqué está en su propia documentación.
 *
 * El precio es que tres de los cuatro destinos quedan sin rótulo visible. Lo
 * paga `accessibilityLabel`, que sí los nombra para un lector de pantalla;
 * visualmente es una decisión deliberada de densidad.
 */
export function TabBar({ items, activo, onSeleccionar }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reducido = useReducedMotion();

  // Ancho real de la barra, medido. Hace falta para saber si la píldora cabe a
  // su ancho ideal o hay que recortarla: en una pantalla estrecha, mantenerlo
  // dejaría a los círculos por debajo de su tamaño.
  const [ancho, setAncho] = useState(0);

  const inactivos = items.length - 1;
  // Ancho repartible: la barra menos su relleno y menos las separaciones.
  const util = ancho - 2 * espacio.md - inactivos * espacio.md;

  // La píldora va a su ancho ideal salvo que eso deje a los círculos por
  // debajo de su tamaño, cosa que pasa en pantallas estrechas.
  const anchoActivo =
    ancho === 0
      ? ANCHO_PILDORA
      : Math.min(ANCHO_PILDORA, util - inactivos * medida.tabLado);

  // Lo que queda, a partes iguales. Por construcción nunca baja del círculo.
  const anchoInactivo =
    ancho === 0 ? medida.tabLado : (util - anchoActivo) / inactivos;

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.md,
        backgroundColor: coloresTabs.fondo,
        borderRadius: radio.pastilla,
        marginHorizontal: espacio['4xl'],
        marginBottom: espacio.lg + insets.bottom,
        padding: espacio.md,
        ...profundidad.nivel3,
      }}
    >
      {items.map((item) => (
        <Tab
          key={item.clave}
          item={item}
          esActivo={item.clave === activo}
          anchoActivo={anchoActivo}
          anchoInactivo={anchoInactivo}
          reducido={reducido}
          onPress={() => {
            if (item.clave === activo) return;
            // Un toque de selección, en el mismo instante del cambio.
            void Haptics.selectionAsync();
            onSeleccionar(item.clave);
          }}
        />
      ))}
    </View>
  );
}

/**
 * Espaciador con la altura de la barra, para que el último elemento de una
 * lista con scroll no quede debajo de ella.
 */
export function EspacioTabs({ extra = 0 }: { extra?: number }) {
  const insets = useSafeAreaInsets();
  return <View style={{ height: medida.alturaTabs + insets.bottom + extra }} />;
}

export default TabBar;
