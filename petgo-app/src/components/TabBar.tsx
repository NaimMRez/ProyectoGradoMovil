import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  LinearTransition,
  useReducedMotion,
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

/** El marco de la píldora al abrirse y cerrarse. */
const MORFEO = LinearTransition.duration(duracion.entrada).easing(curva.salida);

/** La etiqueta entra cuando la píldora ya tiene sitio para ella. */
const ETIQUETA = FadeIn.duration(duracion.micro).delay(90);

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
 * El cambio de ancho lo morfea `LinearTransition`, que anima el marco del
 * pulsable cuando la etiqueta entra o sale. Por eso la animación va en el
 * propio `PressableScale` y no en una vista que lo envuelva: una envoltura
 * animada dejaría al hijo saltando a su tamaño final dentro de un marco que
 * todavía se mueve.
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
  const util = ancho - 2 * espacio.md - inactivos * espacio.md;
  const anchoPildora =
    ancho === 0
      ? ANCHO_PILDORA
      : Math.min(ANCHO_PILDORA, util - inactivos * medida.tabLado);

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
      {items.map((item) => {
        const esActivo = item.clave === activo;

        return (
          <PressableScale
            key={item.clave}
            fuerza="fuerte"
            accessibilityRole="tab"
            accessibilityState={{ selected: esActivo }}
            accessibilityLabel={item.etiqueta}
            onPress={() => {
              if (esActivo) return;
              // Un toque de selección, en el mismo instante del cambio.
              void Haptics.selectionAsync();
              onSeleccionar(item.clave);
            }}
            layout={reducido ? undefined : MORFEO}
            style={
              esActivo
                ? {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: espacio.md,
                    height: medida.tabLado,
                    width: anchoPildora,
                    paddingHorizontal: espacio.xl,
                    borderRadius: radio.pastilla,
                    backgroundColor: coloresTabs.pildora,
                  }
                : // El inactivo reparte con sus iguales todo el ancho que deja
                  // la píldora. Lo que se estira es el área de toque, no el
                  // círculo: así no queda hueco muerto al final de la barra y
                  // los tres siguen siendo redondos y del mismo tamaño.
                  {
                    flex: 1,
                    // Nunca por debajo del círculo. En una pantalla estrecha con
                    // la etiqueta más larga activa, el reparto pediría menos de
                    // 44 pt y los círculos se deformarían; con este mínimo la
                    // presión recae en la píldora, que sí sabe acortar su texto.
                    minWidth: medida.tabLado,
                    height: medida.tabLado,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
            }
          >
            {esActivo ? (
              <>
                <Icono nombre={item.icono} tamano={21} color={coloresTabs.activo} />

                {/* Entra con un poco de retraso: primero la píldora se abre,
                    luego aparece la etiqueta. Al revés, el texto se vería
                    comprimido contra el icono mientras el marco todavía crece. */}
                <Animated.View
                  entering={reducido ? undefined : ETIQUETA}
                  style={{ flexShrink: 1 }}
                >
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
              </>
            ) : (
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
        );
      })}
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
