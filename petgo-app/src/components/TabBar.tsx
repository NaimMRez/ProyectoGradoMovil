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
 * en cada toque. Lo único que se mueve es un fundido de 120 ms en la píldora,
 * por debajo del umbral en el que se percibe como animación — sin él el cambio
 * es un parpadeo duro.
 *
 * La etiqueta mantiene el mismo peso activa e inactiva. El handoff cambia de
 * 400 a 600, pero en React Native eso es cambiar de archivo de fuente, y DM
 * Sans 600 es más ancha que la 400: la etiqueta salta de ancho en cada toque.
 * El color y la píldora ya distinguen el tab activo de sobra.
 *
 * **La barra es oscura y flota, separada de los bordes.** Sobre un fondo
 * blanco, una barra clara pegada al borde inferior no se distingue del
 * contenido. La referencia de diseño resuelve esto con una barra oscura
 * redondeada, y de ahí viene la forma.
 *
 * De esa referencia **no** se toma una cosa: allí el tab activo despliega su
 * etiqueta y los inactivos quedan en icono suelto. Con cuatro tabs y etiquetas
 * como "Solicitudes" y "Servicios", esa píldora no cabe en su cuarto de barra,
 * así que los tabs tendrían que repartirse el ancho de nuevo en cada toque —
 * y esto pasa más de cien veces al día. Las etiquetas se quedan siempre
 * visibles: se gana la forma de la referencia sin pagar el salto.
 */
export function TabBar({ items, activo, onSeleccionar }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reducido = useReducedMotion();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: coloresTabs.fondo,
        borderRadius: radio.sheet,
        marginHorizontal: espacio['4xl'],
        marginBottom: espacio.lg + insets.bottom,
        paddingVertical: espacio.lg,
        paddingHorizontal: espacio.sm,
        ...profundidad.nivel3,
      }}
    >
      {items.map((item) => {
        const esActivo = item.clave === activo;
        const color = esActivo ? coloresTabs.activo : coloresTabs.inactivo;

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
            style={{
              flex: 1,
              alignItems: 'center',
              gap: espacio.xs,
              paddingVertical: espacio.sm,
            }}
          >
            <Animated.View
              style={[
                {
                  width: medida.pildoraTab.width,
                  height: medida.pildoraTab.height,
                  borderRadius: radio.pastilla,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: esActivo ? coloresTabs.pildora : 'transparent',
                },
                !reducido && {
                  transitionProperty: 'backgroundColor',
                  transitionDuration: duracion.presion,
                  transitionTimingFunction: curvaCSS.salida,
                },
              ]}
            >
              <Icono nombre={item.icono} tamano={22} color={color} />
            </Animated.View>

            <Texto
              variante="tab"
              color={color}
              style={{ fontFamily: 'DMSans_500Medium' }}
              numberOfLines={1}
            >
              {item.etiqueta}
            </Texto>
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
