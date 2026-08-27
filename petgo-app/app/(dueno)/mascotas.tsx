import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../../src/components/Card';
import Chip from '../../src/components/Chip';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';
import Icono from '../../src/components/Icono';
import Pantalla from '../../src/components/Pantalla';
import PhotoPlaceholder from '../../src/components/PhotoPlaceholder';
import { BotonIcono } from '../../src/components/Button';
import { ListaSkeleton, SkeletonMascota } from '../../src/components/Skeleton';
import Texto from '../../src/components/Texto';
import { useMascotas } from '../../src/api/hooks';
import { plural } from '../../src/api/mock/formato';
import { useToast } from '../../src/estado/toast';
import type { Mascota } from '../../src/api/tipos';
import { borde, superficie, texto, verde } from '../../src/theme/colors';
import { espacio, radio } from '../../src/theme/layout';

function TarjetaMascota({ mascota, onEditar }: { mascota: Mascota; onEditar: () => void }) {
  return (
    <Card nivel="raised" radioTarjeta={radio.xxl} style={{ flexDirection: 'row', gap: espacio.xxl, padding: espacio.xxl }}>
      <PhotoPlaceholder
        fotoUrl={mascota.fotoUrl}
        nombre={mascota.nombre}
        tamano={92}
        radioFoto={radio.xl}
      />

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: espacio.md }}>
          <Texto variante="tituloTarjeta" color={texto.principal} style={{ flex: 1 }} numberOfLines={1}>
            {mascota.nombre}
          </Texto>
          <BotonIcono
            icono="edit"
            lado={32}
            tamanoIcono={17}
            radioBoton={radio.sm}
            fondo={superficie.hundida}
            colorBorde={borde.sutil}
            color={texto.secundario}
            onPress={onEditar}
            accessibilityLabel={`Editar ${mascota.nombre}`}
          />
        </View>

        <Texto variante="meta" color={texto.secundario} style={{ marginTop: espacio.xs }}>
          {mascota.resumenEtiqueta}
        </Texto>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: espacio.sm,
            marginTop: espacio.lg,
          }}
        >
          <Chip etiqueta={mascota.sexo} informativo />
          <Chip etiqueta={mascota.tamano} informativo />
          <Chip etiqueta={mascota.peso} informativo />
        </View>
      </View>
    </Card>
  );
}

export default function MisMascotas() {
  const insets = useSafeAreaInsets();
  const { mostrar } = useToast();
  const consulta = useMascotas();

  return (
    <Pantalla conTabs contentContainerStyle={{ paddingTop: insets.top + espacio.xl }}>
      <Texto variante="tituloM" color={texto.principal}>
        Mis mascotas
      </Texto>
      <Texto variante="cuerpoS" color={texto.terciario} style={{ marginTop: espacio.xs }}>
        {consulta.data
          ? plural(consulta.data.length, 'mascota registrada', 'mascotas registradas')
          : ' '}
      </Texto>

      <View style={{ marginTop: espacio['4xl'], gap: espacio.xxl }}>
        {consulta.isPending ? (
          <ListaSkeleton cuantos={2} separacion={espacio.xxl}>
            <SkeletonMascota />
          </ListaSkeleton>
        ) : consulta.isError ? (
          <ErrorState clave="red" onAccion={() => void consulta.refetch()} />
        ) : consulta.data.length === 0 ? (
          <EmptyState clave="mascotas" onAccion={() => router.push('/mascota/registrar')} />
        ) : (
          <>
            {consulta.data.map((mascota) => (
              <TarjetaMascota
                key={mascota.id}
                mascota={mascota}
                onEditar={() =>
                  mostrar('La edición de mascotas todavía no está disponible', { tono: 'aviso' })
                }
              />
            ))}

            <Card
              nivel="flat"
              onPress={() => router.push('/mascota/registrar')}
              accessibilityLabel="Agregar nueva mascota"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: espacio.lg,
                padding: espacio['4xl'],
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: borde.discontinuo,
                backgroundColor: superficie.aviso,
              }}
            >
              <Icono nombre="add" tamano={20} color={verde.primario} />
              <Texto variante="boton" color={verde.texto}>
                Agregar nueva mascota
              </Texto>
            </Card>
          </>
        )}
      </View>
    </Pantalla>
  );
}
