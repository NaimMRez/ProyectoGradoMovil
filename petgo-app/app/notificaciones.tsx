import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../src/components/Button';
import Card from '../src/components/Card';
import EmptyState from '../src/components/EmptyState';
import ErrorState from '../src/components/ErrorState';
import Icono from '../src/components/Icono';
import Pantalla from '../src/components/Pantalla';
import PressableScale from '../src/components/PressableScale';
import { ListaSkeleton, SkeletonNotificacion } from '../src/components/Skeleton';
import TabBar, { TABS_CUIDADOR, TABS_DUENO } from '../src/components/TabBar';
import Texto from '../src/components/Texto';
import {
  useConfirmarFinalizacion,
  useNotificaciones,
  useVaciarNotificaciones,
} from '../src/api/hooks';
import type { Notificacion } from '../src/api/tipos';
import { useUsuario } from '../src/estado/sesion';
import {
  intencion,
  notificacion as coloresNotificacion,
  superficie,
  texto,
} from '../src/theme/colors';
import { espacio, radio } from '../src/theme/layout';
import type { NombreIcono } from '../src/components/Icono';

const ICONO_POR_TIPO: Record<Notificacion['tipo'], NombreIcono> = {
  interes: 'person_add',
  confirmar: 'flag',
  iniciado: 'directions_walk',
  aceptado: 'how_to_reg',
  cancelada: 'cancel',
};

function TarjetaNotificacion({
  aviso,
  onAccion,
  onVer,
  confirmando,
}: {
  aviso: Notificacion;
  onAccion: () => void;
  onVer: () => void;
  confirmando: boolean;
}) {
  const piel = coloresNotificacion[aviso.tipo];
  const conAcciones = Boolean(aviso.accionEtiqueta);

  return (
    <Card
      // Una no leída se distingue por superficie, no sólo por el punto: el
      // punto es de 8 px y se pierde en una lista larga.
      nivel={aviso.leida ? 'flat' : 'raised'}
      tono={aviso.leida ? 'apagado' : 'blanco'}
      onPress={conAcciones ? undefined : onVer}
      accessibilityLabel={`${aviso.titulo}. ${aviso.cuerpo}`}
      style={{ padding: espacio['3xl'] }}
    >
      <View style={{ flexDirection: 'row', gap: espacio.xl }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radio.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: piel.fondo,
          }}
        >
          <Icono nombre={ICONO_POR_TIPO[aviso.tipo]} tamano={20} color={piel.icono} />
        </View>

        <View style={{ flex: 1, gap: espacio.xs }}>
          <Texto variante="tituloDenso" color={texto.tarjeta} style={{ lineHeight: 19 }}>
            {aviso.titulo}
          </Texto>
          <Texto variante="cuerpoS" color={texto.secundario} style={{ lineHeight: 20 }}>
            {aviso.cuerpo}
          </Texto>
          <Texto variante="caption" color={texto.atenuado} style={{ marginTop: espacio.xs }}>
            {aviso.horaEtiqueta}
          </Texto>
        </View>

        {!aviso.leida ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: radio.pastilla,
              backgroundColor: intencion.puntoNoLeida,
              marginTop: espacio.xs + 1,
            }}
          />
        ) : null}
      </View>

      {conAcciones ? (
        <View style={{ flexDirection: 'row', gap: espacio.lg, marginTop: espacio.xl + 1 }}>
          <Button
            titulo={aviso.accionEtiqueta!}
            tamano="pequeno"
            haptico="exito"
            cargando={confirmando}
            onPress={onAccion}
            style={{ flex: 1 }}
          />
          <Button titulo="Ver" variante="secundario" tamano="pequeno" onPress={onVer} />
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Bandeja de notificaciones.
 *
 * Es **el camino principal de la confirmación del dueño**: el botón
 * "Confirmar" de una notificación de tipo `confirmar` es lo que cierra el
 * servicio. El botón equivalente del seguimiento es el secundario.
 */
export default function Notificaciones() {
  const usuario = useUsuario();
  const insets = useSafeAreaInsets();

  const consulta = useNotificaciones();
  const vaciar = useVaciarNotificaciones();
  const confirmar = useConfirmarFinalizacion();

  const hayAlguna = (consulta.data?.length ?? 0) > 0;

  const abrir = (aviso: Notificacion) => {
    if (!aviso.solicitudId) return;
    if (aviso.tipo === 'interes') {
      router.push(`/solicitud/${aviso.solicitudId}/interesados`);
    } else {
      router.push(`/solicitud/${aviso.solicitudId}`);
    }
  };

  const ejecutar = (aviso: Notificacion) => {
    if (!aviso.solicitudId) return;
    if (aviso.tipo === 'confirmar') {
      confirmar.mutate(aviso.solicitudId);
      return;
    }
    abrir(aviso);
  };

  return (
    <View style={{ flex: 1, backgroundColor: superficie.app }}>
      <Pantalla conTabs contentContainerStyle={{ paddingTop: insets.top + espacio.xl }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: espacio.xl,
          }}
        >
          <Texto variante="tituloM" color={texto.principal}>
            Notificaciones
          </Texto>
          {hayAlguna ? (
            <PressableScale
              onPress={() => vaciar.mutate()}
              fuerza="fuerte"
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Vaciar notificaciones"
            >
              <Texto variante="enlace" color={texto.terciario}>
                Vaciar
              </Texto>
            </PressableScale>
          ) : null}
        </View>

        <View style={{ marginTop: espacio['4xl'], gap: espacio.xl - 1 }}>
          {consulta.isPending ? (
            <ListaSkeleton cuantos={4} separacion={espacio.xl - 1}>
              <SkeletonNotificacion />
            </ListaSkeleton>
          ) : consulta.isError ? (
            <ErrorState clave="red" onAccion={() => void consulta.refetch()} />
          ) : !hayAlguna ? (
            <EmptyState clave="notificaciones" />
          ) : (
            consulta.data.map((aviso) => (
              <TarjetaNotificacion
                key={aviso.id}
                aviso={aviso}
                confirmando={
                  confirmar.isPending && confirmar.variables === aviso.solicitudId
                }
                onAccion={() => ejecutar(aviso)}
                onVer={() => abrir(aviso)}
              />
            ))
          )}
        </View>
      </Pantalla>

      {/* El handoff mantiene la barra visible aquí aunque no sea un tab: se
          llega desde la campana, no desde la barra, y quitarla dejaría al
          usuario sin salida más que el gesto de volver atrás. */}
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
