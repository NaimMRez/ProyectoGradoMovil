import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../src/components/Button';
import Campo from '../src/components/Campo';
import Chip, { GrupoChips } from '../src/components/Chip';
import Icono from '../src/components/Icono';
import Mapa, { PinUbicacion, regionCercana } from '../src/components/Mapa';
import { CabeceraDetalle } from '../src/components/Pantalla';
import PhotoPlaceholder from '../src/components/PhotoPlaceholder';
import PressableScale from '../src/components/PressableScale';
import { Skeleton } from '../src/components/Skeleton';
import { useSelectorFechaHora } from '../src/components/SelectorFechaHora';
import Texto from '../src/components/Texto';
import EmptyState from '../src/components/EmptyState';
import { useCrearSolicitud, useMascotas } from '../src/api/hooks';
import { fechaHora, unirNombres } from '../src/api/mock/formato';
import { useToast } from '../src/estado/toast';
import { borde, superficie, texto, verde } from '../src/theme/colors';
import { espacio, radio } from '../src/theme/layout';
import { curvaCSS, duracion as duracionMotion } from '../src/theme/motion';

const PASOS = ['Mascotas', 'Cuándo y cuánto', 'Ubicación'] as const;
const DURACIONES = ['30 min', '45 min', '60 min', '90 min'];
const PAGO_SUGERIDO = 40;

