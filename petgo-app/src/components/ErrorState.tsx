import { View, type StyleProp, type ViewStyle } from 'react-native';
import { intencion, texto } from '../theme/colors';
import { espacio, radio } from '../theme/layout';
import Button from './Button';
import Card from './Card';
import Icono, { type NombreIcono } from './Icono';
import Texto from './Texto';

/**
 * Estados de error.
 *
 * El handoff no diseñó ninguno, y hay tres que esta app va a producir seguro:
 * el permiso de ubicación denegado (el lado cuidador entero depende de él),
 * una solicitud que otro cuidador tomó primero, y la red caída — que en
 * Cochabamba pasa a diario.
 *
 * Cada uno dice **qué pasó** y **qué hacer ahora**. Un error sin salida
 * obliga a cerrar la app, y el usuario no vuelve.
 */

export type ClaveError =
  | 'red'
  | 'ubicacion'
  | 'yaTomada'
  | 'servidor'
  | 'noEncontrada';

type Preset = {
  icono: NombreIcono;
  titulo: string;
  cuerpo: string;
  accion: string;
};

const PRESETS: Record<ClaveError, Preset> = {
  red: {
    icono: 'wifi_off',
    titulo: 'Sin conexión',
    cuerpo:
      'No pudimos comunicarnos con PetGo. Revisa tus datos móviles o tu wifi e inténtalo otra vez.',
    accion: 'Reintentar',
  },
  ubicacion: {
    icono: 'location_off',
    titulo: 'No pudimos ubicarte',
    cuerpo:
      'PetGo necesita tu ubicación para mostrarte los paseos cercanos y calcular la distancia. Actívala en los ajustes del teléfono.',
    accion: 'Permitir ubicación',
  },
  yaTomada: {
    icono: 'how_to_reg',
    titulo: 'Esta solicitud ya tiene cuidador',
    cuerpo:
      'El dueño eligió a otra persona mientras la mirabas. Hay más paseos publicados cerca de ti.',
    accion: 'Ver otras solicitudes',
  },
  servidor: {
    icono: 'error_outline',
    titulo: 'Algo salió mal',
    cuerpo:
      'El error es nuestro, no tuyo. Vuelve a intentarlo en un momento.',
    accion: 'Reintentar',
  },
  noEncontrada: {
    icono: 'search_off',
    titulo: 'No encontramos esta solicitud',
    cuerpo:
      'Puede que se haya cancelado o que el enlace esté vencido.',
    accion: 'Volver',
  },
};

export type ErrorStateProps = {
  clave: ClaveError;
  onAccion?: () => void;
  textoAccion?: string;
  /**
   * Fila dentro de una lista que ya tiene contenido, en vez de pantalla
   * completa. Para cuando falla una recarga y lo anterior sigue siendo válido.
   */
  enLinea?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ErrorState({
  clave,
  onAccion,
  textoAccion,
  enLinea = false,
  style,
}: ErrorStateProps) {
  const preset = PRESETS[clave];

  if (enLinea) {
    return (
      <Card
        nivel="flat"
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.xl,
            padding: espacio.xxl,
            backgroundColor: intencion.destructivoFondo,
            borderColor: intencion.destructivoBorde,
          },
          style,
        ]}
      >
        <Icono nombre={preset.icono} tamano={20} color={intencion.destructivoTexto} />
        <Texto variante="cuerpoS" color={intencion.destructivoTexto} style={{ flex: 1 }}>
          {preset.titulo}
        </Texto>
        {onAccion ? (
          <Button
            titulo={textoAccion ?? preset.accion}
            variante="fantasma"
            tamano="pequeno"
            onPress={onAccion}
          />
        ) : null}
      </Card>
    );
  }

  return (
    <View
      style={[
        { alignItems: 'center', paddingVertical: 64, paddingHorizontal: espacio['5xl'] },
        style,
      ]}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: radio.sheet,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: intencion.destructivoFondo,
          borderWidth: 1,
          borderColor: intencion.destructivoBorde,
        }}
      >
        <Icono nombre={preset.icono} tamano={34} color={intencion.destructivoTexto} />
      </View>

      <Texto
        variante="tituloDetalle"
        color={texto.principal}
        style={{ marginTop: espacio['4xl'], textAlign: 'center' }}
      >
        {preset.titulo}
      </Texto>

      <Texto
        variante="cuerpoS"
        color={texto.terciario}
        style={{ marginTop: espacio.md, textAlign: 'center', maxWidth: 270, lineHeight: 21 }}
      >
        {preset.cuerpo}
      </Texto>

      {onAccion ? (
        <Button
          titulo={textoAccion ?? preset.accion}
          variante="secundario"
          tamano="medio"
          onPress={onAccion}
          style={{ marginTop: espacio['4xl'] }}
        />
      ) : null}
    </View>
  );
}

export default ErrorState;
