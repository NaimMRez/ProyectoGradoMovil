import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import type MapView from 'react-native-maps';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgeContador, BotonIcono } from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';
import Icono from '../../src/components/Icono';
import Mapa, { MarcadorPrecio, regionDesde } from '../../src/components/Mapa';
import PressableScale from '../../src/components/PressableScale';
import SheetFiltros from '../../src/components/SheetFiltros';
import { ListaSkeleton, SkeletonSolicitud } from '../../src/components/Skeleton';
import TarjetaSolicitud from '../../src/components/TarjetaSolicitud';
import Texto from '../../src/components/Texto';
import { useNoLeidas, useSolicitudesCercanas } from '../../src/api/hooks';
import { toastFiltros } from '../../src/api/mock/adaptador';
import { plural } from '../../src/api/mock/formato';
import { FILTROS_POR_DEFECTO, type Filtros } from '../../src/api/tipos';
import { useUsuario } from '../../src/estado/sesion';
import { useUbicacion } from '../../src/estado/ubicacion';
import { origenDeBusqueda } from '../../src/utiles/geo';
import { useToast } from '../../src/estado/toast';
import { chrome, superficie, texto, verde } from '../../src/theme/colors';
import { espacio, medida, profundidad, radio } from '../../src/theme/layout';

/**
 * Inicio del cuidador: mapa arriba, lista abajo, en la misma vista.
 *
 * **El mapa ocupa el 55 % de la altura exacta** — decisión explícita del
 * cliente, y en porcentaje y no en píxeles precisamente para que se adapte a
 * cualquier alto de teléfono. La banda de la lista se solapa 16 px sobre el
 * mapa: ese solape es lo que dice "esto se puede subir" sin necesidad de un
 * gesto que aún no existe.
 */
