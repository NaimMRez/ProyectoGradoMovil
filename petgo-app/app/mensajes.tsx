import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../src/components/Card';
import EmptyState from '../src/components/EmptyState';
import ErrorState from '../src/components/ErrorState';
import Pantalla from '../src/components/Pantalla';
import { Avatar } from '../src/components/PhotoPlaceholder';
import { ListaSkeleton, SkeletonConversacion } from '../src/components/Skeleton';
import TabBar, { TABS_CUIDADOR, TABS_DUENO } from '../src/components/TabBar';
import Texto from '../src/components/Texto';
import { useConversaciones } from '../src/api/hooks';
import { plural } from '../src/api/mock/formato';
import type { Conversacion } from '../src/api/tipos';
import { useUsuario } from '../src/estado/sesion';
import { superficie, texto, verde } from '../src/theme/colors';
import { espacio, radio } from '../src/theme/layout';

function FilaConversacion({
  conversacion,
  onPress,
}: {
  conversacion: Conversacion;
  onPress: () => void;
}) {
  return (
    <Card
      nivel="raised"
      onPress={onPress}
      accessibilityLabel={`Conversación con ${conversacion.contraparte.nombre}. ${conversacion.vinculoEtiqueta}`}
      style={{ flexDirection: 'row', gap: espacio.xl + 1, padding: 15 }}
    >
      <Avatar
        nombre={conversacion.contraparte.nombre}
        fotoUrl={conversacion.contraparte.fotoUrl}
        tamano={52}
      />

      <View style={{ flex: 1, gap: espacio.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: espacio.md }}>
          <Texto variante="nombreS" color={texto.principal} style={{ flex: 1 }} numberOfLines={1}>
            {conversacion.contraparte.nombre}
          </Texto>
          <Texto variante="caption" color={texto.atenuado}>
            {conversacion.horaEtiqueta}
          </Texto>
        </View>

        <Texto variante="cuerpoS" color={texto.secundario} numberOfLines={1}>
          {conversacion.ultimoMensaje}
        </Texto>

        {/* La conversación se ancla a la solicitud, no a la persona: dos
            paseos con el mismo cuidador son dos hilos distintos, y este chip
            es lo que dice de cuál de los dos se trata. */}
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: superficie.pildora,
            borderRadius: radio.xs - 1,
            paddingVertical: espacio.xxs + 1,
            paddingHorizontal: espacio.md - 1,
            marginTop: espacio.xxs,
          }}
        >
          <Texto variante="chipS" color={verde.texto} numberOfLines={1}>
            {conversacion.vinculoEtiqueta}
          </Texto>
        </View>
      </View>
    </Card>
  );
}

/** Lista de conversaciones activas. */
export default function Mensajes() {
  const usuario = useUsuario();
  const insets = useSafeAreaInsets();
  const consulta = useConversaciones();

  return (
    <View style={{ flex: 1, backgroundColor: superficie.app }}>
      <Pantalla conTabs contentContainerStyle={{ paddingTop: insets.top + espacio.xl }}>
        <Texto variante="tituloM" color={texto.principal}>
          Mensajes
        </Texto>
        <Texto variante="cuerpoS" color={texto.terciario} style={{ marginTop: espacio.xs }}>
          {consulta.data
            ? plural(consulta.data.length, 'conversación activa', 'conversaciones activas')
            : ' '}
        </Texto>

        <View style={{ marginTop: espacio['4xl'], gap: espacio.xl - 1 }}>
          {consulta.isPending ? (
            <ListaSkeleton cuantos={3} separacion={espacio.xl - 1}>
              <SkeletonConversacion />
            </ListaSkeleton>
          ) : consulta.isError ? (
            <ErrorState clave="red" onAccion={() => void consulta.refetch()} />
          ) : consulta.data.length === 0 ? (
            <EmptyState clave="conversaciones" />
          ) : (
            consulta.data.map((conversacion) => (
              <FilaConversacion
                key={conversacion.id}
                conversacion={conversacion}
                onPress={() => router.push(`/chat/${conversacion.id}`)}
              />
            ))
          )}
        </View>
      </Pantalla>

      <TabBar
        items={usuario.rol === 'dueno' ? TABS_DUENO : TABS_CUIDADOR}
        activo=""
        onSeleccionar={(clave) =>
          router.dismissTo(
            usuario.rol === 'dueno'
              ? (`/(dueno)/${clave}` as never)
              : (`/(cuidador)/${clave}` as never),
          )
        }
      />
    </View>
  );
}
