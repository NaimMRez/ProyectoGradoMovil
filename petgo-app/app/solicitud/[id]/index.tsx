import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button, { BotonIcono } from '../../../src/components/Button';
import Card from '../../../src/components/Card';
import ErrorState from '../../../src/components/ErrorState';
import Icono from '../../../src/components/Icono';
import Mapa, { PinUbicacion, regionCercana } from '../../../src/components/Mapa';
import PhotoPlaceholder, { Avatar } from '../../../src/components/PhotoPlaceholder';
import PressableScale from '../../../src/components/PressableScale';
import SheetContacto from '../../../src/components/SheetContacto';
import { Skeleton } from '../../../src/components/Skeleton';
import StatusBadge from '../../../src/components/StatusBadge';
import Texto from '../../../src/components/Texto';
import { Divisor } from '../../../src/components/Pantalla';
import { useManifestarInteres, useSolicitud } from '../../../src/api/hooks';
import { USUARIOS } from '../../../src/api/mock/datos';
import { puedeManifestarInteres, tieneConversacion } from '../../../src/api/estados';
import { useUsuario } from '../../../src/estado/sesion';
import { useUbicacion } from '../../../src/estado/ubicacion';
import { borde, chrome, superficie, texto, verde } from '../../../src/theme/colors';
import { espacio, profundidad, radio } from '../../../src/theme/layout';

/** Recuadro de estadística sobre el degradado del héroe. */
function EstadisticaHeroe({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: chrome.sobreHeroe,
        borderRadius: radio.xl,
        paddingVertical: espacio.xl,
        paddingHorizontal: espacio.lg,
        gap: espacio.xs,
      }}
    >
      <Texto variante="etiquetaStat" color={texto.sobreHeroe}>
        {etiqueta}
      </Texto>
      <Texto variante="tituloTarjeta" color={texto.sobrePrimario} numberOfLines={1}>
        {valor}
      </Texto>
    </View>
  );
}

/** Par etiqueta/valor del pie de la tarjeta de ubicación. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={{ gap: espacio.xxs }}>
      <Texto variante="caption" color={texto.tenue}>
        {etiqueta}
      </Texto>
      <Texto variante="cuerpoS" color={texto.medio} style={{ fontFamily: 'DMSans_500Medium' }}>
        {valor}
      </Texto>
    </View>
  );
}

/**
 * Detalle de solicitud.
 *
 * Es la pantalla donde el rol se nota más: la tercera estadística del héroe, el
 * acceso a los interesados, el enlace al seguimiento y las acciones del pie
 * cambian por completo entre dueño y cuidador. **El rol no es un tema visual,
 * es una bifurcación de permisos.**
 */
