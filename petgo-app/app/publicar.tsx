import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../src/components/Button';
import Campo from '../src/components/Campo';
import Chip from '../src/components/Chip';
import Icono from '../src/components/Icono';
import Mapa, { PinUbicacion, regionCercana } from '../src/components/Mapa';
import { CabeceraDetalle } from '../src/components/Pantalla';
import PhotoPlaceholder from '../src/components/PhotoPlaceholder';
import PressableScale from '../src/components/PressableScale';
import SelectorDuracion from '../src/components/SelectorDuracion';
import { useSelectorUbicacion } from '../src/components/SelectorUbicacion';
import { Skeleton } from '../src/components/Skeleton';
import { useSelectorFechaHora } from '../src/components/SelectorFechaHora';
import Texto from '../src/components/Texto';
import EmptyState from '../src/components/EmptyState';
import { useCrearSolicitud, useMascotas } from '../src/api/hooks';
import {
  duracion as textoDuracion,
  fechaHora,
  unirNombres,
} from '../src/api/mock/formato';
import { useToast } from '../src/estado/toast';
import { borde, superficie, texto, verde } from '../src/theme/colors';
import { espacio, radio } from '../src/theme/layout';
import { curvaCSS, duracion as duracionMotion } from '../src/theme/motion';
import { DIAS_MAXIMOS } from '../src/utiles/agenda';
import type { Punto } from '../src/utiles/geo';

const PASOS = ['Mascotas', 'Cuándo y cuánto', 'Ubicación'] as const;
const PAGO_SUGERIDO = 40;

/** Punto de recogida por defecto: la dirección de la dueña del seed. */
/**
 * La zona que se guarda con la solicitud.
 *
 * Es fija porque PetGo entero vive en el Cercado y el punto lo pone el dueño
 * en el mapa: sacar el barrio de unas coordenadas pediría geocodificación
 * inversa, y el dato que de verdad orienta al cuidador es la dirección que
 * escribe el dueño, que se muestra encima de esta etiqueta.
 */
