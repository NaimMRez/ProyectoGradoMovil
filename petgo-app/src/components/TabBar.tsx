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
 * **Sólo el tab activo muestra su etiqueta.** La píldora se ajusta a su
 * contenido y no al hueco disponible: con "Mapa" mide la mitad que con
 * "Solicitudes", y eso es lo que se quiere — estirada a la fuerza se lee como
 * una caja vacía con texto dentro.
 *
 * El ancho que la píldora no usa lo reparten los tres inactivos a partes
 * iguales. Lo que se estira es su **área de toque**, no el círculo: los tres
 * siguen siendo redondos y del mismo tamaño, quedan repartidos por la barra, y
 * no sobra hueco muerto al final. Sin esto la fila los empaqueta contra el
 * borde izquierdo y todo el sobrante se acumula en el derecho.
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

  return (
    <View
      accessibilityRole="tablist"
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
                    // En una pantalla estrecha prefiero que se acorte la
                    // etiqueta antes que desbordar la barra.
                    flexShrink: 1,
                    paddingHorizontal: espacio['3xl'],
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
