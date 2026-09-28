import { forwardRef, type ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, UrlTile, type Region } from 'react-native-maps';
import { superficie, texto, verde } from '../theme/colors';
import { profundidad, radio } from '../theme/layout';
import Texto from './Texto';

/** Centro del Cercado de Cochabamba. */
export const CENTRO_CERCADO = { latitude: -17.386, longitude: -66.158 };

/** Zoom 13 ≈ 0.06° de delta a esta latitud. */
export const REGION_CERCADO: Region = {
  ...CENTRO_CERCADO,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

/** Región centrada en un punto, con el zoom de exploración del cuidador. */
export function regionDesde(
  punto: { lat: number; lng: number },
  delta = 0.06,
): Region {
  return {
    latitude: punto.lat,
    longitude: punto.lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

/** Zoom 15, para los mapas de confirmación del asistente y del detalle. */
export function regionCercana(lat: number, lng: number): Region {
  return { latitude: lat, longitude: lng, latitudeDelta: 0.012, longitudeDelta: 0.012 };
}

export type MapaProps = {
  region?: Region;
  /**
   * Un mapa de **confirmación** (el del paso 3 del asistente, el del detalle)
   * no se explora: se mira. Desactivar el arrastre y el zoom evita que un
   * scroll de la pantalla se coma el gesto y mueva el mapa sin querer.
   */
  interactivo?: boolean;
  /**
   * Dibuja el punto azul del sistema con la posición del usuario. Sólo tiene
   * sentido en los mapas del cuidador: en los de confirmación no aporta nada y
   * además pide el permiso de ubicación en una pantalla que no lo necesita.
   */
  conMiUbicacion?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onRegionChangeComplete?: (region: Region) => void;
};

/**
 * Mapa base.
 *
 * Los tiles vienen de **CartoDB Positron**, no del estilo por defecto. Es una
 * base gris muy clara: sobre ella los marcadores verdes de PetGo destacan, y
 * sobre el mapa de calles habitual se pierden entre los rótulos.
 *
 * En Android se desactiva la base nativa con `mapType="none"` y quedan sólo
 * los tiles. En iOS ese modo no existe, así que los tiles se dibujan encima
 * del mapa de Apple — son opacos, de modo que el resultado es el mismo.
 *
 * **No se pasa `provider`**, y eso es deliberado. En Android sólo existe Google
 * Maps, así que el prop no cambia nada; en iOS, ponerlo en `PROVIDER_GOOGLE`
 * —como pide la documentación de Expo para quien quiera Google en iOS— nos
 * obligaría a una segunda clave y a habilitar el Maps SDK for iOS para no ver
 * nada, porque los tiles de CartoDB tapan la base. Sin el prop, iOS usa Apple
 * Maps, que no pide clave.
 *
 * Android sí la pide: aunque los tiles sean de CartoDB, el `MapView` va sobre
 * el SDK de Google y no monta sin una clave en el manifiesto. La pone el plugin
 * `react-native-maps` desde `app.json`
 * (`plugins.react-native-maps.androidGoogleMapsApiKey`). **En Expo Go no hace
 * falta** —Expo Go trae la suya—, sólo en un binario propio.
 */
export const Mapa = forwardRef<MapView, MapaProps>(function Mapa(
  {
    region = REGION_CERCADO,
    interactivo = true,
    conMiUbicacion = false,
    children,
    style,
    onRegionChangeComplete,
  },
  ref,
) {
  return (
    <MapView
      ref={ref}
      style={[{ flex: 1 }, style]}
      initialRegion={region}
      mapType={Platform.OS === 'android' ? 'none' : 'standard'}
      scrollEnabled={interactivo}
      zoomEnabled={interactivo}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      showsCompass={false}
      showsUserLocation={conMiUbicacion}
      showsMyLocationButton={false}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      <UrlTile
        urlTemplate="https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"
        maximumZ={19}
        flipY={false}
        zIndex={-1}
      />
      {children}
    </MapView>
  );
});

/**
 * Pin de ubicación: un punto verde con anillo blanco, anclado en su base.
 * Para los mapas de confirmación, donde sólo hay un punto.
 */
/**
 * El disco del punto de recogida, sin mapa alrededor.
 *
 * Existe suelto porque se dibuja de dos maneras. En un mapa que sólo se mira
 * va anclado a unas coordenadas, dentro de un `Marker`. En el mapa donde se
 * elige el punto **no puede ser un `Marker`**: ahí lo que se mueve es el mapa
 * y el punto se queda quieto en el centro, así que va encima como una vista
 * normal. Si cada sitio lo dibujara por su cuenta, el mismo punto se vería de
 * dos formas distintas en dos pantallas seguidas.
 */
export function MarcaPunto() {
  return (
    <View
      style={[
        {
          width: 22,
          height: 22,
          borderRadius: radio.pastilla,
          backgroundColor: verde.primario,
          borderWidth: 4,
          borderColor: superficie.tarjeta,
        },
        profundidad.marcador,
      ]}
    />
  );
}

export function PinUbicacion({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
      <MarcaPunto />
    </Marker>
  );
}

/**
 * Marcador de precio. Es lo que el cuidador compara de un vistazo, así que la
 * etiqueta lleva el importe y no un alfiler genérico.
 */
export function MarcadorPrecio({
  latitude,
  longitude,
  etiqueta,
  activo = false,
  onPress,
}: {
  latitude: number;
  longitude: number;
  /** Ya formateado por el backend: "Bs 45". */
  etiqueta: string;
  activo?: boolean;
  onPress?: () => void;
}) {
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={onPress}
      // Sin esto Android vuelve a rasterizar cada marcador en cada frame del
      // mapa y el arrastre baja a la mitad de fotogramas.
      tracksViewChanges={false}
    >
      <View
        style={[
          {
            paddingVertical: 6,
            paddingHorizontal: 9,
            borderRadius: radio.md,
            backgroundColor: activo ? verde.profundo : verde.primario,
            borderWidth: activo ? 2 : 0,
            borderColor: superficie.tarjeta,
          },
          profundidad.marcador,
        ]}
      >
        {/* El marcador cambia de fondo al activarse, así que la tinta también:
            blanco sobre el verde profundo, oscuro sobre la menta. */}
        <Texto variante="botonS" color={activo ? texto.sobrePrimario : texto.sobreAccion}>
          {etiqueta}
        </Texto>
      </View>
    </Marker>
  );
}

export default Mapa;
