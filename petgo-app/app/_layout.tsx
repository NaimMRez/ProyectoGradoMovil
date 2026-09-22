import { useCallback } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  FamiljenGrotesk_500Medium,
  FamiljenGrotesk_600SemiBold,
  FamiljenGrotesk_700Bold,
} from '@expo-google-fonts/familjen-grotesk';

import { ProveedorSesion } from '../src/estado/sesion';
import { ProveedorToast } from '../src/estado/toast';
import { superficie } from '../src/theme/colors';
import { ErrorApi } from '../src/api/tipos';

// El splash del sistema se mantiene hasta que las fuentes estén cargadas: si
// se suelta antes, la primera pantalla aparece con la fuente del sistema y
// salta a Familjen Grotesk medio segundo después.
void SplashScreen.preventAutoHideAsync();

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (intentos, error) => {
        // Reintentar un 409 ("esta solicitud ya tiene cuidador") o un 404 no
        // arregla nada y retrasa el mensaje que el usuario necesita leer.
        if (error instanceof ErrorApi && error.clave !== 'red') return false;
        return intentos < 2;
      },
    },
  },
});

export default function LayoutRaiz() {
  const reducido = useReducedMotion();

  const [fuentesListas] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    FamiljenGrotesk_500Medium,
    FamiljenGrotesk_600SemiBold,
    FamiljenGrotesk_700Bold,
  });

  const alMontar = useCallback(() => {
    if (fuentesListas) void SplashScreen.hideAsync();
  }, [fuentesListas]);

  if (!fuentesListas) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={alMontar}>
      {/* Sin este proveedor, los hooks de teclado no hacen nada — y no avisan.
          Va aquí arriba porque el chat lo necesita en cualquier punto de la
          pila de navegación. */}
      <KeyboardProvider>
        <SafeAreaProvider>
          <QueryClientProvider client={cliente}>
            <ProveedorSesion>
              <ProveedorToast>
                <View style={{ flex: 1, backgroundColor: superficie.app }}>
                  <StatusBar style="dark" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: superficie.app },
                      // La transición nativa corre del lado de la plataforma,
                      // conserva el gesto de volver atrás y se parece a todas las
                      // demás apps del teléfono. Nunca se reconstruye en JS.
                      animation: reducido ? 'fade' : 'default',
                      animationMatchesGesture: true,
                    }}
                  >
                    {/* Splash y acceso: sin gesto de volver atrás, porque no hay
                        dónde volver. */}
                    <Stack.Screen name="index" options={{ animation: 'fade' }} />
                    <Stack.Screen name="bienvenida" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="login" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="registro" />

                    {/* Los dos grupos de tabs sustituyen la pila entera. */}
                    <Stack.Screen name="(dueno)" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="(cuidador)" options={{ gestureEnabled: false }} />

                    {/* Tareas que el usuario puede abandonar: van como modal. */}
                    <Stack.Screen name="publicar" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="mascota/registrar" options={{ presentation: 'modal' }} />
                  </Stack>
                </View>
              </ProveedorToast>
            </ProveedorSesion>
          </QueryClientProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
