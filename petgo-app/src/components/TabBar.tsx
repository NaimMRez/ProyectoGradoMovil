import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { tabs as coloresTabs } from '../theme/colors';
import { espacio, medida, profundidad, radio } from '../theme/layout';
import { curvaCSS, duracion } from '../theme/motion';
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
 * Barra de tabs propia.
 *
 * Va a mano y no con los tabs nativos por dos razones: en Expo Go los tabs
 * nativos son terreno resbaladizo, y el diseño pide una píldora de fondo
 * detrás del icono activo que la barra del sistema no da.
 *
 * **La píldora no se desliza y las pantallas no se deslizan.** Cambiar de tab
 * pasa más de cien veces al día y los cuatro tabs son pares, no una jerarquía:
 * un deslizamiento insinúa una profundidad que no existe y el usuario la paga
 * en cada toque. Lo único que se mueve es un fundido de 120 ms en el relleno,
 * por debajo del umbral en el que se percibe como animación — sin él el cambio
 * es un parpadeo duro.
 *
 * **La barra es oscura y flota, separada de los bordes.** Sobre un fondo
 * blanco, una barra clara pegada al borde inferior no se distingue del
 * contenido.
 *
 * **Sólo el tab activo muestra su etiqueta.** Los otros tres quedan en
 * círculos blancos de ancho fijo y el activo se queda con el resto del ancho,
 * de modo que el reparto es determinista: la barra mide lo mismo en los cuatro
 * estados y ningún tab cambia de tamaño salvo el que entra y el que sale. Con
 * la etiqueta más larga del proyecto — "Solicitudes" — la píldora aún dispone
 * de unos 150 pt, de sobra.
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
            style={
              esActivo
                ? // El activo se queda con el ancho que dejan los círculos.
                  { flex: 1, height: medida.tabLado }
                : { width: medida.tabLado, height: medida.tabLado }
            }
          >
            <Animated.View
              style={[
                {
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: espacio.md,
                  paddingHorizontal: esActivo ? espacio.xl : 0,
                  borderRadius: radio.pastilla,
                  backgroundColor: esActivo
                    ? coloresTabs.pildora
                    : coloresTabs.inactivoFondo,
                },
                !reducido && {
                  transitionProperty: 'backgroundColor',
                  transitionDuration: duracion.presion,
                  transitionTimingFunction: curvaCSS.salida,
                },
              ]}
            >
              <Icono
                nombre={item.icono}
                tamano={21}
                color={esActivo ? coloresTabs.activo : coloresTabs.inactivo}
              />

              {esActivo ? (
                <Texto
                  variante="tab"
                  color={coloresTabs.activo}
                  style={{ fontFamily: 'DMSans_500Medium' }}
                  numberOfLines={1}
                >
                  {item.etiqueta}
                </Texto>
              ) : null}
            </Animated.View>
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
