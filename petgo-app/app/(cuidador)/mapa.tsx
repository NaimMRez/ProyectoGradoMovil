import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import type MapView from 'react-native-maps';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button, { BotonIcono } from '../../src/components/Button';
import Icono from '../../src/components/Icono';
import Mapa, { MarcadorPrecio, regionDesde } from '../../src/components/Mapa';
import PhotoPlaceholder from '../../src/components/PhotoPlaceholder';
import Sheet from '../../src/components/Sheet';
import SheetFiltros from '../../src/components/SheetFiltros';
import Texto from '../../src/components/Texto';
import { useSolicitudesCercanas } from '../../src/api/hooks';
import { toastFiltros } from '../../src/api/mock/adaptador';
import { plural } from '../../src/api/mock/formato';
import { FILTROS_POR_DEFECTO, type Filtros, type Solicitud } from '../../src/api/tipos';
import { useToast } from '../../src/estado/toast';
import { useUbicacion } from '../../src/estado/ubicacion';
import { origenDeBusqueda } from '../../src/utiles/geo';
import { chrome, superficie, texto, verde } from '../../src/theme/colors';
import { espacio, profundidad, radio } from '../../src/theme/layout';

/** Estadística del sheet de vista previa. */
function Estadistica({
  etiqueta,
  valor,
  destacada,
}: {
  etiqueta: string;
  valor: string;
  destacada?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: superficie.estadistica,
        borderRadius: radio.md,
        paddingVertical: espacio.xl,
        paddingHorizontal: espacio.lg,
        gap: espacio.xs,
      }}
    >
      <Texto variante="etiquetaStat" color={texto.terciario}>
        {etiqueta}
      </Texto>
      <Texto variante="cifra" color={destacada ? verde.texto : texto.fuerte}>
        {valor}
      </Texto>
    </View>
  );
}

/**
 * Mapa completo.
 *
 * Pulsar un marcador abre una vista previa **sin capa oscura detrás**: el mapa
 * tiene que seguir viéndose y siendo utilizable, porque la comparación entre
 * solicitudes es espacial. Los sheets de Filtros y Contacto sí llevan backdrop
 * — ésos sí piden atención exclusiva.
 */
