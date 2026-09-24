import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgeContador, BotonIcono } from '../../src/components/Button';
import Card from '../../src/components/Card';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';
import Icono from '../../src/components/Icono';
import Pantalla, { EncabezadoSeccion } from '../../src/components/Pantalla';
import PhotoPlaceholder from '../../src/components/PhotoPlaceholder';
import PressableScale from '../../src/components/PressableScale';
import { ListaSkeleton, Skeleton, SkeletonSolicitud } from '../../src/components/Skeleton';
import TarjetaSolicitud from '../../src/components/TarjetaSolicitud';
import Texto from '../../src/components/Texto';
import { useMascotas, useNoLeidas, useSolicitudesActivas } from '../../src/api/hooks';
import { useUsuario } from '../../src/estado/sesion';
import { borde, superficie, texto, verde } from '../../src/theme/colors';
import { espacio, radio } from '../../src/theme/layout';
import { saludo } from '../../src/utiles/saludo';

/** Cuánto sobresale la ilustración por encima del borde del botón. */
const ASOMA_ILUSTRACION = 26;

/**
 * Hueco que el texto le deja a la ilustración dentro del botón.
 *
 * Es menor que la ilustración (128 pt) porque el recorte trae aire
 * transparente alrededor de la figura. Ajustarlo al ancho real dejaría al
 * título sin sitio: con 19 pt, "Publicar solicitud" pide unos 162 pt y en una
 * pantalla de 360 sólo quedan 170 con esta reserva.
 */
const ANCHO_RESERVA = 90;

/** Tarjeta del carrusel de mascotas. 118 px de ancho, foto arriba. */
function TarjetaMascotaMini({
  nombre,
  raza,
  fotoUrl,
  onPress,
}: {
  nombre: string;
  raza: string;
  fotoUrl: string | null;
  onPress: () => void;
}) {
  return (
    <Card nivel="raised" onPress={onPress} accessibilityLabel={`${nombre}, ${raza}`} style={{ width: 118, padding: espacio.xl }}>
      <PhotoPlaceholder
        fotoUrl={fotoUrl}
        nombre={nombre}
        tamano={94}
        alto={80}
        radioFoto={radio.md}
        style={{ width: '100%' }}
      />
      {/* El nombre y la raza van juntos en una banda de lima pegada al borde
          inferior de la tarjeta. Los márgenes negativos cancelan el relleno de
          la tarjeta para que la banda llegue a los tres bordes; sin ellos
          quedaría un bloque flotando con 12 pt de gris alrededor. */}
      <View
        style={{
          marginTop: espacio.xl,
          marginHorizontal: -espacio.xl,
          marginBottom: -espacio.xl,
          paddingHorizontal: espacio.lg,
          paddingVertical: espacio.lg,
          backgroundColor: verde.lima,
          borderBottomLeftRadius: radio.tarjeta,
          borderBottomRightRadius: radio.tarjeta,
        }}
      >
        <Texto variante="tituloDenso" color={texto.tarjeta} numberOfLines={1}>
          {nombre}
        </Texto>
        <Texto variante="caption" color={texto.terciario} numberOfLines={1}>
          {raza}
        </Texto>
      </View>
    </Card>
  );
}

