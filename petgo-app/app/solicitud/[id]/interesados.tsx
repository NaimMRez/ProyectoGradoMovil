import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../../src/components/Button';
import SheetContacto from '../../../src/components/SheetContacto';
import Card from '../../../src/components/Card';
import EmptyState from '../../../src/components/EmptyState';
import ErrorState from '../../../src/components/ErrorState';
import Icono from '../../../src/components/Icono';
import Pantalla, { CabeceraDetalle } from '../../../src/components/Pantalla';
import { Avatar } from '../../../src/components/PhotoPlaceholder';
import { ListaSkeleton, Skeleton } from '../../../src/components/Skeleton';
import Texto from '../../../src/components/Texto';
import { useAceptarInteresado, useInteresados, useSolicitud } from '../../../src/api/hooks';
import type { Interesado } from '../../../src/api/tipos';
import { borde, superficie, texto, verde } from '../../../src/theme/colors';
import { espacio, radio } from '../../../src/theme/layout';

function TarjetaInteresado({
  interesado,
  onAceptar,
  onChatear,
  aceptando,
}: {
  interesado: Interesado;
  onAceptar: () => void;
  onChatear: () => void;
  aceptando: boolean;
}) {
  return (
    <Card nivel="raised" style={{ padding: espacio['3xl'], gap: espacio['3xl'] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxl }}>
        <Avatar
          nombre={interesado.cuidador.nombre}
          fotoUrl={interesado.cuidador.fotoUrl}
          tamano={54}
        />
        <View style={{ flex: 1, gap: espacio.xxs }}>
          <Texto variante="nombre" color={texto.principal} numberOfLines={1}>
            {interesado.cuidador.nombre}
          </Texto>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xs }}>
            <Icono nombre="near_me" tamano={14} color={texto.terciario} />
            <Texto variante="meta" color={texto.terciario} numberOfLines={1}>
              {interesado.distanciaEtiqueta}
            </Texto>
          </View>
        </View>
      </View>

      {/* El mensaje del cuidador es lo que de verdad distingue a uno de otro:
          no hay calificaciones, así que esto y la distancia son el criterio. */}
      <View
        style={{
          backgroundColor: superficie.burbuja,
          borderRadius: radio.lg,
          paddingVertical: espacio.xl,
          paddingHorizontal: espacio.xxl,
        }}
      >
        <Texto variante="cuerpoS" color={texto.secundario} style={{ lineHeight: 21 }}>
          {interesado.mensaje}
        </Texto>
      </View>

      <View style={{ flexDirection: 'row', gap: espacio.lg }}>
        <Button
          titulo="Aceptar"
          tamano="medio"
          haptico="exito"
          cargando={aceptando}
          onPress={onAceptar}
          style={{ flex: 1 }}
        />
        <Button
          titulo="Contactar"
          variante="secundario"
          tamano="medio"
          icono="chat"
          onPress={onChatear}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
}

/**
 * Cuidadores interesados.
 *
 * Cuando varios cuidadores se ofrecen, **el dueño elige** — decisión cerrada
 * del cliente. Aceptar a uno pone la solicitud en `aceptada`, le asigna el
 * cuidador y devuelve al detalle.
 */
export default function CuidadoresInteresados() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const solicitud = useSolicitud(id);
  const interesados = useInteresados(id);
  const aceptar = useAceptarInteresado();

  // Con quién está abierto el sheet de contacto. Antes de aceptar a alguien no
  // hay hilo de chat, así que aquí sólo se ofrece WhatsApp.
  const [contactando, setContactando] = useState<Interesado | null>(null);

  return (
    <Pantalla
      relleno="detalle"
      contentContainerStyle={{
        paddingTop: insets.top + espacio.xl,
        paddingBottom: insets.bottom + espacio['7xl'],
      }}
    >
      <CabeceraDetalle
        titulo="Cuidadores interesados"
        subtitulo={
          solicitud.data
            ? `Solicitud ${solicitud.data.codigo} · ${solicitud.data.mascotasEtiqueta}`
            : undefined
        }
        onAtras={() => router.back()}
      />

      <View style={{ marginTop: espacio['5xl'], gap: espacio.xl + 1 }}>
        {interesados.isPending ? (
          <ListaSkeleton cuantos={2} separacion={espacio.xl + 1}>
            <Skeleton alto={196} radioForma={radio.tarjeta} />
          </ListaSkeleton>
        ) : interesados.isError ? (
          <ErrorState clave="red" onAccion={() => void interesados.refetch()} />
        ) : interesados.data.length === 0 ? (
          <EmptyState clave="interesados" />
        ) : (
          interesados.data.map((interesado) => (
            <TarjetaInteresado
              key={interesado.id}
              interesado={interesado}
              aceptando={aceptar.isPending && aceptar.variables?.interesId === interesado.id}
              onAceptar={() =>
                aceptar.mutate(
                  { solicitudId: id, interesId: interesado.id },
                  { onSuccess: () => router.back() },
                )
              }
              onChatear={() => setContactando(interesado)}
            />
          ))
        )}
      </View>

      <SheetContacto
        abierto={Boolean(contactando)}
        contraparte={contactando?.cuidador ?? null}
        sinChatInterno
        aviso={
          contactando
            ? `Pregúntale lo que necesites por WhatsApp antes de decidir. El chat dentro de PetGo se abre cuando aceptes a ${contactando.cuidador.primerNombre} para este paseo.`
            : undefined
        }
        onCerrar={() => setContactando(null)}
        onChat={() => setContactando(null)}
      />

      {interesados.data && interesados.data.length > 0 ? (
        <Texto
          variante="caption"
          color={texto.suave}
          style={{
            marginTop: espacio['5xl'],
            textAlign: 'center',
            lineHeight: 18,
            paddingHorizontal: espacio['4xl'],
          }}
        >
          Al aceptar a un cuidador, la solicitud deja de estar publicada y los demás
          interesados dejan de verla.
        </Texto>
      ) : null}
    </Pantalla>
  );
}
