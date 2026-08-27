import { Redirect, Tabs, router } from 'expo-router';
import TabBar, { TABS_CUIDADOR } from '../../src/components/TabBar';
import { useSesion } from '../../src/estado/sesion';

export default function LayoutCuidador() {
  const { usuario, cargando } = useSesion();

  if (cargando) return null;
  if (!usuario) return <Redirect href="/login" />;
  if (usuario.rol !== 'cuidador') return <Redirect href="/(dueno)/inicio" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'none' }}
      tabBar={({ state }) => (
        <TabBar
          items={TABS_CUIDADOR}
          activo={state.routes[state.index]?.name ?? 'inicio'}
          onSeleccionar={(clave) => router.replace(`/(cuidador)/${clave}` as never)}
        />
      )}
    >
      <Tabs.Screen name="inicio" />
      <Tabs.Screen name="mapa" />
      <Tabs.Screen name="servicios" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
