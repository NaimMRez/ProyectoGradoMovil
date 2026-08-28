import { useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonIcono } from '../../src/components/Button';
import ErrorState from '../../src/components/ErrorState';
import Icono from '../../src/components/Icono';
import { Avatar } from '../../src/components/PhotoPlaceholder';
import PhotoPlaceholder from '../../src/components/PhotoPlaceholder';
import PressableScale from '../../src/components/PressableScale';
import { Skeleton } from '../../src/components/Skeleton';
import Texto from '../../src/components/Texto';
import { useConversacion, useEnviarMensaje, useMensajes } from '../../src/api/hooks';
import type { Mensaje } from '../../src/api/tipos';
import { useUsuario } from '../../src/estado/sesion';
import { borde, superficie, texto, verde } from '../../src/theme/colors';
import { espacio, radio } from '../../src/theme/layout';

/** Burbuja de mensaje. La esquina recortada apunta a quien lo escribió. */
function Burbuja({ mensaje, propio }: { mensaje: Mensaje; propio: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${propio ? 'Tú' : 'Contraparte'}, ${mensaje.horaEtiqueta}: ${mensaje.texto}`}
      style={{
        alignSelf: propio ? 'flex-end' : 'flex-start',
        maxWidth: '78%',
        backgroundColor: propio ? verde.primario : superficie.tarjeta,
        borderWidth: propio ? 0 : 1,
        borderColor: borde.sutil,
        borderTopLeftRadius: radio.xl + 2,
        borderTopRightRadius: radio.xl + 2,
        borderBottomLeftRadius: propio ? radio.xl + 2 : espacio.sm,
        borderBottomRightRadius: propio ? espacio.sm : radio.xl + 2,
        paddingVertical: espacio.xl - 1,
        paddingHorizontal: espacio.xxl,
      }}
    >
      <Texto
        variante="cuerpo"
        color={propio ? texto.sobrePrimario : texto.tarjeta}
        style={{ lineHeight: 21 }}
      >
        {mensaje.texto}
      </Texto>
      <Texto
        variante="caption"
        color={propio ? 'rgba(255,255,255,0.68)' : texto.atenuado}
        style={{ alignSelf: 'flex-end', marginTop: espacio.xs, fontSize: 10.5 }}
      >
        {mensaje.horaEtiqueta}
      </Texto>
    </View>
  );
}

/**
 * Conversación.
 *
 * **Es la única pantalla donde el teclado compite con el contenido.**
 *
 * El `KeyboardAvoidingView` de aquí es **el de
 * `react-native-keyboard-controller`, no el de React Native**. Tienen el mismo
 * nombre y hacen cosas distintas: el de React Native reacciona a un evento que
 * llega tarde y con una duración inventada, así que siempre va desfasado del
 * teclado; el de la librería lee la posición real del teclado fotograma a
 * fotograma en el hilo de UI.
 *
 * El brief daba por perdida esta librería, suponiendo que no venía en Expo Go.
 * Sí viene — desde el SDK 54 —, así que el compromiso que el brief aceptaba no
 * hacía falta.
 *
 * Con `behavior="padding"` la cabecera se queda arriba, el historial encoge y
 * la barra de escritura sube pegada al teclado.
 */
export default function Conversacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const usuario = useUsuario();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);

  const [borrador, setBorrador] = useState('');

  const conversacion = useConversacion(id);
  const mensajes = useMensajes(id);
  const enviar = useEnviarMensaje(id);

  const cuantos = mensajes.data?.length ?? 0;

  // Al llegar un mensaje, el historial baja al final. Sin `animated` en el
  // primer render: animar hasta abajo al abrir el chat es un barrido de toda
  // la conversación que nadie pidió ver.
  useEffect(() => {
    if (cuantos === 0) return;
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [cuantos]);

  const mandar = () => {
    const limpio = borrador.trim();
    // Un mensaje vacío o de sólo espacios no se envía.
    if (!limpio) return;
    setBorrador('');
    enviar.mutate(limpio);
  };

  if (conversacion.isError) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + espacio['7xl'] }}>
        <ErrorState clave="noEncontrada" onAccion={() => router.back()} />
      </View>
    );
  }

  const contraparte = conversacion.data?.contraparte;
  const vinculada = conversacion.data?.solicitud;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1, backgroundColor: superficie.app }}
    >
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: superficie.tarjeta,
          borderBottomWidth: 1,
          borderBottomColor: borde.divisor,
          paddingTop: insets.top + espacio.xxl,
          paddingHorizontal: espacio['3xl'],
          paddingBottom: espacio.xxl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xl }}>
          <BotonIcono
            icono="arrow_back"
            lado={38}
            tamanoIcono={19}
            radioBoton={radio.md}
            fondo={superficie.hundida}
            colorBorde={null}
            color={texto.medio}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityLabel="Volver"
          />

          {contraparte ? (
            <>
              <Avatar nombre={contraparte.nombre} fotoUrl={contraparte.fotoUrl} tamano={40} />
              <View style={{ flex: 1 }}>
                <Texto variante="nombre" color={texto.principal} numberOfLines={1}>
                  {contraparte.nombre}
                </Texto>
                <Texto variante="caption" color={texto.suave} numberOfLines={1}>
                  {contraparte.metaEtiqueta}
                </Texto>
              </View>
            </>
          ) : (
            <Skeleton alto={40} ancho="60%" radioForma={radio.md} />
          )}
        </View>

        {/* Tarjeta de la solicitud vinculada. Siempre visible, porque el hilo
            pertenece a la solicitud y no a la persona: sin esto, dos paseos con
            el mismo cuidador serían indistinguibles. */}
        {vinculada ? (
          <PressableScale
            onPress={() => router.push(`/solicitud/${vinculada.id}`)}
            fuerza="suave"
            accessibilityRole="button"
            accessibilityLabel={`Ver solicitud ${vinculada.codigo}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: espacio.xl,
              backgroundColor: superficie.aviso,
              borderWidth: 1,
              borderColor: borde.aviso,
              borderRadius: radio.lg,
              paddingVertical: espacio.xl - 1,
              paddingHorizontal: espacio.xl + 1,
              marginTop: espacio.xl,
            }}
          >
            <PhotoPlaceholder
              fotoUrl={vinculada.fotoUrl}
              nombre={vinculada.mascotasEtiqueta}
              tamano={32}
              radioFoto={radio.sm}
            />
            <View style={{ flex: 1 }}>
              <Texto variante="chipS" color={texto.fuerte} numberOfLines={1} style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12 }}>
                {`Solicitud ${vinculada.codigo} · ${vinculada.mascotasEtiqueta}`}
              </Texto>
              <Texto variante="caption" color={texto.secundario} numberOfLines={1}>
                {`${vinculada.fechaEtiqueta} · ${vinculada.duracionEtiqueta} · ${vinculada.pagoEtiqueta}`}
              </Texto>
            </View>
            <Icono nombre="chevron_right" tamano={18} color={texto.terciario} />
          </PressableScale>
        ) : null}
      </View>

      {/* ── Historial ────────────────────────────────────────────────────── */}
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: espacio['4xl'],
          paddingHorizontal: espacio['3xl'],
          gap: espacio.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {mensajes.isPending ? (
          <>
            <Skeleton alto={54} ancho="72%" radioForma={radio.xl} />
            <Skeleton alto={44} ancho="56%" radioForma={radio.xl} style={{ alignSelf: 'flex-end' }} />
            <Skeleton alto={64} ancho="68%" radioForma={radio.xl} />
          </>
        ) : (
          mensajes.data?.map((mensaje) => (
            <Burbuja
              key={mensaje.id}
              mensaje={mensaje}
              propio={mensaje.autorId === usuario.id}
            />
          ))
        )}
      </ScrollView>

      {/* ── Barra de escritura ───────────────────────────────────────────── */}
      <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: espacio.lg,
            backgroundColor: superficie.tarjeta,
            borderTopWidth: 1,
            borderTopColor: borde.divisor,
            paddingHorizontal: espacio.xxl,
            paddingTop: espacio.xl,
            paddingBottom: espacio.xl + insets.bottom,
          }}
        >
          <TextInput
            value={borrador}
            onChangeText={setBorrador}
            placeholder="Escribe un mensaje"
            placeholderTextColor={texto.atenuado}
            selectionColor={verde.primario}
            multiline
            onSubmitEditing={mandar}
            style={{
              flex: 1,
              maxHeight: 110,
              backgroundColor: superficie.hundida,
              borderWidth: 1,
              borderColor: borde.divisor,
              borderRadius: radio.pastilla,
              paddingVertical: espacio.xl + 1,
              paddingHorizontal: espacio['3xl'],
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              lineHeight: 20,
              color: texto.principal,
            }}
            accessibilityLabel="Mensaje"
          />

          <PressableScale
            onPress={mandar}
            disabled={!borrador.trim()}
            fuerza="fuerte"
            haptico="ligero"
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            style={{
              width: 46,
              height: 46,
              borderRadius: radio.pastilla,
              backgroundColor: verde.primario,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icono nombre="send" tamano={21} color={texto.sobrePrimario} />
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}
