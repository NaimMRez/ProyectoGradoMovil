import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Toast, { type TonoToast } from '../components/Toast';
import { TOAST_MS } from '../theme/motion';

type Aviso = { id: number; mensaje: string; tono: TonoToast; sobreTabs: boolean };

type ContextoToast = {
  /**
   * Muestra un aviso. El texto viene del backend ya redactado — la app no
   * compone mensajes.
   */
  mostrar: (
    mensaje: string,
    opciones?: { tono?: TonoToast; sobreTabs?: boolean },
  ) => void;
};

const Contexto = createContext<ContextoToast | null>(null);

export function ProveedorToast({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const siguienteId = useRef(0);

  const mostrar = useCallback<ContextoToast['mostrar']>((mensaje, opciones) => {
    // Un toast nuevo cancela el temporizador del anterior: si no, el segundo
    // hereda lo que le quedaba de vida al primero y se va antes de tiempo.
    if (temporizador.current) clearTimeout(temporizador.current);

    siguienteId.current += 1;
    setAviso({
      id: siguienteId.current,
      mensaje,
      tono: opciones?.tono ?? 'exito',
      sobreTabs: opciones?.sobreTabs ?? true,
    });

    temporizador.current = setTimeout(() => setAviso(null), TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {aviso ? (
        // La `key` fuerza un remontaje por aviso, y con él la animación de
        // entrada. Sin ella, dos toasts seguidos cambian el texto sin moverse.
        <Toast
          key={aviso.id}
          mensaje={aviso.mensaje}
          tono={aviso.tono}
          sobreTabs={aviso.sobreTabs}
        />
      ) : null}
    </Contexto.Provider>
  );
}

export function useToast(): ContextoToast {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error('useToast debe usarse dentro de <ProveedorToast>');
  }
  return contexto;
}
