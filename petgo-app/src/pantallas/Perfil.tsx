import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import Card from '../components/Card';
import Icono, { type NombreIcono } from '../components/Icono';
import Pantalla, { Divisor } from '../components/Pantalla';
import { Avatar } from '../components/PhotoPlaceholder';
import PressableScale from '../components/PressableScale';
import Texto from '../components/Texto';
import { useMascotas } from '../api/hooks';
import { plural } from '../api/mock/formato';
import { useSesion, useUsuario } from '../estado/sesion';
import { useToast } from '../estado/toast';
import { borde, superficie, texto, verde } from '../theme/colors';
import { espacio, radio } from '../theme/layout';

/** Fila de dato: icono, etiqueta y valor a la derecha. */
function FilaDato({
  icono,
  etiqueta,
  valor,
  ultima,
}: {
  icono: NombreIcono;
  etiqueta: string;
  valor: string;
  ultima?: boolean;
}) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espacio.xl,
          paddingVertical: espacio.xxl,
        }}
      >
        <Icono nombre={icono} tamano={19} color={texto.terciario} />
        <Texto variante="meta" color={texto.terciario} style={{ flex: 1 }}>
          {etiqueta}
        </Texto>
        <Texto variante="cuerpoS" color={texto.medio} style={{ fontFamily: 'DMSans_500Medium' }}>
          {valor}
        </Texto>
      </View>
      {!ultima ? <Divisor style={{ backgroundColor: borde.divisorTenue }} /> : null}
    </View>
  );
}

/** Fila de acción: pulsable, con chevron. */
function FilaAccion({
  icono,
  etiqueta,
  onPress,
  ultima,
}: {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
  ultima?: boolean;
}) {
  return (
    <View>
      <PressableScale
        onPress={onPress}
        fuerza="suave"
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espacio.xl,
          paddingVertical: espacio['3xl'],
        }}
      >
        <Icono nombre={icono} tamano={20} color={verde.heroe} />
        <Texto variante="cuerpo" color={texto.fuerte} style={{ flex: 1, fontFamily: 'DMSans_500Medium' }}>
          {etiqueta}
        </Texto>
        <Icono nombre="chevron_right" tamano={19} color={texto.inactivo} />
      </PressableScale>
      {!ultima ? <Divisor style={{ backgroundColor: borde.divisorTenue }} /> : null}
    </View>
  );
}

/**
 * Perfil.
 *
 * Mismo layout para ambos roles, con contenido distinto: el dueño ve cuántas
 * mascotas tiene registradas; el cuidador, cuántos paseos completó. **No hay
 * sistema de calificaciones** — el contador de paseos es toda la reputación
 * que el cliente quiso.
 */
export function Perfil() {
  const usuario = useUsuario();
  const { salir } = useSesion();
  const { mostrar } = useToast();
  const insets = useSafeAreaInsets();
  const mascotas = useMascotas();

  const esDueno = usuario.rol === 'dueno';

  const cerrarSesion = async () => {
    await salir();
    // Se limpia la pila entera: volver atrás desde el login a una pantalla
    // autenticada sería una fuga de sesión.
    router.dismissAll();
    router.replace('/login');
  };

  const pendiente = (que: string) => () =>
    mostrar(`${que} todavía no está disponible`, { tono: 'aviso' });

  return (
    <Pantalla conTabs contentContainerStyle={{ paddingTop: insets.top + espacio.xl }}>
      <Texto variante="tituloM" color={texto.principal}>
        Mi perfil
      </Texto>

      {/* ── Identidad ────────────────────────────────────────────────────── */}
      <Card
        nivel="elevated"
        radioTarjeta={radio.xxl}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espacio['3xl'],
          padding: espacio['4xl'],
          marginTop: espacio['4xl'],
        }}
      >
        <Avatar nombre={usuario.nombre} fotoUrl={usuario.fotoUrl} tamano={72} />
        <View style={{ flex: 1, gap: espacio.md }}>
          <Texto variante="tituloDetalle" color={texto.principal} numberOfLines={1}>
            {usuario.nombre}
          </Texto>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: superficie.pildora,
              borderRadius: radio.xs,
              paddingVertical: 5,
              paddingHorizontal: espacio.lg,
            }}
          >
            <Texto variante="badge" color={verde.texto}>
              {usuario.rolEtiqueta}
            </Texto>
          </View>
        </View>
      </Card>

      {/* ── Datos ────────────────────────────────────────────────────────── */}
      <Card
        nivel="raised"
        radioTarjeta={radio.xxl}
        style={{ paddingHorizontal: espacio['3xl'], marginTop: espacio.xxl }}
      >
        <FilaDato icono="mail" etiqueta="Correo" valor={usuario.correo} />
        <FilaDato icono="call" etiqueta="Teléfono" valor={usuario.telefono} />
        <FilaDato icono="place" etiqueta="Zona" valor={usuario.zona} />
        {esDueno ? (
          <FilaDato
            icono="pets"
            etiqueta="Mascotas"
            valor={
              mascotas.data
                ? `${plural(mascotas.data.length, 'registrada', 'registradas')}`
                : '—'
            }
            ultima
          />
        ) : (
          <FilaDato
            icono="directions_walk"
            etiqueta="Paseos"
            valor={`${usuario.paseosCompletados ?? 0} completados`}
            ultima
          />
        )}
      </Card>

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <Card
        nivel="raised"
        radioTarjeta={radio.xxl}
        style={{ paddingHorizontal: espacio['3xl'], marginTop: espacio.xxl }}
      >
        <FilaAccion icono="edit" etiqueta="Editar perfil" onPress={pendiente('La edición de perfil')} />
        <FilaAccion icono="settings" etiqueta="Configuración" onPress={pendiente('La configuración')} />
        <FilaAccion icono="help" etiqueta="Ayuda" onPress={pendiente('La ayuda')} ultima />
      </Card>

      <Button
        titulo="Cerrar sesión"
        variante="destructivo"
        completo
        icono="logout"
        onPress={() => void cerrarSesion()}
        style={{ marginTop: espacio['6xl'] }}
      />
    </Pantalla>
  );
}

export default Perfil;
