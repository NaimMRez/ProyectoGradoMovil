import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import Button from './Button';
import Icono from './Icono';
import Mapa, { MarcaPunto, regionCercana } from './Mapa';
import Sheet from './Sheet';
import { Skeleton } from './Skeleton';
import Texto from './Texto';
import { useUbicacion } from '../estado/ubicacion';
import { ambar, borde, superficie, texto, verde } from '../theme/colors';
import { espacio, radio } from '../theme/layout';
import { CENTRO_CERCADO, estaEnElCercado, type Punto } from '../utiles/geo';

/** Alto del mapa de ajuste. Ocupa lo que se pueda sin comerse los botones. */
const ALTO_MAPA = 340;

/**
 * El mapa de ajuste, con el punto clavado en el centro.
 *
 * Va en su propio componente por una razón que no es de orden: `useUbicacion`
 * pide el permiso de ubicación en cuanto se monta, y un `Sheet` cerrado no
 * renderiza a sus hijos. Teniendo el hook aquí dentro, el permiso se pide
 * **cuando el dueño abre el ajuste**, no al entrar al asistente de publicación
 * tres pasos antes, que es donde no se entendería por qué se pide.
 *
 * **El mapa nunca se mueve por su cuenta.** Se monta ya centrado donde toca y a
 * partir de ahí sólo lo mueve el dedo. Es lo que permite tratar cada
 * `onRegionChangeComplete` como una decisión del usuario sin más comprobación:
 * la librería trae un `isGesture` para distinguirlo, pero sólo funciona sobre
 * Google Maps y en iOS usamos Apple Maps, así que aquí no sirve.
 */
function AjustePunto({
  valor,
  onMover,
}: {
  valor: Punto | null;
  onMover: (punto: Punto) => void;
}) {
  const ubicacion = useUbicacion();

  // Dónde arranca el mapa: el punto ya elegido si lo hay, si no la posición
  // del dispositivo, y si el permiso se negó o el GPS no respondió, el centro
  // del Cercado — que es donde vive todo el producto.
  const propuesto =
    valor ??
    (ubicacion.estado === 'pidiendo'
      ? null
      : (ubicacion.punto ?? CENTRO_CERCADO));

  // Se fija la primera vez que hay algo y no vuelve a cambiar. `initialRegion`
  // sólo se lee al montar, pero dejarlo variable invitaría a que alguien lo
  // convirtiera en `region` y creara un bucle con `onRegionChangeComplete`.
  const inicial = useRef<Punto | null>(null);
  if (inicial.current == null && propuesto != null) inicial.current = propuesto;

  if (inicial.current == null) {
    return (
      <View style={{ gap: espacio.lg }}>
        <Skeleton alto={ALTO_MAPA} radioForma={radio.xl} />
        <Texto variante="caption" color={texto.terciario}>
          Buscando tu ubicación…
        </Texto>
      </View>
    );
  }

  // Se mira el punto efectivo y no sólo el borrador: en iOS el mapa avisa de
  // su región nada más montarse y en Android puede tardar, así que fiarse del
  // borrador dejaría el aviso mudo justo al abrir — que es cuando más hace
  // falta si el GPS te ha situado fuera de la ciudad.
  const fuera = !estaEnElCercado(valor ?? inicial.current);

  return (
    <View style={{ gap: espacio.lg }}>
      <View
        style={{
          height: ALTO_MAPA,
          borderRadius: radio.xl,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: borde.input,
        }}
      >
        <Mapa
          region={regionCercana(inicial.current.lat, inicial.current.lng)}
          onRegionChangeComplete={(region) =>
            onMover({ lat: region.latitude, lng: region.longitude })
          }
        />

        {/* El punto no es un marcador: se queda quieto en el centro mientras
            el mapa se mueve debajo. `pointerEvents="none"` es lo que impide
            que se coma el arrastre. */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <MarcaPunto />
        </View>
      </View>

      {fuera ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.lg,
            backgroundColor: ambar.fondo,
            borderWidth: 1,
            borderColor: ambar.borde,
            borderRadius: radio.lg,
            paddingVertical: espacio.xl,
            paddingHorizontal: espacio.xxl,
          }}
        >
          <Icono nombre="error_outline" tamano={18} color={ambar.icono} />
          <Texto variante="meta" color={ambar.cuerpo} style={{ flex: 1 }}>
            Este punto queda fuera del Cercado. Los cuidadores buscan paseos
            dentro de la ciudad, así que probablemente nadie lo vea.
          </Texto>
        </View>
      ) : (
        <Texto variante="caption" color={texto.terciario}>
          Mueve el mapa hasta que el punto quede donde recogerán a tu mascota.
        </Texto>
      )}
    </View>
  );
}

/**
 * Selector del punto de recogida.
 *
 * Antes no existía: el asistente publicaba siempre las mismas coordenadas, las
 * de una dirección del seed, y el dueño sólo podía escribir la calle en un
 * campo de texto. La dirección decía una cosa y el mapa otra, y el cuidador
 * filtraba por distancia contra un punto que no era el del paseo.
 *
 * Va en un sheet a pantalla casi completa y no en el mapa de 190 pt del paso 3
 * por dos motivos. Uno es de precisión: en un recuadro pequeño no se coloca un
 * punto con el dedo. El otro es que ese mapa vive dentro de un `ScrollView` —
 * hacerlo arrastrable pondría a pelear el gesto del mapa con el de la
 * pantalla, y es exactamente la razón por la que estaba desactivado.
 *
 * La firma es la misma que la de `useSelectorFechaHora`, a propósito: los dos
 * campos del asistente que se eligen en un sheet se usan igual desde la
 * pantalla.
 */
export function useSelectorUbicacion(
  valor: Punto | null,
  onElegir: (punto: Punto) => void,
) {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Punto | null>(valor);

  const abrir = () => {
    setBorrador(valor);
    setAbierto(true);
  };

  const sheet = (
    <Sheet abierto={abierto} onCerrar={() => setAbierto(false)}>
      <Texto
        variante="tituloSheet"
        color={texto.principal}
        style={{ marginBottom: espacio['4xl'] }}
      >
        Punto de recogida
      </Texto>

      <AjustePunto valor={borrador} onMover={setBorrador} />

      <View style={{ gap: espacio.lg, marginTop: espacio['4xl'] }}>
        <Button
          titulo="Confirmar punto"
          completo
          haptico="ligero"
          disabled={borrador == null}
          onPress={() => {
            if (borrador == null) return;
            onElegir(borrador);
            setAbierto(false);
          }}
        />
        <Button
          titulo="Cancelar"
          variante="fantasma"
          completo
          onPress={() => setAbierto(false)}
        />
      </View>
    </Sheet>
  );

  return { abrir, sheet };
}

export default useSelectorUbicacion;
