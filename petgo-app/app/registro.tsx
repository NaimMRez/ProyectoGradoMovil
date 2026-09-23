import { useState } from 'react';
import { View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../src/components/Button';
import Campo from '../src/components/Campo';
import { BotonIcono } from '../src/components/Button';
import PressableScale from '../src/components/PressableScale';
import Texto from '../src/components/Texto';
import { ErrorApi, type Rol } from '../src/api/tipos';
import { inicioSegunRol, useSesion } from '../src/estado/sesion';
import { useToast } from '../src/estado/toast';
import { acceso, superficie } from '../src/theme/colors';
import { espacio, profundidad, radio } from '../src/theme/layout';
import { curva, duracion } from '../src/theme/motion';

type Rama = {
  valor: Rol;
  /** Lo que dice el botón de la mitad. */
  boton: string;
  /** Bajo el título, cuando el formulario ya está abierto. */
  subtitulo: string;
  ilustracion: ImageSourcePropType;
  fondo: string;
  /** Texto principal sobre `fondo`. */
  tinta: string;
  /** Texto secundario sobre `fondo`. */
  tintaSuave: string;
  /** Relleno del botón de la mitad. */
  botonFondo: string;
  botonTinta: string;
};

/**
 * Cuánto tarda la mitad elegida en ocupar la pantalla.
 *
 * Es largo para una transición — lo normal en la app son 240 ms —, y lo es a
 * propósito: aquí el movimiento no acompaña a una acción, **es** la respuesta a
 * la única pregunta de la pantalla, y se ve una vez por cuenta creada.
 */
const MS_RELLENO = duracion.entrada + 180 + 1000;

/** Volver es deshacer, y deshacer siempre va más rápido que hacer. */
const MS_VOLVER = Math.round(MS_RELLENO * 0.45);

const RAMAS: Record<Rol, Rama> = {
  dueno: {
    valor: 'dueno',
    boton: 'Dueño',
    subtitulo: 'Publico solicitudes de paseo',
    ilustracion: require('../assets/seccion-dueno.png'),
    fondo: acceso.verde,
    tinta: acceso.sobreVerde,
    tintaSuave: acceso.sobreVerdeSuave,
    botonFondo: acceso.crema,
    botonTinta: acceso.sobreCrema,
  },
  cuidador: {
    valor: 'cuidador',
    boton: 'Paseador',
    subtitulo: 'Busco paseos cerca de mí',
    ilustracion: require('../assets/seccion-cuidador.png'),
    fondo: acceso.crema,
    tinta: acceso.sobreCrema,
    tintaSuave: acceso.sobreCremaSuave,
    botonFondo: acceso.verde,
    botonTinta: acceso.sobreVerde,
  },
};

/**
 * Botón de una de las dos mitades.
 *
 * Va en pastilla con borde del color contrario, como en la referencia: sobre
 * una ilustración a sangre, un botón sin borde se funde con el fondo.
 */
function BotonRama({ rama, onPress }: { rama: Rama; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      fuerza="normal"
      haptico="ligero"
      accessibilityRole="button"
      accessibilityLabel={`Crear cuenta como ${rama.boton}`}
      style={[
        {
          alignSelf: 'center',
          minWidth: 200,
          alignItems: 'center',
          paddingVertical: espacio.xxl,
          paddingHorizontal: espacio['6xl'],
          borderRadius: radio.pastilla,
          backgroundColor: rama.botonFondo,
          borderWidth: 2,
          borderColor: rama.tinta,
        },
        profundidad.nivel1,
      ]}
    >
      <Texto variante="tituloSheet" color={rama.botonTinta}>
        {rama.boton}
      </Texto>
    </PressableScale>
  );
}

/**
 * Registro.
 *
 * **La elección de rol es la primera pregunta, no un campo más del
 * formulario.** Determina las pestañas, la pantalla de inicio, qué acciones
 * aparecen en el detalle de una solicitud, quién puede avanzar el estado y
 * quién puede cerrarlo — y no se puede cambiar después. Por eso ocupa la
 * pantalla entera partida en dos y no un selector dentro del formulario, que
 * es como estaba antes.
 *
 * Al elegir, la mitad escogida se expande hasta ocupar la pantalla y la otra
 * se comprime hasta desaparecer. Es una sola animación de altura sobre dos
 * vistas: la transición explica por sí sola qué acaba de pasar, sin un cambio
 * de pantalla de por medio.
 *
 * Las dos mitades no se separan con una recta sino con un domo, el mismo
 * recurso que usan las bandas de la portada. Una recta a media pantalla parte
 * la composición en dos mitades que compiten; la curva hace que una descanse
 * sobre la otra.
 *
 * Los campos van sobre una tarjeta blanca y no directamente sobre el color
 * elegido: `Campo` está diseñado para superficies claras y sobre el verde el
 * texto de los marcadores de posición no alcanza el contraste mínimo.
 */
export default function Registro() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducido = useReducedMotion();
  const { registrarse } = useSesion();
  const { mostrar } = useToast();

  const [elegido, setElegido] = useState<Rol | null>(null);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);

  // 0 = pantalla partida · 1 = mitad elegida a pantalla completa.
  const progreso = useSharedValue(0);

  // Radio del domo que separa las dos mitades. Sale del ancho y no de la escala
  // de radios del sistema porque no es una esquina redondeada: es una curva que
  // tiene que guardar proporción con la pantalla, como las bandas de la portada.
  const radioCurva = Math.round(width * 0.42);

  const elegir = (rol: Rol) => {
    setElegido(rol);
    progreso.value = reducido
      ? 1
      : withTiming(1, { duration: MS_RELLENO, easing: curva.salida });
  };

  const volver = () => {
    progreso.value = reducido
      ? 0
      : withTiming(0, { duration: MS_VOLVER, easing: curva.salida });
    // El rol se limpia al terminar para que la mitad no cambie de tamaño a
    // mitad de camino: mientras `progreso` baja, sigue sabiendo cuál se eligió.
    setTimeout(() => setElegido(null), reducido ? 0 : MS_VOLVER);
  };

  const mitadVerde = useAnimatedStyle(() => ({
    height: interpolate(
      progreso.value,
      [0, 1],
      [height / 2, elegido === 'dueno' ? height : 0],
    ),
    // El domo se aplana a medida que la mitad crece: a pantalla completa una
    // curva abajo dejaría dos cuñas de color ajeno en las esquinas.
    borderBottomLeftRadius: interpolate(progreso.value, [0, 1], [radioCurva, 0]),
    borderBottomRightRadius: interpolate(progreso.value, [0, 1], [radioCurva, 0]),
  }));

  const mitadCrema = useAnimatedStyle(() => ({
    height: interpolate(
      progreso.value,
      [0, 1],
      [height / 2, elegido === 'cuidador' ? height : 0],
    ),
  }));

  // El contenido de las mitades se va antes de que terminen de moverse: si se
  // desvaneciera al mismo ritmo, se vería encogerse con la mitad.
  const contenidoMitades = useAnimatedStyle(() => ({
    opacity: interpolate(progreso.value, [0, 0.45], [1, 0], 'clamp'),
  }));

  const formulario = useAnimatedStyle(() => ({
    opacity: interpolate(progreso.value, [0.55, 1], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progreso.value, [0.55, 1], [18, 0], 'clamp') }],
  }));

  const crear = async () => {
    if (enviando || !elegido) return;

    if (!nombre.trim()) {
      mostrar('Ingresa tu nombre completo', { tono: 'aviso', sobreTabs: false });
      return;
    }
    if (!correo.trim().includes('@')) {
      mostrar('Ingresa un correo electrónico válido', { tono: 'aviso', sobreTabs: false });
      return;
    }
    if (clave.length < 8) {
      mostrar('La contraseña debe tener al menos 8 caracteres', {
        tono: 'aviso',
        sobreTabs: false,
      });
      return;
    }

    setEnviando(true);
    try {
      const usuario = await registrarse({ nombre, correo, telefono, clave, rol: elegido });
      router.replace(inicioSegunRol(usuario.rol));
    } catch (fallo) {
      mostrar(fallo instanceof ErrorApi ? fallo.message : 'No pudimos crear tu cuenta', {
        tono: 'aviso',
        sobreTabs: false,
      });
    } finally {
      setEnviando(false);
    }
  };

  const rama = elegido ? RAMAS[elegido] : null;

  return (
    <View style={{ flex: 1, backgroundColor: RAMAS.cuidador.fondo }}>
      {/* ── Mitad de arriba: dueño ───────────────────────────────────────── */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: RAMAS.dueno.fondo,
            overflow: 'hidden',
            justifyContent: 'center',
            paddingTop: insets.top,
            // El domo estrecha el ancho útil cerca del borde inferior: el
            // contenido sube para no meterse en la curva.
            paddingBottom: espacio['7xl'],
          },
          mitadVerde,
        ]}
      >
        <Animated.View style={[{ alignItems: 'center', gap: espacio['3xl'] }, contenidoMitades]}>
          <Image
            source={RAMAS.dueno.ilustracion}
            style={{ width: '82%', height: height * 0.26 }}
            contentFit="contain"
            accessibilityLabel="Dos personas con sus mascotas"
          />
          <BotonRama rama={RAMAS.dueno} onPress={() => elegir('dueno')} />
        </Animated.View>
      </Animated.View>

      {/* ── Mitad de abajo: paseador ─────────────────────────────────────── */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: RAMAS.cuidador.fondo,
            overflow: 'hidden',
            justifyContent: 'center',
            paddingBottom: insets.bottom,
          },
          mitadCrema,
        ]}
      >
        <Animated.View style={[{ alignItems: 'center', gap: espacio['3xl'] }, contenidoMitades]}>
          <Image
            source={RAMAS.cuidador.ilustracion}
            style={{ width: '82%', height: height * 0.24 }}
            contentFit="contain"
            accessibilityLabel="Una persona paseando a un perro"
          />
          <BotonRama rama={RAMAS.cuidador} onPress={() => elegir('cuidador')} />

          <PressableScale
            onPress={() => router.replace('/login')}
            fuerza="fuerte"
            hitSlop={10}
            accessibilityRole="button"
            style={{ flexDirection: 'row', gap: espacio.sm, alignItems: 'center' }}
          >
            <Texto variante="cuerpoS" color={acceso.sobreCremaSuave}>
              ¿Ya tienes cuenta?
            </Texto>
            <Texto variante="enlace" color={acceso.verde}>
              Inicia sesión
            </Texto>
          </PressableScale>
        </Animated.View>
      </Animated.View>

      {/* ── Formulario ───────────────────────────────────────────────────── */}
      {rama ? (
        <Animated.View
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, formulario]}
          pointerEvents={elegido ? 'auto' : 'none'}
        >
          <KeyboardAwareScrollView
            bottomOffset={espacio['6xl']}
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: insets.top + espacio.xl,
              paddingBottom: insets.bottom + espacio['5xl'],
              paddingHorizontal: espacio['5xl'],
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <BotonIcono
              icono="arrow_back"
              lado={40}
              tamanoIcono={20}
              radioBoton={radio.md}
              fondo="transparent"
              colorBorde={rama.tintaSuave}
              color={rama.tinta}
              onPress={volver}
              accessibilityLabel="Elegir otro tipo de cuenta"
            />

            <View style={{ alignItems: 'center', marginTop: espacio.xl }}>
              <Image
                source={rama.ilustracion}
                style={{ width: '64%', height: 132 }}
                contentFit="contain"
                accessibilityLabel=""
              />
            </View>

            <Texto variante="tituloL" color={rama.tinta} style={{ marginTop: espacio['3xl'] }}>
              Crear cuenta
            </Texto>
            <Texto variante="cuerpoL" color={rama.tintaSuave} style={{ marginTop: espacio.xs }}>
              {`${rama.boton} · ${rama.subtitulo}`}
            </Texto>

            <View
              style={[
                {
                  marginTop: espacio['4xl'],
                  backgroundColor: superficie.tarjeta,
                  borderRadius: radio.sheet,
                  padding: espacio['4xl'],
                  gap: espacio.xl + 1,
                },
                profundidad.nivel2,
              ]}
            >
              <Campo
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre completo"
                autoComplete="name"
                textContentType="name"
              />
              <Campo
                value={correo}
                onChangeText={setCorreo}
                placeholder="Correo electrónico"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Campo
                value={telefono}
                onChangeText={setTelefono}
                placeholder="Número telefónico"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <Campo
                value={clave}
                onChangeText={setClave}
                placeholder="Contraseña"
                secureTextEntry
                autoComplete="new-password"
                ayuda="Mínimo 8 caracteres."
              />

              <Button
                titulo="Crear cuenta"
                onPress={() => void crear()}
                completo
                cargando={enviando}
                haptico="ligero"
                style={{ marginTop: espacio.md }}
              />
            </View>

            <PressableScale
              onPress={() => router.replace('/login')}
              fuerza="fuerte"
              hitSlop={10}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                gap: espacio.sm,
                alignSelf: 'center',
                marginTop: espacio['4xl'],
              }}
            >
              <Texto variante="cuerpoS" color={rama.tintaSuave}>
                ¿Ya tienes cuenta?
              </Texto>
              <Texto variante="enlace" color={rama.tinta}>
                Inicia sesión
              </Texto>
            </PressableScale>
          </KeyboardAwareScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}