export default function InicioDueno() {
  const usuario = useUsuario();
  const insets = useSafeAreaInsets();

  const mascotas = useMascotas();
  const activas = useSolicitudesActivas();
  const noLeidas = useNoLeidas();

  return (
    <Pantalla conTabs contentContainerStyle={{ paddingTop: insets.top + espacio.xl }}>
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.lg }}>
        <View style={{ flex: 1 }}>
          <Texto variante="cuerpoS" color={texto.terciario}>
            {saludo()}
          </Texto>
          <Texto variante="tituloM" color={texto.principal} numberOfLines={1}>
            {usuario.primerNombre}
          </Texto>
        </View>

        <BotonIcono
          icono="forum"
          onPress={() => router.push('/mensajes')}
          accessibilityLabel="Mensajes"
        />
        <BotonIcono
          icono="notifications"
          onPress={() => router.push('/notificaciones')}
          accessibilityLabel={
            noLeidas.data ? `Notificaciones, ${noLeidas.data} sin leer` : 'Notificaciones'
          }
        >
          {noLeidas.data ? <BadgeContador cuenta={noLeidas.data} /> : null}
        </BotonIcono>
      </View>

      {/* ── CTA de publicación ───────────────────────────────────────────── */}
      {/* La única superficie elevada de la pantalla: es la acción por la que
          el dueño abre la app. */}
      <PressableScale
        onPress={() => router.push('/publicar')}
        fuerza="suave"
        accessibilityRole="button"
        accessibilityLabel="Publicar solicitud. Tres pasos y listo"
        // El margen superior deja sitio a la parte de la ilustración que
        // sobresale; sin él se metería debajo de la cabecera.
        style={{ marginTop: espacio['5xl'] + ASOMA_ILUSTRACION, borderRadius: radio.pastilla }}
      >
        {/* Degradado horizontal con tokens propios, no con `verde.primario`:
            ese color lo comparten otros seis elementos de la app y este botón
            tiene que poder cambiar solo. La tinta va oscura, no blanca — sobre
            estos dos verdes el blanco no pasa de 2,1:1. */}
        <LinearGradient
          colors={[verde.publicarInicio, verde.publicarFin]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio['3xl'],
            borderRadius: radio.pastilla,
            padding: espacio['5xl'] - 2,
          }}
        >
          <View style={{ flex: 1 }}>
            <Texto
              variante="tituloTarjeta"
              color={texto.sobreAccion}
              style={{ fontSize: 19, lineHeight: 24 }}
            >
              Publicar solicitud
            </Texto>
            <Texto
              variante="meta"
              color="rgba(14,46,37,0.68)"
              style={{ fontSize: 14, lineHeight: 19 }}
            >
              Tres pasos y listo
            </Texto>
          </View>

          {/* Hueco reservado para la ilustración. Mide menos que ella a
              propósito: el recorte deja aire transparente alrededor de la
              figura, así que el texto puede acercarse sin tocarla. */}
          <View style={{ width: ANCHO_RESERVA }} />
        </LinearGradient>

        {/* La ilustración va fuera del degradado y posicionada de forma
            absoluta, no como un hijo más de la fila. Dentro no podría
            sobresalir por arriba: un hijo que desborda una vista con esquinas
            redondeadas queda recortado en iOS. Aquí no ocupa sitio en la
            disposición, así que puede ser más grande que su hueco. */}
        <Image
          source={require('../../assets/boton-publicar.png')}
          // La caja guarda la proporción del archivo (1874 × 1761); con otra,
          // `contain` la encogería y dejaría aire sin que se vea por qué.
          style={{
            position: 'absolute',
            right: espacio.lg,
            top: -ASOMA_ILUSTRACION,
            width: 128,
            height: 120,
          }}
          contentFit="contain"
          accessibilityLabel=""
        />
      </PressableScale>

      {/* ── Mis mascotas ─────────────────────────────────────────────────── */}
      <EncabezadoSeccion
        titulo="Mis mascotas"
        enlace={mascotas.data?.length ? 'Ver todas' : undefined}
        onEnlace={() => router.push('/(dueno)/mascotas')}
        style={{ marginTop: espacio['7xl'] }}
      />

      {mascotas.isPending ? (
        <View style={{ flexDirection: 'row', gap: espacio.xl, marginTop: espacio.xxl }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} ancho={118} alto={148} radioForma={radio.tarjeta} />
          ))}
        </View>
      ) : mascotas.isError ? (
        <ErrorState clave="red" enLinea onAccion={() => void mascotas.refetch()} style={{ marginTop: espacio.xxl }} />
      ) : mascotas.data.length === 0 ? (
        <Card
          nivel="flat"
          onPress={() => router.push('/mascota/registrar')}
          accessibilityLabel="Agregar nueva mascota"
          style={{
            marginTop: espacio.xxl,
            padding: espacio['4xl'],
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: espacio.lg,
            borderStyle: 'dashed',
            borderWidth: 1.5,
            borderColor: borde.discontinuo,
            backgroundColor: superficie.aviso,
          }}
        >
          <Icono nombre="add" tamano={20} color={verde.primario} />
          <Texto variante="boton" color={verde.texto}>
            Agregar tu primera mascota
          </Texto>
        </Card>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -espacio['4xl'], marginTop: espacio.xxl }}
          contentContainerStyle={{ paddingHorizontal: espacio['4xl'], gap: espacio.xl }}
        >
          {mascotas.data.map((mascota) => (
            <TarjetaMascotaMini
              key={mascota.id}
              nombre={mascota.nombre}
              raza={mascota.raza}
              fotoUrl={mascota.fotoUrl}
              onPress={() => router.push('/(dueno)/mascotas')}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Solicitudes activas ──────────────────────────────────────────── */}
      <EncabezadoSeccion
        titulo="Solicitudes activas"
        enlace="Mis solicitudes"
        onEnlace={() => router.push('/(dueno)/solicitudes')}
        style={{ marginTop: espacio['7xl'] }}
      />

      <View style={{ marginTop: espacio.xxl }}>
        {activas.isPending ? (
          <ListaSkeleton cuantos={2} separacion={espacio.xl}>
            <SkeletonSolicitud />
          </ListaSkeleton>
        ) : activas.isError ? (
          <ErrorState clave="red" onAccion={() => void activas.refetch()} />
        ) : activas.data.length === 0 ? (
          <EmptyState
            clave="solicitudesDueno"
            compacto
            onAccion={() => router.push('/publicar')}
          />
        ) : (
          <View style={{ gap: espacio.xl }}>
            {activas.data.map((solicitud) => (
              <TarjetaSolicitud
                key={solicitud.id}
                solicitud={solicitud}
                variante="dueno"
                onPress={() => router.push(`/solicitud/${solicitud.id}`)}
              />
            ))}
          </View>
        )}
      </View>
    </Pantalla>
  );
}