export default function InicioCuidador() {
  const usuario = useUsuario();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { mostrar } = useToast();

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_POR_DEFECTO);
  const [sheetAbierto, setSheetAbierto] = useState(false);

  const ubicacion = useUbicacion();
  const cercanas = useSolicitudesCercanas(filtros, ubicacion.punto);
  const noLeidas = useNoLeidas();

  const mapa = useRef<MapView>(null);
  const { origen } = origenDeBusqueda(ubicacion.punto);
  const regionDeBusqueda = useMemo(
    () => regionDesde(origen),
    [origen.lat, origen.lng],
  );

  // `initialRegion` sólo se aplica al montar. La posición del GPS llega un
  // instante después, así que el mapa se lleva hasta allí con una panorámica
  // corta en vez de quedarse encuadrado en el centro del Cercado.
  useEffect(() => {
    if (ubicacion.estado !== 'lista') return;
    mapa.current?.animateToRegion(regionDeBusqueda, 450);
  }, [regionDeBusqueda, ubicacion.estado]);

  const cuantas = cercanas.data?.length ?? 0;
  const alturaMapa = height * 0.55;

  const aplicarFiltros = (nuevos: Filtros) => {
    setFiltros(nuevos);
    setSheetAbierto(false);
    mostrar(toastFiltros(cuantas));
  };

  return (
    <View style={{ flex: 1, backgroundColor: superficie.app }}>
      {/* ── Banda del mapa ───────────────────────────────────────────────── */}
      <View style={{ height: alturaMapa }}>
        <Mapa ref={mapa} conMiUbicacion region={regionDeBusqueda}>
          {cercanas.data?.map((solicitud) => (
            <MarcadorPrecio
              key={solicitud.id}
              latitude={solicitud.lat}
              longitude={solicitud.lng}
              etiqueta={solicitud.pagoEtiqueta}
              onPress={() => router.push(`/solicitud/${solicitud.id}`)}
            />
          ))}
        </Mapa>

        {/* Controles superiores. */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + espacio.xxl,
            left: espacio.xxl,
            right: espacio.xxl,
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.lg,
          }}
        >
          <View
            style={[
              {
                flex: 1,
                backgroundColor: chrome.sobreMapa,
                borderRadius: radio.xl,
                paddingVertical: espacio.xl,
                paddingHorizontal: espacio.xxl,
              },
              profundidad.nivel3,
            ]}
          >
            <Texto variante="caption" color={texto.suave}>
              Hola,
            </Texto>
            <Texto variante="seccion" color={texto.principal} numberOfLines={1}>
              {usuario.primerNombre}
            </Texto>
          </View>

          <BotonIcono
            icono="forum"
            lado={medida.botonMapa}
            colorBorde={null}
            sombra={profundidad.nivel3}
            onPress={() => router.push('/mensajes')}
            accessibilityLabel="Mensajes"
          />
          <BotonIcono
            icono="notifications"
            lado={medida.botonMapa}
            colorBorde={null}
            sombra={profundidad.nivel3}
            onPress={() => router.push('/notificaciones')}
            accessibilityLabel="Notificaciones"
          >
            {noLeidas.data ? <BadgeContador /> : null}
          </BotonIcono>
        </View>

        {/* Controles inferiores: recuento a la izquierda, acciones a la derecha. */}
        <View
          style={{
            position: 'absolute',
            bottom: espacio['5xl'] + espacio.md,
            left: espacio.xxl,
            right: espacio.xxl,
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.lg,
          }}
        >
          <View
            style={[
              {
                backgroundColor: chrome.sobreMapa,
                borderRadius: radio.md,
                paddingVertical: espacio.md,
                paddingHorizontal: espacio.xl,
              },
              profundidad.nivel3,
            ]}
          >
            <Texto variante="chipS" color={texto.fuerte}>
              {`${plural(cuantas, 'solicitud activa', 'solicitudes activas')} · ${filtros.distancia}`}
            </Texto>
          </View>

          <View style={{ flex: 1 }} />

          <PressableScale
            onPress={() => setSheetAbierto(true)}
            accessibilityRole="button"
            accessibilityLabel="Filtros"
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: espacio.sm,
                backgroundColor: superficie.tarjeta,
                borderRadius: radio.md,
                paddingVertical: espacio.lg,
                paddingHorizontal: espacio.xl + 1,
              },
              profundidad.nivel3,
            ]}
          >
            <Icono nombre="tune" tamano={16} color={texto.medio} />
            <Texto variante="botonS" color={texto.medio}>
              Filtros
            </Texto>
          </PressableScale>

          <PressableScale
            onPress={() => router.push('/(cuidador)/mapa')}
            accessibilityRole="button"
            accessibilityLabel="Abrir mapa completo"
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: espacio.sm,
                backgroundColor: verde.primario,
                borderRadius: radio.md,
                paddingVertical: espacio.lg,
                paddingHorizontal: espacio.xl + 1,
              },
              profundidad.nivel3,
            ]}
          >
            <Icono nombre="fullscreen" tamano={16} color={texto.sobrePrimario} />
            <Texto variante="botonS" color={texto.sobrePrimario}>
              Mapa
            </Texto>
          </PressableScale>
        </View>
      </View>

      {/* ── Banda de la lista ────────────────────────────────────────────── */}
      <View
        style={[
          {
            flex: 1,
            backgroundColor: superficie.app,
            borderTopLeftRadius: radio.xxl,
            borderTopRightRadius: radio.xxl,
            marginTop: -16,
            paddingTop: espacio.md,
          },
          profundidad.banda,
        ]}
      >
        <View
          style={{
            width: medida.asa.width,
            height: medida.asa.height,
            borderRadius: radio.pastilla,
            backgroundColor: chrome.asa,
            alignSelf: 'center',
            marginTop: espacio.md,
          }}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: espacio['4xl'],
            paddingTop: espacio['4xl'],
            paddingBottom: espacio['5xl'],
          }}
          showsVerticalScrollIndicator={false}
        >
          <Texto variante="seccion" color={texto.fuerte} style={{ marginBottom: espacio.xxl }}>
            Solicitudes cerca de ti
          </Texto>

          {ubicacion.estado === 'denegada' ? (
            <ErrorState
              clave="ubicacion"
              onAccion={ubicacion.abrirAjustes}
              textoAccion="Abrir ajustes"
            />
          ) : ubicacion.estado === 'error' ? (
            <ErrorState
              clave="ubicacion"
              onAccion={() => void ubicacion.reintentar()}
              textoAccion="Reintentar"
            />
          ) : cercanas.isPending || ubicacion.estado === 'pidiendo' ? (
            <ListaSkeleton cuantos={3} separacion={espacio.xl}>
              <SkeletonSolicitud />
            </ListaSkeleton>
          ) : cercanas.isError ? (
            <ErrorState clave="red" onAccion={() => void cercanas.refetch()} />
          ) : cuantas === 0 ? (
            <EmptyState
              clave="cercanas"
              onAccion={() => setFiltros({ ...filtros, distancia: '10 km' })}
            />
          ) : (
            <View style={{ gap: espacio.xl }}>
              {cercanas.data.map((solicitud, i) => (
                <TarjetaSolicitud
                  key={solicitud.id}
                  solicitud={solicitud}
                  variante="cuidador"
                  // La más cercana es la única elevada: es la que el cuidador
                  // va a mirar primero y el orden de la lista ya lo dice.
                  nivel={i === 0 ? 'elevated' : 'raised'}
                  onPress={() => router.push(`/solicitud/${solicitud.id}`)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <SheetFiltros
        abierto={sheetAbierto}
        filtros={filtros}
        cuantas={cuantas}
        onCerrar={() => setSheetAbierto(false)}
        onAplicar={aplicarFiltros}
      />
    </View>
  );
}
