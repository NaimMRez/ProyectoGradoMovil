import { View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Animated, { css, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../src/components/Button';
import Icono from '../src/components/Icono';
import Texto from '../src/components/Texto';
import { ambar, arena, superficie, texto, verde } from '../src/theme/colors';
import { espacio, radio } from '../src/theme/layout';
import { curvaCSS, duracion } from '../src/theme/motion';

type Columna = {
  nombre: string;
  foto: ImageSourcePropType;
  /** Color de la banda. */
  banda: string;
  /** Tinte del círculo, detrás del recorte de la foto. */
  circulo: string;
  /** Alto de la banda como fracción de la más larga. */
  factor: number;
};

/**
 * Las cuatro columnas de la portada.
 *
 * El orden importa dos veces. La banda oscura va en segundo lugar **para que
 * el reloj y la batería del sistema queden sobre bandas claras**: en las
 * esquinas superiores el texto de la barra de estado es del sistema y no se
 * puede teñir por zonas.
 *
 * Y los alturas alternan largo-corto para que la fila no se lea como una
 * escalera. La segunda baja mucho más que el resto y es la que ancla la
 * composición.
 */
const COLUMNAS: Columna[] = [
  {
    nombre: 'Luna',
    foto: require('../assets/luna.png'),
    banda: superficie.pildora,
    circulo: superficie.tarjeta,
    factor: 0.62,
  },
  {
    nombre: 'Rocco',
    foto: require('../assets/rocco.png'),
    banda: verde.primario,
    circulo: superficie.tarjeta,
    factor: 1,
  },
  {
    nombre: 'Milo',
    foto: require('../assets/milo.png'),
    banda: ambar.fondo,
    circulo: superficie.tarjeta,
    factor: 0.72,
  },
  {
    nombre: 'Pepa',
    foto: require('../assets/pepa.png'),
    banda: superficie.seleccion,
    circulo: superficie.tarjeta,
    factor: 0.54,
  },
];

/** Huellas de fondo. Posición, tamaño y giro fijos: no deben bailar al recargar. */
const HUELLAS = [
  { top: 6, left: 18, tamano: 26, giro: '-18deg' },
  { top: 64, right: 26, tamano: 20, giro: '14deg' },
  { top: 132, left: 46, tamano: 16, giro: '32deg' },
  { bottom: 118, right: 54, tamano: 24, giro: '-8deg' },
] as const;

/** Las bandas caen desde arriba, escalonadas de izquierda a derecha. */
const caer = css.keyframes({
  from: { opacity: 0, transform: [{ translateY: -70 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
});

/** La foto entra después de que su banda ha aterrizado. */
const asomar = css.keyframes({
  from: { opacity: 0, transform: [{ scale: 0.55 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
});

/**
 * Portada.
 *
 * Es la primera pantalla que ve alguien que abre PetGo por primera vez, y la
 * única cuyo trabajo es que quiera seguir. No explica nada — de eso se encargan
 * las tres tarjetas siguientes—: enseña perros y da un botón.
 *
 * Se ve una vez por instalación, así que aquí sí cabe el gesto: las bandas caen
 * y las fotos asoman detrás. Es el mismo criterio que permite el latido del
 * splash — en el reparto de frecuencias, lo raro es donde vive el presupuesto
 * de gracia. Con la reducción de movimiento activada todo aparece ya colocado.
 */
export default function Bienvenida() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducido = useReducedMotion();

  // La banda más larga baja hasta la mitad de la pantalla; el resto son
  // fracciones de ella. Se mide contra el alto real del dispositivo para que
  // la proporción se mantenga en pantallas cortas y largas.
  const altoLargo = Math.round(height * 0.46) + insets.top;
  const anchoBanda = width / COLUMNAS.length;
  const ladoCirculo = Math.round(anchoBanda * 0.74);

  return (
    <View style={{ flex: 1, backgroundColor: arena.fondo }}>
      {/* ── Bandas ──────────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {COLUMNAS.map((columna, i) => (
          <View key={columna.nombre} style={{ flex: 1, alignItems: 'center' }}>
            <Animated.View
              style={[
                {
                  width: '100%',
                  height: Math.round(altoLargo * columna.factor),
                  backgroundColor: columna.banda,
                  // El fondo semicircular es lo que convierte cuatro rectángulos
                  // en una composición.
                  borderBottomLeftRadius: radio.pastilla,
                  borderBottomRightRadius: radio.pastilla,
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  paddingBottom: espacio['3xl'],
                },
                !reducido && {
                  opacity: 0,
                  animationName: caer,
                  animationDuration: duracion.entrada + 120,
                  animationDelay: i * 90,
                  animationTimingFunction: curvaCSS.salida,
                  animationFillMode: 'forwards',
                },
              ]}
            >
              <Animated.View
                style={[
                  {
                    width: ladoCirculo,
                    height: ladoCirculo,
                    borderRadius: radio.pastilla,
                    backgroundColor: columna.circulo,
                    overflow: 'hidden',
                  },
                  !reducido && {
                    opacity: 0,
                    animationName: asomar,
                    animationDuration: duracion.entrada,
                    animationDelay: 220 + i * 90,
                    animationTimingFunction: curvaCSS.salida,
                    animationFillMode: 'forwards',
                  },
                ]}
              >
                {/* Las fotos vienen recortadas sin fondo: `cover` las encaja en
                    el círculo y el tinte queda detrás del recorte. */}
                <Image
                  source={columna.foto}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  accessibilityLabel={`Perro llamado ${columna.nombre}`}
                />
              </Animated.View>
            </Animated.View>

            <Texto
              variante="meta"
              color={texto.fuerte}
              style={{ marginTop: espacio.lg, fontFamily: 'FamiljenGrotesk_600SemiBold' }}
            >
              {columna.nombre}
            </Texto>
          </View>
        ))}
      </View>

      {/* ── Texto y acción ──────────────────────────────────────────────── */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: espacio['5xl'],
          paddingBottom: insets.bottom + espacio['5xl'],
        }}
      >
        {/* Huellas: decoración de fondo, invisible para el lector de pantalla. */}
        {HUELLAS.map((huella, i) => (
          <View
            key={i}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{
              position: 'absolute',
              ...huella,
              opacity: 0.5,
              transform: [{ rotate: huella.giro }],
            }}
          >
            <Icono nombre="pets" tamano={huella.tamano} color={arena.borde} />
          </View>
        ))}

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: espacio.xl }}>
          <Texto
            variante="marca"
            color={verde.profundo}
            style={{ fontSize: 52, lineHeight: 56, letterSpacing: -1.6 }}
          >
            PetGo
          </Texto>

          <Texto
            variante="cuerpoL"
            color={texto.secundario}
            style={{ textAlign: 'center', maxWidth: 300 }}
          >
            Encuentra el paseo que necesitas o la oportunidad que buscas
          </Texto>
        </View>

        <Button
          titulo="Comenzar"
          onPress={() => router.replace('/onboarding')}
          completo
          haptico="ligero"
        />
      </View>
    </View>
  );
}
