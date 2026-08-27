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
 * Ojo con Android: aunque los tiles sean de CartoDB, `react-native-maps` va
 * sobre Google Maps y **necesita una API key** en `app.json`
 * (`android.config.googleMaps.apiKey`) para que el `MapView` monte.
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
export function PinUbicacion({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
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
        <Texto variante="botonS" color={texto.sobrePrimario}>
          {etiqueta}
        </Texto>
      </View>
    </Marker>
  );
}

export default Mapa;
