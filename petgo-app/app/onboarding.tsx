import { useRef, useState } from 'react';
import {
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../src/components/Button';
import Icono, { type NombreIcono } from '../src/components/Icono';
import PressableScale from '../src/components/PressableScale';
import Texto from '../src/components/Texto';
import { arena, borde, superficie, texto, verde } from '../src/theme/colors';
import { espacio, profundidad, radio } from '../src/theme/layout';
import { curvaCSS, duracion } from '../src/theme/motion';

type Tarjeta = {
  icono: NombreIcono;
  titulo: string;
  cuerpo: string;
  /** Iconos de apoyo de la ilustración. */
  satelites: NombreIcono[];
};

const TARJETAS: Tarjeta[] = [
  {
    icono: 'near_me',
    titulo: 'Encuentra paseos cerca de ti',
    cuerpo:
      'El mapa te muestra las solicitudes disponibles en tu zona del Cercado, con distancia, duración y remuneración.',
    satelites: ['place', 'schedule', 'directions_walk'],
  },
  {
    icono: 'add_location_alt',
    titulo: 'Publica solicitudes para tu mascota',
    cuerpo:
      'Indica fecha, duración, punto de recogida y cuánto ofreces. Los cuidadores cercanos la ven al instante.',
    satelites: ['pets', 'event', 'place'],
  },
  {
    icono: 'handshake',
    titulo: 'Conecta con cuidadores',
    cuerpo:
      'Coordina por WhatsApp o chat y sigue el estado del servicio hasta que termine el paseo.',
    satelites: ['forum', 'how_to_reg', 'flag'],
  },
];

/**
 * Ilustración de onboarding.
 *
 * El handoff deja aquí un rectángulo de rayas diagonales con una nota
 * monoespaciada — "mapa con marcadores de solicitudes" — dirigida al
 * ilustrador que aún no ha entregado. Enviar eso a producción es enviar la
 * maqueta.
 *
 * En su lugar se compone una escena con las piezas que la app ya tiene: la
 * superficie de arena, una tarjeta flotante con el icono del paso, y tres
 * satélites que insinúan el contenido. No pretende ser la ilustración final:
 * pretende ser algo que un usuario pueda ver sin pensar que falta un archivo.
 */
function Ilustracion({ tarjeta }: { tarjeta: Tarjeta }) {
  return (
    <View
      style={{
        height: 280,
        borderRadius: radio.sheet,
        backgroundColor: arena.superficie,
        borderWidth: 1,
        borderColor: arena.borde,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Halo concéntrico: da profundidad sin necesitar una imagen. */}
      <View
        style={{
          position: 'absolute',
          width: 230,
          height: 230,
          borderRadius: radio.pastilla,
          backgroundColor: superficie.pildora,
          opacity: 0.55,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 158,
          height: 158,
          borderRadius: radio.pastilla,
          backgroundColor: superficie.seleccion,
        }}
      />

      <View
        style={[
          {
            width: 92,
            height: 92,
            borderRadius: radio.sheet,
            backgroundColor: superficie.tarjeta,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: borde.sutil,
          },
          profundidad.nivel2,
        ]}
      >
        <Icono nombre={tarjeta.icono} tamano={44} color={verde.primario} />
      </View>

      {/* Satélites, en las tres esquinas que no compiten con el texto. */}
      {tarjeta.satelites.map((icono, i) => {
        const posiciones = [
          { top: 42, left: 46 },
          { top: 58, right: 40 },
          { bottom: 46, left: 62 },
        ];
        return (
          <View
            key={icono}
            style={[
              {
                position: 'absolute',
                ...posiciones[i],
                width: 40,
                height: 40,
                borderRadius: radio.lg,
                backgroundColor: superficie.tarjeta,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: borde.sutil,
              },
              profundidad.nivel1,
            ]}
          >
            <Icono nombre={icono} tamano={19} color={verde.enlace} />
          </View>
        );
      })}
    </View>
  );
}

/** Píldora de página. La activa se estira de 7 a 22 px. */
function Indicador({ activo }: { activo: boolean }) {
  const reducido = useReducedMotion();

  return (
    <Animated.View
      style={[
        {
          height: 7,
          width: activo ? 22 : 7,
          borderRadius: radio.pastilla,
          backgroundColor: activo ? verde.primario : borde.input,
        },
        // Animar `width` cuesta un reflujo, pero aquí son tres vistas sin hijos
        // en una fila propia y se ve tres veces en la vida de la app. Con
        // `scaleX` la píldora quedaría con las esquinas aplastadas.
        !reducido && {
          transitionProperty: ['width', 'backgroundColor'],
          transitionDuration: duracion.micro,
          transitionTimingFunction: curvaCSS.salida,
        },
      ]}
    />
  );
}

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [indice, setIndice] = useState(0);

  const ultima = indice === TARJETAS.length - 1;

  const irA = (siguiente: number) => {
    scroll.current?.scrollTo({ x: siguiente * width, animated: true });
    setIndice(siguiente);
  };

  const avanzar = () => {
    if (ultima) router.replace('/login');
    else irA(indice + 1);
  };

  // El índice sale del scroll, no al revés: así deslizar con el dedo y pulsar
  // "Siguiente" acaban en el mismo sitio.
  const alDesplazar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pagina = Math.round(evento.nativeEvent.contentOffset.x / width);
    if (pagina !== indice) setIndice(pagina);
  };

  return (
    <View style={{ flex: 1, backgroundColor: superficie.app, paddingTop: insets.top }}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: espacio['5xl'], paddingTop: espacio.xl }}>
        <PressableScale onPress={() => router.replace('/login')} fuerza="fuerte" hitSlop={12}>
          <Texto variante="enlace" color={texto.terciario}>
            Saltar
          </Texto>
        </PressableScale>
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={alDesplazar}
        style={{ flex: 1 }}
      >
        {TARJETAS.map((tarjeta) => (
          <View
            key={tarjeta.titulo}
            style={{
              width,
              paddingHorizontal: espacio['5xl'],
              justifyContent: 'center',
              gap: espacio['7xl'] + 2,
            }}
          >
            <Ilustracion tarjeta={tarjeta} />
            <View style={{ gap: espacio.xl }}>
              <Texto variante="tituloXL" color={texto.fuerte}>
                {tarjeta.titulo}
              </Texto>
              <Texto variante="cuerpoL" color={texto.secundario}>
                {tarjeta.cuerpo}
              </Texto>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: espacio['5xl'],
          paddingTop: espacio['4xl'],
          paddingBottom: espacio['7xl'] + insets.bottom,
        }}
      >
        <View style={{ flexDirection: 'row', gap: espacio.sm }}>
          {TARJETAS.map((tarjeta, i) => (
            <Indicador key={tarjeta.titulo} activo={i === indice} />
          ))}
        </View>

        <Button
          titulo={ultima ? 'Empezar' : 'Siguiente'}
          onPress={avanzar}
          tamano="medio"
          icono="arrow_forward"
          iconoAlFinal
        />
      </View>
    </View>
  );
}
