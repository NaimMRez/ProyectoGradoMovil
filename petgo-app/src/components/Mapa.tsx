import { forwardRef, type ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, type MapStyleElement, type Region } from 'react-native-maps';
import { superficie, texto, verde } from '../theme/colors';
import { profundidad, radio } from '../theme/layout';
import Icono from './Icono';
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

/**
 * Estilo del mapa en Android.
 *
 * Reproduce sobre Google Maps la base gris muy clara que antes venían a dar
 * unos tiles de terceros: sin color, sin puntos de interés y sin transporte,
 * para que lo único con color en pantalla sean los marcadores de PetGo.
 *
 * En iOS no se usa — Apple Maps no admite estilos — y su equivalente es
 * `mapType="mutedStandard"`, que es la base desaturada que trae el sistema.
 * Los dos grises no son idénticos, y esa diferencia es el precio de que cada
 * plataforma use su mapa nativo en vez de arrastrar un SDK ajeno.
 */
const ESTILO_ANDROID: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 20 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ saturation: -100 }, { lightness: -25 }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  // Los negocios y parques con nombre llenan el mapa de rótulos que compiten
  // con los marcadores. Las calles sí se quedan: son lo que orienta.
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f7f7f5' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f2ef' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e4e7e6' }] },
];

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
 * La base es gris muy clara y sin puntos de interés, para que lo único con
 * color en pantalla sean los marcadores de PetGo. Sobre el mapa de calles
 * habitual se perderían entre los rótulos.
 *
 * Cada plataforma llega a ese gris con lo suyo: iOS con `mutedStandard`, que
 * es la base desaturada de Apple, y Android con `ESTILO_ANDROID` sobre Google.
 *
 * **Antes ese gris lo daban unos tiles de CartoDB**, servidos por `UrlTile`
 * sobre una base desactivada. Se quitaron cuando CartoDB empezó a exigir una
 * API key y a estampar "API KEY REQUIRED" encima del mapa. Volver a un
 * proveedor de tiles significaría una tercera clave, una tercera cuenta y la
 * atribución de OpenStreetMap; el mapa nativo no pide nada de eso.
 *
 * **No se pasa `provider`**, y eso es deliberado. En Android sólo existe Google
 * Maps, así que el prop no cambiaría nada. En iOS, ponerlo en `PROVIDER_GOOGLE`
 * exigiría enlazar el SDK de Google Maps y llamar a `GMSServices.provideAPIKey`
 * en el AppDelegate; el plugin de Expo lo automatiza, pero durante el prebuild,
 * tocando archivos nativos. **Expo Go es un binario ya compilado**, así que el
 * mapa desaparecería del iPhone donde se desarrolla hasta hacer un development
 * build — además de pedir una segunda clave y engordar el binario para dar lo
 * que Apple ya da nativo. Sin el prop, iOS usa Apple Maps y no pide nada.
 *
 * Android sí pide clave: el `MapView` va sobre el SDK de Google y no monta sin
 * ella en el manifiesto. La pone el plugin `react-native-maps` desde `app.json`
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
      mapType={Platform.OS === 'android' ? 'standard' : 'mutedStandard'}
      customMapStyle={ESTILO_ANDROID}
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
      {children}
    </MapView>
  );
});

/**
 * Pin de ubicación: un punto verde con anillo blanco, anclado en su base.
 * Para los mapas de confirmación, donde sólo hay un punto.
 */
/** Lado del disco del punto de recogida. */
const LADO_MARCA = 36;

/**
 * El disco del punto de recogida, sin mapa alrededor.
 *
 * Existe suelto porque se dibuja de dos maneras. En un mapa que sólo se mira
 * va anclado a unas coordenadas, dentro de un `Marker`. En el mapa donde se
 * elige el punto **no puede ser un `Marker`**: ahí lo que se mueve es el mapa
 * y el punto se queda quieto en el centro, así que va encima como una vista
 * normal. Si cada sitio lo dibujara por su cuenta, el mismo punto se vería de
 * dos formas distintas en dos pantallas seguidas.
 *
 * Lleva una huella y no un punto liso porque aquí no hay ningún dato que
 * mostrar — es un sitio, no una cifra — y una huella dice qué se recoge. El
 * aro blanco es lo que lo despega del mapa: la lima sobre una base gris muy
 * clara se separa poco.
 */
export function MarcaPunto() {
  return (
    <View
      style={[
        {
          width: LADO_MARCA,
          height: LADO_MARCA,
          borderRadius: radio.pastilla,
          backgroundColor: verde.lima,
          borderWidth: 3,
          borderColor: superficie.tarjeta,
          alignItems: 'center',
          justifyContent: 'center',
        },
        profundidad.marcador,
      ]}
    >
      <Icono nombre="pets" tamano={18} color={texto.sobreAccion} />
    </View>
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
 * Marcador del mapa del cuidador: huella e importe en la misma pastilla.
 *
 * La huella sola no bastaba. Lo que el cuidador hace en este mapa es comparar
 * cuánto pagan sin tocar nada, y un alfiler genérico le obliga a abrir uno por
 * uno; llevando las dos cosas, la comparación se mantiene y el mapa se lee
 * como de PetGo y no como un mapa cualquiera con chinchetas.
 *
 * El activo se pinta de lima. Es el color de resaltado del sistema — el mismo
 * de la banda del nombre de la mascota — y contra la menta del resto se separa
 * por claridad, no sólo por tono.
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
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 6,
            paddingLeft: 7,
            paddingRight: 10,
            borderRadius: radio.pastilla,
            backgroundColor: activo ? verde.lima : verde.primario,
            // El borde blanco sólo en el activo: es lo que lo levanta del
            // racimo cuando hay varios marcadores pegados.
            borderWidth: activo ? 2 : 0,
            borderColor: superficie.tarjeta,
          },
          profundidad.marcador,
        ]}
      >
        {/* La tinta es la misma en los dos estados: menta y lima son dos
            claros, y el oscuro se lee de sobra sobre ambos. */}
        <Icono nombre="pets" tamano={14} color={texto.sobreAccion} />
        <Texto variante="botonS" color={texto.sobreAccion}>
          {etiqueta}
        </Texto>
      </View>
    </Marker>
  );
}

export default Mapa;
