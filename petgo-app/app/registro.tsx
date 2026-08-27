import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../src/components/Button';
import Campo from '../src/components/Campo';
import Icono from '../src/components/Icono';
import Pantalla, { CabeceraDetalle } from '../src/components/Pantalla';
import PressableScale from '../src/components/PressableScale';
import Texto from '../src/components/Texto';
import { ErrorApi, type Rol } from '../src/api/tipos';
import { inicioSegunRol, useSesion } from '../src/estado/sesion';
import { useToast } from '../src/estado/toast';
import { borde, superficie, texto, verde } from '../src/theme/colors';
import { espacio, radio } from '../src/theme/layout';
import { curvaCSS, duracion } from '../src/theme/motion';

const ROLES: { valor: Rol; icono: 'home' | 'directions_walk'; titulo: string; descripcion: string }[] = [
  {
    valor: 'dueno',
    icono: 'home',
    titulo: 'Dueño de mascota',
    descripcion: 'Publico solicitudes de paseo',
  },
  {
    valor: 'cuidador',
    icono: 'directions_walk',
    titulo: 'Cuidador / paseador',
    descripcion: 'Busco paseos cerca de mí',
  },
];

/**
 * Tarjeta de rol.
 *
 * **El rol se elige aquí y determina toda la navegación posterior**: tabs,
 * pantalla de inicio, qué acciones aparecen en el detalle, quién puede avanzar
 * el estado y quién puede cerrarlo. No hay cambio de rol dentro de la app, así
 * que esta elección merece las dos tarjetas grandes que ocupa y no un
 * desplegable.
 */
function TarjetaRol({
  rol,
  seleccionado,
  onPress,
}: {
  rol: (typeof ROLES)[number];
  seleccionado: boolean;
  onPress: () => void;
}) {
  const reducido = useReducedMotion();

  return (
    <PressableScale
      onPress={onPress}
      fuerza="suave"
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={`${rol.titulo}. ${rol.descripcion}`}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.xxl,
            padding: espacio['3xl'],
            borderRadius: radio.xl + 2,
            borderWidth: 1.5,
            backgroundColor: seleccionado ? superficie.seleccion : superficie.tarjeta,
            borderColor: seleccionado ? verde.primario : borde.suave,
          },
          !reducido && {
            transitionProperty: ['backgroundColor', 'borderColor'],
            transitionDuration: duracion.micro,
            transitionTimingFunction: curvaCSS.salida,
          },
        ]}
      >
        <Icono nombre={rol.icono} tamano={26} color={verde.heroe} />

        <View style={{ flex: 1 }}>
          <Texto variante="nombreS" color={texto.fuerte}>
            {rol.titulo}
          </Texto>
          <Texto variante="meta" color={texto.secundario}>
            {rol.descripcion}
          </Texto>
        </View>

        <Icono
          nombre={seleccionado ? 'radio_button_checked' : 'radio_button_unchecked'}
          tamano={22}
          color={seleccionado ? verde.primario : texto.inactivo}
        />
      </Animated.View>
    </PressableScale>
  );
}

export default function Registro() {
  const insets = useSafeAreaInsets();
  const { registrarse } = useSesion();
  const { mostrar } = useToast();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [clave, setClave] = useState('');
  const [rol, setRol] = useState<Rol>('dueno');
  const [enviando, setEnviando] = useState(false);

  const crear = async () => {
    if (enviando) return;

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
      const usuario = await registrarse({ nombre, correo, telefono, rol });
      router.replace(inicioSegunRol(usuario.rol));
    } catch (fallo) {
      mostrar(
        fallo instanceof ErrorApi ? fallo.message : 'No pudimos crear tu cuenta',
        { tono: 'aviso', sobreTabs: false },
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla
      relleno="detalle"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + espacio.xl,
        paddingBottom: insets.bottom + espacio['7xl'],
      }}
    >
      <CabeceraDetalle titulo="" onAtras={() => router.back()} />

      <Texto variante="tituloL" color={texto.fuerte} style={{ marginTop: espacio['5xl'] }}>
        Crear cuenta
      </Texto>

      <View style={{ gap: espacio.xl + 1, marginTop: espacio['5xl'] }}>
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
      </View>

      <Texto
        variante="etiqueta"
        color={texto.etiqueta}
        style={{ marginTop: espacio['6xl'], marginBottom: espacio.lg }}
      >
        Quiero usar PetGo como
      </Texto>

      <View style={{ gap: espacio.lg }}>
        {ROLES.map((opcion) => (
          <TarjetaRol
            key={opcion.valor}
            rol={opcion}
            seleccionado={rol === opcion.valor}
            onPress={() => setRol(opcion.valor)}
          />
        ))}
      </View>

      <View style={{ flex: 1, minHeight: espacio['7xl'] }} />

      <Button
        titulo="Crear cuenta"
        completo
        cargando={enviando}
        haptico="exito"
        onPress={() => void crear()}
      />
    </Pantalla>
  );
}
