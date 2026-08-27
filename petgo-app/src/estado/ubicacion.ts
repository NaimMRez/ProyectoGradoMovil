import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import type { Punto } from '../utiles/geo';

/**
 * Estado del permiso y de la lectura de ubicación.
 *
 * - `pidiendo` — todavía no sabemos si hay permiso.
 * - `lista` — tenemos coordenadas.
 * - `denegada` — el usuario dijo que no. Se le puede llevar a los ajustes.
 * - `error` — hay permiso pero el GPS no devolvió nada (interior, modo avión).
 */
export type EstadoUbicacion = 'pidiendo' | 'lista' | 'denegada' | 'error';

export type Ubicacion = {
  estado: EstadoUbicacion;
  punto: Punto | null;
  /** Vuelve a pedir el permiso y a leer la posición. */
  reintentar: () => Promise<void>;
  /** Abre los ajustes del sistema, para un permiso denegado de forma permanente. */
  abrirAjustes: () => void;
};

/**
 * Ubicación del dispositivo.
 *
 * El lado cuidador entero depende de esto: sin coordenadas no hay consulta
 * geoespacial, no hay distancias y no hay orden de lista. Por eso el permiso
 * denegado no es un caso raro que se pueda ignorar — es un estado de primera
 * clase, con su propia pantalla de error y una salida a los ajustes.
 *
 * Se pide `Balanced` y no `Highest`: para decidir si un paseo está a 600 m o a
 * 3 km sobran unos metros de precisión, y la lectura de alta precisión tarda
 * bastante más y gasta bastante más batería.
 */
export function useUbicacion(): Ubicacion {
  const [estado, setEstado] = useState<EstadoUbicacion>('pidiendo');
  const [punto, setPunto] = useState<Punto | null>(null);

  const leer = useCallback(async () => {
    setEstado('pidiendo');
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        setEstado('denegada');
        return;
      }

      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setPunto({
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude,
      });
      setEstado('lista');
    } catch {
      // Hay permiso pero no hubo lectura: bajo techo, sin señal, modo avión.
      // Se distingue de `denegada` porque la salida no son los ajustes sino
      // reintentar.
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    void leer();
  }, [leer]);

  const abrirAjustes = useCallback(() => {
    if (Platform.OS === 'ios') void Linking.openURL('app-settings:');
    else void Linking.openSettings();
  }, []);

  return { estado, punto, reintentar: leer, abrirAjustes };
}
