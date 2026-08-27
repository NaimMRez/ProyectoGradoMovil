import { MaterialIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

type NombreMaterial = keyof typeof MaterialIcons.glyphMap;

/**
 * Iconos de PetGo.
 *
 * El handoff nombra los iconos como Material Symbols (`add_a_photo`,
 * `how_to_reg`), y `@expo/vector-icons` los expone en kebab-case
 * (`add-a-photo`). La traducción se hace aquí y no en cada pantalla, para que
 * el nombre que aparece en el código sea el mismo que el del handoff y se
 * puedan comparar de un vistazo.
 */
export type NombreIcono =
  | 'pets' | 'add' | 'add_a_photo' | 'call' | 'add_location_alt' | 'arrow_back'
  | 'assignment' | 'campaign' | 'cancel' | 'chat' | 'chat_bubble' | 'check'
  | 'check_circle' | 'chevron_right' | 'close' | 'directions_walk' | 'edit'
  | 'event' | 'event_available' | 'flag' | 'forum' | 'fullscreen' | 'group'
  | 'handshake' | 'help' | 'home' | 'how_to_reg' | 'mail' | 'map'
  | 'my_location' | 'near_me' | 'notifications' | 'notifications_off'
  | 'pending_actions' | 'person' | 'person_add' | 'place'
  | 'radio_button_checked' | 'radio_button_unchecked' | 'schedule' | 'search'
  | 'send' | 'settings' | 'timeline' | 'tune'
  // Añadidos para los estados que el handoff nunca diseñó.
  | 'error_outline' | 'wifi_off' | 'refresh' | 'location_off' | 'search_off'
  | 'inbox' | 'photo_camera' | 'arrow_forward' | 'more_horiz' | 'logout';

export type IconoProps = {
  nombre: NombreIcono;
  tamano?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function Icono({ nombre, tamano = 20, color, style }: IconoProps) {
  return (
    <MaterialIcons
      name={nombre.replace(/_/g, '-') as NombreMaterial}
      size={tamano}
      color={color}
      style={style}
    />
  );
}

export default Icono;