/** Hoy o dentro de N días, a una hora concreta. */
function enDias(dias: number, hh: number, mm: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/**
 * Fecha propuesta al abrir el asistente: hoy a las 17:30.
 *
 * El formulario arranca con una fecha puesta y no en blanco, porque el
 * selector no admite fechas pasadas y así el paso es válido desde el primer
 * momento. El usuario la cambia con el único botón que hay.
 */
const FECHA_INICIAL = () => enDias(0, 17, 30);

/** Punto de recogida por defecto: la dirección de la dueña del seed. */
const UBICACION_INICIAL = {
  direccion: 'Av. América #1204, Sarco',
  zona: 'Sarco',
  lat: -17.383,
  lng: -66.175,
};

/** Barra de progreso: tres segmentos que se van tiñendo. */
function Progreso({ paso }: { paso: number }) {
  const reducido = useReducedMotion();

  return (
    <View style={{ flexDirection: 'row', gap: espacio.sm, marginTop: espacio['4xl'] }}>
      {PASOS.map((etiqueta, i) => (
        <Animated.View
          key={etiqueta}
          style={[
            {
              flex: 1,
              height: 4,
              borderRadius: radio.pastilla,
              backgroundColor: i <= paso ? verde.primario : borde.suave,
            },
            // Sólo cambia el color: la barra no crece ni se desliza. Animar el
            // ancho de tres elementos en flujo reordenaría la fila entera cada
            // frame para ganar nada.
            !reducido && {
              transitionProperty: 'backgroundColor',
              transitionDuration: duracionMotion.progreso,
              transitionTimingFunction: curvaCSS.salida,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Pregunta que abre cada paso. */
function Pregunta({ titulo, ayuda }: { titulo: string; ayuda?: string }) {
  return (
    <View style={{ gap: espacio.sm }}>
      <Texto variante="tituloTarjeta" color={texto.principal} style={{ lineHeight: 23 }}>
        {titulo}
      </Texto>
      {ayuda ? (
        <Texto variante="cuerpoS" color={texto.terciario}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

function Etiqueta({ children }: { children: string }) {
  return (
    <Texto variante="etiqueta" color={texto.etiqueta} style={{ marginBottom: espacio.lg }}>
      {children}
    </Texto>
  );
}

/**
 * Asistente de publicación en tres pasos.
 *
 * Es el flujo prioritario del dueño y una decisión cerrada del cliente:
 * Mascotas → Cuándo y cuánto → Ubicación, con resumen antes de publicar. Cada
 * paso valida lo suyo y no deja avanzar sin ello.
 */
export default function Publicar() {
  const insets = useSafeAreaInsets();
  const { mostrar } = useToast();
  const mascotas = useMascotas();
  const crear = useCrearSolicitud();

  const [paso, setPaso] = useState(0);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [fecha, setFecha] = useState<Date>(FECHA_INICIAL);
  const [duracion, setDuracion] = useState('60 min');
  const [pago, setPago] = useState('');
  const [direccion, setDireccion] = useState(UBICACION_INICIAL.direccion);
  const [notas, setNotas] = useState('');

  const selectorFecha = useSelectorFechaHora(fecha, setFecha);
  const cuandoEtiqueta = fechaHora(fecha);

  const nombresElegidos = useMemo(
    () =>
      (mascotas.data ?? [])
        .filter((m) => elegidas.includes(m.id))
        .map((m) => m.nombre),
    [elegidas, mascotas.data],
  );

  const alternar = (id: string) =>
    setElegidas((previas) =>
      previas.includes(id) ? previas.filter((x) => x !== id) : [...previas, id],
    );

  const publicar = () => {
    const monto = Number.parseInt(pago, 10);
    const minutos = Number.parseInt(duracion, 10);

    crear.mutate(
      {
        mascotaIds: elegidas,
        fechaHora: fecha,
        duracionMin: minutos,
        pagoBs: monto,
        direccion,
        zona: UBICACION_INICIAL.zona,
        lat: UBICACION_INICIAL.lat,
        lng: UBICACION_INICIAL.lng,
        notas,
      },
      {
        onSuccess: () => {
          router.dismissTo('/(dueno)/solicitudes');
        },
      },
    );
  };

  const avanzar = () => {
    if (paso === 0) {
      if (elegidas.length === 0) {
        mostrar('Selecciona al menos una mascota', { tono: 'aviso', sobreTabs: false });
        return;
      }
      setPaso(1);
      return;
    }

    if (paso === 1) {
      if (!pago.trim() || Number.parseInt(pago, 10) <= 0) {
        mostrar('Indica cuánto ofreces por el paseo', { tono: 'aviso', sobreTabs: false });
        return;
      }
      setPaso(2);
      return;
    }

    publicar();
  };

  const retroceder = () => {
    if (paso === 0) router.back();
    else setPaso(paso - 1);
  };

  const avisoRecuento =
    elegidas.length === 0
      ? 'Selecciona al menos una mascota'
      : `${elegidas.length === 1 ? '1 mascota' : `${elegidas.length} mascotas`} en este paseo`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: superficie.app }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          paddingHorizontal: espacio['4xl'],
          paddingTop: insets.top + espacio.xl,
        }}
      >
        <CabeceraDetalle
          titulo={PASOS[paso]}
          subtitulo={`Paso ${paso + 1} de 3`}
          iconoAtras={paso === 0 ? 'close' : 'arrow_back'}
          onAtras={retroceder}
        />
        <Progreso paso={paso} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: espacio['4xl'],
          paddingTop: espacio['6xl'],
          paddingBottom: espacio['5xl'],
          gap: espacio['6xl'],
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Paso 1 · Mascotas ──────────────────────────────────────────── */}
        {paso === 0 ? (
          <>
            <Pregunta
              titulo="¿Qué mascotas van al paseo?"
              ayuda="Puedes elegir más de una."
            />

            {mascotas.isPending ? (
              <View style={{ flexDirection: 'row', gap: espacio.lg }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} alto={124} radioForma={radio.xl} style={{ flex: 1 }} />
                ))}
              </View>
            ) : mascotas.data?.length === 0 ? (
              <EmptyState
                clave="mascotas"
                compacto
                onAccion={() => router.replace('/mascota/registrar')}
              />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.lg }}>
                {mascotas.data?.map((mascota) => {
                  const activa = elegidas.includes(mascota.id);
                  return (
                    <PressableScale
                      key={mascota.id}
                      onPress={() => alternar(mascota.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: activa }}
                      accessibilityLabel={mascota.nombre}
                      style={{
                        flexGrow: 1,
                        flexBasis: '30%',
                        alignItems: 'center',
                        gap: espacio.md,
                        paddingVertical: espacio.xxl,
                        paddingHorizontal: espacio.md,
                        borderRadius: radio.xl + 2,
                        borderWidth: 1.5,
                        backgroundColor: activa ? superficie.seleccion : superficie.tarjeta,
                        borderColor: activa ? verde.primario : borde.suave,
                      }}
                    >
                      <PhotoPlaceholder
                        fotoUrl={mascota.fotoUrl}
                        nombre={mascota.nombre}
                        tamano={52}
                        circulo
                      />
                      <Texto
                        variante="tituloDenso"
                        color={activa ? verde.profundo : texto.medio}
                        numberOfLines={1}
                      >
                        {mascota.nombre}
                      </Texto>
                      <Texto variante="caption" color={texto.suave}>
                        {mascota.tamano}
                      </Texto>
                    </PressableScale>
                  );
                })}
              </View>
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: espacio.md,
                backgroundColor: superficie.aviso,
                borderWidth: 1,
                borderColor: borde.aviso,
                borderRadius: radio.lg,
                paddingVertical: espacio.xl + 1,
                paddingHorizontal: espacio.xxl,
              }}
            >
              <Icono nombre="pets" tamano={18} color={verde.primario} />
              <Texto variante="chip" color={texto.fuerte}>
                {avisoRecuento}
              </Texto>
            </View>
          </>
        ) : null}

        {/* ── Paso 2 · Cuándo y cuánto ───────────────────────────────────── */}
        {paso === 1 ? (
          <>
            <Pregunta titulo="¿Cuándo y por cuánto?" />

            <View>
              <Etiqueta>Fecha y hora</Etiqueta>
              {/* Un solo control. Muestra la fecha elegida en vez de un rótulo
                  fijo: es el único sitio donde se ve qué día quedó puesto, y un
                  botón que dijera siempre "Elegir fecha" escondería el dato que
                  el usuario acaba de decidir. */}
              <Chip
                etiqueta={cuandoEtiqueta}
                icono="event"
                activo
                onPress={selectorFecha.abrir}
              />
            </View>

            <View>
              <Etiqueta>Duración del paseo</Etiqueta>
              <GrupoChips opciones={DURACIONES} valor={duracion} onCambio={setDuracion} />
            </View>

            <View>
              <Etiqueta>Remuneración ofrecida</Etiqueta>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: espacio.xl,
                  backgroundColor: superficie.tarjeta,
                  borderWidth: 1,
                  borderColor: borde.input,
                  borderRadius: radio.xl,
                  paddingVertical: espacio.xxl,
                  paddingHorizontal: espacio['3xl'],
                }}
              >
                <Texto variante="nombre" color={verde.texto}>
                  Bs
                </Texto>
                <TextInput
                  value={pago}
                  // El campo sólo admite dígitos: un "45,50" no tiene sentido
                  // para un monto que se paga en efectivo y en mano.
                  onChangeText={(v) => setPago(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={texto.inactivo}
                  selectionColor={verde.primario}
                  style={{
                    flex: 1,
                    fontFamily: 'FamiljenGrotesk_600SemiBold',
                    fontSize: 21,
                    color: texto.principal,
                    padding: 0,
                  }}
                  accessibilityLabel="Monto ofrecido en bolivianos"
                />
                <Texto variante="meta" color={texto.tenue}>
                  {`Sugerido Bs ${PAGO_SUGERIDO}`}
                </Texto>
              </View>

              <Texto
                variante="caption"
                color={texto.suave}
                style={{ marginTop: espacio.lg, lineHeight: 18 }}
              >
                El pago se coordina y se entrega fuera de la app.
              </Texto>
            </View>
          </>
        ) : null}

        {/* ── Paso 3 · Ubicación ─────────────────────────────────────────── */}
        {paso === 2 ? (
          <>
            <Pregunta
              titulo={`¿Dónde recogen a ${nombresElegidos.length ? unirNombres(nombresElegidos) : 'tu mascota'}?`}
            />

            <View
              style={{
                backgroundColor: superficie.tarjeta,
                borderWidth: 1,
                borderColor: borde.input,
                borderRadius: radio.xl + 2,
                overflow: 'hidden',
              }}
            >
              {/* Mapa de confirmación: se mira, no se explora. Sin arrastre ni
                  zoom, el scroll de la pantalla nunca se lo come. */}
              <View style={{ height: 190 }}>
                <Mapa
                  interactivo={false}
                  region={regionCercana(UBICACION_INICIAL.lat, UBICACION_INICIAL.lng)}
                >
                  <PinUbicacion
                    latitude={UBICACION_INICIAL.lat}
                    longitude={UBICACION_INICIAL.lng}
                  />
                </Mapa>
              </View>

              <TextInput
                value={direccion}
                onChangeText={setDireccion}
                placeholder="Dirección del punto de recogida"
                placeholderTextColor={texto.atenuado}
                selectionColor={verde.primario}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: borde.sutil,
                  paddingVertical: espacio.xxl,
                  paddingHorizontal: espacio['3xl'],
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: texto.principal,
                }}
                accessibilityLabel="Dirección del punto de recogida"
              />
            </View>

            <Campo
              etiqueta="Información adicional"
              value={notas}
              onChangeText={setNotas}
              placeholder="Ej. Rocco jala al inicio; llevar bolsas. Timbre 2B."
              filas={3}
            />

            {/* ── Resumen ────────────────────────────────────────────────── */}
            <View
              style={{
                backgroundColor: superficie.aviso,
                borderWidth: 1,
                borderColor: borde.aviso,
                borderRadius: radio.xl + 2,
                padding: espacio['3xl'],
              }}
            >
              <Texto variante="etiquetaStat" color={verde.texto}>
                Resumen
              </Texto>

              {[
                ['Mascotas', unirNombres(nombresElegidos) || '—'],
                ['Fecha', cuandoEtiqueta],
                ['Duración', duracion],
                ['Remuneración', pago ? `Bs ${pago}` : '—'],
                ['Recogida', direccion],
              ].map(([etiqueta, valor]) => (
                <View
                  key={etiqueta}
                  style={{
                    flexDirection: 'row',
                    gap: espacio.xl,
                    marginTop: espacio.lg,
                  }}
                >
                  <Texto variante="meta" color={texto.secundario} style={{ width: 92 }}>
                    {etiqueta}
                  </Texto>
                  <Texto
                    variante="cuerpoS"
                    color={texto.fuerte}
                    style={{ flex: 1, textAlign: 'right', fontFamily: 'DMSans_500Medium' }}
                  >
                    {valor}
                  </Texto>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: espacio['4xl'],
          paddingBottom: insets.bottom + espacio['5xl'],
          paddingTop: espacio.md,
        }}
      >
        <Button
          titulo={paso === 2 ? 'Publicar solicitud' : 'Siguiente'}
          completo
          haptico={paso === 2 ? 'exito' : false}
          cargando={crear.isPending}
          onPress={avanzar}
        />
      </View>

      {selectorFecha.sheet}
    </KeyboardAvoidingView>
  );
}
