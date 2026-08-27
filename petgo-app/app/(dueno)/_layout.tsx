import { Redirect, Tabs, router } from 'expo-router';
import TabBar, { TABS_DUENO } from '../../src/components/TabBar';
import { useSesion } from '../../src/estado/sesion';

/**
 * Tabs del dueño.
 *
 * `animation: 'none'` es deliberado: los cuatro tabs son pares, no una
 * jerarquía, y se cambian decenas de veces por sesión. Deslizar entre ellos
 * insinúa una profundidad que no existe y el usuario la paga en cada toque.
 */
export default function LayoutDueno() {
  const { usuario, cargando } = useSesion();

  if (cargando) return null;
  if (!usuario) return <Redirect href="/login" />;
  // Un cuidador que llegue aquí por un enlace profundo no debe ver la app del
  // dueño: el rol no es un tema visual, es una bifurcación de permisos.
  if (usuario.rol !== 'dueno') return <Redirect href="/(cuidador)/inicio" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'none' }}
      tabBar={({ state }) => (
        <TabBar
          items={TABS_DUENO}
          activo={state.routes[state.index]?.name ?? 'inicio'}
          onSeleccionar={(clave) => router.replace(`/(dueno)/${clave}` as never)}
        />
      )}
    >
      <Tabs.Screen name="inicio" />
      <Tabs.Screen name="solicitudes" />
      <Tabs.Screen name="mascotas" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
