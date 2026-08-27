import { View, type StyleProp, type ViewStyle } from 'react-native';
import { arena, texto, vacio } from '../theme/colors';
import { espacio, radio } from '../theme/layout';
import Button from './Button';
import Icono, { type NombreIcono } from './Icono';
import Texto from './Texto';

/**
 * Estados vacíos.
 *
 * El handoff diseñó exactamente uno: la bandeja de notificaciones sin nada
 * dentro. Faltan otros cuatro, y son precisamente los que ve un usuario nuevo
 * — que es el estado en el que un tribunal de grado va a abrir la app.
 *
 * Todos siguen la misma forma: cuadro de icono, título, una frase que explica
 * **qué va a aparecer aquí** (no "no hay nada"), y cuando existe una acción
 * evidente, un botón para hacerla. Un vacío sin salida es una pared.
 *
 * El fondo es arena, no verde: una zona sin contenido no debería llevar el
 * color de acción de la app.
 */

export type ClaveVacio =
  | 'notificaciones'
  | 'mascotas'
  | 'solicitudesDueno'
  | 'serviciosCuidador'
  | 'cercanas'
  | 'conversaciones'
  | 'interesados'
  | 'filtros';

type Preset = {
  icono: NombreIcono;
  titulo: string;
  cuerpo: string;
  accion?: string;
};

const PRESETS: Record<ClaveVacio, Preset> = {
  notificaciones: {
    icono: 'notifications_off',
    titulo: 'Sin notificaciones',
    cuerpo:
      'Aquí verás cuando un cuidador se interese en tu solicitud o cambie el estado de un paseo.',
  },
  mascotas: {
    icono: 'pets',
    titulo: 'Todavía no registraste mascotas',
    cuerpo:
      'Registra a tu perro para poder publicar solicitudes de paseo. Toma menos de un minuto.',
    accion: 'Agregar mi primera mascota',
  },
  solicitudesDueno: {
    icono: 'assignment',
    titulo: 'Aún no publicaste solicitudes',
    cuerpo:
      'Cuando publiques un paseo aparecerá aquí, con su estado y el cuidador asignado.',
    accion: 'Publicar solicitud',
  },
  serviciosCuidador: {
    icono: 'directions_walk',
    titulo: 'Todavía no tomaste ningún paseo',
    cuerpo:
      'Los paseos que aceptes aparecerán aquí para que sigas su estado hasta finalizarlos.',
    accion: 'Ver solicitudes cerca',
  },
  cercanas: {
    icono: 'near_me',
    titulo: 'No hay solicitudes en tu zona',
    cuerpo:
      'Nadie publicó un paseo cerca de ti por ahora. Amplía el radio de búsqueda o vuelve más tarde.',
    accion: 'Ampliar el radio',
  },
  conversaciones: {
    icono: 'forum',
    titulo: 'Sin conversaciones',
    cuerpo:
      'Cada paseo con cuidador asignado abre su propio chat. Aquí los vas a encontrar.',
  },
  interesados: {
    icono: 'group',
    titulo: 'Nadie se ofreció todavía',
    cuerpo:
      'Tu solicitud ya es visible para los cuidadores del Cercado. Te avisamos en cuanto alguien se interese.',
  },
  filtros: {
    icono: 'search_off',
    titulo: 'Ninguna solicitud coincide',
    cuerpo:
      'Con los filtros que elegiste no queda nada por mostrar. Prueba a soltar alguno.',
    accion: 'Limpiar filtros',
  },
};

export type EmptyStateProps = {
  clave: ClaveVacio;
  onAccion?: () => void;
  /** Reemplaza el texto del botón del preset. */
  textoAccion?: string;
  /** Menos aire vertical, para vacíos dentro de una tarjeta o un sheet. */
  compacto?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  clave,
  onAccion,
  textoAccion,
  compacto = false,
  style,
}: EmptyStateProps) {
  const preset = PRESETS[clave];
  const etiquetaAccion = textoAccion ?? preset.accion;

  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingVertical: compacto ? espacio['7xl'] : 72,
          paddingHorizontal: espacio['5xl'],
        },
        style,
      ]}
    >
      <View
        style={{
          width: compacto ? 64 : 88,
          height: compacto ? 64 : 88,
          borderRadius: compacto ? radio.xxl : radio.sheet,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: arena.superficie,
          borderWidth: 1,
          borderColor: arena.borde,
        }}
      >
        <Icono nombre={preset.icono} tamano={compacto ? 28 : 38} color={vacio.icono} />
      </View>

      <Texto
        variante={compacto ? 'tituloTarjeta' : 'tituloDetalle'}
        color={vacio.titulo}
        style={{ marginTop: espacio['4xl'], textAlign: 'center' }}
      >
        {preset.titulo}
      </Texto>

      <Texto
        variante="cuerpoS"
        color={texto.terciario}
        style={{
          marginTop: espacio.md,
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 21,
        }}
      >
        {preset.cuerpo}
      </Texto>

      {etiquetaAccion && onAccion ? (
        <Button
          titulo={etiquetaAccion}
          variante="secundario"
          tamano="medio"
          onPress={onAccion}
          style={{ marginTop: espacio['4xl'] }}
        />
      ) : null}
    </View>
  );
}

export default EmptyState;
