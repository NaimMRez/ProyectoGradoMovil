import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilaChips } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Pantalla from '../components/Pantalla';
import { ListaSkeleton, SkeletonSolicitud } from '../components/Skeleton';
import TarjetaSolicitud from '../components/TarjetaSolicitud';
import Texto from '../components/Texto';
import { useSolicitudes } from '../api/hooks';
import { FILTROS_ESTADO } from '../api/tipos';
import { plural } from '../api/mock/formato';
import { useUsuario } from '../estado/sesion';
import { texto } from '../theme/colors';
import { espacio } from '../theme/layout';

/**
 * Historial de solicitudes, filtrable por estado.
 *
 * El título y la fuente de datos cambian con el rol, pero el layout es el
 * mismo: el dueño ve **todas sus solicitudes**, el cuidador **sólo las que
 * aceptó**. Por eso vive en un componente compartido y no duplicado en las dos
 * carpetas de tabs.
 */
export function ListaSolicitudes() {
  const usuario = useUsuario();
  const insets = useSafeAreaInsets();
  const [chip, setChip] = useState<string>('Todas');

  const consulta = useSolicitudes(chip);

  const esDueno = usuario.rol === 'dueno';
  const titulo = esDueno ? 'Mis solicitudes' : 'Mis servicios';

  const subtitulo = consulta.data
    ? plural(consulta.data.length, 'solicitud', 'solicitudes')
    : ' ';

  return (
    <Pantalla conTabs contentContainerStyle={{ paddingTop: insets.top + espacio.xl }}>
      <Texto variante="tituloM" color={texto.principal}>
        {titulo}
      </Texto>
      <Texto variante="cuerpoS" color={texto.terciario} style={{ marginTop: espacio.xs }}>
        {subtitulo}
      </Texto>

      <View style={{ marginTop: espacio['4xl'] }}>
        <FilaChips opciones={FILTROS_ESTADO} valor={chip} onCambio={setChip} />
      </View>

      <View style={{ marginTop: espacio['4xl'] }}>
        {consulta.isPending ? (
          <ListaSkeleton cuantos={3} separacion={espacio.xl + 1}>
            <SkeletonSolicitud />
          </ListaSkeleton>
        ) : consulta.isError ? (
          <ErrorState clave="red" onAccion={() => void consulta.refetch()} />
        ) : consulta.data.length === 0 ? (
          chip === 'Todas' ? (
            <EmptyState
              clave={esDueno ? 'solicitudesDueno' : 'serviciosCuidador'}
              onAccion={() =>
                router.push(esDueno ? '/publicar' : '/(cuidador)/inicio')
              }
            />
          ) : (
            <EmptyState clave="filtros" onAccion={() => setChip('Todas')} textoAccion="Ver todas" />
          )
        ) : (
          <View style={{ gap: espacio.xl + 1 }}>
            {consulta.data.map((solicitud) => (
              <TarjetaSolicitud
                key={solicitud.id}
                solicitud={solicitud}
                variante="lista"
                onPress={() => router.push(`/solicitud/${solicitud.id}`)}
              />
            ))}
          </View>
        )}
      </View>
    </Pantalla>
  );
}

export default ListaSolicitudes;
