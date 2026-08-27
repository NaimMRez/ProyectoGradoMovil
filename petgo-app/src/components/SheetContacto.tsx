import { Linking, View } from 'react-native';
import Button from './Button';
import { Avatar } from './PhotoPlaceholder';
import Sheet from './Sheet';
import Texto from './Texto';
import type { Usuario } from '../api/tipos';
import { borde, superficie, texto } from '../theme/colors';
import { espacio, radio } from '../theme/layout';

/** `+591 707 21 884` → `59170721884`, que es lo que espera `wa.me`. */
function paraWhatsApp(telefono: string): string {
  return telefono.replace(/\D/g, '');
}

/**
 * Sheet de contacto.
 *
 * Dos vías, y el orden importa: WhatsApp primero porque es donde la gente
 * coordina de verdad en Bolivia, y el chat interno debajo porque deja el hilo
 * anclado a la solicitud.
 *
 * El botón verde de WhatsApp es **el único uso de ese verde en toda la app**.
 * Si apareciera en otro sitio dejaría de leerse como "esto abre WhatsApp" y
 * pasaría a competir con el verde de marca.
 */
export function SheetContacto({
  abierto,
  contraparte,
  onCerrar,
  onChat,
  sinChatInterno = false,
  aviso,
}: {
  abierto: boolean;
  contraparte: Usuario | null;
  onCerrar: () => void;
  onChat: () => void;
  /**
   * Oculta el botón de chat interno.
   *
   * Hace falta en la pantalla de interesados: **una conversación es una
   * solicitud con cuidador asignado**, así que antes de aceptar a alguien no
   * existe hilo al que entrar. El handoff pone ahí un botón "Chatear", pero
   * ese botón no es representable con el modelo de datos que fijó el cliente
   * — no hay tabla `conversations` que pudiera guardar un hilo huérfano.
   * Hasta aceptar, WhatsApp es la única vía que sí funciona.
   */
  sinChatInterno?: boolean;
  /** Sustituye el texto del aviso por uno específico del contexto. */
  aviso?: string;
}) {
  if (!contraparte) return null;

  const abrirWhatsApp = () => {
    void Linking.openURL(`https://wa.me/${paraWhatsApp(contraparte.telefono)}`);
  };

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio['3xl'] }}>
        <Avatar nombre={contraparte.nombre} fotoUrl={contraparte.fotoUrl} tamano={58} />
        <View style={{ flex: 1 }}>
          <Texto variante="tituloTarjeta" color={texto.principal} numberOfLines={1}>
            {contraparte.nombre}
          </Texto>
          <Texto variante="meta" color={texto.terciario}>
            {contraparte.metaEtiqueta}
          </Texto>
        </View>
      </View>

      <View
        style={{
          backgroundColor: superficie.aviso,
          borderWidth: 1,
          borderColor: borde.aviso,
          borderRadius: radio.xl,
          padding: espacio.xxl,
          marginTop: espacio['4xl'],
        }}
      >
        <Texto variante="cuerpoS" color={texto.secundario} style={{ lineHeight: 21 }}>
          {aviso ??
            `Coordina hora exacta, punto de encuentro y forma de pago directamente con ${contraparte.primerNombre}. PetGo no procesa pagos.`}
        </Texto>
      </View>

      <View style={{ gap: espacio.lg, marginTop: espacio['5xl'] }}>
        <Button
          titulo="Contactar por WhatsApp"
          variante="whatsapp"
          icono="chat"
          completo
          haptico="ligero"
          onPress={abrirWhatsApp}
        />
        {!sinChatInterno ? (
          <Button
            titulo="Chat en la app"
            variante="secundario"
            icono="forum"
            completo
            onPress={onChat}
          />
        ) : null}
        <Button titulo="Cerrar" variante="fantasma" completo onPress={onCerrar} />
      </View>
    </Sheet>
  );
}

export default SheetContacto;
