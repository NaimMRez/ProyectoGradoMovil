import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../../src/components/Button';
import Card from '../../../src/components/Card';
import ErrorState from '../../../src/components/ErrorState';
import Icono from '../../../src/components/Icono';
import Pantalla, { CabeceraDetalle } from '../../../src/components/Pantalla';
import PhotoPlaceholder from '../../../src/components/PhotoPlaceholder';
import PressableScale from '../../../src/components/PressableScale';
import SheetContacto from '../../../src/components/SheetContacto';
import { Skeleton } from '../../../src/components/Skeleton';
import StatusBadge from '../../../src/components/StatusBadge';
import Texto from '../../../src/components/Texto';
import {
  useAvanzarEstado,
  useCancelarSolicitud,
  useConfirmarFinalizacion,
  useSolicitud,
} from '../../../src/api/hooks';
import {
  cuidadorPuedeAvanzar,
  duenoPuedeConfirmar,
  etiquetaAccionCuidador,
  puedeCancelar,
} from '../../../src/api/estados';
import { USUARIOS } from '../../../src/api/mock/datos';
import type { Hito } from '../../../src/api/tipos';
import { useUsuario } from '../../../src/estado/sesion';
import { ambar, borde, intencion, superficie, texto, verde } from '../../../src/theme/colors';
import { espacio, radio } from '../../../src/theme/layout';

/**
 * Una entrada del timeline.
 *
 * El indicador y la línea van en una columna propia a la izquierda para que la
 * línea vertical pueda unir un punto con el siguiente sin depender de la altura
 * del texto de al lado.
 */
function EntradaHito({ hito, ultima }: { hito: Hito; ultima: boolean }) {
  const alcanzado = hito.fase !== 'pendiente';

  const piel =
    hito.fase === 'completado'
      ? { fondo: verde.primario, borde: verde.primario, icono: texto.sobreAccion }
      : hito.fase === 'actual'
        ? { fondo: ambar.actualFondo, borde: ambar.actualBorde, icono: ambar.actualIcono }
        : { fondo: superficie.tarjeta, borde: borde.suave, icono: texto.inactivo };

  return (
    <View style={{ flexDirection: 'row', gap: espacio['3xl'] - 1 }}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: radio.pastilla,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: piel.fondo,
            borderWidth: 2,
            borderColor: piel.borde,
          }}
        >
          <Icono
            nombre={hito.fase === 'completado' ? 'check' : hito.icono}
            tamano={15}
            color={piel.icono}
          />
        </View>

        {!ultima ? (
          <View
            style={{
              width: 2,
              flex: 1,
              minHeight: 30,
              backgroundColor:
                hito.fase === 'completado' ? verde.primario : borde.tarjeta,
            }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1, paddingBottom: ultima ? 0 : espacio['4xl'] }}>
        <Texto
          variante="nombreS"
          color={alcanzado ? texto.principal : texto.atenuado}
        >
          {hito.etiqueta}
        </Texto>
        <Texto variante="meta" color={texto.tenue} style={{ marginTop: espacio.xxs }}>
          {hito.detalle}
        </Texto>
      </View>
    </View>
  );
}

/**
 * Seguimiento del servicio.
 *
 * Es donde se ejerce la regla que sostiene todo el flujo: **el cuidador avanza
 * hasta `proceso` y desde ahí marca el fin del paseo, pero sólo el dueño cierra
 * el servicio como `finalizada`.** Marcar el fin no finaliza nada: activa
 * `awaitingConfirmation` y deja el estado donde estaba.
 *
 * Mientras esa bandera esté activa, el botón de avanzar del cuidador
 * desaparece y en su lugar ve el aviso de espera. La ruta principal de la
 * confirmación es la notificación; el botón de aquí es la secundaria.
 */
