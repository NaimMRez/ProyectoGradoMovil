import { ScrollView, View } from 'react-native';
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
import { espacio, profundidad, radio } from '../../src/theme/layout';
import { saludo } from '../../src/utiles/saludo';

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
      <Texto variante="tituloDenso" color={texto.tarjeta} numberOfLines={1} style={{ marginTop: espacio.lg }}>
        {nombre}
      </Texto>
      <Texto variante="caption" color={texto.terciario} numberOfLines={1}>
        {raza}
      </Texto>
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
        style={[{ marginTop: espacio['5xl'], borderRadius: radio.xxl }, profundidad.heroe]}
      >
        <LinearGradient
          colors={[verde.heroe, verde.profundo]}
          start={{ x: 0.25, y: 0 }}
          end={{ x: 0.75, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio['3xl'],
            borderRadius: radio.xxl,
            padding: espacio['5xl'] - 2,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radio.xl,
              backgroundColor: 'rgba(255,255,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icono nombre="add" tamano={26} color={texto.sobrePrimario} />
          </View>

          <View style={{ flex: 1 }}>
            <Texto variante="tituloTarjeta" color={texto.sobrePrimario}>
              Publicar solicitud
            </Texto>
            <Texto variante="meta" color={texto.sobreHeroe}>
              Tres pasos y listo
            </Texto>
          </View>

          <Icono nombre="chevron_right" tamano={22} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
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