export default function MapaCompleto() {
  const insets = useSafeAreaInsets();
  const { mostrar } = useToast();

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_POR_DEFECTO);
  const [sheetFiltros, setSheetFiltros] = useState(false);
  const [elegida, setElegida] = useState<Solicitud | null>(null);

  const ubicacion = useUbicacion();
  const cercanas = useSolicitudesCercanas(filtros, ubicacion.punto);
  const cuantas = cercanas.data?.length ?? 0;

  const mapa = useRef<MapView>(null);
  const { origen } = origenDeBusqueda(ubicacion.punto);
  // El mapa completo entra con un zoom mayor que el del inicio: aquí se explora.
  const regionDeBusqueda = useMemo(
    () => regionDesde(origen, 0.04),
    [origen.lat, origen.lng],
  );

  useEffect(() => {
    if (ubicacion.estado !== 'lista') return;
    mapa.current?.animateToRegion(regionDeBusqueda, 450);
  }, [regionDeBusqueda, ubicacion.estado]);

  return (
    <View style={{ flex: 1, backgroundColor: superficie.app }}>
      <Mapa ref={mapa} conMiUbicacion region={regionDeBusqueda}>
        {cercanas.data?.map((solicitud) => (
          <MarcadorPrecio
            key={solicitud.id}
            latitude={solicitud.lat}
            longitude={solicitud.lng}
            etiqueta={solicitud.pagoEtiqueta}
            activo={elegida?.id === solicitud.id}
            onPress={() => setElegida(solicitud)}
          />
        ))}
      </Mapa>

      {/* ── Barra de búsqueda ────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + espacio.xxl,
          left: espacio['3xl'],
          right: espacio['3xl'],
          flexDirection: 'row',
          alignItems: 'center',
          gap: espacio.lg,
        }}
      >
        <View
          style={[
            {
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: espacio.lg,
              backgroundColor: superficie.tarjeta,
              borderRadius: radio.xl,
              paddingVertical: espacio.xl,
              paddingHorizontal: espacio.xxl,
            },
            profundidad.nivel3,
          ]}
        >
          <Icono nombre="search" tamano={19} color={verde.primario} />
          <Texto variante="cuerpoS" color={texto.secundario} numberOfLines={1} style={{ flex: 1 }}>
            Cercado, Cochabamba
          </Texto>
        </View>

        <BotonIcono
          icono="tune"
          lado={46}
          tamanoIcono={21}
          radioBoton={radio.xl}
          colorBorde={null}
          sombra={profundidad.nivel3}
          onPress={() => setSheetFiltros(true)}
          accessibilityLabel="Filtros"
        />
      </View>

      {/* ── Chip de recuento ─────────────────────────────────────────────── */}
      <View
        style={[
          {
            position: 'absolute',
            top: insets.top + 74,
            left: espacio['3xl'],
            backgroundColor: chrome.sobreMapa,
            borderRadius: radio.sm + 1,
            paddingVertical: espacio.sm + 1,
            paddingHorizontal: espacio.xl,
          },
          profundidad.nivel3,
        ]}
      >
        <Texto variante="chipS" color={texto.fuerte}>
          {`${plural(cuantas, 'solicitud', 'solicitudes')} · ${filtros.distancia}`}
        </Texto>
      </View>

      {/* ── Vista previa del marcador ────────────────────────────────────── */}
      <Sheet
        abierto={Boolean(elegida)}
        onCerrar={() => setElegida(null)}
        sinBackdrop
        flotante
      >
        {elegida ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxl }}>
              <PhotoPlaceholder
                fotoUrl={elegida.fotoUrl}
                nombre={elegida.mascotas[0]?.nombre}
                tamano={50}
                radioFoto={radio.xl}
              />
              <View style={{ flex: 1 }}>
                <Texto variante="nombre" color={texto.principal} numberOfLines={1}>
                  {elegida.mascotasEtiqueta}
                </Texto>
                <Texto variante="meta" color={texto.terciario} numberOfLines={1}>
                  {`${elegida.zona} · a ${elegida.distanciaEtiqueta ?? '—'}`}
                </Texto>
              </View>
              <BotonIcono
                icono="close"
                lado={32}
                tamanoIcono={17}
                radioBoton={radio.sm}
                fondo={chrome.cerrar}
                colorBorde={null}
                color={texto.secundario}
                onPress={() => setElegida(null)}
                accessibilityLabel="Cerrar vista previa"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: espacio.md, marginTop: espacio['4xl'] }}>
              <Estadistica etiqueta="Pago" valor={elegida.pagoEtiqueta} destacada />
              <Estadistica etiqueta="Duración" valor={elegida.duracionEtiqueta} />
              <Estadistica etiqueta="Mascotas" valor={String(elegida.mascotas.length)} />
            </View>

            <Texto variante="cuerpoS" color={texto.secundario} style={{ marginTop: espacio['4xl'] }}>
              {elegida.fechaEtiqueta}
            </Texto>

            <Button
              titulo="Ver solicitud"
              completo
              onPress={() => {
                const id = elegida.id;
                setElegida(null);
                router.push(`/solicitud/${id}`);
              }}
              style={{ marginTop: espacio['4xl'] }}
            />
          </>
        ) : null}
      </Sheet>

      <SheetFiltros
        abierto={sheetFiltros}
        filtros={filtros}
        cuantas={cuantas}
        onCerrar={() => setSheetFiltros(false)}
        onAplicar={(nuevos) => {
          setFiltros(nuevos);
          setSheetFiltros(false);
          mostrar(toastFiltros(cuantas));
        }}
      />
    </View>
  );
}
