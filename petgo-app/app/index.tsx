import { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { css, useReducedMotion } from 'react-native-reanimated';

import Icono from '../src/components/Icono';
import Texto from '../src/components/Texto';
import { inicioSegunRol, useSesion } from '../src/estado/sesion';
import { superficie, texto, verde } from '../src/theme/colors';
import { espacio, profundidad, radio } from '../src/theme/layout';

/**
 * Latido de los tres puntos de carga.
 *
 * Es el único adorno puramente decorativo de la app, y se lo puede permitir
 * porque el splash se ve una vez por sesión: en el reparto de frecuencias, lo
 * raro es donde vive el presupuesto de gracia.
 */
const pulso = css.keyframes({
  '0%': { opacity: 0.35, transform: [{ scale: 1 }] },
  '50%': { opacity: 1, transform: [{ scale: 1.35 }] },
  '100%': { opacity: 0.35, transform: [{ scale: 1 }] },
});

function Punto({ retraso }: { retraso: number }) {
  const reducido = useReducedMotion();

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: radio.pastilla,
          backgroundColor: superficie.tarjeta,
          opacity: reducido ? 0.7 : undefined,
        },
        !reducido && {
          animationName: pulso,
          animationDuration: 1200,
          animationDelay: retraso,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        },
      ]}
    />
  );
}

/**
 * Splash.
 *
 * Se queda mientras se lee la sesión guardada y sale solo: si hay usuario, a
 * la pantalla de inicio de su rol; si no, al onboarding. El botón "Continuar"
 * del prototipo no existe aquí — estaba sólo para poder navegar en el
 * navegador.
 */
export default function Splash() {
  const { usuario, cargando } = useSesion();

  useEffect(() => {
    if (cargando) return;

    // Un mínimo de permanencia: sin él, en un teléfono rápido el splash
    // parpadea durante 80 ms y se lee como un fallo de arranque.
    const salida = setTimeout(() => {
      router.replace(usuario ? inicioSegunRol(usuario.rol) : '/onboarding');
    }, 900);

    return () => clearTimeout(salida);
  }, [cargando, usuario]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient
        // 170°: casi vertical, con una desviación mínima a la derecha.
        colors={[verde.splashInicio, verde.splashFin]}
        start={{ x: 0.42, y: 0 }}
        end={{ x: 0.58, y: 1 }}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: espacio['6xl'] - 2,
        }}
      >
        <View
          style={[
            {
              width: 112,
              height: 112,
              borderRadius: radio.logo,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f4faf4',
            },
            profundidad.logo,
          ]}
        >
          <Icono nombre="pets" tamano={56} color={verde.heroe} />
        </View>

        <View style={{ alignItems: 'center' }}>
          <Texto variante="marca" color={texto.sobrePrimario}>
            PetGo
          </Texto>
          <Texto
            variante="cuerpo"
            color={texto.sobreHeroe}
            style={{ marginTop: espacio.lg }}
          >
            Paseos de confianza, cerca de ti
          </Texto>
        </View>

        <View style={{ flexDirection: 'row', gap: espacio.md }}>
          <Punto retraso={0} />
          <Punto retraso={200} />
          <Punto retraso={400} />
        </View>
      </LinearGradient>
    </View>
  );
}