const ZONA = 'Cercado, Cochabamba';

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
  const [fecha, setFecha] = useState<Date | null>(null);
  // En minutos, no en la etiqueta: la barra trabaja con números y el texto lo
  // pone el formateador, que es el mismo que usa el resto de la app.
  const [duracion, setDuracion] = useState(60);
  const [pago, setPago] = useState('');
  // Ninguno de los dos arranca con valor: el punto lo pone el dueño en el mapa
  // y la dirección la escribe él. Antes los dos venían rellenos con los datos
  // de una vivienda del seed, así que toda solicitud se publicaba en el mismo
  // sitio dijera lo que dijera el texto.
  const [punto, setPunto] = useState<Punto | null>(null);
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  const selectorFecha = useSelectorFechaHora(fecha, setFecha);
  const selectorUbicacion = useSelectorUbicacion(punto, setPunto);
  // Sin fecha no hay etiqueta que mostrar: el botón invita a elegirla.
  const cuandoEtiqueta = fecha ? fechaHora(fecha) : 'Elegir fecha y hora';

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
    // No se llega aquí sin fecha ni sin punto — los pasos 2 y 3 no dejan
    // avanzar sin ellos —, pero el tipo lo permite y una publicación sin
    // cualquiera de los dos sería un registro roto.
    if (!fecha || !punto) return;

    const monto = Number.parseInt(pago, 10);

    crear.mutate(
      {
        mascotaIds: elegidas,
        fechaHora: fecha,
        duracionMin: duracion,
        pagoBs: monto,
        direccion: direccion.trim(),
        zona: ZONA,
        lat: punto.lat,
        lng: punto.lng,
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
      // El botón está deshabilitado mientras no haya ninguna elegida, así que
      // aquí no se llega. Queda como red por si el pie dejara de mirarlo.
      if (faltaMascota) return;
      setPaso(1);
      return;
    }

    if (paso === 1) {
      if (!fecha) {
        mostrar('Elige la fecha y la hora del paseo', { tono: 'aviso', sobreTabs: false });
        return;
      }
      if (!pago.trim() || Number.parseInt(pago, 10) <= 0) {
        mostrar('Indica cuánto ofreces por el paseo', { tono: 'aviso', sobreTabs: false });
        return;
      }
      setPaso(2);
      return;
    }

    if (!punto) {
      mostrar('Marca el punto de recogida en el mapa', { tono: 'aviso', sobreTabs: false });
      return;
    }
    if (!direccion.trim()) {
      mostrar('Escribe la dirección de referencia', { tono: 'aviso', sobreTabs: false });
      return;
    }

    publicar();
  };

  const retroceder = () => {
    if (paso === 0) router.back();
    else setPaso(paso - 1);
  };

  /**
   * El primer paso está incompleto.
   *
   * Es lo único que apaga el botón del pie. Los otros dos pasos siguen
   * avisando con un toast al intentar avanzar, y la diferencia no es un
   * descuido: aquí falta **una** cosa y el aviso de debajo ya la nombra, así
   * que un botón apagado se explica solo. El paso 2 tiene dos condiciones —
   * la fecha y el monto — y apagarlo no diría cuál de las dos falta.
   */
  const faltaMascota = elegidas.length === 0;

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
              {/* Un solo control, que hace de invitación y de respuesta: dice
                  "Elegir fecha y hora" mientras no hay nada, y pasa a mostrar
                  lo elegido en cuanto lo hay. Es el único sitio donde se ve qué
                  día quedó puesto, así que un rótulo fijo escondería el dato. */}
              <Chip
                etiqueta={cuandoEtiqueta}
                icono="event"
                activo={Boolean(fecha)}
                onPress={selectorFecha.abrir}
              />
              {/* El selector sólo enseña los días dentro del plazo, así que
                  no hay nada atenuado que delate el límite. Conviene decirlo
                  antes de abrirlo, o la tira corta se lee como un fallo. */}
              <Texto
                variante="caption"
                color={texto.terciario}
                style={{ marginTop: espacio.md }}
              >
                {`Hasta ${DIAS_MAXIMOS} días de antelación.`}
              </Texto>
            </View>

            <View>
              <Etiqueta>Duración del paseo</Etiqueta>
              <SelectorDuracion valor={duracion} onCambio={setDuracion} />
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

            <View>
              <Etiqueta>Punto de recogida</Etiqueta>

              {punto ? (
                /* Vista previa: se mira, no se explora. El ajuste se hace en
                   un sheet aparte, donde el mapa tiene sitio de sobra y no
                   compite con el scroll de esta pantalla. */
                <PressableScale
                  fuerza="suave"
                  accessibilityRole="button"
                  accessibilityLabel="Ajustar el punto de recogida en el mapa"
                  onPress={selectorUbicacion.abrir}
                  style={{
                    backgroundColor: superficie.tarjeta,
                    borderWidth: 1,
                    borderColor: borde.input,
                    borderRadius: radio.xl + 2,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ height: 190 }}>
                    <Mapa interactivo={false} region={regionCercana(punto.lat, punto.lng)}>
                      <PinUbicacion latitude={punto.lat} longitude={punto.lng} />
                    </Mapa>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: espacio.lg,
                      borderTopWidth: 1,
                      borderTopColor: borde.sutil,
                      paddingVertical: espacio.xxl,
                      paddingHorizontal: espacio['3xl'],
                    }}
                  >
                    <Icono nombre="my_location" tamano={18} color={verde.primario} />
                    <Texto variante="boton" color={verde.texto} style={{ flex: 1 }}>
                      Ajustar en el mapa
                    </Texto>
                    <Icono nombre="chevron_right" tamano={18} color={texto.inactivo} />
                  </View>
                </PressableScale>
              ) : (
                <PressableScale
                  fuerza="suave"
                  accessibilityRole="button"
                  accessibilityLabel="Marcar el punto de recogida en el mapa"
                  onPress={selectorUbicacion.abrir}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: espacio.lg,
                    borderStyle: 'dashed',
                    borderWidth: 1.5,
                    borderColor: borde.discontinuo,
                    borderRadius: radio.xl + 2,
                    backgroundColor: superficie.aviso,
                    paddingVertical: espacio['6xl'],
                    paddingHorizontal: espacio['4xl'],
                  }}
                >
                  <Icono nombre="place" tamano={20} color={verde.primario} />
                  <Texto variante="boton" color={verde.texto}>
                    Marcar en el mapa
                  </Texto>
                </PressableScale>
              )}
            </View>

            <Campo
              etiqueta="Dirección de referencia"
              value={direccion}
              onChangeText={setDireccion}
              placeholder="Ej. Av. América #1204, timbre 2B"
              ayuda="El punto del mapa es el que usan los cuidadores para calcular la distancia; esto les ayuda a encontrar la puerta."
            />

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
                ['Fecha', fecha ? fechaHora(fecha) : '—'],
                ['Duración', textoDuracion(duracion)],
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
          disabled={paso === 0 && faltaMascota}
          onPress={avanzar}
        />
      </View>

      {selectorFecha.sheet}
      {selectorUbicacion.sheet}
    </KeyboardAvoidingView>
  );
}
