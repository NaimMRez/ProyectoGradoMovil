import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { borde, intencion, superficie, texto, verde } from '../theme/colors';
import { espacio, profundidad, radio } from '../theme/layout';
import Icono, { type NombreIcono } from './Icono';
import PressableScale, { type FuerzaPresion } from './PressableScale';
import Texto from './Texto';

export type VarianteBoton =
  /** Acción principal. Verde sólido con sombra verde. Una por pantalla. */
  | 'primario'
  /** Acción alternativa. Blanco con borde. */
  | 'secundario'
  /** Acción dentro de una tarjeta. Tinte verde, sin borde ni sombra. */
  | 'sutil'
  /** Cancelar servicio, cerrar sesión. */
  | 'destructivo'
  /** Sólo texto. Para "Saltar", "Limpiar", "Cerrar". */
  | 'fantasma'
  /** El único uso del verde de WhatsApp en toda la app. */
  | 'whatsapp';

export type TamanoBoton = 'grande' | 'medio' | 'pequeno';

export type ButtonProps = {
  titulo: string;
  onPress?: () => void;
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  icono?: NombreIcono;
  /** El icono va después del texto en vez de antes. */
  iconoAlFinal?: boolean;
  /** Ocupa todo el ancho disponible. */
  completo?: boolean;
  cargando?: boolean;
  disabled?: boolean;
  haptico?: false | 'ligero' | 'medio' | 'exito' | 'error';
  style?: StyleProp<ViewStyle>;
};

const RELLENO: Record<TamanoBoton, ViewStyle> = {
  grande: { paddingVertical: 17, paddingHorizontal: espacio['5xl'], borderRadius: radio.xl },
  medio: { paddingVertical: 14, paddingHorizontal: espacio['4xl'], borderRadius: radio.lg },
  pequeno: { paddingVertical: 11, paddingHorizontal: espacio['3xl'], borderRadius: radio.md },
};

const TIPO = { grande: 'botonL', medio: 'boton', pequeno: 'botonS' } as const;
const ICONO = { grande: 20, medio: 18, pequeno: 16 } as const;

type Piel = {
  fondo: string;
  texto: string;
  borde?: string;
  sombra?: ViewStyle;
  fuerza?: FuerzaPresion;
};

const PIEL: Record<VarianteBoton, Piel> = {
  primario: {
    fondo: verde.primario,
    // Tinta oscura, no blanca: sobre la menta el blanco da 2,1:1.
    texto: texto.sobreAccion,
    sombra: profundidad.botonPrimario,
  },
  secundario: {
    fondo: superficie.tarjeta,
    texto: verde.texto,
    borde: borde.suave,
  },
  sutil: {
    fondo: verde.lima,
    texto: texto.sobreAccion,
  },
  destructivo: {
    fondo: superficie.tarjeta,
    texto: intencion.destructivoTexto,
    borde: intencion.destructivoBorde,
  },
  fantasma: {
    fondo: 'transparent',
    texto: verde.enlace,
    fuerza: 'fuerte',
  },
  whatsapp: {
    fondo: intencion.whatsapp,
    texto: texto.sobrePrimario,
    sombra: profundidad.botonWhatsapp,
  },
};

export function Button({
  titulo,
  onPress,
  variante = 'primario',
  tamano = 'grande',
  icono,
  iconoAlFinal = false,
  completo = false,
  cargando = false,
  disabled = false,
  haptico = false,
  style,
}: ButtonProps) {
  const piel = PIEL[variante];
  const inactivo = disabled || cargando;

  const contenidoIcono = icono ? (
    <Icono nombre={icono} tamano={ICONO[tamano]} color={piel.texto} />
  ) : null;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactivo}
      haptico={haptico}
      fuerza={piel.fuerza ?? (completo ? 'suave' : 'normal')}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: espacio.md,
          backgroundColor: piel.fondo,
          borderWidth: piel.borde ? 1.5 : 0,
          borderColor: piel.borde,
          alignSelf: completo ? 'stretch' : 'flex-start',
        },
        RELLENO[tamano],
        // La sombra sólo tiene sentido mientras el botón está vivo.
        !inactivo && piel.sombra,
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator size="small" color={piel.texto} />
      ) : (
        <>
          {!iconoAlFinal && contenidoIcono}
          <Texto variante={TIPO[tamano]} color={piel.texto}>
            {titulo}
          </Texto>
          {iconoAlFinal && contenidoIcono}
        </>
      )}
    </PressableScale>
  );
}

/** Botón cuadrado de sólo icono: atrás, cabecera, chrome sobre el mapa. */
export type BotonIconoProps = {
  icono: NombreIcono;
  onPress?: () => void;
  /** Lado del cuadrado. Por debajo de 44 se añade `hitSlop` automáticamente. */
  lado?: number;
  tamanoIcono?: number;
  color?: string;
  fondo?: string;
  colorBorde?: string | null;
  radioBoton?: number;
  sombra?: ViewStyle;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function BotonIcono({
  icono,
  onPress,
  lado = 42,
  tamanoIcono = 20,
  color = texto.medio,
  fondo = superficie.tarjeta,
  colorBorde = borde.suave,
  radioBoton = radio.lg,
  sombra,
  accessibilityLabel,
  style,
  children,
}: BotonIconoProps) {
  const holgura = Math.max(0, Math.ceil((44 - lado) / 2));

  return (
    <PressableScale
      onPress={onPress}
      fuerza="fuerte"
      hitSlop={holgura}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width: lado,
          height: lado,
          borderRadius: radioBoton,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fondo,
          borderWidth: colorBorde ? 1 : 0,
          borderColor: colorBorde ?? undefined,
        },
        sombra,
        style,
      ]}
    >
      <Icono nombre={icono} tamano={tamanoIcono} color={color} />
      {children}
    </PressableScale>
  );
}

/** Punto o número rojo sobre un botón de cabecera. */
export function BadgeContador({ cuenta }: { cuenta?: number }) {
  const conNumero = typeof cuenta === 'number' && cuenta > 0;
  return (
    <View
      style={{
        position: 'absolute',
        top: conNumero ? 5 : 8,
        right: conNumero ? 5 : 8,
        minWidth: conNumero ? 17 : 9,
        height: conNumero ? 17 : 9,
        borderRadius: radio.pastilla,
        backgroundColor: intencion.noLeidas,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: conNumero ? 4 : 0,
        borderWidth: 2,
        borderColor: superficie.tarjeta,
      }}
    >
      {conNumero ? (
        <Texto variante="contador" color={texto.sobrePrimario}>
          {cuenta > 9 ? '9+' : cuenta}
        </Texto>
      ) : null}
    </View>
  );
}

export default Button;