export default function Seguimiento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const usuario = useUsuario();
  const insets = useSafeAreaInsets();

  const [sheetContacto, setSheetContacto] = useState(false);

  const consulta = useSolicitud(id);
  const avanzar = useAvanzarEstado();
  const confirmar = useConfirmarFinalizacion();
  const cancelar = useCancelarSolicitud();

  const esDueno = usuario.rol === 'dueno';
  const solicitud = consulta.data;

  if (consulta.isError) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + espacio['7xl'] }}>
        <ErrorState clave="noEncontrada" onAccion={() => router.back()} />
      </View>
    );
  }

  if (!solicitud) {
    return (
      <Pantalla
        relleno="detalle"
        contentContainerStyle={{ paddingTop: insets.top + espacio.xl, gap: espacio.xxl }}
      >
        <Skeleton alto={40} radioForma={radio.md} ancho="60%" />
        <Skeleton alto={96} radioForma={radio.xxl} />
        <Skeleton alto={320} radioForma={radio.xxl} />
      </Pantalla>
    );
  }

  const contraparteId = esDueno ? solicitud.cuidadorId : solicitud.duenoId;
  const contraparte = contraparteId
    ? (USUARIOS.find((u) => u.id === contraparteId) ?? null)
    : null;

  const esperando = solicitud.awaitingConfirmation;
  const cuidadorAvanza = !esDueno && cuidadorPuedeAvanzar(solicitud);

  return (
    <View style={{ flex: 1, backgroundColor: superficie.app }}>
      <Pantalla
        relleno="detalle"
        contentContainerStyle={{
          paddingTop: insets.top + espacio.xl,
          paddingBottom: insets.bottom + espacio['7xl'],
        }}
      >
        <CabeceraDetalle titulo="Seguimiento" onAtras={() => router.back()} />

        {/* ── Resumen ──────────────────────────────────────────────────── */}
        <Card
          nivel="raised"
          radioTarjeta={radio.xxl}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio['3xl'],
            padding: espacio['4xl'] - 2,
            marginTop: espacio['5xl'],
          }}
        >
          <PhotoPlaceholder
            fotoUrl={solicitud.fotoUrl}
            nombre={solicitud.mascotas[0]?.nombre}
            tamano={54}
            radioFoto={radio.xl}
          />
          <View style={{ flex: 1, gap: espacio.xxs }}>
            <Texto variante="nombre" color={texto.principal} numberOfLines={1}>
              {solicitud.mascotasEtiqueta}
            </Texto>
            <Texto variante="meta" color={texto.terciario}>
              {`${solicitud.fechaEtiqueta} · ${solicitud.duracionEtiqueta}`}
            </Texto>
          </View>
          <StatusBadge estado={solicitud.estado} etiqueta={solicitud.estadoEtiqueta} />
        </Card>

        {/* ── Aviso de confirmación pendiente ──────────────────────────── */}
        {esperando ? (
          <Card
            nivel="flat"
            radioTarjeta={radio.tarjeta}
            style={{
              marginTop: espacio.xxl,
              padding: espacio['3xl'],
              backgroundColor: ambar.fondo,
              borderColor: ambar.borde,
              gap: espacio.xl,
            }}
          >
            <View style={{ flexDirection: 'row', gap: espacio.xl }}>
              <Icono nombre="pending_actions" tamano={20} color={ambar.icono} />
              <View style={{ flex: 1, gap: espacio.xs }}>
                <Texto variante="tituloDenso" color={ambar.titulo}>
                  {esDueno
                    ? 'El cuidador marcó el paseo como terminado'
                    : 'Esperando confirmación del dueño'}
                </Texto>
                <Texto variante="cuerpoS" color={ambar.cuerpo} style={{ lineHeight: 21 }}>
                  {esDueno
                    ? 'Revisa que todo esté en orden y confirma para cerrar el servicio.'
                    : `${contraparte?.primerNombre ?? 'El dueño'} debe confirmar la finalización para cerrar el servicio.`}
                </Texto>
              </View>
            </View>

            {esDueno && duenoPuedeConfirmar(solicitud) ? (
              <Button
                titulo="Confirmar finalización"
                completo
                tamano="medio"
                haptico="exito"
                cargando={confirmar.isPending}
                onPress={() => confirmar.mutate(solicitud.id)}
              />
            ) : null}
          </Card>
        ) : null}

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        <Card
          nivel="raised"
          radioTarjeta={radio.xxl}
          style={{
            marginTop: espacio.xxl,
            paddingVertical: espacio['5xl'] - 2,
            paddingHorizontal: espacio['4xl'],
          }}
        >
          {solicitud.hitos.map((hito, i) => (
            <EntradaHito
              key={hito.clave}
              hito={hito}
              ultima={i === solicitud.hitos.length - 1}
            />
          ))}
        </Card>

        {/* ── Acciones ─────────────────────────────────────────────────── */}
        {contraparte ? (
          <View style={{ flexDirection: 'row', gap: espacio.lg, marginTop: espacio['5xl'] }}>
            <Button
              titulo="Contactar"
              icono="chat_bubble"
              onPress={() => setSheetContacto(true)}
              style={{ flex: 1 }}
            />
            {cuidadorAvanza ? (
              <Button
                titulo={etiquetaAccionCuidador(solicitud)}
                variante="secundario"
                cargando={avanzar.isPending}
                haptico="medio"
                onPress={() => avanzar.mutate(solicitud.id)}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>
        ) : null}

        {/* ── Nota de reglas ───────────────────────────────────────────── */}
        <Texto
          variante="caption"
          color={texto.suave}
          style={{
            marginTop: espacio['4xl'],
            textAlign: 'center',
            lineHeight: 18,
            paddingHorizontal: espacio.xl,
          }}
        >
          {esDueno
            ? 'El cuidador actualiza el avance; tú confirmas la finalización.'
            : 'Al marcar el paseo como terminado, el dueño debe confirmar para cerrar el servicio.'}
        </Texto>

        {/* ── Cancelar ─────────────────────────────────────────────────── */}
        {/* Ambas partes pueden cancelar en cualquier momento antes de un estado
            terminal. Va sin fondo ni borde, al final y en rojo apagado: tiene
            que estar disponible sin invitar a pulsarlo. */}
        {puedeCancelar(solicitud) ? (
          <PressableScale
            onPress={() =>
              cancelar.mutate(solicitud.id, { onSuccess: () => router.back() })
            }
            disabled={cancelar.isPending}
            fuerza="fuerte"
            accessibilityRole="button"
            accessibilityLabel="Cancelar servicio"
            style={{ alignSelf: 'center', paddingVertical: espacio['4xl'] }}
          >
            <Texto variante="enlace" color={intencion.destructivo}>
              Cancelar servicio
            </Texto>
          </PressableScale>
        ) : null}
      </Pantalla>

      <SheetContacto
        abierto={sheetContacto}
        contraparte={contraparte}
        onCerrar={() => setSheetContacto(false)}
        onChat={() => {
          setSheetContacto(false);
          router.push(`/chat/${solicitud.id}`);
        }}
      />
    </View>
  );
}
