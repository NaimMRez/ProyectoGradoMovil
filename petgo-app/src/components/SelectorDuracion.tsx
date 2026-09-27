import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

import Texto from './Texto';
import { duracion as formatoDuracion } from '../api/mock/formato';
import { superficie, texto, verde } from '../theme/colors';
import { espacio, profundidad, radio } from '../theme/layout';
import { curva, duracion as duracionMotion } from '../theme/motion';
import {
  DURACION_MAX,
  DURACION_MIN,
  ajustarDuracion,
  topesDuracion,
} from '../utiles/agenda';

/** Lado del pulgar. Es también el área de golpeo, así que no baja de 28. */
const PULGAR = 28;

/**
 * Grosor de la pista.
 *
 * Diez puntos es más de lo que pediría una barra normal, y es a propósito: los
 * topes van **dentro** de la pista, así que tiene que caber un punto de cinco
 * con aire por arriba y por abajo.
 */
const PISTA = 10;

/** Lado de un tope de hora en punto y de uno intermedio. */
const TOPE_MAYOR = 5;
const TOPE_MENOR = 3;

/**
 * Barra de duración del paseo.
 *
 * Sustituye a cuatro chips fijos — 30, 45, 60 y 90 minutos — por un recorrido
 * continuo de topes entre media hora y tres. Con once valores, los chips
 * ocuparían tres filas y obligarían a leerlos todos para elegir uno; la barra
 * dice el rango de un vistazo y el valor está siempre a la vista arriba.
 *
 * **No tiene estados intermedios.** El dedo se mueve donde quiera, pero el
 * valor salta de tope en tope: el redondeo ocurre antes de que el número
 * exista, no al soltar. Eso es lo que hace que el número de arriba nunca
 * muestre algo que no se pueda enviar, y que cada tope se sienta como un
 * encaje — con su golpecito de selección, igual que al cambiar de tab.
 *
 * Los topes se dibujan dentro de la pista, más grandes en las medias horas que
 * en los cuartos, para poder localizar "una hora" sin contar puntos. Los dos
 * extremos no llevan punto: caerían medio fuera de una pista con las esquinas
 * redondeadas, y ya están rotulados con palabras debajo.
 *
 * El gesto cede el paso al desplazamiento vertical (`failOffsetY`), porque la
 * barra vive dentro del `ScrollView` del asistente de publicación: sin eso,
 * intentar bajar la pantalla con el dedo encima de la barra cambiaría la
 * duración.
 */
