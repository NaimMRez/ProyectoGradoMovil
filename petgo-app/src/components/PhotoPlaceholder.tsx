import { View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { superficie, texto as coloresTexto, vacio, verde } from '../theme/colors';
import { radio } from '../theme/layout';
import Icono, { type NombreIcono } from './Icono';
import Texto from './Texto';

/**
 * Hueco de foto.
 *
 * El handoff rellena cada hueco de imagen con rayas diagonales a 135°. Es una
 * convención de maqueta — significa "aquí falta una foto" y se dirige al
 * diseñador, no al usuario. En la app real esas rayas se leen como una imagen
 * rota, y como todavía no hay endpoint de subida, la mayoría de los usuarios
 * las verían todo el tiempo.
 *
 * Se sustituyen por lo que hacen las apps de verdad: una superficie tintada con
 * la inicial del sujeto. Se lee como un avatar deliberado, no como un fallo, y
 * además distingue a Rocco de Luna de un vistazo — que es justo lo que la foto
 * iba a hacer.
 *
 * Cuando `fotoUrl` llega, la foto real ocupa el mismo tamaño, el mismo radio y
 * el mismo encaje, así que el layout no se mueve.
 */

export type PhotoPlaceholderProps = {
  /** URL de la foto real. Sin ella se dibuja la inicial. */
  fotoUrl?: string | null;
  /** De aquí sale la inicial. */
  nombre?: string;
  tamano: number;
  /** Alto distinto del ancho (carrusel de mascotas del inicio). */
  alto?: number;
  radioFoto?: number;
  circulo?: boolean;
  /** Icono en vez de inicial. Para huecos sin nombre asociado. */
  icono?: NombreIcono;
  /**
   * Sobre el degradado verde del héroe los tintes claros desaparecen: se pasa
   * a superficie translúcida blanca.
   */
  sobreHeroe?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Inicial en mayúscula, tolerante a nombres unidos: "Rocco y Luna" → "R". */
function inicialDe(nombre?: string): string {
  const limpio = nombre?.trim();
  if (!limpio) return '·';
  return limpio.charAt(0).toLocaleUpperCase('es-BO');
}

export function PhotoPlaceholder({
  fotoUrl,
  nombre,
  tamano,
  alto,
  radioFoto,
  circulo = false,
  icono,
  sobreHeroe = false,
  style,
}: PhotoPlaceholderProps) {
  const altura = alto ?? tamano;
  const curvatura = circulo ? radio.pastilla : (radioFoto ?? radio.md);

  const marco = {
    width: tamano,
    height: altura,
    borderRadius: curvatura,
    overflow: 'hidden' as const,
    flexShrink: 0,
  };

  if (fotoUrl) {
    return (
      <Image
        source={{ uri: fotoUrl }}
        // `expo-image` tipa su estilo como `ImageStyle`, que no acepta el
        // `overflow: 'scroll'` que sí admite un `ViewStyle`. El estilo que
        // llega de fuera es siempre de layout, así que el reparo es seguro.
        style={[marco, style as ImageStyle]}
        contentFit="cover"
        // Un fundido corto evita el parpadeo blanco cuando la foto llega
        // desde caché, sin llegar a leerse como una animación.
        transition={160}
        accessibilityLabel={nombre ? `Foto de ${nombre}` : undefined}
      />
    );
  }

  // La inicial crece con el hueco, pero se aplana en los tamaños grandes: a
  // 92 px una inicial proporcional sería tipografía de cartel.
  const tamanoInicial = Math.round(Math.min(tamano, altura) * 0.4);

  return (
    <View
      style={[
        marco,
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: sobreHeroe ? 'rgba(255,255,255,0.16)' : vacio.fotoFondo,
          borderWidth: sobreHeroe ? 0 : 1,
          borderColor: vacio.fotoBorde,
        },
        style,
      ]}
    >
      {icono ? (
        <Icono
          nombre={icono}
          tamano={Math.round(Math.min(tamano, altura) * 0.42)}
          color={sobreHeroe ? coloresTexto.sobreHeroe : verde.texto}
        />
      ) : (
        <Texto
          color={sobreHeroe ? coloresTexto.sobrePrimario : verde.texto}
          style={{
            fontFamily: 'FamiljenGrotesk_600SemiBold',
            fontSize: tamanoInicial,
            lineHeight: Math.round(tamanoInicial * 1.15),
            letterSpacing: -tamanoInicial * 0.02,
          }}
        >
          {inicialDe(nombre)}
        </Texto>
      )}
    </View>
  );
}

/** Avatar circular de persona. */
export function Avatar({
  fotoUrl,
  nombre,
  tamano = 52,
  sobreHeroe,
  style,
}: {
  fotoUrl?: string | null;
  nombre?: string;
  tamano?: number;
  sobreHeroe?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PhotoPlaceholder
      fotoUrl={fotoUrl}
      nombre={nombre}
      tamano={tamano}
      circulo
      sobreHeroe={sobreHeroe}
      style={[{ backgroundColor: superficie.pildora }, style]}
    />
  );
}

export default PhotoPlaceholder;
