import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../src/components/Button';
import Campo from '../../src/components/Campo';
import { GrupoChips } from '../../src/components/Chip';
import Icono from '../../src/components/Icono';
import PhotoPlaceholder from '../../src/components/PhotoPlaceholder';
import Pantalla, { CabeceraDetalle } from '../../src/components/Pantalla';
import PressableScale from '../../src/components/PressableScale';
import Texto from '../../src/components/Texto';
import { useCrearMascota } from '../../src/api/hooks';
import type { Sexo, Tamano } from '../../src/api/tipos';
import { useToast } from '../../src/estado/toast';
import { elegirFoto } from '../../src/utiles/foto';
import { borde, superficie, texto, verde } from '../../src/theme/colors';
import { espacio, radio } from '../../src/theme/layout';

const SEXOS: Sexo[] = ['Macho', 'Hembra'];
const TAMANOS: Tamano[] = ['Pequeño', 'Mediano', 'Grande'];

export default function RegistrarMascota() {
  const insets = useSafeAreaInsets();
  const { mostrar } = useToast();
  const crear = useCrearMascota();

  const [nombre, setNombre] = useState('');
  const [raza, setRaza] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState<Sexo>('Macho');
  const [tamano, setTamano] = useState<Tamano>('Mediano');
  const [peso, setPeso] = useState('');
  const [notas, setNotas] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);

  const escogerFoto = async () => {
    const resultado = await elegirFoto();

    if (resultado.estado === 'elegida') {
      setFotoUrl(resultado.uri);
      return;
    }
    if (resultado.estado === 'sinPermiso') {
      mostrar('PetGo necesita permiso para ver tus fotos', {
        tono: 'aviso',
        sobreTabs: false,
      });
    }
    // Cancelar es una decisión normal del usuario: no se le avisa de nada.
  };

  const guardar = () => {
    // El nombre es lo único obligatorio. Los demás campos se guardan con
    // respaldo ("Mestizo", "—") en el backend.
    if (!nombre.trim()) {
      setErrorNombre('Ingresa el nombre de tu mascota');
      mostrar('Ingresa el nombre de tu mascota', { tono: 'aviso', sobreTabs: false });
      return;
    }

    crear.mutate(
      { nombre, raza, edad, sexo, tamano, peso, notas, fotoUrl },
      {
        onSuccess: () => {
          router.dismissTo('/(dueno)/mascotas');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pantalla
        relleno="detalle"
        contentContainerStyle={{
          paddingTop: insets.top + espacio.xl,
          paddingBottom: insets.bottom + espacio['7xl'],
        }}
      >
        <CabeceraDetalle
          titulo="Registrar mascota"
          iconoAtras="close"
          onAtras={() => router.back()}
        />

        {/* ── Foto ───────────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio['3xl'],
            marginTop: espacio['6xl'],
          }}
        >
          <PressableScale
            onPress={() => void escogerFoto()}
            fuerza="fuerte"
            accessibilityRole="button"
            accessibilityLabel={
              fotoUrl ? 'Cambiar la foto de tu mascota' : 'Agregar foto de tu mascota'
            }
            style={{
              width: 92,
              height: 92,
              borderRadius: radio.pastilla,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: superficie.pildora,
              borderWidth: 1,
              borderColor: borde.suave,
            }}
          >
            {fotoUrl ? (
              <PhotoPlaceholder fotoUrl={fotoUrl} tamano={92} circulo />
            ) : (
              <Icono nombre="add_a_photo" tamano={28} color={verde.enlace} />
            )}
          </PressableScale>

          <View style={{ flex: 1, gap: espacio.xs }}>
            <Texto variante="nombreS" color={texto.fuerte}>
              {fotoUrl ? 'Foto elegida' : 'Foto de tu mascota'}
            </Texto>
            <Texto variante="meta" color={texto.terciario} style={{ lineHeight: 18 }}>
              {fotoUrl
                ? 'Toca la foto para cambiarla.'
                : 'Una foto clara ayuda al cuidador a reconocerla.'}
            </Texto>
          </View>
        </View>

        {/* ── Campos ─────────────────────────────────────────────────────── */}
        <View style={{ gap: espacio.xxl, marginTop: espacio['6xl'] }}>
          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChangeText={(v) => {
              setNombre(v);
              setErrorNombre(null);
            }}
            placeholder="Ej. Rocco"
            error={errorNombre ?? undefined}
          />

          <View style={{ flexDirection: 'row', gap: espacio.xl }}>
            <Campo
              etiqueta="Raza"
              value={raza}
              onChangeText={setRaza}
              placeholder="Ej. Border collie"
              style={{ flex: 1.4 }}
            />
            <Campo
              etiqueta="Edad"
              value={edad}
              onChangeText={setEdad}
              placeholder="3 años"
              style={{ flex: 1 }}
            />
          </View>

          <View>
            <Texto variante="etiqueta" color={texto.etiqueta} style={{ marginBottom: espacio.sm + 1 }}>
              Sexo
            </Texto>
            <GrupoChips opciones={SEXOS} valor={sexo} onCambio={(v) => setSexo(v as Sexo)} />
          </View>

          <View>
            <Texto variante="etiqueta" color={texto.etiqueta} style={{ marginBottom: espacio.sm + 1 }}>
              Tamaño
            </Texto>
            <GrupoChips opciones={TAMANOS} valor={tamano} onCambio={(v) => setTamano(v as Tamano)} />
          </View>

          <Campo
            etiqueta="Peso aproximado"
            value={peso}
            onChangeText={setPeso}
            placeholder="18 kg"
          />

          <Campo
            etiqueta="Observaciones o cuidados especiales"
            value={notas}
            onChangeText={setNotas}
            placeholder="Ej. no tolera otros perros grandes, usa arnés"
            filas={3}
          />
        </View>

        <Button
          titulo="Guardar mascota"
          completo
          haptico="exito"
          cargando={crear.isPending}
          onPress={guardar}
          style={{ marginTop: espacio['7xl'] }}
        />
      </Pantalla>
    </KeyboardAvoidingView>
  );
}