export default function DetalleSolicitud() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const usuario = useUsuario();
  const insets = useSafeAreaInsets();

  const [sheetContacto, setSheetContacto] = useState(false);

  const esDueno = usuario.rol === 'dueno';

  const consulta = useSolicitud(id);
  // El dueño no se ofrece a nada, así que no se le pide la ubicación aquí.
  const ubicacion = useUbicacion();
  const interes = useManifestarInteres(esDueno ? null : ubicacion.punto);
  const solicitud = consulta.data;

  if (consulta.isError) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + espacio['7xl'] }}>
        <ErrorState clave="noEncontrada" onAccion={() => router.back()} />
      </View>
    );
  }

  if (!solicitud) {
    return (
      <View style={{ flex: 1, backgroundColor: superficie.app }}>
        <Skeleton
          alto={260 + insets.top}
          radioForma={0}
          style={{ borderBottomLeftRadius: radio.sheet, borderBottomRightRadius: radio.sheet }}
        />
        <View style={{ padding: espacio['4xl'], gap: espacio.xxl }}>
          <Skeleton alto={112} radioForma={radio.tarjeta} />
          <Skeleton alto={220} radioForma={radio.tarjeta} />
        </View>
      </View>
    );
  }

  const contraparteId = esDueno ? solicitud.cuidadorId : solicitud.duenoId;
  const contraparte = contraparteId
    ? (USUARIOS.find((u) => u.id === contraparteId) ?? null)
    : null;

  const puedeOfrecerse = !esDueno && puedeManifestarInteres(solicitud, usuario.id);

  return (
    <View style={{ flex: 1, backgroundColor: superficie.app }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + espacio['7xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Héroe ──────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[verde.heroe, verde.profundo]}
          start={{ x: 0.25, y: 0 }}
          end={{ x: 0.75, y: 1 }}
          style={{
            paddingTop: insets.top + espacio['4xl'],
            paddingHorizontal: espacio['4xl'],
            paddingBottom: espacio['5xl'],
            borderBottomLeftRadius: radio.sheet,
            borderBottomRightRadius: radio.sheet,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xl }}>
            <BotonIcono
              icono="arrow_back"
              lado={40}
              radioBoton={radio.md}
              fondo={chrome.sobreHeroe}
              colorBorde={null}
              color={texto.sobrePrimario}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityLabel="Volver"
            />
            <Texto variante="tituloTarjeta" color={texto.sobrePrimario} style={{ flex: 1 }}>
              {`Solicitud ${solicitud.codigo}`}
            </Texto>
            <StatusBadge
              estado={solicitud.estado}
              etiqueta={solicitud.estadoEtiqueta}
              sobreHeroe
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: espacio['3xl'],
              marginTop: espacio['5xl'],
            }}
          >
            <PhotoPlaceholder
              fotoUrl={solicitud.fotoUrl}
              nombre={solicitud.mascotas[0]?.nombre}
              tamano={74}
              radioFoto={radio.tarjeta}
              sobreHeroe
            />
            <View style={{ flex: 1 }}>
              <Texto variante="tituloS" color={texto.sobrePrimario} numberOfLines={2}>
                {solicitud.mascotasEtiqueta}
              </Texto>
              <Texto variante="cuerpoS" color={texto.sobreHeroe} style={{ marginTop: espacio.xs }}>
                {solicitud.heroeMetaEtiqueta}
              </Texto>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: espacio.lg, marginTop: espacio['5xl'] }}>
            <EstadisticaHeroe etiqueta="Pago" valor={solicitud.pagoEtiqueta} />
            <EstadisticaHeroe etiqueta="Duración" valor={solicitud.duracionEtiqueta} />
            {/* El cuidador necesita saber cuán lejos está; el dueño ya sabe
                cuántas mascotas tiene. */}
            {esDueno ? (
              <EstadisticaHeroe
                etiqueta="Mascotas"
                valor={String(solicitud.mascotas.length)}
              />
            ) : (
              <EstadisticaHeroe
                etiqueta="Distancia"
                valor={solicitud.distanciaEtiqueta ?? '—'}
              />
            )}
          </View>
        </LinearGradient>

        <View style={{ padding: espacio['4xl'], gap: espacio.xxl }}>
          {/* ── Interesados (sólo dueño, sólo publicada) ─────────────────── */}
          {esDueno && solicitud.estado === 'publicada' ? (
            <Card
              nivel="raised"
              tono="destacado"
              onPress={() => router.push(`/solicitud/${solicitud.id}/interesados`)}
              accessibilityLabel={`${solicitud.interesadosEtiqueta}. Elige quién hará el paseo`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: espacio.xxl,
                padding: espacio['3xl'],
              }}
            >
              <Icono nombre="group" tamano={22} color={verde.heroe} />
              <View style={{ flex: 1 }}>
                <Texto variante="tituloDenso" color={texto.fuerte}>
                  {solicitud.interesadosEtiqueta}
                </Texto>
                <Texto variante="meta" color={texto.secundario}>
                  Elige quién hará el paseo
                </Texto>
              </View>
              <Icono nombre="chevron_right" tamano={20} color={texto.terciario} />
            </Card>
          ) : null}

          {/* ── Ubicación ───────────────────────────────────────────────── */}
          <Card nivel="raised" style={{ padding: espacio['3xl'] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xl }}>
              <Icono nombre="place" tamano={20} color={verde.primario} />
              <View style={{ flex: 1 }}>
                <Texto variante="tituloDenso" color={texto.fuerte} numberOfLines={1}>
                  {solicitud.direccion}
                </Texto>
                <Texto variante="meta" color={texto.terciario}>
                  {solicitud.zona}
                </Texto>
              </View>
            </View>

            <View
              style={{
                height: 130,
                borderRadius: radio.lg,
                overflow: 'hidden',
                marginTop: espacio['3xl'],
              }}
            >
              <Mapa interactivo={false} region={regionCercana(solicitud.lat, solicitud.lng)}>
                <PinUbicacion latitude={solicitud.lat} longitude={solicitud.lng} />
              </Mapa>
            </View>

            <Divisor style={{ marginTop: espacio['3xl'] }} />

            <View style={{ flexDirection: 'row', gap: espacio['4xl'], marginTop: espacio['3xl'] }}>
              <Dato etiqueta="Fecha" valor={solicitud.fechaEtiqueta} />
              <Dato etiqueta="Mascotas" valor={solicitud.mascotasConteoEtiqueta} />
            </View>
          </Card>

          {/* ── Información adicional ───────────────────────────────────── */}
          {solicitud.notas ? (
            <Card nivel="flat" style={{ padding: espacio['3xl'], gap: espacio.md }}>
              <Texto variante="tituloDenso" color={texto.fuerte}>
                Información adicional
              </Texto>
              <Texto variante="cuerpo" color={texto.secundario} style={{ lineHeight: 22 }}>
                {solicitud.notas}
              </Texto>
            </Card>
          ) : null}

          {/* ── Contraparte ─────────────────────────────────────────────── */}
          {contraparte ? (
            <Card nivel="raised" style={{ padding: espacio['3xl'], gap: espacio['3xl'] }}>
              <Texto variante="tituloDenso" color={texto.fuerte}>
                {esDueno ? 'Cuidador asignado' : 'Dueño de la mascota'}
              </Texto>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxl }}>
                <Avatar nombre={contraparte.nombre} fotoUrl={contraparte.fotoUrl} tamano={52} />
                <View style={{ flex: 1 }}>
                  <Texto variante="nombreS" color={texto.principal} numberOfLines={1}>
                    {contraparte.nombre}
                  </Texto>
                  <Texto variante="meta" color={texto.terciario}>
                    {contraparte.metaEtiqueta}
                  </Texto>
                </View>
                <BotonIcono
                  icono="chat"
                  lado={44}
                  tamanoIcono={21}
                  radioBoton={radio.lg}
                  fondo={superficie.pildora}
                  colorBorde={null}
                  color={verde.heroe}
                  onPress={() => router.push(`/chat/${solicitud.id}`)}
                  accessibilityLabel={`Chatear con ${contraparte.primerNombre}`}
                />
              </View>
            </Card>
          ) : null}

          {/* ── Seguimiento ─────────────────────────────────────────────── */}
          {tieneConversacion(solicitud) ? (
            <Card
              nivel="flat"
              onPress={() => router.push(`/solicitud/${solicitud.id}/seguimiento`)}
              accessibilityLabel="Ver seguimiento del servicio"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: espacio.xxl,
                padding: espacio['3xl'],
              }}
            >
              <Icono nombre="timeline" tamano={21} color={verde.primario} />
              <Texto variante="tituloDenso" color={texto.fuerte} style={{ flex: 1 }}>
                Ver seguimiento del servicio
              </Texto>
              <Icono nombre="chevron_right" tamano={20} color={texto.terciario} />
            </Card>
          ) : null}

          {/* ── Acciones ────────────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', gap: espacio.lg, marginTop: espacio.md }}>
            {puedeOfrecerse ? (
              <>
                <Button
                  titulo="Estoy interesado"
                  completo
                  haptico="exito"
                  cargando={interes.isPending}
                  onPress={() => interes.mutate(solicitud.id)}
                  style={{ flex: 1 }}
                />
                <BotonIcono
                  icono="chat_bubble"
                  lado={56}
                  tamanoIcono={20}
                  radioBoton={radio.xl}
                  fondo={superficie.tarjeta}
                  colorBorde={borde.suave}
                  color={verde.texto}
                  onPress={() => setSheetContacto(true)}
                  accessibilityLabel="Contactar"
                  style={{ height: 56 }}
                />
              </>
            ) : contraparte ? (
              <Button
                titulo="Contactar"
                variante="secundario"
                icono="chat_bubble"
                completo
                onPress={() => setSheetContacto(true)}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>

      <SheetContacto
        abierto={sheetContacto}
        contraparte={contraparte}
        onCerrar={() => setSheetContacto(false)}
        onChat={() => {
          setSheetContacto(false);
          router.push(`/chat/${solicitud.id}`);
        }}
      />
    </View>
  );
}
