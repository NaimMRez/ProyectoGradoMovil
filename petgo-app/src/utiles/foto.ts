import * as ImagePicker from 'expo-image-picker';

/**
 * Elige una foto de la galería y devuelve su URI local, o `null` si el usuario
 * canceló o no dio permiso.
 *
 * **Importante:** lo que devuelve es una ruta **del dispositivo**
 * (`file:///...`), no una URL pública. Sirve para que la foto se vea en la app
 * que la eligió, y no para que la vea nadie más.
 *
 * Subir la foto a algún sitio es una decisión que sigue abierta — Cloudinary,
 * S3 o Supabase Storage — y hasta que se tome, el backend no tiene endpoint que
 * la reciba. Cuando lo tenga, esta función pasa a devolver la URL remota y el
 * resto de la app no se entera: todos los `fotoUrl` ya aceptan cualquier URI.
 */
/**
 * Cancelar y que te nieguen el permiso no son lo mismo, y la interfaz tiene que
 * poder distinguirlos: cancelar es normal y no merece ni un aviso; sin permiso
 * hay que decirle al usuario qué pasó y cómo arreglarlo.
 */
export type ResultadoFoto =
  | { estado: 'elegida'; uri: string }
  | { estado: 'cancelada' }
  | { estado: 'sinPermiso' };

export async function elegirFoto(): Promise<ResultadoFoto> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) return { estado: 'sinPermiso' };

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Cuadrada, porque todos los huecos de foto de mascota lo son: recortar
    // aquí evita que la cara del perro quede fuera del encuadre después.
    allowsEditing: true,
    aspect: [1, 1],
    // Las fotos van a verse a 92 px como mucho. Subir el original de 4 MB de la
    // cámara sería tirar los datos móviles del usuario a la basura.
    quality: 0.7,
  });

  if (resultado.canceled) return { estado: 'cancelada' };

  const uri = resultado.assets[0]?.uri;
  return uri ? { estado: 'elegida', uri } : { estado: 'cancelada' };
}
