import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../src/components/Button';
import Campo from '../src/components/Campo';
import Card from '../src/components/Card';
import Icono from '../src/components/Icono';
import Pantalla from '../src/components/Pantalla';
import PressableScale from '../src/components/PressableScale';
import Texto from '../src/components/Texto';
import { USAR_MOCK } from '../src/api/client';
import { ErrorApi } from '../src/api/tipos';
import { inicioSegunRol, useSesion } from '../src/estado/sesion';
import { useToast } from '../src/estado/toast';
import { arena, superficie, texto, verde } from '../src/theme/colors';
import { espacio, radio } from '../src/theme/layout';

/** Cuentas del seed. La contraseña de todas es `petgo1234`. */
const CUENTAS_DEMO = [
  { correo: 'camila.v@gmail.com', quien: 'Camila · dueña' },
  { correo: 'diego.r@gmail.com', quien: 'Diego · cuidador' },
  { correo: 'ana.p@gmail.com', quien: 'Ana · cuidadora' },
];

export default function Login() {
  const insets = useSafeAreaInsets();
  const { entrar } = useSesion();
  const { mostrar } = useToast();

  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const acceder = async (correoUsado = correo, claveUsada = clave) => {
    if (enviando) return;
    setError(null);
    setEnviando(true);
    try {
      const usuario = await entrar(correoUsado, claveUsada);
      router.replace(inicioSegunRol(usuario.rol));
    } catch (fallo) {
      const mensaje =
        fallo instanceof ErrorApi ? fallo.message : 'No pudimos conectar con PetGo';
      setError(mensaje);
      mostrar(mensaje, { tono: 'aviso', sobreTabs: false });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla
      relleno="acceso"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + espacio['4xl'],
        paddingBottom: insets.bottom + espacio['7xl'],
      }}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: radio.tarjeta,
          backgroundColor: verde.primario,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icono nombre="pets" tamano={30} color={texto.sobrePrimario} />
      </View>

      <Texto variante="tituloXL" color={texto.fuerte} style={{ marginTop: espacio['5xl'] }}>
        Bienvenido de vuelta
      </Texto>
      <Texto variante="cuerpo" color={texto.secundario} style={{ marginTop: espacio.md }}>
        Ingresa para coordinar tus paseos.
      </Texto>

      <View style={{ gap: espacio.xl + 2, marginTop: espacio['7xl'] }}>
        <Campo
          etiqueta="Correo electrónico"
          value={correo}
          onChangeText={(v) => {
            setCorreo(v);
            setError(null);
          }}
          placeholder="tucorreo@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <Campo
          etiqueta="Contraseña"
          value={clave}
          onChangeText={(v) => {
            setClave(v);
            setError(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          error={error ?? undefined}
          onSubmitEditing={() => void acceder()}
          returnKeyType="go"
        />

        <PressableScale
          onPress={() =>
            mostrar('La recuperación de contraseña todavía no está disponible', {
              tono: 'aviso',
              sobreTabs: false,
            })
          }
          fuerza="fuerte"
          hitSlop={10}
          style={{ alignSelf: 'flex-end' }}
        >
          <Texto variante="enlace" color={verde.enlace}>
            ¿Olvidaste tu contraseña?
          </Texto>
        </PressableScale>
      </View>

      {USAR_MOCK ? (
        <Card
          nivel="flat"
          style={{
            marginTop: espacio['5xl'],
            padding: espacio['3xl'],
            backgroundColor: arena.fondo,
            borderColor: arena.borde,
          }}
        >
          <Texto variante="etiqueta" color={arena.texto}>
            CUENTAS DE PRUEBA · CONTRASEÑA petgo1234
          </Texto>
          <View style={{ gap: espacio.md, marginTop: espacio.xl }}>
            {CUENTAS_DEMO.map((cuenta) => (
              <PressableScale
                key={cuenta.correo}
                onPress={() => {
                  setCorreo(cuenta.correo);
                  setClave('petgo1234');
                  void acceder(cuenta.correo, 'petgo1234');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: espacio.lg,
                  backgroundColor: superficie.tarjeta,
                  borderRadius: radio.md,
                  paddingVertical: espacio.lg,
                  paddingHorizontal: espacio.xl,
                }}
              >
                <Icono nombre="person" tamano={16} color={verde.enlace} />
                <Texto variante="meta" color={texto.medio} style={{ flex: 1 }}>
                  {cuenta.quien}
                </Texto>
                <Icono nombre="chevron_right" tamano={16} color={texto.atenuado} />
              </PressableScale>
            ))}
          </View>
        </Card>
      ) : null}

      <View style={{ flex: 1, minHeight: espacio['7xl'] }} />

      <Button
        titulo="Iniciar sesión"
        completo
        cargando={enviando}
        onPress={() => void acceder()}
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: espacio.sm,
          marginTop: espacio['4xl'],
        }}
      >
        <Texto variante="cuerpoS" color={texto.secundario}>
          ¿No tienes cuenta?
        </Texto>
        <PressableScale onPress={() => router.push('/registro')} fuerza="fuerte" hitSlop={10}>
          <Texto variante="botonS" color={verde.texto}>
            Regístrate
          </Texto>
        </PressableScale>
      </View>
    </Pantalla>
  );
}
