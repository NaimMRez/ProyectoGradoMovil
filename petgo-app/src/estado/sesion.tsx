import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, olvidarToken } from '../api/client';
import type { Rol, Usuario } from '../api/tipos';
import { tiempoReal } from '../api/tiempoReal';

const CLAVE_ALMACEN = 'petgo:sesion';

type ContextoSesion = {
  usuario: Usuario | null;
  /** Todavía leyendo la sesión guardada. Evita un parpadeo al login. */
  cargando: boolean;
  entrar: (correo: string, clave: string) => Promise<Usuario>;
  registrarse: (datos: {
    nombre: string;
    correo: string;
    telefono: string;
    clave: string;
    rol: Rol;
  }) => Promise<Usuario>;
  salir: () => Promise<void>;
};

const Contexto = createContext<ContextoSesion | null>(null);

/**
 * Sesión.
 *
 * **El rol se elige en el registro y determina toda la navegación posterior.**
 * No hay cambio de rol dentro de la app: no es un tema visual, es una
 * bifurcación de permisos y de navegación. Por eso el rol vive aquí y no en un
 * ajuste de perfil.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const guardado = await AsyncStorage.getItem(CLAVE_ALMACEN);
        if (vivo && guardado) setUsuario(JSON.parse(guardado) as Usuario);
      } catch {
        // Una sesión guardada corrupta no debe impedir abrir la app: se
        // descarta en silencio y el usuario vuelve a entrar.
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const guardar = useCallback(async (nuevo: Usuario) => {
    setUsuario(nuevo);
    await AsyncStorage.setItem(CLAVE_ALMACEN, JSON.stringify(nuevo));
    return nuevo;
  }, []);

  // El socket vive tanto como la sesión: se conecta al entrar y se corta al
  // salir. Dejarlo abierto tras cerrar sesión seguiría empujando mensajes de
  // una cuenta que ya no es la que está usando el teléfono.
  useEffect(() => {
    if (!usuario) return;
    tiempoReal.conectar(usuario.id);
    return () => tiempoReal.desconectar();
  }, [usuario]);

  const entrar = useCallback<ContextoSesion['entrar']>(
    async (correo, clave) => guardar(await api.iniciarSesion(correo, clave)),
    [guardar],
  );

  const registrarse = useCallback<ContextoSesion['registrarse']>(
    async (datos) => guardar(await api.registrar(datos)),
    [guardar],
  );

  const salir = useCallback(async () => {
    tiempoReal.desconectar();
    setUsuario(null);
    // El perfil y el token se guardan por separado: dejar el token vivo tras
    // cerrar sesión permitiría que la siguiente petición siguiera autenticada
    // como la cuenta anterior.
    await Promise.all([AsyncStorage.removeItem(CLAVE_ALMACEN), olvidarToken()]);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, entrar, registrarse, salir }),
    [usuario, cargando, entrar, registrarse, salir],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>');
  return contexto;
}

/**
 * La sesión, dando por hecho que hay usuario. Para pantallas que sólo existen
 * detrás del login: ahorra un `?.` en cada línea.
 */
export function useUsuario(): Usuario {
  const { usuario } = useSesion();
  if (!usuario) throw new Error('Esta pantalla requiere una sesión iniciada');
  return usuario;
}

/** Ruta de inicio según el rol. El registro decide cuál para siempre. */
export function inicioSegunRol(rol: Rol): '/(dueno)/inicio' | '/(cuidador)/inicio' {
  return rol === 'dueno' ? '/(dueno)/inicio' : '/(cuidador)/inicio';
}