export function SelectorDuracion({
  valor,
  onCambio,
}: {
  valor: number;
  onCambio: (minutos: number) => void;
}) {
  const reducido = useReducedMotion();
  const topes = useMemo(topesDuracion, []);
  const ultimo = topes.length - 1;

  // El recorrido útil descuenta el pulgar: así su centro coincide con el primer
  // y el último tope y nunca asoma fuera de la barra.
  const [ancho, setAncho] = useState(0);
  const recorrido = Math.max(0, ancho - PULGAR);

  const indice = Math.max(0, topes.indexOf(ajustarDuracion(valor)));

  // Posición del pulgar en puntos, y el índice espejado en el hilo de la
  // interfaz para que el gesto sepa si el tope cambió sin cruzar a JavaScript.
  const x = useSharedValue(0);
  const indiceUI = useSharedValue(indice);

  useEffect(() => {
    indiceUI.set(indice);
    const objetivo = ultimo === 0 ? 0 : recorrido * (indice / ultimo);
    x.set(
      reducido
        ? objetivo
        : withTiming(objetivo, {
            duration: duracionMotion.presion,
            easing: curva.salida,
          }),
    );
  }, [indice, indiceUI, recorrido, reducido, ultimo, x]);

  const avisar = useCallback(
    (i: number) => {
      void Haptics.selectionAsync();
      onCambio(topes[i]);
    },
    [onCambio, topes],
  );

  const gesto = useMemo(() => {
    const aplicar = (px: number) => {
      'worklet';
      if (recorrido <= 0) return;
      // `px` viene relativo al contenedor; la pista empieza medio pulgar
      // después, que es donde está el centro del primer tope.
      const fraccion = (px - PULGAR / 2) / recorrido;
      const i = Math.min(ultimo, Math.max(0, Math.round(fraccion * ultimo)));
      if (i === indiceUI.get()) return;
      indiceUI.set(i);
      scheduleOnRN(avisar, i);
    };

    return Gesture.Race(
      Gesture.Pan()
        // Exige intención horizontal y se rinde ante la vertical: el asistente
        // de publicación es un `ScrollView` y tiene que poder desplazarse con
        // el dedo encima de la barra.
        .activeOffsetX([-8, 8])
        .failOffsetY([-16, 16])
        .onStart((evento) => aplicar(evento.x))
        .onUpdate((evento) => aplicar(evento.x)),
      // Tocar salta al tope más cercano. Con once topes, llegar al extremo
      // arrastrando es un viaje largo para algo que es un toque.
      Gesture.Tap().onEnd((evento) => aplicar(evento.x)),
    );
  }, [avisar, indiceUI, recorrido, ultimo]);

  const estiloPulgar = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }));

  // El relleno llega hasta el centro del pulgar, que medido desde el borde
  // izquierdo de la pista es exactamente su desplazamiento.
  const estiloRelleno = useAnimatedStyle(() => ({ width: x.get() }));

  const mover = (delta: number) => {
    const siguiente = Math.min(ultimo, Math.max(0, indice + delta));
    if (siguiente !== indice) avisar(siguiente);
  };

  return (
    <View>
      <Texto
        variante="cifraGrande"
        color={verde.texto}
        style={{ marginBottom: espacio.xl }}
      >
        {formatoDuracion(topes[indice])}
      </Texto>

      <GestureDetector gesture={gesto}>
        <View
          onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel="Duración del paseo"
          accessibilityValue={{
            min: DURACION_MIN,
            max: DURACION_MAX,
            now: topes[indice],
            text: formatoDuracion(topes[indice]),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'increment') mover(1);
            if (e.nativeEvent.actionName === 'decrement') mover(-1);
          }}
          // El alto del pulgar, no el de la pista: es la franja que responde al
          // dedo, y tiene que ser cómoda de agarrar.
          style={{ height: PULGAR, justifyContent: 'center' }}
        >
          <View
            style={{
              position: 'absolute',
              left: PULGAR / 2,
              right: PULGAR / 2,
              height: PISTA,
              borderRadius: radio.pastilla,
              backgroundColor: superficie.hundida,
              justifyContent: 'center',
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  height: PISTA,
                  borderRadius: radio.pastilla,
                  backgroundColor: verde.primario,
                },
                estiloRelleno,
              ]}
            />

            {/* Topes intermedios. Van por encima del relleno y del mismo color
                los haya cruzado o no: teñirlos según el lado obligaría a
                recolorearlos a media animación y se vería el salto. */}
            {topes.slice(1, ultimo).map((minutos, i) => {
              const lado = minutos % 60 === 0 ? TOPE_MAYOR : TOPE_MENOR;
              return (
                <View
                  key={minutos}
                  style={{
                    position: 'absolute',
                    left: (recorrido * (i + 1)) / ultimo - lado / 2,
                    width: lado,
                    height: lado,
                    borderRadius: radio.pastilla,
                    backgroundColor: texto.sobreAccion,
                  }}
                />
              );
            })}
          </View>

          <Animated.View
            style={[
              {
                width: PULGAR,
                height: PULGAR,
                borderRadius: radio.pastilla,
                backgroundColor: superficie.tarjeta,
                // El aro de menta es lo que separa el pulgar de las dos
                // superficies que tiene debajo: sobre el relleno es blanco
                // contra menta, y sobre la pista, blanco contra arena.
                borderWidth: 2,
                borderColor: verde.primario,
                ...profundidad.nivel1,
              },
              estiloPulgar,
            ]}
          />
        </View>
      </GestureDetector>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: espacio.md,
        }}
      >
        <Texto variante="caption" color={texto.terciario}>
          {formatoDuracion(DURACION_MIN)}
        </Texto>
        <Texto variante="caption" color={texto.terciario}>
          {formatoDuracion(DURACION_MAX)}
        </Texto>
      </View>
    </View>
  );
}

export default SelectorDuracion;
